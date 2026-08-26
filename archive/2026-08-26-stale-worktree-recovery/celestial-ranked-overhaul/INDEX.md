# Celestial ranked overhaul recovery

- Source worktree: `.git-safety/celestial-ranked-overhaul`
- Source branch: `codex/celestial-ranked-overhaul`
- Base commit: `b430d6346c13674e58ccbd1704f590be815d2949`
- Captured status entries: 152
- Tracked patch: 136 files, 1,070 insertions, 4,971 deletions
- Untracked files: 16

This unfinished branch mixed a celestial/talent refactor with staged retirement of cave, random-event, and second-world systems. Those broad removals conflict with newer active work, so the changes were preserved rather than merged.

Recovery procedure:

1. Copy this package outside the active checkout.
2. Create a temporary recovery branch or worktree at the recorded base commit.
3. Apply `tracked-wip.patch` with Git's binary patch support.
4. Copy the contents of `untracked-files/` into that temporary checkout.
5. Review and cherry-pick only the still-relevant pieces.

`manifest.json` records the original porcelain status for audit purposes.
