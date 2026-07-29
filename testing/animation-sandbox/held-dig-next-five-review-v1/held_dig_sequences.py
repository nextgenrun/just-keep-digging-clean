"""Assemble review-only Before/After held-dig animation sequences."""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any

from PIL import Image

from moving_side_dig_compositor import build_candidate_frames, extract_frame


class RuntimeAssets:
    """Loads runtime action frames and their authored lower-body phase metadata."""

    def __init__(self, root: Path, config: dict[str, Any], manifest: dict[str, Any]):
        self.root = root
        self.config = config
        self.manifest = manifest
        self.sheet_cache: dict[str, Image.Image] = {}

    def action(self, action_id: str) -> tuple[list[Image.Image], dict[str, Any]]:
        metadata = self.manifest["actions"][action_id]
        file_name = metadata["file"]
        if file_name not in self.sheet_cache:
            runtime_dir = self.root / self.config["sources"]["runtimeDirectory"]
            self.sheet_cache[file_name] = Image.open(runtime_dir / file_name).convert("RGBA")
        sheet = self.sheet_cache[file_name]
        composition = metadata.get("composition") or {}
        indexes = composition.get("atlas_frames") or list(range(metadata["frame_count"]))
        columns = int(metadata.get("columns") or self.config["build"]["sourceColumns"])
        frames = [
            extract_frame(
                sheet,
                int(index),
                self.config["build"]["frameWidth"],
                self.config["build"]["frameHeight"],
                columns,
            )
            for index in indexes
        ]
        return frames, metadata


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def record(
    frame: Image.Image,
    label: str,
    *,
    run_phase: int | None = None,
    target: str = "side-right",
    flip_x: bool = False,
    speed: float = 0,
    contact: bool = False,
    event: str | None = None,
) -> dict[str, Any]:
    return {
        "frame": frame,
        "label": label,
        "runPhase": run_phase,
        "target": target,
        "flipX": flip_x,
        "speed": speed,
        "contact": contact,
        "event": event,
        "scrollPx": 0.0,
    }


def action_records(
    assets: RuntimeAssets,
    action_id: str,
    label: str,
    *,
    target: str = "side-right",
    flip_x: bool = False,
    speed: float = 0,
    contact_index: int | None = None,
) -> list[dict[str, Any]]:
    frames, metadata = assets.action(action_id)
    phases = (metadata.get("composition") or {}).get("run_frames") or [None] * len(frames)
    return [
        record(
            frame,
            label,
            run_phase=phases[index] if index < len(phases) else None,
            target=target,
            flip_x=flip_x,
            speed=speed,
            contact=index == contact_index,
        )
        for index, frame in enumerate(frames)
    ]


def stretch(records: list[dict[str, Any]], count: int) -> list[dict[str, Any]]:
    if count <= 0 or not records:
        return []
    if count == 1:
        return [dict(records[0])]
    return [
        dict(records[round(index * (len(records) - 1) / (count - 1))])
        for index in range(count)
    ]


def retime_contact(
    records: list[dict[str, Any]],
    source_contact_index: int,
    output_contact_index: int,
) -> list[dict[str, Any]]:
    before = stretch(records[: source_contact_index + 1], output_contact_index + 1)
    after_count = len(records) - output_contact_index - 1
    after = stretch(records[source_contact_index + 1 :], after_count)
    output = before + after
    for index, value in enumerate(output):
        value["contact"] = index == output_contact_index
    return output


def run_records(
    assets: RuntimeAssets,
    phases: list[int],
    label: str,
    *,
    target: str,
    flip_x: bool,
    speed: float,
) -> list[dict[str, Any]]:
    run_frames, _ = assets.action("run")
    return [
        record(
            run_frames[phase % len(run_frames)],
            label,
            run_phase=phase % len(run_frames),
            target=target,
            flip_x=flip_x,
            speed=speed,
        )
        for phase in phases
    ]


def apply_event(
    before: list[dict[str, Any]],
    after: list[dict[str, Any]],
    scenario: dict[str, Any],
) -> None:
    index = int(scenario["eventFrame"])
    before[index]["event"] = scenario["eventLabel"]
    after[index]["event"] = scenario["eventLabel"]


def apply_scroll(records: list[dict[str, Any]], frame_duration_ms: float) -> None:
    scroll = 0.0
    seconds = frame_duration_ms / 1000
    for value in records:
        value["scrollPx"] = scroll
        scroll += float(value["speed"]) * seconds


def normalize_pair(
    config: dict[str, Any],
    scenario: dict[str, Any],
    before: list[dict[str, Any]],
    after: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if len(before) != len(after):
        raise ValueError(f"{scenario['id']} Before/After lengths differ")
    apply_event(before, after, scenario)
    duration = config["build"]["previewFrameDurationMs"]
    apply_scroll(before, duration)
    apply_scroll(after, duration)
    return before, after


def build_held_chain(
    config: dict[str, Any],
    scenario: dict[str, Any],
    assets: RuntimeAssets,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    contact = config["build"]["contactSequenceIndexes"]["moving-side"]
    jab = action_records(
        assets, "moving-side-dig-jab", "MOVING JAB", speed=200, contact_index=contact
    )
    cross = action_records(
        assets, "moving-side-dig-cross", "MOVING CROSS", speed=200, contact_index=contact
    )
    gap = run_records(
        assets, [23, 24], "JOG FLASH", target="side-right", flip_x=False, speed=200
    )
    before = jab + gap + [dict(value) for value in cross[2:]]
    after = jab + cross
    before, after = normalize_pair(config, scenario, before, after)
    return before, after, {
        "frames": len(before),
        "beforeJogFlashFrames": len(gap),
        "afterJogFlashFrames": 0,
        "contactFramesBefore": [6, 28],
        "contactFramesAfter": [6, 28],
    }


def build_move_during_strike(
    config: dict[str, Any],
    scenario: dict[str, Any],
    assets: RuntimeAssets,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    event = int(scenario["eventFrame"])
    contacts = config["build"]["contactSequenceIndexes"]
    standing = action_records(
        assets, "punch-jab", "STANDING JAB", contact_index=contacts["punch-jab"]
    )
    moving = action_records(
        assets,
        "moving-side-dig-jab",
        "JOG LOWER ENGAGED",
        speed=200,
        contact_index=contacts["moving-side"],
    )
    cross = action_records(
        assets,
        "moving-side-dig-cross",
        "MOVING CROSS",
        speed=200,
        contact_index=contacts["moving-side"],
    )
    before = [dict(value) for value in standing] + [dict(value) for value in moving[:17]]
    for index, value in enumerate(before):
        value["speed"] = 0 if index < event else 200
        if event <= index < len(standing):
            value["label"] = "STANDING FEET SLIDE"
    matched_tail = stretch(moving[8:], len(standing) - event)
    for value in matched_tail:
        value["label"] = "PHASE-MATCHED JOG LOWER"
        value["contact"] = False
    after = [dict(value) for value in standing[:event]] + matched_tail + [
        dict(value) for value in cross[:17]
    ]
    for index, value in enumerate(after):
        value["speed"] = 0 if index < event else 200
    before, after = normalize_pair(config, scenario, before, after)
    return before, after, {
        "frames": len(before),
        "movementInputFrame": event,
        "standingFootTravelFramesBefore": len(standing) - event,
        "standingFootTravelFramesAfter": 0,
        "contactFramesBefore": [7, 33],
        "contactFramesAfter": [7, 33],
    }


def build_aim_retarget(
    config: dict[str, Any],
    scenario: dict[str, Any],
    assets: RuntimeAssets,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    event = int(scenario["eventFrame"])
    contacts = config["build"]["contactSequenceIndexes"]
    side = action_records(
        assets,
        "moving-side-dig-jab",
        "SIDE STRIKE",
        speed=200,
        contact_index=contacts["moving-side"],
    )
    diagonal = action_records(
        assets,
        "moving-diagonal-up-phase-15",
        "UP-SIDE STRIKE",
        target="up-right",
        speed=200,
        contact_index=contacts["moving-diagonal-up"],
    )
    gap = run_records(
        assets, [23, 24], "WAIT FOR OLD ACTION", target="up-right", flip_x=False, speed=200
    )
    before_tail = [dict(value) for value in (diagonal + diagonal[:5])]
    before = [dict(value) for value in side] + gap + before_tail
    before = before[:44]
    redirected = retime_contact(diagonal, contacts["moving-diagonal-up"], 16)
    redirected.extend(dict(value) for value in diagonal[: 29 - len(redirected)])
    redirected = redirected[:29]
    after = [dict(value) for value in side[:event]] + redirected
    for index in range(event, len(before)):
        before[index]["target"] = "up-right"
    for value in after[event:]:
        value["target"] = "up-right"
        value["label"] = "PHASE-MATCHED UP-SIDE"
    before, after = normalize_pair(config, scenario, before, after)
    return before, after, {
        "frames": len(before),
        "retargetInputFrame": event,
        "visualResponseDelayFramesBefore": 9,
        "visualResponseDelayFramesAfter": 0,
        "nextContactFrameBefore": 31,
        "nextContactFrameAfter": 31,
    }


def build_mining_reversal(
    config: dict[str, Any],
    scenario: dict[str, Any],
    assets: RuntimeAssets,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    event = int(scenario["eventFrame"])
    contact = config["build"]["contactSequenceIndexes"]["moving-side"]
    jab = action_records(
        assets, "moving-side-dig-jab", "RIGHT JAB", speed=200, contact_index=contact
    )
    cross_left = action_records(
        assets,
        "moving-side-dig-cross",
        "LEFT CROSS",
        target="side-left",
        flip_x=True,
        speed=-200,
        contact_index=contact,
    )
    before = [dict(value) for value in jab] + [dict(value) for value in cross_left]
    for index in range(event, len(jab)):
        before[index]["target"] = "side-left"
        before[index]["speed"] = -200
        before[index]["label"] = "PUNCH STILL AIMED RIGHT"
    pivot = run_records(
        assets,
        config["build"]["pivotRunFrames"],
        "PLANTED ACTION PIVOT",
        target="side-left",
        flip_x=True,
        speed=-200,
    )
    retimed_cross = retime_contact(cross_left, contact, 19)
    after = [dict(value) for value in jab[:event]] + pivot + retimed_cross
    after = after[:44]
    for value in after[event:]:
        value["target"] = "side-left"
        value["flipX"] = True
        value["speed"] = -200
    before, after = normalize_pair(config, scenario, before, after)
    return before, after, {
        "frames": len(before),
        "turnInputFrame": event,
        "facingResponseDelayFramesBefore": len(jab) - event,
        "facingResponseDelayFramesAfter": 0,
        "pivotFramesAfter": len(pivot),
        "contactFramesBefore": [6, 28],
        "contactFramesAfter": [6, 28],
    }


def build_speed_composite(
    root: Path,
    config: dict[str, Any],
    manifest: dict[str, Any],
    recipe: dict[str, Any],
    action: str,
    run_start: int,
    speed: float,
) -> tuple[list[dict[str, Any]], int]:
    build = config["build"]
    duration_seconds = build["effectiveCooldownMs"] / 1000
    advance = speed * duration_seconds / build["strideDistancePx"] * 28
    offsets = [
        round(index * advance / (recipe["build"]["framesPerAction"] - 1))
        for index in range(recipe["build"]["framesPerAction"])
    ]
    tuned = deepcopy(recipe)
    tuned["build"]["frameCount"] = tuned["build"]["framesPerAction"]
    tuned["build"]["runStartFrame"] = run_start
    tuned["build"]["runFrameOffsets"] = offsets
    candidate = deepcopy(next(
        value for value in recipe["candidates"]
        if value["id"] == recipe["defaultCandidateId"]
    ))
    candidate["punchPattern"] = [action, action]
    sheets = {
        source_id: Image.open(root / source["file"]).convert("RGBA")
        for source_id, source in recipe["sources"].items()
    }
    frames, metrics = build_candidate_frames(tuned, manifest, sheets, candidate)
    records = [
        record(
            frame,
            f"{round(speed)} PX/S MATCHED FEET",
            run_phase=metrics["sourceFrames"][index]["run"],
            speed=speed,
            contact=index == build["contactSequenceIndexes"]["moving-side"],
        )
        for index, frame in enumerate(frames)
    ]
    return records, round(advance)


def build_speed_matched_feet(
    root: Path,
    config: dict[str, Any],
    scenario: dict[str, Any],
    assets: RuntimeAssets,
    manifest: dict[str, Any],
    recipe: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    contact = config["build"]["contactSequenceIndexes"]["moving-side"]
    slow = config["build"]["slowMoveSpeedPxPerSec"]
    fast = config["build"]["referenceMoveSpeedPxPerSec"]
    jab = action_records(
        assets, "moving-side-dig-jab", "FIXED 14-PHASE LOWER", speed=slow, contact_index=contact
    )
    cross = action_records(
        assets, "moving-side-dig-cross", "FIXED 14-PHASE LOWER", speed=fast, contact_index=contact
    )
    before = jab + cross
    matched_jab, slow_advance = build_speed_composite(
        root, config, manifest, recipe, "jab", 9, slow
    )
    next_start = (9 + slow_advance) % 28
    matched_cross, fast_advance = build_speed_composite(
        root, config, manifest, recipe, "cross", next_start, fast
    )
    after = matched_jab + matched_cross
    before, after = normalize_pair(config, scenario, before, after)
    return before, after, {
        "frames": len(before),
        "speedChangeFrame": scenario["eventFrame"],
        "slowSpeedPxPerSec": slow,
        "fastSpeedPxPerSec": fast,
        "beforeJogPhaseAdvance": [14, 14],
        "afterJogPhaseAdvance": [slow_advance, fast_advance],
        "contactFramesBefore": [6, 28],
        "contactFramesAfter": [6, 28],
    }


def build_all_sequences(
    root: Path,
    config: dict[str, Any],
    manifest: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    assets = RuntimeAssets(root, config, manifest)
    recipe = load_json(root / config["sources"]["movingSideRecipe"])
    builders = {
        "held-chain": lambda scenario: build_held_chain(config, scenario, assets),
        "move-during-strike": lambda scenario: build_move_during_strike(
            config, scenario, assets
        ),
        "aim-retarget": lambda scenario: build_aim_retarget(config, scenario, assets),
        "mining-reversal": lambda scenario: build_mining_reversal(config, scenario, assets),
        "speed-matched-feet": lambda scenario: build_speed_matched_feet(
            root, config, scenario, assets, manifest, recipe
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
