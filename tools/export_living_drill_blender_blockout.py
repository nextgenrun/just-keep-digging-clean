from __future__ import annotations

import json
import math
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "sprites" / "character" / "living-drill-v1"
OUT_DIR = ASSET_DIR / "blender" / "v2-motion-polish"
FRAMES_DIR = OUT_DIR / "frames"
PROFILE_PATH = OUT_DIR / "living-drill-motion-profile.json"
BLEND_PATH = OUT_DIR / "living-drill-motion-blockout.blend"

FRAME_COUNTS = {
    "idle": 8,
    "fly": 8,
    "dig_bite": 10,
    "dig_break": 8,
    "recoil": 8,
}


def ease_in_out(t: float) -> float:
    return 0.5 - math.cos(t * math.tau) * 0.5


def ease_out_cubic(t: float) -> float:
    return 1 - (1 - t) ** 3


def motion_sample(name: str, index: int, count: int) -> dict[str, float]:
    t = index / max(1, count - 1)
    loop_t = index / max(1, count)
    phase = loop_t * math.tau
    if name == "idle":
        return {
            "t": round(t, 4),
            "bodyBobPx": round(math.sin(phase) * 0.35, 3),
            "bodyAngleDeg": round(math.sin(phase) * 0.45, 3),
            "drillSpinPhase": round((index * 0.22) % 1, 3),
            "rearThrustLengthPx": round(6 + (math.sin(phase + 0.8) + 1) * 1.4, 3),
            "bottomThrustLengthPx": round(5 + (math.sin(phase + 2.1) + 1) * 1.0, 3),
            "biteDepth01": 0,
            "contactPressure01": 0,
        }
    if name == "fly":
        return {
            "t": round(t, 4),
            "bodyBobPx": round(math.sin(phase) * 0.55, 3),
            "bodyAngleDeg": round(math.sin(phase + 0.4) * 0.75, 3),
            "drillSpinPhase": round((index * 0.18) % 1, 3),
            "rearThrustLengthPx": round(9 + (math.sin(phase * 1.5) + 1) * 2.7, 3),
            "bottomThrustLengthPx": round(11 + (math.sin(phase * 1.5 + 1.7) + 1) * 3.2, 3),
            "biteDepth01": 0,
            "contactPressure01": 0,
        }
    if name == "dig_bite":
        bite = ease_out_cubic(t)
        pulse = math.sin(index * math.pi)
        return {
            "t": round(t, 4),
            "bodyBobPx": 0,
            "bodyAngleDeg": round(pulse * 1.15, 3),
            "drillSpinPhase": round((index * 0.38) % 1, 3),
            "rearThrustLengthPx": round(5 + (1 - t) * 2, 3),
            "bottomThrustLengthPx": round(6 + (1 - t) * 1.2, 3),
            "biteDepth01": round(bite, 4),
            "contactPressure01": round(0.25 + bite * 0.75, 4),
        }
    if name == "dig_break":
        bite = min(1, 0.76 + t * 0.24)
        return {
            "t": round(t, 4),
            "bodyBobPx": 0,
            "bodyAngleDeg": round(math.sin(index * 2.2) * (1 - t) * 1.7, 3),
            "drillSpinPhase": round((index * 0.42) % 1, 3),
            "rearThrustLengthPx": round(4 + t * 2, 3),
            "bottomThrustLengthPx": round(5 + t * 1.4, 3),
            "biteDepth01": round(bite, 4),
            "contactPressure01": round(1 - t * 0.25, 4),
        }
    recoil = 1 - ease_out_cubic(t)
    return {
        "t": round(t, 4),
        "bodyBobPx": 0,
        "bodyAngleDeg": round(math.sin(index * 1.8) * recoil * 1.2, 3),
        "drillSpinPhase": round((index * 0.16) % 1, 3),
        "rearThrustLengthPx": round(4 + (1 - recoil) * 1.5, 3),
        "bottomThrustLengthPx": round(5 + (1 - recoil) * 1.2, 3),
        "biteDepth01": round(recoil * 0.18, 4),
        "contactPressure01": round(recoil * 0.25, 4),
    }


def make_profile() -> dict[str, object]:
    animations = {}
    for name, count in FRAME_COUNTS.items():
        frames = [motion_sample(name, index, count) for index in range(count)]
        animations[name] = {
            "frames": frames,
            "fps": {
                "idle": 7,
                "fly": 9,
                "dig_bite": 14,
                "dig_break": 14,
                "recoil": 12,
            }[name],
        }
    return {
        "schemaVersion": 1,
        "asset": "living-drill-v1",
        "tool": "Blender 5.1 headless motion blockout",
        "anchorPx": {"x": 47, "y": 47},
        "frameSize": [94, 94],
        "usage": "Motion reference only; final accepted frames are rebuilt through anchored Piskel/runtime sheets.",
        "animations": animations,
    }


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def mat(name: str, color: tuple[float, float, float, float]) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    return material


def add_rect(name: str, width: float, height: float, material: bpy.types.Material) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (width, height, 0.04)
    obj.location.z = 0
    obj.data.materials.append(material)
    return obj


def add_triangle(name: str, material: bpy.types.Material) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata([(0, -0.34, 0), (1.15, 0, 0), (0, 0.34, 0)], [], [(0, 1, 2)])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


def setup_scene() -> dict[str, bpy.types.Object]:
    clear_scene()
    bpy.context.scene.render.engine = "BLENDER_WORKBENCH"
    bpy.context.scene.render.resolution_x = 320
    bpy.context.scene.render.resolution_y = 320
    bpy.context.scene.view_settings.view_transform = "Standard"
    bpy.ops.object.light_add(type="AREA", location=(0, 0, 4))
    bpy.context.object.name = "soft-reference-light"
    bpy.context.object.data.energy = 350
    bpy.ops.object.camera_add(location=(0, 0, 7), rotation=(0, 0, 0))
    camera = bpy.context.object
    camera.name = "orthographic-reference-camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 5.8
    bpy.context.scene.camera = camera

    mats = {
        "body": mat("white shell", (0.82, 0.82, 0.80, 1)),
        "drill": mat("gray drill", (0.34, 0.34, 0.34, 1)),
        "flame": mat("blue thrust", (0.02, 0.48, 1.0, 1)),
        "tile": mat("target tile", (0.42, 0.34, 0.27, 0.35)),
        "anchor": mat("anchor red", (1, 0.05, 0.05, 1)),
    }
    objects = {
        "body": add_rect("body proxy", 1.35, 0.95, mats["body"]),
        "drill": add_triangle("drill cone proxy", mats["drill"]),
        "rear": add_triangle("rear thrust proxy", mats["flame"]),
        "bottom": add_triangle("bottom thrust proxy", mats["flame"]),
        "tile": add_rect("target tile marker", 1.45, 1.45, mats["tile"]),
        "anchor_x": add_rect("anchor horizontal", 2.5, 0.015, mats["anchor"]),
        "anchor_y": add_rect("anchor vertical", 0.015, 2.5, mats["anchor"]),
    }
    return objects


def pose_objects(objects: dict[str, bpy.types.Object], sample: dict[str, float], state: str) -> None:
    bite = float(sample["biteDepth01"])
    angle = math.radians(float(sample["bodyAngleDeg"]))
    bob = float(sample["bodyBobPx"]) / 94 * 2.8
    pressure = float(sample["contactPressure01"])
    body_x = bite * 0.42 if state.startswith("dig") else 0
    objects["body"].location = (body_x, bob, 0)
    objects["body"].rotation_euler.z = angle
    objects["drill"].location = (body_x + 0.58, bob, 0.02)
    objects["drill"].rotation_euler.z = angle
    objects["drill"].scale = (0.92 + pressure * 0.08, 0.9, 1)
    objects["rear"].location = (body_x - 0.72, bob, 0.02)
    objects["rear"].rotation_euler.z = math.pi
    objects["rear"].scale = (float(sample["rearThrustLengthPx"]) / 10, 0.55, 1)
    objects["bottom"].location = (body_x - 0.08, bob - 0.58, 0.02)
    objects["bottom"].rotation_euler.z = -math.pi / 2
    objects["bottom"].scale = (float(sample["bottomThrustLengthPx"]) / 12, 0.65, 1)
    objects["tile"].location = (1.55, 0, -0.03)
    objects["tile"].hide_render = not state.startswith("dig")


def render_blockouts(profile: dict[str, object]) -> None:
    objects = setup_scene()
    for state, anim in profile["animations"].items():
        state_dir = FRAMES_DIR / state
        state_dir.mkdir(parents=True, exist_ok=True)
        for old in state_dir.glob("frame-*.png"):
            old.unlink()
        for index, sample in enumerate(anim["frames"]):
            pose_objects(objects, sample, state)
            bpy.context.scene.frame_set(index)
            bpy.context.scene.render.filepath = str(state_dir / f"frame-{index:03d}.png")
            bpy.ops.render.render(write_still=True)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    FRAMES_DIR.mkdir(parents=True, exist_ok=True)
    profile = make_profile()
    PROFILE_PATH.write_text(json.dumps(profile, indent=2), encoding="utf-8")
    render_blockouts(profile)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    print(f"Wrote living-drill Blender motion blockout: {PROFILE_PATH}")


if __name__ == "__main__":
    main()
