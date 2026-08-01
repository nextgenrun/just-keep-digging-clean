"""Piskel document IO for the three-stage ground-damage review package."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
PISKEL_TOOLS = ROOT / "tools/piskel-mcp"
sys.path.insert(0, str(PISKEL_TOOLS))
from piskel_document import image_to_data_uri, make_piskel, read_piskel  # noqa: E402


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pixel_sha256(image: Image.Image) -> str:
    return hashlib.sha256(image.convert("RGBA").tobytes()).hexdigest()


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def _guide_layer(
    width: int,
    height: int,
    frame_count: int,
    seed: tuple[int, int],
    safe_box: tuple[int, int, int, int],
) -> str:
    sheet = Image.new("RGBA", (width * frame_count, height), (0, 0, 0, 0))
    for frame_index in range(frame_count):
        guide = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(guide)
        draw.rectangle(safe_box, outline=(76, 213, 156, 210), width=1)
        sx, sy = seed
        draw.line((sx, sy - 10, sx, sy + 10), fill=(255, 68, 139, 230), width=1)
        draw.line((sx - 10, sy, sx + 10, sy), fill=(255, 68, 139, 230), width=1)
        sheet.alpha_composite(guide, (frame_index * width, 0))
    layer = {
        "name": "JKD Alignment Guides",
        "opacity": 1,
        "visible": False,
        "frameCount": frame_count,
        "chunks": [{
            "layout": [list(range(frame_count))],
            "base64PNG": image_to_data_uri(sheet),
        }],
    }
    return json.dumps(layer, separators=(",", ":"))


def make_document(
    frames: list[Image.Image],
    *,
    document_id: str,
    display_name: str,
    fps: int,
    description: str,
    layer_name: str,
    polish_metadata: dict[str, Any],
    seed: tuple[int, int],
    safe_box: tuple[int, int, int, int],
    alignment_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    width, height = frames[0].size
    entry = {
        "id": document_id,
        "displayName": display_name,
        "frameSize": [width, height],
        "frameCount": len(frames),
        "sheetColumns": len(frames),
        "fps": fps,
    }
    document = make_piskel(entry, frames)
    document["piskel"]["description"] = description
    pixel_layer = json.loads(document["piskel"]["layers"][0])
    pixel_layer["name"] = layer_name
    document["piskel"]["layers"][0] = json.dumps(pixel_layer, separators=(",", ":"))
    document["piskel"]["layers"].append(
        _guide_layer(width, height, len(frames), seed, safe_box)
    )
    document["jkdPolish"] = polish_metadata
    if alignment_metadata is not None:
        document["jkdAlignment"] = alignment_metadata
    return document


def write_document(
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
    if not overwrite:
        expected_hashes = [pixel_sha256(frame) for frame in expected_frames]
        actual_hashes = [pixel_sha256(frame) for frame in frames]
        if actual_hashes != expected_hashes:
            raise AssertionError(
                f"Immutable registered source differs from rebuild: {relative(path)}"
            )
    return path


def read_editable_project(
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
