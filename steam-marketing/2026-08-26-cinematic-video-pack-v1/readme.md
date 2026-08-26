# UNDERSTAR Cinematic Video Pack V1

Date: 2026-08-26  
Status: generated locally; not uploaded to Steam or social platforms

This package owns the review-ready marketing trailer, two vertical social
shorts, their captions, narration, OpenRouter source clips, and generation
provenance. The marketing exports are not loaded by the game.

All three marketing finals include narration, game-owned music, atmospheric
sound, and burned captions for mute viewers. Matching SRT/ASS files remain
editable for platform-native caption uploads.

Runtime-ready opening and Mossback discovery edits are copied to
`sprites/cinematics/understar-cinematics-v1/` by the dated edit tool.

## Deliverables

- `understar-cinematic-trailer-v1.mp4` — 1920x1080 cinematic companion trailer.
- `understar-short-01-mossback-v1.mp4` — 1080x1920 Titan-discovery short.
- `understar-short-02-depth-v1.mp4` — 1080x1920 descent/Understar short.
- matching `.srt` files under `captions/` for editable platform uploads.
- `generation-manifest.json` and `media-verification.json` for model, cost,
  dimensions, duration, codec, audio, and hash provenance.

No file in this package is automatically published.

## Frederick V2 replacement

Frederick Surrey - Smooth and Velvety is selected to replace all five existing
OpenRouter narration tracks while preserving the scripts, music, ambience,
captions, and edit timing. `request-plan-frederick-v2.json` defines the five
bounded ElevenLabs requests (541 characters total) and isolated candidate
outputs. It does not include NPC chatter or tutorial narration.

Generation remains blocked by ElevenLabs HTTP 402 `paid_plan_required`: Voice
Library API use is unavailable on the account's current Free tier. No Frederick
cinematic narration or V2 cinematic video has been generated, and runtime still
uses the verified V1 files until the replacement mix passes review.
