"""Build the speed-matched lower-body review sequence."""

from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from typing import Any

from PIL import Image

from moving_side_dig_compositor import build_candidate_frames
from held_dig_sequence_core import (
    RuntimeAssets,
    action_records,
    contact_indexes,
    normalize_pair,
    record,
)


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
    run_count = manifest["actions"][build["actionIds"]["run"]]["frame_count"]
    advance = speed * duration_seconds / build["strideDistancePx"] * run_count
    offsets = [
        round(index * advance / (recipe["build"]["framesPerAction"] - 1))
        for index in range(recipe["build"]["framesPerAction"])
    ]
    tuned = deepcopy(recipe)
    tuned["build"]["frameCount"] = tuned["build"]["framesPerAction"]
    tuned["build"]["runStartFrame"] = run_start
    tuned["build"]["runFrameOffsets"] = offsets
    candidate = deepcopy(
        next(
            value
            for value in recipe["candidates"]
            if value["id"] == recipe["defaultCandidateId"]
        )
    )
    candidate["punchPattern"] = [action, action]
    sheets = {
        source_id: Image.open(root / source["file"]).convert("RGBA")
        for source_id, source in recipe["sources"].items()
    }
    frames, metrics = build_candidate_frames(
        tuned, manifest, sheets, candidate
    )
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
    build = config["build"]
    action_ids = build["actionIds"]
    contact = build["contactSequenceIndexes"]["moving-side"]
    slow = build["slowMoveSpeedPxPerSec"]
    fast = build["referenceMoveSpeedPxPerSec"]
    before_advance = recipe["build"]["runPhaseAdvanceFrames"]
    jab = action_records(
        assets,
        action_ids["movingJab"],
        f"FIXED {before_advance}-PHASE LOWER",
        speed=slow,
        contact_index=contact,
    )
    cross = action_records(
        assets,
        action_ids["movingCross"],
        f"FIXED {before_advance}-PHASE LOWER",
        speed=fast,
        contact_index=contact,
    )
    _, jab_metadata = assets.action(action_ids["movingJab"])
    run_start = jab_metadata["composition"]["run_frame_start"]
    run_count = manifest["actions"][action_ids["run"]]["frame_count"]
    before = jab + cross
    matched_jab, slow_advance = build_speed_composite(
        root, config, manifest, recipe, "jab", run_start, slow
    )
    next_start = (run_start + slow_advance) % run_count
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
        "beforeJogPhaseAdvance": [before_advance, before_advance],
        "afterJogPhaseAdvance": [slow_advance, fast_advance],
        "contactFramesBefore": contact_indexes(before),
        "contactFramesAfter": contact_indexes(after),
    }
