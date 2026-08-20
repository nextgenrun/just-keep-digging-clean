import hashlib
import importlib.util
import json
import os
import sys

import bpy
from mathutils import Quaternion, Vector


def script_args():
    return sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def config_argument():
    for argument in script_args():
        if argument.startswith("--config="):
            return argument.split("=", 1)[1]
    raise RuntimeError("Missing required --config argument")


def absolute_path(path_value):
    if os.path.isabs(path_value):
        return os.path.normpath(path_value)
    return os.path.normpath(os.path.join(os.getcwd(), path_value))


def file_sha256(path_value):
    digest = hashlib.sha256()
    with open(path_value, "rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_module(path_value):
    spec = importlib.util.spec_from_file_location("manual_rerig_latest_quality", path_value)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def apply_latest_quality(config, mesh_object):
    quality = config["quality"]
    if not quality["applyLatestV4Materials"]:
        return {"applied": False}
    hero = load_module(absolute_path(quality["heroScript"]))
    texture_report = hero.V2.relink_textures()
    restored = hero.restore_full_resolution_textures() if quality["restoreOriginalFullResolutionTextures"] else []
    material_report = {
        name: hero.reconstruct_pbr_material(name, settings)
        for name, settings in hero.CONFIG["pbrMaterials"].items()
    }
    special_report = {
        name: hero.tune_special_material(name, settings)
        for name, settings in hero.CONFIG["specialMaterials"].items()
    }
    glove_polygons = 0
    if quality["applyFullGloveCorrection"]:
        glove_polygons = hero.V2.apply_full_glove_material(mesh_object)
    glove_material = bpy.data.materials.get(quality["expectedGloveMaterial"])
    if glove_material is None:
        raise RuntimeError("Expected corrected glove material is missing")
    return {
        "applied": True,
        "sourceProfile": hero.CONFIG["version"],
        "textureRelink": texture_report,
        "fullResolutionRestored": restored,
        "pbrMaterials": material_report,
        "specialMaterials": special_report,
        "fullGlovePolygonsChanged": glove_polygons,
        "gloveMaterial": glove_material.name,
    }


def remove_shape_keys(mesh_object):
    if mesh_object.data.shape_keys is None:
        return
    bpy.context.view_layer.objects.active = mesh_object
    mesh_object.select_set(True)
    while mesh_object.data.shape_keys and mesh_object.data.shape_keys.key_blocks:
        mesh_object.shape_key_remove(mesh_object.data.shape_keys.key_blocks[-1])


def repair_missing_images(quality_report):
    replacement_path = quality_report.get("textureRelink", {}).get("eye")
    replacement = bpy.data.images.load(replacement_path, check_existing=True) if replacement_path else None
    repaired = []
    removed = []
    unresolved = []
    for image in list(bpy.data.images):
        if image.source != "FILE" or image.packed_file:
            continue
        resolved = bpy.path.abspath(image.filepath)
        if resolved and os.path.isfile(resolved):
            continue
        identity = f"{image.name} {image.filepath}".lower()
        if replacement is not None and "eye" in identity:
            for material in bpy.data.materials:
                if not material.use_nodes:
                    continue
                for node in material.node_tree.nodes:
                    if node.type == "TEX_IMAGE" and node.image == image:
                        node.image = replacement
            repaired.append(image.name)
        if image.users == 0:
            removed.append(image.name)
            bpy.data.images.remove(image)
        elif image != replacement:
            unresolved.append({"name": image.name, "path": image.filepath, "users": image.users})
    if unresolved:
        raise RuntimeError(f"Unresolved external images prevent a self-contained workbook: {unresolved}")
    return {"repaired": repaired, "removed": removed, "unresolved": unresolved}


def configure_viewport(config, mesh_object):
    corners = [mesh_object.matrix_world @ Vector(corner) for corner in mesh_object.bound_box]
    minimum = Vector(tuple(min(point[index] for point in corners) for index in range(3)))
    maximum = Vector(tuple(max(point[index] for point in corners) for index in range(3)))
    centre = (minimum + maximum) * 0.5
    extent = max(maximum - minimum)
    viewport = config["viewport"]
    for area in bpy.context.screen.areas:
        if area.type != "VIEW_3D":
            continue
        space = area.spaces.active
        space.shading.type = viewport["shadingType"]
        space.clip_start = viewport["clipStart"]
        space.clip_end = viewport["clipEnd"]
        space.overlay.show_floor = viewport["showFloor"]
        space.overlay.show_axis_x = viewport["showAxisX"]
        space.overlay.show_axis_y = viewport["showAxisY"]
        space.overlay.show_axis_z = viewport["showAxisZ"]
        space.overlay.show_relationship_lines = viewport["showRelationshipLines"]
        space.overlay.show_text = viewport["showText"]
        space.overlay.show_stats = viewport["showStats"]
        space.region_3d.view_perspective = viewport["viewPerspective"]
        space.region_3d.view_rotation = Quaternion(viewport["frontViewQuaternion"])
        space.region_3d.view_location = centre
        space.region_3d.view_distance = extent * viewport["framePadding"]
    return {
        "minimum": [round(value, 6) for value in minimum],
        "maximum": [round(value, 6) for value in maximum],
        "centre": [round(value, 6) for value in centre],
        "maximumExtent": round(extent, 6),
    }


def main():
    config_path = absolute_path(config_argument())
    with open(config_path, "r", encoding="utf-8") as handle:
        config = json.load(handle)
    source_path = absolute_path(config["sourceBlend"])
    output_path = absolute_path(config["outputBlend"])
    manifest_path = absolute_path(config["manifestPath"])
    source_hash_before = file_sha256(source_path)

    source_mesh = bpy.data.objects.get(config["source"]["meshObject"])
    if source_mesh is None or source_mesh.type != "MESH":
        raise RuntimeError("Configured source mesh was not found")
    work_mesh = source_mesh.copy()
    work_mesh.data = source_mesh.data.copy()
    quality_report = apply_latest_quality(config, work_mesh)

    scene = bpy.context.scene
    for other_scene in list(bpy.data.scenes):
        if other_scene != scene:
            bpy.data.scenes.remove(other_scene)
    scene.name = config["workbook"]["sceneName"]
    for child in list(scene.collection.children):
        scene.collection.children.unlink(child)
    for existing_object in list(bpy.data.objects):
        if existing_object != work_mesh:
            bpy.data.objects.remove(existing_object, do_unlink=True)

    work_collection = bpy.data.collections.new(config["workbook"]["collectionName"])
    scene.collection.children.link(work_collection)
    work_collection.objects.link(work_mesh)
    work_mesh.name = config["workbook"]["meshObject"]
    work_mesh.data.name = config["workbook"]["meshObject"] + "_MeshData"
    work_mesh.parent = None
    work_mesh.animation_data_clear()
    work_mesh.constraints.clear()
    for modifier in list(work_mesh.modifiers):
        work_mesh.modifiers.remove(modifier)
    remove_shape_keys(work_mesh)
    work_mesh.vertex_groups.clear()
    work_mesh["review_only"] = config["reviewOnly"]
    work_mesh["rig_state"] = "unweighted_from_scratch"
    work_mesh["latest_visual_quality"] = "hero_v4_full_resolution_full_glove"
    work_mesh["keep_object_transforms"] = True

    armature_data = bpy.data.armatures.new(config["workbook"]["armatureData"])
    armature_data.display_type = config["workbook"]["armatureDisplayType"]
    armature_data.axes_position = config["workbook"]["armatureDisplaySize"]
    armature_data.use_mirror_x = config["workbook"]["mirrorX"]
    armature_object = bpy.data.objects.new(config["workbook"]["armatureObject"], armature_data)
    work_collection.objects.link(armature_object)
    armature_object.show_in_front = config["workbook"]["showArmatureInFront"]
    armature_object["review_only"] = config["reviewOnly"]
    armature_object["rig_state"] = "empty_from_scratch"
    armature_object["animation_attachment_allowed"] = False

    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    instructions = bpy.data.texts.get(config["workbook"]["instructionsText"])
    if instructions is None:
        instructions = bpy.data.texts.new(config["workbook"]["instructionsText"])
    instructions.clear()
    instructions.write("\n".join(config["instructions"]))

    scene.frame_start = config["workbook"]["timelineStart"]
    scene.frame_end = config["workbook"]["timelineEnd"]
    scene.frame_set(config["workbook"]["timelineStart"])
    scene.world.color = config["workbook"]["worldColor"]
    scene["review_only"] = config["reviewOnly"]
    scene["source_blend_sha256"] = source_hash_before
    scene["production_runtime_changed"] = False
    scene["visual_quality_profile"] = "hero_v4_full_resolution_full_glove"
    quality_report["missingImageRepair"] = repair_missing_images(quality_report)

    current_workspace = bpy.context.workspace
    current_workspace.name = config["workbook"]["workspaceName"]
    bounds = configure_viewport(config, work_mesh)

    bpy.ops.object.select_all(action="DESELECT")
    armature_object.select_set(True)
    bpy.context.view_layer.objects.active = armature_object
    if config["workbook"]["saveInEditMode"]:
        bpy.ops.object.mode_set(mode="EDIT")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    if config["workbook"]["packResources"]:
        bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=output_path, check_existing=False)

    source_hash_after = file_sha256(source_path)
    if source_hash_before != source_hash_after:
        raise RuntimeError("Source Blender file changed while building review workbook")
    manifest = {
        "version": config["version"],
        "reviewOnly": config["reviewOnly"],
        "sourceBlend": config["sourceBlend"],
        "sourceSha256Before": source_hash_before,
        "sourceSha256After": source_hash_after,
        "sourcePreserved": source_hash_before == source_hash_after,
        "outputBlend": config["outputBlend"],
        "outputSha256": file_sha256(output_path),
        "editableMesh": {
            "name": work_mesh.name,
            "vertices": len(work_mesh.data.vertices),
            "polygons": len(work_mesh.data.polygons),
            "vertexGroups": len(work_mesh.vertex_groups),
            "modifiers": len(work_mesh.modifiers),
            "constraints": len(work_mesh.constraints),
            "shapeKeys": 0 if work_mesh.data.shape_keys is None else len(work_mesh.data.shape_keys.key_blocks),
            "parent": None if work_mesh.parent is None else work_mesh.parent.name,
            "bounds": bounds,
        },
        "emptyArmature": {
            "name": armature_object.name,
            "bones": len(armature_data.bones),
            "animationData": armature_object.animation_data is not None,
            "mirrorX": armature_data.use_mirror_x,
            "displayType": armature_data.display_type,
            "savedMode": armature_object.mode,
        },
        "quality": quality_report,
        "actions": len(bpy.data.actions),
        "recommendedBoneNames": config["recommendedBoneNames"],
        "productionRuntimeChanged": False,
        "animationsAttached": False,
    }
    os.makedirs(os.path.dirname(manifest_path), exist_ok=True)
    with open(manifest_path, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")
    print(
        "MANUAL_RERIG_WORKBOOK_OK "
        f"output={config['outputBlend']} "
        f"vertices={manifest['editableMesh']['vertices']} "
        f"bones={manifest['emptyArmature']['bones']} "
        f"actions={manifest['actions']} "
        f"glove_polygons={quality_report.get('fullGlovePolygonsChanged', 0)}"
    )


if __name__ == "__main__":
    main()
