# Version-control tools

These tools keep risky release changes auditable and recoverable.

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
The native-world v2 manifest pins parent `456f5af3324cd31c950180bd5392446d0ef9ed52`
and requires the native layout, visual, access, crafting, and release-safety
contracts before packaged runtime checks begin.
The same manifest includes relic-guidance and native artifact-rendering files,
requires their deterministic contract, and records `?relicGuidance=0` beside
the gameplay/visual rollback flags.
The ignored `.canary-dist/heavenblocks-*` build is path-guarded and removed
after every run, with an extended-path fallback for deeply nested Windows
assets.

On any blocking failure, the default behavior creates a real `git revert`
commit and verifies its tree exactly equals the feature parent. The command
still exits nonzero and writes a JSON report under the operating-system temp
directory. `-NoRollback` is an explicit diagnostic opt-out.
`-ForceFailureForRollbackProof` deliberately fails after all checks to exercise
the same exact rollback route.
