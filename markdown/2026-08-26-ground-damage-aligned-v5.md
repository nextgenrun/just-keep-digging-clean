# Ground Damage Aligned V5

Date: 2026-08-26

Status: rejected on 2026-08-27; retained for local comparison only

Supersession: all resource-specific persistent damage responses are rejected.
Universal V2 is restored as the production default; V5 remains available only
as an explicit local comparison with `?groundDamageAtlas=v5`.

## Outcome

V5 introduced a fixed-registration library designed against the real
foreground texture atlases:

- 24 authored crack-only structural motifs;
- twelve genuinely cumulative raster states per motif;
- six material-response tiers for all 33 exact tile/resource profiles;
- eight coordinate-stable right-angle/mirror transforms;
- a fixed 94 px center, scale, and footprint at every damage state.

The structural library exposes `24 x 12 x 8 = 2,304` deterministic combinations
before exact material response is counted.

## Registration repair

V4 stored four raster anchors and interpolated the remaining logical states by
changing sprite scale from 0.70 to 1.0. That made the visible fracture footprint
move relative to the ground and foreground art as HP changed. Some source motifs
also read as opaque plates rather than embedded cracks.

V5 stores all twelve progression states. Every 188 x 188 frame is normalized to
the same `(94, 94)` center, constrained to a 160 px content box, and drawn at
scale `1.0` over the tile center. A 7 px native inset protects transformed
corners. Opacity may progress, but geometry never re-registers.

## Assets and budget

- `sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-fracture-aligned-v5.png`
  is 3008 x 3384 with 288 tier-major frames.
- `sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-response-aligned-v5.png`
  is 3008 x 2444 with 198 tier-major frames.
- `sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-aligned-v5/manifest.json`
  pins sources, prompts, reference assets, hashes, frame order, coverage,
  registration, exact profile order, decoded memory, and rollback routes.

The runtime pair decodes to 70,122,496 bytes, below the explicit 75,497,472-byte
budget.

## Image generation provenance

Mode: OpenAI built-in image generation.

Reference art:

- weathered-roots foreground textures V6;
- blue-caverns foreground textures V6;
- blackglass-abyss foreground textures V6;
- core-magma foreground textures V6.

Final prompt set:

- Ground: create crack-only damage decals matching the dark earthy and blue-
  mineral references, with fixed centered anchors, transparent gutters,
  charcoal fissure cores, narrow pale mineral lips, and no filled patches or
  badges.
- Alpha correction: remove only the generated checkerboard, replace it with
  genuine alpha, and preserve crack placement, scale, and linework.
- Crystal/deep-world: create twelve crack-only crystalline, obsidian, and magma
  decals in a 4 x 3 grid with fixed centered anchors and genuine transparency;
  exclude filled tiles, round badges, rubble piles, and opaque backing.

The deterministic builder neutralizes source RGB so runtime material tint and
the existing foreground art remain authoritative.

## Runtime

`values/worldVisualDamage.js` owns V5 selection, geometry, state mapping,
presentation, transforms, memory budget, and rollback aliases.
`WorldVisualDamageImagePainter` retains the pooled MULTIPLY body and SCREEN rim,
and V5 uses a restrained tint-filled rim so narrow authored fissures remain
readable over dense foreground textures. V4 and earlier routes retain their
existing tint behavior.

`TILE_DESTRUCTION_FX_CONFIG.responseProfileTileTypes` remains the exact profile
authority. V5 adds two intermediate response tiers, mapping the twelve damage
states to `[0,0,1,1,2,2,3,3,4,4,5,5]` without changing final destruction FX.

This feature reads tile identity and normalized HP loss only. It does not change
HP, mining cadence, collision, rewards, destruction, world generation, save
schema, or save contents.

## Retained comparison route

- Default: polished universal V2 with no resource response layer.
- `?groundDamageAtlas=v5`: rejected aligned V5 comparison.
- `?groundDamageAtlas=v4`: rejected expanded V4 comparison.
- `?groundDamageAtlas=v3`: rejected layered V3 comparison.
- `?groundDamageAtlas=legacy`: byte-intact ImageGen V1.
- `?groundDamage=legacy`: radial Graphics renderer.
- `?groundDamage=modular`: retained procedural renderer.

Only the selected fracture and response atlases are preloaded.

## Verification

- The art contract checks 288 unique fixed-registration fracture frames, 198
  unique response frames, cumulative severity growth, transparent source alpha,
  neutral crack RGB, safe insets, atlas dimensions, hashes, and decoded budget.
- The runtime contract checks V5 default/routing, exact centers and display
  sizes, twelve true raster tiers, six response tiers, deterministic selection,
  transforms, painter layering, preload isolation, hashes, harness inputs, and
  every retained rollback.
- The explicit V4, V3, V2, V1, and image-generation rollback contracts remain
  available; V4 and V3 were rerun directly after promotion.
- `visual-approval-previews/ground-damage-aligned-v5/01-aligned-v5-foreground-registration.png`
  records a WebGL pass over four unchanged production foreground families at
  exact 94 px gameplay scale.
