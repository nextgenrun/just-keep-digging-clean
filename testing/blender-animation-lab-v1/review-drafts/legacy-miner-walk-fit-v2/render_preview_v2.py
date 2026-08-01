"""Render all 24 frames of the corrected real Meshy walk candidate."""

from __future__ import annotations

from pathlib import Path

import bpy


SESSION_ROOT = Path(__file__).resolve().parent
OUTPUT_ROOT = SESSION_ROOT / "animation-frames"


def rigged_meshes(
    scene: bpy.types.Scene,
    rig: bpy.types.Object,
) -> list[bpy.types.Object]:
    return [
        obj
        for obj in scene.objects
        if obj.type == "MESH"
        and any(
            modifier.type == "ARMATURE" and modifier.object == rig
            for modifier in obj.modifiers
        )
    ]


def main() -> None:
    scene = bpy.context.scene
    source_rig = bpy.data.objects.get("root")
    target_rig = next(
        (
            obj
            for obj in scene.objects
            if obj.type == "ARMATURE"
            and obj.get("dgal_retarget_version") == 2
        ),
        None,
    )
    if source_rig is None or target_rig is None:
        raise RuntimeError("The source and corrected-v2 rigs are required")
    target_meshes = rigged_meshes(scene, target_rig)
    source_meshes = rigged_meshes(scene, source_rig)
    if not target_meshes:
        raise RuntimeError("The corrected real Meshy skin is missing")
    action = (
        target_rig.animation_data.action
        if target_rig.animation_data
        else None
    )
    if action is None:
        raise RuntimeError("The corrected real Meshy action is missing")

    first = int(action.frame_range[0])
    last = int(action.frame_range[1])
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    tracked = [*source_meshes, *target_meshes]
    hidden = {obj: obj.hide_render for obj in tracked}
    previous = {
        "frame": scene.frame_current,
        "x": scene.render.resolution_x,
        "y": scene.render.resolution_y,
        "percentage": scene.render.resolution_percentage,
        "format": scene.render.image_settings.file_format,
        "mode": scene.render.image_settings.color_mode,
        "transparent": scene.render.film_transparent,
        "filepath": scene.render.filepath,
    }
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    try:
        for obj in source_meshes:
            obj.hide_render = True
        for obj in target_meshes:
            obj.hide_render = False
        for frame in range(first, last + 1):
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            scene.render.filepath = str(
                OUTPUT_ROOT / f"frame-{frame:04d}.png"
            )
            bpy.ops.render.render(write_still=True)
    finally:
        for obj, value in hidden.items():
            obj.hide_render = value
        scene.frame_set(previous["frame"])
        scene.render.resolution_x = previous["x"]
        scene.render.resolution_y = previous["y"]
        scene.render.resolution_percentage = previous["percentage"]
        scene.render.image_settings.file_format = previous["format"]
        scene.render.image_settings.color_mode = previous["mode"]
        scene.render.film_transparent = previous["transparent"]
        scene.render.filepath = previous["filepath"]

    print(
        "LEGACY_MINER_WALK_V2_PREVIEW_OK "
        f"frames={last - first + 1} "
        f"range={first}-{last} "
        f"output={OUTPUT_ROOT}"
    )


if __name__ == "__main__":
    main()
