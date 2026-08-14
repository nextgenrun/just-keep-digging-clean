"""Render a review-only current/target Blender idle loop without saving the blend."""

from pathlib import Path

import bpy


ROOT = Path(r"C:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned")
OUTPUT = ROOT / "visual-approval-previews/2026-08-14-animation-mesh-polish-v2-motion/blender-ab"
FRAME_COUNT = 24
SIZE = 512


def configure_common(scene, rig, body) -> None:
    scene.camera = bpy.data.objects["SurvivalPolishCamera"]
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = SIZE
    scene.render.resolution_y = SIZE
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 15
    rig.animation_data_create()
    rig.animation_data.action = bpy.data.actions["MINER_idle"]
    for obj in bpy.data.objects:
        if obj.name.startswith("ACC_") or obj.name == "SurvivalMinerPickaxe":
            obj.hide_render = True
    modifier = next((item for item in body.modifiers if item.type == "ARMATURE"), None)
    if modifier:
        modifier.use_deform_preserve_volume = False


def set_lights(cinematic: bool, polish: bool) -> None:
    for obj in bpy.data.objects:
        if obj.type != "LIGHT":
            continue
        if obj.name.startswith("SurvivalCinematic"):
            obj.hide_render = not cinematic
        elif obj.name.startswith("SurvivalPolish"):
            obj.hide_render = not polish


def render_sequence(scene, rig, directory: Path, target: bool) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    existing = sorted(directory.glob("frame-*.png"))
    if len(existing) == FRAME_COUNT:
        print(f"MESH_LIGHTING_AB_SKIP target={target} frames={len(existing)}")
        return
    set_lights(cinematic=True, polish=not target)
    modifier = next((item for item in bpy.data.objects["SurvivalPolishBody"].modifiers if item.type == "ARMATURE"), None)
    if target:
        set_lights(cinematic=True, polish=False)
        if modifier:
            modifier.use_deform_preserve_volume = True
        for image in bpy.data.images:
            if "normal" in image.name.lower() and image.size[0] > 0:
                image.colorspace_settings.name = "Non-Color"
        try:
            scene.view_settings.view_transform = "AgX"
        except TypeError:
            pass
        scene.view_settings.look = "AgX - Medium High Contrast"
    else:
        scene.view_settings.view_transform = "Filmic"
        scene.view_settings.look = "Medium High Contrast"
    start, end = (float(value) for value in rig.animation_data.action.frame_range)
    for index in range(FRAME_COUNT):
        source_frame = start + (end - start) * (index / FRAME_COUNT)
        whole = int(source_frame)
        scene.frame_set(whole, subframe=source_frame - whole)
        bpy.context.view_layer.update()
        scene.render.filepath = str(directory / f"frame-{index:03d}.png")
        bpy.ops.render.render(write_still=True)
        print(f"MESH_LIGHTING_AB target={target} frame={index + 1}/{FRAME_COUNT}")


def main() -> None:
    scene = bpy.context.scene
    rig = bpy.data.objects["SurvivalPolishRig"]
    body = bpy.data.objects["SurvivalPolishBody"]
    configure_common(scene, rig, body)
    render_sequence(scene, rig, OUTPUT / "current", target=False)
    render_sequence(scene, rig, OUTPUT / "target", target=True)
    print("MESH_LIGHTING_AB_RENDER_OK")


main()
