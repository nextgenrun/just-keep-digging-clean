"""Build a corrected, review-only Survival walk retarget for the Meshy miner.

The failed v1 copied armature-space quaternions between rigs with different
coordinate bases and also reversed the Meshy spine hierarchy. This pass:

* maps the spine by actual parent order;
* derives a rigid source-to-target facing transform from matching rest joints;
* drives each target chain from posed joint directions rather than bone tails;
* preserves the target's native rest roll and weights;
* transfers scaled pelvis sway and grounds the lowest foot contact each frame.

The source v1 .blend is never overwritten. A sibling v2 review bundle is saved.
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector


V1_ROOT = Path(__file__).resolve().parent
ROOT = V1_ROOT.parents[3]
ADDON_ROOT = ROOT / "testing" / "blender-animation-lab-v1" / "addon"
V2_ROOT = (
    ROOT
    / "testing"
    / "blender-animation-lab-v1"
    / "review-drafts"
    / "legacy-miner-walk-fit-v2"
)
V2_BLEND = V2_ROOT / "blender-animation-lab.blend"
REPORT_PATH = V2_ROOT / "fit-report.json"
RENDER_ROOT = V2_ROOT / "proof-renders"
V1_SESSION = "legacy-miner-walk-fit-v1"
V2_SESSION = "legacy-miner-walk-fit-v2"
SAMPLE_FRAMES = (1, 7, 12, 18)

sys.path.insert(0, str(ADDON_ROOT))
from dig_game_animation_lab.action_api import assign_action


# Target -> source. The Meshy target hierarchy is:
# Hips -> Spine02 -> Spine01 -> Spine -> neck -> Head.
CORRECTED_MAP = {
    "Hips": "pelvis",
    "LeftUpLeg": "thigh_l",
    "LeftLeg": "calf_l",
    "LeftFoot": "foot_l",
    "LeftToeBase": "ball_l",
    "RightUpLeg": "thigh_r",
    "RightLeg": "calf_r",
    "RightFoot": "foot_r",
    "RightToeBase": "ball_r",
    "Spine02": "spine_01",
    "Spine01": "spine_03",
    "Spine": "spine_05",
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

# Target driver -> matching target/source children. Multi-child entries give a
# stable best-fit orientation for the pelvis and upper torso.
DRIVER_CHILDREN = {
    "Hips": (
        ("LeftUpLeg", "thigh_l"),
        ("RightUpLeg", "thigh_r"),
        ("Spine02", "spine_01"),
    ),
    "LeftUpLeg": (("LeftLeg", "calf_l"),),
    "LeftLeg": (("LeftFoot", "foot_l"),),
    "LeftFoot": (("LeftToeBase", "ball_l"),),
    "RightUpLeg": (("RightLeg", "calf_r"),),
    "RightLeg": (("RightFoot", "foot_r"),),
    "RightFoot": (("RightToeBase", "ball_r"),),
    "Spine02": (("Spine01", "spine_03"),),
    "Spine01": (("Spine", "spine_05"),),
    "Spine": (
        ("neck", "neck_01"),
        ("LeftShoulder", "clavicle_l"),
        ("RightShoulder", "clavicle_r"),
    ),
    "neck": (("Head", "head"),),
    "LeftShoulder": (("LeftArm", "upperarm_l"),),
    "LeftArm": (("LeftForeArm", "lowerarm_l"),),
    "LeftForeArm": (("LeftHand", "hand_l"),),
    "RightShoulder": (("RightArm", "upperarm_r"),),
    "RightArm": (("RightForeArm", "lowerarm_r"),),
    "RightForeArm": (("RightHand", "hand_r"),),
}

CONTACT_BONES = (
    "LeftFoot",
    "LeftToeBase",
    "RightFoot",
    "RightToeBase",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def rounded(values, digits: int = 6) -> list[float]:
    return [round(float(value), digits) for value in values]


def target_parts(scene: bpy.types.Scene) -> list[bpy.types.Object]:
    return [
        obj
        for obj in scene.objects
        if obj.get("dgal_session") == V1_SESSION
        and obj.get("dgal_role") == "mesh-candidate-part"
    ]


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


def world_rest_head(rig: bpy.types.Object, name: str) -> Vector:
    return rig.matrix_world @ rig.data.bones[name].head_local


def world_pose_head(rig: bpy.types.Object, name: str) -> Vector:
    return rig.matrix_world @ rig.pose.bones[name].head


def _kabsch_rotation(
    source_vectors: list[Vector],
    target_vectors: list[Vector],
) -> Matrix:
    if len(source_vectors) != len(target_vectors) or not source_vectors:
        raise ValueError("Kabsch requires matching non-empty vector lists")
    source = np.asarray(
        [[float(value) for value in vector] for vector in source_vectors],
        dtype=np.float64,
    )
    target = np.asarray(
        [[float(value) for value in vector] for vector in target_vectors],
        dtype=np.float64,
    )
    covariance = source.T @ target
    left, _, right_t = np.linalg.svd(covariance)
    rotation = right_t.T @ left.T
    if np.linalg.det(rotation) < 0.0:
        right_t[-1, :] *= -1.0
        rotation = right_t.T @ left.T
    return Matrix(rotation.tolist())


def rest_alignment(
    source_rig: bpy.types.Object,
    target_rig: bpy.types.Object,
) -> tuple[Matrix, float, float]:
    labels = list(CORRECTED_MAP)
    source_points = [
        world_rest_head(source_rig, CORRECTED_MAP[target])
        for target in labels
    ]
    target_points = [
        world_rest_head(target_rig, target)
        for target in labels
    ]
    source_center = sum(source_points, Vector()) / len(source_points)
    target_center = sum(target_points, Vector()) / len(target_points)
    source_centered = [point - source_center for point in source_points]
    target_centered = [point - target_center for point in target_points]
    rotation = _kabsch_rotation(source_centered, target_centered)
    denominator = sum(vector.length_squared for vector in source_centered)
    scale = sum(
        (rotation @ source).dot(target)
        for source, target in zip(source_centered, target_centered)
    ) / max(denominator, 1.0e-12)
    residual = math.sqrt(
        sum(
            (
                (rotation @ source) * scale
                - target
            ).length_squared
            for source, target in zip(source_centered, target_centered)
        )
        / len(source_centered)
    )
    return rotation, float(scale), float(residual)


def local_rest_offset(
    rig: bpy.types.Object,
    parent_name: str,
    child_name: str,
) -> Vector:
    parent = rig.data.bones[parent_name]
    child = rig.data.bones[child_name]
    rest_rotation = parent.matrix_local.to_quaternion()
    return rest_rotation.inverted() @ (
        child.head_local - parent.head_local
    )


def desired_source_direction(
    source_rig: bpy.types.Object,
    source_parent: str,
    source_child: str,
    source_to_target_world: Matrix,
    target_world_to_armature: Matrix,
) -> Vector:
    source_world = (
        world_pose_head(source_rig, source_child)
        - world_pose_head(source_rig, source_parent)
    )
    target_world = source_to_target_world @ source_world
    target_armature = target_world_to_armature @ target_world
    if target_armature.length < 1.0e-8:
        raise RuntimeError(
            f"Zero-length posed segment {source_parent}->{source_child}"
        )
    return target_armature.normalized()


def desired_driver_rotation(
    source_rig: bpy.types.Object,
    target_rig: bpy.types.Object,
    target_name: str,
    source_to_target_world: Matrix,
    target_world_to_armature: Matrix,
) -> Quaternion:
    source_parent = CORRECTED_MAP[target_name]
    children = DRIVER_CHILDREN[target_name]
    desired = [
        desired_source_direction(
            source_rig,
            source_parent,
            source_child,
            source_to_target_world,
            target_world_to_armature,
        )
        for _, source_child in children
    ]
    target_rest = target_rig.data.bones[target_name]
    rest_rotation = target_rest.matrix_local.to_quaternion()
    local_offsets = [
        local_rest_offset(target_rig, target_name, target_child).normalized()
        for target_child, _ in children
    ]
    if len(children) > 1:
        return _kabsch_rotation(local_offsets, desired).to_quaternion()
    rest_direction = (rest_rotation @ local_offsets[0]).normalized()
    return (
        rest_direction.rotation_difference(desired[0])
        @ rest_rotation
    ).normalized()


def target_pose_head_from_parent(
    target_rig: bpy.types.Object,
    target_name: str,
) -> Vector:
    data_bone = target_rig.data.bones[target_name]
    if data_bone.parent is None:
        return data_bone.head_local.copy()
    parent_pose = target_rig.pose.bones[data_bone.parent.name]
    local_rest = (
        data_bone.parent.matrix_local.inverted_safe()
        @ data_bone.matrix_local
    )
    return (parent_pose.matrix @ local_rest).translation


def set_global_pose(
    target_rig: bpy.types.Object,
    target_name: str,
    rotation: Quaternion,
    head: Vector | None = None,
) -> None:
    pose_bone = target_rig.pose.bones[target_name]
    pose_bone.rotation_mode = "QUATERNION"
    pose_bone.matrix = Matrix.LocRotScale(
        head if head is not None else target_pose_head_from_parent(
            target_rig,
            target_name,
        ),
        rotation,
        Vector((1.0, 1.0, 1.0)),
    )


def angle_degrees(a: Vector, b: Vector) -> float:
    if a.length < 1.0e-8 or b.length < 1.0e-8:
        return 0.0
    return math.degrees(a.angle(b))


def pose_direction_errors(
    source_rig: bpy.types.Object,
    target_rig: bpy.types.Object,
    source_to_target_world: Matrix,
) -> list[dict]:
    output = []
    for target_parent, children in DRIVER_CHILDREN.items():
        source_parent = CORRECTED_MAP[target_parent]
        for target_child, source_child in children:
            desired = source_to_target_world @ (
                world_pose_head(source_rig, source_child)
                - world_pose_head(source_rig, source_parent)
            )
            actual = (
                world_pose_head(target_rig, target_child)
                - world_pose_head(target_rig, target_parent)
            )
            output.append(
                {
                    "source": f"{source_parent}->{source_child}",
                    "target": f"{target_parent}->{target_child}",
                    "degrees": round(angle_degrees(desired, actual), 3),
                }
            )
    return output


def evaluated_mesh_bounds(
    scene: bpy.types.Scene,
    objects: list[bpy.types.Object],
) -> dict:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    minimum = Vector((float("inf"), float("inf"), float("inf")))
    maximum = Vector((float("-inf"), float("-inf"), float("-inf")))
    count = 0
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
                count += 1
        finally:
            evaluated.to_mesh_clear()
    dimensions = maximum - minimum
    return {
        "frame": scene.frame_current,
        "vertices": count,
        "minimumWorld": rounded(minimum),
        "maximumWorld": rounded(maximum),
        "dimensionsWorld": rounded(dimensions),
        "diagonalWorld": round(dimensions.length, 6),
    }


def render_proof(
    scene: bpy.types.Scene,
    source_rig: bpy.types.Object,
    target_rig: bpy.types.Object,
    source_meshes: list[bpy.types.Object],
    target_meshes: list[bpy.types.Object],
    failed_action: bpy.types.Action,
    corrected_action: bpy.types.Action,
) -> list[dict]:
    RENDER_ROOT.mkdir(parents=True, exist_ok=True)
    outputs = []
    tracked = [*source_meshes, *target_meshes]
    hidden = {obj: obj.hide_render for obj in tracked}
    previous = {
        "frame": scene.frame_current,
        "x": scene.render.resolution_x,
        "y": scene.render.resolution_y,
        "percentage": scene.render.resolution_percentage,
        "format": scene.render.image_settings.file_format,
        "mode": scene.render.image_settings.color_mode,
        "transparent": scene.render.film_transparent,
        "filepath": scene.render.filepath,
    }
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    try:
        for frame in SAMPLE_FRAMES:
            for label, show_source, action in (
                ("source-survival", True, corrected_action),
                ("failed-v1-meshy", False, failed_action),
                ("corrected-v2-meshy", False, corrected_action),
            ):
                assign_action(target_rig, action)
                for obj in source_meshes:
                    obj.hide_render = not show_source
                for obj in target_meshes:
                    obj.hide_render = show_source
                scene.frame_set(frame)
                bpy.context.view_layer.update()
                output = RENDER_ROOT / f"{label}-frame-{frame:04d}.png"
                scene.render.filepath = str(output)
                bpy.ops.render.render(write_still=True)
                outputs.append(
                    {
                        "label": label,
                        "frame": frame,
                        "path": str(output.relative_to(ROOT)),
                        "sha256": sha256(output),
                    }
                )
    finally:
        assign_action(target_rig, corrected_action)
        for obj, value in hidden.items():
            obj.hide_render = value
        scene.frame_set(previous["frame"])
        scene.render.resolution_x = previous["x"]
        scene.render.resolution_y = previous["y"]
        scene.render.resolution_percentage = previous["percentage"]
        scene.render.image_settings.file_format = previous["format"]
        scene.render.image_settings.color_mode = previous["mode"]
        scene.render.film_transparent = previous["transparent"]
        scene.render.filepath = previous["filepath"]
    return outputs


def main() -> None:
    scene = bpy.context.scene
    source_rig = bpy.data.objects.get("root")
    parts = target_parts(scene)
    target_rig = next(
        (obj for obj in parts if obj.type == "ARMATURE"),
        None,
    )
    if source_rig is None or source_rig.type != "ARMATURE":
        raise RuntimeError("Source Survival armature 'root' is missing")
    if target_rig is None:
        raise RuntimeError("Target Meshy armature is missing")
    source_meshes = rigged_meshes(scene, source_rig)
    target_meshes = rigged_meshes(scene, target_rig)
    if not source_meshes or not target_meshes:
        raise RuntimeError("Both source and target skinned meshes are required")
    missing = [
        [target, source]
        for target, source in CORRECTED_MAP.items()
        if target_rig.data.bones.get(target) is None
        or source_rig.data.bones.get(source) is None
    ]
    if missing:
        raise RuntimeError(f"Corrected mapping is incomplete: {missing}")

    failed_action = (
        target_rig.animation_data.action
        if target_rig.animation_data
        else None
    )
    source_action = (
        source_rig.animation_data.action
        if source_rig.animation_data
        else None
    )
    if failed_action is None or source_action is None:
        raise RuntimeError("Both source and failed-v1 actions are required")

    first = int(math.floor(source_action.frame_range[0]))
    last = int(math.ceil(source_action.frame_range[1]))
    source_to_target_world, character_scale, rest_residual = rest_alignment(
        source_rig,
        target_rig,
    )
    target_world_to_armature = (
        target_rig.matrix_world.inverted_safe().to_3x3()
    )

    # Mean pelvis position keeps an in-place loop centered while preserving sway.
    pelvis_world_by_frame = {}
    for frame in range(first, last + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        pelvis_world_by_frame[frame] = world_pose_head(
            source_rig,
            "pelvis",
        ).copy()
    mean_pelvis = (
        sum(pelvis_world_by_frame.values(), Vector())
        / len(pelvis_world_by_frame)
    )

    target_rest_hips_world = world_rest_head(target_rig, "Hips")
    rest_contact_z = min(
        world_rest_head(target_rig, name).z
        for name in CONTACT_BONES
    )

    action_name = "DGAL_MESHY_CORRECTED_locomotion-jog"
    stale = bpy.data.actions.get(action_name)
    if stale:
        if target_rig.animation_data and target_rig.animation_data.action == stale:
            target_rig.animation_data.action = None
        bpy.data.actions.remove(stale)
    corrected_action = bpy.data.actions.new(action_name)
    corrected_action.use_fake_user = True
    corrected_action["dgal_meshy_retarget"] = True
    corrected_action["dgal_retarget_version"] = 2
    corrected_action["dgal_source_action"] = source_action.name
    corrected_action["productionChanged"] = False
    assign_action(target_rig, corrected_action)

    driver_order = sorted(
        DRIVER_CHILDREN,
        key=lambda name: len(target_rig.data.bones[name].parent_recursive),
    )
    frame_metrics = []
    previous_frame = scene.frame_current
    try:
        for frame in range(first, last + 1):
            scene.frame_set(frame)
            for pose_bone in target_rig.pose.bones:
                pose_bone.matrix_basis.identity()
            bpy.context.view_layer.update()

            source_offset_world = (
                pelvis_world_by_frame[frame] - mean_pelvis
            )
            desired_hips_world = (
                target_rest_hips_world
                + (source_to_target_world @ source_offset_world)
                * character_scale
            )
            desired_hips_armature = (
                target_rig.matrix_world.inverted_safe()
                @ desired_hips_world
            )

            for target_name in driver_order:
                rotation = desired_driver_rotation(
                    source_rig,
                    target_rig,
                    target_name,
                    source_to_target_world,
                    target_world_to_armature,
                )
                set_global_pose(
                    target_rig,
                    target_name,
                    rotation,
                    desired_hips_armature
                    if target_name == "Hips"
                    else None,
                )
                bpy.context.view_layer.update()

            # Ground the lowest foot/toe joint while retaining horizontal sway.
            current_contact_z = min(
                world_pose_head(target_rig, name).z
                for name in CONTACT_BONES
            )
            correction = rest_contact_z - current_contact_z
            hips_pose = target_rig.pose.bones["Hips"]
            hips_world = target_rig.matrix_world @ hips_pose.head
            hips_world.z += correction
            hips_matrix = hips_pose.matrix.copy()
            hips_matrix.translation = (
                target_rig.matrix_world.inverted_safe() @ hips_world
            )
            hips_pose.matrix = hips_matrix
            bpy.context.view_layer.update()

            errors = pose_direction_errors(
                source_rig,
                target_rig,
                source_to_target_world,
            )
            contact_after = min(
                world_pose_head(target_rig, name).z
                for name in CONTACT_BONES
            )
            frame_metrics.append(
                {
                    "frame": frame,
                    "meanDirectionErrorDegrees": round(
                        sum(item["degrees"] for item in errors) / len(errors),
                        3,
                    ),
                    "maxDirectionErrorDegrees": max(
                        item["degrees"] for item in errors
                    ),
                    "groundCorrectionWorldZ": round(correction, 6),
                    "lowestFootJointWorldZ": round(contact_after, 6),
                    "segments": errors,
                }
            )

            for target_name in driver_order:
                pose_bone = target_rig.pose.bones[target_name]
                pose_bone.keyframe_insert(
                    "rotation_quaternion",
                    frame=frame,
                    group=target_name,
                )
            target_rig.pose.bones["Hips"].keyframe_insert(
                "location",
                frame=frame,
                group="Hips",
            )
    finally:
        scene.frame_set(previous_frame)

    assign_action(target_rig, corrected_action)
    target_rig["dgal_session"] = V2_SESSION
    target_rig["dgal_mapped_bones"] = len(CORRECTED_MAP)
    target_rig["dgal_driven_bones"] = len(DRIVER_CHILDREN)
    target_rig["dgal_retarget_action"] = corrected_action.name
    target_rig["dgal_retarget_version"] = 2
    for obj in parts:
        obj["dgal_review_origin_session"] = V1_SESSION
        obj["dgal_review_corrected_session"] = V2_SESSION
    scene["productionChanged"] = False

    corrected_bounds = []
    for frame in SAMPLE_FRAMES:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        corrected_bounds.append(
            evaluated_mesh_bounds(scene, target_meshes)
        )
    renders = render_proof(
        scene,
        source_rig,
        target_rig,
        source_meshes,
        target_meshes,
        failed_action,
        corrected_action,
    )

    all_segment_errors = [
        segment["degrees"]
        for frame in frame_metrics
        for segment in frame["segments"]
    ]
    report = {
        "schema": "dig-game-legacy-miner-mesh-fit-review-v2",
        "session": V2_SESSION,
        "verdict": "corrected-review-candidate",
        "productionChanged": False,
        "sourceBlend": str(
            (V1_ROOT / "blender-animation-lab.blend").relative_to(ROOT)
        ),
        "sourceAction": source_action.name,
        "failedV1Action": failed_action.name,
        "correctedAction": corrected_action.name,
        "frameRange": [first, last],
        "sampleFrames": list(SAMPLE_FRAMES),
        "diagnosis": {
            "failedV1": [
                "armature-space rotations crossed incompatible rig bases",
                "Meshy spine order was mapped backwards",
                "pelvis translation and ground contact were omitted",
                "key totals were mistaken for deformation validation",
            ],
            "correctedV2": [
                "rest-joint Kabsch facing alignment",
                "hierarchy-correct spine mapping",
                "joint-direction chain solving with native target rest roll",
                "scaled pelvis sway and per-frame lowest-foot grounding",
            ],
        },
        "alignment": {
            "sourceToTargetWorldMatrix3x3": [
                rounded(row) for row in source_to_target_world
            ],
            "sourceToTargetWorldQuaternionWXYZ": rounded(
                source_to_target_world.to_quaternion()
            ),
            "sourceToTargetWorldEulerDegreesXYZ": rounded(
                [
                    math.degrees(value)
                    for value in source_to_target_world.to_euler("XYZ")
                ],
                3,
            ),
            "characterScale": round(character_scale, 6),
            "restJointRmsResidualWorld": round(rest_residual, 6),
        },
        "mapping": CORRECTED_MAP,
        "mappedBones": len(CORRECTED_MAP),
        "drivenBones": len(DRIVER_CHILDREN),
        "motionValidation": {
            "meanSegmentDirectionErrorDegrees": round(
                sum(all_segment_errors) / len(all_segment_errors),
                3,
            ),
            "maxSegmentDirectionErrorDegrees": max(all_segment_errors),
            "restContactJointWorldZ": round(rest_contact_z, 6),
            "frames": frame_metrics,
        },
        "correctedBoundsBySampleFrame": corrected_bounds,
        "renders": renders,
        "reviewBundle": {
            "blend": str(V2_BLEND.relative_to(ROOT)),
            "report": str(REPORT_PATH.relative_to(ROOT)),
        },
    }
    V2_ROOT.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    (V2_ROOT / "readme.md").write_text(
        "# Legacy Miner walk fit v2 - corrected review candidate\n\n"
        "This is an isolated correction of the visibly broken v1 proof. It uses "
        "the real Meshy GLB and native weights. The spine is mapped by actual "
        "hierarchy, animation is solved from joint directions in a fitted common "
        "coordinate frame, pelvis sway is scaled, and foot contact is grounded. "
        "Nothing here is loaded by the game runtime.\n\n"
        "The proof renders include the source Survival motion, the failed v1 "
        "Meshy transfer, and this corrected v2 Meshy transfer at identical frames.\n",
        encoding="utf-8",
    )
    scene.frame_set(first)
    assign_action(target_rig, corrected_action)
    bpy.ops.wm.save_as_mainfile(filepath=str(V2_BLEND))
    print(
        "LEGACY_MINER_WALK_V2_OK "
        f"mapped={len(CORRECTED_MAP)} "
        f"driven={len(DRIVER_CHILDREN)} "
        f"meanError={report['motionValidation']['meanSegmentDirectionErrorDegrees']} "
        f"maxError={report['motionValidation']['maxSegmentDirectionErrorDegrees']} "
        f"report={REPORT_PATH}"
    )


if __name__ == "__main__":
    main()
