# Archived unused orphan modules

Archived 2026-07-10 after a repository-wide relative-import graph scan and active-reference search found no runtime inbound references.

## Contents

- `SaveValidator.js` - standalone save validation utility with no active consumer.
- `UIResourceBar.js` - superseded resource-bar implementation with no active consumer.
- `PlayScene.js` - unused re-export wrapper; the runtime imports `world/PlayScene.js` directly.
- `boboMerchant.js` - superseded merchant values; active definitions are in `values/upgradeDefinitions.js`.
- `gearMerchant.js` - superseded merchant values; active definitions are in `values/upgradeDefinitions.js`.
- `gemPowerMerchant.js` - superseded merchant values; active definitions are in `values/upgradeDefinitions.js`.
- `iconPlaceholders.js` - unused placeholder icon values with no active consumer.
- `moneyMonster.js` - superseded merchant values; active definitions are in `values/upgradeDefinitions.js`.
- `pickaxes.js` - superseded pickaxe values; active definitions are in `values/upgradeDefinitions.js`.
- `playerUpgradesMerchant.js` - superseded merchant values; active definitions are in `values/upgradeDefinitions.js`.
  - `resourceSpawn.js` - superseded spawn values with no active consumer.
  - `resourceRarity.js` - superseded rarity model with no active runtime consumer; live rarity is handled by `dynamicSoil.js` and constellation config.
  - `SceneTransition.js` - unused transition helper with no active import or call site.
  - `sceneTransitionConfig.js` - configuration used only by the archived transition helper.

These files remain available for reference or deliberate restoration, but are excluded from the active module graph.
