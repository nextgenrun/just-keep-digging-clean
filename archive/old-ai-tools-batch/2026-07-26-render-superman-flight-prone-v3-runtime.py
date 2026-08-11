"""Render the approved prone-v3 Blender pose as a production flight loop."""

from __future__ import annotations

import hashlib
import json
import math
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "values" / "supermanFlightProneV3Runtime.json"

def load_config():
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))

def checked_path(relative_path, allowed_root):
    path = (ROOT / relative_path).resolve()
    allowed = (ROOT / allowed_root).resolve()
    if path != allowed and allowed not in path.parents:
        raise RuntimeError(f"Path must remain under {allowed}: {path}")
    return path

def source_path(config):
    return checked_path(config["source"]["blend"], "testing/blender-animation-lab-v1/review-drafts")

def build_root(config):
    return checked_path(config["output"]["buildRoot"], "testing/blender-animation-lab-v1/production-builds")

def runtime_root(config):
    return checked_path(config["output"]["runtimeDirectory"], "sprites/character/survival-character-blender-v2/runtime")

def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

def configure_render(scene, config):
    size = config["animation"]["sourceRenderSizePx"]
    for engine in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 15
    scene.render.fps = config["animation"]["fps"]

def marker_frame(scene, camera, rig, size):
    from bpy_extras.object_utils import world_to_camera_view

    result = {}
    for name in ("hand_l", "hand_r", "foot_l", "foot_r", "pelvis", "head"):
        bone = rig.pose.bones[name]
        point = rig.matrix_world @ bone.tail
        camera_point = world_to_camera_view(scene, camera, point)
        result[name] = [round(camera_point.x * size, 4), round((1 - camera_point.y) * size, 4)]
    return result

def render_frames():
    import bpy
    from mathutils import Vector

    config = load_config()
    source = source_path(config)
    if Path(bpy.data.filepath).resolve() != source:
        raise RuntimeError(f"Open the configured v3 source blend before rendering: {source}")

    output = config["output"]
    root = build_root(config)
    frames_root = root / output["frameDirectory"]
    frames_root.mkdir(parents=True, exist_ok=True)
    for frame in frames_root.glob("frame-*.png"):
        frame.unlink()

    scene = bpy.context.scene
    rig = bpy.data.objects.get(config["source"]["rig"])
    camera = bpy.data.objects.get(config["source"]["camera"])
    transform_root = bpy.data.objects.get(config["source"]["root"])
    action = bpy.data.actions.get(config["source"]["action"])
    if not rig or rig.type != "ARMATURE" or not camera or not transform_root or not action:
        raise RuntimeError("The v3 source is missing its rig, camera, root, or approved action")

    rig.animation_data_create()
    rig.animation_data.action = action
    if action.slots:
        rig.animation_data.action_slot = action.slots[0]
    scene.camera = camera
    configure_render(scene, config)

    hidden = [
        obj for obj in bpy.data.objects
        if obj.name.startswith(tuple(config["source"]["hiddenObjectPrefixes"]))
    ]
    pickaxe = bpy.data.objects.get(config["source"]["pickaxe"])
    if pickaxe:
        hidden.append(pickaxe)
    visibility = {obj.name: obj.hide_render for obj in hidden}
    for obj in hidden:
        obj.hide_render = True

    camera_basis = camera.matrix_world.to_3x3()
    camera_right = (camera_basis @ Vector((1, 0, 0))).normalized()
    camera_up = (camera_basis @ Vector((0, 1, 0))).normalized()
    base_location = transform_root.location.copy()
    animation = config["animation"]
    metadata = {
        "version": config["version"],
        "productionChanged": True,
        "sourceBlend": config["source"]["blend"],
        "sourceBlendSha256": sha256(source),
        "sourceAction": action.name,
        "sourceFrame": config["source"]["frame"],
        "markers": {},
    }

    try:
        for index in range(animation["frameCount"]):
            scene.frame_set(config["source"]["frame"])
            phase = math.tau * index / animation["frameCount"]
            transform_root.location = (
                base_location
                + camera_up * (math.sin(phase) * animation["verticalBobWorld"])
                + camera_right * (math.sin(phase * 2) * animation["horizontalDriftWorld"])
            )
            bpy.context.view_layer.update()
            metadata["markers"][str(index)] = marker_frame(
                scene,
                camera,
                rig,
                animation["sourceRenderSizePx"],
            )
            scene.render.filepath = str(frames_root / f"frame-{index:03d}.png")
            bpy.ops.render.render(write_still=True)
    finally:
        transform_root.location = base_location
        for obj in hidden:
            obj.hide_render = visibility[obj.name]

    (root / output["renderMetadata"]).write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(f"SUPERMAN_FLIGHT_PRONE_V3_RENDER_OK frames={animation['frameCount']} root={root}")

def mirrored_markers(metadata, animation):
    scale = animation["packedFrameSizePx"] / animation["sourceRenderSizePx"]
    size = animation["packedFrameSizePx"]
    mirror = animation["mirrorForSourceFacingRight"]
    result = {}
    for index, frame in metadata["markers"].items():
        result[index] = {}
        for name, (source_x, source_y) in frame.items():
            x = source_x * scale
            result[index][name] = [
                round(size - x if mirror else x, 4),
                round(source_y * scale, 4),
            ]
    return result

def stitch_frames():
    from PIL import Image, ImageDraw, ImageOps

    config = load_config()
    animation = config["animation"]
    output = config["output"]
    root = build_root(config)
    frames_root = root / output["frameDirectory"]
    runtime = runtime_root(config)
    previews = root / output["previewDirectory"]
    runtime.mkdir(parents=True, exist_ok=True)
    previews.mkdir(parents=True, exist_ok=True)
    metadata = json.loads((root / output["renderMetadata"]).read_text(encoding="utf-8"))

    frames = []
    bounds = {}
    packed_size = animation["packedFrameSizePx"]
    for index in range(animation["frameCount"]):
        path = frames_root / f"frame-{index:03d}.png"
        with Image.open(path) as image:
            frame = image.convert("RGBA").resize(
                (packed_size, packed_size),
                Image.Resampling.LANCZOS,
            )
        if animation["mirrorForSourceFacingRight"]:
            frame = ImageOps.mirror(frame)
        frames.append(frame)
        bounds[str(index)] = list(frame.getchannel("A").getbbox() or (0, 0, 0, 0))

    columns = animation["columns"]
    rows = math.ceil(animation["frameCount"] / columns)
    sheet = Image.new("RGBA", (columns * packed_size, rows * packed_size), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(
            frame,
            ((index % columns) * packed_size, (index // columns) * packed_size),
        )
    sheet_path = runtime / output["runtimeSheet"]
    sheet.save(sheet_path, optimize=True)

    preview_frames = []
    preview_size = animation["previewFrameSizePx"]
    for frame in frames:
        small = frame.resize((preview_size, preview_size), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", small.size, (11, 17, 24))
        canvas.paste(small, (0, 0), small)
        preview_frames.append(canvas)
    preview_frames[0].save(
        previews / output["previewGif"],
        save_all=True,
        append_images=preview_frames[1:],
        duration=round(1000 / animation["fps"]),
        loop=0,
        optimize=True,
    )

    samples = animation["motionStripSamples"]
    strip = Image.new("RGB", (preview_size * samples, preview_size + 24), (11, 17, 24))
    draw = ImageDraw.Draw(strip)
    for sample in range(samples):
        index = round(sample * (len(preview_frames) - 1) / max(1, samples - 1))
        strip.paste(preview_frames[index], (sample * preview_size, 0))
        draw.text((sample * preview_size + 5, preview_size + 5), str(index), fill=(188, 201, 212))
    strip.save(previews / output["motionStrip"])

    manifest = {
        "version": config["version"],
        "productionChanged": True,
        "source": {
            "blend": config["source"]["blend"],
            "blendSha256": metadata["sourceBlendSha256"],
            "action": metadata["sourceAction"],
            "frame": metadata["sourceFrame"],
        },
        "runtime": {
            "file": output["runtimeSheet"],
            "sha256": sha256(sheet_path),
            "frameCount": animation["frameCount"],
            "frameWidth": packed_size,
            "frameHeight": packed_size,
            "columns": columns,
            "rows": rows,
            "fps": animation["fps"],
            "loop": animation["loop"],
            "sourceFacesRight": True,
            "displaySizePx": config["runtime"]["displaySizePx"],
            "visualOrigin": config["runtime"]["visualOrigin"],
            "alphaBounds": bounds,
            "rigMarkers": mirrored_markers(metadata, animation),
        },
        "motionAuthority": (
            "Exact DG_SUPERMAN_FLIGHT_IDLE_PRONE_V3 Blender pose with a restrained "
            "whole-body hover loop; no Push_Loop pose substitution"
        ),
        "rollback": "Restore survival-character-blender-v2-superman-flight-sheet.png routing",
    }
    (root / output["promotionManifest"]).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (root / "readme.md").write_text(
        "# Superman prone-v3 production build\n\n"
        "Production evidence for the versioned runtime sheet generated from the exact "
        "`DG_SUPERMAN_FLIGHT_IDLE_PRONE_V3` Blender pose. The old Push Loop sheet remains "
        "untouched for rollback.\n",
        encoding="utf-8",
    )
    print(f"SUPERMAN_FLIGHT_PRONE_V3_STITCH_OK sheet={sheet_path}")

if __name__ == "__main__":
    if "bpy" in sys.modules:
        render_frames()
    else:
        stitch_frames()
