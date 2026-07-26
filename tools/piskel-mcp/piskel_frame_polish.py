from __future__ import annotations

import math
import statistics
from typing import Any

from PIL import Image


def detect_legacy_core_anchor(frame: Image.Image) -> tuple[float, float, int] | None:
    rgba = frame.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    total_weight = total_x = total_y = 0.0
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


def detect_lower_body_anchor(
    frame: Image.Image,
    policy: dict[str, Any],
) -> tuple[float, float, int] | None:
    bbox = frame.getbbox()
    if not bbox:
        return None
    x0, y0, x1, y1 = bbox
    start_fraction = float(policy.get("lowerBodyStartFraction", 0.35))
    alpha_threshold = int(policy.get("anchorAlphaThreshold", 32))
    start_y = max(y0, min(y1 - 1, round(y0 + (y1 - y0) * start_fraction)))
    pixels = frame.convert("RGBA").load()
    total_weight = total_x = 0.0
    count = 0
    for y in range(start_y, y1):
        for x in range(x0, x1):
            alpha = pixels[x, y][3]
            if alpha < alpha_threshold:
                continue
            total_weight += alpha
            total_x += x * alpha
            count += 1
    if count < 6 or total_weight <= 0:
        return None
    return total_x / total_weight, float(y1), count


def detect_frame_anchor(
    frame: Image.Image,
    policy: dict[str, Any] | None = None,
) -> tuple[float, float, int, str] | None:
    resolved = policy or {}
    mode = resolved.get("anchorMode", "legacy-core")
    anchor = None
    if mode == "alpha-lower-body":
        anchor = detect_lower_body_anchor(frame, resolved)
    elif mode == "legacy-core":
        anchor = detect_legacy_core_anchor(frame)
    bbox = frame.getbbox()
    if anchor:
        return *anchor, mode
    if not bbox:
        return None
    return (bbox[0] + bbox[2]) / 2, float(bbox[3]), 0, "bbox-center"


def frame_stats(
    frame: Image.Image,
    index: int,
    source_name: str | None = None,
    policy: dict[str, Any] | None = None,
) -> dict[str, Any]:
    bbox = frame.getbbox()
    width, height = frame.size
    anchor = detect_frame_anchor(frame, policy)
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
        "bboxWidth": bbox[2] - bbox[0] if bbox else None,
        "bboxHeight": bbox[3] - bbox[1] if bbox else None,
        "centerX": round((bbox[0] + bbox[2]) / 2, 2) if bbox else None,
        "rootAnchorX": round(anchor[0], 2) if anchor else None,
        "rootAnchorY": round(anchor[1], 2) if anchor else None,
        "rootAnchorPixels": anchor[2] if anchor else 0,
        "anchorMode": anchor[3] if anchor else None,
        "bottom": bbox[3] if bbox else None,
        "clipped": bool(bbox and (bbox[0] <= 0 or bbox[1] <= 0 or bbox[2] >= width or bbox[3] >= height)),
        "cornerAlpha": corners,
    }


def analyze_frames(
    frames: list[Image.Image],
    policy: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    return [frame_stats(frame, index, policy=policy) for index, frame in enumerate(frames)]


def _max_median_drift(values: list[float]) -> float:
    if not values:
        return 0.0
    middle = statistics.median(values)
    return max(abs(value - middle) for value in values)


def drift_summary(stats: list[dict[str, Any]]) -> dict[str, Any]:
    centers = [float(stat["centerX"]) for stat in stats if stat.get("centerX") is not None]
    roots = [float(stat["rootAnchorX"]) for stat in stats if stat.get("rootAnchorX") is not None]
    bottoms = [float(stat["bottom"]) for stat in stats if stat.get("bottom") is not None]
    heights = [float(stat["bboxHeight"]) for stat in stats if stat.get("bboxHeight") is not None]
    use_root = len(roots) >= max(2, math.ceil(len(stats) * 0.75))
    modes = [stat.get("anchorMode") for stat in stats if stat.get("anchorMode")]
    return {
        "anchorMode": statistics.mode(modes) if modes else ("root-core" if use_root else "bbox-center"),
        "maxBBoxCenterDriftPx": round(_max_median_drift(centers), 2),
        "maxRootAnchorDriftPx": round(_max_median_drift(roots), 2),
        "maxAnchorDriftPx": round(_max_median_drift(roots if use_root else centers), 2),
        "maxBottomDriftPx": round(_max_median_drift(bottoms), 2),
        "medianBBoxHeightPx": round(statistics.median(heights), 2) if heights else 0,
    }


def _moving_median(values: list[float], window: int) -> list[float]:
    resolved_window = max(1, int(window))
    radius = resolved_window // 2
    return [
        statistics.median(values[max(0, index - radius):min(len(values), index + radius + 1)])
        for index in range(len(values))
    ]


def _shift_frame(frame: Image.Image, dx: int, dy: int) -> Image.Image:
    width, height = frame.size
    canvas = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    dest_x = max(0, dx)
    dest_y = max(0, dy)
    src_x = max(0, -dx)
    src_y = max(0, -dy)
    copy_width = min(width - src_x, width - dest_x)
    copy_height = min(height - src_y, height - dest_y)
    if copy_width > 0 and copy_height > 0:
        crop = frame.crop((src_x, src_y, src_x + copy_width, src_y + copy_height))
        canvas.alpha_composite(crop, (dest_x, dest_y))
    return canvas


def _place_scaled_frame(
    frame: Image.Image,
    scale: float,
    source_anchor: tuple[float, float],
    target_anchor: tuple[float, float],
) -> Image.Image:
    width, height = frame.size
    scaled_size = (max(1, round(width * scale)), max(1, round(height * scale)))
    resized = frame if scaled_size == frame.size else frame.resize(scaled_size, Image.Resampling.LANCZOS)
    offset_x = round(target_anchor[0] - source_anchor[0] * scale)
    offset_y = round(target_anchor[1] - source_anchor[1] * scale)
    canvas = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    source_x = max(0, -offset_x)
    source_y = max(0, -offset_y)
    dest_x = max(0, offset_x)
    dest_y = max(0, offset_y)
    copy_width = min(resized.width - source_x, width - dest_x)
    copy_height = min(resized.height - source_y, height - dest_y)
    if copy_width > 0 and copy_height > 0:
        crop = resized.crop((source_x, source_y, source_x + copy_width, source_y + copy_height))
        canvas.alpha_composite(crop, (dest_x, dest_y))
    return canvas


def _uniform_reference_scale(
    stats: list[dict[str, Any]],
    policy: dict[str, Any],
) -> float:
    target_height = policy.get("targetReferenceHeightPx")
    if target_height is None:
        return 1.0
    indices = policy.get("referenceFrames") or list(range(len(stats)))
    heights = [
        float(stats[index]["bboxHeight"])
        for index in indices
        if 0 <= int(index) < len(stats) and stats[int(index)].get("bboxHeight")
    ]
    if not heights:
        return 1.0
    requested = float(target_height) / statistics.median(heights)
    minimum = float(policy.get("minUniformScale", requested))
    maximum = float(policy.get("maxUniformScale", requested))
    return max(minimum, min(maximum, requested))


def polish_frames(
    entry: dict[str, Any],
    frames: list[Image.Image],
) -> tuple[list[Image.Image], dict[str, Any]]:
    policy = entry.get("centeringPolicy") or {}
    before_stats = analyze_frames(frames, policy)
    anchors_x = [float(stat["rootAnchorX"]) for stat in before_stats if stat.get("rootAnchorX") is not None]
    anchors_y = [float(stat["rootAnchorY"]) for stat in before_stats if stat.get("rootAnchorY") is not None]
    if len(anchors_x) != len(frames) or len(anchors_y) != len(frames):
        return [frame.copy() for frame in frames], {"skipped": True, "reason": "missing frame anchors"}
    smooth_window = int(policy.get("anchorSmoothingWindow", 1))
    smooth_x = _moving_median(anchors_x, smooth_window)
    smooth_y = _moving_median(anchors_y, smooth_window)
    target_x = float(policy.get("targetAnchorX", statistics.median(smooth_x)))
    target_y = float(policy.get("bottomY", policy.get("targetAnchorY", statistics.median(smooth_y))))
    scale = _uniform_reference_scale(before_stats, policy)
    polished = []
    shifts = []
    for index, frame in enumerate(frames):
        transformed = _place_scaled_frame(frame, scale, (smooth_x[index], smooth_y[index]), (target_x, target_y))
        bbox = transformed.getbbox()
        if bbox and policy.get("bottomY") is not None:
            transformed = _shift_frame(transformed, 0, round(target_y - bbox[3]))
        polished.append(transformed)
        shifts.append({
            "frame": index,
            "sourceAnchor": [round(anchors_x[index], 2), round(anchors_y[index], 2)],
            "smoothedAnchor": [round(smooth_x[index], 2), round(smooth_y[index], 2)],
            "requestedTarget": [round(target_x, 2), round(target_y, 2)],
        })
    after_stats = analyze_frames(polished, policy)
    return polished, {
        "skipped": False,
        "anchorMode": drift_summary(after_stats)["anchorMode"],
        "targetAnchor": [round(target_x, 2), round(target_y, 2)],
        "uniformScale": round(scale, 6),
        "before": drift_summary(before_stats),
        "after": drift_summary(after_stats),
        "shifts": shifts,
    }
