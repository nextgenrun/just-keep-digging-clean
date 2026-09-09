# First coherence and HUD pass — 2026-09-04

Implemented in the current UNDERSTAR checkout.

- Fixed camera-dependent input offsets for the Inventory, Menu, World Map, and Wiki shortcuts. Their invisible hit areas now stay with their fixed-screen artwork.
- Tutorial pointers and Hardcore status/panic signals hide while menus own input. Tutorial pointers also respect the World Map pause state. Guidance returns after closing the menu; cinematic pointer depth remains intact.
- Extracted shared icon rendering into systems/visual/UiIconRenderer.js. HUD systems now use that renderer directly, and ui/UiIconAtlas.js keeps its existing public exports. This removes the two reversed systems-to-UI imports while preserving pickaxe texture fallback.
- Updated the mining-speed contract to use the approved Quick Reflexes effect in the active upgrade catalog: 1500 ms base cooldown, 3% per rank, 1455 ms after rank one. Gameplay balance values were preserved.
- Corrected the six canonical design documents to distinguish F for digging, Space for the fixed 1.2-tile jump, and Shift for momentum Flight.

## Validation

All nine focused contracts passed:

| Contract | Coverage |
| --- | --- |
| 2026-08-31-level-one-speed-balance-contract.mjs | Baseline movement/mining, current Quick Reflexes reduction, 16 Speed Block regressions |
| 2026-07-28-pickaxe-icon-progression-contract.mjs | Seven distinct pickaxes, texture availability, atlas fallback, existing icon updates |
| 2026-07-28-pickaxe-hud-theme-contract.mjs | Seven themes, ownership, purchase, persistence, rollback |
| 2026-08-20-player-jump-flight-motion-contract.mjs | Fixed jump, momentum Flight, 19 traversal input regressions |
| 2026-09-03-shop-progression-rebalance-contract.mjs | 121 ranks, depth/relic requirements, legacy save versions |
| 2026-08-31-player-facing-copy-contract.mjs | Current player-facing text contracts |
| 2026-08-22-hud-quick-controls-hit-area-contract.mjs | Local hit bounds and fresh-run map access |
| 2026-08-25-hardcore-panic-feedback-contract.mjs | Status, panic effects, menu suppression, restoration |
| 2026-08-26-hardcore-death-save-and-tutorial-pointer-contract.mjs | Death-save protections, pointer priority, modal/map hide-and-restore behavior |

The existing HUD browser fixture now accepts scrollX/scrollY query parameters and reports real Phaser hit-test results in its DOM snapshot. All four controls passed at camera offsets (750, 6110) and (-750, -300). Clicking Menu also triggered its callback and did not leak a pointer event into the world. Removed a retired clock/weather call that prevented this fixture from starting.

Full-game review used this checkout's canonical serve.py on a temporary local port, with the existing jkd_e2e save-blocking mode. A fresh Hardcore guided start reached the town. Mouse clicks opened Menu, Inventory, and World Map. Pause showed a clean overlay, and Resume restored the arrow and Hardcore status. The World Map also hid the pointer after the final correction and restored it when closed with M. No error-level browser logs were recorded in the final full-game review. The shared buff icon rendered in its existing browser fixture.

Screenshot and JSON evidence: C:/Users/Mila/.codex/visualizations/2026/09/04/01a06dce-689a-7e00-847d-4347b1f4f94c/coherence-proof/

- pause-before.png / pause-after.png: observed pause overlap and the corrected result.
- gameplay-resumed.png: guidance restored after Resume.
- inventory-after.png: Inventory opened by mouse without overlaid guidance.
- map-after.png / map-resumed.png: Map opened by mouse, guidance hidden while open and restored when closed.
- final-runtime-errors.json: no error-level browser logs in the final full-game review.
- hud-hit-tests-positive.json / hud-hit-tests-negative.json: four controls pass real Phaser hit testing at both camera offsets.
- hud-click-proof.json: pause callback fired, UI feedback fired once, world pointer handler stayed untouched.
- buff-hud.png / buff-proof.json: shared icon rendering evidence.

## Remaining scope

The architecture guard now passes its import-direction checks, but the overall command still fails on 54 oversized modules already present before this pass. No baseline was relaxed. Scoped whitespace checks and renderer syntax checks passed.

This pass verifies the opening and focused UI behavior. Full first-session pacing, perceptible upgrade impact, and comparative Celestial ability balance still need dedicated game-time work.
