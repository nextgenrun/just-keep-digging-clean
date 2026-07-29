# Surface

Production alpha ground caps for the scenic-v2 surface stage.

- `town-surface-edge-v1.png` is the retained deep natural-edge source used by
  the earlier comparison.
- `town-surface-edge-thin-v2.png` is the production full-width cap. It keeps
  the approved Town Square slate pixels at their calibrated physical scale,
  repeats with mirrored joins across all 280 surface columns, and is only 48
  source pixels high so it cannot hide the first underground tile row.
- `town-surface-edge-thin-v2.manifest.json` records the approved ImageGen source
  crop, exact hashes, Town Square handoff output, and presentation-only
  invariants.

The cap adds no gameplay collision. `WorldModel` tiles remain authoritative,
and the separate conditional S/down release handles open surface shafts.

`surface-ground-variation-v5/` contains ten additive 1536x160 ImageGen ground
paintings. They sit above, and never replace, the retained Town Square slate
core. Cards are never mirrored, overlap by 192 px, keep their authored alpha,
and share the authoritative terrain mask so every dug opening remains exact.
Use `?surfaceGroundVariation=0` for a pixel-identical return to the prior
surface presentation.
