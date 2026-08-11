"""Render review-only high and low torso layers on the approved sideways Punch Cross."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "values" / "directionalSidePunchReview.json"


def load_config():
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def review_root(config):
    path = (ROOT / config["output"]["root"]).resolve()
    allowed = (ROOT / "testing" / "blender-animation-lab-v1" / "review-drafts").resolve()
    if allowed not in path.parents:
        raise RuntimeError(f"Review output must remain under {allowed}: {path}")
    return path


def assign_action(obj, action):
    obj.animation_data_create()
    obj.animation_data.action = action
    if action.slots:
        obj.animation_data.action_slot = action.slots[0]


def import_punch_action(bpy, rig, config):
    before = {obj.as_pointer() for obj in bpy.data.objects}
    bpy.ops.import_scene.fbx(filepath=str(ROOT / config["source"]["punchFbx"]), automatic_bone_orientation=False)
    imported = [obj for obj in bpy.data.objects if obj.as_pointer() not in before]
    source_rig = next((obj for obj in imported if obj.type == "ARMATURE"), None)
    source_action = source_rig.animation_data.action if source_rig and source_rig.animation_data else None
    if source_action is None or source_action.name != config["source"]["punchAction"]:
        raise RuntimeError("The Punch Cross carrier did not expose its expected source action")
    base = source_action.copy()
    base.name = "DG_SIDE_PUNCH_SOURCE_V1"
    base.use_fake_user = True
    for obj in reversed(imported):
        bpy.data.objects.remove(obj, do_unlink=True)
    assign_action(rig, base)
    return base


def build_candidate_action(bpy, scene, rig, base, candidate, config):
    from mathutils import Euler

    action = base.copy()
    action.name = candidate["actionName"]
    action.use_fake_user = True
    action["dgal_editable"] = True
    action["productionChanged"] = False
    action["sourceAction"] = "Punch_Cross"
    action["directionalIntent"] = candidate["target"]
    assign_action(rig, action)
    bones = candidate["torsoBones"]
    missing = [entry["name"] for entry in bones if entry["name"] not in rig.pose.bones]
    if missing:
        raise RuntimeError(f"Survivor rig is missing torso bones: {missing}")
    if not bones:
        return action
    start, end = config["action"]["sourceFrameStart"], config["action"]["sourceFrameEnd"]
    poses = {}
    for frame in range(start, end + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        poses[frame] = {entry["name"]: rig.pose.bones[entry["name"]].rotation_quaternion.copy() for entry in bones}
    for frame in range(start, end + 1):
        scene.frame_set(frame)
        for entry in bones:
            bone = rig.pose.bones[entry["name"]]
            delta = Euler(tuple(math.radians(value) for value in entry["rotationEulerDegrees"]), "XYZ").to_quaternion()
            bone.rotation_mode = "QUATERNION"
            bone.rotation_quaternion = poses[frame][bone.name] @ delta
            bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
    return action


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


def render_candidates():
    import bpy

    config = load_config()
    root = review_root(config)
    root.mkdir(parents=True, exist_ok=True)
    frames_root = root / config["output"]["frameDirectory"]
    frames_root.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    rig = bpy.data.objects.get(config["source"]["rig"])
    camera = bpy.data.objects.get(config["source"]["camera"])
    if rig is None or rig.type != "ARMATURE" or camera is None:
        raise RuntimeError("Approved Survivor rig or fixed render camera is missing")
    base = import_punch_action(bpy, rig, config)
    actions = {candidate["id"]: build_candidate_action(bpy, scene, rig, base, candidate, config) for candidate in config["candidates"]}
    configure_render(scene, config)
    hidden = [obj for obj in bpy.data.objects if obj.name.startswith(tuple(config["source"]["hiddenObjectPrefixes"]))]
    pickaxe = bpy.data.objects.get(config["source"]["pickaxe"])
    if pickaxe:
        hidden.append(pickaxe)
    previous = {obj.name: obj.hide_render for obj in hidden}
    for obj in hidden:
        obj.hide_render = True
    try:
        for candidate in config["candidates"]:
            assign_action(rig, actions[candidate["id"]])
            candidate_root = frames_root / candidate["id"]
            candidate_root.mkdir(parents=True, exist_ok=True)
            for frame_path in candidate_root.glob("frame-*.png"):
                frame_path.unlink()
            for index in range(config["action"]["frameCount"]):
                source_frame = config["action"]["sourceFrameStart"] + index
                scene.frame_set(source_frame)
                bpy.context.view_layer.update()
                scene.render.filepath = str(candidate_root / f"frame-{index:03d}.png")
                bpy.ops.render.render(write_still=True)
    finally:
        for obj in hidden:
            obj.hide_render = previous[obj.name]
    bpy.ops.wm.save_as_mainfile(filepath=str(root / config["output"]["blend"]), copy=True)
    print(f"DIRECTIONAL_SIDE_PUNCH_RENDER_OK candidates={len(config['candidates'])} root={root}")


def stitch_candidates():
    from PIL import Image, ImageDraw

    config = load_config()
    root = review_root(config)
    action, output = config["action"], config["output"]
    runtime = root / output["runtimeDirectory"]
    previews = root / output["previewDirectory"]
    runtime.mkdir(parents=True, exist_ok=True)
    previews.mkdir(parents=True, exist_ok=True)
    review = {"version": config["version"], "productionChanged": False, "candidates": []}
    for candidate in config["candidates"]:
        frames = []
        for index in range(action["frameCount"]):
            frame_path = root / output["frameDirectory"] / candidate["id"] / f"frame-{index:03d}.png"
            with Image.open(frame_path) as image:
                frames.append(image.convert("RGBA").resize((action["packedFrameSizePx"],) * 2, Image.Resampling.LANCZOS))
        columns = action["columns"]
        rows = math.ceil(len(frames) / columns)
        sheet = Image.new("RGBA", (columns * action["packedFrameSizePx"], rows * action["packedFrameSizePx"]), (0, 0, 0, 0))
        for index, frame in enumerate(frames):
            sheet.alpha_composite(frame, ((index % columns) * action["packedFrameSizePx"], (index // columns) * action["packedFrameSizePx"]))
        sheet_name = f"{candidate['id']}-sheet.png"
        sheet.save(runtime / sheet_name, optimize=True)
        preview_frames = []
        for frame in frames:
            small = frame.resize((action["previewFrameSizePx"],) * 2, Image.Resampling.LANCZOS)
            canvas = Image.new("RGB", small.size, (11, 17, 24))
            canvas.paste(small, (0, 0), small)
            preview_frames.append(canvas)
        gif_name = f"{candidate['id']}.gif"
        preview_frames[0].save(previews / gif_name, save_all=True, append_images=preview_frames[1:], duration=round(1000 / action["fps"]), loop=0, optimize=True)
        strip = Image.new("RGB", (action["previewFrameSizePx"] * action["motionStripSamples"], action["previewFrameSizePx"] + 24), (11, 17, 24))
        draw = ImageDraw.Draw(strip)
        for sample in range(action["motionStripSamples"]):
            index = round(sample * (len(preview_frames) - 1) / max(1, action["motionStripSamples"] - 1))
            strip.paste(preview_frames[index], (sample * action["previewFrameSizePx"], 0))
            draw.text((sample * action["previewFrameSizePx"] + 5, action["previewFrameSizePx"] + 5), str(index), fill=(188, 201, 212))
        strip_name = f"{candidate['id']}-strip.png"
        strip.save(previews / strip_name)
        review["candidates"].append({
            "id": candidate["id"], "option": candidate["option"], "label": candidate["label"], "target": candidate["target"],
            "sheet": f"{output['runtimeDirectory']}/{sheet_name}", "preview": f"{output['previewDirectory']}/{gif_name}",
            "motionStrip": f"{output['previewDirectory']}/{strip_name}", "frameCount": action["frameCount"], "fps": action["fps"],
        })
    (root / output["reviewManifest"]).write_text(json.dumps(review, indent=2) + "\n", encoding="utf-8")
    (root / "readme.md").write_text("# Directional side-punch review\n\nReview-only Punch Cross torso layers. No output here is game-loaded.\n", encoding="utf-8")
    print(f"DIRECTIONAL_SIDE_PUNCH_STITCH_OK root={root}")


if __name__ == "__main__":
    if "bpy" in sys.modules:
        render_candidates()
    else:
        stitch_candidates()
