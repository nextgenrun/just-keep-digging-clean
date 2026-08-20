from __future__ import annotations

import importlib.util
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


V2 = load_module("survival_quality_v2", ROOT / "ai-tools/2026-08-15-render-survival-motion-locked-mesh-quality-v2.py")
V32 = load_module("survival_secondary_v32", ROOT / "ai-tools/2026-08-15-render-survival-microdetail-secondary-v3-2.py")
CONFIG = json.loads((ROOT / "values/survivalHeroQualityV4Review.json").read_text(encoding="utf-8"))


def optional_argument(name):
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    prefix = f"--{name}="
    return next((value[len(prefix):] for value in argv if value.startswith(prefix)), None)


def configure_render(scene):
    settings = CONFIG["render"]
    scene.render.engine = settings["engine"]
    scene.render.resolution_x = settings["sizePx"]
    scene.render.resolution_y = settings["sizePx"]
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = settings["colorDepth"]
    scene.render.image_settings.compression = 15
    scene.view_settings.view_transform = settings["viewTransform"]
    scene.view_settings.look = settings["look"]
    active = set(V2.CONFIG["activeLights"])
    for obj in bpy.data.objects:
        if obj.type == "LIGHT":
            obj.hide_render = obj.name not in active


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
            restored.append(image.name)
    return restored


def principled(material):
    return next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")


def set_socket(shader, name, value):
    if name in shader.inputs:
        shader.inputs[name].default_value = value


def reconstruct_pbr_material(material_name, settings):
    material = bpy.data.materials[material_name]
    tree = material.node_tree
    shader = principled(material)
    orm_node = next((node for node in tree.nodes if node.type == "TEX_IMAGE" and node.image
                     and "occlusionroughnessmetallic" in f"{node.image.name} {node.image.filepath}".lower()), None)
    if not orm_node:
        raise RuntimeError(f"{material_name}: ORM texture node missing")
    orm_node.image.colorspace_settings.name = "Non-Color"
    separate = tree.nodes.new("ShaderNodeSeparateColor")
    separate.name = "DG_V4_ORM_CHANNELS"
    separate.mode = "RGB"
    tree.links.new(orm_node.outputs["Color"], separate.inputs["Color"])
    for link in list(shader.inputs["Roughness"].links):
        tree.links.remove(link)
    for link in list(shader.inputs["Metallic"].links):
        tree.links.remove(link)
    rough_mul = tree.nodes.new("ShaderNodeMath")
    rough_mul.name = "DG_V4_ROUGHNESS_MULTIPLY"
    rough_mul.operation = "MULTIPLY"
    rough_mul.inputs[1].default_value = settings["roughnessMultiply"]
    rough_add = tree.nodes.new("ShaderNodeMath")
    rough_add.name = "DG_V4_ROUGHNESS_ADD"
    rough_add.operation = "ADD"
    rough_add.inputs[1].default_value = settings["roughnessAdd"]
    tree.links.new(separate.outputs["Green"], rough_mul.inputs[0])
    tree.links.new(rough_mul.outputs[0], rough_add.inputs[0])
    tree.links.new(rough_add.outputs[0], shader.inputs["Roughness"])
    tree.links.new(separate.outputs["Blue"], shader.inputs["Metallic"])
    base_input = shader.inputs["Base Color"]
    if base_input.links:
        base_source = base_input.links[0].from_socket
        tree.links.remove(base_input.links[0])
        ao_mix = tree.nodes.new("ShaderNodeMixRGB")
        ao_mix.name = "DG_V4_BASE_AO"
        ao_mix.blend_type = "MULTIPLY"
        ao_mix.inputs[0].default_value = settings["aoMix"]
        tree.links.new(base_source, ao_mix.inputs[1])
        tree.links.new(separate.outputs["Red"], ao_mix.inputs[2])
        tree.links.new(ao_mix.outputs[0], base_input)
    for node in tree.nodes:
        if node.type == "NORMAL_MAP":
            node.inputs["Strength"].default_value = settings["normalStrength"]
    set_socket(shader, "Coat Weight", settings.get("coatWeight", 0.0))
    set_socket(shader, "Coat Roughness", settings.get("coatRoughness", 0.3))
    set_socket(shader, "Sheen Weight", settings.get("sheenWeight", 0.0))
    return {"ormSplit": True, **settings}


def tune_special_material(material_name, settings):
    material = bpy.data.materials[material_name]
    shader = principled(material)
    sockets = {
        "roughness": "Roughness", "specularIorLevel": "Specular IOR Level",
        "anisotropic": "Anisotropic", "sheenWeight": "Sheen Weight",
        "subsurfaceWeight": "Subsurface Weight", "subsurfaceScale": "Subsurface Scale",
        "ior": "IOR", "coatWeight": "Coat Weight", "coatRoughness": "Coat Roughness",
    }
    for key, socket in sockets.items():
        if key in settings:
            set_socket(shader, socket, settings[key])
    for node in material.node_tree.nodes:
        if node.type == "NORMAL_MAP" and "normalStrength" in settings:
            node.inputs["Strength"].default_value = settings["normalStrength"]
    return settings


def main():
    selected = V2.family_id()
    family = V2.CONFIG["families"][selected]
    expected_blend = (ROOT / family["blend"]).resolve()
    if Path(bpy.data.filepath).resolve() != expected_blend:
        raise RuntimeError(f"Open configured blend first: {expected_blend}")
    scene = bpy.context.scene
    camera = bpy.data.objects[V2.CONFIG["camera"]]
    base_rig = bpy.data.objects[V2.CONFIG["rig"]]
    base_body = bpy.data.objects[V2.CONFIG["body"]]
    if "fbx" in family:
        base_body.hide_render = True
        body, rig, action = V2.import_fbx(scene, family)
    else:
        body, rig = base_body, base_rig
        action = bpy.data.actions[family["action"]].copy()
    action.name = f"DG_REVIEW_HERO_QUALITY_V4_{selected.upper()}"
    scene.camera = camera
    scene.render.fps = family["fps"]
    configure_render(scene)
    texture_report = V2.relink_textures()
    restored = restore_full_resolution_textures()
    material_report = {name: reconstruct_pbr_material(name, settings)
                       for name, settings in CONFIG["pbrMaterials"].items()}
    special_report = {name: tune_special_material(name, settings)
                      for name, settings in CONFIG["specialMaterials"].items()}
    for obj in bpy.data.objects:
        if obj.name.startswith(tuple(V2.CONFIG["hiddenPrefixes"])) or obj.name in V2.CONFIG["hiddenObjects"]:
            obj.hide_render = True
    if any(modifier.type != "ARMATURE" for modifier in body.modifiers):
        raise RuntimeError("V4 source mesh must remain armature-only")
    glove_polygons = V2.apply_full_glove_material(body)
    original_secondary = V32.QUALITY["secondaryMotion"]
    V32.QUALITY["secondaryMotion"] = CONFIG["secondaryMotion"]
    secondary = V32.add_secondary_shapes(body)
    V32.QUALITY["secondaryMotion"] = original_secondary
    rig.animation_data_create()
    rig.animation_data.action = action
    if action.slots:
        rig.animation_data.action_slot = action.slots[0]
    frozen = V2.freeze_object_translation(action) if family.get("freezeObjectTranslation") else 0
    render_count = int(family.get("renderFrameCount", family["frameCount"]))
    samples = ([family["sourceFrame"]] * render_count if "sourceFrame" in family
               else V2.sample_frames(action, family))
    requested = optional_argument("frame-index")
    indices = [int(requested)] if requested is not None else list(range(len(samples)))
    output = ROOT / CONFIG["outputRoot"] / "raw-2048" / selected
    output.mkdir(parents=True, exist_ok=True)
    if requested is None:
        for stale in output.glob("frame-*.png"):
            stale.unlink()
    root = bpy.data.objects.get(family.get("root", ""))
    base_location = root.location.copy() if root else None
    camera_basis = camera.matrix_world.to_3x3()
    camera_right = (camera_basis @ Vector((1, 0, 0))).normalized()
    camera_up = (camera_basis @ Vector((0, 1, 0))).normalized()
    for index in indices:
        V2.set_frame(scene, samples[index])
        phase = math.tau * index / len(samples)
        for motion in secondary.values():
            motion["block"].value = 0.5 + 0.5 * math.sin(phase + motion["phaseOffset"])
        if root:
            root.location = (
                base_location
                + camera_up * (math.sin(phase) * family["verticalBobWorld"])
                + camera_right * (math.sin(phase * 2) * family["horizontalDriftWorld"])
            )
        bpy.context.view_layer.update()
        scene.render.filepath = str(output / f"frame-{index:03d}.png")
        bpy.ops.render.render(write_still=True)
        print(f"SURVIVAL_HERO_V4 family={selected} frame={index + 1}/{len(samples)}", flush=True)
    if root:
        root.location = base_location
    report = {
        "version": CONFIG["version"], "reviewOnly": True, "productionChanged": False,
        "sourceBlendChanged": False, "family": selected,
        "sourceAction": family.get("action", family.get("sourceClip")),
        "renderFrameCount": render_count, "sourceFrames": samples,
        "renderedIndices": indices, "meshVertices": len(body.data.vertices),
        "meshPolygons": len(body.data.polygons), "subdivisionAdded": False,
        "motionEdits": {"bodyBones": False, "weights": False, "camera": False, "root": False,
                        "secondaryShapeKeysReviewOnly": True},
        "pbrReconstruction": material_report, "specialMaterials": special_report,
        "secondaryMotion": {name: {key: value for key, value in motion.items() if key != "block"}
                            for name, motion in secondary.items()},
        "textures": {**texture_report, "fullResolutionRestored": restored},
        "fullGlovePolygons": glove_polygons, "objectTranslationKeysFrozen": frozen,
    }
    (output / "render-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"SURVIVAL_HERO_V4_OK output={output}")


if __name__ == "__main__":
    main()
