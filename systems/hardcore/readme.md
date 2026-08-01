# Hardcore

`HardcoreModeSystem.js` owns the Phaser-independent Hardcore oath lifecycle,
persisted stress/high-water mark, armed play time, paid-teleport/unstuck run
counters, darkness/descent/deep-pressure stress calculation, high-stress GP
drain, teleport quotes, and last-resort cooldown.

`hardcoreMemorialRecord.js` sanitizes a final run and builds every stat and
bounded Journey-achievement recap page for both the death result and later
full-screen grave inspection. `HardcoreMemorialStore.js` persists those records
outside save slots. It exposes append/read only, so permadeath, new-save
cleanup, and Casual save management cannot remove graves. Phaser, purge, and
scene-transition responsibilities remain in
`world/playScene/HardcoreDeathBridge.js`.

The persistent Hardcore HUD is the authoritative routine-status surface.
Transient cards are restricted to Hardcore armed once, critical stress, the
1-GP permadeath warning, save failures, and actual Wurm or cave-hazard damage.
Rising-stress notices, paid/failed teleport confirmations, unstuck
result/cooldown notices, Casual rescue, Wurm phase/miss notices, and cave-entry
warnings do not enter the shared notification queue.
