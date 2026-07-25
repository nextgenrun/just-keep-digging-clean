"""Render Unreal camera-angle candidates from the real retargeted walk."""

from __future__ import annotations

import math
from pathlib import Path

import unreal


PROJECT_DIR = Path(unreal.Paths.project_dir()).resolve()
OUTPUT_DIR = PROJECT_DIR / "Renders" / "angles"
MAP_PATH = "/Game/LegacyMinerWalk/WalkReviewMap"
MESH_PATH = "/Game/LegacyMinerWalk/Meshy/SK_LegacyMiner_Meshy_v2.SK_LegacyMiner_Meshy_v2"
WALK_PATH = "/Game/LegacyMinerWalk/Animations/LegacyMiner_Unreal_Walk.LegacyMiner_Unreal_Walk"

ANGLES = [140, 145, 150, 155, 160]
POSE_TIME_SECONDS = 0.46
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
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if unreal.EditorAssetLibrary.does_asset_exist(f"{MAP_PATH}.{MAP_PATH.rsplit('/', 1)[-1]}"):
        unreal.EditorLevelLibrary.load_level(MAP_PATH)
        actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
        for existing_actor in actor_subsystem.get_all_level_actors():
            actor_subsystem.destroy_actor(existing_actor)
    else:
        unreal.EditorLevelLibrary.new_level(MAP_PATH)
    world = unreal.EditorLevelLibrary.get_editor_world()

    mesh = unreal.load_asset(MESH_PATH)
    walk = unreal.load_asset(WALK_PATH)
    if not isinstance(mesh, unreal.SkeletalMesh) or not isinstance(walk, unreal.AnimSequence):
        raise RuntimeError("The native Unreal miner mesh and walk must be built before rendering")

    character = spawn(unreal.SkeletalMeshActor, unreal.Vector(0.0, 0.0, 0.0))
    character.set_actor_label("Legacy Miner - Unreal Retargeted Walk")
    component = character.get_editor_property("skeletal_mesh_component")
    component.set_skinned_asset_and_update(mesh, True)
    component.set_animation_mode(unreal.AnimationMode.ANIMATION_SINGLE_NODE)
    component.set_animation(walk)
    component.play(False)
    component.set_position(POSE_TIME_SECONDS, False)
    component.stop()

    key = spawn(
        unreal.DirectionalLight,
        unreal.Vector(0.0, 0.0, 250.0),
        unreal.Rotator(pitch=-35.0, yaw=-35.0, roll=0.0),
    )
    key.get_editor_property("directional_light_component").set_intensity(1.0)
    fill = spawn(unreal.RectLight, unreal.Vector(100.0, -180.0, 150.0), look_at(unreal.Vector(100.0, -180.0, 150.0), unreal.Vector(0.0, 0.0, 90.0)))
    fill.get_editor_property("rect_light_component").set_intensity(100.0)
    rim = spawn(unreal.RectLight, unreal.Vector(-120.0, 170.0, 130.0), look_at(unreal.Vector(-120.0, 170.0, 130.0), unreal.Vector(0.0, 0.0, 100.0)))
    rim.get_editor_property("rect_light_component").set_intensity(60.0)

    capture_actor = spawn(unreal.SceneCapture2D, unreal.Vector(400.0, 0.0, 90.0))
    capture = capture_actor.get_editor_property("capture_component2d")
    capture.set_editor_properties(
        {
            "capture_every_frame": False,
            "capture_on_movement": False,
            "capture_source": unreal.SceneCaptureSource.SCS_BASE_COLOR,
            "projection_type": unreal.CameraProjectionMode.ORTHOGRAPHIC,
            "ortho_width": 235.0,
        }
    )

    render_target = unreal.TextureRenderTarget2D()
    render_target.set_editor_properties(
        {
            "size_x": RENDER_SIZE,
            "size_y": RENDER_SIZE,
            "render_target_format": unreal.TextureRenderTargetFormat.RTF_RGBA8_SRGB,
            "clear_color": unreal.LinearColor(0.005, 0.005, 0.005, 1.0),
        }
    )
    capture.set_editor_property("texture_target", render_target)

    unreal.SystemLibrary.execute_console_command(world, "r.MotionBlurQuality 0")
    unreal.SystemLibrary.execute_console_command(world, "r.DefaultFeature.AutoExposure 0")
    unreal.SystemLibrary.execute_console_command(world, "r.AntiAliasingMethod 2")

    target = unreal.Vector(0.0, 0.0, 92.0)
    radius = 450.0
    for angle in ANGLES:
        radians = math.radians(angle)
        location = unreal.Vector(radius * math.cos(radians), radius * math.sin(radians), 92.0)
        capture_actor.set_actor_location(location, False, False)
        capture_actor.set_actor_rotation(look_at(location, target), False)
        capture.capture_scene()
        unreal.RenderingLibrary.export_render_target(world, render_target, str(OUTPUT_DIR), f"angle-{angle:03d}.png")
        unreal.log(f"ANGLE_RENDER_OK angle={angle}")

    unreal.EditorLevelLibrary.save_current_level()
    unreal.log(f"ANGLE_CANDIDATES_OK count={len(ANGLES)} output={OUTPUT_DIR}")


if __name__ == "__main__":
    main()
