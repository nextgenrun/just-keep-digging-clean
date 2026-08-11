# Runtime alignment register

Last audited: 2026-08-10

This is the binding truth table between the canonical design and the active
game. “Code exists” is not enough. Visual and interaction rows remain PARTIAL
until browser evidence passes.

## Alignment matrix

| ID | Design promise | Active runtime evidence | Status | Remaining acceptance |
|---|---|---|---|---|
| ALIGN-001 | Empty slots choose Casual/Hardcore and Guided/Skip before load | `NewRunSetupPanel`, StartMenu → WorldLoad → PlayScene payload, nested save data | PARTIAL | Pointer/keyboard visual pass; reload each selection |
| ALIGN-002 | Skip requires typed YES and cannot grant guided cache rewards | Panel input guard plus completed skip-state with `rewardGranted: true` and no payout path | PARTIAL | Browser negative-reward proof and interrupted-save round trip |
| ALIGN-003 | Guided Dig/Flight opening is authored, persisted, and idempotent | Existing Golden Five controllers, contract, visual harness | SHIPPED | Continue regression coverage |
| ALIGN-004 | Guided town exit remains blocked until Flight ascent is proven | `OpeningFlightTownExitBarrierSystem`, release on `surfaceReturnCelebrated` | PARTIAL | Focused contract plus browser collision/release proof |
| ALIGN-005 | First portal is always exactly 15 m in every mode/tutorial combination | `FirstSessionPortalSystem`, x=12, y=`topAirRows+15`, self-heal | PARTIAL | Four-combination browser/save activation-return proof |
| ALIGN-006 | A/D and arrows move/aim; F and Space dig | Input handler fixed aliases and `PlayerInput` OR logic | PARTIAL | Browser held-input proof, diagonal aim, overlay non-leak |
| ALIGN-007 | Inventory and ESC Menu are visible and clickable | Approved HUD bitmap targets call existing Inventory/Pause authorities | PARTIAL | Pointer hitbox/layout/hover/cleanup browser proof |
| ALIGN-008 | Casual loses no lives; Hardcore is free revive then 2→1→0; One-Life is 1→0 | `hardcoreMode.js` reducer, shared PlayScene death path, Wurm handoff | PARTIAL | Focused reducer/save contract and in-browser death surfaces |
| ALIGN-009 | R or Enter resolves a death outside debug mode | `GameInputHandler.handleDeadStateInput`, async save-before-revive | PARTIAL | Browser death input and save-failure behavior |
| ALIGN-010 | Save slot displays persisted mode | StartMenu load/display uses normalized mode label | PARTIAL | Visual fit at 1280x720 and imported legacy save |
| ALIGN-011 | First-run handoff continues Portal → Sell → Upgrade | Golden Five, portal system, retention Mine/Sell/Upgrade stages | PARTIAL | Clean-save timing/playtest; prevent overlapping objectives |
| ALIGN-012 | Ghost demonstrator helps only if current guidance fails | No active ghost system; authored markers/prompts are current teaching | TARGET | Usability test first; approved player art and bounded replay design if needed |
| ALIGN-013 | Level One 0-2,000 m is the polished current mine | Demo bounds, world values, milestones, portals, caves, renderer contracts | SHIPPED | Full clean-save depth soak remains release QA |
| ALIGN-014 | Level Two 5,000 m route is part of final game | Code/assets/values exist; `demoMode` disables level, upgrades, keys, bounds | GATED | Tunnel → economy → portals → return → save → browser E2E |
| ALIGN-015 | Arc Core/Omega are final-game vehicle progression | Systems, art, recipes, 2x2/8x8 contracts exist; demo flag disables admission | GATED | Enable only with Level Two; ownership/craft/board/mine/reload E2E |
| ALIGN-016 | Heavenblocks forms a reachable three-region Zenith chain | Access/progression/presentation/crafting modules and art exist | PARTIAL | Resolve demo-bound reachability and Arc-vault dependency; browser E2E |
| ALIGN-017 | Ten constellations lead to one permanent Celestial Engine | Star Heart save/charge/effect contracts and runtime wiring | SHIPPED | Natural-progression pacing audit |
| ALIGN-018 | Routine information never spams modal UI | Retention duration/dedupe values and one next-promise HUD exist | PARTIAL | First-two-hour notification density capture |
| ALIGN-019 | Production UI uses authored bitmap art | New setup and HUD controls use approved HUD assets | PARTIAL | Existing primitive save cards/confirm panels and other legacy surfaces need audited conversion |
| ALIGN-020 | Exhaustion never silently deletes a save | Death reducer marks exhausted; menu return preserves slot/backups | PARTIAL | Save readback and explicit clear/export browser test |
| ALIGN-021 | Current documents are discoverable and stale roadmaps are non-authoritative | Canonical index, root links, dated archive with INDEX | SHIPPED | Documentation-link contract |

## Known current mismatches

### First-session visual verification

The new run-choice panel, new HUD pointer targets, town barrier, portal route,
and life-consequence overlays have structural implementation but require one
real clean-save browser sweep. Until that evidence passes, rows ALIGN-001/2/4-10
remain PARTIAL.

### Competing tutorial layers

Golden Five teaches Dig and Flight; Retention teaches Mine/Sell/Upgrade. Their
authorities are separate and valid, but timing may overlap. The target is one
current action and one next promise. This is a pacing repair, not a reason to
delete either progression state.

### Legacy primitive UI

The new panel and HUD controls use approved bitmap frames. StartMenu save cards,
destructive confirmations, and several older UI surfaces still draw visible
Phaser primitives. They are functional current code but do not meet final visual
direction. Convert one coherent surface at a time with generated/approved art;
do not replace invisible interaction zones or rewrite working menu logic.

### Demo versus final game

Demo mode deliberately disables Level Two and Arc Core, while the canonical
vision includes both. This is not solved by flipping `demoMode` off. The full
route must pass reachability, economy, performance, save, portal, vehicle, and
visual evidence first.

### Heavenblocks reachability

Heavenblocks gameplay/art flags are enabled, but region coordinates occupy the
far-right sky lane while demo physics/camera bounds end at x=119. Arc vaults also
depend on a currently gated vehicle chain. Treat the modules as PARTIAL until a
normal player can complete the route under one coherent release profile.

## Delivery order

### Gate 1 — close the first five minutes

1. Run the focused static contract.
2. Browser-test all four Casual/Hardcore × Guided/Skip combinations.
3. Verify portal activation/return and save reload.
4. Verify free-revive/life transitions and readable death surfaces.
5. Capture the 1280x720 setup/HUD result and fix only observed defects.

### Gate 2 — tune the first two hours

1. Run a clean save with no debug shortcuts.
2. Record objective/notification/popup timestamps.
3. Remove overlaps at producer/admission gates.
4. Confirm merchant and upgrade decisions occur at useful intervals.
5. Validate Wurm admission and hazard literacy in Hardcore versus Casual.

### Gate 3 — finish visual UI migration

Inventory the remaining visible primitive surfaces, prioritize the most exposed
player flows, generate/approve matched bitmap art, and promote one surface per
review. Do not mix this with gameplay redesign.

### Gate 4 — full-world promotion

Enable Level Two and Arc Core only in an isolated review profile, prove the
entire route, then decide whether to change the default release profile.
Heavenblocks/Zenith promotion follows the same gate and cannot bypass Arc Core
dependency evidence.

## Evidence required to change status

| Claim type | Minimum evidence |
|---|---|
| Pure values/state | deterministic Node assertions including hostile/legacy input |
| World mutation | stub/runtime contract covering install, self-heal, restore, save interaction |
| Scene handoff | source contract plus clean save and existing save browser run |
| Input | held/edge behavior in browser; overlays cannot leak input |
| Visible UI | 1280x720 screenshot, pointer/keyboard operation, cleanup/reopen |
| Persistence | write, reload/readback, interrupted path, idempotency, backup/export where relevant |
| Feature promotion | feature-on and feature-off contracts plus normal-player E2E |

## Decision log

- 2026-08-10: The Golden Five replaces the loose two/three-block tutorial idea.
- 2026-08-10: Tutorial Skip grants prerequisite Flight but no guided cache or
  free-bank rewards.
- 2026-08-10: Hardcore means two lives plus one free first revive; it does not
  automatically delete the slot at exhaustion.
- 2026-08-10: The first portal is a universal deterministic 15 m invariant.
- 2026-08-10: Arrow and Space aliases are fixed safety inputs in addition to
  remappable primaries.
- 2026-08-10: Level Two/Arc Core remain gated while demo mode is active.
- 2026-08-10: Old raw drafts and June roadmaps are archived; July shipped-work
  reports remain historical evidence.
