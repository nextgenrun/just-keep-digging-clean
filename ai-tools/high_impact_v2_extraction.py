"""Auditable chroma, component, and master-space extraction helpers."""

from __future__ import annotations

from typing import Any

import cv2
import numpy as np
from PIL import Image


VISIBLE_ALPHA = 12
MIN_COMPONENT_AREA = 32
MAX_CENTER_DISTANCE_CELLS = 0.48
MIN_AMBIGUITY_MARGIN_CELLS = 0.12
MIN_ASSIGNMENT_COVERAGE = 0.97
EDGE_SCAN_PX = 3
STRAIGHT_EDGE_RUN_PX = 20
NEUTRAL_KEY_SPREAD_MAX = 24
MIN_MASTER_CHROMA_COVERAGE = 0.25
MIN_DOMINANT_CHROMA_MARGIN = 0.05


def _strong_key_family(key: tuple[int, int, int]) -> str | None:
    red, green, blue = key
    if red >= 180 and blue >= 180 and min(red, blue) - green >= 60:
        return "magenta"
    if green >= 170 and green - max(red, blue) >= 70:
        return "green"
    return None


def _strong_chroma_masks(image: Image.Image) -> dict[str, np.ndarray]:
    rgb = np.asarray(image.convert("RGBA"), dtype=np.uint8)[:, :, :3].astype(np.int16)
    red, green, blue = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    return {
        "magenta": (
            (red >= 180)
            & (blue >= 180)
            & ((np.minimum(red, blue) - green) >= 60)
        ),
        "green": (
            (green >= 170)
            & ((green - np.maximum(red, blue)) >= 70)
        ),
    }


def strong_chroma_mask(image: Image.Image, family: str) -> np.ndarray:
    """Return the exact strong-family mask used by selection and preflight."""
    masks = _strong_chroma_masks(image)
    if family not in masks:
        raise RuntimeError(f"Unknown chroma family: {family}")
    return masks[family]


def select_master_chroma_key(
    image: Image.Image,
    sampled_key: tuple[int, int, int],
) -> tuple[tuple[int, int, int], dict[str, Any]]:
    """Override only neutral border samples backed by dominant master chroma."""
    sampled = tuple(int(channel) for channel in sampled_key)
    sampled_family = _strong_key_family(sampled)
    diagnostics: dict[str, Any] = {
        "borderSampledKey": list(sampled),
        "selectedKey": list(sampled),
        "sampledFamily": sampled_family,
        "selectedFamily": sampled_family,
        "override": False,
        "reason": "saturated-border-key" if sampled_family else "retained-border-key",
    }
    if sampled_family:
        return sampled, diagnostics
    if max(sampled) - min(sampled) > NEUTRAL_KEY_SPREAD_MAX:
        return sampled, diagnostics

    masks = _strong_chroma_masks(image)
    total = max(1, image.width * image.height)
    counts = {family: int(np.count_nonzero(mask)) for family, mask in masks.items()}
    dominant, runner_up = sorted(counts, key=counts.get, reverse=True)
    coverage = counts[dominant] / total
    margin = (counts[dominant] - counts[runner_up]) / total
    diagnostics["candidateCoverage"] = {
        family: round(count / total, 6) for family, count in counts.items()
    }
    if coverage < MIN_MASTER_CHROMA_COVERAGE or margin < MIN_DOMINANT_CHROMA_MARGIN:
        diagnostics["reason"] = "neutral-border-without-dominant-master-chroma"
        return sampled, diagnostics

    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8)
    mask = masks[dominant]
    selected = tuple(
        int(round(float(np.median(rgba[:, :, channel][mask]))))
        for channel in range(3)
    )
    diagnostics.update({
        "selectedKey": list(selected),
        "selectedFamily": dominant,
        "override": True,
        "reason": "neutral-border-dominant-master-chroma",
    })
    return selected, diagnostics


def _longest_run(values: np.ndarray) -> int:
    longest = current = 0
    for value in values:
        current = current + 1 if value else 0
        longest = max(longest, current)
    return longest


def raw_crop_stats(image: Image.Image) -> dict[str, Any]:
    """Measure clipping before any alpha bbox crop/recenter can hide it."""
    alpha = np.asarray(image.getchannel("A"), dtype=np.uint8)
    visible = alpha > 3
    ys, xs = np.where(visible)
    if not len(xs):
        return {
            "visiblePixels": 0,
            "clearance": None,
            "centroid": None,
            "edgeRunMax": 0,
            "warnings": ["master-space-empty"],
        }
    bbox = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    clearance = {
        "left": bbox[0],
        "top": bbox[1],
        "right": image.width - bbox[2],
        "bottom": image.height - bbox[3],
    }
    scan = min(EDGE_SCAN_PX, image.width, image.height)
    edge_runs = [
        _longest_run(np.any(visible[:, :scan], axis=1)),
        _longest_run(np.any(visible[:, -scan:], axis=1)),
        _longest_run(np.any(visible[:scan, :], axis=0)),
        _longest_run(np.any(visible[-scan:, :], axis=0)),
    ]
    warnings: list[str] = []
    for side, value in clearance.items():
        if value == 0:
            warnings.append(f"master-space-alpha-touches-{side}")
    if max(edge_runs) >= STRAIGHT_EDGE_RUN_PX:
        warnings.append("master-space-straight-edge-run")
    return {
        "visiblePixels": int(np.count_nonzero(visible)),
        "bounds": {
            "left": bbox[0],
            "top": bbox[1],
            "right": bbox[2],
            "bottom": bbox[3],
        },
        "clearance": clearance,
        "centroid": {
            "x": round(float(xs.mean()), 3),
            "y": round(float(ys.mean()), 3),
        },
        "edgeRunMax": max(edge_runs),
        "warnings": warnings,
    }


def remove_chroma_with_key(
    cell: Image.Image,
    key: tuple[int, int, int],
    chroma: Any,
    visible_alpha: int,
) -> tuple[Image.Image, list[str]]:
    """Use one trusted master key while preserving faint terminal frames."""
    warnings: list[str] = []
    rgba = cell.convert("RGBA")
    chroma._apply_alpha_to_image(
        rgba,
        key=key,
        tolerance=12,
        spill_cleanup=True,
        soft_matte=True,
        transparent_threshold=12.0,
        opaque_threshold=220.0,
    )
    rgba = chroma._apply_edge_feather(rgba, 1.0)
    visible = int(np.count_nonzero(np.asarray(rgba.getchannel("A")) > visible_alpha))
    if visible < 32:
        warnings.append("chroma-fallback-used")
        rgba = cell.convert("RGBA")
        chroma._apply_alpha_to_image(
            rgba,
            key=key,
            tolerance=6,
            spill_cleanup=True,
            soft_matte=True,
            transparent_threshold=6.0,
            opaque_threshold=96.0,
        )
    return rgba, warnings


def extract_component_cells(
    keyed_master: Image.Image,
    row_bands: list[list[int]],
    columns: int,
    *,
    padding_px: int,
    close_px: int,
) -> list[dict[str, Any]]:
    """Assign retained components once, with distance and ambiguity gates."""
    if close_px <= 0 or close_px % 2 == 0:
        raise RuntimeError(f"Component close kernel must be positive and odd: {close_px}")
    alpha = np.asarray(keyed_master.getchannel("A"), dtype=np.uint8)
    width, height = keyed_master.size
    cell_width = width / columns
    expected = np.asarray([(column + 0.5) * cell_width for column in range(columns)])
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close_px, close_px))
    cells: list[dict[str, Any]] = []

    for row_index, (top, bottom) in enumerate(row_bands):
        if not (0 <= top < bottom <= height):
            raise RuntimeError(f"Invalid component row {row_index}: {(top, bottom)}")
        original = alpha[top:bottom] > VISIBLE_ALPHA
        closed = cv2.morphologyEx(
            np.where(original, 255, 0).astype(np.uint8),
            cv2.MORPH_CLOSE,
            kernel,
        )
        count, _, stats, centroids = cv2.connectedComponentsWithStats(closed, 8)
        groups: list[list[dict[str, Any]]] = [[] for _ in range(columns)]
        retained: list[dict[str, Any]] = []

        for component_id in range(1, count):
            stat = stats[component_id]
            area = int(stat[cv2.CC_STAT_AREA])
            if area < MIN_COMPONENT_AREA:
                continue
            center_x = float(centroids[component_id][0])
            distances = np.abs(expected - center_x)
            order = np.argsort(distances)
            if distances[order[0]] > cell_width * MAX_CENTER_DISTANCE_CELLS:
                raise RuntimeError(
                    f"Component too far from a column: m-row {row_index}, cc {component_id}"
                )
            if distances[order[1]] - distances[order[0]] < (
                cell_width * MIN_AMBIGUITY_MARGIN_CELLS
            ):
                raise RuntimeError(
                    f"Ambiguous component assignment: m-row {row_index}, cc {component_id}"
                )
            record = {
                "id": f"r{row_index + 1}-cc{component_id}",
                "area": area,
                "centroid": {
                    "x": round(center_x, 3),
                    "y": round(float(centroids[component_id][1] + top), 3),
                },
                "bounds": {
                    "left": int(stat[cv2.CC_STAT_LEFT]),
                    "top": int(stat[cv2.CC_STAT_TOP] + top),
                    "width": int(stat[cv2.CC_STAT_WIDTH]),
                    "height": int(stat[cv2.CC_STAT_HEIGHT]),
                },
            }
            groups[int(order[0])].append(record)
            retained.append(record)

        coverage_mask = np.zeros_like(original, dtype=bool)
        for column, group in enumerate(groups):
            if not group:
                raise RuntimeError(f"No component assigned to row {row_index}, column {column}")
            left = min(item["bounds"]["left"] for item in group)
            right = max(item["bounds"]["left"] + item["bounds"]["width"] for item in group)
            local_top = min(item["bounds"]["top"] for item in group) - top
            local_bottom = max(
                item["bounds"]["top"] + item["bounds"]["height"] for item in group
            ) - top
            coverage_mask[local_top:local_bottom, left:right] = True
            bounds = (
                max(0, left - padding_px),
                max(0, top + local_top - padding_px),
                min(width, right + padding_px),
                min(height, top + local_bottom + padding_px),
            )
            cells.append(
                {
                    "image": keyed_master.crop(bounds).convert("RGBA"),
                    "bounds": bounds,
                    "componentIds": [item["id"] for item in group],
                    "componentRecords": group,
                    "assignment": {"row": row_index, "column": column},
                }
            )
        visible_count = int(np.count_nonzero(original))
        covered = int(np.count_nonzero(original & coverage_mask))
        coverage = covered / max(1, visible_count)
        if coverage < MIN_ASSIGNMENT_COVERAGE:
            raise RuntimeError(
                f"Component assignment coverage too low for row {row_index}: {coverage:.4f}"
            )
    return cells
