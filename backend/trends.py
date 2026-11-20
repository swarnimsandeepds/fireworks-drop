import asyncio
import json
import logging
import os
import re
import time
import uuid

import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

SEARCH_URL = "https://ydc-index.io/v1/search"
QUERIES = ["trending TikTok dance songs this week", "Phnom Penh events tonight"]
CACHE_TTL = 600
FALLBACK = {
    "sounds": [
        {"title": "APT.", "artist": "ROSÉ & Bruno Mars"},
        {"title": "Espresso", "artist": "Sabrina Carpenter"},
        {"title": "Die With A Smile", "artist": "Lady Gaga & Bruno Mars"},
    ],
    "events": [{"name": "Riverside night market", "place": "Sisowath Quay"}],
    "sources": [],
    "live": False,
}
EXTRACT_PROMPT = (
    "From these web search results, extract up to 4 currently trending TikTok dance sounds (title, artist) and "
    "up to 2 events happening in Phnom Penh tonight or this week (name, place). Use only what the results support. "
    "Return only JSON: {\"sounds\": [{\"title\", \"artist\", \"source\"}], \"events\": [{\"name\", \"place\", \"source\"}]} "
    "where source is the result number you used."
)

_cache = {"at": 0.0, "data": None, "ttl": CACHE_TTL}
_lock = asyncio.Lock()


async def _search(client: httpx.AsyncClient, query: str, key: str) -> list:
    r = await client.get(SEARCH_URL, params={"query": query, "count": 5}, headers={"X-API-Key": key})
    r.raise_for_status()
    web = (r.json().get("results") or {}).get("web") or []
    return [
        {"title": w.get("title") or w.get("url"), "url": w["url"], "text": " ".join((w.get("snippets") or [])[:3]) or w.get("description", "")}
        for w in web if w.get("url")
    ]


async def _extract(results: list, llm_key: str) -> dict:
    listing = "\n".join(f"[{i}] {r['title']} — {r['text'][:400]}" for i, r in enumerate(results))
    chat = LlmChat(api_key=llm_key, session_id=str(uuid.uuid4()), system_message=EXTRACT_PROMPT).with_model("anthropic", "claude-haiku-4-5-20251001")
    text = await chat.send_message(UserMessage(text=listing))
    data = json.loads(re.search(r"\{.*\}", text, re.S).group(0))
    sounds = [{"title": str(s["title"])[:60], "artist": str(s.get("artist", ""))[:60], "source": s.get("source")} for s in data.get("sounds", []) if s.get("title")][:4]
    events = [{"name": str(e["name"])[:60], "place": str(e.get("place", ""))[:60], "source": e.get("source")} for e in data.get("events", []) if e.get("name")][:2]
    return {"sounds": sounds, "events": events}


def _pick_sources(results: list, picks: list) -> list:
    idx = []
    for p in picks:
        if isinstance(p.get("source"), int) and 0 <= p["source"] < len(results) and p["source"] not in idx:
            idx.append(p["source"])
    for i in range(len(results)):
        if i not in idx:
            idx.append(i)
    return [{"title": results[i]["title"], "url": results[i]["url"]} for i in idx[:3]]


async def _fetch(llm_key: str) -> dict:
    key = os.environ.get("YDC_API_KEY")
    if not key:
        return FALLBACK
    try:
        async with httpx.AsyncClient(timeout=4) as client:
            songs, events = await asyncio.wait_for(asyncio.gather(*(_search(client, q, key) for q in QUERIES)), 4)
    except Exception as e:
        logger.warning("You.com search failed: %s", e)
        return FALLBACK
    results = songs + events
    if not results:
        return FALLBACK
    try:
        picked = await asyncio.wait_for(_extract(results, llm_key), 20)
    except Exception as e:
        logger.warning("trend extraction failed: %s", e)
        return {**FALLBACK, "sources": _pick_sources(results, []), "live": True}
    if not picked["sounds"]:
        picked["sounds"] = FALLBACK["sounds"]
    if not picked["events"]:
        picked["events"] = FALLBACK["events"]
    return {
        "sounds": [{"title": s["title"], "artist": s["artist"]} for s in picked["sounds"]],
        "events": [{"name": e["name"], "place": e["place"]} for e in picked["events"]],
        "sources": _pick_sources(results, picked["sounds"] + picked["events"]),
        "live": True,
    }


async def get_trends(llm_key: str) -> dict:
    async with _lock:
        if _cache["data"] and time.time() - _cache["at"] < _cache["ttl"]:
            return _cache["data"]
        data = await _fetch(llm_key)
        _cache.update(at=time.time(), data=data, ttl=CACHE_TTL if data["live"] else 60)
        return data


def trends_prompt(trends: dict) -> str:
    sounds = "; ".join(f"{s['title']} by {s['artist']}" for s in trends["sounds"])
    events = "; ".join(f"{e['name']} at {e['place']}" for e in trends["events"])
    return f"\n\nLive trends tonight (web search): trending sounds: {sounds}. Phnom Penh events: {events}. Use them if they fit the request."
