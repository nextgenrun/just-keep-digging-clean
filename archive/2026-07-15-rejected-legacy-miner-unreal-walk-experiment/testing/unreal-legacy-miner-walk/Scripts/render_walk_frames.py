"""Render the genuine Unreal-retargeted Legacy Miner walk as 51 PNG frames."""

from __future__ import annotations

import json
import math
import re
from pathlib import Path

import unreal


PROJECT_DIR = Path(unreal.Paths.project_dir()).resolve()
OUTPUT_DIR = PROJECT_DIR / "Renders" / "walk-channel-frames"
REPORT_PATH = PROJECT_DIR / "SourceAssets" / "unreal-walk-render-report.json"
MAP_PATH = "/Game/LegacyMinerWalk/WalkReviewMap"
MESH_PATH = "/Game/LegacyMinerWalk/Meshy/SK_LegacyMiner_Meshy_v2.SK_LegacyMiner_Meshy_v2"
MATERIAL_PATH_TEMPLATE = "/Game/LegacyMinerWalk/Meshy/M_LegacyMiner_Channel_{channel}.M_LegacyMiner_Channel_{channel}"
WALK_PATH = "/Game/LegacyMinerWalk/Animations/LegacyMiner_Unreal_Unarmed_Walk.LegacyMiner_Unreal_Unarmed_Walk"

FRAME_COUNT = 51
PLAYBACK_FPS = 14
SOURCE_CYCLES = 2
CAMERA_ANGLE_DEGREES = 150
RENDER_SIZE = 512


def look_at(location: unreal.Vector, target: unreal.Vector) -> unreal.Rotator:
    dx = target.x - location.x
    dy = target.y - location.y
    dz = target.z - location.z
    yaw = math.degrees(math.atan2(dy, dx))
    pitch = math.degrees(math.atan2(dz, math.sqrt(dx * dx + dy * dy)))
    return unreal.Rotator(pitch=pitch, yaw=yaw, roll=0.0)


def spawn(actor_class: type, location: unreal.Vector, rotation: unreal.Rotator | None = None) -> unreal.Actor:
    actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
        actor_class,
        location,
        rotation or unreal.Rotator(),
        transient=False,
    )
    if not actor:
        raise RuntimeError(f"Could not spawn {actor_class}")
    return actor


def main() -> None:
    channel_match = re.search(r"-WalkChannel=([RGB])", unreal.SystemLibrary.get_command_line(), re.IGNORECASE)
    if not channel_match:
        raise RuntimeError("Pass -WalkChannel=R, G, or B")
    render_channel = channel_match.group(1).upper()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for channel in (render_channel,):
        channel_dir = OUTPUT_DIR / channel
        channel_dir.mkdir(parents=True, exist_ok=True)
        for old_frame in channel_dir.glob("frame-*.png"):
            old_frame.unlink()

    if unreal.EditorAssetLibrary.does_asset_exist(f"{MAP_PATH}.{MAP_PATH.rsplit('/', 1)[-1]}"):
        unreal.EditorLevelLibrary.load_level(MAP_PATH)
        actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
        for existing_actor in actor_subsystem.get_all_level_actors():
            actor_subsystem.destroy_actor(existing_actor)
    else:
        unreal.EditorLevelLibrary.new_level(MAP_PATH)
    world = unreal.EditorLevelLibrary.get_editor_world()

    mesh = unreal.load_asset(MESH_PATH)
    materials = {render_channel: unreal.load_asset(MATERIAL_PATH_TEMPLATE.format(channel=render_channel))}
    walk = unreal.load_asset(WALK_PATH)
    if not isinstance(mesh, unreal.SkeletalMesh):
        raise RuntimeError("The native Unreal Legacy Miner skeletal mesh is unavailable")
    if any(not isinstance(material, unreal.Material) for material in materials.values()):
        raise RuntimeError("The deterministic Unreal R/G/B capture materials are unavailable")
    if not isinstance(walk, unreal.AnimSequence):
        raise RuntimeError("The native Unreal-retargeted walk is unavailable")

    material = materials[render_channel]
    existing_slots = mesh.get_editor_property("materials")
    persisted_slots = []
    for existing_slot in existing_slots:
        slot = unreal.SkeletalMaterial()
        slot.set_editor_property("material_interface", material)
        slot.set_editor_property("material_slot_name", existing_slot.get_editor_property("material_slot_name"))
        persisted_slots.append(slot)
    mesh.set_editor_property("materials", persisted_slots)
    unreal.EditorAssetLibrary.save_loaded_asset(mesh, only_if_is_dirty=False)

    character = spawn(unreal.SkeletalMeshActor, unreal.Vector(0.0, 0.0, 0.0))
    character.set_actor_label(f"Legacy Miner - Unreal Retargeted Walk - {render_channel} Pass")
    component = character.get_editor_property("skeletal_mesh_component")
    component.set_skinned_asset_and_update(mesh, True)
    component.set_animation_mode(unreal.AnimationMode.ANIMATION_SINGLE_NODE)
    component.set_animation(walk)
    component.play(False)
    component.stop()

    radius = 450.0
    radians = math.radians(CAMERA_ANGLE_DEGREES)
    target = unreal.Vector(0.0, 0.0, 90.0)
    camera_location = unreal.Vector(radius * math.cos(radians), radius * math.sin(radians), 90.0)
    capture_actor = spawn(unreal.SceneCapture2D, camera_location, look_at(camera_location, target))
    capture = capture_actor.get_editor_property("capture_component2d")
    capture.set_editor_properties(
        {
            "capture_every_frame": False,
            "capture_on_movement": False,
            "capture_source": unreal.SceneCaptureSource.SCS_BASE_COLOR,
            "projection_type": unreal.CameraProjectionMode.ORTHOGRAPHIC,
            "ortho_width": 205.0,
        }
    )

    render_target = unreal.TextureRenderTarget2D()
    render_target.set_editor_properties(
        {
            "size_x": RENDER_SIZE,
            "size_y": RENDER_SIZE,
            "render_target_format": unreal.TextureRenderTargetFormat.RTF_RGBA8_SRGB,
            "clear_color": unreal.LinearColor(0.0, 0.0, 0.0, 1.0),
        }
    )
    capture.set_editor_property("texture_target", render_target)

    unreal.SystemLibrary.execute_console_command(world, "r.MotionBlurQuality 0")
    unreal.SystemLibrary.execute_console_command(world, "r.DefaultFeature.AutoExposure 0")
    unreal.SystemLibrary.execute_console_command(world, "r.AntiAliasingMethod 2")

    duration = float(walk.get_play_length())
    frame_times = [
        (SOURCE_CYCLES * duration * frame_index / FRAME_COUNT) % duration
        for frame_index in range(FRAME_COUNT)
    ]
    channel_dir = OUTPUT_DIR / render_channel
    for frame_index, frame_time in enumerate(frame_times):
        component.set_position(frame_time, False)
        capture.capture_scene()
        unreal.RenderingLibrary.export_render_target(
            world,
            render_target,
            str(channel_dir),
            f"frame-{frame_index:03d}.png",
        )
        unreal.log(f"WALK_CHANNEL_FRAME_OK channel={render_channel} frame={frame_index:03d} time={frame_time:.6f}")

    unreal.EditorLevelLibrary.save_current_level()
    report = {
        "scope": "walk-only",
        "engine_version": unreal.SystemLibrary.get_engine_version(),
        "mesh": mesh.get_path_name(),
        "rendered_channel": render_channel,
        "material": material.get_path_name(),
        "animation": walk.get_path_name(),
        "retargeted_in_unreal": True,
        "animation_authored_in_blender": False,
        "source_duration_seconds": duration,
        "source_cycles": SOURCE_CYCLES,
        "frame_count": FRAME_COUNT,
        "playback_fps": PLAYBACK_FPS,
        "camera_angle_degrees": CAMERA_ANGLE_DEGREES,
        "camera_note": "predominantly right-facing side view with the Legacy Miner three-quarter reveal",
        "render_size": [RENDER_SIZE, RENDER_SIZE],
        "capture_method": "Unreal Base Color R/G/B passes, recombined losslessly for the 2D port",
        "frame_times_seconds": frame_times,
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    unreal.log(f"UNREAL_WALK_CHANNEL_OK channel={render_channel} count={FRAME_COUNT} output={channel_dir}")


if __name__ == "__main__":
    main()
