# Permanent Solution Setup

This is the implementation-neutral setup for eliminating the five findings without mixing cleanup with gameplay changes.

## 1. Establish ownership boundaries

- Active runtime code must not import from `archive`.
- `libs`, generated output, and review artifacts must have separate validation scopes.
- Every data catalog needs one canonical owner and documented compatibility aliases.

## 2. Add repository gates

- Import gate: resolve all active relative imports and named exports.
- Archive gate: validate archived modules separately and publish known-broken snapshots in an archive manifest.
- Duplication gate: detect duplicate exported literals, local helper reimplementations, and undeclared aliases.
- Data gate: validate layer IDs, ordering, source filenames, preload keys, and placement IDs by namespace.
- Persistence gate: run fault-injection cases for storage unavailable, quota exceeded, malformed data, migration, and recovery.
- Runtime smoke gate: load the app, record console errors and warnings, and exercise save/load and the first gameplay route separately from static checks.

## 3. Remediation order

- First repair `PERSIST-001`, because silent progression loss is the highest player-impact risk.
- Next canonicalize `PERSIST-002`, because invalid numeric values can contaminate multiple rendering systems.
- Consolidate the repeated persistence adapters in `PERSIST-006` behind the same storage contract.
- Consolidate the helper family in `PERSIST-007` without merging intentionally different APIs.
- Separate static asset IDs from fetched runtime state for `PERSIST-008`.
- Validate manifests before their values escape the loader for `PERSIST-009`.
- Consolidate the audio preload and runtime catalogs for `PERSIST-010`.
- Then define the archive policy and isolate or repair `PERSIST-003`.
- Migrate the animation alias in `PERSIST-004`.
- Rename the authored layer IDs through a versioned migration for `PERSIST-005`.

## 4. Definition of permanent

A finding is not closed when one line is patched. Close it only when the canonical owner exists, old aliases or paths have a migration policy, a static gate prevents regression, and a focused runtime or data-contract check proves the failure mode is handled.

## Additional regression gates

- Persistence gate: every progression system must use the slot adapter; direct `localStorage` calls in runtime systems fail review.
- Helper gate: duplicate local declarations for shared math, color, hash, and geometry helpers fail review unless the wrapper documents a different contract.
- Asset-state gate: static catalogs are deeply frozen and fetched manifests are separate typed state.
- Manifest gate: malformed but valid JSON is treated as a content failure and must select a tested fallback.
- Audio gate: every queued audio key has exactly one manifest path and exactly one runtime library record.

## 5. Audit continuation rule

Run the index checks after each remediation and add new records rather than replacing old evidence. Keep `confirmed`, `conditional`, `intentional`, and `cleared` classifications separate so disabled features and archive noise do not become false production bugs.
## PERSIST-011 renderer fallback

Centralize renderer capability selection instead of treating the query resolver's default as a hard WebGL requirement. The default startup path must use `Phaser.AUTO` or a guarded WebGL probe with Canvas/AUTO fallback, publish the selected renderer, and fail visibly if no renderer can initialize. Keep a browser smoke matrix for normal startup, forced auto startup, and WebGL-unavailable startup so the blank-shell regression cannot return.

## PERSIST-012 world/UI boundary

Keep `world/` independent of UI implementations. Inject view factories or narrow presentation interfaces from the UI composition boundary, then enforce the documented import direction with a CI rule rejecting `world/** -> ui/**` imports.

## PERSIST-013 module URL identity

Canonicalize internal import URLs. Cache-bust the entry/build output rather than selectively appending revision queries to internal edges, and add a normalized-target check that rejects mixed query-busted and unbusted forms.

## PERSIST-014 runtime file size

Split oversized runtime modules by responsibility, beginning with the 22 files above 600 lines. Keep data in values modules, keep scene orchestration thin, and require an explicit exemption manifest for any generated or intentionally large file.

## PERSIST-015 visual SSOT reachability

Every production SSOT must have an active consumer. Wire `worldVisualRegions` into the scenic runtime or mark it review-only/archive it, then add an orphan-value gate and keep the values documentation synchronized.

## PERSIST-016 resource presentation catalog

Replace numeric positional maps and repeated resource-name objects with one enum-backed catalog. Delete unused helpers and test completeness against `TILE_TYPES`, including bedrock, both dark-dirt variants, and gold.

## PERSIST-017 settings persistence status

Route settings through one storage adapter that returns explicit persistence status. Emit durable-save state only after a confirmed write; otherwise expose a session-only state and a non-blocking diagnostic, with failure-mode reload tests.

## PERSIST-018 V11 manifest ownership

Maintain one registry for generated runtime manifests with explicit active, review, and superseded status. Remove or archive the incomplete unconsumed manifest after external consumers are checked, and gate orphan generated artifacts.

## PERSIST-019 generated export deduplication

Make generated exporters write one canonical manifest path and record aliases or snapshots in provenance metadata. Reject duplicate manifest hashes outside approved snapshot directories.

## PERSIST-020 copied tool documentation

Treat copied upstream documents as external references unless their links are rewritten for the local repository. Run the Markdown-link gate against tool documentation and pin the upstream source/version.

## PERSIST-021 architecture documentation drift

Regenerate the canonical READMEs from the current tree and runtime entry points. Require every documented local path to exist and require one owner for the audio, entry, and scene directories.
