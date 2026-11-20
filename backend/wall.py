import asyncio
import os
import subprocess
import tempfile
import uuid
from collections import OrderedDict
from datetime import datetime, timedelta, timezone
from typing import Optional

import imageio_ffmpeg
import requests
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from pymongo import ReturnDocument

from clerk_auth import require_user
from storage import APP_NAME, get_object, put_object

MAX_UPLOAD = 60 * 1024 * 1024
ROLES = ["admin", "member"]
DEFAULT_ROLE = "member"
RETIRED_ROLES = {}
RANK = {r: len(ROLES) - i for i, r in enumerate(ROLES)}
ENV = "live" if os.environ.get("CLERK_PUBLISHABLE_KEY", "").startswith("pk_live_") else "preview"
IN_ENV = {"env": {"$in": [ENV, None]}}
_cache: "OrderedDict[str, bytes]" = OrderedDict()
_admin_check: dict = {}
_transcode_slots = asyncio.Semaphore(2)


def effective_role(role) -> str:
    role = RETIRED_ROLES.get(role, role)
    return role if role in ROLES else DEFAULT_ROLE


def _is_admin_email(user_id: str) -> bool:
    admins = admin_emails()
    r = requests.get(f"https://api.clerk.com/v1/users/{user_id}", timeout=10,
                     headers={"Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}", "User-Agent": "emergent-app"})
    r.raise_for_status()
    return any(e["email_address"].lower() in admins and (e.get("verification") or {}).get("status") == "verified"
               for e in r.json()["email_addresses"])


_uploading: set = set()


async def upload_guard(request: Request, call_next):
    """Reject oversized or parallel uploads from one phone before the body is read."""
    if request.method != "POST" or request.url.path != "/api/clips":
        return await call_next(request)
    size = request.headers.get("content-length")
    if not size or not size.isdigit():
        return JSONResponse({"detail": "Upload size is missing. Try again."}, status_code=411)
    if int(size) > MAX_UPLOAD + 1024 * 1024:
        return JSONResponse({"detail": "Video is over 60 MB"}, status_code=413)
    ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "")).split(",")[0].strip()
    if ip in _uploading:
        return JSONResponse({"detail": "One upload at a time. Wait for your last video to finish."}, status_code=429)
    _uploading.add(ip)
    try:
        return await call_next(request)
    finally:
        _uploading.discard(ip)


def admin_emails() -> set:
    return {e.strip().lower() for e in os.environ.get("ADMIN_EMAIL", "").split(",") if e.strip()}


def _allowlisted(user_id: str) -> bool:
    hit = _admin_check.get(user_id)
    if hit and hit[1] > datetime.now(timezone.utc).timestamp():
        return hit[0]
    ok = bool(admin_emails()) and _is_admin_email(user_id)
    _admin_check[user_id] = (ok, datetime.now(timezone.utc).timestamp() + 300)
    return ok


def transcode(data: bytes, first_minute: bool) -> bytes:
    """Re-encode any phone video to H.264/AAC MP4 with faststart so it streams on iPhone and Android."""
    with tempfile.TemporaryDirectory() as d:
        src, out = os.path.join(d, "in"), os.path.join(d, "out.mp4")
        with open(src, "wb") as f:
            f.write(data)
        cmd = [imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error", "-i", src, *(["-t", "60"] if first_minute else []),
               "-vf", "scale=trunc(min(720\\,iw)/2)*2:-2", "-c:v", "libx264", "-preset", "veryfast", "-crf", "26",
               "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", out]
        subprocess.run(cmd, check=True, timeout=900, capture_output=True)
        with open(out, "rb") as f:
            return f.read()


class RoleIn(BaseModel):
    role: str


class LikeIn(BaseModel):
    device_id: str


def build_wall_router(db, logger) -> APIRouter:
    r = APIRouter(prefix="/api")

    async def current_member(user: dict = Depends(require_user)) -> dict:
        uid = user["user_id"]
        member = await db.users.find_one({"user_id": uid}, {"_id": 0})
        if member is None or not member.get("role"):
            role = "admin" if await asyncio.to_thread(_allowlisted, uid) else DEFAULT_ROLE
            await db.users.update_one({"user_id": uid, "role": {"$in": [None, ""]}}, {"$set": {"role": role}})
            member = await db.users.find_one_and_update({"user_id": uid}, {"$setOnInsert": {"user_id": uid, "role": role}},
                                                        upsert=True, projection={"_id": 0}, return_document=ReturnDocument.AFTER)
        if member.get("env") != ENV:
            await db.users.update_one({"user_id": uid}, {"$set": {"env": ENV}})
        role = "admin" if await asyncio.to_thread(_allowlisted, uid) else DEFAULT_ROLE
        if member["role"] != role:
            await db.users.update_one({"user_id": uid}, {"$set": {"role": role}})
        return {**member, "env": ENV, "role": role}

    def require_role(*roles: str):
        async def check(member: dict = Depends(current_member)) -> dict:
            if member["role"] not in roles:
                raise HTTPException(status_code=403, detail="Not allowed")
            return member
        return check

    @r.get("/me")
    async def me(member: dict = Depends(current_member)):
        return {"user_id": member["user_id"], "role": member["role"]}

    @r.get("/users")
    async def list_users(admin: dict = Depends(require_role("admin"))):
        people = await db.users.find(IN_ENV, {"_id": 0}).to_list(1000)
        return {"roles": [x for x in ROLES if RANK[x] <= RANK[admin["role"]]],
                "users": [{**p, "role": effective_role(p.get("role"))} for p in people]}

    @r.patch("/users/{user_id}/role")
    async def set_role(user_id: str, body: RoleIn, admin: dict = Depends(require_role("admin"))):
        if body.role == "admin":
            raise HTTPException(status_code=403, detail="Admins are set by email only")
        if body.role not in ROLES or RANK[body.role] > RANK[admin["role"]]:
            raise HTTPException(status_code=403, detail="Not allowed")
        target = await db.users.find_one({"user_id": user_id, **IN_ENV}, {"_id": 0})
        if target is None:
            raise HTTPException(status_code=404, detail="Not found")
        if (effective_role(target.get("role")) == "admin" and body.role != "admin"
                and await db.users.count_documents({"role": "admin", **IN_ENV}) <= 1):
            raise HTTPException(status_code=409, detail="Keep at least one admin")
        await db.users.update_one({"user_id": user_id}, {"$set": {"role": body.role}})
        return {"user_id": user_id, "role": body.role}

    @r.post("/clips")
    async def upload_clip(video: UploadFile = File(...), kit_id: Optional[str] = Form(None), crew: str = Form(""),
                          source: str = Form("preview"), keep: str = Form("full")):
        data = await video.read(MAX_UPLOAD + 1)
        if not data or not (video.content_type or "").startswith("video/"):
            raise HTTPException(400, "Upload a video file")
        if len(data) > MAX_UPLOAD:
            raise HTTPException(413, "Video is over 60 MB")
        kit = await db.shot_kits.find_one({"id": kit_id}, {"_id": 0, "kit_name": 1, "song": 1}) if kit_id else None
        if kit_id and not kit:
            raise HTTPException(404, "Kit not found")
        try:
            async with _transcode_slots:
                mp4 = await asyncio.to_thread(transcode, data, keep == "first_minute")
        except Exception as e:
            logger.warning("transcode failed: %s", e)
            raise HTTPException(400, "That file isn't a playable video")
        clip_id = str(uuid.uuid4())
        try:
            res = await asyncio.to_thread(put_object, f"{APP_NAME}/clips/{clip_id}.mp4", mp4, "video/mp4")
        except Exception as e:
            logger.error("clip upload failed: %s", e)
            raise HTTPException(502, "Could not save the clip right now")
        clip = {"id": clip_id, "kit_id": kit_id, "kit_name": (kit or {}).get("kit_name", ""), "song": (kit or {}).get("song", ""),
                "crew": (crew.strip() or "Phnom Penh crew")[:40], "source": "shoot" if source == "shoot" else "preview",
                "storage_path": res["path"], "content_type": "video/mp4", "size": len(mp4), "status": "pending",
                "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat()}
        await db.clips.insert_one(dict(clip))
        return {"id": clip_id, "status": "pending"}

    async def week_likes() -> dict:
        since = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        rows = await db.clip_likes.aggregate([{"$match": {"created_at": {"$gte": since}}},
                                               {"$group": {"_id": "$clip_id", "n": {"$sum": 1}}}]).to_list(5000)
        return {x["_id"]: x["n"] for x in rows}

    @r.get("/clips")
    async def list_clips(device_id: str = ""):
        clips = await db.clips.find({"is_deleted": False, "status": "approved"}, {"_id": 0, "storage_path": 0, "reviewed_by": 0}).to_list(500)
        wl = await week_likes()
        liked = set()
        if device_id:
            liked = {x["clip_id"] for x in await db.clip_likes.find({"device_id": device_id[:64]}, {"_id": 0, "clip_id": 1}).to_list(5000)}
        for c in clips:
            c["week_likes"] = wl.get(c["id"], 0)
            c["liked"] = c["id"] in liked
        clips.sort(key=lambda c: (c["week_likes"], c["created_at"]), reverse=True)
        crews = {}
        for c in clips:
            crews[c["crew"]] = crews.get(c["crew"], 0) + c["week_likes"]
        top = sorted(({"crew": k, "likes": v} for k, v in crews.items() if v > 0), key=lambda x: -x["likes"])[:3]
        since = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        fresh = [c for c in clips if c["created_at"] >= since]
        star = next((c for c in fresh if c["week_likes"] > 0), None)
        kind = "winner" if star else "fresh"
        star = star or max(fresh, key=lambda c: c["created_at"], default=None)
        return {"clips": clips[:60], "top_crews": top, "clip_of_week": star, "featured_kind": kind if star else None}

    @r.post("/clips/{clip_id}/like")
    async def like_clip(clip_id: str, body: LikeIn):
        if not await db.clips.find_one({"id": clip_id, "status": "approved", "is_deleted": False}, {"_id": 1}):
            raise HTTPException(404, "Clip not found")
        dev = body.device_id.strip()[:64]
        if len(dev) < 8:
            raise HTTPException(400, "Bad device id")
        await db.clip_likes.update_one({"clip_id": clip_id, "device_id": dev},
                                       {"$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
        return {"week_likes": (await week_likes()).get(clip_id, 0), "liked": True}

    async def clip_bytes(doc: dict) -> bytes:
        if doc["id"] in _cache:
            _cache.move_to_end(doc["id"])
            return _cache[doc["id"]]
        data, _ = await asyncio.to_thread(get_object, doc["storage_path"])
        _cache[doc["id"]] = data
        while len(_cache) > 8:
            _cache.popitem(last=False)
        return data

    async def serve(doc: dict, request: Request, private: bool = False) -> Response:
        data = await clip_bytes(doc)
        size = len(data)
        rng = request.headers.get("range", "")
        headers = {"Accept-Ranges": "bytes", "Cache-Control": "private, no-store" if private else "public, max-age=86400"}
        if rng.startswith("bytes="):
            start_s, _, end_s = rng[6:].split(",")[0].partition("-")
            if start_s:
                start, end = int(start_s), min(int(end_s) if end_s else size - 1, size - 1)
            else:
                start, end = max(0, size - int(end_s)), size - 1
            if start >= size or start > end:
                return Response(status_code=416, headers={"Content-Range": f"bytes */{size}"})
            return Response(content=data[start:end + 1], status_code=206, media_type=doc["content_type"],
                            headers={**headers, "Content-Range": f"bytes {start}-{end}/{size}"})
        return Response(content=data, media_type=doc["content_type"], headers=headers)

    @r.get("/clips/{clip_id}/video")
    async def clip_video(clip_id: str, request: Request):
        doc = await db.clips.find_one({"id": clip_id, "is_deleted": False, "status": "approved"}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Clip not found")
        return await serve(doc, request)

    @r.get("/admin/clips")
    async def admin_clips(status: str = "pending", admin: dict = Depends(require_role("admin"))):
        return await db.clips.find({"is_deleted": False, "status": status}, {"_id": 0, "storage_path": 0}).sort("created_at", -1).to_list(200)

    @r.get("/admin/clips/{clip_id}/video")
    async def admin_clip_video(clip_id: str, request: Request, admin: dict = Depends(require_role("admin"))):
        doc = await db.clips.find_one({"id": clip_id, "is_deleted": False}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Clip not found")
        return await serve(doc, request, private=True)

    @r.post("/admin/clips/{clip_id}/{action}")
    async def moderate(clip_id: str, action: str, admin: dict = Depends(require_role("admin"))):
        status = {"approve": "approved", "reject": "rejected"}.get(action)
        if not status:
            raise HTTPException(404, "Unknown action")
        allowed = ["pending"] if status == "approved" else ["pending", "approved"]
        res = await db.clips.update_one({"id": clip_id, "is_deleted": False, "status": {"$in": allowed}},
                                        {"$set": {"status": status, "reviewed_by": admin["user_id"],
                                                  "reviewed_at": datetime.now(timezone.utc).isoformat()}})
        if not res.matched_count:
            raise HTTPException(409, "That clip was already reviewed")
        return {"id": clip_id, "status": status}

    return r
