"""Refresh the isolated fit using the current Jog_Fwd_Loop FBX directly."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy


SESSION_ROOT = Path(__file__).resolve().parent
ROOT = SESSION_ROOT.parents[3]
ADDON_ROOT = ROOT / "testing" / "blender-animation-lab-v1" / "addon"
CURRENT_WALK_FBX = (
    ROOT
    / "testing"
    / "unreal-survival-motion-v2"
    / "SourceAssets"
    / "ual-exports"
    / "survival-ual-jog-fwd-loop.fbx"
)
REPORT_PATH = SESSION_ROOT / "fit-report.json"

sys.path.insert(0, str(SESSION_ROOT))
sys.path.insert(0, str(ADDON_ROOT))

import build_review
import dig_game_animation_lab as addon
from dig_game_animation_lab import action_api, mesh_fit_ops
from dig_game_animation_lab.meshy_retarget import bake_mapped_action


def import_current_walk(canonical: bpy.types.Object) -> bpy.types.Action:
    if not CURRENT_WALK_FBX.is_file():
        raise FileNotFoundError(CURRENT_WALK_FBX)
    before_objects = set(bpy.data.objects)
    before_actions = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(
        filepath=str(CURRENT_WALK_FBX),
        automatic_bone_orientation=False,
        use_anim=True,
    )
    imported_objects = [obj for obj in bpy.data.objects if obj not in before_objects]
    imported_rigs = [obj for obj in imported_objects if obj.type == "ARMATURE"]
    if len(imported_rigs) != 1:
        raise RuntimeError(
            f"Expected one current-walk carrier rig, found {len(imported_rigs)}"
        )
    source_rig = imported_rigs[0]
    source_action = (
        source_rig.animation_data.action
        if source_rig.animation_data
        else None
    )
    if source_action is None or source_action in before_actions:
        raise RuntimeError("The current walk FBX has no unique animation action")
    required = {
        "pelvis",
        "thigh_l",
        "calf_l",
        "foot_l",
        "thigh_r",
        "calf_r",
        "foot_r",
        "spine_01",
        "spine_03",
        "spine_05",
        "upperarm_l",
        "lowerarm_l",
        "hand_l",
        "upperarm_r",
        "lowerarm_r",
        "hand_r",
        "neck_01",
        "head",
    }
    missing = sorted(required - {bone.name for bone in source_rig.data.bones})
    if missing:
        raise RuntimeError(f"The current walk carrier is missing bones: {missing}")

    action = source_action.copy()
    action.name = "DGAL_CURRENT_locomotion-jog"
    action.use_fake_user = True
    action["dgal_review_current_source"] = True
    action["dgal_source_fbx"] = CURRENT_WALK_FBX.relative_to(ROOT).as_posix()
    action["productionChanged"] = False
    action_api.assign_action(canonical, action)

    for obj in imported_objects:
        bpy.data.objects.remove(obj, do_unlink=True)
    for imported in [
        candidate
        for candidate in bpy.data.actions
        if candidate not in before_actions and candidate != action
    ]:
        if imported.users == 0:
            bpy.data.actions.remove(imported)
    return action


def main() -> None:
    if not hasattr(bpy.types.Scene, "dgal"):
        addon.register()
    scene = bpy.context.scene
    state = scene.dgal
    state.session_name = build_review.SESSION_NAME
    scene["productionChanged"] = False

    canonical = bpy.data.objects.get("root")
    reference = bpy.data.objects.get("Body3")
    if canonical is None or canonical.type != "ARMATURE" or reference is None:
        raise RuntimeError("The isolated review blend lost the Survival reference rig")
    current_action = import_current_walk(canonical)
    state.active_rig = canonical
    state.reference_mesh = reference
    state.active_action_source = (
        f"current direct FBX: {CURRENT_WALK_FBX.relative_to(ROOT).as_posix()}"
    )
    first = math.floor(current_action.frame_range[0])
    last = math.ceil(current_action.frame_range[1])
    state.frame_start = first
    state.frame_end = last
    scene.frame_start = first
    scene.frame_end = last
    scene.frame_set(first)

    candidate_objects = mesh_fit_ops.candidate_objects(state)
    target_rig = next(
        (obj for obj in candidate_objects if obj and obj.type == "ARMATURE"),
        None,
    )
    candidate_meshes = mesh_fit_ops.candidate_meshes(state)
    if target_rig is None or not candidate_meshes:
        raise RuntimeError("The isolated review blend lost the Legacy Miner candidate")
    target_action, mapped_bones = bake_mapped_action(
        scene,
        canonical,
        target_rig,
        first,
        last,
    )
    if mapped_bones < 22:
        raise RuntimeError(f"Expected at least 22 mapped bones, found {mapped_bones}")

    frames = build_review.sample_frames(first, last)
    arm_motion = build_review.rotation_motion_degrees(
        scene,
        target_rig,
        frames,
        ("LeftArm", "LeftForeArm", "RightArm", "RightForeArm"),
    )
    leg_motion = build_review.rotation_motion_degrees(
        scene,
        target_rig,
        frames,
        ("LeftUpLeg", "LeftLeg", "RightUpLeg", "RightLeg"),
    )
    renders = build_review.render_comparison(scene, state, mesh_fit_ops, frames)
    build_review.require_finished(
        bpy.ops.dgal.export_review_bundle(),
        "export refreshed review bundle",
    )

    report = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    report["sourceCharacter"] = {
        "profile": "survival-ual-player-v1",
        "clipId": "walk",
        "sourceClip": "Jog_Fwd_Loop",
        "sourceMode": "direct current FBX; shared stale master bypassed",
        "currentCarrier": build_review.source_record(
            CURRENT_WALK_FBX,
            "Current Jog_Fwd_Loop FBX imported directly into this review copy",
        ),
        "action": current_action.name,
        "frameRange": [first, last],
        "sampleFrames": frames,
    }
    report["fit"].update(
        {
            "mappedBones": mapped_bones,
            "armMotionDegreesAcrossSamples": arm_motion,
            "legMotionDegreesAcrossSamples": leg_motion,
            "retargetAction": target_action.name,
            "currentCarrierDirect": True,
        }
    )
    report["renders"] = renders
    report["productionChanged"] = False
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        "LEGACY_MINER_CURRENT_WALK_REFRESH_OK "
        f"mappedBones={mapped_bones} "
        f"range={first}-{last} "
        f"armMotion={arm_motion} "
        f"legMotion={leg_motion} "
        f"report={REPORT_PATH}"
    )


if __name__ == "__main__":
    main()
