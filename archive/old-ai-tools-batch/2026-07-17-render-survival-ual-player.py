"""Render the approved Survival body with the 18 active UAL motion sheets."""

from __future__ import annotations

import argparse
import json
import math
import shutil
import sys
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
EXPORT_ROOT = ROOT / "testing" / "unreal-survival-motion-v2" / "SourceAssets" / "ual-exports"
FRAME_SIZE = 512
ORTHOGRAPHIC_SCALE = 3.0716
PIPELINE_ID = "survival-body-ual-motion-unreal-ik-v1"
VISUAL_SKIN = {
    "version": 1,
    "id": "approved-survival-character-fab-v1-on-ual",
    "source_blend": "sprites/character/survival-character-fab-v1/source/survival_character.blend",
    "approval_reference": "sprites/character/survival-miner-poc-v1/reference/approved-action-proof.png",
    "motion_source": "Quaternius Universal Animation Library active clips",
    "motion_authority": "Unreal Engine 5.8 IK Retargeter",
    "retargeter": "/Game/SurvivalMotion/Retarget/RTG_UAL_To_SurvivalCharacter_v1",
    "target_mesh": "/Game/SurvivalMotion/Character/SK_SurvivalCharacter_Fab_v1",
    "deformation_authority": "Survival source skeleton and native weights",
    "rejected_mesh_policy": "legacy-miner-meshy-not-used",
    "weapon_policy": "none",
}
MATERIAL_ORDER = (
    "Jacket1",
    "Brows_Leashes",
    "Hair3",
    "Backpack2",
    "Gloves1",
    "Mouth",
    "Head",
    "Body2",
    "Arms",
    "Body_Arkit:Eye",
    "Jeans1",
    "Shoes1",
)
MARKER_BONES = {
    "hand_l": ("hand_l", "tail"),
    "hand_r": ("hand_r", "tail"),
    "foot_l": ("foot_l", "tail"),
    "foot_r": ("foot_r", "tail"),
    "pelvis": ("pelvis", "head"),
    "head": ("head", "tail"),
}
ACTION_SPECS = (
    {"id": "idle", "clip": "Idle_Loop", "file": "survival-ual-idle-loop.fbx", "count": 75, "loop": True},
    {"id": "idle-talk", "clip": "Idle_Talking_Loop", "file": "survival-ual-idle-talking-loop.fbx", "count": 88, "loop": True},
    {"id": "walk", "clip": "Jog_Fwd_Loop", "file": "survival-ual-jog-fwd-loop.fbx", "count": 28, "loop": True},
    {"id": "run", "clip": "Jog_Fwd_Loop", "file": "survival-ual-jog-fwd-loop.fbx", "count": 28, "loop": True},
    {"id": "airborne", "clip": "Jump_Start", "file": "survival-ual-jump-start.fbx", "count": 41, "loop": False},
    {"id": "falling", "clip": "Jump_Loop", "file": "survival-ual-jump-loop.fbx", "count": 75, "loop": True},
    {"id": "crouch", "clip": "Crouch_Idle_Loop", "file": "survival-ual-crouch-idle-loop.fbx", "count": 88, "loop": True},
    {"id": "fly", "clip": "Shield_Dash", "file": "survival-ual-shield-dash.fbx", "count": 14, "loop": False, "start": 2.6, "end": 13.0},
    {"id": "climb", "clip": "ClimbUp_1m", "file": "survival-ual-climbup-1m.fbx", "count": 20, "loop": True},
    {"id": "punch-jab", "clip": "Punch_Jab", "file": "survival-ual-punch-jab.fbx", "count": 27, "loop": False},
    {"id": "punch-cross", "clip": "Punch_Cross", "file": "survival-ual-punch-cross.fbx", "count": 31, "loop": False},
    {"id": "pickaxe-mining", "clip": "TreeChopping_Loop", "file": "survival-ual-treechopping-loop.fbx", "count": 29, "loop": True},
    {"id": "punch-uppercut", "clip": "Melee_Hook", "file": "survival-ual-melee-hook.fbx", "count": 15, "loop": False},
    {"id": "ground-strike", "clip": "OverhandThrow", "file": "survival-ual-overhandthrow.fbx", "count": 41, "loop": False},
    {"id": "landing", "clip": "Jump_Land", "file": "survival-ual-jump-land.fbx", "count": 39, "loop": False},
    {"id": "wall-push", "clip": "Push_Loop", "file": "survival-ual-push-loop.fbx", "count": 80, "loop": True},
    {"id": "teleport", "clip": "Roll", "file": "survival-ual-roll.fbx", "count": 45, "loop": False},
    {"id": "thunder-charge", "clip": "Spell_Simple_Idle_Loop", "file": "survival-ual-spell-simple-idle-loop.fbx", "count": 63, "loop": True},
    {"id": "hit-react", "clip": "Hit_Chest", "file": "survival-ual-hit-chest.fbx", "count": 11, "loop": False},
    {"id": "death", "clip": "Death01", "file": "survival-ual-death01.fbx", "count": 73, "loop": False, "recenter_horizontal": True},
    # Epic Game Animation Sample clips already retargeted to this Survival mesh.
    {"id": "gasp-idle", "clip": "MM_Idle", "file": "survival-idle-retargeted.fbx", "count": 75, "loop": True, "root": "testing/unreal-survival-motion-v2/SourceAssets/exports", "recenter_horizontal": True},
    {"id": "gasp-walk", "clip": "MF_Unarmed_Walk_Fwd", "file": "survival-walk-retargeted.fbx", "count": 47, "loop": True, "root": "testing/unreal-survival-motion-v2/SourceAssets/exports", "recenter_horizontal": True},
    {"id": "gasp-run", "clip": "MF_Unarmed_Jog_Fwd", "file": "survival-run-retargeted.fbx", "count": 55, "loop": True, "root": "testing/unreal-survival-motion-v2/SourceAssets/exports", "recenter_horizontal": True},
    {"id": "gasp-fall", "clip": "MM_Fall_Loop", "file": "survival-fly-retargeted.fbx", "count": 92, "loop": True, "root": "testing/unreal-survival-motion-v2/SourceAssets/exports", "recenter_horizontal": True},
    {"id": "gasp-attack", "clip": "MM_Attack_01", "file": "survival-attack-retargeted.fbx", "count": 32, "loop": False, "root": "testing/unreal-survival-motion-v2/SourceAssets/exports", "recenter_horizontal": True},
    {"id": "gasp-dig-up", "clip": "MM_Attack_02", "file": "survival-dig-up-retargeted.fbx", "count": 32, "loop": False, "root": "testing/unreal-survival-motion-v2/SourceAssets/exports", "recenter_horizontal": True},
    {"id": "gasp-dig-down", "clip": "MM_Attack_03", "file": "survival-dig-down-retargeted.fbx", "count": 52, "loop": False, "root": "testing/unreal-survival-motion-v2/SourceAssets/exports", "recenter_horizontal": True},
    {"id": "gasp-mining-strike", "clip": "MM_ChargedAttack", "file": "survival-mining-strike-retargeted.fbx", "count": 57, "loop": False, "root": "testing/unreal-survival-motion-v2/SourceAssets/exports", "recenter_horizontal": True},
)


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True)
    parser.add_argument("--actions", default="")
    return parser.parse_args(argv)


def configure_scene() -> tuple[bpy.types.Scene, bpy.types.Object]:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = FRAME_SIZE
    scene.render.resolution_y = FRAME_SIZE
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 18
    scene.render.fps = 30
    scene.view_settings.look = "Medium High Contrast"
    scene.world.color = (0.008, 0.012, 0.018)

    target = Vector((0.0, 0.0, 0.95))
    camera_data = bpy.data.cameras.new("SurvivalUALFixedCamera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = ORTHOGRAPHIC_SCALE
    camera = bpy.data.objects.new("SurvivalUALFixedCamera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = target + Vector((1.85, 6.0, 0.32))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = camera

    for name, offset, energy, color, size in (
        ("SurvivalUALKey", (3.5, 4.0, 4.5), 850.0, (1.0, 0.74, 0.52), 4.0),
        ("SurvivalUALFill", (-3.0, 2.5, 2.0), 520.0, (0.36, 0.62, 1.0), 3.0),
        ("SurvivalUALRim", (-2.0, -3.0, 4.0), 720.0, (0.55, 0.78, 1.0), 2.5),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.color = color
        data.shape = "DISK"
        data.size = size
        light = bpy.data.objects.new(name, data)
        light.location = target + Vector(offset)
        light.rotation_euler = (target - light.location).to_track_quat("-Z", "Y").to_euler()
        scene.collection.objects.link(light)
    return scene, camera


def prepare_materials() -> dict[str, bpy.types.Material]:
    materials = {name: bpy.data.materials.get(name) for name in MATERIAL_ORDER}
    missing = [name for name, material in materials.items() if material is None]
    if missing:
        raise RuntimeError(f"Approved Survival blend is missing materials: {missing}")
    eye = bpy.data.materials.new("M_Survival_UAL_Eye_Fallback")
    eye.use_nodes = True
    bsdf = eye.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.035, 0.012, 0.006, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.18
    materials["Body_Arkit:Eye"] = eye
    for image in bpy.data.images:
        width, height = image.size
        if width <= 0 or height <= 0 or max(width, height) <= 2048:
            continue
        ratio = 2048 / max(width, height)
        try:
            image.scale(max(1, round(width * ratio)), max(1, round(height * ratio)))
        except Exception:
            print(f"SURVIVAL_UAL_TEXTURE_SCALE_SKIPPED image={image.name}")
    return materials


def project_markers(scene, camera, armature) -> dict[str, list[float]]:
    markers = {}
    for marker_name, (bone_name, point_name) in MARKER_BONES.items():
        bone = armature.pose.bones.get(bone_name)
        if bone is None:
            raise RuntimeError(f"Survival rig is missing marker bone: {bone_name}")
        world_point = armature.matrix_world @ getattr(bone, point_name)
        camera_point = world_to_camera_view(scene, camera, world_point)
        markers[marker_name] = [
            round(float(camera_point.x) * FRAME_SIZE, 4),
            round((1.0 - float(camera_point.y)) * FRAME_SIZE, 4),
        ]
    return markers


def recenter_horizontal(scene, camera, armature, target_screen_x: float) -> None:
    """Keep imported root-motion clips in-place for a readable sprite-sheet preview."""
    pelvis = armature.pose.bones.get("pelvis")
    if pelvis is None:
        return
    world_point = armature.matrix_world @ pelvis.head
    camera_point = world_to_camera_view(scene, camera, world_point)
    delta_screen_x = target_screen_x - float(camera_point.x)
    if abs(delta_screen_x) < 0.0001:
        return
    camera_right = camera.matrix_world.to_quaternion() @ Vector((1.0, 0.0, 0.0))
    armature.location += camera_right * (delta_screen_x * float(camera.data.ortho_scale))
    bpy.context.view_layer.update()


def set_frame(scene, frame: float) -> None:
    whole = math.floor(frame)
    scene.frame_set(whole, subframe=frame - whole)
    bpy.context.view_layer.update()


def sample_frames(action, spec) -> list[float]:
    action_start, action_end = (float(value) for value in action.frame_range)
    start = max(action_start, float(spec.get("start", action_start)))
    count = int(spec["count"])
    samples = [start + 0.8 * index for index in range(count)]
    if samples[-1] > action_end + 0.001:
        raise RuntimeError(
            f"Sample range for {spec['id']} exceeds FBX padding: {samples[-1]} > {action_end}"
        )
    return samples


def render_action(scene, camera, materials, output_root: Path, spec: dict) -> dict:
    fbx_root = ROOT / str(spec.get("root", "testing/unreal-survival-motion-v2/SourceAssets/ual-exports"))
    fbx = fbx_root / str(spec["file"])
    if not fbx.exists():
        raise FileNotFoundError(f"UAL-to-Survival FBX missing: {fbx}")
    before = set(scene.objects)
    bpy.ops.import_scene.fbx(filepath=str(fbx), automatic_bone_orientation=False)
    imported = [obj for obj in scene.objects if obj not in before]
    meshes = [obj for obj in imported if obj.type == "MESH"]
    armatures = [obj for obj in imported if obj.type == "ARMATURE"]
    if len(meshes) != 1 or len(armatures) != 1:
        raise RuntimeError(f"{spec['id']}: expected one mesh/armature, found {len(meshes)}/{len(armatures)}")
    mesh, armature = meshes[0], armatures[0]
    if len(mesh.material_slots) != len(MATERIAL_ORDER):
        raise RuntimeError(f"{spec['id']}: expected 12 material slots, found {len(mesh.material_slots)}")
    for index, name in enumerate(MATERIAL_ORDER):
        mesh.material_slots[index].material = materials[name]
    action = armature.animation_data.action if armature.animation_data else None
    if action is None:
        raise RuntimeError(f"{spec['id']}: FBX has no assigned action")

    samples = sample_frames(action, spec)
    set_frame(scene, samples[0])
    neutral_locations = {
        name: armature.pose.bones[name].location.copy()
        for name in ("root", "pelvis")
        if armature.pose.bones.get(name)
    }
    neutral_armature_location = armature.location.copy()
    neutral_armature_rotation = armature.rotation_euler.copy()
    action_output = output_root / str(spec["id"])
    if action_output.exists():
        shutil.rmtree(action_output)
    action_output.mkdir(parents=True)
    frame_names = []
    frame_markers = {}
    target_screen_x = None
    for index, frame in enumerate(samples):
        set_frame(scene, frame)
        armature.location = neutral_armature_location
        armature.rotation_euler = neutral_armature_rotation
        for bone_name, neutral in neutral_locations.items():
            bone = armature.pose.bones[bone_name]
            bone.location.x = neutral.x
            bone.location.y = neutral.y
        bpy.context.view_layer.update()
        if spec.get("recenter_horizontal"):
            pelvis = armature.pose.bones.get("pelvis")
            if pelvis is not None:
                world_point = armature.matrix_world @ pelvis.head
                camera_point = world_to_camera_view(scene, camera, world_point)
                if target_screen_x is None:
                    target_screen_x = float(camera_point.x)
                recenter_horizontal(scene, camera, armature, target_screen_x)
        frozen_pose = {
            bone.name: bone.matrix_basis.copy()
            for bone in armature.pose.bones
        }
        frozen_location = armature.location.copy()
        frozen_rotation = armature.rotation_euler.copy()
        frozen_scale = armature.scale.copy()
        if armature.animation_data:
            armature.animation_data.action = None
        armature.location = frozen_location
        armature.rotation_euler = frozen_rotation
        armature.scale = frozen_scale
        for bone_name, matrix_basis in frozen_pose.items():
            armature.pose.bones[bone_name].matrix_basis = matrix_basis
        bpy.context.view_layer.update()
        frame_markers[str(index)] = project_markers(scene, camera, armature)
        frame_name = f"frame-{index:03d}.png"
        scene.render.filepath = str(action_output / frame_name)
        bpy.ops.render.render(write_still=True)
        frame_names.append(frame_name)
        if armature.animation_data:
            armature.animation_data.action = action

    manifest = {
        "version": 1,
        "pipeline": PIPELINE_ID,
        "action": spec["id"],
        "source": "unreal-ual-to-survival",
        "source_clip": spec["clip"],
        "source_clips": [spec["clip"]],
        "frame_size": FRAME_SIZE,
        "fps": 30,
        "loop": spec["loop"],
        "source_frame_range": list(action.frame_range),
        "source_frame_ranges": [{
            "clip": spec["clip"],
            "action_frame_range": list(action.frame_range),
            "sampled_frame_range": [samples[0], samples[-1]],
        }],
        "sampled_source_frames": [{"clip": spec["clip"], "frame": frame} for frame in samples],
        "frames": frame_names,
        "recenter_horizontal": bool(spec.get("recenter_horizontal")),
        "game_retarget": {
            "authority": "Unreal Engine 5.8 IK Retargeter",
            "retargeter": "RTG_UAL_To_SurvivalCharacter_v1",
            "target_pose": "UAL_SourceAligned",
        },
        "motion_origin": "unreal-ik-retargeted-ual",
        "visual_skin": VISUAL_SKIN,
        "rig_markers": {
            "version": 1,
            "space": "render-frame-px",
            "source": "projected-survival-bones",
            "bone_points": MARKER_BONES,
            "marker_names": list(MARKER_BONES),
            "frames": frame_markers,
        },
        "weapon": None,
    }
    (action_output / "render-manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)
    print(f"SURVIVAL_UAL_RENDER action={spec['id']} frames={len(samples)}", flush=True)
    return manifest


def main() -> None:
    args = parse_args()
    output = Path(args.output).resolve()
    requested = {value.strip() for value in args.actions.split(",") if value.strip()}
    unknown = requested - {str(spec["id"]) for spec in ACTION_SPECS}
    if unknown:
        raise ValueError(f"Unknown actions: {sorted(unknown)}")
    specs = tuple(spec for spec in ACTION_SPECS if not requested or spec["id"] in requested)
    materials = prepare_materials()
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    scene, camera = configure_scene()
    output.mkdir(parents=True, exist_ok=True)
    manifests = {
        str(spec["id"]): render_action(scene, camera, materials, output, spec)
        for spec in specs
    }
    source_manifest = {
        "version": 1,
        "pipeline": PIPELINE_ID,
        "frame_size": FRAME_SIZE,
        "orthographic_scale": ORTHOGRAPHIC_SCALE,
        "weapon_policy": "none",
        "visual_skin": VISUAL_SKIN,
        "actions": manifests,
    }
    (output / "source-manifest.json").write_text(
        json.dumps(source_manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"SURVIVAL_UAL_RENDER_OK actions={len(manifests)} output={output}", flush=True)


if __name__ == "__main__":
    main()
