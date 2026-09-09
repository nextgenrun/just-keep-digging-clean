# Model

World layer module — model.

`DugTilesSaveStore.js` schema v13 appends sanitized `hardcoreModeData`,
`graveborerWurmData`, and exact `playerStateData` while retaining positional
compatibility for every older payload field. Player state preserves pixel body
coordinates, facing, and fractional GP. A Wurm pass saves its committed
target/direction, noise, cooldown, hit count, and encounter count; loading an
unspent mid-breach pass restores it as a fresh readable warning instead of an
instant offscreen hit.

The default town-bed flow stores complete playable checkpoints only after rest.
Hardcore live-run authorization remains in memory between beds; legacy partial
position/GP checkpoints remain readable for migration but are no longer written
by the bed-enabled runtime.

An armed-Hardcore death immediately blocks future writes, writes a per-slot
death tombstone, and locally deletes the primary save and every backup before
waiting on bounded in-flight/remote cleanup. Tombstoned slots reject load,
restore, and late save attempts so closing during the death screen or a slow
async write cannot resurrect a dead run. Only the explicit empty-slot new-save
path clears that tombstone. The destructive store path requires both an
armed-Hardcore authorization and actual armed-Hardcore evidence in the current
slot, live checkpoint, or its backups. Forged metadata therefore cannot erase
a Casual slot, and per-slot keys leave every other Casual save/backup intact.
Permanent grave records use a separate append/read-only storage key and are
never part of run cleanup.

Manual JSON transfer is available to Casual and Hardcore saves. Portable files
use the stable `understar-save` envelope version 1 with an integrity checksum.
Imports validate first, back up an existing slot before replacement, and can
revive a tombstoned slot; a failed write restores the permadeath marker.
Rotating Hardcore backups remain available only to the death purge; neither
the current slot nor another slot may restore one as a rewind.
Legacy dug-key restoration now rejects both town-floor types alongside
bedrock/cave/geode walls, so an old save cannot reopen the unbreakable surface
foundation.

`WorldModel.skyTileIdentity` is a one-byte visual identity index for Star
Blocks. `WorldSpawnAuthority.js` applies the configured occurrence rate only
after authored geometry, resources, caves, and gameplay boundaries settle.
Painted Star cells are ordinary deterministic spawn candidates rather than
guaranteed legacy-density Stars. Rarity and identity use separate coordinate
hashes, do not advance the shared generator RNG, and require no save migration.
After hashed assignment, duplicate identities provide a bounded deterministic
repair pool so every authored identity in a sufficiently populated rarity tier
appears at least once without changing Star count, rarity, or reward yield.

`CaveIdentityPlanner.js` assigns deterministic depth-gated cave identities and
ceiling/floor feature plans without consuming `WorldModel`'s shared RNG. It
finalizes only structurally live caves after authored and Level Two generation,
then indexes chest, crystal, and cave-local light zones.

`CaveGapSupplementGenerator.js` restores five low caves per Level One depth band
where the Tiled map left usable gaps. Its protected-cell mask prevents any
authored Tiled or Level Two cell from being overwritten; authored AIR can join
a travel lane, while the generator only carves interior AIR and leaves the
surrounding shell as ordinary mineable regional terrain.

`CaveGameplayPlanner.js` finalizes two deterministic, renderer-independent cave
indexes after all world authority has settled. `CaveResourceSeamPlanner.js`
embeds genuine mineable resource tiles only in un-authored exposed shell cells
and applies the same per-cell Gold depth gate as ordinary terrain;
`CaveHazardPlanner.js` finds traversable challenge spans with safe checkpoints
on both sides. Touching cave shells use one authoritative seam owner.

`RareEmberFindPlanner.js` runs after ordinary seam selection and replaces one
accessible seam per broad depth band with Ember Ore. The current seed exposes
three Level One finds and eight across the 5,000 m Level Two route; Level One
selection is constrained left of the sealed Level Two divider, so demo-profile
Embers cannot be generated behind an inaccessible boundary.

`UndergroundBedrockLayout.js` is the final world-authority guard for the
Level 1/Level 2 split. It rebuilds the configured one-tile divider from the map
ceiling to the bottom, keeps its bridge floor unbreakable, and deliberately
leaves the shared surface-clearance row open before resuming the divider below.
Every stale authored or generated underground bedrock cell outside that divider
becomes mineable regional terrain. The same cleanup removes legacy `CAVE_WALL`
cells from the normal underground world; that tile remains only as the bounded
perimeter of a compact cave scene.

`surfaceTraversalLayout.js` normalizes the complete authored surface into the
dedicated Level 1/Level 2 town-floor types and clears one complete row beneath
it before the divider guard runs. The surface therefore remains a continuous
Town Square platform and one-way collision contact, while ordinary tiles begin
below a player-safe AIR row and cannot overlap the ground presentation.

`baseTerrainResourceResolver.js` is the authoritative Level One material
selector. It uses four cumulative shallow bands, progressively richer
post-300m bands in modern mode, and the former single deep band under
`?depthEconomy=legacy`. Both modes enforce the configured 700 m Gold gate, so
Gold cannot leak into the shallow mine. `WorldModel.getTileMaxHp()` resolves
only the ordinary tile-type/depth health; resource rarity no longer modifies HP.
`WorldSpawnAuthority.js` also runs this selector over ordinary resource cells
from the upper Tiled map: the map retains its solid/air shapes and landmarks,
while live ratios remain authoritative for material composition.

The default town-bed runtime supersedes periodic Hardcore position/GP checkpoints. It records armed-run authorization on the active store in memory, preserving permanent-death handling before a new bed save without writing a resumable expedition position. Older stored checkpoints remain readable for migration.
