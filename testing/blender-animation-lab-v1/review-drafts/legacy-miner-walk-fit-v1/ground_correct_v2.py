"""Ground the corrected v2 action from the evaluated Meshy shoe geometry."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import bpy
from mathutils import Vector


V2_ROOT = Path(__file__).resolve().parents[1] / "legacy-miner-walk-fit-v2"
REPORT_PATH = V2_ROOT / "fit-report.json"
BLEND_PATH = V2_ROOT / "blender-animation-lab.blend"
RENDER_ROOT = V2_ROOT / "proof-renders"
SAMPLE_FRAMES = (1, 7, 12, 18)
CONTACT_BONES = (
    "LeftFoot",
    "LeftToeBase",
    "RightFoot",
    "RightToeBase",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def rounded(values, digits: int = 6) -> list[float]:
    return [round(float(value), digits) for value in values]


def rigged_meshes(
    scene: bpy.types.Scene,
    rig: bpy.types.Object,
) -> list[bpy.types.Object]:
    return [
        obj
        for obj in scene.objects
        if obj.type == "MESH"
        and any(
            modifier.type == "ARMATURE" and modifier.object == rig
            for modifier in obj.modifiers
        )
    ]


def world_pose_head(rig: bpy.types.Object, name: str) -> Vector:
    return rig.matrix_world @ rig.pose.bones[name].head


def evaluated_mesh_bounds(
    scene: bpy.types.Scene,
    objects: list[bpy.types.Object],
) -> dict:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    minimum = Vector((float("inf"), float("inf"), float("inf")))
    maximum = Vector((float("-inf"), float("-inf"), float("-inf")))
    count = 0
    for original in objects:
        evaluated = original.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            world = evaluated.matrix_world
            for vertex in mesh.vertices:
                point = world @ vertex.co
                minimum.x = min(minimum.x, point.x)
                minimum.y = min(minimum.y, point.y)
                minimum.z = min(minimum.z, point.z)
                maximum.x = max(maximum.x, point.x)
                maximum.y = max(maximum.y, point.y)
                maximum.z = max(maximum.z, point.z)
                count += 1
        finally:
            evaluated.to_mesh_clear()
    dimensions = maximum - minimum
    return {
        "frame": scene.frame_current,
        "vertices": count,
        "minimumWorld": rounded(minimum),
        "maximumWorld": rounded(maximum),
        "dimensionsWorld": rounded(dimensions),
        "diagonalWorld": round(dimensions.length, 6),
    }


def render_corrected_samples(
    scene: bpy.types.Scene,
    source_rig: bpy.types.Object,
    target_rig: bpy.types.Object,
    target_meshes: list[bpy.types.Object],
) -> dict[int, dict]:
    source_meshes = rigged_meshes(scene, source_rig)
    tracked = [*source_meshes, *target_meshes]
    hidden = {obj: obj.hide_render for obj in tracked}
    previous = {
        "frame": scene.frame_current,
        "x": scene.render.resolution_x,
        "y": scene.render.resolution_y,
        "percentage": scene.render.resolution_percentage,
        "format": scene.render.image_settings.file_format,
        "mode": scene.render.image_settings.color_mode,
        "transparent": scene.render.film_transparent,
        "filepath": scene.render.filepath,
    }
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    outputs = {}
    try:
        for obj in source_meshes:
            obj.hide_render = True
        for obj in target_meshes:
            obj.hide_render = False
        for frame in SAMPLE_FRAMES:
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            output = (
                RENDER_ROOT
                / f"corrected-v2-meshy-frame-{frame:04d}.png"
            )
            scene.render.filepath = str(output)
            bpy.ops.render.render(write_still=True)
            outputs[frame] = {
                "sha256": sha256(output),
                "path": str(output),
            }
    finally:
        for obj, value in hidden.items():
            obj.hide_render = value
        scene.frame_set(previous["frame"])
        scene.render.resolution_x = previous["x"]
        scene.render.resolution_y = previous["y"]
        scene.render.resolution_percentage = previous["percentage"]
        scene.render.image_settings.file_format = previous["format"]
        scene.render.image_settings.color_mode = previous["mode"]
        scene.render.film_transparent = previous["transparent"]
        scene.render.filepath = previous["filepath"]
    return outputs


def main() -> None:
    scene = bpy.context.scene
    source_rig = bpy.data.objects.get("root")
    target_rig = next(
        (
            obj
            for obj in scene.objects
            if obj.type == "ARMATURE"
            and obj.get("dgal_retarget_version") == 2
        ),
        None,
    )
    if source_rig is None or target_rig is None:
        raise RuntimeError("The source and corrected-v2 rigs are required")
    corrected_action = (
        target_rig.animation_data.action
        if target_rig.animation_data
        else None
    )
    if corrected_action is None:
        raise RuntimeError("The corrected-v2 action is missing")
    target_meshes = rigged_meshes(scene, target_rig)
    if not target_meshes:
        raise RuntimeError("The corrected Meshy skin is missing")

    first = int(corrected_action.frame_range[0])
    last = int(corrected_action.frame_range[1])
    previous_frame = scene.frame_current

    target_rig.animation_data.action = None
    for pose_bone in target_rig.pose.bones:
        pose_bone.matrix_basis.identity()
    scene.frame_set(first)
    bpy.context.view_layer.update()
    rest_bounds = evaluated_mesh_bounds(scene, target_meshes)
    rest_ground_z = rest_bounds["minimumWorld"][2]
    target_rig.animation_data.action = corrected_action

    frames = []
    for frame in range(first, last + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        before = evaluated_mesh_bounds(scene, target_meshes)
        correction = rest_ground_z - before["minimumWorld"][2]
        hips = target_rig.pose.bones["Hips"]
        hips_world = target_rig.matrix_world @ hips.head
        hips_world.z += correction
        matrix = hips.matrix.copy()
        matrix.translation = (
            target_rig.matrix_world.inverted_safe() @ hips_world
        )
        hips.matrix = matrix
        hips.keyframe_insert("location", frame=frame, group="Hips")
        bpy.context.view_layer.update()
        after = evaluated_mesh_bounds(scene, target_meshes)
        frames.append(
            {
                "frame": frame,
                "meshGroundBeforeWorldZ": before["minimumWorld"][2],
                "meshGroundCorrectionWorldZ": round(correction, 6),
                "meshGroundAfterWorldZ": after["minimumWorld"][2],
                "lowestFootJointWorldZ": round(
                    min(
                        world_pose_head(target_rig, name).z
                        for name in CONTACT_BONES
                    ),
                    6,
                ),
            }
        )

    corrected_bounds = []
    for frame in SAMPLE_FRAMES:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        corrected_bounds.append(
            evaluated_mesh_bounds(scene, target_meshes)
        )
    rendered = render_corrected_samples(
        scene,
        source_rig,
        target_rig,
        target_meshes,
    )

    report = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    report["correctedBoundsBySampleFrame"] = corrected_bounds
    report["targetRestBounds"] = rest_bounds
    report["motionValidation"]["groundingMode"] = (
        "evaluated skinned Meshy shoe geometry"
    )
    report["motionValidation"]["restMeshGroundWorldZ"] = rest_ground_z
    report["motionValidation"]["meshGroundingFrames"] = frames
    for render in report["renders"]:
        if render["label"] != "corrected-v2-meshy":
            continue
        refreshed = rendered[int(render["frame"])]
        render["sha256"] = refreshed["sha256"]
    report["productionChanged"] = False
    REPORT_PATH.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )

    scene.frame_set(first)
    target_rig.animation_data.action = corrected_action
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    scene.frame_set(previous_frame)
    print(
        "LEGACY_MINER_WALK_V2_GROUNDED_OK "
        f"frames={len(frames)} "
        f"ground={rest_ground_z} "
        f"maxResidual={max(abs(item['meshGroundAfterWorldZ'] - rest_ground_z) for item in frames):.8f} "
        f"report={REPORT_PATH}"
    )


if __name__ == "__main__":
    main()
