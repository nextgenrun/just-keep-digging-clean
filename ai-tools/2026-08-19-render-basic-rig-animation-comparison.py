import hashlib
import importlib.util
import json
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector


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


def load_module(path_value):
    spec = importlib.util.spec_from_file_location("comparison_quality", path_value)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def clean_candidate_scene(candidate_rig, candidate_mesh):
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    candidate_rig.animation_data_clear()
    for pose_bone in candidate_rig.pose.bones:
        for constraint in list(pose_bone.constraints):
            pose_bone.constraints.remove(constraint)
        pose_bone.matrix_basis.identity()
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
        required_objects = [config["objects"]["sourceRig"], config["objects"]["sourceMesh"]]
        missing_objects = [name for name in required_objects if name not in available.objects]
        missing_actions = [name for name in action_names if name not in available.actions]
        if missing_objects or missing_actions:
            raise RuntimeError(f"Missing source data objects={missing_objects} actions={missing_actions}")
        requested.objects = required_objects
        requested.actions = action_names
    source_rig, source_mesh = requested.objects
    for obj in (source_rig, source_mesh):
        bpy.context.scene.collection.objects.link(obj)
    actions = {action.name: action for action in requested.actions}
    return source_rig, source_mesh, actions


def match_materials_and_gloves(config, source_mesh, candidate_mesh):
    if len(source_mesh.material_slots) != len(candidate_mesh.material_slots):
        raise RuntimeError("Source and candidate material slot counts differ")
    for index, candidate_slot in enumerate(candidate_mesh.material_slots):
        source_mesh.material_slots[index].material = candidate_slot.material
    quality = load_module(absolute(config["qualityScript"]))
    changed = quality.V2.apply_full_glove_material(source_mesh)
    return changed


def create_offsets(config, source_rig, source_mesh, candidate_rig):
    source_offset = bpy.data.objects.new(config["objects"]["sourceOffset"], None)
    candidate_offset = bpy.data.objects.new(config["objects"]["candidateOffset"], None)
    bpy.context.scene.collection.objects.link(source_offset)
    bpy.context.scene.collection.objects.link(candidate_offset)
    source_rig.parent = source_offset
    source_mesh.parent = source_offset
    candidate_rig.parent = candidate_offset
    source_offset.location.x = config["layout"]["sourceOffsetX"]
    candidate_offset.location.x = config["layout"]["candidateOffsetX"]
    return source_offset, candidate_offset


def add_retarget_constraints(config, source_rig, candidate_rig):
    settings = config["constraint"]
    applied = []
    for target_name, source_name in config["boneMap"].items():
        target_bone = candidate_rig.pose.bones.get(target_name)
        source_bone = source_rig.pose.bones.get(source_name)
        if target_bone is None or source_bone is None:
            raise RuntimeError(f"Retarget mapping is invalid: {target_name} <- {source_name}")
        constraint = target_bone.constraints.new(settings["type"])
        constraint.name = settings["namePrefix"] + source_name
        constraint.target = source_rig
        constraint.subtarget = source_name
        constraint.target_space = settings["targetSpace"]
        constraint.owner_space = settings["ownerSpace"]
        constraint.mix_mode = settings["mixMode"]
        constraint.influence = settings["influence"]
        applied.append({"target": target_name, "source": source_name})
    return applied


def hierarchy_depth(pose_bone):
    depth = 0
    parent = pose_bone.parent
    while parent is not None:
        depth += 1
        parent = parent.parent
    return depth


def apply_rest_world_delta(config, source_rig, candidate_rig):
    for pose_bone in candidate_rig.pose.bones:
        pose_bone.matrix_basis.identity()
    bpy.context.view_layer.update()
    mappings = sorted(
        config["boneMap"].items(),
        key=lambda item: hierarchy_depth(candidate_rig.pose.bones[item[0]]),
    )
    applied = []
    for target_name, source_name in mappings:
        target_pose = candidate_rig.pose.bones[target_name]
        target_rest = candidate_rig.data.bones[target_name]
        source_pose = source_rig.pose.bones[source_name]
        source_rest = source_rig.data.bones[source_name]
        source_pose_world = source_rig.matrix_world @ source_pose.matrix
        source_rest_world = source_rig.matrix_world @ source_rest.matrix_local
        target_rest_world = candidate_rig.matrix_world @ target_rest.matrix_local
        source_delta = source_pose_world.to_quaternion() @ source_rest_world.to_quaternion().inverted()
        desired_rotation = source_delta @ target_rest_world.to_quaternion()
        current_world = candidate_rig.matrix_world @ target_pose.matrix
        desired_world = Matrix.LocRotScale(
            current_world.translation,
            desired_rotation,
            current_world.to_scale(),
        )
        target_pose.matrix = candidate_rig.matrix_world.inverted() @ desired_world
        bpy.context.view_layer.update()
        applied.append({"target": target_name, "source": source_name})
    return applied


def configure_render(config):
    scene = bpy.context.scene
    settings = config["render"]
    scene.render.engine = settings["engine"]
    scene.render.resolution_x = settings["widthPx"]
    scene.render.resolution_y = settings["heightPx"]
    scene.render.resolution_percentage = settings["resolutionPercentage"]
    scene.render.film_transparent = settings["transparent"]
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = settings["viewTransform"]
    scene.view_settings.look = settings["look"]
    scene.view_settings.exposure = settings["exposure"]
    scene.world.use_nodes = True
    background = next(node for node in scene.world.node_tree.nodes if node.type == "BACKGROUND")
    background.inputs["Color"].default_value = (*settings["worldColor"], 1.0)
    background.inputs["Strength"].default_value = settings["worldStrength"]

    camera_data = bpy.data.cameras.new(config["objects"]["camera"] + "_Data")
    camera = bpy.data.objects.new(config["objects"]["camera"], camera_data)
    scene.collection.objects.link(camera)
    camera.location = settings["cameraLocation"]
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = settings["cameraOrthoScale"]
    point_at(camera, settings["cameraTarget"])
    scene.camera = camera

    for light_settings in settings["lights"]:
        data = bpy.data.lights.new(light_settings["name"] + "_Data", "AREA")
        data.energy = light_settings["energy"]
        data.color = light_settings["color"]
        data.shape = "DISK"
        data.size = light_settings["size"]
        light = bpy.data.objects.new(light_settings["name"], data)
        scene.collection.objects.link(light)
        light.location = light_settings["location"]
        point_at(light, settings["cameraTarget"])

    floor_material = bpy.data.materials.new(config["objects"]["floor"] + "_Material")
    floor_material.use_nodes = True
    shader = next(node for node in floor_material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = settings["floorColor"]
    shader.inputs["Roughness"].default_value = settings["floorRoughness"]
    bpy.ops.mesh.primitive_plane_add(size=config["layout"]["floorSize"], location=(0.0, 0.0, config["layout"]["floorZ"]))
    floor = bpy.context.object
    floor.name = config["objects"]["floor"]
    floor.data.materials.append(floor_material)


def action_samples(action, family):
    start, end = map(float, action.frame_range)
    count = family["frameCount"]
    denominator = count if family["loop"] else max(1, count - 1)
    return [start + (end - start) * index / denominator for index in range(count)]


def assign_action(rig, action):
    rig.animation_data_create()
    rig.animation_data.action = action
    if action.slots:
        rig.animation_data.action_slot = action.slots[0]


def render_families(config, source_rig, source_mesh, candidate_rig, candidate_mesh, actions):
    scene = bpy.context.scene
    scene.render.resolution_x = config["render"]["singleWidthPx"]
    output_root = absolute(config["outputRoot"])
    rendered = {}
    for family_name, family in config["families"].items():
        action = actions[family["action"]]
        assign_action(source_rig, action)
        scene.render.fps = family["fps"]
        samples = action_samples(action, family)
        family_root = os.path.join(output_root, family_name)
        os.makedirs(family_root, exist_ok=True)
        frame_paths = {"current": [], "candidate": []}
        for index, sample in enumerate(samples):
            whole = math.floor(sample)
            scene.frame_set(whole, subframe=sample - whole)
            bpy.context.view_layer.update()
            if config.get("retargetMode") == "REST_WORLD_DELTA":
                apply_rest_world_delta(config, source_rig, candidate_rig)
            current_root = os.path.join(family_root, "current")
            candidate_root = os.path.join(family_root, "candidate")
            os.makedirs(current_root, exist_ok=True)
            os.makedirs(candidate_root, exist_ok=True)
            current_path = os.path.join(current_root, f"frame-{index:03d}.png")
            candidate_path = os.path.join(candidate_root, f"frame-{index:03d}.png")
            source_mesh.hide_render = False
            candidate_mesh.hide_render = True
            scene.render.filepath = current_path
            bpy.ops.render.render(write_still=True)
            source_mesh.hide_render = True
            candidate_mesh.hide_render = False
            scene.render.filepath = candidate_path
            bpy.ops.render.render(write_still=True)
            frame_paths["current"].append(current_path)
            frame_paths["candidate"].append(candidate_path)
            print(f"RIG_COMPARISON_RENDER family={family_name} frame={index + 1}/{len(samples)}", flush=True)
        rendered[family_name] = {"samples": samples, "frames": frame_paths}
    return rendered


def main():
    with open(absolute(config_argument()), "r", encoding="utf-8") as handle:
        config = json.load(handle)
    source_hash = sha256(absolute(config["sourceBlend"]))
    candidate_hash = sha256(absolute(config["candidateBlend"]))
    candidate_rig = bpy.data.objects.get(config["objects"]["candidateRig"])
    candidate_mesh = bpy.data.objects.get(config["objects"]["candidateMesh"])
    if candidate_rig is None or candidate_mesh is None:
        raise RuntimeError("Soft-corrected candidate rig or mesh is missing")
    clean_candidate_scene(candidate_rig, candidate_mesh)
    source_rig, source_mesh, actions = append_source(config)
    glove_polygons = match_materials_and_gloves(config, source_mesh, candidate_mesh)
    if config.get("retargetMode") == "REST_WORLD_DELTA":
        constraints = [
            {"target": target, "source": source, "mode": "REST_WORLD_DELTA"}
            for target, source in config["boneMap"].items()
        ]
    else:
        constraints = add_retarget_constraints(config, source_rig, candidate_rig)
    configure_render(config)
    rendered = render_families(
        config,
        source_rig,
        source_mesh,
        candidate_rig,
        candidate_mesh,
        actions,
    )
    output_blend = absolute(config["outputBlend"])
    os.makedirs(os.path.dirname(output_blend), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=output_blend, check_existing=False)
    report = {
        "version": config["version"],
        "reviewOnly": config["reviewOnly"],
        "sourceBlendSha256": source_hash,
        "candidateBlendSha256": candidate_hash,
        "sourceRigBones": len(source_rig.data.bones),
        "candidateRigBones": len(candidate_rig.data.bones),
        "retargetConstraints": constraints,
        "sourceFullGlovePolygonsChanged": glove_polygons,
        "families": {name: {"samples": data["samples"], "frameCount": len(data["frames"]["current"])} for name, data in rendered.items()},
        "outputBlend": config["outputBlend"],
        "outputBlendSha256": sha256(output_blend),
        "productionChanged": False,
        "runtimeWired": False,
    }
    report_path = absolute(config["reportPath"])
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
        handle.write("\n")
    print(
        "BASIC_RIG_ANIMATION_COMPARISON_OK "
        f"source_bones={report['sourceRigBones']} candidate_bones={report['candidateRigBones']} "
        f"families={len(rendered)}"
    )


if __name__ == "__main__":
    main()
