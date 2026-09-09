# Event and UI browser proof — 2026-09-06

These are fresh local browser captures from the canonical checkout server. The encounter lab uses an isolated in-memory chamber; the full game review uses `?jkd_e2e=1` and reported save writes blocked.

- `event-outcomes-browser-proof.json`: DOM-exposed production controller snapshots and UI diagnostics.
- `shadow-result.png`, `wurm-result.png`, `earthquake-result.png`: actual paused completion cards.
- `dev-panel-broodmother.png`: longest behavior label, controller reasons and buttons. `dev-panel-hud.png` is the full native Phaser image with large HUD values.
- `pause-menu.png`, `settings.png`, `campfire.png`, `merchant.png`, `world-map.png`: reviewed desktop surfaces.
- `star-codex-before.png`: overlapping page label before the correction.
- `star-codex-aligned.png`, `star-codex-page-two.png`: corrected separate numeric slots and real page navigation.
- `talents-before-reload.png`, `talents-after-reload.png`: Talent requirement with the prior cached geometry and the latest shared layout.

The gray toolbar is review-only DOM. It is not part of production UI and can cover the top strip in viewport screenshots. Screenshots are 1280 × 720 unless the filename identifies native canvas output.

Scope, checks and limits: [alignment report](../../../markdown/2026-09-06-event-outcomes-and-ui-alignment.md).
