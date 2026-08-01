"""Promote or roll back the validated Fire Light Piskel runtime atlases."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "values/fireLightPiskelPolish.json"


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json_atomic(path: Path, data: dict[str, Any]) -> None:
    temporary = path.with_name(f".{path.name}.fire-light-piskel-write")
    try:
        temporary.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def select_source(
    package_root: Path,
    entry: dict[str, Any],
    apply: bool,
) -> tuple[Path, str]:
    relative = entry["candidateRuntime"] if apply else entry["rollbackRuntime"]
    expected = (
        entry["candidateRuntimeSha256"]
        if apply
        else entry["rollbackRuntimeSha256"]
    )
    source = ROOT / relative
    if not source.is_file() or sha256(source) != expected:
        raise AssertionError(f"Fire Light Piskel source hash drift: {relative}")
    if not str(source).startswith(str(package_root)):
        raise AssertionError(f"Fire Light Piskel source escaped package: {relative}")
    return source, expected


def main() -> None:
    parser = argparse.ArgumentParser()
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--apply", action="store_true")
    action.add_argument("--rollback", action="store_true")
    args = parser.parse_args()

    config = load_json(CONFIG_PATH)
    runtime_manifest_path = ROOT / config["runtimeManifest"]
    runtime_manifest = load_json(runtime_manifest_path)
    package_root = ROOT / config["packageRoot"]
    package_manifest_path = package_root / "manifest.json"
    package_manifest = load_json(package_manifest_path)
    if package_manifest["assetCount"] != 10 or package_manifest["frameCount"] != 160:
        raise AssertionError("Fire Light Piskel package inventory is incomplete")
    by_file = {entry["file"]: entry for entry in package_manifest["assets"]}
    runtime_root = runtime_manifest_path.parent
    selected_hashes: dict[str, str] = {}

    for runtime_entry in runtime_manifest["assets"]:
        package_entry = by_file[runtime_entry["file"]]
        source, expected = select_source(
            package_root,
            package_entry,
            args.apply,
        )
        destination = runtime_root / runtime_entry["file"]
        shutil.copy2(source, destination)
        if sha256(destination) != expected:
            raise AssertionError(f"Runtime promotion hash drift: {runtime_entry['file']}")
        selected_hashes[runtime_entry["file"]] = expected
        runtime_entry["originalSha256"] = package_entry["rollbackRuntimeSha256"]
        runtime_entry["polishedSha256"] = package_entry["candidateRuntimeSha256"]
        runtime_entry["sha256"] = expected
        runtime_entry["piskelProject"] = package_entry["polishedWorkProject"]
        runtime_entry["anchorMode"] = package_entry["anchorMode"]
        runtime_entry["grouping"] = package_entry["grouping"]

    mode = "polished" if args.apply else "original"
    runtime_manifest["revision"] = (
        "2026-07-30-imagegen-piskel-v1"
        if args.apply
        else "2026-07-30-imagegen-v2"
    )
    runtime_manifest["polishMode"] = "piskel-fixed-group-anchor-v1"
    runtime_manifest["piskelPolish"] = {
        "runtimeSelection": mode,
        "packageManifest": package_manifest_path.relative_to(ROOT).as_posix(),
        "editableProjectCount": 10,
        "registeredFrameCount": 160,
        "safeBorderPx": config["sheet"]["safeBorderPx"],
        "applyCommand": package_manifest["applyCommand"],
        "rollbackCommand": package_manifest["rollbackCommand"],
    }
    write_json_atomic(runtime_manifest_path, runtime_manifest)
    print(f"Fire Light Piskel runtime selection: {mode}")
    print(f"Updated {len(selected_hashes)} runtime atlases and manifest hashes")


if __name__ == "__main__":
    main()
