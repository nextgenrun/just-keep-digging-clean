"""Prepare the completed Meshy Legacy Miner rig for Unreal import.

This script intentionally performs no animation or retargeting. Unreal owns the
walk animation, IK retarget, camera, and final render for this proof.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import bpy
from mathutils import Vector


TARGET_HEIGHT_CM = 180.0


def script_args() -> tuple[Path, Path, Path]:
    argv = sys.argv
    if "--" not in argv:
        raise RuntimeError("Expected: -- <source.glb> <output.fbx> <report.json>")
    args = argv[argv.index("--") + 1 :]
    if len(args) != 3:
        raise RuntimeError("Expected exactly three arguments after --")
    return tuple(Path(value).resolve() for value in args)  # type: ignore[return-value]


def safe_name(value: str, fallback: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_]+", "_", value).strip("_")
    return cleaned or fallback


def world_bounds(meshes: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    corners = [mesh.matrix_world @ Vector(corner) for mesh in meshes for corner in mesh.bound_box]
    return (
        Vector((min(p.x for p in corners), min(p.y for p in corners), min(p.z for p in corners))),
        Vector((max(p.x for p in corners), max(p.y for p in corners), max(p.z for p in corners))),
    )


def main() -> None:
    source_path, fbx_path, report_path = script_args()
    fbx_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source_path))

    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    all_meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    meshes = [
        obj
        for obj in all_meshes
        if obj.parent in armatures or any(modifier.type == "ARMATURE" for modifier in obj.modifiers)
    ]
    if len(armatures) != 1 or not meshes:
        raise RuntimeError(f"Expected one armature and at least one mesh; got {len(armatures)} and {len(meshes)}")

    armature = armatures[0]
    keep = set(armatures + meshes)
    for obj in list(bpy.context.scene.objects):
        if obj not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)

    source_min, source_max = world_bounds(meshes)
    source_height_m = source_max.z - source_min.z

    # Meshy outputs vary in physical scale. Normalize this stout miner to a
    # plausible 180 cm while working in centimetres for Unreal scale 1.0.
    roots = [obj for obj in keep if obj.parent not in keep]
    scale_to_cm = TARGET_HEIGHT_CM / source_height_m
    for obj in roots:
        obj.scale *= scale_to_cm
    bpy.context.view_layer.update()

    bpy.ops.object.select_all(action="DESELECT")
    for obj in keep:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.context.view_layer.update()

    # Ground the mesh and center it horizontally without disturbing the bind pose.
    bound_min, bound_max = world_bounds(meshes)
    center = (bound_min + bound_max) * 0.5
    offset = Vector((-center.x, -center.y, -bound_min.z))
    for obj in roots:
        obj.location += offset
    bpy.context.view_layer.update()

    armature.name = "SK_LegacyMiner_Meshy_v2_Armature"
    armature.data.name = "SKEL_LegacyMiner_Meshy_v2"
    for index, mesh in enumerate(meshes):
        suffix = "Body" if len(meshes) == 1 else f"Part_{index + 1:02d}"
        mesh.name = f"SK_LegacyMiner_Meshy_v2_{suffix}"
        mesh.data.name = f"SK_LegacyMiner_Meshy_v2_{suffix}_Mesh"

    seen_material_names: set[str] = set()
    for index, material in enumerate(bpy.data.materials):
        base = safe_name(material.name, f"Material_{index + 1:02d}")
        candidate = f"M_LegacyMiner_{base}"
        serial = 2
        while candidate in seen_material_names:
            candidate = f"M_LegacyMiner_{base}_{serial:02d}"
            serial += 1
        material.name = candidate
        seen_material_names.add(candidate)

    texture_dir = fbx_path.parent / "Textures"
    texture_dir.mkdir(parents=True, exist_ok=True)
    exported_textures = []
    for index, image in enumerate(bpy.data.images):
        if image.name in {"Render Result", "Viewer Node"}:
            continue
        texture_name = f"T_LegacyMiner_{safe_name(image.name, f'Texture_{index + 1:02d}')}.png"
        texture_path = texture_dir / texture_name
        try:
            image.filepath_raw = str(texture_path)
            image.file_format = "PNG"
            image.save()
            exported_textures.append(str(texture_path))
        except Exception as exc:
            unreal_message = f"Could not extract {image.name}: {exc}"
            print(unreal_message)

    # This file is a mesh handoff, not an animation source.
    for obj in keep:
        if obj.animation_data:
            obj.animation_data_clear()
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)

    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 0.01
    scene.render.fps = 30

    bpy.ops.object.select_all(action="DESELECT")
    for obj in keep:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armature

    bpy.ops.export_scene.fbx(
        filepath=str(fbx_path),
        check_existing=False,
        use_selection=True,
        object_types={"ARMATURE", "MESH"},
        global_scale=1.0,
        apply_unit_scale=True,
        apply_scale_options="FBX_SCALE_UNITS",
        use_space_transform=True,
        bake_space_transform=False,
        axis_forward="-X",
        axis_up="Z",
        use_mesh_modifiers=True,
        mesh_smooth_type="FACE",
        use_triangles=True,
        add_leaf_bones=False,
        primary_bone_axis="Y",
        secondary_bone_axis="X",
        armature_nodetype="NULL",
        use_armature_deform_only=True,
        bake_anim=False,
        path_mode="COPY",
        embed_textures=False,
    )

    final_min, final_max = world_bounds(meshes)
    bones = [bone.name for bone in armature.data.bones]
    mesh_details = []
    for mesh in meshes:
        mesh_min, mesh_max = world_bounds([mesh])
        mesh_details.append(
            {
                "name": mesh.name,
                "parent": mesh.parent.name if mesh.parent else None,
                "vertices": len(mesh.data.vertices),
                "bounds_cm": {"min": list(mesh_min), "max": list(mesh_max)},
                "location": list(mesh.location),
                "scale": list(mesh.scale),
                "modifiers": [modifier.type for modifier in mesh.modifiers],
            }
        )
    report = {
        "source": str(source_path),
        "output": str(fbx_path),
        "source_height_m": round(source_height_m, 6),
        "target_height_cm": TARGET_HEIGHT_CM,
        "scale_to_cm": round(scale_to_cm, 6),
        "prepared_bounds_cm": {
            "min": [round(v, 4) for v in final_min],
            "max": [round(v, 4) for v in final_max],
        },
        "mesh_count": len(meshes),
        "mesh_details": mesh_details,
        "vertex_count": sum(len(mesh.data.vertices) for mesh in meshes),
        "triangle_count": sum(len(mesh.data.loop_triangles) for mesh in meshes),
        "material_count": len(bpy.data.materials),
        "textures": exported_textures,
        "bone_count": len(bones),
        "bones": bones,
        "actions_removed": True,
        "animation_authored": False,
        "export_axes": {"forward": "-X", "up": "Z"},
    }
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"BLENDER_PREP_OK bones={len(bones)} height_cm={final_max.z - final_min.z:.3f}")


if __name__ == "__main__":
    main()
