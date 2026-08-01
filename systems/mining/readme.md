# Mining

Game system — mining.

`LoadingMiningMinigameState` is a pure, session-only 8 by 4 loading-board
model. It owns selection, HP, break/refill, chain, and visual pickaxe-tier
state without touching WorldModel, rewards, saves, or loader progress. The
opening board contains every configured material before weighted refills begin.
It is presentation support, not an alternate progression system.

`TileCollisionSystem` resolves the measured player AABB in sub-tile swept
steps, uses a shared skin/probe contract, and can eject a body from the nearest
valid tile face after world mutation. This prevents high-speed wall/floor/ceiling
tunneling and keeps ground checks correct while the body straddles columns.
It also owns the full-width one-way surface contact: a fresh DOWN/S press may
temporarily ignore the dedicated town-floor surface when the configured
clearance row beneath the complete body is AIR. Ordinary mineable tiles begin
below that clearance; any occupied clearance space still rejects the drop.
Upward flight always ignores the town-floor row, while downward movement from
above continues to land on it.

`DigSystem.tryMineArea()` is the Arc Core entry point. It resolves one cooldown
across the approved 2-wide by 2-deep footprint while preserving normal damage,
critical, luck, combo, XP, resource, special-block, player-level, and upgrade
calculation paths. Heavy Punch benefits the second depth row without creating a
fifth target.

Both ordinary and Heavy Punch/behind-tile Star destruction capture the
authoritative `WorldModel` rarity and identity before the tile is cleared.
They pass both values through the exact reward detail, so the UI-only release,
discovery popup, progress metadata, darkness light, and original world tile
cannot disagree about the Star's colour.

When a target is authoritative `BEDROCK`, `CAVE_WALL`, `FLOOR_TOWN_1`, or
`FLOOR_TOWN_2`, `DigSystem.tryMine()` returns the normal blocked result with
`blockedByBedrock: true`, authoritative `damage: 0`, and the original tile type
for presentation. Main-world and compact-cave presenters keep this result
silent: solid-terrain contact and the unchanged target are sufficient, with no
repeated warning card or `0 damage` world label.

Timed special-block boosts and instant King/XP/combo rewards apply their real
effects without confirmation cards. Treasure chests likewise preserve money,
critical buff, optional star, audiovisual response, and save state without a
reward card. Exceptional teleport unlock and gamble outcomes may use the
shared lane, while collectible motion and impact numbers remain world-space
effects rather than competing screen-space popups.

`SpecialTileSystem` owns the v11 two-level teleport route. Each level has four
authored sky-island gate slots; activating that level's first underground
teleport tile unlocks its surface ascent portal. Level 1's ascent portal sits at
the far-left edge of Town Square, fully left of the Milestone Pillar, and wins
nearby interaction ties so both landmarks remain usable. The surface portal
lands on a collision-backed tile beside the island gates, while each gate
returns to its paired depth. Level 1 uses the imported authored teleport tiles; Level 2 restores
its deterministic teleport anchors after procedural world generation. Pair data
and the resulting surface unlock state survive saves. The shared Sky Island
visual system is created in both scenic and legacy render modes so these routes
cannot remain functional but invisible.

`resourceDepthYield.js` applies the coordinate-stable Level One/Two yield
curve after native rarity, detects compact-cave world ownership, and enforces
the shared final reward cap. `DigSystem` uses it for ordinary, Heavy Punch,
direct/Engine, Star, lucky, and Sign-boosted rewards. No reward path performs
its own depth math.

`depthEconomyBonuses.js` clamps Milestone Pillar speed and crit totals before
`DigSystem` consumes them. `getDepthEconomyHealthSnapshot()` fails closed when
modern mode lacks valid curves, the Level Two boundary, or the Milestone
provider. Legacy mode deliberately disables these bonuses.
