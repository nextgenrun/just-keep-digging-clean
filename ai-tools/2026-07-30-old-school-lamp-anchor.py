"""Lamp-specific anchor registration layered over the shared Fire Light core."""

from __future__ import annotations

import importlib.util
import math
from pathlib import Path
from typing import Any

import numpy as np
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
    "old_school_lamp_shared_anchor_core",
)


def top_left_source_anchor(
    image: Image.Image,
    sheet: dict[str, Any],
) -> tuple[float, float]:
    light = CORE.luminance(image)
    weights = np.maximum(light - float(sheet["rootLuminanceFloor"]), 0.0) ** float(
        sheet["rootWeightPower"]
    )
    ys, xs = np.indices(weights.shape)
    supported = weights > 0
    if not np.any(supported):
        return ((image.width - 1) / 2, (image.height - 1) / 2)
    distances = xs + ys
    cutoff = float(np.quantile(
        distances[supported],
        float(sheet["topLeftRootDistanceQuantile"]),
    ))
    root_weights = weights * (distances <= cutoff)
    total = float(root_weights.sum())
    if total <= 0:
        return ((image.width - 1) / 2, (image.height - 1) / 2)
    return (
        float((xs * root_weights).sum() / total),
        float((ys * root_weights).sum() / total),
    )


def measure(
    image: Image.Image,
    mode: str,
    sheet: dict[str, Any],
) -> tuple[float, float]:
    if mode == "top-left-source":
        return top_left_source_anchor(image, sheet)
    return CORE.measure_anchor(image, mode, sheet)


def group_report(
    frames: list[Image.Image],
    policy: dict[str, Any],
    sheet: dict[str, Any],
    columns: int,
    targets: dict[str, tuple[int, int]],
) -> list[dict[str, Any]]:
    grouped: dict[str, list[tuple[float, float]]] = {}
    for index, frame in enumerate(frames):
        name = CORE.group_name(index, policy["grouping"], columns)
        grouped.setdefault(name, []).append(
            measure(frame, policy["anchorMode"], sheet)
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
    if policy["anchorMode"] != "top-left-source":
        return CORE.polish_frames(frames, policy, sheet, limits, columns)
    before = [measure(frame, policy["anchorMode"], sheet) for frame in frames]
    targets = CORE.derive_targets(before, policy["grouping"], columns)
    polished = []
    frame_reports = []
    for index, (frame, anchor) in enumerate(zip(frames, before)):
        group = CORE.group_name(index, policy["grouping"], columns)
        target = targets[group]
        shift_x = int(round(target[0] - anchor[0]))
        shift_y = int(round(target[1] - anchor[1]))
        if max(abs(shift_x), abs(shift_y)) > int(limits["maximumShiftPx"]):
            raise AssertionError(f"{policy['id']} frame {index} exceeds shift limit")
        result = CORE.translate_frame(
            frame,
            shift_x,
            shift_y,
            int(sheet["safeBorderPx"]),
        )
        source_energy = CORE.light_energy(frame, sheet)
        result_energy = CORE.light_energy(result, sheet)
        loss = max(0.0, 1.0 - result_energy / max(source_energy, 1e-9))
        if loss > float(limits["maximumEnergyLossRatio"]):
            raise AssertionError(f"{policy['id']} frame {index} loses {loss:.4%}")
        after = measure(result, policy["anchorMode"], sheet)
        polished.append(result)
        frame_reports.append({
            "frame": index,
            "group": group,
            "sourceAnchorPx": [round(anchor[0], 4), round(anchor[1], 4)],
            "targetAnchorPx": list(target),
            "shiftPx": [shift_x, shift_y],
            "polishedAnchorPx": [round(after[0], 4), round(after[1], 4)],
            "energyLossRatio": round(loss, 8),
            "sourcePixelSha256": CORE.pixel_sha256(frame),
            "polishedPixelSha256": CORE.pixel_sha256(result),
        })
    report = {
        "policy": "integer-translation-fixed-group-anchor",
        "anchorMode": policy["anchorMode"],
        "grouping": policy["grouping"],
        "safeBorderPx": int(sheet["safeBorderPx"]),
        "groupTargetsPx": {name: list(value) for name, value in targets.items()},
        "beforeGroups": group_report(frames, policy, sheet, columns, targets),
        "afterGroups": group_report(polished, policy, sheet, columns, targets),
        "frames": frame_reports,
    }
    return polished, report
