"""Create the fixed review camera and lighting defined by the lab config."""

from __future__ import annotations

import json
from pathlib import Path

import bpy
from bpy.types import Operator
from mathutils import Vector

from .collections import ensure_lab_collections, tag_object
from .paths import DEFAULT_CONFIG


def load_stage_config(config_path: Path = DEFAULT_CONFIG) -> dict:
    config = json.loads(config_path.read_text(encoding="utf-8"))
    return config["reviewStage"]


def _link_once(obj, collection) -> None:
    if not obj.users_collection:
        collection.objects.link(obj)


def ensure_review_stage(scene: bpy.types.Scene, config_path: Path = DEFAULT_CONFIG):
    """Create or update the deterministic production-framing review stage."""
    config = load_stage_config(config_path)
    camera_config = config["camera"]
    render_config = config["render"]
    collection = ensure_lab_collections()["DGAL_SESSION"]
    target = Vector(camera_config["target"])

    camera = bpy.data.objects.get(camera_config["name"])
    if camera is None or camera.type != "CAMERA":
        data = bpy.data.cameras.new(f"{camera_config['name']}Data")
        camera = bpy.data.objects.new(camera_config["name"], data)
    _link_once(camera, collection)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = float(camera_config["orthographicScale"])
    camera.location = target + Vector(camera_config["offset"])
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    tag_object(camera, "review-camera", str(scene.get("dgal_session_name", "lab")))
    scene.camera = camera

    scene.render.engine = str(render_config["engine"])
    scene.render.resolution_x = int(render_config["resolutionPx"])
    scene.render.resolution_y = int(render_config["resolutionPx"])
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = bool(render_config["transparent"])
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = str(render_config["look"])
    scene.world.color = tuple(render_config["worldColor"])

    for light_config in config["lights"]:
        light = bpy.data.objects.get(light_config["name"])
        if light is None or light.type != "LIGHT":
            data = bpy.data.lights.new(f"{light_config['name']}Data", "AREA")
            light = bpy.data.objects.new(light_config["name"], data)
        _link_once(light, collection)
        light.data.type = "AREA"
        light.data.shape = "DISK"
        light.data.energy = float(light_config["energy"])
        light.data.color = tuple(light_config["color"])
        light.data.size = float(light_config["size"])
        light.location = target + Vector(light_config["offset"])
        light.rotation_euler = (target - light.location).to_track_quat("-Z", "Y").to_euler()
        tag_object(light, "review-light", str(scene.get("dgal_session_name", "lab")))
    return camera


class DGAL_OT_ensure_review_stage(Operator):
    bl_idname = "dgal.ensure_review_stage"
    bl_label = "Create / reset review stage"
    bl_description = "Restore the fixed camera, transparent render settings, and three-light rig"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        try:
            camera = ensure_review_stage(context.scene)
        except (KeyError, OSError, ValueError) as error:
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        self.report({"INFO"}, f"Review stage ready: {camera.name}")
        return {"FINISHED"}


CLASSES = (DGAL_OT_ensure_review_stage,)
