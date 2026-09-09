# Character definition trial — 2026-09-06

Review-only native Blender renders of the current Survival character and the
accepted 24-frame Standard Walk. No game-loaded files or source Blend changed.

Open index.html through the repository's canonical serve.py. The page supports
play/pause, half speed and frame scrubbing. before-after.webp is the animated
comparison; before-after.png is its still. The small pair uses equal scale.

The candidate packs 1536px native renders into 512px lossless cells. It adds a
warmer workwear palette, separated cloth/leather materials, revised key/fill/rim
lighting, and acceleration-driven damped spring motion on the jacket hem and
backpack. This is baked secondary motion, without cloth collisions or pinning.
It is a visual trial, not a completed cloth solver or a complete animation pack.

Source audit: 83,188 vertices, 119,304 polygons, 160 bones, armature modifier,
no cloth modifier, zero unweighted vertices, and zero non-normalized totals.
Weights and source Blend hashes are unchanged. These checks do not establish
that every joint deformation or animation transition is correct.

Validation: 24 distinct native frames and 24 animated comparison frames; minimum
raw alpha edge margin 150px. Browser playback/pause and frame scrubbing checked.
Only walking was rendered; no production character switch was made.

Settings: values/characterDefinitionPreviewV1.json.
Native renderer: ai-tools/2026-09-06-render-character-definition-preview.py.
Packer/comparison: ai-tools/2026-09-06-build-character-definition-preview.py.
Blender 5.1 and bundled Python/Pillow were used. No ImageGen edits are involved.

