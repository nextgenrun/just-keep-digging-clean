from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image

from piskel_frame_polish import detect_lower_body_anchor, polish_frames


MIN_CHROMA_COMPONENT_PX = 32
CHROMA_COMPONENT_AREA_FRACTION = 0.00012
ALPHA_COMPONENT_THRESHOLD = 12


def file_digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def edge_opaque_pixels(frame: Image.Image) -> int:
    alpha = np.asarray(frame.getchannel("A"))
    return int(
        np.count_nonzero(alpha[0])
        + np.count_nonzero(alpha[-1])
        + np.count_nonzero(alpha[:, 0])
        + np.count_nonzero(alpha[:, -1])
    )


def hidden_rgb_pixels(frame: Image.Image) -> int:
    rgba = np.asarray(frame.convert("RGBA"))
    hidden = (
        (rgba[:, :, 3] == 0)
        & np.any(rgba[:, :, :3] != 0, axis=2)
    )
    return int(np.count_nonzero(hidden))


def save_lossless_frames(
    frames: list[Image.Image],
    runtime_paths: list[Path],
    review_paths: list[Path],
) -> None:
    for frame, runtime_path, review_path in zip(
        frames,
        runtime_paths,
        review_paths,
    ):
        frame.save(
            runtime_path,
            "WEBP",
            lossless=True,
            quality=100,
            method=4,
            exact=True,
        )
        frame.save(
            review_path,
            "WEBP",
            lossless=True,
            quality=100,
            method=4,
            exact=True,
        )


def activity_asset_records(
    root: Path,
    singles_root: Path,
    slug: str,
    activity_ids: tuple[str, ...],
    frames: list[Image.Image],
    stats: list[dict[str, Any]],
) -> dict[str, Any]:
    records = {}
    for activity_id, _source_frame, stat in zip(activity_ids, frames, stats):
        path = singles_root / f"{slug}-{activity_id}.webp"
        frame = Image.open(path).convert("RGBA")
        chroma = chroma_leak_report(frame)
        records[activity_id] = {
            "path": path.relative_to(root).as_posix(),
            "sha256": file_digest(path),
            "dimensions": list(frame.size),
            "alphaBounds": list(frame.getbbox() or (0, 0, 0, 0)),
            "mainSilhouetteHeightPx": main_alpha_height(frame),
            "rootAnchor": [stat["rootAnchorX"], stat["rootAnchorY"]],
            "bottom": stat["bottom"],
            "edgeOpaquePixels": edge_opaque_pixels(frame),
            "hiddenRgbPixels": hidden_rgb_pixels(frame),
            "largeGreenLeakPixels": chroma["largeGreenLeakPixels"],
        }
    return records


def _rgba_array(frame: Image.Image) -> np.ndarray:
    return np.asarray(frame.convert("RGBA")).copy()


def _green_masks(rgba: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    red = rgba[:, :, 0].astype(np.int16)
    green = rgba[:, :, 1].astype(np.int16)
    blue = rgba[:, :, 2].astype(np.int16)
    alpha = rgba[:, :, 3]
    strict = (
        (alpha > 8)
        & (green >= 140)
        & ((green - red) >= 80)
        & ((green - blue) >= 60)
        & (green > red * 1.7)
        & (green > blue * 1.35)
    )
    relaxed = (
        (alpha > 0)
        & (green >= 70)
        & ((green - red) >= 35)
        & ((green - blue) >= 20)
        & (green > red * 1.25)
        & (green > blue * 1.10)
    )
    return strict, relaxed


def _component_area_threshold(width: int, height: int) -> int:
    return max(
        MIN_CHROMA_COMPONENT_PX,
        round(width * height * CHROMA_COMPONENT_AREA_FRACTION),
    )


def _large_component_mask(
    mask: np.ndarray,
) -> tuple[np.ndarray, list[dict[str, Any]], int]:
    height, width = mask.shape
    area_threshold = _component_area_threshold(width, height)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(
        mask.astype(np.uint8),
        8,
    )
    selected = np.zeros_like(mask, dtype=bool)
    components = []
    for index in range(1, count):
        x, y, component_width, component_height, area = (
            int(value) for value in stats[index]
        )
        if area < area_threshold:
            continue
        selected |= labels == index
        components.append({
            "area": area,
            "bbox": [x, y, component_width, component_height],
        })
    return selected, components, area_threshold


def chroma_leak_report(frame: Image.Image) -> dict[str, Any]:
    rgba = _rgba_array(frame)
    strict, _ = _green_masks(rgba)
    large_mask, components, threshold = _large_component_mask(strict)
    return {
        "areaThresholdPx": threshold,
        "strictGreenPixels": int(np.count_nonzero(strict)),
        "largeGreenLeakPixels": int(np.count_nonzero(large_mask)),
        "largeGreenComponents": components,
    }


def remove_chroma_leaks(
    frame: Image.Image,
) -> tuple[Image.Image, dict[str, Any]]:
    rgba = _rgba_array(frame)
    hidden_before = int(np.count_nonzero(
        (rgba[:, :, 3] == 0)
        & np.any(rgba[:, :, :3] != 0, axis=2)
    ))
    strict, relaxed = _green_masks(rgba)
    large_mask, components, threshold = _large_component_mask(strict)
    if components:
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        halo = cv2.dilate(large_mask.astype(np.uint8), kernel, iterations=1)
        removal_mask = large_mask | ((halo > 0) & relaxed)
        rgba[removal_mask] = 0
    else:
        removal_mask = np.zeros_like(strict, dtype=bool)
    rgba[rgba[:, :, 3] == 0] = 0
    cleaned = Image.fromarray(rgba, "RGBA")
    after = chroma_leak_report(cleaned)
    return cleaned, {
        "areaThresholdPx": threshold,
        "largeGreenComponentsBefore": components,
        "largeGreenLeakPixelsBefore": int(np.count_nonzero(large_mask)),
        "removedPixels": int(np.count_nonzero(removal_mask)),
        "hiddenRgbPixelsBefore": hidden_before,
        "hiddenRgbPixelsAfter": hidden_rgb_pixels(cleaned),
        "largeGreenLeakPixelsAfter": after["largeGreenLeakPixels"],
    }


def main_alpha_bounds(
    frame: Image.Image,
    alpha_threshold: int = ALPHA_COMPONENT_THRESHOLD,
) -> tuple[int, int, int, int] | None:
    alpha = np.asarray(frame.convert("RGBA").getchannel("A"))
    count, _, stats, _ = cv2.connectedComponentsWithStats(
        (alpha > alpha_threshold).astype(np.uint8),
        8,
    )
    if count <= 1:
        return None
    index = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    x, y, width, height = (
        int(value) for value in stats[index, :4]
    )
    return x, y, x + width, y + height


def main_alpha_height(frame: Image.Image) -> int:
    bounds = main_alpha_bounds(frame)
    return 0 if not bounds else bounds[3] - bounds[1]


def normalized_main_height(
    frame: Image.Image,
    target_canvas_height: int,
) -> float:
    return (
        main_alpha_height(frame)
        * target_canvas_height
        / frame.height
    )


def lower_body_anchor(
    frame: Image.Image,
) -> tuple[float, float]:
    anchor = detect_lower_body_anchor(frame, {
        "lowerBodyStartFraction": 0.42,
        "anchorAlphaThreshold": 32,
    })
    if not anchor:
        raise ValueError("frame has no lower-body anchor")
    return anchor[0], anchor[1]


def normalized_lower_body_anchor(
    frame: Image.Image,
    target_size: tuple[int, int],
) -> tuple[float, float]:
    anchor_x, anchor_y = lower_body_anchor(frame)
    return (
        anchor_x * target_size[0] / frame.width,
        anchor_y * target_size[1] / frame.height,
    )


def fixed_scale_polish(
    frames: list[Image.Image],
    scale: float,
    target_anchor: tuple[float, float],
) -> list[Image.Image]:
    entry = {"centeringPolicy": {
        "anchorMode": "alpha-lower-body",
        "lowerBodyStartFraction": 0.42,
        "anchorAlphaThreshold": 32,
        "anchorSmoothingWindow": 1,
        "targetAnchorX": target_anchor[0],
        "bottomY": target_anchor[1],
        "targetReferenceHeightPx": 1,
        "minUniformScale": scale,
        "maxUniformScale": scale,
    }}
    return polish_frames(entry, frames)[0]
