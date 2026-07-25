"""Create an isolated, face-down Superman-flight idle review preset."""

from __future__ import annotations

import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "values" / "supermanFlightIdleProneReview.json"


def load_config():
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def output_root(config):
    path = (ROOT / config["output"]["root"]).resolve()
    allowed = (ROOT / "testing" / "blender-animation-lab-v1" / "review-drafts").resolve()
    if allowed not in path.parents:
        raise RuntimeError(f"Review output must remain under {allowed}: {path}")
    return path


def assign_action(rig, action):
    rig.animation_data_create()
    rig.animation_data.action = action
    if action.slots:
        rig.animation_data.action_slot = action.slots[0]


def copy_idle_action(bpy, rig, config):
    source_action = bpy.data.actions.get(config["source"]["idleAction"])
    if source_action is None:
        raise RuntimeError(f"Missing idle action: {config['source']['idleAction']}")
    action = source_action.copy()
    action.name = config["pose"]["action"]
    action.use_fake_user = True
    action["productionChanged"] = False
    action["purpose"] = "review-only prone flight idle"
    assign_action(rig, action)
    return action


def bake_lead_fist(bpy, scene, rig, config):
    pose = config["pose"]
    lead_bone = rig.pose.bones.get(pose["leadBone"])
    if lead_bone is None:
        raise RuntimeError(f"Missing lead fist bone: {pose['leadBone']}")
    target = bpy.data.objects.new(pose["leadTargetName"], None)
    scene.collection.objects.link(target)
    target.location = tuple(pose["leadTargetWorld"])
    target.hide_render = True
    constraint = lead_bone.constraints.new("IK")
    constraint.name = f"{pose['leadTargetName']}_IK"
    constraint.target = target
    constraint.chain_count = pose["chainCount"]
    constraint.iterations = pose["iterations"]
    constraint.use_stretch = False
    constraint.use_rotation = False
    constraint.use_tail = pose["useTail"]
    constraint.influence = 1.0
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    result = bpy.ops.nla.bake(
        frame_start=pose["frameStart"],
        frame_end=pose["frameEnd"],
        step=1,
        only_selected=False,
        visual_keying=True,
        clear_constraints=False,
        use_current_action=True,
        clean_curves=False,
        bake_types={"POSE"},
        channel_types={"LOCATION", "ROTATION", "SCALE"},
    )
    if "FINISHED" not in result:
        raise RuntimeError("Could not bake the lead-fist pose")
    lead_bone.constraints.remove(constraint)
    bpy.data.objects.remove(target, do_unlink=True)
    bpy.context.view_layer.update()


def configure_scene(bpy, scene, rig, camera, transform_root, config):
    pose = config["pose"]
    scene.frame_set(config["source"]["idleFrame"])
    transform_root.rotation_mode = "XYZ"
    transform_root.rotation_euler.rotate_axis(pose["faceDownAxis"], math.radians(pose["faceDownDegrees"]))
    transform_root.name = pose["rootName"]
    transform_root.empty_display_size = pose["rootDisplaySize"]
    transform_root.show_name = False
    transform_root.hide_render = True
    for bone in rig.data.bones:
        bone.hide = True
    rig.show_in_front = False
    scene.frame_start = pose["frameStart"]
    scene.frame_end = pose["frameEnd"]
    scene.camera = camera
    scene["supermanFlightIdleProne"] = config["version"]
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
        "pose": "approved idle rotated prone; left fist extended horizontally forward",
        "policy": "review-only visual preset; no game asset, collision, or runtime change",
    }
    (root / config["output"]["manifest"]).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    readme = """# Superman prone flight idle review\n\nReview-only Blender preset. The approved horizontal idle is face-down, with one left fist extended forward for a clear Superman-flight silhouette.\n\nThere are no visible bones, rings, labels, or controls, and nothing in the game runtime changes. Open the blend to inspect the pose; reopen it to reset it.\n"""
    (root / "readme.md").write_text(readme, encoding="utf-8")


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
    if rig is None or rig.type != "ARMATURE" or camera is None or transform_root is None:
        raise RuntimeError("The horizontal-idle source is missing its rig, camera, or transform root")
    action = copy_idle_action(bpy, rig, config)
    configure_scene(bpy, scene, rig, camera, transform_root, config)
    bake_lead_fist(bpy, scene, rig, config)
    configure_view(bpy, rig)
    render_preview(bpy, scene, config, root)
    write_review_files(root, config)
    bpy.ops.wm.save_as_mainfile(filepath=str(root / config["output"]["blend"]), copy=True)
    print(f"SUPERMAN_FLIGHT_IDLE_PRONE_OK root={root} action={action.name}")


if __name__ == "__main__":
    build()
