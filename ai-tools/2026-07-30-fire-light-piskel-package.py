"""Piskel document and PNG package IO for the Fire Light polish pipeline."""

from __future__ import annotations

import importlib.util
import json
import os
import sys
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
PISKEL_TOOLS = ROOT / "tools/piskel-mcp"
sys.path.insert(0, str(PISKEL_TOOLS))
from piskel_document import image_to_data_uri, make_piskel, read_piskel  # noqa: E402


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CORE = load_module(
    ROOT / "ai-tools/2026-07-30-fire-light-piskel-core.py",
    "fire_light_piskel_core",
)


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def atomic_save_png(path: Path, image: Image.Image) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.stem}.fire-light-piskel-write.png")
    try:
        image.save(temporary, "PNG", optimize=True)
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def _guide_layer(
    width: int,
    height: int,
    frame_count: int,
    columns: int,
    grouping: str,
    targets: dict[str, list[int]],
    safe_border: int,
) -> str:
    rows = (frame_count + columns - 1) // columns
    sheet = Image.new("RGBA", (width * columns, height * rows), (0, 0, 0, 0))
    layout: list[list[int]] = []
    for row in range(rows):
        layout_row: list[int] = []
        for column in range(columns):
            index = row * columns + column
            layout_row.append(index if index < frame_count else -1)
            if index >= frame_count:
                continue
            guide = Image.new("RGBA", (width, height), (0, 0, 0, 0))
            draw = ImageDraw.Draw(guide)
            draw.rectangle(
                (
                    safe_border,
                    safe_border,
                    width - safe_border - 1,
                    height - safe_border - 1,
                ),
                outline=(78, 222, 161, 210),
                width=1,
            )
            group = CORE.group_name(index, grouping, columns)
            anchor_x, anchor_y = targets[group]
            draw.line(
                (anchor_x, anchor_y - 12, anchor_x, anchor_y + 12),
                fill=(255, 65, 142, 235),
                width=1,
            )
            draw.line(
                (anchor_x - 12, anchor_y, anchor_x + 12, anchor_y),
                fill=(255, 65, 142, 235),
                width=1,
            )
            sheet.alpha_composite(guide, (column * width, row * height))
        layout.append(layout_row)
    layer = {
        "name": "JKD Drift And Safe-Border Guides",
        "opacity": 1,
        "visible": False,
        "frameCount": frame_count,
        "chunks": [{"layout": layout, "base64PNG": image_to_data_uri(sheet)}],
    }
    return json.dumps(layer, separators=(",", ":"))


def make_document(
    frames: list[Image.Image],
    *,
    document_id: str,
    display_name: str,
    fps: int,
    columns: int,
    description: str,
    stage: str,
    source_metadata: dict[str, Any],
    alignment: dict[str, Any],
) -> dict[str, Any]:
    width, height = frames[0].size
    entry = {
        "id": document_id,
        "displayName": display_name,
        "frameSize": [width, height],
        "frameCount": len(frames),
        "sheetColumns": columns,
        "fps": fps,
    }
    document = make_piskel(entry, frames)
    document["piskel"]["description"] = description
    pixel_layer = json.loads(document["piskel"]["layers"][0])
    pixel_layer["name"] = "Polished Current Pixels" if stage == "polished-work" else "Registered Source Pixels"
    document["piskel"]["layers"][0] = json.dumps(pixel_layer, separators=(",", ":"))
    document["piskel"]["layers"].append(_guide_layer(
        width,
        height,
        len(frames),
        columns,
        alignment["grouping"],
        alignment["groupTargetsPx"],
        alignment["safeBorderPx"],
    ))
    document["jkdPolish"] = {
        "version": 1,
        "stage": stage,
        **source_metadata,
        "pixelSha256": [CORE.pixel_sha256(frame) for frame in frames],
    }
    document["jkdAlignment"] = alignment
    return document


def write_project(
    path: Path,
    document: dict[str, Any],
    expected_frames: list[Image.Image],
    *,
    overwrite: bool,
) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    if overwrite or not path.is_file():
        path.write_text(json.dumps(document, separators=(",", ":")) + "\n", encoding="utf-8")
    frames, width, height, fps = read_piskel(path)
    expected_size = expected_frames[0].size
    expected_fps = int(document["piskel"]["fps"])
    if (len(frames), width, height, fps) != (
        len(expected_frames),
        expected_size[0],
        expected_size[1],
        expected_fps,
    ):
        raise AssertionError(f"Piskel shape/order mismatch: {relative(path)}")
    expected_hashes = [CORE.pixel_sha256(frame) for frame in expected_frames]
    actual_hashes = [CORE.pixel_sha256(frame) for frame in frames]
    if expected_hashes != actual_hashes:
        raise AssertionError(f"Piskel pixel round-trip mismatch: {relative(path)}")
    return path


def read_project(
    path: Path,
    *,
    expected_size: tuple[int, int],
    expected_frames: int,
    expected_fps: int,
) -> tuple[list[Image.Image], dict[str, Any]]:
    frames, width, height, fps = read_piskel(path)
    if (len(frames), width, height, fps) != (
        expected_frames,
        expected_size[0],
        expected_size[1],
        expected_fps,
    ):
        raise AssertionError(f"Editable Piskel shape/order mismatch: {relative(path)}")
    return frames, json.loads(path.read_text(encoding="utf-8"))
