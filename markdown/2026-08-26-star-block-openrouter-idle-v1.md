# 2026-08-26 Star Block OpenRouter Idle V1

## Outcome

Mineable Stars now have a more legible idle: their exact 250 identity cores
float and breathe subtly while one of three authored caustic loops travels
through the existing art. This is presentation-only. Star spawn rarity,
identity assignment, HP, rewards, Sign XP, release animation, light radius,
darkness persistence, beacon pulses, saves, and destruction remain unchanged.

## Generated source

Three four-second, 720p, silent `google/veo-3.1-lite` jobs were submitted through
OpenRouter with the same locked neutral Star frame at the first and last frame:

1. a restrained facet highlight sweep;
2. one core-light breath with circulating caustics;
3. sparse stardust orbiting inside the existing halo.

OpenRouter reported $0.12 per job and $0.36 total, below the isolated $0.75
hard cap. The generator validates live model capabilities, submits sequentially,
persists resumable job IDs before polling, redacts errors, and never writes the
API key.

## Runtime extraction

`ai-tools/2026-08-26-build-star-block-idle-v1.py` samples each source at 6 fps,
center-crops and aligns it, subtracts the temporal median, keeps only changing
light, converts that derivative to a neutral additive pass, seals cell edges,
and eases the final three frames back toward the first. The result is a 72-frame
1536x768 atlas with a 4.5 MiB decoded cost.

Because the generated body is removed, every live identity keeps its own
authored color, crystal silhouette, local phenomenon, and dedicated 192 px
light. No runtime tint or Phaser geometry is introduced.

## Runtime wiring

- `values/worldVisualSemanticAssets.js` owns the atlas, 166.6667 ms frame step,
  0.30 additive alpha, 1.08 overlay scale, 0.012-tile bob, 1.6% breath, and
  `?starIdle=0` rollback.
- `WorldVisualSemanticStarPresenter.js` selects `identity.index % 3`, offsets
  phase deterministically, and moves beauty/light/motion together.
- `WorldVisualSemanticAssetLayer.js` owns preload frame installation, pooling,
  emissive depth handoff, hiding, and destruction for the third Star image.
- Town-floor occlusion follows the existing emissive depth branch. The steady
  identity light and rare beacon pulse remain separate lighting authorities.

## Star Codex UI wiring

`UIStarIdleMotion.js` installs the same 72 authored frames in the active Phaser
scene and creates only three shared looping animation definitions. The twelve
visible Star selectors and the large dossier Star each receive one low-alpha
additive motion sprite over their exact identity core and dedicated light.
Identity index selects the loop and phase deterministically. Re-rendering a
selection destroys the old container children through the existing Inventory
lifecycle, while `?starIdle=0` omits the UI sprites and keeps the Codex static.

## Verification

- `testing/2026-08-26-star-block-idle-animation-contract.mjs` validates cost,
  key absence, atlas/config geometry, preload rollback, identity preservation,
  frame advance, bounded transform, additive routing, depth, and cleanup.
- `testing/2026-08-26-star-block-idle-art-contract.py` validates all 72 unique
  pixels, neutral channels, black borders, no persistent generated core, source
  hashes, and sub-1 mean loop seams.
- `testing/2026-08-26-star-block-idle-ui-contract.mjs` validates twelve selector
  loops, one dossier loop, three shared definitions, deterministic phase,
  authored-only additive presentation, identity preservation, and shared
  rollback.
- The live WebGL harness rendered twelve identities across all six rarities and
  three motion loops at 1280x720. Frame, position, and scale advanced with no
  browser warnings. `?starIdle=0` held the same sample at exactly 94 px and
  235 px while omitting the motion pass.
- The real 1280x720 Inventory > Star Codex route advanced both the selector-grid
  and dossier crops across a 700 ms sample. The adjacent static dossier text
  crop remained byte-identical. Keyboard selection from Glacier Blue to Cloud
  Cyan rebuilt the view and continued animating.

## Review and rollback

Open `testing/2026-08-26-star-block-idle-visual-harness.html` to watch the live
component. Append `?starIdle=0` for the exact legacy comparison. The animated
package preview is
`sprites/environment/star-block-idle-v1/star-block-idle-motion-preview-v1.gif`.
For the wired game UI, run the game with `?ui-review=1&starIdle=1`, load a save,
then open Inventory > Star Codex.
