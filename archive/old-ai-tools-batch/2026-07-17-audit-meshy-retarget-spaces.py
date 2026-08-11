"""Rank Blender Copy Rotation spaces for the Meshy/Survival proof rig."""

from __future__ import annotations

import sys
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
ADDON_ROOT = ROOT / "testing" / "blender-animation-lab-v1" / "addon"
FRAMES = (1, 7, 12, 20)
LANDMARKS = (
    ("LeftHand", "hand_l", "tail"), ("RightHand", "hand_r", "tail"),
    ("LeftFoot", "foot_l", "tail"), ("RightFoot", "foot_r", "tail"),
    ("Head", "head", "tail"), ("Hips", "pelvis", "head"),
)


def point(rig, bone_name: str, end: str):
    bone = rig.pose.bones[bone_name]
    return rig.matrix_world @ getattr(bone, end)


def score(source, target) -> float:
    total = 0.0
    for frame in FRAMES:
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        total += sum((point(source, source_name, end) - point(target, target_name, end)).length
                     for target_name, source_name, end in LANDMARKS)
    return total / (len(FRAMES) * len(LANDMARKS))


def main() -> None:
    sys.path.insert(0, str(ADDON_ROOT))
    source = bpy.data.objects["root"]
    target = next(obj for obj in bpy.data.objects if obj.type == "ARMATURE" and obj != source)
    constraints = [constraint for bone in target.pose.bones for constraint in bone.constraints
                   if constraint.name.startswith("DGAL_RETARGET_")]
    results = []
    for space in ("LOCAL", "LOCAL_WITH_PARENT", "POSE", "WORLD"):
        for mix in ("REPLACE", "BEFORE", "AFTER", "OFFSET"):
            for constraint in constraints:
                constraint.owner_space = space
                constraint.target_space = space
                constraint.mix_mode = mix
            results.append((score(source, target), space, mix))
    for value, space, mix in sorted(results):
        print(f"DGAL_RETARGET_SCORE value={value:.6f} space={space} mix={mix}")


if __name__ == "__main__":
    main()
