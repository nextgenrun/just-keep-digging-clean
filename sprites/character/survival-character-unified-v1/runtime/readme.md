# Survival unified animation runtime v1

This folder is the active 2026-08-25 Survival character package. Its 43
lossless WebP sheets were rendered from one Survival V4 mesh and 160-bone rig
with the same full-glove materials, restored eyes, orthographic camera, light,
ground contract and subtle jacket/backpack secondary motion.

Every source frame was rendered as 1024 px 16-bit RGBA and downsampled exactly
once. Normal sheets use 256 px cells; the 960-frame moving-combat sheet uses
192 px cells so its 6144 by 5760 atlas remains below the 8192 texture limit.
The production manifest records frame counts, hashes, raw edge margins,
baseline ranges and green-contamination results.
The 2.13 GB raw-frame build cache is not retained; rerun the renderer when a
source frame needs to be rebuilt, then run the packer for the affected sheet.

Runtime presentation is fixed at 101 px and origin `(0.5, 0.890625)`, except
for the functional ledge-climb origin. The rejected legacy marker manifest is
not loaded: all 124 active attack/contact mappings are body-locked, and
footsteps use the physics-floor fallback. This prevents old crop coordinates
from translating the new sprite or hitbox.

Use `?unifiedAnimation=0` for an instant rollback to the previous mixed
Blender/UAL/Mixamo/Piskel package.
