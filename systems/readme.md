# Systems

systems directory.

## UI input priority

`UiInputPriorityRegistry.js` is the scene-scoped, nested lock shared by full UI
surfaces and gameplay pointer consumers. Modal shells hold one lock from show
through completed exit, and releases are idempotent so overlapping menus cannot
prematurely return the mouse to the world.

## User settings

`UserSettings.js` persists the ESC Settings contract. Missing legacy fields
sanitize to their current defaults. `display.showStarDiscoveryPopups` defaults
on, can be changed from `SETTINGS → GAMEPLAY`, and immediately closes an active
Star reveal when switched off without suppressing the mined Star release,
rewards, Sign XP, or progression callbacks.

## Runtime health

`health/RuntimeCanarySystem.js` is the browser-runtime health coordinator. It
captures fatal errors and asset-loader failures, runs deterministic
canvas/scene/game-loop checks, and exposes the read-only
`window.__jkdHealth.snapshot()` admin surface. Reporting and pure checks stay in
separate modules so lifecycle wiring, persistence, and rules can be tested
independently.
