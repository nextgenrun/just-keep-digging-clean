"""Bake Survival pose deltas into the approved Meshy rig's rest spaces."""

from __future__ import annotations

import bpy
from mathutils import Matrix, Vector

from .action_api import assign_action
from .meshy_mapping import MESHY_TO_SURVIVAL_BONES


def _depth(bone) -> int:
    depth, parent = 0, bone.parent
    while parent:
        depth, parent = depth + 1, parent.parent
    return depth


def _apply_armature_delta(source_rig, target_rig, source_name, target_name) -> None:
    source_pose = source_rig.pose.bones[source_name].matrix.to_quaternion()
    source_rest = source_rig.data.bones[source_name].matrix_local.to_quaternion()
    target_rest = target_rig.data.bones[target_name].matrix_local
    rotation = (source_pose @ source_rest.inverted() @ target_rest.to_quaternion()).normalized()
    target_bone = target_rig.pose.bones[target_name]
    data_bone = target_bone.bone
    if data_bone.parent:
        local_rest = data_bone.parent.matrix_local.inverted_safe() @ data_bone.matrix_local
        head = (target_bone.parent.matrix @ local_rest).translation
    else:
        head = data_bone.matrix_local.translation
    target_bone.rotation_mode = "QUATERNION"
    target_bone.matrix = Matrix.LocRotScale(head, rotation, Vector((1.0, 1.0, 1.0)))


def _clear_target(target_rig) -> None:
    target_rig.animation_data_create()
    target_rig.animation_data.action = None
    for bone in target_rig.pose.bones:
        for stale in [item for item in bone.constraints if item.name.startswith("DGAL_RETARGET_")]:
            bone.constraints.remove(stale)
        bone.matrix_basis.identity()


def bake_mapped_action(scene, source_rig, target_rig, first: int, last: int) -> tuple[bpy.types.Action, int]:
    """Bake mapped local-space rotations while retaining the Meshy native weights."""
    _clear_target(target_rig)
    source_action = source_rig.animation_data.action if source_rig.animation_data else None
    source_label = source_action.name if source_action else "pose"
    name = f"DGAL_MESHY_{source_label.removeprefix('DGAL_')}"
    old = bpy.data.actions.get(name)
    if old:
        bpy.data.actions.remove(old)
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    action["dgal_meshy_retarget"] = True
    action["dgal_source_action"] = source_label
    action["productionChanged"] = False
    assign_action(target_rig, action)
    pairs = [
        (target_name, source_name)
        for target_name, source_name in MESHY_TO_SURVIVAL_BONES.items()
        if target_rig.pose.bones.get(target_name) and source_rig.pose.bones.get(source_name)
    ]
    pairs.sort(key=lambda pair: _depth(target_rig.data.bones[pair[0]]))
    original = scene.frame_current
    try:
        for frame in range(min(first, last), max(first, last) + 1):
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            for target_name, source_name in pairs:
                bone = target_rig.pose.bones[target_name]
                _apply_armature_delta(source_rig, target_rig, source_name, target_name)
                bone.keyframe_insert("rotation_quaternion", frame=frame, group=target_name)
    finally:
        scene.frame_set(original)
    assign_action(target_rig, action)
    target_rig["dgal_mapped_bones"] = len(pairs)
    target_rig["dgal_retarget_action"] = action.name
    return action, len(pairs)
