# Heavenblocks Sky Altars v1

Nine ImageGen-authored RGBA world sprites replace the three procedural surface
gate rings. Each route owns a consistent three-stage family:

- Cloud Reef: dormant, cyan attuning, fully awakened aether portal.
- Angel Heavenblock: dormant, two-socket gold attuning, complete halo portal.
- Devil Eclipse: dormant, two-socket violet attuning, complete eclipse portal.

The built-in image-generation path created each awakened 3D master from the
matching Heavenblocks facade plus the Titan dais as material and camera-angle
references. The attuning and dormant sprites were targeted edits of the same
master, preserving silhouette, geometry, framing, and baseline while changing
only sockets, runes, and portal energy.

All masters used a flat green chroma background. The installed
`remove_chroma_key.py` helper produced soft-matted, despilled alpha, followed
by a Lanczos reduction to 768 by 768 RGBA PNG. Runtime display, depth, baseline,
progression mapping, and Titan clearance live in
`values/heavenblocksAccessConfig.js`; keys and paths live in
`values/assetKeys.js`.

The surface bank begins beyond the final Titan gallery footprint. The first
gate progresses from zero relics, through one or two relics, to the three-relic
eligible state. Angel and Devil progress from locked, through route-unlocked,
to region-completed.
