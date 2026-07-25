"""Inspect the approved Fab Survival Blender source and write a JSON report."""

from __future__ import annotations

import json
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
REPORT_PATH = ROOT / "sprites" / "character" / "survival-character-fab-v1" / "reports" / "source-inspection.json"


def object_summary(obj):
    dimensions = [round(value, 4) for value in obj.dimensions]
    summary = {
        "name": obj.name,
        "type": obj.type,
        "dimensions": dimensions,
        "parent": obj.parent.name if obj.parent else None,
    }
    if obj.type == "ARMATURE":
        summary["bones"] = len(obj.data.bones)
        summary["boneNames"] = [bone.name for bone in obj.data.bones]
    if obj.type == "MESH":
        summary["vertices"] = len(obj.data.vertices)
        summary["polygons"] = len(obj.data.polygons)
        summary["materials"] = [slot.material.name if slot.material else None for slot in obj.material_slots]
    animation_data = obj.animation_data
    if animation_data:
        summary["activeAction"] = animation_data.action.name if animation_data.action else None
        summary["nlaTracks"] = [
            {
                "name": track.name,
                "strips": [strip.action.name if strip.action else None for strip in track.strips],
            }
            for track in animation_data.nla_tracks
        ]
    return summary


def action_summary(action):
    slots = getattr(action, "slots", [])
    return {
        "name": action.name,
        "frameRange": [round(value, 3) for value in action.frame_range],
        "slots": [slot.name for slot in slots],
        "users": action.users,
    }


def image_summary(image):
    packed = bool(image.packed_file or getattr(image, "packed_files", None))
    absolute = bpy.path.abspath(image.filepath) if image.filepath else ""
    return {
        "name": image.name,
        "filepath": image.filepath,
        "absolutePath": absolute,
        "packed": packed,
        "exists": packed or (bool(absolute) and Path(absolute).exists()),
        "size": list(image.size),
    }


report = {
    "source": bpy.data.filepath,
    "version": list(bpy.app.version),
    "objects": [object_summary(obj) for obj in bpy.data.objects],
    "actions": [action_summary(action) for action in bpy.data.actions],
    "images": [image_summary(image) for image in bpy.data.images],
    "materials": [material.name for material in bpy.data.materials],
    "scenes": [scene.name for scene in bpy.data.scenes],
}
REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {REPORT_PATH}")
