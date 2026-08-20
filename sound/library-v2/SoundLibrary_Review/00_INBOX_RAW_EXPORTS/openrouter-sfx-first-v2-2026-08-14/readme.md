# OpenRouter SFX-first V2 review batch

Review-only output from `ai-tools/2026-08-14-openrouter-sfx-first-lab-v2.py`.

- Nothing in this directory is wired into the Phaser runtime.
- `local__*__source` files are copied from existing handpicks for blind comparison.
- `local__*__tight|heavy|crisp` files are disposable FFmpeg preview treatments.
- `sfx-probe__*` files determine whether an OpenRouter audio model can emit non-speech audio.
- Expanded `model-sfx__*` calls run only after at least one probe succeeds.
- Voice samples are a secondary challenger lane, not promotion candidates.
- Human approval is required before any file can enter `05_FINAL_LIBRARY`.

