# Runtime Health

This directory owns non-visual runtime canary logic.

- `RuntimeCanarySystem.js` records browser failures, Phaser lifecycle events,
  asset-load failures, frozen frames, stalled loading scenes, and missing
  PlayScene/CaveScene collaborators.
- `PerformanceTelemetrySystem.js` records rolling Phaser frame, update, render,
  named hot-path, and browser Long Tasks API timings without changing game
  state. Its snapshot includes the runtime asset queue, active owner/backend,
  decode and GPU-activation p95 timings, and is published at
  `window.__jkdPerformance` and included in canary reports.
- `performanceTelemetryBridge.js` is the narrow timing bridge used by
  PlayScene and world renderers. Its weakly held cadence state samples named
  phases once every thirty frames, so unsampled frames avoid clock reads; it
  reports spans without owning health policy.
- `runtimeCanaryChecks.js` contains the deterministic runtime invariant checks.
- `RuntimeCanaryReporter.js` persists the latest critical report locally and
  optionally posts reports when `globalThis.__JKD_CANARY_REPORT_ENDPOINT__` is
  configured by the hosting environment.
- `RuntimeHealthWorkerBridge.js` starts a Blob-backed Web Worker from
  `RuntimeHealthWorkerSource.js`. It receives main-thread heartbeats, pauses
  while the page is hidden, and reports a frozen game thread through both the
  canary and the optional endpoint.
- PlayScene checks also validate Star Heart charge, three-Heart ownership
  accounting, one-equipped/one-active-Engine state, activation caps, and bounded
  reward transaction memory.
- The `starlight-talent-tree-invariant` requires ten constellation nodes, all
  sign textures, three Engine textures/options, three page/navigation states,
  exactly one visible active page, a valid shared view factory, bounded reveal
  state, and a healthy active view. Failures enter the same
  runtime-canary report and optional endpoint used by the health worker.
- Heavenblocks checks require the progression, access, and crafting
  collaborators and validate protected platform collision, interaction-prompt
  readiness, and serializable progression state.
- Arc Core checks fail closed when the approved ten-role Piskel pack is
  incomplete, loses its zero-drift center anchor, or any production texture is
  absent. The legacy rollback path is checked separately when
  `?arcCoreVisualsV3=0` is active.
- PlayScene readiness also requires `openingFlightArtifactSystem`, so the admin
  health panel fails closed if the first-run flight facade is missing.

The system never mutates gameplay state. Admin presentation belongs in
`ui/admin/`, and all thresholds, labels, event codes, and styles live in
`values/runtimeCanaryConfig.js` or `values/performanceTelemetryConfig.js`.

- The `star-rarity-progression-invariant` validates tier weights, the exact
  spawn reduction, five-level curves, stored XP bounds, all twelve popup
  textures once their deferred group is resident, and the one-popup cap.
  Failures use the existing canary reporter and worker alert route.
- The `depth-resource-economy-invariant` validates curve/cap configuration,
  Level Two boundary availability, and Milestone-provider wiring. It is
  disabled only by the explicit legacy economy switch.
- Every sampled error finding is forwarded to the health worker. The worker
  deduplicates active keys and independently posts newly broken invariants to
  the optional alert endpoint; main-thread freeze detection remains separate.
