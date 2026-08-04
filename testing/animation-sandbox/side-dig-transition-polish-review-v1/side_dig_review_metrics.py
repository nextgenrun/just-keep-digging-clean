"""Measure root, planted-foot, and boundary continuity in the review lanes."""

from __future__ import annotations

from typing import Any

import numpy as np
from PIL import Image

from side_dig_review_compositor import changed_pixels, lower_anchor
from side_dig_review_sequences import _frame


def _anchor_world_x(record: dict[str, Any], config: dict[str, Any]) -> float:
    anchor_x, _ = lower_anchor(record["frame"], config)
    scale = float(record["displaySizePx"]) / float(config["geometry"]["frameWidth"])
    local = (anchor_x - float(record["originX"]) * 256.0) * scale
    return float(record["rootXPx"]) + local

def _visible_height(record: dict[str, Any], config: dict[str, Any]) -> float:
    alpha = np.asarray(record["frame"].getchannel("A"))
    ys, _ = np.where(alpha >= int(config["geometry"]["alphaThreshold"]))
    if len(ys) == 0:
        return 0.0
    return float(ys.max() - ys.min() + 1) * float(record["displaySizePx"]) / 256.0

def _canonical_frame(record: dict[str, Any], config: dict[str, Any]) -> Image.Image:
    geometry = config["geometry"]
    output_size = float(geometry["outputDisplaySizePx"])
    ratio = float(record["displaySizePx"]) / output_size
    size = max(1, round(256 * ratio))
    resized = record["frame"].resize((size, size), Image.Resampling.LANCZOS)
    paste_x = round(float(geometry["targetPelvisX"]) - float(record["originX"]) * size)
    paste_y = round(float(geometry["targetBottomY"]) - float(record["originY"]) * size)
    output = Image.new("RGBA", (256, 256))
    output.alpha_composite(resized, (paste_x, paste_y))
    return output

def _range(values: list[float]) -> float:
    return 0.0 if not values else max(values) - min(values)


def _root_direction_reversals(records: list[dict[str, Any]]) -> int:
    roots = [float(record["rootXPx"]) for record in records]
    directions = []
    for left, right in zip(roots, roots[1:]):
        delta = right - left
        if abs(delta) > 0.001:
            directions.append(1 if delta > 0 else -1)
    return sum(left != right for left, right in zip(directions, directions[1:]))

def _forward_root_distance(records: list[dict[str, Any]]) -> float:
    roots = [float(record["rootXPx"]) for record in records]
    return sum(max(0.0, right - left) for left, right in zip(roots, roots[1:]))

def _tile_frame_clearance(
    record: dict[str, Any],
    config: dict[str, Any],
    facing: int,
) -> dict[str, float | int]:
    frame = record["frame"]
    geometry = config["geometry"]
    alpha = np.asarray(frame.getchannel("A"))
    ys, xs = np.where(alpha >= int(geometry["alphaThreshold"]))
    scale = float(record["displaySizePx"]) / float(frame.width)
    local_y = (ys + 0.5 - float(record["originY"]) * frame.height) * scale
    tile = float(geometry["tileSizePx"])
    in_tile_band = (local_y >= -tile) & (local_y <= 0)
    xs = xs[in_tile_band]
    local_y = local_y[in_tile_band]
    if len(xs) == 0:
        return {
            "intrusionPixels": 0,
            "upperIntrusionPixels": 0,
            "lowerIntrusionPixels": 0,
            "minimumClearancePx": tile,
        }
    near_edge = (
        xs + 1.0 - float(record["originX"]) * frame.width
    ) * scale
    world_near_edge = float(facing) * (float(record["rootXPx"]) + near_edge)
    tile_face = float(facing) * float(geometry["bodyWidthPx"]) / 2.0
    clearances = float(facing) * (tile_face - world_near_edge)
    intruding = clearances < -0.001
    upper_split_y = -float(geometry["bodyHeightPx"]) / 2.0
    upper = intruding & (local_y < upper_split_y)
    lower = intruding & ~upper
    return {
        "intrusionPixels": int(np.count_nonzero(intruding)),
        "upperIntrusionPixels": int(np.count_nonzero(upper)),
        "lowerIntrusionPixels": int(np.count_nonzero(lower)),
        "minimumClearancePx": float(np.min(clearances)),
    }

def _collision_summary(
    records: list[dict[str, Any]],
    config: dict[str, Any],
) -> dict[str, Any]:
    solid = [record for record in records if record["targetSolid"]]
    result: dict[str, Any] = {"checkedFrames": len(solid)}
    for facing, label in ((1, "rightFacing"), (-1, "leftFacing")):
        samples = [_tile_frame_clearance(record, config, facing) for record in solid]
        result[label] = {
            "intrusionPixels": sum(int(sample["intrusionPixels"]) for sample in samples),
            "upperIntrusionPixels": sum(
                int(sample["upperIntrusionPixels"]) for sample in samples
            ),
            "lowerIntrusionPixels": sum(
                int(sample["lowerIntrusionPixels"]) for sample in samples
            ),
            "minimumClearancePx": round(min(
                float(sample["minimumClearancePx"]) for sample in samples
            ), 3) if samples else 0.0,
        }
    result["mirroredParity"] = result["rightFacing"] == result["leftFacing"]
    return result


def _foot_marker_travel(
    manifest: dict[str, Any],
    action_id: str,
    frame_count: int,
    display_size: float,
) -> float:
    frames = manifest["actions"][action_id]["rig_markers"]["frames"]
    scale = float(display_size) / 256.0
    travels = []
    for marker_name in ("foot_l", "foot_r"):
        points = [float(frames[str(index)][marker_name][0]) * scale for index in range(frame_count)]
        travels.append(_range(points))
    return max(travels)


def build_metrics(
    scenarios: list[dict[str, Any]],
    candidates: dict[str, Any],
    sheets: dict[str, Image.Image],
    manifest: dict[str, Any],
    config: dict[str, Any],
) -> dict[str, Any]:
    by_id = {scenario["id"]: scenario for scenario in scenarios}
    standing = by_id["standing-chain"]
    blocked = by_id["blocked-chain"]
    running = by_id["running-handoff"]
    jab_start, jab_end = standing["actionRanges"]["jab"]
    cross_start, cross_end = standing["actionRanges"]["cross"]
    blocked_start, blocked_end = blocked["actionRanges"]["jab"]
    blocked_cross_start, blocked_cross_end = blocked["actionRanges"]["cross"]
    lead_start, lead_end = blocked["runLeadRange"]
    run_start, run_end = running["actionRange"]
    plant_count = len(config["standing"]["blockedPlantBlendWeights"])
    pure_run_start = _frame(sheets, config, "run", int(config["moving"]["jabRunStartFrame"]))
    pure_run_end_index = (
        int(config["moving"]["jabRunStartFrame"])
        + int(config["moving"]["runFrameOffsets"][-1])
    ) % int(config["sources"]["run"]["frameCount"])
    pure_run_end = _frame(sheets, config, "run", pure_run_end_index)
    current_running = [_frame(sheets, config, "movingJab", index) for index in range(22)]
    proposed_running = candidates["movingJab"]
    current_end = _canonical_frame(standing["before"][jab_end], config)
    current_recovery = _canonical_frame(standing["before"][jab_end + 1], config)
    proposed_end = _canonical_frame(standing["after"][jab_end], config)
    proposed_recovery = _canonical_frame(standing["after"][jab_end + 1], config)
    blocked_current_hold = blocked["before"][blocked_start:blocked_cross_end + 1]
    blocked_proposed_hold = blocked["after"][blocked_start:blocked_cross_end + 1]
    collision_groups = {
        "standingJab": standing["after"][jab_start:jab_end + 1],
        "standingCross": standing["after"][cross_start:cross_end + 1],
        "blockedJab": blocked["after"][blocked_start:blocked_end + 1],
        "blockedCross": blocked["after"][blocked_cross_start:blocked_cross_end + 1],
    }
    return {
        "schemaVersion": 1,
        "version": config["version"],
        "reviewOnly": True,
        "productionChanged": False,
        "runtimeWiring": False,
        "scenarioCount": len(scenarios),
        "standing": {
            "currentMaxFootMarkerTravelPx": round(_foot_marker_travel(
                manifest,
                config["sources"]["jab"]["manifestAction"],
                int(config["sources"]["jab"]["frameCount"]),
                float(config["sources"]["jab"]["displaySizePx"]),
            ), 3),
            "proposedFootMarkerTravelPx": 0.0,
            "currentLowerAnchorTravelPx": round(_range([
                _anchor_world_x(record, config)
                for record in standing["before"][jab_start:jab_end + 1]
            ]), 3),
            "proposedLowerAnchorTravelPx": round(_range([
                _anchor_world_x(record, config)
                for record in standing["after"][jab_start:jab_end + 1]
            ]), 3),
            "currentFinalToRecoveryHeightDeltaPx": round(abs(
                _visible_height(standing["before"][jab_end], config)
                - _visible_height(standing["before"][jab_end + 1], config)
            ), 3),
            "proposedFinalToRecoveryHeightDeltaPx": round(abs(
                _visible_height(standing["after"][jab_end], config)
                - _visible_height(standing["after"][jab_end + 1], config)
            ), 3),
            "currentFinalToRecoveryChangedPixels": changed_pixels(current_end, current_recovery),
            "proposedFinalToRecoveryChangedPixels": changed_pixels(proposed_end, proposed_recovery),
            "proposedEndpointChangedPixels": changed_pixels(
                candidates["standingFull"]["jab"][-1],
                candidates["idleBase"],
            ),
        },
        "blocked": {
            "authoredRunFramesInRightLane": lead_end - lead_start + 1,
            "completeRunCycleInRightLane": sorted(
                config["blocked"]["runLeadFrames"]
            ) == list(range(int(config["sources"]["run"]["frameCount"]))),
            "runToPlantPhaseContinuous": (
                config["blocked"]["runLeadFrames"][-1] + 1
            ) % int(config["sources"]["run"]["frameCount"]) == int(
                config["blocked"]["plantRunStartFrame"]
            ),
            "rightLaneRunSpritePixelMismatches": sum(
                changed_pixels(left["frame"], right["frame"]) > 0
                for left, right in zip(
                    blocked["before"][lead_start:lead_end + 1],
                    blocked["after"][lead_start:lead_end + 1],
                )
            ),
            "currentBodyRootExcursionPx": round(_range([
                float(record["rootXPx"])
                for record in blocked_current_hold
            ]), 3),
            "proposedBodyRootExcursionPx": round(_range([
                float(record["rootXPx"])
                for record in blocked_proposed_hold
            ]), 3),
            "currentRootDirectionReversals": _root_direction_reversals(blocked["before"]),
            "proposedRootDirectionReversals": _root_direction_reversals(blocked["after"]),
            "currentForwardReturnDistancePx": round(
                _forward_root_distance(blocked["before"][blocked_start:]), 3
            ),
            "proposedForwardReturnDistancePx": round(
                _forward_root_distance(blocked["after"][blocked_start:]), 3
            ),
            "currentApproachTravelPx": round(_range([
                float(record["rootXPx"]) for record in blocked["before"][:blocked_start]
            ]), 3),
            "proposedApproachTravelPx": round(_range([
                float(record["rootXPx"]) for record in blocked["after"][:blocked_start]
            ]), 3),
            "currentActionLowerAnchorTravelPx": round(_range([
                _anchor_world_x(record, config)
                for record in blocked["before"][blocked_start:blocked_end + 1]
            ]), 3),
            "proposedActionLowerAnchorTravelPx": round(_range([
                _anchor_world_x(record, config)
                for record in blocked["after"][blocked_start:blocked_end + 1]
            ]), 3),
            "proposedSettledLowerAnchorTravelPx": round(_range([
                _anchor_world_x(record, config)
                for record in blocked["after"][blocked_start + plant_count:blocked_end + 1]
            ]), 3),
        },
        "collision": {
            "tileFaceOffsetPx": float(config["geometry"]["bodyWidthPx"]) / 2.0,
            "currentSolidFrames": _collision_summary(
                standing["before"] + blocked["before"], config
            ),
            "proposedSolidFrames": _collision_summary(
                standing["after"] + blocked["after"], config
            ),
            "proposedActions": {
                key: _collision_summary(records, config)
                for key, records in collision_groups.items()
            },
        },
        "running": {
            "currentEntryResidualPixels": changed_pixels(current_running[0], pure_run_start),
            "proposedEntryResidualPixels": changed_pixels(proposed_running[0], pure_run_start),
            "currentExitResidualPixels": changed_pixels(current_running[-1], pure_run_end),
            "proposedExitResidualPixels": changed_pixels(proposed_running[-1], pure_run_end),
            "currentWorldRootTravelPx": round(_range([
                float(record["rootXPx"])
                for record in running["before"][run_start:run_end + 1]
            ]), 3),
            "proposedWorldRootTravelPx": round(_range([
                float(record["rootXPx"])
                for record in running["after"][run_start:run_end + 1]
            ]), 3),
        },
        "candidate": {
            "standingJabFrames": len(candidates["standingFull"]["jab"]),
            "standingCrossFrames": len(candidates["standingFull"]["cross"]),
            "movingJabFrames": len(candidates["movingJab"]),
            "movingCrossFrames": len(candidates["movingCross"]),
            "maxMovingPelvisAlignmentErrorPx": round(max(
                float(candidates["movingMetrics"]["jab"]["maxPelvisAlignmentErrorPx"]),
                float(candidates["movingMetrics"]["cross"]["maxPelvisAlignmentErrorPx"]),
            ), 3),
        },
    }
