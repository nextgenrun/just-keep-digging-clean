# Compact production package — 2026-09-07

The deployable game is `dist-compact/`, build **b81aff017f80**.
Its complete unpacked footprint, including Gzip sidecars, is **4,642,260,921 bytes
(4.642 GB)** across **8,262 files**. This leaves **357,739,079 bytes** below the
strict **5,000,000,000-byte** limit. The source workspace inventory was 97.002 GB;
the workspace itself is not the upload payload.

The package contains 1,099 reachable JavaScript modules and 5,900 referenced
assets. Git history, archived versions, visual-review media, testing captures,
raw animation exports, marketing material and credentials are excluded by
`values/productionPackaging.json`. Active artwork and audio retain their original
quality. Imported CSS is collected recursively. Referenced GLB media is supported;
disconnected legacy renderers do not bring their model packs into the release.

The builder checks the limit before copying and again after compression. It
creates no old-version backup. The intermediate package made during this task
was replaced, not archived. No upload archive was created.

## Verification

- `testing/2026-09-07-production-size-contract.py --directory dist-compact`: PASS,
  including exactly-at-limit and one-byte-over-limit cases, exclusions and
  byte-identical active character assets, imported theme and PHP support files.
- `testing/2026-07-18-production-deployment-smoke.py --directory dist-compact`: PASS.
- `testing/2026-07-25-production-http-canary.py --directory dist-compact`: PASS,
  including a ranged request followed by a full compressed response on the same
  HTTP connection. The preview server now resets range state for each request.
- In-app browser: boot, opening cinematic, menus, world loading, rendered town
  and merchant opening/closing passed. No console errors were recorded; optional
  Memory Reliquary anchor warnings remained. This was a brief runtime smoke check,
  not a full progression playthrough or a PHP save-backend test.

[Gameplay evidence](C:/Users/Mila/.codex/visualizations/2026/09/07/01a07a73-f736-7800-882b-39999268c989/compact-production-gameplay.png)

## SSH handoff

Upload only the contents of `dist-compact/`. Keep a single hosted release, with
no legacy game backup or retained upload archive. Use direct file transfer or
streamed extraction so an archive does not consume another copy's disk space.
Verify the destination and reconcile obsolete game files before claiming the
remote installation meets the same size limit; preserve player data separately.

No SSH connection, remote deletion or upload was performed during this preparation.

## Live overwrite — completed 2026-09-07

Following the user's explicit upload/overwrite instruction, build
`b81aff017f80` replaced the game at
`/home/customer/www/nextgen.run/public_html/diggame-beta-1`.

- Uploaded 2,172 changed files (624,392,842 bytes); 6,090 identical files stayed
  in place. Removed 582 obsolete game files (504,930,651 bytes).
- No old-version backup, release staging copy or upload archive was created.
  Changed files streamed through one temporary file, with a calculated peak
  content footprint of 4,642,267,855 bytes. The temporary file is gone.
- Final hosted content, including the small game-specific `.htaccess`, is
  **4,642,261,203 bytes across 8,263 files**. Actual allocated disk usage from
  `du -s -B1` is **4,668,755,968 bytes (4.669 GB)**, below 5 GB.
- Every packaged file passed a full remote SHA-256 comparison. All deployed PHP
  files passed PHP 8.2 syntax checks. The final file set matches the package plus
  its web configuration. Old `archive/` and `visual-approval-previews/` trees,
  the upload temporary file and deployment lock are absent.
- The game showed maintenance during replacement. It is open again, with
  entry-page/API cache headers set to prevent stale entry pages or cached API
  replies. The parent website configuration and separate wiki were untouched.
- Fresh public browser verification confirmed build-versioned script URLs,
  boot, opening cinematic, main menu, existing save selection, rendered town,
  and Bobo's shop. No console errors appeared. The known optional Memory
  Reliquary anchor warnings remain. This was a runtime smoke test, not a full
  progression playthrough. No new save, purchase or checkpoint was created.
- Private server logging/save-backup storage was absent and remains
  unconfigured for this upload. Existing browser saves were preserved. The
  verification visit used `sessionLogging=0`; no server-data durability claim
  is made. Direct scripted HTTP requests received the host's 403 response;
  independent delivery was verified through the public browser and remote
  content hashes.

[Live gameplay evidence](C:/Users/Mila/.codex/visualizations/2026/09/07/01a07a73-f736-7800-882b-39999268c989/live-compact-b81aff017f80.png)
