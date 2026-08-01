"""Assemble synchronized review sequences and measure their visible faults."""

from __future__ import annotations

import math
from typing import Any

import numpy as np
from PIL import Image

from moving_side_dig_compositor import extract_frame


def _frame(sheet: Image.Image, index: int, source: dict[str, Any]) -> Image.Image:
    return extract_frame(sheet, index, 256, 256, int(source["columns"]))


def _record(
    frame: Image.Image,
    source: dict[str, Any],
    label: str,
    *,
    display_size: float | None = None,
    offset_x: float = 0,
    contact: bool = False,
) -> dict[str, Any]:
    return {
        "frame": frame,
        "displaySizePx": float(display_size or source["displaySizePx"]),
        "originX": 0.5,
        "originY": float(source["originY"]),
        "offsetXPx": float(offset_x),
        "label": label,
        "contact": bool(contact),
    }


def visible_height(record: dict[str, Any], threshold: int) -> float:
    alpha = np.asarray(record["frame"].getchannel("A"))
    ys, _ = np.where(alpha >= threshold)
    if len(ys) == 0:
        return 0
    source_height = int(ys.max()) - int(ys.min()) + 1
    return source_height * float(record["displaySizePx"]) / record["frame"].height


def opaque_tile_intrusion(
    record: dict[str, Any],
    geometry: dict[str, Any],
) -> int:
    alpha = np.asarray(record["frame"].getchannel("A"))
    ys, xs = np.where(alpha >= int(geometry["alphaThreshold"]))
    size = float(record["displaySizePx"])
    scale = size / record["frame"].width
    offset = float(record["offsetXPx"])
    world_x = offset + (xs + 0.5 - record["originX"] * 256) * scale
    world_y = (ys + 0.5 - record["originY"] * 256) * scale
    face_x = float(geometry["tileSizePx"]) / 2
    tile_top = -float(geometry["tileSizePx"])
    return int(np.count_nonzero(
        (world_x >= face_x) & (world_y >= tile_top) & (world_y <= 0)
    ))


def _stationary_release(
    sheets: dict[str, Image.Image],
    candidates: dict[str, Any],
    config: dict[str, Any],
) -> dict[str, Any]:
    sources = config["sources"]
    candidate = config["candidate"]
    geometry = config["geometry"]
    action_frames = candidate["actionSequenceFrames"]
    contact_index = int(candidate["actionContactSequenceIndex"])
    target = float(geometry["stationaryContactOffsetXPx"])
    response = float(geometry["currentAlignmentResponsePerSecond"])
    before = []
    after = []
    for index, source_index in enumerate(action_frames):
        elapsed = float(source_index) / 30
        current_offset = target * (1 - math.exp(-response * elapsed))
        is_contact = index == contact_index
        frame = _frame(sheets["punchJab"], int(source_index), sources["punchJab"])
        before.append(_record(
            frame,
            sources["punchJab"],
            f"Jab {source_index}",
            offset_x=current_offset,
            contact=is_contact,
        ))
        after.append(_record(
            frame,
            sources["punchJab"],
            f"Body-lock {source_index}",
            contact=is_contact,
        ))
    step = float(config["render"]["previewFrameDurationMs"]) / 1000
    release_response = float(geometry["rigReleaseResponsePerSecond"])
    for index, transition_index in enumerate(candidate["currentRecoveryFrames"]):
        offset = target * math.exp(-release_response * step * index)
        before.append(_record(
            _frame(sheets["currentTransitions"], int(transition_index), sources["currentTransitions"]),
            sources["currentTransitions"],
            f"Current settle {index + 1}",
            offset_x=offset,
        ))
        after.append(_record(
            candidates["recovery"][index],
            sources["currentTransitions"],
            f"Calibrated settle {index + 1}",
            display_size=float(candidate["outputDisplaySizePx"]),
        ))
    decay_start = len(candidate["currentRecoveryFrames"])
    for index in range(3):
        offset = target * math.exp(-release_response * step * (decay_start + index))
        idle_frame = _frame(sheets["idle"], index, sources["idle"])
        before.append(_record(idle_frame, sources["idle"], f"Idle {index}", offset_x=offset))
        after.append(_record(idle_frame, sources["idle"], f"Idle {index}"))
    return {
        "id": "stationary-release",
        "before": before,
        "after": after,
        "criticalIndex": contact_index,
        "transitionIndex": len(action_frames),
    }


def _landing_finish(
    sheets: dict[str, Image.Image],
    candidates: dict[str, Any],
    config: dict[str, Any],
) -> dict[str, Any]:
    sources = config["sources"]
    candidate = config["candidate"]
    before = []
    after = []
    for source_index in candidate["fallingLeadFrames"]:
        frame = _frame(sheets["falling"], int(source_index), sources["falling"])
        before.append(_record(frame, sources["falling"], f"Fall {source_index}"))
        after.append(_record(frame, sources["falling"], f"Fall {source_index}"))
    for index, transition_index in enumerate(candidate["currentHardLandingFrames"]):
        current = _frame(
            sheets["currentTransitions"],
            int(transition_index),
            sources["currentTransitions"],
        )
        is_contact = index == 0
        before.append(_record(
            current,
            sources["currentTransitions"],
            f"Current land {index + 1}",
            contact=is_contact,
        ))
        after.append(_record(
            candidates["landing"][index],
            sources["currentTransitions"],
            f"Calibrated land {index + 1}",
            display_size=float(candidate["outputDisplaySizePx"]),
            contact=is_contact,
        ))
    for index in range(3):
        idle_frame = _frame(sheets["idle"], index, sources["idle"])
        before.append(_record(idle_frame, sources["idle"], f"Idle {index}"))
        after.append(_record(idle_frame, sources["idle"], f"Idle {index}"))
    return {
        "id": "landing-finish",
        "before": before,
        "after": after,
        "criticalIndex": len(candidate["fallingLeadFrames"]) + len(candidate["currentHardLandingFrames"]) - 1,
        "transitionIndex": len(candidate["fallingLeadFrames"]),
        "finishIndex": len(candidate["fallingLeadFrames"]) + len(candidate["currentHardLandingFrames"]) - 1,
    }


def _wall_push(
    sheets: dict[str, Image.Image],
    candidates: dict[str, Any],
    config: dict[str, Any],
) -> dict[str, Any]:
    sources = config["sources"]
    candidate = config["candidate"]
    before = []
    after = []
    for index in range(3):
        idle = _frame(sheets["idle"], index, sources["idle"])
        before.append(_record(idle, sources["idle"], f"Idle {index}"))
        after.append(_record(idle, sources["idle"], f"Idle {index}"))
    current_entry = [
        candidate["currentWallEntryFrames"][0],
        *candidate["currentWallEntryFrames"],
    ]
    for index, transition_index in enumerate(current_entry):
        before.append(_record(
            _frame(sheets["currentTransitions"], int(transition_index), sources["currentTransitions"]),
            sources["currentTransitions"],
            f"Current brace {index + 1}",
        ))
        after.append(_record(
            candidates["wall"]["entry"][index],
            sources["currentTransitions"],
            f"Planted brace {index + 1}",
            display_size=float(candidate["outputDisplaySizePx"]),
        ))
    for index, source_index in enumerate(candidate["wallLoopSourceFrames"]):
        before.append(_record(
            _frame(sheets["wallPush"], int(source_index), sources["wallPush"]),
            sources["wallPush"],
            f"Current push {index + 1}",
            contact=index == 0,
        ))
        after.append(_record(
            candidates["wall"]["loop"][index],
            sources["currentTransitions"],
            f"Full-size push {index + 1}",
            display_size=float(candidate["outputDisplaySizePx"]),
            contact=index == 0,
        ))
    current_exit = [
        candidate["currentWallExitFrames"][0],
        *candidate["currentWallExitFrames"],
    ]
    for index, transition_index in enumerate(current_exit):
        before.append(_record(
            _frame(sheets["currentTransitions"], int(transition_index), sources["currentTransitions"]),
            sources["currentTransitions"],
            f"Current release {index + 1}",
        ))
        after.append(_record(
            candidates["wall"]["exit"][index],
            sources["currentTransitions"],
            f"Phase release {index + 1}",
            display_size=float(candidate["outputDisplaySizePx"]),
        ))
    for index in range(3):
        idle = _frame(sheets["idle"], index, sources["idle"])
        before.append(_record(idle, sources["idle"], f"Idle {index}"))
        after.append(_record(idle, sources["idle"], f"Idle {index}"))
    return {
        "id": "wall-push",
        "before": before,
        "after": after,
        "criticalIndex": 6,
        "transitionIndex": 3,
        "loopStart": 6,
        "loopEnd": 21,
        "exitStart": 22,
    }


def build_scenarios(
    sheets: dict[str, Image.Image],
    candidates: dict[str, Any],
    config: dict[str, Any],
) -> list[dict[str, Any]]:
    return [
        _stationary_release(sheets, candidates, config),
        _landing_finish(sheets, candidates, config),
        _wall_push(sheets, candidates, config),
    ]


