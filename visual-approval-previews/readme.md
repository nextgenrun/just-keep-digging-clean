# Visual Approval Previews

Review-only visual assets live here before runtime wiring. Each subfolder must identify its source art, intended review scope, and whether anything is game-loaded.

## V11 background relief POC v3 — 2026-07-15

- `v11-background-relief-poc-v3/` compares one untouched high-detail V11 detail plate against the same art with an aligned height map and live WebGL relief/parallax.
- It tests 3D depth treatment for backgrounds only: no tiles, props, Meshy models, or replacement artwork.
- Nothing in the folder is game-loaded; it is a review-only mockup.

## Meshy background render mockup v2 — 2026-07-15

- **Rejected:** `meshy-background-render-poc-v2/` proved that a single generated cave prop/model is not a valid high-detail mining-background depth treatment.
- It intentionally excludes tile generation and the rejected procedural rock-overlay method.
- Nothing in the folder is game-loaded; it is a visual mockup only.

## Mining world 3D bake POC v1 — 2026-07-15

- `mining-world-3d-bake-poc-v1/` compares the actual V11 mining runtime and dynamic-soil tiles with a front-facing 3D-to-2D bake at exactly 94px per tile.
- The proof is Meshy-ready but currently uses local procedural Blender geometry because no Meshy provider/key was connected.
- Nothing in the folder is game-loaded; approval is required before any runtime flag or asset-path wiring.

## Approved player HUD v1 — 2026-07-13

- `approved-player-hud-v1/` preserves the exact approved full-screen mockup and a transparent runtime-parts review sheet.
- The approval files are not game-loaded; production frame copies are under `sprites/UI/hud-approved-v1/`.

## V11 underground depth approval — 2026-07-12

- `v11-underground-depth-approval-contact-sheet-2026-07-12.png` is the primary art-direction review for Level 1 through 2,000m and Level 2 through its future 5,000m envelope.
- `v11-underground-depth-plan-blueprint-2026-07-12.png` records the exact current runtime cutoff near 1,935m, the prepared 2,000m art boundary, and the dormant Level 2 extension.
- The annotated and unannotated Level 1/Level 2 concept images are mockups only. None are loaded by Phaser or referenced by the TMX.
- Rebuild annotations with `ai-tools/2026-07-12-annotate-v11-underground-depth-concepts.py`.
- `v11-runtime-depth-v4-sample-contact-sheet-2026-07-12.png` shows the final streamed production chunk families after the anti-stretch and anti-repeat polish pass.
