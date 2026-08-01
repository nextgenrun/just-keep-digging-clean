#!/usr/bin/env python3
"""Validate v2 source integrity and render deterministic v1/v2 comparisons."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from high_impact_v2_qa_support import validate_manifest_sources


ROOT = Path(__file__).resolve().parents[1]
V1_ROOT = ROOT / "visual-approval-previews" / "2026-07-29-high-impact-review-library-v1"
V2_ROOT = ROOT / "visual-approval-previews" / "2026-07-29-high-impact-review-library-v2"
VISIBLE_ALPHA = 12
THUMB_SIZE = (150, 120)
LABEL_HEIGHT = 20
HEADER_HEIGHT = 42
COMPARE_MASTERS = (
    "m03", "m04", "m05", "m06", "m07", "m09", "m12", "m14", "m17",
    "m20", "m24", "m28", "m31", "m32", "m36", "m37", "m38", "m39", "m40", "m41",
)
RUNTIME_CANDIDATES = {
    "a0048-thunder-ground-slam-flare",
    "a0049-thunder-chain-echo-ring",
    "a0050-thunder-lingering-crackles",
}


def load_manifest(root: Path) -> dict[str, Any]:
    return json.loads((root / "manifest.json").read_text(encoding="utf-8"))


def checkerboard(size: tuple[int, int], cell: int = 10) -> Image.Image:
    image = Image.new("RGBA", size, (38, 42, 51, 255))
    draw = ImageDraw.Draw(image)
    colors = ((38, 42, 51, 255), (55, 60, 71, 255))
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            draw.rectangle(
                (x, y, min(size[0], x + cell), min(size[1], y + cell)),
                fill=colors[(x // cell + y // cell) % 2],
            )
    return image


def fit(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    copy = image.copy()
    copy.thumbnail(size, Image.Resampling.LANCZOS)
    return copy


def font(size: int) -> ImageFont.ImageFont:
    path = Path(r"C:\Windows\Fonts\segoeui.ttf")
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def render_panel(
    root: Path,
    records: list[dict[str, Any]],
    columns: int,
    rows: int,
    title: str,
) -> Image.Image:
    cell_width, cell_height = THUMB_SIZE[0], THUMB_SIZE[1] + LABEL_HEIGHT
    panel = Image.new(
        "RGBA",
        (columns * cell_width, HEADER_HEIGHT + rows * cell_height),
        (17, 20, 27, 255),
    )
    draw = ImageDraw.Draw(panel)
    draw.text((12, 10), title, fill=(238, 242, 250, 255), font=font(18))
    for index, record in enumerate(records):
        row, column = divmod(index, columns)
        x, y = column * cell_width, HEADER_HEIGHT + row * cell_height
        tile = checkerboard(THUMB_SIZE)
        with Image.open(root / record["path"]) as loaded:
            thumb = fit(loaded.convert("RGBA"), (THUMB_SIZE[0] - 8, THUMB_SIZE[1] - 8))
        tile.alpha_composite(
            thumb,
            ((tile.width - thumb.width) // 2, (tile.height - thumb.height) // 2),
        )
        panel.alpha_composite(tile, (x, y))
        draw.rectangle(
            (x, y, x + cell_width - 1, y + cell_height - 1),
            outline=(78, 88, 108, 255),
        )
        draw.text(
            (x + 4, y + THUMB_SIZE[1] + 2),
            record["id"][:22],
            fill=(168, 199, 218, 255),
            font=font(9),
        )
    return panel


def edge_run(alpha: np.ndarray) -> int:
    edges = (alpha[0], alpha[-1], alpha[:, 0], alpha[:, -1])
    longest = 0
    for edge in edges:
        current = 0
        for visible in edge > VISIBLE_ALPHA:
            current = current + 1 if visible else 0
            longest = max(longest, current)
    return longest


def validate_source(root: Path, record: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    path = root / record["path"]
    if not path.exists():
        return [f"missing:{record['id']}"]
    with Image.open(path) as loaded:
        image = loaded.convert("RGBA")
    if image.size != (320, 256):
        errors.append(f"dimensions:{record['id']}:{image.size}")
    alpha = np.asarray(image.getchannel("A"), dtype=np.uint8)
    if int(np.count_nonzero(alpha > 3)) < 16:
        errors.append(f"empty:{record['id']}")
    if edge_run(alpha) >= 20:
        errors.append(f"straight-edge-run:{record['id']}")
    if hashlib.sha256(path.read_bytes()).hexdigest() != record["sha256"]:
        errors.append(f"hash-drift:{record['id']}")
    return errors


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--render-comparisons", action="store_true")
    arguments = parser.parse_args()
    v1, v2 = load_manifest(V1_ROOT), load_manifest(V2_ROOT)
    integrity = validate_manifest_sources(V2_ROOT, v2)
    v1_by_id = {record["id"]: record for record in v1["sources"]}
    v2_by_id = {record["id"]: record for record in v2["sources"]}
    errors: list[str] = list(integrity["errors"])
    for record in v2["sources"]:
        errors.extend(validate_source(V2_ROOT, record))
    if len(v2_by_id) != 1000:
        errors.append(f"source-count:{len(v2_by_id)}")
    candidate_errors = [
        warning
        for source_id in RUNTIME_CANDIDATES
        for warning in v2_by_id[source_id]["qa"]["warnings"]
    ]
    changed = [
        source_id
        for source_id, record in v2_by_id.items()
        if record["rgbaSha256"] != v1_by_id[source_id]["rgbaSha256"]
    ]
    changed_by_master: dict[str, int] = {}
    for source_id in changed:
        master_id = v2_by_id[source_id]["masterId"]
        changed_by_master[master_id] = changed_by_master.get(master_id, 0) + 1
    outputs: list[str] = []
    if arguments.render_comparisons:
        catalog = V2_ROOT / "catalog"
        catalog.mkdir(parents=True, exist_ok=True)
        master_by_id = {record["id"]: record for record in v2["sourceMasters"]}
        for master_id in COMPARE_MASTERS:
            master = master_by_id[master_id]
            old_records = [record for record in v1["sources"] if record["masterId"] == master_id]
            new_records = [record for record in v2["sources"] if record["masterId"] == master_id]
            old_panel = render_panel(
                V1_ROOT, old_records, master["grid"]["columns"], master["grid"]["rows"], "V1 equal-grid",
            )
            new_panel = render_panel(
                V2_ROOT, new_records, master["grid"]["columns"], master["grid"]["rows"], "V2 audited",
            )
            compare = Image.new(
                "RGBA",
                (old_panel.width + new_panel.width + 8, max(old_panel.height, new_panel.height)),
                (8, 10, 14, 255),
            )
            compare.alpha_composite(old_panel, (0, 0))
            compare.alpha_composite(new_panel, (old_panel.width + 8, 0))
            output = catalog / f"slice-compare-{master_id}.png"
            compare.save(output, format="PNG", compress_level=6)
            outputs.append(output.relative_to(V2_ROOT).as_posix())
    report = {
        "passed": not errors and not integrity["structuralWarnings"] and not candidate_errors,
        "sourceCount": len(v2_by_id),
        "changedSourceCount": len(changed),
        "changedByMaster": changed_by_master,
        "sequenceSourcesRebuiltWithSharedFraming": sum(
            1 for record in v2["sources"] if record["sequenceGroup"]
        ),
        "runtimeCandidateIds": sorted(RUNTIME_CANDIDATES),
        "runtimeCandidateWarnings": candidate_errors,
        "structuralWarnings": integrity["structuralWarnings"],
        "sequenceGroupCount": integrity["sequenceGroupCount"],
        "errors": errors,
        "comparisonOutputs": outputs,
    }
    output = V2_ROOT / "slicing-qa-report.json"
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    if not report["passed"]:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
