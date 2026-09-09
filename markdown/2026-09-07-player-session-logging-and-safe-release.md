# Player session logging and safe release - 2026-09-07

Target: https://www.nextgen.run/diggame-beta-1/

This change is prepared locally. No SSH, Git commit/push, upload or live activation
is part of this preparation. The release candidate is a snapshot of the current
runtime, including existing game improvements in the shared checkout.

## Recording

The independent session entry starts before Phaser boot and the menus. It records
scene/load transitions, control press/release and hold duration, pointer buttons,
sampled pointer/gamepad movement, UI selection/clicks, numeric/boolean settings
changes, successful digs, rejected digs and repeated-rejection counts, upgrades,
talent/ability results, movement state, progression, position, GP, FPS, errors and
local save commits. Records have a session UUID, installation UUID, sequence,
elapsed time and build ID. This is an event timeline, not a deterministic replay.

Text fields and free text are excluded. Browser error messages/stacks, URL queries,
credentials and full user-agent strings are not recorded. Game control codes are
recorded during gameplay; menu keyboard capture is limited to navigation controls.

Active gameplay, inactivity, menus/loading, pauses, hidden and unfocused time are
separate. Inactivity begins after 30 seconds without input; held controls remain
active. Suspended foreground intervals over 10 seconds count as unknown instead of
invented playtime. Pointer/gamepad sampling runs at 250 ms, with state/heartbeat
batches every five seconds. Last-seen time is not an exact exit or crash time.

The menu discloses recording and provides a clickable/F8 off switch. Recording is
enabled only for the target NextGen path. Normal local runs are disabled; the
explicit localhost query playerDataTest=1 enables local collector verification.
sessionLogging=0 disables recording for that visit.

## Browser and save safety

The outbox uses the separate understar-player-data-v1 IndexedDB database. Events
are capped at 4 MiB/96 batches and 24 hours; the in-memory recorder has 2,048 events.
Dropped events are counted. Network requests are asynchronous, time out and back
off. A missing endpoint, full store, blocked database or logger exception cannot
block startup, input, simulation or the normal game save queue. Beacons remain in
the outbox until a later request receives a matching two-copy receipt.

The existing game save keys, schema, validation, revision queue, backup-first
imports and death tombstones retain their authority. A post-commit notification
runs only after the existing local save succeeds. Its exceptions cannot fail that
save. No server save is loaded automatically, selected by IP, or allowed to
overwrite a local slot in the background.

Optional automatic server recovery copies currently cover Casual saves only, at
most once per minute per slot. Their portable JSON bytes are preserved exactly.
Hardcore retains its existing local death/backup rules and explicit manual export;
automatic server rewind copies are excluded. Pending backup data is separately
bounded to three snapshots of at most 8 MiB each. Browser storage failure disables
automatic remote backups when a persistent recovery identity cannot be retained.

Server backup reads require the browser's 256-bit owner token. IP and installation
IDs cannot authorize a save read. Backup listing/download is available through
authenticated POST operations backup_list and backup_read; restoring still uses
the existing explicit portable-file import flow. Clearing browser data can lose
the owner token, so existing exported save files remain an important recovery path.

## Two private server copies

The PHP 8.1+ collector requires a configuration file outside DOCUMENT_ROOT and two
distinct, non-nested writable storage roots outside that webroot. Nothing writes
inside the deployed game folder. Configuration setup refuses existing config and
keeps protected config recovery copies in both stores.

Each batch has an immutable UUID and request digest. Writes use temporary files,
flush/fsync and rename; both copies are read/hash-verified before acknowledgement.
If one write fails, the request fails and the browser retains the batch. Retrying
reuses the original bytes and repairs a missing second copy. Conflicting reuse of
a batch ID returns 409. Reports flag missing or differing copies.

Only exact configured origins are accepted. Requests and fields are bounded.
Raw IPs are not stored: REMOTE_ADDR is grouped with a keyed, monthly rotating
hash. Forwarded-IP headers are ignored. Trusted proxy handling must be verified
on the host before treating that field as the player's network address.

Defaults: 120 writes/minute/IP group, 128 MiB/day/IP group, 2 GiB/day overall, and
512 MiB minimum free space in each store. Logs retain 14 days; server saves retain
up to five versions per slot and 30 days. The maintenance CLI defaults to dry-run;
schedule its apply mode on the server only during the authorized deployment.
Two directories on one server do not provide recovery from loss of that server.

## Next commit and live deployment

1. Review the scoped commit file list and current diffs. Preserve unrelated work.
   The packaged game contains current reachable runtime files and assets; avoid
   replacing it with an older dist snapshot.
2. After SSH is authorized, verify the actual PHP version, document root, current
   target and any existing server-side save/data locations. Back those up and
   preserve/migrate them outside the replacement directory before promotion.
3. Historical expected webroot is /home/customer/www/nextgen.run/public_html;
   confirm it live. Suggested private base is the sibling
   /home/customer/www/nextgen.run/private/understar-player-data. Use primary/ and
   mirror/ beneath it, or separate mounted storage locations. These are proposed
   paths, not verified live locations.
4. Run tools/2026-09-07-configure-player-data.php outside public access with
   --config, --primary, --mirror, --public-root and --origin=https://www.nextgen.run.
   The default collector lookup is the private base above; otherwise configure
   UNDERSTAR_PLAYER_DATA_CONFIG on the server. Never put the secret in Git or HTML.
5. Stage the entire candidate, compare its SHA-256 manifest remotely, lint PHP and
   verify a synthetic session writes two identical private files. Preserve the
   previous complete runtime as rollback. Deploy operations tools privately.
6. Promote through the existing staged release procedure. Keep the exact HTTPS
   www.nextgen.run origin and diggame-beta-1 path so browser save storage remains
   available. Invalidate relevant host/CDN caches, then verify boot, menu, current
   build ID, a real gameplay session, two log copies and Casual save recovery.
7. Run the report and maintenance dry-run, then configure bounded daily retention.
   Rollback changes runtime files only; keep both data stores and private config.

The builder includes the new collector, server policy and all page stylesheets,
versions the early session module with the rest of the module graph, and refuses
to replace an existing output directory. It rehashes source inputs after copying
and aborts if they changed during packaging.

## Verification commands

- node testing/2026-09-07-player-data-contract.mjs
- php testing/2026-09-07-player-data-server-contract.php
- node testing/2026-09-07-player-data-http-contract.mjs
- node testing/2026-08-20-player-jump-flight-motion-contract.mjs
- node testing/2026-08-12-save-v15-integrity-contract.mjs
- node testing/2026-07-30-play-scene-save-scheduling-contract.mjs
- node testing/2026-08-26-hardcore-death-save-and-tutorial-pointer-contract.mjs
- node testing/2026-07-27-manual-save-transfer-ui-contract.mjs

Focused checks are separate from the entire repository's health. Live storage and
deployment remain unverified until the authorized server step.

## Prepared candidate and local evidence

The prepared snapshot is dist-player-data-20260907-ready, build 301f769d58e1:
1,054 modules, 9,094 assets and 11,415 packaged files including compression
sidecars, totalling 5,292,731,287 bytes. The private SHA-256 upload manifest is
testing/artifacts/player-data-2026-09-07/upload-manifest.json. Every module,
asset and support file was checked against the source; all 1,054 imported
modules also passed local HTTP delivery and module linking.

The next-commit scope is tools/2026-09-07-player-data-commit-files.json. Its scoped
patch is testing/artifacts/player-data-2026-09-07/player-data-scoped.patch, based
on the original copies of the five integration files. Review existing-file hunks
when staging; the release snapshot contains the current reachable game changes
as well. Do not commit the runtime package, test private configs, generated
recovery tokens or synthetic browser data.

Local browser checks used a fresh 127.0.0.1 origin with a real PHP collector and
two isolated private stores. The normal production entry reached the menu, the
built-in Casual/tutorial-skip UI created slot 1, and short movement/jump/Flight/dig
inputs produced press/release records with hold durations. Menu, loading, idle,
gameplay and pause totals were observed, as were UI clicks and successful saves.
The run was saved through the pause menu, survived page reload, and continued
back into PlayScene. This is bounded startup/save/input coverage, not a full
natural-progression or sustained Flight playthrough.

Three initial server save versions were byte-identical between stores. The actual
browser-produced portable payload passed its checksum and the existing
DugTilesSaveStore.importSave flow in an isolated in-memory slot; world, resources,
player state, mode and progression remained intact. Reproduce with:
node testing/2026-09-07-player-data-save-roundtrip.mjs <synthetic-server-save-record>.
The supplied record must be within this task's ignored test-artifact directory.

The initial PHP preview had two main-module resource failures. Restarting that
local preview recovered normal startup; the verified package was unchanged.
A temporary diagnostic router exists only in ignored test artifacts and is not
part of the release. Gameplay also emitted existing MemoryReliquaryWorldSystem
warnings about omitted unsafe authored anchors. These are recorded separately
from the focused logging/save checks.

Focused client, passive-observer, dual-store PHP and real HTTP checks passed,
including origin rejection, idempotency, partial-write rejection/repair, owner
isolation, exact portable bytes, reporting and maintenance dry-run. The existing
33-case traversal contract and save integrity, scheduling, Hardcore death and
manual transfer contracts passed. No global repository-health claim is made.

No SSH connection, Git commit/push, live upload or server activation was performed.

The final local browser evidence is testing/artifacts/player-data-2026-09-07/browser-preview/verification.json. Five real server save versions had two identical copies. The F8 opt-out survived reload and stopped all new log/save records for over two minutes.
