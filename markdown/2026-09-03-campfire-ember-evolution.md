# Campfire and Ember evolution — 2026-09-03

## Status

The size progression, both evolution presentations, economy rebalance and
tree-matched art promotion are implemented. Normal play now uses the ten
full-resolution Worldroot-v2 RGBA cutouts through versioned texture keys; the
painted RGB sources and original metal-brazier family remain preserved.

## Player-facing changes

- All ten current transparent Campfire forms use increasing, values-owned
  heights: about 42 px at tier 1 through 171 px at tier 10. Each step adds at
  least 12 px at the current 94 px tile size; aspect ratios and the shared
  bottom-centred town-ground anchor are retained.
- A successful purchase closes the ritual menu and plays a roughly 2.3-second
  old-form/new-form glow, growth and settle beat directly on the Campfire.
  Movement remains available. Reopening the menu cancels the effect cleanly.
- Ember discovery shows the actual ore icon entering the current Campfire
  sprite. The first find shows refill capacity increasing from 1 to 2 uses;
  repeat finds show a charge being stored, not a fictional further upgrade.
- The card is skippable after 650 ms with click, Space, Enter, E or Escape.
  Reduced motion uses a static final state and fade, without zoom or shake.
- Current-seed Ember finds remain at 711, 1129 and 1975 m in Level One. The
  Campfire hint now explicitly points to rare glowing seams in deep cave walls.

## Architecture and gameplay boundaries

`CampfireSystem` and its existing upgrade transaction still own price checks,
payment, tier changes, charge awards, refill capacity, blessings and saves.
Neither new presentation class owns progression or player input. The Ember
event host retains its existing temporary input lock and releases it on skip,
timeout or destruction. Save restoration never replays a Campfire upgrade.

`PlaySceneSetup` injects `CampfireEvolutionPresentation` and
`EmberDiscoveryEvolutionView`; each host destroys its own view. The former pins
the previous tier texture until its before/after animation is removed. Tuning
lives in `values/campfireEvolution.js`, `values/campfireConfig.js` and
`values/emberDiscoveryEvent.js`. The existing approved tooltip frame is reused
without the old notification frame's baked-in purple crystal.

Ore rarity/health, current blessings, charge economics and the ground-only
Worldroot collision model remain unchanged. Campfire upgrade prices now follow
the current finite shop economy: 0, 250, 750, 2,500, 8,000, 25,000, 75,000,
200,000, 500,000 and 1,250,000 gold.

## Active Worldroot-v2 artwork

`sprites/npc/campfire/worldroot-v2/sources/` holds ten independent native
1254 × 1254 built-in ImageGen outputs, from loose kindling and a stone ring to
root cradles, leaf-wrapped braziers and a tall treeheart crown. They reference
the living tree's bark/stone palette. No Stars, text or tree canopy are baked
into the hearth designs.

`sprites/npc/campfire/worldroot-v2/generation.json` contains the exact prompts,
reference sets, filenames, dimensions and SHA-256 hashes. All ten hashes were
verified. The outputs are RGB PNGs (colour type 2), including painted opaque
backgrounds despite transparent-background requests.

`sprites/npc/campfire/worldroot-v2/runtime/` contains separate deterministic
RGBA derivatives built by
`tools/2026-09-04-build-campfire-worldroot-v2-runtime.mjs`. The extractor
removes only border-connected and large enclosed neutral backdrop regions,
cleans their neutral fringe, preserves every 1254 × 1254 source canvas, and
writes source/output hashes plus measured alpha bounds to `manifest.json`.
`values/campfireConfig.js` selects this directory with
`campfire-worldroot-v2-tier-*` keys; the original family in
`sprites/npc/campfire/generated/` remains rollback-only.

## Verification

Eight focused contracts pass:

- `2026-09-03-campfire-evolution-contract.mjs`
- `2026-09-03-campfire-buffered-interaction-contract.mjs`
- `2026-08-26-campfire-consumable-contract.mjs`
- `2026-08-30-campfire-ember-discovery-guidance-contract.mjs`
- `2026-08-30-rare-ember-reward-buff-hover-contract.mjs`
- `2026-08-20-player-jump-flight-motion-contract.mjs` (15 input regression cases)
- `2026-09-03-star-consumption-held-input-contract.mjs`
- `2026-09-03-worldroot-sanctuary-contract.mjs`

A 2026-09-04 canonical `serve.py` browser pass opened the real Campfire menu
and confirmed `UPGRADE TO TIER 2 - 250 M`. A save-safe tier 1-10 sweep then
reported `loadReady: true` for every
`campfire-worldroot-v2-tier-01` through
`campfire-worldroot-v2-tier-10` texture, with no browser warnings or errors.

The canonical `serve.py` runtime at `http://127.0.0.1:8081/` was tested with the
isolated RoboPlay `worldroot` profile. Final run: **34/34 phases passed**.
The report remains WARNING, not an unqualified repository-wide green result:
decoded textures were estimated at 1484.1 MiB against a 704 MiB watermark, and
one Titan-background request was cancelled with `net::ERR_ABORTED`.

Evidence directory:
`C:/Users/Mila/.codex/visualizations/2026/09/02/01a062fe-89ec-7c72-a065-279cb039881d/2026-09-03-hearth-evolution-interactions-v4/`

It contains `report.json`, `summary.md`, every phase screenshot, nine
`campfire-XX-evolving.png` captures, and first/repeat Ember evolving/settled
captures. Campfire purchases use the real menu buttons and exact prices with
explicit test funding. Ember access tunnels, positioning and temporary real
Dragon Pickaxe/Strength/Quick Reflexes grants are accelerated fixtures; normal
`S + F` mines the genuine generated seams at their unchanged full health.
Original equipment is restored after each find. `E` dismissal and slot `6`
consumption are real input. The fresh bot save is isolated from user saves.

Earlier runs exposed a test-only region mismatch: Ember exploration reveals
Star `137,779`, which Worldroot projects into Cobalt. The old test's raw biome
lookup skipped it, so it incorrectly expected Cobalt to be dead. The test now
uses `resolveWorldrootSnapshot` assignments and waits for the actual fade.
Final evidence includes that Star's consumption, Cobalt alpha/target scale 0,
four other regions still alive, then all foliage/leaves gone after full death.
No tree gameplay or visual rule was changed to satisfy the test.
