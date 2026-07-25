"""Import, audit, align, and experimentally deform a Meshy-style candidate."""

from __future__ import annotations

import json

import bmesh
import bpy
from bpy.types import Operator
from mathutils import Vector

from .attachment_ops import _import_objects, _wrapper
from .collections import ensure_lab_collections, move_object, tag_object
from .meshy_retarget import bake_mapped_action
from .paths import resolve_path
from .pose_ops import active_rig


def candidate_objects(state):
    root = state.candidate_root
    return [root, *root.children_recursive] if root else []


def candidate_meshes(state):
    meshes = [obj for obj in candidate_objects(state) if obj and obj.type == "MESH"]
    skinned = [obj for obj in meshes if obj.vertex_groups and any(
        modifier.type == "ARMATURE" and modifier.object for modifier in obj.modifiers
    )]
    return skinned or meshes


def world_bounds(objects):
    points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    if not points:
        raise ValueError("No mesh bounds are available")
    return (
        Vector(tuple(min(point[axis] for point in points) for axis in range(3))),
        Vector(tuple(max(point[axis] for point in points) for axis in range(3))),
    )


def armature_for_reference(state, rig):
    reference = state.reference_mesh
    if reference:
        modifier = next((entry for entry in reference.modifiers if entry.type == "ARMATURE" and entry.object), None)
        if modifier:
            return modifier.object
    return rig


def reference_meshes(state, rig):
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and any(
        modifier.type == "ARMATURE" and modifier.object == rig for modifier in obj.modifiers
    )]
    if meshes:
        return meshes
    return [state.reference_mesh] if state.reference_mesh and state.reference_mesh.type == "MESH" else []


def _non_manifold_edges(obj):
    mesh = bmesh.new()
    try:
        mesh.from_mesh(obj.data)
        return sum(1 for edge in mesh.edges if not edge.is_manifold)
    finally:
        mesh.free()


class DGAL_OT_import_mesh_candidate(Operator):
    bl_idname = "dgal.import_mesh_candidate"
    bl_label = "Import Meshy / mesh candidate"
    bl_description = "Import one GLB, GLTF, or FBX candidate into the review-only collection"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state = context.scene.dgal
        path = resolve_path(state.mesh_candidate_path, state.repo_root)
        if not path.is_file():
            self.report({"ERROR"}, f"Missing candidate: {path}")
            return {"CANCELLED"}
        collection = ensure_lab_collections()["DGAL_MESH_CANDIDATE"]
        try:
            objects = _import_objects(path)
        except (RuntimeError, ValueError) as error:
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        for obj in objects:
            move_object(obj, collection)
            tag_object(obj, "mesh-candidate-part", state.session_name)
        wrapper = _wrapper(objects, f"DGAL_CANDIDATE_{path.stem}", collection)
        tag_object(wrapper, "mesh-candidate-root", state.session_name)
        state.candidate_root = wrapper
        skinned = candidate_meshes(state)
        state.candidate_mesh = skinned[0] if skinned else None
        for obj in objects:
            if obj.type == "MESH" and obj not in skinned:
                obj.hide_viewport = True
                obj.hide_render = True
                tag_object(obj, "mesh-candidate-excluded-prop", state.session_name)
        wrapper["dgal_source_path"] = str(path)
        self.report({"INFO"}, f"Imported {len(objects)} candidate objects")
        return {"FINISHED"}


class DGAL_OT_audit_mesh_candidate(Operator):
    bl_idname = "dgal.audit_mesh_candidate"
    bl_label = "Audit candidate"
    bl_description = "Report topology, material, armature, and weight coverage before fitting"
    bl_options = {"REGISTER"}

    def execute(self, context):
        state = context.scene.dgal
        objects = candidate_objects(state)
        meshes = candidate_meshes(state)
        if not meshes:
            self.report({"ERROR"}, "Import a mesh candidate first")
            return {"CANCELLED"}
        armatures = [obj for obj in objects if obj.type == "ARMATURE"]
        payload = {
            "meshes": len(meshes),
            "excludedMeshes": sum(
                obj.type == "MESH" and obj not in meshes for obj in candidate_objects(state)
            ),
            "armatures": len(armatures),
            "vertices": sum(len(obj.data.vertices) for obj in meshes),
            "triangles": sum(len(obj.data.loop_triangles) for obj in meshes),
            "materials": sum(len(obj.material_slots) for obj in meshes),
            "vertexGroups": sum(len(obj.vertex_groups) for obj in meshes),
            "unweightedVertices": sum(sum(1 for vertex in obj.data.vertices if not vertex.groups) for obj in meshes),
            "nonManifoldEdges": sum(_non_manifold_edges(obj) for obj in meshes),
            "rigged": bool(armatures),
        }
        state.mesh_audit_report = json.dumps(payload, separators=(",", ":"))
        state.candidate_root["dgal_mesh_audit"] = state.mesh_audit_report
        self.report({"INFO"}, state.mesh_audit_report)
        return {"FINISHED"}


class DGAL_OT_align_mesh_candidate(Operator):
    bl_idname = "dgal.align_mesh_candidate"
    bl_label = "Align feet / center / height"
    bl_description = "Uniformly fit candidate bounds to the placeholder reference without modifying either source"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state = context.scene.dgal
        root = state.candidate_root
        rig = active_rig(context)
        references = reference_meshes(state, rig) if rig else []
        meshes = candidate_meshes(state)
        if not root or not references or not meshes:
            self.report({"ERROR"}, "Candidate root and reference mesh are required")
            return {"CANCELLED"}
        try:
            candidate_min, candidate_max = world_bounds(meshes)
            reference_min, reference_max = world_bounds(references)
        except ValueError as error:
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        ratio = (reference_max.z - reference_min.z) / max(0.0001, candidate_max.z - candidate_min.z)
        root.scale *= ratio
        context.view_layer.update()
        candidate_min, candidate_max = world_bounds(meshes)
        candidate_center = (candidate_min + candidate_max) * 0.5
        reference_center = (reference_min + reference_max) * 0.5
        root.location += Vector((
            reference_center.x - candidate_center.x,
            reference_center.y - candidate_center.y,
            reference_min.z - candidate_min.z,
        ))
        root["dgal_fit_scale"] = ratio
        self.report({"INFO"}, f"Aligned candidate at uniform scale {ratio:.5f}")
        return {"FINISHED"}


def _activate(context, obj):
    bpy.ops.object.mode_set(mode="OBJECT") if context.object and context.object.mode != "OBJECT" else None
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    context.view_layer.objects.active = obj


def _transfer_weights(context, target, reference, rig):
    for group in reference.vertex_groups:
        if target.vertex_groups.get(group.name) is None:
            target.vertex_groups.new(name=group.name)
    modifier = target.modifiers.new("DGAL_WeightTransfer", "DATA_TRANSFER")
    modifier.object = reference
    modifier.use_vert_data = True
    modifier.data_types_verts = {"VGROUP_WEIGHTS"}
    modifier.vert_mapping = "POLYINTERP_NEAREST"
    modifier.layers_vgroup_select_src = "ALL"
    modifier.layers_vgroup_select_dst = "NAME"
    _activate(context, target)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    armature = target.modifiers.new("DGAL_Armature", "ARMATURE")
    armature.object = rig


def _surface_bind(context, target, reference):
    modifier = target.modifiers.new("DGAL_SurfaceDeform", "SURFACE_DEFORM")
    modifier.target = reference
    _activate(context, target)
    bpy.ops.object.surfacedeform_bind(modifier=modifier.name)


def _automatic_weights(context, meshes, rig):
    bpy.ops.object.mode_set(mode="OBJECT") if context.object and context.object.mode != "OBJECT" else None
    bpy.ops.object.select_all(action="DESELECT")
    for mesh in meshes:
        mesh.select_set(True)
    rig.select_set(True)
    context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")


class DGAL_OT_bind_mesh_candidate(Operator):
    bl_idname = "dgal.bind_mesh_candidate"
    bl_label = "Run fit experiment"
    bl_description = "Apply the selected reversible proof binding to candidate objects only"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state, source_rig = context.scene.dgal, active_rig(context)
        reference, meshes = state.reference_mesh, candidate_meshes(state)
        rig = armature_for_reference(state, source_rig)
        if not source_rig or not reference or not rig or not meshes:
            self.report({"ERROR"}, "Load source rig, reference mesh, and candidate")
            return {"CANCELLED"}
        try:
            if state.mesh_fit_mode == "WEIGHT_TRANSFER":
                for mesh in meshes:
                    _transfer_weights(context, mesh, reference, rig)
                detail = f"transferred weights to {len(meshes)} meshes"
            elif state.mesh_fit_mode == "SURFACE_DEFORM":
                for mesh in meshes:
                    _surface_bind(context, mesh, reference)
                detail = f"surface-bound {len(meshes)} meshes"
            elif state.mesh_fit_mode == "AUTO_WEIGHTS":
                _automatic_weights(context, meshes, rig)
                detail = f"automatic-weighted {len(meshes)} meshes"
            else:
                target = next((obj for obj in candidate_objects(state) if obj and obj.type == "ARMATURE"), None)
                if not target:
                    raise ValueError("Same-name retarget requires a candidate armature")
                _action, count = bake_mapped_action(
                    context.scene, source_rig, target, state.frame_start, state.frame_end
                )
                detail = f"baked {count} mapped bones into the native candidate rig"
        except (RuntimeError, ValueError) as error:
            self.report({"ERROR"}, f"Fit experiment failed: {error}")
            return {"CANCELLED"}
        state.candidate_root["dgal_fit_mode"] = state.mesh_fit_mode
        state.candidate_root["productionChanged"] = False
        self.report({"INFO"}, detail)
        return {"FINISHED"}


CLASSES = (
    DGAL_OT_import_mesh_candidate,
    DGAL_OT_audit_mesh_candidate,
    DGAL_OT_align_mesh_candidate,
    DGAL_OT_bind_mesh_candidate,
)
