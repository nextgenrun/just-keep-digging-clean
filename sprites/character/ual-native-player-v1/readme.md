# UAL native player v1

Production player character rendered from the Quaternius UAL1 and UAL2 native
65-joint mannequins. The promoted Dig Game directional pass preserves native
skeleton motion and selects weapon-free clips for SIDE, UP, UP-SIDE, DOWN, and
flight; no active retarget or weapon model is loaded for this character.

The source mannequin is shown from its native right-facing side view. Phaser
uses `flipX` for left-facing gameplay. Game Rig v2 also projects both hands,
both feet, pelvis, and head through that same camera on every frame. The fixed
production crop, material, lighting, frame size, display size, and collider are recorded in
`runtime/manifest.json` and `values/ualNativePlayerAssetProfile.js`.

Every action uses one fixed-scale 448px source window packed into 256px
lossless WebP cells. Idle and actions use the 109px base display size; walk
start/loop/run/stop use 123px because the Jog render has shorter alpha bounds.
Both presentations produce an approximately 0.8-tile visible figure beside
94px blocks. Wide fly, roll, and death poses keep the same physical scale. The
measured 31x75 body and padded foot origin stay stable across the library.

Runtime cadence is driven by measured post-collision displacement rather than
input velocity. Walk, run, climb, and flight therefore match the 94px grid even
when tiles, weather, upgrades, or cave walls change actual movement.

The selected normal-walk replacement is native `Jog_Fwd_Loop` (walk review
option C), evaluated at the walk contract's 200px/s and 1.55-tile stride. Run
temporarily keeps the same source clip and physical stride under a distinct
animation key, avoiding a cadence drop at the 270px/s threshold while the
expanded tuning lab reviews a genuinely different run replacement.

Gameplay loads 19 approved sheets / 882 frames. The 23-action / 987-frame
manifest also retains review evidence for the rejected `TreeChopping_Loop`,
the 26-frame `Authored_Grounded_Side_Kick_v1`, and the `Sword_Regular_C` up
strike. The active side combo is punch-only Jab/Cross/Jab/Cross;
UP and UP-SIDE use `Melee_Hook`, and DOWN reuses the `OverhandThrow` ground strike.
Mining cooldown is anchored to action start while damage waits for the visual
contact. Projected rig-marker validation remains diagnostic and cannot cancel
an otherwise valid body-adjacent dig.

The sibling `survival-ual-player-v1` alternative puts this same active motion
and gameplay contract on the approved Survival body through Unreal Engine IK
Rig / IK Retargeter, with 19 runtime sheets and 882 frames.

Source license: CC0 1.0 Universal. See `License.txt`.
