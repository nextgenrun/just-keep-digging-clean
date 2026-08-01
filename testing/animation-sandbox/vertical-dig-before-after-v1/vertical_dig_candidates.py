"""Build review-only planted vertical-dig candidate frames."""

from __future__ import annotations

from copy import deepcopy
from statistics import median
from typing import Any

import numpy as np
from PIL import Image

from moving_side_dig_compositor import blend_at_pelvis, extract_frame, pack_sheet
from player_animation_diagonal_compositor import build_diagonal_frames
from player_animation_polish_compositor import _aligned_frame, _alpha_anchor


def source_frames(
    sheet: Image.Image,
    source: dict[str, Any],
    geometry: dict[str, Any],
) -> list[Image.Image]:
    return [
        extract_frame(
            sheet,
            index,
            int(geometry["frameWidth"]),
            int(geometry["frameHeight"]),
            int(source["columns"]),
        )
        for index in range(int(source["frameCount"]))
    ]


def _shift_up(frame: Image.Image, distance: int) -> Image.Image:
    if distance <= 0:
        return frame.copy()
    shifted = Image.new("RGBA", frame.size)
    shifted.alpha_composite(frame, (0, -int(distance)))
    return shifted


def build_stationary_up(
    frames: list[Image.Image],
    candidate: dict[str, Any],
) -> list[Image.Image]:
    lifts = candidate["upUpperLiftSourcePx"]
    if len(lifts) != len(frames):
        raise ValueError("UP lift curve must match the authored frame count")
    return [
        blend_at_pelvis(
            frame,
            _shift_up(frame, int(lifts[index])),
            float(candidate["upUpperSeamY"]),
            0,
            float(candidate["upUpperSeamFeatherPx"]),
        )
        for index, frame in enumerate(frames)
    ]


def build_stationary_down(
    frames: list[Image.Image],
    geometry: dict[str, Any],
) -> list[Image.Image]:
    target = (
        float(geometry["targetAnchorX"]),
        float(geometry["targetBottomY"]),
    )
    return [
        _aligned_frame(frame, scale=1, target_anchor=target)[0]
        for frame in frames
    ]


def build_moving_candidates(
    production_config: dict[str, Any],
    review_config: dict[str, Any],
    manifest: dict[str, Any],
    source_sheets: dict[str, Image.Image],
    stationary_up: list[Image.Image],
    stationary_down: list[Image.Image],
) -> tuple[list[Image.Image], list[dict[str, Any]]]:
    geometry = review_config["geometry"]
    candidate = review_config["candidate"]
    config = deepcopy(production_config)
    down_id = "reviewBlenderDigDown"
    config["sources"][down_id] = {
        "frameCount": len(stationary_down),
        "columns": 16,
        "displaySizePx": review_config["sources"]["blenderDigDown"]["displaySizePx"],
    }
    config["diagonalMining"]["down"]["source"] = down_id
    config["diagonalMining"]["down"]["sourceFrames"] = candidate["downSourceFrames"]
    config["diagonalMining"]["down"]["contactSequenceIndex"] = candidate[
        "downContactSequenceIndex"
    ]
    sheets = dict(source_sheets)
    sheets["digUp"] = pack_sheet(
        stationary_up,
        16,
        int(geometry["frameWidth"]),
        int(geometry["frameHeight"]),
    )
    sheets[down_id] = pack_sheet(
        stationary_down,
        16,
        int(geometry["frameWidth"]),
        int(geometry["frameHeight"]),
    )
    return build_diagonal_frames(config, manifest, sheets)


def frame_metrics(
    frames: list[Image.Image],
    display_size: float,
    geometry: dict[str, Any],
) -> dict[str, float]:
    threshold = int(geometry["alphaThreshold"])
    heights: list[int] = []
    bottoms: list[int] = []
    roots: list[float] = []
    centers: list[float] = []
    for frame in frames:
        alpha = np.asarray(frame.getchannel("A"))
        ys, xs = np.where(alpha >= threshold)
        if len(xs) == 0:
            continue
        heights.append(int(ys.max() - ys.min() + 1))
        bottoms.append(int(ys.max()))
        roots.append(_alpha_anchor(frame, threshold)[0])
        centers.append(float(xs.min() + xs.max()) / 2)
    scale = float(display_size) / float(geometry["frameWidth"])
    return {
        "frameCount": len(heights),
        "medianVisibleHeightPx": round(float(median(heights)) * scale, 2),
        "minimumVisibleHeightPx": round(float(min(heights)) * scale, 2),
        "maximumVisibleHeightPx": round(float(max(heights)) * scale, 2),
        "bottomDriftSourcePx": round(float(max(bottoms) - min(bottoms)), 2),
        "rootAnchorDriftSourcePx": round(float(max(roots) - min(roots)), 2),
        "centerDriftLivePx": round(float(max(centers) - min(centers)) * scale, 2),
    }


def packed(frames: list[Image.Image], geometry: dict[str, Any]) -> Image.Image:
    return pack_sheet(
        frames,
        16,
        int(geometry["frameWidth"]),
        int(geometry["frameHeight"]),
    )
