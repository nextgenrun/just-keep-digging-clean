"""Build and promote the centralized Survival player animation-polish package."""

from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[2]
PIPELINE_TOOLS = ROOT / "tools" / "piskel-mcp"
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(PIPELINE_TOOLS))

from piskel_artifacts import write_artifacts  # noqa: E402
from piskel_commands import validate_piskel_frames  # noqa: E402
from piskel_document import (  # noqa: E402
    ensure_parent,
    load_manifest,
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
from player_animation_diagonal_compositor import build_diagonal_frames  # noqa: E402
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
) -> None:
    if len(expected) != len(actual):
        raise ValueError(f"{entry_id} Piskel round-trip changed the frame count")
    for index, (left, right) in enumerate(zip(expected, actual)):
        difference = ImageChops.difference(left.convert("RGBA"), right.convert("RGBA"))
        if difference.getbbox() is not None:
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
    run = runtime_manifest["actions"]["run"]
    family = source["family"]
    family_config = config["diagonalMining"][family]
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
        "source_clip": (
            f"Jog_Fwd_Loop + {config['sources'][family_config['source']].get('manifestAction', 'MINER_dig_up')}"
        ),
        "source_clips": [
            "Jog_Fwd_Loop",
            config["sources"][family_config["source"]].get(
                "manifestAction",
                "Blender MINER_dig_up",
            ),
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

    transition_frames, transition_layout = build_transition_frames(config, sheets)
    diagonal_frames, diagonal_variants = build_diagonal_frames(
        config,
        runtime_manifest,
        sheets,
    )
    expected_counts = {
        config["sheets"]["transitions"]["id"]: len(transition_frames),
        config["sheets"]["diagonalDig"]["id"]: len(diagonal_frames),
    }
    for entry_id, expected in expected_counts.items():
        if int(entries[entry_id]["frameCount"]) != expected:
            raise ValueError(
                f"{entry_id} manifest frame count {entries[entry_id]['frameCount']} != {expected}",
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
    )
    review_path = write_review_board(
        ROOT,
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
        "transitions": frame_stability(transition_frames),
        "diagonalDig": frame_stability(diagonal_frames),
        "reviewPath": review_path,
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
