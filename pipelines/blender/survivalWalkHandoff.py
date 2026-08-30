"""Build phase-continuous idle/Standard Walk handoff poses for rendering."""

from __future__ import annotations

from pathlib import Path
from typing import Callable

import bpy
from mathutils import Vector

import mixamoSurvivalRetarget as retarget
import survivalUnifiedPoses as poses


def _source_positions(scene, source_rig, samples, source_hip_bone):
    positions = []
    for source_frame in samples:
        poses.set_frame(scene, source_frame)
        positions.append(
            retarget.world_pose_head(source_rig, source_hip_bone).copy()
        )
    return positions


def _capture_walk_poses(
    scene,
    target_rig,
    finger_pose,
    source_path: Path,
    spec,
    retarget_spec,
    target_ground,
    contact_bones,
):
    source_rig, action, imported, actions = poses.import_fbx(source_path)
    try:
        alignment, scale, residual = retarget.rest_alignment(
            source_rig,
            target_rig,
            retarget_spec["boneMap"],
        )
        samples = poses.sampled_frames(
            action,
            int(spec["walkFrameCount"]),
            True,
        )
        positions = _source_positions(
            scene,
            source_rig,
            samples,
            retarget_spec.get("sourceHipBone", "mixamorig:Hips"),
        )
        reference = sum(positions, Vector()) / len(positions)
        walk_poses = []
        for source_frame, position in zip(samples, positions):
            poses.set_frame(scene, source_frame)
            offset = alignment @ (position - reference)
            offset.x = 0.0
            offset.y = 0.0
            offset.z = 0.0
            retarget.apply_pose(
                source_rig,
                target_rig,
                retarget_spec,
                alignment,
                scale,
                finger_pose,
                offset,
            )
            poses.lock_ground(target_rig, target_ground, contact_bones)
            walk_poses.append(poses.capture_pose(target_rig))
        return walk_poses, residual, samples, action.name
    finally:
        poses.cleanup(imported, actions)


def render(
    scene,
    target_rig,
    finger_pose,
    secondary,
    sheet_key: str,
    spec,
    source_path: Path,
    retarget_spec,
    render_frame: Callable,
):
    """Render one start plus every phase-matched stop from Standard Walk."""
    contact_bones = retarget_spec["groundContactBones"]
    target_ground = poses.target_ground_height(target_rig, contact_bones)
    walk_poses, residual, samples, action_name = _capture_walk_poses(
        scene,
        target_rig,
        finger_pose,
        source_path,
        spec,
        retarget_spec,
        target_ground,
        contact_bones,
    )
    idle_action = bpy.data.actions[spec["idleAction"]]
    idle_pose = poses.direct_action_pose(
        scene,
        target_rig,
        idle_action,
        float(spec["idleFrame"]),
    )
    poses.restore_pose(target_rig, idle_pose)
    poses.lock_ground(target_rig, target_ground, contact_bones)
    idle_pose = poses.capture_pose(target_rig)
    full_weights = {bone.name: 1.0 for bone in target_rig.pose.bones}
    rendered = []

    for walk_frame, walk_weight in zip(
        spec["start"]["walkFrames"],
        spec["start"]["walkBlendWeights"],
    ):
        rendered.append(poses.blend_poses(
            idle_pose,
            walk_poses[int(walk_frame)],
            full_weights,
            float(walk_weight),
        ))

    walk_count = len(walk_poses)
    for phase in spec["stop"]["phases"]:
        for step, idle_weight in enumerate(spec["stop"]["idleBlendWeights"]):
            walk_pose = walk_poses[(int(phase) + step) % walk_count]
            rendered.append(poses.blend_poses(
                walk_pose,
                idle_pose,
                full_weights,
                float(idle_weight),
            ))

    expected = int(spec["frames"])
    if len(rendered) != expected:
        raise RuntimeError(
            f"{sheet_key}: built {len(rendered)} handoff frames, expected {expected}"
        )
    for index, pose in enumerate(rendered):
        poses.restore_pose(target_rig, pose)
        poses.lock_ground(target_rig, target_ground, contact_bones)
        render_frame(
            scene,
            sheet_key,
            index,
            secondary,
            expected,
            False,
        )
    return {
        "mode": spec["mode"],
        "sourceAction": action_name,
        "sourceSamples": samples,
        "residual": residual,
        "startFrames": len(spec["start"]["walkFrames"]),
        "stopPhases": list(spec["stop"]["phases"]),
        "stopFramesPerPhase": len(spec["stop"]["idleBlendWeights"]),
    }
