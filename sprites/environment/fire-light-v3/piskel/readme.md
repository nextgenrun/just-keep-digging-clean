# Fire Light V3 Piskel polish

Editable, fixed-anchor masters for all ten production Fire Light atlases.

## Project stages

- `registered-source/` contains immutable, pixel-identical imports of the
  pre-polish ImageGen runtime atlases.
- `polished-work/` contains the ten editable `.piskel` authorities.
- `rollback-v1/` contains byte-identical rollback copies of the registered
  source projects.
- `runtime-rollback-v1/` contains the ten byte-identical pre-polish PNG atlases.
- `candidate-runtime/` contains exact 4x4 runtime exports from the polished
  projects.
- `strips/` contains 16x1 interchange sheets for frame-order review.

Every project keeps sixteen 313x313 frames, the production frame order, an
authoritative pixel layer, and a hidden `JKD Drift And Safe-Border Guides`
layer. Source-root assets lock the flame/ray/emission root while allowing the
upper silhouette to move. Broad illumination assets lock their luminous core.
Wind, rain, low-fuel, and rekindle atlases are registered within their own
four-frame rows so intentional state differentiation remains intact.

Registration is integer-translation-only: no frame is scaled or interpolated.
The build enforces a three-pixel true-black border, at most 2% light-energy
loss, and at most 2.25 px group range. The accepted package measures 0.98 px
worst-case range and 1.04% worst-case energy loss. `geometry-report.json`
contains the per-frame shifts and before/after measurements.

## Commands

```powershell
python ai-tools/2026-07-30-build-fire-light-piskel-polish-v1.py
python ai-tools/2026-07-30-refresh-fire-light-piskel-polish.py --apply
python ai-tools/2026-07-30-refresh-fire-light-piskel-polish.py --rollback
```

The builder never changes production PNGs. Apply and rollback both verify
recorded hashes before replacing the ten runtime files.
