# Star Block Idle V1

Authored motion-only idle package for the mineable `SKY_TILE` Stars. The
existing 250 Star identity cores and their dedicated identity lights remain the
crisp visual authorities; this package adds neutral refracted motion without
recoloring or replacing either one.

## Runtime package

- One 1536x768 RGB atlas with 72 black-backed additive frames.
- Three 24-frame loops at 6 fps: facet current, inner fire, and elemental corona.
- 128 px cells in twelve columns; decoded cost is 4.5 MiB.
- Every Star selects one loop deterministically and offsets its frame phase by
  world position. The overlay remains at fixed position, size, rotation, and
  alpha while only its authored frame content advances. The underlying ImageGen
  core/light pair keeps its existing bounded per-identity pulse and rotation.
- Phaser may apply that authored identity motion, additively composite this
  atlas, and frame-step it. Runtime tinting, position/size drift, and procedural
  replacement art are forbidden.

## Source and cost

The three silent four-second sources under `source/clips/` were generated with
`google/veo-3.1-lite` through OpenRouter. Locked matching first/last frames kept
the clips loopable. OpenRouter reported $0.36 total usage against a $0.75 hard
cap. The API key was read from hidden standard input and is not stored.

The builder aligns each clip, regresses away whole-frame brightness breathing,
removes its static temporal median, and retains localized caustic/fire motion.
It then equalizes every frame's total energy, neutralizes the extracted light
offline, guards the cell edges, and assembles a seamless atlas. This prevents
both a baked replacement body and a cheap global pulse.

## Build

```powershell
& <bundled-python> ai-tools/2026-08-26-generate-star-block-idle-source.py --key-stdin --budget-usd 0.75
& <bundled-python> ai-tools/2026-08-26-build-star-block-idle-v1.py --ffmpeg <ffmpeg.exe>
```

`star-block-idle-v1.manifest.json` records source/runtime hashes, loop seams,
frame uniqueness, alignment, energy, and decoded memory. The animated GIF and
contact sheet are review outputs, not runtime textures.

## Runtime and rollback

`values/worldVisualSemanticAssets.js` owns atlas geometry, cadence, fixed
opacity/scale, and the `starIdle` switch. `WorldVisualSemanticStarPresenter.js`
layers the motion over every exact identity frame, restores each ImageGen
core/light motion signature, and updates the overlay atlas frame independently.
The same fixed-anchor loops are wired into Star Codex selectors and the dossier
preview. Reveal radius, rarity, HP, rewards, mining, release FX, darkness
persistence, and saves are unchanged.

Use `?starIdle=0` or `?starIdle=legacy` to omit this atlas from both world and
Star Codex UI.
