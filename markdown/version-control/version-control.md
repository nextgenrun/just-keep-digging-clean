# Version Control - Dig Game Dev Environment

**Last updated:** 2026-07-26

This project uses three independent recovery tiers. A checkpoint is complete
only when the active files, local recovery copy, and remote Git identity are
known.

## Tier 1: Active development

`dig-game-dev-env-cleaned/` is the runtime source of truth.

- Make code, asset, policy, and test changes only in this checkout.
- Keep the working tree recoverable, but do not treat an uncommitted file as a
  backup.
- Generated production and canary directories are disposable and ignored.
- Canonical editable binaries use Git LFS. Runtime media remains in normal Git
  so CI can validate and package the game without LFS bandwidth.

## Tier 2: Local WIP backups

Local snapshots live in the sibling `back-ups-dig-game/` directory. Create one
before risky rewrites, asset regeneration, history operations, or a long work
session:

```powershell
powershell -ExecutionPolicy Bypass -File tools/version-control/2026-07-26-new-wip-backup.ps1 -Label "before-change"
```

Each snapshot contains:

- a working-tree file copy;
- a verified Git bundle containing all committed refs;
- a repository safety report and copy manifest.

The backup command never stages, commits, resets, deletes, or pushes. Generated
build directories, Git internals, virtual environments, caches, and temp logs
are excluded.

## Tier 3: GitHub

The authoritative remote is:

```text
https://github.com/nextgenrun/just-keep-digging-clean.git
```

`main` is the releasable branch. Normal work uses `codex/<short-description>`
branches and a pull request. Push the branch early enough that work in progress
exists on another machine:

```powershell
git switch -c codex/my-change
git push -u origin codex/my-change
```

Before a large publish, create and push an annotated safety tag:

```powershell
git tag -a safety/2026-07-26-pre-change -m "Rollback point before change"
git push origin safety/2026-07-26-pre-change
```

Never force-push or delete shared `main`. Rewrite a feature branch only when no
one else is using it, and use `--force-with-lease`, never plain `--force`.

## Fast-forward-only local defaults

Install the tracked safety configuration once in each checkout:

```powershell
powershell -ExecutionPolicy Bypass -File tools/version-control/2026-07-26-install-git-safety.ps1
```

The installer configures:

- Fast-forward-only pulls, preventing accidental local merge commits;
- tracked pre-commit and pre-push safety hooks;
- Git LFS upload checks;
- the structured commit template;
- `rerere` conflict-resolution reuse;
- 180-day reachable and 90-day unreachable reflog retention;
- 90-day unreachable-object pruning delay.

These are local settings stored in `.git/config`; the script makes them
repeatable without changing global Git behavior.

## Binary and generated-file policy

Normal Git:

- runtime `.png`, `.webp`, `.ogg`, `.webm`, and other browser-served media;
- source code, tests, manifests, policies, and authored data.

Git LFS:

- new heavyweight Blender, Unreal, FBX, GLB, and source-raster files beneath
  the authoring trees explicitly listed in `.gitattributes`;
- path-scoped rules only, so established WAV, video, ZIP, Piskel, and Blender
  history is not silently migrated.

Local-only:

- `dist/`, `dist-*/`, `.canary-dist/`, and production staging copies;
- paired Blender numbered autosaves such as `.blend1`;
- machine-local safety reports beneath `.git-safety/`;
- third-party tool checkouts with their own `.git` directory.

Do not bypass the 95 MiB repository-integrity check. Add an intentional LFS
rule or move a reproducible artifact out of Git.

## Repository safety reports

Create a machine-readable state report at any time:

```powershell
powershell -ExecutionPolicy Bypass -File tools/version-control/2026-07-26-write-safety-report.ps1
```

Reports under `.git-safety/logs/` include:

- branch, commit, origin, upstream, and ahead/behind counts;
- staged, modified, and untracked paths;
- whitespace findings and large-file routing;
- recent commits and `git reflog` recovery points.

The pre-commit and pre-push hooks also write reports. Logs remain local because
they describe transient worktree state; permanent decisions belong in commit
messages and pull requests.

## Commit logging standard

Use small logical commits. The commit template records:

- why the change exists;
- what changed;
- validation performed;
- the exact rollback route;
- issue, task, or build references.

Never stage an unknown mixed tree blindly. Review these first:

```powershell
git status --short --branch
git diff --stat
git diff
git lfs status
```

Stage explicit groups. Use `git add -A` only when the entire non-ignored
workspace is intentionally one checkpoint.

## GitHub enforcement

Two read-only workflows provide rollback evidence:

- `Dig Game Safety Gates` validates runtime structure, gameplay, production
  packaging, and canary identity.
- `Repository Integrity` rejects oversized normal Git blobs, broken LFS
  routing, invalid policy wiring, and disconnected Git objects.

Protect `main` after both checks have produced a green run:

- require a pull request;
- require `Safety gate` and `Repository integrity`;
- require the branch to be current and conversations resolved;
- block force pushes and deletion;
- include administrators when bypass-free protection is wanted.

Do not require a red or never-observed check; that can make every merge
impossible.

## Normal publish sequence

```powershell
git fetch origin
git status --short --branch
git rev-list --left-right --count HEAD...origin/main
git diff --check
node testing/2026-07-26-version-control-safety-contract.mjs
git add <intentional paths>
git commit
git push -u origin HEAD
```

Open a draft pull request for incomplete work. Convert it to ready only after
the required checks pass and the rollback field is accurate.

## Rollback and recovery

Restore one file without rewriting history:

```powershell
git restore --source <good-commit-or-tag> -- path/to/file
```

Undo a shared commit safely:

```powershell
git switch -c codex/rollback-incident
git revert <bad-commit-sha>
git push -u origin codex/rollback-incident
```

Recover a lost local commit:

```powershell
git reflog --date=iso
git switch -c codex/recover-work <reflog-sha>
```

Recover committed history from a local bundle:

```powershell
git clone repository-history.bundle recovered-checkout
```

Recover uncommitted files by copying only the required paths from the matching
local WIP snapshot. Never overwrite the active checkout wholesale without
first preserving its current state.

For a previously green production commit, run the GitHub
`Build Verified Rollback Candidate` workflow. It rebuilds and validates an
immutable downloadable package; it never deploys or rewrites source history.
