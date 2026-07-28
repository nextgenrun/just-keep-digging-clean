# Backgrounds

Runtime and generated world-background art. Region-specific generation notes and
provenance live in each versioned subdirectory; the active Level 1 facade package
is documented in `world-scenic-regions-v1/readme.md`.

`world-visual-v2/` is the first production art kit for the non-Tiled scenic runtime: a moonlit far plate, transparent town hero layer, transparent walk-surface edge, and seamless dark-earth material. Runtime far cards preserve the far plate's aspect ratio and never exceed native source density. The walk-surface edge remains in the kit for provenance and `?surfaceEdge=1` comparison only; production rendering omits it because the authoritative scenic/material ground already supplies the floor. Chroma-key source images are retained under `sources/` for reproducible alpha cleanup.

`titan-discoveries-v1/` contains the 25 compact transparent Titan creatures,
their contact-sheet/build provenance, and the generated transparent Titan Walk
plinth used by both renderer modes, the 5x5 pause archive, and the 25-position
surface collection. `?titans=0` is the complete asset/presentation rollback.

`titan-chambers-v2/` contains 25 unique opaque 1536x848 high-resolution
ImageGen chamber cards, lossless dated sources, exact prompt provenance, hashes,
and the normalization pipeline. The cards stream only near their large
discovery zones or for one selected discovered archive entry.
`?titanChambers=0` keeps the compact v1 collection and saves intact.
