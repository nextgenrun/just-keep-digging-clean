# Upgrade Rank Compression

## Outcome

Repeatable merchant upgrades now use 70-80% fewer levels. Every remaining
level increases its runtime effect, and each purchase bundles four or five
steps from the former 1.15x price curve. Pickaxes, ability unlocks, keys,
crafting unlocks, Seismic Suppression, and other one-time purchases are
unchanged.

| Upgrade | Former levels | New levels | First new effect | Maximum effect | First price |
|---|---:|---:|---:|---:|---:|
| Gem Power Tank | 15 | 4 | +150 GP | +600 GP | 223 |
| Gem Power Efficiency | 10 | 3 | -2 GP/s | -5 GP/s | 374 |
| Gem Power Regeneration | 30 | 6 | +7.5 GP/s | +45 GP/s | 1,684 |
| Gem Fly Speed | 10 | 3 | +140 px/s | +400 px/s | 897 |
| Agility Training | 99 | 20 | +20 px/s | +200 px/s | 18 |
| Strength | 20 | 5 | +8 damage | +40 damage | 88 |
| Quick Reflexes | 20 | 5 | -6% cooldown | -30% cooldown | 118 |
| Heavy Punch | 99 | 20 | +5% chance | 40% chance | 1,919 |
| Start Resource Prices | 10 | 3 | +40% | +100% | 748 |
| Next Resource Prices | 10 | 3 | +40% | +100% | 1,497 |
| Deep Market Contracts | 10 | 3 | +60% | +150% | 12,483 |
| Market Insight | 10 | 3 | +20% | +50% | 2,995 |
| Torch Drain Efficiency | 10 | 2 | -2.5 GP/s | -5 GP/s | 1,211 |
| Torch Range | 10 | 2 | +0.6 tiles | +1.2 tiles | 942 |
| Cave Eyes | 10 | 3 | +0.32 tiles | +0.8 tiles | 1,096 |

The former uncapped Regeneration, Strength, and Quick Reflexes tracks now have
explicit endpoints. Torch Drain and Torch Range no longer sell levels after
their effects have already reached their caps.

## Price rule

`getUpgradeCost()` sums the former cost of four or five consecutive levels for
one new level. The next bundle begins later on the same exponential curve, so
every later purchase costs more. Agility remains the affordable first upgrade
at 18 money while moving the rest of the catalog away from disposable purchases.

## Save migration

Upgrade saves now write `upgradeProgressionVersion: 2`. An unversioned save is
migrated by calculating each former upgrade's actual effect, then granting the
smallest new level whose effect is equal or stronger. This preserves purchased
power, including the former softcaps and the old plateau behavior. Versioned
saves retain their exact new level and are not compressed again.

## Validation

`testing/2026-08-31-upgrade-rank-compression-contract.mjs` enumerates all 15
tracks, requires a 70-80% reduction, proves strictly increasing price and power
at every level, verifies bundled price math, checks every former level for
non-lossy migration, clamps oversized grants, and verifies versioned round-trip.
