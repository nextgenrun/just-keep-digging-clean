# Systems

systems directory.

## UI input priority

`UiInputPriorityRegistry.js` is the scene-scoped, nested lock shared by full UI
surfaces and gameplay pointer consumers. Modal shells hold one lock from show
through completed exit, and releases are idempotent so overlapping menus cannot
prematurely return the mouse to the world.

## Runtime health

`health/RuntimeCanarySystem.js` is the browser-runtime health coordinator. It
captures fatal errors and asset-loader failures, runs deterministic
canvas/scene/game-loop checks, and exposes the read-only
`window.__jkdHealth.snapshot()` admin surface. Reporting and pure checks stay in
separate modules so lifecycle wiring, persistence, and rules can be tested
independently.
