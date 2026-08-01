"""Build a review-only Legacy Miner mesh fit against the current Survivor walk."""

from __future__ import annotations

import hashlib
import json
import math
import sys
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[4]
ADDON_ROOT = ROOT / "testing" / "blender-animation-lab-v1" / "addon"
SESSION_NAME = "legacy-miner-walk-fit-v1"
SESSION_ROOT = (
    ROOT
    / "testing"
    / "blender-animation-lab-v1"
    / "review-drafts"
    / SESSION_NAME
)
ARCHIVE_ROOT = (
    ROOT
    / "archive"
    / "2026-07-15-rejected-legacy-miner-unreal-walk-experiment"
    / "testing"
    / "unreal-legacy-miner-walk"
)
REQUESTED_MATERIAL_UASSET = (
    ARCHIVE_ROOT
    / "Content"
    / "LegacyMinerWalk"
    / "Meshy"
    / "M_LegacyMiner_Material_1.uasset"
)
SAFE_UNREAL_MATERIAL_UASSET = (
    ARCHIVE_ROOT
    / "Content"
    / "LegacyMinerWalk"
    / "Meshy"
    / "M_LegacyMiner_Unreal.uasset"
)
ACTUAL_MESH_UASSET = (
    ARCHIVE_ROOT
    / "Content"
    / "LegacyMinerWalk"
    / "Meshy"
    / "SK_LegacyMiner_Meshy_v2.uasset"
)
PORTABLE_MESH_SOURCE = (
    ARCHIVE_ROOT
    / "SourceAssets"
    / "legacy-miner-meshy-rigged-v2.glb"
)
REPORT_PATH = SESSION_ROOT / "fit-report.json"
RENDER_ROOT = SESSION_ROOT / "proof-renders"


def require_finished(result, label: str) -> None:
    if "FINISHED" not in result:
        raise RuntimeError(f"{label} failed: {result}")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def source_record(path: Path, role: str) -> dict:
    if not path.is_file():
        raise FileNotFoundError(path)
    return {
        "path": str(path),
        "role": role,
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
    }


def activate_clip(state, clip_id: str) -> None:
    state.clip_index = next(
        index for index, item in enumerate(state.clips) if item.clip_id == clip_id
    )
    require_finished(bpy.ops.dgal.load_selected_clip(), f"activate {clip_id}")


def sample_frames(first: int, last: int) -> list[int]:
    span = max(1, last - first)
    frames = [
        first,
        round(first + span * 0.25),
        round(first + span * 0.50),
        round(first + span * 0.75),
    ]
    return list(dict.fromkeys(min(last, max(first, frame)) for frame in frames))


def material_audit(meshes: list[bpy.types.Object]) -> dict:
    materials: list[dict] = []
    images: dict[str, dict] = {}
    for mesh in meshes:
        for slot in mesh.material_slots:
            material = slot.material
            if material is None:
                continue
            materials.append(
                {
                    "mesh": mesh.name,
                    "slot": slot.name,
                    "material": material.name,
                    "usesNodes": bool(material.use_nodes),
                }
            )
            if not material.use_nodes or material.node_tree is None:
                continue
            for node in material.node_tree.nodes:
                image = getattr(node, "image", None)
                if image is None:
                    continue
                images[image.name] = {
                    "name": image.name,
                    "filepath": bpy.path.abspath(image.filepath) if image.filepath else "",
                    "packed": image.packed_file is not None,
                    "size": [int(image.size[0]), int(image.size[1])],
                }
    return {
        "materialSlots": materials,
        "images": list(images.values()),
    }


def rotation_motion_degrees(
    scene: bpy.types.Scene,
    rig: bpy.types.Object,
    frames: list[int],
    bone_names: tuple[str, ...],
) -> float:
    scene.frame_set(frames[0])
    bpy.context.view_layer.update()
    baseline = {
        name: rig.pose.bones[name].matrix_basis.to_quaternion().copy()
        for name in bone_names
        if rig.pose.bones.get(name)
    }
    total = 0.0
    for frame in frames[1:]:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        for name, rotation in baseline.items():
            current = rig.pose.bones[name].matrix_basis.to_quaternion()
            total += math.degrees(rotation.rotation_difference(current).angle)
    return round(total, 3)


def render_comparison(
    scene: bpy.types.Scene,
    state,
    mesh_fit_ops,
    frames: list[int],
) -> list[dict]:
    RENDER_ROOT.mkdir(parents=True, exist_ok=True)
    (RENDER_ROOT / "readme.md").write_text(
        "# Legacy Miner walk fit proof\n\n"
        "Identical orthographic camera, light rig, scale fit, and sampled walk "
        "frames for the current Survival character and the fitted Legacy Miner. "
        "Review only; these images are not loaded by the game runtime.\n",
        encoding="utf-8",
    )
    source_meshes = [
        obj
        for obj in scene.objects
        if obj.type == "MESH"
        and any(
            modifier.type == "ARMATURE" and modifier.object == state.active_rig
            for modifier in obj.modifiers
        )
    ]
    candidate_meshes = mesh_fit_ops.candidate_meshes(state)
    if not source_meshes or not candidate_meshes:
        raise RuntimeError("Both source and candidate render meshes are required")

    tracked = [*source_meshes, *candidate_meshes]
    previous_visibility = {obj: obj.hide_render for obj in tracked}
    previous_render = {
        "x": scene.render.resolution_x,
        "y": scene.render.resolution_y,
        "percentage": scene.render.resolution_percentage,
        "format": scene.render.image_settings.file_format,
        "colorMode": scene.render.image_settings.color_mode,
        "transparent": scene.render.film_transparent,
        "filepath": scene.render.filepath,
    }
    outputs: list[dict] = []
    scene.render.resolution_x = 768
    scene.render.resolution_y = 768
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    try:
        for frame in frames:
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            for label, show_source in (
                ("current-survival", True),
                ("fitted-legacy-miner", False),
            ):
                for obj in source_meshes:
                    obj.hide_render = not show_source
                for obj in candidate_meshes:
                    obj.hide_render = show_source
                output = RENDER_ROOT / f"{label}-walk-frame-{frame:04d}.png"
                scene.render.filepath = str(output)
                bpy.ops.render.render(write_still=True)
                outputs.append(
                    {
                        "label": label,
                        "frame": frame,
                        "path": str(output.relative_to(ROOT)),
                        "sha256": sha256(output),
                    }
                )
    finally:
        for obj, hidden in previous_visibility.items():
            obj.hide_render = hidden
        scene.render.resolution_x = previous_render["x"]
        scene.render.resolution_y = previous_render["y"]
        scene.render.resolution_percentage = previous_render["percentage"]
        scene.render.image_settings.file_format = previous_render["format"]
        scene.render.image_settings.color_mode = previous_render["colorMode"]
        scene.render.film_transparent = previous_render["transparent"]
        scene.render.filepath = previous_render["filepath"]
    return outputs


def main() -> None:
    sys.path.insert(0, str(ADDON_ROOT))
    import dig_game_animation_lab as addon
    from dig_game_animation_lab import mesh_fit_ops

    if not hasattr(bpy.types.Scene, "dgal"):
        addon.register()
    scene = bpy.context.scene
    state = scene.dgal
    state.session_name = SESSION_NAME
    state.mesh_candidate_path = str(PORTABLE_MESH_SOURCE)
    require_finished(bpy.ops.dgal.create_session(), "create review session")
    activate_clip(state, "walk")
    if not state.active_rig or not state.reference_mesh:
        raise RuntimeError("The current Survival rig and reference mesh are required")

    first, last = int(state.frame_start), int(state.frame_end)
    frames = sample_frames(first, last)
    require_finished(bpy.ops.dgal.import_mesh_candidate(), "import Legacy Miner")
    require_finished(bpy.ops.dgal.audit_mesh_candidate(), "audit Legacy Miner")
    require_finished(bpy.ops.dgal.align_mesh_candidate(), "align Legacy Miner")
    state.mesh_fit_mode = "RIG_RETARGET"
    require_finished(bpy.ops.dgal.bind_mesh_candidate(), "retarget current walk")

    candidate_objects = mesh_fit_ops.candidate_objects(state)
    candidate_meshes = mesh_fit_ops.candidate_meshes(state)
    target_rig = next(
        (obj for obj in candidate_objects if obj and obj.type == "ARMATURE"),
        None,
    )
    if target_rig is None:
        raise RuntimeError("The Legacy Miner candidate has no armature")
    mapped_bones = int(target_rig.get("dgal_mapped_bones", 0))
    if mapped_bones < 22:
        raise RuntimeError(f"Expected at least 22 mapped bones, found {mapped_bones}")

    leg_motion = rotation_motion_degrees(
        scene,
        target_rig,
        frames,
        ("LeftUpLeg", "LeftLeg", "RightUpLeg", "RightLeg"),
    )
    arm_motion = rotation_motion_degrees(
        scene,
        target_rig,
        frames,
        ("LeftArm", "LeftForeArm", "RightArm", "RightForeArm"),
    )
    if leg_motion < 5.0 or arm_motion < 5.0:
        raise RuntimeError(
            "The fitted walk is effectively static: "
            f"legs={leg_motion} degrees arms={arm_motion} degrees"
        )

    materials = material_audit(candidate_meshes)
    if not materials["materialSlots"]:
        raise RuntimeError("The imported Legacy Miner lost its material")
    outputs = render_comparison(scene, state, mesh_fit_ops, frames)
    require_finished(bpy.ops.dgal.export_review_bundle(), "export review bundle")

    report = {
        "schema": "dig-game-legacy-miner-mesh-fit-review-v1",
        "session": SESSION_NAME,
        "productionChanged": False,
        "requestedAssetCorrection": {
            "requested": source_record(
                REQUESTED_MATERIAL_UASSET,
                "Unreal material; this file contains no character geometry",
            ),
            "actualUnrealMesh": source_record(
                ACTUAL_MESH_UASSET,
                "Unreal skeletal mesh paired with the requested material",
            ),
            "portableMeshUsed": source_record(
                PORTABLE_MESH_SOURCE,
                "Rigged GLB source used by Blender for the isolated fit test",
            ),
            "safeUnrealMaterial": source_record(
                SAFE_UNREAL_MATERIAL_UASSET,
                "Corrected Unreal material already bound to the archived skeletal mesh",
            ),
        },
        "sourceCharacter": {
            "profile": "survival-ual-player-v1",
            "clipId": "walk",
            "sourceClip": state.clips[state.clip_index].source_clip,
            "action": state.active_rig.animation_data.action.name,
            "frameRange": [first, last],
            "sampleFrames": frames,
        },
        "fit": {
            "mode": state.mesh_fit_mode,
            "mappedBones": mapped_bones,
            "targetBoneCount": len(target_rig.data.bones),
            "fitScale": round(
                float(state.candidate_root.get("dgal_fit_scale", 0.0)),
                6,
            ),
            "nativeWeightsPreserved": True,
            "meshAudit": json.loads(state.mesh_audit_report),
            "armMotionDegreesAcrossSamples": arm_motion,
            "legMotionDegreesAcrossSamples": leg_motion,
            "retargetAction": str(target_rig.get("dgal_retarget_action", "")),
        },
        "materials": materials,
        "renders": outputs,
        "reviewBundle": {
            "blend": str((SESSION_ROOT / "blender-animation-lab.blend").relative_to(ROOT)),
            "manifest": str((SESSION_ROOT / "review-manifest.json").relative_to(ROOT)),
        },
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        "LEGACY_MINER_WALK_FIT_OK "
        f"mappedBones={mapped_bones} "
        f"armMotion={arm_motion} "
        f"legMotion={leg_motion} "
        f"report={REPORT_PATH}"
    )


if __name__ == "__main__":
    main()
