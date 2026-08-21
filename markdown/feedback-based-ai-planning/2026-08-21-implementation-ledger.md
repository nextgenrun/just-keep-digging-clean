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
| P1/P2 economy and progression | FR-08, JUN-01–JUN-03, J03-08, J06-08–J06-13, A17-16–A17-17, A20-10–A20-11 | Trust/measurement implemented; distribution and live balance proof pending | `43155e8` | `ECONOMY_PROGRESSION_TRUST_CONTRACT_OK`, `UPGRADE_RECOMMENDATION_POLICY_CONTRACT_OK`, `ABILITY_ROLE_TELEMETRY_CONTRACT_OK`; five bounded GP tiers, monotonic pickaxes, runtime-parity preview, saved net expedition telemetry, rotating relevant upgrade goals, and decision-ready ability roles | `?depthEconomy=legacy` plus values/slice revert |
| P2 world interactions | J03-03–J03-07, J03-10, A17-21, A17-25, BY-03, BY-05, BY-09, BY-13, BY-15–BY-16 | Implemented; runtime proof pending | `366d589`, `25c7e02` | `GEODE_RETIREMENT_CONTRACT_OK`, `RETURN_ROUTE_TELEMETRY_CONTRACT_OK`, `WORLD_INTERACTION_DEPTH_CONTRACT_OK`; geodes are absent, cave seams pay a deterministic premium, return routes/costs/losses are measurable, and authored cave/chest/jackpot/pillar interaction bindings remain intact | Feature flags plus slice revert |
| P2 responsive Celestial tree | J03-02, A17-22, A20-02 | Branch focus and exact comparison implemented; hidden-browser proof complete; human readability review pending | `42907be`, `0977d40` | `CELESTIAL_BRANCH_FOCUS_CONTRACT_OK`; compact layouts auto-focus one branch, wide layouts retain the overview, authored branch tabs support manual focus, Escape returns to overview, connectors follow the active topology, and the detail dossier compares inactive/active state with the configured effect. Wide/compact production-harness browser checks pass against port 8093 | Responsive focus plus slice revert |
| P2 semantic alert safety | J06-05, J06-07, A17-11, A17-15, A17-28, A20-04 | Misrouting fixed; matching audio assets and human audition pending | `6247b1d` | `SEMANTIC_AUDIO_SAFETY_CONTRACT_OK`; stress/near-death no longer reuse seismic warnings, warning/critical/low-GP captions use threshold hysteresis and cooldown policy, portal start/arrival have distinct semantic slots, and unapproved slots refuse playback | Semantic policy plus slice revert |
| P2 merchant/deep presentation authority | A17-14, J03-13 | Prompt anchor and deep feature authority implemented; hidden-browser capture complete; human review pending | `e518e44`, `0977d40` | `MERCHANT_PROMPT_ANCHOR_CONTRACT_OK`; prompt position is derived from the merchant ground surface with a compact-sprite compatibility clamp. Deep-world backdrop smoke and both player-light contracts pass with injected Level Two capability authority and upper-body light centering. The branch-qualified full first-expedition capture contains the grounded merchant prompt | Values/slice revert |
| Phase 6/7 baseline integration | J03-09, J03-10, A17-03, A17-07, A17-09, A17-13, HD-03, HD-06 | Existing mechanisms verified by focused contracts; full runtime and visual acceptance pending | Baseline plus implementation branch | Combo count/damage-cap ownership, 31 active material footstep routes, clock-only HUD, pause settings, inventory world guide, main-menu return/native resolution, and player-light contracts pass. Retired geode IDs are excluded rather than reintroduced as active terrain | Existing feature flags plus full-range rollback |
| P3 underground particle identity | J03-12, J06-06 | Implemented; contract proof complete; browser/performance review pending | `3339967` | `AMBIENT_PARTICLE_BAND_CONTRACT_OK`; four presentation-only depth identities, exact active-band diagnostics, FPS/live-count gates retained, immediate clearing through explicit building-occupancy authority, and no surface Town particles because emission begins underground | Values/slice revert |
| Clean-clone runtime and browser qualification | A17-20, BY-06, HD-13, HD-15 | Implemented; hidden-browser proof complete | `0977d40` | Tracked menu background authority replaces an untracked export dependency. HUD fixture follows current production ownership. Four Casual/Hardcore × guided/skipped routes pass with zero browser/UI errors, zero blocked asset queues, zero gated residents, and zero untracked textures. Full seven-beat branch route and HUD/Celestial checks also pass on port 8093 | Slice revert plus full-range tool |
| Preserved positive hooks and regression invariants | FR-01–FR-02, J03-01, J03-11, J06-01, A17-01–A17-02, A17-08, A17-18–A17-20, A17-24, A17-26, FN-18, BY-01, BY-04, BY-06, BY-11–BY-12, BY-14, XP-05, HD-01–HD-02, HD-04, HD-07–HD-08, HD-10–HD-14 | Implemented or deliberately preserved; human/balance gates pending | Baseline plus `de893cd`, `43155e8`, `366d589`, `25c7e02`, `6247b1d`, `0977d40` | Focused regression set covers semantic blocker ownership, Bobo-owned Quickslash, live progression surfaces, tutorial ghost/progressive disclosure/free-flight cleanup, intact-Star stress truth, material footsteps, Map reachability, Hardcore free teleports, distinct Portal/Flight roles, no mining QTE, deterministic start routes, the guaranteed first portal, and the staged seven-beat payoff. Economy/ability telemetry supplies the remaining live-balance decision inputs without flattening upgrades or cave spectacle | Existing feature flags plus full-range rollback |
| Product and acceptance constraints | FN-19–FN-23, BY-07–BY-08, HD-05, HD-09, HD-15–HD-16 | Enforced as gates; no unauthorized rewrite or false acceptance | Planning authority plus implementation branch | Reference games remain principles rather than copied scope; breadth freeze, dual technical/player acceptance, frozen build/seed/script, and owner-only strategic reversal remain explicit. The current seven-step route is implemented, while the six-vs-seven A/B disposition and all blind-player conclusions remain pending human evidence | No code mutation; owner decision required for reversal |
| Final 140-ID implementation audit | All registers | Code-authorized implementation complete; G4/human closure pending | Through `0977d40` | Automated coverage comparison maps 140/140 IDs into this ledger. Focused contracts, clean-clone browser routes, save/runtime assertions, and rollback tooling are present; natural hazard, expert motion/audio, economy sample, and five-player blind packets remain open exactly as required by the validation authority | Full-range rollback tool |

## Acceptance counters

- Total obligations: 140
- Accepted: 0
- Partially accepted: 0
- Rejected by owner: 0
- Reopened regressions: 0
- Pending: 140

Counts change only when a closure packet links the exact contract, runtime/browser evidence, playtest result where required, save/rollback result, and commit identity.
