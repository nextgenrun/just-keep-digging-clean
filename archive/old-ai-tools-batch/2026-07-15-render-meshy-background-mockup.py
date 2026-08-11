"""Render one actual Meshy cave GLB as a side-view mining background mockup."""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
POC = ROOT / "visual-approval-previews/meshy-background-render-poc-v2"
REFINED_MODEL = POC / "meshy-cave-refined.glb"
PREVIEW_MODEL = POC / "meshy-cave-preview.glb"
FINAL_VIEW = "back"
VIEWPORT = (1280, 720)
ORTHO_HEIGHT = 7.1


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for blocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for block in tuple(blocks):
            if block.users == 0:
                blocks.remove(block)


def look_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def imported_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    corners = [obj.matrix_world @ Vector(corner) for obj in objects if obj.type == "MESH" for corner in obj.bound_box]
    if not corners:
        raise RuntimeError("The imported Meshy GLB contains no mesh geometry")
    return (
        Vector((min(point.x for point in corners), min(point.y for point in corners), min(point.z for point in corners))),
        Vector((max(point.x for point in corners), max(point.y for point in corners), max(point.z for point in corners))),
    )


def fallback_stone_material() -> bpy.types.Material:
    material = bpy.data.materials.new("Fallback slate for untextured Meshy preview")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    for node in tuple(nodes):
        nodes.remove(node)
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    noise = nodes.new("ShaderNodeTexNoise")
    ramp = nodes.new("ShaderNodeValToRGB")
    bump = nodes.new("ShaderNodeBump")
    noise.inputs["Scale"].default_value = 4.5
    noise.inputs["Detail"].default_value = 8.0
    noise.inputs["Roughness"].default_value = 0.72
    ramp.color_ramp.elements[0].color = (0.006, 0.012, 0.021, 1.0)
    ramp.color_ramp.elements[-1].color = (0.055, 0.105, 0.145, 1.0)
    shader.inputs["Roughness"].default_value = 0.82
    bump.inputs["Strength"].default_value = 0.24
    bump.inputs["Distance"].default_value = 0.09
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], shader.inputs["Base Color"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    return material


def has_image_texture(obj: bpy.types.Object) -> bool:
    for material in obj.data.materials:
        if material and material.use_nodes and any(node.type == "TEX_IMAGE" for node in material.node_tree.nodes):
            return True
    return False


def import_meshy_model() -> tuple[list[bpy.types.Object], Path]:
    model_path = REFINED_MODEL if REFINED_MODEL.exists() else PREVIEW_MODEL
    if not model_path.exists():
        raise FileNotFoundError(f"Missing Meshy GLB: {model_path}")
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(model_path))
    imported = [obj for obj in bpy.context.scene.objects if obj not in before]
    meshes = [obj for obj in imported if obj.type == "MESH"]
    lower, upper = imported_bounds(meshes)
    size = upper - lower
    print(f"Meshy imported bounds: x={size.x:.4f}, y={size.y:.4f}, z={size.z:.4f}")
    # Fit the full cave vertically, then widen it into the game's 16:9 backdrop
    # contract instead of cropping the generated environment into a close-up.
    scale = 3.0
    scale_x = 3.8
    root = bpy.data.objects.new("Meshy cave normalized root", None)
    bpy.context.scene.collection.objects.link(root)
    for obj in imported:
        if obj.parent not in imported:
            matrix = obj.matrix_world.copy()
            obj.parent = root
            obj.matrix_world = matrix
    root.scale = (scale_x, scale, scale)
    # Meshy's thumbnail presents the opposite Y face from Blender's initial
    # import orientation. Turn the environment so the cave mouth faces camera.
    root.rotation_euler[2] = math.pi
    bpy.context.view_layer.update()
    transformed_lower, transformed_upper = imported_bounds(meshes)
    transformed_center = (transformed_lower + transformed_upper) * 0.5
    root.location = (-transformed_center.x, -transformed_center.y, -transformed_center.z - 0.16)
    bpy.context.view_layer.update()
    if not any(has_image_texture(obj) for obj in meshes):
        fallback = fallback_stone_material()
        for obj in meshes:
            obj.data.materials.clear()
            obj.data.materials.append(fallback)
    for obj in meshes:
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    return meshes, model_path


def configure_scene() -> None:
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.resolution_x, scene.render.resolution_y = VIEWPORT
    world = bpy.data.worlds.new("Meshy cave world") if not bpy.data.worlds else bpy.data.worlds[0]
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.0015, 0.004, 0.009, 1.0)
    background.inputs["Strength"].default_value = 0.09


def add_area_light(name: str, location, energy: float, color, size: float, target) -> None:
    data = bpy.data.lights.new(name, type="AREA")
    data.energy = energy
    data.color = color
    data.shape = "DISK"
    data.size = size
    light = bpy.data.objects.new(name, data)
    light.location = location
    look_at(light, target)
    bpy.context.scene.collection.objects.link(light)


def add_lighting() -> None:
    add_area_light("Cool cave entrance", (-4.8, -5.6, 5.0), 880, (0.24, 0.48, 1.0), 5.0, (0, 0, 0))
    add_area_light("Slate rim fill", (5.4, -1.5, 2.1), 520, (0.12, 0.28, 0.60), 6.0, (0, 0, 0.4))
    add_area_light("Warm mine bounce", (-1.8, 1.0, -1.4), 145, (1.0, 0.20, 0.035), 3.0, (0, 0, -0.4))
    point_data = bpy.data.lights.new("Deep tunnel glow", type="POINT")
    point_data.energy = 80
    point_data.color = (1.0, 0.22, 0.035)
    point_data.shadow_soft_size = 2.1
    point = bpy.data.objects.new("Deep tunnel glow", point_data)
    point.location = (0, 1.2, -0.5)
    bpy.context.scene.collection.objects.link(point)


VIEW_POSITIONS = {
    "front": (0.0, -15.0, 0.15),
    "front-left": (-10.6, -10.6, 0.15),
    "front-right": (10.6, -10.6, 0.15),
    "hero-front-left": (-8.8, -10.4, 6.2),
    "hero-front-right": (8.8, -10.4, 6.2),
    "back": (0.0, 15.0, 0.15),
    "back-left": (-10.6, 10.6, 0.15),
    "back-right": (10.6, 10.6, 0.15),
    "hero-back-left": (-8.8, 10.4, 6.2),
    "hero-back-right": (8.8, 10.4, 6.2),
    "left": (-15.0, 0.0, 0.15),
    "right": (15.0, 0.0, 0.15),
}


def camera_for_view(view: str, resolution: tuple[int, int], ortho_height: float) -> bpy.types.Object:
    scene = bpy.context.scene
    data = bpy.data.cameras.new(f"{view} orthographic camera")
    camera = bpy.data.objects.new(f"{view} orthographic camera", data)
    camera.location = VIEW_POSITIONS[view]
    data.type = "ORTHO"
    data.ortho_scale = ortho_height
    look_at(camera, (0, 0, -0.1))
    scene.collection.objects.link(camera)
    scene.camera = camera
    scene.render.resolution_x, scene.render.resolution_y = resolution
    return camera


def render_view(view: str, resolution: tuple[int, int], output: Path, ortho_height: float) -> None:
    camera = camera_for_view(view, resolution, ortho_height)
    bpy.context.scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)


def main() -> None:
    POC.mkdir(parents=True, exist_ok=True)
    clear_scene()
    configure_scene()
    meshes, model_path = import_meshy_model()
    add_lighting()
    for view in VIEW_POSITIONS:
        render_view(view, (640, 360), POC / f"meshy-view-{view}.png", ORTHO_HEIGHT)
    render_view(FINAL_VIEW, VIEWPORT, POC / "meshy-cave-background-1280x720.png", ORTHO_HEIGHT)
    bpy.ops.wm.save_as_mainfile(filepath=str(POC / "meshy-cave-background-mockup.blend"))
    print(f"Rendered {len(meshes)} Meshy mesh objects from {model_path.name}")


if __name__ == "__main__":
    main()
