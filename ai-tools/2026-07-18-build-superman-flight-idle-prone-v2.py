"""Create an isolated prone Superman-flight idle revision with a downward fist."""

from __future__ import annotations

import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "values" / "supermanFlightIdleProneV2Review.json"


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


def copy_action(bpy, rig, config):
    source_action = bpy.data.actions.get(config["source"]["idleAction"])
    if source_action is None:
        raise RuntimeError(f"Missing v1 review action: {config['source']['idleAction']}")
    action = source_action.copy()
    action.name = config["pose"]["action"]
    action.use_fake_user = True
    action["productionChanged"] = False
    action["purpose"] = "review-only prone flight idle v2"
    action_assign(rig, action)
    return action


def pose_delta(bpy, bone, degrees, frame):
    from mathutils import Euler

    bone.rotation_mode = "QUATERNION"
    delta = Euler(tuple(math.radians(value) for value in degrees), "XYZ").to_quaternion()
    bone.rotation_quaternion = bone.rotation_quaternion @ delta
    bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
    bpy.context.view_layer.update()


def apply_torso_lift(bpy, rig, config):
    lift = config["pose"]["torsoLift"]
    bone = rig.pose.bones.get(lift["bone"])
    if bone is None:
        raise RuntimeError(f"Missing torso bone: {lift['bone']}")
    pose_delta(bpy, bone, lift["rotationEulerDegrees"], config["source"]["idleFrame"])


def bake_lead_position(bpy, scene, rig, config):
    spec = config["pose"]["leadFist"]
    bone = rig.pose.bones.get(spec["bone"])
    if bone is None:
        raise RuntimeError(f"Missing lead fist bone: {spec['bone']}")
    target = bpy.data.objects.new(spec["targetName"], None)
    scene.collection.objects.link(target)
    target.location = tuple(spec["targetWorld"])
    target.hide_render = True
    constraint = bone.constraints.new("IK")
    constraint.name = f"{spec['targetName']}_IK"
    constraint.target = target
    constraint.chain_count = spec["chainCount"]
    constraint.iterations = spec["iterations"]
    constraint.use_stretch = False
    constraint.use_rotation = False
    constraint.use_tail = spec["useTail"]
    constraint.influence = 1.0
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    result = bpy.ops.nla.bake(
        frame_start=config["pose"]["frameStart"],
        frame_end=config["pose"]["frameEnd"],
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
        raise RuntimeError("Could not bake the revised lead-fist position")
    bone.constraints.remove(constraint)
    bpy.data.objects.remove(target, do_unlink=True)
    bpy.context.view_layer.update()


def apply_downward_fist(bpy, rig, config):
    pose = config["pose"]
    lead = pose["leadFist"]
    frame = config["source"]["idleFrame"]
    hand = rig.pose.bones.get(lead["bone"])
    if hand is None:
        raise RuntimeError(f"Missing fist hand bone: {lead['bone']}")
    pose_delta(bpy, hand, lead["twistEulerDegrees"], frame)
    fist = pose["fist"]
    axis_index = "XYZ".index(fist["axis"])
    for digit in fist["digits"]:
        for segment, degrees in zip(fist["segments"], fist["segmentDegrees"]):
            bone_name = f"{digit}_{segment}_{fist['side']}"
            bone = rig.pose.bones.get(bone_name)
            if bone is None:
                raise RuntimeError(f"Missing finger bone: {bone_name}")
            values = [0, 0, 0]
            values[axis_index] = degrees
            pose_delta(bpy, bone, values, frame)
    for segment, degrees in zip(fist["thumbSegments"], fist["thumbDegrees"]):
        bone_name = f"thumb_{segment}_{fist['side']}"
        bone = rig.pose.bones.get(bone_name)
        if bone is None:
            raise RuntimeError(f"Missing thumb bone: {bone_name}")
        values = [0, 0, 0]
        values[axis_index] = degrees
        pose_delta(bpy, bone, values, frame)


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
    scene["supermanFlightIdleProneV2"] = config["version"]
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
        "pose": "prone idle with chest lift, fist beside head, and downward-facing knuckles",
        "policy": "review-only visual preset; no game asset, collision, or runtime change",
    }
    (root / config["output"]["manifest"]).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    text = """# Superman prone flight idle v2 review\n\nReview-only Blender revision. The prone idle keeps the backpack and torso stable, lifts the chest slightly, and places a closed, downward-facing fist beside the head.\n\nThere are no visible bones, rings, labels, or controls, and nothing in the game runtime changes. Open the blend to inspect the pose; reopen it to reset it.\n"""
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
    if rig is None or rig.type != "ARMATURE" or camera is None or transform_root is None:
        raise RuntimeError("The v1 review is missing its rig, camera, or root")
    copy_action(bpy, rig, config)
    scene.frame_set(source["idleFrame"])
    apply_torso_lift(bpy, rig, config)
    bake_lead_position(bpy, scene, rig, config)
    apply_downward_fist(bpy, rig, config)
    configure_scene(bpy, scene, rig, camera, transform_root, config)
    configure_view(bpy, rig)
    render_preview(bpy, scene, config, root)
    write_review_files(root, config)
    bpy.ops.wm.save_as_mainfile(filepath=str(root / config["output"]["blend"]), copy=True)
    print(f"SUPERMAN_FLIGHT_IDLE_PRONE_V2_OK root={root}")


if __name__ == "__main__":
    build()
