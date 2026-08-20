# Manual Survival rerig workbook v1 — from scratch

Review-only Blender workspace for rebuilding the Survival character skeleton
manually from zero. Nothing in this directory is loaded by runtime.

Open `survival-character-rerig-from-scratch-v1.blend`. It contains only:

- `RERIG_CleanMesh`: the 83k-vertex character mesh with the latest V4
  full-resolution textures, repaired ORM/normal/eye response and V2.1 full-glove
  material correction. It has no parent, weights, modifier, constraints,
  actions, NLA tracks or corrective shape keys.
- `RERIG_EmptyArmature`: an armature with zero bones, X-axis mirror enabled and
  in-front stick display.
- `START_HERE_RERIG_INSTRUCTIONS`: the short workflow embedded as a Blender text
  block.

The file opens with the empty armature selected in Edit Mode. Press `Shift+A`
to add the first bone, then use `E` to extrude chains. Build the root, pelvis,
spine, legs and arms before adding fingers. Use `.L` and `.R` suffixes for
mirrored bones. The optional recommended naming list is in
`workbook-manifest.json`; the workbook does not create or position bones.

Safety boundary: this is not wired to the game. The current runtime animations
and the source Blender file remain untouched. Skin binding, weight painting,
corrective shapes and animation retargeting happen only after the hand-built
skeleton is approved.
