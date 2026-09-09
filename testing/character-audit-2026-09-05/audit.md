# Main character visuals and animation audit — 5 September 2026

The largest opportunity is to make the existing Survivor move as one coherent character: smooth flight loops and handoffs, a distinct walk/run vocabulary, consistent torch handling, and expressive recovery between mining hits. The current model, fixed scale, authored contacts, and source quality provide a useful foundation.

This is a review of the current default `survivalUal` profile in this checkout. Runtime code, gameplay values, assets, and saves were not changed. The only authored deliverables are the audit helpers and evidence in this directory.

**Evidence and limits.** I inspected current registered frames at their configured display size, traced the real animation registrar and locomotion selector, inspected action/death/lighting routing, validated editable Piskel sources, and ran eight relevant contracts. Browser connection attempts timed out, including a trivial JavaScript diagnostic. Consequently, these are source-frame and code findings; there is no fresh live gameplay acceptance, FPS measurement, or lighting/collision screenshot in this audit. The image boards and reel contain exact source frames and are labelled accordingly.

[Current character overview](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/character-audit-2026-09-05/character-overview.png) · [Core transitions](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/character-audit-2026-09-05/core-transitions.png) · [Torch and ledges](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/character-audit-2026-09-05/torch-and-ledge.png) · [Animated source comparison](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/character-audit-2026-09-05/source-transition-reel.gif)

**What is present and working**

- The real registrar creates **213 animation entries across 53 sheets** when all required sheets are available. There are 194 distinct sheet/frame sequences; aliases, phase variants, and handoffs are included in these counts. This is not 213 separately authored motions, nor a measurement of simultaneous residency.
- The master unified manifest contains 54 sheets and 3,082 source frames. All passed current file/hash/dimension/blank-frame/crop-edge checks. Two newer downward-strike sheets add 43 inspected registered frames and also passed pixel checks; they are outside that older master manifest.
- No registered animation points to a missing asset. No nonempty recovery target for a registered source is missing from registration.
- Idle, walking, and the current run role have median visible heights of 74, 74, and 76 pixels at profile display size. Normal idle has zero measured baseline drift and a clean loop seam. There is no evidence here for a general character-size rebuild.
- SIDE already has nine stationary combo stages, exact UP has two, and DOWN/DOWN-SIDE now have three. Quick Slash uses the Hurricane Kick source; Thunder Strike has its own ground action. Adding another large attack library is a lower priority than finishing transitions and recovery.
- Mining has authored gameplay contacts, cooldown admission, contact feedback, and a completed-pose hold. Ground movement has acceleration and reversal smoothing. Flight already has momentum, pitch/banking, speed-responsive playback, and paired foot trails.
- Contact shadows, current-sheet footstep sampling, limb occlusion, hard/soft landing choices, wall bracing, idle fidgets, and deferred animation loading already exist. Their runtime integration should be refined through focused comparisons.

**Ranked improvement priorities**

| Rank | Gap and present evidence | Improvement | Effort / confidence |
|---|---|---|---|
| 1 | **Flight repeats and switches poses abruptly.** The 48-frame loop has a 0.6566 last-to-first silhouette difference versus 0.0227 for a typical adjacent pair, about 29 times larger. `continuousFlightLoop` bypasses enter/exit clips, and hover/travel share the same animation key. The real selector reproduced direct idle → flight → falling choices. | Make the current flight cycle close cleanly; author entry, braking/hover, and release carriers against the same rig and current flight pose. Keep the existing momentum and bank response. Rebuild appropriate transition art before changing the selector flag, because the dormant clips reference an older flight source. | Medium. Routing and source seam confirmed; exact gameplay impact awaits a live comparison. |
| 2 | **Walking and running do not form a complete motion family.** Ordinary walking goes straight from idle to the Blender walk loop and straight back to idle. The phase-aware start/stop path now runs for Ctrl running. Ctrl running itself uses Mixamo Standard Walk with faster playback. | Author normal-walk starts and phase-matched stops; give Ctrl running a clear forward lean, bent-arm drive, and running stride. Bake bridges against the chosen gait, and cover walk↔run and direction changes. Preserve displacement-based cadence. | Medium. Selector decisions, source identity, and visible pose vocabulary confirmed. |
| 3 | **Torch presentation is incomplete across actions.** There are 26 bindings, focused on traversal. Mining, combat, ledges, death, and several fidgets have no binding. Unmapped actions use the bare-handed clip while the legacy torch renderer remains disabled; illumination can continue. Torch start/stop art also does not match the normal phase-aware gait bridges. | Use one coherent carry/stow policy through mining, attacks, ledges, and fidgets. Reuse the modeled torch and existing attachment setup. Author matching torch gait transitions instead of pointing all stop phases at one generic stop clip. | Medium to large depending on carry/stow choice. Fallback/visibility behavior confirmed in code; full sequence needs live verification. |
| 4 | **Mining recovery can look held still for a large part of the early-game cycle.** At the unbuffed 1,500 ms interval, the jab computes to about 564 ms of playback, leaving about 936 ms until the next legal start. Up/down examples play for 750 ms and leave 750 ms. Normal recovery deliberately holds the completed pose. | Add restrained authored weight recovery, guard breathing, and a readable preparation into the next hit. Preserve the combat-ready silhouette and all authoritative contact/cooldown timing. Review moving→stationary and action→walk joins using current clips. | Medium. Timing is calculated from current values; these are not wall-clock gameplay measurements. |
| 5 | **Landing, crouch exit, and the end of ledge climbing need better pose continuity.** Source comparisons show a bent-knee landing/crouch pose jumping to upright idle; ledge climbing ends low before returning to standing. Catch→hang is already an exact pose match. | Add a matched stand-up tail after climbing and short landing/crouch recovery carriers that end at the shared idle or correct gait phase. Keep the existing responsive movement cancellation and collision-safe ledge authority. | Medium. Source discontinuities confirmed; the controller's position easing makes live ledge verification essential. |
| 6 | **Hardcore death misses an available character-performance beat.** A 73-frame Death01 clip exists, but the current permanent-death handler stops player animation and shows the modal without playing it. Hurt reactions do exist and are routed from knockback/earthquakes. | Play a concise, authored collapse/settle during the terminal presentation, while life-state recording and input lock remain immediate. Prewarm the necessary asset and retain a safe unavailable-asset fallback. | Small to medium. Missing playback is confirmed in the death handler. |
| 7 | **Fine surface detail contributes less than silhouette at the actual character size.** At roughly 74–77 pixels of standing height, face/hand shapes and jacket/backpack/leg value separation matter more than added texture resolution. This is an art-direction assessment of the rendered boards. | Improve head/hand/boot contrast and silhouette separation on the same model. Explore one restrained identifying accent and baked shoulder/backpack follow-through. Judge it on both a dark cave and a bright surface, with FX active. | Medium. Directional recommendation; environment readability and player preference remain unverified. |
| 8 | **The animation set has a substantial delivery footprint and some registry drift.** The 53 registered sheets total about 43.6 MiB on disk and 741 MiB as uncompressed RGBA grids; the moving-complex atlas alone is 135 MiB decoded. Several packs already load on demand and release later, so this is not measured resident GPU memory. | Measure residency and first-use frame time, then repack unused/duplicate atlas space and remove unreachable registration dependencies while preserving source pixels. Keep the existing deferred-pack system. Refresh the inventory/manifest coverage with each promoted family. | Medium. File/grid costs confirmed; runtime performance impact remains unmeasured. |

**Concrete source findings**

1. Flight selection: [UalNativeLocomotionTransitionSelector.js](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/systems/visual/UalNativeLocomotionTransitionSelector.js) and [survivalUalPlayerAssetProfile.js](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/survivalUalPlayerAssetProfile.js). Banking is already implemented in [ualNativeActionTuning.js](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/ualNativeActionTuning.js) and consumed by both main-world and cave visual routing.
2. Walk/run identity and bridges: [survivalMixamoWalkRuntime.js](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/survivalMixamoWalkRuntime.js), [UalGroundPhaseHandoffSelector.js](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/systems/visual/UalGroundPhaseHandoffSelector.js), and [PlayerKinematicMotionSystem.js](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/systems/visual/PlayerKinematicMotionSystem.js). The current run source is explicitly Standard Walk.
3. Torch action fallback: [heldTorchAnimationSelection.js](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/systems/visual/heldTorchAnimationSelection.js) and [FireLightSystem.js](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/systems/lighting/FireLightSystem.js). `legacyVisible` depends on the whole held-torch feature being unavailable, so it does not restore a torch on an individually unmapped action.
4. Recovery authority: [ualMiningActionCadence.js](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/player/ualMiningActionCadence.js), [UalActionRecoverySelector.js](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/systems/visual/UalActionRecoverySelector.js), [PlaySceneSetup.js](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/world/playScene/PlaySceneSetup.js), and [CaveActionAnimationRuntime.js](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/world/playScene/CaveActionAnimationRuntime.js). Both worlds request the completed-animation hold for normal actions.
5. Terminal presentation: [HardcoreDeathBridge.js](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/world/playScene/HardcoreDeathBridge.js) stops animation before `showDeath`; `deathAnim` has a deferred pack but is not requested or played on this route.

**Animation-set coverage**

| Family | Current coverage | Audit assessment |
|---|---|---|
| Idle / fidgets | Breathing idle and several authored fidgets | Stable base. Fidget exits and torch continuity deserve review. |
| Ordinary walking | 24-frame Blender gait | Start/stop routing is the main confirmed gap. |
| Ctrl running | 24-frame Standard Walk source | A distinct running performance is available to compare locally. |
| Jump / falling | Separate takeoff and fall sources; fixed-height physics | Assets exist and the movement contract passes; no fresh input-to-pose gameplay proof. |
| Powered flight | 48-frame loop, banking and foot trails | Highest-priority loop seam and transition work. |
| Crouching | Entry, hold, exit; torch versions | Hold is coherent; upright exit needs matching. |
| Soft / hard landing | Separate impact choices and cancellation | Preserve responsiveness; improve recovery joins. |
| Ledges | Catch, hang, climb and drop routes | Catch→hang is clean; external entry/exit poses need work. |
| Wall contact | Brace entry/loop/exit system | Already covered; terrain-contact visual acceptance remains open. |
| Stationary mining | Nine SIDE, two UP, three DOWN-family stages | Variety is present. Recovery and readability offer more value. |
| Moving mining | Phase-dependent composite variants | Review locomotion/action transitions and large atlas cost. |
| Quick Slash / Thunder | Dedicated sources and contacts | Preserve contact authority; audit torch disappearance and return poses. |
| Hit / knockback | Chest reaction and reaction queue | Coverage exists. Directional/strength variants are later polish. |
| Teleport | Roll-derived presentation route | Dedicated arrival identity is a later art-direction option. |
| Death | Registered source with deferred loading | Not played by the permanent-death presentation route. |
| Torch / lighting | Traversal carriers, illumination, source renderer | Carry continuity across actions is a confirmed integration gap. |
| Grounding / scale | Body-floor shadow, foot samples, uniform family scales | Existing infrastructure and focused checks are sound; visual context needs live review. |

**Assets and tools worth reusing**

![Current run role compared with an existing local candidate](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/character-audit-2026-09-05/library-run-comparison.png)

The lower row is **an existing review candidate**, not an accepted replacement. It has a visibly stronger lean and arm drive, but source scale, foot phase, transitions, torch compatibility, prior verdicts, and actual movement speed still need checking.

| Existing resource | Best use in the next pass |
|---|---|
| [Matched Mixamo locomotion candidate manifest](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/blender-animation-lab-v1/review-drafts/mixamo-locomotion-comparison-v1/renders/candidate-runtime/manifest.json) | Unarmed Run Forward, crouch-walk, falling and jump references already retargeted to the Survival character. The 20-frame run source is `mixamo-unarmed-run-forward-128650943.fbx`. |
| [Blender Animation Lab](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/blender-animation-lab-v1/readme.md) and [configured source rig](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/blenderAnimationLab.json) | Author shared neutral/guard poses, loop closure, landing/climb tails, carry/stow motion, and restrained secondary motion on the existing rig. Blender 5.1 is installed locally. |
| [Held-torch runtime specification](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/values/survivalHeldTorchRuntime.js) | Reuse the modeled torch/attachment and current carriers to close the action-coverage gaps. |
| [Piskel pipeline](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/tools/piskel-mcp/README.md) | Source validation, alpha/edge cleanup, fixed animation-wide scale, and anchor-preserving exports. Apply body-motion corrections to the rig before sprite cleanup. |
| [Current inventory viewer](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/animation-sandbox/current-animation-inventory-v1/readme.md) | Frame inspection and before/after comparisons using the real registries. Rebuild its dated inventory before assuming historical counts are current. |
| ImageGen, if an appearance comparison is wanted | Still paintovers for value grouping or a restrained identifying accent. An accepted material/silhouette change should return to the same rig/render pipeline for consistent animation frames. |

Older comparison READMEs contain stale gameplay claims, including a statement that jumping does not exist. Current controller code and current contracts take precedence. Review catalogs also contain alternative, placeholder, and rejected material; catalog size does not establish quality or promotion approval.

**Registry and pipeline follow-ups**

- The unified master manifest does not yet list the newer low-body-punch and leg-sweep sheets. Their active paths resolve, the pixel checks pass, and the dedicated downward-dig contract passes. Consolidating that coverage would make future full audits less error-prone.
- Two required sheet keys have no registered animation consumers in this snapshot: the old punch-jab sheet and animation-polish run sheet. Check other direct texture users before changing their load requirements.
- Eight registered moving Cross aliases have null recovery mappings after the Cross family was removed from the normal stationary sequence. This is a cleanup/reachability finding; it is not established as a player-facing failure.
- Large raw action→settle silhouette scores should not be mistaken for the usual stationary mining route. The current normal-action hold bypasses those settles. Re-test only the routes that can actually play.
- All 22 registered editable Piskel sources validate. Three legacy-core entries have drift warnings (`walk`, `dig-sideways`, `dig-up-sideways`); those warnings do not establish a default Survival scale defect. The Piskel manifest is smaller than the full current Blender/runtime inventory.

**Suggested implementation order and acceptance**

1. Close the flight loop and compare entry/release carriers; add a normal-walk stop comparison and the existing run candidate. These have the strongest current source/routing evidence and reuse the same character.
2. Choose a consistent torch carry/stow behavior, then cover mining, ledges, abilities, fidgets and phase-matched walking/running.
3. Add guard recovery and landing/climb tails; integrate a concise death beat. Keep cooldown, damage, combo timing, fixed 1.2-tile jumping, and flight physics under their existing owners.
4. Compare restrained material/silhouette polish and measure asset residency before expanding the set.

Acceptance should include actual controls in both the main world and a compact cave: repeated walk starts/stops/reversals, Ctrl transitions, jump/flight/release at low and high speed, light on/off during all mining directions and abilities, a full ledge catch/climb/drop, hard/soft landings, and death in an isolated throwaway session. Check the early-game and upgraded mining cadence, default and higher rendering density, reduced-motion settings, and first-use asset loading. Judge recordings at gameplay size. A clean loop or frame comparison alone does not establish those runtime results.

**Validation performed**

Eight focused checks passed: jump/flight motion, Ctrl running, downward dig, held-torch runtime, transition cohesion, level-one dig rhythm/moving scale, impact resolution/hitstop, and cave composition. This is focused coverage, not a repository-wide health result. No new gameplay tests or production changes were introduced.

[Check results](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/character-audit-2026-09-05/checks.json) · [Pixel and transition measurements](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/character-audit-2026-09-05/metrics.json) · [Current registration inventory](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/character-audit-2026-09-05/inventory.json) · [Piskel validation](C:/xampp/_Backups/dig-game-simple/dig-game-dev-env-cleaned/testing/character-audit-2026-09-05/piskel-validation.json)

Silhouette values in the boards use `1 - intersection/union` on alpha masks at the configured display size and origin. They flag pose changes, not perceived quality. Controller offsets, scene lighting, occlusion, effects, playback scaling, and human preference can change the visible result. The generated reel assembles source-clip excerpts with pauses for inspection; it is not a live recording.
