# Runtime Health

This directory owns non-visual runtime canary logic.

- `RuntimeCanarySystem.js` records browser failures, Phaser lifecycle events,
  asset-load failures, frozen frames, stalled loading scenes, and missing
  PlayScene/CaveScene collaborators.
- `runtimeCanaryChecks.js` contains the deterministic runtime invariant checks.
- `RuntimeCanaryReporter.js` persists the latest critical report locally and
  optionally posts reports when `globalThis.__JKD_CANARY_REPORT_ENDPOINT__` is
  configured by the hosting environment.
- Heavenblocks checks require the progression, access, crafting, relic locator,
  native artifact visuals, entry-shaft beacons, and component objective
  collaborators. They validate protected landing collision, interaction/HUD
  readiness, guaranteed relic targets, and serializable progression state.

The system never mutates gameplay state. Admin presentation belongs in
`ui/admin/`, and all thresholds, labels, event codes, and styles live in
`values/runtimeCanaryConfig.js`.
