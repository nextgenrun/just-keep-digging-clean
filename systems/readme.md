# Systems

systems directory.

## Runtime health

`health/RuntimeCanarySystem.js` is the browser-runtime health coordinator. It
captures fatal errors and asset-loader failures, runs deterministic
canvas/scene/game-loop checks, and exposes the read-only
`window.__jkdHealth.snapshot()` admin surface. Reporting and pure checks stay in
separate modules so lifecycle wiring, persistence, and rules can be tested
independently.
