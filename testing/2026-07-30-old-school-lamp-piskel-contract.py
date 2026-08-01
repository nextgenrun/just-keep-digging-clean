"""Validate old-school lamp ImageGen, Piskel, runtime, and rollback parity."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads(
    (ROOT / "values/oldSchoolLampLightReview.json").read_text(encoding="utf-8")
)
MANIFEST = json.loads(
    (
        ROOT / "sprites/environment/old-school-lamp-light-v1/manifest.json"
    ).read_text(encoding="utf-8")
)


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CORE = load_module(
    ROOT / "ai-tools/2026-07-30-fire-light-piskel-core.py",
    "old_school_lamp_contract_core",
)
PACKAGE = load_module(
    ROOT / "ai-tools/2026-07-30-fire-light-piskel-package.py",
    "old_school_lamp_contract_package",
)


def assert_black_border(frame: Image.Image, border: int) -> None:
    rgb = np.asarray(frame.convert("RGB"))
    edges = np.concatenate([
        rgb[:border].reshape(-1, 3),
        rgb[-border:].reshape(-1, 3),
        rgb[:, :border].reshape(-1, 3),
        rgb[:, -border:].reshape(-1, 3),
    ])
    if np.any(edges):
        raise AssertionError("Runtime frame safety border is not true black")


def main() -> None:
    atlas = CONFIG["atlas"]
    limits = CONFIG["limits"]
    piskel_root = ROOT / CONFIG["piskelRoot"]
    runtime_root = ROOT / CONFIG["runtimeRoot"]
    assert MANIFEST["reviewOnly"] is True
    assert MANIFEST["defaultUnchanged"] == "fire-light-v3"
    assert MANIFEST["selectionQuery"] == "?carriedLightStyle=lamp-review"
    assert MANIFEST["assetCount"] == 7
    assert MANIFEST["authoredComponentCount"] == 112
    assert MANIFEST["authoredLightFrameCount"] == 96
    prompts = json.loads(
        (runtime_root / "source-masters/prompts.json").read_text(encoding="utf-8")
    )
    assert len(prompts["prompts"]) == 7
    assert len(list(piskel_root.rglob("*.piskel"))) == 21

    for policy in CONFIG["assets"]:
        entry = next(
            asset for asset in MANIFEST["assets"] if asset["id"] == policy["id"]
        )
        master = ROOT / entry["sourceMaster"]
        source_project = ROOT / entry["registeredSourceProject"]
        polished_project = ROOT / entry["polishedWorkProject"]
        rollback_project = ROOT / entry["rollbackProject"]
        runtime_original = ROOT / entry["runtimeOriginal"]
        runtime = ROOT / entry["runtime"]
        assert CORE.file_sha256(master) == entry["sourceMasterSha256"]
        assert CORE.file_sha256(source_project) == entry["registeredSourceSha256"]
        assert CORE.file_sha256(polished_project) == entry["polishedWorkSha256"]
        assert source_project.read_bytes() == rollback_project.read_bytes()
        assert CORE.file_sha256(runtime_original) == entry["runtimeOriginalSha256"]
        assert CORE.file_sha256(runtime) == entry["sha256"]

        source_frames, source_document = PACKAGE.read_project(
            source_project,
            expected_size=(atlas["frameWidth"], atlas["frameHeight"]),
            expected_frames=atlas["framesPerAtlas"],
            expected_fps=policy["fps"],
        )
        polished_frames, polished_document = PACKAGE.read_project(
            polished_project,
            expected_size=(atlas["frameWidth"], atlas["frameHeight"]),
            expected_frames=atlas["framesPerAtlas"],
            expected_fps=policy["fps"],
        )
        assert source_document["jkdPolish"]["stage"] == "registered-source"
        assert polished_document["jkdPolish"]["stage"] == "polished-work"
        assert len(polished_document["piskel"]["layers"]) == 2
        runtime_frames = CORE.split_atlas(
            Image.open(runtime).convert("RGBA"),
            atlas["frameWidth"],
            atlas["frameHeight"],
            atlas["columns"],
            atlas["framesPerAtlas"],
        )
        original_frames = CORE.split_atlas(
            Image.open(runtime_original).convert("RGBA"),
            atlas["frameWidth"],
            atlas["frameHeight"],
            atlas["columns"],
            atlas["framesPerAtlas"],
        )
        assert [CORE.pixel_sha256(frame) for frame in source_frames] == [
            CORE.pixel_sha256(frame) for frame in original_frames
        ]
        assert [CORE.pixel_sha256(frame) for frame in polished_frames] == [
            CORE.pixel_sha256(frame) for frame in runtime_frames
        ]
        for frame in runtime_frames:
            assert_black_border(frame, CONFIG["sheet"]["safeBorderPx"])
        assert entry["maximumAfterAnchorRangePx"] <= limits[
            "maximumAfterGroupRangePx"
        ]
        assert entry["maximumEnergyLossRatio"] <= limits[
            "maximumEnergyLossRatio"
        ]
        for frame in entry["alignment"]["frames"]:
            assert max(abs(value) for value in frame["shiftPx"]) <= limits[
                "maximumShiftPx"
            ]

    print(
        "old-school lamp Piskel passed: 7 editable authorities, 112 frames, "
        "exact round-trip/runtime parity, black borders, and source rollback"
    )


if __name__ == "__main__":
    main()
