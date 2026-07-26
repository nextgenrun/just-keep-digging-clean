# Modular Surface Props

Independent ImageGen-authored alpha cutouts for the complete Level 1 and Level
2 surface bands. No runtime panorama, prop strip, collision, input, or saved
state lives here.

## Runtime set

- Level 1 loads the nine `level1-*-v1.webp` assets.
- Level 2 loads the nine lossless `level2-*-v2.webp` assets.
- The `level2-*-v1.webp` files are retained as the immutable pre-tone sources;
  they are not queued by `BootScene`.

The shared set is: well, wagon, pergola, bench, handcart, supplies, fence,
plants, and lantern. `values/worldVisualSurfacePropAssets.js` owns physical
height, expected source dimensions, walk-through clearance, and visual
influence. `values/assetKeys.js` owns the live key/path routing.

## Quality and scale

- Scale derives from the 1.75 m UAL player and 0.8-tile visible player height.
- Props are bottom-anchored and sample real ground support at left, center, and
  right before being shown.
- Alpha corners, dimensions, source density, and all runtime paths are guarded
  by `testing/2026-07-26-surface-props-contract.mjs`.
- `level2-*-v2.webp` lifts dark midtones without resizing, repainting, adding a
  glow, or changing alpha. The retained v1 files make that image pass reversible.

## Provenance and review

- ImageGen chroma masters:
  `ai-tools/2026-07-26-surface-props-level1-chroma-v1.png` and
  `ai-tools/2026-07-26-surface-props-level2-chroma-v1.png`.
- Level 2 tone manifest:
  `2026-07-26-surface-props-level2-tone-v2-manifest.json`.
- Scale sheet:
  `visual-approval-previews/2026-07-26-modular-surface-props-scale-sheet-v1.png`.
- Runtime/rollback record:
  `markdown/2026-07-26-modular-surface-props-runtime-v1.md`.
