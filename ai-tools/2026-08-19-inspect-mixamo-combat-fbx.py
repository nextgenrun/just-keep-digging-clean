"""Print frame ranges for review-only Mixamo combat FBX sources."""

from __future__ import annotations

from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / (
    "testing/blender-animation-lab-v1/review-drafts/"
    "mixamo-punch-sequence-sandbox-v1/source-fbx"
)


for source in sorted(SOURCE_ROOT.glob("mixamo-*.fbx")):
    before_objects = set(bpy.data.objects)
    before_actions = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=str(source), use_anim=True)
    imported = [obj for obj in bpy.data.objects if obj not in before_objects]
    rigs = [obj for obj in imported if obj.type == "ARMATURE"]
    action = rigs[0].animation_data.action if len(rigs) == 1 else None
    if action is None:
        print(f"MIXAMO_FBX_RANGE source={source.name} action=missing", flush=True)
    else:
        start, end = action.frame_range
        print(
            f"MIXAMO_FBX_RANGE source={source.name} action={action.name} "
            f"range={start:.3f}..{end:.3f} duration={end - start:.3f}",
            flush=True,
        )
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)
    for item in [candidate for candidate in bpy.data.actions if candidate not in before_actions]:
        if item.users == 0:
            bpy.data.actions.remove(item)
