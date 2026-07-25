"""Export the active UAL skeleton and clips as one Unreal retarget source FBX."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy


ACTIVE_CLIPS = frozenset({
    "Idle_Loop",
    "Idle_Talking_Loop",
    "Jog_Fwd_Loop",
    "Jump_Start",
    "Jump_Loop",
    "Jump_Land",
    "Crouch_Idle_Loop",
    "Shield_Dash",
    "ClimbUp_1m",
    "Punch_Jab",
    "Punch_Cross",
    "TreeChopping_Loop",
    "Melee_Hook",
    "Melee_Hook_Rec",
    "TreeChopping_Loop",
    "Melee_Hook",
    "Melee_Hook_Rec",
    "OverhandThrow",
    "Push_Loop",
    "Roll",
    "Spell_Simple_Idle_Loop",
    "Hit_Chest",
    "Death01",
})


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ual1", required=True)
    parser.add_argument("--ual2", required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args(argv)


def action_key(name: str) -> str:
    return name.split("|")[-1].split(".")[0]


def import_source(path: Path) -> tuple[bpy.types.Object, list[bpy.types.Object], list[bpy.types.Action]]:
    before_actions = set(bpy.data.actions)
    before_objects = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(path.resolve()))
    objects = [obj for obj in bpy.context.scene.objects if obj not in before_objects]
    armatures = [obj for obj in objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        raise RuntimeError(f"Expected one UAL armature in {path}, found {len(armatures)}")
    meshes = [
        obj for obj in objects
        if obj.type == "MESH"
        and any(modifier.type == "ARMATURE" and modifier.object is armatures[0] for modifier in obj.modifiers)
    ]
    return armatures[0], meshes, [action for action in bpy.data.actions if action not in before_actions]


def curate_actions(groups: list[list[bpy.types.Action]]) -> dict[str, bpy.types.Action]:
    curated: dict[str, bpy.types.Action] = {}
    for actions in groups:
        for action in actions:
            key = action_key(action.name)
            if key not in ACTIVE_CLIPS or key in curated:
                continue
            action.name = key
            curated[key] = action
    missing = sorted(ACTIVE_CLIPS - curated.keys())
    if missing:
        raise RuntimeError(f"Active UAL clips missing from source GLBs: {missing}")
    for action in list(bpy.data.actions):
        if action not in curated.values():
            bpy.data.actions.remove(action, do_unlink=True)
    return curated


def main() -> None:
    args = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    primary, primary_meshes, primary_actions = import_source(Path(args.ual1))
    secondary, secondary_meshes, secondary_actions = import_source(Path(args.ual2))
    curated = curate_actions([primary_actions, secondary_actions])

    for obj in [secondary, *secondary_meshes]:
        bpy.data.objects.remove(obj, do_unlink=True)
    primary.name = "SK_UAL_Active_Source"
    primary.data.name = "SK_UAL_Active_Source_Skeleton"
    primary.animation_data_create()
    primary.animation_data.action = curated["Idle_Loop"]

    bpy.ops.object.select_all(action="DESELECT")
    primary.select_set(True)
    for mesh in primary_meshes:
        mesh.select_set(True)
    bpy.context.view_layer.objects.active = primary

    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.fbx(
        filepath=str(output),
        use_selection=True,
        object_types={"ARMATURE", "MESH"},
        apply_unit_scale=True,
        apply_scale_options="FBX_SCALE_ALL",
        axis_forward="-Y",
        axis_up="Z",
        add_leaf_bones=False,
        use_armature_deform_only=False,
        bake_anim=True,
        bake_anim_use_all_actions=True,
        bake_anim_use_nla_strips=False,
        bake_anim_force_startend_keying=True,
        bake_anim_simplify_factor=0.0,
    )
    print(
        f"UAL_UNREAL_SOURCE_OK output={output} actions={len(curated)} bones={len(primary.data.bones)}",
        flush=True,
    )


if __name__ == "__main__":
    main()
