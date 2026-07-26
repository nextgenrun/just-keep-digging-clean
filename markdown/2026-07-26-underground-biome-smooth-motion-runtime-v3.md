# Underground biome smooth-motion runtime V3

Date: 2026-07-26  
Status: explicitly approved and production-wired

## Outcome

Each of the ten underground biome pools now contains five static 1536x1024
WebPs and one approved 1536x1024 H.264 MP4. The V3 files are eight-second,
60 fps seamless loops generated from the exact approved paintings.

The animation is a restrained subpixel affine drift of the complete finished
image. It does not use optical flow, keyframe morphing, generated in-between
art, HTML, Canvas, Phaser Graphics, particles, mist, emissive duplicates, or
separate moving objects. The rejected V2 WebMs remain review evidence only.

## Runtime behavior

- Mixed media is streamed per intersecting biome through
  `WorldVisualAssetCache`.
- Static and video cards share identical crop, flip, tint, render-depth, and
  complete-card camera-response rules.
- Video playback pauses below 36 fps and resumes after recovery.
- `?biomeBackdropMotion=0` freezes video and disables camera response.
- Departed video cards are stopped before destruction and their cache entries
  are released.

All cards render at depth `-6.4`, behind the authoritative solid terrain facade
at `0.1`. Painted buildings, bridges, roots, ledges, machinery, and ruins are
background scenery only. `WorldModel` continues to own ground, collision,
digging, HP, resources, rewards, and saves.

## Media contract

The runtime manifest at
`sprites/backgrounds/world-visual-v2/depth/biome-motion-v3/2026-07-26-smooth-motion-runtime-manifest-v3.json`
records source/output paths, codec, dimensions, pixel format, frame rate, frame
count, duration, bytes, maximum per-frame movement, and SHA-256 for all ten
loops.

Regenerate with:

```powershell
python ai-tools/2026-07-26-build-underground-biome-smooth-motion-v3.py --production
```
