# BoomDrop — PRD

## Original problem statement
Mobile-first web app BoomDrop: a fireworks stand in Phnom Penh, Cambodia, where TikTok dancers order by voice. Dark night sky theme with neon pink and gold accents. Tagline "Fireworks that hit on the drop." Push-to-talk mic → speech-to-text → transcript shown, plus a text box. The LLM builds a 15s "Shot Kit" JSON using the 12-item catalog, stays within budget and puts the biggest effect on the drop. Card shows the kit name, timed cues, filming tip and a cart with USD and KHR totals (4,000 KHR/USD). No login, one page.

## User choices
Claude Sonnet (Emergent key), English-only UI and speech, Whisper STT.

## Architecture
- FastAPI: /api/catalog, /api/transcribe (whisper-1), /api/shot-kit (claude-sonnet-5-5). The backend recalculates totals from catalog prices, fits the cart to the parsed budget (USD/riel), cleans the song label and saves kits to Mongo `shot_kits`.
- React: App + components/boom (mic, input, kit card, cart, catalog sheet) + components/preview (R3F 3D scene, GPU particles, Director, Dancer, World, Web Audio beat, 2D fallback).

## Implemented
- 2026-06: MVP voice/text → Shot Kit card, catalog sheet, presets
- 2026-06: Song fallback "Your trending track"; budget check on the backend (cheapest non-drop items are reduced first)
- 2026-06: "Preview my shot" full-screen 3D riverside scene: low-poly dancer, 7 GPU particle effects, bloom, colored lights, river reflection, 15s timeline, 3x drop + shake + flash + DROP label, Web Audio beat, Stage/Phone(9:16) toggle, replay, orbit, 2D canvas fallback (?fallback2d)

## Backlog (from test report iteration 2)
- P1: Enforce 4-6 cues and a drop cue after budget trimming; reconcile cue counts against cart quantities; cap the size of LLM-supplied quantities
- P1: Pause/resume in the preview; the DROP label stays on screen when the drop is at 14-15s; the 9:16 frame is stretched on tall, narrow phones
- P2: Share/copy the kit, dialog focus trap, mute state when audio is unavailable, 2D fallback view modes
