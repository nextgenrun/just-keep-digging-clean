import hashlib
import json
import os
import sys

import bpy


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


def main():
    config_path = absolute_path(config_argument())
    with open(config_path, "r", encoding="utf-8") as handle:
        config = json.load(handle)
    validation = config["validation"]
    manifest_path = absolute_path(config["manifestPath"])
    with open(manifest_path, "r", encoding="utf-8") as handle:
        manifest = json.load(handle)

    mesh = bpy.data.objects.get(config["workbook"]["meshObject"])
    rig = bpy.data.objects.get(config["workbook"]["armatureObject"])
    checks = {
        "openedExpectedWorkbook": os.path.normcase(bpy.data.filepath) == os.path.normcase(absolute_path(config["outputBlend"])),
        "sourceHashStillMatches": file_sha256(absolute_path(config["sourceBlend"])) == manifest["sourceSha256Before"],
        "outputHashMatchesManifest": file_sha256(absolute_path(config["outputBlend"])) == manifest["outputSha256"],
        "sceneObjectCount": len(bpy.context.scene.objects) == validation["expectedSceneObjectCount"],
        "meshExists": mesh is not None and mesh.type == "MESH",
        "armatureExists": rig is not None and rig.type == "ARMATURE",
    }
    if mesh is not None:
        checks.update({
            "vertexCount": len(mesh.data.vertices) == validation["expectedVertexCount"],
            "polygonCount": len(mesh.data.polygons) == validation["expectedPolygonCount"],
            "zeroVertexGroups": len(mesh.vertex_groups) == validation["expectedVertexGroupCount"],
            "zeroModifiers": len(mesh.modifiers) == validation["expectedModifierCount"],
            "zeroMeshConstraints": len(mesh.constraints) == validation["expectedConstraintCount"],
            "zeroShapeKeys": (0 if mesh.data.shape_keys is None else len(mesh.data.shape_keys.key_blocks)) == validation["expectedShapeKeyCount"],
            "noMeshParent": mesh.parent is None,
            "noMeshAnimation": mesh.animation_data is None,
        })
    if rig is not None:
        checks.update({
            "zeroBones": len(rig.data.bones) == validation["expectedBoneCount"],
            "zeroRigConstraints": len(rig.constraints) == validation["expectedConstraintCount"],
            "noRigAnimation": rig.animation_data is None,
            "mirrorXEnabled": rig.data.use_mirror_x is True,
            "armatureInFront": rig.show_in_front is True,
        })
    checks["zeroActions"] = len(bpy.data.actions) == validation["expectedActionCount"]
    checks["fullGloveCorrectionRecorded"] = (
        manifest["quality"]["fullGlovePolygonsChanged"] >= validation["minimumFullGlovePolygonsChanged"]
    )

    material_checks = {}
    for material_name in validation["requiredV4Materials"]:
        material = bpy.data.materials.get(material_name)
        node_names = set(material.node_tree.nodes.keys()) if material and material.use_nodes else set()
        material_checks[material_name] = material is not None and {
            "DG_V4_ORM_CHANNELS", "DG_V4_ROUGHNESS_MULTIPLY", "DG_V4_ROUGHNESS_ADD"
        }.issubset(node_names)
    for material_name in validation["requiredSpecialMaterials"]:
        material_checks[material_name] = bpy.data.materials.get(material_name) is not None
    checks["latestQualityMaterials"] = all(material_checks.values())

    external_images = []
    non_color_normals = []
    for image in bpy.data.images:
        if image.source != "FILE":
            continue
        identity = f"{image.name} {image.filepath}".lower()
        if not image.packed_file and not os.path.isfile(bpy.path.abspath(image.filepath)):
            external_images.append({"name": image.name, "path": image.filepath})
        if "normal" in identity and image.colorspace_settings.name != "Non-Color":
            non_color_normals.append({"name": image.name, "colorspace": image.colorspace_settings.name})
    checks["noMissingImages"] = not external_images
    checks["normalMapsUseNonColor"] = not non_color_normals
    checks["embeddedInstructions"] = config["workbook"]["instructionsText"] in bpy.data.texts
    checks["reviewOnly"] = bpy.context.scene.get("review_only") is True
    checks["productionRuntimeUnchanged"] = bpy.context.scene.get("production_runtime_changed") is False

    failed = [name for name, passed in checks.items() if not passed]
    report = {
        "version": config["version"],
        "passed": not failed,
        "failedChecks": failed,
        "checks": checks,
        "materialChecks": material_checks,
        "missingImages": external_images,
        "normalColorSpaceProblems": non_color_normals,
        "workbookModeOnOpen": rig.mode if rig is not None else None,
        "sourcePreserved": checks["sourceHashStillMatches"],
        "productionRuntimeChanged": False,
    }
    report_path = absolute_path(validation["reportPath"])
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
        handle.write("\n")
    if failed:
        raise RuntimeError(f"Manual rerig workbook validation failed: {failed}")
    print(
        "MANUAL_RERIG_WORKBOOK_VALID "
        f"objects={len(bpy.context.scene.objects)} "
        f"vertices={len(mesh.data.vertices)} "
        f"bones={len(rig.data.bones)} "
        f"actions={len(bpy.data.actions)}"
    )


if __name__ == "__main__":
    main()
