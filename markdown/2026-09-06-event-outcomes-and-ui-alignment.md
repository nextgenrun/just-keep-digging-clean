# Encounter outcomes and UI alignment — 2026-09-06

## Delivered

Completed encounters now describe measured results for four seconds. Shadowminer reports the blocks it actually mined. Wurm reports the completed parent's passes and smaller offspring, retained before the controller resets. Earthquake reports rocks and hits from that encounter alone, after falling rocks and aftermath settle. Cancellation produces no completion card; empty results never invent work or danger.

Event cards, seismic notices, edge warnings and the developer panel use explicit text slots and the existing fitting helper. Titles and details have consistent anchors. Long behavior labels and controller reasons fit their rows. Developer hit zones retain zero scroll factor, keeping clicks aligned when the world camera moves or zooms. F2 remains local developer only: production creates no launcher, key listener or usable manual request API.

The Star Codex page counter previously drew FOUND and PAGE over the same words already in the approved foundation. It now places only the two changing numeric values in the existing authored slots. Page navigation is unchanged.

The save-free encounter lab now has **Pause on encounter result**. It freezes the real card as soon as an encounter completes, including at accelerated simulation speed. Resume continues the same run; Reset clears it. This also supports inspecting each result during the six-encounter sequence.

## Fresh runtime evidence

All captures and DOM-backed measurements are in [the proof folder](../testing/dynamic-event-sandbox/2026-09-06-ui-proof/readme.md).

- Broodmother: four completed passes and two smaller Wurms; healthy completion.
- Shadowminer in a fresh chamber: one actual block mined. A prior cleared-terrain run correctly reported no terrain change.
- Two earthquakes: five rocks and zero hits each, with ten rocks in the cumulative controller total. The second card does not reuse the first encounter's counters.
- The encounter lab reported no runtime/asset errors and zero persistent save reads/writes. At the default 1280 × 720 browser viewport, measured HTML controls/cards/panels had no horizontal overflow.
- In the real game review, the F2 panel accepted a pointer request, displayed queue/block reasons, fitted Broodmother, and hid under Pause.
- Large money `987,654,321,012` and stars `999,999,999` each fit their 72-pixel slots. Level 999 and the large XP counter also fit.
- Pause, Settings, Campfire, Merchant, World Map and the collected Star Codex were visually checked. The corrected Codex counter shows `14 / 60` and `1 / 2`; clicking the next arrow changes the page to `2 / 2`.
- The current Talent requirement fits inside its tooltip after loading the latest shared geometry. This pass did not rewrite the Talent layout.

Review entry points, served through the checkout's canonical `serve.py`:
- `/testing/dynamic-event-sandbox/index.html`
- `/testing/2026-09-06-baked-copy/game.html?jkd_e2e=1&gameplayProfile=full-review&cinematics=0&systemPacing=0`

These are focused desktop UI and simulated-encounter checks. They do not claim exhaustive coverage of every screen state, viewport, natural encounter cadence or balance. The full-game fixture reported save writes blocked. An initial startup attempt encountered temporarily missing shared HUD entries; a reload with the current entries completed setup and the reviewed UI diagnostics were clear.

## Verification

Passed:
- `node testing/2026-09-05-dynamic-event-polish-suite.mjs` — 14/14, including repeated encounter outcomes, production F2 exclusion, existing event gates, hazards and UI controls.
- `node testing/2026-08-20-player-jump-flight-motion-contract.mjs` — 33 traversal/input cases.
- `node testing/2026-09-06-baked-copy/asset-contract.mjs` — 136 authored labels, 25 assets, source bounds/fitting.
- `node testing/2026-09-05-most-seen-wiring-contract.mjs` — target HP and merchant presentation.
- `node testing/2026-09-06-baked-copy/celestial-rendering-contract.mjs` — inventory pagination, native rendering, motion and cleanup.
- `node testing/2026-08-30-star-codex-discovery-state-contract.mjs` — collection/discovery behavior.
- All 13 scoped JavaScript syntax checks and the scoped whitespace check passed.

Two older broad UI contracts retain assertions for replaced artwork: `2026-08-31-ui-alignment-pass-contract.mjs` expects a separate level-up icon, and `2026-08-14-active-ui-alignment-contract.mjs` expects the old NextPromise frame/aspect. Their failure is recorded separately from the current artwork contract and live layout checks.

## Bigger improvement recommendation — design only

Make each descent a coherent expedition with a visible objective, a route choice and a payoff. A safe route could preserve the player's return options; a richer unstable seam could offer a worthwhile reason to accept an encounter. Existing upgrades should then produce an obvious advantage on the next descent.

The most contained first implementation is an encounter director over the existing controllers: quiet mining, readable buildup, one admitted major threat, then recovery. It should consider valid terrain and reaction room, retain all progression gates, avoid accidental threat stacking, and explain postponed encounters in the existing dev panel. This changes encounter pacing without replacing physics, terrain authority or rewards.

Branching objectives and rewards would follow as explicit feature work. No director, new rewards, fourth event or progression/balance changes were added in this alignment pass. Nothing was deployed.
