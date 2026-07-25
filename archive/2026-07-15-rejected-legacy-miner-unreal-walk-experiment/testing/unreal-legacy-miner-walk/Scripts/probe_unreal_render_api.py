"""Capture reflected UE 5.8 editor-render scripting signatures."""

from __future__ import annotations

import json
from pathlib import Path

import unreal


REPORT_PATH = Path(unreal.Paths.project_dir()) / "SourceAssets" / "unreal-render-signatures.json"


def docs(cls: object, names: list[str]) -> dict[str, str | None]:
    return {name: getattr(getattr(cls, name, None), "__doc__", None) for name in names}


report = {
    "EditorLevelLibrary": docs(
        unreal.EditorLevelLibrary,
        [
            "new_level",
            "spawn_actor_from_class",
            "get_editor_world",
            "set_level_viewport_camera_info",
            "save_current_level",
        ],
    ),
    "RenderingLibrary": docs(
        unreal.RenderingLibrary,
        ["create_render_target_2d", "clear_render_target_2d", "export_render_target"],
    ),
    "SceneCaptureComponent2D": docs(
        unreal.SceneCaptureComponent2D,
        ["capture_scene", "set_editor_properties"],
    ),
    "SkeletalMeshComponent": docs(
        unreal.SkeletalMeshComponent,
        ["set_skeletal_mesh", "set_animation", "set_position", "play", "stop"],
    ),
    "AutomationLibrary": docs(
        unreal.AutomationLibrary,
        ["take_high_res_screenshot"],
    ),
    "AutomationEditorTask": sorted(name for name in dir(unreal.AutomationEditorTask) if not name.startswith("_")),
    "TextureRenderTarget2D": sorted(
        name for name in dir(unreal.TextureRenderTarget2D) if any(token in name.lower() for token in ("init", "resize", "update", "format", "size"))
    ),
    "SceneCapture2D": sorted(name for name in dir(unreal.SceneCapture2D) if "capture" in name.lower() or "component" in name.lower()),
    "CameraActor": sorted(name for name in dir(unreal.CameraActor) if "camera" in name.lower() or "component" in name.lower()),
    "CameraComponent": sorted(
        name for name in dir(unreal.CameraComponent) if any(token in name.lower() for token in ("projection", "ortho", "aspect", "post_process"))
    ),
    "SystemLibrary": docs(
        unreal.SystemLibrary,
        ["execute_console_command"],
    ),
    "enums": {
        "SceneCaptureSource": [name for name in dir(unreal.SceneCaptureSource) if name.isupper()],
        "TextureRenderTargetFormat": [name for name in dir(unreal.TextureRenderTargetFormat) if name.isupper()],
        "CameraProjectionMode": [name for name in dir(unreal.CameraProjectionMode) if name.isupper()],
        "AnimationMode": [name for name in dir(unreal.AnimationMode) if name.isupper()],
    },
}

REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
unreal.log("RENDER_API_PROBE_OK")
