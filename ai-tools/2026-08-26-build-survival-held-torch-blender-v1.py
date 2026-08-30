"""Build a review-only Mixamo/Survival held-torch Blender candidate."""

from __future__ import annotations

import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "values/survivalHeldTorchBlenderV1.json").read_text())
RETARGET_CONFIG = json.loads((ROOT / CONFIG["retargetConfig"]).read_text())["retarget"]
sys.path.insert(0, str(ROOT / "pipelines/blender"))
import mixamoSurvivalRetarget as retarget
import survivalHeldTorchReview as torch_review


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def require(name, kind=None):
    obj = bpy.data.objects.get(name)
    if obj is None or (kind and obj.type != kind):
        raise RuntimeError(f"Required {kind or 'object'} missing: {name}")
    return obj


def grip_center(rig):
    points = [rig.pose.bones["hand_r"].tail]
    points.extend(rig.pose.bones[name].head for name in
                  ("index_01_r", "middle_01_r", "ring_01_r", "pinky_01_r", "thumb_01_r"))
    return rig.matrix_world @ (sum(points, Vector()) / len(points))


def assign_action(obj, action):
    obj.animation_data_create()
    obj.animation_data.action = action
    if action and action.slots:
        obj.animation_data.action_slot = action.slots[0]


def import_mixamo(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(path), automatic_bone_orientation=False, use_anim=True)
    imported = [obj for obj in bpy.data.objects if obj not in before]
    rigs = [obj for obj in imported if obj.type == "ARMATURE"]
    if len(rigs) != 1 or not rigs[0].animation_data or not rigs[0].animation_data.action:
        raise RuntimeError("Mixamo carrier import did not produce exactly one animated armature")
    collection = bpy.data.collections.new("DG_MIXAMO_SOURCE")
    bpy.context.scene.collection.children.link(collection)
    for obj in imported:
        for owner in tuple(obj.users_collection):
            owner.objects.unlink(obj)
        collection.objects.link(obj)
        obj.hide_render = True
        obj.hide_viewport = True
        obj.name = f"DG_MIXAMO_SOURCE_{obj.name}"
    rigs[0].name = "DG_Mixamo_UnarmedIdle_SourceRig"
    rigs[0].animation_data.action["reviewSourceOnly"] = True
    return rigs[0], rigs[0].animation_data.action, collection


def source_frame(scene, frame):
    whole = math.floor(frame)
    scene.frame_set(whole, subframe=frame - whole)
    bpy.context.view_layer.update()


def capture_mixamo_pose(scene, source, target, finger_pose):
    spec = CONFIG["action"]
    samples = [spec["sourceFrameStart"] + (spec["sourceFrameEnd"] - spec["sourceFrameStart"]) * i /
               max(1, spec["frames"] - 1) for i in range(spec["frames"])]
    alignment, scale, residual = retarget.rest_alignment(source, target, RETARGET_CONFIG["boneMap"])
    hips = []
    for frame in samples:
        source_frame(scene, frame)
        hips.append(retarget.world_pose_head(source, "mixamorig:Hips").copy())
    hip_reference = sum(hips, Vector()) / len(hips)
    ground = min(retarget.world_rest_head(target, name).z for name in RETARGET_CONFIG["groundContactBones"])
    captured = []
    for frame, hip in zip(samples, hips):
        source_frame(scene, frame)
        offset = alignment @ (hip - hip_reference)
        offset.x = offset.y = offset.z = 0.0
        retarget.apply_pose(source, target, RETARGET_CONFIG, alignment, scale, finger_pose, offset)
        retarget.shift_pelvis_world_z(
            target, ground - retarget.contact_z(target, RETARGET_CONFIG["groundContactBones"]))
        captured.append({bone.name: bone.matrix_basis.copy() for bone in target.pose.bones})
    return captured, samples, scale, residual


def key_captured_action(scene, rig, captured):
    action = bpy.data.actions.new(CONFIG["action"]["name"])
    action.use_frame_range = True
    action.frame_start, action.frame_end = 1, len(captured)
    action["mixamoSource"] = CONFIG["sourceFbx"]
    action["rightArmHoldBaked"] = True
    assign_action(rig, action)
    for frame, pose in enumerate(captured, 1):
        scene.frame_set(frame)
        for bone in rig.pose.bones:
            bone.matrix_basis = pose[bone.name]
            bone.keyframe_insert("location", frame=frame, group=bone.name)
            bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
            bone.keyframe_insert("scale", frame=frame, group=bone.name)
    return action


def bake_holding_arm(scene, rig, camera, action):
    objects, pose = CONFIG["objects"], CONFIG["pose"]
    target, pole = require(objects["ikTarget"]), require(objects["ikPole"])
    constraint = rig.pose.bones["hand_r"].constraints.get(objects["ikConstraint"])
    if constraint is None:
        raise RuntimeError(f"Missing right-hand IK constraint: {objects['ikConstraint']}")
    assign_action(target, bpy.data.actions.new("DG_TORCH_HAND_TARGET_V1"))
    right = (camera.matrix_world.to_3x3() @ Vector((1, 0, 0))).normalized()
    up = (camera.matrix_world.to_3x3() @ Vector((0, 1, 0))).normalized()
    forward = (camera.matrix_world.to_3x3() @ Vector((0, 0, -1))).normalized()
    for frame in range(1, CONFIG["action"]["frames"] + 1):
        scene.frame_set(frame)
        spine = rig.matrix_world @ rig.pose.bones[pose["spineBone"]].head
        breath = math.sin(math.tau * (frame - 1) / (CONFIG["action"]["frames"] - 1))
        target.location = (spine + right * pose["screenRightWorld"] + up *
                           (pose["screenUpWorld"] + breath * pose["handVerticalBreathWorld"]) +
                           forward * pose["cameraForwardWorld"])
        target.keyframe_insert("location", frame=frame)
    scene.frame_set(1)
    spine = rig.matrix_world @ rig.pose.bones[pose["spineBone"]].head
    pole.location = (spine + right * pose["poleScreenRightWorld"] + up * pose["poleScreenUpWorld"] +
                     forward * pose["poleCameraForwardWorld"])
    constraint.influence = 1.0
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    rig.hide_viewport = False
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    result = bpy.ops.nla.bake(
        frame_start=1, frame_end=CONFIG["action"]["frames"], step=1, only_selected=False,
        visual_keying=True, clear_constraints=False, use_current_action=True, clean_curves=False,
        bake_types={"POSE"}, channel_types={"LOCATION", "ROTATION", "SCALE"})
    constraint.influence = 0.0
    if "FINISHED" not in result:
        raise RuntimeError(f"Right-arm IK bake failed: {result}")
    assign_action(rig, action)


def curl_grip_fingers(scene, rig, finger_pose):
    degrees = CONFIG["pose"]["fingerCurlDegrees"]
    base = {name: matrix.decompose()[1] for name, matrix in finger_pose.items()}
    for frame in range(1, CONFIG["action"]["frames"] + 1):
        scene.frame_set(frame)
        for finger in ("index", "middle", "ring", "pinky"):
            for joint, weight in ((1, 0.58), (2, 0.82), (3, 1.0)):
                name = f"{finger}_0{joint}_r"
                if name in base:
                    bone = rig.pose.bones[name]
                    bone.rotation_mode = "QUATERNION"
                    bone.rotation_quaternion = base[name] @ Quaternion(
                        (1, 0, 0), math.radians(-degrees * weight))
                    bone.keyframe_insert("rotation_quaternion", frame=frame, group=name)
        for joint, weight in ((1, 0.42), (2, 0.66), (3, 0.82)):
            name = f"thumb_0{joint}_r"
            if name in base:
                bone = rig.pose.bones[name]
                bone.rotation_mode = "QUATERNION"
                bone.rotation_quaternion = base[name] @ Quaternion(
                    (0, 0, 1), math.radians(degrees * weight))
                bone.keyframe_insert("rotation_quaternion", frame=frame, group=name)


def main():
    source_blend = (ROOT / CONFIG["sourceBlend"]).resolve()
    source_fbx = (ROOT / CONFIG["sourceFbx"]).resolve()
    if Path(bpy.data.filepath).resolve() != source_blend:
        raise RuntimeError(f"Open the configured production blend first: {source_blend}")
    output = ROOT / CONFIG["outputRoot"]
    output.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    rig = require(CONFIG["objects"]["rig"], "ARMATURE")
    body = require(CONFIG["objects"]["body"], "MESH")
    camera = require(CONFIG["objects"]["camera"], "CAMERA")
    reference = bpy.data.actions[CONFIG["objects"]["referenceAction"]]
    assign_action(rig, reference)
    scene.frame_set(1)
    bpy.context.view_layer.update()
    reference_heads = {name: (rig.matrix_world @ rig.pose.bones[name].head).copy()
                       for name in ("upperarm_r", "lowerarm_r", "hand_r")}
    finger_pose = retarget.capture_reference_fingers(
        scene, rig, reference, RETARGET_CONFIG["fingerPosePrefixes"])
    source, source_action, source_collection = import_mixamo(source_fbx)
    captured, samples, scale, residual = capture_mixamo_pose(scene, source, rig, finger_pose)
    action = key_captured_action(scene, rig, captured)
    bake_holding_arm(scene, rig, camera, action)
    curl_grip_fingers(scene, rig, finger_pose)
    root, grip, torch_collection = torch_review.build_torch(
        scene, rig, CONFIG, grip_center(rig))
    torch_review.configure_render(scene, CONFIG)
    scene.frame_start, scene.frame_end = 1, CONFIG["action"]["frames"]
    gaps = []
    for frame in range(1, CONFIG["action"]["frames"] + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        gaps.append((grip.matrix_world.translation - grip_center(rig)).length)
    scene.frame_set(1)
    bpy.context.view_layer.update()
    socket_head = rig.matrix_world @ rig.pose.bones[CONFIG["objects"]["attachmentBone"]].head
    socket_offset = (grip.matrix_world.translation - socket_head).length
    displacement = {name: ((rig.matrix_world @ rig.pose.bones[name].head) - point).length
                    for name, point in reference_heads.items()}
    candidate = output / "survival-held-torch-rig-v1.blend"
    rig["heldTorchReviewAction"] = action.name
    rig["heldTorchAttachmentBone"] = root.parent_bone
    body["heldTorchCandidateProductionChanged"] = False
    bpy.ops.wm.save_as_mainfile(filepath=str(candidate), check_existing=False)
    files = torch_review.render_outputs(scene, camera, grip, output, CONFIG)
    bpy.ops.wm.save_as_mainfile(filepath=str(candidate), check_existing=False)
    report = {
        "version": CONFIG["version"], "reviewOnly": True, "productionChanged": False,
        "sourceBlendChanged": False, "sourceBlendSha256": sha256(source_blend),
        "sourceFbx": CONFIG["sourceFbx"], "sourceFbxSha256": sha256(source_fbx),
        "mixamoSourceAction": source_action.name, "mixamoSourceSamples": samples,
        "retargetScale": scale, "retargetResidualWorld": residual,
        "targetAction": action.name, "frames": CONFIG["action"]["frames"],
        "attachment": {"rig": rig.name, "handBone": "hand_r", "bone": root.parent_bone,
                       "parentType": root.parent_type, "ikConstraint": CONFIG["objects"]["ikConstraint"],
                       "calibratedToActualPalm": True, "socketHeadOffsetWorld": socket_offset},
        "gripGapWorld": {"maximum": max(gaps), "mean": sum(gaps) / len(gaps)},
        "armDisplacementFromReferenceWorld": displacement,
        "torch": {"realMeshParts": len([o for o in torch_collection.objects if o.type == "MESH"]),
                  "spritePlaneCount": 0, "flameLateralShakeWorld": 0.0,
                  "sourceCarrierCollection": source_collection.name},
        "outputs": [candidate.name] + files,
    }
    (output / "build-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(f"SURVIVAL_HELD_TORCH_BLEND_V1_OK bone={root.parent_bone} "
          f"maxGripGap={max(gaps):.8f} output={candidate}")


if __name__ == "__main__":
    main()
