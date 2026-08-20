"""Build an isolated, editable Rigify Human metarig workbook for the Survival mesh."""

import hashlib
import importlib.util
import json
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


def sha256(path_value):
    digest = hashlib.sha256()
    with open(path_value, "rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_module(path_value):
    spec = importlib.util.spec_from_file_location("rigify_workbook_manual_helpers", path_value)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def vector_bounds(points):
    minimum = Vector(tuple(min(point[index] for point in points) for index in range(3)))
    maximum = Vector(tuple(max(point[index] for point in points) for index in range(3)))
    return minimum, maximum


def clean_scene(scene, work_mesh):
    for other_scene in list(bpy.data.scenes):
        if other_scene != scene:
            bpy.data.scenes.remove(other_scene)
    for child in list(scene.collection.children):
        scene.collection.children.unlink(child)
    for existing_object in list(bpy.data.objects):
        if existing_object != work_mesh:
            bpy.data.objects.remove(existing_object, do_unlink=True)


def clean_mesh(config, mesh):
    mesh.name = config["workbook"]["meshObject"]
    mesh.data.name = mesh.name + "_MeshData"
    mesh.parent = None
    mesh.animation_data_clear()
    mesh.constraints.clear()
    for modifier in list(mesh.modifiers):
        mesh.modifiers.remove(modifier)
    if mesh.data.shape_keys is not None:
        bpy.context.view_layer.objects.active = mesh
        mesh.select_set(True)
        while mesh.data.shape_keys and mesh.data.shape_keys.key_blocks:
            mesh.shape_key_remove(mesh.data.shape_keys.key_blocks[-1])
    mesh.vertex_groups.clear()
    mesh["review_only"] = config["reviewOnly"]
    mesh["rig_state"] = "unweighted_rigify_metarig_fit"
    mesh["latest_visual_quality"] = "hero_v4_full_resolution_full_glove"
    mesh["keep_object_transforms"] = True


def create_metarig(config, collection):
    workbook = config["workbook"]
    bpy.ops.preferences.addon_enable(module=workbook["rigifyAddonModule"])
    operator = getattr(bpy.ops.object, workbook["rigifyPresetOperator"])
    result = operator()
    if "FINISHED" not in result:
        raise RuntimeError(f"Rigify Human operator failed: {result}")
    metarig = bpy.context.object
    metarig.name = workbook["metarigObject"]
    metarig.data.name = workbook["metarigData"]
    for owner in list(metarig.users_collection):
        owner.objects.unlink(metarig)
    collection.objects.link(metarig)
    metarig.data.display_type = workbook["armatureDisplayType"]
    metarig.data.axes_position = workbook["armatureDisplaySize"]
    metarig.data.use_mirror_x = workbook["mirrorX"]
    metarig.show_in_front = workbook["showArmatureInFront"]
    metarig["review_only"] = config["reviewOnly"]
    metarig["rig_state"] = "editable_rigify_human_metarig"
    metarig["animation_attachment_allowed"] = False
    return metarig


def fit_metarig(config, mesh, metarig):
    mesh_points = [mesh.matrix_world @ Vector(corner) for corner in mesh.bound_box]
    mesh_min, mesh_max = vector_bounds(mesh_points)
    mesh_extent = mesh_max - mesh_min
    bone_points = [point.copy() for bone in metarig.data.bones for point in (bone.head_local, bone.tail_local)]
    rig_min, rig_max = vector_bounds(bone_points)
    rig_extent = rig_max - rig_min
    ratios = Vector(config["fit"]["targetExtentRatios"])
    scales = Vector(tuple(mesh_extent[index] * ratios[index] / rig_extent[index] for index in range(3)))
    metarig.scale = scales
    bpy.context.view_layer.objects.active = metarig
    metarig.select_set(True)
    if config["fit"]["applyObjectTransforms"]:
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bone_points = [point.copy() for bone in metarig.data.bones for point in (bone.head_local, bone.tail_local)]
    fitted_min, fitted_max = vector_bounds(bone_points)
    fitted_center = (fitted_min + fitted_max) * 0.5
    mesh_center = (mesh_min + mesh_max) * 0.5 + Vector(config["fit"]["meshCenterOffset"])
    metarig.location = (
        mesh_center.x - fitted_center.x,
        mesh_center.y - fitted_center.y,
        mesh_min.z + config["fit"]["groundClearance"] - fitted_min.z,
    )
    if config["fit"]["applyObjectTransforms"]:
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    final_points = [point.copy() for bone in metarig.data.bones for point in (bone.head_local, bone.tail_local)]
    final_min, final_max = vector_bounds(final_points)
    return {
        "meshMinimum": list(mesh_min),
        "meshMaximum": list(mesh_max),
        "metarigMinimum": list(final_min),
        "metarigMaximum": list(final_max),
        "axisScaleApplied": list(scales),
    }


def main():
    with open(absolute(config_argument()), "r", encoding="utf-8") as handle:
        config = json.load(handle)
    helpers = load_module(absolute(config["manualBuilderScript"]))
    source_path = absolute(config["sourceBlend"])
    output_path = absolute(config["outputBlend"])
    manifest_path = absolute(config["manifestPath"])
    source_hash_before = sha256(source_path)
    source_mesh = bpy.data.objects.get(config["source"]["meshObject"])
    if source_mesh is None or source_mesh.type != "MESH":
        raise RuntimeError("Configured Survival source mesh was not found")
    mesh = source_mesh.copy()
    mesh.data = source_mesh.data.copy()
    quality_report = helpers.apply_latest_quality(config, mesh)
    scene = bpy.context.scene
    clean_scene(scene, mesh)
    scene.name = config["workbook"]["sceneName"]
    collection = bpy.data.collections.new(config["workbook"]["collectionName"])
    scene.collection.children.link(collection)
    collection.objects.link(mesh)
    clean_mesh(config, mesh)
    metarig = create_metarig(config, collection)
    fit_report = fit_metarig(config, mesh, metarig)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    instructions = bpy.data.texts.new(config["workbook"]["instructionsText"])
    instructions.write("\n".join(config["instructions"]))
    scene.frame_start = config["workbook"]["timelineStart"]
    scene.frame_end = config["workbook"]["timelineEnd"]
    scene.frame_set(scene.frame_start)
    scene.world.color = config["workbook"]["worldColor"]
    scene["review_only"] = config["reviewOnly"]
    scene["production_runtime_changed"] = False
    scene["comparison_target"] = "original_vs_manual_vs_rigify"
    quality_report["missingImageRepair"] = helpers.repair_missing_images(quality_report)
    bpy.context.workspace.name = config["workbook"]["workspaceName"]
    mesh_bounds = helpers.configure_viewport(config, mesh)
    bpy.ops.object.select_all(action="DESELECT")
    metarig.select_set(True)
    bpy.context.view_layer.objects.active = metarig
    if config["workbook"]["saveInEditMode"]:
        bpy.ops.object.mode_set(mode="EDIT")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    if config["workbook"]["packResources"]:
        bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=output_path, check_existing=False)
    source_hash_after = sha256(source_path)
    required = config["validation"]["requiredBones"]
    missing = [name for name in required if name not in metarig.data.bones]
    manifest = {
        "version": config["version"],
        "reviewOnly": config["reviewOnly"],
        "sourceBlend": config["sourceBlend"],
        "sourceSha256Before": source_hash_before,
        "sourceSha256After": source_hash_after,
        "sourcePreserved": source_hash_before == source_hash_after,
        "outputBlend": config["outputBlend"],
        "outputSha256": sha256(output_path),
        "mesh": {
            "name": mesh.name,
            "vertices": len(mesh.data.vertices),
            "polygons": len(mesh.data.polygons),
            "vertexGroups": len(mesh.vertex_groups),
            "modifiers": len(mesh.modifiers),
            "bounds": mesh_bounds,
        },
        "metarig": {
            "name": metarig.name,
            "bones": len(metarig.data.bones),
            "requiredBonesMissing": missing,
            "savedMode": metarig.mode,
            "generatedRigPresent": bpy.data.objects.get("rig") is not None,
            "fit": fit_report,
        },
        "quality": quality_report,
        "actions": len(bpy.data.actions),
        "productionRuntimeChanged": False,
        "animationsAttached": False,
    }
    failures = []
    validation = config["validation"]
    if manifest["mesh"]["vertices"] != validation["expectedVertexCount"]:
        failures.append("vertex_count")
    if manifest["mesh"]["polygons"] != validation["expectedPolygonCount"]:
        failures.append("polygon_count")
    if manifest["metarig"]["bones"] != validation["expectedMetarigBoneCount"]:
        failures.append("metarig_bone_count")
    if missing:
        failures.append("required_bones")
    if manifest["mesh"]["vertexGroups"] != validation["expectedVertexGroupCount"]:
        failures.append("vertex_groups")
    if manifest["mesh"]["modifiers"] != validation["expectedModifierCount"]:
        failures.append("modifiers")
    if manifest["actions"] != validation["expectedActionCount"]:
        failures.append("actions")
    if not manifest["sourcePreserved"]:
        failures.append("source_changed")
    manifest["validationFailures"] = failures
    manifest["valid"] = not failures
    os.makedirs(os.path.dirname(manifest_path), exist_ok=True)
    with open(manifest_path, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")
    if failures:
        raise RuntimeError(f"Rigify workbook validation failed: {failures}")
    print(
        "RIGIFY_HUMAN_WORKBOOK_OK "
        f"bones={manifest['metarig']['bones']} vertices={manifest['mesh']['vertices']} "
        f"actions={manifest['actions']} glove_polygons={quality_report.get('fullGlovePolygonsChanged', 0)}"
    )


if __name__ == "__main__":
    main()
