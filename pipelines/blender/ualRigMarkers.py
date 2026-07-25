"""Project native UAL gameplay bones into rendered sprite-frame coordinates."""

from __future__ import annotations

from typing import Any

import bpy
from bpy_extras.object_utils import world_to_camera_view


MARKER_BONES = {
    "hand_l": {"bone": "hand_l", "point": "tail"},
    "hand_r": {"bone": "hand_r", "point": "tail"},
    "foot_l": {"bone": "foot_l", "point": "tail"},
    "foot_r": {"bone": "foot_r", "point": "tail"},
    "pelvis": {"bone": "pelvis", "point": "head"},
    "head": {"bone": "Head", "point": "tail"},
}


def _render_size(scene: bpy.types.Scene) -> tuple[float, float]:
    percentage = max(1.0, float(scene.render.resolution_percentage)) / 100.0
    return (
        float(scene.render.resolution_x) * percentage,
        float(scene.render.resolution_y) * percentage,
    )


def project_native_rig_markers(
    scene: bpy.types.Scene,
    camera: bpy.types.Object,
    armature: bpy.types.Object,
) -> dict[str, list[float]]:
    """Return marker points in top-left-origin render-frame pixels."""
    bpy.context.view_layer.update()
    width, height = _render_size(scene)
    markers: dict[str, list[float]] = {}
    for marker_name, marker_spec in MARKER_BONES.items():
        bone = armature.pose.bones.get(marker_spec["bone"])
        if bone is None:
            raise RuntimeError(f"UAL rig is missing marker bone: {marker_spec['bone']}")
        bone_point = getattr(bone, marker_spec["point"])
        world_point = armature.matrix_world @ bone_point
        camera_point = world_to_camera_view(scene, camera, world_point)
        markers[marker_name] = [
            round(float(camera_point.x) * width, 4),
            round((1.0 - float(camera_point.y)) * height, 4),
        ]
    return markers


def describe_rig_marker_schema() -> dict[str, Any]:
    return {
        "version": 1,
        "space": "render-frame-px",
        "source": "projected-native-bones",
        "bone_points": MARKER_BONES,
        "marker_names": list(MARKER_BONES),
    }
