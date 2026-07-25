# GitHub Workers, Runtime Canaries, and Rollback

## What is protected

The safety foundation has three independent layers:

1. GitHub workers reject broken module graphs, failing gameplay contracts, and
   production packages that cannot be served correctly.
2. Every accepted production build carries a deterministic build ID in both
   `build-manifest.json` and the page runtime, so an admin can identify the exact
   package that failed.
3. The browser runtime records JavaScript errors, unhandled promises, asset-load
   failures, frozen frames, stalled loading scenes, and missing PlayScene or
   CaveScene collaborators.

These checks reduce regressions; they cannot prove that every design or gameplay
change is correct.

## GitHub workers

`Dig Game Safety Gates` runs on pull requests, `main`, merge queues, nightly,
and manual dispatch:

| Worker | Blocking proof |
|---|---|
| Structural health | Every runtime system parses, imports, exports, and remains reachable from `main.js` |
| Deep gameplay regression | Focused gameplay contracts, critical-family coverage, PlayScene wiring, and action-contact routing |
| Production package canary | Production build closure, deterministic build ID, HTTP MIME/cache/range/compression/security contracts |
| Optional deployed canary | Read-only probe of an externally deployed canary URL |
| Safety gate | Fails unless every required worker succeeds |

The main-branch workflow preserves a `dig-game-canary-<commit SHA>` artifact for
14 days. The manual rollback workflow preserves a verified rollback candidate
for 30 days.

## Required GitHub settings

The workflow alone reports failures. To make it enforceable:

1. Open GitHub repository Settings, then Rules or Branch protection for `main`.
2. Require a pull request before merging.
3. Require status checks and select the unique `Safety gate` check after its
   first workflow run.
4. Require the branch to be up to date, require conversation resolution, and
   disable force pushes and branch deletion.
5. Enable “Do not allow bypassing” if all maintainers should follow the gate.
6. If merge queue is enabled, keep the workflow's `merge_group` trigger.

## Runtime admin canary

Open the game with:

```text
?adminHealth=1
```

The badge expands into the current build ID, mode, active scenes, FPS, current
findings, recent events, and a copyable JSON report. Development builds also
support `Ctrl+Shift+F12`. The same report is always available to diagnostics:

```js
window.__jkdHealth.snapshot()
```

The latest critical report persists in local storage across reloads. A hosting
environment can enable server-side alert delivery before `main.js` loads:

```js
globalThis.__JKD_CANARY_REPORT_ENDPOINT__ = "/admin/runtime-canary";
```

The endpoint is disabled by default because this static checkout has no
authenticated admin ingestion service. The reporter sends only same-origin JSON
and never lets a reporting failure crash the game.

For scheduled deployed checks, create a GitHub Actions repository variable named
`CANARY_URL`, or supply `canary_url` during manual workflow dispatch.

## Safe rollback procedure

1. Read the admin report and note `buildId`, active scene, and first critical
   event.
2. Find the most recent green `Safety gate` run before the regression.
3. Run `Build Verified Rollback Candidate` with that commit SHA.
4. Download and inspect the resulting immutable rollback artifact.
5. Restore source history with a normal revert branch, not a hard reset of
   shared `main`:

```powershell
git switch -c codex/rollback-incident
git revert <bad-commit-sha>
git push -u origin codex/rollback-incident
```

6. Merge the revert only after its own `Safety gate` passes.
7. Deployment or traffic switching remains explicit because this repository
   does not define the production hosting target or its credentials.

## Local verification

```powershell
node testing/2026-07-22-all-game-systems-health-check.mjs
node testing/2026-07-25-release-safety-contract.mjs
python testing/2026-07-22-deep-game-logic-health.py --timeout 90
python testing/2026-07-18-production-deployment-smoke.py
python tools/2026-07-17-build-production.py --out-dir .canary-dist
python testing/2026-07-25-production-http-canary.py --directory .canary-dist
```
