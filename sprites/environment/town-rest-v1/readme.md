# Town rest artwork

Created 2026-09-07 with built-in ImageGen for the town bed and Phaser rest sequence. Original pixels and alpha retained. Bed: side-view carved oak, midnight teal quilt, ivory linen and brass. Blessings: baked Ember pouch title, Warmth and Inspiration cards, Campfire upgrade button. Captions: four equal-height baked state plaques. All input areas are invisible Phaser zones. See markdown/2026-09-07-town-bed-rest.md for behavior and verification.

guidance-v1.png is the unchanged selected built-in ImageGen atlas containing
the bed/moon crest, arrow and "RETURN TO YOUR TOWN BED / SLEEP TO SAVE" plaque.
guidance-prompts.json records the exact generation/edit prompts and SHA-256.
The generator returned RGB artwork; final Phaser presentation clips each frame
to its measured silhouette using values/townRestGuidanceArt.js, just as the
baked save menu does. No checkerboard/background pixels are rendered.
