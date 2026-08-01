# Underground backdrop enhancers V7

Date: 2026-07-29

## Outcome

The retained underground backdrop system now has a separate library of 100
transparent, high-resolution composition enhancers. The system is additive:
none of the existing V2/V3/V5 backdrops, motion cards, normalized card masks,
terrain plates, structure plates, or V6 foreground details were replaced.

Each of the ten underground biome bands receives ten 1536 x 1024 overlays:

- ceiling crown;
- side arches;
- hanging network;
- central halo;
- side silhouette;
- reflection ribbons;
- constellation;
- diagonal ribs;
- vertical curtains;
- depth aperture.

The material, palette, silhouette language, and landmarks are authored
separately for every biome.

## Optional stable-random placement

Enhancers are not rendered on every backdrop card.

`values/worldVisualBackdropEnhancers.js` owns deterministic coverage between
52% and 64% by biome. The remaining 36% to 48% of cards intentionally render
the retained backdrop with no enhancer, no empty placeholder, no draw call,
and no texture request.

Three independent stable hashes decide:

1. whether the card receives an enhancer;
2. which compatible asset it receives;
3. its small alpha variation.

The result looks random across the mine but never changes when the player
scrolls away, revisits, saves, loads, or resizes.

## Correct overlay matching

The enhancer layer resolves the actual requested backdrop asset for the same
region, column, and row before choosing its overlay. It then restricts random
selection to a compatible family:

- quiet pockets favor sparse motes, hanging networks, halos, apertures, and
  reflections;
- water, rain, dust, ash, steam, tide, and current cards favor ribbons,
  curtains, constellations, networks, and crowns;
- cathedrals, sanctums, engines, archives, wells, crowns, and temples favor
  halos, apertures, networks, constellations, and arches;
- cities, towers, foundries, rail yards, crypts, and libraries favor
  silhouettes, arches, networks, curtains, and crowns;
- ravines, canyons, faults, trenches, crossings, and escarpments favor crowns,
  arches, ribs, curtains, and reflection ribbons.

Cards whose backdrop name does not match a specialized rule can use the full
ten-asset biome pool. Biome boundaries always remain authoritative, so a
Starfire overlay cannot appear in Weathered Roots.

## Resolution and seamless alpha

Every source, review alpha, and runtime asset remains 1536 x 1024. Runtime
downsamples that source to the retained 1152 x 768 world-card footprint rather
than upscaling low-resolution art.

The build pipeline:

1. keeps the original named chroma source;
2. runs the supported ImageGen border-sampled soft-matte helper;
3. despills the chroma color;
4. applies a one-pixel object-edge feather;
5. multiplies alpha by a 192-source-pixel smooth frame-edge falloff;
6. writes a compressed alpha WebP without changing dimensions;
7. records hashes, occupied alpha, and outer-edge alpha.

The transparent frame edge allows neighboring enhancer cards to overlap
without a rectangular fold. Structural shapes use normal blending. Only sparse
light, dust, ribbon, constellation, and curtain families use low-alpha additive
blending.

## Runtime architecture

- `WorldVisualBackdropEnhancerLayer` is created directly after
  `WorldVisualDepthBackdropStage`.
- `worldVisualBackdropCardGrid.js` exposes the retained card geometry to the
  additive layer.
- Card depth is computed from the matching backdrop card plus a small configured
  offset, keeping enhancers above their background and below terrain.
- The existing scenic asset cache demand-streams only selected visible and
  neighbor assets and releases unused textures.
- The layer samples backdrop lighting with a partial tint mix so authored
  palette remains visible while depth and lightning still bind both layers.
- The layer never reads or mutates collision, tile solidity, digging, saves, or
  world generation.

## Review and rollback

Review:

- `visual-approval-previews/underground-backdrop-enhancers-v7/2026-07-29-backdrop-enhancers-contact-sheet-v7.jpg`
- `visual-approval-previews/underground-backdrop-enhancers-v7/2026-07-29-backdrop-enhancers-context-contact-sheet-v7.jpg`
- `visual-approval-previews/underground-backdrop-enhancers-v7/2026-07-29-backdrop-enhancers-v7.json`

Rollback only this additive library with:

`?undergroundBackdropEnhancers=0`

Compatibility rollback:

`?biomeBackdropEnhancers=legacy`
