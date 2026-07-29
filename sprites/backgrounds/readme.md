# Backgrounds

Runtime and generated world-background art. Region-specific generation notes and
provenance live in each versioned subdirectory; the active Level 1 facade package
is documented in `world-scenic-regions-v1/readme.md`.

`world-visual-v2/` is the first production art kit for the non-Tiled scenic runtime: a moonlit far plate, transparent town hero layer, transparent walk-surface edge, and seamless dark-earth material. Runtime far cards preserve the far plate's aspect ratio and never exceed native source density. Production repeats `town-surface-edge-thin-v2.png` across all 280 surface columns at the Town Square's calibrated physical scale; its 48 px approved-slate crop stays thinner than one tile and adds no collision. `?surfaceEdge=0` restores tile-only presentation, while the deeper v1 edge remains retained for provenance. Chroma-key source images are retained under `sources/` for reproducible alpha cleanup.

`titan-discoveries-v1/` contains the 25 compact transparent Titan archive
creatures, their contact-sheet/build provenance, and the retained legacy
Titan Walk plinth. `titan-underground-v2/` contains the compact ImageGen basalt
dais now shared by underground and surface presentation, the colored
tile-resonance overlay, and the hash-pinned footprint manifest. The
768px `titan-surface-stances-v1/` cutouts are now the sharp underground creature
and tile-mask authority as well as the independent surface poses. `?titans=0`
is the complete asset/presentation rollback.

`titan-chambers-v2/` retains the 25 unique opaque 1536x848 high-resolution
ImageGen chamber cards, lossless dated sources, exact prompt provenance, hashes,
and the rollback pipeline. `titan-chambers-v3/` is the production runtime set:
the same approved paintings with transparent organic edge feathers so they
dissolve into the matching live biome backdrop. Cards stream only near their
large discovery zones or for one selected discovered archive entry.
`?titanChamberBlend=0` restores opaque v2; `?titanChambers=0` keeps the compact
v1 collection and saves intact.

`titan-surface-stances-v1/` contains 25 independently generated, transparent
768x768 ImageGen creature cutouts. Each Titan has a separate identity-matched
stance. Underground uses them at chamber scale with near-opaque normal
presentation; the unlocked surface Titan Walk uses the same sharp inventory
with identity-specific larger scales over the much thinner shared basalt dais
inside the prop-free town-edge corridor.
