"""Render real material-quality changes over the motion-locked V2.1 source."""

from __future__ import annotations

import importlib.util
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
QUALITY = json.loads((ROOT / "values/survivalMaterialQualityV31Review.json").read_text(encoding="utf-8"))
spec = importlib.util.spec_from_file_location(
    "motion_locked_v2", ROOT / "ai-tools/2026-08-15-render-survival-motion-locked-mesh-quality-v2.py"
)
V2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(V2)
CONFIG = V2.CONFIG


def set_input(principled, name, value):
    if name in principled.inputs:
        principled.inputs[name].default_value = value


def tune_roughness(material, principled, settings):
    socket = principled.inputs.get("Roughness")
    if not socket:
        return "missing"
    if socket.is_linked and "roughnessMultiplier" in settings:
        link = next(link for link in material.node_tree.links if link.to_socket == socket)
        source_socket = link.from_socket
        material.node_tree.links.remove(link)
        multiply = material.node_tree.nodes.new("ShaderNodeMath")
        multiply.name = "DG_V31_ROUGHNESS_MULTIPLY"
        multiply.operation = "MULTIPLY"
        multiply.inputs[1].default_value = settings["roughnessMultiplier"]
        material.node_tree.links.new(source_socket, multiply.inputs[0])
        material.node_tree.links.new(multiply.outputs[0], socket)
        return f"linked*{settings['roughnessMultiplier']}"
    if "roughness" in settings:
        socket.default_value = settings["roughness"]
        return settings["roughness"]
    return "unchanged"


def tune_base_color(material, principled, settings):
    scale = settings.get("baseColorScale")
    socket = principled.inputs.get("Base Color")
    if scale is None or not socket:
        return "unchanged"
    if socket.is_linked:
        link = next(link for link in material.node_tree.links if link.to_socket == socket)
        source_socket = link.from_socket
        material.node_tree.links.remove(link)
        multiply = material.node_tree.nodes.new("ShaderNodeMixRGB")
        multiply.name = "DG_V31_BASE_COLOR_MULTIPLY"
        multiply.blend_type = "MULTIPLY"
        multiply.inputs[0].default_value = 1.0
        multiply.inputs[2].default_value = (scale, scale, scale, 1.0)
        material.node_tree.links.new(source_socket, multiply.inputs[1])
        material.node_tree.links.new(multiply.outputs[0], socket)
        return f"linked*{scale}"
    value = socket.default_value
    socket.default_value = (value[0] * scale, value[1] * scale, value[2] * scale, value[3])
    return f"default*{scale}"


def correct_data_map_spaces(material, principled):
    corrected = []
    for socket_name in ("Roughness", "Metallic"):
        socket = principled.inputs.get(socket_name)
        if not socket or not socket.is_linked:
            continue
        link = next(link for link in material.node_tree.links if link.to_socket == socket)
        image = getattr(link.from_node, "image", None)
        if image:
            image.colorspace_settings.name = "Non-Color"
            corrected.append({"socket": socket_name, "image": image.name})
    return corrected


def restore_full_resolution_textures():
    cache_root = (ROOT / CONFIG["textureCache"]).resolve()
    source_root = (ROOT / CONFIG["sourceTextures"]).resolve()
    restored = []
    for image in bpy.data.images:
        current = Path(bpy.path.abspath(image.filepath)).resolve(strict=False)
        try:
            relative = current.relative_to(cache_root)
        except ValueError:
            continue
        target = source_root / relative
        if not target.is_file():
            continue
        image.filepath = str(target)
        image.reload()
        restored.append(image.name)
    if not restored:
        raise RuntimeError("No full-resolution source textures were restored")
    return restored


def tune_materials():
    report = {}
    socket_map = {
        "coatWeight": "Coat Weight", "coatRoughness": "Coat Roughness",
        "specularIorLevel": "Specular IOR Level", "anisotropic": "Anisotropic",
        "sheenWeight": "Sheen Weight", "sheenRoughness": "Sheen Roughness",
        "subsurfaceWeight": "Subsurface Weight", "subsurfaceScale": "Subsurface Scale",
    }
    for name, settings in QUALITY["materials"].items():
        material = bpy.data.materials[name]
        principled = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
        data_maps = correct_data_map_spaces(material, principled)
        base_color = tune_base_color(material, principled, settings)
        roughness = tune_roughness(material, principled, settings)
        for key, socket in socket_map.items():
            if key in settings:
                set_input(principled, socket, settings[key])
        normals = [node for node in material.node_tree.nodes if node.type == "NORMAL_MAP"]
        for node in normals:
            node.inputs["Strength"].default_value = settings["normalStrength"]
        report[name] = {
            "baseColor": base_color, "roughness": roughness,
            "normalStrength": settings["normalStrength"],
            "nonColorDataMaps": data_maps,
            "surfaceSettings": {key: settings[key] for key in socket_map if key in settings},
        }
    return report


def main():
    selected = V2.family_id()
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
        body, rig, action = V2.import_fbx(scene, family)
    else:
        body, rig = base_body, base_rig
        action = bpy.data.actions[family["action"]].copy()
    scene.camera = camera
    scene.render.fps = family["fps"]
    V2.configure_scene(scene)
    texture_report = V2.relink_textures()
    texture_report["fullResolutionRestored"] = restore_full_resolution_textures()
    glove_polygons = V2.apply_full_glove_material(body)
    material_report = tune_materials()
    for obj in bpy.data.objects:
        if obj.name.startswith(tuple(CONFIG["hiddenPrefixes"])) or obj.name in CONFIG["hiddenObjects"]:
            obj.hide_render = True
    if any(modifier.type != "ARMATURE" for modifier in body.modifiers):
        raise RuntimeError("V3.1 material lane cannot add geometry modifiers")
    rig.animation_data_create()
    rig.animation_data.action = action
    if action.slots:
        rig.animation_data.action_slot = action.slots[0]
    frozen = V2.freeze_object_translation(action) if family.get("freezeObjectTranslation") else 0
    output = ROOT / QUALITY["outputRoot"] / "raw-2048" / selected
    output.mkdir(parents=True, exist_ok=True)
    for stale in output.glob("frame-*.png"):
        stale.unlink()
    root = bpy.data.objects.get(family.get("root", ""))
    base_location = root.location.copy() if root else None
    basis = camera.matrix_world.to_3x3()
    right = (basis @ Vector((1, 0, 0))).normalized()
    up = (basis @ Vector((0, 1, 0))).normalized()
    count = int(family.get("renderFrameCount", family["frameCount"]))
    samples = ([family["sourceFrame"]] * count if "sourceFrame" in family else V2.sample_frames(action, family))
    for index, source_frame in enumerate(samples):
        V2.set_frame(scene, source_frame)
        if root:
            phase = math.tau * index / count
            root.location = (
                base_location + up * (math.sin(phase) * family["verticalBobWorld"])
                + right * (math.sin(phase * 2) * family["horizontalDriftWorld"])
            )
            bpy.context.view_layer.update()
        scene.render.filepath = str(output / f"frame-{index:03d}.png")
        bpy.ops.render.render(write_still=True)
        print(f"SURVIVAL_MATERIAL_V31 family={selected} frame={index + 1}/{len(samples)}", flush=True)
    report = {
        "version": QUALITY["version"], "reviewOnly": True, "productionChanged": False,
        "family": selected, "sourceFrames": samples,
        "meshVertices": len(body.data.vertices), "meshPolygons": len(body.data.polygons),
        "motionEdits": {"bone": False, "weights": False, "camera": False, "geometry": False},
        "secondaryMotion": False, "fullGlovePolygons": glove_polygons,
        "objectTranslationKeysFrozen": frozen, "textures": texture_report,
        "materials": material_report,
    }
    (output / "render-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"SURVIVAL_MATERIAL_V31_OK family={selected} output={output}")


if __name__ == "__main__":
    main()
