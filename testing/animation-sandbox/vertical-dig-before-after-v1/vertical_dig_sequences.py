"""Build synchronized current/proposed vertical-dig review sequences."""

from __future__ import annotations

import math
from typing import Any

import numpy as np
from PIL import Image


def record(
    frame: Image.Image,
    source: dict[str, Any],
    label: str,
    *,
    contact: bool = False,
    offset_x: float = 0,
    offset_y: float = 0,
) -> dict[str, Any]:
    return {
        "frame": frame,
        "displaySizePx": source["displaySizePx"],
        "originY": source["originY"],
        "label": label,
        "contact": contact,
        "offsetX": offset_x,
        "offsetY": offset_y,
    }


def resample_at_contact(
    frames: list[Image.Image],
    count: int,
    source_contact: int,
    preview_contact: int,
) -> list[Image.Image]:
    sampled = []
    for index in range(count):
        if index <= preview_contact:
            ratio = index / max(1, preview_contact)
            source_index = round(source_contact * ratio)
        else:
            ratio = (index - preview_contact) / max(1, count - preview_contact - 1)
            source_index = source_contact + round(
                (len(frames) - source_contact - 1) * ratio,
            )
        sampled.append(frames[min(len(frames) - 1, source_index)])
    return sampled


def stationary_records(
    config: dict[str, Any],
    scenario: dict[str, Any],
    before_frames: list[Image.Image],
    after_frames: list[Image.Image],
    before_source: dict[str, Any],
    after_source: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    render = config["render"]
    geometry = config["geometry"]
    count = int(render["stationaryPreviewFrames"])
    contact = int(scenario["previewContactFrame"])
    before = resample_at_contact(
        before_frames,
        count,
        int(scenario["beforeContactSourceFrame"]),
        contact,
    )
    after = resample_at_contact(
        after_frames,
        count,
        int(scenario["afterContactSourceFrame"]),
        contact,
    )
    before_records = []
    after_records = []
    for index, (current, proposed) in enumerate(zip(before, after)):
        offset_y = 0
        if scenario["family"] == "down":
            elapsed = index * int(render["previewFrameDurationMs"]) / 1000
            response = float(geometry["currentAlignmentResponsePerSecond"])
            offset_y = float(geometry["currentMaxOffsetYPx"]) * (
                1 - math.exp(-response * elapsed)
            )
        before_records.append(record(
            current,
            before_source,
            f"AUTHORED FRAME · {index + 1:02d}/{count:02d}",
            contact=index == contact,
            offset_y=offset_y,
        ))
        after_records.append(record(
            proposed,
            after_source,
            f"BODY-LOCKED FRAME · {index + 1:02d}/{count:02d}",
            contact=index == contact,
        ))
    return before_records, after_records


def moving_records(
    config: dict[str, Any],
    scenario: dict[str, Any],
    run_frames: list[Image.Image],
    before_action: list[Image.Image],
    after_action: list[Image.Image],
    moving_source: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    render = config["render"]
    geometry = config["geometry"]
    pre_count = int(render["movingPreFrames"])
    post_count = int(render["movingPostFrames"])
    pre_phases = [(1 - pre_count + index) % len(run_frames) for index in range(pre_count)]
    post_phases = [(16 + index) % len(run_frames) for index in range(post_count)]
    before = [
        record(run_frames[phase], moving_source, f"JOG PHASE {phase:02d}")
        for phase in pre_phases
    ]
    after = [
        record(run_frames[phase], moving_source, f"JOG PHASE {phase:02d}")
        for phase in pre_phases
    ]
    direction_y = -1 if scenario["family"] == "up" else 1
    for index, (current, proposed) in enumerate(zip(before_action, after_action)):
        is_contact = index == int(scenario["contactSequenceIndex"])
        before.append(record(
            current,
            moving_source,
            f"IMMEDIATE FULL-SPRITE ALIGN · PHASE {index + 1:02d}",
            contact=is_contact,
            offset_x=float(geometry["currentMaxOffsetXPx"]),
            offset_y=direction_y * float(geometry["currentMaxOffsetYPx"]),
        ))
        after.append(record(
            proposed,
            moving_source,
            f"BODY-LOCKED JOG LOWER · PHASE {index + 1:02d}",
            contact=is_contact,
        ))
    weights = render["currentReleaseOffsetWeights"]
    for index, phase in enumerate(post_phases):
        weight = float(weights[index])
        before.append(record(
            run_frames[phase],
            moving_source,
            f"OFFSET RELEASE · JOG {phase:02d}",
            offset_x=float(geometry["currentMaxOffsetXPx"]) * weight,
            offset_y=direction_y * float(geometry["currentMaxOffsetYPx"]) * weight,
        ))
        after.append(record(
            run_frames[phase],
            moving_source,
            f"EXACT JOG RESUME · PHASE {phase:02d}",
        ))
    return before, after


def opaque_tile_intrusion(
    frame: Image.Image,
    display_size: float,
    origin_y: float,
    geometry: dict[str, Any],
    *,
    family: str,
    moving: bool,
    offset_x: float,
    offset_y: float,
) -> int:
    alpha = np.asarray(frame.getchannel("A"))
    ys, xs = np.where(alpha >= int(geometry["alphaThreshold"]))
    scale = float(display_size) / float(geometry["frameWidth"])
    world_x = (xs - float(geometry["targetAnchorX"])) * scale + offset_x
    world_y = (
        ys - float(origin_y) * float(geometry["frameHeight"])
    ) * scale + offset_y
    tile = float(geometry["tileSizePx"])
    if moving and family == "up":
        inside = (world_x >= tile / 2) & (world_y <= -tile)
    elif moving:
        inside = world_x >= tile / 2
    elif family == "up":
        inside = world_y <= -tile
    else:
        inside = world_y > 0
    return int(inside.sum())
