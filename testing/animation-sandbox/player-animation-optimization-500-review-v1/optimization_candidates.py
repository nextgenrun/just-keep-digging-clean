"""Build review-only corrected recovery, landing, and wall-brace frames."""

from __future__ import annotations

from typing import Any

import numpy as np
from PIL import Image

from moving_side_dig_compositor import blend_at_pelvis, extract_frame, pack_sheet
from player_animation_polish_compositor import _blend, normalize_source_frame


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


def visible_height_source(frame: Image.Image, threshold: int) -> int:
    alpha = np.asarray(frame.getchannel("A"))
    ys, _ = np.where(alpha >= threshold)
    return int(ys.max() - ys.min() + 1) if len(ys) else 0


def _shift_up(frame: Image.Image, distance: int) -> Image.Image:
    if distance <= 0:
        return frame.copy()
    shifted = Image.new("RGBA", frame.size)
    shifted.alpha_composite(frame, (0, -distance))
    return shifted


def build_recovery_candidate(
    sheets: dict[str, Image.Image],
    config: dict[str, Any],
) -> list[Image.Image]:
    sources = config["sources"]
    geometry = config["geometry"]
    output_size = float(config["candidate"]["outputDisplaySizePx"])
    action = normalize_source_frame(
        sheets["punchJab"],
        int(sources["punchJab"]["frameCount"]) - 1,
        sources["punchJab"],
        output_size,
    )
    idle = normalize_source_frame(
        sheets["idle"],
        0,
        sources["idle"],
        output_size,
    )
    weight = float(config["candidate"]["recoveryIdleBlendWeight"])
    return [_blend(action, idle, weight), idle]


def build_landing_candidate(
    sheets: dict[str, Image.Image],
    config: dict[str, Any],
) -> list[Image.Image]:
    source = config["sources"]["landing"]
    output_size = float(config["candidate"]["outputDisplaySizePx"])
    return [
        normalize_source_frame(sheets["landing"], int(index), source, output_size)
        for index in config["candidate"]["hardLandingSourceFrames"]
    ]


def build_wall_candidate(
    sheets: dict[str, Image.Image],
    config: dict[str, Any],
) -> dict[str, list[Image.Image]]:
    source = config["sources"]["wallPush"]
    candidate = config["candidate"]
    geometry = config["geometry"]
    output_size = float(candidate["outputDisplaySizePx"])
    threshold = int(geometry["alphaThreshold"])
    target_source_height = float(candidate["wallTargetVisibleHeightPx"]) * (
        float(geometry["frameHeight"]) / output_size
    )
    loop = []
    for index in candidate["wallLoopSourceFrames"]:
        normalized = normalize_source_frame(
            sheets["wallPush"],
            int(index),
            source,
            output_size,
        )
        current_height = visible_height_source(normalized, threshold)
        lift = max(0, round(target_source_height - current_height))
        loop.append(blend_at_pelvis(
            normalized,
            _shift_up(normalized, lift),
            float(candidate["wallUpperSeamY"]),
            0,
            float(candidate["wallUpperSeamFeatherPx"]),
        ))
    idle = normalize_source_frame(
        sheets["idle"],
        0,
        config["sources"]["idle"],
        output_size,
    )
    first = loop[0]
    last = loop[-1]
    entry = [_blend(idle, first, float(weight)) for weight in candidate["wallEntryBlendWeights"]]
    exit_frames = [_blend(last, idle, 1 - float(weight)) for weight in candidate["wallExitBlendWeights"]]
    return {"entry": entry, "loop": loop, "exit": exit_frames}


def pack_candidates(
    recovery: list[Image.Image],
    landing: list[Image.Image],
    wall: dict[str, list[Image.Image]],
    geometry: dict[str, Any],
) -> tuple[Image.Image, dict[str, list[int]]]:
    frames = []
    layout = {}
    for key, group in (
        ("recovery", recovery),
        ("landing", landing),
        ("wallEntry", wall["entry"]),
        ("wallLoop", wall["loop"]),
        ("wallExit", wall["exit"]),
    ):
        start = len(frames)
        frames.extend(group)
        layout[key] = list(range(start, len(frames)))
    return pack_sheet(
        frames,
        int(geometry["sheetColumns"]),
        int(geometry["frameWidth"]),
        int(geometry["frameHeight"]),
    ), layout
