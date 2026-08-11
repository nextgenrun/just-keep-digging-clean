"""Render and post-process fixed-camera golden frames for Survival Miner v2."""

from __future__ import annotations

from pathlib import Path


ROOT = Path(r"C:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned")
ASSET_ROOT = ROOT / "sprites" / "character" / "survival-character-blender-v2"
PREVIEW_ROOT = ASSET_ROOT / "previews"
RENDER_SIZE = 512
SPECS = (
    ("idle-hero", "MINER_idle", 1),
    ("attack-punch-impact", "MINER_attack", 18),
    ("dig-side-impact", "MINER_dig_side", 32),
    ("dig-up-impact", "MINER_dig_up", 17),
    ("dig-down-impact", "MINER_dig_down", 29),
    ("ue-attack", "SRC_attack", 18),
    ("ue-dig-side", "SRC_dig_side", 32),
    ("ue-dig-up", "SRC_dig_up", 17),
    ("ue-dig-down", "SRC_dig_down", 29),
)


def blender_render() -> None:
    import bpy

    scene = bpy.context.scene
    rig = bpy.data.objects.get("SurvivalPolishRig")
    tool = bpy.data.objects.get("SurvivalMinerPickaxe")
    camera = bpy.data.objects.get("SurvivalPolishCamera")
    if not rig or not camera:
        missing = [name for name, value in (
            ("SurvivalPolishRig", rig),
            ("SurvivalPolishCamera", camera),
        ) if not value]
        raise RuntimeError(f"Persistent Survival Miner scene is incomplete: {missing}")

    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = RENDER_SIZE
    scene.render.resolution_y = RENDER_SIZE
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 15
    scene.render.fps = 30
    scene.view_settings.look = "Medium High Contrast"
    PREVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    if tool:
        tool.hide_render = True

    for label, rig_action_name, frame in SPECS:
        rig_action = bpy.data.actions.get(rig_action_name)
        if not rig_action:
            raise RuntimeError(f"Missing authored action for {label}: {rig_action_name}")
        rig.animation_data_create()
        rig.animation_data.action = rig_action
        scene.frame_start = int(rig_action.frame_range[0])
        scene.frame_end = int(rig_action.frame_range[1])
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        scene.render.filepath = str(PREVIEW_ROOT / f"{label}-512.png")
        bpy.ops.render.render(write_still=True)
        print(f"SURVIVAL_POLISH_GOLDEN label={label} frame={frame}")


def post_process() -> None:
    from PIL import Image, ImageDraw

    PREVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    rendered = []
    for label, _rig_action, _frame in SPECS:
        source_path = PREVIEW_ROOT / f"{label}-512.png"
        if not source_path.exists():
            raise FileNotFoundError(f"Blender golden frame missing: {source_path}")
        source = Image.open(source_path).convert("RGBA")
        truth = source.resize((128, 128), Image.Resampling.LANCZOS)
        inspection = source.resize((256, 256), Image.Resampling.LANCZOS)
        truth.save(PREVIEW_ROOT / f"{label}-truth-128.png", optimize=True)
        inspection.save(PREVIEW_ROOT / f"{label}-inspection-256.png", optimize=True)
        rendered.append((label, truth, inspection))

    columns, cell_width, cell_height = 3, 376, 320
    rows = (len(rendered) + columns - 1) // columns
    card = Image.new("RGB", (columns * cell_width, 48 + rows * cell_height), (11, 17, 24))
    draw = ImageDraw.Draw(card)
    draw.text((16, 10), "SURVIVAL MINER V2 - 128PX PRODUCTION TRUTH / 2X INSPECTION", fill=(241, 194, 105))
    for index, (label, truth, inspection) in enumerate(rendered):
        x = 16 + (index % columns) * cell_width
        y = 48 + (index // columns) * cell_height
        card.paste(truth, (x, y), truth)
        card.paste(inspection, (x + 136, y), inspection)
        draw.text((x, y + 136), "128px truth", fill=(188, 201, 212))
        draw.text((x + 136, y + 262), f"{label} - 2x", fill=(188, 201, 212))
    card.save(PREVIEW_ROOT / "survival-miner-v2-golden-comparison.png", quality=96)
    print(f"Built golden comparison: {PREVIEW_ROOT}")


try:
    import bpy  # noqa: F401
except ImportError:
    bpy = None

if bpy is None:
    post_process()
else:
    blender_render()
