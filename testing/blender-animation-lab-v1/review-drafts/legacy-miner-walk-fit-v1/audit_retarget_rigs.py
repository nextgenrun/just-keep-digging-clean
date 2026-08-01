"""Diagnose the failed v1 Survival-to-Meshy walk transfer.

This script is intentionally read-only with respect to the review .blend. It
writes a machine-readable report beside the failed proof so a corrected pass
can be based on actual rest transforms and proportions instead of bone-name
coverage.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


SESSION_ROOT = Path(__file__).resolve().parent
REPORT_PATH = SESSION_ROOT / "retarget-diagnostic.json"
SESSION_NAME = "legacy-miner-walk-fit-v1"

PAIRS = {
    "Hips": "pelvis",
    "LeftUpLeg": "thigh_l",
    "LeftLeg": "calf_l",
    "LeftFoot": "foot_l",
    "LeftToeBase": "ball_l",
    "RightUpLeg": "thigh_r",
    "RightLeg": "calf_r",
    "RightFoot": "foot_r",
    "RightToeBase": "ball_r",
    "Spine": "spine_01",
    "Spine01": "spine_03",
    "Spine02": "spine_05",
    "LeftShoulder": "clavicle_l",
    "LeftArm": "upperarm_l",
    "LeftForeArm": "lowerarm_l",
    "LeftHand": "hand_l",
    "RightShoulder": "clavicle_r",
    "RightArm": "upperarm_r",
    "RightForeArm": "lowerarm_r",
    "RightHand": "hand_r",
    "neck": "neck_01",
    "Head": "head",
}

SAMPLE_FRAMES = (1, 7, 12, 18)


def rounded(values, digits: int = 6) -> list[float]:
    return [round(float(value), digits) for value in values]


def transform_record(obj: bpy.types.Object) -> dict:
    matrix = obj.matrix_world
    location, rotation, scale = matrix.decompose()
    return {
        "name": obj.name,
        "parent": obj.parent.name if obj.parent else None,
        "location": rounded(location),
        "rotationQuaternionWXYZ": rounded(rotation),
        "scale": rounded(scale),
        "determinant": round(float(matrix.to_3x3().determinant()), 6),
    }


def world_rest_points(rig: bpy.types.Object, bone_name: str) -> tuple[Vector, Vector]:
    bone = rig.data.bones[bone_name]
    return (
        rig.matrix_world @ bone.head_local,
        rig.matrix_world @ bone.tail_local,
    )


def world_pose_points(rig: bpy.types.Object, bone_name: str) -> tuple[Vector, Vector]:
    bone = rig.pose.bones[bone_name]
    return (
        rig.matrix_world @ bone.head,
        rig.matrix_world @ bone.tail,
    )


def angle_degrees(a: Vector, b: Vector) -> float:
    if a.length < 1.0e-8 or b.length < 1.0e-8:
        return 0.0
    return round(math.degrees(a.angle(b)), 3)


def bone_record(
    source_rig: bpy.types.Object,
    target_rig: bpy.types.Object,
    source_name: str,
    target_name: str,
) -> dict:
    source_bone = source_rig.data.bones[source_name]
    target_bone = target_rig.data.bones[target_name]
    source_head, source_tail = world_rest_points(source_rig, source_name)
    target_head, target_tail = world_rest_points(target_rig, target_name)
    source_vector = source_tail - source_head
    target_vector = target_tail - target_head
    source_world_rotation = (
        source_rig.matrix_world.to_quaternion()
        @ source_bone.matrix_local.to_quaternion()
    )
    target_world_rotation = (
        target_rig.matrix_world.to_quaternion()
        @ target_bone.matrix_local.to_quaternion()
    )
    return {
        "source": source_name,
        "target": target_name,
        "sourceParent": source_bone.parent.name if source_bone.parent else None,
        "targetParent": target_bone.parent.name if target_bone.parent else None,
        "sourceHeadWorld": rounded(source_head),
        "sourceTailWorld": rounded(source_tail),
        "targetHeadWorld": rounded(target_head),
        "targetTailWorld": rounded(target_tail),
        "sourceLengthWorld": round(source_vector.length, 6),
        "targetLengthWorld": round(target_vector.length, 6),
        "targetToSourceLengthRatio": round(
            target_vector.length / max(source_vector.length, 1.0e-8),
            6,
        ),
        "restDirectionDifferenceDegrees": angle_degrees(
            source_vector,
            target_vector,
        ),
        "restBasisDifferenceDegrees": round(
            math.degrees(
                source_world_rotation.rotation_difference(
                    target_world_rotation
                ).angle
            ),
            3,
        ),
    }


def chain_length(rig: bpy.types.Object, names: tuple[str, ...]) -> float:
    return round(
        sum(
            (world_rest_points(rig, name)[1] - world_rest_points(rig, name)[0]).length
            for name in names
        ),
        6,
    )


def evaluated_mesh_bounds(
    scene: bpy.types.Scene,
    objects: list[bpy.types.Object],
) -> dict:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    minimum = Vector((float("inf"), float("inf"), float("inf")))
    maximum = Vector((float("-inf"), float("-inf"), float("-inf")))
    vertex_count = 0
    for original in objects:
        evaluated = original.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            world = evaluated.matrix_world
            for vertex in mesh.vertices:
                point = world @ vertex.co
                minimum.x = min(minimum.x, point.x)
                minimum.y = min(minimum.y, point.y)
                minimum.z = min(minimum.z, point.z)
                maximum.x = max(maximum.x, point.x)
                maximum.y = max(maximum.y, point.y)
                maximum.z = max(maximum.z, point.z)
                vertex_count += 1
        finally:
            evaluated.to_mesh_clear()
    dimensions = maximum - minimum
    return {
        "frame": scene.frame_current,
        "vertices": vertex_count,
        "minimumWorld": rounded(minimum),
        "maximumWorld": rounded(maximum),
        "dimensionsWorld": rounded(dimensions),
        "diagonalWorld": round(dimensions.length, 6),
    }


def rigged_meshes(
    scene: bpy.types.Scene,
    rig: bpy.types.Object,
) -> list[bpy.types.Object]:
    return [
        obj
        for obj in scene.objects
        if obj.type == "MESH"
        and any(
            modifier.type == "ARMATURE" and modifier.object == rig
            for modifier in obj.modifiers
        )
    ]


def pose_sample(
    rig: bpy.types.Object,
    names: tuple[str, ...],
) -> dict:
    output = {}
    for name in names:
        if rig.pose.bones.get(name) is None:
            continue
        head, tail = world_pose_points(rig, name)
        output[name] = {
            "headWorld": rounded(head),
            "tailWorld": rounded(tail),
            "basisRotationWXYZ": rounded(
                rig.pose.bones[name].matrix_basis.to_quaternion()
            ),
            "basisTranslation": rounded(
                rig.pose.bones[name].matrix_basis.to_translation()
            ),
        }
    return output


def main() -> None:
    scene = bpy.context.scene
    source_rig = bpy.data.objects.get("root")
    candidate_parts = [
        obj
        for obj in scene.objects
        if obj.get("dgal_session") == SESSION_NAME
        and obj.get("dgal_role") == "mesh-candidate-part"
    ]
    target_rig = next(
        (obj for obj in candidate_parts if obj.type == "ARMATURE"),
        None,
    )
    if source_rig is None or source_rig.type != "ARMATURE":
        raise RuntimeError("Source Survival armature 'root' is missing")
    if target_rig is None:
        raise RuntimeError("Target Meshy armature is missing")

    missing = [
        [target, source]
        for target, source in PAIRS.items()
        if target_rig.data.bones.get(target) is None
        or source_rig.data.bones.get(source) is None
    ]
    if missing:
        raise RuntimeError(f"Mapped bones missing: {missing}")

    source_meshes = rigged_meshes(scene, source_rig)
    target_meshes = rigged_meshes(scene, target_rig)
    if not source_meshes or not target_meshes:
        raise RuntimeError("Both source and target skinned meshes are required")

    previous_frame = scene.frame_current
    source_action = (
        source_rig.animation_data.action
        if source_rig.animation_data
        else None
    )
    target_action = (
        target_rig.animation_data.action
        if target_rig.animation_data
        else None
    )
    target_bounds = []
    source_bounds = []
    samples = []
    try:
        for frame in SAMPLE_FRAMES:
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            source_bounds.append(evaluated_mesh_bounds(scene, source_meshes))
            target_bounds.append(evaluated_mesh_bounds(scene, target_meshes))
            samples.append(
                {
                    "frame": frame,
                    "source": pose_sample(
                        source_rig,
                        (
                            "pelvis",
                            "foot_l",
                            "ball_l",
                            "foot_r",
                            "ball_r",
                            "hand_l",
                            "hand_r",
                        ),
                    ),
                    "targetFailedV1": pose_sample(
                        target_rig,
                        (
                            "Hips",
                            "LeftFoot",
                            "LeftToeBase",
                            "RightFoot",
                            "RightToeBase",
                            "LeftHand",
                            "RightHand",
                        ),
                    ),
                }
            )

        target_rig.animation_data.action = None
        for pose_bone in target_rig.pose.bones:
            pose_bone.matrix_basis.identity()
        scene.frame_set(SAMPLE_FRAMES[0])
        bpy.context.view_layer.update()
        target_rest_bounds = evaluated_mesh_bounds(scene, target_meshes)
        target_rest_pose = pose_sample(
            target_rig,
            (
                "Hips",
                "LeftFoot",
                "LeftToeBase",
                "RightFoot",
                "RightToeBase",
                "LeftHand",
                "RightHand",
            ),
        )
    finally:
        if target_rig.animation_data:
            target_rig.animation_data.action = target_action
        if source_rig.animation_data:
            source_rig.animation_data.action = source_action
        scene.frame_set(previous_frame)
        bpy.context.view_layer.update()

    chain_specs = {
        "leftLeg": (
            ("thigh_l", "calf_l", "foot_l", "ball_l"),
            ("LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase"),
        ),
        "rightLeg": (
            ("thigh_r", "calf_r", "foot_r", "ball_r"),
            ("RightUpLeg", "RightLeg", "RightFoot", "RightToeBase"),
        ),
        "leftArm": (
            ("clavicle_l", "upperarm_l", "lowerarm_l", "hand_l"),
            ("LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand"),
        ),
        "rightArm": (
            ("clavicle_r", "upperarm_r", "lowerarm_r", "hand_r"),
            ("RightShoulder", "RightArm", "RightForeArm", "RightHand"),
        ),
        "spine": (
            ("spine_01", "spine_03", "spine_05", "neck_01", "head"),
            ("Spine", "Spine01", "Spine02", "neck", "Head"),
        ),
    }
    chains = {}
    for label, (source_names, target_names) in chain_specs.items():
        source_length = chain_length(source_rig, source_names)
        target_length = chain_length(target_rig, target_names)
        chains[label] = {
            "sourceBones": list(source_names),
            "targetBones": list(target_names),
            "sourceLengthWorld": source_length,
            "targetLengthWorld": target_length,
            "targetToSourceRatio": round(
                target_length / max(source_length, 1.0e-8),
                6,
            ),
        }

    target_rest_diagonal = target_rest_bounds["diagonalWorld"]
    explosive = []
    for item in target_bounds:
        ratio = item["diagonalWorld"] / max(target_rest_diagonal, 1.0e-8)
        explosive.append(
            {
                "frame": item["frame"],
                "posedToRestDiagonalRatio": round(ratio, 6),
                "flagged": ratio > 1.25,
            }
        )

    report = {
        "schema": "dig-game-retarget-diagnostic-v1",
        "verdict": "failed-v1-incompatible-rest-space-transfer",
        "productionChanged": False,
        "sourceRig": transform_record(source_rig),
        "targetRig": transform_record(target_rig),
        "targetCandidateParent": (
            transform_record(target_rig.parent) if target_rig.parent else None
        ),
        "sourceBoneCount": len(source_rig.data.bones),
        "targetBoneCount": len(target_rig.data.bones),
        "sourceRootBones": [
            bone.name for bone in source_rig.data.bones if bone.parent is None
        ],
        "targetRootBones": [
            bone.name for bone in target_rig.data.bones if bone.parent is None
        ],
        "mappedBoneCount": len(PAIRS),
        "mappedBones": [
            bone_record(source_rig, target_rig, source, target)
            for target, source in PAIRS.items()
        ],
        "chainProportions": chains,
        "sourceBoundsByFrame": source_bounds,
        "targetFailedV1BoundsByFrame": target_bounds,
        "targetRestBounds": target_rest_bounds,
        "targetRestPose": target_rest_pose,
        "poseSamples": samples,
        "explosiveBoundsChecks": explosive,
        "knownAlgorithmDefects": [
            "v1 composes source pose/rest and target rest quaternions in armature space",
            "v1 ignores the different parent-local rest bases and bone rolls",
            "v1 keys rotations only and omits pelvis/root translation scaling",
            "v1 has no explicit retarget base pose or foot-contact correction",
            "v1 validates key motion totals but not anatomical or skinned-mesh stability",
        ],
    }
    REPORT_PATH.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    worst_basis = max(
        report["mappedBones"],
        key=lambda item: item["restBasisDifferenceDegrees"],
    )
    worst_direction = max(
        report["mappedBones"],
        key=lambda item: item["restDirectionDifferenceDegrees"],
    )
    print(
        "RETARGET_DIAGNOSTIC_OK "
        f"target={target_rig.name} "
        f"worstBasis={worst_basis['target']}:{worst_basis['restBasisDifferenceDegrees']} "
        f"worstDirection={worst_direction['target']}:{worst_direction['restDirectionDifferenceDegrees']} "
        f"report={REPORT_PATH}"
    )


if __name__ == "__main__":
    main()
