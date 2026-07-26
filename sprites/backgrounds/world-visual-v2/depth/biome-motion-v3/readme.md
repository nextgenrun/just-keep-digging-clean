# Approved smooth biome motion V3

This directory contains the ten production MP4 loops approved on 2026-07-26.

- Each loop animates the complete finished 1536×1024 biome painting.
- Motion is a seamless 8-second, 60 fps subpixel affine drift.
- There is no optical flow, object morphing, particle layer, mist layer, HTML
  overlay, Canvas overlay, or Phaser Graphics overlay.
- The files are scenic backgrounds only. They do not define ground, collision,
  buildings, bridges, or gameplay geometry.
- `2026-07-26-smooth-motion-runtime-manifest-v3.json` records the verified
  codec, dimensions, frame count, duration, file size, and SHA-256 digest.

Regenerate with:

```powershell
python ai-tools/2026-07-26-build-underground-biome-smooth-motion-v3.py --production
```
