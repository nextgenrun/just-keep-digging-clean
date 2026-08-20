# Survival animation global polish v1 rollback

This package contains the exact pre-polish runtime source files for the
2026-08-14 skating and animation-registration correction.

Restore both preserved paths to roll back the pass:

- `values/survivalUalPlayerAssetProfile.js`
- `systems/visual/PlayerKinematicMotionSystem.js`

`rollback-manifest.json` pins the pre-polish byte sizes and SHA-256 hashes.

The pass does not replace animation sheets, change frame order or timing,
modify collision geometry, or promote the rejected Blender `MINER_run` clip.
