# Underground Foreground Library V6

Production review and source package for the additive 400-entry underground
detail library.

- `sources/chroma/` retains the twenty original built-in ImageGen atlas calls.
- `sources/alpha/` retains their chroma-clean RGBA masters.
- The two contact sheets show all 200 foreground textures and all 200 overlay
  props on checkerboard transparency.
- The JSON manifest pins every source/runtime hash, all 400 crop rectangles,
  per-frame alpha coverage, and unique RGBA hashes.
- Production loads only the twenty packed WebP atlases under
  `sprites/backgrounds/world-visual-v2/depth/`.

`reviewOnly: false`; `productionChanged: true`. The source and QA files are not
loaded by Phaser.
