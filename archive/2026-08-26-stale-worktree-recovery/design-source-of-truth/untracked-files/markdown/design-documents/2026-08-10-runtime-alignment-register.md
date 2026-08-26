# Runtime alignment register

Status: **CANONICAL WORKING REGISTER**  
Audit baseline: 2026-08-10  
Recovered full-source commit: `b430d6346c13674e58ccbd1704f590be815d2949`

This is the only design backlog. Old roadmaps, mockups, feedback notes, and
archive files may supply evidence, but their unchecked tasks do not become work
until recorded here.

## Version incident

The workspace root had been switched to an obsolete, heavily modified `main`
checkout. Serving that root exposed the old tutorial and outdated textures.
The modern authored game was still present in the Aug-4 full-source commit and
its canary build. Work continues on the isolated branch
`codex/design-source-of-truth-2026-08-10`; the dirty root is preserved for safe
comparison and must not be reset or promoted wholesale.

This was a launcher/source-selection mismatch, not evidence that the authored
texture runtime had been removed.

## Alignment decisions

| Requirement | Former mismatch | Canonical result | Owner/evidence | State |
|---|---|---|---|---|
| Launch the modern game | Root served obsolete tutorial/demo and textures. | Serve the recovered full-source worktree/build on the QA port. | Commit baseline plus browser QA on `127.0.0.1:8097` | **LIVE** |
| Tutorial before mode | Runtime asked mode first. | Empty slot asks tutorial, then save rules; cancel returns correctly. | `StartMenuScene.js` | **LIVE** |
| Typed tutorial skip | No was accepted in one click. | No opens authored confirmation; exact `YES` is required. | `StartTutorialChoiceOverlay.js` | **LIVE** |
| Hardcore emphasis | Casual was initially selected. | Hardcore is selected by default and labelled recommended. | `StartModeSelectionOverlay.js` | **LIVE** |
| Hidden One-Life | No hidden third mode. | Shift-confirm selected Hardcore creates `one-life-hardcore`. | mode overlay + Hardcore v4 sanitizer | **LIVE** |
| Fixed basic aliases | Remapping existed; arrows/Space were not guaranteed throughout gameplay. | WASD + arrows move/aim; F + Space dig in main world, caves, and Living Drill path. | input handler + `PlayerInput.js` | **LIVE** |
| Clickable ESC | ESC worked only as a key. | Approved bitmap `ESC MENU` HUD target opens Pause and respects topmost Inventory. | `approvedHudSkin.js`, `HUDSystem.js` | **LIVE** |
| Standard Hardcore consequence | Zero GP triggered immediate purge. | First fall free, then two lives; nonfinal outcomes revive safely. | Hardcore v4 system and death bridge | **LIVE** |
| One-Life consequence | Absent. | One life, no free revive. | Hardcore v4 system | **LIVE** |
| Preserve finished runs | Active path automatically deleted local/remote state. | Exhausted state is saved; clearing requires explicit save-menu confirmation. | death bridge + Start menu | **LIVE** |
| First portal | Could be absent after generation/save drift. | Portal is guaranteed and repaired at x12, 15 m for every opening path. | `FirstSessionPortalSystem.js` | **LIVE** |
| Tutorial containment | Player could bypass the active route. | x66 three-cell Bedrock doorway self-heals during all six active stages. | `TutorialTownExitBarrierSystem.js` | **LIVE** |
| Tutorial mining count | Raw draft contradicted itself: 3/2 Dirt + Copper versus one block. | One marked normal-HP Dirt block uses the real mining/reward path. | first-five values + tutorial system | **LIVE / CANONICAL DECISION** |
| Ghost demonstrator | Raw draft proposed timed ghost actions without art/usability evidence. | Optional non-authoritative stuck aid after authored art and usability proof. | Player-journey target | **TARGET** |
| Popup pressure | Old ideas added timed Flight/drop prompts. | Persistent current objective + Next Promise; no generic reminder spam. | tutorial bridge/notification admission | **LIVE** |
| Old June roadmaps | Claimed Phaser, saves, input, HUD, textures, audio, and progression were unfinished. | Archived with provenance; this register replaces them. | archive index | **LIVE** |

## Browser evidence — 2026-08-10

- The recovered source is running with no-cache headers at
  `http://127.0.0.1:8097/index.html`.
- Real in-app-browser passes verified the authored main menu, Save Vault,
  tutorial-first routing, exact typed `YES` skip, Hardcore default, guided Town
  route, current authored Town textures, free-revive/two-life HUD, clickable
  Inventory, and clickable `ESC MENU` Pause route.
- The browser pass exposed and repaired a camera-space mismatch on the new ESC
  hit rectangle and an idempotent Hardcore recap shutdown error.
- The final clean load/PlayScene shutdown reported zero browser warnings or
  errors. Temporary QA slots were explicitly cleared; the existing player save
  was not modified.

## Remaining approved targets

### P2 — ghost demonstrator decision

- Test whether players actually stall after the existing marker/current-action
  guidance.
- If a ghost materially improves completion, create approved bitmap animation,
  deterministic positioning, non-collision behavior, and a narrow stuck gate.
- If it does not improve comprehension, close the target instead of adding
  presentation noise.

### P2 — Hardcore pressure tuning

- Measure turn-back behavior, depth reached per life, stress exposure, portal
  usage, resource loss, and cause of fall.
- Tune only through documented values after evidence. Preserve the free+2 and
  one-life contracts unless the canonical mode design changes first.

## Executable evidence

The aligned baseline is guarded by:

- `testing/2026-08-10-design-alignment-contract.mjs`
- `testing/2026-07-30-first-five-onboarding-contract.mjs`
- `testing/2026-08-03-tutorial-town-exit-flight-reminders-contract.mjs`
- `testing/2026-07-28-town-tutorial-position-persistence-contract.mjs`
- `testing/2026-07-28-hardcore-permadeath-contract.mjs` (historical filename;
  now also proves the active bridge does not call purge)
- `testing/2026-07-28-hardcore-memorial-contract.mjs`
- `testing/2026-07-29-hardcore-gp-reserve-contract.mjs`
- `testing/2026-08-03-save-menu-presentation-contract.mjs`
- `testing/2026-07-28-escape-ui-routing-contract.mjs`

Syntax and contracts establish code health; only real browser QA establishes
launcher, asset, layout, pointer, and input health.

## Mismatch protocol

When a new mismatch appears:

1. Reproduce it in the exact served build and identify the source commit/path.
2. Classify it as launcher, design, values, runtime, asset, save, or evidence
   drift.
3. Add one row here with **TARGET** or **BLOCKED** status.
4. Change the smallest existing authority; do not create a parallel feature.
5. Update migration and contracts.
6. Verify in the real Phaser browser build.
7. Mark **LIVE** and archive superseded guidance only after evidence is green.
