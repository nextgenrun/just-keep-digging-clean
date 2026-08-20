import hashlib
import json
import math
import os
import sys

import bpy
from mathutils import Vector


def args_after_separator():
    return sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def config_path():
    for argument in args_after_separator():
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


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def make_material(name, base_color, roughness):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*base_color, 1.0)
    material.use_nodes = True
    shader = next(node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (*base_color, 1.0)
    shader.inputs["Roughness"].default_value = roughness
    return material


def configure_render(scene, settings, output_root):
    scene.render.engine = settings["engine"]
    scene.render.resolution_x = settings["sizePx"]
    scene.render.resolution_y = settings["sizePx"]
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

    camera_data = bpy.data.cameras.new("TEST_Camera_Data")
    camera = bpy.data.objects.new("TEST_Camera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = settings["cameraLocation"]
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = settings["cameraOrthoScale"]
    point_at(camera, settings["cameraTarget"])
    scene.camera = camera

    for light_settings in settings["lights"]:
        data = bpy.data.lights.new(light_settings["name"] + "_Data", light_settings["type"])
        data.energy = light_settings["energy"]
        data.color = light_settings["color"]
        data.shape = "DISK"
        data.size = light_settings["size"]
        light = bpy.data.objects.new(light_settings["name"], data)
        scene.collection.objects.link(light)
        light.location = light_settings["location"]
        point_at(light, settings["cameraTarget"])

    floor_material = make_material("TEST_Floor_Material", (0.014, 0.018, 0.025), 0.72)
    bpy.ops.mesh.primitive_plane_add(size=settings["cameraOrthoScale"] * 2.0, location=(0.0, 0.0, -0.55))
    floor = bpy.context.object
    floor.name = "TEST_Floor"
    floor.data.materials.append(floor_material)
    os.makedirs(output_root, exist_ok=True)


def automatic_bind(mesh, rig):
    bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object and bpy.context.object.mode != "OBJECT" else None
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    bpy.context.view_layer.update()


def weight_report(mesh):
    unweighted = 0
    maximum = 0
    total_influences = 0
    for vertex in mesh.data.vertices:
        weighted = [assignment for assignment in vertex.groups if assignment.weight > 0.0001]
        if not weighted:
            unweighted += 1
        maximum = max(maximum, len(weighted))
        total_influences += len(weighted)
    return {
        "vertexGroups": len(mesh.vertex_groups),
        "unweightedVertices": unweighted,
        "maximumInfluencesPerVertex": maximum,
        "averageInfluencesPerVertex": round(total_influences / max(1, len(mesh.data.vertices)), 4),
    }


def hierarchy_report(rig):
    bones = list(rig.data.bones)
    roots = [bone.name for bone in bones if bone.parent is None]
    leaves = [bone.name for bone in bones if not bone.children]
    connected = [bone.name for bone in bones if bone.use_connect]
    return {
        "boneCount": len(bones),
        "rootCount": len(roots),
        "roots": roots,
        "leafCount": len(leaves),
        "connectedBoneCount": len(connected),
        "connectedBones": connected,
    }


def pose_and_render(scene, rig, config, output_root):
    test = config["test"]
    roles = test["roleBones"]
    missing = [name for name in roles.values() if name not in rig.pose.bones]
    if missing:
        raise RuntimeError(f"Configured test bones are missing: {missing}")
    rig.animation_data_clear()
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    scene.frame_start = test["frameStart"]
    scene.frame_end = test["frameEnd"]
    scene.render.fps = test["fps"]
    rendered = []
    for frame_text, role_rotations in test["poses"].items():
        frame = int(frame_text)
        for pose_bone in rig.pose.bones:
            pose_bone.rotation_mode = "XYZ"
            pose_bone.rotation_euler = (0.0, 0.0, 0.0)
        for role, rotation in role_rotations.items():
            rig.pose.bones[roles[role]].rotation_euler = rotation
        for pose_bone in rig.pose.bones:
            pose_bone.keyframe_insert(data_path="rotation_euler", frame=frame)
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        filepath = os.path.join(output_root, f"frame-{frame:03d}.png")
        scene.render.filepath = filepath
        bpy.ops.render.render(write_still=True)
        rendered.append(filepath)
        print(f"BASIC_RIG_TEST_RENDER frame={frame} path={filepath}", flush=True)
    if rig.animation_data and rig.animation_data.action:
        rig.animation_data.action.name = test["actionName"]
    scene.frame_set(test["frameStart"])
    return rendered


def main():
    config_file = absolute(config_path())
    with open(config_file, "r", encoding="utf-8") as handle:
        config = json.load(handle)
    source = absolute(config["sourceBlend"])
    output_root = absolute(config["outputRoot"])
    output_blend = absolute(config["outputBlend"])
    report_path = absolute(config["reportPath"])
    source_hash_before = sha256(source)

    rig = bpy.data.objects.get(config["sourceRig"])
    mesh = bpy.data.objects.get(config["sourceMesh"])
    if rig is None or rig.type != "ARMATURE" or mesh is None or mesh.type != "MESH":
        raise RuntimeError("Basic rig or clean mesh was not found")
    structural = hierarchy_report(rig)
    expected_bones = config["expected"]["sourceBoneCount"]
    if structural["boneCount"] != expected_bones:
        raise RuntimeError(f"Expected {expected_bones} bones, found {structural['boneCount']}")

    automatic_bind(mesh, rig)
    weights = weight_report(mesh)
    configure_render(bpy.context.scene, config["render"], output_root)
    rendered = pose_and_render(bpy.context.scene, rig, config, output_root)
    os.makedirs(os.path.dirname(output_blend), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=output_blend, check_existing=False)

    source_hash_after = sha256(source)
    report = {
        "version": config["version"],
        "reviewOnly": config["reviewOnly"],
        "sourceBlend": config["sourceBlend"],
        "sourceSha256Before": source_hash_before,
        "sourceSha256After": source_hash_after,
        "sourcePreserved": source_hash_before == source_hash_after,
        "outputBlend": config["outputBlend"],
        "outputSha256": sha256(output_blend),
        "hierarchy": structural,
        "weights": weights,
        "renderedFrames": [os.path.relpath(path, os.getcwd()).replace("\\", "/") for path in rendered],
        "productionRuntimeChanged": False,
        "animationsRetargeted": False,
    }
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
        handle.write("\n")
    print(
        "BASIC_RIG_DEFORMATION_TEST_OK "
        f"bones={structural['boneCount']} roots={structural['rootCount']} "
        f"groups={weights['vertexGroups']} unweighted={weights['unweightedVertices']}"
    )


if __name__ == "__main__":
    main()
