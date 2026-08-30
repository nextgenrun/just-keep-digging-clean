# Dynamic Ground Damage Response V6

Date: 2026-08-26

Status: rejected on 2026-08-27; retained for local comparison only

Decision: all resource-specific persistent damage responses are rejected.
Universal V2 is restored as the production default; V6 is not part of the
normal preload or painter path.

## Outcome

Stone persistent-damage responses were regenerated and expanded tenfold:

- twenty authored dark-slate Stone fragments;
- ten deterministic cumulative layouts;
- six real response tiers per layout, producing 60 Stone response frames;
- eight safe transforms, producing 80 stable Stone response combinations;
- the aligned V5 twelve-state fracture geometry retained unchanged.

## Stone repair

V5 inherited Stone response pieces from the generic `hard` destruction family.
Those pieces have glossy white faces intended for a fast final-break burst. In
a persistent overlay, some late states read as floating silver chunks against
the darker Blue Caverns foreground.

V6 uses dark blue-charcoal slate fragments with restrained cobalt grain. The
Stone response has a profile-local SCREEN treatment so mineral edges remain
readable while dark faces do not cover the authored foreground texture. The
crack body, rim, center, scale, solid-world mask, and 94 px footprint remain
unchanged.

## Dynamic diversification

Stone's profile now selects one of ten response layouts from stable world
coordinates using an independent response salt. Layout selection does not
change across redraws or saves. The response uses the same coordinate-stable
right-angle/mirror transform as its fracture, yielding `10 x 8 = 80` Stone
combinations.

The response atlas uses profile-major variable blocks:

```text
frame = profileFrameOffset + tier * profileVariantCount + variant
```

Stone has ten variants; every other exact tile/resource profile has one.
`TILE_DESTRUCTION_FX_CONFIG.responseProfileTileTypes` remains the profile-order
authority.

## Assets and memory

- Fracture: aligned V5 atlas reused byte-for-byte, 288 frames.
- Response: `ground-damage-response-dynamic-v6.png`, 252 frames at 188 px,
  packed 18 x 14 into a 3384 x 2632 atlas.
- Stone: 60 new frames.
- Non-Stone: all 192 V5 frames preserved pixel-for-pixel.
- Decoded total: 76,343,040 bytes (72.8 MiB), below the 76 MiB budget.

## Image generation provenance

Mode: OpenAI built-in image generation.

The final generation prompt requested exactly twenty isolated Stone fragments
in a 5 x 4 sheet, matching the production Blue Caverns foreground: dark
blue-charcoal slate, angular flakes, subdued cobalt grain, restrained mineral
edges, and no bright white faces, ground patches, cracks, badges, or rubble
piles. A background-only edit replaced the generated checkerboard with genuine
alpha while preserving all fragments and their positions.

The source is stored under
`ground-damage-dynamic-response-v6/sources/`; the manifest pins its SHA-256,
the reference atlas, prompts, frame offsets, variant counts, coverage, and
decoded-memory contract.

## Retained comparison route

`values/worldVisualDamage.js` owns the dynamic profile layout, Stone variant
count, response salt, profile treatment, package budget, and query aliases.
`WorldVisualDamageImagePainter` resolves the response frame from variation
coordinates and applies profile-local presentation without changing gameplay.

- Default: polished universal V2 with no resource response layer.
- `?groundDamageAtlas=v6`: rejected dynamic-response V6 comparison.
- `?groundDamageAtlas=v5`: rejected aligned V5 comparison.
- `?groundDamageAtlas=v4`: rejected expanded V4 comparison.
- `?groundDamageAtlas=v3`: rejected layered V3 comparison.
- `?groundDamageAtlas=legacy`: ImageGen V1.
- `?groundDamage=legacy`: radial Graphics renderer.
- `?groundDamage=modular`: retained procedural renderer.

## Historical verification

- Art contract: 60 unique cumulative Stone frames, at least 7.73x coverage
  growth, maximum final-layout IoU 0.339, dark 99th-percentile RGB, genuine
  source alpha, 192 identical non-Stone frames, hashes, dimensions, and budget.
- Runtime contract: ten deterministic variants, all variants reached across
  coordinates, profile-major frame resolution, exact 94 px placement, profile-
  local blend/tint, preload isolation, and every rollback route.
- WebGL review: all ten response variants across six tiers over unchanged Blue
  Caverns production foreground frames, with a fixed fracture motif/transform
  and runtime signals for V6, WebGL, complete `0..9` coverage, and fixed size.
