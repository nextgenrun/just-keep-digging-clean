# UAL native player runtime

Lossless WebP sprite sheets generated from 512px Blender renders, cropped with
one fixed camera rectangle, and downsampled once to 256px frames. Gameplay uses
a 109px base display size and 123px for walk start/loop/run/stop, keeping both
idle and the shorter-alpha Jog presentation near the 0.8-tile target while
retaining clean supersampling.

The UAL sources are authored at 24 fps and sampled into 30 fps runtime frames.
The 23-action / 987-frame manifest is review truth; gameplay loads the 19
approved sheets / 882 frames. The active directional set uses the punch-only
Jab/Cross/Jab/Cross side chain, `Melee_Hook` for UP and UP-SIDE,
and `OverhandThrow` for DOWN and Thunder. `TreeChopping_Loop`, the authored
kick, and `Sword_Regular_C` remain rejected review/rollback actions and are not
loaded by the game. Normal walking uses selected option C `Jog_Fwd_Loop`. No
sword, pickaxe, weapon socket, or weapon layer is present.
`manifest.json` is the generated asset contract and
stores one alpha bound per frame plus packed-frame hand, foot, pelvis, and head
markers for contact-aware gameplay tuning. Rejected review actions retain their
honest marker evidence; missing coverage is never invented.

Game Rig v2 uses projected hand and foot contacts, separate attack/contact
hitboxes, and capped tile-face visual alignment without changing the movement
body. Marker validation is diagnostic only and cannot veto a valid committed
dig. Cooldown is admitted from action start while tile mutation remains aligned
to the visual contact, so every punch in the four-hit chain applies once despite
different Jab/Cross offsets. Superseded source sheets may remain on disk for
review or rollback but are absent from the 19-sheet preload. At runtime, the
fixed 31x75 body and zero-pixel grounded offset remain authoritative
while post-collision displacement stride-matches locomotion and flight cadence
to the 94px tile world in both PlayScene and compact caves.

The approved `survival-ual-player-v1` alternative replaces only the rendered
body. Unreal IK Retargeter supplies its motion deformation, while its 19 sheets /
882 frames preserve this runtime's animation keys, scale, collider, cooldown,
contact, and diagnostic-marker behavior.
