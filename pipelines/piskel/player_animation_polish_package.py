"""Build and promote the centralized Survival player animation-polish package."""

from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
PIPELINE_TOOLS = ROOT / "tools" / "piskel-mcp"
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(PIPELINE_TOOLS))

from piskel_artifacts import write_artifacts  # noqa: E402
from piskel_commands import validate_piskel_frames  # noqa: E402
from piskel_document import (  # noqa: E402
    ensure_parent,
    load_manifest,
    load_runtime_frames,
    make_piskel,
    read_piskel,
    repo_path,
    save_runtime_frames,
    write_json,
)
from player_animation_polish_compositor import (  # noqa: E402
    build_transition_frames,
    frame_stability,
)
from player_animation_run_polish import (  # noqa: E402
    build_polished_run,
    build_run_action_metadata,
    verify_source_hash,
)
from moving_side_dig_compositor import pack_sheet  # noqa: E402
from player_animation_diagonal_compositor import build_diagonal_frames  # noqa: E402
from player_animation_vertical_compositor import (  # noqa: E402
    build_vertical_frames,
    build_vertical_source_frames,
)
from player_animation_polish_runtime_module import write_runtime_module  # noqa: E402
from player_animation_polish_review import write_review_board  # noqa: E402


CONFIG_PATH = ROOT / "values" / "playerAnimationPolishProduction.json"
RUNTIME_MANIFEST_PATH = (
    ROOT / "sprites" / "character" / "survival-ual-player-v1" / "runtime" / "manifest.json"
)


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _assert_identity(
    expected: list[Image.Image],
    actual: list[Image.Image],
    entry_id: str,
    *,
    strict_transparent_rgb: bool = False,
) -> None:
    if len(expected) != len(actual):
        raise ValueError(f"{entry_id} Piskel round-trip changed the frame count")
    for index, (left, right) in enumerate(zip(expected, actual)):
        left_pixels = np.asarray(left.convert("RGBA"))
        right_pixels = np.asarray(right.convert("RGBA"))
        same = np.array_equal(left_pixels, right_pixels)
        if not same and not strict_transparent_rgb:
            same_alpha = np.array_equal(left_pixels[:, :, 3], right_pixels[:, :, 3])
            visible = (left_pixels[:, :, 3] > 0) | (right_pixels[:, :, 3] > 0)
            same = same_alpha and np.array_equal(
                left_pixels[:, :, :3][visible],
                right_pixels[:, :, :3][visible],
            )
        if not same:
            raise ValueError(f"{entry_id} Piskel round-trip changed frame {index}")


def _promote_entry(
    entry: dict[str, Any],
    frames: list[Image.Image],
) -> dict[str, Any]:
    source_path = repo_path(entry["sourcePiskel"])
    ensure_parent(source_path)
    write_json(source_path, make_piskel(entry, frames))
    round_trip, width, height, fps = read_piskel(source_path)
    validation = validate_piskel_frames(
        entry,
        round_trip,
        width,
        height,
        fps,
        entry["sourcePiskel"],
    )
    if not validation["ok"]:
        raise ValueError(f"{entry['id']} Piskel validation failed: {validation['errors']}")
    _assert_identity(frames, round_trip, entry["id"])
    runtime = save_runtime_frames(entry, round_trip)
    persisted = load_runtime_frames(entry)
    _assert_identity(
        round_trip,
        persisted,
        f"{entry['id']} saved runtime atlas",
        strict_transparent_rgb=True,
    )
    artifacts = write_artifacts(entry, round_trip, runtime)
    return {
        "frames": round_trip,
        "validation": validation,
        "runtime": runtime,
        "artifacts": artifacts,
    }


def _diagonal_action_metadata(
    runtime_manifest: dict[str, Any],
    config: dict[str, Any],
    runtime: dict[str, Any],
    source: dict[str, Any],
    markers: dict[str, dict[str, list[float]]],
) -> dict[str, Any]:
    run = runtime_manifest["actions"][config["runPolish"]["manifestAction"]]
    family = source["family"]
    family_config = config["diagonalMining"][family]
    action_source = config["sources"][family_config["source"]]
    action_clip = action_source.get("sourceClip") or action_source.get("manifestAction")
    generated = next(
        variant for variant in runtime["diagonalMining"]["variants"]
        if variant["family"] == family
        and variant["runStartFrame"] == source["runStartFrame"]
    )
    return {
        "file": config["sheets"]["diagonalDig"]["fileName"],
        "frame_count": config["diagonalMining"]["frameCount"],
        "frame_width": config["frameWidth"],
        "frame_height": config["frameHeight"],
        "columns": 16,
        "rows": 8,
        "fps": config["frameRate"],
        "loop": False,
        "source": "piskel-phase-locked-diagonal-upper-lower-composite",
        "source_clip": f"Jog_Fwd_Loop + {action_clip}",
        "source_clips": [
            "Jog_Fwd_Loop",
            action_clip,
        ],
        "source_crop_mode": "fixed-frame-phase-locked-upper-lower-composite",
        "source_window": config["frameWidth"],
        "source_crops": [
            [0, 0, config["frameWidth"], config["frameHeight"]]
        ] * config["diagonalMining"]["frameCount"],
        "game_retarget": deepcopy(run.get("game_retarget")),
        "motion_origin": "phase-locked-run-lower-directional-strike-upper",
        "authored_pose": None,
        "visual_skin": deepcopy(run.get("visual_skin")),
        "weapon": None,
        "composition": {
            "version": 1,
            "family": family,
            "run_frame_start": source["runStartFrame"],
            "run_frames": [
                (source["runStartFrame"] + index) % config["diagonalMining"]["runFrameCount"]
                for index in range(config["diagonalMining"]["frameCount"])
            ],
            "action_frames": family_config["sourceFrames"],
            "atlas_frames": source["frames"],
            "contact_sequence_index": family_config["contactSequenceIndex"],
            "piskel_source": config["sheets"]["diagonalDig"]["sourcePiskel"],
        },
        "rig_markers": {
            "version": runtime_manifest["rig_marker_schema"]["version"],
            "space": runtime_manifest["rig_marker_schema"]["space"],
            "source": "derived-phase-locked-diagonal-piskel-composite",
            "bone_points": deepcopy(run["rig_markers"].get("bone_points", {})),
            "marker_names": deepcopy(
                runtime_manifest["rig_marker_schema"]["required_markers"],
            ),
            "frames": markers,
        },
        "runtime_animation_key": generated["animationKey"],
    }


def build_package() -> dict[str, Any]:
    config = _load_json(CONFIG_PATH)
    runtime_manifest = _load_json(RUNTIME_MANIFEST_PATH)
    piskel_manifest = load_manifest()
    entries = {entry["id"]: entry for entry in piskel_manifest["animations"]}
    sheets = {
        source_id: Image.open(ROOT / source["file"]).convert("RGBA")
        for source_id, source in config["sources"].items()
    }
    run_hash = verify_source_hash(
        ROOT / config["sources"]["run"]["file"],
        config["runPolish"]["sourceSha256"],
    )
    run_frames, run_markers, run_report = build_polished_run(
        config,
        runtime_manifest,
        sheets["run"],
    )
    run_report["sourceSha256"] = run_hash
    runtime_manifest["actions"][config["runPolish"]["manifestAction"]] = (
        build_run_action_metadata(
            config,
            runtime_manifest,
            run_frames,
            run_markers,
            run_report,
        )
    )
    sheets["run"] = pack_sheet(
        run_frames,
        16,
        int(config["frameWidth"]),
        int(config["frameHeight"]),
    )

    transition_frames, transition_layout = build_transition_frames(config, sheets)
    vertical_sources = build_vertical_source_frames(config, sheets)
    vertical_frames, vertical_layout = build_vertical_frames(config, vertical_sources)
    vertical_offset = len(transition_frames)
    transition_frames.extend(vertical_frames)
    transition_layout["vertical"] = {
        family: [vertical_offset + frame for frame in frames]
        for family, frames in vertical_layout.items()
    }

    diagonal_sheets = dict(sheets)
    for family in ("up", "down"):
        source_id = config["verticalMining"][family]["source"]
        diagonal_sheets[source_id] = pack_sheet(
            vertical_sources[family],
            16,
            int(config["frameWidth"]),
            int(config["frameHeight"]),
        )
    diagonal_frames, diagonal_variants = build_diagonal_frames(
        config,
        runtime_manifest,
        diagonal_sheets,
    )
    expected_counts = {
        config["sheets"]["run"]["id"]: len(run_frames),
        config["sheets"]["transitions"]["id"]: len(transition_frames),
        config["sheets"]["diagonalDig"]["id"]: len(diagonal_frames),
    }
    for entry_id, expected in expected_counts.items():
        if int(entries[entry_id]["frameCount"]) != expected:
            raise ValueError(
                f"{entry_id} manifest frame count {entries[entry_id]['frameCount']} != {expected}",
            )

    run_result = _promote_entry(
        entries[config["sheets"]["run"]["id"]],
        run_frames,
    )
    transition_result = _promote_entry(
        entries[config["sheets"]["transitions"]["id"]],
        transition_frames,
    )
    diagonal_result = _promote_entry(
        entries[config["sheets"]["diagonalDig"]["id"]],
        diagonal_frames,
    )
    runtime = write_runtime_module(
        ROOT,
        config,
        transition_layout,
        len(transition_frames),
        diagonal_variants,
        len(diagonal_frames),
        len(run_frames),
    )
    review_path = write_review_board(
        ROOT,
        run_frames,
        transition_frames,
        transition_layout,
        diagonal_frames,
    )
    for source, generated in zip(diagonal_variants, runtime["diagonalMining"]["variants"]):
        runtime_manifest["actions"][generated["sourceAction"]] = _diagonal_action_metadata(
            runtime_manifest,
            config,
            runtime,
            source,
            source["markers"],
        )
    RUNTIME_MANIFEST_PATH.write_text(
        json.dumps(runtime_manifest, indent=2) + "\n",
        encoding="utf-8",
    )

    metrics = {
        "version": config["version"],
        "run": {
            **run_report,
            "alphaAnchorStability": frame_stability(run_frames),
        },
        "transitions": frame_stability(transition_frames),
        "diagonalDig": frame_stability(diagonal_frames),
        "reviewPath": review_path,
        "runPiskel": {
            "validation": run_result["validation"],
            "runtime": run_result["runtime"],
            "artifacts": run_result["artifacts"],
        },
        "transitionPiskel": {
            "validation": transition_result["validation"],
            "runtime": transition_result["runtime"],
            "artifacts": transition_result["artifacts"],
        },
        "diagonalPiskel": {
            "validation": diagonal_result["validation"],
            "runtime": diagonal_result["runtime"],
            "artifacts": diagonal_result["artifacts"],
        },
    }
    if run_result["validation"]["maxBottomDriftPx"] > 0:
        raise ValueError(f"run baseline drift exceeds policy: {metrics}")
    if transition_result["validation"]["maxBottomDriftPx"] > 1:
        raise ValueError(f"transition baseline drift exceeds policy: {metrics}")
    if diagonal_result["validation"]["maxBottomDriftPx"] > 1:
        raise ValueError(f"diagonal baseline drift exceeds policy: {metrics}")
    report_path = (
        ROOT / "sprites" / "character" / "piskel" / "runtime-active"
        / "metadata" / "player-animation-polish-build-report.json"
    )
    ensure_parent(report_path)
    report_path.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    return metrics
