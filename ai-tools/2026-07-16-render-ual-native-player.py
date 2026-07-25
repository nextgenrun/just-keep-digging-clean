"""Render the native Quaternius UAL mannequin into weapon-free Phaser frames."""

from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import dataclass
from pathlib import Path

import bpy
from mathutils import Vector

PIPELINE_ROOT = Path(__file__).resolve().parents[1] / "pipelines" / "blender"
if str(PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(PIPELINE_ROOT))
from ualGameRigRetarget import (  # noqa: E402
    apply_game_retarget,
    create_game_retarget,
    describe_game_retarget,
    destroy_game_retarget,
)
from ualAuthoredKick import (  # noqa: E402
    apply_authored_kick,
    create_authored_kick,
    describe_authored_kick,
    destroy_authored_kick,
)
from ualRigMarkers import (  # noqa: E402
    describe_rig_marker_schema,
    project_native_rig_markers,
)
from ualSurvivalSkin import (  # noqa: E402
    apply_survival_skin,
    create_survival_skin,
    describe_survival_skin,
    set_survival_skin_visible,
)

SOURCE_FPS, FRAME_SIZE = 24.0, 512
TARGET_HEIGHT_METERS, ORTHOGRAPHIC_SCALE = 1.9, 2.05
CAMERA_TARGET_Z, CAMERA_ELEVATION_DEGREES, SOURCE_FACING_YAW_DEGREES = 1.0, 0.0, 180.0
PIPELINE_ID = "native-ual-game-rig-v2-zero-weapon"
AUTHORED_KICK_CONFIG_PATH = Path(__file__).resolve().parents[1] / "values" / "ualNativeAuthoredKick.json"


def authored_kick_spec() -> dict[str, object]:
    config = json.loads(AUTHORED_KICK_CONFIG_PATH.read_text(encoding="utf-8"))
    return {
        "id": "melee-kick",
        "source": config["base_source"],
        "clip": config["base_clip"],
        "fps": 30,
        "loop": False,
        "source_frame": config["base_frame"],
        "frame_count": config["frame_count"],
        "authored_kick_config": AUTHORED_KICK_CONFIG_PATH,
    }

ACTION_SPECS = (
    {"id": "idle", "source": "ual1", "clip": "Idle_Loop", "fps": 30, "loop": True},
    {"id": "idle-talk", "source": "ual1", "clip": "Idle_Talking_Loop", "fps": 30, "loop": True},
    {"id": "walk", "source": "ual1", "clip": "Jog_Fwd_Loop", "fps": 30, "loop": True},
    {"id": "run", "source": "ual1", "clip": "Jog_Fwd_Loop", "fps": 30, "loop": True},
    {"id": "airborne", "source": "ual1", "clip": "Jump_Start", "fps": 30, "loop": False},
    {"id": "falling", "source": "ual1", "clip": "Jump_Loop", "fps": 30, "loop": True},
    {"id": "crouch", "source": "ual1", "clip": "Crouch_Idle_Loop", "fps": 30, "loop": True},
    {"id": "fly", "source": "ual2", "clip": "Shield_Dash", "fps": 30, "loop": False, "source_start": 1.6, "source_end": 12.0},
    {"id": "climb", "source": "ual2", "clip": "ClimbUp_1m", "fps": 30, "loop": True},
    {"id": "punch-jab", "source": "ual1", "clip": "Punch_Jab", "fps": 30, "loop": False},
    {"id": "punch-cross", "source": "ual1", "clip": "Punch_Cross", "fps": 30, "loop": False},
    {"id": "pickaxe-mining", "source": "ual2", "clip": "TreeChopping_Loop", "fps": 30, "loop": True},
    {"id": "punch-uppercut", "source": "ual2", "clip": "Melee_Hook", "fps": 30, "loop": False},
    {
        "id": "melee-hook",
        "source": "ual2",
        "fps": 30,
        "loop": False,
        "segments": (
            {"clip": "Melee_Hook"},
            {"clip": "Melee_Hook_Rec", "skip_first": True},
        ),
    },
    authored_kick_spec(),
    {"id": "dig-up", "source": "ual2", "clip": "Sword_Regular_C", "fps": 30, "loop": False, "source_start": 2.4, "source_end": 15.2},
    {"id": "ground-strike", "source": "ual2", "clip": "OverhandThrow", "fps": 30, "loop": False},
    {"id": "wall-push", "source": "ual1", "clip": "Push_Loop", "fps": 30, "loop": True},
    {"id": "teleport", "source": "ual1", "clip": "Roll", "fps": 30, "loop": False},
    {"id": "thunder-charge", "source": "ual1", "clip": "Spell_Simple_Idle_Loop", "fps": 30, "loop": True},
    {"id": "hit-react", "source": "ual1", "clip": "Hit_Chest", "fps": 30, "loop": False},
    {"id": "death", "source": "ual1", "clip": "Death01", "fps": 30, "loop": False, "recenter_horizontal": True},
    {"id": "landing", "source": "ual1", "clip": "Jump_Land", "fps": 30, "loop": False},
)

# Explicit-review actions are selectable with --actions but are intentionally
# excluded from the default production render. This keeps comparison work from
# silently expanding the promoted runtime manifest.
WALK_REVIEW_SPECS = (
    {"id": "walk-review-current", "source": "ual1", "clip": "Walk_Loop", "fps": 30, "loop": True},
    {"id": "walk-review-formal", "source": "ual1", "clip": "Walk_Formal_Loop", "fps": 30, "loop": True},
    {"id": "walk-review-jog", "source": "ual1", "clip": "Jog_Fwd_Loop", "fps": 30, "loop": True},
    {"id": "walk-review-sprint", "source": "ual1", "clip": "Sprint_Loop", "fps": 30, "loop": True},
    {"id": "walk-review-carry", "source": "ual2", "clip": "Walk_Carry_Loop", "fps": 30, "loop": True},
    {"id": "walk-review-crouched", "source": "ual1", "clip": "Crouch_Fwd_Loop", "fps": 30, "loop": True},
    {"id": "walk-review-heavy", "source": "ual2", "clip": "Zombie_Walk_Fwd_Loop", "fps": 30, "loop": True},
)


@dataclass
class NativeActor:
    source: str
    wrapper: bpy.types.Object
    armature: bpy.types.Object
    meshes: list[bpy.types.Object]
    actions: dict[str, bpy.types.Action]
    base_location: Vector

def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True)
    parser.add_argument("--ual1", required=True)
    parser.add_argument("--ual2", required=True)
    parser.add_argument("--actions", default="")
    parser.add_argument("--visual-skin-config", default="")
    return parser.parse_args(argv)

def srgb_channel_to_linear(value: float) -> float:
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4

def srgb_hex_to_linear(value: int) -> tuple[float, float, float, float]:
    channels = ((value >> 16) & 255, (value >> 8) & 255, value & 255)
    return tuple(srgb_channel_to_linear(channel / 255.0) for channel in channels) + (1.0,)

def clear_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)

def configure_scene() -> bpy.types.Scene:
    scene = bpy.context.scene
    engines = {item.identifier for item in scene.bl_rna.properties["render"].fixed_type.properties["engine"].enum_items}
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engines else "BLENDER_EEVEE"
    scene.render.film_transparent = True
    scene.render.resolution_x = FRAME_SIZE
    scene.render.resolution_y = FRAME_SIZE
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 18
    scene.render.fps = int(SOURCE_FPS)
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 1.25
    if scene.world is None:
        scene.world = bpy.data.worlds.new("UAL Native Player World")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = srgb_hex_to_linear(0x151D21)
    background.inputs["Strength"].default_value = 0.6
    return scene

def create_reviewer_material() -> bpy.types.Material:
    material = bpy.data.materials.new("UAL Reviewer Neutral Steel")
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = srgb_hex_to_linear(0x657078)
    metallic_input = principled.inputs.get("Metallic IOR Level") or principled.inputs.get("Metallic")
    metallic_input.default_value = 0.34
    principled.inputs["Roughness"].default_value = 0.48
    return material

def world_bounds(meshes: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    points: list[Vector] = []
    for obj in meshes:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            points.extend(evaluated.matrix_world @ vertex.co for vertex in mesh.vertices)
        finally:
            evaluated.to_mesh_clear()
    minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    return minimum, maximum

def action_key(name: str) -> str:
    return name.split("|")[-1].split(".")[0]

def import_actor(path: Path, source: str, material: bpy.types.Material) -> NativeActor:
    before_objects = set(bpy.data.objects)
    before_actions = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported_objects = set(bpy.data.objects) - before_objects
    imported_actions = set(bpy.data.actions) - before_actions
    armatures = [obj for obj in imported_objects if obj.type == "ARMATURE"]
    meshes = [obj for obj in imported_objects if obj.type == "MESH"]
    if len(armatures) != 1 or not meshes:
        raise RuntimeError(f"{source} must contain one armature and visible meshes")
    armature = armatures[0]
    if len(armature.data.bones) != 65:
        raise RuntimeError(f"{source} expected 65 joints, found {len(armature.data.bones)}")
    for mesh in meshes:
        mesh.data.materials.clear()
        mesh.data.materials.append(material)
        mesh.hide_render = True
    wrapper = bpy.data.objects.new(f"UAL_{source.upper()}_Native_Wrapper", None)
    bpy.context.scene.collection.objects.link(wrapper)
    for obj in [item for item in imported_objects if item.parent not in imported_objects]:
        matrix = obj.matrix_world.copy()
        obj.parent = wrapper
        obj.matrix_world = matrix
    bpy.context.view_layer.update()
    minimum, maximum = world_bounds(meshes)
    height = max(0.001, maximum.z - minimum.z)
    wrapper.scale *= TARGET_HEIGHT_METERS / height
    bpy.context.view_layer.update()
    minimum, _ = world_bounds(meshes)
    wrapper.location.z -= minimum.z
    actions = {action_key(action.name): action for action in imported_actions}
    for action in imported_actions:
        action.use_fake_user = True
    return NativeActor(source, wrapper, armature, meshes, actions, wrapper.location.copy())

def choose_action(actor: NativeActor, clip_name: str) -> bpy.types.Action:
    action = actor.actions.get(clip_name)
    if action is None:
        raise RuntimeError(f"{actor.source} does not contain {clip_name}")
    actor.armature.animation_data_create()
    for track in actor.armature.animation_data.nla_tracks:
        track.mute = True
    actor.armature.animation_data.action = action
    if actor.armature.animation_data.action_slot is None and len(action.slots) == 1:
        actor.armature.animation_data.action_slot = action.slots[0]
    return action

def set_fractional_frame(scene: bpy.types.Scene, frame: float) -> None:
    whole = math.floor(frame)
    scene.frame_set(whole, subframe=frame - whole)

def recenter_actor_horizontally(actor: NativeActor) -> None:
    actor.wrapper.location = actor.base_location.copy()
    bpy.context.view_layer.update()
    minimum, maximum = world_bounds(actor.meshes)
    actor.wrapper.location.y -= (minimum.y + maximum.y) * 0.5
    bpy.context.view_layer.update()

def sampled_frames(
    action: bpy.types.Action,
    fps: int,
    loop: bool,
    source_start: float | None = None,
    source_end: float | None = None,
    source_frame: float | None = None,
    frame_count: int | None = None,
) -> list[float]:
    action_start, action_end = (float(value) for value in action.frame_range)
    if source_frame is not None or frame_count is not None:
        if source_frame is None or frame_count is None:
            raise ValueError(f"Fixed-base sampling for {action.name} requires source_frame and frame_count")
        if source_start is not None or source_end is not None:
            raise ValueError(f"Fixed-base sampling for {action.name} cannot also use a source range")
        count_value = float(frame_count)
        if not count_value.is_integer() or count_value < 2:
            raise ValueError(f"Invalid fixed-base frame count {frame_count} for {action.name}")
        frame = float(source_frame)
        if not action_start <= frame <= action_end:
            raise ValueError(f"Fixed-base source frame {frame} is outside {action_start}..{action_end} for {action.name}")
        return [frame] * int(count_value)
    start = action_start if source_start is None else max(action_start, float(source_start))
    end = action_end if source_end is None else min(action_end, float(source_end))
    if end <= start:
        raise ValueError(f"Invalid source range {start}..{end} for {action.name}")
    duration_seconds = max(1.0 / SOURCE_FPS, (end - start) / SOURCE_FPS)
    count = max(2, round(duration_seconds * fps) + (0 if loop else 1))
    divisor = count if loop else max(1, count - 1)
    return [start + (end - start) * index / divisor for index in range(count)]

def point_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()

def add_area_light(name: str, energy: float, size: float, color: tuple[float, float, float]) -> bpy.types.Object:
    data = bpy.data.lights.new(name=name, type="AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    light = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(light)
    return light

def build_camera_and_lights(scene: bpy.types.Scene) -> tuple[bpy.types.Object, tuple[bpy.types.Object, ...]]:
    camera_data = bpy.data.cameras.new("UAL Native Orthographic Camera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = ORTHOGRAPHIC_SCALE
    camera = bpy.data.objects.new("UAL Native Orthographic Camera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    lights = (
        add_area_light("UAL Warm Key", 1050.0, 5.0, (1.0, 0.74, 0.48)),
        add_area_light("UAL Cool Rim", 850.0, 4.0, (0.25, 0.67, 1.0)),
        add_area_light("UAL Soft Fill", 500.0, 5.0, (0.65, 0.84, 0.90)),
    )
    target = Vector((0.0, 0.0, CAMERA_TARGET_Z))
    yaw = math.radians(SOURCE_FACING_YAW_DEGREES)
    elevation = math.radians(CAMERA_ELEVATION_DEGREES)
    distance = 6.5
    horizontal = distance * math.cos(elevation)
    camera.location = target + Vector((math.cos(yaw) * horizontal, math.sin(yaw) * horizontal, distance * math.sin(elevation)))
    point_at(camera, target)
    for light, location in zip(lights, ((-4.0, -5.0, 7.0), (4.0, 4.0, 4.0), (0.0, -2.0, 5.0))):
        light.location = location
        point_at(light, target)
    return camera, lights

def render_action(
    scene: bpy.types.Scene,
    camera: bpy.types.Object,
    output: Path,
    actors: dict[str, NativeActor],
    spec: dict[str, object],
    visual_skin=None,
) -> dict[str, object]:
    actor = actors[str(spec["source"])]
    for candidate in actors.values():
        visible = candidate is actor
        candidate.wrapper.hide_render = not visible
        for mesh in candidate.meshes:
            mesh.hide_render = not visible
    if visual_skin is not None:
        for candidate in actors.values():
            for mesh in candidate.meshes:
                mesh.hide_render = True
        set_survival_skin_visible(visual_skin, True)
    segment_specs = spec.get("segments") or (spec,)
    samples: list[tuple[str, bpy.types.Action, float]] = []
    source_ranges: list[dict[str, object]] = []
    for segment in segment_specs:
        clip = str(segment["clip"])
        action = choose_action(actor, clip)
        segment_frames = sampled_frames(
            action,
            int(spec["fps"]),
            bool(segment.get("loop", spec["loop"])),
            segment.get("source_start", spec.get("source_start")),
            segment.get("source_end", spec.get("source_end")),
            segment.get("source_frame", spec.get("source_frame")),
            segment.get("frame_count", spec.get("frame_count")),
        )
        if segment.get("skip_first"):
            segment_frames = segment_frames[1:]
        samples.extend((clip, action, frame) for frame in segment_frames)
        source_ranges.append({
            "clip": clip,
            "action_frame_range": list(action.frame_range),
            "sampled_frame_range": [segment_frames[0], segment_frames[-1]],
        })
    if len(samples) < 2:
        raise ValueError(f"{spec['id']} produced fewer than two frames")
    retarget = create_game_retarget(actor, spec.get("game_retarget"))
    authored_kick = None
    authored_pose = None
    paths: list[str] = []
    frame_markers: dict[str, dict[str, list[float]]] = {}
    action_output = output / str(spec["id"])
    action_output.mkdir(parents=True, exist_ok=True)
    current_action: bpy.types.Action | None = None
    try:
        authored_config = spec.get("authored_kick_config")
        if authored_config:
            guard_clip, _guard_action, guard_frame = samples[0]
            choose_action(actor, guard_clip)
            set_fractional_frame(scene, guard_frame)
            bpy.context.view_layer.update()
            authored_kick = create_authored_kick(actor, authored_config)
            authored_pose = describe_authored_kick(authored_kick)
        for index, (clip, action, frame) in enumerate(samples):
            if action is not current_action:
                choose_action(actor, clip)
                current_action = action
            set_fractional_frame(scene, frame)
            if authored_kick is not None:
                apply_authored_kick(actor, authored_kick, index, len(samples))
            apply_game_retarget(actor, retarget, index)
            if spec.get("recenter_horizontal"):
                recenter_actor_horizontally(actor)
            if visual_skin is not None:
                apply_survival_skin(actor, visual_skin)
            frame_markers[str(index)] = project_native_rig_markers(
                scene,
                camera,
                actor.armature,
            )
            if index == 0:
                visible_meshes = [visual_skin.body] if visual_skin is not None else actor.meshes
                minimum, maximum = world_bounds(visible_meshes)
                print(
                    f"UAL_NATIVE_BOUNDS {spec['id']} "
                    f"min={tuple(round(value, 4) for value in minimum)} "
                    f"max={tuple(round(value, 4) for value in maximum)}",
                    flush=True,
                )
            scene.render.filepath = str(action_output / f"frame-{index:03d}.png")
            bpy.ops.render.render(write_still=True)
            paths.append(Path(scene.render.filepath).name)
    finally:
        try:
            destroy_authored_kick(actor, authored_kick)
        finally:
            destroy_game_retarget(actor, retarget)
    manifest = {
        "version": 1,
        "pipeline": PIPELINE_ID,
        "action": spec["id"],
        "source": spec["source"],
        "source_clip": (
            authored_pose["id"]
            if authored_pose is not None
            else " + ".join(source_range["clip"] for source_range in source_ranges)
        ),
        "source_clips": [source_range["clip"] for source_range in source_ranges],
        "frame_size": FRAME_SIZE,
        "fps": spec["fps"],
        "loop": spec["loop"],
        "source_frame_range": source_ranges[0]["action_frame_range"],
        "source_frame_ranges": source_ranges,
        "sampled_source_frames": [
            {"clip": clip, "frame": frame}
            for clip, _action, frame in samples
        ],
        "frames": paths,
        "recenter_horizontal": bool(spec.get("recenter_horizontal")),
        "game_retarget": describe_game_retarget(spec.get("game_retarget")),
        "motion_origin": "authored-pose" if authored_pose else "native-source-clip",
        "authored_pose": authored_pose,
        "visual_skin": describe_survival_skin(visual_skin) if visual_skin is not None else None,
        "rig_markers": {
            **describe_rig_marker_schema(),
            "frames": frame_markers,
        },
        "weapon": None,
    }
    (action_output / "render-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"UAL_NATIVE_RENDER {spec['id']} frames={len(samples)}", flush=True)
    return manifest

def main() -> None:
    args = parse_args()
    output = Path(args.output).resolve()
    requested = {value.strip() for value in args.actions.split(",") if value.strip()}
    available_specs = ACTION_SPECS + WALK_REVIEW_SPECS
    specs = (
        tuple(spec for spec in available_specs if spec["id"] in requested)
        if requested
        else ACTION_SPECS
    )
    unknown = requested - {str(spec["id"]) for spec in available_specs}
    if unknown:
        raise ValueError(f"Unknown actions: {sorted(unknown)}")
    clear_scene()
    scene = configure_scene()
    material = create_reviewer_material()
    actors = {
        "ual1": import_actor(Path(args.ual1).resolve(), "ual1", material),
        "ual2": import_actor(Path(args.ual2).resolve(), "ual2", material),
    }
    visual_skin = (
        create_survival_skin(actors["ual1"], Path(args.visual_skin_config))
        if args.visual_skin_config
        else None
    )
    if visual_skin is not None:
        source_size = int(visual_skin.config["render"]["source_size"])
        scene.render.resolution_x = source_size
        scene.render.resolution_y = source_size
    camera, _ = build_camera_and_lights(scene)
    output.mkdir(parents=True, exist_ok=True)
    manifests = {
        str(spec["id"]): render_action(scene, camera, output, actors, spec, visual_skin)
        for spec in specs
    }
    source_manifest = {
        "version": 1,
        "pipeline": PIPELINE_ID,
        "frame_size": FRAME_SIZE,
        "target_height_meters": TARGET_HEIGHT_METERS,
        "orthographic_scale": ORTHOGRAPHIC_SCALE,
        "source_facing_yaw_degrees": SOURCE_FACING_YAW_DEGREES,
        "material": {"color": "#657078", "roughness": 0.48, "metalness": 0.34},
        "visual_skin": describe_survival_skin(visual_skin) if visual_skin is not None else None,
        "weapon_policy": "none",
        "rig_marker_schema": describe_rig_marker_schema(),
        "actions": manifests,
    }
    (output / "source-manifest.json").write_text(json.dumps(source_manifest, indent=2) + "\n", encoding="utf-8")
    print(f"UAL_NATIVE_RENDER_OK actions={len(manifests)} output={output}", flush=True)


if __name__ == "__main__": main()
