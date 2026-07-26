# Underground Biome Background Runtime Wiring

Date: 2026-07-26
Status: production wired

## Outcome

Fifty new background-only ImageGen plates are active across all ten underground
material bands. Each band has five deterministic world-space compositions.
Gameplay terrain remains the sole ground, collision, digging, HP, resource, and
save authority.

## Visual layer contract

| Layer | Phaser depth | Ownership |
|---|---:|---|
| Backwall plate | -6.4 | Scenic cave, distant structures, bridges, roots, and machinery |
| Emissive breathing pass | -6.1 | Low-alpha reuse of the selected backwall |
| Shared mist | -5.8 | Aspect-preserving atmospheric drift |
| Biome ambient motion | -5.55 | Pooled dust, drips, embers, steam, ash, or stars |
| Solid terrain facade | 0.1 | Authoritative ground mask over every scenic layer |
| Terrain exposed edge | 0.2 | Readable boundary of real solid cells |

The negative scenic depths are deliberate. A bridge or building painted into a
plate is always occluded by real solid cells and can never become a platform or
collision surface.

## Biome mapping

| Region | Rows | New visual family | Ambient profile |
|---|---:|---|---|
| Surface Entry | 65-159 | Weathered Roots | Dust |
| Level 1 Blue | 160-519 | Blue Caverns | Drips |
| Level 1 Amber | 520-1039 | Amber Depths | Golden dust |
| Level 1 Silver | 1040-1599 | Silver Core | Shimmer stars |
| Level 1 Magma | 1600-2064 | Core Magma | Embers |
| Level 2 Magma | 2065-2664 | Slagworks | Steam |
| Level 2 Obsidian | 2665-3264 | Obsidian Catacombs | Ash |
| Level 2 Foundry | 3265-3864 | Pressure Foundry | Steam |
| Level 2 Blackglass | 3865-4464 | Blackglass Abyss | Blue stars |
| Level 2 Starfire | 4465-5064 | Starfire Rift | Magenta stars |

## Variation and streaming

- Every runtime card is exactly 1536x1024.
- Variant selection is deterministic from world-space card column and row.
- A region becomes visible only after all five selected cards are resident, so
  the generic material backdrop cannot disappear into an incomplete set.
- Only intersecting regions and their configured neighbor cards remain active.
- Departed non-startup textures are released.
- Exact bottom-card crops align each scenic family with the matching ground
  material boundary.

## Animation

Mist drift and emissive breathing use deterministic sine interpolation rather
than gameplay-stateful tweens. `WorldVisualDepthAmbientLayer` draws all visible
motes into one pooled Phaser Graphics object; it does not create one object per
particle.

The ambient pass updates every 50 ms at normal performance, reduces to 85 ms
and a 40-mote cap below 44 FPS, and clears below 32 FPS. These changes never
touch `WorldModel`.

## Rollback controls

- `?biomeBackdropVariants=0` restores the previous Level 1 plate pool; deeper
  regions retain their generic material background.
- `?biomeBackdropMotion=0` freezes mist, emissive breathing, and biome motes.
- `?worldMotion=0` is a compatibility motion override.
- `?levelOneBackdrops=0` or `?shallowCavern=0` disables the entire scenic
  depth-backdrop stage.

## Asset provenance

Original sources:
`visual-approval-previews/underground-biome-background-production-v2/`

Runtime derivatives:
`sprites/backgrounds/world-visual-v2/depth/biome-variation-v2/`

Builder:
`ai-tools/2026-07-26-build-underground-biome-backgrounds-v2.py`

The builder preserved every original PNG, normalized one 1537x1023 source to
the exact runtime contract in memory, and verified 50 unique 1536x1024 WebPs
totalling 10.33 MiB.

## Verification

`testing/2026-07-16-scenic-shallow-cavern-smoke.mjs` covers:

- all ten region/material boundaries;
- 50 unique configured assets and exact WebP dimensions;
- deterministic five-card selection;
- staged loading and generic-backdrop fallback;
- exact tail crops for every band;
- negative scenic depth versus authoritative ground depth;
- low-FPS ambient shedding;
- variant, motion, and complete-stage rollback paths;
- absence of tile or `WorldModel` mutation from the new visual layers.
