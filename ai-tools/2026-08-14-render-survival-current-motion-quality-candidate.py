"""Render motion-locked Survival quality candidates for approval only.

The script opens protected sources read-only, applies all changes in memory, and
writes only to visual-approval-previews. It never saves a .blend or runtime file.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "visual-approval-previews/2026-08-14-survival-current-runtime-vs-full-improvements-v1/candidate-1024"
FBX_ROOT = ROOT / "testing/unreal-survival-motion-v2/SourceAssets/ual-exports"
CACHE = ROOT / "visual-approval-previews/2026-08-14-survival-global-benchmark-v1/texture-cache-2k"
SOURCE_TEXTURES = ROOT / "sprites/character/survival-character-fab-v1/source/Textures"
MATERIALS = (
    "Jacket1", "Brows_Leashes", "Hair3", "Backpack2", "Gloves1", "Mouth",
    "Head", "Body2", "Arms", "Body_Arkit:Eye", "Jeans1", "Shoes1",
)
SPECS = (
    {"id": "walk", "master": "SRC_walk", "count": 24, "fps": 30, "loop": True},
    {"id": "run", "fbx": "survival-ual-jog-fwd-loop.fbx", "count": 28, "fps": 30, "loop": True},
    {"id": "mining-side", "fbx": "survival-ual-punch-jab.fbx", "count": 15, "fps": 30, "loop": False},
    {"id": "mining-up", "master": "SRC_dig_up", "count": 24, "fps": 27, "loop": False},
    {"id": "mining-down", "fbx": "survival-ual-overhandthrow.fbx", "count": 37, "fps": 30, "loop": False},
)


def iter_action_curves(action):
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                yield from bag.fcurves


def freeze_object_translation(action):
    start = float(action.frame_range[0])
    for curve in iter_action_curves(action):
        if curve.data_path != "location":
            continue
        value = curve.evaluate(start)
        for point in curve.keyframe_points:
            point.co.y = value
            point.handle_left.y = value
            point.handle_right.y = value


def configure_scene(scene, camera):
    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 1024
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 15
    scene.world.color = (0.008, 0.012, 0.018)
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    active_lights = []
    for obj in bpy.data.objects:
        if obj.type == "LIGHT":
            obj.hide_render = not obj.name.startswith("SurvivalCinematic")
            if not obj.hide_render:
                active_lights.append(obj.name)
        if obj.name.startswith("ACC_") or obj.name == "SurvivalMinerPickaxe":
            obj.hide_render = True
    if len(active_lights) != 4:
        raise RuntimeError(f"Expected four SurvivalCinematic lights, found {active_lights}")


def relink_textures_and_repair_eye():
    normal_count = 0
    relink_count = 0
    for image in bpy.data.images:
        identity = f"{image.name} {image.filepath}".lower()
        if "normal" in identity:
            image.colorspace_settings.name = "Non-Color"
            normal_count += 1
        source = Path(bpy.path.abspath(image.filepath)).resolve(strict=False)
        try:
            relative = source.relative_to(SOURCE_TEXTURES.resolve(strict=False))
        except ValueError:
            continue
        target = CACHE / relative
        if target.is_file():
            image.filepath = str(target)
            image.reload()
            relink_count += 1
    eye_image = bpy.data.images.load(str(CACHE / "Textures/Eye/Eye_BaseColor.png"), check_existing=True)
    eye_material = bpy.data.materials.get("Body_Arkit:Eye")
    if eye_material is None or not eye_material.use_nodes:
        raise RuntimeError("Eye material is missing")
    tree = eye_material.node_tree
    principled = next((node for node in tree.nodes if node.type == "BSDF_PRINCIPLED"), None)
    image_nodes = [node for node in tree.nodes if node.type == "TEX_IMAGE"]
    if principled is None or not image_nodes:
        raise RuntimeError("Eye shader has no Principled/Image node")
    base_node = next((node for node in image_nodes if "base" in node.name.lower()), image_nodes[0])
    base_node.image = eye_image
    for name, value in (("Roughness", 0.16), ("IOR", 1.38), ("Coat Weight", 0.18), ("Coat Roughness", 0.08)):
        if name in principled.inputs:
            principled.inputs[name].default_value = value
    if not any(link.to_node == principled and link.to_socket == principled.inputs.get("Base Color") for link in tree.links):
        tree.links.new(base_node.outputs["Color"], principled.inputs["Base Color"])
    if normal_count == 0 or relink_count == 0:
        raise RuntimeError("Texture relink/normal correction did not run")
    return {"normalMaps": normal_count, "relinkedTextures": relink_count, "eyeTexture": str(eye_image.filepath)}


def material_vertices(mesh, material_name):
    slot = next((i for i, item in enumerate(mesh.material_slots) if item.material and item.material.name == material_name), None)
    if slot is None:
        return set()
    return {vertex for polygon in mesh.data.polygons if polygon.material_index == slot for vertex in polygon.vertices}


def group_vertices(mesh, tokens, threshold=0.2):
    group_ids = {group.index for group in mesh.vertex_groups if any(token in group.name.lower() for token in tokens)}
    return {
        vertex.index for vertex in mesh.data.vertices
        if sum(item.weight for item in vertex.groups if item.group in group_ids) >= threshold
    }


def clean_weights(mesh):
    targets = group_vertices(mesh, ("hand", "wrist", "lowerarm", "upperarm", "pelvis", "thigh", "finger", "thumb", "index", "middle", "ring", "pinky"), 0.05)
    changed = 0
    for index in targets:
        vertex = mesh.data.vertices[index]
        weights = sorted(((item.weight, item.group) for item in vertex.groups), reverse=True)
        keep = weights[:4]
        keep_ids = {group for _, group in keep}
        total = sum(weight for weight, _ in keep) or 1.0
        for weight, group in weights:
            vertex_group = mesh.vertex_groups[group]
            if group not in keep_ids:
                vertex_group.remove([index])
            else:
                vertex_group.add([index], weight / total, "REPLACE")
        changed += 1
    return changed


def add_corrective_shapes(mesh):
    if mesh.data.shape_keys is None:
        mesh.shape_key_add(name="Basis")
    adjacency = [set() for _ in mesh.data.vertices]
    for edge in mesh.data.edges:
        a, b = edge.vertices
        adjacency[a].add(b)
        adjacency[b].add(a)
    regions = {
        "DG_CORRECTIVE_FISTS": group_vertices(mesh, ("hand", "finger", "thumb", "index", "middle", "ring", "pinky"), 0.22),
        "DG_CORRECTIVE_WRISTS": group_vertices(mesh, ("wrist", "hand", "lowerarm"), 0.28),
        "DG_CORRECTIVE_ELBOWS": group_vertices(mesh, ("lowerarm", "upperarm"), 0.42),
        "DG_CORRECTIVE_HIPS": group_vertices(mesh, ("pelvis", "thigh"), 0.28),
        "DG_CORRECTIVE_JACKET": material_vertices(mesh, "Jacket1"),
    }
    created = {}
    basis = mesh.data.shape_keys.key_blocks["Basis"]
    for name, vertices in regions.items():
        key = mesh.shape_key_add(name=name)
        for index in vertices:
            neighbors = adjacency[index]
            if not neighbors:
                continue
            average = sum((basis.data[n].co for n in neighbors), Vector()) / len(neighbors)
            key.data[index].co = basis.data[index].co.lerp(average, 0.055)
        key.value = 0.32 if name != "DG_CORRECTIVE_JACKET" else 0.18
        created[name] = len(vertices)
    return created


def add_secondary_shapes(mesh):
    basis = mesh.data.shape_keys.key_blocks["Basis"]
    result = {}
    for name, material, amount in (("DG_SECONDARY_JACKET", "Jacket1", 0.006), ("DG_SECONDARY_BACKPACK", "Backpack2", 0.008)):
        vertices = material_vertices(mesh, material)
        key = mesh.shape_key_add(name=name)
        if vertices:
            z_values = [basis.data[index].co.z for index in vertices]
            low, high = min(z_values), max(z_values)
            span = max(0.001, high - low)
            for index in vertices:
                falloff = 1.0 - (basis.data[index].co.z - low) / span
                key.data[index].co.y += amount * falloff
        result[name] = len(vertices)
    return result


def apply_mesh_pass(mesh):
    for modifier in mesh.modifiers:
        if modifier.type == "ARMATURE":
            modifier.use_deform_preserve_volume = True
    glove_slot = next((i for i, item in enumerate(mesh.material_slots) if item.material and item.material.name == "Gloves1"), None)
    finger_vertices = group_vertices(mesh, ("finger", "thumb", "index", "middle", "ring", "pinky"), 0.5)
    glove_polygons = 0
    if glove_slot is not None:
        for polygon in mesh.data.polygons:
            if all(index in finger_vertices for index in polygon.vertices) and polygon.material_index != glove_slot:
                polygon.material_index = glove_slot
                glove_polygons += 1
    smooth = mesh.modifiers.new("DG_REVIEW_CORRECTIVE_SMOOTH", "CORRECTIVE_SMOOTH")
    smooth.factor = 0.28
    smooth.iterations = 3
    return {
        "cleanedWeightVertices": clean_weights(mesh),
        "correctiveShapes": add_corrective_shapes(mesh),
        "secondaryShapes": add_secondary_shapes(mesh),
        "fullGlovePolygons": glove_polygons,
        "preserveVolume": True,
        "correctiveSmooth": True,
    }


def sample_frames(action, count, loop):
    start, end = map(float, action.frame_range)
    denominator = count if loop else max(1, count - 1)
    return [start + (end - start) * index / denominator for index in range(count)]


def set_frame(scene, value):
    whole = math.floor(value)
    scene.frame_set(whole, subframe=value - whole)
    bpy.context.view_layer.update()


def lock_ground_and_pelvis(scene, camera, rig, neutral):
    rig.location = neutral["rig"]
    for name in ("root", "pelvis"):
        bone = rig.pose.bones.get(name)
        if bone and name in neutral:
            bone.location.x = neutral[name].x
            bone.location.y = neutral[name].y
    feet = [rig.pose.bones.get(name) for name in ("foot_l", "foot_r")]
    feet = [bone for bone in feet if bone]
    if feet:
        lowest = max(world_to_camera_view(scene, camera, rig.matrix_world @ bone.tail).y for bone in feet)
        delta = neutral["footScreenY"] - lowest
        camera_up = camera.matrix_world.to_quaternion() @ Vector((0, 1, 0))
        rig.location += camera_up * (delta * camera.data.ortho_scale)
    bpy.context.view_layer.update()


def center_camera_on_pelvis(scene, camera, rig, base_camera_location):
    camera.location = base_camera_location
    pelvis = rig.pose.bones.get("pelvis")
    if pelvis is None:
        return
    point = world_to_camera_view(scene, camera, rig.matrix_world @ pelvis.head)
    camera_right = camera.matrix_world.to_quaternion() @ Vector((1, 0, 0))
    camera.location += camera_right * ((0.5 - float(point.x)) * camera.data.ortho_scale)
    bpy.context.view_layer.update()


def render_action(scene, camera, mesh, rig, action, spec):
    action_dir = OUTPUT / spec["id"]
    action_dir.mkdir(parents=True, exist_ok=True)
    freeze_object_translation(action)
    rig.animation_data_create()
    rig.animation_data.action = action
    samples = sample_frames(action, spec["count"], spec["loop"])
    set_frame(scene, samples[0])
    feet = [rig.pose.bones.get(name) for name in ("foot_l", "foot_r")]
    feet = [bone for bone in feet if bone]
    neutral = {
        "rig": rig.location.copy(),
        **{name: rig.pose.bones[name].location.copy() for name in ("root", "pelvis") if rig.pose.bones.get(name)},
        "footScreenY": max((world_to_camera_view(scene, camera, rig.matrix_world @ bone.tail).y for bone in feet), default=0.0),
    }
    base_camera_location = camera.location.copy()
    for index, frame in enumerate(samples):
        set_frame(scene, frame)
        lock_ground_and_pelvis(scene, camera, rig, neutral)
        camera.location = base_camera_location
        phase = math.tau * index / max(1, len(samples))
        keys = mesh.data.shape_keys.key_blocks
        keys["DG_SECONDARY_JACKET"].value = 0.35 + math.sin(phase - 0.45) * 0.18
        keys["DG_SECONDARY_BACKPACK"].value = 0.28 + math.sin(phase - 0.8) * 0.14
        scene.render.filepath = str(action_dir / f"frame-{index:03d}.png")
        bpy.ops.render.render(write_still=True)
        print(f"QUALITY_CANDIDATE action={spec['id']} frame={index + 1}/{len(samples)}", flush=True)
    camera.location = base_camera_location
    return {"frames": len(samples), "fps": spec["fps"], "loop": spec["loop"], "sourceFrames": samples}


def import_fbx(scene, material_map, spec):
    before = set(scene.objects)
    bpy.ops.import_scene.fbx(filepath=str(FBX_ROOT / spec["fbx"]), automatic_bone_orientation=False)
    imported = [obj for obj in scene.objects if obj not in before]
    mesh = next(obj for obj in imported if obj.type == "MESH")
    rig = next(obj for obj in imported if obj.type == "ARMATURE")
    for index, name in enumerate(MATERIALS):
        mesh.material_slots[index].material = material_map[name]
    return mesh, rig, rig.animation_data.action, imported


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    camera = bpy.data.objects["SurvivalPolishCamera"]
    configure_scene(scene, camera)
    texture_report = relink_textures_and_repair_eye()
    base_mesh = bpy.data.objects["SurvivalPolishBody"]
    base_rig = bpy.data.objects["SurvivalPolishRig"]
    material_map = {name: bpy.data.materials[name] for name in MATERIALS}
    report = {"version": 1, "reviewOnly": True, "productionChanged": False, "renderSize": 1024, "downsamplePasses": 1, "textures": texture_report, "actions": {}}
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    requested = set()
    if "--actions" in argv:
        requested = {item.strip() for item in argv[argv.index("--actions") + 1].split(",") if item.strip()}
    specs = [spec for spec in SPECS if not requested or spec["id"] in requested]
    for spec in specs:
        imported = []
        if "master" in spec:
            base_mesh.hide_render = False
            mesh, rig, action = base_mesh, base_rig, bpy.data.actions[spec["master"]].copy()
            action.name = f"DG_REVIEW_{spec['id']}"
        else:
            base_mesh.hide_render = True
            mesh, rig, action, imported = import_fbx(scene, material_map, spec)
        mesh_report = apply_mesh_pass(mesh)
        report["actions"][spec["id"]] = {"motionSource": spec.get("master", spec.get("fbx")), "meshPass": mesh_report, **render_action(scene, camera, mesh, rig, action, spec)}
        for obj in imported:
            bpy.data.objects.remove(obj, do_unlink=True)
    (OUTPUT / "candidate-render-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"QUALITY_CANDIDATE_OK output={OUTPUT}")


if __name__ == "__main__":
    main()
