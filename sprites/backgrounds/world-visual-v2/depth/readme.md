# Scenic-v2 Underground Depth Backdrops

The active production package additively combines `biome-variation-v2/`,
`biome-expansion-v3/`, `biome-expansion-v5/`, and `biome-motion-v3/`: all fifty previously approved
background-only 1536x1024 WebPs, fifty new ImageGen compositions, ten static
WebPs of the named motion-concept paintings, and ten approved 1536x1024 H.264
loops, plus fifty gap-targeted V5 ImageGen compositions covering all ten
material bands from row 65 through 5064. Each band
receives five older static compositions interleaved with five new static
compositions, one concept-static composition, and one smooth whole-image loop.
V5 contributes two to eight more compositions according to the audited depth
gap. No older card is overwritten or removed. The renderer streams the active band
plus its world-space neighbor envelope and places every plate, building, bridge,
ruin, root, rail, and machine behind the solid terrain facade.

Backdrop sources remain native 1536x1024 media, while runtime cards select the
clean 1152x768 inner frame at 1:1 density. The renderer uses a 144x140 overlap
and 1008x628 stride. Generated smoothstep masks fade every real neighbor on
both sides of each join; complementary ADD weights sum to one over an opaque
world-space matte, including at four-card corners. Mirroring is disabled and
the last card is cropped rather than stretched. `terrain-variation-v5/` keeps
the irregular mask atlas available, while neighboring backdrop biomes overlap
by 140 px. Named `handoff` paintings are selected only in their biome's final
row, matching their depicted transition to the correct depth. Non-handoff
cards advance one step through the authored canyon-to-sanctum order across both
columns and rows; the renderer no longer prime-shuffles unrelated palettes or
architectural silhouettes into neighboring cards.

`terrain-variation-v4/` adds five alpha-feathered terrain plates per biome above
the existing continuous material field plus twenty deterministic painted
exposed-top frames per biome. This is 50 complete plates and 200 top cuts
without changing terrain authority.

`terrain-variation-v5/` adds forty gap-targeted plates and ten more 20-frame cap
atlases beside V4. Next-biome material begins 128 px early through the authored
irregular alpha edge, while the production terrain mask remains the only ground
shape.

`terrain-seam-blend-v6/` keeps every V4/V5 composition but replaces the
double-sided runtime card fade with ninety complementary incoming-edge
derivatives. Cards overlap at `1152x768`; only the new left/top edge feathers,
while right/bottom coverage remains under its neighbor. Terrain and structure
selection uses the same one-step semantic progression, so buttresses, ceilings,
arches, strata, and corners appear in sensible order and every retained asset
is used before repetition.

`underground-foreground-textures-v6/` and
`underground-overlay-props-v6/` add ten 20-frame atlases each: 200 organic
material islands and 200 decorative props. They are localized, deterministic,
terrain-masked, streamed per biome, and non-authoritative.

`foreground-cohesion-v1/` adds one approved alpha-feathered 1536x1024 painting
to each biome through a dedicated world-anchored image view. The five V4 plates
remain stored and selected unchanged. Each cohesion image is streamed only near
its authored placement and clipped by the authoritative terrain mask; it is not
a DOM, Graphics, screen-space, or collision layer.

`biome-ground-structures-v4/` preserves the separate fifty-card V3 transparent
terrain-structure library as feathered derivatives above the continuous
material at depth `0.16`. The V3 files remain in
`biome-ground-structures-v3/`. Structures are masked to authoritative solid
terrain and stay below resources, rewards, damage, and emissive feedback. They
never replace the existing terrain/material layout.

`biome-ground-structures-v6/` derives the same fifty approved compositions
through the complementary V6 incoming-edge contract. V4 and V3 remain present
as query-selectable rollback pools.

Production V3 motion is an eight-second, 60 fps subpixel affine drift of the
complete finished image. The rejected optical-flow WebMs, pooled particles,
drifting mist, and emissive breathing are not registered by this renderer. The
old V2 WebMs remain immutable review evidence under `biome-motion-v2/`, not
runtime assets.

- `?biomeBackdropVariants=0` restores the legacy Level 1 pool and leaves deeper
  bands on the generic material backdrop.
- `?biomeBackdropExpansion=0` removes only the fifty new static cards and
  restores the previous seventy-card production pool.
- `?biomeBackdropExpansionV5=0` removes only the latest fifty V5 cards and
  restores the 120-card V2/V3/motion pool plus its V4 blend mask.
- `?biomeBackdropMotion=0` freezes V3 playback and disables complete-image
  camera response.
- `?undergroundGroundStructures=0` removes only the new masked ground-structure
  layer.
- `?groundStructureBlend=0` restores the approved V3 structure asset set.
- `?undergroundSeamBlend=0` restores the untouched V4/V5 terrain and V4
  structure cards with their former overlap geometry.
- `?undergroundDetailLibrary=0` removes all 400 additive localized details.
- `?undergroundForegroundTextures=0` removes only the 200 texture frames.
- `?undergroundOverlayProps=0` removes only the 200 decorative prop frames.
- `?undergroundTerrainVariation=0` removes only the 50 terrain plates and 200
  painted exposed-top frames.
- `?undergroundForegroundCohesion=0` removes only the ten world-anchored
  cohesion paintings while leaving every material pool enabled.
- `?undergroundTerrainExpansionV5=0` removes only the forty V5 terrain plates
  and their ten cap atlases.
- `?levelOneBackdrops=0` or `?shallowCavern=0` disables the depth-backdrop stage.

## Legacy Level 1 plates

`shallow-cavern-backwall-v1.png` is the opaque production backwall for runtime
rows `65..159`. It was generated with the built-in image-generation workflow at
1536x1024, using the approved moonlit-town mockup only for material, lighting,
and finish quality and the existing Level 1 depth plate only for underground
composition language.

The production prompt requested a horizontally repeatable, side-view dark-rock
cavern recess with roots, embedded timber silhouettes, restrained cobalt and
amber lighting, and no sky, town, player, UI, resource symbols, tile grid,
green artifacts, or false playable platforms.

The complete Level 1 runtime uses the original surface plate plus:

- `level1-blue-backwall-a-v1.png` and `level1-blue-backwall-b-v1.png` for rows `160..519`;
- `level1-amber-backwall-v1.png` for rows `520..1039`;
- `level1-silver-backwall-v1.png` for rows `1040..1599`;
- `level1-magma-backwall-v1.png` for rows `1600..2064`.

Runtime picks variants deterministically across world-anchored 24x16 tile
segments. Only the active/intersecting region is decoded, with both neighboring
regions allowed at an exact depth boundary. The real `WorldModel` remains
authoritative for digging, collision, HP, resources, and saves. Use
`?levelOneBackdrops=0` or compatibility alias `?shallowCavern=0` to restore the
generic material backdrop.

## Optional backdrop enhancer library V7

`biome-backdrop-enhancers-v7/` adds ten transparent native-1536x1024
composition enhancers to each of the ten retained underground bands. Assets are
demand-streamed individually and selected with stable optional coverage. The
selector matches overlay families to the requested backdrop motif and can
intentionally return no overlay. Existing opaque backdrops and normalized blend
masks remain authoritative. Use `?undergroundBackdropEnhancers=0` to disable
only this additive library.

