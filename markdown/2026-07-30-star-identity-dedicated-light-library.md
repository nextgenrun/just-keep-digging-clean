# Star Identity Dedicated Light Library

## Outcome

All 250 Star identities now own two separate authored assets:

1. the existing 256 px crystal/phenomenon frame for the crisp visible Star;
2. a new matched 192 px light-only frame for illumination and atmosphere.

The prior runtime enlarged the crystal frame and reused it as the hard-darkness
aura. That made the Star readable, but it did not reproduce the soft authored
light treatment of the original Star Blocks. The new split keeps edges and
crystal detail crisp while a broader feathered light stains the world behind
it.

## ImageGen package

Ten built-in OpenAI ImageGen contact sheets provide 250 row-major light-only
sources. Each cell has its identity's exact primary hue and named light
phenomenon on pure black, with no physical star, UI, label, or terrain.

`tools/2026-07-30-build-star-identity-light-assets-v1.py`:

- crops the ten 5x5 sheets;
- converts black-backed additive light to straight alpha;
- applies an offline edge feather so no cell can show a black box or seam;
- maps the global identity order to the matching rarity-local core frame;
- assembles six ten-column PNG atlases;
- writes source/output hashes, per-frame hashes, alpha coverage, edge alpha,
  and decoded-memory totals to the manifest.

All 250 RGBA frame hashes are unique. Maximum measured edge alpha is three, so
the effect is transparent before its atlas boundary.

## Bounded memory

The light package uses 250 192x192 frames and decodes to 36,864,000 bytes
(35.16 MiB). The six original 1254x1254 rarity lights decode to 37,740,384
bytes (35.99 MiB), so the per-identity library stays below the original
steady-light decoded budget.

The existing 62.5 MiB crystal package remains unchanged. Both packages are
preloaded through the same 13-entry Star identity list: six core atlases, six
light atlases, and the Star Atlas foundation.

## Runtime layering

- `SkySteadyLightRenderer` uses only `lightAtlasKey` and `lightFrameName` for
  hard-darkness atmosphere. The six original high-resolution lights remain
  rarity-level fallbacks.
- `WorldVisualSemanticAssetLayer` renders the crisp identity frame as beauty
  art and a larger, lower-alpha light frame as the emissive pass.
- `SkyStarReleaseView` keeps the core and its six core echoes, while one
  matched light follows the same bounded rise and fade path behind them.
- `StarDiscoveryPopupView` layers the matched light below the identity core.
- The I-key Star Atlas pairs light and core frames in every selector and the
  large dossier preview.

Phaser positions, scales, rotates, alpha-fades, and additively composes these
authored pixels. It does not tint a generic light, draw replacement geometry,
or create an infinite tween.

## Health checks

The identity validator now rejects missing light atlases, mismatched frame
names, duplicate core/light keys, or decoded light art above the original
budget. Focused contracts also verify:

- all source and output hashes;
- 250 unique frame hashes and transparent cell edges;
- exact core/light separation in the steady renderer;
- dynamic semantic beauty/emissive composition;
- exact-frame mined-release motion and cleanup;
- paired Star Atlas selectors and preview;
- legacy six-rarity fallback behavior;
- runtime asset-tiering behavior.

## Rollback

No core Star art or original steady-light texture was overwritten. A narrow
rollback removes `lightAtlases` plus the per-identity light metadata from
`values/starIdentityLibrary.js`, restores the previous core-frame emissive
route in the renderer/views, and leaves `star-identity-lights-v1` dormant.
