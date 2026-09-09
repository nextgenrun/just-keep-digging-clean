# Hardcore

`HardcoreModeSystem.js` owns the Phaser-independent risk-mode lifecycle:
Casual consumes no lives, while Hardcore starts with exactly one life and no
revives. The legacy hidden One-Life Hardcore identifier follows the same rules.
It also owns post-Flight arming, persisted stress/high-water mark, armed play
time, paid-teleport/unstuck counters, high-stress GP drain, and cooldowns.

Underground torch protection follows the authoritative 1–200% gameplay
intensity. A dim flame leaves more darkness exposure and can increase stress;
normal brightness progressively improves recovery, while 101–200% overdrive
ramps to 5x panic recovery at maximum power. The stable intensity setting
drives this calculation, never visual flicker.

The panic line begins at 22m and moves deeper by the cumulative panic resistance
earned from player levels. That resistance reduces only the effective depth used
by darkness and deep-pressure Stress; it never changes visual darkness. A
destroyed Star's territory applies 4x darkness Stress, while a fully burning
torch still blocks that exposure and can recover sanity so the player has a
clear spend-GP-or-flee decision.

`HardcorePanicBoundaryView` projects that effective depth back into the world at
the top edge of the first panic-eligible tile, so the visible line and
`HardcoreModeSystem` use the same threshold instead of separate tuning.

Celestial powers do not currently clear, suppress, or otherwise rewrite Stress.
The former Stellar Rage integration is retired with that power; player-facing
Stellar Lance is a mining-projectile buff only. The independent
`stressSuppressed` input remains available to explicit future systems, but the
normal PlayScene bridge never sets it from a Celestial snapshot.

`hardcoreMemorialRecord.js` sanitizes a final run, migrates stored memorial
levels to the meaningful ten-to-one scale, and builds every stat and bounded
Journey-achievement recap page for both the death result and later full-screen
grave inspection. `HardcoreMemorialStore.js` persists those records
outside save slots. It exposes append/read only, so new-save cleanup and Casual
save management cannot remove graves. `world/playScene/HardcoreDeathBridge.js`
consumes the shared lives reducer and persists the first death as an exhausted
but intact and exportable save. The legacy explicit
purge helpers remain compatibility-only and are not called by the death bridge.
If that life-state write fails, the recap exposes only `RETRY SAVE`; death
completion and menu exits stay locked until persistence succeeds.

The persistent Hardcore HUD is the authoritative routine-status surface.
Transient cards are restricted to Hardcore armed once, critical stress, the
1-GP life-risk warning, save failures, and actual Wurm or cave-hazard damage.
Rising-stress notices, paid/failed teleport confirmations, unstuck
result/cooldown notices, Casual rescue, Wurm phase/miss notices, and cave-entry
warnings do not enter the shared notification queue.

Hardcore stress transitions also expose voice-safe edges: entering critical
stress may request `hardcoreDanger`, while returning from warning or critical
to calm may request `hardcoreRecovery`. The shared LEO director owns chance,
cooldown, expiry, and the non-interrupting channel; ordinary stress ticks do
not emit speech.
