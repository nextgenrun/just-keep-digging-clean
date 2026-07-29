# Mining Target V1

Production bitmap overlays for the world-space mining target.

- `mining-target-corners-v1.webp` is the normal four-corner targeting treatment.
- The runtime file is a transparent 512 px WebP image displayed over one 94 px tile.
- Source chroma images and transparent masters are retained under `sources/`.

The normal production path uses these authored images. Add
`?miningTargetVisuals=0` to restore the former rectangle for direct comparison.
