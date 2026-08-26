# UNDERSTAR ElevenLabs Promo Shorts V1

Date: 2026-08-26  
Status: review-only; not uploaded or runtime-wired

Voice status: the V1 default premade narration was rejected on 2026-08-26 as
too synthetic. Do not publish these V1 exports. Replacement Professional Voice
Clone auditions are in `voice-auditions-v2/`. Frederick Surrey - Smooth and
Velvety was selected for all three V2 shorts and added to the ElevenLabs account.

V2 generation is prepared but blocked before rendering. ElevenLabs returned
HTTP 402 `paid_plan_required` for the first two narration requests because Voice
Library voices cannot be used through the API on the account's current Free
tier. The two-failure safety fuse then stopped the batch. No Frederick narration
was successfully generated, and no V2 video was rendered. The resumable V2 batch
contains exactly three narration requests (536 characters total), reuses the
existing sound-design files, and is defined in `request-plan-v2.json`.

Three 18-second vertical social-video concepts use existing approved UNDERSTAR
cinematic/gameplay visuals with new ElevenLabs narration and non-musical sound
design:

1. `understar-short-01-how-deep-v1.mp4` — mystery and descent.
2. `understar-short-02-titans-v1.mp4` — Mossback/Titan discovery.
3. `understar-short-03-grow-stronger-v1.mp4` — mining, progression, Flight,
   biome exploration, and optional permadeath.

All exports target 1080x1920 H.264/AAC with burned readable captions. Separate
ASS caption sources, posters, API provenance, hashes, and source paths remain
in this package. Nothing is automatically published.

## Completed verification

- ElevenLabs batch: 6/6 files ready (3 narrations + 3 sound-design beds).
- API-reported usage: 985 provider credits in total; 445 narration characters
  and 54 generated SFX seconds.
- Video exports: exactly 18.00 seconds each, 1080x1920, 24 fps H.264 High with
  48 kHz AAC audio.
- Audio masters: -16.3, -16.2, and -15.6 LUFS integrated; -0.4 dBFS true peak.
- Full video/audio decode passed for all three MP4s and each SHA-256 matches
  `media-verification.json`.
- Hook, middle, and CTA frames were inspected at 1.5, 7.5, 13.0, and 16.5
  seconds. Captions remain inside vertical safe areas.
- The supplied API key was process-only, cleared after generation, and is not
  present in the package or pipeline files.
