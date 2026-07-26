# Player

player directory.

`PlayerAssetLoader.js` loads selected character profiles, including full source-sheet bounds even when runtime actions use trimmed/reordered segments. Gameplay queues 18 active UAL sheets; the generated UAL manifest retains 21 actions for review and rollback evidence. `UalNativePlayerAnimations.js` creates the weapon-free production motion library and its calm one-shot fidgets.

Idle and actions use the 109px base display size. The production grounded gait
always uses the 123px UAL Option C Jog run slot, preserving the same
approximately 0.8-tile visible height instead of shrinking against idle.

`UalActionContactTimeline.js` turns Phaser animation updates into one deterministic gameplay contact per visible action and exposes whether that contact has fired. Mining, Quickslash, and Thunder mutate tiles only at authored contact; skipped frames and animation-complete fallback still fire exactly once. Once contact plus the configured recovery delay have passed and `DigSystem` confirms the action-start cooldown is ready, held mining may replace only the visible recovery with the next action without replaying the old contact.

`UalMiningComboSelector.js` owns the shared resettable UAL mining chain. Repeated side hits advance through the approved punch-only Jab, Cross, Jab, Cross sequence; UP and UP-SIDE retain alternating action keys while the default Survivor maps both to its complete Piskel-stabilized Blender dig-up clip. Changing direction or pausing beyond the configured combo window returns to the first swing in both the main world and compact caves.

`PlayerAssetLoader.js` also queues the generated UAL runtime manifest. Game Rig
v2 consumes its packed-frame hand/foot/pelvis/head markers while preserving the
same spritesheet and animation loading path.

`playerDirectionalTargets.js` is the pure body-AABB resolver for mining aim. It returns only cells immediately outside the rows and columns occupied by the actual physics body, preserving up/down diagonal priority without selecting a floor cell or a cell intersecting the player. It also classifies the real selected tile into `SIDE`, `UP`, `DOWN`, `UP-SIDE`, or `DOWN-SIDE` for shared main-world and cave animation routing.

The promoted directional set stays on the native UAL skeleton: Jab/Cross supplies SIDE, UP, and UP-SIDE, while `OverhandThrow` is retained only for same-facing DOWN and ground-directed Thunder. Hook, the authored kick, and the `Sword_Regular_C` up strike are rejected review/rollback sources, alongside Swim, TreeChopping, Farm Harvest, spell-shot, and NinjaJump. `PlayerKinematicMotionSystem` exposes signed post-collision velocity for shared locomotion transitions and flight banking. The measured 31x75 body and one-cell contact perimeter are authoritative in both world implementations; projected limb-marker validation is diagnostic evidence and visual alignment only, never a gate on an otherwise valid dig.

`SURVIVAL_UAL_PLAYER_ASSET_PROFILE` is the approved default player visual. It promotes the Blender Survivor v2 idle, idle-talk, and latest face-down prone-v3 Superman flight sheet; its separate Blender walk remains loaded as review/rollback evidence, while live grounded movement always selects the UAL `Jog_Fwd_Loop` run slot and the compatible UAL-retarget action set. Existing `ualNative` / `legacy` save selections migrate to Survivor, while `?character=ualNative` remains the explicit native-placeholder rollback. The 31x75 collider, contacts, action timing, and fist-only policy remain identical to native UAL.

`PlayerAbilities.js` owns Thunderstrike economy and damage authority. Slam I
consumes the single 3x upfront GP cost; Slams II and III cost zero and are
rejected unless the timing runtime explicitly arms the next sequential stage.
All three slams begin at the first tile below the player's body and scale the
same column damage by 1x, 3x, then 10x.

The development God Mode path immediately fills and preserves GP, unlocks
Flight, Quickslash, and Thunderstrike, reports their costs as zero, applies all
constellation ability modifiers, and makes torch drain zero. The dormant legacy
Gem Dash fields are not a bound or advertised player ability.
