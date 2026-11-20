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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
LLM_KEY = os.environ['EMERGENT_LLM_KEY']
KHR_RATE = 4000

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

CATALOG = [
    {"id": 1, "name": "Cold Sparkler Wand", "price_usd": 1.50, "effect": "sparkle"},
    {"id": 2, "name": "Gold Fountain Small", "price_usd": 3.00, "effect": "fountain"},
    {"id": 3, "name": "Gold Fountain Tall", "price_usd": 5.00, "effect": "fountain"},
    {"id": 4, "name": "Pink Smoke Stick", "price_usd": 2.50, "effect": "smoke"},
    {"id": 5, "name": "Blue Smoke Stick", "price_usd": 2.50, "effect": "smoke"},
    {"id": 6, "name": "Confetti Popper", "price_usd": 1.00, "effect": "confetti"},
    {"id": 7, "name": "Silver Spinner", "price_usd": 2.00, "effect": "spinner"},
    {"id": 8, "name": "Crackle Ring", "price_usd": 4.00, "effect": "crackle"},
    {"id": 9, "name": "Heart Sparkler", "price_usd": 2.00, "effect": "sparkle"},
    {"id": 10, "name": "Neon Strobe Pot", "price_usd": 3.50, "effect": "strobe"},
    {"id": 11, "name": "Glitter Cannon", "price_usd": 6.00, "effect": "confetti"},
    {"id": 12, "name": "Crew Pack (6 wands, 2 fountains)", "price_usd": 12.00, "effect": "bundle"},
]
CATALOG_BY_ID = {c["id"]: c for c in CATALOG}

SONG_FALLBACK = "Your trending track"

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
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


def parse_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        raise ValueError("No JSON in model output")
    return json.loads(match.group(0))


BUDGET_PATTERNS = [
    r"\$\s*(\d[\d,]*(?:\.\d+)?)",
    r"(\d[\d,]*(?:\.\d+)?)\s*(?:usd|dollars?|bucks)\b",
    r"budget\D{0,15}(\d[\d,]*(?:\.\d+)?)",
]


def parse_budget(text: str):
    t = text.lower()
    m = re.search(r"(\d[\d,]*)\s*(?:khr|riels?|៛)", t)
    if m:
        return float(m.group(1).replace(",", "")) / KHR_RATE
    for pat in BUDGET_PATTERNS:
        m = re.search(pat, t)
        if m:
            return float(m.group(1).replace(",", ""))
    return None


def clean_song(value) -> str:
    song = re.sub(r"[\(\)\[\]]", "", str(value or "")).strip(" .-\"'")
    bad = re.search(r"\b(not specified|unknown|none|n/a|choose|pick|any|your choice|user|trending)\b", song, re.I)
    if not song or bad or len(song.split()) > 6:
        return SONG_FALLBACK
    return song


def fit_budget(cart: List["CartItem"], budget: float, drop_ids: set) -> List["CartItem"]:
    cart = [l.model_copy() for l in cart]
    while cart and sum(l.line_usd for l in cart) > budget + 1e-9:
        pool = [l for l in cart if l.item_id not in drop_ids] or cart
        cheapest = min(pool, key=lambda l: l.price_usd)
        cheapest.qty -= 1
        cheapest.line_usd = round(cheapest.qty * cheapest.price_usd, 2)
        if cheapest.qty <= 0:
            cart.remove(cheapest)
    return cart


def build_kit(request: str, raw: dict) -> ShotKit:
    cues = []
    for c in raw.get("cues", []):
        item = CATALOG_BY_ID.get(int(c.get("item_id", 0)))
        if not item:
            continue
        sec = max(0.0, min(15.0, float(c.get("second", 0))))
        cues.append(Cue(second=sec, item_id=item["id"], item_name=item["name"],
                        effect=str(c.get("effect", item["effect"])), effect_type=item["effect"], placement_tip=str(c.get("placement_tip", ""))))
    cues.sort(key=lambda c: c.second)
    cart = []
    for line in raw.get("cart", []):
        item = CATALOG_BY_ID.get(int(line.get("item_id", 0)))
        qty = int(line.get("qty", 0))
        if not item or qty <= 0:
            continue
        cart.append(CartItem(item_id=item["id"], name=item["name"], qty=qty, price_usd=item["price_usd"],
                             line_usd=round(item["price_usd"] * qty, 2)))
    if len(cues) < 1 or not cart:
        raise ValueError("Kit missing cues or cart")
    drop_second = max(0.0, min(15.0, float(raw.get("drop_second", 8))))
    budget = parse_budget(request)
    if budget is not None:
        drop_ids = {c.item_id for c in cues if abs(c.second - drop_second) < 0.6}
        cart = fit_budget(cart, budget, drop_ids)
        kept = {l.item_id for l in cart}
        cues = [c for c in cues if c.item_id in kept]
        if not cart or not cues:
            raise ValueError("Budget too small for a kit")
    total = round(sum(c.line_usd for c in cart), 2)
    return ShotKit(request=request, kit_name=str(raw.get("kit_name", "BoomDrop Kit")), song=clean_song(raw.get("song")),
                   drop_second=drop_second, cues=cues,
                   filming_tip=str(raw.get("filming_tip", "")), cart=cart, total_usd=total,
                   total_khr=int(round(total * KHR_RATE)))


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


@api_router.post("/shot-kit", response_model=ShotKit)
async def create_shot_kit(body: KitRequest):
    last_err = None
    for _ in range(2):
        chat = LlmChat(api_key=LLM_KEY, session_id=str(uuid.uuid4()), system_message=SYSTEM_PROMPT) \
            .with_model("anthropic", "claude-sonnet-5-5")
        try:
            text = await chat.send_message(UserMessage(text=body.request))
            kit = build_kit(body.request, parse_json(text))
            await db.shot_kits.insert_one(kit.model_dump())
            return kit
        except Exception as e:
            last_err = e
            logger.warning("shot kit attempt failed: %s", e)
    raise HTTPException(502, f"Could not build a Shot Kit: {last_err}")


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
