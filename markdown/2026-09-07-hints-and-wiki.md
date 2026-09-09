# Hints and public wiki — 7 September 2026

Published to https://www.nextgen.run/diggame-beta-1/ and https://www.nextgen.run/game/undersstar-wiki/.

## Player changes

- Esc → Hints adds a paged field guide using approved pause/HUD artwork. It follows the current key bindings and opens the matching wiki answer.
- The current opening objective, active warnings, low GP, darkness, unspent Talent Points, sale cargo and available Campfire charges determine which advice comes first. Advice expires when its condition ends. Urgent mechanic lessons can interrupt lower-priority lessons; previously visible reading time resumes without marking an interrupted lesson as seen.
- The public build has 15 reference hints. The local build also includes the running hint because it has the run key binding. An active opening objective adds a contextual entry.
- The wiki has ranked answers, synonyms, common typo tolerance, snippets, keyboard navigation, direct answer links and responsive layouts. Search indexes individual answers, controls, FAQ entries and table rows, using safe DOM text rendering.
- Updated guidance covers the real opening sequence, separate Talent/Star Point purchases, level-3 access, Stellar Lance, Campfire charges, conditional Star Codex access and the currently deployed event flags. Four fresh game screenshots replace outdated guide visuals.

## Scoped publication

Public base build: `904dd9732245`. Patch: `hints-dcaa1b63a582`.

Seven semantic game files changed. Their affected import ancestors receive the patch query while unchanged imports keep the base query, preserving shared module instances. The release contains 27 game files including metadata/cache ancestors, matching gzip copies, and the complete wiki: 75 files total. Other local game work was not included.

The remote baseline and candidate are under `.tmp/hints-wiki-release/`. `patch-manifest.json` records before/after source hashes. `upload/release-manifest.json` records the complete delivery allowlist. The uploaded archive SHA-256 is `29c773c385c292f85ea0aa8a15ff7e3f5921b9b77df4ab855aeb153ef4998638`.

Staging verified archive and file hashes, required the live game and wiki to match the inspected baseline, and checked the production marker. Promotion backed up every affected game file and the entire wiki, swapped the wiki directory, and published the game index last. All 75 live file hashes passed the final SSH verification.

Backup: `/home/customer/.local/share/understar-hints-wiki-20260907/hints-dcaa1b63a582/backup`.

The saved remote release script supports `verify` and guarded `rollback` modes, each followed by `hints-dcaa1b63a582`. Rollback refuses to overwrite a live release that has drifted. Its path is `/home/customer/.local/share/understar-hints-wiki-20260907/hints-dcaa1b63a582/2026-09-07-hints-release-remote.py`.

## Validation

- `node testing/2026-09-07-hints-search-contract.mjs` passed question/synonym/typo queries, no-results and malicious-input cases, remapped keys, live-state relevance, stale lesson expiry and urgent preemption.
- Every changed candidate JavaScript module and wiki script passed syntax checks. The candidate import graph has no missing dependencies.
- `testing/2026-09-07-hints-wiki-live.mjs` passed in the production candidate and again through the public game URL: new run, Esc Hints, paging, wiki popup anchor, reopening, Stars, Inventory and return to gameplay. Isolated browser profiles avoid touching the user's saves.
- `testing/2026-09-07-wiki-browser-qa.mjs` passed locally and through the clean public wiki URL: seven real queries, arrow/Enter/Escape shortcuts, clear/no-results behavior, safe query text, unique targets, FAQ deep links, screenshot decoding and no horizontal overflow at 390, 768 and 1440 px.
- Public proof: `testing/2026-09-07-hints-wiki-live-proof/`. Candidate/screenshots: `testing/2026-09-07-hints-wiki-public-proof/`.

The first public wiki browser check saw older cached HTML; the final clean-URL check saw the updated guide and passed. Raw command-line requests encountered host challenges, and public build metadata is protected. Delivery was verified with the real browser plus server-side hashes.

The older `2026-08-29-understar-game-wiki-contract.mjs` stops at a pre-existing HUD-width assertion (116 minimum versus the current configured 104), before testing the wiki. This is separate from the focused passing checks above.
