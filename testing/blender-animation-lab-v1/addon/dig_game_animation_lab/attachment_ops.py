"""Import, socket, two-hand constrain, and validate lab-only props."""

from __future__ import annotations

from pathlib import Path

import bpy
from bpy.types import Operator
from mathutils import Vector

from .collections import ensure_lab_collections, move_object, tag_object
from .paths import resolve_path
from .pose_ops import active_rig


def _import_objects(path: Path):
    before = set(bpy.context.scene.objects)
    suffix = path.suffix.lower()
    if suffix in {".glb", ".gltf"}:
        bpy.ops.import_scene.gltf(filepath=str(path))
    elif suffix == ".fbx":
        bpy.ops.import_scene.fbx(filepath=str(path), automatic_bone_orientation=False)
    else:
        raise ValueError("Prop import supports GLB, GLTF, and FBX")
    return [obj for obj in bpy.context.scene.objects if obj not in before]


def _wrapper(objects, name: str, collection):
    wrapper = bpy.data.objects.new(name, None)
    wrapper.empty_display_type = "PLAIN_AXES"
    collection.objects.link(wrapper)
    imported = set(objects)
    for obj in objects:
        if obj.parent not in imported:
            world = obj.matrix_world.copy()
            obj.parent = wrapper
            obj.matrix_world = world
    return wrapper


def _local_bounds(objects, wrapper):
    inverse = wrapper.matrix_world.inverted_safe()
    points = [inverse @ (obj.matrix_world @ Vector(corner)) for obj in objects if obj.type == "MESH" for corner in obj.bound_box]
    if not points:
        return Vector((-0.5, -0.5, -0.5)), Vector((0.5, 0.5, 0.5))
    return (
        Vector(tuple(min(point[axis] for point in points) for axis in range(3))),
        Vector(tuple(max(point[axis] for point in points) for axis in range(3))),
    )


def _grip(name: str):
    return bpy.data.objects.get(name)


class DGAL_OT_import_prop(Operator):
    bl_idname = "dgal.import_prop"
    bl_label = "Import gear / pickaxe"
    bl_description = "Import a prop into the isolated DGAL_PROPS collection"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state = context.scene.dgal
        path = resolve_path(state.prop_path, state.repo_root)
        if not path.is_file():
            self.report({"ERROR"}, f"Missing prop: {path}")
            return {"CANCELLED"}
        collection = ensure_lab_collections()["DGAL_PROPS"]
        try:
            objects = _import_objects(path)
        except (RuntimeError, ValueError) as error:
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        for obj in objects:
            move_object(obj, collection)
            tag_object(obj, "prop-part", state.session_name)
        wrapper = _wrapper(objects, f"DGAL_PROP_{path.stem}", collection)
        tag_object(wrapper, "prop-root", state.session_name)
        state.prop_object = wrapper
        context.view_layer.objects.active = wrapper
        wrapper.select_set(True)
        self.report({"INFO"}, f"Imported {len(objects)} prop objects")
        return {"FINISHED"}


class DGAL_OT_attach_prop(Operator):
    bl_idname = "dgal.attach_prop"
    bl_label = "Attach prop to bone"
    bl_description = "Bone-parent the prop to one authoritative socket while preserving its world transform"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state = context.scene.dgal
        rig, prop = active_rig(context), state.prop_object
        bone = rig.pose.bones.get(state.attachment_bone) if rig else None
        if not rig or not prop or not bone:
            self.report({"ERROR"}, "Load a rig/prop and enter a valid attachment bone")
            return {"CANCELLED"}
        world = prop.matrix_world.copy()
        prop.parent = rig
        prop.parent_type = "BONE"
        prop.parent_bone = bone.name
        prop.matrix_world = world
        prop["dgal_attachment_bone"] = bone.name
        self.report({"INFO"}, f"Attached prop to {bone.name}; move it to fit the hand")
        return {"FINISHED"}


class DGAL_OT_create_prop_grips(Operator):
    bl_idname = "dgal.create_prop_grips"
    bl_label = "Create two-hand grips"
    bl_description = "Create editable GRIP_R and GRIP_L empties on the prop"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state, prop = context.scene.dgal, context.scene.dgal.prop_object
        if not prop:
            self.report({"ERROR"}, "Import a prop first")
            return {"CANCELLED"}
        parts = [obj for obj in prop.children_recursive if obj.type == "MESH"]
        minimum, maximum = _local_bounds(parts, prop)
        center = (minimum + maximum) * 0.5
        length_axis = max(range(3), key=lambda axis: maximum[axis] - minimum[axis])
        span = maximum[length_axis] - minimum[length_axis]
        for name, fraction in (("DGAL_GRIP_R", -0.2), ("DGAL_GRIP_L", 0.2)):
            old = bpy.data.objects.get(name)
            if old:
                bpy.data.objects.remove(old, do_unlink=True)
            grip = bpy.data.objects.new(name, None)
            grip.empty_display_type = "CUBE"
            grip.empty_display_size = max(0.015, span * 0.04)
            grip.parent = prop
            grip.location = center
            grip.location[length_axis] += span * fraction
            ensure_lab_collections()["DGAL_PROPS"].objects.link(grip)
            tag_object(grip, "prop-grip", state.session_name)
        self.report({"INFO"}, "Created two editable prop grip points")
        return {"FINISHED"}


class DGAL_OT_pin_offhand_to_grip(Operator):
    bl_idname = "dgal.pin_offhand_to_grip"
    bl_label = "IK off-hand to GRIP_L"
    bl_description = "Add a reversible IK chain from the off-hand to the prop grip"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        state, rig = context.scene.dgal, active_rig(context)
        bone = rig.pose.bones.get(state.offhand_bone) if rig else None
        grip = _grip("DGAL_GRIP_L")
        if not bone or not grip:
            self.report({"ERROR"}, "Off-hand bone or DGAL_GRIP_L is missing")
            return {"CANCELLED"}
        constraint = bone.constraints.get("DGAL_PROP_OFFHAND_IK") or bone.constraints.new("IK")
        constraint.name = "DGAL_PROP_OFFHAND_IK"
        constraint.target = grip
        constraint.chain_count = state.offhand_chain_count
        self.report({"INFO"}, f"Pinned {bone.name} to GRIP_L")
        return {"FINISHED"}


def _bone_point(rig, name):
    bone = rig.pose.bones.get(name)
    return rig.matrix_world @ bone.tail if bone else None


class DGAL_OT_validate_prop_grips(Operator):
    bl_idname = "dgal.validate_prop_grips"
    bl_label = "Validate grip fit"
    bl_description = "Measure both hands against prop grips over the authored frame range"
    bl_options = {"REGISTER"}

    def execute(self, context):
        scene, state, rig = context.scene, context.scene.dgal, active_rig(context)
        pairs = ((state.attachment_bone, _grip("DGAL_GRIP_R")), (state.offhand_bone, _grip("DGAL_GRIP_L")))
        if not rig or any(grip is None for _, grip in pairs):
            self.report({"ERROR"}, "Rig and both prop grips are required")
            return {"CANCELLED"}
        original = scene.frame_current
        distances = []
        try:
            for frame in range(min(state.frame_start, state.frame_end), max(state.frame_start, state.frame_end) + 1):
                scene.frame_set(frame)
                context.view_layer.update()
                for bone_name, grip in pairs:
                    point = _bone_point(rig, bone_name)
                    if point is not None:
                        distances.append((point - grip.matrix_world.translation).length)
        finally:
            scene.frame_set(original)
        if not distances:
            self.report({"ERROR"}, "No valid hand/grip samples")
            return {"CANCELLED"}
        state.attachment_report = f"mean {sum(distances) / len(distances):.4f} m | max {max(distances):.4f} m | {len(distances)} samples"
        self.report({"INFO"}, state.attachment_report)
        return {"FINISHED"}


CLASSES = (
    DGAL_OT_import_prop,
    DGAL_OT_attach_prop,
    DGAL_OT_create_prop_grips,
    DGAL_OT_pin_offhand_to_grip,
    DGAL_OT_validate_prop_grips,
)

