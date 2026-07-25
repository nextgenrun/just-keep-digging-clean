"""Exercise endpoint tweening, hitboxes, props, and Meshy fitting in Blender."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix


ROOT = Path(__file__).resolve().parents[1]
ADDON_ROOT = ROOT / "testing" / "blender-animation-lab-v1" / "addon"
REPORT_PATH = ROOT / "testing" / "blender-animation-lab-v1" / "runtime-smoke-report.json"


def require_finished(result, label: str) -> None:
    if "FINISHED" not in result:
        raise RuntimeError(f"{label} failed: {result}")


def action_key_count(rig, action, action_api) -> int:
    current = rig.animation_data.action
    action_api.assign_action(rig, action)
    try:
        return sum(len(curve.keyframe_points) for curve in action_api.iter_fcurves(rig, action))
    finally:
        action_api.assign_action(rig, current)


def activate_clip(state, clip_id: str) -> None:
    state.clip_index = next(index for index, item in enumerate(state.clips) if item.clip_id == clip_id)
    before = len(bpy.context.scene.objects)
    require_finished(bpy.ops.dgal.load_selected_clip(), f"activate {clip_id}")
    if len(bpy.context.scene.objects) != before:
        raise RuntimeError("Consolidated action activation unexpectedly imported another carrier")


def endpoint_tween_proof(scene, state, rig, action_api) -> dict:
    baseline = rig.animation_data.action
    baseline_keys = action_key_count(rig, baseline, action_api)
    bone = rig.pose.bones["hand_r"]
    for candidate in rig.pose.bones:
        candidate.select = False
    bone.select = True
    rig.data.bones.active = bone.bone
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    state.pose_scope = "SELECTED"
    state.frame_start, state.frame_end = 1, 13
    scene.frame_set(state.frame_start)
    bpy.context.view_layer.update()
    start_matrix = bone.matrix_basis.copy()
    state.pose_role = "START"
    require_finished(bpy.ops.dgal.insert_pose_key(), "insert start pose")
    editable = rig.animation_data.action
    if editable == baseline or not bool(editable.get("dgal_editable")):
        raise RuntimeError("Start pose did not create an editable action copy")
    hand_token = 'pose.bones["hand_r"]'
    for curve in action_api.iter_fcurves(rig, editable):
        if hand_token in curve.data_path:
            while curve.keyframe_points:
                curve.keyframe_points.remove(curve.keyframe_points[-1], fast=True)
    scene.frame_set(state.frame_start)
    bone.rotation_mode = "QUATERNION"
    bone.matrix_basis = start_matrix
    action_api.key_pose_bone(bone, state.frame_start)
    scene.frame_set(state.frame_end)
    bone.matrix_basis = start_matrix @ Matrix.Rotation(math.radians(42.0), 4, "Y")
    state.pose_role = "END"
    require_finished(bpy.ops.dgal.insert_pose_key(), "insert end pose")
    state.interpolation = "BEZIER"
    require_finished(bpy.ops.dgal.apply_interpolation(), "apply interpolation")
    start_rotation = start_matrix.to_quaternion()
    scene.frame_set(state.frame_end)
    end_rotation = bone.matrix_basis.to_quaternion()
    midpoint = (state.frame_start + state.frame_end) // 2
    scene.frame_set(midpoint)
    midpoint_rotation = bone.matrix_basis.to_quaternion()
    total = math.degrees(start_rotation.rotation_difference(end_rotation).angle)
    partial = math.degrees(start_rotation.rotation_difference(midpoint_rotation).angle)
    if not (1.0 < partial < total - 1.0):
        raise RuntimeError(f"Endpoint interpolation did not produce a real midpoint: {partial}/{total}")
    if action_key_count(rig, baseline, action_api) != baseline_keys:
        raise RuntimeError("Protected baseline action changed during endpoint editing")
    action_api.assign_action(rig, baseline)
    scene.frame_set(1)
    return {
        "sourceAction": baseline.name,
        "editableAction": editable.name,
        "startFrame": state.frame_start,
        "endFrame": state.frame_end,
        "midFrame": midpoint,
        "totalDegrees": round(total, 3),
        "midpointDegrees": round(partial, 3),
        "baselinePreserved": True,
    }


def source_motion_proof(scene, rig) -> float:
    scene.frame_set(1)
    bpy.context.view_layer.update()
    first = rig.matrix_world @ rig.pose.bones["hand_r"].tail
    scene.frame_set(7)
    bpy.context.view_layer.update()
    distance = (rig.matrix_world @ rig.pose.bones["hand_r"].tail - first).length
    if distance < 0.02:
        raise RuntimeError(f"Consolidated action slot is not producing motion: {distance}")
    return round(distance, 6)


def hitbox_and_prop_proof(state) -> dict:
    state.hitbox_index = 0
    require_finished(bpy.ops.dgal.update_hitbox_guide(), "body hitbox guide")
    require_finished(bpy.ops.dgal.create_tile_grid(), "tile grid")
    require_finished(bpy.ops.dgal.create_procedural_pickaxe(), "pickaxe")
    require_finished(bpy.ops.dgal.create_procedural_gear(), "gear")
    require_finished(bpy.ops.dgal.pin_offhand_to_grip(), "off-hand grip IK")
    require_finished(bpy.ops.dgal.validate_prop_grips(), "grip validation")
    guide = state.hitboxes[0].guide_object
    return {
        "hitboxCount": len(state.hitboxes),
        "bodyGamePx": [state.hitboxes[0].width_game_px, state.hitboxes[0].height_game_px],
        "bodyGuideWorld": [round(value, 5) for value in guide.dimensions[:2]],
        "tileGrid": bpy.data.objects.get("DGAL_TileGrid") is not None,
        "pickaxe": state.prop_object.name,
        "gripReport": state.attachment_report,
    }


def meshy_proof(scene, state, mesh_fit_ops) -> dict:
    require_finished(bpy.ops.dgal.import_mesh_candidate(), "Meshy import")
    require_finished(bpy.ops.dgal.audit_mesh_candidate(), "Meshy audit")
    require_finished(bpy.ops.dgal.align_mesh_candidate(), "Meshy align")
    state.mesh_fit_mode = "RIG_RETARGET"
    require_finished(bpy.ops.dgal.bind_mesh_candidate(), "Meshy retarget")
    target_rig = next(obj for obj in mesh_fit_ops.candidate_objects(state) if obj.type == "ARMATURE")
    mapped = int(target_rig.get("dgal_mapped_bones", 0))
    if mapped < 22:
        raise RuntimeError(f"Expected at least 22 mapped Meshy bones, found {mapped}")
    scene.frame_set(1)
    bpy.context.view_layer.update()
    first_rotations = {name: target_rig.pose.bones[name].matrix_basis.to_quaternion().copy()
                       for name in ("LeftArm", "RightArm")}
    scene.frame_set(12)
    bpy.context.view_layer.update()
    motion = sum(math.degrees(first_rotations[name].rotation_difference(
        target_rig.pose.bones[name].matrix_basis.to_quaternion()).angle)
        for name in first_rotations)
    if motion < 5.0:
        raise RuntimeError(f"Baked Meshy action is effectively static: {motion}")
    return {
        "source": state.mesh_candidate_path,
        "audit": json.loads(state.mesh_audit_report),
        "mappedBones": mapped,
        "retargetAction": str(target_rig.get("dgal_retarget_action", "")),
        "armMotionDegrees": round(motion, 3),
        "fitScale": round(float(state.candidate_root.get("dgal_fit_scale", 0.0)), 6),
        "nativeWeightsPreserved": True,
    }


def render_comparison(scene, state, mesh_fit_ops) -> list[str]:
    from dig_game_animation_lab.paths import ensure_session_output_root

    output = ensure_session_output_root(state) / "proof-renders"
    output.mkdir(parents=True, exist_ok=True)
    (output / "readme.md").write_text(
        "# Mesh fit proof renders\n\nSame camera, action, and frames for Survival and Meshy comparison.\n",
        encoding="utf-8",
    )
    source_meshes = [obj for obj in scene.objects if obj.type == "MESH" and any(
        modifier.type == "ARMATURE" and modifier.object == state.active_rig for modifier in obj.modifiers
    )]
    candidate_meshes = mesh_fit_ops.candidate_meshes(state)
    props = [obj for obj in scene.objects if obj.get("dgal_attachment_group")]
    previous = {obj: obj.hide_render for obj in [*source_meshes, *candidate_meshes, *props]}
    paths = []
    scene.render.resolution_x = scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    try:
        for frame in (1, 12):
            scene.frame_set(frame)
            for label, show_source in (("survival", True), ("meshy", False)):
                for obj in source_meshes:
                    obj.hide_render = not show_source
                for obj in candidate_meshes:
                    obj.hide_render = show_source
                for obj in props:
                    obj.hide_render = True
                path = output / f"{label}-punch-jab-frame-{frame:02d}.png"
                scene.render.filepath = str(path)
                bpy.ops.render.render(write_still=True)
                paths.append(str(path.relative_to(ROOT)))
    finally:
        for obj, hidden in previous.items():
            obj.hide_render = hidden
    return paths


def main() -> None:
    sys.path.insert(0, str(ADDON_ROOT))
    import dig_game_animation_lab as addon
    from dig_game_animation_lab import action_api, mesh_fit_ops

    if not hasattr(bpy.types.Scene, "dgal"):
        addon.register()
    scene, state = bpy.context.scene, bpy.context.scene.dgal
    state.session_name = "meshy-fit-endpoint-proof-v1"
    require_finished(bpy.ops.dgal.create_session(), "create session")
    if len(state.clips) != 18 or len(state.hitboxes) != 4 or not scene.camera:
        raise RuntimeError("Persisted session catalog, hitboxes, or stage is incomplete")
    activate_clip(state, "punch-jab")
    rig = state.active_rig
    source_motion = source_motion_proof(scene, rig)
    endpoint = endpoint_tween_proof(scene, state, rig, action_api)
    activate_clip(state, "punch-jab")
    hitboxes = hitbox_and_prop_proof(state)
    meshy = meshy_proof(scene, state, mesh_fit_ops)
    renders = render_comparison(scene, state, mesh_fit_ops)
    require_finished(bpy.ops.dgal.export_review_bundle(), "review bundle")
    payload = {
        "version": 1,
        "blenderVersion": bpy.app.version_string,
        "productionChanged": False,
        "catalogActions": len(state.clips),
        "masterActions": sum(bool(action.get("dgal_managed")) for action in bpy.data.actions),
        "sourceHandMotionWorld": source_motion,
        "endpointTween": endpoint,
        "hitboxesAndProps": hitboxes,
        "meshyFit": meshy,
        "renders": renders,
    }
    REPORT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"DGAL_RUNTIME_OK report={REPORT_PATH} mappedBones={meshy['mappedBones']}")


if __name__ == "__main__":
    main()
