# Feedback master plan implementation ledger — 2026-08-21

## Authority and rollback boundary

- Baseline commit: `db3a318cabc8c00a22beb86903a5d209d6b2192c`
- Baseline tag: `safety/2026-08-20-pre-feedback-master-plan`
- Baseline branch: `codex/recover-demo-from-b430d63`
- Implementation branch: `codex/feedback-master-plan-implementation`
- Remote ancestry proof at start: local and origin baseline were equal with `0 0` ahead/behind.
- Published baseline proof: all LFS objects uploaded; the remote branch and annotated tag were present before implementation began.

The implementation scope is the 140 total obligations in the raw and analysis coverage registers. This ledger is not acceptance evidence by itself; each row closes only through the validation packet defined in the validation and playtest gates.

## Rollback function

Tool: `tools/version-control/2026-08-21-rollback-feedback-master-plan.ps1`

Preview the exact rollback without mutation:

```powershell
powershell -ExecutionPolicy Bypass -File tools/version-control/2026-08-21-rollback-feedback-master-plan.ps1
```

Apply only after reviewing the preview and recording the full target SHA:

```powershell
$target = git rev-parse HEAD
powershell -ExecutionPolicy Bypass -File tools/version-control/2026-08-21-rollback-feedback-master-plan.ps1 -TargetRef HEAD -ExpectedTargetCommit $target -Apply
```

The apply route refuses dirty worktrees, moved targets, non-descendant history, merge commits, `main`/`master`, and unexpected branch names. It creates a new rollback branch, reverts every implementation commit newest-first, and verifies the staged and committed trees exactly equal the baseline tree. It never resets, deletes source work, pushes, or force-pushes.

## Slice ledger

| Slice | Coverage | Status | Commit | Evidence | Rollback |
|---|---|---|---|---|---|
| R0 rollback foundation | Objective-wide | Complete | `240e0f2` | `FEEDBACK_MASTER_PLAN_ROLLBACK_CONTRACT_OK`; disposable two-commit apply proof restored the exact clean baseline tree | Full-range rollback tool |
| P0 death transaction | A17-27, A20-01, A20-03 | Implemented; runtime proof pending | `d637689` | `HARDCORE_DEATH_TRANSACTION_CONTRACT_OK`; legacy Hardcore and save contracts pass | Slice revert plus full-range tool |
| P0 UI ownership/menu | A17-05, A17-06, A17-23, BY-02, BY-10 | Implemented; runtime proof pending | `c643fbf` | `UI_LAYER_OWNERSHIP_CONTRACT_OK`; Escape, combo, menu-return, Save Vault, action-bar, and random-event contracts pass | Slice revert plus full-range tool |
| P0 hazard truth | A17-12, A20-12, J06-04 | Implemented; natural/runtime proof pending | `bb11eab` | `HAZARD_ADMISSION_CONTRACT_OK`; exact Earthquake/Wurm gates, deterministic force routes, muted Q-shield caption, and legacy hazard/shield contracts pass | Runtime flags plus slice revert |
| P1 first expedition | FR-03–FR-07, FN-01–FN-17, XP-01–XP-04 | Route/safety implemented; runtime and economy proof pending | `de893cd` | `FIRST_SESSION_ROUTE_CONTRACT_OK`; penalty-free local recovery, explicit abandonment loss, semantic blockers, saved funnel/assist telemetry, first-upgrade preview, and legacy onboarding contracts pass | Onboarding value rollback plus slice revert |
| P1 contact-aware digging | J06-02–J06-03, J06-14–J06-16, A17-04, A17-10, A20-05–A20-09 | Implemented; runtime/video proof pending | `dc9a6ed` | `ANIMATION_TILE_CLEARANCE_CONTRACT_OK`; authored per-clip clearance metadata, canonical tight-space fallback, legacy SIDE bridge, two distinct UP clips, moving/rooted preservation, and shared main/cave routing | `?animationClearance=0` plus slice revert |
| P1/P2 economy and progression | FR-08, JUN-01–JUN-03, J03-08, J06-08–J06-13, A17-16–A17-17, A20-10–A20-11 | Trust/measurement implementation in progress; distribution and live balance proof pending | Next slice commit | `ECONOMY_PROGRESSION_TRUST_CONTRACT_OK`, `UPGRADE_RECOMMENDATION_POLICY_CONTRACT_OK`, `ABILITY_ROLE_TELEMETRY_CONTRACT_OK`; five bounded GP tiers, monotonic pickaxes, runtime-parity preview, saved net expedition telemetry, rotating relevant upgrade goals, and decision-ready ability roles | `?depthEconomy=legacy` plus values/slice revert |
| P2 world interactions | J03-03–J03-07, J03-10, A17-21, A17-25, BY-03, BY-05, BY-09, BY-13, BY-15–BY-16 | Pending | — | — | Feature flags plus slice revert |
| P2 UI/audio/deep polish | Remaining raw and analysis IDs | Pending | — | — | Presentation flags plus slice revert |
| Final 140-ID closure | All registers | Pending | — | Requirement audit, contracts, browser, saves, migrations, rollback | Full-range rollback tool |

## Acceptance counters

- Total obligations: 140
- Accepted: 0
- Partially accepted: 0
- Rejected by owner: 0
- Reopened regressions: 0
- Pending: 140

Counts change only when a closure packet links the exact contract, runtime/browser evidence, playtest result where required, save/rollback result, and commit identity.
