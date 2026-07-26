# Version-control safety audit

**Audited:** 2026-07-26
**Repository:** `nextgenrun/just-keep-digging-clean`

## Baseline

- Local `main` and `origin/main` both resolved to
  `c2caa06aa99beb074f874be155c3a35b59635a92`.
- Ahead/behind was `0/0`.
- The working tree initially contained 95 modified files and 2,963 untracked
  files; active generators increased that count during the audit.
- Untracked content measured about 8.8 GiB before a generated canary copy was
  added.
- Editable Blender sources and review sessions accounted for most of the
  untracked size. Seventeen `.blend1` autosaves all had a matching canonical
  `.blend`.
- The reproducible packaged runtime was missing about 767 MiB across 789
  untracked source files. No required runtime file exceeded 25 MiB.
- The GitHub repository reported about 2.5 GiB of existing Git storage.
- `main` had no branch protection, no tags, and no remote safety branches.
- Recent `Dig Game Safety Gates` runs were red. The current failure included
  missing runtime assets that existed locally but had never been committed,
  plus focused gameplay-contract failures.
- The version-control policy ended midway through the local-backup tier.

## Risks

1. Runtime code could reference assets that existed on one workstation only.
2. Large editable sources could exceed normal GitHub blob limits.
3. A direct push or force-push to unprotected `main` could bypass red checks.
4. The only detailed WIP state existed in ephemeral terminal output and the
   default Git reflog lifetime.
5. Generated package copies and a clean third-party nested repository could be
   staged accidentally.

## Foundation added

- Deterministic line-ending and binary routing rules in `.gitattributes`.
- Git LFS routing for heavyweight editable sources while runtime media stays in
  normal Git for CI.
- Ignore rules for generated package copies, paired Blender autosaves,
  machine-local safety reports, and the nested third-party tool clone.
- A structured commit template with validation and rollback fields.
- Tracked pre-commit and pre-push hooks.
- Repeatable local Git safety configuration with extended recovery retention.
- Machine-readable repository safety reports.
- External WIP snapshot automation with a verified Git bundle.
- A cross-platform repository-integrity contract and GitHub Actions workflow.
- A completed daily workflow, publishing policy, and recovery playbook.

## Protection activation boundary

Require `Safety gate` and `Repository integrity` only after both appear green on
the published safety branch. This avoids locking `main` behind a check that is
currently failing or has never run.
