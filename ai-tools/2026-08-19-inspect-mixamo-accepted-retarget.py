"""Inspect accepted Mixamo carriers against the production Survival rig.

Run through Blender 5.1 with the production Survival blend already open. The
tool writes review evidence only and never saves or changes the source blend.
"""

from __future__ import annotations

import json
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "testing/blender-animation-lab-v1/review-drafts/mixamo-library-v1/source-fbx"
REPORT_PATH = ROOT / "testing/blender-animation-lab-v1/review-drafts/mixamo-library-v1/mixamo-retarget-inspection.json"
TARGET_RIG = "SurvivalPolishRig"
TARGET_BODY = "SurvivalPolishBody"


def rounded(values):
    return [round(float(value), 6) for value in values]


def inspect_target():
    rig = bpy.data.objects.get(TARGET_RIG)
    body = bpy.data.objects.get(TARGET_BODY)
    if rig is None or body is None:
        raise RuntimeError(f"Production Survival objects missing: {TARGET_RIG}, {TARGET_BODY}")
    return {
        "rig": rig.name,
        "rigObjectScale": rounded(rig.scale),
        "rigObjectRotationEuler": rounded(rig.rotation_euler),
        "bones": [bone.name for bone in rig.data.bones],
        "body": body.name,
        "vertexCount": len(body.data.vertices),
        "polygonCount": len(body.data.polygons),
        "vertexGroups": [group.name for group in body.vertex_groups],
        "materials": [slot.material.name if slot.material else None for slot in body.material_slots],
    }


def inspect_carrier(path):
    before = set(bpy.data.objects)
    result = bpy.ops.import_scene.fbx(
        filepath=str(path),
        automatic_bone_orientation=False,
        use_anim=True,
    )
    if "FINISHED" not in result:
        raise RuntimeError(f"FBX import failed: {path}")
    imported = [obj for obj in bpy.data.objects if obj not in before]
    armatures = [obj for obj in imported if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"Expected one armature in {path.name}, found {len(armatures)}")
    rig = armatures[0]
    action = rig.animation_data.action if rig.animation_data else None
    if action is None:
        raise RuntimeError(f"No animation action in {path.name}")
    record = {
        "file": path.name,
        "sizeBytes": path.stat().st_size,
        "rig": rig.name,
        "rigObjectScale": rounded(rig.scale),
        "rigObjectRotationEuler": rounded(rig.rotation_euler),
        "action": action.name,
        "frameRange": rounded(action.frame_range),
        "actionSlots": [slot.identifier for slot in action.slots],
        "bones": [bone.name for bone in rig.data.bones],
        "rootBones": [bone.name for bone in rig.data.bones if bone.parent is None],
    }
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)
    return record


def main():
    sources = sorted(SOURCE_ROOT.glob("*.fbx"))
    if len(sources) != 9:
        raise RuntimeError(f"Expected nine accepted FBXs, found {len(sources)}")
    report = {
        "schema": "dig-game-mixamo-accepted-retarget-inspection-v1",
        "reviewOnly": True,
        "productionChanged": False,
        "sourceBlendChanged": False,
        "blenderVersion": bpy.app.version_string,
        "target": inspect_target(),
        "carriers": [inspect_carrier(path) for path in sources],
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"MIXAMO_ACCEPTED_RETARGET_INSPECTION_OK carriers={len(sources)} report={REPORT_PATH}")


if __name__ == "__main__":
    main()
