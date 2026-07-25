"""Round-trip the prepared FBX in Blender and report its real mesh bounds."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def main() -> None:
    argv = sys.argv[sys.argv.index("--") + 1 :]
    if len(argv) != 2:
        raise RuntimeError("Expected -- <prepared.fbx> <report.json>")
    fbx_path, report_path = (Path(value).resolve() for value in argv)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(fbx_path), automatic_bone_orientation=False)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    minimum = Vector((min(p.x for p in corners), min(p.y for p in corners), min(p.z for p in corners)))
    maximum = Vector((max(p.x for p in corners), max(p.y for p in corners), max(p.z for p in corners)))
    report = {
        "scene_scale_length": bpy.context.scene.unit_settings.scale_length,
        "bounds": {"min": list(minimum), "max": list(maximum)},
        "dimensions": list(maximum - minimum),
        "mesh_transforms": {
            obj.name: {"scale": list(obj.scale), "rotation": list(obj.rotation_euler), "location": list(obj.location)}
            for obj in meshes
        },
        "armature_transforms": {
            obj.name: {"scale": list(obj.scale), "rotation": list(obj.rotation_euler), "location": list(obj.location)}
            for obj in armatures
        },
    }
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"FBX_ROUNDTRIP_OK dimensions={maximum - minimum}")


if __name__ == "__main__":
    main()
