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
  consumers.
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
- `upgradeDefinitionAudit.js` machine-checks registry identity, player copy,
  costs, the 250-money GP regeneration invariant, Bobo-owned Quickslash,
  early survival tools, merchant resource ownership, and effective pickaxe
  monotonicity across every resource. `UpgradeRecommendationPolicy.js` ranks
  attainable core/survival goals and applies bounded anti-repeat history, so
  the Town HUD rotates relevant upgrades instead of pinning the global cheapest.
- Retention save v9 records each expedition's active time, mined gross value,
  GP spent/restored, HP loss, return/failure cost, and risk-adjusted net value
  per active minute. These fields are measurement evidence; they do not silently
  rebalance rewards. Gem Power blocks retain five authored fixed tiers but cap
  one block at 65% of the current maximum, preventing a full empty-bar refill.
