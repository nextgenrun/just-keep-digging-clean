"""Pose sampling helpers for the unified Survival render pipeline."""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


def set_frame(scene, value: float) -> None:
    whole = math.floor(value)
    scene.frame_set(whole, subframe=value - whole)
    bpy.context.view_layer.update()


def assign_action(rig, action) -> None:
    rig.animation_data_create()
    rig.animation_data.action = action
    if action is not None and action.slots:
        rig.animation_data.action_slot = action.slots[0]


def sampled_frames(action, count: int, loop: bool, step: float | None = None) -> list[float]:
    start, end = (float(value) for value in action.frame_range)
    if step is not None:
        samples = [start + step * index for index in range(count)]
        if samples and samples[-1] > end + 0.001:
            raise RuntimeError(f"Sample range exceeds action {action.name}: {samples[-1]} > {end}")
        return samples
    denominator = count if loop else max(1, count - 1)
    return [start + (end - start) * index / denominator for index in range(count)]


def import_fbx(path: Path):
    before_objects = set(bpy.data.objects)
    before_actions = set(bpy.data.actions)
    result = bpy.ops.import_scene.fbx(
        filepath=str(path),
        automatic_bone_orientation=False,
        use_anim=True,
    )
    if "FINISHED" not in result:
        raise RuntimeError(f"FBX import failed: {path}")
    imported = [obj for obj in bpy.data.objects if obj not in before_objects]
    rigs = [obj for obj in imported if obj.type == "ARMATURE"]
    if len(rigs) != 1:
        raise RuntimeError(f"Expected one carrier armature in {path}, found {len(rigs)}")
    rig = rigs[0]
    action = rig.animation_data.action if rig.animation_data else None
    if action is None:
        raise RuntimeError(f"Carrier has no action: {path}")
    new_actions = [action for action in bpy.data.actions if action not in before_actions]
    for obj in imported:
        obj.hide_render = True
    return rig, action, imported, new_actions


def cleanup(imported, actions) -> None:
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)
    for action in actions:
        if action.users == 0:
            bpy.data.actions.remove(action)


def capture_pose(rig) -> dict[str, Matrix]:
    return {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones}


def restore_pose(rig, pose: dict[str, Matrix]) -> None:
    assign_action(rig, None)
    for bone in rig.pose.bones:
        bone.matrix_basis = pose.get(bone.name, Matrix.Identity(4))
    bpy.context.view_layer.update()


def direct_action_pose(scene, target_rig, action, source_frame: float) -> dict[str, Matrix]:
    assign_action(target_rig, action)
    set_frame(scene, source_frame)
    pose = capture_pose(target_rig)
    assign_action(target_rig, None)
    return pose


def blend_matrix(base: Matrix, overlay: Matrix, weight: float) -> Matrix:
    if weight <= 0.0:
        return base.copy()
    if weight >= 1.0:
        return overlay.copy()
    base_location, base_rotation, base_scale = base.decompose()
    overlay_location, overlay_rotation, overlay_scale = overlay.decompose()
    return Matrix.LocRotScale(
        base_location.lerp(overlay_location, weight),
        base_rotation.slerp(overlay_rotation, weight),
        base_scale.lerp(overlay_scale, weight),
    )


def blend_poses(
    base: dict[str, Matrix],
    overlay: dict[str, Matrix],
    weights: dict[str, float],
    envelope: float,
) -> dict[str, Matrix]:
    return {
        name: blend_matrix(matrix, overlay.get(name, matrix), weights.get(name, 0.0) * envelope)
        for name, matrix in base.items()
    }


def smooth_envelope(index: int, count: int, edge_frames: int | None = None) -> float:
    if count <= 2:
        return 1.0
    edge = max(2, min(edge_frames or 4, (count + 1) // 2))
    raw = min(1.0, index / (edge - 1), (count - 1 - index) / (edge - 1))
    return raw * raw * (3.0 - 2.0 * raw)


def target_ground_height(target_rig, contact_bones) -> float:
    return min(
        (target_rig.matrix_world @ target_rig.data.bones[name].head_local).z
        for name in contact_bones
    )


def contact_height(target_rig, contact_bones) -> float:
    return min((target_rig.matrix_world @ target_rig.pose.bones[name].head).z for name in contact_bones)


def lock_ground(target_rig, target_ground: float, contact_bones) -> float:
    delta = target_ground - contact_height(target_rig, contact_bones)
    pelvis = target_rig.pose.bones["pelvis"]
    world_head = target_rig.matrix_world @ pelvis.head
    world_head.z += delta
    matrix = pelvis.matrix.copy()
    matrix.translation = target_rig.matrix_world.inverted_safe() @ world_head
    pelvis.matrix = matrix
    bpy.context.view_layer.update()
    return delta


def mesh_bottom_world_z(body) -> float:
    evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    try:
        return min((evaluated.matrix_world @ vertex.co).z for vertex in mesh.vertices)
    finally:
        evaluated.to_mesh_clear()


def lock_mesh_ground(target_rig, body, target_ground: float) -> float:
    delta = target_ground - mesh_bottom_world_z(body)
    pelvis = target_rig.pose.bones["pelvis"]
    world_head = target_rig.matrix_world @ pelvis.head
    world_head.z += delta
    matrix = pelvis.matrix.copy()
    matrix.translation = target_rig.matrix_world.inverted_safe() @ world_head
    pelvis.matrix = matrix
    bpy.context.view_layer.update()
    return delta


def rest_camera_axis_position(target_rig, camera, bone_name: str = "pelvis") -> float:
    axis = camera_right(camera)
    rest_head = target_rig.matrix_world @ target_rig.data.bones[bone_name].head_local
    return rest_head.dot(axis)


def pose_camera_axis_position(target_rig, camera, bone_name: str = "pelvis") -> float:
    return (target_rig.matrix_world @ target_rig.pose.bones[bone_name].head).dot(
        camera_right(camera)
    )


def lock_camera_axis_travel(
    target_rig,
    camera,
    target_position: float,
    bone_name: str = "pelvis",
) -> float:
    """Remove authored forward travel while preserving height and lateral sway."""
    axis = camera_right(camera)
    bone = target_rig.pose.bones[bone_name]
    world_head = target_rig.matrix_world @ bone.head
    delta = target_position - world_head.dot(axis)
    world_head += axis * delta
    matrix = bone.matrix.copy()
    matrix.translation = target_rig.matrix_world.inverted_safe() @ world_head
    bone.matrix = matrix
    bpy.context.view_layer.update()
    return delta


def moving_weights(config, overlay_right_leg: bool) -> dict[str, float]:
    weights = dict(config["upperBodyWeights"])
    prefixes = tuple(config["fingerPrefixes"])
    for bone in bpy.data.objects[config.get("targetRig", "SurvivalPolishRig")].pose.bones:
        if bone.name.startswith(prefixes):
            weights[bone.name] = 1.0
    if overlay_right_leg:
        weights.update(config["rightLegWeights"])
    return weights


def camera_right(camera) -> Vector:
    return (camera.matrix_world.to_3x3() @ Vector((1.0, 0.0, 0.0))).normalized()
