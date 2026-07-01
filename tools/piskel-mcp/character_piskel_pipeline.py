#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import io
import json
import math
import statistics
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = ROOT / "sprites" / "character" / "piskel" / "character-animation-manifest.json"
PACK_DIR = ROOT / "sprites" / "character" / "piskel" / "packs"
ALL_PACK_PATH = PACK_DIR / "all-player-animations-review.piskel"
ALL_PACK_METADATA_PATH = PACK_DIR / "all-player-animations-review-ranges.json"
ALL_PACK_CONTACT_SHEET_PATH = PACK_DIR / "all-player-animations-review-contact-sheet.png"
AUTO_ALIGN_IDS = {"walk", "dig-sideways", "dig-up", "dig-up-sideways", "fly-climb"}


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
    found = {entry["id"] for entry in selected}
    missing = sorted(wanted - found)
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
        "chunks": [
            {
                "layout": layout,
                "base64PNG": image_to_data_uri(sheet),
            }
        ],
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


def read_piskel_data(data: dict[str, Any], source_label: str = "<piskel>") -> tuple[list[Image.Image], int, int, int]:
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
            layout = chunk.get("layout") or []
            for row_index, row in enumerate(layout):
                for column_index, frame_index in enumerate(row):
                    if not isinstance(frame_index, int) or frame_index < 0 or frame_index >= frame_count:
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
                alpha = layer_frame.getchannel("A").point(lambda value: int(value * opacity))
                layer_frame.putalpha(alpha)
            frames[index].alpha_composite(layer_frame)

    return frames, width, height, fps


def read_piskel(path: Path) -> tuple[list[Image.Image], int, int, int]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    return read_piskel_data(data, rel_path(path))


def load_runtime_frames(entry: dict[str, Any]) -> list[Image.Image]:
    width, height = entry["frameSize"]
    frame_count = int(entry["frameCount"])
    outputs = [repo_path(path) for path in entry["runtimeOutputs"]]

    if entry["runtimeMode"] == "sheet":
        sheet_path = outputs[0]
        if not sheet_path.is_file():
            raise FileNotFoundError(rel_path(sheet_path))
        sheet = Image.open(sheet_path).convert("RGBA")
        columns = int(entry["sheetColumns"])
        frames = []
        for index in range(frame_count):
            column = index % columns
            row = index // columns
            box = (column * width, row * height, (column + 1) * width, (row + 1) * height)
            frames.append(sheet.crop(box))
        return frames

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


def detect_core_anchor(frame: Image.Image) -> tuple[float, float, int] | None:
    rgba = frame.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    total_weight = 0.0
    total_x = 0.0
    total_y = 0.0
    count = 0
    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha < 80:
                continue
            purple_strength = min(red, blue) - green
            if red < 120 or blue < 135 or green > 135 or purple_strength < 35:
                continue
            weight = max(1.0, purple_strength) * (alpha / 255)
            total_weight += weight
            total_x += x * weight
            total_y += y * weight
            count += 1
    if count < 6 or total_weight <= 0:
        return None
    return total_x / total_weight, total_y / total_weight, count


def frame_stats(frame: Image.Image, index: int, source_name: str | None = None) -> dict[str, Any]:
    bbox = frame.getbbox()
    width, height = frame.size
    anchor = detect_core_anchor(frame)
    corners = [
        frame.getpixel((0, 0))[3],
        frame.getpixel((width - 1, 0))[3],
        frame.getpixel((0, height - 1))[3],
        frame.getpixel((width - 1, height - 1))[3],
    ]
    return {
        "frame": index,
        "sourceFrame": source_name,
        "bbox": list(bbox) if bbox else None,
        "centerX": round((bbox[0] + bbox[2]) / 2, 2) if bbox else None,
        "rootAnchorX": round(anchor[0], 2) if anchor else None,
        "rootAnchorY": round(anchor[1], 2) if anchor else None,
        "rootAnchorPixels": anchor[2] if anchor else 0,
        "bottom": bbox[3] if bbox else None,
        "clipped": bool(bbox and (bbox[0] <= 0 or bbox[1] <= 0 or bbox[2] >= width or bbox[3] >= height)),
        "cornerAlpha": corners,
    }


def analyze_frames(frames: list[Image.Image]) -> list[dict[str, Any]]:
    return [frame_stats(frame, index) for index, frame in enumerate(frames)]


def drift_summary(stats: list[dict[str, Any]]) -> dict[str, Any]:
    centers = [float(stat["centerX"]) for stat in stats if stat.get("centerX") is not None]
    roots = [float(stat["rootAnchorX"]) for stat in stats if stat.get("rootAnchorX") is not None]

    def max_drift(values: list[float]) -> float:
        if not values:
            return 0.0
        median_value = statistics.median(values)
        return max(abs(value - median_value) for value in values)

    use_root = len(roots) >= max(2, math.ceil(len(stats) * 0.75))
    return {
        "anchorMode": "root-core" if use_root else "bbox-center",
        "maxBBoxCenterDriftPx": round(max_drift(centers), 2),
        "maxRootAnchorDriftPx": round(max_drift(roots), 2),
        "maxAnchorDriftPx": round(max_drift(roots if use_root else centers), 2),
    }


def checker(size: tuple[int, int], cell: int = 12) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size, (40, 41, 46))
    draw = ImageDraw.Draw(image)
    for y in range(0, height, cell):
        for x in range(0, width, cell):
            color = (60, 61, 68) if ((x // cell) + (y // cell)) % 2 else (38, 39, 44)
            draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=color)
    return image.convert("RGBA")


def preview_frame(frame: Image.Image, size: int = 170) -> Image.Image:
    width, height = frame.size
    scale = min(size / width, size / height)
    resized = frame.resize((max(1, round(width * scale)), max(1, round(height * scale))), Image.Resampling.LANCZOS)
    base = checker((size, size)).convert("RGBA")
    base.alpha_composite(resized, ((size - resized.width) // 2, (size - resized.height) // 2))
    return base.convert("RGB")


def write_preview(path: Path, frames: list[Image.Image], fps: int) -> None:
    ensure_parent(path)
    previews = [preview_frame(frame) for frame in frames]
    duration = max(1, round(1000 / max(1, fps)))
    previews[0].save(path, save_all=True, append_images=previews[1:], duration=duration, loop=0)


def write_contact_sheet(path: Path, frames: list[Image.Image]) -> None:
    ensure_parent(path)
    cell = 118
    columns = min(8, max(1, len(frames)))
    rows = math.ceil(len(frames) / columns)
    sheet = Image.new("RGB", (columns * cell, rows * cell), (28, 28, 32))
    draw = ImageDraw.Draw(sheet)
    for index, frame in enumerate(frames):
        preview = preview_frame(frame, cell).convert("RGB")
        x = (index % columns) * cell
        y = (index // columns) * cell
        sheet.paste(preview, (x, y))
        draw.text((x + 4, y + 4), str(index), fill=(255, 255, 255))
    sheet.save(path)


def render_alignment_cell(
    frame: Image.Image,
    stat: dict[str, Any],
    index: int,
    median_center: float | None,
    median_anchor: tuple[float, float] | None,
    policy: dict[str, Any],
    size: int = 170,
) -> Image.Image:
    width, height = frame.size
    scale = min(size / width, size / height)
    resized = frame.resize((max(1, round(width * scale)), max(1, round(height * scale))), Image.Resampling.LANCZOS)
    offset = ((size - resized.width) // 2, (size - resized.height) // 2)
    cell = checker((size, size)).convert("RGBA")
    cell.alpha_composite(resized, offset)
    draw = ImageDraw.Draw(cell)

    def sx(value: float) -> int:
        return round(offset[0] + value * scale)

    def sy(value: float) -> int:
        return round(offset[1] + value * scale)

    canvas_center = sx(width / 2)
    draw.line((canvas_center, 0, canvas_center, size), fill=(220, 72, 72, 210), width=1)

    if median_center is not None:
        median_x = sx(median_center)
        draw.line((median_x, 0, median_x, size), fill=(80, 198, 222, 220), width=1)

    if median_anchor is not None:
        anchor_x = sx(median_anchor[0])
        draw.line((anchor_x, 0, anchor_x, size), fill=(218, 96, 255, 220), width=1)

    baseline = policy.get("runtimeBaselineY")
    if baseline is not None:
        line_y = sy(float(baseline))
        draw.line((0, line_y, size, line_y), fill=(92, 181, 96, 210), width=1)

    bottom_target = policy.get("bottomY")
    if bottom_target is not None:
        line_y = sy(float(bottom_target))
        draw.line((0, line_y, size, line_y), fill=(255, 195, 64, 220), width=1)

    bbox = stat.get("bbox")
    if bbox:
        x0, y0, x1, y1 = bbox
        drift = 0.0 if median_center is None or stat.get("centerX") is None else float(stat["centerX"]) - median_center
        color = (255, 210, 68, 230) if abs(drift) > 5 else (134, 226, 150, 230)
        draw.rectangle((sx(x0), sy(y0), sx(x1), sy(y1)), outline=color, width=1)
        draw.line((sx(float(stat["centerX"])), 0, sx(float(stat["centerX"])), size), fill=(255, 230, 76, 220), width=1)
        draw.text((5, 18), f"dx {drift:+.1f}", fill=(255, 255, 255))

    if median_anchor is not None and stat.get("rootAnchorX") is not None and stat.get("rootAnchorY") is not None:
        root_x = sx(float(stat["rootAnchorX"]))
        root_y = sy(float(stat["rootAnchorY"]))
        anchor_dx = float(stat["rootAnchorX"]) - median_anchor[0]
        draw.ellipse((root_x - 3, root_y - 3, root_x + 3, root_y + 3), outline=(255, 96, 255, 240), width=2)
        draw.text((5, 32), f"root {anchor_dx:+.1f}", fill=(255, 210, 255))

    draw.rectangle((0, 0, size - 1, size - 1), outline=(15, 17, 20), width=1)
    draw.text((5, 4), str(index), fill=(255, 255, 255))
    return cell.convert("RGB")


def write_alignment_overlay(path: Path, frames: list[Image.Image], stats: list[dict[str, Any]], policy: dict[str, Any]) -> None:
    ensure_parent(path)
    cell = 170
    columns = min(6, max(1, len(frames)))
    rows = math.ceil(len(frames) / columns)
    centers = [stat["centerX"] for stat in stats if stat.get("centerX") is not None]
    median_center = statistics.median(centers) if centers else None
    anchors = [
        (float(stat["rootAnchorX"]), float(stat["rootAnchorY"]))
        for stat in stats
        if stat.get("rootAnchorX") is not None and stat.get("rootAnchorY") is not None
    ]
    median_anchor = (
        statistics.median(anchor[0] for anchor in anchors),
        statistics.median(anchor[1] for anchor in anchors),
    ) if anchors else None
    sheet = Image.new("RGB", (columns * cell, rows * cell), (26, 28, 32))
    for index, frame in enumerate(frames):
        preview = render_alignment_cell(frame, stats[index], index, median_center, median_anchor, policy, cell)
        sheet.paste(preview, ((index % columns) * cell, (index // columns) * cell))
    sheet.save(path)


def write_drift_report(path: Path, entry: dict[str, Any], stats: list[dict[str, Any]]) -> dict[str, Any]:
    ensure_parent(path)
    policy = entry.get("centeringPolicy") or {}
    centers = [stat["centerX"] for stat in stats if stat.get("centerX") is not None]
    median_center = statistics.median(centers) if centers else None
    anchors_x = [stat["rootAnchorX"] for stat in stats if stat.get("rootAnchorX") is not None]
    anchors_y = [stat["rootAnchorY"] for stat in stats if stat.get("rootAnchorY") is not None]
    median_anchor_x = statistics.median(anchors_x) if anchors_x else None
    median_anchor_y = statistics.median(anchors_y) if anchors_y else None
    bottom_target = policy.get("bottomY")
    frames = []
    for stat in stats:
        center = stat.get("centerX")
        bottom = stat.get("bottom")
        root_anchor_x = stat.get("rootAnchorX")
        root_anchor_y = stat.get("rootAnchorY")
        frames.append({
            **stat,
            "centerDeltaFromMedian": round(float(center) - float(median_center), 2)
            if center is not None and median_center is not None else None,
            "rootAnchorDeltaXFromMedian": round(float(root_anchor_x) - float(median_anchor_x), 2)
            if root_anchor_x is not None and median_anchor_x is not None else None,
            "rootAnchorDeltaYFromMedian": round(float(root_anchor_y) - float(median_anchor_y), 2)
            if root_anchor_y is not None and median_anchor_y is not None else None,
            "bottomDeltaFromTarget": int(bottom) - int(bottom_target)
            if bottom is not None and bottom_target is not None else None,
        })
    report = {
        "id": entry["id"],
        "displayName": entry.get("displayName", entry["id"]),
        "frameCount": len(stats),
        "frameSize": entry["frameSize"],
        "fps": entry["fps"],
        "orientation": entry.get("orientation"),
        "centeringPolicy": policy,
        "medianCenterX": round(float(median_center), 2) if median_center is not None else None,
        "medianRootAnchorX": round(float(median_anchor_x), 2) if median_anchor_x is not None else None,
        "medianRootAnchorY": round(float(median_anchor_y), 2) if median_anchor_y is not None else None,
        "maxCenterDriftPx": round(max(abs(frame["centerDeltaFromMedian"] or 0) for frame in frames), 2) if frames else 0,
        "maxRootAnchorDriftPx": round(max(abs(frame["rootAnchorDeltaXFromMedian"] or 0) for frame in frames), 2) if frames else 0,
        "frames": frames,
    }
    write_json(path, report)
    return report


def write_artifacts(entry: dict[str, Any], frames: list[Image.Image], runtime_info: dict[str, Any] | None = None) -> dict[str, Any]:
    stats = analyze_frames(frames)
    derived = derived_artifact_paths(entry)
    columns, rows = piskel_grid(entry, len(frames))
    width, height = entry["frameSize"]
    info = runtime_info or {
        "runtimeMode": entry["runtimeMode"],
        "outputs": entry["runtimeOutputs"],
        "sheetGrid": [columns, rows],
        "sheetSize": [columns * width, rows * height],
        "unusedGridFrames": list(range(len(frames), columns * rows)),
    }
    metadata = {
        "sourcePiskel": entry["sourcePiskel"],
        "sourceMode": "piskel-runtime-active",
        "frameCount": len(frames),
        "frameSize": entry["frameSize"],
        "sheetGrid": info["sheetGrid"],
        "sheetSize": info["sheetSize"],
        "unusedGridFrames": info["unusedGridFrames"],
        "phaserEndFrame": len(frames) - 1,
        "runtimeFps": entry["fps"],
        "phaserKey": entry.get("phaserKey"),
        "orientation": entry.get("orientation"),
        "hitFrameGroups": entry.get("hitFrameGroups", []),
        "centeringPolicy": entry.get("centeringPolicy", {}),
        "runtimeOutputs": info["outputs"],
        "runtimeFrameStats": stats,
        "alignmentOverlayPath": rel_path(derived["alignmentOverlayPath"]),
        "driftReportPath": rel_path(derived["driftReportPath"]),
    }
    write_json(repo_path(entry["metadataPath"]), metadata)
    write_preview(repo_path(entry["previewPath"]), frames, int(entry["fps"]))
    write_contact_sheet(repo_path(entry["contactSheetPath"]), frames)
    write_alignment_overlay(derived["alignmentOverlayPath"], frames, stats, entry.get("centeringPolicy") or {})
    write_drift_report(derived["driftReportPath"], entry, stats)
    return {
        "metadataPath": entry["metadataPath"],
        "previewPath": entry["previewPath"],
        "contactSheetPath": entry["contactSheetPath"],
        "alignmentOverlayPath": rel_path(derived["alignmentOverlayPath"]),
        "driftReportPath": rel_path(derived["driftReportPath"]),
    }


def validate_piskel_frames(
    entry: dict[str, Any],
    frames: list[Image.Image],
    width: int,
    height: int,
    fps: int,
    source_label: str | None = None,
) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    expected_size = tuple(entry["frameSize"])
    if (width, height) != expected_size:
        errors.append(f"frame size is {[width, height]}, expected {entry['frameSize']}")
    if len(frames) != int(entry["frameCount"]):
        errors.append(f"frame count is {len(frames)}, expected {entry['frameCount']}")
    if int(fps) != int(entry["fps"]):
        warnings.append(f"Piskel fps is {fps}, runtime fps is {entry['fps']}")
    for index, frame in enumerate(frames):
        if frame.size != expected_size:
            errors.append(f"frame {index} is {list(frame.size)}, expected {entry['frameSize']}")

    stats = analyze_frames(frames)
    drift = drift_summary(stats)
    policy = entry.get("centeringPolicy") or {}
    max_anchor_drift = policy.get("maxAnchorDriftPx")
    if max_anchor_drift is not None and drift["maxAnchorDriftPx"] > float(max_anchor_drift):
        warnings.append(
            f"{drift['anchorMode']} drift {drift['maxAnchorDriftPx']:.2f}px exceeds warning threshold {max_anchor_drift}px"
        )

    return {
        "id": entry["id"],
        "ok": not errors,
        "source": source_label,
        "errors": errors,
        "warnings": warnings,
        "frameCount": len(frames),
        "frameSize": [width, height],
        "fps": fps,
        "anchorMode": drift["anchorMode"],
        "maxCenterDriftPx": drift["maxAnchorDriftPx"],
        "maxBBoxCenterDriftPx": drift["maxBBoxCenterDriftPx"],
        "maxRootAnchorDriftPx": drift["maxRootAnchorDriftPx"],
    }


def validate_entries(entries: list[dict[str, Any]]) -> dict[str, Any]:
    results = []
    for entry in entries:
        try:
            piskel_path = repo_path(entry["sourcePiskel"])
            frames, width, height, fps = read_piskel(piskel_path)
            results.append(validate_piskel_frames(entry, frames, width, height, fps, entry["sourcePiskel"]))
        except Exception as error:
            results.append({"id": entry["id"], "ok": False, "errors": [str(error)], "warnings": []})
    return {"ok": all(result["ok"] for result in results), "results": results}


def import_entries(entries: list[dict[str, Any]]) -> dict[str, Any]:
    imported = []
    for entry in entries:
        frames = load_runtime_frames(entry)
        piskel_path = repo_path(entry["sourcePiskel"])
        ensure_parent(piskel_path)
        write_json(piskel_path, make_piskel(entry, frames))
        artifacts = write_artifacts(entry, frames)
        imported.append({
            "id": entry["id"],
            "sourcePiskel": entry["sourcePiskel"],
            "frameCount": len(frames),
            "artifacts": artifacts,
        })
    return {"ok": True, "imported": imported}


def export_entries(entries: list[dict[str, Any]]) -> dict[str, Any]:
    exported = []
    for entry in entries:
        piskel_path = repo_path(entry["sourcePiskel"])
        if not piskel_path.is_file():
            raise FileNotFoundError(rel_path(piskel_path))
        frames, width, height, fps = read_piskel(piskel_path)
        validation = validate_piskel_frames(entry, frames, width, height, fps, entry["sourcePiskel"])
        if not validation["ok"]:
            raise ValueError(f"{entry['id']} validation failed: {'; '.join(validation['errors'])}")
        runtime_info = save_runtime_frames(entry, frames)
        artifacts = write_artifacts(entry, frames, runtime_info)
        exported.append({
            "id": entry["id"],
            "fps": fps,
            "validation": validation,
            "runtimeOutputs": runtime_info["outputs"],
            "frameCount": len(frames),
            "artifacts": artifacts,
        })
    return {"ok": True, "exported": exported}


def build_previews(entries: list[dict[str, Any]]) -> dict[str, Any]:
    built = []
    for entry in entries:
        piskel_path = repo_path(entry["sourcePiskel"])
        frames, width, height, _fps = read_piskel(piskel_path)
        validation = validate_piskel_frames(entry, frames, width, height, _fps, entry["sourcePiskel"])
        if not validation["ok"]:
            raise ValueError(f"{entry['id']} validation failed: {'; '.join(validation['errors'])}")
        artifacts = write_artifacts(entry, frames)
        built.append({"id": entry["id"], "frameCount": len(frames), "validation": validation, "artifacts": artifacts})
    return {"ok": True, "previewed": built}


def fit_frame_to_canvas(frame: Image.Image, size: int = 341) -> Image.Image:
    image = frame.convert("RGBA")
    scale = min(size / image.width, size / image.height, 1.0)
    if scale < 1.0:
        image = image.resize(
            (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
            Image.Resampling.LANCZOS,
        )
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(image, ((size - image.width) // 2, (size - image.height) // 2))
    return canvas


def build_all_pack(entries: list[dict[str, Any]]) -> dict[str, Any]:
    frames: list[Image.Image] = []
    ranges: list[dict[str, Any]] = []

    for entry in entries:
        source_frames = load_runtime_frames(entry)
        start = len(frames)
        frames.extend(fit_frame_to_canvas(frame) for frame in source_frames)
        ranges.append({
            "id": entry["id"],
            "displayName": entry.get("displayName", entry["id"]),
            "startFrame": start,
            "endFrame": len(frames) - 1,
            "frameCount": len(source_frames),
            "fps": entry["fps"],
            "originalFrameSize": entry["frameSize"],
            "reviewFrameSize": [341, 341],
            "scaledForReview": entry["frameSize"] != [341, 341],
            "sourcePiskel": entry["sourcePiskel"],
            "runtimeOutputs": entry["runtimeOutputs"],
        })

    pack_entry = {
        "id": "all-player-animations-review",
        "displayName": "All Player Animations Review Pack",
        "fps": 12,
        "frameSize": [341, 341],
        "sheetColumns": 10,
    }
    write_json(ALL_PACK_PATH, make_piskel(pack_entry, frames))
    write_json(ALL_PACK_METADATA_PATH, {
        "sourceMode": "combined-piskel-review-pack",
        "sourceManifest": rel_path(MANIFEST_PATH),
        "packPath": rel_path(ALL_PACK_PATH),
        "frameCount": len(frames),
        "frameSize": [341, 341],
        "ranges": ranges,
        "notes": [
            "This file is for online Piskel review/import convenience.",
            "Animations with original frame sizes larger than 341x341 are scaled into the review canvas.",
            "Use the per-animation .piskel files for exact runtime export back to Phaser."
        ],
    })
    write_contact_sheet(ALL_PACK_CONTACT_SHEET_PATH, frames)
    return {
        "ok": True,
        "pack": {
            "path": rel_path(ALL_PACK_PATH),
            "metadataPath": rel_path(ALL_PACK_METADATA_PATH),
            "contactSheetPath": rel_path(ALL_PACK_CONTACT_SHEET_PATH),
            "frameCount": len(frames),
            "ranges": ranges,
        },
    }


def clamp_shift_for_bbox(bbox: tuple[int, int, int, int], size: tuple[int, int], dx: int, dy: int) -> tuple[int, int]:
    width, height = size
    x0, y0, x1, y1 = bbox
    min_dx = 1 - x0
    max_dx = (width - 1) - x1
    min_dy = 1 - y0
    max_dy = (height - 1) - y1
    if min_dx <= max_dx:
        dx = max(min_dx, min(max_dx, dx))
    else:
        dx = 0
    if min_dy <= max_dy:
        dy = max(min_dy, min(max_dy, dy))
    else:
        dy = 0
    return dx, dy


def shift_frame(frame: Image.Image, dx: int, dy: int) -> Image.Image:
    if dx == 0 and dy == 0:
        return frame.copy()
    width, height = frame.size
    dest_x = max(0, dx)
    dest_y = max(0, dy)
    src_x = max(0, -dx)
    src_y = max(0, -dy)
    copy_width = min(width - src_x, width - dest_x)
    copy_height = min(height - src_y, height - dest_y)
    canvas = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    if copy_width > 0 and copy_height > 0:
        crop = frame.crop((src_x, src_y, src_x + copy_width, src_y + copy_height))
        canvas.alpha_composite(crop, (dest_x, dest_y))
    return canvas


def auto_align_entry(entry: dict[str, Any]) -> dict[str, Any]:
    if entry["id"] not in AUTO_ALIGN_IDS:
        return {"id": entry["id"], "ok": True, "skipped": True, "reason": "not in the v5 auto-align set"}
    if entry["frameSize"] != [341, 341] or int(entry["frameCount"]) <= 1:
        return {"id": entry["id"], "ok": True, "skipped": True, "reason": "not a multi-frame 341x341 animation"}

    piskel_path = repo_path(entry["sourcePiskel"])
    frames, width, height, fps = read_piskel(piskel_path)
    validation = validate_piskel_frames(entry, frames, width, height, fps, entry["sourcePiskel"])
    if not validation["ok"]:
        raise ValueError(f"{entry['id']} validation failed: {'; '.join(validation['errors'])}")

    stats = analyze_frames(frames)
    centers = [stat["centerX"] for stat in stats if stat.get("centerX") is not None]
    anchors_x = [stat["rootAnchorX"] for stat in stats if stat.get("rootAnchorX") is not None]
    anchors_y = [stat["rootAnchorY"] for stat in stats if stat.get("rootAnchorY") is not None]
    if not centers:
        return {"id": entry["id"], "ok": True, "skipped": True, "reason": "no visible pixels"}

    policy = entry.get("centeringPolicy") or {}
    use_root_anchor = len(anchors_x) >= max(2, math.ceil(len(frames) * 0.75))
    target_center = statistics.median(anchors_x) if use_root_anchor else statistics.median(centers)
    target_anchor_y = statistics.median(anchors_y) if use_root_anchor and anchors_y else None
    bottom_target = policy.get("bottomY")
    aligned_frames: list[Image.Image] = []
    shifts: list[dict[str, Any]] = []

    for frame, stat in zip(frames, stats):
        bbox = stat.get("bbox")
        if not bbox:
            aligned_frames.append(frame.copy())
            shifts.append({"frame": stat["frame"], "dx": 0, "dy": 0, "reason": "empty"})
            continue
        source_anchor_x = stat.get("rootAnchorX") if use_root_anchor else stat.get("centerX")
        source_anchor_y = stat.get("rootAnchorY") if use_root_anchor else None
        dx = round(float(target_center) - float(source_anchor_x)) if source_anchor_x is not None else 0
        dy = round(float(bottom_target) - float(stat["bottom"])) if bottom_target is not None and stat.get("bottom") is not None else 0
        if bottom_target is None and target_anchor_y is not None and source_anchor_y is not None:
            dy = round(float(target_anchor_y) - float(source_anchor_y))
        clamped_dx, clamped_dy = clamp_shift_for_bbox(tuple(bbox), (width, height), dx, dy)
        aligned_frames.append(shift_frame(frame, clamped_dx, clamped_dy))
        shifts.append({
            "frame": stat["frame"],
            "dx": clamped_dx,
            "dy": clamped_dy,
            "requestedDx": dx,
            "requestedDy": dy,
            "clamped": clamped_dx != dx or clamped_dy != dy,
            "anchorMode": "root-core" if use_root_anchor else "bbox-center",
        })

    derived = derived_artifact_paths(entry)
    write_contact_sheet(derived["autoAlignBeforePath"], frames)
    write_alignment_overlay(derived["autoAlignBeforeOverlayPath"], frames, stats, policy)

    backup_path = None
    if piskel_path.is_file():
        backup_dir = piskel_path.parent / "_piskel-backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        backup_path = backup_dir / f"{piskel_path.stem}-pre-auto-align-{datetime.now().strftime('%Y%m%d-%H%M%S')}.piskel"
        backup_path.write_bytes(piskel_path.read_bytes())

    write_json(piskel_path, make_piskel(entry, aligned_frames))
    runtime_info = save_runtime_frames(entry, aligned_frames)
    artifacts = write_artifacts(entry, aligned_frames, runtime_info)

    after_stats = analyze_frames(aligned_frames)
    write_contact_sheet(derived["autoAlignAfterPath"], aligned_frames)
    write_alignment_overlay(derived["autoAlignAfterOverlayPath"], aligned_frames, after_stats, policy)
    before_drift = validate_piskel_frames(entry, frames, width, height, fps, entry["sourcePiskel"])
    after_drift = validate_piskel_frames(entry, aligned_frames, width, height, fps, entry["sourcePiskel"])

    return {
        "id": entry["id"],
        "ok": True,
        "skipped": False,
        "targetCenterX": round(float(target_center), 2),
        "anchorMode": "root-core" if use_root_anchor else "bbox-center",
        "beforeMaxCenterDriftPx": before_drift["maxCenterDriftPx"],
        "afterMaxCenterDriftPx": after_drift["maxCenterDriftPx"],
        "beforeMaxRootAnchorDriftPx": before_drift["maxRootAnchorDriftPx"],
        "afterMaxRootAnchorDriftPx": after_drift["maxRootAnchorDriftPx"],
        "backupPath": rel_path(backup_path) if backup_path else None,
        "shifts": shifts,
        "artifacts": {
            **artifacts,
            "autoAlignBeforePath": rel_path(derived["autoAlignBeforePath"]),
            "autoAlignAfterPath": rel_path(derived["autoAlignAfterPath"]),
            "autoAlignBeforeOverlayPath": rel_path(derived["autoAlignBeforeOverlayPath"]),
            "autoAlignAfterOverlayPath": rel_path(derived["autoAlignAfterOverlayPath"]),
        },
    }


def auto_align_entries(entries: list[dict[str, Any]]) -> dict[str, Any]:
    results = []
    for entry in entries:
        results.append(auto_align_entry(entry))
    return {"ok": all(result.get("ok") for result in results), "aligned": results}


def audit_entry(entry: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    frames = load_runtime_frames(entry)
    expected_size = tuple(entry["frameSize"])
    if len(frames) != int(entry["frameCount"]):
        errors.append(f"expected {entry['frameCount']} frames, found {len(frames)}")

    stats = analyze_frames(frames)
    for index, frame in enumerate(frames):
        if frame.size != expected_size:
            errors.append(f"frame {index} is {frame.size}, expected {expected_size}")

    policy = entry.get("centeringPolicy") or {}
    strict_bounds = bool(policy) and bool(policy.get("strictBounds", True))

    for stat in stats:
        if any(stat["cornerAlpha"]):
            message = f"frame {stat['frame']} has non-transparent corner alpha {stat['cornerAlpha']}"
            if strict_bounds:
                errors.append(message)
            else:
                warnings.append(message)
        if stat["clipped"]:
            message = f"frame {stat['frame']} touches a runtime edge"
            if strict_bounds:
                errors.append(message)
            else:
                warnings.append(message)

    bottom_target = policy.get("bottomY")
    bottom_tolerance = int(policy.get("bottomTolerancePx", 2))
    if bottom_target is not None:
        for stat in stats:
            bottom = stat.get("bottom")
            if bottom is not None and abs(int(bottom) - int(bottom_target)) > bottom_tolerance:
                errors.append(f"frame {stat['frame']} bottom {bottom} differs from target {bottom_target}")

    drift_info = drift_summary(stats)
    max_anchor_drift = policy.get("maxAnchorDriftPx")
    if max_anchor_drift is not None and drift_info["maxAnchorDriftPx"] > float(max_anchor_drift):
        warnings.append(
            f"{drift_info['anchorMode']} drift {drift_info['maxAnchorDriftPx']:.2f}px exceeds warning threshold {max_anchor_drift}px"
        )

    return {
        "id": entry["id"],
        "ok": not errors,
        "errors": errors,
        "warnings": warnings,
        "frameCount": len(frames),
        "frameSize": list(expected_size),
        "anchorMode": drift_info["anchorMode"],
        "maxCenterDriftPx": drift_info["maxAnchorDriftPx"],
        "maxBBoxCenterDriftPx": drift_info["maxBBoxCenterDriftPx"],
        "maxRootAnchorDriftPx": drift_info["maxRootAnchorDriftPx"],
    }


def audit_entries(entries: list[dict[str, Any]]) -> dict[str, Any]:
    results = []
    for entry in entries:
        try:
            results.append(audit_entry(entry))
        except Exception as error:
            results.append({"id": entry["id"], "ok": False, "errors": [str(error)], "warnings": []})
    ok = all(result["ok"] for result in results)
    return {"ok": ok, "results": results}


def list_entries(entries: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "ok": True,
        "manifestPath": rel_path(MANIFEST_PATH),
        "animations": [
            {
                "id": entry["id"],
                "displayName": entry.get("displayName"),
                "fps": entry["fps"],
                "frameSize": entry["frameSize"],
                "frameCount": entry["frameCount"],
                "runtimeMode": entry["runtimeMode"],
                "sourcePiskel": entry["sourcePiskel"],
                "runtimeOutputs": entry["runtimeOutputs"],
                "phaserKey": entry.get("phaserKey"),
            }
            for entry in entries
        ],
    }


def parse_ids(value: str | None) -> list[str] | None:
    if not value:
        return None
    return [part.strip() for part in value.split(",") if part.strip()]


def main() -> int:
    parser = argparse.ArgumentParser(description="Piskel bridge for Just Keep Digging character assets.")
    parser.add_argument("command", choices=["list", "import", "export", "audit", "preview", "pack", "validate", "align"])
    parser.add_argument("--ids", help="Comma-separated animation ids. Defaults to all runtime-active animations.")
    parser.add_argument("--json", action="store_true", help="Emit JSON only.")
    args = parser.parse_args()

    try:
        manifest = load_manifest()
        entries = select_entries(manifest, parse_ids(args.ids))
        if args.command == "list":
            result = list_entries(entries)
        elif args.command == "import":
            result = import_entries(entries)
        elif args.command == "export":
            result = export_entries(entries)
        elif args.command == "audit":
            result = audit_entries(entries)
        elif args.command == "pack":
            result = build_all_pack(entries)
        elif args.command == "validate":
            result = validate_entries(entries)
        elif args.command == "align":
            result = auto_align_entries(entries)
        else:
            result = build_previews(entries)
    except Exception as error:
        result = {"ok": False, "error": str(error)}

    print(json.dumps(result, indent=2))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
