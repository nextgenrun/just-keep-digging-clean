from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads(
    (ROOT / "values/fireLightPiskelPolish.json").read_text(encoding="utf-8")
)
RUNTIME_MANIFEST_PATH = ROOT / CONFIG["runtimeManifest"]
RUNTIME_MANIFEST = json.loads(RUNTIME_MANIFEST_PATH.read_text(encoding="utf-8"))
PACKAGE_ROOT = ROOT / CONFIG["packageRoot"]
PACKAGE_MANIFEST = json.loads(
    (PACKAGE_ROOT / "manifest.json").read_text(encoding="utf-8")
)
GEOMETRY_REPORT = json.loads(
    (PACKAGE_ROOT / "geometry-report.json").read_text(encoding="utf-8")
)


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise AssertionError(f"Unable to load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CORE = load_module(
    ROOT / "ai-tools/2026-07-30-fire-light-piskel-core.py",
    "fire_light_piskel_core_contract",
)
PACKAGE = load_module(
    ROOT / "ai-tools/2026-07-30-fire-light-piskel-package.py",
    "fire_light_piskel_package_contract",
)


def atlas_frames(path: Path) -> list[Image.Image]:
    sheet = RUNTIME_MANIFEST["sheet"]
    return CORE.split_atlas(
        Image.open(path).convert("RGBA"),
        sheet["frameWidth"],
        sheet["frameHeight"],
        sheet["columns"],
        sheet["framesPerAtlas"],
    )


def frame_hashes(frames: list[Image.Image]) -> list[str]:
    return [CORE.pixel_sha256(frame) for frame in frames]


def assert_black_border(frame: Image.Image, border: int) -> None:
    pixels = np.asarray(frame.convert("RGBA"), dtype=np.uint8)
    edges = np.concatenate((
        pixels[:border].reshape(-1, 4),
        pixels[-border:].reshape(-1, 4),
        pixels[:, :border].reshape(-1, 4),
        pixels[:, -border:].reshape(-1, 4),
    ))
    assert int(edges[:, :3].max()) == 0
    assert int(edges[:, 3].min()) == 255


assert PACKAGE_MANIFEST["version"] == 1
assert PACKAGE_MANIFEST["assetCount"] == 10
assert PACKAGE_MANIFEST["frameCount"] == 160
assert PACKAGE_MANIFEST["productionChanged"] is False
assert GEOMETRY_REPORT["policy"] == "integer-translation-fixed-group-anchor"
assert len(GEOMETRY_REPORT["assets"]) == 10
assert RUNTIME_MANIFEST["revision"] == "2026-07-30-imagegen-piskel-v1"
assert RUNTIME_MANIFEST["polishMode"] == "piskel-fixed-group-anchor-v1"
assert RUNTIME_MANIFEST["piskelPolish"]["runtimeSelection"] == "polished"
assert RUNTIME_MANIFEST["piskelPolish"]["editableProjectCount"] == 10
assert RUNTIME_MANIFEST["piskelPolish"]["registeredFrameCount"] == 160
assert RUNTIME_MANIFEST["piskelPolish"]["safeBorderPx"] == 3

config_by_id = {entry["id"]: entry for entry in CONFIG["assets"]}
runtime_by_file = {entry["file"]: entry for entry in RUNTIME_MANIFEST["assets"]}
report_by_id = {entry["id"]: entry for entry in GEOMETRY_REPORT["assets"]}
manifest_by_id = {entry["id"]: entry for entry in PACKAGE_MANIFEST["assets"]}
assert set(config_by_id) == set(report_by_id) == set(manifest_by_id)

for asset_id, asset in config_by_id.items():
    report = report_by_id[asset_id]
    package_entry = manifest_by_id[asset_id]
    runtime_entry = runtime_by_file[asset["file"]]
    assert report["anchorMode"] == asset["anchorMode"]
    assert report["grouping"] == asset["grouping"]
    assert report["maximumEnergyLossRatio"] <= CONFIG["limits"]["maximumEnergyLossRatio"]
    assert report["maximumAfterAnchorRangePx"] <= CONFIG["limits"]["maximumAfterGroupRangePx"]
    assert report["registeredSourceSha256"] == package_entry["registeredSourceSha256"]
    assert report["polishedWorkSha256"] == package_entry["polishedWorkSha256"]

    source_path = ROOT / report["registeredSourceProject"]
    polished_path = ROOT / report["polishedWorkProject"]
    rollback_project_path = ROOT / report["rollbackProject"]
    rollback_runtime_path = ROOT / report["rollbackRuntime"]
    candidate_path = ROOT / report["candidateRuntime"]
    runtime_path = RUNTIME_MANIFEST_PATH.parent / asset["file"]
    strip_path = ROOT / report["strip"]
    for path in (
        source_path,
        polished_path,
        rollback_project_path,
        rollback_runtime_path,
        candidate_path,
        runtime_path,
        strip_path,
    ):
        assert path.is_file(), path

    source_frames, source_document = PACKAGE.read_project(
        source_path,
        expected_size=(313, 313),
        expected_frames=16,
        expected_fps=asset["fps"],
    )
    polished_frames, polished_document = PACKAGE.read_project(
        polished_path,
        expected_size=(313, 313),
        expected_frames=16,
        expected_fps=asset["fps"],
    )
    assert source_document["jkdPolish"]["stage"] == "registered-source"
    assert source_document["jkdPolish"]["immutable"] is True
    assert polished_document["jkdPolish"]["stage"] == "polished-work"
    assert polished_document["jkdPolish"]["editable"] is True
    assert len(source_document["piskel"]["layers"]) == 2
    assert len(polished_document["piskel"]["layers"]) == 2
    for document in (source_document, polished_document):
        guide = json.loads(document["piskel"]["layers"][1])
        assert guide["name"] == "JKD Drift And Safe-Border Guides"
        assert guide["visible"] is False
        assert guide["frameCount"] == 16

    source_hashes = frame_hashes(source_frames)
    polished_hashes = frame_hashes(polished_frames)
    assert source_hashes == frame_hashes(atlas_frames(rollback_runtime_path))
    assert polished_hashes == frame_hashes(atlas_frames(candidate_path))
    assert polished_hashes == frame_hashes(atlas_frames(runtime_path))
    assert CORE.file_sha256(source_path) == CORE.file_sha256(rollback_project_path)
    assert CORE.file_sha256(rollback_runtime_path) == report["rollbackRuntimeSha256"]
    assert CORE.file_sha256(candidate_path) == report["candidateRuntimeSha256"]
    assert CORE.file_sha256(runtime_path) == report["candidateRuntimeSha256"]
    assert runtime_entry["originalSha256"] == report["rollbackRuntimeSha256"]
    assert runtime_entry["polishedSha256"] == report["candidateRuntimeSha256"]
    assert runtime_entry["sha256"] == report["candidateRuntimeSha256"]
    assert runtime_entry["piskelProject"] == report["polishedWorkProject"]

    alignment = polished_document["jkdAlignment"]
    assert alignment["anchorMode"] == asset["anchorMode"]
    assert alignment["grouping"] == asset["grouping"]
    assert len(alignment["frames"]) == 16
    for frame_entry, frame in zip(alignment["frames"], polished_frames):
        assert max(abs(value) for value in frame_entry["shiftPx"]) <= CONFIG["limits"]["maximumShiftPx"]
        assert frame_entry["energyLossRatio"] <= CONFIG["limits"]["maximumEnergyLossRatio"]
        assert frame_entry["polishedPixelSha256"] == CORE.pixel_sha256(frame)
        assert_black_border(frame, CONFIG["sheet"]["safeBorderPx"])
    for group in alignment["afterGroups"]:
        assert group["maximumAnchorErrorPx"] <= CONFIG["limits"]["maximumAfterAnchorErrorPx"]
        assert max(group["rangeXPx"], group["rangeYPx"]) <= CONFIG["limits"]["maximumAfterGroupRangePx"]

    assert Image.open(strip_path).size == (313 * 16, 313)

for relative, expected in PACKAGE_MANIFEST["sha256"].items():
    assert CORE.file_sha256(ROOT / relative) == expected

refresh_source = (
    ROOT / "ai-tools/2026-07-30-refresh-fire-light-piskel-polish.py"
).read_text(encoding="utf-8")
assert "--apply" in refresh_source
assert "--rollback" in refresh_source
assert "runtimeSelection" in refresh_source

print(
    "Fire Light Piskel anchor contract passed: "
    "10 editable projects, 160 fixed-anchor frames, exact round-trip, "
    "byte-exact rollback, black borders, and polished runtime parity"
)
