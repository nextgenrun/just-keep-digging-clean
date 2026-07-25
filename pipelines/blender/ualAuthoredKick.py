"""Apply the values-authored grounded side kick to the native UAL rig."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import bpy
from mathutils import Matrix, Vector


def _load_config(path: str | Path) -> dict[str, Any]:
    config = json.loads(Path(path).read_text(encoding="utf-8"))
    frames = config.get("keyframes")
    if not isinstance(frames, list) or len(frames) < 2:
        raise ValueError("Authored kick requires at least two keyframes")
    if [entry["frame"] for entry in frames] != sorted(entry["frame"] for entry in frames):
        raise ValueError("Authored kick keyframes must be ordered")
    if int(config["frame_count"]) != int(frames[-1]["frame"]) + 1:
        raise ValueError("Authored kick frame_count must end on the final keyframe")
    return config


def _smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def _interpolated_pose(config: dict[str, Any], frame_index: int) -> dict[str, float]:
    keyframes = config["keyframes"]
    before, after = keyframes[0], keyframes[-1]
    for candidate in keyframes:
        if candidate["frame"] <= frame_index:
            before = candidate
        if candidate["frame"] >= frame_index:
            after = candidate
            break
    if before is after or before["frame"] == after["frame"]:
        return {key: float(value) for key, value in before.items() if key != "frame"}
    amount = _smoothstep(
        (frame_index - before["frame"]) / (after["frame"] - before["frame"])
    )
    return {
        key: float(before[key]) + (float(after[key]) - float(before[key])) * amount
        for key in before
        if key != "frame"
    }


def _world_head(actor: Any, bone_name: str) -> Vector:
    return actor.armature.matrix_world @ actor.armature.pose.bones[bone_name].head


def _set_empty_world_rotation(empty: bpy.types.Object, matrix: Matrix) -> None:
    empty.rotation_mode = "QUATERNION"
    empty.rotation_quaternion = matrix.to_quaternion()


def create_authored_kick(actor: Any, config_path: str | Path) -> dict[str, Any]:
    config = _load_config(config_path)
    kick_target = bpy.data.objects.new("UAL_Authored_Kick_IK_Target", None)
    pole_target = bpy.data.objects.new("UAL_Authored_Kick_Pole", None)
    foot_rotation_target = bpy.data.objects.new("UAL_Authored_Kick_Foot_Rotation", None)
    for target in (kick_target, pole_target, foot_rotation_target):
        bpy.context.scene.collection.objects.link(target)

    calf = actor.armature.pose.bones[config["kick_calf_bone"]]
    foot = actor.armature.pose.bones[config["kick_foot_bone"]]
    ik = calf.constraints.new("IK")
    ik.name = "UAL_Authored_Grounded_Side_Kick_IK"
    ik.target = kick_target
    ik.pole_target = pole_target
    ik.chain_count = int(config["ik_chain_count"])
    ik.iterations = int(config["ik_iterations"])
    ik.pole_angle = math.radians(float(config["pole_angle_degrees"]))
    ik.use_rotation = False
    ik.influence = 0.0

    foot_rotation = foot.constraints.new("COPY_ROTATION")
    foot_rotation.name = "UAL_Authored_Grounded_Side_Kick_Foot_Rotation"
    foot_rotation.target = foot_rotation_target
    foot_rotation.owner_space = "WORLD"
    foot_rotation.target_space = "WORLD"
    foot_rotation.mix_mode = "REPLACE"
    foot_rotation.influence = 0.0

    pose_bones = [*config["torso_bones"], config["head_bone"]]
    return {
        "config": config,
        "kick_target": kick_target,
        "pole_target": pole_target,
        "foot_rotation_target": foot_rotation_target,
        "ik": ik,
        "foot_rotation": foot_rotation,
        "pose_bones": pose_bones,
        "base_pose": None,
    }


def _capture_base_pose(actor: Any, state: dict[str, Any]) -> None:
    config = state["config"]
    armature = actor.armature
    bpy.context.view_layer.update()
    foot = armature.pose.bones[config["kick_foot_bone"]]
    state["base_pose"] = {
        "kick_foot": _world_head(actor, config["kick_foot_bone"]),
        "hip": _world_head(actor, config["hip_bone"]),
        "height": max(
            0.001,
            _world_head(actor, config["head_bone"]).z
            - min(
                _world_head(actor, config["kick_foot_bone"]).z,
                _world_head(actor, config["support_foot_bone"]).z,
            ),
        ),
        "foot_rotation": (armature.matrix_world @ foot.matrix).to_quaternion(),
        "matrix_basis": {
            name: armature.pose.bones[name].matrix_basis.copy()
            for name in state["pose_bones"]
        },
    }


def _apply_local_rotation(
    bone: bpy.types.PoseBone,
    base: Matrix,
    axis: str,
    degrees: float,
) -> None:
    bone.matrix_basis = base @ Matrix.Rotation(math.radians(degrees), 4, axis)


def apply_authored_kick(
    actor: Any,
    state: dict[str, Any],
    frame_index: int,
    frame_count: int,
) -> None:
    config = state["config"]
    if int(frame_count) != int(config["frame_count"]):
        raise ValueError("Authored kick renderer frame count does not match values config")
    if state["base_pose"] is None:
        _capture_base_pose(actor, state)
    base = state["base_pose"]
    pose = _interpolated_pose(config, frame_index)

    for index, bone_name in enumerate(config["torso_bones"]):
        bone = actor.armature.pose.bones[bone_name]
        basis = base["matrix_basis"][bone_name]
        lean = pose["lean_degrees"] * float(config["torso_lean_weights"][index])
        twist = pose["twist_degrees"] * float(config["torso_twist_weights"][index])
        rotated = basis @ Matrix.Rotation(
            math.radians(lean), 4, config["torso_lean_axis"]
        )
        bone.matrix_basis = rotated @ Matrix.Rotation(
            math.radians(twist), 4, config["torso_twist_axis"]
        )
    _apply_local_rotation(
        actor.armature.pose.bones[config["head_bone"]],
        base["matrix_basis"][config["head_bone"]],
        config["head_counter_axis"],
        pose["head_degrees"],
    )

    height = float(base["height"])
    forward = Vector(config["forward_world_axis"]).normalized()
    state["kick_target"].location = (
        base["kick_foot"]
        + forward * pose["forward"] * height
        + Vector((0.0, 0.0, pose["up"] * height))
    )
    state["pole_target"].location = (
        base["hip"]
        + forward * float(config["pole_forward_height_fraction"]) * height
        + Vector((
            float(config["pole_camera_depth_height_fraction"]) * height,
            0.0,
            float(config["pole_vertical_height_fraction"]) * height,
        ))
    )
    state["foot_rotation_target"].location = state["kick_target"].location
    _set_empty_world_rotation(
        state["foot_rotation_target"],
        base["foot_rotation"].to_matrix().to_4x4(),
    )
    state["ik"].influence = pose["ik"]
    state["foot_rotation"].influence = pose["ik"]
    bpy.context.view_layer.update()


def destroy_authored_kick(actor: Any, state: dict[str, Any] | None) -> None:
    if not state:
        return
    config = state["config"]
    actor.armature.pose.bones[config["kick_calf_bone"]].constraints.remove(state["ik"])
    actor.armature.pose.bones[config["kick_foot_bone"]].constraints.remove(state["foot_rotation"])
    for target_name in ("kick_target", "pole_target", "foot_rotation_target"):
        bpy.data.objects.remove(state[target_name], do_unlink=True)


def describe_authored_kick(state: dict[str, Any] | None) -> dict[str, Any] | None:
    if not state:
        return None
    config = state["config"]
    return {
        "version": int(config["version"]),
        "id": config["id"],
        "frame_count": int(config["frame_count"]),
        "contact_frame": int(config["contact_frame"]),
        "base_source": config["base_source"],
        "base_clip": config["base_clip"],
        "base_frame": float(config["base_frame"]),
        "kick_foot_bone": config["kick_foot_bone"],
        "support_foot_bone": config["support_foot_bone"],
        "root_travel": "none",
    }
