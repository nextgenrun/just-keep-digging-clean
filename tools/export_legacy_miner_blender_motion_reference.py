from __future__ import annotations

import json
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = ROOT / "markdown" / "audit" / "animation-audit" / "2026-07-03-legacy-miner-demo-review"
PROFILE_PATH = REVIEW_DIR / "legacy-miner-motion-profile.json"
OUT_DIR = REVIEW_DIR / "blender-reference"
FRAMES_DIR = OUT_DIR / "frames"
BLEND_PATH = OUT_DIR / "legacy-miner-motion-reference.blend"


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def make_material(name: str, color: tuple[float, float, float, float]) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    return material


def add_cube(name: str, material: bpy.types.Material, size: tuple[float, float, float]) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    obj.data.materials.append(material)
    return obj


def setup_scene() -> dict[str, bpy.types.Object]:
    clear_scene()
    bpy.context.scene.render.engine = "BLENDER_WORKBENCH"
    bpy.context.scene.render.resolution_x = 640
    bpy.context.scene.render.resolution_y = 360
    bpy.context.scene.view_settings.view_transform = "Standard"
    bpy.ops.object.camera_add(location=(0, 0, 8), rotation=(0, 0, 0))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 5.0
    bpy.context.scene.camera = camera
    mats = {
        "body": make_material("miner body proxy", (0.82, 0.74, 0.58, 1)),
        "reach": make_material("reach guide", (1.0, 0.78, 0.25, 1)),
        "tile": make_material("tile guide", (0.42, 0.32, 0.22, 0.55)),
        "anchor": make_material("anchor guide", (0.2, 0.85, 1.0, 1)),
    }
    return {
        "body": add_cube("body ellipse proxy", mats["body"], (0.9, 1.5, 0.04)),
        "reach": add_cube("reach proxy", mats["reach"], (1.0, 0.08, 0.05)),
        "tile": add_cube("tile proxy", mats["tile"], (0.95, 0.95, 0.03)),
        "feet": add_cube("feet anchor", mats["anchor"], (2.1, 0.035, 0.06)),
    }


def apply_sample(objects: dict[str, bpy.types.Object], sample: dict[str, float], frame_size: list[int]) -> None:
    width, height = frame_size
    px_to_world = 3.0 / max(width, height)
    cx = (float(sample["cx"]) - width / 2) * px_to_world
    cy = -(float(sample["cy"]) - height / 2) * px_to_world
    reach_x = float(sample["reachX"]) * px_to_world
    reach_y = -float(sample["reachY"]) * px_to_world
    objects["body"].location = (cx, cy, 0)
    objects["body"].dimensions = (float(sample["w"]) * px_to_world, float(sample["h"]) * px_to_world, 0.04)
    objects["body"].rotation_euler.z = float(sample.get("angle", 0)) * 0.0174533
    objects["reach"].location = (cx + reach_x / 2, cy + reach_y / 2, 0.05)
    objects["reach"].dimensions = (max(0.05, (reach_x ** 2 + reach_y ** 2) ** 0.5), 0.08, 0.05)
    objects["reach"].rotation_euler.z = __import__("math").atan2(reach_y, reach_x or 0.001)
    objects["tile"].location = (1.5, -1.05, -0.03)
    objects["feet"].location = (0, -1.48, 0.06)


def main() -> None:
    profile = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    FRAMES_DIR.mkdir(parents=True, exist_ok=True)
    objects = setup_scene()
    for name, animation in profile["animations"].items():
        anim_dir = FRAMES_DIR / name
        anim_dir.mkdir(parents=True, exist_ok=True)
        for old in anim_dir.glob("frame-*.png"):
            old.unlink()
        for index, sample in enumerate(animation["frames"]):
            apply_sample(objects, sample, profile["frameSize"])
            bpy.context.scene.frame_set(index)
            bpy.context.scene.render.filepath = str(anim_dir / f"frame-{index:03d}.png")
            bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    print(f"Wrote {BLEND_PATH}")


if __name__ == "__main__":
    main()
