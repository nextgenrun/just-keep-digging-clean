"""Render every active Survival animation through one V4 Blender contract."""

from __future__ import annotations

import importlib.util
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "values/survivalUnifiedAnimationRuntimeV1.json").read_text(encoding="utf-8"))
RETARGET_CONFIG = json.loads((ROOT / CONFIG["retargetConfig"]).read_text(encoding="utf-8"))
sys.path.insert(0, str(ROOT / "pipelines/blender"))
import mixamoSurvivalRetarget as retarget
import survivalUnifiedPoses as poses


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


ACCEPTED = load_module(
    "survival_unified_quality",
    ROOT / "ai-tools/2026-08-19-render-mixamo-accepted-survival.py",
)
ACCEPTED.CONFIG = {**RETARGET_CONFIG, **CONFIG, "render": CONFIG["render"]}


def argument(name, default=None):
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    prefix = f"--{name}="
    return next((value[len(prefix):] for value in argv if value.startswith(prefix)), default)


def output_directory(sheet_key):
    path = ROOT / CONFIG["renderRoot"] / sheet_key
    path.mkdir(parents=True, exist_ok=True)
    return path


def frame_path(sheet_key, index):
    return output_directory(sheet_key) / f"frame-{index:04d}.png"


def set_secondary(secondary, index, count, loop):
    phase = math.tau * index / max(1, count if loop else count - 1)
    envelope = 1.0 if loop else math.sin(math.pi * index / max(1, count - 1))
    for motion in secondary.values():
        motion["block"].value = 0.5 + 0.22 * envelope * math.sin(
            phase + motion["phaseOffset"]
        )


def render_frame(scene, sheet_key, index, secondary, count, loop):
    set_secondary(secondary, index, count, loop)
    bpy.context.view_layer.update()
    scene.render.filepath = str(frame_path(sheet_key, index))
    bpy.ops.render.render(write_still=True)
    print(f"UNIFIED_SURVIVAL_RENDER sheet={sheet_key} frame={index + 1}/{count}", flush=True)


def clear_sheet(sheet_key):
    for path in output_directory(sheet_key).glob("frame-*.png"):
        path.unlink()


def sheet_is_complete(sheet_key, frame_count):
    return all(frame_path(sheet_key, index).is_file() for index in range(frame_count))


def ground_pose(target_rig, target_ground, mode, contact_bones, end_delta=0.0):
    if mode == "PER_FRAME":
        poses.lock_ground(target_rig, target_ground, contact_bones)
    elif mode in {"LAND_AT_END", "LAND_MESH_AT_END"}:
        retarget.shift_pelvis_world_z(target_rig, end_delta)


def render_direct(scene, target_rig, secondary, sheet_key, spec, action):
    count = int(spec["frames"])
    samples = poses.sampled_frames(
        action,
        count,
        bool(spec["loop"]),
        float(spec["sampleStep"]) if "sampleStep" in spec else None,
    )
    contacts = RETARGET_CONFIG["retarget"]["groundContactBones"]
    target_ground = poses.target_ground_height(target_rig, contacts)
    first_pose = poses.direct_action_pose(scene, target_rig, action, samples[0])
    poses.restore_pose(target_rig, first_pose)
    target_travel = poses.pose_camera_axis_position(target_rig, scene.camera)
    body = bpy.data.objects[CONFIG["objects"]["body"]]
    neutral_action = bpy.data.actions[CONFIG["objects"]["referenceAction"]]
    neutral_pose = poses.direct_action_pose(
        scene, target_rig, neutral_action, float(neutral_action.frame_range[0])
    )
    poses.restore_pose(target_rig, neutral_pose)
    target_mesh_ground = poses.mesh_bottom_world_z(body)
    end_delta = 0.0
    if spec["grounding"] in {"LAND_AT_END", "LAND_MESH_AT_END"}:
        pose = poses.direct_action_pose(scene, target_rig, action, samples[-1])
        poses.restore_pose(target_rig, pose)
        poses.lock_camera_axis_travel(target_rig, scene.camera, target_travel)
        end_delta = (
            target_mesh_ground - poses.mesh_bottom_world_z(body)
            if spec["grounding"] == "LAND_MESH_AT_END"
            else target_ground - poses.contact_height(target_rig, contacts)
        )
    for index, source_frame in enumerate(samples):
        pose = poses.direct_action_pose(scene, target_rig, action, source_frame)
        poses.restore_pose(target_rig, pose)
        poses.lock_camera_axis_travel(target_rig, scene.camera, target_travel)
        if spec["grounding"] == "MESH_PER_FRAME":
            poses.lock_mesh_ground(target_rig, body, target_mesh_ground)
        else:
            ground_pose(target_rig, target_ground, spec["grounding"], contacts, end_delta)
        render_frame(scene, sheet_key, index, secondary, count, bool(spec["loop"]))
    return {"mode": spec["mode"], "sourceAction": action.name, "samples": samples}


def render_master(scene, target_rig, secondary, sheet_key, spec):
    action = bpy.data.actions.get(spec["action"])
    if action is None:
        raise RuntimeError(f"Missing master action: {spec['action']}")
    return render_direct(scene, target_rig, secondary, sheet_key, spec, action)


def render_ual(scene, target_rig, secondary, sheet_key, spec):
    source = ROOT / CONFIG["paths"]["ual"] / spec["source"]
    _, action, imported, actions = poses.import_fbx(source)
    try:
        return render_direct(scene, target_rig, secondary, sheet_key, spec, action)
    finally:
        poses.cleanup(imported, actions)


def mixamo_context(scene, target_rig, source_path, spec):
    source_rig, action, imported, actions = poses.import_fbx(source_path)
    alignment, scale, residual = retarget.rest_alignment(
        source_rig, target_rig, RETARGET_CONFIG["retarget"]["boneMap"]
    )
    samples = ACCEPTED.sample_frames(action, spec)
    positions = ACCEPTED.source_hip_positions(
        scene,
        source_rig,
        samples,
        RETARGET_CONFIG["retarget"].get("sourceHipBone", "mixamorig:Hips"),
    )
    reference = ACCEPTED.reference_hip(spec, positions)
    return source_rig, action, imported, actions, alignment, scale, residual, samples, positions, reference


def render_mixamo(scene, target_rig, finger_pose, secondary, sheet_key, spec):
    source = ROOT / CONFIG["paths"][spec["root"]] / spec["source"]
    context = mixamo_context(scene, target_rig, source, spec)
    source_rig, action, imported, actions, alignment, scale, residual, samples, positions, reference = context
    contacts = RETARGET_CONFIG["retarget"]["groundContactBones"]
    target_ground = poses.target_ground_height(target_rig, contacts)
    right = poses.camera_right(scene.camera)
    neutral_action = bpy.data.actions[CONFIG["objects"]["referenceAction"]]
    neutral_pose = poses.direct_action_pose(
        scene, target_rig, neutral_action, float(neutral_action.frame_range[0])
    )
    end_delta = 0.0
    try:
        if spec["grounding"] == "LAND_AT_END":
            ACCEPTED.set_source_frame(scene, samples[-1])
            offset = ACCEPTED.mapped_hip_offset(spec, alignment, positions[-1], reference, right)
            poses.restore_pose(target_rig, neutral_pose)
            retarget.apply_pose(
                source_rig, target_rig, RETARGET_CONFIG["retarget"], alignment, scale,
                finger_pose, offset,
            )
            end_delta = target_ground - poses.contact_height(target_rig, contacts)
        for index, source_frame in enumerate(samples):
            ACCEPTED.set_source_frame(scene, source_frame)
            offset = ACCEPTED.mapped_hip_offset(spec, alignment, positions[index], reference, right)
            poses.restore_pose(target_rig, neutral_pose)
            retarget.apply_pose(
                source_rig, target_rig, RETARGET_CONFIG["retarget"], alignment, scale,
                finger_pose, offset,
            )
            ground_pose(target_rig, target_ground, spec["grounding"], contacts, end_delta)
            render_frame(scene, sheet_key, index, secondary, len(samples), bool(spec["loop"]))
        return {"mode": "MIXAMO", "sourceAction": action.name, "residual": residual, "samples": samples}
    finally:
        poses.cleanup(imported, actions)


def moving_attack_context(scene, target_rig, finger_pose, action_spec, count):
    source = ROOT / CONFIG["paths"][action_spec["root"]] / action_spec["source"]
    spec = {
        "frames": count,
        "loop": False,
        "grounding": "PER_FRAME",
        "reference": "FIRST",
        "preserveVertical": False,
    }
    context = mixamo_context(scene, target_rig, source, spec)
    return (*context, spec)


def render_moving_sequence(
    scene, target_rig, finger_pose, secondary, sheet_key, output_start,
    phase, action_id, action_spec, count, run_action, run_samples,
):
    context = moving_attack_context(scene, target_rig, finger_pose, action_spec, count)
    source_rig, _, imported, actions, alignment, scale, residual, samples, _, _, _ = context
    target_ground = poses.target_ground_height(target_rig, ["foot_l", "ball_l", "foot_r", "ball_r"])
    body = bpy.data.objects[CONFIG["objects"]["body"]]
    neutral_action = bpy.data.actions[CONFIG["objects"]["referenceAction"]]
    neutral_pose = poses.direct_action_pose(
        scene, target_rig, neutral_action, float(neutral_action.frame_range[0])
    )
    poses.restore_pose(target_rig, neutral_pose)
    target_mesh_ground = poses.mesh_bottom_world_z(body)
    weights = poses.moving_weights(CONFIG["moving"], bool(action_spec.get("overlayRightLeg")))
    contacts = ["foot_l", "ball_l"] if action_spec.get("overlayRightLeg") else [
        "foot_l", "ball_l", "foot_r", "ball_r",
    ]
    try:
        for index, attack_frame in enumerate(samples):
            run_index = (int(phase["runStartFrame"]) + index) % len(run_samples)
            run_pose = poses.direct_action_pose(scene, target_rig, run_action, run_samples[run_index])
            ACCEPTED.set_source_frame(scene, attack_frame)
            retarget.apply_pose(
                source_rig, target_rig, RETARGET_CONFIG["retarget"], alignment, scale,
                finger_pose, Vector(),
            )
            attack_pose = poses.capture_pose(target_rig)
            envelope = poses.smooth_envelope(index, count, 5 if count > 12 else 4)
            poses.restore_pose(target_rig, poses.blend_poses(run_pose, attack_pose, weights, envelope))
            poses.lock_ground(target_rig, target_ground, contacts)
            if CONFIG["sheets"][sheet_key].get("meshGround", False):
                poses.lock_mesh_ground(target_rig, body, target_mesh_ground)
            render_frame(scene, sheet_key, output_start + index, secondary, int(CONFIG["sheets"][sheet_key]["frames"]), False)
        return {"residual": residual, "frames": count, "runStart": phase["runStartFrame"]}
    finally:
        poses.cleanup(imported, actions)


def load_run_action():
    source = ROOT / CONFIG["paths"]["ual"] / CONFIG["moving"]["runSource"]
    _, action, imported, actions = poses.import_fbx(source)
    samples = poses.sampled_frames(action, int(CONFIG["moving"]["runFrames"]), True, 0.8)
    return action, samples, imported, actions


def render_moving(scene, target_rig, finger_pose, secondary, sheet_key, spec):
    run_action, run_samples, run_imported, run_actions = load_run_action()
    report = {"mode": spec["mode"], "sequences": {}}
    try:
        if spec["mode"] == "MOVING_SIMPLE":
            phase = next(item for item in CONFIG["moving"]["phaseVariants"] if item["id"] == spec["phase"])
            action_spec = CONFIG["movingActions"][spec["action"]]
            report["sequences"][spec["action"]] = render_moving_sequence(
                scene, target_rig, finger_pose, secondary, sheet_key, 0, phase,
                spec["action"], action_spec, int(spec["frames"]), run_action, run_samples,
            )
        elif spec["mode"] == "MOVING_HANDOFF":
            variants = [item for item in CONFIG["moving"]["phaseVariants"] if not item.get("base")]
            for variant_index, phase in enumerate(variants):
                action_id = "jab" if phase["id"].startswith("jab") else "cross"
                report["sequences"][phase["id"]] = render_moving_sequence(
                    scene, target_rig, finger_pose, secondary, sheet_key, variant_index * 22,
                    phase, action_id, CONFIG["movingActions"][action_id], 22, run_action, run_samples,
                )
        else:
            action_offset = {}
            cursor = 0
            for action_id, action_spec in CONFIG["movingActions"].items():
                action_offset[action_id] = cursor
                cursor += int(action_spec["movingFrames"])
            for action_id, action_spec in CONFIG["movingActions"].items():
                count = int(action_spec["movingFrames"])
                for phase_index, phase in enumerate(CONFIG["moving"]["phaseVariants"]):
                    offset = phase_index * cursor + action_offset[action_id]
                    key = f"{action_id}:{phase['id']}"
                    report["sequences"][key] = render_moving_sequence(
                        scene, target_rig, finger_pose, secondary, sheet_key, offset, phase,
                        action_id, action_spec, count, run_action, run_samples,
                    )
            report["phaseStride"] = cursor
        return report
    finally:
        poses.cleanup(run_imported, run_actions)


def render_diagonal(scene, target_rig, secondary, sheet_key, spec):
    run_action, run_samples, run_imported, run_actions = load_run_action()
    down_source = ROOT / CONFIG["paths"]["ual"] / "survival-ual-overhandthrow.fbx"
    _, down_action, down_imported, down_actions = poses.import_fbx(down_source)
    up_action = bpy.data.actions["SRC_dig_up"]
    weights = poses.moving_weights(CONFIG["moving"], False)
    phases = [1, 8, 15, 22]
    try:
        rig_world = target_rig.matrix_world.copy()
        reference_pose = poses.direct_action_pose(
            scene, target_rig, run_action, run_samples[phases[0]]
        )
        target_rig.matrix_world = rig_world.copy()
        poses.restore_pose(target_rig, reference_pose)
        target_travel = poses.pose_camera_axis_position(target_rig, scene.camera)
        target_ground = poses.target_ground_height(
            target_rig, ["foot_l", "ball_l", "foot_r", "ball_r"]
        )
        for family_index, action in enumerate((up_action, down_action)):
            attack_samples = poses.sampled_frames(action, 15, False, None if family_index == 0 else 0.8)
            for phase_index, phase in enumerate(phases):
                for index, attack_frame in enumerate(attack_samples):
                    target_rig.matrix_world = rig_world.copy()
                    run_pose = poses.direct_action_pose(
                        scene, target_rig, run_action, run_samples[(phase + index) % len(run_samples)]
                    )
                    target_rig.matrix_world = rig_world.copy()
                    attack_pose = poses.direct_action_pose(scene, target_rig, action, attack_frame)
                    envelope = poses.smooth_envelope(index, 15, 4)
                    target_rig.matrix_world = rig_world.copy()
                    poses.restore_pose(target_rig, poses.blend_poses(run_pose, attack_pose, weights, envelope))
                    poses.lock_camera_axis_travel(target_rig, scene.camera, target_travel)
                    poses.lock_ground(target_rig, target_ground, ["foot_l", "ball_l", "foot_r", "ball_r"])
                    output = family_index * 60 + phase_index * 15 + index
                    render_frame(scene, sheet_key, output, secondary, int(spec["frames"]), False)
        return {"mode": "DIAGONAL", "phaseStarts": phases}
    finally:
        poses.cleanup(down_imported, down_actions)
        poses.cleanup(run_imported, run_actions)


def render_transitions(scene, target_rig, secondary, sheet_key, spec):
    idle = bpy.data.actions["MINER_idle"]
    up = bpy.data.actions["SRC_dig_up"]
    run, run_samples, run_imported, run_actions = load_run_action()
    carrier_specs = {
        "jab": "survival-ual-punch-jab.fbx",
        "cross": "survival-ual-punch-cross.fbx",
        "down": "survival-ual-overhandthrow.fbx",
        "landing": "survival-ual-jump-land.fbx",
        "wall": "survival-ual-push-loop.fbx",
    }
    carriers = {}
    try:
        rig_world = target_rig.matrix_world.copy()
        for key, filename in carrier_specs.items():
            carriers[key] = poses.import_fbx(ROOT / CONFIG["paths"]["ual"] / filename)
        idle_pose = poses.direct_action_pose(scene, target_rig, idle, float(idle.frame_range[0]))
        target_rig.matrix_world = rig_world.copy()
        poses.restore_pose(target_rig, idle_pose)
        target_travel = poses.pose_camera_axis_position(target_rig, scene.camera)
        target_ground = poses.target_ground_height(
            target_rig, ["foot_l", "ball_l", "foot_r", "ball_r"]
        )
        rendered = []
        def emit(pose):
            index = len(rendered)
            target_rig.matrix_world = rig_world.copy()
            poses.restore_pose(target_rig, pose)
            poses.lock_camera_axis_travel(target_rig, scene.camera, target_travel)
            poses.lock_ground(
                target_rig,
                target_ground,
                ["foot_l", "ball_l", "foot_r", "ball_r"],
            )
            render_frame(scene, sheet_key, index, secondary, int(spec["frames"]), False)
            rendered.append(index)
        emit(idle_pose)
        emit(poses.direct_action_pose(scene, target_rig, run, run_samples[1]))
        for phase in range(0, 28, 2):
            emit(poses.direct_action_pose(scene, target_rig, run, run_samples[phase]))
            emit(idle_pose)
        for action_key in ("jab", "cross"):
            action = carriers[action_key][1]
            emit(poses.direct_action_pose(scene, target_rig, action, float(action.frame_range[1])))
            emit(idle_pose)
        for action in (up, carriers["down"][1]):
            emit(poses.direct_action_pose(scene, target_rig, action, float(action.frame_range[1])))
            emit(idle_pose)
        landing = carriers["landing"][1]
        landing_samples = poses.sampled_frames(landing, 19, False, 0.8)
        for frame in landing_samples[-5:]: emit(poses.direct_action_pose(scene, target_rig, landing, frame))
        for frame in landing_samples[-14:]: emit(poses.direct_action_pose(scene, target_rig, landing, frame))
        while len(rendered) < 57: emit(idle_pose)
        wall = carriers["wall"][1]
        wall_samples = poses.sampled_frames(wall, 22, False, None)
        for frame in wall_samples: emit(poses.direct_action_pose(scene, target_rig, wall, frame))
        up_samples = poses.sampled_frames(up, 24, False, None)
        for frame in up_samples: emit(poses.direct_action_pose(scene, target_rig, up, frame))
        while len(rendered) < int(spec["frames"]): emit(idle_pose)
        return {"mode": "TRANSITIONS", "frames": len(rendered)}
    finally:
        for _, _, imported, actions in carriers.values():
            poses.cleanup(imported, actions)
        poses.cleanup(run_imported, run_actions)


def main():
    expected = (ROOT / CONFIG["sourceBlend"]).resolve()
    if Path(bpy.data.filepath).resolve() != expected:
        raise RuntimeError(f"Open configured source blend first: {expected}")
    selected = argument("sheet")
    if selected and selected not in CONFIG["sheets"]:
        raise ValueError(f"Unknown sheet: {selected}")
    sheets = {selected: CONFIG["sheets"][selected]} if selected else CONFIG["sheets"]
    resume = selected is None and argument("resume", "1") != "0"
    forced_modes = set(filter(None, argument("forceModes", "").split(",")))
    scene = bpy.context.scene
    target_rig = bpy.data.objects[CONFIG["objects"]["rig"]]
    body = bpy.data.objects[CONFIG["objects"]["body"]]
    scene.camera = bpy.data.objects[CONFIG["objects"]["camera"]]
    finger_pose = retarget.capture_reference_fingers(
        scene,
        target_rig,
        bpy.data.actions[CONFIG["objects"]["referenceAction"]],
        RETARGET_CONFIG["retarget"]["fingerPosePrefixes"],
    )
    quality, secondary = ACCEPTED.configure_quality(scene, body)
    report_path = ROOT / CONFIG["renderRoot"] / "render-report.json"
    report = json.loads(report_path.read_text(encoding="utf-8")) if report_path.is_file() else {
        "version": CONFIG["version"], "sourceBlendChanged": False, "quality": quality, "sheets": {},
    }
    for sheet_key, spec in sheets.items():
        if resume and spec["mode"] not in forced_modes and sheet_is_complete(sheet_key, int(spec["frames"])):
            print(f"UNIFIED_SURVIVAL_RESUME_SKIP sheet={sheet_key}", flush=True)
            continue
        clear_sheet(sheet_key)
        mode = spec["mode"]
        if mode == "MASTER": result = render_master(scene, target_rig, secondary, sheet_key, spec)
        elif mode == "UAL": result = render_ual(scene, target_rig, secondary, sheet_key, spec)
        elif mode == "MIXAMO": result = render_mixamo(scene, target_rig, finger_pose, secondary, sheet_key, spec)
        elif mode.startswith("MOVING_"): result = render_moving(scene, target_rig, finger_pose, secondary, sheet_key, spec)
        elif mode == "DIAGONAL": result = render_diagonal(scene, target_rig, secondary, sheet_key, spec)
        elif mode == "TRANSITIONS": result = render_transitions(scene, target_rig, secondary, sheet_key, spec)
        else: raise RuntimeError(f"Unsupported render mode: {mode}")
        report["sheets"][sheet_key] = {**result, "frames": int(spec["frames"])}
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"SURVIVAL_UNIFIED_RENDER_OK sheets={len(sheets)} report={report_path}")


if __name__ == "__main__":
    main()
