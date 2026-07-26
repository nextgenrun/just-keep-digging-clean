# Graveborer Wurm V1

Production ImageGen-authored runtime art for the Hardcore-only Graveborer Wurm.

- `graveborer-head-runtime-v1.webp` — attacking head and open mineral jaw
- `graveborer-body-runtime-v1.webp` — repeatable armored middle segment
- `graveborer-tail-runtime-v1.webp` — tapered trailing segment
- `graveborer-medallion-runtime-v1.webp` — fixed-camera threat-state HUD art
- `graveborer-burrow-warning-runtime-v1.webp` — world-space pressure seam

The full-resolution alpha masters remain beside the optimized runtime files.
Flat-chroma generation sources are date-stamped under `/ai-tools/`.

Rebuild without changing gameplay scale:

```powershell
python tools/build_graveborer_wurm_sprite_package.py `
  --source-dir sprites/environment/graveborer-wurm-v1 `
  --output-dir sprites/environment/graveborer-wurm-v1
```

Do not replace these with procedural placeholders or unapproved HTML UI.
