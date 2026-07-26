# Underground Biome Variation Placement Map

## Outcome

The 50 new mockups fit the existing game as region-specific scenic packages
behind the authoritative dig terrain. They should not become replacement
gameplay screenshots or single flattened full-screen textures.

Review library:
`visual-approval-previews/underground-biome-variation-library-v1/`

## Exact Live Integration Points

| Order | Live or proposed plane | Phaser depth | Responsibility |
|---:|---|---:|---|
| 1 | `WorldVisualDepthBackdropRegionView` far card | `-6.4` | Large void, chamber, shaft, and landmark massing |
| 2 | Proposed optional mid-silhouette card | about `-6.25` | Arches, ribs, pipes, roots, gantries, and parallax |
| 3 | Regional emissive companion | `-6.1` | Sparse crystal, lamp, furnace, rift, and heat anchors |
| 4 | Regional atmosphere or current mist | `-5.8` | Dust, steam, ash, haze, and very slow drift |
| 5 | Existing material cave backdrop | `-3.5` | Immediate dark cavity support |
| 6 | Existing `WorldVisualMaterialField` facade | `0.1` | Authoritative solid-tile material |
| 7 | Existing terrain edge | `0.2` | Crisp dug boundary |
| 8 | Existing semantic, resource, damage, feedback, and darkness stack | existing higher depths | Gameplay meaning and torch visibility |

The current renderer already streams 1536x1024 logical cards with one neighbor
around the camera. That contract should remain. Approved mockups should be
re-authored as:

- opaque 1536x1024 far plate;
- transparent 1536x1024 mid plate when the composition needs it;
- transparent localized emissive plate;
- optional transparent atmosphere plate;
- optional alternate seamless facade texture only when the solid material
  itself needs variation.

## Current Gap

`WORLD_VISUAL_MATERIAL_BANDS` covers all ten bands from row 65 through row 5064.
`WORLD_VISUAL_DEPTH_BACKDROPS` currently stops after Level 1 at row 2064.
Therefore:

- mockups 01-25 deepen and vary an existing backdrop system;
- mockups 26-50 define the missing Level 2 backdrop language;
- Level 2 is the highest-value production target after a one-band pilot.

The current backdrop view also reuses the opaque backwall texture as a tinted
emissive duplicate. Selected directions will look cleaner when the descriptor
accepts a separately authored `emissiveAsset` and optional `midwallAsset`.

## Region Placement

| Set | Rows | Primary placement | Landmark placement | Threshold placement |
|---|---:|---|---|---|
| Weathered Roots 01-05 | 65-159 | Mine-entry soil and near-surface tunnels | Buried Shrine around the middle of the band | Blue-Earth in roughly rows 145-159 |
| Blue Caverns 06-10 | 160-519 | Main shallow Level 1 scenic cards | Moonwell Grotto used once or very rarely | Amber Fault in roughly rows 466-519 |
| Amber Depths 11-15 | 520-1039 | Warm mineral and early mining-remnant cards | Miner Sanctum used once or very rarely | Silver Vein in roughly rows 962-1039 |
| Silver Core 16-20 | 1040-1599 | Monumental ribs and reflective stone cards | Mirror Floor used once or very rarely | Magma Seam in roughly rows 1516-1599 |
| Core Magma 21-25 | 1600-2064 | Raw volcanic Level 1 finale | Heart-Forge used once or very rarely | Slagworks ingress in roughly rows 1995-2064 |
| Slagworks 26-30 | 2065-2664 | Abandoned industrial Level 2 opening | Titan Crucible used once or very rarely | Obsidian ingress in roughly rows 2575-2664 |
| Obsidian Catacombs 31-35 | 2665-3264 | Glossy black volcanic vaults | Monolith Sanctum used once or very rarely | Foundry ingress in roughly rows 3175-3264 |
| Pressure Foundry 36-40 | 3265-3864 | Dense machinery and steam | Turbine Vista used once or very rarely | Blackglass ingress in roughly rows 3775-3864 |
| Blackglass Abyss 41-45 | 3865-4464 | Sparse reflective abyss cards | Eclipse Window used once or very rarely | Starfire ingress in roughly rows 4375-4464 |
| Starfire Rift 46-50 | 4465-5064 | Climactic cosmic geology | Understar Vista used once near final depth | Infernal pressure boundary in roughly rows 4975-5064 |

The row windows are art-direction targets, not production constants. Final
values belong in `values/` and must align to the actual card geometry after the
selected art is split.

## How the Five Variants Should Rotate

The five compositions should not be uniformly random:

1. **Open chamber** is the baseline scenic card and creates breathing room.
2. **Vertical shaft** is selected deterministically for occasional vertical
   scale changes.
3. **Landmark vista** is explicitly authored and scarce; repeating it would
   erase its navigational value.
4. **Threshold** is constrained to a boundary window and blends only adjacent
   bands.
5. **Dense passage** alternates against open cards to produce a readable
   open/dense rhythm.

A deterministic segment hash can choose open, shaft, or dense variants while
keeping the same saved world visually stable. Landmarks and thresholds should
be data-authored rather than random.

## Minimal Safe Renderer Extension

1. Extend the backdrop region descriptor with optional `midwalls`,
   `emissiveAssets`, `atmosphereAssets`, and deterministic variant weights.
2. Keep current `backwall` behavior as the compatibility fallback.
3. Let `WorldVisualAssetCache` retain only the active card family plus the
   existing neighbor envelope.
4. Add the five Level 2 row regions without touching `WorldModel`.
5. Place all provisional weights, parallax, alpha, and row windows in `values/`.
6. Gate the new selection path behind a reversible query such as
   `?biomeBackdropVariants=0`; preserve the existing
   `?levelOneBackdrops=0` rollback.

## Recommended Pilot

Start with Blue Caverns mockups 06-10:

- it already has two live backwall variants, so before/after comparison is
  straightforward;
- the cyan identity is readable under darkness without requiring bright global
  grading;
- it exercises all five composition roles before the descriptor is expanded
  across Level 2.

After the pilot, implement Slagworks through Starfire as one Level 2 descriptor
extension, because those five bands currently lack equivalent far-backdrop
coverage.

## Approval and Validation Gates

- Select individual mockups, not necessarily an entire five-image set.
- Re-author selected scenes as layer assets; do not crop these gameplay
  composites directly into production.
- Preserve solid/air geometry, collision, resource readability, and hard black
  outside visibility.
- Test boundary crossings, camera-edge crops, native-density output, texture
  residency, and FPS.
- Compare with the rollback query before making the new path default.

No runtime file was changed by this mockup pass.
