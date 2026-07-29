# UI Notification Carousel

Date: 2026-07-28  
Status: Production runtime

## Player-facing contract

Transient HUD messages use one shared card instead of stacking over each other.
The card defaults to the middle of the screen. The selected message remains
visible for seven seconds and then fades out. Hidden
queue entries do not age; selecting an entry with the clickable arrows or the
Left/Right arrow keys consumes the current message and gives the next unread
entry a fresh seven-second viewing window. The upper-right cross or the `X` key
clears the complete queue. The arrow art remains visible on single-entry cards
in a dimmed state so every transient card retains the same control language.

The card body is draggable with mouse or touch; the arrow and cross regions
remain dedicated controls and never start a drag. The chosen position is saved
as a normalized safe-screen position, survives card changes, resize, and
reload, and is clamped between the persistent top and bottom HUD lanes so the
card cannot be lost offscreen or parked over those bars. Temporary
collision-avoidance shifts, such as the earthquake signal, are applied on top
of the player's position and then removed without overwriting it. Pressing the
card pauses its timer and releasing it starts a fresh seven-second viewing
window.

The card shows its queue position only when more than one entry exists. Routine
duplicates within the shared dedupe window are ignored, the queue is bounded,
and a higher-severity warning may preempt a routine message without deleting
the interrupted entry. Input may interrupt any enter, switch, or expiry
animation: selection and rendered content change together, so the cross cannot
remove a hidden queue entry while an older card is still on screen.
The fixed notification keys are captured immediately while an active card is
visible, before gameplay actions can consume them. The visible arrow/cross art
is itself interactive and sits above its larger invisible hit area, avoiding
dead spots where those controls meet.

Only messages without a better persistent or world-space presentation enter
this lane. Critical danger/failure, actual hazard or Wurm damage, exceptional
action outcomes, player-requested inspection, and necessary progression
decisions remain eligible. Routine depth records and milestones, constellation
pickups, combo checkpoints, session goals, expedition/earthquake recaps,
material/cave/Titan discoveries, treasure and starter-cargo rewards, low-GP or
torch states, blocked-mining/Heavy-Punch guidance, and routine special-block
confirmations stay out. Their persistent bars, Journey entries, world reveals,
rewards, and cinematics remain authoritative.

Full menus and choice dialogs are not disposable notifications. Pause,
settings, world map, inventory, shop, campfire, level-up, depth gate,
Milestone/Star Pillar, Star Heart, game-dialog, and Hardcore modal states hide
and pause the carousel so their own controls retain input priority. Hidden modal
time does not consume any card's seven visible seconds. The curated centered
depth cinematic also hides the card for its complete presentation. Compact
caves use the same carousel.

## Floating-text reduction

`REDUCED` is the default floating-text policy. It hides routine damage and
resource numbers while retaining critical, special, status, and bonus feedback.
Current-version player selections for `FULL` or `OFF` remain respected.

## Ownership

- `values/uiNotificationCarousel.js` owns timing, queue cap, input, glyph, and
  fallback-presentation values.
- `ui/NotificationCarouselState.js` owns ordered queue state.
- `ui/UINotificationCarouselView.js` is the sole approved-art renderer.
- `ui/UINotificationDragController.js` owns mouse/touch dragging, safe viewport
  clamping, responsive position normalization, and settings persistence.
- `ui/UINotificationCarouselPresenter.js` owns selection timing and fades.
- `ui/UINotificationSystem.js` owns the public notification API, dedupe,
  severity preemption, input routing, and lifecycle.
- `systems/UserSettings.js` sanitizes the saved normalized card position.
- `world/playScene/PlaySceneUpdate.js` owns modal input priority.
- `values/retentionConfig.js` remains the floating-text policy authority.

## Verification

Run:

```powershell
node testing/2026-07-28-ui-notification-carousel-contract.mjs
node testing/2026-07-26-pause-settings-layout-contract.mjs
```

The first contract exercises bounded queue behavior, consumptive navigation,
complete-queue clearing during interrupted transitions, a fresh seven-second
timer per selection or drag, modal pause/resume, mouse/touch drag bounds,
normalized position persistence, a centered default, always-present control
art, the strict producer allowlist, HUD and compact-cave routing, and removal of
the duplicate browse/delete row.
The settings contract guards the new uncluttered default while preserving
deliberate player choices.
