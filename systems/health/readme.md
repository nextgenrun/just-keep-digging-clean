# Runtime Health

This directory owns non-visual runtime canary logic.

- `RuntimeCanarySystem.js` records browser failures, Phaser lifecycle events,
  asset-load failures, frozen frames, stalled loading scenes, and missing
  PlayScene/CaveScene collaborators.
- `runtimeCanaryChecks.js` contains the deterministic runtime invariant checks.
- `RuntimeCanaryReporter.js` persists the latest critical report locally and
  optionally posts reports when `globalThis.__JKD_CANARY_REPORT_ENDPOINT__` is
  configured by the hosting environment.
- `RuntimeHealthWorkerBridge.js` starts a Blob-backed Web Worker from
  `RuntimeHealthWorkerSource.js`. It receives main-thread heartbeats, pauses
  while the page is hidden, and reports a frozen game thread through both the
  canary and the optional endpoint.
- PlayScene checks also validate Star Heart charge, permanent-choice accounting,
  one-active-Engine state, activation caps, and bounded reward transaction
  memory.

The system never mutates gameplay state. Admin presentation belongs in
`ui/admin/`, and all thresholds, labels, event codes, and styles live in
`values/runtimeCanaryConfig.js`.
