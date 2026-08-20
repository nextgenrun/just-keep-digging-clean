# Feedback-based AI planning

This directory is the planning authority for the feedback pass completed on 2026-08-20. It turns every complaint, suggestion, positive signal, and historical decision in `markdown/feedback/` into scheduled work with explicit acceptance evidence.

No gameplay code, balance values, assets, saves, or deployment state were changed as part of this planning pass.

## Documents

- `2026-08-20-master-feedback-based-improvement-plan.md` — product diagnosis, decisions, priorities, architecture, phase order, owners, and exit criteria.
- `2026-08-20-raw-feedback-coverage-register.md` — point-by-point coverage of Frank and the dated solo-developer raw feedback.
- `2026-08-20-analysis-feedback-coverage-register.md` — point-by-point coverage of Fnab, Kimmo, Borick, cross-playtester analysis, and the historical planning decisions.
- `2026-08-20-validation-and-playtest-gates.md` — required contracts, browser/runtime proof, telemetry, blind-test gates, and release rules.

## How to use this plan

1. Work in phase order. Phase 0 and Phase 1 are release blockers; new breadth waits until they pass.
2. Before a slice starts, re-check the current dirty worktree and assign exact ownership. Do not overwrite unrelated work.
3. Use the coverage IDs in both registers in implementation notes, tests, and playtest reports.
4. A code contract can prove invariants, but player-facing feedback is not closed until the real browser loop and blind-player criterion pass.
5. A later player report outranks an older “implemented” note. Reopen the row as a regression instead of arguing from historical green checks.
6. Update a row to `accepted` only when its listed evidence exists. “Compiles,” “looks wired,” and self-play alone are insufficient.

## Scope boundary

This is a plan for the existing Phaser game. It does not authorize an engine rewrite, a smaller replacement game, deletion of abilities, deployment, or a silent change to movement/progression authority. Those choices are represented as explicit product gates where the feedback warrants them.
