# Fire Light V3

Production ImageGen atlases for the carried player torch and its authored
illumination.

## Base fire presentation

- `fire-flame-steady-v3.png` — sixteen-frame calm flame loop.
- `fire-flame-states-v3.png` — four-frame wind, rain, low-fuel, and rekindle rows.
- `fire-light-volume-v3.png` — sixteen retained asymmetric base volumes.
- `fire-light-rays-v3.png` — sixteen local dusty fire-ray/gobo variants.
- `fire-atmosphere-v3.png` — sixteen ember, spark, and fire-lit smoke frames.

## Expanded authored illumination

- `fire-light-hot-core-v3.png` — sixteen turbulent white-gold hotspot fields.
- `fire-light-penumbra-v3.png` — sixteen broad irregular warm falloff fields.
- `fire-light-bounce-v3.png` — sixteen surface-agnostic floor/wall reflections.
- `fire-light-breakup-v3.png` — sixteen smoke-filtered light-breakup patterns.
- `fire-light-environment-v3.png` — exact wind, wet, low-fuel, and rekindle rows.

The expanded library adds 80 new light-only frames. Together with the retained
base volume, the torch now has 96 authored illumination frames and 160 authored
components across all ten atlases.

Every atlas is a 4x4 equal-cell sheet on a black additive-compositing
background: 1252x1252 source pixels and sixteen exact 313x313 frames. New
runtime sheets also have true-black per-frame borders to prevent scaled atlas
seams. `manifest.json` locks dimensions, SHA-256 hashes, generation mode, and
all component totals.

## Piskel anchoring and asset rollback

`piskel/polished-work/` is the editable authority for all ten atlases and all
160 frames. Each project preserves the 313x313 cell grid and frame order while
using integer-only translation to register either the source root, luminous
core, or intentional four-frame state row. No frame is scaled, interpolated,
or redrawn. The worst measured group drift improved from 79.57 px to 0.98 px;
the largest retained-light loss is 1.04%.

The builder only refreshes review candidates. Runtime promotion and byte-exact
asset rollback are explicit:

```powershell
python ai-tools/2026-07-30-refresh-fire-light-piskel-polish.py --apply
python ai-tools/2026-07-30-refresh-fire-light-piskel-polish.py --rollback
```

The query switches below are presentation comparisons; the command rollback
restores the original ten PNG files and manifest hashes.

Runtime code may position, scale, alpha-fade, flip, layer, and select frames
from these authored images. Gameplay reveal radius and tile state remain owned
by `LightSystem`.

Use `?fireLight=legacy` for complete presentation rollback. Use
`?fireLightTextures=0` to retain the original V3 flame, base volume, rays,
atmosphere, and eye adaptation while disabling only the 80-frame expanded
illumination library. Other narrow switches are `?fireRays=0`,
`?eyeAdaptation=0`, and `?fireFlicker=reduced`.
