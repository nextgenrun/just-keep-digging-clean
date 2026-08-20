import copy
import hashlib
import importlib.util
import json
import math
import os
import sys

import bpy


def arguments():
    return sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def config_argument():
    for argument in arguments():
        if argument.startswith("--config="):
            return argument.split("=", 1)[1]
    raise RuntimeError("Missing required --config argument")


def absolute(path_value):
    return os.path.normpath(path_value if os.path.isabs(path_value) else os.path.join(os.getcwd(), path_value))


def sha256(path_value):
    digest = hashlib.sha256()
    with open(path_value, "rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_module(name, path_value):
    spec = importlib.util.spec_from_file_location(name, path_value)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def object_mode():
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")


def clean_scene(candidate_rig, candidate_mesh):
    object_mode()
    candidate_rig.animation_data_clear()
    keep = {candidate_rig, candidate_mesh}
    for obj in list(bpy.context.scene.objects):
        if obj not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)


def append_source(config):
    source_path = absolute(config["sourceBlend"])
    action_names = [family["action"] for family in config["families"].values()]
    with bpy.data.libraries.load(source_path, link=False) as (available, requested):
        source_name = config["objects"]["sourceRig"]
        missing = [name for name in action_names if name not in available.actions]
        if source_name not in available.objects or missing:
            raise RuntimeError(f"Source rig/actions missing rig={source_name not in available.objects} actions={missing}")
        requested.objects = [source_name]
        requested.actions = action_names
    source_rig = requested.objects[0]
    bpy.context.scene.collection.objects.link(source_rig)
    return source_rig, {action.name: action for action in requested.actions}


def hierarchy_depth(pose_bone):
    depth = 0
    parent = pose_bone.parent
    while parent is not None:
        depth += 1
        parent = parent.parent
    return depth


def prepare_retarget(config, source_rig, candidate_rig):
    mappings = []
    for target_name, source_name in config["retarget"]["boneMap"].items():
        target_pose = candidate_rig.pose.bones.get(target_name)
        source_pose = source_rig.pose.bones.get(source_name)
        if target_pose is None or source_pose is None:
            raise RuntimeError(f"Invalid retarget map: {target_name} <- {source_name}")
        for constraint in list(target_pose.constraints):
            target_pose.constraints.remove(constraint)
        mappings.append((target_name, source_name))
    return sorted(mappings, key=lambda item: hierarchy_depth(candidate_rig.pose.bones[item[0]]))


def apply_pose(config, source_rig, candidate_rig, mappings):
    for target_name, _ in mappings:
        candidate_rig.pose.bones[target_name].matrix_basis.identity()
    bpy.context.view_layer.update()
    root_name = config["retarget"]["stabilizeRootBone"]
    root_pose = source_rig.pose.bones[root_name]
    root_rest = source_rig.data.bones[root_name]
    root_displacement = root_pose.matrix.translation - root_rest.matrix_local.translation
    axes = config["retarget"]["stabilizeTranslationAxes"]
    for target_name, source_name in mappings:
        target_pose = candidate_rig.pose.bones[target_name]
        target_rest = candidate_rig.data.bones[target_name]
        source_pose = source_rig.pose.bones[source_name]
        source_rest = source_rig.data.bones[source_name]
        local_delta = source_pose.matrix @ source_rest.matrix_local.inverted()
        desired = local_delta @ target_rest.matrix_local
        translation = desired.translation.copy()
        for axis in axes:
            translation[axis] -= root_displacement[axis]
        desired.translation = translation
        target_pose.matrix = desired
        bpy.context.view_layer.update()


def evaluated_center(mesh, axis):
    evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
    corners = [evaluated.matrix_world @ __import__("mathutils").Vector(corner) for corner in evaluated.bound_box]
    return (min(corner[axis] for corner in corners) + max(corner[axis] for corner in corners)) * 0.5


def follow_character(config, mesh, base_camera, base_lights, helpers):
    axis = config["retarget"]["candidateScreenHorizontalAxis"]
    center = evaluated_center(mesh, axis)
    target = list(config["render"]["cameraTarget"])
    target[axis] = center
    camera = bpy.context.scene.camera
    location = list(base_camera)
    location[axis] += center
    camera.location = location
    helpers.point_at(camera, target)
    for settings in config["render"]["lights"]:
        light = bpy.data.objects.get(settings["name"])
        base = base_lights.get(settings["name"])
        if light is not None and base is not None:
            location = list(base)
            location[axis] += center
            light.location = location
            helpers.point_at(light, target)
    return center


def candidate_view_config(config):
    adjusted = copy.deepcopy(config)
    angle = math.radians(config["retarget"]["candidateCameraYawDegrees"])
    cosine, sine = math.cos(angle), math.sin(angle)
    def rotated(values):
        x, y, z = values
        return [cosine * x - sine * y, sine * x + cosine * y, z]
    adjusted["render"]["cameraLocation"] = rotated(config["render"]["cameraLocation"])
    adjusted["render"]["cameraTarget"] = rotated(config["render"]["cameraTarget"])
    for light in adjusted["render"]["lights"]:
        original = next(item for item in config["render"]["lights"] if item["name"] == light["name"])
        light["location"] = rotated(original["location"])
    return adjusted


def main():
    with open(absolute(config_argument()), "r", encoding="utf-8") as handle:
        config = json.load(handle)
    helpers = load_module("rigify_motion_helpers", absolute(config["comparisonScript"]))
    candidate_rig = bpy.data.objects.get(config["objects"]["generatedRig"])
    candidate_mesh = bpy.data.objects.get(config["objects"]["candidateMesh"])
    if candidate_rig is None or candidate_mesh is None:
        raise RuntimeError("Generated Rigify candidate rig or mesh is missing")
    clean_scene(candidate_rig, candidate_mesh)
    source_rig, actions = append_source(config)
    source_rig.hide_render = True
    source_rig.hide_set(True)
    if config["retarget"].get("matchSourceObjectOrientation"):
        candidate_rig.rotation_mode = "QUATERNION"
        candidate_rig.rotation_quaternion = source_rig.matrix_world.to_quaternion()
    mappings = prepare_retarget(config, source_rig, candidate_rig)
    render_config = candidate_view_config(config)
    helpers.configure_render(render_config)
    scene = bpy.context.scene
    scene.render.resolution_x = config["render"]["singleWidthPx"]
    base_camera = tuple(scene.camera.location)
    base_lights = {
        settings["name"]: tuple(bpy.data.objects[settings["name"]].location)
        for settings in render_config["render"]["lights"]
    }
    rendered = {}
    output_root = absolute(config["outputRoot"])
    for family_name, family in config["families"].items():
        action = actions[family["action"]]
        helpers.assign_action(source_rig, action)
        samples = helpers.action_samples(action, family)
        scene.render.fps = family["fps"]
        family_root = os.path.join(output_root, family_name, "candidate")
        os.makedirs(family_root, exist_ok=True)
        centers = []
        for index, sample in enumerate(samples):
            whole = math.floor(sample)
            scene.frame_set(whole, subframe=sample - whole)
            bpy.context.view_layer.update()
            apply_pose(config, source_rig, candidate_rig, mappings)
            center = follow_character(render_config, candidate_mesh, base_camera, base_lights, helpers)
            centers.append(center)
            scene.render.filepath = os.path.join(family_root, f"frame-{index:03d}.png")
            bpy.ops.render.render(write_still=True)
            print(
                f"RIGIFY_MOTION_RENDER family={family_name} frame={index + 1}/{len(samples)} center={center:.4f}",
                flush=True,
            )
        rendered[family_name] = {"samples": samples, "centerX": centers, "frameCount": len(samples)}
    output_blend = absolute(config["outputBlend"])
    os.makedirs(os.path.dirname(output_blend), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=output_blend, check_existing=False)
    report = {
        "version": config["version"],
        "reviewOnly": True,
        "candidateBlendSha256": sha256(absolute(config["candidateBlend"])),
        "sourceRigBones": len(source_rig.data.bones),
        "generatedRigBones": len(candidate_rig.data.bones),
        "retargetMode": config["retarget"]["mode"],
        "mappedBones": len(mappings),
        "families": rendered,
        "outputBlend": config["outputBlend"],
        "outputBlendSha256": sha256(output_blend),
        "productionChanged": False,
        "runtimeWired": False,
    }
    report_path = absolute(config["reportPath"])
    with open(report_path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
        handle.write("\n")
    print(
        "RIGIFY_MOTION_COMPARISON_OK "
        f"source_bones={report['sourceRigBones']} generated_bones={report['generatedRigBones']} "
        f"mapped={len(mappings)} frames={sum(item['frameCount'] for item in rendered.values())}"
    )


if __name__ == "__main__":
    main()
