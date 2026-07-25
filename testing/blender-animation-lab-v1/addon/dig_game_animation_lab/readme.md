# Dig Game Animation Lab package

Blender sidebar panels:

The default is **Easy Animation Lab**, a focused popup opened from the 3D View
header. It owns the beginner workflow: choose and preview one animation at a
time, choose its Start/Impact/End pose point, select a named major bone, use
the viewport rotate gizmo to place that bone, save the smooth pose, adjust one
body hitbox, compare Survival/Meshy, optionally add gear, and save a review
copy.

It also supports a focused whole-arm pass: choose Left or Right Arm, type a
Start and End frame, save the two poses, then generate the smooth shoulder-to-
hand motion as an editable key on every in-between frame. It does not rewrite
the rest of the character's animation.

The beginner view exposes only named major bones so a pose can be read as a
character adjustment rather than a mass of rig controls. The underlying helper
rig (the thin sticks, dots, and IK controls) is hidden by default; it is not
layered character geometry and does not change the review asset. Advanced tools
may reveal it for technical work, but it remains review-only.

The full technical panels are behind **Show Advanced Tools**:

1. Session and animation catalog
2. Pose and tween authoring
3. Hitbox and tile-fit review
4. Gear and two-hand prop attachments
5. Meshy/candidate mesh fitting experiments
6. Review rendering and isolated draft export

The package targets Blender 5.1 Action Slots and Channelbags. It never depends
on the removed legacy `Action.fcurves` collection.

`stage.py` restores the fixed camera and lighting. `action_api.py` binds the
required Blender 5.1 Action Slot and protects master actions through editable
copies. `meshy_mapping.py` and `meshy_retarget.py` preserve the candidate's
native rig/weights while baking rest-space mapped animation keys.

`simple_ui.py` owns the compact beginner panel. `simple_workspace.py` owns
viewport focus, simple joint selection, review-camera framing, and the visible
header entry point; it never changes production assets.
