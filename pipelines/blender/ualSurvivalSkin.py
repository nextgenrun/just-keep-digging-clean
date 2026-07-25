"""Drive the approved Survival Character deform rig from evaluated UAL poses."""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import bpy
from mathutils import Matrix, Quaternion, Vector


@dataclass
class SurvivalSkinState:
    config: dict[str, Any]
    source_path: Path
    wrapper: bpy.types.Object
    rig: bpy.types.Object
    body: bpy.types.Object
    transfers: list[dict[str, Any]]
    wrapper_base_location: Vector
    reference_actor_base_location: Vector
    fit_scale: float
    reference_bounds: tuple[Vector, Vector]
    skin_bounds: tuple[Vector, Vector]
    pelvis_world_offset: Vector
    pelvis_rest_world: Vector
    source_reference_center: Vector
    coordinate_rotation: Matrix
    ik_entries: list[dict[str, Any]]


def _world_bounds(meshes: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    points: list[Vector] = []
    for obj in meshes:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            points.extend(evaluated.matrix_world @ vertex.co for vertex in mesh.vertices)
        finally:
            evaluated.to_mesh_clear()
    if not points:
        raise RuntimeError("Visible skin bounds require at least one evaluated vertex")
    return (
        Vector(tuple(min(point[axis] for point in points) for axis in range(3))),
        Vector(tuple(max(point[axis] for point in points) for axis in range(3))),
    )


def _append_objects(blend_path: Path, names: list[str]) -> list[bpy.types.Object]:
    with bpy.data.libraries.load(str(blend_path), link=False) as (source, target):
        missing = [name for name in names if name not in source.objects]
        if missing:
            raise RuntimeError(f"Survival skin source is missing objects: {missing}")
        target.objects = names
    objects = [obj for obj in target.objects if obj is not None]
    for obj in objects:
        if not obj.users_collection:
            bpy.context.scene.collection.objects.link(obj)
    return objects


def _reset_pose(rig: bpy.types.Object, mute_constraints: bool = False) -> None:
    rig.animation_data_create()
    rig.animation_data.action = None
    for bone in rig.pose.bones:
        if mute_constraints:
            for constraint in bone.constraints:
                constraint.mute = True
        bone.matrix_basis.identity()
    bpy.context.view_layer.update()


def _depth(bone: bpy.types.Bone) -> int:
    value = 0
    parent = bone.parent
    while parent is not None:
        value += 1
        parent = parent.parent
    return value


def _flatten_transfers(config: dict[str, Any], rig: bpy.types.Object) -> list[dict[str, Any]]:
    transfers = [
        {
            "source": entry["source"],
            "target": target["bone"],
            "weight": float(target["weight"]),
        }
        for entry in config["bone_transfers"]
        for target in entry["targets"]
    ]
    missing = [entry["target"] for entry in transfers if rig.data.bones.get(entry["target"]) is None]
    if missing:
        raise RuntimeError(f"Survival skin target bones are missing: {missing}")
    transfers.sort(key=lambda entry: _depth(rig.data.bones[entry["target"]]))
    return transfers


def _deforming_reference_meshes(actor: Any, reference_name: str) -> list[bpy.types.Object]:
    matches = [
        mesh
        for mesh in actor.meshes
        if mesh.name.split(".")[0] == reference_name
        and any(modifier.type == "ARMATURE" and modifier.object is actor.armature for modifier in mesh.modifiers)
    ]
    if not matches:
        raise RuntimeError(f"UAL reference deform mesh is missing: {reference_name}")
    return matches


def _create_ik_entries(rig: bpy.types.Object, config: dict[str, Any]) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    if not config["ik"]["enabled"]:
        return entries
    for chain in config["ik"]["chains"]:
        chain_id = str(chain["id"])
        target = bpy.data.objects.new(f"UALSurvivalSkinIK_{chain_id}", None)
        pole = bpy.data.objects.new(f"UALSurvivalSkinPole_{chain_id}", None)
        bpy.context.scene.collection.objects.link(target)
        bpy.context.scene.collection.objects.link(pole)
        constraint = rig.pose.bones[str(chain["target_bone"])].constraints.new("IK")
        constraint.name = f"UAL Survival Skin {chain_id}"
        constraint.target = target
        constraint.pole_target = pole
        constraint.chain_count = int(chain["chain_count"])
        constraint.iterations = int(config["ik"]["iterations"])
        constraint.pole_angle = math.radians(float(chain["pole_angle_degrees"]))
        entries.append({"config": chain, "target": target, "pole": pole, "constraint": constraint})
    return entries


def create_survival_skin(actor: Any, config_path: Path) -> SurvivalSkinState:
    config_path = config_path.resolve()
    config = json.loads(config_path.read_text(encoding="utf-8"))
    root = config_path.parent.parent
    source_path = (root / config["source"]["blend"]).resolve()
    rig_name = str(config["source"]["rig_object"])
    body_name = str(config["source"]["mesh_object"])
    rig, body = _append_objects(source_path, [rig_name, body_name])
    if rig.type != "ARMATURE" or body.type != "MESH":
        raise RuntimeError("Survival skin source object types drifted")
    rig.name = "UALSurvivalSkinRig"
    body.name = "UALSurvivalSkinBody"
    _reset_pose(rig, mute_constraints=True)

    wrapper = bpy.data.objects.new("UALSurvivalSkinWrapper", None)
    bpy.context.scene.collection.objects.link(wrapper)
    rig_world = rig.matrix_world.copy()
    rig.parent = wrapper
    rig.matrix_world = rig_world
    if body.parent is None:
        body_world = body.matrix_world.copy()
        body.parent = rig
        body.matrix_world = body_world
    wrapper.rotation_euler.z = math.radians(float(config["fit"]["skin_yaw_offset_degrees"]))

    actor.armature.animation_data_create()
    actor.armature.animation_data.action = None
    for pose_bone in actor.armature.pose.bones:
        pose_bone.matrix_basis.identity()
    bpy.context.view_layer.update()
    reference_meshes = _deforming_reference_meshes(actor, str(config["fit"]["reference_mesh"]))
    reference_bounds = _world_bounds(reference_meshes)
    skin_bounds = _world_bounds([body])
    reference_height = reference_bounds[1].z - reference_bounds[0].z
    skin_height = skin_bounds[1].z - skin_bounds[0].z
    fit_scale = reference_height / max(skin_height, 0.0001)
    wrapper.scale *= fit_scale
    bpy.context.view_layer.update()
    skin_bounds = _world_bounds([body])
    reference_center = (reference_bounds[0] + reference_bounds[1]) * 0.5
    skin_center = (skin_bounds[0] + skin_bounds[1]) * 0.5
    wrapper.location += Vector((
        reference_center.x - skin_center.x,
        reference_center.y - skin_center.y,
        reference_bounds[0].z - skin_bounds[0].z,
    ))
    bpy.context.view_layer.update()
    skin_bounds = _world_bounds([body])
    body.hide_render = False
    yaw = math.radians(float(config["fit"]["source_position_yaw_offset_degrees"]))
    coordinate_rotation = Matrix.Rotation(yaw, 4, "Z")
    target_pelvis = rig.matrix_world @ rig.data.bones["pelvis"].head_local
    source_pelvis = actor.armature.matrix_world @ actor.armature.data.bones["pelvis"].head_local
    mapped_source_pelvis = reference_center + (
        coordinate_rotation.to_3x3() @ (source_pelvis - reference_center)
    )
    ik_entries = _create_ik_entries(rig, config)
    return SurvivalSkinState(
        config=config,
        source_path=source_path,
        wrapper=wrapper,
        rig=rig,
        body=body,
        transfers=_flatten_transfers(config, rig),
        wrapper_base_location=wrapper.location.copy(),
        reference_actor_base_location=actor.base_location.copy(),
        fit_scale=fit_scale,
        reference_bounds=reference_bounds,
        skin_bounds=skin_bounds,
        pelvis_world_offset=target_pelvis - mapped_source_pelvis,
        pelvis_rest_world=target_pelvis,
        source_reference_center=reference_center,
        coordinate_rotation=coordinate_rotation,
        ik_entries=ik_entries,
    )


def _local_rest(rig: bpy.types.Object, bone_name: str) -> Matrix:
    bone = rig.data.bones[bone_name]
    return bone.matrix_local.copy() if bone.parent is None else bone.parent.matrix_local.inverted_safe() @ bone.matrix_local


def _local_pose(rig: bpy.types.Object, bone_name: str) -> Matrix:
    bone = rig.pose.bones[bone_name]
    return bone.matrix.copy() if bone.parent is None else bone.parent.matrix.inverted_safe() @ bone.matrix


def _weighted_rotation(delta: Matrix, weight: float) -> Matrix:
    _location, rotation, _scale = delta.decompose()
    weighted = Quaternion().slerp(rotation, weight)
    return Matrix.LocRotScale(Vector(), weighted, Vector((1.0, 1.0, 1.0)))


def _source_bone_point(actor: Any, bone_name: str, point: str = "head") -> Vector:
    pose_bone = actor.armature.pose.bones[bone_name]
    return actor.armature.matrix_world @ getattr(pose_bone, point)


def _map_source_point(state: SurvivalSkinState, point: Vector) -> Vector:
    return state.source_reference_center + (
        state.coordinate_rotation.to_3x3() @ (point - state.source_reference_center)
    )


def _world_rest_bone_length(rig: bpy.types.Object, bone_name: str) -> float:
    bone = rig.data.bones[bone_name]
    return (rig.matrix_world @ bone.tail_local - rig.matrix_world @ bone.head_local).length


def _update_ik(actor: Any, state: SurvivalSkinState) -> None:
    distance = float(state.config["ik"]["pole_distance_world"])
    for entry in state.ik_entries:
        chain = entry["config"]
        source_start_name = str(chain["source_start"])
        source_joint_name = str(chain["source_joint"])
        source_start = _source_bone_point(actor, source_start_name)
        source_joint = _source_bone_point(actor, source_joint_name)
        source_target = _source_bone_point(actor, str(chain["source_target"]))
        mapped_vector = state.coordinate_rotation.to_3x3() @ (source_target - source_start)
        source_chain_length = (
            _world_rest_bone_length(actor.armature, source_start_name)
            + _world_rest_bone_length(actor.armature, source_joint_name)
        )
        target_start_name = str(chain.get("target_start_bone", source_start_name))
        target_joint_name = str(chain["target_bone"])
        target_chain_length = (
            _world_rest_bone_length(state.rig, target_start_name)
            + _world_rest_bone_length(state.rig, target_joint_name)
        )
        target_start = state.rig.matrix_world @ state.rig.pose.bones[target_start_name].head
        reach_fraction = min(0.995, mapped_vector.length / max(source_chain_length, 0.0001))
        direction = mapped_vector.normalized() if mapped_vector.length > 0.0001 else Vector((0.0, 0.0, -1.0))
        target = target_start + direction * target_chain_length * reach_fraction
        source_upper_fraction = _world_rest_bone_length(actor.armature, source_start_name) / max(source_chain_length, 0.0001)
        source_line_joint = source_start.lerp(source_target, source_upper_fraction)
        bend = state.coordinate_rotation.to_3x3() @ (source_joint - source_line_joint)
        if bend.length < 0.0001:
            source_bone = actor.armature.pose.bones[source_joint_name]
            bend = actor.armature.matrix_world.to_3x3() @ source_bone.x_axis
        bend.normalize()
        entry["target"].location = target
        entry["pole"].location = (
            target_start
            + direction * target_chain_length * source_upper_fraction
            + bend * distance
        )
        entry["constraint"].mute = False


def _debug_ik_pose(state: SurvivalSkinState) -> None:
    if not state.config["ik"].get("debug_print_first_pose") or getattr(state, "_ik_debugged", False):
        return
    state._ik_debugged = True
    payload = []
    for entry in state.ik_entries:
        bone = state.rig.pose.bones[str(entry["config"]["target_bone"])]
        tail_world = state.rig.matrix_world @ bone.tail
        payload.append({
            "id": entry["config"]["id"],
            "target": [round(value, 4) for value in entry["target"].location],
            "tail": [round(value, 4) for value in tail_world],
            "error": round((tail_world - entry["target"].location).length, 5),
        })
    print("UAL_SURVIVAL_IK_DEBUG " + json.dumps(payload), flush=True)


def apply_survival_skin(actor: Any, state: SurvivalSkinState) -> None:
    state.wrapper.location = state.wrapper_base_location + (actor.wrapper.location - actor.base_location)
    for entry in state.ik_entries:
        entry["constraint"].mute = True
    _reset_pose(state.rig)
    source_names = {entry["source"] for entry in state.transfers}
    missing = [name for name in source_names if actor.armature.pose.bones.get(name) is None]
    if missing:
        raise RuntimeError(f"UAL skin driver bones are missing: {missing}")
    for entry in state.transfers:
        source_name = entry["source"]
        target_name = entry["target"]
        source_delta = _local_rest(actor.armature, source_name).inverted_safe() @ _local_pose(actor.armature, source_name)
        target_local = _local_rest(state.rig, target_name) @ _weighted_rotation(source_delta, entry["weight"])
        target_bone = state.rig.pose.bones[target_name]
        if target_bone.parent is not None:
            target_bone.matrix = target_bone.parent.matrix @ target_local
        else:
            target_bone.matrix = target_local
        if target_name == "pelvis":
            source_pose = actor.armature.pose.bones[source_name]
            pose_world = _map_source_point(state, actor.armature.matrix_world @ source_pose.head)
            axes = state.config["fit"]["pelvis_translation_axes"]
            desired_world = pose_world + state.pelvis_world_offset
            for index in range(3):
                if float(axes[index]) == 0.0:
                    desired_world[index] = state.pelvis_rest_world[index]
            target_bone.matrix.translation = state.rig.matrix_world.inverted() @ desired_world
    _update_ik(actor, state)
    bpy.context.view_layer.update()
    _debug_ik_pose(state)


def set_survival_skin_visible(state: SurvivalSkinState, visible: bool) -> None:
    state.wrapper.hide_render = not visible
    state.body.hide_render = not visible


def describe_survival_skin(state: SurvivalSkinState) -> dict[str, Any]:
    return {
        "version": int(state.config["version"]),
        "id": state.config["id"],
        "source_blend": str(state.source_path),
        "approval_reference": state.config["source"]["approval_reference"],
        "rejected_mesh_policy": state.config["source"]["rejected_mesh_policy"],
        "motion_authority": "evaluated-ual-native-rig",
        "deformation_authority": "survival-160-bone-native-weights",
        "fit_mode": state.config["fit"]["height_mode"],
        "fit_scale": round(state.fit_scale, 8),
        "bone_transfer_count": len(state.transfers),
        "materials": [material.name for material in state.body.data.materials],
    }
