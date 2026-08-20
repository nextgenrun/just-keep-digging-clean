"""Rest-space Mixamo-to-Survival pose transfer with stable feet and fingers."""

from __future__ import annotations

import math

import bpy
import numpy as np
from mathutils import Matrix, Vector


def world_rest_head(rig, name):
    return rig.matrix_world @ rig.data.bones[name].head_local


def world_pose_head(rig, name):
    return rig.matrix_world @ rig.pose.bones[name].head


def kabsch_rotation(source_vectors, target_vectors):
    source = np.asarray([list(vector) for vector in source_vectors], dtype=np.float64)
    target = np.asarray([list(vector) for vector in target_vectors], dtype=np.float64)
    covariance = source.T @ target
    left, _, right_t = np.linalg.svd(covariance)
    rotation = right_t.T @ left.T
    if np.linalg.det(rotation) < 0.0:
        right_t[-1, :] *= -1.0
        rotation = right_t.T @ left.T
    return Matrix(rotation.tolist())


def rest_alignment(source_rig, target_rig, bone_map):
    labels = list(bone_map)
    source_points = [world_rest_head(source_rig, bone_map[target]) for target in labels]
    target_points = [world_rest_head(target_rig, target) for target in labels]
    source_center = sum(source_points, Vector()) / len(source_points)
    target_center = sum(target_points, Vector()) / len(target_points)
    source_centered = [point - source_center for point in source_points]
    target_centered = [point - target_center for point in target_points]
    rotation = kabsch_rotation(source_centered, target_centered)
    denominator = sum(vector.length_squared for vector in source_centered)
    scale = sum(
        (rotation @ source).dot(target)
        for source, target in zip(source_centered, target_centered)
    ) / max(denominator, 1.0e-12)
    residual = math.sqrt(sum(
        ((rotation @ source) * scale - target).length_squared
        for source, target in zip(source_centered, target_centered)
    ) / len(source_centered))
    return rotation, float(scale), float(residual)


def local_rest_offset(rig, parent_name, child_name):
    parent = rig.data.bones[parent_name]
    child = rig.data.bones[child_name]
    return parent.matrix_local.to_quaternion().inverted() @ (
        child.head_local - parent.head_local
    )


def desired_direction(source_rig, source_parent, source_child, alignment, target_world_to_armature):
    source_world = world_pose_head(source_rig, source_child) - world_pose_head(source_rig, source_parent)
    target_armature = target_world_to_armature @ (alignment @ source_world)
    if target_armature.length < 1.0e-8:
        raise RuntimeError(f"Zero-length source segment: {source_parent}->{source_child}")
    return target_armature.normalized()


def desired_driver_rotation(source_rig, target_rig, target_name, source_parent, children, alignment):
    world_to_armature = target_rig.matrix_world.inverted_safe().to_3x3()
    desired = [
        desired_direction(source_rig, source_parent, source_child, alignment, world_to_armature)
        for _, source_child in children
    ]
    target_rest = target_rig.data.bones[target_name]
    rest_rotation = target_rest.matrix_local.to_quaternion()
    offsets = [
        local_rest_offset(target_rig, target_name, target_child).normalized()
        for target_child, _ in children
    ]
    if len(children) > 1:
        return kabsch_rotation(offsets, desired).to_quaternion()
    rest_direction = (rest_rotation @ offsets[0]).normalized()
    return (rest_direction.rotation_difference(desired[0]) @ rest_rotation).normalized()


def pose_head_from_parent(target_rig, target_name):
    bone = target_rig.data.bones[target_name]
    if bone.parent is None:
        return bone.head_local.copy()
    parent_pose = target_rig.pose.bones[bone.parent.name]
    local_rest = bone.parent.matrix_local.inverted_safe() @ bone.matrix_local
    return (parent_pose.matrix @ local_rest).translation


def set_global_pose(target_rig, target_name, rotation, head=None):
    pose_bone = target_rig.pose.bones[target_name]
    pose_bone.rotation_mode = "QUATERNION"
    pose_bone.matrix = Matrix.LocRotScale(
        head if head is not None else pose_head_from_parent(target_rig, target_name),
        rotation,
        Vector((1.0, 1.0, 1.0)),
    )


def hierarchy_order(target_rig, driver_children):
    return sorted(driver_children, key=lambda name: len(target_rig.data.bones[name].parent_recursive))


def capture_reference_fingers(scene, target_rig, action, prefixes):
    target_rig.animation_data_create()
    target_rig.animation_data.action = action
    if action.slots:
        target_rig.animation_data.action_slot = action.slots[0]
    scene.frame_set(int(action.frame_range[0]))
    bpy.context.view_layer.update()
    captured = {
        bone.name: bone.matrix_basis.copy()
        for bone in target_rig.pose.bones
        if any(bone.name.startswith(prefix) for prefix in prefixes)
    }
    target_rig.animation_data.action = None
    return captured


def reset_pose(target_rig, finger_pose):
    for bone in target_rig.pose.bones:
        bone.matrix_basis.identity()
    for name, matrix in finger_pose.items():
        target_rig.pose.bones[name].matrix_basis = matrix
    bpy.context.view_layer.update()


def apply_world_delta_bone(source_rig, target_rig, target_name, source_name, alignment):
    source_rest = (source_rig.matrix_world @ source_rig.data.bones[source_name].matrix_local).to_quaternion()
    source_pose = (source_rig.matrix_world @ source_rig.pose.bones[source_name].matrix).to_quaternion()
    delta = source_pose @ source_rest.inverted()
    aligned = alignment.to_quaternion() @ delta @ alignment.to_quaternion().inverted()
    target_rest = (target_rig.matrix_world @ target_rig.data.bones[target_name].matrix_local).to_quaternion()
    desired_world = aligned @ target_rest
    desired_armature = target_rig.matrix_world.to_quaternion().inverted() @ desired_world
    set_global_pose(target_rig, target_name, desired_armature)


def contact_z(target_rig, contact_bones):
    return min(world_pose_head(target_rig, name).z for name in contact_bones)


def shift_pelvis_world_z(target_rig, delta_z):
    pelvis = target_rig.pose.bones["pelvis"]
    world_head = target_rig.matrix_world @ pelvis.head
    world_head.z += delta_z
    matrix = pelvis.matrix.copy()
    matrix.translation = target_rig.matrix_world.inverted_safe() @ world_head
    pelvis.matrix = matrix
    bpy.context.view_layer.update()


def apply_pose(source_rig, target_rig, config, alignment, scale, finger_pose, hips_offset_world):
    bone_map = config["boneMap"]
    drivers = config["driverChildren"]
    reset_pose(target_rig, finger_pose)
    target_rest_hips = world_rest_head(target_rig, "pelvis")
    desired_hips_world = target_rest_hips + hips_offset_world * scale
    desired_hips_armature = target_rig.matrix_world.inverted_safe() @ desired_hips_world
    for target_name in hierarchy_order(target_rig, drivers):
        rotation = desired_driver_rotation(
            source_rig, target_rig, target_name, bone_map[target_name], drivers[target_name], alignment
        )
        set_global_pose(
            target_rig,
            target_name,
            rotation,
            desired_hips_armature if target_name == "pelvis" else None,
        )
        bpy.context.view_layer.update()
    for target_name, source_name in config.get("worldDeltaBones", {}).items():
        apply_world_delta_bone(source_rig, target_rig, target_name, source_name, alignment)
        bpy.context.view_layer.update()
