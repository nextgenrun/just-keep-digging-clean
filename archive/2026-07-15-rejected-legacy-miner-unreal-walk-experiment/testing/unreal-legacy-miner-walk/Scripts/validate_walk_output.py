"""Validate the walk-only Unreal-to-2D review deliverables."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


PROJECT_DIR = Path(__file__).resolve().parents[1]
REPO_DIR = PROJECT_DIR.parents[1]
RAW_DIR = PROJECT_DIR / "Renders" / "walk-frames"
PORT_DIR = PROJECT_DIR / "Renders" / "walk-2d-frames"
SHEET_PATH = PROJECT_DIR / "Renders" / "legacy-miner-unreal-walk-sheet.webp"
PREVIEW_PATH = PROJECT_DIR / "Renders" / "legacy-miner-unreal-walk-preview.webp"
BUILD_REPORT_PATH = PROJECT_DIR / "SourceAssets" / "unreal-walk-build-report.json"
RENDER_REPORT_PATH = PROJECT_DIR / "SourceAssets" / "unreal-walk-render-report.json"
PORT_REPORT_PATH = PROJECT_DIR / "SourceAssets" / "walk-2d-port-report.json"
VALIDATION_REPORT_PATH = PROJECT_DIR / "SourceAssets" / "walk-validation-report.json"
OUTPUT_ASSET_PATH = PROJECT_DIR / "Content" / "LegacyMinerWalk" / "Animations" / "LegacyMiner_Unreal_Unarmed_Walk.uasset"
MESH_ASSET_PATH = PROJECT_DIR / "Content" / "LegacyMinerWalk" / "Meshy" / "SK_LegacyMiner_Meshy_v2.uasset"
FBX_PATH = PROJECT_DIR / "SourceAssets" / "legacy-miner-unreal-walk-retargeted.fbx"
UPROJECT_PATH = PROJECT_DIR / "LegacyMinerWalk.uproject"
REVIEW_INDEX_PATH = REPO_DIR / "testing" / "animation-sandbox" / "legacy-miner-unreal-walk-poc" / "index.html"
REVIEW_APP_PATH = REPO_DIR / "testing" / "animation-sandbox" / "legacy-miner-unreal-walk-poc" / "app.js"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def digest(image: Image.Image) -> str:
    return hashlib.sha256(image.convert("RGBA").tobytes()).hexdigest()


def main() -> None:
    raw_paths = sorted(RAW_DIR.glob("frame-*.png"))
    port_paths = sorted(PORT_DIR.glob("frame-*.png"))
    require(len(raw_paths) == 51, f"expected 51 raw frames, found {len(raw_paths)}")
    require(len(port_paths) == 51, f"expected 51 ported frames, found {len(port_paths)}")

    raw_hashes: set[str] = set()
    port_hashes: set[str] = set()
    transparent_frames = 0
    visible_frames = 0
    for raw_path, port_path in zip(raw_paths, port_paths):
        with Image.open(raw_path) as raw:
            require(raw.size == (512, 512), f"unexpected raw size: {raw_path} {raw.size}")
            raw_hashes.add(digest(raw))
        with Image.open(port_path) as port:
            rgba = port.convert("RGBA")
            require(rgba.size == (341, 341), f"unexpected port size: {port_path} {rgba.size}")
            alpha = rgba.getchannel("A")
            minimum, maximum = alpha.getextrema()
            transparent_frames += int(minimum == 0)
            visible_frames += int(maximum == 255 and alpha.getbbox() is not None)
            port_hashes.add(digest(rgba))

    require(len(raw_hashes) >= 24, f"animation is too static: {len(raw_hashes)} unique raw frames")
    require(len(port_hashes) >= 24, f"ported animation is too static: {len(port_hashes)} unique frames")
    require(transparent_frames == 51, f"expected transparent background in every frame, found {transparent_frames}")
    require(visible_frames == 51, f"expected visible character in every frame, found {visible_frames}")

    with Image.open(SHEET_PATH) as sheet:
        require(sheet.size == (5456, 1364), f"unexpected sheet size: {sheet.size}")
        require(sheet.mode == "RGBA", f"unexpected sheet mode: {sheet.mode}")
    with Image.open(PREVIEW_PATH) as preview:
        require(preview.size == (341, 341), f"unexpected preview size: {preview.size}")
        require(getattr(preview, "n_frames", 1) == 51, f"unexpected preview frame count: {getattr(preview, 'n_frames', 1)}")

    build_report = json.loads(BUILD_REPORT_PATH.read_text(encoding="utf-8"))
    render_report = json.loads(RENDER_REPORT_PATH.read_text(encoding="utf-8"))
    port_report = json.loads(PORT_REPORT_PATH.read_text(encoding="utf-8"))
    require(build_report["source_walk"].endswith("MF_Unarmed_Walk_Fwd.MF_Unarmed_Walk_Fwd"), "wrong Unreal source walk")
    require(build_report["retarget_operation_count"] == 5, "native IK retargeter does not have the expected five operations")
    require(build_report["retargeted_in_unreal"] is True, "build report does not confirm Unreal retargeting")
    require(build_report["animation_authored_in_blender"] is False, "animation must not be authored in Blender")
    require(render_report["camera_angle_degrees"] == 120, "wrong review camera angle")
    require(render_report["output_frame_count"] == 51, "wrong Blender output frame count")
    require(port_report["frame_count"] == 51 and port_report["playback_fps"] == 14, "wrong 2D playback contract")

    require(OUTPUT_ASSET_PATH.stat().st_size > 100_000, "retargeted Unreal animation asset is missing or too small")
    require(FBX_PATH.stat().st_size > 1_000_000, "Unreal-exported animated FBX is missing or too small")
    mesh_package = MESH_ASSET_PATH.read_bytes()
    require(b"M_LegacyMiner_Unreal" in mesh_package, "skeletal mesh is not assigned to the full-color Unreal material")
    require(b"M_LegacyMiner_Channel_" not in mesh_package, "skeletal mesh still references a diagnostic channel material")
    uproject = json.loads(UPROJECT_PATH.read_text(encoding="utf-8"))
    enabled_plugins = {entry["Name"] for entry in uproject.get("Plugins", []) if entry.get("Enabled")}
    require({"AnimationLocomotionLibrary", "IKRig"}.issubset(enabled_plugins), "required Unreal animation plugins are not enabled")

    review_text = REVIEW_INDEX_PATH.read_text(encoding="utf-8") + REVIEW_APP_PATH.read_text(encoding="utf-8")
    require("LegacyMiner_Unreal_Unarmed_Walk" in review_text, "review page names the wrong walk")
    require("120° right-facing" in review_text, "review page names the wrong angle")

    report = {
        "scope": "walk-only",
        "status": "pass",
        "raw_frame_count": len(raw_paths),
        "ported_frame_count": len(port_paths),
        "unique_raw_frames": len(raw_hashes),
        "unique_ported_frames": len(port_hashes),
        "transparent_frames": transparent_frames,
        "visible_frames": visible_frames,
        "sheet_size": [5456, 1364],
        "preview_frames": 51,
        "playback_fps": 14,
        "camera_angle_degrees": 120,
        "source_walk": build_report["source_walk"],
        "retargeter": build_report["retargeter"],
        "retarget_operation_count": build_report["retarget_operation_count"],
        "unreal_output": build_report["output_walk"],
        "animation_authored_in_blender": False,
        "unreal_material": "/Game/LegacyMinerWalk/Meshy/M_LegacyMiner_Unreal",
        "enabled_animation_plugins": sorted(enabled_plugins & {"AnimationLocomotionLibrary", "IKRig"}),
    }
    VALIDATION_REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"WALK_VALIDATION_OK unique={len(port_hashes)} preview_frames=51 angle=120")


if __name__ == "__main__":
    main()
