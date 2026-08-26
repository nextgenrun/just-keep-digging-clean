# Design source-of-truth recovery

- Source worktree: `.git-safety/design-source-of-truth-2026-08-10`
- Source branch: `codex/design-source-of-truth-2026-08-10`
- Base commit: `b430d6346c13674e58ccbd1704f590be815d2949`
- Original status entries: 10,765
- Preserved tracked patch: 36 files, 744 insertions, 344 deletions
- Untracked files: 14
- Excluded from the patch: 10,714 apparent accidental deletions under `visual-approval-previews/`

The useful design-document and hardcore-control edits were preserved. The mass preview deletions were not: they appeared to be an unmaterialized or damaged worktree state rather than an intentional archive operation.

Recovery procedure:

1. Copy this package outside the active checkout.
2. Create a temporary recovery branch or worktree at the recorded base commit.
3. Apply `tracked-wip.patch` with Git's binary patch support.
4. Copy the contents of `untracked-files/` into that temporary checkout.
5. Review and cherry-pick only the still-relevant pieces.

`manifest.json` retains the complete original status list, including the excluded preview deletions, for audit purposes.
