# Systems

systems directory.

## Demo ending

`demo/UnderstarEndingSystem.js` owns the demo-only 2,000 m finale. It defers
the authored Understar backdrop until the final descent, arbitrates the normal
Interact action, persists discovery/completion, and injects its UI surface
through the PlayScene composition port.

## UI input priority

`UiInputPriorityRegistry.js` is the scene-scoped, nested lock shared by full UI
surfaces and gameplay pointer consumers. Modal shells hold one lock from show
through completed exit, and releases are idempotent so overlapping menus cannot
prematurely return the mouse to the world.
`world/playScene/UiLayerOwnership.js` is the ordered keyboard/Escape authority
for PlayScene surfaces. It reports the complete active stack, closes exactly one
top layer, includes the random-event modal, and publishes `__jkdUiLayers` only
in debug builds. Gameplay and combo sampling consume this same authority.

## User settings

`UserSettings.js` persists the ESC Settings contract. Missing legacy fields
sanitize to their current defaults. The retired
`display.showStarDiscoveryPopups` field is no longer read or written; old
saves containing it remain valid and the unknown value is ignored. Star
release, rewards, Sign XP, Atlas, and progression callbacks remain live.

## Runtime health

`health/RuntimeCanarySystem.js` is the browser-runtime health coordinator. It
captures fatal errors and asset-loader failures, runs deterministic
canvas/scene/game-loop checks, and exposes the read-only
`window.__jkdHealth.snapshot()` admin surface. Reporting and pure checks stay in
separate modules so lifecycle wiring, persistence, and rules can be tested
independently.

## Scene runtime authority

`runtime/SceneModeController.js` owns the base scene phase plus nestable pause,
dialog, shop, depth-warning, and Hardcore-modal suspension tokens.
`runtime/SceneLifecycleRegistry.js` adopts listeners, timers, abortable jobs,
and scene systems for idempotent reverse-order teardown.
`runtime/FramePhaseScheduler.js` preserves phase order and applies the
presentation-quarantine versus authority-safe-pause fault policy.
