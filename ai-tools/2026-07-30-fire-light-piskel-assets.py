"""Build one immutable-source/editable-work Fire Light Piskel asset chain."""

from __future__ import annotations

import importlib.util
import shutil
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CORE = load_module(
    ROOT / "ai-tools/2026-07-30-fire-light-piskel-core.py",
    "fire_light_piskel_core_assets",
)
PACKAGE = load_module(
    ROOT / "ai-tools/2026-07-30-fire-light-piskel-package.py",
    "fire_light_piskel_package_assets",
)


def source_alignment(
    frames: list[Image.Image],
    policy: dict[str, Any],
    config: dict[str, Any],
    columns: int,
) -> tuple[list[Image.Image], dict[str, Any]]:
    polished, report = CORE.polish_frames(
        frames,
        policy,
        config["sheet"],
        config["limits"],
        columns,
    )
    CORE.validate_polish_report(report, config["limits"])
    return polished, report


def verify_runtime_frames(
    path: Path,
    expected_frames: list[Image.Image],
    sheet: dict[str, int],
) -> None:
    frames = CORE.split_atlas(
        Image.open(path).convert("RGBA"),
        sheet["frameWidth"],
        sheet["frameHeight"],
        sheet["columns"],
        sheet["framesPerAtlas"],
    )
    if [CORE.pixel_sha256(frame) for frame in frames] != [
        CORE.pixel_sha256(frame) for frame in expected_frames
    ]:
        raise AssertionError(f"Runtime rollback pixels differ: {PACKAGE.relative(path)}")


def build_asset(
    asset: dict[str, Any],
    config: dict[str, Any],
    runtime_manifest: dict[str, Any],
    roots: dict[str, Path],
    reanchor: bool,
) -> tuple[list[Image.Image], list[Image.Image], dict[str, Any]]:
    sheet = runtime_manifest["sheet"]
    runtime_entry = next(
        entry for entry in runtime_manifest["assets"] if entry["file"] == asset["file"]
    )
    original_sha = runtime_entry.get("originalSha256", runtime_entry["sha256"])
    runtime_path = roots["runtime"] / asset["file"]
    source_path = roots["registered"] / f"{asset['id']}.piskel"
    polished_path = roots["polished"] / f"{asset['id']}.piskel"
    rollback_project = roots["rollbackProjects"] / f"{asset['id']}.piskel"
    rollback_runtime = roots["rollbackRuntime"] / asset["file"]

    if source_path.is_file():
        source_frames, source_document = PACKAGE.read_project(
            source_path,
            expected_size=(sheet["frameWidth"], sheet["frameHeight"]),
            expected_frames=sheet["framesPerAtlas"],
            expected_fps=asset["fps"],
        )
        if source_document["jkdPolish"]["sourceRuntimeSha256"] != original_sha:
            raise AssertionError(f"Registered source hash drift: {asset['id']}")
    else:
        if CORE.file_sha256(runtime_path) != original_sha:
            raise AssertionError(f"Initial runtime hash drift: {asset['id']}")
        source_frames = CORE.split_atlas(
            Image.open(runtime_path).convert("RGBA"),
            sheet["frameWidth"],
            sheet["frameHeight"],
            sheet["columns"],
            sheet["framesPerAtlas"],
        )
        _candidate, alignment = source_alignment(
            source_frames,
            asset,
            config,
            sheet["columns"],
        )
        source_document = PACKAGE.make_document(
            source_frames,
            document_id=f"fire-light-{asset['id']}-registered-source",
            display_name=f"{asset['displayName']} registered source",
            fps=asset["fps"],
            columns=sheet["columns"],
            description="Immutable ImageGen runtime pixels. Duplicate before editing.",
            stage="registered-source",
            source_metadata={
                "immutable": True,
                "sourceRuntimePath": PACKAGE.relative(runtime_path),
                "sourceRuntimeSha256": original_sha,
            },
            alignment=alignment,
        )
        PACKAGE.write_project(source_path, source_document, source_frames, overwrite=False)

    rollback_runtime.parent.mkdir(parents=True, exist_ok=True)
    if not rollback_runtime.is_file():
        if CORE.file_sha256(runtime_path) == original_sha:
            shutil.copy2(runtime_path, rollback_runtime)
        else:
            PACKAGE.atomic_save_png(
                rollback_runtime,
                CORE.pack_atlas(source_frames, sheet["columns"], sheet["rows"]),
            )
    if CORE.file_sha256(rollback_runtime) != original_sha:
        raise AssertionError(f"Byte-exact runtime rollback drift: {asset['id']}")
    verify_runtime_frames(rollback_runtime, source_frames, sheet)
    rollback_project.parent.mkdir(parents=True, exist_ok=True)
    if not rollback_project.is_file():
        shutil.copy2(source_path, rollback_project)
    if CORE.file_sha256(rollback_project) != CORE.file_sha256(source_path):
        raise AssertionError(f"Piskel rollback project drift: {asset['id']}")

    if polished_path.is_file() and not reanchor:
        polished_frames, polished_document = PACKAGE.read_project(
            polished_path,
            expected_size=(sheet["frameWidth"], sheet["frameHeight"]),
            expected_frames=sheet["framesPerAtlas"],
            expected_fps=asset["fps"],
        )
        alignment = polished_document["jkdAlignment"]
        if polished_document["jkdPolish"]["sourceProjectSha256"] != CORE.file_sha256(source_path):
            raise AssertionError(f"Polished source link drift: {asset['id']}")
    else:
        polished_frames, alignment = source_alignment(
            source_frames,
            asset,
            config,
            sheet["columns"],
        )
        polished_document = PACKAGE.make_document(
            polished_frames,
            document_id=f"fire-light-{asset['id']}-polished-work",
            display_name=f"{asset['displayName']} polished work",
            fps=asset["fps"],
            columns=sheet["columns"],
            description="Editable fixed-anchor Fire Light authority used by runtime export.",
            stage="polished-work",
            source_metadata={
                "editable": True,
                "sourceProject": PACKAGE.relative(source_path),
                "sourceProjectSha256": CORE.file_sha256(source_path),
                "rollbackProject": PACKAGE.relative(rollback_project),
            },
            alignment=alignment,
        )
        PACKAGE.write_project(polished_path, polished_document, polished_frames, overwrite=True)
    CORE.validate_polish_report(alignment, config["limits"])

    candidate_path = roots["candidate"] / asset["file"]
    PACKAGE.atomic_save_png(
        candidate_path,
        CORE.pack_atlas(polished_frames, sheet["columns"], sheet["rows"]),
    )
    strip_path = roots["strips"] / asset["file"]
    PACKAGE.atomic_save_png(
        strip_path,
        CORE.pack_atlas(polished_frames, sheet["framesPerAtlas"], 1),
    )
    maximum_loss = max(entry["energyLossRatio"] for entry in alignment["frames"])
    before_range = max(
        max(group["rangeXPx"], group["rangeYPx"])
        for group in alignment["beforeGroups"]
    )
    after_range = max(
        max(group["rangeXPx"], group["rangeYPx"])
        for group in alignment["afterGroups"]
    )
    return source_frames, polished_frames, {
        "id": asset["id"],
        "file": asset["file"],
        "anchorMode": asset["anchorMode"],
        "grouping": asset["grouping"],
        "registeredSourceProject": PACKAGE.relative(source_path),
        "registeredSourceSha256": CORE.file_sha256(source_path),
        "polishedWorkProject": PACKAGE.relative(polished_path),
        "polishedWorkSha256": CORE.file_sha256(polished_path),
        "rollbackProject": PACKAGE.relative(rollback_project),
        "rollbackRuntime": PACKAGE.relative(rollback_runtime),
        "rollbackRuntimeSha256": CORE.file_sha256(rollback_runtime),
        "candidateRuntime": PACKAGE.relative(candidate_path),
        "candidateRuntimeSha256": CORE.file_sha256(candidate_path),
        "strip": PACKAGE.relative(strip_path),
        "maximumEnergyLossRatio": maximum_loss,
        "maximumBeforeAnchorRangePx": round(before_range, 4),
        "maximumAfterAnchorRangePx": round(after_range, 4),
        "alignment": alignment,
    }
