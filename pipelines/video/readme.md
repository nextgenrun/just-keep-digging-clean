# Video Pipelines

Offline tools for assembling review-only marketing and cinematic exports.
Nothing in this directory may upload media or wire it into the game runtime.

## UNDERSTAR ElevenLabs shorts

- `2026-08-26-generate-elevenlabs-promo-audio.py` generates capped narration
  and optional non-musical sound-design beds from a package request plan. It
  also accepts narration-only plans, including the five-track Frederick V2
  cinematic replacement plan.
- `elevenLabsPromoApi.py` owns the sanitized ElevenLabs HTTP calls.
- `2026-08-26-build-understar-promo-shorts.py` assembles three vertical MP4s.
- `understarShortRenderer.py` owns cropping, captions, audio mixing, and export.

The audio generator is dry-run by default and reads `ELEVENLABS_API_KEY` only
from the process environment. The renderer reads `FFMPEG_EXE`; its temporary
build files are discarded after export.

## Gameplay demo trailer

- `2026-08-26-build-gameplay-demo-trailer.py` assembles the 30-second landscape
  demo trailer and one 15-second vertical Short from real F9 captures.
- The build burns readable ASS captions and retains SRT, VTT, and ASS sidecars.
- Star presentation remains tile-anchored: only authored internal animation is
  shown, with no editor-added float, bob, transform, or whole-object pulse.
- A gameplay-derived OpenRouter image is confined to the static trailer end
  card and is labeled as key art; the vertical Short is captured gameplay only.
