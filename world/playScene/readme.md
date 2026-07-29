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

UAL main-world and compact-cave actions share contact-synchronised damage: SIDE keeps Jab/Cross/Jab/Cross, default-Survivor UP and UP-SIDE use the complete 24-frame Piskel-stabilized Blender dig-up, DOWN uses the same-facing ground strike, and Quickslash/Thunder remain one-contact actions. The explicit native rollback keeps its recovered uppercut. Held mining can replace only post-contact recovery after the authoritative cooldown is ready. Both runtimes route every grounded speed through Jog with immediate input-facing, use body velocity for first-step/reversal cadence, apply frame-rate-independent flight banking, skip soft landing clips, and allow movement to cancel harder landing recovery after its readable prefix. Survivor flight uses one continuous loop; the explicit native rollback retains its authored phase chain.

UAL locomotion cadence is measured from resolved body displacement, while grounded start/stop activity comes from the post-collision body and facing comes from current input. A blocked body therefore stops producing fake jog cycles, release and reversal react on the current frame, upgraded or weather-adjusted speed remains stride-matched, and climb/flight timing stays consistent across both world implementations. The base idle/action presentation is 109px, while the UAL Jog uses 123px to preserve the same approximately 0.8-tile visible height.

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
Flight, torch, abilities, stress, falling rocks, cave traps, crush boundary,
and Wurm hits can therefore kill without duplicating delete logic. Darkness,
rapid descent, and excessive depth build stress; high stress drains GP.
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

Add ?ui-review=1 to the game URL to enable the query-gated production UI review controls. The harness is disabled during normal play and opens the real Pause, Inventory, Shop, Campfire, Milestones, Star Pillar, Level Up, Dialog, and Notification surfaces for visual regression checks. Repeated Notification selections rotate through distinct update, notice, and warning samples so the live carousel can be filled and browsed.

Approved transient statuses from the HUD, warnings, and compact caves converge
on one centered notification carousel. Only one card renders at a time; arrows
or Left/Right consume the visible card and advance to another unread entry,
while the cross or `X` clears the complete queue even if a transition is still
running. Arrow art remains dimly visible on a one-card queue. Each selected
card owns seven visible seconds. Full modal surfaces pause and hide the
carousel so their choices and key handling stay authoritative and modal time
never consumes the card's viewing window. The retained major-depth cinematic
also hides the card for its complete centered presentation. Routine retention, discovery,
reward, blocked-action, depth, and combo events remain silent because their
persistent HUD, Journey, world presentation, or cinematic is authoritative.

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
The ESC `TALENTS` tab and the physical Star Pillar share one
`StarlightTalentTreeView`, now split into large Quick Slash, Thunder Strike, and
Celestial Engine pages. Left/Right changes the large choice on the active page;
Up/Down changes pages in both hosts. Collecting the first star for a material
section opens ESC directly on that focused branch page and node once per save
slot; later stars in that section never interrupt play. The Pillar exposes all
three large Engine choices.
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
The nearest eligible target wins; inspecting a plinth uses the approved
notification carousel and never mutates discovery state.
Opening the pause shell suppresses the first-run flight guidance card so it
cannot cover archive entries or the locator purchase control; normal gameplay
restores onboarding guidance on its next update after resume.
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
contract. Jog starts/stops use planted two-frame bridges; moving diagonal mining
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
