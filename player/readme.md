# Player

player directory.

`PlayerAssetLoader.js` loads the selected character in WorldLoad, including full
source-sheet bounds even when runtime actions use trimmed/reordered segments.
Every sheet is registered in the runtime catalog as an immutable player-core
pack with its original path and frame geometry; no resize, substitute, or
quality downgrade is permitted. Dedicated Quickslash and Thunder Strike sheets
are excluded while locked. `PlayerAbilityAssetController.js` admits those
spritesheet packs when an existing save owns the upgrade or immediately after
unlock; `PlayerAbilities` will not begin the action or spend GP until the pack
and animation are ready. Shared Jab/Ground Strike sources remain player-core.
Gameplay queues 18 active UAL sheets across the core and unlocked packs; the
generated UAL manifest retains 21 actions for review and rollback evidence.
`UalNativePlayerAnimations.js` creates the weapon-free production motion
library and its calm one-shot fidgets.

Idle and authored standing actions use the 109px base display size. The
production grounded gait and Piskel-composited moving strikes use 123px because
their upper body is normalized by the 109/123 source ratio. This keeps apparent
character height within three pixels across standing attack, Jog, and moving
attack without enlarging the authored attack skeleton.

`PlayerMovement.js` resolves grounded horizontal speed through a short
frame-rate-independent envelope: 120 ms acceleration, 90 ms release, and 150 ms
for a full left/right reversal. `PlayerJumpMotion.js` derives one fixed Spacebar
impulse from gravity and the 1.2-tile height contract, then preserves takeoff
momentum with progressive air steering, gentle release drag, and a stronger
but non-instant reversal. `?jumpMomentum=0` restores the previous direct
airborne response. `PlayerFlightMotion.js`
owns Shift takeoff assist, A/D/W/S acceleration, neutral braking, reversal, and
post-power coast; Flight no longer overwrites upward velocity each frame.
`PlayerLedgeAssist.js` detects collision-safe solid lips while descending. The
authoritative body snaps to the safe hang point immediately while the visible
survivor eases from the airborne position through a six-frame reach/tuck/grip
catch. S/away drops; Space or W queues the Mixamo pull-up after the grip settles.
The deferred ledge sheet warms on descent so first contact does not flash idle.
`?ledgeAssist=0` restores the previous traversal unchanged.
`?smoothGroundRun=0` is the isolated grounded-physics rollback.

`UalActionContactTimeline.js` turns Phaser animation updates into one or more deterministic authored gameplay contacts per visible action. Single-hit mining, Quickslash, and Thunder retain one contact; reviewed multi-hit combos expose every ordered impact, including skipped-frame, completion, and wall-clock fallback coverage. Recovery cannot be replaced until the final authored contact plus the configured delay has passed. The first contact owns cooldown/ability cost/Heavy Punch authority, while later contacts hit the same committed tile without duplicating those per-action effects.

`UalMiningComboSelector.js` owns the shared resettable UAL mining chain. The default Survivor advances repeated stationary SIDE hits through Cross, Jab, Roundhouse, Jab-Elbow, Low Kick, High Kick, Spinning Back Kick, Elbow-Uppercut, Single Elbow, and Hook; exact UP uses Uppercut. Jab-Elbow and Elbow-Uppercut retain both reviewed contacts. UP-SIDE, DOWN-SIDE and DOWN retain their prior families. Changing direction, changing enabled family, or pausing beyond the configured combo window returns to stage one in both the main world and compact caves. `?complexDig=0`, Ctrl+Alt+9, or `__DIG_GAME_COMPLEX_DIG_ANIMATIONS__.setEnabled(false)` restores the legacy SIDE/UP selection on the next action.

`PlayerAssetLoader.js` also queues the generated UAL runtime manifest. Game Rig
v2 consumes its packed-frame hand/foot/pelvis/head markers while preserving the
same spritesheet and animation loading path.

`playerDirectionalTargets.js` is the pure body-AABB resolver for mining aim. It returns only cells immediately outside the rows and columns occupied by the actual physics body, preserving up/down diagonal priority without selecting a floor cell or a cell intersecting the player. It also classifies the real selected tile into `SIDE`, `UP`, `DOWN`, `UP-SIDE`, or `DOWN-SIDE` for shared main-world and cave animation routing.

`mouseMiningTarget.js` projects a pointer world position onto that same
body-adjacent contract. It accepts only in-bounds solid cells beside the real
collider during ordinary mining. While Stellar Lance is active, a distant
pointer instead selects the closest in-bounds body-edge cell on the dominant
cardinal axis, allowing the authoritative projectile to dig through air and
tiles without turning normal mouse mining into a ranged action.

The promoted complex SIDE/UP subset stays on the production 160-bone Survival skeleton and V4 material treatment. Its eleven editable Piskel sources use one shared highlight-preserving tone curve, round-trip the runtime pixels exactly, and keep one fixed 103 px family scale. The measured result matches existing idle/walk median luminance within 0.001, visible height within 0.55 game pixels, and action-to-idle handoff drift within 0.51 game pixels without suppressing intentional kick lift. The prior native Jab/Cross and Blender upward dig remain immediate visual rollback sources; DOWN, diagonals and Thunder retain their existing routing. `PlayerKinematicMotionSystem` exposes signed post-collision velocity for shared locomotion transitions and flight banking. The measured 31x75 body and one-cell contact perimeter are authoritative in both world implementations; projected limb-marker validation is diagnostic evidence and visual alignment only, never a gate on an otherwise valid dig.

`SURVIVAL_UAL_PLAYER_ASSET_PROFILE` is the approved default player visual. It promotes the Blender Survivor v2 idle and idle-talk plus the accepted prone Mixamo flight loop; the prone-v3 Superman sheet remains transition/rollback evidence. Live grounded movement always selects the UAL `Jog_Fwd_Loop` run slot and the compatible UAL-retarget action set. Existing `ualNative` / `legacy` save selections migrate to Survivor, while `?character=ualNative` remains the explicit native-placeholder rollback. The 31x75 collider, contacts, action timing, and fist-only policy remain identical to native UAL.

`PlayerAbilities.js` owns Thunderstrike economy and chain scaling, while its
injected mining-damage provider obtains the normal-hit baseline from the active
world's `DigSystem`. This keeps progression damage, previews, and Thunder on
one authority in both worlds; in `PlayScene` that authority also includes
Stellar Lance projectile transactions. Slam I
consumes the single 2.5x upfront GP cost; Slams II-X cost zero and are rejected
unless the timing runtime explicitly arms the next sequential stage. All ten
slams stay in one vertical lane beginning at the first tile below the player's
body, use the configured base damage curve, and add a bounded +8% combo-local
damage for each successful continuation. Any early, late, or expired follow-up
ends the chain immediately. Citadel Storm adds +10%
Thunderstrike damage without widening the damage footprint.

Quick Slash uses the same authority for its dynamic GP price: 12 GP base,
minus three from Copper, then half price while Bronze's 75% current-GP
threshold is met. It never becomes free. `DigSystem` applies its 2.5x cadence,
180ms floor, and a baseline hit worth 3x the current normal mining hit. Dirt
raises that complete result by 20% to 3.6x; Silver adds 20% cadence with a 150ms
mastery floor. Every slash adds a 240px/s opening impulse on top of current
horizontal speed and preserves the same +240px/s movement bonus while Q remains
held. Steel stacks another +160px/s onto both, for a +400px/s mastered movement
lead. The opening impulse does not stack again until Q is released and a new
slash begins.

Held Quick Slash is composable with powered Flight and action-bar powers. Its
full universal-plus-Steel movement bonus raises powered Flight speed as well as
ground movement, while Flight keeps its own drain and Quick Slash keeps its
per-contact GP price. Celestial Engines continue running independently; Stellar
Lance turns a Quick Slash contact into the configured piercing projectile. A
Thunder Strike chain temporarily owns the single authored player-action visual,
then held Q resumes Quick Slash without being released.

`PlayerAbilities.js` also owns the injected GP-consumption floor. Normal play
has a zero floor. Armed Hardcore injects a one-GP floor only for Flight and
torch sources; Flight admission includes its startup plus current-frame upkeep,
and an active flight stops immediately when it reaches the reserve. Stress,
combat abilities, Wurm hits, rocks, traps, and every other hazard retain the
zero floor and can consume the final GP.

The development God Mode path immediately fills and preserves GP, unlocks
Flight, Quickslash, and Thunderstrike, reports their costs as zero, applies all
constellation ability modifiers, and makes torch drain zero. The dormant legacy
Gem Dash was removed. Space supplies the fixed 1.2-tile jump; powered Flight is
the GP-backed sustained vertical traversal ability.

`PlayerController.getPersistenceData()` snapshots the authoritative physics
body position rather than a tile approximation. Restore bounds-checks the exact
pixel coordinates, resolves any now-solid overlap safely, then restores facing
and exact GP before the first playable frame.

`PlayerSurfaceDropController` consumes a fresh DOWN/S press only while grounded
on the full-width surface. It asks `TileCollisionSystem` to release the
one-way surface only when the complete player footprint is on dedicated
town-floor cells with the configured full AIR row immediately below. Ordinary
mineable tiles begin beneath that clearance instead of intersecting the player
or the surface art. The protected Level 1/Level 2 divider remains blocking.
`?surfaceDrop=0` restores the former collision behavior.

`UalMovingSideDigSelector` promotes grounded LEFT/RIGHT mining and Quickslash
while movement points toward the target. It maps the Survival Jab/Cross combo
and the approved ten-stage complex SIDE family to phase-locked Jog composites
only while resolved horizontal velocity is nonzero. Collision-stopped,
standing, diagonal, airborne, and reverse-moving actions keep their stationary
clips, so a wall cannot create run-in-place skating. `?movingSideDig=0` is the
visual rollback. With phase handoff enabled, it selects the nearest of eight
Jog phases. Normal strikes use 22 smoothed upper-body poses over the same
14-frame Jog advance; the two native double-strike clips use 44 uncompressed
poses and retain contacts at sequence frames 6 and 28. Moving
Quickslash retimes those Piskel frames to the original 16-frame action and
original sequence-4 contact. The moving upper body keeps the stable 109/123
normalization, and moving contacts are body-locked so marker validation cannot
translate the sprite away from its running feet. A 21 px physics-body
stand-off holds only those moving SIDE actions outside a
still-solid target face, then releases immediately when the target is dug or
the action ends. It does not enlarge the collider or change the adjacent-tile
mining reach. All variants return the exact next Jog phase on completion.
`?phaseHandoff=0` keeps the approved moving-dig sheets but restores base-sheet
entry and frame-zero resume.

The unified moving Hook `cross-phase-15` playback holds frame 231 for one
visual tick instead of showing the edge-on frame 232 silhouette. This removes
the single apparent scale collapse without changing cadence, contact frame 235,
Jog phase recovery, or the packed source atlas.

`UalMovingDiagonalDigSelector` applies the same lower-body ownership to grounded
UP-SIDE and DOWN-SIDE mining while moving toward the target. It selects the
nearest of four Jog phases for each aim family, preserves the existing
directional action/contact timing, and publishes the exact Jog resume frame.
Stationary, reverse-moving, airborne, and rollback paths retain their previous
clips. `?movingDiagonalDig=0` disables only this promotion;
`?animationPolish=0` disables the complete polish family.

The 2026-08-25 unified Survival runtime keeps the same animation registration
and gameplay selectors while routing all 43 sheet keys through one V4 render
package. `PlayerAssetSheetCatalog` and `PlayerAssetLoader` accept a per-sheet
cell size so the 192 px, 960-frame moving-combat atlas can coexist with the 42
standard 256 px sheets. Profile identity checks use `characterId`, avoiding
cache-revision module identity splits. `?unifiedAnimation=0` restores the old
mixed profile without changing any selector or controller.

Collider V2 keeps that unified render attached to conservative state-dependent
core envelopes: 31x75 upright, 48x75 locomotion, 44x57 crouch, 40x75 airborne,
and 66x34 powered flight. `PlayerPhysicsBody` preserves the visible
bottom-center anchor across shape changes, rejects any expansion into a solid,
and keeps the crouch pose when overhead clearance is unavailable. Combat limbs
remain visual-only and the solid-cell WebGL mask clips them at tile faces, so
wide punches and kicks do not snag or grant extra mining reach. Vehicle mode
round-trips the active pose metadata. `?colliderV2=0` is the instant rollback.

Transition Cohesion V3 keeps the unified crouch, Flight, and locomotion-polish
packs resident, follows resolved velocity through Jog slowdown, and applies
display geometry plus origin resync before the next world or cave render. This
removes first-use fallback poses and planted-stop skating without changing
movement speed or action timing. `?transitionCohesion=0` restores on-demand
loading for those traversal packs. `PlayerDeferredAnimationAssetController`
keeps the rare ledge climb plus the largest complex and moving-complex mining
atlases out of the idle baseline. Main-world and cave selectors request those
packs at first use and retain a valid core mining fallback while decoding
completes. Complex mining remains warm for 60 seconds after use, preventing
five-second stop/start mining loops from repeatedly decoding large atlases;
automatic idle and torch traversal sheets remain resident.
