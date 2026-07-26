from __future__ import annotations

import base64
import io
import json
import math
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = ROOT / "sprites" / "character" / "piskel" / "character-animation-manifest.json"
PACK_DIR = ROOT / "sprites" / "character" / "piskel" / "packs"
ALL_PACK_PATH = PACK_DIR / "all-player-animations-review.piskel"
ALL_PACK_METADATA_PATH = PACK_DIR / "all-player-animations-review-ranges.json"
ALL_PACK_CONTACT_SHEET_PATH = PACK_DIR / "all-player-animations-review-contact-sheet.png"


def repo_path(path: str | Path) -> Path:
    return ROOT / Path(path)


def rel_path(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def contact_variant_path(entry: dict[str, Any], suffix: str, extension: str) -> Path:
    contact = repo_path(entry["contactSheetPath"])
    ending = "-review-contact-sheet.png"
    base = contact.name[:-len(ending)] if contact.name.endswith(ending) else contact.stem
    return contact.with_name(f"{base}-{suffix}{extension}")


def derived_artifact_paths(entry: dict[str, Any]) -> dict[str, Path]:
    return {
        "alignmentOverlayPath": contact_variant_path(entry, "alignment-overlay", ".png"),
        "driftReportPath": contact_variant_path(entry, "drift-report", ".json"),
        "autoAlignBeforePath": contact_variant_path(entry, "auto-align-before", ".png"),
        "autoAlignAfterPath": contact_variant_path(entry, "auto-align-after", ".png"),
        "autoAlignBeforeOverlayPath": contact_variant_path(entry, "auto-align-before-overlay", ".png"),
        "autoAlignAfterOverlayPath": contact_variant_path(entry, "auto-align-after-overlay", ".png"),
    }


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def write_json(path: Path, data: Any) -> None:
    ensure_parent(path)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def load_manifest() -> dict[str, Any]:
    with MANIFEST_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def select_entries(manifest: dict[str, Any], ids: list[str] | None) -> list[dict[str, Any]]:
    entries = manifest["animations"]
    if not ids:
        return entries
    wanted = set(ids)
    selected = [entry for entry in entries if entry["id"] in wanted]
    missing = sorted(wanted - {entry["id"] for entry in selected})
    if missing:
        raise ValueError(f"Unknown animation id(s): {', '.join(missing)}")
    return selected


def image_to_data_uri(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    payload = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{payload}"


def decode_data_uri(uri: str) -> Image.Image:
    payload = uri.split(",", 1)[1] if "," in uri else uri
    return Image.open(io.BytesIO(base64.b64decode(payload))).convert("RGBA")


def piskel_grid(entry: dict[str, Any], frame_count: int) -> tuple[int, int]:
    columns = max(1, int(entry.get("sheetColumns") or frame_count or 1))
    rows = max(1, math.ceil(frame_count / columns))
    return columns, rows


def make_piskel(entry: dict[str, Any], frames: list[Image.Image]) -> dict[str, Any]:
    width, height = entry["frameSize"]
    columns, rows = piskel_grid(entry, len(frames))
    sheet = Image.new("RGBA", (columns * width, rows * height), (0, 0, 0, 0))
    layout: list[list[int]] = []
    for row in range(rows):
        layout_row: list[int] = []
        for column in range(columns):
            index = row * columns + column
            layout_row.append(index if index < len(frames) else -1)
            if index < len(frames):
                sheet.alpha_composite(frames[index], (column * width, row * height))
        layout.append(layout_row)
    layer = {
        "name": "Layer 1",
        "opacity": 1,
        "frameCount": len(frames),
        "chunks": [{"layout": layout, "base64PNG": image_to_data_uri(sheet)}],
    }
    return {
        "modelVersion": 2,
        "piskel": {
            "name": entry.get("displayName", entry["id"]),
            "description": "Generated from Just Keep Digging runtime character assets.",
            "fps": entry["fps"],
            "height": height,
            "width": width,
            "layers": [json.dumps(layer, separators=(",", ":"))],
            "hiddenFrames": [],
        },
    }


def layer_frame_count(layer: dict[str, Any]) -> int:
    count = int(layer.get("frameCount") or 0)
    for chunk in layer.get("chunks", []):
        for row in chunk.get("layout", []):
            for value in row:
                if isinstance(value, int) and value >= 0:
                    count = max(count, value + 1)
    return count


def parse_layer(raw_layer: Any) -> dict[str, Any]:
    if isinstance(raw_layer, str):
        return json.loads(raw_layer)
    if isinstance(raw_layer, dict):
        return raw_layer
    raise ValueError("Unsupported Piskel layer shape")


def read_piskel_data(
    data: dict[str, Any],
    source_label: str = "<piskel>",
) -> tuple[list[Image.Image], int, int, int]:
    piskel = data.get("piskel", data)
    width = int(piskel["width"])
    height = int(piskel["height"])
    fps = int(piskel.get("fps") or 12)
    layers = [parse_layer(layer) for layer in piskel.get("layers", [])]
    if not layers:
        raise ValueError(f"{source_label} has no layers")
    frame_count = max(layer_frame_count(layer) for layer in layers)
    frames = [Image.new("RGBA", (width, height), (0, 0, 0, 0)) for _ in range(frame_count)]
    for layer in layers:
        if layer.get("visible") is False or layer.get("hidden") is True:
            continue
        layer_frames = [Image.new("RGBA", (width, height), (0, 0, 0, 0)) for _ in range(frame_count)]
        for chunk in layer.get("chunks", []):
            chunk_image = decode_data_uri(chunk["base64PNG"])
            for row_index, row in enumerate(chunk.get("layout") or []):
                for column_index, frame_index in enumerate(row):
                    if not isinstance(frame_index, int) or not 0 <= frame_index < frame_count:
                        continue
                    box = (
                        column_index * width,
                        row_index * height,
                        (column_index + 1) * width,
                        (row_index + 1) * height,
                    )
                    layer_frames[frame_index].alpha_composite(chunk_image.crop(box))
        opacity = float(layer.get("opacity", 1))
        for index, layer_frame in enumerate(layer_frames):
            if opacity < 1:
                layer_frame.putalpha(layer_frame.getchannel("A").point(lambda value: int(value * opacity)))
            frames[index].alpha_composite(layer_frame)
    return frames, width, height, fps


def read_piskel(path: Path) -> tuple[list[Image.Image], int, int, int]:
    with path.open("r", encoding="utf-8") as handle:
        return read_piskel_data(json.load(handle), rel_path(path))


def load_runtime_frames(entry: dict[str, Any], import_source: bool = False) -> list[Image.Image]:
    width, height = entry["frameSize"]
    frame_count = int(entry["frameCount"])
    output_key = "importRuntimeOutputs" if import_source and entry.get("importRuntimeOutputs") else "runtimeOutputs"
    outputs = [repo_path(path) for path in entry[output_key]]
    if entry["runtimeMode"] == "sheet":
        sheet_path = outputs[0]
        if not sheet_path.is_file():
            raise FileNotFoundError(rel_path(sheet_path))
        sheet = Image.open(sheet_path).convert("RGBA")
        columns = int(entry["sheetColumns"])
        return [
            sheet.crop((
                (index % columns) * width,
                (index // columns) * height,
                ((index % columns) + 1) * width,
                ((index // columns) + 1) * height,
            ))
            for index in range(frame_count)
        ]
    if len(outputs) != frame_count:
        raise ValueError(f"{entry['id']} has {len(outputs)} runtime outputs for {frame_count} frames")
    frames = []
    for output in outputs:
        if not output.is_file():
            raise FileNotFoundError(rel_path(output))
        frames.append(Image.open(output).convert("RGBA"))
    return frames


def save_image(path: Path, image: Image.Image) -> None:
    ensure_parent(path)
    suffix = path.suffix.lower()
    if suffix == ".webp":
        image.save(path, "WEBP", lossless=True, quality=100, method=6)
    elif suffix == ".png":
        image.save(path, "PNG")
    else:
        image.save(path)


def save_runtime_frames(entry: dict[str, Any], frames: list[Image.Image]) -> dict[str, Any]:
    expected_size = tuple(entry["frameSize"])
    if len(frames) != int(entry["frameCount"]):
        raise ValueError(f"{entry['id']} expected {entry['frameCount']} frames, got {len(frames)}")
    for index, frame in enumerate(frames):
        if frame.size != expected_size:
            raise ValueError(f"{entry['id']} frame {index} is {frame.size}, expected {expected_size}")
    outputs = [repo_path(path) for path in entry["runtimeOutputs"]]
    if entry["runtimeMode"] == "sheet":
        width, height = expected_size
        columns, rows = piskel_grid(entry, len(frames))
        sheet = Image.new("RGBA", (columns * width, rows * height), (0, 0, 0, 0))
        for index, frame in enumerate(frames):
            sheet.alpha_composite(frame, ((index % columns) * width, (index // columns) * height))
        save_image(outputs[0], sheet)
        return {
            "runtimeMode": "sheet",
            "outputs": [rel_path(outputs[0])],
            "sheetGrid": [columns, rows],
            "sheetSize": list(sheet.size),
            "unusedGridFrames": list(range(len(frames), columns * rows)),
        }
    if len(outputs) != len(frames):
        raise ValueError(f"{entry['id']} output count does not match frame count")
    for output, frame in zip(outputs, frames):
        save_image(output, frame)
    return {
        "runtimeMode": "frames",
        "outputs": [rel_path(path) for path in outputs],
        "sheetGrid": [len(frames), 1],
        "sheetSize": [expected_size[0] * len(frames), expected_size[1]],
        "unusedGridFrames": [],
    }
