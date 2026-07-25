"""Review game-pixel hitboxes against camera-projected animated meshes."""

from __future__ import annotations

import json

import bpy
from bpy.types import Operator
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

from .collections import ensure_lab_collections, move_object, tag_object
from .paths import ensure_session_output_root
from .pose_ops import active_rig


def world_per_game_pixel(scene, state) -> float:
    camera = scene.camera
    if not camera or camera.data.type != "ORTHO":
        raise ValueError("Hitbox review requires an orthographic scene camera")
    crop_fraction = state.source_crop_window_px / state.source_render_size_px
    return camera.data.ortho_scale * crop_fraction / state.display_size_game_px


def _camera_axes(camera):
    rotation = camera.matrix_world.to_quaternion()
    return rotation @ Vector((1.0, 0.0, 0.0)), rotation @ Vector((0.0, 1.0, 0.0))


def _anchor_world(rig, item) -> Vector:
    if item.kind != "BODY" and rig and rig.pose.bones.get(item.anchor_bone):
        return rig.matrix_world @ rig.pose.bones[item.anchor_bone].head
    return rig.matrix_world.translation.copy() if rig else Vector()


def update_guide(scene, state, item) -> None:
    camera = scene.camera
    rig = state.active_rig
    if not camera:
        raise ValueError("Assign an orthographic scene camera")
    scale = world_per_game_pixel(scene, state)
    right, up = _camera_axes(camera)
    anchor = _anchor_world(rig, item)
    center = (
        anchor
        + right * item.offset_x_game_px * scale
        + up * (item.height_game_px * 0.5 - item.offset_y_game_px) * scale
    )
    guide = item.guide_object
    if not guide:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=center)
        guide = bpy.context.object
        guide.name = f"DGAL_HITBOX_{item.kind}_{item.label}"
        move_object(guide, ensure_lab_collections()["DGAL_GUIDES"])
        tag_object(guide, f"hitbox-{item.kind.lower()}", state.session_name)
        guide.display_type = "WIRE"
        guide.hide_render = True
        guide.show_in_front = True
        item.guide_object = guide
    guide.location = center
    guide.rotation_mode = "QUATERNION"
    guide.rotation_quaternion = camera.matrix_world.to_quaternion()
    guide.dimensions = (
        item.width_game_px * scale,
        item.height_game_px * scale,
        max(scale * 0.3, 0.001),
    )


def _mesh_objects(state, rig):
    meshes = []
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH" or obj.hide_render:
            continue
        armatures = [modifier.object for modifier in obj.modifiers if modifier.type == "ARMATURE"]
        if rig in armatures or obj.parent == rig:
            meshes.append(obj)
    if meshes:
        return meshes
    return [state.reference_mesh] if state.reference_mesh and state.reference_mesh.type == "MESH" else []


def _project_mesh_bounds(scene, camera, objects):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    points = []
    for obj in objects:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            points.extend(world_to_camera_view(scene, camera, evaluated.matrix_world @ vertex.co) for vertex in mesh.vertices)
        finally:
            evaluated.to_mesh_clear()
    if not points:
        raise ValueError("Reference mesh contains no evaluated vertices")
    return min(point.x for point in points), min(point.y for point in points), max(point.x for point in points), max(point.y for point in points)


class DGAL_OT_add_hitbox(Operator):
    bl_idname = "dgal.add_hitbox"
    bl_label = "Add hitbox draft"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state = context.scene.dgal
        item = state.hitboxes.add()
        item.label = f"Draft {len(state.hitboxes)}"
        item.frame_start = state.frame_start
        item.frame_end = state.frame_end
        state.hitbox_index = len(state.hitboxes) - 1
        try:
            update_guide(context.scene, state, item)
        except ValueError as error:
            self.report({"WARNING"}, str(error))
        return {"FINISHED"}


class DGAL_OT_update_hitbox_guide(Operator):
    bl_idname = "dgal.update_hitbox_guide"
    bl_label = "Update hitbox guide"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state = context.scene.dgal
        if not state.hitboxes:
            return {"CANCELLED"}
        try:
            update_guide(context.scene, state, state.hitboxes[state.hitbox_index])
        except ValueError as error:
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        return {"FINISHED"}


class DGAL_OT_fit_hitbox_to_motion(Operator):
    bl_idname = "dgal.fit_hitbox_to_motion"
    bl_label = "Suggest from motion silhouette"
    bl_description = "Project the evaluated mesh over the frame range and fit the selected draft box"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        scene, state = context.scene, context.scene.dgal
        rig = active_rig(context)
        if not rig or not state.hitboxes or not scene.camera:
            self.report({"ERROR"}, "Load a rig, add a hitbox, and assign a camera")
            return {"CANCELLED"}
        meshes = _mesh_objects(state, rig)
        if not meshes:
            self.report({"ERROR"}, "No reference mesh found")
            return {"CANCELLED"}
        item = state.hitboxes[state.hitbox_index]
        old_frame = scene.frame_current
        relative = []
        first, last = sorted((item.frame_start, item.frame_end))
        try:
            for frame in range(first, last + 1, state.hitbox_sample_step):
                scene.frame_set(frame)
                context.view_layer.update()
                bounds = _project_mesh_bounds(scene, scene.camera, meshes)
                anchor = world_to_camera_view(scene, scene.camera, _anchor_world(rig, item))
                relative.append((bounds[0] - anchor.x, bounds[1] - anchor.y, bounds[2] - anchor.x, bounds[3] - anchor.y))
        except ValueError as error:
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        finally:
            scene.frame_set(old_frame)
        minimum_x = min(value[0] for value in relative)
        minimum_y = min(value[1] for value in relative)
        maximum_x = max(value[2] for value in relative)
        maximum_y = max(value[3] for value in relative)
        normalized_to_game = state.source_render_size_px * state.display_size_game_px / state.source_crop_window_px
        item.width_game_px = max(1.0, (maximum_x - minimum_x) * normalized_to_game)
        item.height_game_px = max(1.0, (maximum_y - minimum_y) * normalized_to_game)
        item.offset_x_game_px = (minimum_x + maximum_x) * 0.5 * normalized_to_game
        center_up = (minimum_y + maximum_y) * 0.5 * normalized_to_game
        item.offset_y_game_px = item.height_game_px * 0.5 - center_up
        update_guide(scene, state, item)
        self.report({"INFO"}, "Updated draft from the sampled motion silhouette")
        return {"FINISHED"}


class DGAL_OT_create_tile_grid(Operator):
    bl_idname = "dgal.create_tile_grid"
    bl_label = "Create tile grid guide"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        scene, state = context.scene, context.scene.dgal
        rig = active_rig(context)
        if not scene.camera:
            self.report({"ERROR"}, "Assign an orthographic camera")
            return {"CANCELLED"}
        scale = world_per_game_pixel(scene, state) * state.tile_size_game_px
        radius = state.tile_grid_radius
        vertices, edges = [], []
        extent = (radius + 0.5) * scale
        for index in range(-radius, radius + 2):
            offset = (index - 0.5) * scale
            start = len(vertices)
            vertices.extend(((offset, -extent, 0.0), (offset, extent, 0.0), (-extent, offset, 0.0), (extent, offset, 0.0)))
            edges.extend(((start, start + 1), (start + 2, start + 3)))
        mesh = bpy.data.meshes.new("DGAL_TileGridMesh")
        mesh.from_pydata(vertices, edges, [])
        grid = bpy.data.objects.new("DGAL_TileGrid", mesh)
        ensure_lab_collections()["DGAL_GUIDES"].objects.link(grid)
        grid.location = rig.matrix_world.translation if rig else Vector()
        grid.rotation_mode = "QUATERNION"
        grid.rotation_quaternion = scene.camera.matrix_world.to_quaternion()
        grid.show_in_front, grid.hide_render = True, True
        tag_object(grid, "tile-grid", state.session_name)
        return {"FINISHED"}


class DGAL_OT_export_hitbox_draft(Operator):
    bl_idname = "dgal.export_hitbox_draft"
    bl_label = "Export hitbox draft JSON"
    bl_options = {"REGISTER"}

    def execute(self, context):
        state = context.scene.dgal
        output = ensure_session_output_root(state)
        payload = {
            "schema": "dig-game-blender-hitbox-draft-v1",
            "productionChanged": False,
            "units": "game-px",
            "tileSizePx": state.tile_size_game_px,
            "boxes": [
                {
                    "label": item.label, "kind": item.kind,
                    "width": item.width_game_px, "height": item.height_game_px,
                    "offsetX": item.offset_x_game_px, "offsetY": item.offset_y_game_px,
                    "frameRange": [item.frame_start, item.frame_end], "anchorBone": item.anchor_bone,
                }
                for item in state.hitboxes
            ],
        }
        path = output / "hitbox-draft.json"
        path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        state.last_review_path = str(path)
        self.report({"INFO"}, f"Exported {path.name}")
        return {"FINISHED"}


CLASSES = (
    DGAL_OT_add_hitbox,
    DGAL_OT_update_hitbox_guide,
    DGAL_OT_fit_hitbox_to_motion,
    DGAL_OT_create_tile_grid,
    DGAL_OT_export_hitbox_draft,
)
