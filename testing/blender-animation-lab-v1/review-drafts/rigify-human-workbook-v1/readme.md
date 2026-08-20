# Survival Rigify Human workbook v1

Review-only Blender workspace for manually fitting Blender's stock Rigify
Human metarig to the Survival character. Nothing in this directory is loaded
by runtime.

Open `survival-character-rigify-human-workbook-v1.blend`. It contains:

- `RIGIFY_CleanMesh`: the unweighted 83k-vertex character mesh with the latest
  V4 full-resolution materials, eye response and black-glove correction.
- `RIGIFY_HumanMetarig`: Blender's editable 159-bone Human metarig, globally
  fitted to the character and saved in Edit Mode.
- `START_HERE_RIGIFY_HUMAN`: the short manual-fitting workflow embedded as a
  Blender text block.

Fit joints in Edit Mode and preserve Rigify bone names, directions, connected
chains and rig types. Do not generate the control rig, parent the mesh, or add
animations in this working file. After the metarig is polished and saved, a
snapshot copy can generate, bind and retarget for the three-way comparison:
current original rig versus the user's manual rig versus Rigify.

Safety boundary: production Blender files, animations, sprites, hitboxes and
runtime manifests remain untouched.
