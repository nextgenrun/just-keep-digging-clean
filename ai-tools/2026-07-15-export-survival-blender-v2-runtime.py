"""Render Blender-authored Survival Miner v2 actions and stitch runtime sheets.

Blender MCP render:
  python ai-tools/2026-07-15-blender-mcp-client.py --timeout 3600 execute-code \
    --code-file ai-tools/2026-07-15-export-survival-blender-v2-runtime.py

Pillow stitch (after Blender finishes):
  python ai-tools/2026-07-15-export-survival-blender-v2-runtime.py
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path


ROOT = Path(r"C:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned")
ASSET_ROOT = ROOT / "sprites" / "character" / "survival-character-blender-v2"
RUNTIME_ROOT = ASSET_ROOT / "runtime"
PREVIEW_ROOT = ASSET_ROOT / "previews"
FRAME_ROOT = Path(tempfile.gettempdir()) / "dig-game-survival-miner-v2-frames-512"
SOURCE_SIZE = 512
CELL_SIZE = 256
MAX_SHEET_COLUMNS = 16
CLIPS = {
    "idle": {
        "rigAction": "MINER_idle", "frames": 48, "fps": 12, "loop": True,
    },
    "walk": {
        "rigAction": "MINER_walk", "frames": 24, "fps": 16, "loop": True,
    },
    "run": {
        "rigAction": "MINER_run", "frames": 28, "fps": 16, "loop": True,
    },
    "fly": {
        "rigAction": "SRC_fly", "frames": 36, "fps": 16, "loop": True,
    },
    "attack": {
        "rigAction": "MINER_attack", "frames": 18, "fps": 18, "loop": False,
    },
    "dig-side": {
        "rigAction": "MINER_dig_side", "frames": 32, "fps": 36, "loop": False,
    },
    "dig-up": {
        "rigAction": "MINER_dig_up", "frames": 24, "fps": 27, "loop": False,
    },
    "dig-down": {
        "rigAction": "MINER_dig_down", "frames": 30, "fps": 33, "loop": False,
    },
}


def frame_path(clip: str, index: int) -> Path:
    return FRAME_ROOT / f"survival-miner-v2-{clip}-{index:03d}.png"


def configure_blender_render(scene) -> None:
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = SOURCE_SIZE
    scene.render.resolution_y = SOURCE_SIZE
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 15
    scene.render.fps = 30
    try:
        scene.view_settings.look = "Medium High Contrast"
    except TypeError:
        pass


def render_in_blender() -> None:
    import bpy

    scene = bpy.context.scene
    rig = bpy.data.objects.get("SurvivalPolishRig")
    body = bpy.data.objects.get("SurvivalPolishBody")
    camera = bpy.data.objects.get("SurvivalPolishCamera")
    tool = bpy.data.objects.get("SurvivalMinerPickaxe")
    procedural_gear = [obj for obj in bpy.data.objects if obj.name.startswith("ACC_")]
    missing = [name for name, obj in (
        ("SurvivalPolishRig", rig), ("SurvivalPolishBody", body),
        ("SurvivalPolishCamera", camera),
    ) if obj is None]
    if missing:
        raise RuntimeError(f"Persistent Survival Miner v2 scene is incomplete: {missing}")
    missing_actions = [config["rigAction"] for config in CLIPS.values()
                       if bpy.data.actions.get(config["rigAction"]) is None]
    if missing_actions:
        raise RuntimeError(f"Missing required Survival Miner actions: {missing_actions}")

    FRAME_ROOT.mkdir(parents=True, exist_ok=True)
    for old_frame in FRAME_ROOT.glob("survival-miner-v2-*.png"):
        old_frame.unlink()
    scene.camera = camera
    configure_blender_render(scene)
    rig.animation_data_create()
    previous_rig_action = rig.animation_data.action
    previous_tool_hidden = tool.hide_render if tool else None
    previous_gear_hidden = {obj.name: obj.hide_render for obj in procedural_gear}
    previous_frame = scene.frame_current

    try:
        for obj in procedural_gear:
            obj.hide_render = True
        if tool:
            tool.hide_render = True
        for clip, config in CLIPS.items():
            action = bpy.data.actions[config["rigAction"]]
            rig.animation_data.action = action
            start, end = (float(value) for value in action.frame_range)
            scene.frame_start, scene.frame_end = int(start), int(end)
            for index in range(config["frames"]):
                denominator = config["frames"] if config["loop"] else max(1, config["frames"] - 1)
                source_frame = start + (end - start) * (index / denominator)
                whole_frame = int(source_frame)
                scene.frame_set(whole_frame, subframe=source_frame - whole_frame)
                bpy.context.view_layer.update()
                scene.render.filepath = str(frame_path(clip, index))
                bpy.ops.render.render(write_still=True)
            print(
                f"SURVIVAL_MINER_V2_RENDER clip={clip} frames={config['frames']} "
                f"action={config['rigAction']} fixedCamera={camera.name} basePbrOnly=True"
            )
    finally:
        rig.animation_data.action = previous_rig_action
        if tool and previous_tool_hidden is not None:
            tool.hide_render = previous_tool_hidden
        for obj in procedural_gear:
            obj.hide_render = previous_gear_hidden[obj.name]
        scene.frame_set(previous_frame)
        bpy.context.view_layer.update()


def stitch_runtime() -> None:
    from PIL import Image, ImageDraw

    RUNTIME_ROOT.mkdir(parents=True, exist_ok=True)
    PREVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    manifest = {
        "frameWidth": CELL_SIZE,
        "frameHeight": CELL_SIZE,
        "sourceRenderWidth": SOURCE_SIZE,
        "sourceRenderHeight": SOURCE_SIZE,
        "authoringAuthority": "Blender-authored Survival Miner v2 persistent master",
        "cameraAuthority": "SurvivalPolishCamera fixed framing; no per-frame recentering",
        "postProcess": "Pillow Lanczos RGBA downsample from 512px to 256px cells",
        "clips": {},
    }
    generated_frames = []
    for clip, config in CLIPS.items():
        source_paths = [frame_path(clip, index) for index in range(config["frames"])]
        missing = [str(path) for path in source_paths if not path.exists()]
        if missing:
            raise FileNotFoundError(f"Blender render is incomplete for {clip}: {missing[:3]}")
        frames = []
        for path in source_paths:
            with Image.open(path) as source:
                if source.size != (SOURCE_SIZE, SOURCE_SIZE):
                    raise RuntimeError(f"Unexpected Blender frame size {source.size}: {path}")
                frames.append(source.convert("RGBA").resize(
                    (CELL_SIZE, CELL_SIZE), Image.Resampling.LANCZOS
                ))
        columns = min(config["frames"], MAX_SHEET_COLUMNS)
        rows = (config["frames"] + columns - 1) // columns
        sheet = Image.new("RGBA", (columns * CELL_SIZE, rows * CELL_SIZE), (0, 0, 0, 0))
        for index, frame in enumerate(frames):
            sheet.alpha_composite(
                frame,
                ((index % columns) * CELL_SIZE, (index // columns) * CELL_SIZE),
            )
        filename = f"survival-character-blender-v2-{clip}-sheet.png"
        sheet.save(RUNTIME_ROOT / filename, optimize=True)
        preview_frames = []
        for frame in frames:
            small = frame.resize((128, 128), Image.Resampling.LANCZOS)
            canvas = Image.new("RGB", (128, 128), (11, 17, 24))
            canvas.paste(small, (0, 0), small)
            preview_frames.append(canvas)
        preview_frames[0].save(
            PREVIEW_ROOT / f"survival-character-blender-v2-{clip}.gif",
            save_all=True,
            append_images=preview_frames[1:],
            duration=round(1000 / config["fps"]),
            loop=0 if config["loop"] else 1,
            optimize=True,
        )
        sample_indices = [round(value * (len(preview_frames) - 1) / 5) for value in range(6)]
        strip = Image.new("RGB", (128 * 6, 154), (11, 17, 24))
        strip_draw = ImageDraw.Draw(strip)
        for sample, source_index in enumerate(sample_indices):
            strip.paste(preview_frames[source_index], (sample * 128, 0))
            strip_draw.text((sample * 128 + 5, 133), str(source_index), fill=(188, 201, 212))
        strip.save(PREVIEW_ROOT / f"survival-character-blender-v2-{clip}-motion-strip.png")
        manifest["clips"][clip] = {
            "file": filename,
            "frames": config["frames"],
            "columns": columns,
            "rows": rows,
            "fps": config["fps"],
            "loop": config["loop"],
            "motionAuthority": f"Blender action: {config['rigAction']}",
            "renderVariant": "high-quality PBR base; procedural gear and tool hidden",
        }
        generated_frames.extend(source_paths)
        print(f"SURVIVAL_MINER_V2_STITCH clip={clip} sheet={filename}")

    manifest_path = RUNTIME_ROOT / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    for path in generated_frames:
        path.unlink()
    print(f"SURVIVAL_MINER_V2_RUNTIME_OK manifest={manifest_path}")


try:
    import bpy  # noqa: F401
except ImportError:
    bpy = None

if bpy is None:
    stitch_runtime()
else:
    render_in_blender()
