"""Audit native UAL root and pelvis travel before Dig Game normalization."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy


DEFAULT_CLIPS = (
    "Idle_Loop",
    "Walk_Loop",
    "Jog_Fwd_Loop",
    "Jump_Start",
    "Jump_Loop",
    "Swim_Fwd_Loop",
    "Punch_Jab",
    "Punch_Cross",
)


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True)
    parser.add_argument("--clips", default=",".join(DEFAULT_CLIPS))
    parser.add_argument("--bones", default="root,pelvis")
    parser.add_argument("--sample-frames", default="")
    parser.add_argument("--list-actions", action="store_true")
    parser.add_argument("--action-filter", default="")
    return parser.parse_args(argv)


def action_key(name: str) -> str:
    return name.split("|")[-1].split(".")[0]


def choose_probe_bones(armature: bpy.types.Object, requested: str) -> list[str]:
    available = {bone.name.lower(): bone.name for bone in armature.data.bones}
    probes = []
    for value in requested.split(","):
        key = value.strip().lower()
        if key:
            if key not in available:
                raise RuntimeError(f"Missing probe bone: {value}")
            probes.append(available[key])
    return probes or [next(iter(available.values()))]


def parse_sample_frames(value: str) -> dict[str, list[float]]:
    samples: dict[str, list[float]] = {}
    for entry in value.split(","):
        if not entry.strip():
            continue
        clip, frame = entry.rsplit(":", 1)
        samples.setdefault(clip.strip(), []).append(float(frame))
    return samples


def sample_bone_positions(
    scene: bpy.types.Scene,
    armature: bpy.types.Object,
    action: bpy.types.Action,
    bone_names: list[str],
    frames: list[float],
) -> dict[str, object]:
    armature.animation_data.action = action
    samples = {}
    for frame in frames:
        whole = math.floor(frame)
        scene.frame_set(whole, subframe=frame - whole)
        bpy.context.view_layer.update()
        samples[str(frame)] = {
            bone_name: [
                round(value, 5)
                for value in (armature.matrix_world @ armature.pose.bones[bone_name].head)
            ]
            for bone_name in bone_names
        }
    return samples


def sample_bone_span(
    scene: bpy.types.Scene,
    armature: bpy.types.Object,
    action: bpy.types.Action,
    bone_name: str,
) -> dict[str, object]:
    armature.animation_data.action = action
    start, end = (float(value) for value in action.frame_range)
    count = max(2, min(49, math.ceil(end - start) + 1))
    positions = []
    for index in range(count):
        frame = start + (end - start) * index / max(1, count - 1)
        whole = math.floor(frame)
        scene.frame_set(whole, subframe=frame - whole)
        bpy.context.view_layer.update()
        bone = armature.pose.bones[bone_name]
        positions.append(armature.matrix_world @ bone.head)
    minimum = [min(point[axis] for point in positions) for axis in range(3)]
    maximum = [max(point[axis] for point in positions) for axis in range(3)]
    return {
        "first": [round(value, 5) for value in positions[0]],
        "span": [round(maximum[axis] - minimum[axis], 5) for axis in range(3)],
    }


def location_curve_paths(action: bpy.types.Action) -> list[str]:
    paths: set[str] = set()
    for layer in action.layers:
        for strip in layer.strips:
            for channelbag in strip.channelbags:
                for curve in channelbag.fcurves:
                    if curve.data_path == "location" or curve.data_path.endswith(".location"):
                        paths.add(curve.data_path)
    return sorted(paths)


def main() -> None:
    args = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(Path(args.source).resolve()))
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"Expected one armature, found {len(armatures)}")
    armature = armatures[0]
    armature.animation_data_create()
    actions = {action_key(action.name): action for action in bpy.data.actions}
    if args.list_actions:
        terms = [value.strip().lower() for value in args.action_filter.split(",") if value.strip()]
        names = sorted(
            name for name in actions
            if not terms or any(term in name.lower() for term in terms)
        )
        print("UAL_GAME_RIG_ACTIONS " + json.dumps(names), flush=True)
        return
    requested = [value.strip() for value in args.clips.split(",") if value.strip()]
    missing = [clip for clip in requested if clip not in actions]
    if missing:
        raise RuntimeError(f"Missing actions: {missing}")

    probes = choose_probe_bones(armature, args.bones)
    requested_samples = parse_sample_frames(args.sample_frames)
    report = {
        "source": str(Path(args.source).resolve()),
        "joint_count": len(armature.data.bones),
        "probe_bones": probes,
        "actions": {},
    }
    for clip in requested:
        action = actions[clip]
        report["actions"][clip] = {
            "frame_range": [round(value, 4) for value in action.frame_range],
            "location_curves": location_curve_paths(action),
            "bones": {
                bone_name: sample_bone_span(bpy.context.scene, armature, action, bone_name)
                for bone_name in probes
            },
            "samples": sample_bone_positions(
                bpy.context.scene,
                armature,
                action,
                probes,
                requested_samples.get(clip, []),
            ),
        }
    print("UAL_GAME_RIG_AUDIT " + json.dumps(report, sort_keys=True), flush=True)


if __name__ == "__main__":
    main()
