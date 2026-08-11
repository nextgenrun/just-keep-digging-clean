"""Build five review-only full-body follow variants for the ground strike.

Run with Blender 5.1:
  blender -b <ground-strike-hand-contact-v1.blend> --python <this file> -- --preview-only

The script never modifies the input file, protected action, runtime animation
profiles, or exported game assets. Each approach is saved into its own review
folder with rendered evidence.
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


REPO_ROOT = Path(__file__).resolve().parents[1]
INPUT_BLEND = (
    REPO_ROOT
    / "testing"
    / "blender-animation-lab-v1"
    / "review-drafts"
    / "ground-strike-hand-contact-v1"
    / "ground-strike-hand-contact-v1.blend"
)
OUTPUT_ROOT = (
    REPO_ROOT
    / "testing"
    / "blender-animation-lab-v1"
    / "review-drafts"
    / "ground-strike-body-follow-5way-v1"
)
ADDON_ROOT = REPO_ROOT / "testing" / "blender-animation-lab-v1" / "addon"

if str(ADDON_ROOT) not in sys.path:
    sys.path.insert(0, str(ADDON_ROOT))

from dig_game_animation_lab.action_api import assign_action, iter_fcurves


CONTACT_FRAME = 16
START_FRAME = 1
END_FRAME = 34
GROUND_Z = -0.025
HAND_TAIL_CONTACT_Z = -0.005
EDIT_WINDOW = range(8, 25)
PREVIEW_FRAMES = [8, 10, 12, 14, 16, 18, 20, 22, 24]
PREVIEW_ONLY = "--preview-only" in sys.argv
RENDER_FRAMES = PREVIEW_FRAMES if PREVIEW_ONLY else list(range(START_FRAME, END_FRAME + 1))

VARIANTS = [
    {
        "id": "01-upper-body-hinge",
        "label": "Upper-body hinge",
        "description": "Restrained hip drop; chest and neck carry more of the reach.",
        "pelvis_down": 0.055,
        "pelvis_forward": 0.025,
        "spine_degrees": [-1.5, -2.0, -2.6, -2.8, -2.1],
        "neck_degrees": [2.2, 1.6, 0.8],
        "hold": False,
    },
    {
        "id": "02-balanced-chain",
        "label": "Balanced chain",
        "description": "Even support through hips, spine, neck, and both knees.",
        "pelvis_down": 0.095,
        "pelvis_forward": 0.045,
        "spine_degrees": [-1.0, -1.5, -2.0, -2.1, -1.6],
        "neck_degrees": [1.9, 1.4, 0.7],
        "hold": False,
    },
    {
        "id": "03-deep-athletic-crouch",
        "label": "Deep athletic crouch",
        "description": "The knees and hips absorb most of the distance to the floor.",
        "pelvis_down": 0.120,
        "pelvis_forward": 0.025,
        "spine_degrees": [-0.6, -1.0, -1.4, -1.5, -1.1],
        "neck_degrees": [1.5, 1.0, 0.5],
        "hold": False,
    },
    {
        "id": "04-forward-lunge",
        "label": "Forward lunge",
        "description": "The pelvis travels toward the strike while the feet remain planted.",
        "pelvis_down": 0.085,
        "pelvis_forward": 0.095,
        "spine_degrees": [-1.4, -2.0, -2.7, -2.9, -2.2],
        "neck_degrees": [2.4, 1.7, 0.9],
        "hold": False,
    },
    {
        "id": "05-impact-compression",
        "label": "Impact compression",
        "description": "Faster whole-body compression with a short weighted contact hold.",
        "pelvis_down": 0.130,
        "pelvis_forward": 0.065,
        "spine_degrees": [-1.8, -2.3, -3.0, -3.2, -2.4],
        "neck_degrees": [3.0, 2.0, 1.0],
        "hold": True,
    },
]

SPINE_BONES = ["spine_01", "spine_02", "spine_03", "spine_04", "spine_05"]
NECK_BONES = ["neck_01", "neck_02", "head"]
KEYED_BONES = [
    "pelvis",
    *SPINE_BONES,
    *NECK_BONES,
    "clavicle_r",
    "upperarm_r",
    "lowerarm_r",
    "hand_r",
    "thigh_l",
    "calf_l",
    "foot_l",
    "ball_l",
    "thigh_r",
    "calf_r",
    "foot_r",
    "ball_r",
]


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def pose_weight(frame: int, hold: bool) -> float:
    if hold:
        if frame <= 15:
            return smoothstep((frame - 8.0) / 7.0)
        if frame <= 18:
            return 1.0
        return smoothstep((24.0 - frame) / 6.0)
    if frame <= CONTACT_FRAME:
        return smoothstep((frame - 8.0) / 8.0)
    return smoothstep((24.0 - frame) / 8.0)


def action_signature(rig, action) -> str:
    digest = hashlib.sha256()
    curves = sorted(iter_fcurves(rig, action), key=lambda item: (item.data_path, item.array_index))
    for curve in curves:
        digest.update(f"{curve.data_path}|{curve.array_index}|".encode("utf-8"))
        for point in curve.keyframe_points:
            digest.update(f"{point.co.x:.7f},{point.co.y:.7f};".encode("ascii"))
    return digest.hexdigest()


def key_pose_bone(bone, frame: int) -> None:
    bone.keyframe_insert(data_path="location", frame=frame, group=bone.name)
    if bone.rotation_mode == "QUATERNION":
        bone.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=bone.name)
    elif bone.rotation_mode == "AXIS_ANGLE":
        bone.keyframe_insert(data_path="rotation_axis_angle", frame=frame, group=bone.name)
    else:
        bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=bone.name)
    bone.keyframe_insert(data_path="scale", frame=frame, group=bone.name)


def world_point(rig, point) -> Vector:
    return rig.matrix_world @ point


def translate_bone_world(rig, bone, delta_world: Vector) -> None:
    delta_armature = rig.matrix_world.to_3x3().inverted() @ delta_world
    matrix = bone.matrix.copy()
    matrix.translation += delta_armature
    bone.matrix = matrix
    bpy.context.view_layer.update()


def rotate_bone_world(rig, bone, degrees: float, weight: float) -> None:
    angle = math.radians(degrees) * weight
    if abs(angle) < 0.000001:
        return
    matrix_world = rig.matrix_world @ bone.matrix
    pivot = matrix_world.translation.copy()
    rotation = Matrix.Rotation(angle, 4, Vector((0.0, 1.0, 0.0)))
    matrix_world = Matrix.Translation(pivot) @ rotation @ Matrix.Translation(-pivot) @ matrix_world
    bone.matrix = rig.matrix_world.inverted() @ matrix_world
    bpy.context.view_layer.update()


def bake_ik(rig, end_name: str, target_world: Vector, chain_names: list[str]) -> None:
    end_bone = rig.pose.bones[end_name]
    target = bpy.data.objects.new(f"DGAL_TEMP_IK_{end_name}", None)
    bpy.context.scene.collection.objects.link(target)
    target.empty_display_type = "PLAIN_AXES"
    target.empty_display_size = 0.03
    target.location = target_world

    constraint = end_bone.constraints.new("IK")
    constraint.name = "DGAL_TEMP_REVIEW_IK"
    constraint.target = target
    constraint.chain_count = len(chain_names)
    constraint.iterations = 100
    constraint.use_stretch = False
    if hasattr(constraint, "use_rotation"):
        constraint.use_rotation = False
    bpy.context.view_layer.update()

    solved = {name: rig.pose.bones[name].matrix.copy() for name in chain_names}
    end_bone.constraints.remove(constraint)
    bpy.data.objects.remove(target, do_unlink=True)
    bpy.context.view_layer.update()

    for name in chain_names:
        rig.pose.bones[name].matrix = solved[name]
        bpy.context.view_layer.update()


def set_pose_bone_world_matrix(rig, bone, world_matrix: Matrix) -> None:
    bone.matrix = rig.matrix_world.inverted() @ world_matrix
    bpy.context.view_layer.update()


def add_material(name: str, base_color, roughness: float = 0.8, emission=None):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = base_color
    principled.inputs["Roughness"].default_value = roughness
    if emission is not None:
        principled.inputs["Emission Color"].default_value = emission
        principled.inputs["Emission Strength"].default_value = 2.5
    return material


def add_review_stage(contact_xy: tuple[float, float]) -> None:
    for name in ["DGAL_REVIEW_FLOOR", "DGAL_CONTACT_RING"]:
        old = bpy.data.objects.get(name)
        if old:
            bpy.data.objects.remove(old, do_unlink=True)

    bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object and bpy.context.object.mode != "OBJECT" else None
    bpy.ops.mesh.primitive_plane_add(size=4.0, location=(0.0, 0.0, GROUND_Z))
    floor = bpy.context.object
    floor.name = "DGAL_REVIEW_FLOOR"
    floor.data.materials.append(add_material("DGAL Review Floor", (0.027, 0.032, 0.038, 1.0), 0.92))

    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.105,
        minor_radius=0.006,
        major_segments=64,
        minor_segments=8,
        location=(contact_xy[0], contact_xy[1], GROUND_Z + 0.006),
    )
    ring = bpy.context.object
    ring.name = "DGAL_CONTACT_RING"
    ring.data.materials.append(
        add_material(
            "DGAL Contact Amber",
            (0.95, 0.34, 0.055, 1.0),
            0.35,
            emission=(0.95, 0.12, 0.01, 1.0),
        )
    )


def configure_render(scene) -> None:
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 448
    scene.render.resolution_y = 448
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.fps = 14
    if scene.camera and scene.camera.data.type == "ORTHO":
        scene.camera.data.ortho_scale = 2.0
    if scene.world:
        scene.world.color = (0.005, 0.006, 0.008)
        scene.world.use_nodes = True
        background = scene.world.node_tree.nodes.get("Background")
        if background:
            background.inputs["Color"].default_value = (0.004, 0.005, 0.007, 1.0)
            background.inputs["Strength"].default_value = 0.16
    if hasattr(scene, "view_settings"):
        scene.view_settings.look = "Medium High Contrast"


def hide_workspace_helpers(scene) -> None:
    """Keep rig controls and instructional labels out of review renders."""
    helper_tokens = ("label", "guide", "callout", "control", "hitbox")
    for obj in scene.objects:
        lower_name = obj.name.lower()
        if obj.type in {"ARMATURE", "FONT"} or any(token in lower_name for token in helper_tokens):
            obj.hide_render = True


def mesh_min_z(scene, name: str) -> float | None:
    obj = bpy.data.objects.get(name)
    if not obj:
        return None
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    values = [(evaluated.matrix_world @ Vector(corner)).z for corner in evaluated.bound_box]
    return min(values) if values else None


def render_variant(scene, variant_dir: Path) -> None:
    frames_dir = variant_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    for old in frames_dir.glob("frame_*.png"):
        old.unlink()
    for frame in RENDER_FRAMES:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        scene.render.filepath = str(frames_dir / f"frame_{frame:04d}.png")
        bpy.ops.render.render(write_still=True)


def build_variant(variant: dict) -> dict:
    bpy.ops.wm.open_mainfile(filepath=str(INPUT_BLEND))
    scene = bpy.context.scene
    rig = bpy.data.objects["root"]
    source = bpy.data.actions["DGAL_ground-strike"]
    editable = bpy.data.actions.get("DGAL_EDIT_ground-strike_hand-contact-v1")
    if editable is None:
        editable = bpy.data.actions["DGAL_EDIT_ground-strike_hand_contact-v1"]

    protected_before = action_signature(rig, source)
    action = editable.copy()
    action.name = f"DGAL_REVIEW_{variant['id']}"
    action.use_fake_user = True
    action["dgal_review_only"] = True
    action["dgal_source_action"] = source.name
    action["productionChanged"] = False
    assign_action(rig, action)

    scene.frame_start = START_FRAME
    scene.frame_end = END_FRAME
    scene.frame_set(CONTACT_FRAME)
    bpy.context.view_layer.update()
    contact_tail = world_point(rig, rig.pose.bones["hand_r"].tail)
    contact_tail.z = HAND_TAIL_CONTACT_Z
    contact_xy = (float(contact_tail.x), float(contact_tail.y))

    for frame in EDIT_WINDOW:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        weight = pose_weight(frame, variant["hold"])
        if weight <= 0.000001:
            continue

        original_calf_tails = {
            side: world_point(rig, rig.pose.bones[f"calf_{side}"].tail).copy()
            for side in ("l", "r")
        }
        original_foot_world = {
            side: (rig.matrix_world @ rig.pose.bones[f"foot_{side}"].matrix).copy()
            for side in ("l", "r")
        }
        original_ball_world = {
            side: (rig.matrix_world @ rig.pose.bones[f"ball_{side}"].matrix).copy()
            for side in ("l", "r")
        }
        original_hand_tail = world_point(rig, rig.pose.bones["hand_r"].tail).copy()

        translate_bone_world(
            rig,
            rig.pose.bones["pelvis"],
            Vector(
                (
                    -variant["pelvis_forward"] * weight,
                    0.0,
                    -variant["pelvis_down"] * weight,
                )
            ),
        )

        for bone_name, degrees in zip(SPINE_BONES, variant["spine_degrees"]):
            rotate_bone_world(rig, rig.pose.bones[bone_name], degrees, weight)
        for bone_name, degrees in zip(NECK_BONES, variant["neck_degrees"]):
            rotate_bone_world(rig, rig.pose.bones[bone_name], degrees, weight)

        for side in ("l", "r"):
            bake_ik(
                rig,
                f"calf_{side}",
                original_calf_tails[side],
                [f"thigh_{side}", f"calf_{side}"],
            )
            set_pose_bone_world_matrix(rig, rig.pose.bones[f"foot_{side}"], original_foot_world[side])
            set_pose_bone_world_matrix(rig, rig.pose.bones[f"ball_{side}"], original_ball_world[side])

        hand_target = original_hand_tail.lerp(contact_tail, weight)
        bake_ik(
            rig,
            "hand_r",
            hand_target,
            ["upperarm_r", "lowerarm_r", "hand_r"],
        )

        actual_tail = world_point(rig, rig.pose.bones["hand_r"].tail)
        residual = hand_target - actual_tail
        if residual.length > 0.00001:
            translate_bone_world(rig, rig.pose.bones["hand_r"], residual)

        for bone_name in KEYED_BONES:
            bone = rig.pose.bones.get(bone_name)
            if bone:
                key_pose_bone(bone, frame)

    protected_after = action_signature(rig, source)
    if protected_before != protected_after:
        raise RuntimeError(f"Protected source action changed while building {variant['id']}")

    add_review_stage(contact_xy)
    hide_workspace_helpers(scene)
    configure_render(scene)
    scene["dgal_review_variant"] = variant["id"]
    scene["dgal_review_description"] = variant["description"]
    scene["dgal_review_only"] = True
    scene["productionChanged"] = False
    scene["dgal_contact_target_world"] = [contact_tail.x, contact_tail.y, contact_tail.z]
    scene.frame_set(CONTACT_FRAME)
    bpy.context.view_layer.update()

    variant_dir = OUTPUT_ROOT / variant["id"]
    variant_dir.mkdir(parents=True, exist_ok=True)
    blend_path = variant_dir / f"{variant['id']}.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), check_existing=False)

    hand_tail = world_point(rig, rig.pose.bones["hand_r"].tail)
    verification = {
        "id": variant["id"],
        "label": variant["label"],
        "description": variant["description"],
        "reviewOnly": True,
        "productionChanged": False,
        "contactFrame": CONTACT_FRAME,
        "handTailWorld": [round(value, 5) for value in hand_tail],
        "contactTargetWorld": [round(value, 5) for value in contact_tail],
        "contactError": round((hand_tail - contact_tail).length, 6),
        "gloveMinZ": round(mesh_min_z(scene, "Gloves"), 5),
        "shoeMinZ": round(mesh_min_z(scene, "Shoes"), 5),
        "groundZ": GROUND_Z,
        "protectedSourceSignatureBefore": protected_before,
        "protectedSourceSignatureAfter": protected_after,
        "renderMode": "preview" if PREVIEW_ONLY else "full",
        "renderFrames": RENDER_FRAMES,
    }
    (variant_dir / "verification.json").write_text(
        json.dumps(verification, indent=2) + "\n",
        encoding="utf-8",
    )

    render_variant(scene, variant_dir)
    print("DGAL_VARIANT_BUILT " + json.dumps(verification, separators=(",", ":")))
    return verification


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    results = [build_variant(variant) for variant in VARIANTS]
    summary = {
        "id": "ground-strike-body-follow-5way-v1",
        "input": str(INPUT_BLEND),
        "reviewOnly": True,
        "productionChanged": False,
        "previewOnly": PREVIEW_ONLY,
        "results": results,
    }
    (OUTPUT_ROOT / "verification-summary.json").write_text(
        json.dumps(summary, indent=2) + "\n",
        encoding="utf-8",
    )
    print("DGAL_REVIEW_COMPLETE " + json.dumps(summary, separators=(",", ":")))


if __name__ == "__main__":
    main()
