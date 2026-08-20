# Version-control tools

These tools preserve work before risky changes and make repository state
auditable without committing machine-local logs.

## Install once per checkout

```powershell
powershell -ExecutionPolicy Bypass -File tools/version-control/2026-07-26-install-git-safety.ps1
```

This enables the tracked hooks and commit template, extends reflog retention,
enables conflict reuse, and configures fast-forward-only pulls.

## Record current state

```powershell
powershell -ExecutionPolicy Bypass -File tools/version-control/2026-07-26-write-safety-report.ps1
```

Reports are written beneath ignored `.git-safety/logs/`. Each report records
the commit identity, upstream divergence, changed paths, large-file risks,
recent commits, and reflog recovery points.

## Create a recoverable local snapshot

```powershell
powershell -ExecutionPolicy Bypass -File tools/version-control/2026-07-26-new-wip-backup.ps1 -Label "before-world-refactor"
```

The backup contains a working-tree copy, a complete Git bundle, and safety
metadata under the sibling `back-ups-dig-game/` directory. Generated build
folders and Git internals are excluded. The command never stages, commits,
resets, deletes, or pushes files.

See `markdown/version-control/version-control.md` for the complete branch,
checkpoint, publishing, and rollback policy.

## Rollback the feedback master plan

Preview every commit and path that would be reverted after the published
feedback-plan safety tag:

```powershell
powershell -ExecutionPolicy Bypass -File tools/version-control/2026-08-21-rollback-feedback-master-plan.ps1
```

The tool is plan-only by default. Applying a rollback requires `-Apply` plus
the reviewed full target SHA through `-ExpectedTargetCommit`. It refuses dirty
or diverged state, creates a new `codex/rollback-feedback-master-plan-*`
branch, makes a normal revert commit, and proves the final tree is byte-exact
with `safety/2026-08-20-pre-feedback-master-plan`. It never resets, deletes,
pushes, or force-pushes.

## Validate and automatically roll back Heavenblocks

Run the Heavenblocks release gate only from its clean, single-commit feature
branch:

```powershell
powershell -ExecutionPolicy Bypass -File tools/version-control/2026-07-26-run-heavenblocks-health-gate.ps1
```

The gate checks the exact commit path allowlist, focused progression/crafting
contracts, all-system structural health, the full deep suite, production
packaging, and an HTTP canary. Deep-suite failures that already existed at the
pinned parent commit are accepted only when both their contract name and
reviewed error signature still match; any new or changed failure is blocking.

On any blocking failure, the default behavior creates a real `git revert`
commit and verifies its tree exactly equals the feature parent. The command
still exits nonzero and writes a JSON report under the operating-system temp
directory. `-NoRollback` is an explicit diagnostic opt-out.
`-ForceFailureForRollbackProof` deliberately fails after all checks to exercise
the same exact rollback route.
