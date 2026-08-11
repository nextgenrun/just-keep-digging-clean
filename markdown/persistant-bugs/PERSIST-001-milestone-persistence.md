# PERSIST-001: Milestone persistence failures are silent

Severity: `P2`
Status: confirmed active conditional defect
Area: persistence and progression

## Evidence

- `systems/visual/MilestoneBoardSystem.js:230` catches the `localStorage.setItem` failure in `_saveMilestones` and does nothing.
- `_loadMilestones` catches both storage and JSON failures and assigns `this._reachedDepths = []`.
- The save key is slot-specific, with a legacy slot-1 fallback. A failed write therefore has no surfaced failure state, and a later load can appear to be a clean save with no completed milestones.

## Impact

When storage is unavailable, full, blocked, or corrupted, milestone progress can disappear or be shown as incomplete after reload. The player and support tooling receive no signal that persistence failed. The current browser smoke load did not exercise storage failure, so this is a code-path defect rather than a claim that every session currently loses data.

## Permanent solution setup

- Create one persistence adapter for slot reads and writes instead of direct `localStorage` calls in visual systems.
- Make writes return an explicit success or failure result and emit a structured diagnostic event on failure.
- Validate the stored schema before assigning progression state; reject malformed data without silently overwriting the in-memory state.
- Preserve the last known in-memory state when a load fails, and show a non-blocking save-health indicator or notification.
- Add fault-injection coverage for quota errors, disabled storage, malformed JSON, missing slot keys, and legacy slot migration.
- Add a recovery policy, such as exportable backup or the existing authoritative save path, before treating an empty list as valid.

