# Expanded Ground Damage Library V4

Date: 2026-08-26  
Status: production-wired locally

## Outcome

Persistent tile damage now defaults to an expanded, tile-aware V4 mixer:

- 64 authored structural motifs across impact, compression, radial fracture,
  shear, split, brittle, lattice, plate, splinter, and delamination families.
- Twelve logical HP-loss states retained for gameplay readability.
- Four strictly cumulative raster anchors per motif, with per-state scale and
  opacity supplying the intermediate progression.
- Eight coordinate-stable right-angle/mirror transforms.
- 33 dedicated tile/resource response profiles, each with four severity tiers.
- Three pooled production layers: MULTIPLY fracture body, SCREEN fracture rim,
  and NORMAL tile-tinted response fragments.

The structural library exposes `64 x 12 x 8 = 6,144` deterministic visual
combinations before exact tile response mixing is counted.

## Assets

Runtime:

- `sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-fracture-expanded-v4.png`
  is 3008 x 3008, with 256 tier-major frames.
- `sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-response-expanded-v4.png`
  is 3008 x 1692, with 132 tier-major frames.
- `sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-expanded-v4/manifest.json`
  pins sources, hashes, frame order, coverage, prompt summaries, exact response
  profile order, decoded memory, and rollback routes.

The V4 structural atlas stores four anchors rather than twelve full rasters for
each motif. That reduces its decoded cost from approximately 108.6 MB to
36.2 MB, a 66.7% structural saving. Structural plus exact-response atlases are
56,550,400 decoded bytes (approximately 53.9 MiB).

## Image generation provenance

Mode: OpenAI built-in image generation.

Sources:

- The sixteen V3 fracture motifs remain intact as the first family.
- `sources/2026-08-26-ground-damage-compression-chroma-v4.png` supplies sixteen
  compression and blunt-impact silhouettes. Two open-void cells were corrected
  by targeted edits; a failed checkerboard background was replaced with flat
  chroma green and alpha-cleaned deterministically by the bundled helper.
- `sources/2026-08-26-ground-damage-shear-alpha-v4.png` supplies sixteen true-
  alpha directional faults, twin splits, zig-zags, hooks, crescents, chevrons,
  lightning, and herringbone motifs.
- `sources/2026-08-26-ground-damage-brittle-alpha-v4.png` supplies sixteen true-
  alpha plate, lattice, mosaic, splinter, delamination, and branching-network
  motifs.

All prompts requested orthographic isolated surface breakage, neutral charcoal
fissures, pale readable rims, no tile replacement, no background, and no open
hole through the terrain.

## Exact tile and resource response

`TILE_DESTRUCTION_FX_CONFIG.familyByTile` remains the authority. Its 33 numeric
tile IDs are sorted once into `responseProfileTileTypes`; the builder and
runtime use that identical order. The profiles cover ordinary terrain, every
ore/resource, both town floors, Star/Sky tiles, all reward blocks, cave/geode
surfaces, chest/glow markers, second-world materials, and the Ancient Relic
Cache.

The response atlas reuses the approved destruction-shard material language but
authors a different placement/scale/rotation layout for every exact tile ID.
Runtime tint stays tied to the existing exact tile tint, keeping persistent
damage and the final mining break event visually continuous.

## Runtime and optimization

`values/worldVisualDamage.js` owns atlas geometry, selection, severity mapping,
presentation curves, blend/depth values, transform set, memory budget, and
rollback aliases. `WorldVisualDamageImagePainter` caches the selected atlas and
mix profile once, installs only the selected frame sets, and builds the 33-entry
profile lookup once. Per-draw resolution reuses those cached values, avoiding
repeated query parsing and linear profile searches.

Transforms are restricted to 0/90/180/270 degrees with an optional reflection.
This preserves the square 94 px tile footprint and prevents arbitrary-angle
corners from bleeding into adjacent solid cells. World coordinates seed motif
and transform selection, so damage remains stable across redraws and saves.

This feature reads tile type and normalized HP loss only. It does not change
HP, digging cadence, collision, rewards, destruction, world generation, save
schema, or save contents.

## Rollback

- Default: expanded V4.
- `?groundDamageAtlas=v3`: layered 16-motif V3 plus 17 material families.
- `?groundDamageAtlas=v2`: polished universal Piskel V2.
- `?groundDamageAtlas=legacy`: byte-intact ImageGen V1.
- `?groundDamage=legacy`: radial Graphics renderer.
- `?groundDamage=modular`: retained procedural modular renderer.

Only the selected structural and response atlases are preloaded.

## Verification

- V4 art contract: 256 unique cumulative structural frames, 132 unique exact-
  tile response frames, maximum final-motif IoU 0.925, minimum 3.95x severity
  coverage growth, transparent corners, zero visible chroma leak, and exact
  decoded budget.
- V4 runtime contract: 64 motifs, twelve states, four anchors, eight transforms,
  all 33 exact profiles, three pools, deterministic frames/transforms, exact
  94 px placement, preload isolation, hashes, dimensions, and fallbacks.
- V3, V2, V1, and scenic coexistence contracts all pass after V4 promotion.
- Three separately streamed 670 x 1132 WebGL passes exercised the real
  production painter over actual terrain, resource, Star, relic, and special-
  block art at 94 px. They are combined as
  `visual-approval-previews/ground-damage-expanded-v4/01-expanded-v4-exact-profiles.jpg`.
- `02-layered-v3-rollback.jpg` proves the explicit V3 route through the same
  painter in WebGL.
