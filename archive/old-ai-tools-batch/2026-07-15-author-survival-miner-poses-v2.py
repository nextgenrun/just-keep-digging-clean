"""Author and bake planted, unarmed Survival Miner actions in the persistent scene."""

import math

import bpy
from mathutils import Euler, Quaternion


RIG_NAME = "SurvivalPolishRig"
COLLECTION_NAME = "SurvivalMinerPolishV2"
SOURCES = (
    ("idle", "root|Unreal Take|Base Layer", 229),
    ("walk", "root|Unreal Take|Base Layer.001", 47),
    ("run", "root|Unreal Take|Base Layer.002", 55),
    ("fly", "root|Unreal Take|Base Layer.003", 92),
    ("attack", "root|Unreal Take|Base Layer.004", 32),
    ("dig_side", "root|Unreal Take|Base Layer.005", 57),
    ("dig_up", "root|Unreal Take|Base Layer.006", 32),
    ("dig_down", "root|Unreal Take|Base Layer.007", 52),
)
# key = frame, right-hand target, left-hand target, forward lean, torso twist.
CLIPS = {
    "idle": {"end": 48, "impact": 1, "loop": True, "mode": "unarmed ready stance", "keys": (
        (1, (-0.31, 0.22, 1.08), (0.31, 0.22, 1.08), 0.0, -2.0),
        (24, (-0.31, 0.23, 1.095), (0.31, 0.23, 1.095), -1.0, -1.0),
        (48, (-0.31, 0.22, 1.08), (0.31, 0.22, 1.08), 0.0, -2.0),
    )},
    "attack": {"end": 32, "impact": 18, "loop": False, "mode": "armored forward punch", "keys": (
        (1, (-0.31, 0.22, 1.08), (0.31, 0.22, 1.08), 0.0, -2.0),
        (6, (-0.35, -0.02, 1.25), (0.25, 0.20, 1.39), -5.0, -14.0),
        (12, (-0.28, 0.24, 1.32), (0.24, 0.20, 1.38), -2.0, -6.0),
        (18, (-0.18, 0.42, 1.36), (0.23, 0.18, 1.32), 11.0, 18.0),
        (24, (-0.19, 0.38, 1.33), (0.24, 0.18, 1.30), 12.0, 22.0),
        (32, (-0.31, 0.22, 1.08), (0.31, 0.22, 1.08), 0.0, -2.0),
    )},
    "dig_side": {"end": 57, "impact": 32, "loop": False, "mode": "armored side power strike", "keys": (
        (1, (-0.31, 0.22, 1.08), (0.31, 0.22, 1.08), 0.0, -2.0),
        (10, (-0.32, -0.02, 1.24), (0.22, 0.20, 1.32), -5.0, -14.0),
        (22, (-0.22, 0.18, 1.30), (0.22, 0.22, 1.29), -2.0, -8.0),
        (32, (-0.18, 0.43, 1.33), (0.22, 0.20, 1.24), 10.0, 16.0),
        (42, (-0.18, 0.38, 1.30), (0.23, 0.20, 1.23), 11.0, 18.0),
        (57, (-0.31, 0.22, 1.08), (0.31, 0.22, 1.08), 0.0, -2.0),
    )},
    "dig_up": {"end": 32, "impact": 17, "loop": False, "mode": "two-fist overhead smash", "keys": (
        (1, (-0.31, 0.22, 1.08), (0.31, 0.22, 1.08), 0.0, -2.0),
        (6, (-0.38, 0.20, 1.02), (0.38, 0.20, 1.02), 6.0, 6.0),
        (12, (-0.25, 0.38, 1.42), (0.25, 0.38, 1.42), -5.0, -5.0),
        (17, (-0.18, 0.50, 1.76), (0.18, 0.50, 1.76), -10.0, 0.0),
        (22, (-0.20, 0.46, 1.67), (0.20, 0.46, 1.67), -8.0, 2.0),
        (32, (-0.31, 0.22, 1.08), (0.31, 0.22, 1.08), 0.0, -2.0),
    )},
    "dig_down": {"end": 52, "impact": 29, "loop": False, "mode": "planted two-fist ground smash", "keys": (
        (1, (-0.31, 0.22, 1.08), (0.31, 0.22, 1.08), 0.0, -2.0),
        (10, (-0.30, 0.25, 1.46), (0.30, 0.25, 1.46), -5.0, -6.0),
        (20, (-0.19, 0.38, 1.18), (0.19, 0.38, 1.18), 7.0, 8.0),
        (29, (-0.15, 0.42, 0.95), (0.15, 0.42, 0.95), 16.0, 0.0),
        (38, (-0.17, 0.39, 1.02), (0.17, 0.39, 1.02), 18.0, 2.0),
        (52, (-0.31, 0.22, 1.08), (0.31, 0.22, 1.08), 0.0, -2.0),
    )},
}


def require(name, kind=None):
    obj = bpy.data.objects.get(name)
    if obj is None or (kind and obj.type != kind):
        raise RuntimeError(f"Required {kind or 'object'} missing: {name}")
    return obj


def rename_sources():
    used = set()
    for clip, legacy, end in SOURCES:
        wanted = f"SRC_{clip}"
        action = bpy.data.actions.get(wanted) or bpy.data.actions.get(legacy)
        if action is None:
            candidates = sorted((a for a in bpy.data.actions
                if a.name not in used and not a.name.startswith(("SRC_", "MINER_", "TOOL_", "__TMP_"))
                and round(a.frame_range[0]) == 1 and round(a.frame_range[1]) == end),
                key=lambda item: item.name)
            action = candidates[0] if candidates else None
        if action is None or tuple(round(v) for v in action.frame_range) != (1, end):
            raise RuntimeError(f"Cannot discover exact 1..{end} source action for {clip}")
        action.name, action["referenceOnly"] = wanted, True
        used.add(wanted)


def empty(name, collection, parent=None, location=(0.0, 0.0, 0.0), size=0.05):
    obj = bpy.data.objects.get(name)
    if obj is None:
        obj = bpy.data.objects.new(name, None)
        collection.objects.link(obj)
    obj.parent = parent
    obj.matrix_parent_inverse.identity()
    obj.location, obj.scale = location, (1.0, 1.0, 1.0)
    obj.empty_display_type, obj.empty_display_size, obj.hide_render = "SPHERE", size, True
    return obj


def prepare_controls(rig):
    collection = bpy.data.collections.get(COLLECTION_NAME) or bpy.context.scene.collection
    controls = {}
    for side in ("r", "l"):
        suffix = side.upper()
        target = empty(f"IK_Hand_{suffix}", collection, size=0.045)
        pole_side = -0.66 if side == "r" else 0.66
        pole = empty(f"POLE_Elbow_{suffix}", collection,
                     location=(-0.56, -pole_side, 1.27), size=0.06)
        old_follow = target.constraints.get("OPTIONAL_GRIP_FOLLOW")
        if old_follow:
            target.constraints.remove(old_follow)
        hand = rig.pose.bones.get(f"hand_{side}")
        if hand is None:
            raise RuntimeError(f"Rig is missing hand_{side}")
        for stale in ("MINER_TWO_HAND_IK", "MINER_UNARMED_IK"):
            old = hand.constraints.get(stale)
            if old:
                hand.constraints.remove(old)
        ik = hand.constraints.new("IK")
        ik.name, ik.target, ik.pole_target = "MINER_UNARMED_IK", target, pole
        ik.chain_count, ik.iterations, ik.use_tail = 3, 128, True
        ik.use_rotation, ik.influence = False, 0.0
        ik.pole_angle = math.radians(-90.0 if side == "r" else 90.0)
        for bone_name in (f"hand_{side}", f"lowerarm_{side}", f"upperarm_{side}"):
            rig.pose.bones[bone_name].ik_stretch = 0.0
        controls.update({f"target_{side}": target, f"ik_{side}": ik})
    return controls


def clear_outputs(rig, controls):
    for owner in (rig, controls["target_r"], controls["target_l"]):
        if owner.animation_data:
            owner.animation_data.action = None
    for name in [f"{prefix}{clip}" for clip in CLIPS for prefix in ("MINER_", "TOOL_")]:
        action = bpy.data.actions.get(name)
        if action:
            bpy.data.actions.remove(action)
    for name in ("__TMP_HAND_R", "__TMP_HAND_L"):
        action = bpy.data.actions.get(name)
        if action:
            bpy.data.actions.remove(action)


def action_for(owner, name, end):
    action = bpy.data.actions.new(name)
    action.use_frame_range, action.frame_start, action.frame_end = True, 1, end
    owner.animation_data_create()
    owner.animation_data.action = action
    return action


def relative(rig, base, name, pitch=0.0, z=0.0):
    bone = rig.pose.bones.get(name)
    if bone:
        delta = Euler((0.0, math.radians(-pitch), math.radians(z)), "XYZ").to_quaternion()
        bone.rotation_quaternion = base[name][1] @ delta


def seed_pose(rig, base, frame, lean, twist):
    for name, (location, rotation, scale) in base.items():
        bone = rig.pose.bones[name]
        bone.rotation_mode, bone.location = "QUATERNION", location
        bone.rotation_quaternion, bone.scale = rotation, scale
    relative(rig, base, "spine_01", lean * 0.35, twist * 0.22)
    relative(rig, base, "spine_03", lean * 0.38, twist * 0.48)
    relative(rig, base, "spine_05", lean * 0.18, twist * 0.30)
    relative(rig, base, "neck_01", -lean * 0.10, -twist * 0.18)
    for side, sign in (("l", 1.0), ("r", -1.0)):
        for finger in ("index", "middle", "ring", "pinky"):
            for joint, weight in ((1, 0.58), (2, 0.82), (3, 1.0)):
                name = f"{finger}_0{joint}_{side}"
                if name in base:
                    curl = Quaternion((1.0, 0.0, 0.0), math.radians(sign * 68.0 * weight))
                    rig.pose.bones[name].rotation_quaternion = base[name][1] @ curl
        for joint, weight in ((1, 0.42), (2, 0.66), (3, 0.82)):
            name = f"thumb_0{joint}_{side}"
            if name in base:
                curl = Quaternion((0.0, 0.0, 1.0), math.radians(-sign * 68.0 * weight))
                rig.pose.bones[name].rotation_quaternion = base[name][1] @ curl
    for bone in rig.pose.bones:
        bone.keyframe_insert("location", frame=frame, group=bone.name)
        bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
        bone.keyframe_insert("scale", frame=frame, group=bone.name)


def to_character_space(position):
    """Map authoring lateral/forward/Z to this FBX's actual +X-facing basis."""
    lateral, forward, height = position
    return -forward, -lateral, height


def bake_clip(scene, rig, controls, base, clip, spec):
    rig_action = action_for(rig, f"MINER_{clip}", spec["end"])
    temps = {side: action_for(controls[f"target_{side}"], f"__TMP_HAND_{side.upper()}", spec["end"])
             for side in ("r", "l")}
    for frame, right, left, lean, twist in spec["keys"]:
        scene.frame_set(frame)
        seed_pose(rig, base, frame, lean, twist)
        for side, position in (("r", right), ("l", left)):
            controls[f"target_{side}"].location = to_character_space(position)
            controls[f"target_{side}"].keyframe_insert("location", frame=frame)
    for side in ("r", "l"):
        controls[f"ik_{side}"].influence = 1.0
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    result = bpy.ops.nla.bake(
        frame_start=1, frame_end=spec["end"], step=1, only_selected=False,
        visual_keying=True, clear_constraints=False, use_current_action=True,
        clean_curves=False, bake_types={"POSE"},
        channel_types={"LOCATION", "ROTATION", "SCALE"})
    if "FINISHED" not in result:
        raise RuntimeError(f"Visual-key bake failed for {clip}: {result}")
    for side in ("r", "l"):
        controls[f"ik_{side}"].influence = 0.0
    scene.frame_set(spec["impact"])
    bpy.context.view_layer.update()
    gaps = {}
    for side in ("r", "l"):
        hand = rig.matrix_world @ rig.pose.bones[f"hand_{side}"].tail
        target = controls[f"target_{side}"].matrix_world.translation
        gaps[side] = round((hand - target).length * 100.0, 3)
        rig_action[f"{side}StrikeTargetGapCm"] = gaps[side]
    if max(gaps.values()) > 10.0:
        raise RuntimeError(f"{clip} unarmed strike target gap exceeds 10 cm: {gaps}")
    for side in ("r", "l"):
        controls[f"target_{side}"].animation_data.action = None
        bpy.data.actions.remove(temps[side])
    rig_action["clip"], rig_action["impactFrame"] = clip, spec["impact"]
    rig_action["loop"] = spec["loop"]
    rig_action["handAuthored"], rig_action["rootMotion"] = True, "locked; feet planted from idle base"
    rig_action["contactMode"], rig_action["pickaxeUsed"] = spec["mode"], False
    print(f"MINER_POSE clip={clip} impact={spec['impact']} mode={spec['mode']} tool=none")


def main():
    scene = bpy.context.scene
    rig = require(RIG_NAME, "ARMATURE")
    rename_sources()
    controls = prepare_controls(rig)
    clear_outputs(rig, controls)
    rig.animation_data_create()
    rig.animation_data.action = bpy.data.actions["SRC_idle"]
    scene.frame_set(1)
    bpy.context.view_layer.update()
    base = {}
    for bone in rig.pose.bones:
        location, rotation, scale = bone.matrix_basis.decompose()
        base[bone.name] = location.copy(), rotation.copy(), scale.copy()
    for clip, spec in CLIPS.items():
        bake_clip(scene, rig, controls, base, clip, spec)
    rig.animation_data.action = bpy.data.actions["MINER_idle"]
    scene.frame_start, scene.frame_end = 1, CLIPS["idle"]["end"]
    scene.frame_set(1)
    print("SURVIVAL_MINER_POSES_V2_OK authored=5 unarmed=5 toolActions=0")


main()
