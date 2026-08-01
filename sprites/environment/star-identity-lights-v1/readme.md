# Star Identity Lights V1

Dedicated light-only artwork for all 250 named Star identities.

The existing `star-identities-v2` package remains the crisp crystal and local
phenomenon layer. This package is the separate authored illumination layer used
behind it in the world, hard darkness, mined release, discovery popup, and
I-key Star Atlas.

## Runtime package

- Six transparent PNG atlases in Common, Uncommon, Rare, Epic, Mythic, and
  Astral order.
- Every atlas uses 192 px square frames in ten columns.
- Frame names and rarity-local frame indices match `star-identities-v2`
  exactly.
- All 250 frames are baked ImageGen art. Phaser may position, scale,
  alpha-fade, rotate, and additively composite them; it must not tint a generic
  light or draw replacement geometry.
- The decoded package is capped below the decoded cost of the six original
  1254 px steady-light textures.
- `star-identity-lights-v1.manifest.json` records source/output SHA-256,
  per-frame RGBA hashes, alpha coverage, edge alpha, layout, and decoded bytes.

## Build

Run:

```powershell
& <bundled-python> tools/2026-07-30-build-star-identity-light-assets-v1.py
```

The builder reads the ten immutable ImageGen contact sheets under `source/`,
extracts their black-backed additive light to straight alpha, and maps the
global 250-entry order onto the exact rarity-local core frames.

## Fallback and rollback

The six original `star-block-steady-light-v1` textures remain the safe
rarity-level fallback. A narrow rollback removes the light-atlas metadata and
restores `SkySteadyLightRenderer` plus UI views to their prior core-frame path;
the existing crystal package is never overwritten.
