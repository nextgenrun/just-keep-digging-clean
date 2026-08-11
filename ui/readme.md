# Ui

ui directory.

## Unified modal shell

UiModalShell.js is the required screen-space foundation for full menus and
dialogs. It owns responsive viewport fitting, backdrop and input isolation,
title and icon chrome, consistent spacing, and enter and exit presentation.
Every visible shell acquires shared UI mouse priority until its exit tween has
fully completed, so closing a shop or menu cannot leak the same click through
to world digging. Shop, Campfire, Milestones, Star Pillar, and
PlayScene overlays use this visual language.

## New expedition setup

`scenes/NewRunSetupOverlay.js` is the integrated empty-slot decision surface.
One authored bitmap panel presents Casual/Hardcore and Guided/Skip together;
live text and invisible pointer zones preserve accessibility and input accuracy.
Skip requires typed `YES`, while `ONELIFE` reveals the hidden one-life rule set
only from the selected Hardcore + Guided state. `NewRunSetupInputController.js`
owns keyboard focus, confirmation, cancellation, and hidden-sequence input.

## Transient notification carousel

`UINotificationSystem.js` retains the bounded single-card compatibility path,
but production `UI_NOTIFICATION_CAROUSEL_CONFIG.enabled` is `false`. The
constructor therefore creates no view, presenter, drag controller, key capture,
or accepted queue in normal play.

When explicitly enabled in an isolated compatibility/review context, it
composes `NotificationCarouselState.js`,
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

Routine entries require a 1.4-second gap and are capped at
three entries in seven seconds. Tutorial and priority-two-or-higher danger
entries can bypass that routine admission gate.

Production events do not bypass the disabled gate. Tutorial actions use a world
marker, captions/optional voice, and Next Promise; level and combo results use
their existing HUD; Stars use release art, Atlas, and Starlight progression.
Player-requested Titan and Memory Reliquary lore uses the existing Game Dialog
after Interact rather than reopening an automatic notification channel.

## Admin health panel

`admin/AdminHealthPanel.js` is an opt-in, DOM-only view of the runtime canary.
Open the game with `?adminHealth=1`; developers can also toggle it with
Ctrl+Shift+F12. It observes the health system and never mutates gameplay state.
