"""Build the review-only old-school lamp ImageGen/Piskel asset family."""

from __future__ import annotations

import importlib.util
import json
import shutil
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "values/oldSchoolLampLightReview.json"


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CORE = load_module(
    ROOT / "ai-tools/2026-07-30-fire-light-piskel-core.py",
    "old_school_lamp_build_core",
)
PACKAGE = load_module(
    ROOT / "ai-tools/2026-07-30-fire-light-piskel-package.py",
    "old_school_lamp_build_package",
)
ANCHOR = load_module(
    ROOT / "ai-tools/2026-07-30-old-school-lamp-anchor.py",
    "old_school_lamp_build_anchor",
)
VISUALS = load_module(
    ROOT / "ai-tools/2026-07-30-old-school-lamp-visuals.py",
    "old_school_lamp_build_visuals",
)


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def source_atlas(path: Path, atlas: dict[str, int]) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    expected = (atlas["sourceWidth"], atlas["sourceHeight"])
    if image.size != expected:
        raise AssertionError(f"{relative(path)} must be {expected}, got {image.size}")
    inset = int(atlas["cropInsetPx"])
    normalized = image.crop((
        inset,
        inset,
        image.width - inset,
        image.height - inset,
    ))
    if normalized.size != (atlas["width"], atlas["height"]):
        raise AssertionError(f"Normalized atlas mismatch: {relative(path)}")
    return normalized


def maximum_group_range(groups: list[dict[str, Any]]) -> float:
    return max(max(group["rangeXPx"], group["rangeYPx"]) for group in groups)


def build_asset(
    asset: dict[str, Any],
    config: dict[str, Any],
    roots: dict[str, Path],
) -> tuple[dict[str, Any], list[Image.Image]]:
    atlas = config["atlas"]
    master_path = roots["source"] / asset["master"]
    normalized = source_atlas(master_path, atlas)
    frames = CORE.split_atlas(
        normalized,
        atlas["frameWidth"],
        atlas["frameHeight"],
        atlas["columns"],
        atlas["framesPerAtlas"],
    )
    polished, alignment = ANCHOR.polish_frames(
        frames,
        asset,
        config["sheet"],
        config["limits"],
        atlas["columns"],
    )
    CORE.validate_polish_report(alignment, config["limits"])

    source_project = roots["registered"] / f"{asset['id']}.piskel"
    polished_project = roots["polished"] / f"{asset['id']}.piskel"
    rollback_project = roots["rollback"] / f"{asset['id']}.piskel"
    source_document = PACKAGE.make_document(
        frames,
        document_id=f"old-school-lamp-{asset['id']}-registered-source",
        display_name=f"{asset['displayName']} registered source",
        fps=asset["fps"],
        columns=atlas["columns"],
        description="Immutable normalized built-in ImageGen pixels.",
        stage="registered-source",
        source_metadata={
            "immutable": True,
            "sourceMaster": relative(master_path),
            "sourceMasterSha256": CORE.file_sha256(master_path),
        },
        alignment=alignment,
    )
    PACKAGE.write_project(source_project, source_document, frames, overwrite=False)
    rollback_project.parent.mkdir(parents=True, exist_ok=True)
    if not rollback_project.is_file():
        shutil.copy2(source_project, rollback_project)
    if CORE.file_sha256(rollback_project) != CORE.file_sha256(source_project):
        raise AssertionError(f"Source rollback drift: {asset['id']}")

    polished_document = PACKAGE.make_document(
        polished,
        document_id=f"old-school-lamp-{asset['id']}-polished-work",
        display_name=f"{asset['displayName']} polished work",
        fps=asset["fps"],
        columns=atlas["columns"],
        description="Editable fixed-anchor old-school lamp review authority.",
        stage="polished-work",
        source_metadata={
            "editable": True,
            "reviewOnly": True,
            "sourceProject": relative(source_project),
            "sourceProjectSha256": CORE.file_sha256(source_project),
            "rollbackProject": relative(rollback_project),
        },
        alignment=alignment,
    )
    PACKAGE.write_project(polished_project, polished_document, polished, overwrite=True)

    original_runtime = roots["original"] / asset["file"]
    runtime_path = roots["runtime"] / asset["file"]
    strip_path = roots["strips"] / asset["file"]
    PACKAGE.atomic_save_png(original_runtime, normalized)
    PACKAGE.atomic_save_png(
        runtime_path,
        CORE.pack_atlas(polished, atlas["columns"], atlas["rows"]),
    )
    PACKAGE.atomic_save_png(
        strip_path,
        CORE.pack_atlas(polished, atlas["framesPerAtlas"], 1),
    )
    maximum_loss = max(frame["energyLossRatio"] for frame in alignment["frames"])
    return {
        "id": asset["id"],
        "displayName": asset["displayName"],
        "file": asset["file"],
        "fps": asset["fps"],
        "anchorMode": asset["anchorMode"],
        "grouping": asset["grouping"],
        "sourceMaster": relative(master_path),
        "sourceMasterSha256": CORE.file_sha256(master_path),
        "registeredSourceProject": relative(source_project),
        "registeredSourceSha256": CORE.file_sha256(source_project),
        "polishedWorkProject": relative(polished_project),
        "polishedWorkSha256": CORE.file_sha256(polished_project),
        "rollbackProject": relative(rollback_project),
        "runtimeOriginal": relative(original_runtime),
        "runtimeOriginalSha256": CORE.file_sha256(original_runtime),
        "runtime": relative(runtime_path),
        "sha256": CORE.file_sha256(runtime_path),
        "maximumBeforeAnchorRangePx": round(maximum_group_range(alignment["beforeGroups"]), 4),
        "maximumAfterAnchorRangePx": round(maximum_group_range(alignment["afterGroups"]), 4),
        "maximumEnergyLossRatio": round(maximum_loss, 8),
        "alignment": alignment,
    }, polished


def main() -> None:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    roots = {
        "source": ROOT / config["sourceRoot"],
        "runtime": ROOT / config["runtimeRoot"],
        "piskel": ROOT / config["piskelRoot"],
        "preview": ROOT / config["previewRoot"],
    }
    roots.update({
        "registered": roots["piskel"] / "registered-source",
        "polished": roots["piskel"] / "polished-work",
        "rollback": roots["piskel"] / "rollback-v1",
        "original": roots["piskel"] / "runtime-original-v1",
        "strips": roots["piskel"] / "strips",
    })
    built = []
    visual_rows = []
    for asset in config["assets"]:
        entry, frames = build_asset(asset, config, roots)
        built.append(entry)
        visual_rows.append({**asset, "frames": frames})

    manifest = {
        "id": config["id"],
        "revision": "2026-07-30-imagegen-piskel-v1",
        "generationMode": config["generationMode"],
        "reviewOnly": True,
        "selectionQuery": "?carriedLightStyle=lamp-review",
        "defaultUnchanged": "fire-light-v3",
        "sheet": config["atlas"],
        "safeBorderPx": config["sheet"]["safeBorderPx"],
        "assetCount": len(built),
        "authoredComponentCount": len(built) * config["atlas"]["framesPerAtlas"],
        "authoredLightFrameCount": (len(built) - 1) * config["atlas"]["framesPerAtlas"],
        "assets": built,
    }
    PACKAGE.write_json(roots["runtime"] / "manifest.json", manifest)
    PACKAGE.write_json(roots["piskel"] / "manifest.json", manifest)
    VISUALS.build_asset_library(
        roots["preview"] / "02-lamp-asset-library.png",
        visual_rows,
    )
    VISUALS.build_drift_summary(
        roots["preview"] / "03-lamp-anchor-drift.png",
        [{
            "displayName": entry["displayName"],
            "beforeRange": entry["maximumBeforeAnchorRangePx"],
            "afterRange": entry["maximumAfterAnchorRangePx"],
        } for entry in built],
    )
    print(f"Built {len(built)} lamp atlases and editable Piskel projects")
    print(f"Authored components: {manifest['authoredComponentCount']}")
    print(f"Review query: {manifest['selectionQuery']}")


if __name__ == "__main__":
    main()
