# Underground Terrain Blend V4

## Outcome

The production underground stack now adds stronger ground variation without
replacing any approved background, ground material, layout, or structure:

- 50 distinct 1536x1024 ImageGen terrain plates, five per biome;
- 200 painted exposed-top frames, twenty per biome;
- 50 alpha-feathered derivatives of the approved V3 roots, arches, ribs,
  corners, and seams;
- one 16-frame RGBA blend-mask atlas for complete backdrop paintings.

The terrain package therefore contributes 250 effective ground visuals. The
structure derivative package fixes joins while retaining all fifty approved V3
files and their lossless review sources.

## Visual direction

The first three plates in each biome provide readable material variety. The
two later plates deliberately push stronger macro geology:

- root torsion and peat upheaval;
- sapphire shear and frozen-current eddies;
- resin faults and fossil-honeycomb uplift;
- mercury folds and magnetic shard convergence;
- lava deltas and broken caldera pressure;
- slag churn and copper-oxidation surges;
- blackglass wavebreaks and violet crypt faults;
- pressure fans and condenser-mineral surges;
- prism shear and eclipse-impact breccia;
- comet-tail quartz and nebula-fault blooms.

Candidates with a high-contrast line crossing the complete card were rejected.
Accepted plates use interrupted, asymmetric gestures surrounded by blendable
material.

## Layer and gameplay contract

Production ordering remains:

1. existing continuous terrain material;
2. alpha-feathered V4 terrain variation plates;
3. alpha-feathered ground structures;
4. painted exposed-top cuts;
5. resources, rewards, damage, physical effects, and emissive feedback.

The `WorldModel` terrain mask remains authoritative. No V4 image changes tile
type, HP, collision, digging, drops, saves, cave topology, or world generation.
Buildings, bridges, machinery, roots, ruins, and architectural forms remain
background scenery or terrain-masked decorative structures.

## Seam treatment

Complete backdrop paintings and ground cards preserve their native
1536x1024 density. Cards overlap by 192 px horizontally and 128 px vertically,
giving a 1344x896 stride. Horizontal and vertical mirroring are disabled.
Partial tail cards crop from the original source instead of stretching.

Backdrop paintings use a shared 16-state bitmap-mask atlas. Terrain plates and
ground-structure derivatives carry real feathered image alpha. Ground
structures keep their authoritative terrain geometry mask, so they do not need
stacked Phaser masks.

## Runtime controls

- `?undergroundTerrainVariation=0` disables the 50 plates and 200 top cuts.
- `?groundStructureBlend=0` restores the original V3 structure assets.
- `?undergroundGroundStructures=0` disables the complete structure layer.
- Existing backdrop expansion and motion controls remain independent.

## Evidence

- Review package:
  `visual-approval-previews/underground-terrain-blend-v4/`
- Runtime terrain package:
  `sprites/backgrounds/world-visual-v2/depth/terrain-variation-v4/`
- Runtime structure derivatives:
  `sprites/backgrounds/world-visual-v2/depth/biome-ground-structures-v4/`
- Terrain SSOT:
  `values/worldVisualTerrainVariation.js`
- Structure SSOT:
  `values/worldVisualGroundStructures.js`
- Terrain contract:
  `testing/2026-07-28-underground-terrain-blend-v4-contract.mjs`
- Structure contract:
  `testing/2026-07-28-ground-structure-blend-v4-contract.mjs`

The V4 contracts verify counts, dimensions, distinct hashes, retained alpha,
native overlap geometry, exact region mapping, gameplay isolation, V3
retention, rollback routing, painted cap invalidation after digging, and the
absence of mirrored or HTML/Graphics presentation.
