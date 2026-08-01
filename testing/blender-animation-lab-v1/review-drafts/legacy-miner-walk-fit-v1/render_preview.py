"""Render the fitted Legacy Miner walk loop from the isolated review blend."""

from __future__ import annotations

from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[4]
SESSION_NAME = "legacy-miner-walk-fit-v1"
OUTPUT_ROOT = (
    ROOT
    / "testing"
    / "blender-animation-lab-v1"
    / "review-drafts"
    / SESSION_NAME
    / "animation-frames"
)


def main() -> None:
    scene = bpy.context.scene
    source_rig = bpy.data.objects.get("root")
    candidate_parts = [
        obj
        for obj in scene.objects
        if obj.get("dgal_session") == SESSION_NAME
        and obj.get("dgal_role") == "mesh-candidate-part"
    ]
    candidate_meshes = [
        obj
        for obj in candidate_parts
        if obj.type == "MESH"
        and obj.vertex_groups
        and any(
            modifier.type == "ARMATURE" and modifier.object
            for modifier in obj.modifiers
        )
    ]
    candidate_rig = next(
        (obj for obj in candidate_parts if obj.type == "ARMATURE"),
        None,
    )
    source_meshes = [
        obj
        for obj in scene.objects
        if obj.type == "MESH"
        and any(
            modifier.type == "ARMATURE" and modifier.object == source_rig
            for modifier in obj.modifiers
        )
    ]
    if not candidate_meshes or candidate_rig is None:
        raise RuntimeError("The fitted Legacy Miner rig and skinned mesh are missing")
    if not candidate_rig.animation_data or not candidate_rig.animation_data.action:
        raise RuntimeError("The fitted Legacy Miner has no retargeted walk action")

    first = int(candidate_rig.animation_data.action.frame_range[0])
    last = int(candidate_rig.animation_data.action.frame_range[1])
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    (OUTPUT_ROOT / "readme.md").write_text(
        "# Fitted Legacy Miner walk frames\n\n"
        "Transparent, review-only frames rendered from the native-weighted Legacy "
        "Miner rig after mapping the current Survival Jog_Fwd_Loop. These are not "
        "loaded by the game runtime.\n",
        encoding="utf-8",
    )

    tracked = [*source_meshes, *candidate_meshes]
    previous_visibility = {obj: obj.hide_render for obj in tracked}
    previous_frame = scene.frame_current
    previous_render = {
        "x": scene.render.resolution_x,
        "y": scene.render.resolution_y,
        "percentage": scene.render.resolution_percentage,
        "format": scene.render.image_settings.file_format,
        "colorMode": scene.render.image_settings.color_mode,
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
        for obj in candidate_meshes:
            obj.hide_render = False
        for frame in range(first, last + 1):
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            scene.render.filepath = str(OUTPUT_ROOT / f"frame-{frame:04d}.png")
            bpy.ops.render.render(write_still=True)
    finally:
        for obj, hidden in previous_visibility.items():
            obj.hide_render = hidden
        scene.frame_set(previous_frame)
        scene.render.resolution_x = previous_render["x"]
        scene.render.resolution_y = previous_render["y"]
        scene.render.resolution_percentage = previous_render["percentage"]
        scene.render.image_settings.file_format = previous_render["format"]
        scene.render.image_settings.color_mode = previous_render["colorMode"]
        scene.render.film_transparent = previous_render["transparent"]
        scene.render.filepath = previous_render["filepath"]

    print(
        "LEGACY_MINER_WALK_PREVIEW_FRAMES_OK "
        f"frames={last - first + 1} range={first}-{last} output={OUTPUT_ROOT}"
    )


if __name__ == "__main__":
    main()
