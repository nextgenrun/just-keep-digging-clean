# Talent and Depth Progression Rebalance

## Outcome

The complete permanent-progression stack was audited, including all 33
Celestial talents, ten constellation talents, 37 merchant upgrades, player
levels, Stars and Sign XP, resource rarity/yield, depth milestones, Ancient
Relics, Journey gates, and late-game crafting routes.

Every Celestial and constellation talent has a live runtime consumer. The main
problem was not dead talents: it was acquisition pacing. Stars were common but
worth almost nothing, deeper Stars barely improved, native resource rarity was
flat with depth, Level Two opened below the Level One end-state in income
efficiency, and the Milestone Pillar stopped at 2,000m.

The rebalance makes individual Stars much rarer and much more meaningful,
makes rare outcomes increasingly likely with depth, creates a steep continuous
material economy, extends explicit permanent milestones to 4,800m, and repairs
Lucky Collector so its promised double-resource reward is real.

## Complete Celestial talent audit

All three branches have eleven nodes, a full-branch cost of 1,125 Star Points,
and three equal-cost 375-point routes to an alternate capstone. Completing one
capstone opens the next Engine root; mastering every node across all branches
costs 3,375 points.

### Wayward Star

| Talent | Live effect | Audit result |
|---|---|---|
| Wayward Star | Unlocks the ricochet Engine | Live root and action-bar authority |
| Stellar Bearings | +0.8 tiles/s | Clear mobility gain; bounded at 10 tiles/s |
| Ricochet Matrix | +2 bounces | Directly extends route coverage |
| Nova Lens | +1-tile detonation radius | Distinct end-of-cast area gain |
| Echo Orbit | +1,000ms lifetime | Supports the longer Momentum route |
| Vector Command | +1 redirect | Adds player control rather than raw damage |
| Fracture Bloom | +4 impact targets | Small area-capacity step |
| Perihelion Loop | +2 bounces and +1 redirect | Coherent Momentum capstone |
| Impact Lattice | +6 impact targets | Required bridge into the central capstone |
| Supernova Core | +4 impacts and +1 radius | Balanced hybrid capstone |
| White Dwarf Shell | +6 impacts and +1 radius | Highest direct area capstone |

At full mastery, Wayward moves from 10 to 14 bounces, 18 to 38 impacts, three
to five redirects, a two- to five-tile supernova, 7.2 to 8 tiles/s, and 12 to
13 seconds. No node is dead and no final value exceeds its safety cap.

### Hollow Sun

| Talent | Live effect | Audit result |
|---|---|---|
| Hollow Sun | Unlocks the gravity Engine | Live root and action-bar authority |
| Orbit Anchor | +1 placement tile | Useful safety and targeting option |
| Gravity Well | +1 tile to every pulse | Applies to the added pulse too |
| Echo Seed | Adds a fourth pulse | Strong, mechanically distinct node |
| Tidal Lens | Another +1 tile to every pulse | Area-focused continuation |
| Event Horizon | +8 impact targets | Largest ordinary capacity node |
| Dark Reservoir | +6 impact targets | Time-path capacity support |
| Abyssal Field | +4 impacts and a four-target implosion | Field capstone adds a new finish |
| Collapse Cycle | Pulses occur 22% sooner | Required bridge into Singularity Core |
| Singularity Core | Six-target, two-tile implosion | Focused collapse capstone |
| Chronosphere | Pulses occur 18% sooner and +4 impacts | Fastest time-path capstone |

At full mastery, Hollow Sun reaches four pulses with 4/5/6/7-tile radii, 46
impact capacity, a six-target two-tile implosion, three-tile placement, and a
2.686-second resolved lifetime. Its two tempo talents stack multiplicatively;
the final seven-tile pulse reaches, but does not exceed, the configured cap.

### Comet Engine

| Talent | Live effect | Audit result |
|---|---|---|
| Comet Engine | Unlocks the tunnel Engine | Live root and action-bar authority |
| Ignition Coil | +1 tile/s | Immediate travel-speed gain |
| Bore Drive | +4 travel tiles | Strong route-length identity |
| Fracture Nose | +3 impact targets | Small Shock-path capacity step |
| Longburn Reservoir | +300ms lifetime | Supports longer routes without changing damage |
| Rider Plating | +90px/s launch speed | Player traversal/control reward |
| Wide Wake | Side bursts every two tiles | Distinct width/coverage choice |
| Aphelion Drive | +3 tiles, +1 tile/s, +3 impacts | Complete Velocity capstone |
| Impact Wake | +6 impact targets | Required central bridge |
| Zenith Drive | +2 tiles/s, two-tile side bursts, +250ms | Fast hybrid Bore capstone |
| Shockfront | +1 travel tile and +5 impacts | Direct Shock capstone |

At full mastery, Comet grows from 10 to 18 travel tiles, 12 to 29 impacts,
8.5 to 12.5 tiles/s, 1.8 to 2.35 seconds, side bursts every two tiles, and 430
to 520px/s rider launch. It remains the lowest raw-impact Engine because its
reward includes protected tunnelling and player movement.

## Constellation talent audit

| Sign | Ability | Permanent effect | Status |
|---|---|---|---|
| Dirt | Quick Slash | +5 flat tile damage | Live |
| Stone | Thunder Strike | +2 rows | Live |
| Copper | Quick Slash | -2 GP cost | Live |
| Dark Dirt | Thunder Strike | +25% damage | Live |
| Steel | Quick Slash | +300 burst speed | Live |
| Iron | Thunder Strike | Removes row falloff | Live |
| Bronze | Quick Slash | Free above 50% GP | Live |
| Hard Dark Dirt | Thunder Strike | +10% damage | Live |
| Silver | Quick Slash | +20% mining cadence | Live |
| Gold | Thunder Strike | -30 opening GP cost | Live |

Each Sign changes exactly one explicit stat. Mastery can be banked before the
matching Bobo ability is bought, and God Mode still activates all ten without
mutating save ownership.

## Star frequency, rarity, and talent currency

The requested spawn change is applied multiplicatively to the live rate:

- previous live probability: 0.0036, approximately one Star per 278 eligible
  resource tiles;
- new probability: 0.00126, approximately one Star per 794 eligible tiles;
- exact cut from the previous live rate: 65%;
- total reduction from the original 0.018 legacy probability: 93%.

Rarity weights now smoothly bias toward valuable tiers from 0 to 2,000m.
Common weight reaches 0.25x at full depth bias, while Rare/Epic/Mythic/Astral
reach 2.5x/6x/12x/20x. Eligibility depths remain unchanged.

Star Points now map directly to useful talent prices:

| Rarity | Before | Now | What one find can fund |
|---|---:|---:|---|
| Common | 1 | 20 | Meaningful progress toward a node |
| Uncommon | 2 | 50 | One first-row talent |
| Rare | 4 | 100 | One bridge talent |
| Epic | 8 | 250 | One side capstone |
| Mythic | 15 | 750 | Two complete capstone routes |
| Astral | 30 | 2,000 | Exceptional multi-branch jackpot |

Average points per Star rise from 31.02 at the surface to 161.78 at 2,000m,
a 5.22x depth reward. A deterministic expectation model for a two-tile-wide
Level One descent now yields 5.04 Stars and 405.22 points. Before this change,
the denser 14.4 expected Stars were worth only 21.70 points. The player sees
65% fewer Star Blocks, but a representative full descent can now fund one
375-point capstone route.

## Material and depth economy

Depth yield now follows these piecewise-linear curves:

- Level One: 1x / 1.6x / 2.6x / 4.5x / 8x at
  0/300/600/1,000/1,500m;
- Level Two: 5x / 6x / 9x / 15x / 24x / 38x / 60x at
  0/500/1,000/2,000/3,000/4,000/5,000m.

Rich, Packed, and Ancient base chances are additionally multiplied by depth:
1x at the surface, 2.2x at 1,000m, 3.5x at 2,000m, and 5x at 5,000m. Their
existing reward/HP separation remains 3x/1.5x, 8x/2.5x, and 25x/5x, so a rare
find improves reward efficiency rather than only adding mining time.

The full-review generated-world measurement uses authoritative composition,
tile HP, native rarity, material yield, and base sale prices. It excludes the
new milestone-yield bonus so the base curve remains independently visible.

| World band | Before coins / 100 HP | Now coins / 100 HP |
|---|---:|---:|
| Level One 120-299m | 11.89 | 12.98 |
| Level One 600-999m | 24.43 | 34.89 |
| Level One 1,000-1,499m | 39.52 | 65.39 |
| Level One 1,500-1,999m | 61.63 | 106.73 |
| Level Two 100-499m | 61.48 | 268.30 |
| Level Two 1,000-1,999m | 129.06 | 604.07 |
| Level Two 2,000-2,999m | 206.19 | 998.29 |
| Level Two 3,000-3,999m | 338.21 | 1,566.81 |
| Level Two 4,000-4,999m | 414.14 | 2,458.32 |

Level One bottom is now 8.22x its upper band. Level Two opens at 2.51x the
Level One bottom and finishes at 9.16x its own entrance. The final per-tile
material cap rises from 7,500 to 50,000 so Astral/Ancient deep jackpots are not
prematurely flattened.

## Explicit deep milestones

The former 21 milestones stopped at 2,000m with +66 GP, +32% speed, and +12%
crit. Six new Level Two milestones extend the visible pillar to 4,800m:

| Depth | Milestone | Permanent reward |
|---:|---|---|
| 2,500m | Magma Prospector | +10% material yield |
| 3,000m | Core Cartographer | +20 GP max |
| 3,500m | Abyss Harvester | +15% material yield |
| 4,000m | Rift Breaker | +30 GP max |
| 4,500m | Starforged Delver | +25% material yield |
| 4,800m | Understar | +50 GP max |

The new material milestones stack to a capped +50% and route through the same
single depth-yield authority used by ordinary mining, Heavy Punch, Arc Core,
Celestial Engines, and Thunder Strike. The Milestone Pillar now displays this
fourth permanent total alongside GP, speed, and crit.

## Other progression-system findings

| System | Audit finding | Action |
|---|---|---|
| Player levels | One visible level still carries ten legacy levels of XP and permanent growth; legacy saves map deterministically into the 1-99 scale | Preserved and revalidated |
| Level-linked gates | Celestial access/talents use levels 3/4/5, merchant gates use 3/6/7/9/11, and Journey milestones use 2/3/4/6/11 | Preserved on the compressed scale |
| Level rewards | Every earned level grants 20-50m darkness resistance plus explicit mining/HP/GP rewards; XP and Legend Blocks grant 10%/50% of a meaningful threshold | Preserved and revalidated |
| Merchant upgrades | All 37 definitions have an owner; Deep Market remains a valid Level Two money sink | Preserved |
| Lucky Collector | Tooltip promised double resources but runtime added only one material, which became meaningless at depth | Repaired to exact 2x and matching feedback |
| Depth gates | 100/300/1,000m gates still align with major route transitions | Preserved |
| Journey graph | Continues from the 1,000m gate into World Two, Heavenblocks, Arc Core, vaults, and Omega Arc Core | Preserved |
| Ancient Relics | 14 Level One and 16 Level Two caches already reward exploration through 4,750m | Preserved |
| Treasure chests | Money already scales by depth and retains an occasional Star plus Treasure Fury | Preserved |
| Session objectives | Intentionally lightweight support rewards, not permanent power | Preserved |

## Rollback and caps

`?depthEconomy=legacy` restores the former material yield curve, flat native
rarity frequency, legacy rarity reward/HP multipliers, legacy composition,
and disables milestone speed, crit, and material-yield bonuses without deleting
earned inventory or milestone state.

The Star spawn/rank/point rebalance is the new permanent Star economy and does
not use that material-economy rollback.

## Verification

Primary contracts:

```powershell
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-08-26-talent-depth-progression-audit-contract.mjs
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-07-30-depth-resource-economy-contract.mjs
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-07-30-star-rarity-sign-xp-contract.mjs
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-08-03-celestial-talent-progression-contract.mjs
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-08-03-celestial-talent-effects-contract.mjs
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-07-28-constellation-upgrade-audit-contract.mjs
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-08-22-all-upgrades-audit-contract.mjs
```
