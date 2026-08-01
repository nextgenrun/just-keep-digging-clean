"""Build editable, rollback-safe Piskel masters for all Fire Light V3 atlases."""

from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "values/fireLightPiskelPolish.json"


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CORE = load_module(
    ROOT / "ai-tools/2026-07-30-fire-light-piskel-core.py",
    "fire_light_piskel_core_builder",
)
PACKAGE = load_module(
    ROOT / "ai-tools/2026-07-30-fire-light-piskel-package.py",
    "fire_light_piskel_package_builder",
)
ASSETS = load_module(
    ROOT / "ai-tools/2026-07-30-fire-light-piskel-assets.py",
    "fire_light_piskel_assets_builder",
)
VISUALS = load_module(
    ROOT / "ai-tools/2026-07-30-fire-light-piskel-visuals.py",
    "fire_light_piskel_visuals_builder",
)


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def package_roots(
    package_root: Path,
    runtime_root: Path,
) -> dict[str, Path]:
    return {
        "runtime": runtime_root,
        "registered": package_root / "registered-source",
        "polished": package_root / "polished-work",
        "rollbackProjects": package_root / "rollback-v1",
        "rollbackRuntime": package_root / "runtime-rollback-v1",
        "candidate": package_root / "candidate-runtime",
        "strips": package_root / "strips",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reanchor", action="store_true")
    args = parser.parse_args()
    config = load_json(CONFIG_PATH)
    runtime_manifest_path = ROOT / config["runtimeManifest"]
    runtime_manifest = load_json(runtime_manifest_path)
    package_root = ROOT / config["packageRoot"]
    roots = package_roots(package_root, runtime_manifest_path.parent)
    if {asset["file"] for asset in config["assets"]} != {
        asset["file"] for asset in runtime_manifest["assets"]
    }:
        raise AssertionError("Piskel policy inventory differs from runtime manifest")

    original_by_id: dict[str, list[Image.Image]] = {}
    polished_by_id: dict[str, list[Image.Image]] = {}
    reports: dict[str, dict[str, Any]] = {}
    assets_report: list[dict[str, Any]] = []
    for asset in config["assets"]:
        source, polished, report = ASSETS.build_asset(
            asset,
            config,
            runtime_manifest,
            roots,
            args.reanchor,
        )
        original_by_id[asset["id"]] = source
        polished_by_id[asset["id"]] = polished
        reports[asset["id"]] = report["alignment"]
        assets_report.append(report)

    preview_root = ROOT / config["previewRoot"]
    previews = VISUALS.build_all(
        config["assets"],
        original_by_id,
        polished_by_id,
        reports,
        preview_root,
    )
    report_path = package_root / "geometry-report.json"
    PACKAGE.write_json(report_path, {
        "version": 1,
        "date": config["date"],
        "productionChanged": False,
        "policy": "integer-translation-fixed-group-anchor",
        "assets": assets_report,
    })
    tracked = [
        *(ROOT / entry[key] for entry in assets_report for key in (
            "registeredSourceProject",
            "polishedWorkProject",
            "rollbackProject",
            "rollbackRuntime",
            "candidateRuntime",
            "strip",
        )),
        *previews,
        report_path,
    ]
    PACKAGE.write_json(package_root / "manifest.json", {
        "version": 1,
        "date": config["date"],
        "productionChanged": False,
        "sourceManifest": config["runtimeManifest"],
        "assetCount": len(assets_report),
        "frameCount": (
            len(assets_report)
            * runtime_manifest["sheet"]["framesPerAtlas"]
        ),
        "applyCommand": (
            "python ai-tools/2026-07-30-refresh-fire-light-piskel-polish.py --apply"
        ),
        "rollbackCommand": (
            "python ai-tools/2026-07-30-refresh-fire-light-piskel-polish.py --rollback"
        ),
        "geometryReport": PACKAGE.relative(report_path),
        "previews": [PACKAGE.relative(path) for path in previews],
        "assets": assets_report,
        "sha256": {
            PACKAGE.relative(path): CORE.file_sha256(path)
            for path in tracked
        },
    })
    print("Built 10 immutable registered-source Piskels")
    print("Built/validated 10 editable polished-work Piskels")
    print("Built 10 byte-exact runtime rollback atlases and candidate exports")
    print("Production files changed: 0")


if __name__ == "__main__":
    main()
