"""Render the approved Survival Character with genuine UE5 retargeted motion."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "sprites" / "character" / "survival-character-unreal-v1"
FRAME_ROOT = ASSET_ROOT / "blender" / "frames"
RUNTIME_ROOT = ASSET_ROOT / "runtime"
PREVIEW_ROOT = ASSET_ROOT / "previews"
BLEND_PATH = ASSET_ROOT / "blender" / "survival-character-unreal-v1.blend"
SOURCE_BLEND = (
    ROOT
    / "sprites"
    / "character"
    / "survival-character-fab-v1"
    / "source"
    / "survival_character.blend"
)
EXPORT_ROOT = ROOT / "testing" / "unreal-survival-motion-v2" / "SourceAssets" / "exports"
BLENDER = Path(r"C:\Program Files\Blender Foundation\Blender 5.1\blender.exe")
FRAME_SIZE = 256
MAX_SHEET_COLUMNS = 16
CLIPS = {
    "idle": {"source": "idle", "frames": 48, "fps": 12, "loop": True},
    "walk": {"source": "walk", "frames": 24, "fps": 16, "loop": True},
    "run": {"source": "run", "frames": 28, "fps": 16, "loop": True},
    "fly": {"source": "fly", "frames": 36, "fps": 16, "loop": True},
    "attack": {"source": "attack", "frames": 18, "fps": 18, "loop": False},
    "dig-side": {"source": "mining-strike", "frames": 32, "fps": 36, "loop": False},
    "dig-up": {"source": "dig-up", "frames": 24, "fps": 27, "loop": False},
    "dig-down": {"source": "dig-down", "frames": 30, "fps": 33, "loop": False},
}
MATERIAL_ORDER = (
    "Jacket1",
    "Brows_Leashes",
    "Hair3",
    "Backpack2",
    "Gloves1",
    "Mouth",
    "Head",
    "Body2",
    "Arms",
    "Body_Arkit:Eye",
    "Jeans1",
    "Shoes1",
)


def run_blender(preview: bool) -> None:
    if not BLENDER.exists():
        raise FileNotFoundError(f"Blender not found: {BLENDER}")
    if not SOURCE_BLEND.exists():
        raise FileNotFoundError(f"Approved Survival blend not found: {SOURCE_BLEND}")
    command = [
        str(BLENDER),
        str(SOURCE_BLEND),
        "--background",
        "--python",
        str(Path(__file__).resolve()),
        "--",
    ]
    if preview:
        command.append("--preview")
    subprocess.run(command, cwd=ROOT, check=True)
    if not (FRAME_ROOT / "idle" / "000.png").exists():
        raise RuntimeError("Blender exited without rendering the Survival motion frames")


def stitch_sheets(preview: bool) -> None:
    from PIL import Image, ImageDraw
    PREVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    samples = []
    if not preview:
        RUNTIME_ROOT.mkdir(parents=True, exist_ok=True)
    manifest = {"frameWidth": FRAME_SIZE, "frameHeight": FRAME_SIZE, "clips": {}}
    for clip, config in CLIPS.items():
        count = 1 if preview else config["frames"]
        frames = [Image.open(FRAME_ROOT / clip / f"{index:03d}.png").convert("RGBA")
                  for index in range(count)]
        samples.append((clip, frames[len(frames) // 2]))
        if preview:
            continue
        columns = min(count, MAX_SHEET_COLUMNS)
        rows = (count + columns - 1) // columns
        sheet = Image.new("RGBA", (FRAME_SIZE * columns, FRAME_SIZE * rows), (0, 0, 0, 0))
        for index, frame in enumerate(frames):
            sheet.alpha_composite(frame, ((index % columns) * FRAME_SIZE,
                                          (index // columns) * FRAME_SIZE))
        filename = f"survival-character-unreal-v1-{clip}-sheet.png"
        sheet.save(RUNTIME_ROOT / filename, optimize=True)
        manifest["clips"][clip] = {
            "file": filename,
            "frames": count,
            "columns": columns,
            "rows": rows,
            "fps": config["fps"],
            "loop": config["loop"],
            "motionAuthority": "Unreal Engine 5.8 IK Retargeter",
        }

    card = Image.new("RGB", (FRAME_SIZE * 4, FRAME_SIZE * 2), (13, 20, 25))
    draw = ImageDraw.Draw(card)
    for index, (clip, sample) in enumerate(samples):
        x = index % 4 * FRAME_SIZE
        y = index // 4 * FRAME_SIZE
        card.paste(sample, (x, y), sample)
        draw.rectangle((x + 6, y + 6, x + 122, y + 29), fill=(5, 9, 12))
        draw.text((x + 12, y + 11), clip.upper(), fill=(244, 196, 103))
    suffix = "preview" if preview else "motion"
    card.save(PREVIEW_ROOT / f"survival-character-unreal-v1-{suffix}-contact-sheet.png", quality=95)
    if not preview:
        (ASSET_ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        shutil.rmtree(FRAME_ROOT, ignore_errors=True)


def blender_render(preview: bool) -> None:
    import bpy
    from mathutils import Vector

    scene = bpy.context.scene
    source_materials = {name: bpy.data.materials.get(name) for name in MATERIAL_ORDER}
    missing = [name for name, material in source_materials.items() if material is None]
    if missing:
        raise RuntimeError(f"Approved blend is missing materials: {missing}")
    eye_material = bpy.data.materials.new("M_Survival_Eye_Fallback")
    eye_material.use_nodes = True
    eye_bsdf = eye_material.node_tree.nodes.get("Principled BSDF")
    eye_bsdf.inputs["Base Color"].default_value = (0.035, 0.012, 0.006, 1.0)
    eye_bsdf.inputs["Roughness"].default_value = 0.18
    source_materials["Body_Arkit:Eye"] = eye_material
    for image in bpy.data.images:
        width, height = image.size
        if width <= 0 or height <= 0 or max(width, height) <= 2048:
            continue
        ratio = 2048 / max(width, height)
        try:
            image.scale(max(1, round(width * ratio)), max(1, round(height * ratio)))
        except Exception:
            print(f"SURVIVAL_TEXTURE_SCALE_SKIPPED image={image.name} size={width}x{height}")

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = FRAME_SIZE
    scene.render.resolution_y = FRAME_SIZE
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 20
    scene.render.fps = 30
    scene.view_settings.look = "Medium High Contrast"
    scene.world.color = (0.008, 0.012, 0.018)

    camera_data = bpy.data.cameras.new("SurvivalMotionCamera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 2.55
    camera = bpy.data.objects.new("SurvivalMotionCamera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera

    def add_area(name: str, offset: tuple[float, float, float], energy: float, color: tuple[float, float, float], size: float):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.color = color
        data.shape = "DISK"
        data.size = size
        obj = bpy.data.objects.new(name, data)
        obj.location = offset
        scene.collection.objects.link(obj)
        obj.rotation_euler = (Vector((0.0, 0.0, 0.95)) - obj.location).to_track_quat("-Z", "Y").to_euler()
        return obj, Vector(offset)

    lights = (
        add_area("Key", (3.5, 4.0, 4.5), 850.0, (1.0, 0.74, 0.52), 4.0),
        add_area("Fill", (-3.0, 2.5, 2.0), 520.0, (0.36, 0.62, 1.0), 3.0),
        add_area("Rim", (-2.0, -3.0, 4.0), 720.0, (0.55, 0.78, 1.0), 2.5),
    )
    persistent = set(scene.objects)

    shaft_material = bpy.data.materials.new("M_Survival_Pickaxe_Shaft")
    shaft_material.use_nodes = True
    shaft_bsdf = shaft_material.node_tree.nodes.get("Principled BSDF")
    shaft_bsdf.inputs["Base Color"].default_value = (0.26, 0.075, 0.018, 1.0)
    shaft_bsdf.inputs["Roughness"].default_value = 0.48
    head_material = bpy.data.materials.new("M_Survival_Pickaxe_Head")
    head_material.use_nodes = True
    head_bsdf = head_material.node_tree.nodes.get("Principled BSDF")
    head_bsdf.inputs["Base Color"].default_value = (0.16, 0.22, 0.28, 1.0)
    head_bsdf.inputs["Metallic"].default_value = 0.82
    head_bsdf.inputs["Roughness"].default_value = 0.24

    def add_pickaxe(armature):
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.026, depth=1.28, location=(0, 0, 0.08))
        shaft = bpy.context.object
        shaft.name = "SurvivalPickaxe"
        shaft.data.materials.append(shaft_material)
        bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.105, radius2=0.022, depth=0.44, location=(0.22, 0, 0.7), rotation=(0, 1.5708, 0))
        head_right = bpy.context.object
        head_right.data.materials.append(head_material)
        bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.105, radius2=0.04, depth=0.4, location=(-0.2, 0, 0.7), rotation=(0, -1.5708, 0))
        head_left = bpy.context.object
        head_left.data.materials.append(head_material)
        bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0.7), scale=(0.075, 0.07, 0.07))
        head_core = bpy.context.object
        head_core.data.materials.append(head_material)
        bpy.ops.object.select_all(action="DESELECT")
        shaft.select_set(True)
        head_right.select_set(True)
        head_left.select_set(True)
        head_core.select_set(True)
        bpy.context.view_layer.objects.active = shaft
        bpy.ops.object.join()
        shaft.parent = armature
        shaft.parent_type = "BONE"
        shaft.parent_bone = "hand_r"
        shaft.location = (0.02, 0.0, -0.02)
        shaft.rotation_euler = (1.5708, 0.0, 1.5708)
        # Unreal's FBX carrier armature imports at 0.01 object scale.
        shaft.scale = (100.0, 100.0, 100.0)
        return shaft

    for clip, config in CLIPS.items():
        fbx = EXPORT_ROOT / f"survival-{config['source']}-retargeted.fbx"
        if not fbx.exists():
            raise RuntimeError(f"Unreal motion carrier missing: {fbx}")
        before = set(scene.objects)
        bpy.ops.import_scene.fbx(filepath=str(fbx), automatic_bone_orientation=False)
        imported = [obj for obj in scene.objects if obj not in before]
        meshes = [obj for obj in imported if obj.type == "MESH"]
        armatures = [obj for obj in imported if obj.type == "ARMATURE"]
        if len(meshes) != 1 or len(armatures) != 1:
            raise RuntimeError(f"{clip}: expected one mesh/armature, found {len(meshes)}/{len(armatures)}")
        mesh, armature = meshes[0], armatures[0]
        if len(mesh.material_slots) != len(MATERIAL_ORDER):
            raise RuntimeError(f"{clip}: expected 12 material slots, found {len(mesh.material_slots)}")
        for index, name in enumerate(MATERIAL_ORDER):
            mesh.material_slots[index].material = source_materials[name]
        action = armature.animation_data.action if armature.animation_data else None
        if action is None:
            raise RuntimeError(f"{clip}: FBX contains no assigned Unreal action")
        tool = add_pickaxe(armature) if clip in {"attack", "dig-side", "dig-up", "dig-down"} else None
        start, end = (float(value) for value in action.frame_range)
        count = 1 if preview else config["frames"]
        clip_dir = FRAME_ROOT / clip
        clip_dir.mkdir(parents=True, exist_ok=True)
        for old in clip_dir.glob("*.png"):
            old.unlink()
        for index in range(count):
            fraction = 0.55 if preview else index / (count if config["loop"] else max(1, count - 1))
            source_frame = start + (end - start) * fraction
            scene.frame_set(int(source_frame), subframe=source_frame % 1.0)
            evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
            evaluated_mesh = evaluated.to_mesh()
            points = [evaluated.matrix_world @ vertex.co for vertex in evaluated_mesh.vertices]
            evaluated.to_mesh_clear()
            if tool:
                points.extend(tool.matrix_world @ Vector(corner) for corner in tool.bound_box)
            minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
            maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
            target = (minimum + maximum) * 0.5
            camera.location = target + Vector((1.85, 6.0, 0.32))
            camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
            for light, offset in lights:
                light.location = target + offset
                light.rotation_euler = (target - light.location).to_track_quat("-Z", "Y").to_euler()
            if preview and tool:
                tool_points = [tool.matrix_world @ Vector(corner) for corner in tool.bound_box]
                tool_min = tuple(round(min(point[axis] for point in tool_points), 3) for axis in range(3))
                tool_max = tuple(round(max(point[axis] for point in tool_points), 3) for axis in range(3))
                print(f"SURVIVAL_TOOL_BOUNDS clip={clip} min={tool_min} max={tool_max} target={tuple(round(v, 3) for v in target)}")
            scene.render.filepath = str(clip_dir / f"{index:03d}.png")
            bpy.ops.render.render(write_still=True)
        for obj in imported + ([tool] if tool else []):
            if obj and obj.name in scene.objects:
                bpy.data.objects.remove(obj, do_unlink=True)

    if not preview:
        BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))


if __name__ == "__main__":
    preview_mode = "--preview" in sys.argv
    try:
        import bpy  # noqa: F401
    except ImportError:
        run_blender(preview_mode)
        stitch_sheets(preview_mode)
        print(f"Built Survival Unreal motion assets in {ASSET_ROOT}")
    else:
        blender_render(preview_mode)
