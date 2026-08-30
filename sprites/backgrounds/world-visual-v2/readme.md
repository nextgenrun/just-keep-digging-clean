# World Visual v2

Production source plates for the scenic-v2 world renderer.

- `far/moonlit-mountain-forest-v1.png`: original opaque tree/mountain surface
  plate and stable Titan-promenade background.
- `far/sky-foundation-v2/`: retained seamless atmosphere plus an immediate
  cobalt runtime fallback behind the forest plate.
- `far/sky-cohesion-v1/`: twenty native-density sky feature paintings routed
  through explicit world/altitude order and four-edge foundation fades.
- `mid/town-row-hero-v1.png`: alpha town midground aligned by its door baseline.
- `surface/town-surface-edge-thin-v2.png`: production 1672x48 approved-slate
  walk-surface cap, mirrored and overlapped across all 280 columns without
  owning collision.
- `surface/town-surface-edge-v1.png`: retained deeper natural-edge provenance.
- `materials/town-dark-earth-v1.png`: continuous terrain material for the surface mine.
- `semantic-decals-v1/ground-damage-fracture-expanded-v4.png` and
  `ground-damage-response-expanded-v4.png`: production layered damage library
  with 64 authored motifs, four optimized cumulative anchors, 33 exact
  tile/resource response profiles, twelve logical states, and eight stable
  transforms. Layered V3, polished V2, and ImageGen V1 remain query-selectable
  rollbacks.
- `depth/shallow-cavern-backwall-v1.png`: streamed opaque shallow-cavern plate covering runtime rows 65..159.
- `depth/foreground-cohesion-v1/`: ten additive alpha-foreground plates, one
  dedicated terrain-masked world placement per biome.
- `depth/terrain-seam-blend-v6/` and `depth/biome-ground-structures-v6/`:
  complementary incoming-edge derivatives over every retained V4/V5 terrain
  plate and V3 structure composition.
- `depth/underground-foreground-textures-v6/` and
  `depth/underground-overlay-props-v6/`: twenty streamed biome atlases exposing
  400 localized terrain-masked ImageGen details.
- `depth/level1-biome-boundaries-v1/`: six transparent ImageGen transition
  cutouts cover every material-family join that actually occurs in the
  irregular Level 1 X0-131, 0-2000 m visual-biome field, including the generated
  Amber/Silver, Silver/Magma, and Amber/Magma deep joins. Level 2 is unchanged.
- `depth/level1-biome-signatures-v1/`: twenty unique native-resolution RGBA
  foreground formations, one seed-anchored identity for each Level One visual
  source family. They are terrain-masked, demand-streamed, and visual-only.
- `depth/level1-biome-generated-roles-v2/`: sixty independent background,
  ground, and foreground WebPs that combine with the twenty V1 signatures to
  form the retained twenty-family/eighty-role library.
- `depth/level1-biome-generated-roles-v3/`: 120 independent RGBA WebPs for the
  thirty added families, with unique background, signature, ground, and
  foreground compositions for each identity. The complete current generated
  role library contains 200 assets across fifty families.
- `sources/`: retained chroma-key generations used to produce the alpha assets.

These are layered runtime sources, not flattened HTML mockups. Geometry, digging, damage, and resource authority remain in `WorldModel`.
