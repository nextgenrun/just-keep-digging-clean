"""Beginner-safe controls for the Blender animation lab."""

import bpy
from bpy.props import EnumProperty
from bpy.types import Operator, Panel

from .arm_tween_ui import draw_arm_tween
from .animation_browser import draw_animation_browser
from .hitbox_ops import update_guide
from .mesh_fit_ops import candidate_objects, reference_meshes
from .pose_ops import active_rig
from .session_ops import initialize_contract_state
from .simple_workspace import draw_simple_controls


POSE_FRAMES = {
    "START": "frame_start",
    "CONTACT": "frame_contact",
    "END": "frame_end",
}
def _friendly(value: str) -> str:
    return value.replace("_", " ").replace("-", " ").title()


def _finished(result) -> bool:
    return "FINISHED" in result


def _body_hitbox(state):
    return next(((index, item) for index, item in enumerate(state.hitboxes) if item.kind == "BODY"), (None, None))


def _set_visible(obj, visible: bool) -> None:
    obj.hide_viewport = not visible
    obj.hide_render = not visible


def _prop_objects(group: str):
    return [obj for obj in bpy.data.objects if obj.get("dgal_attachment_group") == group]


class DGAL_OT_simple_select_pose(Operator):
    bl_idname = "dgal.simple_select_pose"
    bl_label = "Choose Pose Point"
    bl_description = "Jump to this important pose and make the character bones editable"
    bl_options = {"REGISTER", "UNDO"}

    role: EnumProperty(items=tuple((role, _friendly(role), "") for role in POSE_FRAMES))

    def execute(self, context):
        state, rig = context.scene.dgal, active_rig(context)
        if not rig:
            self.report({"ERROR"}, "Choose an animation first")
            return {"CANCELLED"}
        if context.object and context.object.mode != "OBJECT":
            bpy.ops.object.mode_set(mode="OBJECT")
        bpy.ops.object.select_all(action="DESELECT")
        rig.hide_viewport = False
        rig.hide_set(False)
        rig.show_in_front = True
        rig.select_set(True)
        context.view_layer.objects.active = rig
        bpy.ops.object.mode_set(mode="POSE")
        state.pose_role = self.role
        context.scene.frame_set(int(getattr(state, POSE_FRAMES[self.role])))
        self.report({"INFO"}, f"Editing the {_friendly(self.role)} pose")
        return {"FINISHED"}


class DGAL_OT_simple_save_pose(Operator):
    bl_idname = "dgal.simple_save_pose"
    bl_label = "Save Current Pose"
    bl_description = "Key every character bone at the selected Start, Impact, or End point"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state = context.scene.dgal
        state.pose_scope = "ALL"
        result = bpy.ops.dgal.insert_pose_key()
        if _finished(result):
            bpy.ops.dgal.apply_interpolation()
            if state.simple_character == "MESHY" and state.candidate_root:
                bpy.ops.dgal.bind_mesh_candidate()
            state.simple_status = f"Saved {_friendly(state.pose_role)} pose"
            self.report({"INFO"}, f"Saved {_friendly(state.pose_role)} pose and smoothed the in-betweens")
        return result


class DGAL_OT_simple_hitbox(Operator):
    bl_idname = "dgal.simple_hitbox"
    bl_label = "Player Hitbox"
    bl_options = {"REGISTER", "UNDO"}

    action: EnumProperty(items=(("UPDATE", "Apply Size", "Update the visible box"), ("TOGGLE", "Show / Hide", "Toggle the box")))

    def execute(self, context):
        state = context.scene.dgal
        if not state.hitboxes:
            initialize_contract_state(state)
        index, body = _body_hitbox(state)
        if body is None:
            self.report({"ERROR"}, "The player body hitbox is missing")
            return {"CANCELLED"}
        state.hitbox_index = index
        if self.action == "UPDATE" or body.guide_object is None:
            try:
                update_guide(context.scene, state, body)
            except ValueError as error:
                self.report({"ERROR"}, str(error))
                return {"CANCELLED"}
            body.guide_object.hide_viewport = False
            self.report({"INFO"}, "Player hitbox updated")
            return {"FINISHED"}
        body.guide_object.hide_viewport = not body.guide_object.hide_viewport
        status = "hidden" if body.guide_object.hide_viewport else "shown"
        self.report({"INFO"}, f"Player hitbox {status}")
        return {"FINISHED"}


class DGAL_OT_simple_set_character(Operator):
    bl_idname = "dgal.simple_set_character"
    bl_label = "Choose Character"
    bl_description = "Switch between the stable Survival body and the approved Meshy test"
    bl_options = {"REGISTER", "UNDO"}

    choice: EnumProperty(items=(("SURVIVAL", "Survival", "Stable placeholder"), ("MESHY", "Meshy", "Approved visual test")))

    def execute(self, context):
        state, rig = context.scene.dgal, active_rig(context)
        if not rig:
            self.report({"ERROR"}, "Choose an animation first")
            return {"CANCELLED"}
        if self.choice == "MESHY":
            if not state.candidate_root and not _finished(bpy.ops.dgal.import_mesh_candidate()):
                return {"CANCELLED"}
            if not state.candidate_root.get("dgal_fit_scale"):
                if not _finished(bpy.ops.dgal.audit_mesh_candidate()):
                    return {"CANCELLED"}
                if not _finished(bpy.ops.dgal.align_mesh_candidate()):
                    return {"CANCELLED"}
            if not _finished(bpy.ops.dgal.bind_mesh_candidate()):
                return {"CANCELLED"}
        candidates = candidate_objects(state)
        sources = reference_meshes(state, rig)
        for obj in sources:
            _set_visible(obj, self.choice == "SURVIVAL")
        for obj in candidates:
            excluded = obj.get("dgal_role") == "mesh-candidate-excluded-prop"
            _set_visible(obj, self.choice == "MESHY" and not excluded)
        state.simple_character = self.choice
        self.report({"INFO"}, f"Showing {_friendly(self.choice)} character")
        return {"FINISHED"}


class DGAL_OT_simple_toggle_prop(Operator):
    bl_idname = "dgal.simple_toggle_prop"
    bl_label = "Toggle Visual Add-on"
    bl_options = {"REGISTER", "UNDO"}

    group: EnumProperty(items=(("pickaxe", "Pickaxe", "Test a fitted pickaxe"), ("gear", "Gear", "Test miner gear")))

    def execute(self, _context):
        if not _prop_objects(self.group):
            return getattr(bpy.ops.dgal, f"create_procedural_{self.group}")()
        return bpy.ops.dgal.toggle_procedural_group(group=self.group)


class DGAL_OT_simple_save_review(Operator):
    bl_idname = "dgal.simple_save_review"
    bl_label = "Save Review Copy"
    bl_description = "Save the Blender copy and review notes without changing the game"
    bl_options = {"REGISTER"}

    def execute(self, context):
        if not context.scene.dgal.session_name and not _finished(bpy.ops.dgal.create_session()):
            return {"CANCELLED"}
        return bpy.ops.dgal.export_review_bundle()


class DGAL_PT_simple(Panel):
    bl_idname = "DGAL_PT_simple"
    bl_label = "Easy Animation Lab"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Animation Lab"

    def draw(self, context):
        layout, state = self.layout, context.scene.dgal
        layout.label(text=state.simple_status, icon="INFO")
        draw_animation_browser(layout, context)

        box = layout.box()
        box.label(text="2. Pick the pose point to edit", icon="ARMATURE_DATA")
        box.label(text="This only chooses a moment in the animation above.", icon="INFO")
        row = box.row(align=True)
        for role, label in (("START", "Start"), ("CONTACT", "Impact"), ("END", "End")):
            operator = row.operator("dgal.simple_select_pose", text=label, depress=state.pose_role == role)
            operator.role = role

        draw_simple_controls(layout)

        box = layout.box()
        box.label(text="4. Save this pose", icon="KEY_HLT")
        box.label(text="Blender smooths the frames between your edits.", icon="INFO")
        row = box.row()
        row.scale_y = 1.35
        row.operator("dgal.simple_save_pose", icon="KEY_HLT")

        draw_arm_tween(layout, state)

        box = layout.box()
        box.label(text="6. Player hitbox", icon="CUBE")
        _index, body = _body_hitbox(state)
        if body:
            row = box.row(align=True)
            row.prop(body, "width_game_px", text="Width")
            row.prop(body, "height_game_px", text="Height")
            row = box.row(align=True)
            operator = row.operator("dgal.simple_hitbox", text="Apply Size", icon="CHECKMARK")
            operator.action = "UPDATE"
            visible = bool(body.guide_object and not body.guide_object.hide_viewport)
            operator = row.operator("dgal.simple_hitbox", text="Hide Box" if visible else "Show Box", icon="HIDE_OFF")
            operator.action = "TOGGLE"
        else:
            box.operator("dgal.create_session", text="Prepare Hitbox", icon="FILE_REFRESH")

        box = layout.box()
        box.label(text="7. Try the look", icon="OUTLINER_OB_ARMATURE")
        row = box.row(align=True)
        for choice, label in (("SURVIVAL", "Survival"), ("MESHY", "Meshy")):
            operator = row.operator("dgal.simple_set_character", text=label, depress=state.simple_character == choice)
            operator.choice = choice
        row = box.row(align=True)
        for group, label in (("pickaxe", "Pickaxe"), ("gear", "Gear")):
            objects = _prop_objects(group)
            visible = bool(objects and not all(obj.hide_viewport for obj in objects))
            text = f"Hide {label}" if visible else f"Add {label}" if not objects else f"Show {label}"
            operator = row.operator("dgal.simple_toggle_prop", text=text)
            operator.group = group

        row = layout.row()
        row.scale_y = 1.45
        row.operator("dgal.simple_save_review", icon="FILE_TICK")
        layout.prop(state, "show_advanced", text="Show Advanced Tools", toggle=True, icon="PREFERENCES")
        if state.show_advanced:
            row = layout.row()
            operator = row.operator("dgal.set_bone_view", text="Show Full Technical Rig", icon="ARMATURE_DATA")
            operator.mode = "TECHNICAL"


CLASSES = (
    DGAL_OT_simple_select_pose,
    DGAL_OT_simple_save_pose,
    DGAL_OT_simple_hitbox,
    DGAL_OT_simple_set_character,
    DGAL_OT_simple_toggle_prop,
    DGAL_OT_simple_save_review,
    DGAL_PT_simple,
)
