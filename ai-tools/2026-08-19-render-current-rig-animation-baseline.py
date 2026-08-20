import importlib.util
import copy
import json
import math
import os
import sys

import bpy
from mathutils import Vector


def arguments():
    return sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def config_argument():
    for argument in arguments():
        if argument.startswith("--config="):
            return argument.split("=", 1)[1]
    raise RuntimeError("Missing required --config argument")


def absolute(path_value):
    return os.path.normpath(path_value if os.path.isabs(path_value) else os.path.join(os.getcwd(), path_value))


def load_module(name, path_value):
    spec = importlib.util.spec_from_file_location(name, path_value)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def apply_v4_quality(config, mesh):
    quality = load_module("current_baseline_quality", absolute(config["qualityScript"]))
    quality.V2.relink_textures()
    quality.restore_full_resolution_textures()
    for material_name, settings in quality.CONFIG["pbrMaterials"].items():
        quality.reconstruct_pbr_material(material_name, settings)
    for material_name, settings in quality.CONFIG["specialMaterials"].items():
        quality.tune_special_material(material_name, settings)
    return quality.V2.apply_full_glove_material(mesh)


def clean_scene(rig, mesh):
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    for obj in list(bpy.context.scene.objects):
        if obj not in {rig, mesh}:
            bpy.data.objects.remove(obj, do_unlink=True)


def source_scale_config(config):
    scaled = copy.deepcopy(config)
    factor = config["layout"]["sourceWorldScale"]
    render = scaled["render"]
    render["cameraLocation"] = [value * factor for value in render["cameraLocation"]]
    render["cameraTarget"] = [value * factor for value in render["cameraTarget"]]
    render["cameraOrthoScale"] *= factor
    scaled["layout"]["floorZ"] *= factor
    scaled["layout"]["floorSize"] *= factor
    for light in render["lights"]:
        light["location"] = [value * factor for value in light["location"]]
        light["size"] *= factor
        light["energy"] *= factor * factor
    return scaled


def evaluated_center_x(mesh):
    evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
    corners = [evaluated.matrix_world @ Vector(corner) for corner in evaluated.bound_box]
    return (min(corner.x for corner in corners) + max(corner.x for corner in corners)) * 0.5


def follow_character_x(config, mesh, base_camera_location, base_light_locations):
    center_x = evaluated_center_x(mesh)
    target = list(config["render"]["cameraTarget"])
    target[0] = center_x
    camera = bpy.context.scene.camera
    camera.location = (center_x + base_camera_location[0], base_camera_location[1], base_camera_location[2])
    comparison = load_module(
        "current_baseline_camera_helpers",
        absolute(config["comparisonScript"]),
    )
    comparison.point_at(camera, target)
    for light_settings in config["render"]["lights"]:
        light = bpy.data.objects.get(light_settings["name"])
        if light is None:
            continue
        base = base_light_locations[light_settings["name"]]
        light.location = (center_x + base[0], base[1], base[2])
        comparison.point_at(light, target)
    return center_x


def main():
    with open(absolute(config_argument()), "r", encoding="utf-8") as handle:
        config = json.load(handle)
    comparison = load_module(
        "current_baseline_comparison",
        absolute(config["comparisonScript"]),
    )
    rig = bpy.data.objects.get(config["objects"]["sourceRig"])
    mesh = bpy.data.objects.get(config["objects"]["sourceMesh"])
    if rig is None or mesh is None:
        raise RuntimeError("Current production rig or mesh was not found")
    glove_polygons = apply_v4_quality(config, mesh)
    clean_scene(rig, mesh)
    baseline_config = source_scale_config(config)
    comparison.configure_render(baseline_config)
    scene = bpy.context.scene
    scene.render.resolution_x = config["render"]["singleWidthPx"]
    base_camera_location = tuple(scene.camera.location)
    base_light_locations = {
        settings["name"]: tuple(bpy.data.objects[settings["name"]].location)
        for settings in baseline_config["render"]["lights"]
    }
    output_root = absolute(config["outputRoot"])
    rendered = {}
    for family_name, family in config["families"].items():
        action = bpy.data.actions.get(family["action"])
        if action is None:
            raise RuntimeError(f"Current action is missing: {family['action']}")
        comparison.assign_action(rig, action)
        scene.render.fps = family["fps"]
        samples = comparison.action_samples(action, family)
        family_root = os.path.join(output_root, family_name, "current")
        os.makedirs(family_root, exist_ok=True)
        for index, sample in enumerate(samples):
            whole = math.floor(sample)
            scene.frame_set(whole, subframe=sample - whole)
            bpy.context.view_layer.update()
            center_x = follow_character_x(
                baseline_config,
                mesh,
                base_camera_location,
                base_light_locations,
            )
            path = os.path.join(family_root, f"frame-{index:03d}.png")
            scene.render.filepath = path
            bpy.ops.render.render(write_still=True)
            print(
                f"CURRENT_RIG_BASELINE_RENDER family={family_name} "
                f"frame={index + 1}/{len(samples)} center_x={center_x:.4f}",
                flush=True,
            )
        rendered[family_name] = len(samples)
    print(
        "CURRENT_RIG_ANIMATION_BASELINE_OK "
        f"bones={len(rig.data.bones)} glove_polygons={glove_polygons} families={len(rendered)}"
    )


if __name__ == "__main__":
    main()
