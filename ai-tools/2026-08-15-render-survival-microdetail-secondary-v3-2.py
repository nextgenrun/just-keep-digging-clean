from __future__ import annotations

import importlib.util
import json
import math
import sys
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
V2_PATH = ROOT / "ai-tools/2026-08-15-render-survival-motion-locked-mesh-quality-v2.py"
SPEC = importlib.util.spec_from_file_location("survival_quality_v2", V2_PATH)
V2 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(V2)
QUALITY = json.loads((ROOT / "values/survivalMicrodetailSecondaryV32Review.json").read_text(encoding="utf-8"))


def restore_full_resolution_textures():
    source_root = (ROOT / V2.CONFIG["sourceTextures"]).resolve()
    cache_root = (ROOT / V2.CONFIG["textureCache"]).resolve()
    restored = []
    for image in bpy.data.images:
        current = Path(bpy.path.abspath(image.filepath)).resolve(strict=False)
        try:
            relative = current.relative_to(cache_root)
        except ValueError:
            continue
        candidate = source_root / relative
        if candidate.is_file():
            image.filepath = str(candidate)
            image.reload()
            restored.append({"image": image.name, "path": str(candidate)})
    return restored


def tune_material_microdetail():
    report = {}
    for material_name, settings in QUALITY["materials"].items():
        material = bpy.data.materials[material_name]
        tree = material.node_tree
        principled = next(node for node in tree.nodes if node.type == "BSDF_PRINCIPLED")
        changed = {}
        for node in tree.nodes:
            if node.type == "NORMAL_MAP" and "normalStrength" in settings:
                node.inputs["Strength"].default_value = settings["normalStrength"]
                changed["normalStrength"] = settings["normalStrength"]
        socket_settings = {
            "anisotropic": "Anisotropic",
            "sheenWeight": "Sheen Weight",
        }
        for key, socket_name in socket_settings.items():
            if key in settings and socket_name in principled.inputs:
                principled.inputs[socket_name].default_value = settings[key]
                changed[key] = settings[key]
        for link in tree.links:
            if link.to_node != principled or link.to_socket.name not in {"Roughness", "Metallic"}:
                continue
            if link.from_node.type == "TEX_IMAGE" and link.from_node.image:
                link.from_node.image.colorspace_settings.name = "Non-Color"
        report[material_name] = changed
    return report


def vertices_for_material(mesh, material_name):
    slot = next(index for index, value in enumerate(mesh.material_slots)
                if value.material and value.material.name == material_name)
    return sorted({vertex for polygon in mesh.data.polygons
                   if polygon.material_index == slot for vertex in polygon.vertices})


def add_secondary_shapes(mesh):
    if mesh.data.shape_keys:
        raise RuntimeError("Review lane expects a shape-key-free source mesh")
    mesh.shape_key_add(name="Basis")
    shapes = {}
    for motion_name, settings in QUALITY["secondaryMotion"].items():
        indices = vertices_for_material(mesh, settings["material"])
        zs = [mesh.data.vertices[index].co.z for index in indices]
        lower, upper = min(zs), max(zs)
        fraction = settings["lowerFraction"]
        cutoff = lower + (upper - lower) * fraction
        shape = mesh.shape_key_add(name=f"DG_REVIEW_{motion_name}")
        weighted = 0
        for index in indices:
            z = mesh.data.vertices[index].co.z
            weight = max(0.0, min(1.0, (cutoff - z) / max(1e-6, cutoff - lower)))
            if not weight:
                continue
            shape.data[index].co[settings["axis"]] += settings["amplitudeLocal"] * weight
            weighted += 1
        shapes[motion_name] = {
            "block": shape,
            "material": settings["material"],
            "vertices": len(indices),
            "weightedVertices": weighted,
            "amplitudeLocal": settings["amplitudeLocal"],
            "phaseOffset": settings["phaseOffset"],
        }
    return shapes


def main():
    selected = V2.family_id()
    if selected != "walk":
        raise RuntimeError("V3.2 approval benchmark currently renders walk only")
    family = V2.CONFIG["families"][selected]
    scene = bpy.context.scene
    camera = bpy.data.objects[V2.CONFIG["camera"]]
    rig = bpy.data.objects[V2.CONFIG["rig"]]
    body = bpy.data.objects[V2.CONFIG["body"]]
    action = bpy.data.actions[family["action"]].copy()
    action.name = "DG_REVIEW_MICRODETAIL_SECONDARY_V32_WALK"
    scene.camera = camera
    scene.render.fps = family["fps"]
    V2.configure_scene(scene)
    texture_report = V2.relink_textures()
    restored = restore_full_resolution_textures()
    material_report = tune_material_microdetail()
    for obj in bpy.data.objects:
        if obj.name.startswith(tuple(V2.CONFIG["hiddenPrefixes"])) or obj.name in V2.CONFIG["hiddenObjects"]:
            obj.hide_render = True
    if any(modifier.type != "ARMATURE" for modifier in body.modifiers):
        raise RuntimeError("V3.2 review source must remain armature-only")
    glove_polygons = V2.apply_full_glove_material(body)
    secondary = add_secondary_shapes(body)
    rig.animation_data_create()
    rig.animation_data.action = action
    if action.slots:
        rig.animation_data.action_slot = action.slots[0]
    frozen = V2.freeze_object_translation(action)
    samples = V2.sample_frames(action, family)
    output = ROOT / QUALITY["outputRoot"] / "raw-2048" / selected
    output.mkdir(parents=True, exist_ok=True)
    for stale in output.glob("frame-*.png"):
        stale.unlink()
    for index, source_frame in enumerate(samples):
        V2.set_frame(scene, source_frame)
        phase = math.tau * index / len(samples)
        for motion in secondary.values():
            motion["block"].value = 0.5 + 0.5 * math.sin(phase + motion["phaseOffset"])
        bpy.context.view_layer.update()
        scene.render.filepath = str(output / f"frame-{index:03d}.png")
        bpy.ops.render.render(write_still=True)
        print(f"SURVIVAL_MICRODETAIL_V32 family={selected} frame={index + 1}/{len(samples)}", flush=True)
    report = {
        "version": QUALITY["version"],
        "reviewOnly": True,
        "productionChanged": False,
        "family": selected,
        "sourceAction": family["action"],
        "renderFrameCount": len(samples),
        "meshVertices": len(body.data.vertices),
        "meshPolygons": len(body.data.polygons),
        "subdivisionAdded": False,
        "motionEdits": {
            "bodyBones": False,
            "weights": False,
            "camera": False,
            "root": False,
            "secondaryShapeKeysReviewOnly": True
        },
        "secondaryMotion": {
            name: {key: value for key, value in motion.items() if key != "block"}
            for name, motion in secondary.items()
        },
        "materials": material_report,
        "textures": {**texture_report, "fullResolutionRestored": restored},
        "fullGlovePolygons": glove_polygons,
        "objectTranslationKeysFrozen": frozen,
    }
    (output / "render-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"SURVIVAL_MICRODETAIL_V32_OK output={output}")


if __name__ == "__main__":
    main()
