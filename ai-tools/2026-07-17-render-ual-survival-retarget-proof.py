"""Render an approval contact sheet for UAL motion retargeted onto Survival."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_BLEND = (
    ROOT
    / "sprites"
    / "character"
    / "survival-character-fab-v1"
    / "source"
    / "survival_character.blend"
)
EXPORT_ROOT = ROOT / "testing" / "unreal-survival-motion-v2" / "SourceAssets" / "ual-exports"
PREVIEW_ROOT = ROOT / "sprites" / "character" / "survival-character-unreal-v1" / "previews"
TEMP_ROOT = Path(r"C:\tmp\ual-survival-unreal-proof-v1")
BLENDER = Path(r"C:\Program Files\Blender Foundation\Blender 5.1\blender.exe")
RENDER_SIZE = 512
CLIPS = {
    "idle": ("survival-ual-idle-loop.fbx", (0.1, 0.55, 0.9)),
    "jog": ("survival-ual-jog-fwd-loop.fbx", (0.1, 0.48, 0.82)),
    "jab": ("survival-ual-punch-jab.fbx", (0.12, 0.52, 0.86)),
    "cross": ("survival-ual-punch-cross.fbx", (0.12, 0.52, 0.86)),
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


def run_blender() -> None:
    if not BLENDER.exists():
        raise FileNotFoundError(f"Blender not found: {BLENDER}")
    if not SOURCE_BLEND.exists():
        raise FileNotFoundError(f"Approved Survival blend not found: {SOURCE_BLEND}")
    subprocess.run(
        [str(BLENDER), str(SOURCE_BLEND), "--background", "--python", str(Path(__file__).resolve())],
        cwd=ROOT,
        check=True,
    )


def build_contact_sheet() -> None:
    from PIL import Image, ImageDraw

    PREVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    labels = [(clip, index) for clip in CLIPS for index in range(3)]
    thumb_size = 256
    card = Image.new("RGB", (thumb_size * 3, 48 + thumb_size * 4), (10, 16, 23))
    draw = ImageDraw.Draw(card)
    draw.text((16, 14), "SURVIVAL BODY + APPROVED UAL MOTION / UNREAL IK RETARGET", fill=(241, 194, 105))
    for cell, (clip, frame_index) in enumerate(labels):
        source = Image.open(TEMP_ROOT / f"{clip}-{frame_index}.png").convert("RGBA")
        thumb = source.resize((thumb_size, thumb_size), Image.Resampling.LANCZOS)
        x = cell % 3 * thumb_size
        y = 48 + cell // 3 * thumb_size
        card.paste(thumb, (x, y), thumb)
        draw.rectangle((x + 8, y + 8, x + 104, y + 31), fill=(5, 9, 13))
        draw.text((x + 14, y + 13), f"{clip.upper()} {frame_index + 1}/3", fill=(233, 237, 240))
    output = PREVIEW_ROOT / "ual-survival-unreal-retarget-proof-v1.png"
    card.save(output, quality=96)
    print(f"UAL_SURVIVAL_PROOF_CARD_OK output={output}")


def blender_render() -> None:
    import bpy
    from mathutils import Vector

    scene = bpy.context.scene
    source_materials = {name: bpy.data.materials.get(name) for name in MATERIAL_ORDER}
    missing = [name for name, material in source_materials.items() if material is None]
    if missing:
        raise RuntimeError(f"Approved blend is missing materials: {missing}")

    eye_material = bpy.data.materials.new("M_UAL_Survival_Eye_Fallback")
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
            print(f"UAL_SURVIVAL_TEXTURE_SCALE_SKIPPED image={image.name}")

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = RENDER_SIZE
    scene.render.resolution_y = RENDER_SIZE
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 18
    scene.view_settings.look = "Medium High Contrast"
    scene.world.color = (0.008, 0.012, 0.018)

    camera_data = bpy.data.cameras.new("UALSurvivalProofCamera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 2.55
    camera = bpy.data.objects.new("UALSurvivalProofCamera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera

    def add_area(name, offset, energy, color, size):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.color = color
        data.shape = "DISK"
        data.size = size
        obj = bpy.data.objects.new(name, data)
        obj.location = offset
        scene.collection.objects.link(obj)
        return obj, Vector(offset)

    lights = (
        add_area("UALProofKey", (3.5, 4.0, 4.5), 850.0, (1.0, 0.74, 0.52), 4.0),
        add_area("UALProofFill", (-3.0, 2.5, 2.0), 520.0, (0.36, 0.62, 1.0), 3.0),
        add_area("UALProofRim", (-2.0, -3.0, 4.0), 720.0, (0.55, 0.78, 1.0), 2.5),
    )
    TEMP_ROOT.mkdir(parents=True, exist_ok=True)

    for clip, (filename, fractions) in CLIPS.items():
        fbx = EXPORT_ROOT / filename
        if not fbx.exists():
            raise FileNotFoundError(f"UAL-to-Survival export missing: {fbx}")
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
            raise RuntimeError(f"{clip}: exported FBX contains no assigned action")

        start, end = (float(value) for value in action.frame_range)
        for index, fraction in enumerate(fractions):
            source_frame = start + (end - start) * fraction
            scene.frame_set(int(source_frame), subframe=source_frame % 1.0)
            evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
            evaluated_mesh = evaluated.to_mesh()
            points = [evaluated.matrix_world @ vertex.co for vertex in evaluated_mesh.vertices]
            evaluated.to_mesh_clear()
            minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
            maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
            target = (minimum + maximum) * 0.5
            camera.location = target + Vector((1.85, 6.0, 0.32))
            camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
            for light, offset in lights:
                light.location = target + offset
                light.rotation_euler = (target - light.location).to_track_quat("-Z", "Y").to_euler()
            scene.render.filepath = str(TEMP_ROOT / f"{clip}-{index}.png")
            bpy.ops.render.render(write_still=True)
        for obj in imported:
            bpy.data.objects.remove(obj, do_unlink=True)


if __name__ == "__main__":
    try:
        import bpy  # noqa: F401
    except ImportError:
        run_blender()
        build_contact_sheet()
    else:
        blender_render()
