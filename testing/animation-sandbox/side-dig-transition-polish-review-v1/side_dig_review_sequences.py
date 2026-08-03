"""Assemble synchronized SIDE-dig comparisons and numeric skating metrics."""

from __future__ import annotations

from typing import Any

from PIL import Image

from moving_side_dig_compositor import extract_frame
from side_dig_review_compositor import normalized_idle


def _frame(
    sheets: dict[str, Image.Image],
    config: dict[str, Any],
    source_id: str,
    frame_index: int,
) -> Image.Image:
    source = config["sources"][source_id]
    geometry = config["geometry"]
    return extract_frame(
        sheets[source_id],
        int(frame_index),
        int(geometry["frameWidth"]),
        int(geometry["frameHeight"]),
        int(source["columns"]),
    )


def _record(
    frame: Image.Image,
    source: dict[str, Any],
    label: str,
    *,
    root_x: float = 0,
    contact: bool = False,
    target_solid: bool = True,
    display_size: float | None = None,
    output_normalized: bool = False,
) -> dict[str, Any]:
    return {
        "frame": frame,
        "displaySizePx": float(display_size or source["displaySizePx"]),
        "originX": 0.5,
        "originY": 0.96484375 if output_normalized else float(source["originY"]),
        "rootXPx": float(root_x),
        "label": label,
        "contact": bool(contact),
        "targetSolid": bool(target_solid),
    }


def _standing_chain(
    sheets: dict[str, Image.Image],
    candidates: dict[str, Any],
    config: dict[str, Any],
) -> dict[str, Any]:
    sources = config["sources"]
    hold_root = float(config["blocked"]["stableHoldRootOffsetPx"])
    before: list[dict[str, Any]] = []
    after: list[dict[str, Any]] = []
    for index in range(3):
        before.append(_record(_frame(sheets, config, "idle", index), sources["idle"], f"Idle {index}"))
        after.append(_record(
            normalized_idle(sheets, config, index),
            sources["run"],
            f"Collision-safe hold {index}",
            root_x=hold_root,
            output_normalized=True,
        ))

    action_ranges = {}
    for action_id, recovery_key in (("jab", "jabRecoveryFrames"), ("cross", "crossRecoveryFrames")):
        start = len(before)
        contact_frame = int(sources[action_id]["contactFrame"])
        for frame_index in range(int(sources[action_id]["frameCount"])):
            contact = frame_index == contact_frame
            before.append(_record(
                _frame(sheets, config, action_id, frame_index),
                sources[action_id],
                f"Current {action_id.title()} {frame_index}",
                contact=contact,
            ))
            after.append(_record(
                candidates["standingFull"][action_id][frame_index],
                sources["run"],
                f"Planted {action_id.title()} {frame_index}",
                root_x=hold_root,
                contact=contact,
                output_normalized=True,
            ))
        action_ranges[action_id] = [start, len(before) - 1]
        for settle_index, transition_frame in enumerate(sources["transitions"][recovery_key]):
            before.append(_record(
                _frame(sheets, config, "transitions", transition_frame),
                sources["transitions"],
                f"Current settle {settle_index + 1}",
            ))
            after.append(_record(
                candidates["idleBase"],
                sources["run"],
                f"Exact Idle settle {settle_index + 1}",
                root_x=hold_root,
                output_normalized=True,
            ))
        for idle_index in range(2):
            before.append(_record(
                _frame(sheets, config, "idle", idle_index),
                sources["idle"],
                f"Idle {idle_index}",
            ))
            after.append(_record(
                candidates["idleBase"],
                sources["run"],
                f"Idle hold {idle_index + 1}",
                root_x=hold_root,
                output_normalized=True,
            ))
    return {
        "id": "standing-chain",
        "label": "Standing SIDE · planted Jab / Cross chain",
        "subtitle": "Fixed lower body · stable 21 px collision hold · no tile intrusion",
        "kind": "side",
        "before": before,
        "after": after,
        "criticalIndex": action_ranges["jab"][0] + int(sources["jab"]["contactFrame"]),
        "actionRanges": action_ranges,
        "reviewFrames": [
            2,
            action_ranges["jab"][0],
            action_ranges["jab"][0] + int(sources["jab"]["contactFrame"]),
            action_ranges["jab"][1],
            action_ranges["jab"][1] + 1,
            action_ranges["cross"][0],
        ],
    }


def _blocked_chain(
    sheets: dict[str, Image.Image],
    candidates: dict[str, Any],
    config: dict[str, Any],
) -> dict[str, Any]:
    sources = config["sources"]
    blocked = config["blocked"]
    stand_off = float(blocked["currentStandOffDistancePx"])
    hold_root = float(blocked["stableHoldRootOffsetPx"])
    before: list[dict[str, Any]] = []
    after: list[dict[str, Any]] = []
    lead = blocked["runLeadFrames"]
    current_roots = blocked["currentRunLeadRootOffsetsPx"]
    proposed_roots = blocked["proposedRunLeadRootOffsetsPx"]
    if len(lead) != len(current_roots) or len(lead) != len(proposed_roots):
        raise ValueError("blocked run lead frames and root offsets must match")
    for index, frame_index in enumerate(lead):
        run = _frame(sheets, config, "run", frame_index)
        before.append(_record(
            run,
            sources["run"],
            f"Current approach {frame_index}",
            root_x=float(current_roots[index]),
        ))
        after.append(_record(
            run,
            sources["run"],
            f"Decelerated approach {frame_index}",
            root_x=float(proposed_roots[index]),
        ))

    action_ranges = {}
    for action_id, current_source, after_key in (
        ("jab", "movingJab", "blockedJab"),
        ("cross", "movingCross", "standingSampleCross"),
    ):
        start = len(before)
        for frame_index in range(int(sources[current_source]["frameCount"])):
            contact = frame_index == int(config["moving"]["contactFrame"])
            before.append(_record(
                _frame(sheets, config, current_source, frame_index),
                sources[current_source],
                f"Current {action_id.title()} · body -{stand_off:.0f}",
                root_x=-stand_off,
                contact=contact,
            ))
            after.append(_record(
                candidates[after_key][frame_index],
                sources["run"],
                f"Stable {action_id.title()} · hold {hold_root:.0f}",
                root_x=hold_root,
                contact=contact,
                output_normalized=True,
            ))
        action_ranges[action_id] = [start, len(before) - 1]
        for release_index, root in enumerate(blocked["releaseRootOffsetsPx"]):
            run_frame = (23 + release_index) % int(sources["run"]["frameCount"])
            before.append(_record(
                _frame(sheets, config, "run", run_frame),
                sources["run"],
                f"Current return {release_index + 1}",
                root_x=float(root),
            ))
            after.append(_record(
                candidates["idleBase"],
                sources["run"],
                f"Stable hold {release_index + 1}",
                root_x=hold_root,
                output_normalized=True,
            ))
    return {
        "id": "blocked-chain",
        "label": "Blocked run → SIDE dig · collision-safe hold",
        "subtitle": "Current 21 px sawtooth vs one decelerated stop held across the chain",
        "kind": "side",
        "before": before,
        "after": after,
        "criticalIndex": action_ranges["jab"][0] + int(config["moving"]["contactFrame"]),
        "actionRanges": action_ranges,
        "reviewFrames": [
            len(lead) - 1,
            action_ranges["jab"][0],
            action_ranges["jab"][0] + int(config["moving"]["contactFrame"]),
            action_ranges["jab"][1],
            action_ranges["jab"][1] + 1,
            action_ranges["cross"][0],
        ],
    }


def _running_handoff(
    sheets: dict[str, Image.Image],
    candidates: dict[str, Any],
    config: dict[str, Any],
) -> dict[str, Any]:
    sources = config["sources"]
    before: list[dict[str, Any]] = []
    after: list[dict[str, Any]] = []
    step = 2.0
    cursor = -6.0
    for frame_index in (6, 7, 8):
        run = _frame(sheets, config, "run", frame_index)
        before.append(_record(run, sources["run"], f"Jog {frame_index}", root_x=cursor, target_solid=False))
        after.append(_record(run, sources["run"], f"Jog {frame_index}", root_x=cursor, target_solid=False))
        cursor += step
    action_start = len(before)
    for frame_index in range(int(sources["movingJab"]["frameCount"])):
        contact = frame_index == int(config["moving"]["contactFrame"])
        before.append(_record(
            _frame(sheets, config, "movingJab", frame_index),
            sources["movingJab"],
            f"Current Jog + Jab {frame_index}",
            root_x=cursor,
            contact=contact,
            target_solid=False,
        ))
        after.append(_record(
            candidates["movingJab"][frame_index],
            sources["run"],
            f"Zero-edge Jog + Jab {frame_index}",
            root_x=cursor,
            contact=contact,
            target_solid=False,
            output_normalized=True,
        ))
        cursor += step
    for frame_index in (23, 24, 25):
        run = _frame(sheets, config, "run", frame_index)
        before.append(_record(run, sources["run"], f"Resume Jog {frame_index}", root_x=cursor, target_solid=False))
        after.append(_record(run, sources["run"], f"Resume Jog {frame_index}", root_x=cursor, target_solid=False))
        cursor += step
    return {
        "id": "running-handoff",
        "label": "True running SIDE dig · phase-exact handoff",
        "subtitle": "Same Jog phase and travel · action residual reaches exactly zero",
        "kind": "travel",
        "before": before,
        "after": after,
        "criticalIndex": action_start + int(config["moving"]["contactFrame"]),
        "actionRange": [action_start, action_start + int(sources["movingJab"]["frameCount"]) - 1],
        "reviewFrames": [
            action_start - 1,
            action_start,
            action_start + int(config["moving"]["contactFrame"]),
            action_start + int(sources["movingJab"]["frameCount"]) - 2,
            action_start + int(sources["movingJab"]["frameCount"]) - 1,
            action_start + int(sources["movingJab"]["frameCount"]),
        ],
    }


def build_scenarios(
    sheets: dict[str, Image.Image],
    candidates: dict[str, Any],
    config: dict[str, Any],
) -> list[dict[str, Any]]:
    return [
        _standing_chain(sheets, candidates, config),
        _blocked_chain(sheets, candidates, config),
        _running_handoff(sheets, candidates, config),
    ]
