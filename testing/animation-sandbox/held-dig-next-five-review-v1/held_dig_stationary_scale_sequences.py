"""Build stationary attack-size comparison records and sequences."""

from __future__ import annotations

from typing import Any

from held_dig_scale_lock import current_attack_records
from held_dig_sequence_core import (
    RuntimeAssets,
    contact_indexes,
    normalize_pair,
    run_records,
)


def run_reference(
    assets: RuntimeAssets,
    config: dict[str, Any],
    phases: list[int],
    label: str,
) -> list[dict[str, Any]]:
    output = run_records(
        assets,
        phases,
        label,
        target="side-right",
        flip_x=False,
        speed=0,
    )
    for value in output:
        value["displaySizePx"] = config["build"]["proposedAttackDisplaySizePx"]
        value["apparentScale"] = config["build"]["proposedMovingUpperScale"]
        value["visualOffsetPx"] = 0
    return output


def standing_records(
    assets: RuntimeAssets,
    config: dict[str, Any],
    action_key: str,
    label: str,
    proposed: bool,
) -> list[dict[str, Any]]:
    build = config["build"]
    action_id = build["actionIds"][
        "punchJab" if action_key == "jab" else "punchCross"
    ]
    contact = build["contactSequenceIndexes"][
        "punch-jab" if action_key == "jab" else "punch-cross"
    ]
    display = build[
        "proposedAttackDisplaySizePx"
        if proposed
        else "currentAttackDisplaySizePx"
    ]
    return current_attack_records(
        assets,
        config,
        action_id,
        label,
        display_size_px=display,
        apparent_scale=display / build["proposedAttackDisplaySizePx"],
        contact_index=contact,
    )


def build_jog_attack(
    config: dict[str, Any],
    scenario: dict[str, Any],
    assets: RuntimeAssets,
    action_key: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    build = config["build"]
    entry = run_reference(
        assets,
        config,
        build["scaleReferenceEntryPhases"],
        "123 PX JOG REFERENCE",
    )
    exit_frames = run_reference(
        assets,
        config,
        build["scaleReferenceExitPhases"],
        "123 PX JOG REFERENCE",
    )
    current = standing_records(
        assets,
        config,
        action_key,
        f"{build['currentAttackDisplaySizePx']} PX {action_key.upper()}",
        False,
    )
    proposed = standing_records(
        assets,
        config,
        action_key,
        f"{build['proposedAttackDisplaySizePx']} PX SCALE-LOCKED {action_key.upper()}",
        True,
    )
    before = [dict(value) for value in entry] + current + [
        dict(value) for value in exit_frames
    ]
    after = [dict(value) for value in entry] + proposed + [
        dict(value) for value in exit_frames
    ]
    before, after = normalize_pair(config, scenario, before, after)
    return before, after, {
        "frames": len(before),
        "attackStartFrame": len(entry),
        "displaySizePxBefore": build["currentAttackDisplaySizePx"],
        "displaySizePxAfter": build["proposedAttackDisplaySizePx"],
        "sizePulsePercentBefore": round(
            (
                1
                - build["currentAttackDisplaySizePx"]
                / build["proposedAttackDisplaySizePx"]
            )
            * 100,
            2,
        ),
        "sizePulsePercentAfter": 0,
        "contactFramesBefore": contact_indexes(before),
        "contactFramesAfter": contact_indexes(after),
        "contactVisualOffsetPxBefore": current[0]["visualOffsetPx"],
        "contactVisualOffsetPxAfter": proposed[0]["visualOffsetPx"],
    }
