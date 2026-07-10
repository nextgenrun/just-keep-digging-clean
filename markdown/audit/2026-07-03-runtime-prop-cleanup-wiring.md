# Runtime Prop Cleanup Wiring

This change wires the approved current-source cleanup prop PNGs into runtime without overwriting the original TMX or source export folders.

- Runtime override config: `values/authoredBackgroundAssetOverrides.js`
- Loader integration: `ui/scenes/BootScene.js`
- Smooth prop scaling: `world/rendering/authoredBackgroundTextureFilters.js`
- Placement integration: `world/rendering/BackgroundObjectPlacer.js`
- Cleanup PNG source folder: `exports/ai-enhanced/v7-30-runtime-preview/current-prop-faithful-cleanup/enhanced/`

## What Changed

- Selected authored `prop_*.webp` filenames now resolve to their cleaned PNG candidates at load time.
- The original TMX still references the same authored WebP filenames, so Tiled source data remains unchanged.
- Authored background prop textures now request linear filtering before `setDisplaySize()` scales them.
- Tilemap rendering remains pixel-art oriented; the smooth filtering change is limited to authored background props.

## Validation

- `node --check values/authoredBackgroundAssetOverrides.js`
- `node --check ui/scenes/BootScene.js`
- `node --check world/rendering/BackgroundObjectPlacer.js`
- `node --check world/rendering/authoredBackgroundTextureFilters.js`
- Confirmed all 10 override PNG paths exist.
- Confirmed local server returns `200 OK` for the override config, changed JS modules, and an enhanced PNG.

## Remaining Check

The in-app browser failed to attach to the local page during visual verification, so the final on-canvas appearance still needs a manual refresh at `http://127.0.0.1:8090/`.
