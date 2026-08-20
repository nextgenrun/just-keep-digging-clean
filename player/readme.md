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
impulse from gravity and the 1.2-tile height contract. `PlayerFlightMotion.js`
owns Shift takeoff assist, A/D/W/S acceleration, neutral braking, reversal, and
post-power coast; Flight no longer overwrites upward velocity each frame.
`?smoothGroundRun=0` is the isolated grounded-physics rollback.

`UalActionContactTimeline.js` turns Phaser animation updates into one deterministic gameplay contact per visible action and exposes whether that contact has fired. Mining, Quickslash, and Thunder mutate tiles only at authored contact; skipped frames and animation-complete fallback still fire exactly once. Once contact plus the configured recovery delay have passed and `DigSystem` confirms the action-start cooldown is ready, held mining may replace only the visible recovery with the next action without replaying the old contact.

`UalMiningComboSelector.js` owns the shared resettable UAL mining chain. The default Survivor advances repeated stationary SIDE hits through Cross, Jab, Roundhouse, Jab-Elbow, Low Kick, High Kick, Spinning Back Kick, Elbow-Uppercut, Single Elbow, and Hook; exact UP uses Uppercut. UP-SIDE, DOWN-SIDE and DOWN retain their prior families. Changing direction, changing enabled family, or pausing beyond the configured combo window returns to stage one in both the main world and compact caves. `?complexDig=0`, Ctrl+Alt+9, or `__DIG_GAME_COMPLEX_DIG_ANIMATIONS__.setEnabled(false)` restores the legacy SIDE/UP selection on the next action.

`PlayerAssetLoader.js` also queues the generated UAL runtime manifest. Game Rig
v2 consumes its packed-frame hand/foot/pelvis/head markers while preserving the
same spritesheet and animation loading path.

`playerDirectionalTargets.js` is the pure body-AABB resolver for mining aim. It returns only cells immediately outside the rows and columns occupied by the actual physics body, preserving up/down diagonal priority without selecting a floor cell or a cell intersecting the player. It also classifies the real selected tile into `SIDE`, `UP`, `DOWN`, `UP-SIDE`, or `DOWN-SIDE` for shared main-world and cave animation routing.

`mouseMiningTarget.js` projects a pointer world position onto that same
body-adjacent contract. It accepts only in-bounds solid cells beside the real
collider, so click digging cannot reach through the player or mine at range.

The promoted complex SIDE/UP subset stays on the production 160-bone Survival skeleton and V4 material treatment. The prior native Jab/Cross and Blender upward dig remain immediate visual rollback sources; DOWN, diagonals and Thunder retain their existing routing. `PlayerKinematicMotionSystem` exposes signed post-collision velocity for shared locomotion transitions and flight banking. The measured 31x75 body and one-cell contact perimeter are authoritative in both world implementations; projected limb-marker validation is diagnostic evidence and visual alignment only, never a gate on an otherwise valid dig.

`SURVIVAL_UAL_PLAYER_ASSET_PROFILE` is the approved default player visual. It promotes the Blender Survivor v2 idle and idle-talk plus the accepted prone Mixamo flight loop; the prone-v3 Superman sheet remains transition/rollback evidence. Live grounded movement always selects the UAL `Jog_Fwd_Loop` run slot and the compatible UAL-retarget action set. Existing `ualNative` / `legacy` save selections migrate to Survivor, while `?character=ualNative` remains the explicit native-placeholder rollback. The 31x75 collider, contacts, action timing, and fist-only policy remain identical to native UAL.

`PlayerAbilities.js` owns Thunderstrike economy and damage authority. Slam I
consumes the single 3x upfront GP cost; Slams II-X cost zero and are rejected
unless the timing runtime explicitly arms the next sequential stage. All ten
slams stay in one vertical lane beginning at the first tile below the player's
body, use the configured base damage curve, and compound another +20%
combo-local damage for each successful continuation. Any early, late, or
expired follow-up ends the chain immediately. Citadel Storm adds +10%
Thunderstrike damage without widening the damage footprint.

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
to phase-locked Jog composites even when collision has reduced resolved
velocity to zero. Standing, diagonal, airborne, and reverse-moving actions keep
their existing clips. `?movingSideDig=0` is the visual rollback. With phase
handoff enabled, it selects the nearest of eight Jog phases. Normal strikes use
22 smoothed upper-body poses over the same 14-frame Jog advance; moving
Quickslash retimes those Piskel frames to the original 16-frame action and
original sequence-4 contact. The moving upper body keeps the stable 109/123
normalization, and moving contacts are body-locked so marker validation cannot
translate the sprite away from its running feet. An 18 px physics-body
stand-off holds only those moving SIDE actions outside a
still-solid target face, then releases immediately when the target is dug or
the action ends. It does not enlarge the collider or change the adjacent-tile
mining reach. All variants return the exact next Jog phase on completion.
`?phaseHandoff=0` keeps the approved moving-dig sheets but restores base-sheet
entry and frame-zero resume.

`UalMovingDiagonalDigSelector` applies the same lower-body ownership to grounded
UP-SIDE and DOWN-SIDE mining while moving toward the target. It selects the
nearest of four Jog phases for each aim family, preserves the existing
directional action/contact timing, and publishes the exact Jog resume frame.
Stationary, reverse-moving, airborne, and rollback paths retain their previous
clips. `?movingDiagonalDig=0` disables only this promotion;
`?animationPolish=0` disables the complete polish family.
