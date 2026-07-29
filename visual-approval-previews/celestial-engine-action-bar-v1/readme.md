# Three-Engine Action Bar mockup v1

Review-only reconstruction of the WoW-style Celestial Engine action bar.
Repository search found the current single-Engine HUD but no persisted earlier
hotbar, draggable slot, or action-bar mockup to promote directly.

## Review goal

- Keep Wayward Star, Hollow Sun, and Comet Engine equipped and immediately
  accessible at the same time.
- Show three numbered ability slots above the approved XP frame.
- Support mouse drag/drop and slot swapping through an owned-Engine drawer.
- Support mouse click and `1`/`2`/`3` activation feedback.
- Use the exact existing Star Heart and Celestial Engine art.
- Preserve the approved navy, cyan, gold, condensed-display, and mono-label HUD
  language at the real 1280x720 gameplay scale.

## Proposed safety model

Three equipped Engines means three immediately available choices, not three
concurrent world effects:

- all three icons stay on the bar;
- one shared Star Heart charge pool pays for the selected activation;
- one Engine effect may exist at a time;
- the other two slots become linked/disabled while an effect is active;
- every existing lifetime, impact, bounce, redirect, travel, and protected-tile
  cap remains unchanged;
- an empty Heart requires sky-star recharge.

This keeps the choices convenient without allowing infinite Engine chaining.

## Interaction

- Open `index.html` for the ready state.
- Open `index.html?edit=1` for the loadout drawer.
- Select `EDIT`, then drag any owned Engine onto a numbered slot to swap.
- Click a slot or press `1`, `2`, or `3` to preview its shared-charge release.
- After the mock activation, select `REFILL` to restore review charge.

## Source art

- Gameplay/HUD reference:
  `../approved-player-hud-v1/approved-player-hud-v1.png`
- Approved HUD frame:
  `../../sprites/UI/hud-approved-v1/xp-frame.png`
- Star Heart and three Engine cores:
  `../../sprites/celestial-engines/`

## Review boards

- `2026-07-28-three-engine-action-bar-ready-v1.png` shows the compact
  three-slot bar in the normal gameplay state.
- `2026-07-28-three-engine-action-bar-edit-v1.png` shows the owned-Engine
  drawer, draggable sources, slot targets, and reset/done controls.

## Boundary

`reviewOnly: true`; `productionChanged: false`.

Nothing in this folder is imported, preloaded, registered, or referenced by the
game runtime. Approval is required before adding loadout persistence, input
actions, controller concurrency rules, runtime UI assets, or Phaser drag/drop.
