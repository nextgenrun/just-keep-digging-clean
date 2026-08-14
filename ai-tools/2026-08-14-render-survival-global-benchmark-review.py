"""Render the complete Survival motion inventory with the approved review grade.

This is an isolated mockup exporter. It never saves the Blender master and it
does not write to runtime sheets or manifests.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = (
    ROOT
    / "visual-approval-previews"
    / "2026-08-14-survival-global-benchmark-v1"
    / "renders"
)
FRAME_SIZE = 512
SAMPLE_COUNT = 8
REVIEW_TEXTURE_LIMIT = 2048
SOURCE_TEXTURE_ROOT = (
    ROOT / "sprites" / "character" / "survival-character-fab-v1" / "source" / "Textures"
)
REVIEW_TEXTURE_ROOT = (
    ROOT
    / "visual-approval-previews"
    / "2026-08-14-survival-global-benchmark-v1"
    / "texture-cache-2k"
)
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
FBX_ROOT = ROOT / "testing" / "unreal-survival-motion-v2" / "SourceAssets" / "ual-exports"

ACTION_SPECS = (
    {"id": "idle", "file": "survival-ual-idle-loop.fbx", "loop": True},
    {"id": "idle-talk", "file": "survival-ual-idle-talking-loop.fbx", "loop": True},
    {"id": "walk", "file": "survival-ual-jog-fwd-loop.fbx", "loop": True},
    {"id": "run", "master_action": "MINER_run", "loop": True, "authority": "approved-blender-rollback"},
    {"id": "crouch", "file": "survival-ual-crouch-idle-loop.fbx", "loop": True},
    {"id": "airborne", "file": "survival-ual-jump-start.fbx", "loop": False},
    {"id": "falling", "file": "survival-ual-jump-loop.fbx", "loop": True},
    {"id": "fly", "file": "survival-ual-shield-dash.fbx", "loop": False, "start": 2.6, "end": 13.0},
    {"id": "climb", "file": "survival-ual-climbup-1m.fbx", "loop": True},
    {"id": "landing", "file": "survival-ual-jump-land.fbx", "loop": False},
    {"id": "punch-jab", "file": "survival-ual-punch-jab.fbx", "loop": False},
    {"id": "punch-cross", "file": "survival-ual-punch-cross.fbx", "loop": False},
    {"id": "punch-uppercut", "file": "survival-ual-melee-hook.fbx", "loop": False, "recenter": True, "ortho_scale": 3.1},
    {"id": "pickaxe-mining", "file": "survival-ual-treechopping-loop.fbx", "loop": True},
    {"id": "ground-strike", "file": "survival-ual-overhandthrow.fbx", "loop": False},
    {"id": "wall-push", "file": "survival-ual-push-loop.fbx", "loop": True},
    {"id": "teleport", "file": "survival-ual-roll.fbx", "loop": False, "recenter": True},
    {"id": "thunder-charge", "file": "survival-ual-spell-simple-idle-loop.fbx", "loop": True},
    {"id": "hit-react", "file": "survival-ual-hit-chest.fbx", "loop": False},
    {"id": "death", "file": "survival-ual-death01.fbx", "loop": False, "recenter": True, "ortho_scale": 3.3},
)
LOCATION_PATHS = {
    "location",
    'pose.bones["pelvis"].location',
    'pose.bones["root"].location',
}


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--actions", default="")
    parser.add_argument("--size", type=int, default=FRAME_SIZE)
    parser.add_argument("--samples", type=int, default=SAMPLE_COUNT)
    return parser.parse_args(argv)


def iter_fcurves(action: bpy.types.Action):
    for layer in action.layers:
        for strip in layer.strips:
            for channelbag in strip.channelbags:
                yield from channelbag.fcurves


def ensure_approved_rollback_run() -> bpy.types.Action:
    existing = bpy.data.actions.get("MINER_run")
    if existing is not None:
        return existing
    source = bpy.data.actions.get("SRC_run")
    if source is None:
        raise RuntimeError("Neither MINER_run nor its protected SRC_run authority exists")
    action = source.copy()
    action.name = "MINER_run_REVIEW_ONLY"
    start = float(action.frame_range[0])
    for curve in iter_fcurves(action):
        if curve.data_path not in LOCATION_PATHS:
            continue
        reference = curve.evaluate(start)
        for point in curve.keyframe_points:
            for coordinate in (point.co, point.handle_left, point.handle_right):
                coordinate.y = reference
    action.use_cyclic = True
    action["reviewOnly"] = True
    action["sourceAuthority"] = "SRC_run using the protected MINER_run normalization recipe"
    return action


def configure_review_scene(size: int) -> tuple[bpy.types.Scene, bpy.types.Object]:
    scene = bpy.context.scene
    camera = bpy.data.objects.get("SurvivalPolishCamera")
    if camera is None:
        raise RuntimeError("Protected SurvivalPolishCamera is missing")
    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 15
    scene.render.fps = 30
    scene.world.color = (0.008, 0.012, 0.018)
    try:
        scene.view_settings.view_transform = "AgX"
    except TypeError:
        pass
    scene.view_settings.look = "AgX - Medium High Contrast"

    cinematic_lights = []
    for obj in bpy.data.objects:
        if obj.type == "LIGHT":
            approved = obj.name.startswith("SurvivalCinematic")
            obj.hide_render = not approved
            if approved:
                cinematic_lights.append(obj.name)
        if obj.name.startswith("ACC_") or obj.name == "SurvivalMinerPickaxe":
            obj.hide_render = True
    if len(cinematic_lights) != 4:
        raise RuntimeError(f"Expected four SurvivalCinematic lights, found {cinematic_lights}")

    cache_manifest = REVIEW_TEXTURE_ROOT / "texture-cache-manifest.json"
    if not cache_manifest.is_file():
        raise FileNotFoundError(
            f"Review texture cache is missing; run the dated cache builder first: {cache_manifest}"
        )
    corrected_normals = []
    relinked_textures = []
    for image in bpy.data.images:
        identity = f"{image.name} {image.filepath}".lower()
        if "normal" in identity:
            image.colorspace_settings.name = "Non-Color"
            corrected_normals.append(image.name)
        raw_path = Path(bpy.path.abspath(image.filepath)).resolve(strict=False)
        try:
            relative = raw_path.relative_to(SOURCE_TEXTURE_ROOT.resolve(strict=False))
        except ValueError:
            continue
        cached = REVIEW_TEXTURE_ROOT / relative
        if "<UDIM>" in str(cached):
            candidates = list(cached.parent.glob(cached.name.replace("<UDIM>", "*")))
            if not candidates:
                continue
        elif not cached.is_file():
            continue
        image.filepath = str(cached)
        image.reload()
        relinked_textures.append(image.name)
    if not corrected_normals:
        raise RuntimeError("No normal maps were corrected")
    if not relinked_textures:
        raise RuntimeError("No source textures were relinked to the review cache")
    return scene, camera


def set_preserve_volume(mesh: bpy.types.Object) -> int:
    count = 0
    for modifier in mesh.modifiers:
        if modifier.type == "ARMATURE":
            modifier.use_deform_preserve_volume = True
            count += 1
    return count


def apply_full_glove_override(mesh: bpy.types.Object) -> int:
    glove_slot = next(
        (
            index
            for index, slot in enumerate(mesh.material_slots)
            if slot.material is not None and slot.material.name == "Gloves1"
        ),
        None,
    )
    if glove_slot is None:
        raise RuntimeError(f"{mesh.name} has no Gloves1 material slot")
    finger_tokens = ("index_", "middle_", "ring_", "pinky_", "thumb_")
    finger_group_indices = {
        group.index
        for group in mesh.vertex_groups
        if any(token in group.name.lower() for token in finger_tokens)
    }
    if not finger_group_indices:
        raise RuntimeError(f"{mesh.name} has no finger vertex groups")
    finger_weights = []
    for vertex in mesh.data.vertices:
        weight = sum(
            assignment.weight
            for assignment in vertex.groups
            if assignment.group in finger_group_indices
        )
        finger_weights.append(weight)
    changed = 0
    for polygon in mesh.data.polygons:
        score = min(finger_weights[index] for index in polygon.vertices)
        if score < 0.5 or polygon.material_index == glove_slot:
            continue
        polygon.material_index = glove_slot
        changed += 1
    if changed == 0:
        print(f"GLOBAL_BENCHMARK_FULL_GLOVE existing=True mesh={mesh.name}", flush=True)
    else:
        print(f"GLOBAL_BENCHMARK_FULL_GLOVE polygons={changed} mesh={mesh.name}", flush=True)
    return changed


def sample_frames(action: bpy.types.Action, spec: dict, count: int) -> list[float]:
    action_start, action_end = (float(value) for value in action.frame_range)
    start = max(action_start, float(spec.get("start", action_start)))
    end = min(action_end, float(spec.get("end", action_end)))
    if count <= 1:
        return [(start + end) * 0.5]
    denominator = count if spec["loop"] else count - 1
    return [start + (end - start) * index / denominator for index in range(count)]


def set_frame(scene: bpy.types.Scene, frame: float) -> None:
    whole = math.floor(frame)
    scene.frame_set(whole, subframe=frame - whole)
    bpy.context.view_layer.update()


def reset_horizontal_motion(
    armature: bpy.types.Object,
    neutral_armature_location: Vector,
    neutral_armature_rotation,
    neutral_bones: dict[str, Vector],
) -> None:
    armature.location = neutral_armature_location
    armature.rotation_euler = neutral_armature_rotation
    for bone_name, neutral in neutral_bones.items():
        bone = armature.pose.bones.get(bone_name)
        if bone is not None:
            bone.location.x = neutral.x
            bone.location.y = neutral.y


def center_pelvis(scene: bpy.types.Scene, camera: bpy.types.Object, armature: bpy.types.Object) -> None:
    pelvis = armature.pose.bones.get("pelvis")
    if pelvis is None:
        return
    world_point = armature.matrix_world @ pelvis.head
    camera_point = world_to_camera_view(scene, camera, world_point)
    delta_screen_x = 0.5 - float(camera_point.x)
    camera_right = camera.matrix_world.to_quaternion() @ Vector((1.0, 0.0, 0.0))
    camera.location -= camera_right * (delta_screen_x * float(camera.data.ortho_scale))
    bpy.context.view_layer.update()


def render_frames(
    scene: bpy.types.Scene,
    camera: bpy.types.Object,
    mesh: bpy.types.Object,
    armature: bpy.types.Object,
    action: bpy.types.Action,
    output: Path,
    spec: dict,
    count: int,
) -> dict:
    output.mkdir(parents=True, exist_ok=True)
    for stale in output.glob("frame-*.png"):
        stale.unlink()
    armature.animation_data_create()
    armature.animation_data.action = action
    samples = sample_frames(action, spec, count)
    set_frame(scene, samples[0])
    neutral_location = armature.location.copy()
    neutral_rotation = armature.rotation_euler.copy()
    neutral_bones = {
        name: armature.pose.bones[name].location.copy()
        for name in ("root", "pelvis")
        if armature.pose.bones.get(name)
    }
    initial_camera_x = camera.location.x
    initial_camera_location = camera.location.copy()
    initial_ortho_scale = float(camera.data.ortho_scale)
    camera.data.ortho_scale = float(spec.get("ortho_scale", initial_ortho_scale))
    preserve_modifiers = set_preserve_volume(mesh)
    if preserve_modifiers == 0:
        raise RuntimeError(f"{spec['id']} has no armature modifier")
    full_glove_polygons = apply_full_glove_override(mesh)

    for index, frame in enumerate(samples):
        set_frame(scene, frame)
        reset_horizontal_motion(armature, neutral_location, neutral_rotation, neutral_bones)
        camera.location = initial_camera_location
        if spec.get("recenter"):
            center_pelvis(scene, camera, armature)
        bpy.context.view_layer.update()
        scene.render.filepath = str(output / f"frame-{index:03d}.png")
        bpy.ops.render.render(write_still=True)
        print(f"GLOBAL_BENCHMARK action={spec['id']} frame={index + 1}/{len(samples)}", flush=True)
    camera.location = initial_camera_location
    camera.data.ortho_scale = initial_ortho_scale
    return {
        "id": spec["id"],
        "loop": bool(spec["loop"]),
        "frames": [f"frame-{index:03d}.png" for index in range(len(samples))],
        "sampled_source_frames": samples,
        "motion_authority": spec.get("authority", "current-ual-survival-fbx"),
        "source": spec.get("master_action", spec.get("file")),
        "preserve_volume": True,
        "full_glove_polygon_overrides": full_glove_polygons,
    }


def imported_action(
    scene: bpy.types.Scene,
    materials: dict[str, bpy.types.Material],
    spec: dict,
) -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Action, list[bpy.types.Object]]:
    fbx = FBX_ROOT / spec["file"]
    if not fbx.is_file():
        raise FileNotFoundError(fbx)
    before = set(scene.objects)
    bpy.ops.import_scene.fbx(filepath=str(fbx), automatic_bone_orientation=False)
    imported = [obj for obj in scene.objects if obj not in before]
    meshes = [obj for obj in imported if obj.type == "MESH"]
    armatures = [obj for obj in imported if obj.type == "ARMATURE"]
    if len(meshes) != 1 or len(armatures) != 1:
        raise RuntimeError(f"{spec['id']}: expected one imported mesh/rig, found {len(meshes)}/{len(armatures)}")
    mesh, armature = meshes[0], armatures[0]
    if len(mesh.material_slots) != len(MATERIAL_ORDER):
        raise RuntimeError(f"{spec['id']}: expected 12 material slots, found {len(mesh.material_slots)}")
    for index, name in enumerate(MATERIAL_ORDER):
        mesh.material_slots[index].material = materials[name]
    action = armature.animation_data.action if armature.animation_data else None
    if action is None:
        raise RuntimeError(f"{spec['id']}: imported FBX has no action")
    return mesh, armature, action, imported


def main() -> None:
    args = parse_args()
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    requested = {item.strip() for item in args.actions.split(",") if item.strip()}
    known = {spec["id"] for spec in ACTION_SPECS}
    unknown = requested - known
    if unknown:
        raise ValueError(f"Unknown actions: {sorted(unknown)}")
    specs = [spec for spec in ACTION_SPECS if not requested or spec["id"] in requested]

    scene, camera = configure_review_scene(args.size)
    base_mesh = bpy.data.objects.get("SurvivalPolishBody")
    base_rig = bpy.data.objects.get("SurvivalPolishRig")
    if base_mesh is None or base_rig is None:
        raise RuntimeError("Protected Survival mesh/rig is missing")
    materials = {name: bpy.data.materials.get(name) for name in MATERIAL_ORDER}
    missing_materials = [name for name, value in materials.items() if value is None]
    if missing_materials:
        raise RuntimeError(f"Missing protected materials: {missing_materials}")

    manifest_actions = {}
    for spec in specs:
        imported: list[bpy.types.Object] = []
        if spec.get("master_action"):
            base_mesh.hide_render = False
            action = ensure_approved_rollback_run()
            mesh, armature = base_mesh, base_rig
        else:
            base_mesh.hide_render = True
            mesh, armature, action, imported = imported_action(scene, materials, spec)
        manifest_actions[spec["id"]] = render_frames(
            scene,
            camera,
            mesh,
            armature,
            action,
            output / spec["id"],
            spec,
            args.samples,
        )
        for obj in imported:
            bpy.data.objects.remove(obj, do_unlink=True)

    manifest = {
        "version": 1,
        "reviewOnly": True,
        "productionChanged": False,
        "benchmark": {
            "lighting": "four SurvivalCinematic lights only",
            "normal_maps": "Non-Color",
            "view_transform": "AgX",
            "look": "AgX - Medium High Contrast",
            "deformation": "preserve volume enabled",
            "render_size": args.size,
            "sample_count": args.samples,
            "review_texture_limit": REVIEW_TEXTURE_LIMIT,
            "review_texture_cache": str(REVIEW_TEXTURE_ROOT.relative_to(ROOT)).replace("\\", "/"),
            "accepted_motion_override": "run -> MINER_run Blender rollback",
            "rejected_motion_sources": ["Epic GASP comparison set"],
        },
        "actions": manifest_actions,
    }
    (output / "review-render-manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"GLOBAL_BENCHMARK_OK actions={len(manifest_actions)} output={output}", flush=True)


main()
