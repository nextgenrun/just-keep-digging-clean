# Ui

ui directory.

## Unified modal shell

UiModalShell.js is the required screen-space foundation for full menus and
dialogs. It owns responsive viewport fitting, backdrop and input isolation,
title and icon chrome, consistent spacing, and enter and exit presentation.
Every visible shell acquires shared UI mouse priority until its exit tween has
fully completed, so closing a shop or menu cannot leak the same click through
to world digging. Shop, Level Up, Campfire, Milestones, Star Pillar, and
PlayScene overlays use this visual language.

## Transient notification carousel

`UINotificationSystem.js` is the single public path for transient HUD messages.
It composes `NotificationCarouselState.js`,
`UINotificationCarouselPresenter.js`, and `UINotificationCarouselView.js` so
only one approved-art card is visible. Clickable or keyboard Left/Right arrows
consume the visible entry and advance to the adjacent unread entry; consumed
entries never reappear. The upper-right cross or `X` clears the complete unread
queue. Arrow art stays present but dimmed when only one entry exists. Selection
changes render synchronously and input can interrupt transitions, so the cross
always clears what the player has not read yet. The card defaults to the center
of the screen and each selection receives seven visible seconds, while full
menus, choice dialogs, and the centered depth cinematic pause and hide the carousel without
consuming that viewing time. While a card is active, the fixed Left/Right/`X`
keys are captured before gameplay. Approved raster controls from
`sprites/UI/notification-controls-v1/` and their larger invisible hit zones
accept pointer input. `UINotificationDragController.js` makes the
remaining card body mouse/touch draggable without stealing arrow or cross
clicks. It saves a normalized player position across cards, resize, and reload,
clamps the card to the HUD-safe viewport, preserves temporary avoidance
offsets, and grants a fresh seven-second viewing window after release. The
queue is bounded to six entries and evicts the least-important hidden card
first.

When enabled, routine entries also require a 1.4-second gap and are capped at
three entries in seven seconds. Tutorial and priority-two-or-higher danger
entries can bypass that routine admission gate.

Routine confirmations do not enter this queue when a persistent HUD element or
the action itself already proves the result. This includes audio toggles,
ordinary save success, run/load confirmations, routine level changes, timed
buff activation/expiry, torch and low-GP states, blocked-mining guidance,
Heavy Punch requirements, depth records/milestones, combo checkpoints,
constellation pickups, routine material/cave/Titan discoveries, session goals,
expedition/earthquake recaps, tutorial starter cargo, treasure rewards, and
repeated teleport arrivals. Persistent bars, the Journey, world reveals, and
milestone cinematics remain authoritative. The queue is reserved for critical
danger or failure, actual hazard/Wurm damage, exceptional action outcomes,
player-requested inspection, and progression decisions that have no persistent
equivalent.

## Admin health panel

`admin/AdminHealthPanel.js` is an opt-in, DOM-only view of the runtime canary.
Open the game with `?adminHealth=1`; developers can also toggle it with
Ctrl+Shift+F12. It observes the health system and never mutates gameplay state.
