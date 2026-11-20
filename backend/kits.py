import re

KHR_RATE = 4000
SONG_FALLBACK = "Your trending track"
MAX_QTY = 50

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
BIG_FIRST = sorted(CATALOG_BY_ID, key=lambda i: -CATALOG_BY_ID[i]["price_usd"])
FILL_SECONDS = [1, 3, 5, 11, 13, 2, 12, 14, 0.5, 7]
TIPS = {
    "sparkle": "Held by a dancer at arm's length, away from face and hair.",
    "fountain": "On flat ground 3 m behind the dancers, nobody within 3 m.",
    "smoke": "Placed on the ground behind the crew so the color drifts into frame.",
    "confetti": "Front of the stage, pointed up and away from faces and the camera.",
    "spinner": "Fixed to the side of the stage on clear ground.",
    "crackle": "On the ground in front of the stage, clear of feet.",
    "strobe": "Front center on the ground, facing away from the phone.",
    "bundle": "Wands to the crew, fountains either side of the stage.",
}
BUDGET_PATTERNS = [
    r"\$\s*(\d[\d,]*(?:\.\d+)?)",
    r"(\d[\d,]*(?:\.\d+)?)\s*(?:usd|dollars?|bucks)\b",
    r"budget\D{0,15}(\d[\d,]*(?:\.\d+)?)",
]


def price(item_id: int) -> float:
    return CATALOG_BY_ID[item_id]["price_usd"]


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


def parse_drop(text: str):
    m = re.search(r"drops?\s*(?:hits\s*)?(?:at|on|around)?\s*(?:0:)?(\d{1,2}(?:\.\d+)?)\s*(?:s|sec|seconds?)?\b", text.lower())
    return max(1.0, min(14.0, float(m.group(1)))) if m else None


def clean_song(value) -> str:
    song = re.sub(r"[\(\)\[\]]", "", str(value or "")).strip(" .-\"'")
    bad = re.search(r"\b(not specified|unknown|none|n/a|choose|pick|select|your choice|user|trending)\b", song, re.I)
    if not song or bad or len(song.split()) >= 6:
        return SONG_FALLBACK
    return song


def make_cue(second: float, item_id: int, tip: str = "", effect: str = "") -> dict:
    it = CATALOG_BY_ID[item_id]
    return {"second": second, "item_id": item_id, "effect": effect or it["effect"], "placement_tip": tip or TIPS[it["effect"]]}


def _swap(cue: dict, item_id: int):
    cue.update(make_cue(cue["second"], item_id))
    cue["placement_tip"] = "Swapped in to fit your budget. " + cue["placement_tip"]


def _cost(cues, extra) -> float:
    return sum(price(c["item_id"]) for c in cues) + sum(price(i) * q for i, q in extra.items())


def _free_second(cues, drop):
    taken = [c["second"] for c in cues] + [drop]
    return next((s for s in FILL_SECONDS if all(abs(s - t) >= 1 for t in taken)), 0.0)


def plan_kit(cues: list, extra: dict, drop: float, budget):
    """Returns (cues, qty_by_item): 4-6 cues, one on the drop, each cue uses one unit, fit to budget."""
    cues = [dict(c) for c in cues]
    near = [c for c in cues if abs(c["second"] - drop) < 0.6]
    if near:
        drop_cue = max(near, key=lambda c: price(c["item_id"]))
    elif cues:
        drop_cue = max(cues, key=lambda c: price(c["item_id"]))
    else:
        drop_cue = make_cue(drop, 3)
    drop_cue["second"] = drop
    others = [c for c in cues if c is not drop_cue and abs(c["second"] - drop) >= 0.6]
    others = sorted(others, key=lambda c: -price(c["item_id"]))[:5]
    extra = {i: min(q, MAX_QTY) for i, q in extra.items() if q > 0}

    while len(others) < 3:
        rest = None if budget is None else budget - _cost([drop_cue] + others, extra)
        fits = [i for i in (9, 7, 1, 6) if rest is None or price(i) <= rest]
        others.append(make_cue(_free_second([drop_cue] + others, drop), fits[0] if fits else 6))

    if budget is not None:
        def over():
            return _cost([drop_cue] + others, extra) > budget + 1e-9
        while over() and extra:
            i = min(extra, key=lambda k: (k == drop_cue["item_id"], price(k)))
            extra[i] -= 1
            if extra[i] <= 0:
                del extra[i]
        while over() and len(others) > 3:
            others.remove(min(others, key=lambda c: price(c["item_id"])))
        while over():
            pricey = [c for c in others if c["item_id"] != 6]
            if pricey:
                _swap(max(pricey, key=lambda c: price(c["item_id"])), 6)
                continue
            rest = budget - _cost(others, {})
            options = [i for i in BIG_FIRST if price(i) <= rest and price(i) < price(drop_cue["item_id"])]
            new = options[0] if options else 6
            if new == drop_cue["item_id"]:
                break
            _swap(drop_cue, new)

    final = sorted([drop_cue] + others, key=lambda c: c["second"])
    qty = dict(extra)
    for c in final:
        qty[c["item_id"]] = qty.get(c["item_id"], 0) + 1
    return final, qty


def fallback_raw(request: str, trends: dict) -> dict:
    drop = parse_drop(request) or 8.0
    sounds = trends.get("sounds") or []
    named = [x["title"] for x in sounds if x["title"].lower().strip(" .") in request.lower()]
    song = named[0] if named else SONG_FALLBACK
    seconds = [0.5, max(1.0, drop - 4), drop, min(14.5, drop + 2), 14.0 if drop < 12 else 1.5]
    items = [1, 4, 11, 6, 9]
    return {
        "kit_name": "BoomDrop House Kit",
        "song": song,
        "drop_second": drop,
        "cues": [make_cue(s, i) for s, i in zip(seconds, items)],
        "cart": [],
        "filming_tip": "Shoot vertical at 60fps on a tripod 5 m back at waist height, after dark, with all dancers framed and headroom for the drop.",
    }
