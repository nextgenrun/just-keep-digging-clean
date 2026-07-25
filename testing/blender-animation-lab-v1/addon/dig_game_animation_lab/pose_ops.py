"""Insert key poses, edit Blender 5.1 interpolation, and bake tweens."""

from __future__ import annotations

import bpy
from bpy.types import Operator

from .action_api import ensure_lab_action, iter_fcurves, key_pose_bone


ROLE_FRAME = {
    "START": "frame_start",
    "ANTICIPATION": "frame_anticipation",
    "CONTACT": "frame_contact",
    "RECOVERY": "frame_recovery",
    "END": "frame_end",
}


def active_rig(context) -> bpy.types.Object | None:
    rig = context.scene.dgal.active_rig
    if rig and rig.type == "ARMATURE":
        return rig
    return context.object if context.object and context.object.type == "ARMATURE" else None


def scoped_bones(context, rig: bpy.types.Object):
    state = context.scene.dgal
    if state.pose_scope == "ALL":
        return list(rig.pose.bones)
    selected = [bone for bone in rig.pose.bones if bone.select]
    return selected or ([context.active_pose_bone] if context.active_pose_bone else [])


def role_frame(state) -> int:
    return int(getattr(state, ROLE_FRAME[state.pose_role]))


class DGAL_OT_insert_pose_key(Operator):
    bl_idname = "dgal.insert_pose_key"
    bl_label = "Key current pose"
    bl_description = "Insert current selected/all-bone transforms at the chosen key-pose role"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        rig = active_rig(context)
        if not rig:
            self.report({"ERROR"}, "Select or load an editable armature")
            return {"CANCELLED"}
        bones = scoped_bones(context, rig)
        if not bones:
            self.report({"ERROR"}, "No pose bones selected")
            return {"CANCELLED"}
        frame = role_frame(context.scene.dgal)
        ensure_lab_action(rig, "authored")
        for bone in bones:
            key_pose_bone(bone, frame)
        context.scene.frame_set(frame)
        self.report({"INFO"}, f"Keyed {len(bones)} bones at frame {frame}")
        return {"FINISHED"}


class DGAL_OT_apply_interpolation(Operator):
    bl_idname = "dgal.apply_interpolation"
    bl_label = "Apply tween interpolation"
    bl_description = "Set interpolation between the configured start and end on Blender 5.1 channelbags"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state = context.scene.dgal
        rig = active_rig(context)
        action = rig.animation_data.action if rig and rig.animation_data else None
        if not rig or not action:
            self.report({"ERROR"}, "The editable rig has no action")
            return {"CANCELLED"}
        first, last = sorted((state.frame_start, state.frame_end))
        selected_names = {bone.name for bone in scoped_bones(context, rig)} if state.pose_scope == "SELECTED" else set()
        changed = 0
        for curve in iter_fcurves(rig, action):
            if selected_names and not any(f'pose.bones["{name}"]' in curve.data_path for name in selected_names):
                continue
            for point in curve.keyframe_points:
                if first <= point.co.x <= last:
                    point.interpolation = state.interpolation
                    changed += 1
            curve.update()
        context.scene.frame_start, context.scene.frame_end = first, last
        self.report({"INFO"}, f"Updated {changed} keys to {state.interpolation}")
        return {"FINISHED"}


class DGAL_OT_copy_start_to_end(Operator):
    bl_idname = "dgal.copy_start_to_end"
    bl_label = "Close loop seam"
    bl_description = "Copy the evaluated start pose to the end and key it on a lab action"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state = context.scene.dgal
        rig = active_rig(context)
        if not rig:
            self.report({"ERROR"}, "No editable armature")
            return {"CANCELLED"}
        bones = scoped_bones(context, rig) or list(rig.pose.bones)
        context.scene.frame_set(state.frame_start)
        bpy.context.view_layer.update()
        matrices = {bone.name: bone.matrix_basis.copy() for bone in bones}
        context.scene.frame_set(state.frame_end)
        ensure_lab_action(rig, "loop")
        for bone in bones:
            bone.matrix_basis = matrices[bone.name]
            key_pose_bone(bone, state.frame_end)
        self.report({"INFO"}, f"Closed loop seam for {len(bones)} bones")
        return {"FINISHED"}


class DGAL_OT_bake_tween(Operator):
    bl_idname = "dgal.bake_tween"
    bl_label = "Bake evaluated tween"
    bl_description = "Bake evaluated pose and constraints to the duplicated action for every frame"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state = context.scene.dgal
        rig = active_rig(context)
        if not rig:
            self.report({"ERROR"}, "No editable armature")
            return {"CANCELLED"}
        ensure_lab_action(rig, "baked")
        bpy.ops.object.mode_set(mode="OBJECT") if context.object and context.object.mode != "OBJECT" else None
        bpy.ops.object.select_all(action="DESELECT")
        rig.select_set(True)
        context.view_layer.objects.active = rig
        try:
            bpy.ops.nla.bake(
                frame_start=min(state.frame_start, state.frame_end),
                frame_end=max(state.frame_start, state.frame_end),
                step=1,
                only_selected=False,
                visual_keying=True,
                clear_constraints=False,
                clear_parents=False,
                use_current_action=True,
                clean_curves=False,
                bake_types={"POSE"},
            )
        except RuntimeError as error:
            self.report({"ERROR"}, f"Bake failed: {error}")
            return {"CANCELLED"}
        rig.animation_data.action["dgal_baked"] = True
        self.report({"INFO"}, "Baked evaluated tween to the duplicated action")
        return {"FINISHED"}


class DGAL_OT_reset_pose(Operator):
    bl_idname = "dgal.reset_pose"
    bl_label = "Reset selected pose"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        rig = active_rig(context)
        if not rig:
            return {"CANCELLED"}
        bones = scoped_bones(context, rig)
        for bone in bones:
            bone.matrix_basis.identity()
        context.view_layer.update()
        self.report({"INFO"}, f"Reset {len(bones)} bones")
        return {"FINISHED"}


CLASSES = (
    DGAL_OT_insert_pose_key,
    DGAL_OT_apply_interpolation,
    DGAL_OT_copy_start_to_end,
    DGAL_OT_bake_tween,
    DGAL_OT_reset_pose,
)
