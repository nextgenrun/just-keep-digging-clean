# Depth Resource Economy Rebalance

## Outcome

The production mine now rewards descent with a continuous, strongly rising
coins-per-HP curve. Shallow mining remains the low-income starting point,
Level One grows into a meaningful economy, and Level Two accelerates through
its full 5,000m route instead of paying less near the bottom.

The entire rollout is reversible on reload with:

```text
?depthEconomy=legacy
```

Rollback does not delete inventory, money, upgrade levels, dug tiles, or any
other save data.

## Generated-world measurements

The contract samples the authoritative generated world, real tile HP,
deterministic rarity, native yield, and base sale price.

| World band | Modern coins / 100 HP | Legacy coins / 100 HP |
|---|---:|---:|
| Level One 120-299m | 11.89 | 8.82 |
| Level One 600-999m | 24.43 | 8.45 |
| Level One 1000-1499m | 39.52 | 8.09 |
| Level One 1500-1999m | 61.63 | 8.40 |
| Level Two 100-499m | 61.48 | 43.08 |
| Level Two 1000-1999m | 129.06 | 37.14 |
| Level Two 2000-2999m | 206.19 | 33.96 |
| Level Two 3000-3999m | 338.21 | 31.20 |
| Level Two 4000-4999m | 414.14 | 29.04 |

Level One bottom and Level Two entry intentionally meet at approximately the
same efficiency. Level Two bottom is about 6.7 times its entrance and more
than fourteen times its legacy bottom.

## Runtime rules

### Depth yield

`values/resourceEconomy.js` owns piecewise-linear yield curves:

- Level One: 1x at 0m, 1.4x at 300m, 2x at 600m, 3.1x at
  1,000m, and 5x from 1,500m onward.
- Level Two: 1x at 0m, 1.5x at 500m, 2.2x at 1,000m, 3.5x
  at 2,000m, 5.8x at 3,000m, and 10x from 4,000m onward.

Fractional yield is rounded by a stable coordinate hash. The same tile always
has the same integer result and shared world RNG state is not consumed.

### High-impact rarity

Native resource rarity now separates payout from HP:

| Rarity | Yield | HP | Legacy yield and HP |
|---|---:|---:|---:|
| Normal | 1x | 1x | 1x |
| Rich | 3x | 1.5x | 2x |
| Packed | 8x | 2.5x | 5x |
| Ancient | 25x | 5x | 12x |

Rare finds therefore improve income efficiency instead of merely scaling
reward and mining time equally.

### Composition

Level One uses four modern post-300m composition bands. Gold, Silver, Bronze,
Steel, and Iron become progressively more common while Dirt declines.

Level Two keeps its entrance distribution recognizable, then independently
raises Magma Crystal, Ember Ore, Obsidian, and Gold probability with depth.
The old overlapping cumulative comparison that made direct Gold unreachable
near the bottom is retained only in legacy mode. Resource nodes interpolate
from the original top weights to Magma/Ember-heavy deep weights.

### Milestones and market progression

Existing Milestone Pillar rewards are now authoritative gameplay bonuses:

- up to 32% mining cooldown reduction;
- up to 12% critical-hit chance.

Money Monster now offers `Deep Market Contracts` after the World Two Tunnel
Key. Its ten levels improve Lava Dirt, Obsidian, Ember Ore, and Magma Crystal
sale prices by 15% per level. Resource-price calculations retain two decimal
places, so a 10% Dirt upgrade immediately changes 1.00 to 1.10 instead of
appearing inactive until a later level.

### Caps

- Maximum depth-yield multiplier: 10x.
- Maximum final material reward from one tile after rarity, Star, Sign, and
  lucky modifiers: 7,500.
- Milestone speed and crit are clamped to their configured totals.
- All inventory rewards remain non-negative integers.
- Money is normalized to two decimal places at price, sale, wallet-add, and
  wallet-spend boundaries.

## Rollback contract

`?depthEconomy=legacy` restores all of these together:

- legacy one-yield-per-tile depth behavior;
- rarity multipliers of 1/2/5/12 for both HP and yield;
- legacy post-300m Level One composition;
- legacy overlapping Level Two resource comparisons and static node weights;
- display-only milestone speed/crit behavior;
- legacy per-stage integer price flooring;
- hidden and inactive Deep Market Contracts.

The saved Deep Market level is preserved while rollback is active and becomes
effective again when modern mode returns.

## Health and validation

`DigSystem.getDepthEconomyHealthSnapshot()` validates curve configuration,
Level Two geometry, cap configuration, and Milestone provider wiring. A broken
snapshot emits `depth-resource-economy-invariant` through the runtime canary,
admin health panel, local critical report, optional reporting endpoint, and the
health worker's deduplicated system-finding forwarding path.

Primary contract:

```powershell
node testing/2026-07-30-depth-resource-economy-contract.mjs
```

The contract covers query rollback, curves, rarity yield/HP separation,
deterministic rounding, final caps, price precision, Deep Market locking,
Milestone activation, canary failure/recovery, worker forwarding, and both full
generated-world economy snapshots.
