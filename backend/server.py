import asyncio
import io
import json
import os
import re
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai import OpenAISpeechToText
from kits import CATALOG, CATALOG_BY_ID, KHR_RATE, MAX_QTY, SONG_FALLBACK, clean_song, fallback_raw, parse_budget, plan_kit
from trends import get_trends, trends_prompt

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


class OrderRequest(BaseModel):
    kit_id: str
    spot: str = Field(min_length=2, max_length=60)
    time: str = Field(min_length=3, max_length=20)
    total_usd: float


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
    fallback: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


def parse_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        raise ValueError("No JSON in model output")
    return json.loads(match.group(0))


def build_kit(request: str, raw: dict, trends: dict) -> ShotKit:
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
    planned, qty = plan_kit(cues, extra, drop, parse_budget(request))
    cue_models = [Cue(second=c["second"], item_id=c["item_id"], item_name=CATALOG_BY_ID[c["item_id"]]["name"], effect=c["effect"],
                      effect_type=CATALOG_BY_ID[c["item_id"]]["effect"], placement_tip=c["placement_tip"]) for c in planned]
    cart = [CartItem(item_id=i, name=CATALOG_BY_ID[i]["name"], qty=q, price_usd=CATALOG_BY_ID[i]["price_usd"],
                     line_usd=round(CATALOG_BY_ID[i]["price_usd"] * q, 2)) for i, q in sorted(qty.items())]
    total = round(sum(c.line_usd for c in cart), 2)
    return ShotKit(request=request, kit_name=str(raw.get("kit_name") or "BoomDrop Kit")[:80], song=clean_song(raw.get("song")),
                   drop_second=drop, cues=cue_models, filming_tip=str(raw.get("filming_tip") or ""), cart=cart,
                   total_usd=total, total_khr=int(round(total * KHR_RATE)),
                   sources=[Source(**x) for x in trends.get("sources", [])[:3]], live_trends=trends.get("live", False))


@api_router.get("/catalog")
async def get_catalog():
    return {"rate_khr": KHR_RATE, "items": [{**c, "price_khr": int(c["price_usd"] * KHR_RATE)} for c in CATALOG]}


@api_router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    data = await audio.read()
    if not data:
        raise HTTPException(400, "Empty audio")
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(413, "Audio too large")
    buf = io.BytesIO(data)
    buf.name = audio.filename or "speech.webm"
    try:
        stt = OpenAISpeechToText(api_key=LLM_KEY)
        res = await stt.transcribe(file=buf, model="whisper-1", response_format="json", language="en",
                                   prompt="A TikTok dancer ordering fireworks in Phnom Penh: dance, song, location, group size, budget in dollars.")
    except Exception as e:
        logger.exception("transcribe failed")
        raise HTTPException(502, f"Transcription failed: {e}")
    return {"text": res.text.strip()}


@api_router.get("/trends")
async def trends():
    data = await get_trends(LLM_KEY)
    return data


async def _llm_kit(request: str, trends_data: dict) -> ShotKit:
    chat = LlmChat(api_key=LLM_KEY, session_id=str(uuid.uuid4()), system_message=SYSTEM_PROMPT) \
        .with_model("anthropic", "claude-sonnet-5-5")
    text = await asyncio.wait_for(chat.send_message(UserMessage(text=request + trends_prompt(trends_data))), 60)
    return build_kit(request, parse_json(text), trends_data)


@api_router.post("/shot-kit", response_model=ShotKit)
async def create_shot_kit(body: KitRequest):
    trends_data = await get_trends(LLM_KEY)
    kit = None
    for attempt in range(2):
        try:
            kit = await _llm_kit(body.request, trends_data)
            break
        except Exception as e:
            logger.warning("shot kit attempt %d failed: %s", attempt + 1, e)
    if kit is None:
        kit = build_kit(body.request, fallback_raw(body.request, trends_data), trends_data)
        kit.fallback = True
    try:
        await db.shot_kits.insert_one(kit.model_dump())
    except Exception as e:
        logger.warning("saving kit failed: %s", e)
    return kit


@api_router.post("/orders")
async def create_order(body: OrderRequest):
    order = {"order_no": f"BD-{uuid.uuid4().hex[:6].upper()}", **body.model_dump(),
             "total_khr": int(round(body.total_usd * KHR_RATE)), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.orders.insert_one(dict(order))
    return order


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
