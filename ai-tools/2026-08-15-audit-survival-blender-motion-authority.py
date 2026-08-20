"""Print motion-authority objects, actions, mesh density, lights and camera."""

from __future__ import annotations

import json

import bpy


body = bpy.data.objects.get("SurvivalPolishBody")
rig = bpy.data.objects.get("SurvivalPolishRig")
payload = {
    "objects": [
        obj.name for obj in bpy.data.objects
        if obj.name.startswith(("Survival", "DG_"))
    ],
    "actions": [
        {"name": action.name, "range": list(action.frame_range)}
        for action in bpy.data.actions
        if any(token in action.name.lower() for token in ("walk", "run", "jog", "dig", "flight"))
    ],
    "body": {
        "vertices": len(body.data.vertices) if body else None,
        "polygons": len(body.data.polygons) if body else None,
        "modifiers": [(modifier.name, modifier.type) for modifier in body.modifiers] if body else [],
    },
    "rig": rig.name if rig else None,
    "lights": [obj.name for obj in bpy.data.objects if obj.type == "LIGHT"],
    "camera": bpy.context.scene.camera.name if bpy.context.scene.camera else None,
}
print("DG_MOTION_AUTHORITY_AUDIT " + json.dumps(payload))
