"""Contact-window IK for adapting native UAL clips to Dig Game tiles."""

from __future__ import annotations

from typing import Any

import bpy


PRESETS = {
    "dig-up": {
        "bone": "hand_l",
        "anchor": "Head",
        "height_fraction": 1.16,
        "screen_y_offset_height": -0.035,
        "max_influence": 1.0,
        "rise": (14, 28),
        "wrapped_release": (0, 6, 0.76),
    },
    "dig-down": {
        "bone": "hand_l",
        "anchor": "pelvis",
        "height_fraction": 0.13,
        "screen_y_offset_height": -0.12,
        "max_influence": 0.74,
        "rise": (18, 35),
        "release": (35, 52),
    },
}


def _smoothstep(value: float) -> float:
    t = max(0.0, min(1.0, value))
    return t * t * (3.0 - 2.0 * t)


def _influence(config: dict[str, Any], frame_index: int) -> float:
    maximum = float(config["max_influence"])
    start, peak = config["rise"]
    if start <= frame_index <= peak:
        return maximum * _smoothstep((frame_index - start) / max(1, peak - start))
    release = config.get("release")
    if release and release[0] < frame_index <= release[1]:
        return maximum * (1.0 - _smoothstep((frame_index - release[0]) / max(1, release[1] - release[0])))
    wrapped = config.get("wrapped_release")
    if wrapped and wrapped[0] <= frame_index <= wrapped[1]:
        start_value = float(wrapped[2])
        return maximum * start_value * (1.0 - _smoothstep((frame_index - wrapped[0]) / max(1, wrapped[1] - wrapped[0])))
    return 0.0


def _mesh_height(meshes: list[bpy.types.Object]) -> tuple[float, float]:
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    minimum_z, maximum_z = float("inf"), float("-inf")
    for obj in meshes:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            for vertex in mesh.vertices:
                z = (evaluated.matrix_world @ vertex.co).z
                minimum_z, maximum_z = min(minimum_z, z), max(maximum_z, z)
        finally:
            evaluated.to_mesh_clear()
    return minimum_z, max(0.001, maximum_z - minimum_z)


def create_game_retarget(actor: Any, preset_name: str | None) -> dict[str, Any] | None:
    config = PRESETS.get(str(preset_name))
    if not config:
        return None
    target = bpy.data.objects.new(f"UAL_{preset_name}_IK_Target", None)
    bpy.context.scene.collection.objects.link(target)
    constraint = actor.armature.pose.bones[config["bone"]].constraints.new("IK")
    constraint.name = f"UAL_{preset_name}_Contact_IK"
    constraint.target = target
    constraint.chain_count = 3
    constraint.influence = 0.0
    return {"name": preset_name, "config": config, "target": target, "constraint": constraint}


def apply_game_retarget(actor: Any, state: dict[str, Any] | None, frame_index: int) -> None:
    if not state:
        return
    config = state["config"]
    constraint = state["constraint"]
    constraint.influence = 0.0
    bpy.context.view_layer.update()
    armature = actor.armature
    hand = armature.matrix_world @ armature.pose.bones[config["bone"]].head
    anchor = armature.matrix_world @ armature.pose.bones[config["anchor"]].head
    minimum_z, height = _mesh_height(actor.meshes)
    state["target"].location = (
        hand.x,
        anchor.y + float(config["screen_y_offset_height"]) * height,
        minimum_z + float(config["height_fraction"]) * height,
    )
    constraint.influence = _influence(config, frame_index)
    bpy.context.view_layer.update()


def destroy_game_retarget(actor: Any, state: dict[str, Any] | None) -> None:
    if not state:
        return
    actor.armature.pose.bones[state["config"]["bone"]].constraints.remove(state["constraint"])
    bpy.data.objects.remove(state["target"], do_unlink=True)


def describe_game_retarget(preset_name: str | None) -> dict[str, Any] | None:
    config = PRESETS.get(str(preset_name))
    if not config:
        return None
    return {"version": 1, "preset": preset_name, **config}
