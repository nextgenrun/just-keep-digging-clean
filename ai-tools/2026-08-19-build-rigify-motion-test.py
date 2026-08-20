import hashlib
import json
import os
import sys
from collections import defaultdict

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


def object_mode():
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")


def apply_soft_repairs(config, metarig):
    repairs = []
    if not config["rigify"].get("softRepairs"):
        return repairs
    object_mode()
    bpy.ops.object.select_all(action="DESELECT")
    metarig.hide_set(False)
    metarig.select_set(True)
    bpy.context.view_layer.objects.active = metarig
    bpy.ops.object.mode_set(mode="EDIT")
    try:
        for settings in config["rigify"]["softRepairs"]:
            parent = metarig.data.edit_bones.get(settings["parentBone"])
            child = metarig.data.edit_bones.get(settings["childBone"])
            if parent is None or child is None or child.parent != parent:
                raise RuntimeError(f"Invalid soft repair: {settings}")
            gap = (parent.tail - child.head).length
            if gap > settings["maximumGap"]:
                raise RuntimeError(f"Soft repair gap exceeds limit: {settings['childBone']} gap={gap:.6f}")
            if settings["operation"] != "MIDPOINT_ALIGN":
                raise RuntimeError(f"Unsupported soft repair operation: {settings['operation']}")
            midpoint = (parent.tail + child.head) * 0.5
            was_connected = child.use_connect
            child.use_connect = False
            parent.tail = midpoint
            child.head = midpoint
            child.parent = parent
            child.use_connect = was_connected
            repairs.append({
                "parentBone": parent.name,
                "childBone": child.name,
                "operation": settings["operation"],
                "gapBefore": gap,
                "maximumGap": settings["maximumGap"],
                "maximumEndpointMove": gap * 0.5,
                "preservedConnectedFlag": was_connected,
            })
    finally:
        bpy.ops.object.mode_set(mode="OBJECT")
    metarig.data.update_tag()
    bpy.context.view_layer.update()
    for repair in repairs:
        parent = metarig.data.bones[repair["parentBone"]]
        child = metarig.data.bones[repair["childBone"]]
        gap_after = (parent.tail_local - child.head_local).length
        repair["gapAfter"] = gap_after
        repair["connectedAfter"] = child.use_connect
        if gap_after > 0.000001 or child.use_connect != repair["preservedConnectedFlag"]:
            raise RuntimeError(f"Soft repair did not connect {child.name}: gap={gap_after:.9f}")
    return repairs


def generate_rig(config, metarig):
    rigify = config["rigify"]
    bpy.ops.preferences.addon_enable(module=rigify["addonModule"])
    before = {obj.name for obj in bpy.data.objects if obj.type == "ARMATURE"}
    object_mode()
    bpy.ops.object.select_all(action="DESELECT")
    metarig.hide_set(False)
    metarig.select_set(True)
    bpy.context.view_layer.objects.active = metarig
    bpy.ops.pose.rigify_generate()
    generated = [
        obj for obj in bpy.data.objects
        if obj.type == "ARMATURE" and obj.name not in before
    ]
    if len(generated) != 1:
        generated = [
            obj for obj in bpy.data.objects
            if obj.type == "ARMATURE" and obj.name.startswith(rigify["generatedPrefix"])
        ]
    if len(generated) != 1:
        raise RuntimeError(f"Expected one generated Rigify armature, found {[obj.name for obj in generated]}")
    generated[0].name = config["objects"]["generatedRig"]
    generated[0].data.name = config["objects"]["generatedRig"] + "_Data"
    return generated[0]


def append_source_mesh(config):
    source_path = absolute(config["sourceBlend"])
    source_name = config["objects"]["sourceMesh"]
    with bpy.data.libraries.load(source_path, link=False) as (available, requested):
        if source_name not in available.objects:
            raise RuntimeError(f"Source mesh is missing: {source_name}")
        requested.objects = [source_name]
    source_mesh = requested.objects[0]
    bpy.context.scene.collection.objects.link(source_mesh)
    return source_mesh


def group_mapping(config, source_mesh, generated_rig):
    transfer = config["weightTransfer"]
    target_names = {bone.name for bone in generated_rig.data.bones}
    mapping = {}
    unmapped = []
    invalid = []
    for group in source_mesh.vertex_groups:
        target = transfer["exact"].get(group.name)
        if target is None:
            for rule in transfer["rules"]:
                if group.name.startswith(rule["startsWith"]) and group.name.endswith(rule["endsWith"]):
                    target = rule["target"]
                    break
        if target is None:
            unmapped.append(group.name)
        elif target not in target_names:
            invalid.append({"source": group.name, "target": target})
        else:
            mapping[group.name] = target
    if unmapped or invalid:
        raise RuntimeError(f"Weight map incomplete unmapped={unmapped} invalid={invalid}")
    return mapping


def transfer_weights(config, source_mesh, candidate_mesh, mapping):
    settings = config["weightTransfer"]
    if len(source_mesh.data.vertices) != len(candidate_mesh.data.vertices):
        raise RuntimeError("Source and candidate vertex counts differ")
    for group in list(candidate_mesh.vertex_groups):
        candidate_mesh.vertex_groups.remove(group)
    target_groups = {
        target: candidate_mesh.vertex_groups.new(name=target)
        for target in sorted(set(mapping.values()))
    }
    source_groups = {group.index: group.name for group in source_mesh.vertex_groups}
    buckets = defaultdict(list)
    unweighted = []
    maximum = settings["maximumInfluencesPerVertex"]
    steps = settings["quantizationSteps"]
    for vertex in source_mesh.data.vertices:
        weights = defaultdict(float)
        for membership in vertex.groups:
            source_name = source_groups[membership.group]
            weights[mapping[source_name]] += membership.weight
        strongest = sorted(weights.items(), key=lambda item: item[1], reverse=True)[:maximum]
        total = sum(weight for _, weight in strongest)
        if total <= 0.0:
            unweighted.append(vertex.index)
            continue
        for target, weight in strongest:
            bucket = max(1, min(steps, round(weight / total * steps)))
            buckets[(target, bucket)].append(vertex.index)
    for (target, bucket), indices in buckets.items():
        target_groups[target].add(indices, bucket / steps, "REPLACE")
    return {
        "unweightedVertices": len(unweighted),
        "weightBuckets": len(buckets),
        "candidateGroups": len(target_groups),
    }


def attach_armature(config, candidate_mesh, generated_rig):
    for modifier in list(candidate_mesh.modifiers):
        if modifier.type == "ARMATURE":
            candidate_mesh.modifiers.remove(modifier)
    modifier = candidate_mesh.modifiers.new(config["objects"]["armatureModifier"], "ARMATURE")
    modifier.object = generated_rig
    modifier.use_deform_preserve_volume = config["weightTransfer"]["preserveVolume"]
    candidate_mesh.parent = generated_rig
    candidate_mesh.matrix_parent_inverse = generated_rig.matrix_world.inverted()


def remove_source(source_mesh):
    data = source_mesh.data
    bpy.data.objects.remove(source_mesh, do_unlink=True)
    if data.users == 0:
        bpy.data.meshes.remove(data)


def main():
    with open(absolute(config_argument()), "r", encoding="utf-8") as handle:
        config = json.load(handle)
    snapshot_path = absolute(config["snapshotBlend"])
    snapshot_before = sha256(snapshot_path)
    metarig = bpy.data.objects.get(config["objects"]["metarig"])
    candidate_mesh = bpy.data.objects.get(config["objects"]["candidateMesh"])
    if metarig is None or candidate_mesh is None:
        raise RuntimeError("Rigify metarig or candidate mesh is missing")
    if len(metarig.data.bones) != config["rigify"]["expectedMetarigBones"]:
        raise RuntimeError(f"Unexpected metarig bone count: {len(metarig.data.bones)}")
    if len(candidate_mesh.data.vertices) != config["weightTransfer"]["expectedVertices"]:
        raise RuntimeError(f"Unexpected candidate vertex count: {len(candidate_mesh.data.vertices)}")
    soft_repairs = apply_soft_repairs(config, metarig)
    generated_rig = generate_rig(config, metarig)
    generated_bones = len(generated_rig.data.bones)
    deform_bones = sum(bone.name.startswith(config["rigify"]["deformPrefix"]) for bone in generated_rig.data.bones)
    if generated_bones != config["rigify"]["expectedGeneratedBones"] or deform_bones != config["rigify"]["expectedDeformBones"]:
        raise RuntimeError(f"Unexpected generated Rigify counts: bones={generated_bones} deform={deform_bones}")
    source_mesh = append_source_mesh(config)
    source_group_count = len(source_mesh.vertex_groups)
    if source_group_count != config["weightTransfer"]["expectedSourceVertexGroups"]:
        raise RuntimeError(f"Unexpected source vertex group count: {source_group_count}")
    mapping = group_mapping(config, source_mesh, generated_rig)
    transfer = transfer_weights(config, source_mesh, candidate_mesh, mapping)
    if transfer["unweightedVertices"]:
        raise RuntimeError(f"Unweighted candidate vertices: {transfer['unweightedVertices']}")
    attach_armature(config, candidate_mesh, generated_rig)
    remove_source(source_mesh)
    metarig.hide_render = config["rigify"]["hideMetarigAfterGeneration"]
    metarig.hide_set(config["rigify"]["hideMetarigAfterGeneration"])
    generated_rig.animation_data_clear()
    candidate_mesh["review_only"] = True
    generated_rig["review_only"] = True
    output_path = absolute(config["candidateBlend"])
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=output_path, check_existing=False)
    snapshot_after = sha256(snapshot_path)
    if snapshot_before != snapshot_after:
        raise RuntimeError("Protected Rigify snapshot changed during build")
    report = {
        "version": config["version"],
        "reviewOnly": True,
        "snapshotBlend": config["snapshotBlend"],
        "snapshotSha256": snapshot_before,
        "metarigBones": len(metarig.data.bones),
        "generatedBones": generated_bones,
        "deformBones": deform_bones,
        "softRepairs": soft_repairs,
        "sourceVertices": len(candidate_mesh.data.vertices),
        "sourceVertexGroups": source_group_count,
        "mappedSourceGroups": len(mapping),
        "unmappedSourceGroups": 0,
        **transfer,
        "maximumInfluencesPerVertex": config["weightTransfer"]["maximumInfluencesPerVertex"],
        "candidateBlend": config["candidateBlend"],
        "candidateBlendSha256": sha256(output_path),
        "productionChanged": False,
        "runtimeWired": False,
    }
    report_path = absolute(config["candidateReport"])
    with open(report_path, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
        handle.write("\n")
    print(
        "RIGIFY_MOTION_CANDIDATE_OK "
        f"bones={generated_bones} deform={deform_bones} groups={len(mapping)} "
        f"vertices={len(candidate_mesh.data.vertices)} unweighted={transfer['unweightedVertices']}"
    )


if __name__ == "__main__":
    main()
