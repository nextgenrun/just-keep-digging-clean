# Mining

Game system — mining.

Speed Blocks retain a +50% mining attack rate for 20 seconds: an unupgraded
1500 ms cooldown becomes 1000 ms, not 750 ms. `DigSystem` exposes the same
temporary multiplier to the main/cave animation presenters, so the bounded
ordinary swing also speeds up instead of looking unchanged. God Mode keeps
its deliberately fixed cooldown benchmark. Expiry is exact and repeated
pickups refresh the current boost. See
`markdown/2026-09-03-speed-block-feedback.md` for validation and visual rollback.

The retired session-only loading-board model is preserved under
`archive/2026-08-03-loading-mining-minigame/`; no loading minigame is part of
the active mining runtime.

`TileCollisionSystem` resolves the measured player AABB in sub-tile swept
steps, uses a shared skin/probe contract, and can eject a body from the nearest
valid tile face after world mutation. This prevents high-speed wall/floor/ceiling
tunneling and keeps ground checks correct while the body straddles columns.
If every valid face is blocked, it restores the player's latest collision-clean
position/profile snapshot and clears velocity rather than leaving an unresolved
overlap in underground terrain. Scripted body placement uses the same resolver.
It also owns the full-width one-way surface contact: a fresh DOWN/S press may
temporarily ignore the dedicated town-floor surface when the configured
clearance row beneath the complete body is AIR. Ordinary mineable tiles begin
below that clearance; any occupied clearance space still rejects the drop.
Upward flight always ignores the town-floor row, while downward movement from
above continues to land on it.

The same collision authority accepts the Worldroot's currently grown upper
terraces as normalized one-way platforms. Upward movement passes through,
downward movement lands on the first crossed branch, and the existing fresh
DOWN/S input ignores the continuous authored branch surface currently supporting
the player until their body leaves its grouped vertical crossing band. Horizontal
velocity is preserved, so crossing a seam while dropping cannot re-catch the
moving player on the neighboring surface piece. The lock also clears immediately
after walking beyond that branch, retreating fully above it, or losing the
platform during a growth-state change, so a stale drop request cannot make a
later landing fall through. No tree art or visual marker becomes a solid tile.

`DigSystem.tryMineArea()` is the Arc Core entry point. It resolves one cooldown
across the approved 2-wide by 2-deep footprint while preserving normal damage,
combo, XP, resource, special-block, player-level, and upgrade calculation paths.
Heavy Punch benefits the second depth row without creating a fifth target.

`DigSystem` also accepts the active Celestial snapshot and projectile listener
from `CelestialEngineController`. Player-facing Stellar Lance replaces the old
Rage multiplier: during its bounded window, one mining action resolves one to
three world-bounded lanes through `PiercingMiningProjectile.js`. Each shot
cycles blue, purple, then red and advances through three distance states; purchased power
talents scale its damage without globally inflating ordinary mining, Quick Slash,
Thunder Strike, damage previews, or cooldowns. Air and Geode Walls can be crossed;
ordinary protected tiles or the configured 5-to-10-tile range stop each lane.
The first diggable tile in a lane runs one normal mining hit. Only that tile's
exact overkill continues; the first surviving tile consumes the remaining
damage and becomes the wave's visual endpoint. No destroyed tile can pay twice.

Both ordinary and Heavy Punch/behind-tile Star destruction capture the
authoritative `WorldModel` Star rarity and identity before the tile is cleared.
They pass both values through the exact reward detail, so the UI-only release,
discovery popup, progress metadata, darkness light, and original world tile
cannot disagree about the Star's colour.

The destruction result also preserves its original tile type and the resolved
GP tier/restore capacity for presentation consumers. These read-only fields let
the pickup flight select the exact special-tile frame without changing damage,
drop, restoration, inventory, or save authority.
Heavy Punch forwards the same fields for a destroyed behind-tile special, so
that route receives its pickup flight instead of being limited to materials.

When a target is authoritative `BEDROCK`, `CAVE_WALL`, `FLOOR_TOWN_1`, or
`FLOOR_TOWN_2`, `DigSystem.tryMine()` returns the normal blocked result with
`blockedByBedrock: true`, authoritative `damage: 0`, and the original tile type
for presentation. Main-world and compact-cave presenters keep this result
silent: solid-terrain contact and the unchanged target are sufficient, with no
repeated warning card or `0 damage` world label.

Timed special-block boosts and instant King/XP/combo rewards apply their real
effects without confirmation cards. Treasure chests likewise preserve money,
optional Star, audiovisual response, and save state without a reward card.
Exceptional teleport unlock and gamble outcomes may use the
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

The guaranteed Level-1 tutorial pair is free in both directions through
PORTAL, SELL, UPGRADE, and RESUME, including the unlocked Town ascent. Its
prompt suppresses Hardcore cost through the same authority used by payment.
Completing RESUME restores normal teleport pricing; unrelated pairs are never
included in the exemption.

`resourceDepthYield.js` applies the coordinate-stable Level One/Two yield
curve after the ordinary base yield, detects compact-cave world ownership, and
enforces the shared final reward cap. `DigSystem` uses it for ordinary, Heavy
Punch, direct/Engine, Star, and Sign-boosted rewards. No reward path performs
its own depth math.

`DigSystem.setResourceDepletionProvider()` is the single material-reward gate
for Starless Scars. Normal, Heavy Punch, Arc Core, Thunder Strike, and Celestial
Engine destruction all suppress material yield and resource XP in a consumed
Star's territory, while the sacrificed Star itself pays the heavily boosted
rarity-specific Star jackpot. Terrain damage, combo, and protected special-block
authorities remain unchanged.

`depthEconomyBonuses.js` clamps Milestone Pillar speed and the Level Two +50%
material-yield total before `DigSystem` consumes them. The shared depth-yield
authority applies that permanent multiplier to every mining and ability reward
path. The health snapshot fails closed when modern mode lacks valid curves, the
Level Two boundary, or the Milestone provider. Legacy mode deliberately
disables these bonuses. Ordinary Rich/Packed/Ancient block tiers are retired;
only Stars retain independent rarity multipliers.

`SpecialBlockEffectsManager` owns the Ability Block's pending choice, selected
ability, exact twenty-second expiry, and save-shaped snapshot. `DigSystem`
rejects every new mining transaction while that choice is pending, so holding
the dig key cannot silently continue through the decision. Once selected, the
temporary grant changes neither talent ownership nor permanent progression.
