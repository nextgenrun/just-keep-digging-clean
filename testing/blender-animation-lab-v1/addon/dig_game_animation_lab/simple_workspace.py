"""Prepare a beginner-friendly Blender viewport for animation pose editing."""

import json
from contextlib import contextmanager

import bpy
from bpy.props import StringProperty
from bpy.types import Operator

from .bone_labels import refresh_bone_labels, resolve_semantic_pose_bone
from .paths import DEFAULT_CONFIG


_SIMPLE_UI = json.loads(DEFAULT_CONFIG.read_text(encoding="utf-8")).get("simpleUi", {})
_FOCUS_ON_LAUNCH = bool(_SIMPLE_UI.get("focusOnLaunch", False))
_VIEW_READY_RETRY_SECONDS = _SIMPLE_UI.get("viewReadyRetrySeconds")
_TIMER_PENDING = False
_HEADER_ADDED = False

def _view3d_area(context):
    if context.area and context.area.type == "VIEW_3D":
        return context.area
    screen = context.screen or (context.window.screen if context.window else None)
    return next((area for area in screen.areas if area.type == "VIEW_3D"), None) if screen else None


def _window_region(area):
    return next((region for region in area.regions if region.type == "WINDOW"), None) if area else None


@contextmanager
def _view3d_override(context):
    area = _view3d_area(context)
    region = _window_region(area)
    if context.window and area and region:
        with context.temp_override(window=context.window, area=area, region=region):
            yield True
        return
    yield False


def _set_rotation_tool(context):
    area = _view3d_area(context)
    if area:
        space = area.spaces.active
        space.show_gizmo = True
        space.show_gizmo_tool = True
    with _view3d_override(context) as has_view:
        if has_view:
            try:
                bpy.ops.wm.tool_set_by_id(name="builtin.rotate")
            except RuntimeError:
                pass


def _show_review_camera(context):
    if not context.scene.camera:
        return
    with _view3d_override(context) as has_view:
        if has_view:
            try:
                bpy.ops.view3d.view_camera()
            except RuntimeError:
                pass


def _prepare_view(context):
    state = getattr(context.scene, "dgal", None)
    rig = state.active_rig if state else None
    if not rig or rig.type != "ARMATURE":
        return None, "Load an animation before opening the simple workspace"
    if context.view_layer.objects.get(rig.name) is None:
        return None, "The active character rig is not visible in this view layer"

    current = context.view_layer.objects.active
    if current and current.mode != "OBJECT":
        with _view3d_override(context):
            try:
                bpy.ops.object.mode_set(mode="OBJECT")
            except RuntimeError:
                return None, "Could not leave the current Blender edit mode"

    for obj in context.selected_objects:
        obj.select_set(False)
    rig.hide_viewport = False
    rig.hide_set(False)
    rig.select_set(True)
    rig.show_in_front = True
    context.view_layer.objects.active = rig

    with _view3d_override(context):
        try:
            bpy.ops.object.mode_set(mode="POSE")
        except RuntimeError:
            return None, "Could not enter Pose Mode on the active character"

    screen = context.screen or (context.window.screen if context.window else None)
    if screen:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                area.spaces.active.show_region_ui = True
    _show_review_camera(context)
    _set_rotation_tool(context)
    refresh_bone_labels(context, rig)
    return rig, "Simple pose workspace is ready"


def _resolve_pose_bone(rig, semantic_name):
    return resolve_semantic_pose_bone(rig, semantic_name) or rig.pose.bones.get(semantic_name)


def _toggle_focus(context):
    with _view3d_override(context) as has_view:
        if not has_view:
            return False
        try:
            bpy.ops.screen.screen_full_area(use_hide_panels=False)
        except (RuntimeError, TypeError):
            try:
                bpy.ops.screen.screen_full_area()
            except RuntimeError:
                return False
    return True


def _show_easy_panel(context):
    with _view3d_override(context) as has_view:
        if not has_view:
            return False
        try:
            bpy.ops.wm.call_panel(name="DGAL_PT_simple", keep_open=True)
        except RuntimeError:
            return False
    return True


class DGAL_OT_simple_prepare_view(Operator):
    bl_idname = "dgal.simple_prepare_view"
    bl_label = "Open Simple Lab"
    bl_description = "Select the character, enter Pose Mode, and prepare the animation viewport"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        rig, message = _prepare_view(context)
        state = getattr(context.scene, "dgal", None)
        if state and hasattr(state, "simple_status"):
            state.simple_status = message
        if not rig:
            self.report({"ERROR"}, message)
            return {"CANCELLED"}
        self.report({"INFO"}, message)
        return {"FINISHED"}


class DGAL_OT_simple_select_joint(Operator):
    bl_idname = "dgal.simple_select_joint"
    bl_label = "Select Joint"
    bl_description = "Select one easy pose joint and activate the rotation tool"
    bl_options = {"REGISTER", "UNDO"}

    bone_name: StringProperty(name="Joint")

    def execute(self, context):
        rig, message = _prepare_view(context)
        if not rig:
            self.report({"ERROR"}, message)
            return {"CANCELLED"}
        pose_bone = _resolve_pose_bone(rig, self.bone_name)
        if not pose_bone:
            self.report({"ERROR"}, f"Joint '{self.bone_name}' is not available on this character")
            return {"CANCELLED"}
        for bone in rig.pose.bones:
            bone.select = False
        pose_bone.select = True
        rig.data.bones.active = pose_bone.bone
        _set_rotation_tool(context)
        self.report({"INFO"}, f"Selected {pose_bone.name}")
        return {"FINISHED"}


class DGAL_OT_simple_toggle_focus(Operator):
    bl_idname = "dgal.simple_toggle_focus"
    bl_label = "Toggle View Focus"
    bl_description = "Maximize the 3D View or restore the normal Blender layout"

    @classmethod
    def poll(cls, context):
        return _view3d_area(context) is not None

    def execute(self, context):
        if not _toggle_focus(context):
            self.report({"ERROR"}, "A 3D View is required")
            return {"CANCELLED"}
        return {"FINISHED"}


class DGAL_OT_simple_open_panel(Operator):
    bl_idname = "dgal.simple_open_panel"
    bl_label = "Easy Animation Lab"
    bl_description = "Open the simple animation controls"

    def execute(self, context):
        if not _show_easy_panel(context):
            self.report({"ERROR"}, "Open this from a 3D View")
            return {"CANCELLED"}
        return {"FINISHED"}


def _draw_header_button(self, _context):
    self.layout.separator_spacer()
    self.layout.operator("dgal.simple_open_panel", text="Easy Animation Lab", icon="ARMATURE_DATA")


def register_header():
    """Keep one obvious route to Simple Mode in every 3D View header."""
    global _HEADER_ADDED
    if not _HEADER_ADDED:
        bpy.types.VIEW3D_HT_header.append(_draw_header_button)
        _HEADER_ADDED = True


def unregister_header():
    global _HEADER_ADDED
    if _HEADER_ADDED:
        bpy.types.VIEW3D_HT_header.remove(_draw_header_button)
        _HEADER_ADDED = False


def draw_simple_controls(layout):
    """Draw compact workspace and joint controls inside another panel."""
    column = layout.column(align=True)
    column.operator("dgal.simple_toggle_focus", text="Focus / Restore View", icon="FULLSCREEN_ENTER")
    box = column.box()
    box.label(text="3. Pick a named bone and rotate it", icon="BONE_DATA")
    box.label(text="Only the important bones are visible.", icon="INFO")
    box.menu("DGAL_MT_named_bones", text="Select a named bone", icon="BONE_DATA")


def _prepare_when_view_exists():
    global _TIMER_PENDING
    if bpy.app.background or not hasattr(bpy.types.Scene, "dgal"):
        _TIMER_PENDING = False
        return None
    for window in bpy.context.window_manager.windows:
        screen = window.screen
        area = next((item for item in screen.areas if item.type == "VIEW_3D"), None)
        region = _window_region(area)
        if not area or not region:
            continue
        with bpy.context.temp_override(window=window, area=area, region=region):
            rig, _ = _prepare_view(bpy.context)
            if not rig:
                continue
            if _FOCUS_ON_LAUNCH:
                _toggle_focus(bpy.context)
            _show_easy_panel(bpy.context)
            _TIMER_PENDING = False
            return None
    if _VIEW_READY_RETRY_SECONDS is None:
        _TIMER_PENDING = False
        return None
    return float(_VIEW_READY_RETRY_SECONDS)


def schedule_simple_view():
    """Prepare Simple Mode on Blender's next UI-safe timer tick."""
    global _TIMER_PENDING
    if bpy.app.background or _TIMER_PENDING:
        return
    _TIMER_PENDING = True
    options = {"persistent": False}
    if _VIEW_READY_RETRY_SECONDS is not None:
        options["first_interval"] = float(_VIEW_READY_RETRY_SECONDS)
    bpy.app.timers.register(_prepare_when_view_exists, **options)


CLASSES = (
    DGAL_OT_simple_prepare_view,
    DGAL_OT_simple_select_joint,
    DGAL_OT_simple_toggle_focus,
    DGAL_OT_simple_open_panel,
)
