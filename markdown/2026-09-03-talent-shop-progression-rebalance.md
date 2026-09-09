# Talent and shop progression rebalance

## Player-facing rules

The progression now has four jobs that do not compete with each other:

- **Player Level** gives one Talent Point every level, starting at Level 3.
- **Talent Points** unlock new nodes in the Celestial Talent tree.
- **Star Points** upgrade owned nodes from rank 1 to rank 3.
- **Depth and Ancient Relics** reveal shop purchases; they are never prices.

There is no separate Awakening step. Arc Core, Omega Arc, Heavenblocks, the
Level Two tunnel, and Deep Market Contracts are outside the current-game
rebalance.

## Celestial Talent tree

- Level 3 grants the first Talent Point and opens the tree.
- Each of the 33 nodes costs 1 Talent Point to unlock.
- Unlocking a node gives rank 1 immediately.
- Rank 2 and rank 3 cost Star Points. Roots cost 100 SP and then 200 SP;
  other nodes use their authored Star price and then twice that price.
- The complete tree contains 33 Talent Point unlocks and 66 Star-funded rank
  upgrades. A player can own every node at Level 35, while the 11,025 SP rank
  path keeps the tree progressing long after that.
- Existing prerequisites and branch choices remain. One starting ability is
  available first; reaching a top node opens the next starting ability.
- Higher ranks strengthen damage, reach, duration, bounces, or hit capacity.
  They do not multiply the number of Stars, holes, or lanes beyond the existing
  runtime limits.

Old talent saves keep every owned node and every remaining or spent Star Point.
Roots from an old save load at rank 1. Nodes that previously cost Stars load at
rank 2, so migration never removes their former power. Old ownership is not
retroactively charged Talent Points.

## Repeatable shop tracks

| Upgrade | Ranks | Gain per rank | Maximum | Rank depth batches |
| --- | ---: | --- | --- | --- |
| Gem Power Tank | 8 | +75 maximum GP | +600 GP | 1-3 / 4-5 at 400m / 6-8 at 1,100m |
| Gem Power Efficiency | 6 | 5% less GP use | 30% less | 1-2 / 3-4 at 500m / 5-6 at 1,200m |
| GP Regeneration | 12 | +3.75 GP/s | +45 GP/s | unlock 140m; 5-8 at 550m; 9-12 at 1,250m |
| Flight Speed | 6 | +70 speed | +400 speed | unlock 180m; 3-4 at 600m; 5-6 at 1,300m |
| Agility | 20 | existing curve | +200 speed | 1-8 / 9-14 at 250m / 15-20 at 950m |
| Strength | 10 | +4 dig power | +40 | 1-4 / 5-7 at 300m / 8-10 at 1,000m |
| Quick Reflexes | 10 | 3% faster digging | 30% faster | 1-4 / 5-7 at 350m / 8-10 at 1,050m |
| Heavy Punch | 20 | existing curve | 75% behind-target damage | unlock with 2 Relics; 9-14 at 800m; 15-20 at 1,400m |
| Starting Material Prices | 5 | +20% sale value | +100% | 1-2 / 3-4 at 600m / 5 at 1,200m |
| Deeper Material Prices | 5 | +20% sale value | +100% | return once; 3-4 at 700m / 5 at 1,300m |
| Market Insight | 5 | +10% sale value | +50% | unlock 220m; 3-4 at 800m / 5 at 1,500m |
| Torch Efficiency | 5 | -1 GP/s | -5 GP/s | 1-2 / 3-4 at 650m / 5 at 1,350m |
| Torch Range | 4 | +0.3 tile | +1.2 tiles | 1-2 / 3 at 700m / 4 at 1,400m |
| Cave Eyes | 5 | +0.16 no-torch sight | +0.8 | 1-2 / 3-4 at 750m / 5 at 1,450m |

The first useful ranks remain reachable, while later ranks become a long-term
money sink. Explicit rank prices replace the old short exponential tracks.
There are 121 current-game repeatable ranks in total.

## Gradual unlock map

Pickaxes unlock at distinct best-depth milestones:

| Pickaxe | Best depth |
| --- | ---: |
| Bronze | 40m |
| Iron | 100m |
| Steel | 300m |
| Mithril | 500m |
| Adamant | 750m |
| Rune | 1,100m |
| Dragon | 1,600m |

Other key unlocks are deliberately spread out:

- Quick Slash: 100m.
- Thunder Strike: 1 Ancient Relic.
- Heavy Punch: 2 Ancient Relics.
- Seismic Suppression: 4 Ancient Relics.

Relics are permanent discoveries. Unlock checks read the saved Relic count and
never consume it. The existing typed safety gates remain at 100m, 300m, and
1,000m with `100M`, `300M`, and `RISK`; those gates protect dangerous descent
and do not act as shop prices.

## Shop language

Descriptions state what the player gets, without implementation terms. Examples:

- **Gem Power Tank:** “Increase your maximum GP. In Hardcore, GP is your health.”
- **Gem Power Efficiency:** “Use less GP for Flight, abilities and your torch.
  In Hardcore, hits and panic cost less too.”
- **Quick Reflexes:** “Dig faster.”
- **Cave Eyes:** “See farther without your torch. In Hardcore, panic drains
  less GP.”

Locked rows explain one next action, such as “Reach 500m” or “Find 2 Ancient
Relics,” and show current progress. A depth lock never disables an already-owned
rank.

## Save compatibility

Upgrade progression is version 3:

- unversioned and version 1 saves migrate from the old long tracks by effect;
- version 2 saves migrate from the former compressed tracks by effect;
- migration selects the first new rank that is at least as strong;
- version 3 saves round-trip without another conversion.

The migration may grant a higher numerical rank, but never removes purchased
power, money, materials, Relics, Talent Points, or Star Points.
