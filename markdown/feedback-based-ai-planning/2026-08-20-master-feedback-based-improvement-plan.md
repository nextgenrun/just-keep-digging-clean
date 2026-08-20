# Master feedback-based improvement plan — 2026-08-20

## Outcome

Turn the current feature-rich Phaser build into a readable, dependable mining loop: understand the next action, dig with believable contact, make a meaningful risk/reward decision, return safely, buy one legible improvement, and feel a stronger next expedition. The plan preserves the admired upgrade hook and cave-in spectacle while removing crashes, false affordances, mechanical noise, and first-session overload.

This is planning only. The current worktree is heavily modified, so implementation must use narrowly owned slices and preserve unrelated changes.

## Evidence-based diagnosis

The feedback is consistent across dates and players:

1. **Reliability is currently below the content surface.** Death can crash or fail to consume a life; Earthquake and Wurm can appear nonfunctional; UI/action state can disappear or become unclickable.
2. **The first expedition lacks one stable mental model.** Players do not reliably know the goal, dig input, return method, meaning of unbreakable tiles, or what the shop is for before other systems arrive.
3. **Dig presentation is not coupled tightly enough to the selected tile.** The runtime has many side-dig clips, but compatibility is based mostly on direction/sequence. Visual alignment is disabled, so limbs can cross solids even when the gameplay target is valid.
4. **Depth is not paying for its risk.** Travel, HP, GP, darkness, hazards, and escape cost rise faster than perceived reward. More content does not fix this economic shape.
5. **Progression is broad but weakly differentiated.** Abilities and talent nodes exist, yet players report low impact, late unlocks, questionable overlap, and hard-to-read presentation.
6. **Several older fixes require regression treatment.** Earlier notes claim working death UI, free Hardcore teleports, tutorial guidance, animation repair, Map, Inventory, and stress changes. The newest reports reopen several of them; old contracts remain useful but are not current acceptance.

## Current implementation facts that shape the plan

| Current evidence | Planning consequence |
|---|---|
| `values/complexDigAnimations.js` defines ten SIDE clips but only `uppercut` in the UP sequence; its reviewed contact entries currently disable visual alignment. | Do not add more random variety first. Introduce compatibility/clearance metadata, two approved UP variants, bounded alignment, and a safe fallback. |
| `player/UalMiningComboSelector.js` cycles by action family/direction/target history, while `systems/visual/PlayerRigContactSystem.js` deliberately leaves gameplay body/target authoritative. | Preserve authority, but select presentation using the actual target face and adjacent-solid clearance. |
| `world/playScene/HardcoreDeathBridge.js` and `ui/overlays/HardcoreDeathRecapView.js` coordinate life state, delayed save/readiness, actions, and scene routing across several stages. | Treat death as one persisted idempotent transaction and test scene destruction, save failure, repeated input, and final-vault routing explicitly. |
| `ui/overlays/CelestialTalentTreeView.js` fits a 1672×941 all-branch design down to a configured compact scale, while progression contains three full lattices. | A small all-at-once tree cannot solve readability through scaling alone; add a focused branch/readable comparison mode. |
| `world/playScene/GraveborerWurmBridge.js` has mode, unlock, depth, noise, and cooldown admission gates; Earthquake scheduling/candidate selection can also remain inactive without a player-visible event. | Instrument exact admission reasons and separate “ineligible” from “broken” before balance or art changes. |
| `world/playScene/HardcoreModeBridge.js` and the sound layer reuse seismic-warning material for stress/near-death signaling. | Author semantically distinct low-GP, stress, near-death, and earthquake families with cooldown/hysteresis. |
| The current first-five path includes seven stages through `UPGRADE`, while historical plans also record a six-stage/no-forced-upgrade decision; `values/systemIntroduction.js` still exposes a broad first-return bundle. | Run a frozen authority A/B and update config, docs, tests, and reveals together; do not silently pick whichever document is convenient. |
| Active model, renderer, asset, generated-template, and test references to geodes remain despite the normative removal decision. | Geode removal is a cross-layer retirement/migration slice, not a single generation flag. |

## Non-negotiable decisions and boundaries

- The current `.clinerules` is the movement authority: Space is a fixed 1.2-tile jump and Flight uses momentum with Shift plus movement inputs. Older documents that say “no jump” must be marked stale or reconciled before movement work.
- Gameplay target selection, damage, collision, saving, and progression remain authoritative. Animation alignment may improve presentation but cannot invent a hit, move the physics body, or apply damage twice.
- Production-facing UI and visual replacements use approved authored assets. No placeholder rectangles, emoji, or cheap HTML/primitives ship as final art.
- Preserve positive hooks: upgrades, cave-ins/earthquake spectacle, Kimmo’s early “wow,” deep-world mystery, and the satisfying parts of fast mining.
- Keep combo duration unchanged unless the owner explicitly reverses the historical decision. Remove interruptions and pause the timer while blocking UI owns input.
- Retire geodes per the explicit historical decision; do not spend work explaining or redesigning them without a product reversal. Current references require a complete retirement inventory.
- Do not add a mining QTE. Mechanically different interactions must use position, material, timing, route, exposure, or consequence inside the world.
- Do not delete an ability merely because one feedback note suggests it. First measure overlap, role, input burden, unlock timing, and player use; present a keep/merge/rework/remove decision packet.
- Do not expand feature breadth until Phase 1 stability and the core-loop blind-test gate pass.

## Priority model

| Priority | Meaning | Examples |
|---|---|---|
| P0 | Data loss, crash, softlock, or false core affordance | Hardcore death/save, missing life loss, frozen recap, Main Menu crash, broken hazard activation |
| P1 | First-session comprehension or core feel | controls, return training, trap prevention, animation/tile contact, first upgrade, depth reward |
| P2 | Progression and world depth | abilities, talents, caves, chests, special tiles, portal and Sky Pillar polish |
| P3 | Long-tail presentation and tuning | deep biome variety, audio breadth, particles, late-economy curves |

## Phase 0 — Freeze, baseline, and observability

### 0.1 Protect the current work

- Inventory the dirty worktree before each implementation slice; assign one owner and exact intended paths.
- Create small reversible commits only when authorized. Never mix planning, save migration, balance, animation, and UI in one slice.
- Record runtime revision, seed, mode, save fixture, viewport, feature flags, and browser console state for every repro.

### 0.2 Build deterministic repro routes

- Add developer-only routes/fixtures for: first five minutes, first portal, first return, self-dug town hole, every unbreakable reason, low GP/stress bands, Earthquake candidate success/failure, Wurm eligible/ineligible, every death/life state, Star tree at min viewport, and all dig directions while stationary/moving.
- Each route exposes a compact structured snapshot through existing diagnostics; no developer text leaks into production UI.
- Add event IDs for onboarding stages, UI interruption time, return choice, hazard gate reason, animation clip/contact result, death transaction stage, save readback, resource/minute, and upgrade decision.

### 0.3 Establish the baseline

- Run focused contracts, the local game, clean-save and mature-save browser passes, console capture, and screenshots/video for the routes above.
- Mark every historical “done” claim as `verified-current`, `regressed`, `ineligible/misunderstood`, or `not reproduced`.
- Exit: reproducible evidence exists for every P0/P1 complaint and failures can be reached without waiting ten minutes or corrupting a real save.

## Phase 1 — P0 reliability before polish

### 1.1 Transactional Hardcore death and lives

Likely owners: `systems/hardcore/HardcoreModeSystem.js`, `world/playScene/HardcoreDeathBridge.js`, `systems/hardcore/HardcoreDeathRecapView.js`, save repositories, scene routing, and Hardcore values.

- Model death as an idempotent transaction: `detected -> life_reserved -> memorial_written -> save_committed -> save_readback_verified -> recap_ready -> player_choice -> transitioned`.
- Give each death a persisted transaction ID. Repeated collision callbacks, double clicks, reloads, or scene shutdown cannot spend two lives or skip the spend.
- Commit and read back the decremented-life state before enabling Continue. If save fails or times out, show authored Retry and safe Save Vault actions; never freeze behind a destroyed scene timer.
- Make free revive, remaining-life death, final permadeath, save failure, reload mid-transaction, and exhausted-save routing separate tests. Final exhaustion routes to the actual Save Vault contract, not an accidental menu scene.
- Keep buttons keyboard/gamepad/pointer accessible, with visible focus and hit areas matching art. Validate alignment at all supported aspect ratios.
- Exit: 100 consecutive scripted death cycles per branch, plus browser runs, produce one life decrement per death, no crash/softlock, correct tombstone state, and correct destination.

### 1.2 Main Menu and global UI ownership

- Reproduce and fix the reported Main Menu `TypeError`; add a smoke route from boot, death, Escape, and save selection.
- Centralize topmost-UI input ownership. Escape closes the active layer first; only an explicit fullscreen action changes fullscreen. Blocking UI pauses gameplay and combo exactly once and restores both on every close path.
- Add UI-stack diagnostics and contracts for Inventory, Map, shops, Star tree, death recap, Depth Gate, and Start menu.

### 1.3 Hazard truthfulness

Likely owners: earthquake systems/values, cave-in/debris bridges, `GraveborerWurmBridge`, world candidate selection, collision/damage bridges.

- Expose a developer snapshot for `disabled`, `wrong mode`, `too shallow`, `missing unlock`, `cooldown`, `noise too low`, `no valid epicenter/ceiling`, `asset missing`, `armed`, `telegraphing`, `active`, and `resolved`.
- Give Earthquake a deterministic forced route and report candidate starvation rather than silently doing nothing. Soak normal scheduling and verify it can find valid terrain in generated worlds.
- Give Wurm eligible and ineligible routes. Its current Hardcore/depth/unlock/noise gates must be either communicated contextually at eligibility or deliberately redesigned; do not show an affordance for an unavailable hazard.
- Validate telegraph, audio, Q shield, GP drain, collision/damage, pause behavior, cleanup, offscreen behavior, save/reload, and missing-asset fallback.
- Exit: forced and natural browser runs prove both hazards; an ineligible run names its exact gate in diagnostics.

## Phase 2 — One comprehensible first expedition

### 2.1 Define the first-session promise

The persistent goal is: **dig to valuable depth, protect a route home, sell, buy one meaningful improvement, descend farther**. Keep one current action and one next promise visible; everything else waits.

- Put the first target in camera and demonstrate the logical next action, not a mirror of the player.
- Teach movement, down-dig, Flight/local recovery, portal/long return, selling, and upgrade/resume only when the prior concept is demonstrated.
- Reconcile the current seven-step route (`MOVE, DIG, FLIGHT, PORTAL, SELL, UPGRADE, RESUME`) with older six-step/no-forced-upgrade decisions using a frozen blind test. Keep the forced purchase only if it increases comprehension without removing choice.
- S/down and F/dig prompts are contextual, short, captioned, and suppressed once demonstrated. Voice is optional reinforcement; the loop works muted.
- End tutorial free Flight exactly when its teaching stage ends and give normal Flight an intentional startup cost/commitment if playtest confirms spam.

### 2.2 Make the world safe enough to learn

- Prevent or detect self-dug trap holes in the Town/shop zone without invisible arbitrary walls. Provide a local recovery affordance distinct from expedition abandonment.
- Separate **local unstuck** (small positional recovery, no economic penalty) from **abandon expedition** (explicit loss preview and confirmation).
- Every unbreakable tile communicates a semantic reason on contact: permanent boundary, tool/material gate, protected structure, or temporary state. Remove random indestructibility caused by generation/state bugs.
- Do not allow an unsafe descent before return/portal recovery has been learned or is visibly available.

### 2.3 Progressive first return

- Replace the current broad first-return bundle with one reveal at a time. Start with sell plus one upgrade; stage Map, Journey, Combo, secondary merchants, and other panels after relevant actions.
- Make the shop entrance and its purpose readable in the world. Keep merchant prompts near the interaction and within safe screen bounds.
- The first upgrade must be affordable, monotonic, and felt immediately on the next dig. Preserve choice where possible and measure whether the player can explain the difference.
- Direct Casual Demo starts the intended route without unrelated setup friction.
- Exit: at least 4/5 fresh blind players independently dig, recover/return, sell, buy, and resume; median first meaningful upgrade is within the target session; no one reports being trapped or asks for the main input.

## Phase 3 — Contact-aware animation grammar

### 3.1 Replace random-looking cycling with contextual selection

Likely owners: `values/complexDigAnimations.js`, `UalMiningComboSelector`, `PlayerRigContactSystem`, player action/contact timelines, PlayScene gameplay routing, repaired animation assets.

- Preserve deterministic variety, but filter clips through a non-authoritative `AnimationTileClearanceResolver` before selection.
- Classify gameplay target by side/up/down, relative height, player motion, facing, stance, and adjacent-solid occupancy. Each clip declares striking limb, contact marker, reach envelope, planted-foot requirement, allowed motion, required clearance, and fallback priority.
- Select only clips whose contact marker can reach the authoritative target face while the limb envelope avoids non-target solids. Use authored precomputed envelopes/markers; never runtime pixel-perfect collision.
- If no expressive clip is safe, use a short-reach canonical dig rather than clipping. Damage, target, collider, and one-contact timing remain unchanged.

### 3.2 Repair the concrete animation complaints

- Restore the valued older side-dig feel by bridging it into the existing set, not by deleting all newer work.
- Author/approve two distinct up-dig cycles and select them by clearance/contact; keep down-dig left/right variants coherent.
- Fix facing authority for idle, running, dig, Quickslash, and dig-up flip. Q always uses the input/target direction.
- Enable bounded visual alignment only on clips that pass marker/contact review. The physics body remains fixed; visual offset resets on cancel, pause, scene change, and fallback.
- Moving side dig gets its own rooted/locomotion-compatible clips. Remove skating, wall gaps, black seams, foot drift, harsh transitions, and arms/legs crossing tiles.
- Review all imported sets at frame level, repair from existing approved source/Blender where needed, and retain a query/shortcut rollback to the last known-good profile.

### 3.3 Animation acceptance matrix

- Both facings × stationary/moving × side/up/down × open/tight tunnel × one/two adjacent solids × low/high FPS × cancel/chain.
- Assert one gameplay hit, one contact event, unchanged target tile, unchanged body/collider, bounded visual offset, planted support, and zero non-target-solid limb intrusion at approved contact frames.
- Browser video review is required; contracts alone cannot accept motion feel.

## Phase 4 — Risk, reward, economy, and progression

### 4.1 Pay for deeper digging

- Measure net value per active minute after HP damage, GP use, travel/return time, hazard exposure, and failed runs—not raw yield per tile.
- Rebuild depth bands so gold/silver appear rarely enough to tease early, become normal beyond roughly 1000m only after measured tuning, and deeper metals have distinct visuals, toughness, and value.
- Add first-time depth-breakthrough rewards and authored high-value pockets. Reward downward commitment through exposure and escape cost, not an easily farmed “down key” multiplier.
- Tune sell/gamble tile frequency and five fixed, depth-scaled Gem Power restore variants. They never refill the entire bar.
- Verify dirt/base-resource value progression and resource prices so common material does not become economically irrelevant by accident.

### 4.2 Make upgrades trustworthy

- Audit all upgrades for description/effect parity, cost curve, cap, prerequisite, owner, save migration, and immediate perceptibility. Include the requested GP regeneration cost of 250 as a current-value invariant unless rebalance evidence changes it.
- Enforce pickaxe monotonicity in actual effective damage. A nominally later pickaxe cannot feel weaker on the dominant materials without a clear tradeoff.
- Rotate Next Unlock among relevant affordable goals; never pin permanently to the global cheapest item.
- Keep torch/drain/survival tools available before their hazard is encountered, including Hardcore. Retain level-based stress resistance only if the live curve remains legible.

### 4.3 Give abilities and talents roles

- Instrument unlock, equip/visibility, use, hit success, resource cost, damage, escape value, and overlap for Quickslash, Thunder Strike, Heavy Punch, Flight, shield, and other active abilities.
- Quickslash is not a level-one default unless a current product decision explicitly reverses the Bobo-unlock feedback. Thunder Strike must outperform a normal action in a clear scenario; verify direction and damage.
- Produce a keep/merge/rework/remove decision packet. Candidate rule: each retained ability owns a distinct verb or tactical problem, not merely a different damage number.
- Redesign talent nodes around build-defining mechanics and visible before/after values. Small additive nodes may support a path but cannot be the headline reward.
- Replace the tiny all-tree presentation with authored branch overview plus readable focus mode/zoom, minimum font/target sizes, explicit prerequisites, affordable/owned states, and a comparison panel.
- Validate the WoW/action bar after every unlock, purchase, save/reload, layout change, and resolution.

## Phase 5 — World interaction and authored depth

- Hidden caves get an authored shell, readable entrance, light logic tied to torch absence, differentiated risk, and loot better than ambient digging. Restore/compare prior background art rather than leaving featureless black.
- Chests and Sleeping Jackpot get clear interaction, aligned authored art, open/reward animation, loot ownership, persistence, and duplicate-claim protection.
- Geode retirement removes generation, collision, art preload, renderer, guide, and test references together; save migration converts legacy state safely.
- Make geode/sky/special tiles readable through approved illumination and silhouette. Inventory’s Special Blocks guide stays aligned with actual rules.
- Sky/Star Pillar receives visible top assets, stronger unique progression, polished status/UI, talent entrance clarity, and no invisible click targets.
- Money Monster rewards only its intended resource domain; new red-area resources belong to their intended vendor/economy.
- Ascending is active route play: portal placement, route choice, local Flight recovery, and risk management reduce dead waiting without restoring a free universal exploit.
- Preserve cave-ins as a positive spectacle while integrating truthful telegraph, shield choice, and reward/risk consequences.

## Phase 6 — UI, audio, and feedback polish

- Rework Star currency/status and talent UI for alignment, readable hierarchy, responsive safe areas, contrast, focus, and plain-language purpose.
- Validate Inventory resource art, Special Blocks, Map visibility/clickability, Start UI, Hardcore recap/permadeath, Depth Gates, shops, prompts, and action bar at supported viewports.
- Keep weather HUD removed while weather can remain world presentation.
- Combo counts past 100 even if damage bonus caps. Blocking UI pauses it; forced popups do not steal flow.
- Restore floating-number availability as a saved preference with explicit modes and fallback; never randomly disable it.
- Add dedicated authored audio families for material contact, break, valuable reward, portal start/loop/arrival, low GP, stress warning/critical, near death, level/reward, and hazard telegraph. Stop reusing seismic sounds for stress.
- Apply cooldown, hysteresis, priority, ducking, and accessibility/subtitle rules so audio informs rather than spams. Human audition approves each family; rejected mining SFX do not return automatically.
- Add dirt footsteps and biome-appropriate underground particles; suppress them in buildings. Portal hum/animation is persistent but mix-safe.

## Phase 7 — Deep-world identity and long-tail polish

- Overhaul >1000m strata with distinct authored backgrounds, materials, silhouettes, light, particles, audio, tougher dirt language, and more frequent valuable metals according to the measured economy.
- Darkness focus follows torso/head readability instead of the feet, with accessibility floors and torch upgrades that remain useful.
- Give high stress increasingly obvious but non-seizure visual/audio language. Intact Stars relieve stress; mined Stars do not continue projecting safety.
- Improve Sky Pillar/Star Pillar, portal, cave, chest, hazard, and merchant art as coherent location families rather than disconnected widgets.
- Run asset residency, pooling, depth, teardown, and performance audits after each visual slice. Deep-world polish cannot reintroduce blank frames or stale sprites.

## Phase 8 — Acceptance and release

Detailed gates are in `2026-08-20-validation-and-playtest-gates.md`.

- Focused contracts must pass, then the actual browser loop, then frozen blind playtests.
- No P0 open; no console/runtime errors; save migrations and rollback paths proven.
- First-five comprehension, return, meaningful upgrade, animation contact, death, hazard, economy, and UI-readability metrics meet their gates.
- A feedback row closes only when its coverage-register evidence is attached. If a late report contradicts an old pass, reopen it.

## Recommended implementation slices

1. Hardcore death transaction and Save Vault route.
2. Hazard admission diagnostics plus deterministic Earthquake/Wurm harness.
3. Dig contact/clearance resolver and canonical fallbacks.
4. First-five authority reconciliation and progressive first return.
5. Trap prevention, semantic unbreakables, and local unstuck.
6. Net-value telemetry and depth economy rebalance.
7. Ability-role packet, then approved ability/talent work.
8. Star/talent responsive UI and action-bar regression fix.
9. Cave/chest/Sky Pillar/world-interaction slices.
10. Audio/material feedback, deep-world art, and final blind-test tuning.

Each slice must remain independently revertible and must not claim completion from static inspection alone.
