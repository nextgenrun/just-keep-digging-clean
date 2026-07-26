# Model

World layer module — model.

`DugTilesSaveStore.js` schema v12 appends sanitized `hardcoreModeData` and
`graveborerWurmData` while retaining positional compatibility for every older
payload field. A Wurm pass saves its committed target/direction, noise,
cooldown, and encounter count; loading an unspent mid-breach pass restores it
as a fresh readable warning instead of an instant offscreen hit.

`CaveIdentityPlanner.js` assigns deterministic depth-gated cave identities and
ceiling/floor feature plans without consuming `WorldModel`'s shared RNG. It
finalizes only structurally live caves after authored and Level Two generation,
then indexes chest, crystal, and cave-local light zones.

`CaveGapSupplementGenerator.js` restores five low caves per Level One depth band
where the Tiled map left usable gaps. Its protected-cell mask prevents any
authored Tiled or Level Two cell from being overwritten; authored AIR can join
a travel lane, while authored solid cells remain as natural cave pillars.
