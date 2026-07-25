"""3D View sidebar panels for the Blender animation lab."""

from __future__ import annotations

import bpy
from bpy.types import Panel, UIList


class DGAL_UL_clip_list(UIList):
    def draw_item(self, _context, layout, _data, item, _icon, _active_data, _active_property, _index):
        row = layout.row(align=True)
        row.label(text=item.clip_id, icon="ACTION")
        row.label(text=item.status)


class DGAL_UL_hitbox_list(UIList):
    def draw_item(self, _context, layout, _data, item, _icon, _active_data, _active_property, _index):
        row = layout.row(align=True)
        row.label(text=item.label, icon="CUBE")
        row.label(text=item.kind)


class DGALPanel:
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Animation Lab"

    @classmethod
    def poll(cls, context):
        """Keep technical panels behind the beginner UI's Advanced switch."""
        scene = getattr(context, "scene", None)
        state = getattr(scene, "dgal", None) if scene else None
        return bool(state and getattr(state, "show_advanced", False))


class DGAL_PT_session(DGALPanel, Panel):
    bl_idname = "DGAL_PT_session"
    bl_label = "1. Isolated Session"

    def draw(self, context):
        layout, state = self.layout, context.scene.dgal
        layout.prop(state, "session_name")
        row = layout.row(align=True)
        row.operator("dgal.create_session", icon="FILE_NEW")
        row.operator("dgal.save_session_copy", icon="FILE_TICK")
        layout.operator("dgal.ensure_review_stage", icon="CAMERA_DATA")
        box = layout.box()
        box.label(text="Inputs are read-only", icon="LOCKED")
        box.prop(state, "runtime_manifest_path")
        box.prop(state, "source_fbx_directory")
        box.template_list("DGAL_UL_clip_list", "", state, "clips", state, "clip_index", rows=5)
        row = box.row(align=True)
        row.operator("dgal.refresh_catalog", icon="FILE_REFRESH")
        row.operator("dgal.load_selected_clip", text="Use selected action", icon="ACTION")
        layout.prop(state, "active_rig")
        layout.prop(state, "reference_mesh")


class DGAL_PT_pose(DGALPanel, Panel):
    bl_idname = "DGAL_PT_pose"
    bl_label = "2. Pose, Tween & Bone Controls"
    bl_parent_id = "DGAL_PT_session"
    bl_options = {"DEFAULT_CLOSED"}

    def draw(self, context):
        layout, state = self.layout, context.scene.dgal
        layout.prop(state, "pose_scope", expand=True)
        layout.prop(state, "pose_role")
        grid = layout.grid_flow(columns=2, align=True)
        grid.prop(state, "frame_start")
        grid.prop(state, "frame_anticipation")
        grid.prop(state, "frame_contact")
        grid.prop(state, "frame_recovery")
        grid.prop(state, "frame_end")
        row = layout.row(align=True)
        row.operator("dgal.insert_pose_key", icon="KEY_HLT")
        row.operator("dgal.reset_pose", icon="LOOP_BACK")
        layout.prop(state, "interpolation")
        row = layout.row(align=True)
        row.operator("dgal.apply_interpolation", icon="IPO_BEZIER")
        row.operator("dgal.copy_start_to_end", icon="FILE_REFRESH")
        layout.operator("dgal.bake_tween", icon="ACTION_TWEAK")
        layout.separator()
        layout.label(text="Select a pose bone to pin it")
        row = layout.row(align=True)
        row.operator("dgal.add_ik_control", icon="CON_KINEMATIC")
        row.operator("dgal.remove_bone_controls", icon="X")


class DGAL_PT_hitboxes(DGALPanel, Panel):
    bl_idname = "DGAL_PT_hitboxes"
    bl_label = "3. Hitbox & Tile Fit"
    bl_parent_id = "DGAL_PT_session"
    bl_options = {"DEFAULT_CLOSED"}

    def draw(self, context):
        layout, state = self.layout, context.scene.dgal
        presentation = layout.box()
        presentation.label(text="Render to game mapping")
        grid = presentation.grid_flow(columns=2, align=True)
        grid.prop(state, "tile_size_game_px")
        grid.prop(state, "display_size_game_px")
        grid.prop(state, "packed_frame_size_px")
        grid.prop(state, "target_visible_height_tiles")
        presentation.prop(state, "tile_grid_radius")
        presentation.operator("dgal.create_tile_grid", icon="MESH_GRID")
        layout.template_list("DGAL_UL_hitbox_list", "", state, "hitboxes", state, "hitbox_index", rows=3)
        layout.operator("dgal.add_hitbox", icon="ADD")
        if state.hitboxes:
            item = state.hitboxes[state.hitbox_index]
            box = layout.box()
            box.prop(item, "label")
            box.prop(item, "kind")
            box.prop(item, "anchor_bone")
            grid = box.grid_flow(columns=2, align=True)
            grid.prop(item, "width_game_px")
            grid.prop(item, "height_game_px")
            grid.prop(item, "offset_x_game_px")
            grid.prop(item, "offset_y_game_px")
            grid.prop(item, "frame_start")
            grid.prop(item, "frame_end")
            box.prop(state, "hitbox_sample_step")
            row = box.row(align=True)
            row.operator("dgal.update_hitbox_guide", icon="HIDE_OFF")
            row.operator("dgal.fit_hitbox_to_motion", icon="MOD_PHYSICS")
        layout.operator("dgal.export_hitbox_draft", icon="EXPORT")


class DGAL_PT_attachments(DGALPanel, Panel):
    bl_idname = "DGAL_PT_attachments"
    bl_label = "4. Gear & Pickaxe"
    bl_parent_id = "DGAL_PT_session"
    bl_options = {"DEFAULT_CLOSED"}

    def draw(self, context):
        layout, state = self.layout, context.scene.dgal
        box = layout.box()
        box.label(text="One-click review proofs")
        row = box.row(align=True)
        row.operator("dgal.create_procedural_pickaxe", icon="TOOL_SETTINGS")
        row.operator("dgal.create_procedural_gear", icon="MOD_ARMATURE")
        row = box.row(align=True)
        operator = row.operator("dgal.toggle_procedural_group", text="Toggle pickaxe", icon="HIDE_OFF")
        operator.group = "pickaxe"
        operator = row.operator("dgal.toggle_procedural_group", text="Toggle gear", icon="HIDE_OFF")
        operator.group = "gear"
        layout.separator()
        layout.prop(state, "prop_path")
        layout.operator("dgal.import_prop", icon="IMPORT")
        layout.prop(state, "prop_object")
        grid = layout.grid_flow(columns=2, align=True)
        grid.prop(state, "attachment_bone")
        grid.prop(state, "offhand_bone")
        grid.prop(state, "offhand_chain_count")
        row = layout.row(align=True)
        row.operator("dgal.attach_prop", icon="CON_CHILDOF")
        row.operator("dgal.create_prop_grips", icon="EMPTY_AXIS")
        row = layout.row(align=True)
        row.operator("dgal.pin_offhand_to_grip", icon="CON_KINEMATIC")
        row.operator("dgal.validate_prop_grips", icon="CHECKMARK")
        layout.label(text=state.attachment_report)


class DGAL_PT_mesh_fit(DGALPanel, Panel):
    bl_idname = "DGAL_PT_mesh_fit"
    bl_label = "5. Mesh Fit Experiment"
    bl_parent_id = "DGAL_PT_session"
    bl_options = {"DEFAULT_CLOSED"}

    def draw(self, context):
        layout, state = self.layout, context.scene.dgal
        layout.label(text="Review-only; candidate weights stay authoritative", icon="INFO")
        layout.prop(state, "mesh_candidate_path")
        row = layout.row(align=True)
        row.operator("dgal.import_mesh_candidate", icon="IMPORT")
        row.operator("dgal.audit_mesh_candidate", icon="VIEWZOOM")
        layout.prop(state, "candidate_root")
        layout.prop(state, "candidate_mesh")
        layout.operator("dgal.align_mesh_candidate", icon="PIVOT_BOUNDBOX")
        layout.prop(state, "mesh_fit_mode")
        layout.operator("dgal.bind_mesh_candidate", icon="ARMATURE_DATA")
        box = layout.box()
        box.label(text="Audit")
        box.label(text=state.mesh_audit_report[:220])


class DGAL_PT_review(DGALPanel, Panel):
    bl_idname = "DGAL_PT_review"
    bl_label = "6. Review & Export"
    bl_parent_id = "DGAL_PT_session"
    bl_options = {"DEFAULT_CLOSED"}

    def draw(self, context):
        layout, state = self.layout, context.scene.dgal
        layout.prop(context.scene, "camera")
        layout.prop(state, "review_output_root")
        row = layout.row(align=True)
        row.prop(state, "render_resolution")
        row.prop(state, "render_frame_step")
        row = layout.row(align=True)
        row.operator("dgal.render_current_review", icon="RENDER_STILL")
        row.operator("dgal.render_sequence_review", icon="RENDER_ANIMATION")
        layout.operator("dgal.validate_session", icon="CHECKMARK")
        layout.operator("dgal.export_review_bundle", icon="PACKAGE")
        if state.last_review_path:
            layout.label(text=state.last_review_path, icon="FILE_FOLDER")


CLASSES = (
    DGAL_UL_clip_list,
    DGAL_UL_hitbox_list,
    DGAL_PT_session,
    DGAL_PT_pose,
    DGAL_PT_hitboxes,
    DGAL_PT_attachments,
    DGAL_PT_mesh_fit,
    DGAL_PT_review,
)
