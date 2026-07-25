"""Render 51 textured walk frames from Unreal's retargeted FBX in Blender."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


FRAME_COUNT = 51
SOURCE_CYCLES = 2
CAMERA_ANGLE_DEGREES = 120
RENDER_SIZE = 512


def make_texture_material(texture_path: Path) -> bpy.types.Material:
    material = bpy.data.materials.new("M_LegacyMiner_UnrealWalkBake")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = bpy.data.images.load(str(texture_path), check_existing=True)
    texture.interpolation = "Linear"
    material.node_tree.links.new(texture.outputs["Color"], emission.inputs["Color"])
    material.node_tree.links.new(emission.outputs["Emission"], output.inputs["Surface"])
    return material


def evaluated_bounds(obj: bpy.types.Object) -> tuple[Vector, Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    evaluated_mesh = evaluated.to_mesh()
    try:
        points = [evaluated.matrix_world @ vertex.co for vertex in evaluated_mesh.vertices]
        minimum = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
        maximum = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
        return minimum, maximum
    finally:
        evaluated.to_mesh_clear()


def main() -> None:
    argv = sys.argv[sys.argv.index("--") + 1 :]
    if len(argv) != 6:
        raise RuntimeError("Expected -- <unreal-walk.fbx> <texture.png> <output-dir> <report.json> <scene.blend> <fps>")
    fbx_path, texture_path, output_dir, report_path, blend_path = (Path(value).resolve() for value in argv[:5])
    playback_fps = int(argv[5])
    output_dir.mkdir(parents=True, exist_ok=True)
    for old_frame in output_dir.glob("frame-*.png"):
        old_frame.unlink()

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(fbx_path), automatic_bone_orientation=False)
    scene = bpy.context.scene
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
    scene.view_settings.look = "AgX - Medium High Contrast"

    meshes = [obj for obj in scene.objects if obj.type == "MESH"]
    armatures = [obj for obj in scene.objects if obj.type == "ARMATURE"]
    if len(meshes) != 1 or len(armatures) != 1:
        raise RuntimeError(f"Expected one mesh and one armature, found {len(meshes)} and {len(armatures)}")
    mesh = meshes[0]
    armature = armatures[0]
    material = make_texture_material(texture_path)
    mesh.data.materials.clear()
    mesh.data.materials.append(material)

    actions = list(bpy.data.actions)
    if not actions:
        raise RuntimeError("The Unreal FBX did not contain the retargeted animation")
    action = actions[0]
    if not armature.animation_data:
        armature.animation_data_create()
    armature.animation_data.action = action
    source_start, source_end = (float(value) for value in action.frame_range)
    source_span = source_end - source_start
    if source_span <= 0:
        raise RuntimeError(f"Invalid Unreal action range: {action.frame_range}")

    camera_data = bpy.data.cameras.new("LegacyMinerReviewCamera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 2.05
    camera = bpy.data.objects.new("LegacyMinerReviewCamera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    radians = math.radians(CAMERA_ANGLE_DEGREES)
    radius = 5.0

    sampled_frames: list[float] = []
    for frame_index in range(FRAME_COUNT):
        source_frame = source_start + (SOURCE_CYCLES * source_span * frame_index / FRAME_COUNT) % source_span
        sampled_frames.append(source_frame)
        scene.frame_set(int(source_frame), subframe=source_frame % 1.0)
        minimum, maximum = evaluated_bounds(mesh)
        target = (minimum + maximum) * 0.5
        camera.location = target + Vector((radius * math.cos(radians), radius * math.sin(radians), 0.0))
        camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(output_dir / f"frame-{frame_index:03d}.png")
        bpy.ops.render.render(write_still=True)
        print(f"BLENDER_WALK_FRAME_OK frame={frame_index:03d} source_frame={source_frame:.6f}")

    scene.frame_set(int(source_start))
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    report = {
        "scope": "walk-only",
        "source_fbx": str(fbx_path),
        "source_animation": "Unreal-retargeted LegacyMiner_Unreal_Unarmed_Walk",
        "animation_authored_in_blender": False,
        "presentation_rendered_in_blender": True,
        "texture": str(texture_path),
        "action": action.name,
        "source_frame_range": [source_start, source_end],
        "source_fps": scene.render.fps,
        "source_duration_seconds": source_span / scene.render.fps,
        "source_cycles": SOURCE_CYCLES,
        "output_frame_count": FRAME_COUNT,
        "output_playback_fps": playback_fps,
        "camera_angle_degrees": CAMERA_ANGLE_DEGREES,
        "camera_note": "right-facing side walk with a three-quarter reveal matching the legacy miner",
        "render_size": [RENDER_SIZE, RENDER_SIZE],
        "sampled_source_frames": sampled_frames,
        "blend_scene": str(blend_path),
    }
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"BLENDER_WALK_FRAMES_OK count={FRAME_COUNT} output={output_dir}")


if __name__ == "__main__":
    main()
