"""Create reversible per-bone IK controls for pose authoring."""

from __future__ import annotations

import bpy
from bpy.types import Operator

from .collections import ensure_lab_collections, tag_object
from .pose_ops import active_rig


def _selected_bone(context, rig):
    return context.active_pose_bone or next((bone for bone in rig.pose.bones if bone.bone.select), None)


class DGAL_OT_add_ik_control(Operator):
    bl_idname = "dgal.add_ik_control"
    bl_label = "Pin selected bone with IK"
    bl_description = "Create a movable lab-only IK target at the selected bone tail"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state = context.scene.dgal
        rig = active_rig(context)
        bone = _selected_bone(context, rig) if rig else None
        if not rig or not bone:
            self.report({"ERROR"}, "Select one pose bone")
            return {"CANCELLED"}
        collections = ensure_lab_collections()
        target = bpy.data.objects.new(f"DGAL_IK_{bone.name}", None)
        target.empty_display_type = "SPHERE"
        target.empty_display_size = max(0.03, bone.length * 0.18)
        target.location = rig.matrix_world @ bone.tail
        collections["DGAL_GUIDES"].objects.link(target)
        tag_object(target, "ik-control", state.session_name)
        constraint = bone.constraints.new("IK")
        constraint.name = f"DGAL_IK_{bone.name}"
        constraint.target = target
        constraint.chain_count = state.offhand_chain_count
        context.view_layer.objects.active = target
        target.select_set(True)
        self.report({"INFO"}, f"Created IK control for {bone.name}")
        return {"FINISHED"}


class DGAL_OT_remove_bone_controls(Operator):
    bl_idname = "dgal.remove_bone_controls"
    bl_label = "Remove lab bone controls"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        rig = active_rig(context)
        removed = 0
        if rig:
            for bone in rig.pose.bones:
                for constraint in list(bone.constraints):
                    if constraint.name.startswith("DGAL_"):
                        bone.constraints.remove(constraint)
                        removed += 1
        for obj in list(bpy.data.objects):
            if obj.name.startswith("DGAL_IK_"):
                bpy.data.objects.remove(obj, do_unlink=True)
        self.report({"INFO"}, f"Removed {removed} lab constraints")
        return {"FINISHED"}


CLASSES = (DGAL_OT_add_ik_control, DGAL_OT_remove_bone_controls)

