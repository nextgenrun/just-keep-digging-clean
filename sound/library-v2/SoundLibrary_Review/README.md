# Sound Library Review Folder

Created by Deploy-SoundReviewLibrary.ps1.

## Basic workflow

1. Generate review candidates from the prompt corpus. For layered Stable Audio
   batches, use `pipelines/audio/2026-08-26-generate-stable-audio-library.py`;
   it is dry-run by default and requires an explicit credit ceiling.
2. Save raw exports into 00_INBOX_RAW_EXPORTS/<batch>.
3. Rename files using:
   ASSETID__take01__UNTESTED.wav
4. Listen and copy/move into 01_REVIEW_BY_TAG/<tag>.
5. Good files go to 02_ACCEPTED_CANDIDATES.
6. Files needing work go to 03_EDITING_QUEUE.
7. Final game-ready assets go to 05_FINAL_LIBRARY/audio/...
8. Update 06_ENGINE_IMPORT/manifest_drafts/audio-manifest.draft.json.

Stable Audio output remains raw and `UNTESTED`. Its batch manifest records the
model, layer, prompt, seed, generation ID, bytes, and SHA-256. Do not promote a
generated file from the inbox until it has been listened to and explicitly
rated good.

The ElevenLabs mockup follows the same boundary. Its batch includes a local
`index.html` sampler, complete reference effects, and isolated layers. Sampler
ratings remain browser-local and do not promote or wire any file automatically.

## Review tags

UNTESTED
GOOD
GOOD_LAYER_ONLY
GOOD_ONE_SHOT
GOOD_BUT_NEEDS_TRIM
GOOD_BUT_TOO_LOUD
GOOD_BUT_NEEDS_EQ
GOOD_BUT_LOOP_CLICK
KEEP_FOR_OTHER_USE
KEEP_FOR_DEEP_LAYER
KEEP_FOR_BOSS_AREA
KEEP_FOR_VOID_LAYER
TOO_LONG
TOO_SHORT
TOO_MUSICAL
ROBOT_HUM
TOO_SYNTHETIC
TOO_CARTOON
TOO_REALISTIC_LOUD
TOO_BUSY
WRONG_SOUND
HAS_VOICE
HAS_ANIMAL
HAS_INSTRUMENTS
HAS_BACKGROUND_MUSIC
BAD_LOOP
BAD_TRANSIENT
REJECTED

## Recommended final formats

Use WAV while editing. Export game-ready files as OGG or compressed WAV depending on the engine.

