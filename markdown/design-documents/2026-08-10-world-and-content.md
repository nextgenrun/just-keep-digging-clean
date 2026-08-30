# World and content

Status: canonical world shape; current release reachability is explicitly noted

## Coordinate contract

- Tile size: 94 px.
- Full world width: 280 tiles.
- Sky/surface offset: 65 air rows; depth in meters is `tileY - 65`.
- Level One authored runtime depth: 2,000 m.
- Level Two separated continuation depth: 5,000 m.
- Full world grid depth: 5,065 rows including the sky/surface offset.
- Town anchor: x=28. Normal player spawn: x=4, y=64.

Exact values live in `values/gameConfig.js` and `values/worldDepthConfig.js`.

## Current demo boundary

The active `demoMode: true` profile bounds gameplay to x=0..119 at the sealed
surface tunnel and to the Level One depth. Level Two IDs, upgrades, keybinds,
portals, and Arc Core systems are gated.

This is current release truth, not the final world vision. Code or art existing
beyond the bound does not make that content reachable.

## Surface town

Town is a physical part of the world, not a detached menu. It owns:

- spawn and the in-camera x=12 starter dig seam embedded in the ground;
- player-stat, gear, GP, ability, and selling merchants;
- milestone and Star Pillar interactions;
- campfire and safe-return functions;
- portal/sky access infrastructure;
- the far-right Level Two tunnel gate in the full profile; and
- Heavenblocks surface gates when their route is reachable.

The current guided opening installs a temporary Bedrock barrier at x=66 across
rows 62-64. It restores the prior cells after the protected 15 m portal return
advances into Sell. The
barrier is tutorial containment only and must not become a permanent town wall.

## Authored opening geography

- Starter dig site: one normal-HP Dirt cell embedded in the ground at town
  x=12; no floating legacy tile overlay is allowed.
- Guided surface safety blocks accidental descent until one real Flight frame.
- Dormant Golden Five shaft/cache assets remain reference and save-compatibility
  material, not active geography or reward producers.
- Universal starter portal: x=12 at exactly 15 m.

Procedural generation, save restoration, earthquakes, or cave supplements may
not remove the starter portal or guided barrier while its gate is active.

## Level One strata

The portal language groups Level One into readable return regions:

| Depth | Portal region | Material promise |
|---|---|---|
| 0-249 m | Upper Earth | Dirt / Stone |
| 250-699 m | Iron Strata | Copper / Iron |
| 700-1,299 m | Gilded Fault | Silver / Gold |
| 1,300-2,000 m | Ancient Deep | Relic Caches |

The actual material model also includes Dark Dirt, Hard Dark Dirt, Steel,
Bronze, and special blocks. Portal labels summarize the expedition, not every
possible drop.

Depth milestones fire at each 100 m from 100 through 2,000, with an additional
750 m authored beat. Milestone rewards modify GP capacity, mining speed, or
critical chance and remain visible on the physical town board.

Status: **SHIPPED and reachable in demo mode.**

## Integrated caves

Caves are part of the authoritative world unless the explicit compact-cave
review rollback is used. They provide:

- traversable authored-feeling openings and shell boundaries;
- deterministic real-resource seams and live mining HP;
- darkness rhythms and light interaction;
- timed gates, Flight-over spike runs, and ember vents;
- safe approach checkpoints and all-GP failure return;
- cave mouth presentation without substituting a disconnected visual square.

Caves must never erase authored opening cells, protected portal routes, or
world-layout masks. Hazard effects remain local and bounded.

Status: **SHIPPED**, with individual cave visual/hazard contracts as evidence.

## Portals and sky routes

An underground `TELEPORT_TILE` activates one of four authored sky gate slots per
level. The pair stores dungeon and sky coordinates, unlocks the corresponding
surface ascent route, supports safe landing search, and persists. Returning from
the sky gate resolves back near the paired underground tile.

The first Level One portal is deterministic at 15 m; later portal placement may
be authored or procedural. Portal capacity and safe-return radii remain bounded
by `values/teleportPortalConfig.js`.

Level One portal network: **SHIPPED**. Level Two network: **GATED**.

## Level Two final target

The separated Level Two lane occupies x=132..279 and continues through 5,000 m.
Its portal language is:

| Depth | Portal region | Material promise |
|---|---|---|
| 0-899 m | Ember Shelf | Lava Dirt |
| 900-1,899 m | Obsidian Reach | Obsidian |
| 1,900-3,299 m | Magma Veins | Ember Ore |
| 3,300-5,000 m | Core Expanse | Magma Crystal |

Entry requires the final-game tunnel route and progression gate. Level Two must
have a coherent town/economy/portal loop and cannot ship as empty vertical
extension. Arc Core crafting and ownership are part of this layer.

Status: **GATED** by demo mode. Promotion requires full route, save, renderer,
portal, economy, and browser proof.

## Sky stars, constellations, and engines

Sky tiles occur throughout supported depths with rarity gates: Ancient after
500 m, Cosmic after 1,000 m, and Void after 1,600 m. Collected stars feed ten
Sign masteries, spendable Star Points, and shared Star Heart charge. The first
Engine root opens at Level 3; branch capstones unlock later roots until all
three can be owned. Wayward grows from one to five simultaneous independent
stars, Hollow Sun grows from two to five independently pulsing black holes, and
Stellar Lance turns mining actions into ranged full-damage piercing projectiles.
Each power costs 100 GP, retains the shared 200-charge bank only for old-save
compatibility, and has explicit time/effect caps, protected-tile rules, and
one-active-activation ownership.

Status: **SHIPPED** in active modules; the complete natural-time collection
journey remains part of the two-hour/long-game pacing audit.

## Heavenblocks

The intended route contains three non-overlapping sky regions:

1. Lower Sky Cloud Reef — Aether Turbine;
2. Angel Heavenblock — Halo Regulator;
3. Devil Eclipse Scar — Eclipse Crucible.

Three Ancient Relics activate the first gate. Completing Cloud Reef unlocks
Angel and Devil. Each region has arrival, return altar, reward shrine, unique
component, and Omega vault. All three components enable the Arc Core blueprint;
all three Omega vaults grant the Zenith Keystone.

Runtime access/art/progression systems are enabled by their own values, but the
current demo world bound and Arc Core feature gate make complete reachability
uncertain. Therefore status is **PARTIAL/GATED**, not SHIPPED.

## World-content rules

- Authored coordinates win over procedural supplements where explicitly masked.
- Every visible entrance has a traversable gameplay route.
- Every gameplay route has a visible representation in both supported renderer
  modes or a documented release restriction.
- Protected Bedrock, Cave Wall, and town floors remain unbreakable regardless of
  visual damage feedback.
- Background, scenic facade, weather, light, shader, motion, and FX systems do
  not mutate the grid or reward ledgers.
- Random events may alter local terrain only within bounded, recoverable rules.
- A content region is not shipped until it is reachable from a normal clean save
  without debug shortcuts.
