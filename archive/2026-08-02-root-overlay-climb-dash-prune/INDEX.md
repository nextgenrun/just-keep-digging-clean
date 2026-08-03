# Root-overlay and climb prune archive

Archived on 2026-08-02 after the active runtime paths were removed and reference-audited. This package is recoverable; nothing in it is loaded by the current player, world model, renderer, or UI.

## Root overlay

| Archived path | Original path | Reason |
|---------------|---------------|--------|
| root-overlay/tiles/roots-shallow.png | sprites/tiles/dynamic-soil/overlays/roots-shallow.png | Retired root overlay texture |
| root-overlay/tiles/roots-deep.png | sprites/tiles/dynamic-soil/overlays/roots-deep.png | Retired deep root overlay texture |
| root-overlay/tiles/roots-overlay.png | sprites/tiles/tiles-under-1000/overlay/roots-overlay.png | Retired root overlay texture |
| root-overlay/tools/process-imagegen-root-overlay-assets.py | ai-tools/2026-07-01-process-imagegen-root-overlay-assets.py | Root-overlay asset-generation helper with no active caller |
| root-overlay/tools/export-v11-runtime-tiles.py | ai-tools/2026-07-13-export-v11-runtime-tiles.py | Tiled exporter still emitted retired root-overlay data |
| root-overlay/tools/export_tiled_all_layers.py | tools/export_tiled_all_layers.py | Legacy layered-Tiled exporter still emitted retired root-overlay data |
| root-overlay/debugging/root-overlay-imagegen/ | debugging/2026-07-01-root-overlay-imagegen/ | Historical generated/review material with no runtime consumer |

## Climb

| Archived path | Original path | Reason |
|---------------|---------------|--------|
| climb/systems/ClimbTrailSystem.js | systems/visual/ClimbTrailSystem.js | Standalone visual system with no active import after climb removal |
| climb/runtime/ual-native-player-v1-climb-sheet.webp | sprites/character/ual-native-player-v1/runtime/ual-native-player-v1-climb-sheet.webp | No active UAL profile or loader reference |
| climb/runtime/survival-ual-player-v1-climb-sheet.webp | sprites/character/survival-ual-player-v1/runtime/survival-ual-player-v1-climb-sheet.webp | No active survival profile or loader reference |
| climb/legacy/sprites/character/sqaure-bot/... | sprites/character/sqaure-bot climb sheets, frames, Piskel, and review repair | Superseded character and climb-only assets with no production profile |
| climb/legacy/sprites/character/character-v8/robot-runtime/... | character-v8 robot climb sheet and frames | No active robot climb profile or loader reference |
| climb/legacy/sprites/character/character-v2/character-movement/... | sprites/character/character-v2/character-movement/movement-climbing/ | Old movement concept with no production consumer |

## Intentionally retained

- Powered flight remains the only vertical traversal ability. The loaded flight sheet and its source/provenance remain at sprites/character/character-v8/runtime/legacy-fly-climb-clean-sheet.webp and the associated character-v8 source manifests.
- Falling and airborne states remain because they support flight and normal physics, not a jump input.
- Gem Dash was already archived under archive/2026-06-26-values-cleanup/gemDash.js. No active Gem Dive or jump runtime implementation was found.

## Legacy helpers

| Archived path | Original path | Reason |
|---------------|---------------|--------|
| legacy-tools/2026-06-25-bulk-migrate.py | ai-tools/2026-06-25-bulk-migrate.py | Historical migration map still named the removed ClimbTrailSystem |
| legacy-tools/2026-06-25-compare-stubs.py | ai-tools/2026-06-25-compare-stubs.py | Historical import fixer still named the already archived Gem Dash config |
