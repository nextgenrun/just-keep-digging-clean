# Mining

Game system — mining.

`TileCollisionSystem` resolves the measured player AABB in sub-tile swept
steps, uses a shared skin/probe contract, and can eject a body from the nearest
valid tile face after world mutation. This prevents high-speed wall/floor/ceiling
tunneling and keeps ground checks correct while the body straddles columns.

`DigSystem.tryMineArea()` is the Arc Core entry point. It resolves one cooldown
across the approved 2-wide by 2-deep footprint while preserving normal damage,
critical, luck, combo, XP, resource, special-block, player-level, and upgrade
calculation paths. Heavy Punch benefits the second depth row without creating a
fifth target.

When a target is authoritative `BEDROCK` or `CAVE_WALL`, `DigSystem.tryMine()`
returns the normal blocked result with `blockedByBedrock: true` and preserves the
tile type for presentation. `MINING_CONFIG.blockedUi` owns the shared `Cannot
dig` copy, duration, notification dedupe key, and compact-cave status color; the
mining system does not create UI directly.

`SpecialTileSystem` owns the v11 two-level teleport route. Each level has four
authored sky-island gate slots; activating that level's first underground
teleport tile unlocks its surface ascent portal. The surface portal lands on a
collision-backed tile beside the island gates, while each gate returns to its
paired depth. Level 1 uses the imported authored teleport tiles; Level 2 restores
its deterministic teleport anchors after procedural world generation. Pair data
and the resulting surface unlock state survive saves. The shared Sky Island
visual system is created in both scenic and legacy render modes so these routes
cannot remain functional but invisible.

Heavenblock relic caches and component hearts use the same `DigSystem` result
path as ordinary resources. Normal mining, Heavy Punch, Quickslash/area mining,
Thunder Strike, and Arc Core area damage all call the shared destroyed-tile
artifact handler. A destroyed `R` cell awards the permanent relic through the
progression system; a destroyed `C` cell installs that island's Arc component,
marks the island complete, refreshes access, and saves. Locked-region hearts
reject damage, and no decorative shrine can bypass the mining requirement.
