"""Assemble the review-only attack size and anchor-lock comparisons."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from held_dig_scale_lock import (
    ScaleLockedMovingActions,
    current_attack_records,
)
from held_dig_sequence_core import (
    RuntimeAssets,
    contact_indexes,
    load_json,
    normalize_pair,
    stretch,
)
from held_dig_stationary_scale_sequences import (
    build_jog_attack,
    run_reference,
    standing_records,
)


def scale_metrics(config: dict[str, Any]) -> dict[str, Any]:
    build = config["build"]
    current = float(build["currentMovingUpperScale"])
    reference = float(build["scaleLockTorsoReferenceSourcePx"])
    return {
        "currentApparentScale": current,
        "proposedApparentScale": float(build["proposedMovingUpperScale"]),
        "currentTorsoLengthSourcePx": round(reference * current, 3),
        "proposedTorsoLengthSourcePx": reference,
        "sizePulsePercentBefore": round((1 - current) * 100, 2),
        "sizePulsePercentAfter": 0,
    }


def moving_records(
    assets: RuntimeAssets,
    config: dict[str, Any],
    action_key: str,
    label: str,
) -> list[dict[str, Any]]:
    build = config["build"]
    action_id = build["actionIds"][
        "movingJab" if action_key == "jab" else "movingCross"
    ]
    return current_attack_records(
        assets,
        config,
        action_id,
        label,
        display_size_px=build["displaySizePx"],
        apparent_scale=build["currentMovingUpperScale"],
        contact_index=build["contactSequenceIndexes"]["moving-side"],
        speed=build["referenceMoveSpeedPxPerSec"],
    )


def build_moving_hold(
    config: dict[str, Any],
    scenario: dict[str, Any],
    assets: RuntimeAssets,
    locked: ScaleLockedMovingActions,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    before = (
        moving_records(assets, config, "jab", "88.6% MOVING JAB")
        + moving_records(assets, config, "cross", "88.6% MOVING CROSS")
    )
    speed = config["build"]["referenceMoveSpeedPxPerSec"]
    after = (
        locked.records("jab", "100% SCALE-LOCKED JAB", speed=speed)
        + locked.records("cross", "100% SCALE-LOCKED CROSS", speed=speed)
    )
    before, after = normalize_pair(config, scenario, before, after)
    metrics = {
        "frames": len(before),
        **scale_metrics(config),
        "contactFramesBefore": contact_indexes(before),
        "contactFramesAfter": contact_indexes(after),
        "bottomDriftPxAfter": locked.metrics["bottomDriftPx"],
        "pelvisAlignmentErrorPxAfter": locked.metrics["maxPelvisAlignmentErrorPx"],
    }
    return before, after, metrics


def build_move_during_strike(
    config: dict[str, Any],
    scenario: dict[str, Any],
    assets: RuntimeAssets,
    locked: ScaleLockedMovingActions,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    event = int(scenario["eventFrame"])
    build = config["build"]
    current_standing = standing_records(
        assets, config, "jab", "109 PX STANDING JAB", False
    )
    proposed_standing = standing_records(
        assets, config, "jab", "123 PX SCALE-LOCKED JAB", True
    )
    current_moving = moving_records(
        assets, config, "jab", "88.6% MOVING TORSO"
    )
    current_cross = moving_records(
        assets, config, "cross", "88.6% MOVING CROSS"
    )
    speed = build["referenceMoveSpeedPxPerSec"]
    locked_moving = locked.records(
        "jab", "100% PHASE-MATCHED MOVING JAB", speed=speed
    )
    locked_cross = locked.records(
        "cross", "100% SCALE-LOCKED CROSS", speed=speed
    )
    preview_frames = len(current_moving) * 2
    continuation = preview_frames - len(current_standing)
    before = current_standing + current_moving[:continuation]
    for index, value in enumerate(before):
        value["speed"] = 0 if index < event else speed
        if event <= index < len(current_standing):
            value["label"] = "109 PX STANDING FEET SLIDE"
    _, moving_metadata = assets.action(build["actionIds"]["movingJab"])
    action_frames = moving_metadata["composition"]["action_frames"]
    moving_start = min(
        range(len(action_frames)),
        key=lambda index: abs(int(action_frames[index]) - event),
    )
    matched_tail = stretch(
        locked_moving[moving_start:],
        len(proposed_standing) - event,
    )
    for value in matched_tail:
        value["contact"] = False
    after = proposed_standing[:event] + matched_tail + locked_cross[:continuation]
    for index, value in enumerate(after):
        value["speed"] = 0 if index < event else speed
    before, after = normalize_pair(config, scenario, before, after)
    return before, after, {
        "frames": len(before),
        "movementInputFrame": event,
        **scale_metrics(config),
        "standingFootTravelFramesBefore": len(current_standing) - event,
        "standingFootTravelFramesAfter": 0,
        "contactFramesBefore": contact_indexes(before),
        "contactFramesAfter": contact_indexes(after),
    }


def build_held_chain(
    config: dict[str, Any],
    scenario: dict[str, Any],
    assets: RuntimeAssets,
    locked: ScaleLockedMovingActions,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    build = config["build"]
    current_jab = moving_records(assets, config, "jab", "88.6% MOVING JAB")
    current_cross = moving_records(assets, config, "cross", "88.6% MOVING CROSS")
    gap = run_reference(
        assets,
        config,
        build["chainJogPhases"],
        "123 PX JOG FLASH",
    )
    for value in gap:
        value["speed"] = build["referenceMoveSpeedPxPerSec"]
    before = current_jab + gap + current_cross[len(gap):]
    speed = build["referenceMoveSpeedPxPerSec"]
    after = (
        locked.records("jab", "100% SCALE-LOCKED JAB", speed=speed)
        + locked.records("cross", "100% SCALE-LOCKED CROSS", speed=speed)
    )
    before, after = normalize_pair(config, scenario, before, after)
    return before, after, {
        "frames": len(before),
        **scale_metrics(config),
        "beforeJogFlashFrames": len(gap),
        "afterJogFlashFrames": 0,
        "contactFramesBefore": contact_indexes(before),
        "contactFramesAfter": contact_indexes(after),
    }


def build_all_sequences(
    root: Path,
    config: dict[str, Any],
    manifest: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    assets = RuntimeAssets(root, config, manifest)
    recipe = load_json(root / config["sources"]["movingSideRecipe"])
    locked = ScaleLockedMovingActions(root, config, manifest, recipe)
    builders = {
        "moving-hold-scale-lock": lambda scenario: build_moving_hold(
            config, scenario, assets, locked
        ),
        "jog-jab-size-lock": lambda scenario: build_jog_attack(
            config, scenario, assets, "jab"
        ),
        "jog-cross-size-lock": lambda scenario: build_jog_attack(
            config, scenario, assets, "cross"
        ),
        "move-during-strike-scale-lock": lambda scenario: build_move_during_strike(
            config, scenario, assets, locked
        ),
        "held-chain-scale-lock": lambda scenario: build_held_chain(
            config, scenario, assets, locked
        ),
    }
    output = {}
    for scenario in config["scenarios"]:
        before, after, metrics = builders[scenario["id"]](scenario)
        output[scenario["id"]] = {
            "before": before,
            "after": after,
            "metrics": metrics,
        }
    return output
