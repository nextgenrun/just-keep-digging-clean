# Underground Detail Library and Seam Blend V6

Date: 2026-07-29

## Outcome

The scenic underground renderer keeps every V3, V4, and V5 system and asset
family, while adding:

- 200 transparent foreground material textures;
- 200 transparent underground overlay props;
- 90 complementary V6 derivatives of all retained V4/V5 terrain plates; and
- 50 complementary V6 derivatives of all retained V3 ground structures.

The 400 new details are built from twenty independent ImageGen atlas sources:
one 20-frame foreground-texture source and one 20-frame overlay-prop source for
each of the ten production biomes. Runtime packs those frames into twenty
`1600x1024` RGBA WebP atlases with exact `320x256` crops.

## Seam correction

The former terrain and structure cards faded on left, right, top, and bottom.
When two cards overlapped, both could be partially transparent at the same
pixels, creating a dark rectangular valley that read as a fold.

V6 keeps the retained card covered through its right and bottom edges. Only
the incoming card feathers on its left and top edges. Cards overlap at a
`1152x768` stride, and deterministic region/row/column depth offsets guarantee
that the right or lower incoming card draws above the retained card regardless
of streaming order. The effect is a real crossfade between two covered
paintings instead of two fades toward empty space.

Both V6 card families composite at full alpha, so the incoming feather and
retained coverage form one normalized source-over handoff. The rollback routes
retain the former terrain and structure alpha values.

No V4 or V5 file is edited. `?undergroundSeamBlend=0` restores their exact
assets and `1344x896` placement. `?groundStructureBlend=0` still restores the
original V3 structure set.

## Additive foreground runtime

`WorldVisualUndergroundDetailLayer` streams only the two atlases belonging to
the intersecting biome. `WorldVisualUndergroundDetailRegionView` places
localized frames on a deterministic world grid with bounded scale, jitter,
rotation, mirroring, and density variation. The complete world uses every
registered frame without decoding 400 separate files.

Five fixed prop frame identities per biome are the multi-tile class: fifty of
the 200 props always render roughly 9-17 terrain tiles wide and 5.5-11.5 tiles
high. These arches, shelves, ribs, pipes, and buttresses continue the existing
large ground-structure language. The remaining 150 props stay localized for
small-scale variety. Each atlas cell is installed as a native Phaser texture
frame, so those tile spans are the real rendered dimensions rather than
crop-relative estimates.

Foreground textures render between the terrain plates and retained ground
structures. Overlay props render above the structures but below exposed-ground
caps, resources, rewards, damage, and emissive feedback. Both groups share the
existing geometry mask and lighting tint.

The layer is visual-only. It does not write tile type, HP, collision, drops,
resources, cave topology, saves, or authored map data.

Runtime switches:

- `?undergroundDetailLibrary=0` disables all 400 new detail entries.
- `?undergroundForegroundTextures=0` disables only the 200 textures.
- `?undergroundOverlayProps=0` disables only the 200 props.
- `?undergroundSeamBlend=0` restores retained V4/V5 card blending.

## Evidence

- Detail manifest:
  `visual-approval-previews/underground-foreground-library-v6/2026-07-29-underground-detail-library-v6.json`
- Detail contact sheets:
  `2026-07-29-foreground-textures-contact-sheet-v6.jpg` and
  `2026-07-29-overlay-props-contact-sheet-v6.jpg`
- Seam manifest:
  `visual-approval-previews/underground-seam-blend-v6/2026-07-29-underground-seam-blend-v6.json`
- Seam proof sheets:
  `2026-07-29-terrain-seam-proof-v6.jpg` and
  `2026-07-29-ground-structures-seam-proof-v6.jpg`
- Contract:
  `testing/2026-07-29-underground-detail-library-v6-contract.mjs`

The contract verifies exact counts, 400 unique RGBA frame hashes, all runtime
WebP geometry and hashes, default/rollback routing, deterministic placement,
complete 20+20 frame participation in every biome, both localized and
guaranteed multi-tile prop scale classes, native frame dimensions, terrain
masking, render-depth bounds, runtime lifecycle wiring, and the absence of
gameplay mutation APIs. The retained V4 terrain, V4 ground-structure, V5
whole-world expansion, scenic runtime foundation, and renderer parity
contracts also remain green.
