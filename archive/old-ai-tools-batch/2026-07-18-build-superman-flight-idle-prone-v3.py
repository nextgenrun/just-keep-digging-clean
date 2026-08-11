"""Create a review-only Superman flight idle with its fist facing forward."""

from __future__ import annotations

import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "values" / "supermanFlightIdleProneV3Review.json"


def load_config():
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def output_root(config):
    path = (ROOT / config["output"]["root"]).resolve()
    allowed = (ROOT / "testing" / "blender-animation-lab-v1" / "review-drafts").resolve()
    if allowed not in path.parents:
        raise RuntimeError(f"Review output must remain under {allowed}: {path}")
    return path


def action_assign(rig, action):
    rig.animation_data_create()
    rig.animation_data.action = action
    if action.slots:
        rig.animation_data.action_slot = action.slots[0]


def apply_forward_wrist(bpy, scene, rig, config):
    from mathutils import Euler

    forward_fist = config["pose"]["forwardFist"]
    bone = rig.pose.bones.get(forward_fist["bone"])
    if bone is None:
        raise RuntimeError(f"Missing lead wrist: {forward_fist['bone']}")
    scene.frame_set(config["source"]["idleFrame"])
    bone.rotation_mode = "QUATERNION"
    delta = Euler(tuple(math.radians(value) for value in forward_fist["rotationEulerDegrees"]), "XYZ").to_quaternion()
    bone.rotation_quaternion = bone.rotation_quaternion @ delta
    bone.keyframe_insert("rotation_quaternion", frame=config["source"]["idleFrame"], group=bone.name)
    bpy.context.view_layer.update()


def configure_scene(bpy, scene, rig, camera, root, config):
    pose = config["pose"]
    root.name = pose["rootName"]
    root.empty_display_size = pose["rootDisplaySize"]
    root.show_name = False
    root.hide_render = True
    for bone in rig.data.bones:
        bone.hide = True
    rig.show_in_front = False
    scene.frame_start = pose["frameStart"]
    scene.frame_end = pose["frameEnd"]
    scene.camera = camera
    scene["supermanFlightIdleProneV3"] = config["version"]
    scene["productionChanged"] = False
    bpy.context.view_layer.update()


def configure_view(bpy, rig):
    mesh = next((obj for obj in rig.children_recursive if obj.type == "MESH"), rig)
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                space = area.spaces.active
                space.region_3d.view_perspective = "CAMERA"
                space.shading.type = "MATERIAL"
                space.overlay.show_relationship_lines = False
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh


def render_preview(bpy, scene, config, root):
    preview = config["preview"]
    scene.render.resolution_x = preview["sizePx"]
    scene.render.resolution_y = preview["sizePx"]
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = preview["transparent"]
    scene.render.filepath = str(root / config["output"]["preview"])
    bpy.ops.render.render(write_still=True)


def write_review_files(root, config):
    manifest = {
        "version": config["version"],
        "productionChanged": False,
        "source": config["source"],
        "pose": "v2 prone flight idle with a quarter-turned forward-facing fist",
        "policy": "review-only visual preset; no game asset, collision, or runtime change",
    }
    (root / config["output"]["manifest"]).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    text = """# Superman prone flight idle v3 review\n\nReview-only wrist correction. The pose keeps v2's chest lift and closed fist, then turns only the lead wrist so the fist faces into travel.\n\nThere are no visible bones, rings, labels, or controls, and nothing in the game runtime changes. Open the blend to inspect the pose; reopen it to reset it.\n"""
    (root / "readme.md").write_text(text, encoding="utf-8")


def build():
    import bpy

    config = load_config()
    root = output_root(config)
    root.mkdir(parents=True, exist_ok=True)
    source = config["source"]
    scene = bpy.context.scene
    rig = bpy.data.objects.get(source["rig"])
    camera = bpy.data.objects.get(source["camera"])
    transform_root = bpy.data.objects.get(source["root"])
    source_action = bpy.data.actions.get(source["idleAction"])
    if rig is None or rig.type != "ARMATURE" or camera is None or transform_root is None or source_action is None:
        raise RuntimeError("The v2 review is missing its rig, camera, root, or idle action")
    action = source_action.copy()
    action.name = config["pose"]["action"]
    action.use_fake_user = True
    action["productionChanged"] = False
    action["purpose"] = "review-only forward-fist wrist revision"
    action_assign(rig, action)
    apply_forward_wrist(bpy, scene, rig, config)
    configure_scene(bpy, scene, rig, camera, transform_root, config)
    configure_view(bpy, rig)
    render_preview(bpy, scene, config, root)
    write_review_files(root, config)
    bpy.ops.wm.save_as_mainfile(filepath=str(root / config["output"]["blend"]), copy=True)
    print(f"SUPERMAN_FLIGHT_IDLE_PRONE_V3_OK root={root}")


if __name__ == "__main__":
    build()
