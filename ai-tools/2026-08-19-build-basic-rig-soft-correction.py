import hashlib
import importlib.util
import json
import math
import os
import sys
from collections import defaultdict

import bpy


def args_after_separator():
    return sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def config_argument():
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


def load_test_builder(path_value):
    spec = importlib.util.spec_from_file_location("basic_rig_test_builder", path_value)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def correct_structure(rig, correction):
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    edit_bones = rig.data.edit_bones
    before_positions = {
        bone.name: {"head": list(bone.head), "tail": list(bone.tail)}
        for bone in edit_bones
    }
    for bone_name in correction["flipBones"]:
        bone = edit_bones.get(bone_name)
        if bone is None:
            raise RuntimeError(f"Bone selected for direction repair is missing: {bone_name}")
        original_head = bone.head.copy()
        original_tail = bone.tail.copy()
        bone.head = original_tail
        bone.tail = original_head
        bone.roll += math.pi
    for old_name, new_name in correction["rename"].items():
        bone = edit_bones.get(old_name)
        if bone is None:
            raise RuntimeError(f"Bone selected for rename is missing: {old_name}")
        bone.name = new_name
    root = edit_bones.new(correction["addRootName"])
    root.head = correction["addRootHead"]
    root.tail = correction["addRootTail"]
    root.use_deform = False
    for child_name, parent_name in correction["parents"].items():
        child = edit_bones.get(child_name)
        parent = edit_bones.get(parent_name)
        if child is None or parent is None:
            raise RuntimeError(f"Invalid parent repair: {child_name} -> {parent_name}")
        child.parent = parent
        child.use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")
    for bone in rig.data.bones:
        bone.use_deform = bone.name not in correction["nonDeformBones"]
    after_positions = {
        bone.name: {"head": list(bone.head_local), "tail": list(bone.tail_local)}
        for bone in rig.data.bones
    }
    return {"beforePositions": before_positions, "afterPositions": after_positions}


def point_segment_distance(point, head, tail):
    segment = tail - head
    length_squared = segment.length_squared
    if length_squared <= 1e-10:
        return (point - head).length
    parameter = max(0.0, min(1.0, (point - head).dot(segment) / length_squared))
    return (point - (head + segment * parameter)).length


def assign_distance_weights(mesh, rig, correction):
    for modifier in list(mesh.modifiers):
        mesh.modifiers.remove(modifier)
    mesh.parent = None
    mesh.vertex_groups.clear()
    bone_names = correction["distanceWeightBones"]
    bones = [rig.data.bones[name] for name in bone_names]
    groups = {name: mesh.vertex_groups.new(name=name) for name in bone_names}
    buckets = defaultdict(list)
    sigma = correction["weightSigma"]
    steps = correction["weightQuantizationSteps"]
    influence_limit = correction["maximumInfluencesPerVertex"]
    for vertex in mesh.data.vertices:
        distances = sorted(
            (point_segment_distance(vertex.co, bone.head_local, bone.tail_local), bone.name)
            for bone in bones
        )[:influence_limit]
        raw = [(math.exp(-0.5 * (distance / sigma) ** 2), name) for distance, name in distances]
        total = sum(weight for weight, _name in raw)
        if total <= 1e-12:
            raw = [(1.0, distances[0][1])]
            total = 1.0
        quantized = []
        for weight, name in raw:
            value = max(1, min(steps, round((weight / total) * steps)))
            quantized.append((value, name))
        quantized_total = sum(value for value, _name in quantized)
        for value, name in quantized:
            normalized = value / quantized_total
            bucket = max(1, min(steps, round(normalized * steps)))
            buckets[(name, bucket)].append(vertex.index)
    for (name, bucket), indices in buckets.items():
        groups[name].add(indices, bucket / steps, "REPLACE")
    modifier = mesh.modifiers.new("RERIG_SoftCorrected_Armature", "ARMATURE")
    modifier.object = rig
    modifier.use_deform_preserve_volume = True
    mesh.parent = rig
    bpy.context.view_layer.update()


def main():
    config_path = absolute(config_argument())
    with open(config_path, "r", encoding="utf-8") as handle:
        config = json.load(handle)
    source = absolute(config["sourceBlend"])
    output_root = absolute(config["correctedOutputRoot"])
    output_blend = absolute(config["correctedOutputBlend"])
    report_path = absolute(config["correctedReportPath"])
    source_hash_before = sha256(source)
    test_builder = load_test_builder(absolute(config["testBuilderScript"]))
    rig = bpy.data.objects.get(config["sourceRig"])
    mesh = bpy.data.objects.get(config["sourceMesh"])
    if rig is None or mesh is None:
        raise RuntimeError("User-authored basic rig or clean mesh was not found")

    before_hierarchy = test_builder.hierarchy_report(rig)
    correction_report = correct_structure(rig, config["softCorrection"])
    after_hierarchy = test_builder.hierarchy_report(rig)
    assign_distance_weights(mesh, rig, config["softCorrection"])
    weights = test_builder.weight_report(mesh)

    corrected_test_config = json.loads(json.dumps(config))
    corrected_test_config["test"]["roleBones"] = config["softCorrection"]["poseRoleBones"]
    test_builder.configure_render(bpy.context.scene, config["render"], output_root)
    rendered = test_builder.pose_and_render(
        bpy.context.scene, rig, corrected_test_config, output_root
    )
    os.makedirs(os.path.dirname(output_blend), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=output_blend, check_existing=False)

    source_hash_after = sha256(source)
    report = {
        "version": config["version"] + "-soft-corrected",
        "reviewOnly": True,
        "sourceBlend": config["sourceBlend"],
        "sourceSha256Before": source_hash_before,
        "sourceSha256After": source_hash_after,
        "sourcePreserved": source_hash_before == source_hash_after,
        "outputBlend": config["correctedOutputBlend"],
        "outputSha256": sha256(output_blend),
        "softCorrections": {
            "jointPositionsMoved": False,
            "boneDirectionsFlipped": config["softCorrection"]["flipBones"],
            "renamedBones": config["softCorrection"]["rename"],
            "rootAdded": config["softCorrection"]["addRootName"],
            "parentingAdded": config["softCorrection"]["parents"],
            "placementEvidence": correction_report,
        },
        "hierarchyBefore": before_hierarchy,
        "hierarchyAfter": after_hierarchy,
        "weights": weights,
        "weightMethod": "review-only nearest-bone distance weights after Blender bone heat returned zero weighted vertices",
        "renderedFrames": [os.path.relpath(path, os.getcwd()).replace("\\", "/") for path in rendered],
        "productionRuntimeChanged": False,
        "animationsRetargeted": False,
    }
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
        handle.write("\n")
    print(
        "BASIC_RIG_SOFT_CORRECTION_OK "
        f"bones={after_hierarchy['boneCount']} roots={after_hierarchy['rootCount']} "
        f"groups={weights['vertexGroups']} unweighted={weights['unweightedVertices']}"
    )


if __name__ == "__main__":
    main()
