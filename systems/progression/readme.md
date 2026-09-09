# Progression

Game system — progression.

- Currency, resources, Gem Power, levels, cooldowns, and reward grants are
  validated at their mutation authorities. Non-finite, negative, fractional
  integer totals, overflowed, and duplicate mutations are rejected and
  reported without replacing the last valid state.
- `GemPowerMutationAuthority.js` and `ResourceTotalAuthority.js` keep bounded
  numeric mutation rules out of player/world orchestration. Save snapshots are
  independently checked by `progressionInvariants.js` before persistence.

- `DepthGateSystem.js` owns the blocking 100m, 300m, and 1000m progression
  decisions and save acceptance. Its visible presentation is injected from the
  same approved Phaser typed-confirmation modal used by Unstuck; the system
  creates no DOM chrome. The exact phrases are `100M`, `300M`, and `RISK`;
  Escape still cancels hazards and returns to spawn.
- `AncientRelicSystem.js` owns only the bounded persistent Relic count; cache
  placement, gates, crafting, presentation, and save transport remain separate
  consumers. Shop unlocks may read that count but never spend it.
- `RetentionProgressSystem.js` / `retentionProgressState.js` own Titan discovery
  persistence. Load sanitization drops unknown ids and duplicates, restores the
  canonical 1-25 definition order, and exposes the same array through the
  journal snapshot used by collection surfaces.
- The same retention payload is the authoritative Town Square tutorial state:
  Yes/No choice, current MOVE/DIG/FLIGHT/PORTAL/SELL/RESUME stage, idempotent
  Flight training, and remaining free-flight time all survive save/load. Older
  sell/upgrade stages migrate without replaying the tutorial or injecting money.
- `PlayerLevelSystem.js` resolves former choice milestones automatically and
  nonblockingly. Each milestone applies both small permanent rewards (+3%
  mining and +2% luck), supports multi-level awards, and persists its applied
  milestone count without opening a choice popup.
- Player levels now use a real ten-to-one cadence. `playerLevelSaveState.js`
  migrates former 1-999 saves into the 1-99 scale while preserving partial XP;
  `playerLevelXpMutation.js` applies normal and fractional XP through one
  validated threshold path; `playerLevelRewardMath.js` keeps ten former stat
  steps in each earned level and publishes the exact panic-resistance, mining,
  HP, and GP reward summary. XP and Legend blocks preserve their former value as 10%
  and 50% progress toward the next meaningful level.
- Fourteen current-game repeatable merchant tracks now contain 121 meaningful
  ranks. `upgradeRankBalance.js` owns their explicit rising prices, while
  `upgradeUnlockProgression.js` staggers first purchases and later rank batches
  across depth, first-return, Flight, and permanent Relic milestones.
  `upgradeSaveState.js` migrates both the old long tracks and version-2
  compressed tracks to the smallest equally strong version-3 rank.
- `CelestialTalentProgressionSystem.js` opens at Level 3. Every level from 3
  grants one Talent Point; Talent Points unlock the 33 nodes, while Star Points
  buy rank 2 and rank 3. `celestialTalentAvailability.js` keeps level access,
  branch prerequisites, root capacity, and the two currencies separate. Old
  Star-paid nodes migrate to rank 2 without retroactive Talent Point charges.
- `UpgradeSystem.js` persists Seismic Suppression through the existing
  `upgradeLevels` save map and exposes `earthquakesDisabled` only after the
  one-time endgame player-merchant purchase succeeds.
- `UpgradeSystem.js` accepts the staged-disclosure availability provider and
  checks it before any wallet or resource transaction. Locked UI rows therefore
  cannot be purchased through direct calls, stale overlays, or another merchant
  catalog.
- `TitanClueSystem.js` owns the wallet-backed transaction and active locator
  arrow for clues bought from the ESC `TITANS` catalog. Purchases use
  locked-safe index journal keys. The enabled/disabled arrow selection is
  sanitized inside retention data, survives save/load, and requests an
  autosave; older purchased clues migrate as enabled until the player changes
  the switch. Clues never call Titan discovery or mutate terrain.
- `UpgradeSystem.js` carries the active depth-economy mode into cached and
  projected sale effects. `Deep Market Contracts` requires the World Two
  Tunnel Key and adds 15% Level Two material value per level through level 10.
  Legacy mode hides and ignores the upgrade without deleting its saved level.
  Wallet mutation is normalized to the shared two-decimal currency boundary.
- The Milestone progression now continues past the former 2,000m endpoint with
  six Level Two rewards through 4,800m. Three material milestones total +50%
  yield; the alternating GP milestones bring the complete pillar total to
  +166 GP without changing the existing 32% speed and 12% crit caps.
