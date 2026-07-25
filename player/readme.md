# Player

player directory.

`PlayerAssetLoader.js` loads selected character profiles, including full source-sheet bounds even when runtime actions use trimmed/reordered segments. Gameplay queues 18 active UAL sheets; the generated UAL manifest retains 21 actions for review and rollback evidence. `UalNativePlayerAnimations.js` creates the weapon-free production motion library and its calm one-shot fidgets.

Idle and actions use the 109px base display size. Walk start/loop/run/stop use
123px so Option C Jog retains the same approximately 0.8-tile visible height
instead of shrinking against idle.

`UalActionContactTimeline.js` turns Phaser animation updates into one deterministic gameplay contact per visible action. Mining, Quickslash, and Thunder mutate tiles only when their authored hand or body contact frame is reached; skipped frames and animation-complete fallback still fire exactly once. Mining cooldown is reserved from action start rather than from the later visual-contact timestamp, preventing the different Jab/Cross contact offsets from rejecting an otherwise valid combo hit.

`UalMiningComboSelector.js` owns the shared resettable UAL mining chain. Repeated side hits advance through the approved punch-only Jab, Cross, Jab, Cross sequence; UP and UP-SIDE use alternating Jab/Cross variants. Changing direction or pausing beyond the configured combo window returns to the first swing in both the main world and compact caves.

`PlayerAssetLoader.js` also queues the generated UAL runtime manifest. Game Rig
v2 consumes its packed-frame hand/foot/pelvis/head markers while preserving the
same spritesheet and animation loading path.

`playerDirectionalTargets.js` is the pure body-AABB resolver for mining aim. It returns only cells immediately outside the rows and columns occupied by the actual physics body, preserving up/down diagonal priority without selecting a floor cell or a cell intersecting the player. It also classifies the real selected tile into `SIDE`, `UP`, `DOWN`, `UP-SIDE`, or `DOWN-SIDE` for shared main-world and cave animation routing.

The promoted directional set stays on the native UAL skeleton: Jab/Cross supplies SIDE, UP, and UP-SIDE, while `OverhandThrow` is retained only for same-facing DOWN and ground-directed Thunder. Hook, the authored kick, and the `Sword_Regular_C` up strike are rejected review/rollback sources, alongside Swim, TreeChopping, Farm Harvest, spell-shot, and NinjaJump. `PlayerKinematicMotionSystem` exposes signed post-collision velocity for shared locomotion transitions and flight banking. The measured 31x75 body and one-cell contact perimeter are authoritative in both world implementations; projected limb-marker validation is diagnostic evidence and visual alignment only, never a gate on an otherwise valid dig.

`SURVIVAL_UAL_PLAYER_ASSET_PROFILE` is the approved default player visual. It promotes the Blender Survivor v2 idle, idle-talk, walk, and complete Superman flight sheets while retaining UAL `Jog_Fwd_Loop` for run and the compatible UAL-retarget action set. Existing `ualNative` / `legacy` save selections migrate to Survivor, while `?character=ualNative` remains the explicit native-placeholder rollback. The 31x75 collider, contacts, action timing, and fist-only policy remain identical to native UAL.
