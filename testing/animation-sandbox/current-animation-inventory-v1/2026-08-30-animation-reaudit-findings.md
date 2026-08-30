# Full player-animation reaudit — 2026-08-30

Status: review-only evidence. No production animation, selector, collider, or timing value was changed by this audit.

## Coverage and integrity

- 212 animations in the active Survival/UAL default were measured at their runtime display size and origin.
- 50 currently registered player sheets were traced through the active loader and registry.
- All 54 sheets in the unified manifest and all 3,082 source frames passed file presence, SHA-256, atlas dimensions, nonblank-frame, and one-pixel crop-edge checks.
- All 114 configured action-recovery routes were inspected.
- The exact-frame browser viewer played ten priority clips successfully with no browser warnings.
- The focused contract sweep is 27/37 passing. The ten failures are stale count/path/origin/rollback expectations that predate the current promoted set; they are listed separately below and were not hidden or rewritten.

The silhouette score is an objective frame-occupancy difference from `0` (identical) toward `1` (very different). It is a review flag, not an automatic animation-quality verdict.

## Visual flags, ordered by priority

### P1 — Flight bypasses its transition clips

The active profile has `continuousFlightLoop: true`, so the selector bypasses the registered flight-enter, travel-enter, and flight-exit clips.

- Normal Flight loop wrap: `0.6566`.
- Airborne phase to Flight: `0.7941–0.8555`.
- Flight phase to falling: `0.8208–0.8672`.
- Held-torch Flight loop wrap: `0.6543`.
- Held-torch Flight phase to falling: `0.7575–0.8197`.

Verify by starting Flight, watching several full cycles, releasing Flight at different points in the cycle, and testing both facings.

### P1 — Held-torch locomotion is a separate, mismatched transition family

The standard non-torch walk start/stop is clean, but the held-torch sheets were not rebuilt to match it.

- Held idle phase to walk start: `0.3822–0.3883`.
- Held walk start to active gait: `0.5352`.
- Held gait phase to walk stop: median `0.5156`, maximum `0.6368`.
- Held walk stop to idle: `0.3838`.
- Held crouch exit to idle: `0.5656`.
- Held hard landing to idle: `0.6049`.
- Held landing movement cancel to gait: `0.6159`.

Verify with the torch on: tap movement, release movement at several stride phases, crouch/stand, and land both stationary and while holding movement.

### P1 — Ledge entry and exit are harsh even though the middle stages match

- Falling phase to catch: `0.6943–0.7067`.
- Catch to hang: `0.0000` (clean).
- Hang to climb: `0.0000` (clean).
- Climb completion to idle: `0.7197`.
- Drop from hang to falling: `0.6147`.

The save-safe game harness reached the real controller and logged both `Live hang staged` and `Pull-up queued`. Its generated cave lip rendered black at 48–49 m even after the torch was enabled, so that live-world visual capture is inconclusive rather than claimed as passed.

Verify by approaching a lip from both sides, grabbing at several fall phases, pulling up without movement, pulling up while holding movement, and dropping from the hang.

### P1 — Moving-combat clips recover into an incompatible two-frame settle

The worst configured action-to-settle handoff is `0.7185`; the highest group is dominated by moving-complex jab/cross variants entering old two-frame Piskel idle-settle clips. The full action pose and the smaller/darker settle silhouette visibly disagree.

Verify by releasing movement just before a moving complex strike completes. Repeat jab, cross, kick, and elbow variants in both facings.

### P2 — Normal crouch and landing exits still snap

- Crouch exit to idle: `0.4883`.
- Crouch exit to active gait: `0.5163`.
- Hard landing to idle: `0.4818`.
- Hard landing movement cancel to gait frame 13: `0.5437`.

The entering portions are not the problem: crouch-enter to hold is `0.0008`.

### P2 — The 3D torch disappears on animation families without bindings

Held-torch variants cover locomotion only. Combat, mining, death, and ledge keys fall back to their torchless base sprites while the legacy 2D torch renderer remains disabled. The held-idle to Quick Slash pose seam is `0.7210`, but the more important defect is the missing torch model itself.

Verify with the torch active while using Quick Slash, every mining direction, ledge assist, and death/restart flow.

### P2 — The registered death clip is not played

The death animation is registered and assigned to the deferred death pack. `HardcoreDeathBridge` instead stops the current animation and immediately resets the player to spawn before showing the death modal; it never plays or waits for the death clip.

Verify by triggering a hardcore death and checking whether any authored death motion appears before the modal.

### P3 — Registry and asset debt

- Four packed manifest sheets have no current registered animation: `survival-blender-v2-dig-up-polished-sheet`, `survival-ual-player-v1-animation-polish-run-sheet`, `survival-ual-player-v1-punch-jab-sheet`, and `survival-ual-player-v1-wall-push-sheet`.
- Three registered base Flight transitions are dormant under continuous Flight.
- One recovery mapping starts from the unregistered `survival-ual-player-v1-punch-jab-anim`.

## Confirmed clean areas

- Normal idle to walk start: `0.0027`.
- Normal walk start to active gait: `0.1238`; the exact authored handoff remains visually coherent on the board.
- All 12 phase-matched normal walk stops to idle: `0.0027–0.0036`.
- Crouch enter to hold: `0.0008` normal, `0.0000` held torch.
- Ledge catch to hang and hang to climb: `0.0000`.
- No blank frames, hash mismatches, atlas-size defects, or crop-edge alpha defects were found.

## Review files

1. [Animated priority proof reel](2026-08-30-animation-priority-transition-flags.gif)
2. [Actual core transition board](2026-08-30-animation-core-transition-board.png)
3. [Held-torch and ledge transition board](2026-08-30-animation-held-torch-and-ledge-transition-board.png)
4. [Action-recovery board](2026-08-30-animation-recovery-seam-candidates.png)
5. [Loop seam board](2026-08-30-animation-loop-seam-candidates.png)
6. [Scale and baseline board](2026-08-30-animation-scale-drift-candidates.png)
7. [Full animation metrics](2026-08-30-animation-audit-report.json)
8. [Reachable transition metrics](2026-08-30-animation-transition-report.json)

## Existing contract alarms to refresh separately

The focused sweep currently passes 27 and fails 10. Failures assert old expectations: Flight threshold `72` instead of the current `92`, a retired moving-side sheet path, sheet count `37` instead of `50`, review count `194` instead of `199`, registry count `174` instead of `212`, display size `122` instead of `101`, two retired origin values, a now-promoted Mixamo walk still labelled as a leak, and a rollback assertion that predates the 192 px walk-handoff frame-size map.
