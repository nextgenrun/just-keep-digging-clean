"""Inspect Unreal's Survival animation-carrier FBX before sprite rendering."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import bpy


def main() -> None:
    args = sys.argv[sys.argv.index("--") + 1 :]
    if len(args) != 2:
        raise RuntimeError("Expected -- <retargeted.fbx> <report.json>")
    fbx_path = Path(args[0]).resolve()
    report_path = Path(args[1]).resolve()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(fbx_path), automatic_bone_orientation=False)
    report = {
        "source": str(fbx_path),
        "objects": [
            {
                "name": obj.name,
                "type": obj.type,
                "parent": obj.parent.name if obj.parent else None,
                "materials": [slot.material.name if slot.material else None for slot in obj.material_slots],
                "vertices": len(obj.data.vertices) if obj.type == "MESH" else None,
                "bones": len(obj.data.bones) if obj.type == "ARMATURE" else None,
            }
            for obj in bpy.context.scene.objects
        ],
        "actions": [
            {
                "name": action.name,
                "frameRange": list(action.frame_range),
                "slots": len(action.slots),
            }
            for action in bpy.data.actions
        ],
        "materials": [material.name for material in bpy.data.materials],
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
