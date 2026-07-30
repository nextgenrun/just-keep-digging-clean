# Model

World layer module — model.

`DugTilesSaveStore.js` schema v13 appends sanitized `hardcoreModeData`,
`graveborerWurmData`, and exact `playerStateData` while retaining positional
compatibility for every older payload field. Player state preserves pixel body
coordinates, facing, and fractional GP. A Wurm pass saves its committed
target/direction, noise, cooldown, hit count, and encounter count; loading an
unspent mid-breach pass restores it as a fresh readable warning instead of an
instant offscreen hit.

Armed Hardcore also writes a small once-per-second live checkpoint containing
only exact player position, fractional GP, and Hardcore stress. Reload merges it
only over the matching armed-Hardcore base save, so a hard refresh cannot rewind
danger while the full mine save remains economical. The checkpoint creates no
restore backup and is cleared by a successful full save, a new save, or death.

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

Manual JSON transfer remains available to Casual saves: imports validate the
payload and create a rotating backup of the current slot before replacement.
Hardcore export and Hardcore-file import are both rejected because either
would create an external rollback backup outside the permadeath purge.
Rotating Hardcore backups remain available only to the death purge; neither
the current slot nor another slot may restore one as a rewind.
Legacy dug-key restoration now rejects both town-floor types alongside
bedrock/cave/geode walls, so an old save cannot reopen the unbreakable surface
foundation.

`WorldModel.generate()` also delegates the complete sky-band world to
`world/generation/HeavenblocksWorldGenerator.js`. The builder creates real
material/ore HP cells, caves, corridors, safe landing and shrine floors, relic
vaults, and locked barriers; it does not place image facades. Native dug cells
reuse the existing dug-source persistence contract, while the small
arrival/return and shrine safety spans are rejected by both runtime damage and
dug/rubble restoration. `getHeavenblocksLayoutHealth()` counts live plus
persisted-dug native cells, rejects bedrock contamination, and publishes
`nativeWorldReady`.

`CaveIdentityPlanner.js` assigns deterministic depth-gated cave identities and
ceiling/floor feature plans without consuming `WorldModel`'s shared RNG. It
finalizes only structurally live caves after authored and Level Two generation,
then indexes chest, crystal, and cave-local light zones.

`CaveGapSupplementGenerator.js` restores five low caves per Level One depth band
where the Tiled map left usable gaps. Its protected-cell mask prevents any
authored Tiled or Level Two cell from being overwritten; authored AIR can join
a travel lane, while authored solid cells remain as natural cave pillars.

`CaveGameplayPlanner.js` finalizes two deterministic, renderer-independent cave
indexes after all world authority has settled. `CaveResourceSeamPlanner.js`
embeds genuine mineable resource tiles only in un-authored exposed shell cells;
`CaveHazardPlanner.js` finds traversable challenge spans with safe checkpoints
on both sides. Touching cave shells use one authoritative seam owner.

`UndergroundBedrockLayout.js` is the final world-authority guard for the
Level 1/Level 2 split. It rebuilds the configured one-tile divider from the map
ceiling to the bottom, keeps its bridge floor unbreakable, and deliberately
leaves the shared surface-clearance row open before resuming the divider below.
Every stale authored or generated underground bedrock cell outside that divider
becomes mineable regional terrain.

`surfaceTraversalLayout.js` normalizes the complete authored surface into the
dedicated Level 1/Level 2 town-floor types and clears one complete row beneath
it before the divider guard runs. The surface therefore remains a continuous
Town Square platform and one-way collision contact, while ordinary tiles begin
below a player-safe AIR row and cannot overlap the ground presentation.
