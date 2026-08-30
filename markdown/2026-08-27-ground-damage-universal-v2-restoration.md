# Universal Ground Damage V2 Restoration

Date: 2026-08-27

Status: production-wired locally

## Decision

The resource- and material-specific persistent damage direction in V3 through
V6 is rejected. Normal gameplay is restored to the polished universal V2
damage states.

The rejected atlases remain on disk as review history, but normal startup does
not preload them and the production painter does not create their rim or
resource-response layers.

## Active presentation

- `ground-damage-piskel-anchor-v2.png` is the default atlas.
- Ten coordinate-stable universal motifs each have twelve cumulative HP-loss
  states, producing 120 frames.
- Stone, dirt, ores, crystals, relics, and special blocks use the same frame for
  the same world coordinate and damage amount.
- Tile/resource type does not select a family, tint, response frame, or blend.
- One masked sprite remains centered and displayed at exactly 94 x 94 px.
- Default decoded memory is 16,965,120 bytes, below the 17 MiB budget.

`WorldModel` remains authoritative for HP, tile type, digging, collision,
rewards, world generation, and saves. This restoration is presentation-only.

## Runtime selection

`values/worldVisualDamage.js` now resolves an empty or unknown
`groundDamageAtlas` value to `polished-v2`. Consequently,
`getWorldVisualDamagePreloadAssets()` returns only the V2 atlas and
`resolveWorldVisualDamageMixProfile()` returns `null` during normal gameplay.

The V3-V6 files and explicit query aliases are retained only for local review
and audit. They are not the accepted production direction.

## Verification

- The production contract proves a one-atlas preload and a null response mix.
- Repainting the same coordinate and damage amount with Stone and Gold tile
  types resolves the same texture frame and creates no response pool.
- All twelve V2 states retain their ten stable universal variants.
- Placement remains centered at the exact 94 px gameplay footprint and clipped
  by the existing solid-world mask.
- Explicit V3-V6 comparison contracts remain isolated and continue to pass.

