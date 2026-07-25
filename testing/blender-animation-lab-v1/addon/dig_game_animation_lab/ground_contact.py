"""Beginner controls for the isolated ground-strike hand-contact workspace."""

from __future__ import annotations

import json

import bpy
from bpy.types import Operator, Panel

from .action_api import assign_action
from .paths import DEFAULT_CONFIG, require_review_path


CONTACT = json.loads(DEFAULT_CONFIG.read_text(encoding="utf-8"))["groundContactWorkspace"]
_TIMER_PENDING = False


def _rig(scene):
    return bpy.data.objects.get(str(scene.get("dgal_contact_rig", CONTACT["rigObject"])))


def _hand(scene, rig):
    name = str(scene.get("dgal_contact_hand_bone", CONTACT["handBone"]))
    return rig.pose.bones.get(name) if rig and rig.type == "ARMATURE" else None


def _contact_frame(scene) -> int:
    return int(scene.get("dgal_contact_source_frame", CONTACT["sourceContactFrame"]))


def _prepare_hand(context):
    scene = context.scene
    rig = _rig(scene)
    hand = _hand(scene, rig)
    if not rig or not hand:
        return None, None, "Ground-strike rig or right hand is missing"
    if context.object and context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    rig.hide_viewport = False
    rig.hide_set(False)
    rig.select_set(True)
    rig.show_in_front = True
    context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    for bone in rig.pose.bones:
        bone.select = False
    hand.bone.hide = False
    hand.select = True
    rig.data.bones.active = hand.bone
    scene.frame_set(_contact_frame(scene))
    rig.pose.use_auto_ik = True
    if hasattr(scene, "dgal"):
        scene.dgal.active_rig = rig
        scene.dgal.pose_role = "CONTACT"
        scene.dgal.pose_scope = "ALL"
        scene.dgal.frame_contact = _contact_frame(scene)
    return rig, hand, "Right hand selected - drag the green control down"


def _set_move_tool(context):
    screen = context.screen or (context.window.screen if context.window else None)
    area = next((item for item in screen.areas if item.type == "VIEW_3D"), None) if screen else None
    region = next((item for item in area.regions if item.type == "WINDOW"), None) if area else None
    if context.window and area and region:
        with context.temp_override(window=context.window, area=area, region=region):
            try:
                bpy.ops.wm.tool_set_by_id(name="builtin.move")
            except RuntimeError:
                pass


class DGAL_OT_contact_select_hand(Operator):
    bl_idname = "dgal.contact_select_hand"
    bl_label = "Select Green Hand Control"
    bl_description = "Return to the contact frame and select the striking right hand with Auto IK"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        _rig_object, hand, message = _prepare_hand(context)
        if not hand:
            self.report({"ERROR"}, message)
            return {"CANCELLED"}
        _set_move_tool(context)
        context.scene["dgal_contact_status"] = message
        self.report({"INFO"}, message)
        return {"FINISHED"}


class DGAL_OT_contact_save_pose(Operator):
    bl_idname = "dgal.contact_save_pose"
    bl_label = "Save Hand Contact Pose"
    bl_description = "Key the complete edited pose on the protected review copy at the contact frame"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        rig, hand, message = _prepare_hand(context)
        if not rig or not hand:
            self.report({"ERROR"}, message)
            return {"CANCELLED"}
        if not hasattr(context.scene, "dgal"):
            self.report({"ERROR"}, "Animation Lab add-on state is unavailable")
            return {"CANCELLED"}
        result = bpy.ops.dgal.simple_save_pose()
        if "FINISHED" not in result:
            return result
        context.scene["dgal_contact_status"] = "Contact pose keyed on the editable review action"
        self.report({"INFO"}, "Saved the hand contact pose")
        return {"FINISHED"}


class DGAL_OT_contact_reset(Operator):
    bl_idname = "dgal.contact_reset"
    bl_label = "Reset From Protected Original"
    bl_description = "Create a fresh editable copy; the previous edit remains preserved"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        rig = _rig(context.scene)
        source_name = str(context.scene.get("dgal_contact_source_action", CONTACT["sourceAction"]))
        source = bpy.data.actions.get(source_name)
        if not rig or not source:
            self.report({"ERROR"}, "Protected ground-strike action is missing")
            return {"CANCELLED"}
        old_action = rig.animation_data.action if rig.animation_data else None
        if old_action:
            old_action.use_fake_user = True
        copy = source.copy()
        copy.name = f"{CONTACT['editableAction']}_reset"
        copy["dgal_editable"] = True
        copy["dgal_source_action"] = source.name
        copy["productionChanged"] = False
        copy.use_fake_user = True
        assign_action(rig, copy)
        context.scene["dgal_contact_edit_action"] = copy.name
        _prepare_hand(context)
        context.scene["dgal_contact_status"] = "Fresh editable copy loaded; earlier edit preserved"
        return {"FINISHED"}


class DGAL_OT_contact_save_file(Operator):
    bl_idname = "dgal.contact_save_file"
    bl_label = "Save My Blender Tweak"
    bl_description = "Save this review-only Blender file without changing game assets"
    bl_options = {"REGISTER"}

    def execute(self, context):
        try:
            target = require_review_path(__import__("pathlib").Path(bpy.data.filepath))
        except ValueError as error:
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        bpy.ops.wm.save_as_mainfile(filepath=str(target), check_existing=False)
        context.scene["dgal_contact_status"] = "Workspace saved; game assets are unchanged"
        self.report({"INFO"}, "Saved review-only workspace")
        return {"FINISHED"}


class DGAL_PT_ground_contact(Panel):
    bl_idname = "DGAL_PT_ground_contact"
    bl_label = "HAND TO GROUND"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "HAND TO GROUND"

    @classmethod
    def poll(cls, context):
        return bool(context.scene.get("dgal_ground_contact_workspace"))

    def draw(self, context):
        layout, scene = self.layout, context.scene
        box = layout.box()
        box.label(text="Ground Strike - right hand", icon="HAND")
        box.label(text=f"Source frame {_contact_frame(scene)} / runtime frame {CONTACT['runtimeContactFrame']}")
        box.label(text="Protected review copy - game unchanged", icon="LOCKED")
        status = str(scene.get("dgal_contact_status", "Ready"))
        layout.label(text=status, icon="INFO")

        box = layout.box()
        box.label(text="1. Select the green hand", icon="RESTRICT_SELECT_OFF")
        row = box.row()
        row.scale_y = 1.4
        row.operator("dgal.contact_select_hand", icon="HAND")

        box = layout.box()
        box.label(text="2. Drag it DOWN", icon="ORIENTATION_GLOBAL")
        box.label(text="Use the blue Z arrow.")
        box.label(text="Stop when the glove touches the green floor.")
        box.label(text="Auto IK moves the whole arm for you.")

        box = layout.box()
        box.label(text="3. Keep the pose", icon="KEY_HLT")
        row = box.row()
        row.scale_y = 1.4
        row.operator("dgal.contact_save_pose", icon="KEY_HLT")
        box.operator("dgal.contact_reset", icon="LOOP_BACK")

        row = layout.row()
        row.scale_y = 1.55
        row.operator("dgal.contact_save_file", icon="FILE_TICK")


def _prepare_when_ready():
    global _TIMER_PENDING
    if bpy.app.background:
        _TIMER_PENDING = False
        return None
    for window in bpy.context.window_manager.windows:
        if not window.scene.get("dgal_ground_contact_workspace"):
            continue
        workspace_name = str(window.scene.get("dgal_contact_workspace_name", CONTACT["workspaceName"]))
        workspace = bpy.data.workspaces.get(workspace_name)
        if workspace:
            window.workspace = workspace
        area = next((item for item in window.screen.areas if item.type == "VIEW_3D"), None)
        region = next((item for item in area.regions if item.type == "WINDOW"), None) if area else None
        if not area or not region:
            continue
        with bpy.context.temp_override(window=window, area=area, region=region):
            _prepare_hand(bpy.context)
            _set_move_tool(bpy.context)
            area.spaces.active.show_region_ui = True
            try:
                bpy.ops.view3d.view_camera()
                bpy.ops.wm.call_panel(name="DGAL_PT_ground_contact", keep_open=True)
            except RuntimeError:
                pass
        _TIMER_PENDING = False
        return None
    return 0.25


def schedule_contact_view():
    global _TIMER_PENDING
    if bpy.app.background or _TIMER_PENDING:
        return
    _TIMER_PENDING = True
    bpy.app.timers.register(_prepare_when_ready, first_interval=0.25)


CLASSES = (
    DGAL_OT_contact_select_hand,
    DGAL_OT_contact_save_pose,
    DGAL_OT_contact_reset,
    DGAL_OT_contact_save_file,
    DGAL_PT_ground_contact,
)
