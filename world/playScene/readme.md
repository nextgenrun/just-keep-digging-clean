# Playscene

World layer module — playScene.

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

UAL main-world and compact-cave actions share contact-synchronised damage: SIDE keeps Jab/Cross/Jab/Cross, default-Survivor UP and UP-SIDE use the complete 24-frame Piskel-stabilized Blender dig-up, DOWN uses the same-facing ground strike, and Quickslash/Thunder remain one-contact actions. The explicit native rollback keeps its recovered uppercut. Held mining can replace only post-contact recovery after the authoritative cooldown is ready. Both runtimes route every grounded speed through Jog with immediate input-facing, use the resolved body velocity for first-step/reversal cadence, apply frame-rate-independent flight banking, skip soft landing clips, and allow movement to cancel harder landing recovery after its readable prefix. Survivor flight uses one continuous loop; the explicit native rollback retains its authored phase chain.

UAL locomotion cadence is measured from resolved body displacement, while grounded start/stop activity comes from the post-collision body and facing comes from current input. A blocked body therefore stops producing fake jog cycles. Input intent and facing react on the current frame, while grounded velocity uses the shared 120 ms acceleration, 90 ms release, and 150 ms full-reversal envelope; upgraded or weather-adjusted speed remains stride-matched, and airborne flight timing stays consistent across both world implementations. The production Jog is now Piskel-round-tripped with one uniform 5-source-pixel root correction, a zero-drift bottom row, unchanged 28-frame cadence, and identically transformed rig markers. Its sequence-13/27 plants drive the existing footstep sound plus small material-matched bitmap fragments at the collision-owned floor. Idle and standing actions retain the 109px base presentation; UAL Jog and Piskel moving strikes use a normalized 123px canvas while preserving the same apparent body height. Moving Quickslash reuses the phase-nearest Jog lower body, keeps its original 16-frame/sequence-4 hit timing, and never applies contact-driven sprite translation. Both worlds apply the chosen animation, display size, and origin before beginning rig contact, preventing a one-frame scale or anchor bootstrap mismatch.
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

`HardcoreModeBridge.js` adapts Hardcore state, HUD, typed modals, paid
teleports, and last-resort unstuck. `HardcoreDeathBridge.js` owns the single
permanent-death transaction. A new Hardcore save remains pending until Flight
unlocks; a Casual save may make the same irreversible oath through Bobo only
after Flight and a typed `YES`. Casual never dies at zero GP.

Once armed, every exact GP change flows through the central death boundary.
Abilities, stress, falling rocks, cave traps, crush boundary, and Wurm hits can
therefore kill without duplicating delete logic. Darkness, rapid descent, and
excessive depth build stress; high stress drains GP. Flight and torch upkeep
are the deliberate exception at the final point: both
stop at exactly 1 GP and cannot restart without spendable GP. Stress, combat
abilities, rocks, traps, the Wurm, and other hazards can still consume that
last point and trigger permadeath.
The bridge records exact position, fractional GP, and stress every second,
with an immediate checkpoint when GP first falls into the one-GP danger band.
Teleport costs are quoted and charged before movement. Both modes require a
typed `YES` for unstuck, lose half of every carried resource stack, and enter
the configured cooldown.

Death captures the exact position, full retention-stat snapshot, every stored
Journey achievement, Hardcore run counters, cause, depth, and Wurm encounters
before any purge. The image-backed result pages remain reviewable while erase
finishes, then offer `TRY AGAIN` or `BACK TO MENU`. Retry creates a fresh
Hardcore save in the same slot, skips the completed-player tutorial choice, and
still waits for Flight before arming. The memorial record lives outside the
slot, so that grave also appears if the player starts Casual in the same slot.
`HardcoreModalStateBridge.js` turns a grave click into the same blocking,
large-panel presentation used by the oath/depth-gate family, supplies every
saved recap page, and restores controls only after explicit close. The world
visual grounds an airborne death record on authoritative terrain and rechecks
that support if the current run digs beneath it.

## Hardcore Graveborer Wurm

`GraveborerWurmBridge.js` is the sole Phaser/world adapter for the Wurm. Normal
production activation requires an armed Hardcore save, unlocked Flight, and
depth 120 or deeper. Once a warning begins, leaving that depth cannot freeze or
erase the committed encounter. Mining adds source-weighted noise; the Wurm
carves only ordinary resource terrain, gives no rewards, and cannot damage
special blocks, town foundations, bedrock, cave walls, relics, or sky tiles.
There is no jump counterplay: the telegraphed line is avoided with lateral
flight, retreat, or existing terrain geometry.

One encounter is a depth-frozen hunt of two to six passes. Every pass marks and
commits a fresh line, exits completely, then retargets for the next warning.
The shallow warning is capped at 3.6 seconds and late deep passes compress to
1.2 seconds; breach travel scales from 1.9 seconds to roughly half a second.
A direct head strike leaves only 4% GP on the first shallow pass, executes an
already wounded player, and becomes a full-GP kill at depth. Body contact
removes most GP and becomes lethal on late deep passes. Swept collision closes
low-FPS tunnelling without enlarging the hit circles, so every committed line
remains dodgeable by clearing it before the breach.

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

`PlaySceneSetup` restores `StarHeartProgressionSystem`, connects constellation
mastery and newly collected sky stars, creates the choice overlay and
`CelestialEngineController`, and includes the result in the current save schema.
The physical Star Pillar owns `StarlightTalentTreeView`, split into large Quick
Slash, Thunder Strike, and Celestial Engine pages. Left/Right changes the large
choice on the active page and Up/Down changes pages. Collecting the first star
for a material section opens the Pillar view on that focused branch page and
node once per save slot; later stars in that section never interrupt play. The
ESC menu has no Talents page and exposes the Titan Archive as its progression
collection view.
`PlaySceneUpdate` advances one active Engine at a time. The controller consumes
the bound `X` action, enforces every configured activation cap, routes tile
damage through `DigSystem.applyCelestialDamage`, updates the fixed HUD and
runtime canary snapshot, and supports the independent `?starHearts=0` rollback.
The debug `V` God Mode refreshes this same progression object: all three Engines
become freely switchable at the pillar and charge-free, while the permanent
ownership save remains untouched and each activation keeps its normal caps.
Normal saves earn three permanent Hearts at ten mastered constellations and 20
and 50 completed Engine activations, so every Engine can eventually be owned
while only one is equipped at a time.

## Thunderstrike chain

`ThunderStrikeActionRuntime.js` and `ThunderStrikeChainState.js` are shared by
the main mine and compact caves. They keep the player action-locked from the
paid charge through every earned continuation, execute each slam on the
authored UAL contact, accept follow-up input only while the timing bar is live,
and disperse the chain immediately on an early, late, or expired press. There
are no timing-miss retries or level setbacks. Horizontal movement or Escape
cancels immediately, restores control, and prevents any pending pre-contact
slam from dealing damage. Only the initial cast uses the normal bounded
ability-input buffer; follow-up presses are exact and unbuffered.

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

## Integrated cave gameplay

`PlaySceneSetup` constructs `CaveAtmosphereSystem`, `CaveHazardView`,
`CaveHazardSystem`, and `CaveInteriorOcclusionSystem` in that order for both
renderer modes. `PlaySceneUpdate` advances visual rhythm and collision only
while normal gameplay is active; occlusion remains above the hazards until the
cave is discovered.

Main-world `PlaySceneGameplay` and compact-cave `CaveActionAnimationRuntime`
share `UalMovingSideDigSelector`. Grounded side mining while pressing toward
the target uses phase-selected 14-frame Jog + Jab/Cross composites, then resumes
Jog at the exact next lower-body phase. Both paths pass the live texture frame
into the shared locomotion selector, which also activates the two-frame planted
turn pivot without delaying facing or input. Compact-cave playback lives in
`CaveLocomotionAnimationRuntime` so its restart/start-frame contract matches the
main world. The existing combo selector, 360 ms minimum action cadence, contact
callback, damage logic, and all non-side directions remain authoritative.

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
