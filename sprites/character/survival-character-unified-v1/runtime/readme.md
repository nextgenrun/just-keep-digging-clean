# Survival unified animation runtime v1

This folder is the active 2026-08-25 Survival character package. Its 54
lossless WebP sheets were rendered from one Survival V4 mesh and 160-bone rig
with the same full-glove materials, restored eyes, orthographic camera, light,
ground contract and subtle jacket/backpack secondary motion.

Blender/UAL source frames are rendered as 1024 px 16-bit RGBA and downsampled
exactly once. Six Piskel-owned families are packed directly from their
normalized 256 px editable cells with no second resize. The 960-frame
moving-combat sheet uses 192 px cells so its 6144 by 5760 atlas remains below
the 8192 texture limit. The 67-frame walk-handoff sheet also uses 192 px cells:
it derives its start and twelve stop phases from the exact Standard Walk action
instead of loading the incompatible standalone Mixamo start/stop performances.
The production manifest records frame counts, hashes, raw edge margins,
baseline ranges and green-contamination results.
The 2.13 GB raw-frame build cache is not retained; rerun the renderer when a
source frame needs to be rebuilt, then run the packer for the affected sheet.

Runtime presentation uses one calibrated display size per animation family,
never per frame, and origin `(0.5, 0.890625)` except for the functional
ledge-climb origin. The rejected legacy marker manifest is not loaded: active
attack/contact mappings are body-locked, and footsteps use the physics-floor
fallback. This prevents old crop coordinates from translating the new sprite
or hitbox.

Use `?unifiedAnimation=0` for an instant rollback to the previous mixed
Blender/UAL/Mixamo/Piskel package.
