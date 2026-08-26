# Hardcore

`HardcoreModeSystem.js` owns the Phaser-independent risk-mode lifecycle:
Casual consumes no lives, Hardcore starts with two lives and one free first
revive, and hidden One-Life Hardcore starts with one life and no free revive.
It also owns post-Flight arming, persisted stress/high-water mark, armed play
time, paid-teleport/unstuck counters, high-stress GP drain, and cooldowns.

`hardcoreMemorialRecord.js` sanitizes a final run, migrates stored memorial
levels to the meaningful ten-to-one scale, and builds every stat and bounded
Journey-achievement recap page for both the death result and later full-screen
grave inspection. `HardcoreMemorialStore.js` persists those records
outside save slots. It exposes append/read only, so new-save cleanup and Casual
save management cannot remove graves. `world/playScene/HardcoreDeathBridge.js`
consumes the shared lives reducer, returns surviving runs to town, and persists
zero lives as an exhausted but intact and exportable save. The legacy explicit
purge helpers remain compatibility-only and are not called by the death bridge.
If that life-state write fails, the recap exposes only `RETRY SAVE`; revival
and menu exits stay locked until persistence succeeds.

The persistent Hardcore HUD is the authoritative routine-status surface.
Transient cards are restricted to Hardcore armed once, critical stress, the
1-GP life-risk warning, save failures, and actual Wurm or cave-hazard damage.
Rising-stress notices, paid/failed teleport confirmations, unstuck
result/cooldown notices, Casual rescue, Wurm phase/miss notices, and cave-entry
warnings do not enter the shared notification queue.
