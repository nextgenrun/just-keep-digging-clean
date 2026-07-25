"""Author and bake a selected whole-arm motion between two user-set frames."""

import json

import bpy
from bpy.props import EnumProperty
from bpy.types import Operator

from .action_api import ensure_lab_action, iter_fcurves, key_pose_bone
from .bone_labels import resolve_semantic_pose_bone
from .paths import DEFAULT_CONFIG
from .pose_ops import active_rig


ARM_TWEEN = json.loads(DEFAULT_CONFIG.read_text(encoding="utf-8"))["armTween"]
ENDPOINTS = ("START", "END")


def labels() -> dict:
    """Return values-owned labels for the simple whole-arm workflow."""
    return ARM_TWEEN["labels"]


def arm_definition(side: str) -> dict | None:
    """Find one configured whole-arm chain by its stable side id."""
    return next((item for item in ARM_TWEEN["chains"] if item["id"] == side), None)


def arm_bones(rig: bpy.types.Object, side: str) -> list[bpy.types.PoseBone]:
    """Resolve the configured semantic arm chain without renaming rig bones."""
    definition = arm_definition(side)
    if not definition:
        return []
    return [
        bone for semantic_id in definition["semanticBones"]
        if (bone := resolve_semantic_pose_bone(rig, semantic_id))
    ]


def endpoint_frame(state, endpoint: str) -> int:
    """Return the user-entered frame for one arm pose endpoint."""
    return int(state.arm_tween_start if endpoint == "START" else state.arm_tween_end)


def endpoint_is_saved(state, endpoint: str) -> bool:
    """Check whether the current input frame has an explicitly saved arm pose."""
    saved = state.arm_tween_start_keyed_at if endpoint == "START" else state.arm_tween_end_keyed_at
    return int(saved) == endpoint_frame(state, endpoint)


def _active_clip_bounds(state) -> tuple[int, int] | None:
    if state.clips and 0 <= state.clip_index < len(state.clips):
        clip = state.clips[state.clip_index]
        return int(clip.frame_start), int(clip.frame_end)
    return None


def _validate_range(state) -> tuple[int, int] | None:
    first, last = sorted((endpoint_frame(state, "START"), endpoint_frame(state, "END")))
    if last - first < int(ARM_TWEEN["minimumSpanFrames"]):
        return None
    bounds = _active_clip_bounds(state)
    if bool(ARM_TWEEN["rangeMustStayInsideClip"]) and bounds and (first < bounds[0] or last > bounds[1]):
        return None
    return first, last


def _activate_arm(context, rig: bpy.types.Object, side: str) -> list[bpy.types.PoseBone]:
    """Enter Pose Mode and select the complete configured arm chain."""
    if context.object and context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    rig.hide_viewport = False
    rig.hide_set(False)
    rig.select_set(True)
    context.view_layer.objects.active = rig
    if rig.mode != "POSE":
        bpy.ops.object.mode_set(mode="POSE")
    for pose_bone in rig.pose.bones:
        pose_bone.select = False
    bones = arm_bones(rig, side)
    for pose_bone in bones:
        pose_bone.select = True
    definition = arm_definition(side)
    active = resolve_semantic_pose_bone(rig, definition["activeSemanticBone"]) if definition else None
    if active:
        rig.data.bones.active = active.bone
    return bones


def _arm_curves(rig, action, bones):
    names = tuple(f'pose.bones["{bone.name}"]' for bone in bones)
    return [curve for curve in iter_fcurves(rig, action) if any(name in curve.data_path for name in names)]


def _set_generated_interpolation(curves, first: int, last: int, interpolation: str) -> None:
    for curve in curves:
        for point in curve.keyframe_points:
            if first <= point.co.x <= last:
                point.interpolation = interpolation
        curve.update()


def _remove_interior_keys(curves, first: int, last: int) -> None:
    for curve in curves:
        for point in list(curve.keyframe_points):
            if first < point.co.x < last:
                curve.keyframe_points.remove(point)
        curve.update()


def _capture_pose(pose_bone) -> dict:
    data = {
        "location": pose_bone.location.copy(),
        "rotation_mode": pose_bone.rotation_mode,
        "scale": pose_bone.scale.copy(),
    }
    if pose_bone.rotation_mode == "QUATERNION":
        data["rotation"] = pose_bone.rotation_quaternion.copy()
    elif pose_bone.rotation_mode == "AXIS_ANGLE":
        data["rotation"] = pose_bone.rotation_axis_angle[:]
    else:
        data["rotation"] = pose_bone.rotation_euler.copy()
    return data


def _restore_pose(pose_bone, data: dict) -> None:
    pose_bone.location = data["location"]
    pose_bone.rotation_mode = data["rotation_mode"]
    if pose_bone.rotation_mode == "QUATERNION":
        pose_bone.rotation_quaternion = data["rotation"]
    elif pose_bone.rotation_mode == "AXIS_ANGLE":
        pose_bone.rotation_axis_angle = data["rotation"]
    else:
        pose_bone.rotation_euler = data["rotation"]
    pose_bone.scale = data["scale"]


class DGAL_OT_arm_tween_edit_pose(Operator):
    bl_idname = "dgal.arm_tween_edit_pose"
    bl_label = "Edit whole-arm pose"
    bl_description = "Go to this arm endpoint and select its shoulder, arm, forearm, and hand"
    bl_options = {"REGISTER", "UNDO"}

    endpoint: EnumProperty(items=tuple((item, item.title(), "") for item in ENDPOINTS))

    def execute(self, context):
        state, rig = context.scene.dgal, active_rig(context)
        if not rig:
            self.report({"ERROR"}, "Choose an animation first")
            return {"CANCELLED"}
        bones = _activate_arm(context, rig, state.arm_tween_side)
        if not bones:
            self.report({"ERROR"}, "The configured arm chain is not available on this rig")
            return {"CANCELLED"}
        frame = endpoint_frame(state, self.endpoint)
        context.scene.frame_set(frame)
        definition = arm_definition(state.arm_tween_side)
        state.simple_status = f"Editing {definition['label']} at frame {frame}. {labels()['hint']}"
        self.report({"INFO"}, state.simple_status)
        return {"FINISHED"}


class DGAL_OT_arm_tween_save_pose(Operator):
    bl_idname = "dgal.arm_tween_save_pose"
    bl_label = "Save whole-arm pose"
    bl_description = "Key the selected whole-arm pose at this endpoint frame"
    bl_options = {"REGISTER", "UNDO"}

    endpoint: EnumProperty(items=tuple((item, item.title(), "") for item in ENDPOINTS))

    def execute(self, context):
        state, rig = context.scene.dgal, active_rig(context)
        if not rig:
            self.report({"ERROR"}, "Choose an animation first")
            return {"CANCELLED"}
        bones = _activate_arm(context, rig, state.arm_tween_side)
        if not bones:
            self.report({"ERROR"}, "The configured arm chain is not available on this rig")
            return {"CANCELLED"}
        frame = endpoint_frame(state, self.endpoint)
        context.scene.frame_set(frame)
        ensure_lab_action(rig, f"arm-{state.arm_tween_side.lower()}")
        for pose_bone in bones:
            key_pose_bone(pose_bone, frame)
        if self.endpoint == "START":
            state.arm_tween_start_keyed_at = frame
        else:
            state.arm_tween_end_keyed_at = frame
        state.simple_status = f"Saved {arm_definition(state.arm_tween_side)['label']} at frame {frame}"
        self.report({"INFO"}, state.simple_status)
        return {"FINISHED"}


class DGAL_OT_arm_tween_generate(Operator):
    bl_idname = "dgal.arm_tween_generate"
    bl_label = "Generate in-between arm frames"
    bl_description = "Replace only this arm's interior keys with smooth motion baked at every frame"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state, rig = context.scene.dgal, active_rig(context)
        frame_range = _validate_range(state)
        if not rig or not frame_range:
            self.report({"ERROR"}, "Use a valid start/end range inside the selected animation")
            return {"CANCELLED"}
        if not all(endpoint_is_saved(state, endpoint) for endpoint in ENDPOINTS):
            self.report({"ERROR"}, "Save both the start and end arm poses first")
            return {"CANCELLED"}
        bones = _activate_arm(context, rig, state.arm_tween_side)
        if not bones:
            self.report({"ERROR"}, "The configured arm chain is not available on this rig")
            return {"CANCELLED"}
        first, last = frame_range
        action = ensure_lab_action(rig, f"arm-{state.arm_tween_side.lower()}")
        curves = _arm_curves(rig, action, bones)
        _remove_interior_keys(curves, first, last)
        _set_generated_interpolation(curves, first, last, str(ARM_TWEEN["interpolation"]))

        sampled = []
        for frame in range(first, last + 1):
            context.scene.frame_set(frame)
            context.view_layer.update()
            sampled.append((frame, {bone.name: _capture_pose(bone) for bone in bones}))
        for frame, poses in sampled:
            context.scene.frame_set(frame)
            for pose_bone in bones:
                _restore_pose(pose_bone, poses[pose_bone.name])
                key_pose_bone(pose_bone, frame)
        _set_generated_interpolation(_arm_curves(rig, action, bones), first, last, str(ARM_TWEEN["bakedInterpolation"]))
        action["dgal_arm_tween_baked"] = True
        action["dgal_arm_tween_side"] = state.arm_tween_side
        action["dgal_arm_tween_range"] = [first, last]
        context.scene.frame_set(first)
        state.simple_status = f"Generated {last - first + 1} {arm_definition(state.arm_tween_side)['label']} frames"
        self.report({"INFO"}, state.simple_status)
        return {"FINISHED"}


CLASSES = (
    DGAL_OT_arm_tween_edit_pose,
    DGAL_OT_arm_tween_save_pose,
    DGAL_OT_arm_tween_generate,
)
