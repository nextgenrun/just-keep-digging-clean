"""Build review-only pickaxe and miner-gear proof props."""

from __future__ import annotations

import bpy
from bpy.props import EnumProperty
from bpy.types import Operator
from mathutils import Matrix, Vector

from .collections import ensure_lab_collections, move_object, tag_object
from .pose_ops import active_rig


def _material(name, color, metallic=0.0, roughness=0.4, emission=None):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    if shader:
        shader.inputs["Base Color"].default_value = color
        shader.inputs["Metallic"].default_value = metallic
        shader.inputs["Roughness"].default_value = roughness
        if emission:
            emission_input = shader.inputs.get("Emission Color") or shader.inputs.get("Emission")
            if emission_input:
                emission_input.default_value = emission
            if shader.inputs.get("Emission Strength"):
                shader.inputs["Emission Strength"].default_value = 5.0
    return material


def _finish(obj, name, material, collection, group):
    obj.name = name
    move_object(obj, collection)
    if obj.type == "MESH":
        obj.data.materials.append(material)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    obj["dgal_attachment_group"] = group
    return obj


def _bone_point(rig, bone_name, tail=False):
    bone = rig.pose.bones.get(bone_name)
    if not bone:
        raise ValueError(f"Rig bone is missing: {bone_name}")
    return rig.matrix_world @ (bone.tail if tail else bone.head)


def _bone_parent(obj, rig, bone_name):
    world = obj.matrix_world.copy()
    obj.parent = rig
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    obj.matrix_world = world


def _clear_group(group):
    for obj in list(bpy.data.objects):
        if obj.get("dgal_attachment_group") == group:
            bpy.data.objects.remove(obj, do_unlink=True)


def _add_grip(name, wrapper, z, collection, state):
    old = bpy.data.objects.get(name)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    grip = bpy.data.objects.new(name, None)
    grip.empty_display_type = "CUBE"
    grip.empty_display_size = 0.045
    grip.parent = wrapper
    grip.location = (0.0, 0.0, z)
    collection.objects.link(grip)
    grip["dgal_attachment_group"] = "pickaxe"
    tag_object(grip, "prop-grip", state.session_name)


class DGAL_OT_create_procedural_pickaxe(Operator):
    bl_idname = "dgal.create_procedural_pickaxe"
    bl_label = "Create fitted pickaxe proof"
    bl_description = "Build a lab-only two-grip pickaxe and parent it to the dominant hand"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state, rig = context.scene.dgal, active_rig(context)
        if not rig:
            self.report({"ERROR"}, "Load an editable rig first")
            return {"CANCELLED"}
        try:
            right = _bone_point(rig, state.attachment_bone, tail=True)
            left = _bone_point(rig, state.offhand_bone, tail=True)
        except ValueError as error:
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        _clear_group("pickaxe")
        collection = ensure_lab_collections()["DGAL_PROPS"]
        wrapper = bpy.data.objects.new("DGAL_ProceduralPickaxe", None)
        wrapper.empty_display_type = "PLAIN_AXES"
        collection.objects.link(wrapper)
        wrapper["dgal_attachment_group"] = "pickaxe"
        tag_object(wrapper, "prop-root", state.session_name)
        shaft_material = _material("DGAL_PickaxeShaft", (0.11, 0.055, 0.025, 1.0), roughness=0.5)
        metal_material = _material("DGAL_PickaxeMetal", (0.055, 0.075, 0.095, 1.0), metallic=0.9, roughness=0.22)
        glow_material = _material(
            "DGAL_PickaxeGlow", (0.01, 0.16, 0.24, 1.0), metallic=0.2, roughness=0.2,
            emission=(0.02, 0.7, 1.0, 1.0),
        )
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.028, depth=1.18, location=(0, 0, 0))
        shaft = _finish(bpy.context.object, "DGAL_PickaxeShaft", shaft_material, collection, "pickaxe")
        shaft.parent = wrapper
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.58))
        head = _finish(bpy.context.object, "DGAL_PickaxeHead", metal_material, collection, "pickaxe")
        head.dimensions = (0.72, 0.11, 0.105)
        head.parent = wrapper
        bpy.ops.mesh.primitive_torus_add(major_radius=0.055, minor_radius=0.012, location=(0, 0, 0.48))
        collar = _finish(bpy.context.object, "DGAL_PickaxeEnergyCollar", glow_material, collection, "pickaxe")
        collar.parent = wrapper
        direction = left - right
        if direction.length < 0.001:
            direction = Vector((0.0, 0.0, 1.0))
        rotation = direction.to_track_quat("Z", "Y")
        midpoint = (right + left) * 0.5
        wrapper.matrix_world = Matrix.Translation(midpoint) @ rotation.to_matrix().to_4x4()
        distance = min(0.8, max(0.18, (left - right).length))
        _add_grip("DGAL_GRIP_R", wrapper, -distance * 0.5, collection, state)
        _add_grip("DGAL_GRIP_L", wrapper, distance * 0.5, collection, state)
        _bone_parent(wrapper, rig, state.attachment_bone)
        state.prop_object = wrapper
        self.report({"INFO"}, "Created fitted pickaxe; GRIP_L is ready for off-hand IK")
        return {"FINISHED"}


class DGAL_OT_create_procedural_gear(Operator):
    bl_idname = "dgal.create_procedural_gear"
    bl_label = "Create miner gear proof"
    bl_description = "Build a lab-only headlamp and compact energy backpack"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state, rig = context.scene.dgal, active_rig(context)
        if not rig:
            self.report({"ERROR"}, "Load an editable rig first")
            return {"CANCELLED"}
        _clear_group("gear")
        collection = ensure_lab_collections()["DGAL_PROPS"]
        dark = _material("DGAL_GearArmor", (0.018, 0.026, 0.038, 1.0), metallic=0.62, roughness=0.28)
        cyan = _material(
            "DGAL_GearGlow", (0.01, 0.14, 0.2, 1.0), metallic=0.2, roughness=0.18,
            emission=(0.02, 0.72, 1.0, 1.0),
        )
        try:
            head = (_bone_point(rig, "head") + _bone_point(rig, "head", True)) * 0.5
            spine_name = "spine_03" if rig.pose.bones.get("spine_03") else "spine_02"
            spine = (_bone_point(rig, spine_name) + _bone_point(rig, spine_name, True)) * 0.5
        except ValueError as error:
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        bpy.ops.mesh.primitive_torus_add(major_radius=0.105, minor_radius=0.012, major_segments=24, minor_segments=8, location=head)
        band = _finish(bpy.context.object, "DGAL_HeadlampBand", dark, collection, "gear")
        _bone_parent(band, rig, "head")
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.045, location=head + Vector((0.0, 0.105, 0.02)))
        lamp = _finish(bpy.context.object, "DGAL_HeadlampLens", cyan, collection, "gear")
        _bone_parent(lamp, rig, "head")
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=spine + Vector((0.0, -0.15, -0.04)))
        pack = _finish(bpy.context.object, "DGAL_EnergyBackpack", dark, collection, "gear")
        pack.dimensions = (0.32, 0.16, 0.46)
        _bone_parent(pack, rig, spine_name)
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.055, depth=0.3, location=spine + Vector((0.12, -0.245, -0.02)))
        core = _finish(bpy.context.object, "DGAL_BackpackCore", cyan, collection, "gear")
        _bone_parent(core, rig, spine_name)
        for obj in (band, lamp, pack, core):
            tag_object(obj, "procedural-gear", state.session_name)
        self.report({"INFO"}, "Created review-only miner gear")
        return {"FINISHED"}


class DGAL_OT_toggle_procedural_group(Operator):
    bl_idname = "dgal.toggle_procedural_group"
    bl_label = "Toggle procedural group"
    bl_options = {"REGISTER", "UNDO"}

    group: EnumProperty(items=(("pickaxe", "Pickaxe", "Toggle pickaxe"), ("gear", "Gear", "Toggle miner gear")))

    def execute(self, context):
        objects = [obj for obj in bpy.data.objects if obj.get("dgal_attachment_group") == self.group]
        if not objects:
            self.report({"WARNING"}, f"No {self.group} proof exists")
            return {"CANCELLED"}
        hidden = not all(obj.hide_viewport for obj in objects)
        for obj in objects:
            obj.hide_viewport = hidden
            obj.hide_render = hidden
        self.report({"INFO"}, f"{self.group} {'hidden' if hidden else 'shown'}")
        return {"FINISHED"}


CLASSES = (
    DGAL_OT_create_procedural_pickaxe,
    DGAL_OT_create_procedural_gear,
    DGAL_OT_toggle_procedural_group,
)

