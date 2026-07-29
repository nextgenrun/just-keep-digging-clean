# Progression

Game system — progression.

- `DepthGateSystem.js` owns the blocking 100m, 300m, and 1000m progression
  decisions and save acceptance. Its visible presentation is injected from the
  same approved Phaser typed-confirmation modal used by Unstuck; the system
  creates no DOM chrome. The exact phrases are `100M`, `300M`, and `RISK`;
  Escape still cancels hazards and returns to spawn.
- `AncientRelicSystem.js` owns only the bounded persistent Relic count; cache
  placement, gates, crafting, presentation, and save transport remain separate
  consumers.
- `RetentionProgressSystem.js` / `retentionProgressState.js` own Titan discovery
  persistence. Load sanitization drops unknown ids and duplicates, restores the
  canonical 1-25 definition order, and exposes the same array through the
  journal snapshot used by collection surfaces.
- The same retention payload is the authoritative Town Square tutorial state:
  Yes/No choice, current movement/dig/sell/upgrade stage, idempotent rewards,
  and remaining free-flight time all survive save/load. Older saves migrate
  without replaying the tutorial or duplicating its money rewards.
- `UpgradeSystem.js` persists Seismic Suppression through the existing
  `upgradeLevels` save map and exposes `earthquakesDisabled` only after the
  one-time endgame player-merchant purchase succeeds.
- `TitanClueSystem.js` owns the wallet-backed transaction and active locator
  arrow for clues bought from the ESC `TITANS` catalog. Purchases use
  locked-safe index journal keys. The enabled/disabled arrow selection is
  sanitized inside retention data, survives save/load, and requests an
  autosave; older purchased clues migrate as enabled until the player changes
  the switch. Clues never call Titan discovery or mutate terrain.
