"""Build an isolated Blender Superman-flight review sheet from the local Push Loop."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "values" / "supermanFlightReview.json"


def load_config():
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def output_root(config):
    path = (ROOT / config["output"]["root"]).resolve()
    allowed = (ROOT / "testing" / "blender-animation-lab-v1" / "review-drafts").resolve()
    if allowed not in path.parents:
        raise RuntimeError(f"Review output must remain under {allowed}: {path}")
    return path


def action_slot_assign(obj, action):
    obj.animation_data_create()
    obj.animation_data.action = action
    if action.slots:
        obj.animation_data.action_slot = action.slots[0]


def action_copy_from_fbx(bpy, rig, config):
    before = {obj.as_pointer() for obj in bpy.data.objects}
    fbx_path = ROOT / config["source"]["pushFbx"]
    bpy.ops.import_scene.fbx(filepath=str(fbx_path), automatic_bone_orientation=False)
    imported = [obj for obj in bpy.data.objects if obj.as_pointer() not in before]
    source_rig = next((obj for obj in imported if obj.type == "ARMATURE"), None)
    source_action = source_rig.animation_data.action if source_rig and source_rig.animation_data else None
    if source_action is None or source_action.name != config["source"]["pushAction"]:
        raise RuntimeError("The Push Loop carrier did not expose its expected source action")
    action = source_action.copy()
    action.name = config["action"]["name"]
    action["dgal_editable"] = True
    action["productionChanged"] = False
    action["motionAuthority"] = "UAL Push_Loop retargeted to approved Survival rig; Blender pose layer"
    action["sourceAction"] = source_action.name
    action.use_fake_user = True
    for obj in reversed(imported):
        bpy.data.objects.remove(obj, do_unlink=True)
    action_slot_assign(rig, action)
    return action


def apply_pose_layer(bpy, scene, rig, config, action):
    from mathutils import Euler

    pose_bones = rig.pose.bones
    modifiers = config["poseLayer"]["bones"]
    missing = [item["name"] for item in modifiers if item["name"] not in pose_bones]
    if missing:
        raise RuntimeError(f"Survival rig is missing Superman pose bones: {missing}")
    start, end = config["action"]["sourceFrameStart"], config["action"]["sourceFrameEnd"]
    base = {}
    for frame in range(start, end + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        base[frame] = {item["name"]: pose_bones[item["name"]].rotation_quaternion.copy() for item in modifiers}
    object_rotation = rig.rotation_euler.copy()
    object_rotation.y += math.radians(config["poseLayer"]["objectPitchDegrees"])
    rig.rotation_euler = object_rotation
    rig.location = tuple(config["poseLayer"]["objectLocationOffset"])
    for frame in range(start, end + 1):
        scene.frame_set(frame)
        for item in modifiers:
            bone = pose_bones[item["name"]]
            degrees = item["rotationEulerDegrees"]
            delta = Euler(tuple(math.radians(value) for value in degrees), "XYZ").to_quaternion()
            bone.rotation_mode = "QUATERNION"
            bone.rotation_quaternion = base[frame][bone.name] @ delta
            bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
    action["poseLayer"] = "one right arm forward; left arm tucked; legs lengthened; body pitched"
    action["leadSide"] = config["poseLayer"]["leadSide"]


def bake_superman_ik(bpy, scene, rig, camera, config):
    from mathutils import Vector

    targets = {}
    target_spec = config["poseLayer"]["ikTargets"]
    target_map = {
        "hand_r": ("DG_SUPERMAN_LEAD_HAND", "leadHand", target_spec["armChainCount"]),
        "hand_l": ("DG_SUPERMAN_TUCKED_HAND", "tuckedHand", target_spec["armChainCount"]),
        "foot_r": ("DG_SUPERMAN_RIGHT_FOOT", "rightFoot", target_spec["legChainCount"]),
        "foot_l": ("DG_SUPERMAN_LEFT_FOOT", "leftFoot", target_spec["legChainCount"]),
    }
    for bone_name, (name, _, chain_count) in target_map.items():
        target = bpy.data.objects.new(name, None)
        scene.collection.objects.link(target)
        target.empty_display_type = "SPHERE"
        target.empty_display_size = 0.04
        target.hide_render = True
        constraint = rig.pose.bones[bone_name].constraints.new("IK")
        constraint.name = f"{name}_IK"
        constraint.target = target
        constraint.chain_count = chain_count
        constraint.iterations = target_spec["iterations"]
        constraint.use_stretch = False
        constraint.use_rotation = False
        targets[bone_name] = target
    right = (camera.matrix_world.to_3x3() @ Vector((1, 0, 0))).normalized()
    up = (camera.matrix_world.to_3x3() @ Vector((0, 1, 0))).normalized()
    depth = (camera.matrix_world.to_3x3() @ Vector((0, 0, -1))).normalized()
    start, end = config["action"]["sourceFrameStart"], config["action"]["sourceFrameEnd"]
    for frame in range(start, end + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        pelvis = rig.matrix_world @ rig.pose.bones["pelvis"].tail
        for bone_name, (_, offset_name, _) in target_map.items():
            offset = target_spec[offset_name]
            targets[bone_name].location = pelvis + (right * offset[0]) + (up * offset[1]) + (depth * offset[2])
            targets[bone_name].keyframe_insert("location", frame=frame)
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    result = bpy.ops.nla.bake(
        frame_start=start,
        frame_end=end,
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
        raise RuntimeError("Could not bake the Superman IK pose layer")
    for bone_name, target in targets.items():
        constraint = rig.pose.bones[bone_name].constraints.get(f"{target.name}_IK")
        if constraint:
            rig.pose.bones[bone_name].constraints.remove(constraint)
        bpy.data.objects.remove(target, do_unlink=True)


def configure_render(scene, config):
    size = config["action"]["sourceRenderSizePx"]
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 15
    scene.render.fps = config["action"]["fps"]


def marker_frame(scene, camera, rig, size):
    from bpy_extras.object_utils import world_to_camera_view

    result = {}
    for name in ("hand_l", "hand_r", "foot_l", "foot_r", "pelvis", "head"):
        bone = rig.pose.bones[name]
        point = rig.matrix_world @ bone.tail
        camera_point = world_to_camera_view(scene, camera, point)
        result[name] = [round(camera_point.x * size, 4), round((1 - camera_point.y) * size, 4)]
    return result


def render_review():
    import bpy

    config = load_config()
    root = output_root(config)
    root.mkdir(parents=True, exist_ok=True)
    frames_root = root / config["output"]["frameDirectory"]
    frames_root.mkdir(parents=True, exist_ok=True)
    for frame in frames_root.glob("frame-*.png"):
        frame.unlink()
    scene = bpy.context.scene
    rig = bpy.data.objects.get(config["source"]["rig"])
    camera = bpy.data.objects.get(config["source"]["camera"])
    if not rig or rig.type != "ARMATURE" or not camera:
        raise RuntimeError("Approved Survivor rig or fixed render camera is missing")
    action = action_copy_from_fbx(bpy, rig, config)
    apply_pose_layer(bpy, scene, rig, config, action)
    scene.camera = camera
    bake_superman_ik(bpy, scene, rig, camera, config)
    configure_render(scene, config)
    pickaxe = bpy.data.objects.get(config["source"]["pickaxe"])
    hidden = [obj for obj in bpy.data.objects if obj.name.startswith(tuple(config["source"]["hiddenObjectPrefixes"]))]
    if pickaxe:
        hidden.append(pickaxe)
    visibility = {obj.name: obj.hide_render for obj in hidden}
    for obj in hidden:
        obj.hide_render = True
    action_config = config["action"]
    start, end = action_config["sourceFrameStart"], action_config["sourceFrameEnd"]
    metadata = {"version": config["version"], "productionChanged": False, "markers": {}}
    try:
        for index in range(action_config["frameCount"]):
            source_frame = start + ((end - start) * index / action_config["frameCount"])
            whole = int(source_frame)
            scene.frame_set(whole, subframe=source_frame - whole)
            bpy.context.view_layer.update()
            metadata["markers"][str(index)] = marker_frame(scene, camera, rig, action_config["sourceRenderSizePx"])
            scene.render.filepath = str(frames_root / f"frame-{index:03d}.png")
            bpy.ops.render.render(write_still=True)
    finally:
        for obj in hidden:
            obj.hide_render = visibility[obj.name]
    (root / config["output"]["renderMetadata"]).write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    bpy.ops.wm.save_as_mainfile(filepath=str(root / config["output"]["blend"]), copy=True)
    print(f"SUPERMAN_FLIGHT_REVIEW_RENDER_OK frames={action_config['frameCount']} root={root}")


def stitch_review():
    from PIL import Image, ImageDraw

    config = load_config()
    root = output_root(config)
    action, output = config["action"], config["output"]
    metadata = json.loads((root / output["renderMetadata"]).read_text(encoding="utf-8"))
    frames = []
    for index in range(action["frameCount"]):
        path = root / output["frameDirectory"] / f"frame-{index:03d}.png"
        with Image.open(path) as image:
            frames.append(image.convert("RGBA").resize((action["packedFrameSizePx"],) * 2, Image.Resampling.LANCZOS))
    columns = action["columns"]
    rows = math.ceil(action["frameCount"] / columns)
    sheet = Image.new("RGBA", (columns * action["packedFrameSizePx"], rows * action["packedFrameSizePx"]), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, ((index % columns) * action["packedFrameSizePx"], (index // columns) * action["packedFrameSizePx"]))
    runtime = root / output["runtimeDirectory"]
    previews = root / output["previewDirectory"]
    runtime.mkdir(parents=True, exist_ok=True)
    previews.mkdir(parents=True, exist_ok=True)
    sheet.save(runtime / output["runtimeSheet"], optimize=True)
    preview_frames = []
    for frame in frames:
        small = frame.resize((action["previewFrameSizePx"],) * 2, Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", small.size, (11, 17, 24))
        canvas.paste(small, (0, 0), small)
        preview_frames.append(canvas)
    preview_frames[0].save(previews / output["previewGif"], save_all=True, append_images=preview_frames[1:], duration=round(1000 / action["fps"]), loop=0, optimize=True)
    strip = Image.new("RGB", (action["previewFrameSizePx"] * action["motionStripSamples"], action["previewFrameSizePx"] + 24), (11, 17, 24))
    draw = ImageDraw.Draw(strip)
    for sample in range(action["motionStripSamples"]):
        index = round(sample * (len(preview_frames) - 1) / max(1, action["motionStripSamples"] - 1))
        strip.paste(preview_frames[index], (sample * action["previewFrameSizePx"], 0))
        draw.text((sample * action["previewFrameSizePx"] + 5, action["previewFrameSizePx"] + 5), str(index), fill=(188, 201, 212))
    strip.save(previews / output["motionStrip"])
    scale = action["packedFrameSizePx"] / action["sourceRenderSizePx"]
    markers = {index: {name: [round(value[0] * scale, 4), round(value[1] * scale, 4)] for name, value in frame.items()} for index, frame in metadata["markers"].items()}
    hitbox = config["flightHitbox"]
    action_record = {"file": output["runtimeSheet"], "frame_count": action["frameCount"], "frame_width": action["packedFrameSizePx"], "frame_height": action["packedFrameSizePx"], "columns": columns, "rows": rows, "fps": action["fps"], "loop": action["loop"], "source": "blender-review", "source_clip": "Push_Loop + Superman pose layer", "motion_authority": "Local UAL Push_Loop retarget plus Blender pose layer", "weapon_policy": "none", "rig_markers": {"version": 1, "space": "packed-frame-px", "marker_names": ["foot_l", "foot_r", "hand_l", "hand_r", "head", "pelvis"], "frames": markers}}
    manifest = {"version": config["version"], "productionChanged": False, "frame_width": action["packedFrameSizePx"], "frame_height": action["packedFrameSizePx"], "display_size_px": 109, "target_visible_height_tiles": 0.8, "visual_origin": [0.5, 0.96484375], "player_body": {"width_px": hitbox["visualHullWidthPx"], "height_px": hitbox["visualHullHeightPx"]}, "actions": {action["id"]: action_record}}
    (runtime / output["runtimeManifest"]).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    review = {"version": config["version"], "productionChanged": False, "action": {"id": action["id"], "name": action["name"], "source": config["source"]["pushFbx"], "leadSide": config["poseLayer"]["leadSide"]}, "flightHitbox": hitbox, "artifacts": {"blend": output["blend"], "runtimeManifest": f"{output['runtimeDirectory']}/{output['runtimeManifest']}", "preview": f"{output['previewDirectory']}/{output['previewGif']}"}}
    (root / output["reviewManifest"]).write_text(json.dumps(review, indent=2) + "\n", encoding="utf-8")
    (root / "readme.md").write_text("# Superman flight Push Layer review\n\nReview-only Blender draft. It is not loaded by the game runtime.\n", encoding="utf-8")
    print(f"SUPERMAN_FLIGHT_REVIEW_STITCH_OK sheet={runtime / output['runtimeSheet']}")


if __name__ == "__main__":
    if "bpy" in sys.modules:
        render_review()
    else:
        stitch_review()
