"""Render a side-view 3D-to-2D mining-world proof through Blender.

Run with Blender 5.1:

    blender.exe --background --python ai-tools/2026-07-15-render-mining-world-3d-poc.py

The output is review-only. It deliberately preserves the production contract of
94 pixels per tile and never changes Phaser collision or world data.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
POC_ROOT = ROOT / "visual-approval-previews/mining-world-3d-bake-poc-v1"
RENDER_ROOT = POC_ROOT / "renders"
SOURCE_ROOT = POC_ROOT / "sources"
METADATA_ROOT = POC_ROOT / "metadata"
TILE_SIZE_PX = 94
VIEWPORT = (1280, 720)
CAMERA_HEIGHT_UNITS = VIEWPORT[1] / TILE_SIZE_PX
SOIL_ROOT = ROOT / "sprites/tiles/dynamic-soil/bases"
DEPTH_ROOT = ROOT / "sprites/backgrounds/world-v11-runtime-polished-v4/depth-chunks"

TILE_TEXTURES = {
    "amber-soil": SOIL_ROOT / "soil-000-200-v1.webp",
    "blue-slate": SOIL_ROOT / "soil-200-400-v1.webp",
    "iron-strata": SOIL_ROOT / "soil-400-600-v1.webp",
    "blackstone": SOIL_ROOT / "soil-800-1000-v1.webp",
}


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for blocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for block in tuple(blocks):
            if block.users == 0:
                blocks.remove(block)


def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def material(
    name: str,
    dark: tuple[float, float, float, float],
    light: tuple[float, float, float, float],
    scale: float = 5.0,
    metallic: float = 0.0,
    emission: float = 0.0,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    for node in tuple(nodes):
        nodes.remove(node)
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    noise = nodes.new("ShaderNodeTexNoise")
    ramp = nodes.new("ShaderNodeValToRGB")
    bump = nodes.new("ShaderNodeBump")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 7.0
    noise.inputs["Roughness"].default_value = 0.74
    ramp.color_ramp.elements[0].color = dark
    ramp.color_ramp.elements[-1].color = light
    shader.inputs["Roughness"].default_value = 0.88
    shader.inputs["Metallic"].default_value = metallic
    bump.inputs["Strength"].default_value = 0.32
    bump.inputs["Distance"].default_value = 0.12
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], shader.inputs["Base Color"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    if emission > 0:
        shader.inputs["Emission Color"].default_value = light
        shader.inputs["Emission Strength"].default_value = emission
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    return mat


def image_material(
    name: str,
    image_path: Path,
    bump_strength: float = 0.18,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    """Turn active V11/soil art into a lit 3D surface material."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    for node in tuple(nodes):
        nodes.remove(node)
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = bpy.data.images.load(str(image_path), check_existing=True)
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = bump_strength
    bump.inputs["Distance"].default_value = 0.075
    shader.inputs["Roughness"].default_value = 0.84
    links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    links.new(texture.outputs["Color"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    if emission_strength > 0:
        links.new(texture.outputs["Color"], shader.inputs["Emission Color"])
        shader.inputs["Emission Strength"].default_value = emission_strength
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    return mat


def textured_quad(
    name: str,
    location: tuple[float, float, float],
    size: tuple[float, float],
    mat: bpy.types.Material,
) -> bpy.types.Object:
    """Create a camera-facing X/Z quad with stable full-image UVs."""
    width, height = size
    x, y, z = location
    mesh = bpy.data.meshes.new(f"{name} mesh")
    mesh.from_pydata(
        [
            (x - width / 2, y, z - height / 2),
            (x + width / 2, y, z - height / 2),
            (x + width / 2, y, z + height / 2),
            (x - width / 2, y, z + height / 2),
        ],
        [],
        [(0, 1, 2, 3)],
    )
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="UVMap")
    for loop, uv in zip(uv_layer.data, ((0, 0), (1, 0), (1, 1), (0, 1)), strict=True):
        loop.uv = uv
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def cube(name: str, location: tuple[float, float, float], size: tuple[float, float, float], mat) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, scale=tuple(value / 2 for value in size))
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new("Soft mined edge", "BEVEL")
    bevel.width = min(size) * 0.055
    bevel.segments = 3
    return obj


def rock(name: str, location, scale, mat, rng: random.Random, detailed: bool = False) -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2 if detailed else 1, radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.rotation_euler = (rng.random() * math.pi, rng.random() * math.pi, rng.random() * math.pi)
    obj.data.materials.append(mat)
    if detailed:
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        texture = bpy.data.textures.new(f"{name} weathering", type="CLOUDS")
        texture.noise_scale = 0.34
        texture.noise_depth = 2
        displacement = obj.modifiers.new("Weathered rock face", "DISPLACE")
        displacement.texture = texture
        displacement.strength = 0.22
        displacement.texture_coords = "GLOBAL"
    return obj


def line(name: str, points, mat, width: float = 0.018) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = width
    curve.bevel_resolution = 2
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, value in zip(spline.points, points, strict=True):
        point.co = (*value, 1.0)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def configure_camera(width: int, height: int, ortho_height: float, transparent: bool) -> None:
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = transparent
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.look = "AgX - Medium High Contrast"
    world = bpy.data.worlds.new("Mining proof world") if not bpy.data.worlds else bpy.data.worlds[0]
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.006, 0.010, 0.018, 1.0)
    background.inputs["Strength"].default_value = 0.2
    camera_data = bpy.data.cameras.new("Side-view orthographic camera")
    camera = bpy.data.objects.new("Side-view orthographic camera", camera_data)
    camera.location = (0.0, -14.0, 0.0)
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = ortho_height
    look_at(camera, (0.0, 0.0, 0.0))
    scene.collection.objects.link(camera)
    scene.camera = camera


def add_lighting(warm: bool = False) -> None:
    key_data = bpy.data.lights.new("Mined key", type="AREA")
    key_data.energy = 900 if warm else 720
    key_data.color = (1.0, 0.48, 0.18) if warm else (0.44, 0.67, 1.0)
    key_data.shape = "DISK"
    key_data.size = 5.0
    key = bpy.data.objects.new("Mined key", key_data)
    key.location = (-4.5, -5.0, 5.0)
    look_at(key, (0.0, 0.0, 0.0))
    bpy.context.scene.collection.objects.link(key)
    fill_data = bpy.data.lights.new("Cave fill", type="AREA")
    fill_data.energy = 440
    fill_data.color = (0.18, 0.34, 0.56)
    fill_data.size = 8.0
    fill = bpy.data.objects.new("Cave fill", fill_data)
    fill.location = (5.0, -2.0, 1.5)
    look_at(fill, (0.0, 0.5, 0.0))
    bpy.context.scene.collection.objects.link(fill)


PALETTES = {
    "amber-soil": ((0.045, 0.018, 0.006, 1), (0.34, 0.125, 0.025, 1)),
    "blue-slate": ((0.010, 0.020, 0.030, 1), (0.085, 0.15, 0.22, 1)),
    "iron-strata": ((0.035, 0.012, 0.008, 1), (0.32, 0.060, 0.025, 1)),
    "blackstone": ((0.004, 0.006, 0.010, 1), (0.040, 0.055, 0.075, 1)),
}


def build_tile(name: str, seed: int, ore: str | None = None) -> None:
    rng = random.Random(seed)
    dark, light = PALETTES[name]
    base = material(f"{name} base", dark, light, scale=7.0)
    pebble = material(f"{name} fragments", dark, tuple(min(1.0, value * 1.45) for value in light[:3]) + (1,), scale=4.0)
    backing = material(f"{name} backing", dark, dark, scale=1.0)
    cube("Tile backing", (0, 0.11, 0), (2.04, 0.12, 2.04), backing)
    cube("3D mined tile", (0, 0, 0), (1.96, 0.38, 1.96), base)
    face = image_material(f"{name} active soil face", TILE_TEXTURES[name], bump_strength=0.26)
    textured_quad("Active soil texture", (0, -0.205, 0), (1.86, 1.86), face)
    for index in range(14):
        x = rng.uniform(-0.82, 0.82)
        z = rng.uniform(-0.82, 0.82)
        size = rng.uniform(0.045, 0.13)
        rock(f"Face fragment {index:02d}", (x, -0.23, z), (size * rng.uniform(0.7, 1.5), 0.045, size), pebble, rng)
    crack_mat = material("Excavation fissure", (0.004, 0.003, 0.002, 1), (0.035, 0.015, 0.004, 1), scale=2.0)
    for branch in range(3):
        x = rng.uniform(-0.6, 0.6)
        z = rng.uniform(-0.6, 0.6)
        points = [(x, -0.285, z)]
        for _ in range(3):
            x += rng.uniform(-0.24, 0.24)
            z += rng.uniform(-0.22, 0.22)
            points.append((x, -0.285, z))
        line(f"Natural seam {branch}", points, crack_mat, 0.012)
    if ore:
        color = (0.92, 0.26, 0.045, 1) if ore == "copper" else (0.12, 0.86, 1.0, 1)
        glow = material(f"{ore} glow", tuple(value * 0.12 for value in color[:3]) + (1,), color, scale=3.0, metallic=0.4, emission=0.42)
        for branch in range(4):
            x = rng.uniform(-0.75, 0.75)
            z = rng.uniform(-0.75, 0.75)
            points = [(x, -0.305, z)]
            for _ in range(4):
                x += rng.uniform(-0.2, 0.2)
                z += rng.uniform(-0.18, 0.18)
                points.append((x, -0.305, z))
            line(f"{ore} vein {branch}", points, glow, 0.017)


def render_tiles() -> list[str]:
    specs = [
        ("amber-soil", 11, None),
        ("amber-soil", 23, "copper"),
        ("blue-slate", 31, None),
        ("blue-slate", 43, "crystal"),
        ("iron-strata", 57, None),
        ("blackstone", 71, "crystal"),
    ]
    names = []
    for index, (name, seed, ore) in enumerate(specs, start=1):
        clear_scene()
        configure_camera(512, 512, 2.08, False)
        add_lighting(warm=name in {"amber-soil", "iron-strata"})
        build_tile(name, seed, ore)
        slug = f"tile-{index:02d}-{name}{'-' + ore if ore else ''}"
        output = RENDER_ROOT / f"{slug}-512.png"
        bpy.context.scene.render.filepath = str(output)
        bpy.ops.render.render(write_still=True)
        names.append(slug)
    return names


def crystal_cluster(x: float, y: float, z: float, color, seed: int) -> None:
    rng = random.Random(seed)
    glow = material(f"Crystal {seed}", tuple(value * 0.08 for value in color[:3]) + (1,), color, scale=3.0, emission=3.2)
    for index in range(5):
        bpy.ops.mesh.primitive_cone_add(
            vertices=5,
            radius1=rng.uniform(0.08, 0.16),
            radius2=0.0,
            depth=rng.uniform(0.35, 0.72),
            location=(x + rng.uniform(-0.25, 0.25), y, z + rng.uniform(-0.10, 0.12)),
        )
        obj = bpy.context.object
        obj.name = f"Crystal shard {seed}-{index}"
        obj.rotation_euler.y = rng.uniform(-0.55, 0.55)
        obj.data.materials.append(glow)
    lamp_data = bpy.data.lights.new(f"Crystal light {seed}", type="POINT")
    lamp_data.energy = 110
    lamp_data.color = color[:3]
    lamp_data.shadow_soft_size = 1.4
    lamp = bpy.data.objects.new(f"Crystal light {seed}", lamp_data)
    lamp.location = (x, y - 0.7, z + 0.25)
    bpy.context.scene.collection.objects.link(lamp)


def build_cave(include_tiles: bool) -> None:
    rng = random.Random(20260715)
    wall = material("Receding cave strata", (0.004, 0.008, 0.014, 1), (0.035, 0.070, 0.100, 1), scale=3.2)
    near = material("Foreground slate", (0.006, 0.009, 0.012, 1), (0.08, 0.10, 0.12, 1), scale=8.5)
    warm = material("Iron seam", (0.02, 0.004, 0.002, 1), (0.22, 0.035, 0.008, 1), scale=6.0)
    cube("Deep cave wall", (0, 2.0, 0), (15.5, 0.45, 9.2), wall)
    depth_face = image_material(
        "Active V11 depth texture",
        DEPTH_ROOT / "level1-r001-c01.webp",
        bump_strength=0.14,
        emission_strength=0.22,
    )
    textured_quad("Active V11 depth backplate", (0, 1.72, 0), (15.25, 8.9), depth_face)
    for index in range(26):
        angle = math.tau * index / 26
        x = math.cos(angle) * rng.uniform(2.45, 2.95)
        z = 0.15 + math.sin(angle) * rng.uniform(1.65, 2.10)
        size = rng.uniform(0.16, 0.36)
        rock(f"Cavity rim {index:02d}", (x, 0.58, z), (size * 1.45, 0.24, size), near, rng, detailed=True)
    for index in range(34):
        x = rng.uniform(-7.2, 7.2)
        z = rng.uniform(-4.1, 4.1)
        if abs(x) < 2.9 and abs(z - 0.15) < 2.0:
            continue
        size = rng.uniform(0.14, 0.42)
        rock(f"Background fracture {index:02d}", (x, 1.38, z), (size * 1.8, 0.12, size), near if index % 3 else warm, rng, detailed=True)
    for x, z, color, seed in (
        (-4.8, -2.8, (0.10, 0.72, 1.0, 1), 1),
        (4.4, -2.5, (0.55, 0.16, 1.0, 1), 2),
        (2.7, 2.4, (1.0, 0.28, 0.04, 1), 3),
    ):
        crystal_cluster(x, 0.1, z, color, seed)
    if include_tiles:
        timber = material("Mine support timber", (0.012, 0.004, 0.001, 1), (0.13, 0.040, 0.009, 1), scale=5.0)
        cube("Left mine support", (-2.45, 0.28, -0.30), (0.15, 0.20, 3.15), timber)
        cube("Right mine support", (2.45, 0.28, -0.30), (0.15, 0.20, 3.15), timber)
        cube("Mine support lintel", (0, 0.28, 1.22), (5.02, 0.20, 0.16), timber)
        tile_materials = [material("Gameplay slate A", *PALETTES["blue-slate"], scale=7.0)]
        face_materials = [
            image_material(f"Gameplay soil face {index}", path, bump_strength=0.24)
            for index, path in enumerate(
                (
                    SOIL_ROOT / "soil-200-400-v1.webp",
                    SOIL_ROOT / "soil-200-400-v2.webp",
                    SOIL_ROOT / "soil-400-600-v1.webp",
                    SOIL_ROOT / "soil-400-600-v2.webp",
                )
            )
        ]
        copper = material("Gameplay copper vein", (0.04, 0.008, 0.002, 1), (0.95, 0.18, 0.025, 1), scale=4.0, emission=1.4)
        for row in range(8):
            for column in range(14):
                x = column - 6.5
                z = row - 3.5
                open_cell = (-3 <= x <= 3 and -1.5 <= z <= 2.5) or (-6.5 <= x < -3 and -0.5 <= z <= 0.5)
                if open_cell:
                    continue
                ore_cell = (column, row) in {(2, 2), (11, 5), (9, 1)}
                mat = copper if ore_cell else tile_materials[0]
                block = cube(f"Tile {column:02d}-{row:02d}", (x, -0.10, z), (0.96, 0.46, 0.96), mat)
                block.rotation_euler.y = rng.uniform(-0.015, 0.015)
                if not ore_cell:
                    textured_quad(
                        f"Tile face {column:02d}-{row:02d}",
                        (x, -0.342, z),
                        (0.88, 0.88),
                        face_materials[(column + row) % len(face_materials)],
                    )
                for fragment in range(2):
                    size = rng.uniform(0.035, 0.085)
                    rock(
                        f"Tile fragment {column}-{row}-{fragment}",
                        (x + rng.uniform(-0.32, 0.32), -0.36, z + rng.uniform(-0.32, 0.32)),
                        (size * 1.4, 0.025, size),
                        mat,
                        rng,
                    )


def render_cave(name: str, include_tiles: bool) -> None:
    clear_scene()
    configure_camera(*VIEWPORT, CAMERA_HEIGHT_UNITS, False)
    add_lighting(warm=False)
    build_cave(include_tiles)
    output = RENDER_ROOT / f"{name}.png"
    bpy.context.scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)


def main() -> None:
    for directory in (RENDER_ROOT, SOURCE_ROOT, METADATA_ROOT):
        directory.mkdir(parents=True, exist_ok=True)
    tiles = render_tiles()
    render_cave("cave-background-1280x720", False)
    render_cave("gameplay-bake-1280x720", True)
    blend_path = SOURCE_ROOT / "mining-world-3d-bake-poc-v1.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    manifest = {
        "version": 1,
        "status": "review-only-no-runtime-wiring",
        "generator": "ai-tools/2026-07-15-render-mining-world-3d-poc.py",
        "tileSizePx": TILE_SIZE_PX,
        "viewport": list(VIEWPORT),
        "camera": {"projection": "orthographic-front", "pixelsPerBlenderUnit": TILE_SIZE_PX},
        "tileRenders": tiles,
        "backgroundRender": "renders/cave-background-1280x720.png",
        "gameplayRender": "renders/gameplay-bake-1280x720.png",
        "sourceBlend": "sources/mining-world-3d-bake-poc-v1.blend",
        "meshyBoundary": "Geometry is locally procedural because no Meshy provider or API key was connected; replace block/rock/crystal constructors with imported Meshy GLBs without changing the camera or bake contract.",
    }
    (METADATA_ROOT / "render-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Rendered mining-world POC to {POC_ROOT}")


if __name__ == "__main__":
    main()
