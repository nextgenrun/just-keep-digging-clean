# Above-ground collision and legacy island-art audit

Date: 2026-09-06

The `layeredSky=1` candidate now omits the three old Heavenblock backdrop paintings at their owner, before either loading assets or creating Images. It retains the three collision-aligned facade images and all portal/altar interactions. The default renderer still admits all six Heavenblock layers.

Changed owner: `systems/environment/V11SkyIslandVisualSystem.js`.

## Remaining visible structures have collision

| Structure | World cells | Authority | Current presentation |
| --- | --- | --- | --- |
| Older central wall | x119; BEDROCK at y0,17,57,60, AIR at y63-64 | `TILED_WORLD_OVERRIDE` authored runs; old gate clearance | `WorldVisualBedrockMaterialLayer` |
| Level Two divider | x132; BEDROCK at y0,17,57,60,63,64 | `SECOND_WORLD_CONFIG.levelDivider` and `UndergroundBedrockLayout` | `WorldVisualBedrockMaterialLayer` |
| Level One portal island floor | x80..95, y18 | Authored `FLOOR_TOWN_1` cells | Native `level1-platform.webp` plus floor rendering |
| Level Two portal island floor | x142..157, y18 | Authored `FLOOR_TOWN_2` cells | Native `level2-platform.webp` plus floor rendering |
| Devil Eclipse platform | x223..239, y14 | `HEAVENBLOCKS_ACCESS_CONFIG` BEDROCK platform | `devil-eclipse-facade-v1.png` plus semantic bedrock |
| Angel platform | x223..239, y32 | `HEAVENBLOCKS_ACCESS_CONFIG` BEDROCK platform | `angel-heavenblock-facade-v1.png` plus semantic bedrock |
| Cloud Reef platform | x223..239, y49 | `HEAVENBLOCKS_ACCESS_CONFIG` BEDROCK platform | `lower-sky-facade-v1.png` plus semantic bedrock |

Both central wall columns coexist above ground. The underground cleanup starts below the surface, so it does not erase the authored x119 wall. The newly generated full-review WorldModel confirmed all cells listed above. At y65 the columns become their respective town floor types, and at y66 both are AIR.

The semantic bedrock skin consists of `sprites/backgrounds/world-visual-v2/semantic-decals-v1/bedrock-seamless-v1.webp` and `sprites/tiles/approved-world/bedrock-megalith-lock-v1.png`, cropped to actual solid cells. Its straight outer edges follow collision geometry; those edges are not opaque sky-card borders.

The removed background-only assets are the `devil-eclipse-backdrop-v1.png`, `angel-heavenblock-backdrop-v1.png`, and `lower-sky-backdrop-v1.png` paintings under `sprites/backgrounds/heavenblocks-v1/`. They had depth -9.8. The retained facade images are at -0.55 and are separate from these paintings.

## Suggested later geometry treatment

New platform/column skins can replace the retained solid material while keeping their exact walking/contact edge readable. Soft decorative rock or mist silhouettes can extend outside that edge without hiding it. Removing the obsolete authored x119 wall itself would require an explicit world-layout change and matching traversal checks; a background exclusion must not create an invisible wall.

## Validation

- Existing `testing/2026-07-26-heavenblocks-visual-layout-contract.mjs`: passed.
- Focused owner probe: candidate queues three facade assets and creates three facade Images; Level One ground portal remains creatable; baseline returns all six layers; teardown clears sprites. Passed.
- Instantiated current full-review WorldModel and inspected both wall columns and all platform endpoints: confirmed the types in the table.
- Scoped `git diff --check`: passed.
- This audit did not run an independent browser pass. The main replacement-background review owns rendered acceptance.