"""Render material-only Survival quality without changing approved motion."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "values/survivalMeshQualityV2Review.json").read_text(encoding="utf-8"))


def family_id():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if "--family" not in args:
        raise RuntimeError("Pass --family walk or --family flight")
    selected = args[args.index("--family") + 1]
    if selected not in CONFIG["families"]:
        raise RuntimeError(f"Unknown family: {selected}")
    return selected


def iter_action_curves(action):
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                yield from bag.fcurves


def freeze_object_translation(action):
    start = float(action.frame_range[0])
    changed = 0
    for curve in iter_action_curves(action):
        if curve.data_path != "location":
            continue
        value = curve.evaluate(start)
        for point in curve.keyframe_points:
            point.co.y = value
            point.handle_left.y = value
            point.handle_right.y = value
            changed += 1
    return changed


def configure_scene(scene):
    for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    size = CONFIG["renderSizePx"]
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 15
    scene.view_settings.view_transform = CONFIG["quality"]["viewTransform"]
    scene.view_settings.look = CONFIG["quality"]["look"]
    active = set(CONFIG["activeLights"])
    for obj in bpy.data.objects:
        if obj.type == "LIGHT":
            obj.hide_render = obj.name not in active
    enabled = [obj.name for obj in bpy.data.objects if obj.type == "LIGHT" and not obj.hide_render]
    if set(enabled) != active:
        raise RuntimeError(f"Four-light contract mismatch: {enabled}")


def relink_textures():
    source_root = (ROOT / CONFIG["sourceTextures"]).resolve()
    cache_root = (ROOT / CONFIG["textureCache"]).resolve()
    normals = relinked = 0
    for image in bpy.data.images:
        identity = f"{image.name} {image.filepath}".lower()
        if "normal" in identity:
            image.colorspace_settings.name = "Non-Color"
            normals += 1
        source = Path(bpy.path.abspath(image.filepath)).resolve(strict=False)
        try:
            relative = source.relative_to(source_root)
        except ValueError:
            continue
        target = cache_root / relative
        if target.is_file():
            image.filepath = str(target)
            image.reload()
            relinked += 1
    eye_path = cache_root / "Textures/Eye/Eye_BaseColor.png"
    eye_image = bpy.data.images.load(str(eye_path), check_existing=True)
    material = bpy.data.materials.get("Body_Arkit:Eye")
    if not material or not material.use_nodes:
        raise RuntimeError("Eye material missing")
    tree = material.node_tree
    principled = next(node for node in tree.nodes if node.type == "BSDF_PRINCIPLED")
    images = [node for node in tree.nodes if node.type == "TEX_IMAGE"]
    base = next((node for node in images if "base" in node.name.lower()), images[0])
    base.image = eye_image
    values = {
        "Roughness": CONFIG["quality"]["eyeRoughness"],
        "IOR": CONFIG["quality"]["eyeIor"],
        "Coat Weight": CONFIG["quality"]["eyeCoatWeight"],
        "Coat Roughness": CONFIG["quality"]["eyeCoatRoughness"],
    }
    for name, value in values.items():
        if name in principled.inputs:
            principled.inputs[name].default_value = value
    if not any(link.to_node == principled and link.to_socket == principled.inputs.get("Base Color") for link in tree.links):
        tree.links.new(base.outputs["Color"], principled.inputs["Base Color"])
    if not normals or not relinked:
        raise RuntimeError("Texture/normal quality pass did not run")
    return {"normalMaps": normals, "relinkedTextures": relinked, "eye": str(eye_path)}


def sample_frames(action, family):
    if "sampleStart" in family and "sampleEnd" in family:
        start = float(family["sampleStart"])
        end = float(family["sampleEnd"])
        count = int(family.get("renderFrameCount", family["frameCount"]))
        denominator = max(1, count - 1)
        return [start + (end - start) * index / denominator for index in range(count)]
    start, end = map(float, action.frame_range)
    count = family["frameCount"]
    denominator = count if family["loop"] else max(1, count - 1)
    return [start + (end - start) * index / denominator for index in range(count)]


def set_frame(scene, value):
    whole = math.floor(value)
    scene.frame_set(whole, subframe=value - whole)
    bpy.context.view_layer.update()


def import_fbx(scene, family):
    before = set(scene.objects)
    path = ROOT / CONFIG["fbxRoot"] / family["fbx"]
    bpy.ops.import_scene.fbx(filepath=str(path), automatic_bone_orientation=False)
    imported = [obj for obj in scene.objects if obj not in before]
    mesh = next(obj for obj in imported if obj.type == "MESH")
    rig = next(obj for obj in imported if obj.type == "ARMATURE")
    if not rig.animation_data or not rig.animation_data.action:
        raise RuntimeError(f"Imported FBX has no action: {path}")
    material_map = {name: bpy.data.materials[name] for name in CONFIG["materials"]}
    if len(mesh.material_slots) < len(CONFIG["materials"]):
        raise RuntimeError(f"Imported material slot mismatch: {len(mesh.material_slots)}")
    for index, name in enumerate(CONFIG["materials"]):
        mesh.material_slots[index].material = material_map[name]
    return mesh, rig, rig.animation_data.action.copy()


def apply_full_glove_material(mesh):
    correction = CONFIG["gloveCorrection"]
    glove_slot = next(
        (
            index for index, slot in enumerate(mesh.material_slots)
            if slot.material and slot.material.name == correction["material"]
        ),
        None,
    )
    if glove_slot is None:
        raise RuntimeError(f"{mesh.name} has no {correction['material']} material slot")
    tokens = tuple(token.lower() for token in correction["fingerGroupTokens"])
    finger_groups = {
        group.index for group in mesh.vertex_groups
        if any(token in group.name.lower() for token in tokens)
    }
    if not finger_groups:
        raise RuntimeError(f"{mesh.name} has no finger vertex groups")
    finger_weights = []
    for vertex in mesh.data.vertices:
        finger_weights.append(sum(
            assignment.weight for assignment in vertex.groups
            if assignment.group in finger_groups
        ))
    changed = 0
    for polygon in mesh.data.polygons:
        score = min(finger_weights[index] for index in polygon.vertices)
        if score < correction["minimumVertexWeight"] or polygon.material_index == glove_slot:
            continue
        polygon.material_index = glove_slot
        changed += 1
    print(f"MOTION_LOCKED_FULL_GLOVE family_mesh={mesh.name} polygons={changed}", flush=True)
    return changed


def main():
    selected = family_id()
    family = CONFIG["families"][selected]
    expected_blend = (ROOT / family["blend"]).resolve()
    if Path(bpy.data.filepath).resolve() != expected_blend:
        raise RuntimeError(f"Open configured blend first: {expected_blend}")
    scene = bpy.context.scene
    camera = bpy.data.objects[CONFIG["camera"]]
    base_rig = bpy.data.objects[CONFIG["rig"]]
    base_body = bpy.data.objects[CONFIG["body"]]
    if "fbx" in family:
        base_body.hide_render = True
        body, rig, action = import_fbx(scene, family)
    else:
        body, rig = base_body, base_rig
        action = bpy.data.actions[family["action"]].copy()
    action.name = f"DG_MOTION_LOCKED_QUALITY_V2_{selected}"
    scene.camera = camera
    scene.render.fps = family["fps"]
    configure_scene(scene)
    texture_report = relink_textures()
    for obj in bpy.data.objects:
        if obj.name.startswith(tuple(CONFIG["hiddenPrefixes"])) or obj.name in CONFIG["hiddenObjects"]:
            obj.hide_render = True
    if any(modifier.type != "ARMATURE" for modifier in body.modifiers):
        raise RuntimeError("Geometry modifier detected; render-only contract requires armature-only mesh")
    glove_polygons = apply_full_glove_material(body)
    rig.animation_data_create()
    rig.animation_data.action = action
    if action.slots:
        rig.animation_data.action_slot = action.slots[0]
    frozen = freeze_object_translation(action) if family.get("freezeObjectTranslation") else 0
    output = ROOT / CONFIG["outputRoot"] / "raw-2048" / selected
    output.mkdir(parents=True, exist_ok=True)
    for stale_frame in output.glob("frame-*.png"):
        stale_frame.unlink()
    root = bpy.data.objects.get(family.get("root", ""))
    base_location = root.location.copy() if root else None
    camera_basis = camera.matrix_world.to_3x3()
    camera_right = (camera_basis @ Vector((1, 0, 0))).normalized()
    camera_up = (camera_basis @ Vector((0, 1, 0))).normalized()
    render_count = int(family.get("renderFrameCount", family["frameCount"]))
    samples = ([family["sourceFrame"]] * render_count if "sourceFrame" in family
               else sample_frames(action, family))
    for index, source_frame in enumerate(samples):
        set_frame(scene, source_frame)
        if root:
            phase = math.tau * index / render_count
            root.location = (
                base_location
                + camera_up * (math.sin(phase) * family["verticalBobWorld"])
                + camera_right * (math.sin(phase * 2) * family["horizontalDriftWorld"])
            )
            bpy.context.view_layer.update()
        scene.render.filepath = str(output / f"frame-{index:03d}.png")
        bpy.ops.render.render(write_still=True)
        print(f"MOTION_LOCKED_QUALITY_V2 family={selected} frame={index + 1}/{len(samples)}", flush=True)
    if root:
        root.location = base_location
    report = {
        "version": CONFIG["version"], "reviewOnly": True, "productionChanged": False,
        "family": selected, "sourceAction": family.get("action", family.get("sourceClip")),
        "sourceFrames": samples,
        "renderFrameCount": render_count,
        "meshVertices": len(body.data.vertices), "meshPolygons": len(body.data.polygons),
        "motionEdits": {"bone": False, "weights": False, "camera": False, "geometry": False},
        "materialEdits": {"fullGlovePolygons": glove_polygons},
        "objectTranslationKeysFrozen": frozen, "textures": texture_report,
    }
    (output / "render-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"MOTION_LOCKED_QUALITY_V2_OK family={selected} output={output}")


if __name__ == "__main__":
    main()
