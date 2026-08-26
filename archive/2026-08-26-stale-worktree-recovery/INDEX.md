# Stale worktree recovery — 2026-08-26

This archive preserves unresolved work from two stale August 10 worktrees before their checkouts were removed. It is rollback material, not active game code, and must not be applied wholesale to the current branch without review.

| Package | Source branch | Base commit | Preserved material |
|---------|---------------|-------------|--------------------|
| `celestial-ranked-overhaul` | `codex/celestial-ranked-overhaul` | `b430d6346c13674e58ccbd1704f590be815d2949` | Binary-capable tracked patch plus all 16 untracked files |
| `design-source-of-truth` | `codex/design-source-of-truth-2026-08-10` | `b430d6346c13674e58ccbd1704f590be815d2949` | Binary-capable tracked patch plus all 14 untracked files; 10,714 apparent accidental preview deletions excluded |

Each package includes a machine-readable `manifest.json`, `tracked-wip.patch`, copied `untracked-files/`, and its own recovery notes. To recover, first copy the package outside the checkout, create a temporary branch or worktree at the recorded base commit, apply the patch there, and then copy the untracked files into that temporary checkout.

Keep this package until its contents have been manually reconciled or explicitly rejected.
