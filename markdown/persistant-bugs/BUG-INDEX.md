# Bug Index

| ID | Severity | Area | Finding | Runtime status |
| --- | --- | --- | --- | --- |
| PERSIST-001 | P2 | Persistence | Milestone save failures are swallowed and load failures reset progress to an empty list. | Active conditional defect |
| PERSIST-002 | P2 risk / P3 current | Numeric helpers | `clamp01` is implemented in multiple modules with inconsistent handling of invalid values. | Active contract inconsistency |
| PERSIST-003 | P3 | Archive/imports | Archived modules contain unresolved relative imports. | Legacy/archive only |
| PERSIST-004 | P3 | Animation catalog | Two semantic animation properties use the same literal asset key. | Active compatibility debt; currently deduplicated |
| PERSIST-005 | P4 | Authored data | Two active tiled layer identifiers contain spelling errors and are repeated across the data contract. | Active naming inconsistency; currently consistent |
| PERSIST-006 | P2 risk / P3 current | Persistence architecture | Campfire, milestone, floating-star, and world-map systems implement separate storage failure and slot-migration behavior. | Active repeated failure-handling defect |
| PERSIST-007 | P3 | Rendering helpers | Clamp, hash, color, source-size, scale, entrance, tile-key, and smoothstep helpers are copied across modules. | Active duplication and drift risk |
| PERSIST-008 | P4 | Asset catalog | `ASSET_KEYS` is shallow-frozen while nested audio manifest arrays are mutated during boot. | Active contract inconsistency; intentional dynamic behavior |
| PERSIST-009 | P2 risk / P3 current | Boot manifests | Valid non-array JSON or invalid manifest entries can escape the guarded loader and fail audio preload. | Active conditional input defect |
| PERSIST-010 | P3 | Audio catalogs | BootScene and SoundSystem repeat audio lists; SoundSystem stores stale `.wav` paths for `.ogg` cache entries. | Active metadata and drift defect; playback currently key-based |

## Audit-cleared evidence

These checks produced no additional confirmed defects in the owned, non-vendor scope:

- Active relative import paths: no missing active relative targets.
- Active named imports: no missing named exports in the checked runtime tree.
- JavaScript syntax: 391 active files and 2,790 non-vendor files outside `libs` parsed without syntax errors.
- Active HTML script and stylesheet references: no missing active targets.
- Exported media references: no missing active exported media targets.
- Playlist, voice, and Arc Core manifests: all referenced files resolved, with 27, 30, and 1 entries respectively.
- Runtime preload key uniqueness: no duplicate keys in the checked visual preload groups.
- Authored placement identifiers: 455 objects with coordinates had no duplicate placement IDs. Layer metadata IDs were excluded because they are a separate namespace.
- Tiled background source filenames: no source-to-resolved filename mismatches.
- Direct PlayScene method calls: no unresolved calls in the checked mixin and scene files.
- Lifecycle review: the checked timers, global listeners, scene listeners, and visual systems had matching cleanup paths.
- Browser smoke load: the local game loaded one 1920x1080 canvas with no console warnings or errors during the observation window.

## Rejected false positives

- `WorldModel.js` is an intentional re-export facade for `world/model/WorldModel.js`, not a duplicate class authority.
- `PlayScene.js` has one active runtime authority. The other copy is archived.
- Several same-named value and system files are different layers, not duplicate implementations.
- `secondWorldTown`, post-processing, weather, HUD juice, and geode paths contain explicit disabled or replacement gates. They are not filed as active bugs without a requirement that those features be enabled.
- Empty catches used only for best-effort UI focus or object cleanup were not filed. The milestone persistence catch was filed because it hides data loss.
| PERSIST-011 | Default WebGL selection has no runtime fallback | Confirmed | P1 when WebGL is unavailable | `main.js:49`, `systems/visual/RenderDensitySystem.js:255-257`, `values/gameConfig.js:33-34` |
| PERSIST-012 | World gameplay modules import UI implementation directly | Confirmed | P2 | `world/playScene/OverlayManager.js:4`, `world/playScene/PlaySceneUI.js:15-32`, `world/playScene/PlaySceneSetup.js:49-51,97` |
| PERSIST-013 | Revision query suffixes split active ES-module identities | Confirmed | P2 | `player/PlayerController.js:12`, `world/playScene/PlaySceneSetup.js:40`, `world/playScene/CaveGameplayController.js:8` |
| PERSIST-014 | Active runtime modules exceed the responsibility-size contract | Confirmed | P2 | 50 of 252 runtime JS files exceed 300 lines; 22 exceed 600 |
| PERSIST-015 | Declared visual-region SSOT is unreachable from production | Confirmed contract drift | P2 | `values/worldVisualRegions.js`, `values/readme.md` |
| PERSIST-016 | Resource labels and colors are duplicated and numerically misaligned | Confirmed latent defect | P2 | `world/playScene/PlaySceneGameplay.js:27-33`, `values/tileTypes.js:3-15`, `world/playScene/PlaySceneSetup.js:812`, `systems/visual/StarPillarSystem.js:48-60` |
| PERSIST-017 | User-settings save reports success after storage failure | Confirmed | P1 | `systems/UserSettings.js:134-147,311-313` |
| PERSIST-018 | Stale V11 runtime manifest remains beside live replacement manifests | Confirmed | P2 | `values/v11BackgroundRuntimeManifest.js:1,22,26`, `world/rendering/WorldBackgroundMasterSystem.js:5-6` |
| PERSIST-019 | Identical generated export manifests are stored in multiple trees | Confirmed repository debt | P3 | 5 duplicate hash groups / 10 files under `exports/` |
| PERSIST-020 | Copied MCP rule document contains broken local links | Confirmed | P3 | `tools/video-audio-mcp/.cursor/rules/mcp-python.md:337,461-462,829` |
| PERSIST-021 | Architecture READMEs describe missing directories and obsolete entry paths | Confirmed | P2 | `markdown/readme.md:22-23,109,160,165,170`, `readme.md:69` |
