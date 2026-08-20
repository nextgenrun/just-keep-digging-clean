"""Render accepted Mixamo motions on the production high-quality Survival rig."""

from __future__ import annotations

import importlib.util
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "values/mixamoAcceptedRuntime.json").read_text(encoding="utf-8"))
sys.path.insert(0, str(ROOT / "pipelines/blender"))
import mixamoSurvivalRetarget as retarget


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


V4 = load_module("mixamo_quality_v4", ROOT / "ai-tools/2026-08-15-render-survival-hero-quality-v4.py")
V2 = V4.V2
V32 = V4.V32


def argument(name):
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    prefix = f"--{name}="
    return next((value[len(prefix):] for value in argv if value.startswith(prefix)), None)


def configure_quality(scene, body):
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = CONFIG["render"]["sourceSizePx"]
    scene.render.resolution_y = CONFIG["render"]["sourceSizePx"]
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = CONFIG["render"]["colorDepth"]
    scene.render.image_settings.compression = 15
    scene.view_settings.view_transform = V4.CONFIG["render"]["viewTransform"]
    scene.view_settings.look = V4.CONFIG["render"]["look"]
    active_lights = set(V2.CONFIG["activeLights"])
    for obj in bpy.data.objects:
        if obj.type == "LIGHT":
            obj.hide_render = obj.name not in active_lights
        if obj.name.startswith(tuple(V2.CONFIG["hiddenPrefixes"])) or obj.name in V2.CONFIG["hiddenObjects"]:
            obj.hide_render = True
    texture_report = V2.relink_textures()
    restored = V4.restore_full_resolution_textures()
    pbr_report = {
        name: V4.reconstruct_pbr_material(name, settings)
        for name, settings in V4.CONFIG["pbrMaterials"].items()
    }
    special_report = {
        name: V4.tune_special_material(name, settings)
        for name, settings in V4.CONFIG["specialMaterials"].items()
    }
    glove_polygons = V2.apply_full_glove_material(body)
    original_secondary = V32.QUALITY["secondaryMotion"]
    V32.QUALITY["secondaryMotion"] = V4.CONFIG["secondaryMotion"]
    secondary = V32.add_secondary_shapes(body)
    V32.QUALITY["secondaryMotion"] = original_secondary
    return {
        "textures": {**texture_report, "fullResolutionRestored": restored},
        "pbr": pbr_report,
        "special": special_report,
        "fullGlovePolygons": glove_polygons,
    }, secondary


def import_carrier(path):
    before_objects = set(bpy.data.objects)
    before_actions = set(bpy.data.actions)
    result = bpy.ops.import_scene.fbx(
        filepath=str(path),
        automatic_bone_orientation=False,
        use_anim=True,
    )
    if "FINISHED" not in result:
        raise RuntimeError(f"FBX import failed: {path}")
    imported = [obj for obj in bpy.data.objects if obj not in before_objects]
    rigs = [obj for obj in imported if obj.type == "ARMATURE"]
    if len(rigs) != 1:
        raise RuntimeError(f"Expected one Mixamo carrier armature, found {len(rigs)}")
    rig = rigs[0]
    action = rig.animation_data.action if rig.animation_data else None
    if action is None:
        raise RuntimeError(f"Imported carrier has no action: {path}")
    return rig, action, imported, [item for item in bpy.data.actions if item not in before_actions]


def sample_frames(action, clip):
    start, end = (float(value) for value in action.frame_range)
    denominator = clip["frames"] if clip["loop"] else max(1, clip["frames"] - 1)
    return [start + (end - start) * index / denominator for index in range(clip["frames"])]


def set_source_frame(scene, frame):
    whole = math.floor(frame)
    scene.frame_set(whole, subframe=frame - whole)
    bpy.context.view_layer.update()


def source_hip_positions(scene, source_rig, samples, source_hip_bone="mixamorig:Hips"):
    output = []
    for frame in samples:
        set_source_frame(scene, frame)
        output.append(retarget.world_pose_head(source_rig, source_hip_bone).copy())
    return output


def reference_hip(clip, positions):
    if clip["reference"] == "FIRST":
        return positions[0]
    if clip["reference"] == "LAST":
        return positions[-1]
    return sum(positions, Vector()) / len(positions)


def mapped_hip_offset(clip, alignment, position, reference, camera_right):
    offset = alignment @ (position - reference)
    offset.x = 0.0
    offset.y = 0.0
    if not clip["preserveVertical"]:
        offset.z = 0.0
    maximum = clip.get("maxVerticalTravelWorld")
    if maximum is not None:
        offset.z = max(-maximum, min(maximum, offset.z))
    offset += camera_right * clip.get("screenOffsetWorld", 0.0)
    return offset


def apply_grounding(target_rig, target_ground, contact_bones, mode, end_correction):
    if mode == "PER_FRAME":
        retarget.shift_pelvis_world_z(target_rig, target_ground - retarget.contact_z(target_rig, contact_bones))
    elif mode == "LAND_AT_END":
        retarget.shift_pelvis_world_z(target_rig, end_correction)


def cleanup(imported, actions):
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)
    for action in actions:
        if action.users == 0:
            bpy.data.actions.remove(action)


def render_clip(scene, target_rig, finger_pose, secondary, clip_id, clip):
    source_path = ROOT / CONFIG["sourceRoot"] / clip["source"]
    source_rig, action, imported, actions = import_carrier(source_path)
    output_root = ROOT / CONFIG["renderRoot"] / clip_id
    output_root.mkdir(parents=True, exist_ok=True)
    requested = argument("frame-index")
    if requested is None:
        for stale in output_root.glob("frame-*.png"):
            stale.unlink()
    try:
        alignment, scale, residual = retarget.rest_alignment(
            source_rig, target_rig, CONFIG["retarget"]["boneMap"]
        )
        samples = sample_frames(action, clip)
        positions = source_hip_positions(
            scene,
            source_rig,
            samples,
            CONFIG["retarget"].get("sourceHipBone", "mixamorig:Hips"),
        )
        hip_reference = reference_hip(clip, positions)
        camera_right = (scene.camera.matrix_world.to_3x3() @ Vector((1.0, 0.0, 0.0))).normalized()
        target_ground = min(
            retarget.world_rest_head(target_rig, name).z
            for name in CONFIG["retarget"]["groundContactBones"]
        )
        end_correction = 0.0
        if clip["grounding"] == "LAND_AT_END":
            set_source_frame(scene, samples[-1])
            offset = mapped_hip_offset(clip, alignment, positions[-1], hip_reference, camera_right)
            retarget.apply_pose(
                source_rig, target_rig, CONFIG["retarget"], alignment, scale, finger_pose, offset
            )
            end_correction = target_ground - retarget.contact_z(
                target_rig, CONFIG["retarget"]["groundContactBones"]
            )
        indices = [int(requested)] if requested is not None else list(range(len(samples)))
        for index in indices:
            set_source_frame(scene, samples[index])
            offset = mapped_hip_offset(clip, alignment, positions[index], hip_reference, camera_right)
            retarget.apply_pose(
                source_rig, target_rig, CONFIG["retarget"], alignment, scale, finger_pose, offset
            )
            apply_grounding(
                target_rig,
                target_ground,
                CONFIG["retarget"]["groundContactBones"],
                clip["grounding"],
                end_correction,
            )
            phase = math.tau * index / max(1, len(samples))
            for motion in secondary.values():
                motion["block"].value = 0.5 + 0.5 * math.sin(phase + motion["phaseOffset"])
            bpy.context.view_layer.update()
            scene.render.filepath = str(output_root / f"frame-{index:03d}.png")
            bpy.ops.render.render(write_still=True)
            print(f"MIXAMO_SURVIVAL_RENDER clip={clip_id} frame={index + 1}/{len(samples)}", flush=True)
        return {
            "source": clip["source"],
            "sourceAction": action.name,
            "sourceFrameRange": [float(value) for value in action.frame_range],
            "sourceSamples": samples,
            "renderedIndices": indices,
            "alignmentScale": scale,
            "alignmentResidualWorld": residual,
            "endGroundCorrectionWorld": end_correction,
        }
    finally:
        cleanup(imported, actions)


def main():
    expected = (ROOT / CONFIG["sourceBlend"]).resolve()
    if Path(bpy.data.filepath).resolve() != expected:
        raise RuntimeError(f"Open configured production blend first: {expected}")
    scene = bpy.context.scene
    target_rig = bpy.data.objects[CONFIG["objects"]["rig"]]
    body = bpy.data.objects[CONFIG["objects"]["body"]]
    scene.camera = bpy.data.objects[CONFIG["objects"]["camera"]]
    reference_action = bpy.data.actions[CONFIG["objects"]["referenceAction"]]
    finger_pose = retarget.capture_reference_fingers(
        scene, target_rig, reference_action, CONFIG["retarget"]["fingerPosePrefixes"]
    )
    quality_report, secondary = configure_quality(scene, body)
    selected = argument("clip")
    clips = {selected: CONFIG["clips"][selected]} if selected else CONFIG["clips"]
    report = {
        "version": CONFIG["version"],
        "productionChanged": False,
        "sourceBlendChanged": False,
        "sourceRenderSizePx": CONFIG["render"]["sourceSizePx"],
        "quality": quality_report,
        "clips": {},
    }
    for clip_id, clip in clips.items():
        report["clips"][clip_id] = render_clip(
            scene, target_rig, finger_pose, secondary, clip_id, clip
        )
    report_path = ROOT / CONFIG["renderRoot"] / "render-report.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"MIXAMO_ACCEPTED_SURVIVAL_RENDER_OK clips={len(clips)} report={report_path}")


if __name__ == "__main__":
    main()
