# Complete Star Talent and Depth Progression Rebalance

## Outcome

The permanent-progression stack was audited end to end, including all 33
Celestial talents, ten constellation talents, both Bobo abilities, Stars and
Sign XP, merchant upgrades, player levels, resource rarity/yield, depth
milestones, Ancient Relics, Journey gates, and late-game crafting routes.

The runtime pass found interactions that a definition-only audit missed:
Hollow Sun's shared cap could consume later pulses, Wayward's final radius
could be starved by ricochet impacts, Bronze enabled an infinite free Quick
Slash loop, and Thunder Strike peaked near 567x before tile falloff. The final
Celestial pass also responds to playtest feedback: Wayward now grows into a
five-star simultaneous swarm, Hollow Sun is a multi-core gravity cluster, and
the former Comet/Rage slot is fully replaced player-facing by Stellar Lance.
Each advertised component has its own measurable budget and every power
ceiling remains explicit.

The earlier acquisition work remains: individual Stars are rarer and more
meaningful, rare outcomes improve with depth, the material economy rises
continuously, and permanent milestones extend to 4,800m.

## Ability baselines and shared activation economy

- Celestial Engine roots unlock at Level 3 through the talent tree. A completed
  capstone opens another free root.
- A newly selected root starts with 100 Celestial Charge. Each activation costs
  100, and the 200-charge bank holds at most two casts. Sky Stars recharge it;
  God Mode remains free.
- Wayward Star starts as one physical star with 8 ricochets, 14 route targets,
  a separate 7-target supernova, 8 tiles/s, and 8 seconds. Re-press redirection
  is retired; talents add simultaneous independent stars instead.
- Hollow Sun starts as two staggered black holes. Each core has four pulses at
  0.9/2.4/3.9/5.4 seconds, 2/3/4/5-tile radii, 6/7/8/9 target budgets, and a
  four-target implosion. The 68-target base cluster pulls destroyed-block
  fragments into the individual cores.
- Stellar Lance replaces Comet Engine and Rage. For 6 seconds, every mining
  action fires a six-tile projectile that crosses air and applies one fresh
  full-damage hit to every pierced diggable tile.
- Quick Slash costs 12 GP, deals 3x the current normal mining hit, adds +240px/s
  movement, runs at 2.5x mining cadence, and has a 180ms cadence floor. Silver
  lowers the authored action/cadence floor to 150ms.
- Thunder Strike costs 250 GP for the opening slam, reaches 6 rows, deals 1.5x
  normal mining damage before chain scaling, and loses 8% per deeper row.

## Complete Celestial talent audit

All three branches have eleven nodes, a full-branch cost of 1,125 Star Points,
and three equal-cost 375-point routes to an alternate capstone. Completing one
capstone opens the next Engine root; mastering every node across all branches
costs 3,375 points.

### Wayward Star

| Talent | Live effect | Audit result |
|---|---|---|
| Wayward Star | Unlocks the charge-powered ricochet Engine | Live root and action-bar authority |
| Stellar Bearings | +1 tile/s | Clear mobility gain; bounded at 10 tiles/s |
| Ricochet Matrix | +2 bounces and +2 route targets | Every added bounce has capacity to matter |
| Nova Lens | +1 radius and +3 supernova targets | Distinct end-of-cast area gain |
| Echo Orbit | +1,500ms lifetime | Supports the longer Momentum route |
| Twin Orbit | +1 simultaneous star | Replaces active redirection with permanent swarm growth |
| Fracture Bloom | +5 supernova targets | Supernova capacity no longer competes with ricochets |
| Perihelion Loop | +1 star, +2 bounces, +4 route targets | Complete Momentum capstone |
| Impact Lattice | +6 route targets | Required bridge into the central capstone |
| Supernova Core | +1 star, +3 route targets, +3 supernova targets, +1 radius | Balanced hybrid capstone |
| White Dwarf Shell | +1 star, +6 supernova targets, +1 radius | Highest direct area capstone |

At full mastery, one activation launches five independent Wayward Stars at
once. Each has 12 bounces, 29 route targets, a 24-target five-tile supernova,
9 tiles/s, and 9.5 seconds. That is 53 target attempts per star and a hard
activation ceiling of 265; the stars own separate motion and impact budgets.

### Hollow Sun

| Talent | Live effect | Audit result |
|---|---|---|
| Hollow Sun | Deploy 2 black holes with four pulses and an implosion each | Multiple cores are present at the root |
| Orbit Anchor | +2 placement tiles and +0.35 cluster spacing | Extends placement from 3 to 5 tiles |
| Gravity Well | +1 tile to every pulse | Applies to both added pulses too |
| Echo Seed | +1 simultaneous black hole | Immediate cluster-size upgrade |
| Tidal Lens | Another +1 tile to every pulse | Continues field coverage |
| Event Horizon | +2 targets to every pulse on every core | Capacity scales with pulse and core count |
| Dark Reservoir | Fifth pulse and +1.5s | Adds both output and field time |
| Abyssal Field | +1 core and eight-target, three-tile implosions | Field capstone adds another full black hole |
| Collapse Cycle | Pulses 18% faster and core stagger 28% faster | Required bridge into Singularity Core |
| Singularity Core | +1 core and 12-target, four-tile implosions | Focused collapse capstone reaches five holes |
| Chronosphere | Sixth pulse, +2.5s, and +1 target per pulse | Longest time-path capstone |

At full mastery, Hollow Sun contains five staggered cores for an 11-second
field. Every core pulses at 0.738/1.968/3.198/4.428/5.576/6.724 seconds with
4/5/6/7/9/10-tile radii and 9/10/11/12/12/13-target budgets, then performs a
12-target four-tile implosion. Each core is capped at 79 attempts and the whole
activation is capped at 395. The expanding-wave order prioritizes each newly
reached outer band, while cluster-level target deduplication prevents overlap
from paying twice.

### Stellar Lance

| Talent | Live effect | Audit result |
|---|---|---|
| Stellar Lance | Six-tile, full-damage projectile buff for 6s | Live root and action-bar authority |
| Lance Core | Projectile damage rises from 100% to 125% | Immediate power gain |
| Longshot Chamber | +2 range | Extends every lane to eight tiles |
| Sustained Orbit | +1.5s | First duration route upgrade |
| Piercing Charge | Projectile damage rises to 150% | Continues the Power route |
| Deep Flight | +2 range | Extends every lane to ten tiles |
| Star Reservoir | +1.5s | Extends the duration route to 9s |
| Worldpiercer | Projectile damage rises to 200% | Complete Power capstone |
| Far Horizon | +2 range | Required central bridge reaches 12 tiles |
| Trident Break | Add two parallel side lanes | Three full projectiles per mining action |
| Endless Volley | +2s | Complete duration capstone reaches 11s |

At full mastery, Stellar Lance lasts 11 seconds and every mining action fires
three parallel 12-tile projectiles at 200% of a normal mining hit. Each tile is
a fresh authoritative transaction: overkill on one tile never reduces later
hits, air and Geode Walls can be crossed, protected structures stop a lane, and
rewards remain single-award. It does not alter Stress, global mining cadence,
ordinary mining previews, Quick Slash, or Thunder Strike. The stable internal
`comet-engine` branch and `comet-*` node IDs are retained only so existing
saves migrate without losing purchased talents; all player-facing Comet
behavior and copy are retired.

The ability-polish follow-up keeps Thunder's normal-hit baseline on the same
`DigSystem` mining authority while Stellar Lance is isolated to explicit dig
projectiles, preventing accidental ability-wide multiplier drift. It preserves free
mouse follow-ups after Thunder's paid opening slam, prevents Steel's opening
impulse from stacking while preserving its intended held-Q movement bonus,
reports complete Wayward/Hollow target budgets in the HUD, and makes all three
Celestial visual lifecycles failure-safe.

## Constellation talent audit

| Sign | Ability | Permanent effect | Status |
|---|---|---|---|
| Dirt | Quick Slash | +20% damage | Live |
| Stone | Thunder Strike | +2 rows | Live |
| Copper | Quick Slash | -3 GP cost | Live |
| Dark Dirt | Thunder Strike | +15% damage | Live |
| Steel | Quick Slash | +160 burst speed | Live |
| Iron | Thunder Strike | Removes the exact 8% row falloff | Live |
| Bronze | Quick Slash | 50% cost reduction at 75%+ current GP | Live |
| Hard Dark Dirt | Thunder Strike | +10% damage | Live |
| Silver | Quick Slash | +20% mining cadence | Live |
| Gold | Thunder Strike | -50 opening GP cost | Live |

Each Sign changes exactly one explicit stat. At full Quick Slash mastery the
base cost is 9 GP, temporarily 4.5 GP above the Bronze threshold; spending the
discounted cast drops GP, so it cannot self-sustain for free. Its 3x base hit
becomes 3.6x with Dirt. Its base cadence becomes 3x with Silver and retains a
live 150ms mastery floor. Every slash has +240px/s opening and held movement;
Steel adds another +160px/s once when the slash begins and while Q stays held.
While Q remains held, Steel also preserves the intended +160px/s movement
bonus; releasing Q removes it, and the opening impulse cannot stack per frame.
At full Thunder mastery the opening cost is 200 GP,
range is 8 rows, row falloff is zero, and damage bonus is +25%.

Thunder's ten stage multipliers are now 1/1.4/1.9/2.5/3.2/4/5/6.2/7.6/9.5.
Each successful timing adds 8%, reaching a 1.72x chain-local bonus after nine
hits. The final 80ms window stays demanding without becoming a 16ms lottery.
A fully buffed perfect final slam is about 30.64x normal mining damage before
tile-specific HP, rather than the former roughly 567x ceiling.

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

Sign XP totals are reduced to the same 35% multiplier as the surviving Star
spawn rate, preserving intended mastery time after the 65% frequency cut:
Dirt/Stone/Copper require 70 XP; Dark Dirt/Steel require 42; Iron/Bronze/Hard
Dark Dirt/Silver require 28; Gold requires 14. Existing earned XP is clamped
against the new totals and never discarded.

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
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-08-26-star-talent-full-rebalance-contract.mjs
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-08-26-ability-interactions-contract.mjs
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-08-26-all-abilities-polish-contract.mjs
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-07-30-depth-resource-economy-contract.mjs
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-07-30-star-rarity-sign-xp-contract.mjs
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-08-03-celestial-talent-progression-contract.mjs
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-08-03-celestial-talent-effects-contract.mjs
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-08-03-celestial-runtime-wiring-contract.mjs
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-07-28-constellation-upgrade-audit-contract.mjs
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-07-26-thunderstrike-three-slam-contract.mjs
& 'C:\Users\Mila\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' testing\2026-08-22-all-upgrades-audit-contract.mjs
```

Production-Phaser review surfaces:

- `testing/2026-08-26-celestial-abilities-visual-harness.html?ability=wayward`
- `testing/2026-08-26-celestial-abilities-visual-harness.html?ability=hollow`
- `testing/2026-08-26-celestial-abilities-visual-harness.html?ability=rage`
- `testing/2026-07-26-thunderstrike-chain-visual-harness.html`
- `testing/2026-08-14-celestial-talent-tree-visual-harness.html`

The Celestial review surface publishes the live Engine snapshot, missing
textures, pull-fragment counts, completion payload, and callback counts through
`document.body.dataset.celestialAbilitiesSnapshot` for browser verification.
