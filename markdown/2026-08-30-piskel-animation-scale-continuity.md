# Piskel animation scale continuity

**Status:** Production runtime repaired on 2026-08-30.

## Finding

The editable Piskel animations already used one stable animation-wide scale.
The size pop was introduced by the unified runtime pack: six Piskel-owned
sheets were rebuilt from larger raw Blender/UAL renders, replacing the
normalized Piskel pixels while retaining their 123 px presentation profile.
In the clearest Jog-to-idle handoff, the runtime changed from a 161 px moving
silhouette to a 187 px idle silhouette; the authored Piskel pair is 154/154 px.

## Runtime authority

`values/survivalUnifiedAnimationRuntimeV1.json` now names the editable
`piskelSource` for Jog, moving Jab, moving Cross, moving phase handoffs,
transitions, and diagonal mining. The unified packer reads those six sources
directly and writes their 256 px cells losslessly. It does not resize,
recenter, crop, interpolate, or reorder individual frames.

The 960-frame, 192 px moving-complex atlas remains under its unified-render
authority because it has a different frame topology. Its existing frame-232
visual hold still prevents the known edge-on one-tick scale collapse.

## Proof

- The Piskel manifest validates all 22 editable entries; the three remaining
  warnings belong to legacy 341 px centering tolerances, not the active
  Survival sheets.
- `testing/2026-08-30-piskel-animation-scale-continuity-contract.py` compares
  457 decoded runtime cells against all six source Piskels pixel for pixel.
- `ai-tools/2026-08-30-audit-unified-animation-scale.py` measures all 55
  unified sheets with their actual 256/192 px cells and renders review
  candidates without treating intentional pose extension as a scale edit.

No input timing, contacts, collision, damage, movement, or gameplay values
changed. `?unifiedAnimation=0` remains the instant runtime rollback.
