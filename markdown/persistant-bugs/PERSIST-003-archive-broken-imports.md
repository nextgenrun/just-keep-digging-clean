# PERSIST-003: Archived modules contain broken relative imports

Severity: `P3`
Status: confirmed legacy/archive defect
Area: archive integrity and reuse

## Evidence

The repository-wide relative-import scan found unresolved targets in these archived modules:

- `archive/2026-06-26-shadow-miner-future-system/ShadowMinerSystem.js` imports `../../values/shadowMinerConfig.js`.
- `archive/2026-06-26-systems-cleanup/AboveGroundDecorationSystem.js` imports `../../values/aboveGroundDecorations.js`.
- `archive/2026-06-26-values-cleanup/tileRender.js` imports `./tileTypes.js`.
- `archive/2026-07-10-todo-animation-stubs/NpcAnims.js` imports `../values/assetKeys.js`.
- `archive/2026-07-10-todo-animation-stubs/PlayerAnims.js` imports `../values/assetKeys.js`.
- `archive/2026-07-10-todo-animation-stubs/RobotAnims.js` imports `../values/assetKeys.js`.
- `archive/2026-07-10-unused-orphan-modules/boboMerchant.js` imports `./upgradeCategories.js`.
- `archive/2026-07-10-unused-orphan-modules/gearMerchant.js` imports `./upgradeCategories.js`.
- `archive/2026-07-10-unused-orphan-modules/gemPowerMerchant.js` imports `./upgradeCategories.js`.
- `archive/2026-07-10-unused-orphan-modules/moneyMonster.js` imports `./upgradeCategories.js`.
- `archive/2026-07-10-unused-orphan-modules/pickaxes.js` imports `./upgradeCategories.js`.
- `archive/2026-07-10-unused-orphan-modules/playerUpgradesMerchant.js` imports `./upgradeCategories.js`.
- `archive/2026-07-10-unused-orphan-modules/SceneTransition.js` imports `../../values/sceneTransitionConfig.js`.

All reported files are under `archive`; no active shipped import failure was found.

## Impact

The archive is not safely reusable as a source of recovered systems. Opening, testing, or copying one of these modules produces missing-module failures and encourages ad hoc path repair. It also makes broad repository scanners report noise and can hide a future accidental import of archived code.

## Permanent solution setup

- Choose and document one archive policy: repair archived modules into self-contained snapshots, or mark them explicitly non-executable and exclude them from runtime builds.
- Add an archive manifest with snapshot date, status, source root, and known missing dependencies.
- Run separate CI gates for active code and archive integrity so broken history is visible without being confused with production failures.
- Add a guard that rejects imports from `archive` in active runtime files.
- If an archived module is revived, move it into an active feature directory first and repair its dependency graph as a deliberate migration.

