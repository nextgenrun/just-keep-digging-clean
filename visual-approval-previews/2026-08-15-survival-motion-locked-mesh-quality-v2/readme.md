# Survival motion-locked mesh quality v2

Review-only Blender candidate. Production remains unchanged.

This pass keeps the approved frame count, source action, fixed camera, root
motion, facing, timing and runtime alpha silhouette. It deliberately excludes
weight edits, bone edits, foot/pelvis locks, camera recentering, corrective
shapes, subdivision and secondary deformation.

Quality changes are limited to:

- 2048 px Eevee source renders with one direct 256 px downsample;
- 2K source texture relinking;
- Non-Color normal-map interpretation;
- repaired eye base color and restrained corneal response;
- full glove material coverage on finger-group polygons;
- the existing four-light cinematic material rig;
- the exact legacy alpha channel as the packed geometry contract.

An integer-only whole-frame root translation may restore the approved source
cell placement before the gate. The UAL families also reproduce their single
historical 0.95 family-wide export scale. No per-frame scaling, rotation, bone
edit, deformation, camera recentering, or per-part warp is allowed. The
post-alignment alpha IoU, centroid and bounds must still pass before legacy
alpha locking.

The benchmark covers walk, run, side/up/down mining, and exact prone-v3 flight.
`contract-report.json` records mask IoU, centroid and bounds deltas before the
legacy silhouette is imposed. `before-vs-v2-1-full-glove-motion-locked.gif` is
the current review artifact. No runtime file is written by this pipeline.
