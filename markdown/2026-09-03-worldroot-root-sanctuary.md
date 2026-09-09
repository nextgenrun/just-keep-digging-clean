# Worldroot Root Sanctuary

## Scope

Normal play now uses a compact decorative tree around the existing Campfire.
The player walks on the real town floor. The tree contributes **zero** platforms
or collision shapes, so organic branch artwork no longer promises walkable
surfaces that the physics cannot match.

`WorldrootStateResolver` retains progression authority. This change does not
award or consume Stars, modify Crown requirements, buy talents, discover Titans,
or change the economy. Talent and Crown interactions are reachable from the
floor; individual Stars/foliage open the existing focused map, and the separate
Titan marker opens the existing Archive.

## Modular presentation

- One bare trunk/root arch, anchored to the Campfire's real ground position.
- Five separately placed living/killed foliage pairs, one per existing region.
  Known-Star counts grow foliage; consumption removes volume and exposes
  snapped blackened branches. A completely killed region has no living canopy.
- Each Star is an independent sprite. Discovered Stars request their existing
  identity atlas/frame; unknown signals remain anonymous. Consumed Stars become
  small dead scars in the same stable profile sockets.
- Crown, Talent, Titan, and Campfire objects remain separate from the painting.
- All ten original Campfire sprites, dimensions, origins, and ground anchors
  remain authoritative. Tier 8 is widest (238 px); tier 10 is tallest (133 px).

Placement, art keys, sockets, transitions, and darkness response are in
`values/worldrootSanctuary.js`. The three small Sanctuary classes own presentation
and teardown only. Explicit `?worldrootArt=v4`, `?worldrootArt=v3`, and whitebox
review remain available; the old diagrams are not drawn in normal play.

The real-Star and growing-detail follow-up is documented in
`2026-09-03-worldroot-sanctuary-growth-polish.md`, including the new real-input
RoboPlaytest route and its between-action screenshots.

## Input and asset loading corrections found during runtime QA

Campfire's frame-polled E input missed press/releases between rendered frames.
It now consumes the existing shared input buffer only while it owns the action.
Worldroot priority and out-of-range interactions keep their press; the opening
press cannot also activate a blessing. No input timings or locomotion changed.

A requested Campfire tier swap admits one original full-quality sprite through
the existing load coordinator without waiting behind unrelated texture-memory
pressure. It retains the previous form until ready, then releases the old group.
The existing upgrade transaction still waits before charging, rejects failed
loads without spending, and coalesces duplicate purchase requests. Global memory
limits and other optional groups are unchanged.

The local E2E harness now also sets the existing save-authority block. This
closes the previous gap where page-hide/visibility forced saves bypassed the
two stubbed scene save wrappers. This guard is local-query gated, never normal
play. The test Campfire was restored to tier 1 before activating the new guard.

## Art provenance

Built-in ImageGen authored the trunk and five living/killed foliage pairs,
matching the original Campfire's textured fantasy sprite style. No Stars or
Campfire were painted into these layers. The source plates and exact prompts
are in `sprites/environment/worldroot-sanctuary-v1/source/`; the record includes
the compact-camera refinement. The date-stamped builder only removes the flat
magenta carrier and extracts integer atlas cells. It does not redraw the art.
`manifest.json` records source/runtime hashes, real alpha, and zero chroma leak.

## Verification

Focused contracts cover region independence, identity loading/privacy, stable
Star/scar positions, all ten Campfire dimensions, map/Archive/Talent/Crown routes,
one-shot Crown emission, zero platforms, complete teardown, buffered Campfire
input, failed-load payment safety, and duplicate-purchase protection.

Run with the bundled Node executable:

```
node testing/2026-09-03-worldroot-sanctuary-contract.mjs
node testing/2026-09-03-campfire-buffered-interaction-contract.mjs
node testing/2026-08-20-player-jump-flight-motion-contract.mjs
node testing/2026-08-26-campfire-consumable-contract.mjs
node testing/2026-08-30-worldroot-interconnection-contract.mjs
node testing/2026-08-31-worldroot-modular-v4-runtime-contract.mjs
node testing/2026-08-31-worldroot-modular-v4-art-contract.mjs
node testing/2026-08-12-runtime-feature-residency-contract.mjs
node testing/2026-07-30-runtime-feature-asset-tiering-contract.mjs
```

The broader `2026-08-12-runtime-asset-catalog-contract.mjs` fails at line 199:
it still expects World Map to wait under pressure, while the existing World Map
configuration already bypasses that gate. This expectation is outside the
Sanctuary change; the focused Campfire contract separately verifies the actual
upgrade transaction. These checks do not establish whole-repository health.

Live QA uses the canonical `serve.py` checkout, not `dist`, at port 8081 with
`?jkd_e2e=1`. `]` cycles dormant/living/mixed/killed/Talent/Crown views; backslash
cycles actual Campfire tiers. Browser evidence is kept in this task's writable
visualizations folder, separate from game-loaded artwork.

Final runtime results: all ten tiers rendered their own original texture with
`loadReady: true`, bottom-centred at `(2021, 6111)` on ground `y=6110`.
The living tree reached 50 real identity sprites after loading. Mixed state
showed 40 living sprites and 10 scars; full consumption showed 0 living sprites
and 50 scars, with all five living foliage layers absent. Every state reported
zero platforms. E opened the real Campfire and Talent views, the separate
marker opened Titan Archive, and a Star click opened World Map. Crown E set the
existing one-shot endgame flag. No browser console errors were recorded.

Unedited JPEG screenshots and the console-derived JSON evidence are in
`C:/Users/Mila/.codex/visualizations/2026/09/02/01a062fe-89ec-7c72-a065-279cb039881d/`,
with `2026-09-03-worldroot-` names (`living`, `mixed`, `killed`, Campfire 8/10,
Talent/Archive/Map/Crown) and `2026-09-03-campfire-interaction.jpg`.

A final reload of ordinary `index.html` (without E2E flags) returned to the
actual low-progress save and original tier-one Campfire, with no preview
growth/scars active and no console errors. `2026-09-03-worldroot-normal-save.jpg` records
that final check. The normal-game browser is retained for local review.
