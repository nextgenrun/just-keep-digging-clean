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
