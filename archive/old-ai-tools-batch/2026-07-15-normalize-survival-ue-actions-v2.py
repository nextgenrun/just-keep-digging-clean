"""Create bounded, full-body UE actions for the fixed-camera Survival v2 sprite."""

from pathlib import Path

import bpy


ROOT = Path(r"C:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned")
BLEND_PATH = (
    ROOT
    / "sprites"
    / "character"
    / "survival-character-blender-v2"
    / "blender"
    / "survival-character-blender-v2.blend"
)
RIG_NAME = "SurvivalPolishRig"
SPECS = {
    "idle": ("SRC_idle", 0.0, 0.65, True, "UE full-body idle"),
    "walk": ("SRC_walk", 0.0, 0.65, True, "UE in-place full-body walk"),
    "run": ("SRC_run", 0.0, 0.65, True, "UE in-place full-body run"),
    "attack": ("SRC_attack", 0.12, 0.65, False, "UE full-body unarmed attack"),
    "dig_side": ("SRC_dig_side", 0.12, 0.65, False, "UE charged side strike"),
    "dig_up": ("SRC_dig_up", 0.12, 0.65, False, "UE rising unarmed strike"),
    "dig_down": ("SRC_dig_down", 0.12, 0.65, False, "UE downward unarmed strike"),
}
LOCATION_PATHS = {
    "location",
    'pose.bones["pelvis"].location',
    'pose.bones["root"].location',
}


def iter_fcurves(action):
    for layer in action.layers:
        for strip in layer.strips:
            for channelbag in strip.channelbags:
                yield from channelbag.fcurves


def scale_curve_about_first(fcurve, scale: float, start: float) -> None:
    reference = fcurve.evaluate(start)
    for point in fcurve.keyframe_points:
        for coordinate in (point.co, point.handle_left, point.handle_right):
            coordinate.y = reference + (coordinate.y - reference) * scale


def pelvis_span(scene, rig, action):
    rig.animation_data.action = action
    start, end = (round(value) for value in action.frame_range)
    positions = []
    for frame in range(start, end + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        positions.append(rig.matrix_world @ rig.pose.bones["pelvis"].head)
    return tuple(round(max(point[axis] for point in positions) -
                       min(point[axis] for point in positions), 4) for axis in range(3))


def main() -> None:
    scene = bpy.context.scene
    rig = bpy.data.objects.get(RIG_NAME)
    if not rig or rig.type != "ARMATURE":
        raise RuntimeError(f"Persistent rig is missing: {RIG_NAME}")
    rig.animation_data_create()
    rig.animation_data.action = bpy.data.actions.get("SRC_idle")
    for clip in SPECS:
        old = bpy.data.actions.get(f"MINER_{clip}")
        if old:
            bpy.data.actions.remove(old)

    reports = {}
    for clip, (source_name, horizontal_scale, vertical_scale, loop, mode) in SPECS.items():
        source = bpy.data.actions.get(source_name)
        if not source:
            raise RuntimeError(f"Missing UE source action: {source_name}")
        action = source.copy()
        action.name = f"MINER_{clip}"
        start = float(action.frame_range[0])
        for fcurve in iter_fcurves(action):
            if fcurve.data_path not in LOCATION_PATHS:
                continue
            scale_curve_about_first(fcurve, horizontal_scale, start)
        action.use_cyclic = loop
        action["clip"] = clip
        action["handAuthored"] = False
        action["sourceAuthority"] = "Unreal Engine 5.8 IK Retargeter"
        action["contactMode"] = mode
        action["pickaxeUsed"] = False
        action["horizontalRootMotionScale"] = horizontal_scale
        action["verticalRootMotionScale"] = vertical_scale
        span = pelvis_span(scene, rig, action)
        action["pelvisSpanMeters"] = span
        reports[clip] = span
        if max(span[0], span[1]) > 0.45:
            raise RuntimeError(f"{clip} still exceeds fixed-camera horizontal span: {span}")

    rig.animation_data.action = bpy.data.actions["MINER_idle"]
    scene.frame_start, scene.frame_end = (round(value) for value in rig.animation_data.action.frame_range)
    scene.frame_set(scene.frame_start)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    print(f"SURVIVAL_UE_ACTIONS_V2_OK spans={reports} saved={BLEND_PATH}")


main()
