import asyncio
import io
import json
import os
import re
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai import OpenAISpeechToText
from kits import CATALOG, CATALOG_BY_ID, KHR_RATE, MAX_QTY, SONG_FALLBACK, clean_song, fallback_raw, parse_budget, plan_kit
from trends import get_trends, trends_prompt
from storage import init_storage
from wall import build_wall_router
from clerk_auth import clerk_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
LLM_KEY = os.environ['EMERGENT_LLM_KEY']

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are BoomDrop, a fireworks stand for TikTok dancers in Phnom Penh. Build a Shot Kit for a 15 second video. "
    "Use only items from the catalog. Stay within the budget. Put the biggest effect on the beat drop. "
    "Return only JSON with: kit_name, song, drop_second, cues (array of 4 to 6 objects with second, item_id, effect, "
    "placement_tip), filming_tip, cart (array of item_id, name, qty, price_usd), total_usd, total_khr.\n\n"
    f"Catalog (id, name, price_usd, effect type):\n{json.dumps(CATALOG)}\n"
    f"Convert USD to riel at {KHR_RATE} KHR per dollar. price_usd in cart is the unit price. "
    f"If the user does not name a song, set song to exactly \"{SONG_FALLBACK}\". The song field must be under 6 words, "
    "with no instructions, notes or parentheses."
)

app = FastAPI()
api_router = APIRouter(prefix="/api")


class KitRequest(BaseModel):
    request: str = Field(min_length=3, max_length=2000)
    lang: str = "en"


class EditRequest(BaseModel):
    command: str = Field(min_length=2, max_length=1000)
    lang: str = "en"


def lang_note(lang: str) -> str:
    return "\nWrite kit_name, every effect, placement_tip, filming_tip and changes in Khmer script. Keep the song title as is." if lang == "km" else ""


class Cue(BaseModel):
    second: float
    item_id: int
    item_name: str
    effect: str
    effect_type: str
    placement_tip: str


class CartItem(BaseModel):
    item_id: int
    name: str
    qty: int
    price_usd: float
    line_usd: float


class Source(BaseModel):
    title: str
    url: str


SPOTS = ["Riverside", "Koh Pich", "Wat Phnom", "Independence Monument", "Night Market"]


class OrderRequest(BaseModel):
    kit_id: str
    spot: str
    time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")


class ShotKit(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request: str
    kit_name: str
    song: str
    drop_second: float
    cues: List[Cue]
    filming_tip: str
    cart: List[CartItem]
    total_usd: float
    total_khr: int
    sources: List["Source"] = []
    live_trends: bool = False
    budget_usd: Optional[float] = None
    delivery: Optional[dict] = None
    removed: List[int] = []
    fallback: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


def parse_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        raise ValueError("No JSON in model output")
    return json.loads(match.group(0))


def build_kit(request: str, raw: dict, trends: dict, budget: Optional[float], lang: str = "en", banned=()) -> ShotKit:
    cues = []
    for c in raw.get("cues", []):
        item = CATALOG_BY_ID.get(int(c.get("item_id", 0)))
        sec = float(c.get("second", -1))
        if item and 0 <= sec <= 15:
            cues.append({"second": sec, "item_id": item["id"], "effect": str(c.get("effect") or item["effect"]),
                         "placement_tip": str(c.get("placement_tip", ""))})
    if not cues:
        raise ValueError("Kit has no valid cues")
    asked = {}
    for line in raw.get("cart", []):
        item = CATALOG_BY_ID.get(int(line.get("item_id", 0)))
        if item:
            asked[item["id"]] = asked.get(item["id"], 0) + min(max(int(line.get("qty", 0)), 0), MAX_QTY)
    usage = {}
    for c in cues:
        usage[c["item_id"]] = usage.get(c["item_id"], 0) + 1
    extra = {i: q - usage.get(i, 0) for i, q in asked.items() if q > usage.get(i, 0)}
    drop = max(0.0, min(15.0, float(raw.get("drop_second", 8))))
    planned, qty = plan_kit(cues, extra, drop, budget, lang, banned)
    cue_models = [Cue(second=c["second"], item_id=c["item_id"], item_name=CATALOG_BY_ID[c["item_id"]]["name"], effect=c["effect"],
                      effect_type=CATALOG_BY_ID[c["item_id"]]["effect"], placement_tip=c["placement_tip"]) for c in planned]
    cart = [CartItem(item_id=i, name=CATALOG_BY_ID[i]["name"], qty=q, price_usd=CATALOG_BY_ID[i]["price_usd"],
                     line_usd=round(CATALOG_BY_ID[i]["price_usd"] * q, 2)) for i, q in sorted(qty.items())]
    total = round(sum(c.line_usd for c in cart), 2)
    return ShotKit(request=request, kit_name=str(raw.get("kit_name") or "BoomDrop Kit")[:80], song=clean_song(raw.get("song")),
                   drop_second=drop, cues=cue_models, filming_tip=str(raw.get("filming_tip") or ""), cart=cart,
                   total_usd=total, total_khr=int(round(total * KHR_RATE)),
                   sources=[Source(**x) for x in trends.get("sources", [])[:3]], live_trends=trends.get("live", False), budget_usd=budget)


@api_router.get("/catalog")
async def get_catalog():
    return {"rate_khr": KHR_RATE, "items": [{**c, "price_khr": int(c["price_usd"] * KHR_RATE)} for c in CATALOG]}


STT_PROMPTS = {
    "en": "A TikTok dancer ordering fireworks in Phnom Penh: dance, song, location, group size, budget in dollars.",
    "km": "អ្នករាំ TikTok កុម្ម៉ង់កាំជ្រួចនៅភ្នំពេញ៖ ការរាំ បទចម្រៀង ទីតាំង ចំនួនមនុស្ស និងថវិកា។",
}


@api_router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...), language: str = Form("en")):
    data = await audio.read()
    if not data:
        raise HTTPException(400, "Empty audio")
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(413, "Audio too large")
    buf = io.BytesIO(data)
    buf.name = audio.filename or "speech.webm"
    try:
        stt = OpenAISpeechToText(api_key=LLM_KEY)
        res = await stt.transcribe(file=buf, model="whisper-1", response_format="json", language="km" if language == "km" else "en",
                                   prompt=STT_PROMPTS["km" if language == "km" else "en"])
    except Exception as e:
        logger.exception("transcribe failed")
        raise HTTPException(502, f"Transcription failed: {e}")
    return {"text": res.text.strip()}


@api_router.get("/trends")
async def trends():
    data = await get_trends(LLM_KEY)
    return data


async def _llm_kit(request: str, trends_data: dict, lang: str) -> ShotKit:
    chat = LlmChat(api_key=LLM_KEY, session_id=str(uuid.uuid4()), system_message=SYSTEM_PROMPT + lang_note(lang)) \
        .with_model("anthropic", "claude-sonnet-5-5")
    text = await asyncio.wait_for(chat.send_message(UserMessage(text=request + trends_prompt(trends_data))), 60)
    return build_kit(request, parse_json(text), trends_data, parse_budget(request), lang)


@api_router.post("/shot-kit", response_model=ShotKit)
async def create_shot_kit(body: KitRequest):
    trends_data = await get_trends(LLM_KEY)
    kit = None
    for attempt in range(2):
        try:
            kit = await _llm_kit(body.request, trends_data, body.lang)
            break
        except Exception as e:
            logger.warning("shot kit attempt %d failed: %s", attempt + 1, e)
    if kit is None:
        kit = build_kit(body.request, fallback_raw(body.request, trends_data, body.lang), trends_data, parse_budget(body.request), body.lang)
        kit.fallback = True
    try:
        await db.shot_kits.insert_one(kit.model_dump())
    except Exception as e:
        logger.warning("saving kit failed: %s", e)
    return kit


EDIT_PROMPT = (
    "You are BoomDrop, a fireworks stand for TikTok dancers in Phnom Penh. You edit an existing 15 second Shot Kit from a dancer's "
    "voice command. Use only catalog items. Keep 4 to 6 cues and keep the biggest effect on the beat drop. The dancer may add or "
    "remove items, change the budget, or set the delivery place and time. Keep everything the command does not change. "
    "Never use items listed in the current removed_item_ids unless the command explicitly asks to add them back. "
    "Return only JSON with: kit_name, song, drop_second, cues (array of second, item_id, effect, placement_tip), filming_tip, "
    "cart (array of item_id, qty), removed_item_ids (catalog ids the dancer asked to remove, or []), "
    "added_item_ids (catalog ids the dancer explicitly asked to add back or add, or []), budget_usd (new budget in US dollars at 4000 riel per dollar, or null if not mentioned), "
    f"delivery (object with spot as one of {json.dumps(SPOTS)} or null, and time as HH:MM 24h or null), "
    "changes (1 to 4 very short phrases saying what changed).\n\n"
    f"Catalog (id, name, price_usd, effect type):\n{json.dumps(CATALOG)}"
)


ADD_WORDS = re.compile(r"\b(add|bring back|put back|include|plus|more|want)\b|បន្ថែម|ដាក់", re.I)
REMOVE_WORDS = re.compile(r"\b(remove|drop the|no more|without|take out|delete|ditch|lose the)\b|ដក|យកចេញ|កុំ", re.I)


def clean_delivery(d) -> Optional[dict]:
    if not isinstance(d, dict):
        return None
    spot = d.get("spot") if d.get("spot") in SPOTS else None
    time_ = d.get("time") if isinstance(d.get("time"), str) and re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", d["time"]) else None
    return {"spot": spot, "time": time_} if spot or time_ else None


@api_router.get("/shot-kit/{kit_id}", response_model=ShotKit)
async def get_shot_kit(kit_id: str):
    doc = await db.shot_kits.find_one({"id": kit_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Kit not found")
    return ShotKit(**doc)


@api_router.post("/shot-kit/{kit_id}/edit")
async def edit_shot_kit(kit_id: str, body: EditRequest):
    doc = await db.shot_kits.find_one({"id": kit_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Kit not found")
    current = ShotKit(**doc)
    snapshot = {
        "kit_name": current.kit_name, "song": current.song, "drop_second": current.drop_second, "filming_tip": current.filming_tip,
        "cues": [{"second": c.second, "item_id": c.item_id, "effect": c.effect, "placement_tip": c.placement_tip} for c in current.cues],
        "cart": [{"item_id": c.item_id, "qty": c.qty} for c in current.cart], "budget_usd": current.budget_usd,
        "removed_item_ids": current.removed,
    }
    trends_data = {"sources": [x.model_dump() for x in current.sources], "live": current.live_trends}
    for attempt in range(2):
        try:
            chat = LlmChat(api_key=LLM_KEY, session_id=str(uuid.uuid4()), system_message=EDIT_PROMPT + lang_note(body.lang)) \
                .with_model("anthropic", "claude-sonnet-5-5")
            text = await asyncio.wait_for(chat.send_message(UserMessage(
                text=f"Current kit:\n{json.dumps(snapshot)}\n\nVoice command: {body.command}")), 60)
            raw = parse_json(text)
            b = raw.get("budget_usd")
            budget = float(b) if isinstance(b, (int, float)) and b > 0 else (parse_budget(body.command) or current.budget_usd)
            def ids(key):
                return {int(i) for i in raw.get(key) or [] if str(i).isdigit() and int(i) in CATALOG_BY_ID}
            added = ids("added_item_ids") if ADD_WORDS.search(body.command) else set()
            removed = (set(current.removed) | ids("removed_item_ids")) - added
            if REMOVE_WORDS.search(body.command):
                after = {int(c["item_id"]) for c in (raw.get("cues") or []) + (raw.get("cart") or []) if str(c.get("item_id", "")).isdigit()}
                removed |= {c.item_id for c in current.cart} - after - added
            kit = build_kit(current.request, raw, trends_data, budget, body.lang, removed)
            kit.removed = sorted(removed)
            new_delivery = clean_delivery(raw.get("delivery")) or {}
            merged = {**(current.delivery or {}), **{k: v for k, v in new_delivery.items() if v}}
            kit.delivery = merged or None
            await db.shot_kits.insert_one(kit.model_dump())
            changes = [str(c)[:90] for c in raw.get("changes") or []][:4]
            return {"kit": kit.model_dump(), "changes": changes, "delivery": kit.delivery, "applied": True}
        except Exception as e:
            logger.warning("kit edit attempt %d failed: %s", attempt + 1, e)
    return {"kit": current.model_dump(), "changes": [], "delivery": None, "applied": False}


@api_router.post("/orders")
async def create_order(body: OrderRequest):
    if body.spot not in SPOTS:
        raise HTTPException(422, "Unknown delivery spot")
    kit = await db.shot_kits.find_one({"id": body.kit_id}, {"_id": 0})
    if not kit:
        raise HTTPException(404, "Kit not found")
    order = {"order_no": f"BD-{uuid.uuid4().hex[:8].upper()}", "kit_id": body.kit_id, "spot": body.spot, "time": body.time,
             "cart": kit["cart"], "total_usd": kit["total_usd"], "total_khr": kit["total_khr"],
             "payment": "mock_paid", "status": "packed", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.orders.insert_one(dict(order))
    return order


app.include_router(api_router)
app.include_router(build_wall_router(db, logger))
app.include_router(clerk_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def ensure_indexes():
    try:
        await db.shot_kits.create_index("id", unique=True)
        await db.orders.create_index("order_no", unique=True)
        await db.clips.create_index("id", unique=True)
        await db.clips.create_index([("status", 1), ("is_deleted", 1)])
        await db.clip_likes.create_index([("clip_id", 1), ("device_id", 1)], unique=True)
        await db.clip_likes.create_index("created_at")
        await db.users.create_index("user_id", unique=True)
        await asyncio.to_thread(init_storage)
    except Exception as e:
        logger.error("index creation failed: %s", e)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
