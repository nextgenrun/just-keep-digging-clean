from __future__ import annotations

import math
import statistics
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw

from piskel_document import (
    derived_artifact_paths,
    ensure_parent,
    piskel_grid,
    rel_path,
    repo_path,
    write_json,
)
from piskel_frame_polish import analyze_frames, drift_summary


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
    resized = frame.resize(
        (max(1, round(width * scale)), max(1, round(height * scale))),
        Image.Resampling.LANCZOS,
    )
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
    resized = frame.resize(
        (max(1, round(width * scale)), max(1, round(height * scale))),
        Image.Resampling.LANCZOS,
    )
    offset = ((size - resized.width) // 2, (size - resized.height) // 2)
    cell = checker((size, size)).convert("RGBA")
    cell.alpha_composite(resized, offset)
    draw = ImageDraw.Draw(cell)
    sx = lambda value: round(offset[0] + value * scale)
    sy = lambda value: round(offset[1] + value * scale)
    draw.line((sx(width / 2), 0, sx(width / 2), size), fill=(220, 72, 72, 210), width=1)
    if median_center is not None:
        draw.line((sx(median_center), 0, sx(median_center), size), fill=(80, 198, 222, 220), width=1)
    if median_anchor is not None:
        draw.line((sx(median_anchor[0]), 0, sx(median_anchor[0]), size), fill=(218, 96, 255, 220), width=1)
    baseline = policy.get("runtimeBaselineY")
    if baseline is not None:
        draw.line((0, sy(float(baseline)), size, sy(float(baseline))), fill=(92, 181, 96, 210), width=1)
    bottom_target = policy.get("bottomY")
    if bottom_target is not None:
        draw.line((0, sy(float(bottom_target)), size, sy(float(bottom_target))), fill=(255, 195, 64, 220), width=1)
    bbox = stat.get("bbox")
    if bbox:
        x0, y0, x1, y1 = bbox
        drift = 0.0 if median_center is None else float(stat["centerX"]) - median_center
        color = (255, 210, 68, 230) if abs(drift) > 5 else (134, 226, 150, 230)
        draw.rectangle((sx(x0), sy(y0), sx(x1), sy(y1)), outline=color, width=1)
        draw.line((sx(float(stat["centerX"])), 0, sx(float(stat["centerX"])), size), fill=(255, 230, 76, 220), width=1)
        draw.text((5, 18), f"bbox {drift:+.1f}", fill=(255, 255, 255))
    if median_anchor is not None and stat.get("rootAnchorX") is not None:
        root_x = sx(float(stat["rootAnchorX"]))
        root_y = sy(float(stat["rootAnchorY"]))
        anchor_dx = float(stat["rootAnchorX"]) - median_anchor[0]
        draw.ellipse((root_x - 3, root_y - 3, root_x + 3, root_y + 3), outline=(255, 96, 255, 240), width=2)
        draw.text((5, 32), f"body {anchor_dx:+.1f}", fill=(255, 210, 255))
    draw.rectangle((0, 0, size - 1, size - 1), outline=(15, 17, 20), width=1)
    draw.text((5, 4), str(index), fill=(255, 255, 255))
    return cell.convert("RGB")


def write_alignment_overlay(
    path: Path,
    frames: list[Image.Image],
    stats: list[dict[str, Any]],
    policy: dict[str, Any],
) -> None:
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


def write_drift_report(
    path: Path,
    entry: dict[str, Any],
    stats: list[dict[str, Any]],
    polish_info: dict[str, Any] | None = None,
) -> dict[str, Any]:
    policy = entry.get("centeringPolicy") or {}
    centers = [stat["centerX"] for stat in stats if stat.get("centerX") is not None]
    anchors_x = [stat["rootAnchorX"] for stat in stats if stat.get("rootAnchorX") is not None]
    anchors_y = [stat["rootAnchorY"] for stat in stats if stat.get("rootAnchorY") is not None]
    median_center = statistics.median(centers) if centers else None
    median_anchor_x = statistics.median(anchors_x) if anchors_x else None
    median_anchor_y = statistics.median(anchors_y) if anchors_y else None
    bottom_target = policy.get("bottomY")
    report_frames = []
    for stat in stats:
        center = stat.get("centerX")
        anchor_x = stat.get("rootAnchorX")
        anchor_y = stat.get("rootAnchorY")
        bottom = stat.get("bottom")
        report_frames.append({
            **stat,
            "centerDeltaFromMedian": round(float(center) - float(median_center), 2)
            if center is not None and median_center is not None else None,
            "rootAnchorDeltaXFromMedian": round(float(anchor_x) - float(median_anchor_x), 2)
            if anchor_x is not None and median_anchor_x is not None else None,
            "rootAnchorDeltaYFromMedian": round(float(anchor_y) - float(median_anchor_y), 2)
            if anchor_y is not None and median_anchor_y is not None else None,
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
        "drift": drift_summary(stats),
        "medianCenterX": round(float(median_center), 2) if median_center is not None else None,
        "medianRootAnchorX": round(float(median_anchor_x), 2) if median_anchor_x is not None else None,
        "medianRootAnchorY": round(float(median_anchor_y), 2) if median_anchor_y is not None else None,
        "polish": polish_info,
        "frames": report_frames,
    }
    write_json(path, report)
    return report


def write_artifacts(
    entry: dict[str, Any],
    frames: list[Image.Image],
    runtime_info: dict[str, Any] | None = None,
    polish_info: dict[str, Any] | None = None,
) -> dict[str, Any]:
    policy = entry.get("centeringPolicy") or {}
    stats = analyze_frames(frames, policy)
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
        "centeringPolicy": policy,
        "runtimeOutputs": info["outputs"],
        "runtimeFrameStats": stats,
        "polish": polish_info,
        "alignmentOverlayPath": rel_path(derived["alignmentOverlayPath"]),
        "driftReportPath": rel_path(derived["driftReportPath"]),
    }
    write_json(repo_path(entry["metadataPath"]), metadata)
    write_preview(repo_path(entry["previewPath"]), frames, int(entry["fps"]))
    write_contact_sheet(repo_path(entry["contactSheetPath"]), frames)
    write_alignment_overlay(derived["alignmentOverlayPath"], frames, stats, policy)
    write_drift_report(derived["driftReportPath"], entry, stats, polish_info)
    return {
        "metadataPath": entry["metadataPath"],
        "previewPath": entry["previewPath"],
        "contactSheetPath": entry["contactSheetPath"],
        "alignmentOverlayPath": rel_path(derived["alignmentOverlayPath"]),
        "driftReportPath": rel_path(derived["driftReportPath"]),
    }
