# PERSIST-016: Resource labels and colors are duplicated and numerically misaligned

- Status: confirmed latent defect
- Severity: P2
- Category: duplicated catalog / enum drift / dead helper
- Evidence: `world/playScene/PlaySceneGameplay.js:27-33` defines unused numeric `resourceMap` and `colorMap` helpers. Their numeric keys do not match `values/tileTypes.js`: the helpers treat `4` as Dark Dirt and shift later metals, while the enum defines `4` as BEDROCK, `5` as DARK_DIRT_NORMAL, `6` as DARK_DIRT_STRONG, `7` as BRONZE, `8` as STEEL, `9` as IRON, `10` as SILVER, and `11` as GOLD. Separately, `world/playScene/PlaySceneSetup.js:812` and `systems/visual/StarPillarSystem.js:48-60` duplicate resource display-name catalogs keyed by different identifiers.
- Failure: if the dead gameplay helpers are reactivated, bedrock and every resource from the dark-dirt range onward can receive the wrong name and color; the missing enum value `11` falls back to a generic result. Active catalogs can also drift independently, including `Dark Dirt (S)` versus `Hard Dirt`.
- Permanent solution: define one resource presentation catalog keyed by `TILE_TYPES` or one canonical resource ID map, derive colors and display names from that catalog, delete the unused helpers, and add an enum-completeness test covering every displayed resource.
- Verification contract: each mineable/displayable tile type has exactly one label and color source; all catalog keys resolve through the authoritative enum with no numeric positional assumptions.
