"""Report the current Survival rest rig and mesh binding without changing it."""

import json
import sys
from pathlib import Path

import bpy


def argument(name):
    values = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    prefix = f"--{name}="
    return next((value[len(prefix):] for value in values if value.startswith(prefix)), None)


rig_name = argument("rig") or "SurvivalPolishRig"
mesh_name = argument("mesh") or "SurvivalPolishBody"
output = Path(argument("output"))
rig = bpy.data.objects[rig_name]
mesh = bpy.data.objects[mesh_name]

report = {
    "blend": bpy.data.filepath,
    "rig": {
        "name": rig.name,
        "location": list(rig.location),
        "rotationEuler": list(rig.rotation_euler),
        "scale": list(rig.scale),
        "bones": [
            {
                "name": bone.name,
                "parent": bone.parent.name if bone.parent else None,
                "headLocal": list(bone.head_local),
                "tailLocal": list(bone.tail_local),
                "roll": bone.matrix_local.to_euler().z,
                "useDeform": bone.use_deform,
            }
            for bone in rig.data.bones
        ],
    },
    "mesh": {
        "name": mesh.name,
        "location": list(mesh.location),
        "rotationEuler": list(mesh.rotation_euler),
        "scale": list(mesh.scale),
        "vertices": len(mesh.data.vertices),
        "polygons": len(mesh.data.polygons),
        "vertexGroups": [group.name for group in mesh.vertex_groups],
        "modifiers": [
            {
                "name": modifier.name,
                "type": modifier.type,
                "object": modifier.object.name if modifier.type == "ARMATURE" and modifier.object else None,
            }
            for modifier in mesh.modifiers
        ],
    },
    "actions": [
        {"name": action.name, "frameRange": list(action.frame_range)}
        for action in bpy.data.actions
    ],
}

output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(f"SURVIVAL_RIG_AUDIT_OK output={output} bones={len(rig.data.bones)}")
