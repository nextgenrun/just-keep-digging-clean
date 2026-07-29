# Underground Visual Expansion V3

## Outcome

The scenic runtime now owns one hundred new built-in ImageGen assets without
replacing the existing underground presentation:

- 50 full 1536x1024 background paintings;
- 50 transparent 1536x1024 terrain-structure plates;
- five of each asset type for every one of the ten depth biomes.

The existing 50 static biome cards, ten named concept statics, ten smooth V3
motion loops, continuous material bands, terrain mask, semantic feedback, cave
topology, and authored layout remain active and unchanged.

## Additive background contract

`values/worldVisualDepthBackdrops.js` interleaves five V3 cards with the five
older static cards in each biome, then retains the named concept static and
smooth motion loop. The live pool therefore contains 120 cards:

- 50 older static cards;
- 50 additive V3 static cards;
- 10 named concept-static cards;
- 10 approved smooth whole-image videos.

Every card remains below terrain at depth `-6.4`. Buildings, bridges, roots,
rails, ruins, and machinery remain scenery rather than ground. One complete
painting is selected per world-space card; full opaque paintings are never
double-exposed or flattened together.

Use `?biomeBackdropExpansion=0` to restore the previous 70-card production pool.
The broader `?biomeBackdropVariants=0` rollback still restores the legacy
Level 1 backdrop path.

## Additive ground-structure contract

`WorldVisualGroundStructureLayer` streams five biome-matched alpha plates for
the intersecting depth band. Each plate:

- is masked by the same authoritative solid-terrain geometry used by the
  continuous material;
- renders at depth `0.16`, above terrain material and below terrain edges,
  roots, resources, rewards, damage, physical effects, and emissive feedback;
- disappears immediately where terrain is dug;
- never changes tile type, HP, collision, drops, saves, caves, or generation.

Use `?undergroundGroundStructures=0` to remove only this new layer.

## Image production

All one hundred visual concepts were created with built-in ImageGen using one
call per distinct asset. Background prompts prohibited foreground floor bands,
playable platforms, collision silhouettes, characters, UI, text, and contact
sheets. Ground-structure prompts requested isolated physical geology on
uniform chroma green because a direct transparency pilot returned a painted
checkerboard instead of RGBA.

`ai-tools/2026-07-28-build-underground-visual-expansion-v3.py`:

1. validates exactly 50 background and 50 ground masters at 1536x1024;
2. extracts ground alpha with chroma-distance and green-dominance masks;
3. removes green spill from semi-transparent edge pixels;
4. rejects unexpected opaque coverage;
5. writes optimized runtime WebPs and RGBA review masters;
6. records dimensions, hashes, byte sizes, alpha metrics, and prompt provenance;
7. builds separate background and alpha contact sheets.

## Paths

- Lossless sources and review:
  `visual-approval-previews/underground-visual-expansion-v3/`
- Background runtime:
  `sprites/backgrounds/world-visual-v2/depth/biome-expansion-v3/`
- Ground-structure runtime:
  `sprites/backgrounds/world-visual-v2/depth/biome-ground-structures-v3/`
- Background configuration:
  `values/worldVisualDepthBackdrops.js`
- Ground configuration:
  `values/worldVisualGroundStructures.js`
- Runtime layer:
  `world/rendering/scenic-world/WorldVisualGroundStructureLayer.js`
- Regression contract:
  `testing/2026-07-28-underground-visual-expansion-v3-contract.mjs`

## Validation

The expansion contract verifies:

- exactly 100 new runtime assets;
- exactly 120 live background cards and a 70-card expansion rollback;
- all runtime images at 1536x1024;
- unique keys and paths;
- real WebP alpha on all 50 ground structures;
- RGBA lossless review masters and bounded opaque coverage;
- terrain-mask ownership and render ordering;
- no Phaser Graphics, HTML, procedural overlay, tile mutation, collision, or
  save authority in the ground-structure renderer.
