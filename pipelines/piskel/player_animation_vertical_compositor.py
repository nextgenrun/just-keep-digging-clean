"""Build planted stationary vertical-mining frames for the production atlas."""

from __future__ import annotations

from typing import Any

from PIL import Image

from moving_side_dig_compositor import blend_at_pelvis, extract_frame
from player_animation_polish_compositor import _aligned_frame


def _shift_up(frame: Image.Image, distance: int) -> Image.Image:
    if distance <= 0:
        return frame.copy()
    shifted = Image.new("RGBA", frame.size)
    shifted.alpha_composite(frame, (0, -int(distance)))
    return shifted


def _normalize(
    frame: Image.Image,
    source: dict[str, Any],
    output_display_size: float,
) -> Image.Image:
    normalized, _ = _aligned_frame(
        frame,
        scale=float(source["displaySizePx"]) / output_display_size,
        target_anchor=(128, 247),
    )
    return normalized


def _source_frame(
    sheet: Image.Image,
    source: dict[str, Any],
    frame_index: int,
) -> Image.Image:
    return extract_frame(
        sheet,
        int(frame_index),
        256,
        256,
        int(source["columns"]),
    )


def build_vertical_source_frames(
    config: dict[str, Any],
    sheets: dict[str, Image.Image],
) -> dict[str, list[Image.Image]]:
    up_config = config["verticalMining"]["up"]
    up_source = config["sources"][up_config["source"]]
    lifts = up_config["upperLiftSourcePx"]
    if len(lifts) != int(up_source["frameCount"]):
        raise ValueError("vertical UP lift curve must match the source frame count")

    up_frames = []
    for source_index in range(int(up_source["frameCount"])):
        frame = _source_frame(sheets[up_config["source"]], up_source, source_index)
        lifted = _shift_up(frame, int(lifts[source_index]))
        up_frames.append(blend_at_pelvis(
            frame,
            lifted,
            float(up_config["upperSeamY"]),
            0,
            float(up_config["upperSeamFeatherPx"]),
        ))

    down_config = config["verticalMining"]["down"]
    down_source = config["sources"][down_config["source"]]
    down_frames = []
    for source_index in range(int(down_source["frameCount"])):
        frame = _source_frame(sheets[down_config["source"]], down_source, source_index)
        planted, _ = _aligned_frame(frame, scale=1, target_anchor=(128, 247))
        down_frames.append(planted)
    return {"up": up_frames, "down": down_frames}


def build_vertical_frames(
    config: dict[str, Any],
    source_frames: dict[str, list[Image.Image]],
) -> tuple[list[Image.Image], dict[str, list[int]]]:
    output_size = float(config["displaySizePx"])
    frames: list[Image.Image] = []
    layout: dict[str, list[int]] = {}
    for family in ("up", "down"):
        family_config = config["verticalMining"][family]
        source = config["sources"][family_config["source"]]
        start = len(frames)
        frames.extend(
            _normalize(source_frames[family][int(source_index)], source, output_size)
            for source_index in family_config["sourceFrames"]
        )
        layout[family] = list(range(start, len(frames)))
    return frames, layout
