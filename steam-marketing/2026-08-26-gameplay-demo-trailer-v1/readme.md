# UNDERSTAR Gameplay Demo Trailer V1

Date: 2026-08-26  
Status: review-only; not uploaded or runtime-wired

## Review exports

- `understar-gameplay-demo-trailer-v1.mp4`: 30 seconds, 1920x1080, 30 fps.
- `understar-gameplay-short-01-v1.mp4`: 15 seconds, 1080x1920, 30 fps.
- Both exports use H.264 video, 48 kHz stereo AAC, burned captions, and
  separately editable SRT, VTT, and ASS subtitle sidecars.
- `media-verification.json` contains hashes, stream metadata, exact sources,
  and full-decode results.

## Sources and edit boundaries

The moving-image core is real F9 gameplay from the broad 2026-08-20 capture and
the two clean portrait 2026-08-03 captures under `systems/screenrecord/`. Three
2026-07-31 recordings were excluded because their decoded frames were black.

OpenRouter `google/gemini-3.1-flash-image` generated four gameplay-referenced
review images for a known total of USD 0.408314. Only
`openrouter-gameplay-keyart-landscape-v2.png` passed review. It is used as a
static three-second trailer end card with the burned disclosure
`GAMEPLAY-DERIVED KEY ART`; it is never presented as gameplay. Both vertical
variants changed the Star or surrounding ore too much and are excluded. The
Short contains no generated image.

No API credential is stored in this package, its manifest, or the build script.

## Voice, captions, and Star motion

The narration uses the existing verified ElevenLabs Frederick Surrey V2 takes
at stability 0.70, similarity 0.86, style 0, and speed 0.90. Captions include
spoken dialogue plus meaningful sound cues, remain two lines or fewer, and use
high-contrast safe-area boxes.

Stars remain fixed to their authored tile, scale, rotation, and alpha. Life is
provided only by frame content inside the Star: facets, inner fire, corona, and
stardust. The edit adds no float, bob, transform, zoom-pulse, or whole-object
pulse. The shared 72-frame atlas covers all 250 deterministic Star identities.

## Rebuild

Run `pipelines/video/2026-08-26-build-gameplay-demo-trailer.py` with
`FFMPEG_EXE` set to a local FFmpeg executable. The current Codex tool set did
not expose a native MCP video timeline, so the project-owned FFmpeg pipeline was
used for the deterministic local edit.

No file here is loaded by the game or published automatically.
