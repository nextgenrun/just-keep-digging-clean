"""Render the exact active prone-v3 flight motion with the review quality pass."""

from __future__ import annotations

import importlib.util
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
SHARED_PATH = ROOT / "ai-tools/2026-08-14-render-survival-current-motion-quality-candidate.py"
OUTPUT = ROOT / "visual-approval-previews/2026-08-14-survival-current-runtime-vs-full-improvements-v1/candidate-1024/flight"


def load_shared():
    spec = importlib.util.spec_from_file_location("survival_quality_candidate", SHARED_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    shared = load_shared()
    scene = bpy.context.scene
    camera = bpy.data.objects["SurvivalPolishCamera"]
    rig = bpy.data.objects["SurvivalPolishRig"]
    mesh = bpy.data.objects["SurvivalPolishBody"]
    root = bpy.data.objects["DG_PRONE_FLIGHT_IDLE_V3_ROOT"]
    action = bpy.data.actions["DG_SUPERMAN_FLIGHT_IDLE_PRONE_V3"]
    shared.configure_scene(scene, camera)
    texture_report = shared.relink_textures_and_repair_eye()
    mesh_report = shared.apply_mesh_pass(mesh)
    scene.render.fps = 16
    rig.animation_data_create()
    rig.animation_data.action = action
    OUTPUT.mkdir(parents=True, exist_ok=True)
    base_location = root.location.copy()
    camera_basis = camera.matrix_world.to_3x3()
    camera_right = (camera_basis @ Vector((1, 0, 0))).normalized()
    camera_up = (camera_basis @ Vector((0, 1, 0))).normalized()
    for index in range(36):
        scene.frame_set(1)
        phase = math.tau * index / 36
        root.location = base_location + camera_up * (math.sin(phase) * 0.015) + camera_right * (math.sin(phase * 2) * 0.003)
        keys = mesh.data.shape_keys.key_blocks
        keys["DG_SECONDARY_JACKET"].value = 0.34 + math.sin(phase - 0.45) * 0.18
        keys["DG_SECONDARY_BACKPACK"].value = 0.28 + math.sin(phase - 0.8) * 0.14
        bpy.context.view_layer.update()
        scene.render.filepath = str(OUTPUT / f"frame-{index:03d}.png")
        bpy.ops.render.render(write_still=True)
        print(f"QUALITY_CANDIDATE action=flight frame={index + 1}/36", flush=True)
    root.location = base_location
    report = {
        "version": 1,
        "reviewOnly": True,
        "productionChanged": False,
        "motionSource": "DG_SUPERMAN_FLIGHT_IDLE_PRONE_V3",
        "frames": 36,
        "fps": 16,
        "renderSize": 1024,
        "downsamplePasses": 1,
        "textures": texture_report,
        "meshPass": mesh_report,
    }
    (OUTPUT / "candidate-flight-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"QUALITY_CANDIDATE_FLIGHT_OK output={OUTPUT}")


if __name__ == "__main__":
    main()
