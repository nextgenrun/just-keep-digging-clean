# Underground Star Tile Redesign V1

Five review-only ImageGen art directions for a complete visual replacement of
the six live underground Star Block rarity tiles.

**Rejected 2026-07-28:** every direction incorrectly contained the star inside
rock, a fossil slab, a mechanism, roots, or blackglass. The replacement must be
a literal free-floating star. Continue review in
`../underground-star-floating-directions-v2/`.

## Review set

1. `2026-07-28-01-starheart-geodes-v1.png`
2. `2026-07-28-02-celestial-fossils-v1.png`
3. `2026-07-28-03-astral-lockstones-v1.png`
4. `2026-07-28-04-living-starseeds-v1.png`
5. `2026-07-28-05-eclipse-prisms-v1.png`

Every board uses the live rarity order:

1. cyan
2. lavender
3. gold
4. orange
5. turquoise
6. violet

The enlarged candidates are followed by an underground scale-check strip. The
boards target the live one-tile footprint and 32 px gameplay read, but they are
direction mockups rather than extraction-ready atlases.

## Current-art references

- `sprites/backgrounds/world-visual-v2/semantic-decals-v1/sky-stars-beauty-v1.png`
  supplied the current six-color order and footprint only.
- `ai-tools/2026-07-17-steam-screenshot-03-constellation-star.png` supplied the
  dark realistic side-view underground material and gameplay-scale context.

## Runtime boundary

- `reviewOnly: true`
- `productionChanged: false`
- No asset in this folder is loaded, registered, preloaded, or referenced by
  Phaser.
- The current beauty/emissive atlas, steady rarity auras, rare beacon pulses,
  destruction art, lighting persistence, rewards, saves, and gameplay remain
  unchanged.

Prompt provenance is recorded in
`2026-07-28-imagegen-prompt-manifest.md`.
