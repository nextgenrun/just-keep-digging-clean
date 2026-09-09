# Playscene

Main-world character grounding uses immediate physics velocity for gait state, measured displacement for cadence, and lifecycle-owned neutral appearance and soft contact shadows. See `markdown/2026-09-07-character-grounding-polish.md`.

World layer module â€” playScene.

`PlaySceneSetup` injects `CampfireEvolutionPresentation` into `CampfireSystem`
and `EmberDiscoveryEvolutionView` into `EmberDiscoveryEventSystem`. Their hosts
own cancellation and destruction through the existing scene lifecycle; no new
save state or global effect manager is introduced.

`worldrootSurfaceFraming.js` eases in extra canopy headroom near the ground-only
Root Sanctuary and returns to normal follow underground or farther through
town. It composes with CameraShakeSystem, changes no zoom/HUD/input geometry,
and resizes the existing deadzone without Phaser's scroll-snapping setter.
Scene setup clears its transient state on restart.

## Composition and lifecycle boundary

`ui/scenes/PlayScene.js` now owns Phaser composition. `world/PlayScene.js`
exports only world setup, update, and gameplay adapters. Concrete UI classes
arrive through `PlayScenePorts`; the world layer consumes factories without
importing the UI layer.

`PlaySceneLifecycle.js` replaces the manual shutdown chain with registry-owned
listeners, autosave timing, abortable async work, and reverse-order system
teardown. `PlaySceneFramePhases.js` separates world, presentation, camera, and
lighting boundaries from the authority update. `interactionPriority.js` is the
single pure arbitration rule for Milestone, NPC, Titan, special-tile, event,
Reliquary, Star Pillar, and Understar prompts, preventing independent comparisons from
silently disagreeing.

The production demo bound includes `topAirRows`, so displayed depth 2,000 m is
physically reachable at row 2064. `UnderstarEndingSystem` then suppresses the
ordinary 2,000 m milestone cinematic, reveals the enormous authored world
backdrop, and opens the injected demo-complete overlay on Interact. Discovery
and completion travel through the normal serialized save snapshot.

`PlayerInputHandler` resolves mining targets through the actual player body AABB. The shared resolver is used unchanged by main-world and compact-cave gameplay, so directional aim never selects a tile occupied by the taller UAL collider.

`MouseDigInputController` adds primary-click and held-click mining without
replacing the configured dig key. Pointer hover owns aim only after real mouse
movement, held directional input retakes keyboard ownership, UI hits are
excluded, and quick clicks are buffered through the next game frame. A held
primary button is tracked independently from any one tile, re-emits the normal
cooldown-gated mining request every frame, and retargets valid adjacent tiles
under the live cursor until release or game-canvas exit. Both main world and
compact caves use the same controller; `?mouseDig=0` disables only the pointer
path. Full menus acquire shared UI input priority before appearing and retain it
through their exit tween. Opening any such menu cancels a held mouse dig, and
the event-time Phaser hit list still belongs to UI even when that same click
already hid or destroyed its visible target.

UAL main-world and compact-cave actions share contact-synchronised damage. The default Survivor uses the approved nine-stage complex SIDE chain, alternates unified Blender Dig Up with Mixamo Uppercut for repeated exact-UP hits, and rotates ground strike, low body punch, and leg sweep for repeated DOWN or DOWN-SIDE hits. Cross Punch remains source/review evidence but is absent from gameplay registration after its game-scale contact entered the wall. The resident Jab is the only SIDE decode fallback and prewarms the other active clips, so no legacy punch can appear between complex actions. UP-SIDE retains its previous action, while Quickslash and Thunder remain separate one-contact actions. Every active complex clip is retimed through the existing visible-action cadence and fires its authored authoritative tile contact. `?complexDig=0`, Ctrl+Alt+9, or the runtime global restores the previous SIDE/UP visuals; `?downDigCombo=0` independently restores the former one-clip DOWN family. Stationary ordinary mining holds the completed combat-ready action pose through the cooldown boundary plus a bounded 180 ms handoff grace instead of settling through Idle; movement and non-mining actions retain their authored recovery paths. Both runtimes route every grounded speed through Jog with immediate input-facing, use resolved body velocity for first-step/reversal cadence, apply frame-rate-independent velocity-aware flight pitch and playback, skip soft landing clips, and allow movement to cancel harder landing recovery after its readable prefix. Blocked A/D movement uses the unified UAL wall-push loop while the short authored brace entry/release remains presentation-only.

UAL locomotion cadence and grounded start/stop activity are measured from resolved body displacement, while facing comes from current input. A blocked body therefore stops producing fake jog cycles, and releasing input keeps Jog stride-matched through the short physical slowdown before the planted stop begins. Input intent and facing react on the current frame, while grounded velocity uses the shared 120 ms acceleration, 90 ms release, and 150 ms full-reversal envelope; upgraded or weather-adjusted speed remains stride-matched, and airborne flight timing stays consistent across both world implementations. The production Jog is now Piskel-round-tripped with one uniform 5-source-pixel root correction, a zero-drift bottom row, unchanged 28-frame cadence, and identically transformed rig markers. Its sequence-13/27 plants drive the existing footstep sound plus small material-matched bitmap fragments at the collision-owned floor. Idle and standing actions retain the 109px base presentation; UAL Jog and Piskel moving strikes use a normalized 123px canvas while preserving the same apparent body height. Moving Quickslash reuses the phase-nearest Jog lower body, keeps its original 16-frame/sequence-4 hit timing, and never applies contact-driven sprite translation. Both worlds apply the chosen animation, display size, and origin before beginning rig contact, preventing a one-frame scale or anchor bootstrap mismatch.
Moving SIDE actions also hold the authoritative 31 px body 21 px away from a
still-solid target face in both runtime worlds. The clamp is symmetric, keeps
the target adjacent for mining, releases when the tile is destroyed, and does
not delay input or change damage/reach.

## Tutorial and resume authority

`PlaySceneSetup` keeps the configured player fallback inside Town Square and
never rewrites it to the rejected opening shaft. `PlaySceneUI` restores the
saved body coordinates before auto-start; `startRun` resets to Town Square only
when no valid saved position exists. Main-menu exit awaits the serialized save
queue, so an underground body position, facing, and exact GP value are committed
before scene shutdown.

The persisted Town Square tutorial is created after save application. Its
movement, digging, Money Monster sale, and player-upgrade stages are driven by
the production systems, while completed or skipped saves create no guide UI.

## Hardcore oath lifecycle

`HardcoreModeBridge.js` adapts risk state, HUD, typed modals, paid teleports,
and last-resort unstuck. `HardcoreDeathBridge.js` owns the single lives/death
transaction. A new Hardcore save remains pending until Flight unlocks; a
Casual save may take the same oath through Bobo only after Flight and typed
`YES`. Casual never consumes lives at zero GP.

Once armed, every exact GP change flows through the central death boundary.
Abilities, stress, falling rocks, cave traps, crush boundary, and Wurm hits can
therefore resolve through one lives reducer. Darkness, rapid descent, and
excessive depth build stress; the bridge passes the stable torch intensity so
brighter burn levels reduce darkness stress and recover sanity more strongly.
The bridge also passes cumulative level panic resistance, shifting the visible
`PANIC LINE` deeper while leaving the lighting system's actual depth unchanged.
High stress drains GP. Flight and torch upkeep are the deliberate exception at
the final point: both
stop at exactly 1 GP and cannot restart without spendable GP. Stress, combat
abilities, rocks, traps, the Wurm, and other hazards can still consume that
last point and end the one-life Hardcore run.
The bridge records exact position, fractional GP, and stress every second,
with an immediate checkpoint when GP first falls into the one-GP danger band.
Teleport costs are quoted and charged before movement. Both modes require a
typed `YES` for unstuck, lose half of every carried resource stack, and enter
the configured cooldown.

Death consumes the shared reducer: Hardcore starts at one life and its first
death always reaches zero. There is no free or multi-life restart path. Zero
lives marks the expedition exhausted, records its memorial, and returns to the
Save Vault; the
slot remains intact and exportable until the player explicitly clears it. A
failed life-state write switches the recap to `RETRY SAVE` and keeps every exit
locked until the retry succeeds.
`HardcoreModalStateBridge.js` turns a grave click into the same blocking,
large-panel presentation used by the oath/depth-gate family, supplies every
saved recap page, and restores controls only after explicit close. The world
visual grounds an airborne death record on authoritative terrain and rechecks
that support if the current run digs beneath it.

## Star Refuge sacrifice safety

`StarSanctuaryBridge.js` composes the Star guard with the existing random-event
tile guard. The first attempted Star sacrifice suspends gameplay and opens the
shared approved typed modal; only exact `DESTROY` acknowledges the permanent
loss, and closing or pressing Escape leaves the Star untouched. Afterwards,
every Star still requires a fresh continuous mining hold. The bridge feeds the
current held input and target into the environment guard, so release or target
change resets progress, while the visual layer shows the exact consequence area and
an approved framed percentage meter before normal `DigSystem` damage resumes.
Production territory mode previews the Star's complete owned section; the
14-tile radius is only a defensive fallback when territory authority is absent.

`PlaySceneSetup` also creates the lazy `WorldMapStarTerritorySystem`. Opening M
derives one nearest-Star owner for every discovered underground map cell, shows
the current route, and exposes unidentified signals without naming undiscovered
Stars. A consumed Star remains the permanent severed owner of its territory;
the map cannot reassign that damage or mutate discovery, rewards, or saves.
The bridge gives `DigSystem` the same consumed-territory predicate, so ordinary
materials and their XP stop paying there without cancelling the Star's own
destruction reward. When every Star is consumed, every underground cell has a
consumed owner and is therefore dark, depleted, and subject to 4x darkness
Stress in Hardcore, pushing the player to burn the GP-driven torch or flee.
`StarScarResourcePresentationSystem` follows that same front in the visual
renderers: depleted resource and crack sprites disappear while independent
authored break-core and shard sprites play over camera-visible cells. It never
changes tile collision, HP, rewards, or save data.
`StarSanctuaryBridge` injects a separate `WorldVisualAssetCache` into the scar
view, so the twenty biome palettes load only when visible and release after
their sprites are destroyed; the original four Boot assets remain the readable
fallback during streaming.

## Hardcore Graveborer Wurm

`GraveborerWurmBridge.js` is the sole Phaser/world adapter for the Wurm. Normal
production activation requires an armed Hardcore save, unlocked Flight, and
depth 120 or deeper. Once a warning begins, leaving that depth cannot freeze or
erase the committed encounter. Mining adds source-weighted noise; the Wurm
carves only ordinary resource terrain, gives no rewards, and cannot damage
special blocks, town foundations, bedrock, cave walls, relics, or sky tiles.
Walking, retreat, digging, cover, jumping and Flight can all be used to clear
its committed line; no jump-only or Flight-only response is required.

A hunt now chooses one of five depth-unlocked behavior profiles: Drifter,
Raider, Hunter, Ancient or Broodmother. They vary speed, warning, damage and
persistence (two to five passes). Five independent body scales range from a
Hatchling to a Giant. Every pass retains at least 1.8 seconds of warning and
1.15 seconds of travel. Broodmother adds at most two smaller, independently
warned Wurms using the same controller and view. Saves preserve the selected
variant and active offspring; reloading re-warns committed paths. Developer
selections apply to one hunt. Natural selection resumes afterwards.

Development builds expose the existing generated threat medallion as a summon
button. The exact `?wurm=0|1` and `?wurm10x=0|1` flags plus
`window.__jkdGraveborerWurm` diagnostics exist only when debug mode is enabled;
production ignores those queries and the production builder strips them before
modules load. The 10x profile accelerates noise admission and cooldown activity
for repeated interaction testing; live activity is explicitly one tenth of
that rate. Developer summons and previews are save-isolated. Casual previews
restore Wurm hit GP, while an armed Hardcore preview keeps lethal damage so
permadeath can be tested honestly.

Mining cooldown admission uses the action-start timestamp, while damage and
feedback remain deferred to the authored visual-contact frame. Contact first
resolves against the current body and then falls back to the committed input
direction if animation alignment moved the body; out-of-bounds fallback cells
are never selected. This keeps all four visual combo actions at exactly one hit
each despite their different contact offsets.

Blocked `BEDROCK`, `CAVE_WALL`, and both town-floor contacts use the shared
mining result contract. Normal, native-contact, Quickslash, Living Drill, and
Arc Core attempts in the main world return a silent blocked result. Compact
caves follow the same rule: the unchanged target/contact response and solid
terrain communicate the failed action without a card or `0 damage` float.
Neither path changes damage, collision, or tile state.

`NPCManager` reads the five surface-merchant slots from `townSquareConfig.js`.
They now occupy absolute door-aligned positions across approved Option A instead
of old `spawnTileX` offsets, while the Level 2 Magma Money Monster continues to
use `arcCoreConfig.js` unchanged. The surface Milestone Pillar and nearby
merchant compare Manhattan distance before showing prompts or consuming the
interact key: the closer target wins, and an exact tie remains with the
merchant. An adjacent actionable special tile is sampled before that arbitration
and wins exact ties, keeping the far-left Town Square ascent portal usable beside
the Milestone Pillar.
`NPCManager` publishes a fail-closed interaction-health snapshot for those five
Level-1 merchants: definitions, visuals, prompts, availability, interact input,
and the callable shop surface must all be ready. The separately gated Level-2
Magma Money Monster is intentionally outside that Town Square uptime invariant.


`NPCManager` also delegates presentation to `NPCActivitySystem`: four approved
v11 Piskel quiet frames now form a slow rooted loop, seven planted activity
poses cross-fade in, and at most one merchant performs a large activity at
once. The runtime rewrites all three visual layers to the exact shop anchor,
zero rotation, and fixed display size every frame, so localized sprite motion
cannot translate the merchant. Walking, pacing, roam radii, whole-body bob, and
the former walking query are absent. `?npcActivities=0` restores the prior
baseline.

Game Rig v2 projects hand/foot markers and action hitboxes across the intended
tile-face band as diagnostic evidence. A small capped `visualOffset` can bring
near-misses onto the face without moving the 31x75 physics body, but marker
validation never vetoes a body-adjacent committed dig. Main-world and
compact-cave actions create, update, validate, and clear the same
`PlayerRigContactSystem` lifecycle. The native UAL and Unreal-IK-retargeted
Survival alternative share this gameplay contract; each character choice loads
18 active sheets / 867 frames while the UAL review manifest retains 21 actions.

## UI review harness

`GameInputHandler` owns the Escape edge before overlay-specific Phaser
listeners. `hasEscapeClosableUi.js` snapshots whether that press began over a
modal, closes only the top surface, and consumes the same frame-level
`JustDown`, so closing Inventory or Pause cannot reopen Pause on the same key
press. A later distinct Escape press remains the normal Pause toggle.

Add ?ui-review=1 to the game URL to enable the query-gated production UI review controls. The harness is disabled during normal play and opens the real Pause, Inventory, Shop, Campfire, Milestones, Star Pillar, and Dialog surfaces for visual regression checks. The former Level Up control now demonstrates a short nonblocking HUD pulse; generic Notification review calls are rejected by the production admission gate.

The generic notification carousel remains as a bounded compatibility class,
but `UI_NOTIFICATION_CAROUSEL_CONFIG.enabled = false` is a real construction
and admission gate in production. Tutorial, portal, Star, level, and combo
events therefore create no card or input capture. Explicit Titan and Memory
Reliquary inspection opens the existing Game Dialog only after the player
presses Interact; persistent HUD, Journey, world presentation, and cinematics
remain authoritative for automatic events.

## Authored-world visual benchmark

`PlaySceneSetup` creates the full-depth living backdrop after the master scenic
and ambient-motion systems. `PlaySceneUpdate` advances pooled cool mist/aura and
warm smoke/steam sprites across both active authored regions in world space, so
the background never follows the player. Use `?worldLiving=0` for the narrow
rollback (`?level1Living=0` remains an alias) or `?worldMotion=0` to disable all
optional world motion while keeping the approved static mockup-derived art.

`WorldScenicFacadeSystem` is created after the authoritative tile renderer and
extends the continuous-material treatment from row 75 through the full 5,065-row
model. `DeepWorldLivingBackdropSystem` then adds the separately pooled Level Two
motion pass. Use `?worldFacade=0` for the deep static-material rollback and
`?deepWorldLiving=0` for only the deep motion rollback.

## Star Heart runtime

`PlaySceneSetup` restores `StarHeartProgressionSystem`, syncs talent-owned
Engine roots, preserves the legacy charge fields for save compatibility,
creates the choice overlay and `CelestialEngineController`, and includes the
result in the current save schema.
The physical Star Pillar owns `StarlightTalentTreeView`, split into large Quick
Slash, Thunder Strike, and Celestial Engine pages. Left/Right changes the large
choice on the active page and Up/Down changes pages. Collecting the first star
for a material section opens the Pillar view on that focused branch page and
node once per save slot; later stars in that section never interrupt play. The
ESC menu has no Talents page and exposes the Titan Archive as its progression
collection view.
`PlaySceneUpdate` advances one active Celestial power at a time. The action bar
routes each power to the controller, which atomically spends 100 GP, records the
Heart milestone activation without consuming Celestial Charge, enforces every
configured activation cap, and routes
Wayward and Hollow tile damage through `DigSystem.applyCelestialDamage`, feeds
Stellar Lance's finite-range snapshot and visual listener into normal dig
actions, updates the fixed HUD and runtime-canary snapshot, and supports the
independent `?starHearts=0` rollback. One Wayward activation may contain one to
five independent stars; this is still one GP-paid active power, and re-press
redirection is retired. Hollow Sun deploys three to six independently pulsing
black holes and pulls destroyed-block fragments inward without relocating
intact grid cells. Stellar Lance crosses air and diggable tiles, advances
through three purple visual forms, applies a fresh mining transaction to every
hit, stops at protected terrain or its configured 5-to-8-tile range, and does not alter
Stress or global damage/cadence.
The debug `V` God Mode refreshes this same progression object: all three powers
become freely switchable at the pillar and GP-free, while the permanent
ownership save remains untouched and each activation keeps its normal caps.
Normal saves earn three permanent Hearts at ten mastered constellations and 20
and 50 completed power activations, so every power can eventually be owned
while only one is equipped at a time.

## Thunderstrike chain

`ThunderStrikeActionRuntime.js` and `ThunderStrikeChainState.js` are shared by
the main mine and compact caves. They keep the player action-locked from the
paid charge through every earned continuation, execute each slam on the
authored UAL contact, accept follow-up input only while the timing bar is live,
and disperse the chain immediately on an early, late, or expired press. There
are no timing-miss retries or level setbacks. Held horizontal input cannot
cancel a committed strike; Escape is the explicit cancel and prevents any
pending pre-contact slam from dealing damage. Only the initial cast uses the
normal bounded ability-input buffer; follow-up presses are exact and
unbuffered. While the chain runtime is active, the action-bar entry remains
active and available even after Slam I has spent GP, so mouse input has the
same free continuation access as the keyboard. The Thunderstrike overlay is
limited to the authored timing rail, target window, and moving needle during
the exact continuation phase; charge, impact, and outcome phases add no panel.

## Heavenblocks progression

`PlaySceneSetup` restores permanent relic, island, component, Arc Vault, and
Zenith state; constructs the access/presentation pair; and injects the atomic
`CraftingSystem` into the existing Molten Money Monster overlay. Three
guaranteed pre-1000m relic caches make the first sky route reachable. Island
floors are re-applied after dug-tile restoration, component and Keystone
requirements are never consumed, and `?heavenblocksGameplay=0` disables access
while preserving save-compatible progression data.

## Relic and Titan collection integration

`PlaySceneSetup` injects the live player center into the state-independent
Ancient Relic discovery view, so an awarded token stays in world space and
collects into the real character rather than a fabricated HUD point.
`PlaySceneSetup` also constructs the wallet-backed `TitanClueSystem` after the
retention and upgrade systems. `PlaySceneUI` exposes authoritative Relic/Titan
counts and conditionally adds the real-art 5x5 `TITANS` pause archive, including
the locked-entry locator purchase and saved enable/disable control. Both world
renderers own the same Titan discovery lifecycle and exact-direction provider.
Nearby free guidance is an arrow-only, 72-tile radial resonance that disappears
immediately outside range. An enabled purchased clue reuses that one arrow at
any distance until switched off in ESC. Purchases persist through locked-safe
journal keys and request the normal dug-state autosave, while retention data
remains the only Titan discovery authority.
`PlaySceneUpdate` also arbitrates the remapped interact key between Arc Core,
the milestone pillar, NPCs, unlocked surface Titan plinths, and cave mouths.
The nearest eligible target wins; inspecting a plinth opens a player-requested
Game Dialog and never mutates discovery state.
Opening the pause shell cannot create or replay a Flight guidance card;
onboarding remains in the persistent marker and Next Promise after resume.
`?titanClues=0` hides clue purchasing without deleting purchased keys;
`?titanStatueLore=0` disables surface-plinth prompts and inspection without
changing unlocked trophies or archive lore;
`?titans=0` hides the archive and disables/de-queues all Titan presentation
without deleting saved ids.

## Shadow Miner runtime

`ShadowMinerRuntime` records the player's recent visible trail, then admits a
purple echo at least four tiles away. Its approach is capped at 0.7 tiles per
second and 1.7 seconds; the observing phase lasts at least 6.5 seconds. It
stays at its work position instead of replaying rapidly into the player.
`ShadowMinerWorkLoop` plays resident idle, side-jab and downward-strike frames
and can remove up to three adjacent ordinary dirt/stone blocks at the authored
contact beat. It honors the world/event tile guard, refreshes the renderer,
and requests the normal terrain save. It cannot mine ore or special blocks,
grant items/rewards, spend GP, or change Stress. Missing animation prevents
terrain damage and appears in event health diagnostics.

A distant torch does not instantly dismiss the encounter. The arrival has
1.6 seconds of grace, torch interaction requires proximity within 3.2 tiles,
and exposure remains visibly readable before retreat. Intact Star light keeps
its existing protection. Retreat is capped at 1.2 tiles per second, followed by
a longer fade. The history-based phantom-block view remains available for
replayed historical actions; the observing work loop now changes real ordinary
terrain. Both reuse existing approved player and tile assets.

Casual and calm Hardcore play use the rare ambient profile. Canonical Hardcore
warning and critical stress progressively raise chance, shorten starting delay,
accelerate approach, and strengthen visibility. `values/shadowMiner.js` owns
these constants. Real player depth also selects a shallow/lower/deep/abyss
profile; deeper echoes are stronger and bolder, but every band remains reliably
repelled by light. `?shadowMiner=0` is the rollback. Local testing can use
`?shadowMiner10x=1` for exactly 10x faster first-check, retry, and recurring
admission timers (without multiplying chance a second time), or
`?shadowMiner=review` for deterministic frequency. Local QA can pin a personality
with `?shadowMinerBehavior=lurker`, `mimic`, or `stalker`; remote hosts ignore
that override and retain weighted random selection. Local QA can add
`?shadowMinerDepth=1400` to simulate abyss intensity without moving a save;
remote hosts ignore it. With `?jkd_e2e=1`, key `7`
stages a save-safe walk/dig replay and logs the tell, purple awareness cue,
phantom block/crack/break state, recognition, light pressure/exposure/delay,
directed flee, bounded residue, personality, depth band, rolled target/rates,
and completion
beats. That preview alone
temporarily suspends Guided Opening surface recovery, then restores the original
player tile and tutorial-safety policy with controls, torch, and GP.
`shadowMinerSpawnPlan.js` owns the one-time plan/window/admission assembly so the
runtime state machine remains focused on encounter transitions.

## Integrated cave gameplay

`PlaySceneSetup` constructs `CaveAtmosphereSystem`, `CaveHazardView`,
`CaveHazardSystem`, and `CaveInteriorOcclusionSystem` in that order for both
renderer modes. `PlaySceneUpdate` advances visual rhythm and collision only
while normal gameplay is active; occlusion remains above the hazards until the
cave is discovered.

Main-world `PlaySceneGameplay` and compact-cave `CaveActionAnimationRuntime`
share `UalMovingSideDigSelector`. Grounded side mining while pressing toward
the target uses phase-selected Jog + attack composites for both legacy
Jab/Cross and the approved nine-stage complex SIDE family, then resumes Jog at
the exact next lower-body phase. Two-hit actions retain both contacts without
compressing or skipping the run cycle. Both paths pass the live texture frame
into the shared locomotion selector, which also activates the two-frame planted
turn pivot without delaying facing or input. Compact-cave playback lives in
`CaveLocomotionAnimationRuntime` so its restart/start-frame contract matches the
main world. The existing combo selector, 360 ms minimum action cadence, contact
callback, damage logic, and all non-side directions remain authoritative.
Resolved zero velocity deliberately selects the stationary clip; this prevents
run-in-place when collision has anchored the body at a solid tile face.
The same two runtimes now reject ordinary mining playback until the shared dig
cooldown is ready, so the slower Level-1 rhythm cannot show an empty swing
between authoritative animation contacts.

The main world and compact caves also share the centralized animation-polish
contract. Jog first uses the root-centered, baseline-locked Piskel sheet;
starts/stops use planted two-frame bridges; moving diagonal mining
uses phase-locked Jog legs beneath directional strikes; stationary actions
finish through matched guard/settle clips; soft and hard falls use one authored
landing owner; and collision-blocked walking enters a planted wall brace before
resuming Jog at a stable phase. All changes are visual: input, facing, collider,
damage, reach, and cooldowns remain authoritative and immediate.

## Frame-loop performance

`PlaySceneUpdate` samples the player tile once before movement and once after
movement. The post-movement result is shared by the renderer, cave effects,
camera lighting, glow systems, and the star pillar instead of repeatedly
recalculating and allocating the same tile record. Runtime health samples the
HUD/progression, gameplay, world/environment, visual-effects, and camera/light
phases once every thirty frames; unsampled frames perform no phase clock reads.

`PlaySceneSaveScheduler` now coalesces routine mutation bursts behind a 350 ms
debounce, runs the full snapshot/write in an idle callback, and enforces a 1.8
second maximum delay. Explicit Save, scene transitions, hidden/page-hide events,
and shutdown bypass the routine delay. Runtime health reports capture, write,
and total p95 timing so serialization stalls are distinguishable from rendering.

The pause-menu Titan Archive plus the World Map retain their feature texture
groups only while their exact full-quality views exist. Pending requests are
cancellable, and view objects are destroyed before manager-owned textures are
released. Starlight textures are retained by the physical Star Pillar instead.

When deferred Titan art is absent, `PlaySceneUI` mounts the compact authored
feature loader inside the existing pause content rect. It reports the manager's
exact loaded/total asset count, themed phase, percentage and three visual
milestones; the tab opens automatically after a short real-100% beat.
Closing ESC or changing tabs destroys the loader and cancels the pending group.
Reopening starts from actual texture residency, so it neither leaks a request
nor resumes from a fabricated percentage.

PlayScene passes the resolved depth-economy mode into `UpgradeSystem` and
connects `MilestoneBoardSystem.getBonuses()` to `DigSystem`. Compact CaveScene
configs retain their origin depth and record whether the entry came from Level
Two, while `CaveGameplayController` shares the same Milestone provider.

Meaningful level results stay nonblocking: `PlaySceneUpdate` synchronizes and
refills the expanded GP cap, forwards the exact reward summary to the approved
level presentation, plays the two-step confirmation cue, and queues the save.

Player-character speech is routed from existing state authority rather than a
new polling narrative system. `PlayerVoiceRetentionBridge` maps discovery,
record, earthquake-recap, and expedition-summary events; `PlayerVoiceInventoryBridge`
emits only the rising edge into the final HUD fullness band. Setup and update
also route confirmed Star release, combo, and depth-milestone transitions into
the shared LEO director.

Confirmed resource, special-tile, and Star pickups also cross a presentation-
only descriptor bridge into `LootPickupFxSystem`. Star release forwards its
exact rendered core/light pair only after becoming visible; ordinary Star
destruction suppresses the generic material duplicate. The bridge never grants
loot, advances progress, or writes a save.

During an Ability Block choice, `CelestialActionBarRuntime` temporarily
presents the five eligible sockets as available and reserves normal mining
until the player clicks a socket or presses 1-5. The selected Quick Slash,
Thunder Strike, or Celestial Engine uses its production activation path with
zero GP for twenty seconds; Campfire stays outside the choice and no permanent
talent or progression state is modified.

## Dynamic event review and health

`DynamicEventRuntime` samples the three production controllers, keeps phase
instructions visible, and exposes the local-only EVENTS / F2 panel. Requests
report accepted, queued, started, blocked, cancelled or completed outcomes;
health distinguishes admission gates from stopped updates, missing artwork,
missing work animation and encounters that exceed their phase budget. The
existing runtime canary also samples it. F2 respects custom key bindings.
The E2E harness keeps cave preview on Ctrl+Alt+C when this panel owns F2.
Developer triggers act on the current scene; use the save-free encounter lab
when terrain/GP changes should be isolated. F2 itself does not disable saves.

The lab is `/testing/dynamic-event-sandbox/index.html`. Full details and test
evidence: `markdown/2026-09-05-dynamic-event-polish.md`.

`GraveborerWurmEventBridge` retains the completed parent's pass/hit/offspring
summary before the controller clears its counters. `DynamicEventRuntime`
provides it to the health observer so result cards cannot read the reset count.

The default town-bed flow supersedes automatic main-menu/exit checkpoints and partial expedition saves. TownRestBridge admits a full checkpoint only after sleep and blessing selection at the town bed. Main-menu exit and restart retain the last bed checkpoint. TownRestSavePolicy also excludes compact CaveScene activity.

`SessionAwakeningController` owns the once-per-session entry reveal and repeated town-bed doze/wake presentations, safe input handoff, and teardown. `TownRestBridge` connects the bed's existing clock and suspension; `sessionAwakeningPresentation` samples the dozing curve, clear outdoor time-lapse fades, and three varied wake profiles. See `markdown/2026-09-07-session-awakening.md`.

The Pause overview Save button and Saves-tab Save action both route through
saveGame() to TownRestSystem.showSaveHint(). They close the pause menu,
resume gameplay and request optional bed directions, without writing a checkpoint.
TownRestBridge injects the guidance owner/view and the actual bed arrival test.

TownRestBridge routes blocked menu input to GameInputHandler.discardOverlayInput during sleep, blessing choice and checkpoint completion. Pause/Map presses made during rest cannot reopen a menu on the first resumed gameplay frame.

SignalTrapRuntime owns approach/fuse/detonation and once-only resolution through the existing outcome authority. SignalEventBridge, SignalEventPlanner, SignalMinicamp and SignalEventOutcome wire the Signal encounter to the world, save transaction and death authorities. SurfaceMiaCompanion restores rescued Mia beside Bobo from upgradeLevels.mia. See markdown/2026-09-07-signal-event.md.

Rest acquires the shared UI input lock for the entire sleep/choice/save flow and releases it only on successful completion or teardown; a failed save keeps ownership for retry. Pause and World Map entry refuse active rest. A pending map asset load also postpones bed admission. NPCManager includes the bed distance when choosing which E prompt to show, so a closer bed hides the competing merchant sign.


## Approved presentation patch — 2026-09-09

PlayerDeathCinematic plays a bounded visual fall to a nearby floor, the authored collapse, a final-pose hold, then recap reveal. HardcoreDeathBridge still records death and saves immediately. The death animation pack is prewarmed and pinned. Shutdown cancels delayed presentation.
