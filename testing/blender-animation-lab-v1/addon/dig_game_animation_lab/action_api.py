"""Blender 5.1 Action Slot helpers and non-destructive action copying."""

from __future__ import annotations

import bpy


def animation_action(obj: bpy.types.Object) -> bpy.types.Action | None:
    return obj.animation_data.action if obj and obj.animation_data else None


def assign_action(obj: bpy.types.Object, action: bpy.types.Action | None) -> None:
    """Assign an action and its Blender 5.1 slot so the curves actually evaluate."""
    obj.animation_data_create()
    obj.animation_data.action = action
    if action is not None and action.slots:
        obj.animation_data.action_slot = action.slots[0]


def ensure_lab_action(obj: bpy.types.Object, label: str = "edited") -> bpy.types.Action:
    """Return an editable copy while preserving every consolidated baseline action."""
    obj.animation_data_create()
    action = obj.animation_data.action
    if action is None:
        action = bpy.data.actions.new(f"DGAL_EDIT_{label}")
        action["dgal_editable"] = True
        action["productionChanged"] = False
        assign_action(obj, action)
    elif not bool(action.get("dgal_editable")):
        source_name = action.name
        action = action.copy()
        source_token = source_name.removeprefix("DGAL_")
        action.name = f"DGAL_EDIT_{label}_{source_token}"
        action["dgal_source_action"] = source_name
        action["dgal_editable"] = True
        if "dgal_managed" in action:
            del action["dgal_managed"]
        action["productionChanged"] = False
        action.use_fake_user = True
        assign_action(obj, action)
    return action


def action_slot(obj: bpy.types.Object, action: bpy.types.Action):
    animation_data = obj.animation_data
    slot = getattr(animation_data, "action_slot", None) if animation_data else None
    if slot and any(candidate.as_pointer() == slot.as_pointer() for candidate in action.slots):
        return slot
    for candidate in action.slots:
        if candidate.target_id_type == obj.id_type:
            return candidate
    return action.slots[0] if action.slots else None


def iter_fcurves(obj: bpy.types.Object, action: bpy.types.Action):
    """Yield Blender 5.1 curves through layers, strips, and channelbags."""
    slot = action_slot(obj, action)
    if slot is None:
        return
    for layer in action.layers:
        for strip in layer.strips:
            if not hasattr(strip, "channelbag"):
                continue
            try:
                channelbag = strip.channelbag(slot)
            except RuntimeError:
                channelbag = None
            if channelbag is not None:
                yield from channelbag.fcurves


def key_pose_bone(pose_bone: bpy.types.PoseBone, frame: int) -> None:
    pose_bone.keyframe_insert("location", frame=frame, group=pose_bone.name)
    if pose_bone.rotation_mode == "QUATERNION":
        pose_bone.keyframe_insert("rotation_quaternion", frame=frame, group=pose_bone.name)
    elif pose_bone.rotation_mode == "AXIS_ANGLE":
        pose_bone.keyframe_insert("rotation_axis_angle", frame=frame, group=pose_bone.name)
    else:
        pose_bone.keyframe_insert("rotation_euler", frame=frame, group=pose_bone.name)
    pose_bone.keyframe_insert("scale", frame=frame, group=pose_bone.name)
