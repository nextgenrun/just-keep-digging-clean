# Playscene

World layer module — playScene.

`PlayerInputHandler` resolves mining targets through the actual player body AABB. The shared resolver is used unchanged by main-world and compact-cave gameplay, so directional aim never selects a tile occupied by the taller UAL collider.

UAL main-world and compact-cave actions share contact-synchronised damage: SIDE keeps Jab/Cross/Jab/Cross, UP and UP-SIDE use the recovered uppercut, DOWN uses the same-facing ground strike, and Quickslash/Thunder remain one-contact actions. Held mining can replace only post-contact recovery after the authoritative cooldown is ready. Both runtimes route every grounded speed through Jog with immediate input-facing, use body velocity for first-step/reversal cadence, apply frame-rate-independent flight banking, skip soft landing clips, and allow movement to cancel harder landing recovery after its readable prefix. Survivor flight uses one continuous loop; the explicit native rollback retains its authored phase chain.

UAL locomotion cadence is measured from resolved body displacement, while grounded start/stop activity comes from the post-collision body and facing comes from current input. A blocked body therefore stops producing fake jog cycles, release and reversal react on the current frame, upgraded or weather-adjusted speed remains stride-matched, and climb/flight timing stays consistent across both world implementations. The base idle/action presentation is 109px, while the UAL Jog uses 123px to preserve the same approximately 0.8-tile visible height.

## Hardcore Graveborer Wurm

`GraveborerWurmBridge.js` is the sole Phaser/world adapter for the Wurm. Normal
production activation requires an armed Hardcore save, unlocked Flight, and
depth 120 or deeper. Once a warning begins, leaving that depth cannot freeze or
erase the committed encounter. Mining adds source-weighted noise; the Wurm
carves only ordinary resource terrain, gives no rewards, and cannot damage
special blocks, town foundations, bedrock, cave walls, relics, or sky tiles.
There is no jump counterplay: the telegraphed line is avoided with lateral
flight, retreat, or existing terrain geometry.

There are exactly two developer query flags: `?wurm=0` disables the feature
(`?wurm=1` explicitly enables it), and `?wurm10x=1` bypasses the unfinished
Hardcore/Flight/depth gate while multiplying noise and encounter frequency by
10 for interaction testing. Runtime inspection is available at
`window.__jkdGraveborerWurm`; `snapshot()`, `forceEncounter()`, `addNoise()`,
`setEnabled()`, and `setDevTest10x()` never persist developer flag state.

Mining cooldown admission uses the action-start timestamp, while damage and
feedback remain deferred to the authored visual-contact frame. Contact first
resolves against the current body and then falls back to the committed input
direction if animation alignment moved the body; out-of-bounds fallback cells
are never selected. This keeps all four visual combo actions at exactly one hit
each despite their different contact offsets.

Blocked `BEDROCK`, `CAVE_WALL`, and both town-floor contacts use the shared
mining result contract. Normal, native-contact, Quickslash, Living Drill, and
Arc Core attempts in the main world send one keyed `You cannot break this`
warning plus one `0 damage` hit float, so repeated or area contacts do not stack
duplicate messages. Compact caves show the same warning and zero-damage hit
feedback. Neither path changes damage, collision, or tile state.

`NPCManager` reads the five surface-merchant slots from `townSquareConfig.js`.
They now occupy absolute door-aligned positions across approved Option A instead
of old `spawnTileX` offsets, while the Level 2 Magma Money Monster continues to
use `arcCoreConfig.js` unchanged. The surface Milestone Pillar and nearby
merchant compare Manhattan distance before showing prompts or consuming the
interact key: the closer target wins, and an exact tie remains with the
merchant.

`NPCManager` also delegates presentation to `NPCActivitySystem`: v6 idle videos
remain the calm baseline, approved v8 work/signature/player poses cross-fade in,
and at most two merchants perform activity at once. Pacing is visual-only,
bounded per merchant, returns to the exact shop anchor, and settles before
interaction. `?npcActivities=0` restores the prior baseline;
`?npcWalking=0` keeps poses while disabling pacing.

Game Rig v2 projects hand/foot markers and action hitboxes across the intended
tile-face band as diagnostic evidence. A small capped `visualOffset` can bring
near-misses onto the face without moving the 31x75 physics body, but marker
validation never vetoes a body-adjacent committed dig. Main-world and
compact-cave actions create, update, validate, and clear the same
`PlayerRigContactSystem` lifecycle. The native UAL and Unreal-IK-retargeted
Survival alternative share this gameplay contract; each character choice loads
18 active sheets / 867 frames while the UAL review manifest retains 21 actions.

## UI review harness

Add ?ui-review=1 to the game URL to enable the query-gated production UI review controls. The harness is disabled during normal play and opens the real Pause, Inventory, Shop, Campfire, Milestones, Star Pillar, Level Up, Dialog, and Notification surfaces for visual regression checks.

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
`PlaySceneUpdate` advances one active Engine at a time. The controller consumes
the bound `X` action, enforces every configured activation cap, routes tile
damage through `DigSystem.applyCelestialDamage`, updates the fixed HUD and
runtime canary snapshot, and supports the independent `?starHearts=0` rollback.

## Thunderstrike chain

`ThunderStrikeActionRuntime.js` and `ThunderStrikeChainState.js` are shared by
the main mine and compact caves. They keep the player action-locked from the
paid charge through every earned continuation, execute each slam on the
authored UAL contact, accept follow-up input only while the timing bar is live,
and cancel immediately on an early, late, or expired press. Only the initial
cast uses the normal bounded ability-input buffer; follow-up presses are exact
and unbuffered.

## Heavenblocks progression

`PlaySceneSetup` restores permanent relic, island, component, Arc Vault, and
Zenith state; constructs the access/presentation pair; and injects the atomic
`CraftingSystem` into the existing Molten Money Monster overlay. Three
guaranteed pre-1000m relic caches make the first sky route reachable. Island
floors are re-applied after dug-tile restoration, component and Keystone
requirements are never consumed, and `?heavenblocksGameplay=0` disables access
while preserving save-compatible progression data.

## Integrated cave gameplay

`PlaySceneSetup` constructs `CaveAtmosphereSystem`, `CaveHazardView`,
`CaveHazardSystem`, and `CaveInteriorOcclusionSystem` in that order for both
renderer modes. `PlaySceneUpdate` advances visual rhythm and collision only
while normal gameplay is active; occlusion remains above the hazards until the
cave is discovered.
