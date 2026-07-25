# Blender pipelines

Reusable Blender helpers used by the date-stamped tools in `/ai-tools/`.

`ualGameRigRetarget.py` retains the reversible contact-window hand-IK presets
used during clip evaluation. The promoted directional-combo v3 runtime does not
apply them: it uses native Jab/Cross and OverhandThrow motion instead.

`ualAuthoredKick.py` reads `values/ualNativeAuthoredKick.json` and adds the
grounded, no-root-travel side-kick experiment to a frozen native guard pose.
That clip is rejected and remains review/rollback evidence only; active SIDE,
UP, and UP-SIDE gameplay is punch-only.

`ualSurvivalSkin.py` is the rejected direct-Blender deformation experiment. It
is retained for diagnosis but is not a production render path. The approved
Survival alternative transfers the 17 unique active UAL motions with Unreal
Engine IK Rig / IK Retargeter, then Blender renders the resulting FBX carriers
into 18 gameplay sheets / 867 frames. Run reuses the retargeted Jog carrier;
the authored kick and `Sword_Regular_C` up strike are excluded before retarget.

`ualRigMarkers.py` projects both hands, both feet, pelvis, and head through the
production orthographic camera for every rendered frame. The packer transforms
those points through the exact fixed crop into final 256px frame coordinates.
Their runtime validation is diagnostic and may drive capped visual alignment;
it never gates body-adjacent mining. Cooldown begins at action start while tile
damage remains synchronized to the authored visual contact.
