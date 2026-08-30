# Layered ground damage library V3

Status: rejected on 2026-08-27; retained for local comparison only

Decision: the material/resource response layer is rejected. Universal V2 is
restored as the production default, so V3 is not normally preloaded.

## Outcome

V3 introduced a deterministic three-layer mix instead of one universal scratch
overlay:

1. A dark structural fracture pass uses MULTIPLY so the terrain remains
   present inside the damaged tile.
2. A restrained warm fracture rim uses SCREEN to separate the break edge on
   dark soil, ore, crystal, and special-block art.
3. A tile-aware chip response uses NORMAL with the exact authored family and
   per-tile tint already owned by `values/tileDestructionFx.js`.

The structural atlas contains sixteen authored families with twelve
cumulative proportional-HP states: 192 unique 188 px RGBA frames. The response
atlas contains seventeen material families with four cumulative chip tiers: 68
unique 188 px RGBA frames. Runtime renders both at the invariant 94 px tile
size and keeps the structural variant stable for the lifetime of a coordinate.

Every destructible tile type has an explicit material family and tint. This
includes ordinary/damp/hard terrain, metals, precious resources, lava and
obsidian, Ember Ore, Magma Crystal, Star, geode interiors, Ancient Relic, and
special blocks. Material families may be shared where physical break behavior
is shared; the coordinate-stable structural silhouette and exact tile tint
still produce a dedicated composite for each tile/resource identity.

## Assets and provenance

- Production structural atlas:
  `sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-fracture-v3.png`
- Production response atlas:
  `sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-response-v3.png`
- Image-generation source package:
  `sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-layered-v3/`
- Deterministic builder:
  `ai-tools/2026-08-26-build-layered-ground-damage-v3.py`

The structural source was created with OpenAI built-in image generation. The
generation requested a clean 4x4 grid of sixteen materially neutral,
orthographic full-severity fracture decals with distinct radial, diagonal,
split, crushed, branching, crescent, zig-zag, and shear silhouettes, readable
at 94 px, with no tile square, hole, text, border, tool, or character. A second
built-in edit requested only replacement of the baked checkerboard with chroma
green while preserving the layout and fracture detail. The deterministic
builder performs alpha removal, crops the sixteen cells, derives the twelve
cumulative states, and reuses the approved destruction-shard source for the
seventeen response families.

## Runtime and rollback

`values/worldVisualDamage.js` owns atlas selection and mix tuning.
`WorldVisualFeedbackLayer` passes authoritative tile type into
`WorldVisualDamageImagePainter`; the painter only reads that identity and
cannot change gameplay state.

- Default: layered V3.
- `?groundDamageAtlas=v2`: polished universal Piskel V2 atlas.
- `?groundDamageAtlas=legacy`: byte-intact ImageGen V1 atlas.
- `?groundDamage=legacy`: former radial Graphics renderer.
- `?groundDamage=modular`: retained procedural modular renderer.

## Verification

```powershell
python ai-tools/2026-08-26-build-layered-ground-damage-v3.py
python testing/2026-08-26-layered-ground-damage-v3-art-contract.py
node testing/2026-08-26-layered-ground-damage-v3-contract.mjs
node testing/2026-07-30-ground-damage-piskel-production-contract.mjs
node testing/2026-08-26-layered-ground-damage-v3-live-visual.mjs
```

The browser proof renders the production painter over actual terrain,
resource, Star, relic, and special-block assets at 1410x940 and exact 94 px
tile scale. It also captures a synchronized V2 rollback matrix and fails on
page errors, failed requests, non-200 atlas responses, wrong pool sizes, wrong
revision, or wrong canvas/tile geometry.

No tile HP, mining cadence, collision, destruction payout, world generation,
or save schema changed.
