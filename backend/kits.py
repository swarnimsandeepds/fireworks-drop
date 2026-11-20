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
TIPS_KM = {
    "sparkle": "អ្នករាំកាន់ឱ្យឆ្ងាយពីមុខ និងសក់ប្រវែងមួយដៃ។",
    "fountain": "ដាក់លើដីរាបស្មើ ៣ ម៉ែត្រពីក្រោយអ្នករាំ គ្មាននរណានៅក្បែរ ៣ ម៉ែត្រ។",
    "smoke": "ដាក់លើដីពីក្រោយក្រុម ដើម្បីឱ្យពណ៌រសាត់ចូលក្នុងរូប។",
    "confetti": "នៅមុខឆាក បាញ់ឡើងលើ ឆ្ងាយពីមុខ និងកាមេរ៉ា។",
    "spinner": "ភ្ជាប់នៅចំហៀងឆាកលើដីស្អាត។",
    "crackle": "ដាក់លើដីមុខឆាក ឆ្ងាយពីជើង។",
    "strobe": "ដាក់កណ្តាលខាងមុខលើដី បែរចេញពីទូរសព្ទ។",
    "bundle": "ចែកដំបងភ្លើងឱ្យក្រុម ទឹកភ្លើងនៅសងខាងឆាក។",
}
SWAP_NOTE = {"en": "Swapped in to fit your budget. ", "km": "ប្តូរដើម្បីឱ្យសមនឹងថវិកា។ "}
EFFECT_WORDS = [
    (11, ["cannon", "glitter", "កាណុង"]), (3, ["fountain", "ទឹកភ្លើង"]), (8, ["crackle", "ផ្ទុះតូច"]),
    (10, ["strobe", "ភ្លឹបភ្លែត"]), (7, ["spinner", "កង្ហារ"]), (9, ["heart", "បេះដូង"]),
    (5, ["blue smoke", "ផ្សែងខៀវ"]), (4, ["smoke", "ផ្សែង"]), (6, ["confetti", "popper", "ក្រដាសពណ៌"]),
    (1, ["sparkler", "wand", "ផ្កាភ្លើង", "ដំបងភ្លើង"]),
]
DROP_RANK = [11, 3, 8, 10, 2, 7]

BUDGET_PATTERNS = [
    r"\$\s*(\d[\d,]*(?:\.\d+)?)",
    r"(\d[\d,]*(?:\.\d+)?)\s*(?:usd|dollars?|bucks|ដុល្លារ)",
    r"(?:budget|ថវិកា)\D{0,15}(\d[\d,]*(?:\.\d+)?)",
]


def price(item_id: int) -> float:
    return CATALOG_BY_ID[item_id]["price_usd"]


KHMER_DIGITS = str.maketrans("០១២៣៤៥៦៧៨៩", "0123456789")


def parse_budget(text: str):
    t = text.lower().translate(KHMER_DIGITS)
    m = re.search(r"(\d[\d,]*)\s*(?:khr|riels?|៛|រៀល)", t)
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


def make_cue(second: float, item_id: int, tip: str = "", effect: str = "", lang: str = "en") -> dict:
    it = CATALOG_BY_ID[item_id]
    tips = TIPS_KM if lang == "km" else TIPS
    return {"second": second, "item_id": item_id, "effect": effect or it["effect"], "placement_tip": tip or tips[it["effect"]]}


def _swap(cue: dict, item_id: int, lang: str = "en"):
    cue.update(make_cue(cue["second"], item_id, lang=lang))
    cue["placement_tip"] = SWAP_NOTE.get(lang, SWAP_NOTE["en"]) + cue["placement_tip"]


def _cost(cues, extra) -> float:
    return sum(price(c["item_id"]) for c in cues) + sum(price(i) * q for i, q in extra.items())


def _free_second(cues, drop):
    taken = [c["second"] for c in cues] + [drop]
    return next((s for s in FILL_SECONDS if all(abs(s - t) >= 1 for t in taken)), 0.0)


def plan_kit(cues: list, extra: dict, drop: float, budget, lang: str = "en"):
    """Returns (cues, qty_by_item): 4-6 cues, one on the drop, each cue uses one unit, fit to budget."""
    cues = [dict(c) for c in cues]
    near = [c for c in cues if abs(c["second"] - drop) < 0.6]
    if near:
        drop_cue = max(near, key=lambda c: price(c["item_id"]))
    elif cues:
        drop_cue = max(cues, key=lambda c: price(c["item_id"]))
    else:
        drop_cue = make_cue(drop, 3, lang=lang)
    drop_cue["second"] = drop
    others = [c for c in cues if c is not drop_cue and abs(c["second"] - drop) >= 0.6]
    others = sorted(others, key=lambda c: -price(c["item_id"]))[:5]
    extra = {i: min(q, MAX_QTY) for i, q in extra.items() if q > 0}

    while len(others) < 3:
        rest = None if budget is None else budget - _cost([drop_cue] + others, extra)
        fits = [i for i in (9, 7, 1, 6) if rest is None or price(i) <= rest]
        others.append(make_cue(_free_second([drop_cue] + others, drop), fits[0] if fits else 6, lang=lang))

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
                _swap(max(pricey, key=lambda c: price(c["item_id"])), 6, lang)
                continue
            rest = budget - _cost(others, {})
            options = [i for i in BIG_FIRST if price(i) <= rest and price(i) < price(drop_cue["item_id"])]
            new = options[0] if options else 6
            if new == drop_cue["item_id"]:
                break
            _swap(drop_cue, new, lang)

    final = sorted([drop_cue] + others, key=lambda c: c["second"])
    qty = dict(extra)
    for c in final:
        qty[c["item_id"]] = qty.get(c["item_id"], 0) + 1
    return final, qty


def parse_crew(text: str) -> int:
    t = text.lower().translate(KHMER_DIGITS)
    m = re.search(r"(\d{1,2})\s*(?:of us|dancers?|people|friends|ppl|នាក់)", t)
    if m:
        return max(1, min(20, int(m.group(1))))
    if re.search(r"\b(couple|duo|pair)\b|គូ", t):
        return 2
    return 1


def requested_items(text: str) -> list:
    t = text.lower()
    found = []
    for item_id, words in EFFECT_WORDS:
        if any(w in t for w in words) and item_id not in found:
            if item_id == 4 and 5 in found:
                continue
            found.append(item_id)
    return found


def fallback_raw(request: str, trends: dict, lang: str = "en") -> dict:
    drop = parse_drop(request) or 8.0
    crew = parse_crew(request)
    sounds = trends.get("sounds") or []
    named = [x["title"] for x in sounds if x["title"].lower().strip(" .") in request.lower()]
    asked = requested_items(request)
    drop_item = next((i for i in DROP_RANK if i in asked), 11)
    rest = [i for i in asked if i != drop_item]
    rest += [i for i in (1, 4, 6, 9) if i not in rest and i != drop_item]
    cues = [make_cue(drop, drop_item, lang=lang)]
    for item_id in rest[:4]:
        cues.append(make_cue(_free_second(cues, drop), item_id, lang=lang))
    wand = any(c["item_id"] == 1 for c in cues)
    km = lang == "km"
    return {
        "kit_name": (f"កញ្ចប់ BoomDrop សម្រាប់ {crew} នាក់" if km else f"BoomDrop House Kit for {crew}"),
        "song": named[0] if named else SONG_FALLBACK,
        "drop_second": drop,
        "cues": cues,
        "cart": [{"item_id": 1, "qty": crew}] if wand and crew > 1 else [],
        "filming_tip": (
            f"ថតបញ្ឈរ 60fps លើជើងកាមេរ៉ា ៥ ម៉ែត្រពីក្រោយ កម្ពស់ចង្កេះ ពេលយប់ ឱ្យឃើញអ្នករាំទាំង {crew} នាក់ និងមានចន្លោះខាងលើសម្រាប់ drop។"
            if km else
            f"Shoot vertical at 60fps on a tripod 5 m back at waist height, after dark, with all {crew} dancer{'s' if crew > 1 else ''} framed and headroom for the drop."
        ),
    }
