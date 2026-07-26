# Heavenblocks v1 Source Intermediates

**Date:** 2026-07-26
**Runtime loaded:** No

These chroma-key PNGs are retained as reproducible source intermediates for
the transparent Heavenblock façades in the parent folder:

- `lower-sky-facade-chroma-v1.png`
- `angel-heavenblock-facade-chroma-v1.png`
- `devil-eclipse-facade-chroma-v1.png`

The v2 native-world objective set retains both image-generation chroma
intermediates and cleaned alpha masters:

- `aether-turbine-heart-chroma-v2.png`
- `aether-turbine-heart-alpha-v2.png`
- `halo-regulator-heart-chroma-v2.png`
- `halo-regulator-heart-alpha-v2.png`
- `eclipse-crucible-heart-chroma-v2.png`
- `eclipse-crucible-heart-alpha-v2.png`

They were generated from clean, HUD-free versions of the approved mockups.
Transparency was extracted with the bundled image-generation chroma-removal
helper using border auto-keying, a soft matte, despill, and one-pixel edge
contraction. Phaser never loads these source files.
