# Mine Entrance Scenic Pilot v1

This folder stages the first world-anchored scenic landmark for the replacement renderer.

- `mine-entrance-turnaround-v1.png` is the image-directed four-view concept prepared for a future multi-image Meshy reconstruction.
- `mine-entrance-front-chroma-v1.png` is the lossless generated front source kept for provenance and matte revisions.
- `mine-entrance-front-v1.png` is the runtime beauty card with a transparent background.
- `mine-entrance-emissive-v1.png` is the aligned additive companion map for the cyan crystals and amber lantern.

The front and emissive passes were generated from the approved moonlit town-row benchmark on 2026-07-16, then the beauty pass was matted with the bundled chroma-key workflow. The runtime crops the transparent source to its measured content bounds and anchors the bottom of that crop to the solid floor beneath the world's deterministic shallowest standalone cave mouth. It is a below-surface cave threshold, not part of the town skyline.

The supplied Meshy credential was not copied into the repository or command history. The current process had no `MESHY_API_KEY`, and the reviewed CC0 community donor was rejected because its geometry and materials were visibly below the approved benchmark. The turnaround remains ready for the authenticated multi-image 3D stage; this pilot intentionally validates runtime composition, lighting, scale, and rollback first.
