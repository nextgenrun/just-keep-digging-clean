"""Anchor measurement and pixel-safe registration for Fire Light Piskel frames."""

from __future__ import annotations

import hashlib
import math
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image


def file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pixel_sha256(image: Image.Image) -> str:
    return hashlib.sha256(image.convert("RGBA").tobytes()).hexdigest()


def split_atlas(
    atlas: Image.Image,
    frame_width: int,
    frame_height: int,
    columns: int,
    frame_count: int,
) -> list[Image.Image]:
    return [
        atlas.crop((
            (index % columns) * frame_width,
            (index // columns) * frame_height,
            (index % columns + 1) * frame_width,
            (index // columns + 1) * frame_height,
        )).convert("RGBA")
        for index in range(frame_count)
    ]


def pack_atlas(
    frames: list[Image.Image],
    columns: int,
    rows: int,
    background: tuple[int, int, int, int] = (0, 0, 0, 255),
) -> Image.Image:
    width, height = frames[0].size
    atlas = Image.new("RGBA", (width * columns, height * rows), background)
    for index, frame in enumerate(frames):
        atlas.paste(frame, ((index % columns) * width, (index // columns) * height))
    return atlas


def luminance(image: Image.Image) -> np.ndarray:
    rgb = np.asarray(image.convert("RGB"), dtype=np.float64)
    return 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]


def luminous_core_anchor(image: Image.Image, sheet: dict[str, Any]) -> tuple[float, float]:
    light = luminance(image)
    weights = np.maximum(light - float(sheet["luminanceFloor"]), 0.0) ** float(
        sheet["coreWeightPower"]
    )
    total = float(weights.sum())
    if total <= 0:
        return ((image.width - 1) / 2, (image.height - 1) / 2)
    ys, xs = np.indices(weights.shape)
    return (
        float((xs * weights).sum() / total),
        float((ys * weights).sum() / total),
    )


def source_root_anchor(image: Image.Image, sheet: dict[str, Any]) -> tuple[float, float]:
    light = luminance(image)
    weights = np.maximum(light - float(sheet["rootLuminanceFloor"]), 0.0) ** float(
        sheet["rootWeightPower"]
    )
    row_energy = weights.sum(axis=1)
    total = float(row_energy.sum())
    if total <= 0:
        return ((image.width - 1) / 2, (image.height - 1) / 2)
    root_y = int(np.searchsorted(
        np.cumsum(row_energy),
        total * float(sheet["rootRowEnergyQuantile"]),
    ))
    ys, xs = np.indices(weights.shape)
    band = (
        (ys >= max(0, root_y - int(sheet["rootBandBeforePx"])))
        & (ys <= min(image.height - 1, root_y + int(sheet["rootBandAfterPx"])))
    )
    band_weights = weights * band
    band_total = float(band_weights.sum())
    root_x = (
        float((xs * band_weights).sum() / band_total)
        if band_total > 0
        else (image.width - 1) / 2
    )
    return (root_x, float(root_y))


def measure_anchor(
    image: Image.Image,
    mode: str,
    sheet: dict[str, Any],
) -> tuple[float, float]:
    if mode == "source-root":
        return source_root_anchor(image, sheet)
    if mode == "luminous-core":
        return luminous_core_anchor(image, sheet)
    raise ValueError(f"Unsupported Fire Light anchor mode: {mode}")


def group_name(index: int, grouping: str, columns: int) -> str:
    if grouping == "all":
        return "all"
    if grouping == "rows":
        return f"row-{index // columns}"
    raise ValueError(f"Unsupported Fire Light grouping: {grouping}")


def derive_targets(
    anchors: list[tuple[float, float]],
    grouping: str,
    columns: int,
) -> dict[str, tuple[int, int]]:
    grouped: dict[str, list[tuple[float, float]]] = {}
    for index, anchor in enumerate(anchors):
        grouped.setdefault(group_name(index, grouping, columns), []).append(anchor)
    return {
        name: (
            int(round(float(np.median([entry[0] for entry in entries])))),
            int(round(float(np.median([entry[1] for entry in entries])))),
        )
        for name, entries in grouped.items()
    }


def translate_frame(
    image: Image.Image,
    shift_x: int,
    shift_y: int,
    safe_border: int,
) -> Image.Image:
    source = np.asarray(image.convert("RGBA"), dtype=np.uint8)
    height, width = source.shape[:2]
    output = np.zeros_like(source)
    output[:, :, 3] = 255
    source_x0 = max(0, -shift_x)
    source_y0 = max(0, -shift_y)
    source_x1 = min(width, width - shift_x)
    source_y1 = min(height, height - shift_y)
    if source_x1 > source_x0 and source_y1 > source_y0:
        target_x0 = source_x0 + shift_x
        target_y0 = source_y0 + shift_y
        output[
            target_y0:target_y0 + source_y1 - source_y0,
            target_x0:target_x0 + source_x1 - source_x0,
        ] = source[source_y0:source_y1, source_x0:source_x1]
    if safe_border > 0:
        output[:safe_border, :, :3] = 0
        output[-safe_border:, :, :3] = 0
        output[:, :safe_border, :3] = 0
        output[:, -safe_border:, :3] = 0
        output[:safe_border, :, 3] = 255
        output[-safe_border:, :, 3] = 255
        output[:, :safe_border, 3] = 255
        output[:, -safe_border:, 3] = 255
    return Image.fromarray(output, "RGBA")


def light_energy(image: Image.Image, sheet: dict[str, Any]) -> float:
    weights = np.maximum(
        luminance(image) - float(sheet["luminanceFloor"]),
        0.0,
    ) ** float(sheet["energyWeightPower"])
    return float(weights.sum())


def _group_report(
    frames: list[Image.Image],
    policy: dict[str, Any],
    sheet: dict[str, Any],
    columns: int,
    targets: dict[str, tuple[int, int]],
) -> list[dict[str, Any]]:
    grouped: dict[str, list[tuple[float, float]]] = {}
    for index, frame in enumerate(frames):
        name = group_name(index, policy["grouping"], columns)
        grouped.setdefault(name, []).append(
            measure_anchor(frame, policy["anchorMode"], sheet)
        )
    reports = []
    for name, anchors in grouped.items():
        target = targets[name]
        errors = [math.hypot(x - target[0], y - target[1]) for x, y in anchors]
        reports.append({
            "id": name,
            "targetAnchorPx": list(target),
            "rangeXPx": round(max(x for x, _y in anchors) - min(x for x, _y in anchors), 4),
            "rangeYPx": round(max(y for _x, y in anchors) - min(y for _x, y in anchors), 4),
            "maximumAnchorErrorPx": round(max(errors), 4),
        })
    return reports


def polish_frames(
    frames: list[Image.Image],
    policy: dict[str, Any],
    sheet: dict[str, Any],
    limits: dict[str, Any],
    columns: int,
) -> tuple[list[Image.Image], dict[str, Any]]:
    before = [measure_anchor(frame, policy["anchorMode"], sheet) for frame in frames]
    targets = derive_targets(before, policy["grouping"], columns)
    polished: list[Image.Image] = []
    frame_reports: list[dict[str, Any]] = []
    maximum_shift = int(limits["maximumShiftPx"])
    maximum_loss = float(limits["maximumEnergyLossRatio"])
    for index, (frame, anchor) in enumerate(zip(frames, before)):
        group = group_name(index, policy["grouping"], columns)
        target = targets[group]
        shift_x = int(round(target[0] - anchor[0]))
        shift_y = int(round(target[1] - anchor[1]))
        if max(abs(shift_x), abs(shift_y)) > maximum_shift:
            raise AssertionError(f"{policy['id']} frame {index} exceeds shift limit")
        result = translate_frame(frame, shift_x, shift_y, int(sheet["safeBorderPx"]))
        source_energy = light_energy(frame, sheet)
        result_energy = light_energy(result, sheet)
        loss = max(0.0, 1.0 - result_energy / max(source_energy, 1e-9))
        if loss > maximum_loss:
            raise AssertionError(
                f"{policy['id']} frame {index} loses {loss:.4%} light energy"
            )
        after = measure_anchor(result, policy["anchorMode"], sheet)
        polished.append(result)
        frame_reports.append({
            "frame": index,
            "group": group,
            "sourceAnchorPx": [round(anchor[0], 4), round(anchor[1], 4)],
            "targetAnchorPx": list(target),
            "shiftPx": [shift_x, shift_y],
            "polishedAnchorPx": [round(after[0], 4), round(after[1], 4)],
            "energyLossRatio": round(loss, 8),
            "sourcePixelSha256": pixel_sha256(frame),
            "polishedPixelSha256": pixel_sha256(result),
        })
    return polished, {
        "policy": "integer-translation-fixed-group-anchor",
        "anchorMode": policy["anchorMode"],
        "grouping": policy["grouping"],
        "safeBorderPx": int(sheet["safeBorderPx"]),
        "groupTargetsPx": {name: list(value) for name, value in targets.items()},
        "beforeGroups": _group_report(frames, policy, sheet, columns, targets),
        "afterGroups": _group_report(polished, policy, sheet, columns, targets),
        "frames": frame_reports,
    }


def validate_polish_report(report: dict[str, Any], limits: dict[str, Any]) -> None:
    maximum_error = float(limits["maximumAfterAnchorErrorPx"])
    maximum_range = float(limits["maximumAfterGroupRangePx"])
    for group in report["afterGroups"]:
        if group["maximumAnchorErrorPx"] > maximum_error:
            raise AssertionError(f"{group['id']} anchor error exceeds {maximum_error}")
        if max(group["rangeXPx"], group["rangeYPx"]) > maximum_range:
            raise AssertionError(f"{group['id']} anchor range exceeds {maximum_range}")
