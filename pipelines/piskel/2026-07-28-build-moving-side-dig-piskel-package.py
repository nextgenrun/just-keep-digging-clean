"""Promote approved moving-side-dig composites through Piskel into runtime assets."""

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

from moving_side_dig_compositor import build_derived_markers  # noqa: E402
from moving_side_dig_phase_handoff import build_phase_handoff_package  # noqa: E402
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


REVIEW_CONFIG_PATH = ROOT / "values" / "movingSideDigReview.json"
PRODUCTION_CONFIG_PATH = ROOT / "values" / "movingSideDigProduction.json"
RUNTIME_MANIFEST_PATH = (
    ROOT / "sprites" / "character" / "survival-ual-player-v1" / "runtime" / "manifest.json"
)
ACTION_SPECS = (
    {
        "entryId": "survival-moving-side-dig-jab",
        "runtimeAction": "moving-side-dig-jab",
        "sourceAction": "jab",
    },
    {
        "entryId": "survival-moving-side-dig-cross",
        "runtimeAction": "moving-side-dig-cross",
        "sourceAction": "cross",
    },
)


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def alpha_bounds(frames: list[Image.Image]) -> list[list[int]]:
    output = []
    for index, frame in enumerate(frames):
        bounds = frame.getchannel("A").getbbox()
        if bounds is None:
            raise ValueError(f"frame {index} is fully transparent")
        if bounds[0] <= 0 or bounds[1] <= 0 or bounds[2] >= frame.width or bounds[3] >= frame.height:
            raise ValueError(f"frame {index} touches a canvas edge: {bounds}")
        output.append(list(bounds))
    return output


def alpha_union(bounds: list[list[int]]) -> list[int]:
    return [
        min(value[0] for value in bounds),
        min(value[1] for value in bounds),
        max(value[2] for value in bounds),
        max(value[3] for value in bounds),
    ]


def assert_pixel_identity(expected: list[Image.Image], actual: list[Image.Image], entry_id: str) -> None:
    for index, (left, right) in enumerate(zip(expected, actual)):
        if ImageChops.difference(left.convert("RGBA"), right.convert("RGBA")).getbbox() is not None:
            raise ValueError(f"{entry_id} Piskel round-trip changed frame {index}")


def runtime_action_metadata(
    runtime_manifest: dict[str, Any],
    review_config: dict[str, Any],
    candidate: dict[str, Any],
    frames: list[Image.Image],
    records: list[dict[str, Any]],
    spec: dict[str, Any],
    entry: dict[str, Any],
    contact_envelope_right: int,
    atlas_frame_start: int = 0,
) -> dict[str, Any]:
    source_name = spec["sourceAction"]
    run_metadata = runtime_manifest["actions"][
        review_config["sources"]["run"]["manifestAction"]
    ]
    source_metadata = runtime_manifest["actions"][f"punch-{source_name}"]
    bounds = alpha_bounds(frames)
    derived_markers = {
        str(index): build_derived_markers(
            runtime_manifest,
            review_config["sources"],
            record,
        )
        for index, record in enumerate(records)
    }
    contact_index = int(entry["contactFrame"])
    contact_markers = derived_markers[str(contact_index)]
    leading_hand = max(("hand_l", "hand_r"), key=lambda name: contact_markers[name][0])
    contact_markers[leading_hand][0] = round(
        contact_envelope_right + candidate["contactFaceClearancePx"],
        4,
    )
    return {
        "file": Path(entry["runtimeOutputs"][0]).name,
        "frame_count": len(frames),
        "frame_width": entry["frameSize"][0],
        "frame_height": entry["frameSize"][1],
        "columns": entry["sheetColumns"],
        "rows": (
            int(entry["frameCount"]) + int(entry["sheetColumns"]) - 1
        ) // int(entry["sheetColumns"]),
        "fps": entry["fps"],
        "loop": False,
        "source": "piskel-phase-locked-upper-lower-composite",
        "source_clip": f"Jog_Fwd_Loop + {source_metadata['source_clip']} upper body",
        "source_clips": ["Jog_Fwd_Loop", source_metadata["source_clip"]],
        "source_crop_mode": "fixed-frame-pelvis-aligned-composite",
        "source_window": entry["frameSize"][0],
        "source_crops": [[0, 0, entry["frameSize"][0], entry["frameSize"][1]]] * len(frames),
        "alpha_bounds": bounds,
        "alpha_union": alpha_union(bounds),
        "game_retarget": deepcopy(run_metadata.get("game_retarget")),
        "motion_origin": "phase-locked-run-lower-action-upper",
        "authored_pose": None,
        "visual_skin": deepcopy(run_metadata.get("visual_skin")),
        "weapon": None,
        "composition": {
            "version": 2,
            "candidate": candidate["id"],
            "frames_per_action": review_config["build"]["framesPerAction"],
            "run_phase_advance_frames": review_config["build"]["runPhaseAdvanceFrames"],
            "contact_backoff_source_px": candidate["contactBackoffPx"],
            "contact_backoff_falloff_frames": review_config["build"]["contactBackoffFalloffFrames"],
            "contact_face_clearance_source_px": candidate["contactFaceClearancePx"],
            "contact_envelope_policy": candidate["contactEnvelopePolicy"],
            "contact_envelope_right_source_px": contact_envelope_right,
            "entry_action_blend_weights": candidate["entryActionBlendWeights"],
            "exit_action_blend_weights": candidate["exitActionBlendWeights"],
            "action_blend_weights": [record["actionBlendWeight"] for record in records],
            "seam_offset_px": review_config["build"]["seamOffsetPx"],
            "seam_feather_px": review_config["build"]["seamFeatherPx"],
            "run_frame_start": records[0]["run"],
            "run_frames": [record["run"] for record in records],
            "action_frames": [record["actionFrame"] for record in records],
            "piskel_source": entry["sourcePiskel"],
            "atlas_frame_start": atlas_frame_start,
            "atlas_frames": list(range(atlas_frame_start, atlas_frame_start + len(frames))),
        },
        "rig_markers": {
            "version": runtime_manifest["rig_marker_schema"]["version"],
            "space": runtime_manifest["rig_marker_schema"]["space"],
            "source": "derived-phase-locked-piskel-composite",
            "bone_points": deepcopy(run_metadata["rig_markers"].get("bone_points", {})),
            "marker_names": deepcopy(runtime_manifest["rig_marker_schema"]["required_markers"]),
            "frames": derived_markers,
        },
    }


def main() -> None:
    review_config = load_json(REVIEW_CONFIG_PATH)
    production_config = load_json(PRODUCTION_CONFIG_PATH)
    review_config = deepcopy(review_config)
    review_config["sources"]["run"] = deepcopy(production_config["runSource"])
    candidate = next(
        item for item in review_config["candidates"]
        if item["id"] == review_config["defaultCandidateId"]
    )
    build, handoff = review_config["build"], production_config["phaseHandoff"]
    pairs = (("contactBackoffPx", "contactBackoffSourcePx"),
             ("contactFaceClearancePx", "contactFaceClearanceSourcePx"),
             ("contactEnvelopePolicy", "contactEnvelopePolicy"))
    invalid = candidate["id"] != production_config["reviewCandidateId"]
    invalid |= candidate.get("recommended") is not True
    invalid |= any(candidate.get(left) != production_config[right] for left, right in pairs)
    invalid |= build["framesPerAction"] != handoff["actionFrameCount"] or build["runPhaseAdvanceFrames"] != handoff["runPhaseAdvanceFrames"]
    invalid |= build["runFrameOffsets"] != handoff["runFrameOffsets"] or build["contactFrame"] != production_config["contactFrame"]
    invalid |= build["contactBackoffFalloffFrames"] != production_config["contactBackoffFalloffFrames"]
    invalid |= candidate["entryActionBlendWeights"] != handoff["actionBlendWeights"] or candidate["exitActionBlendWeights"] != handoff["exitActionBlendWeights"]
    stand_off = production_config["movement"]["tileFaceStandOff"]
    invalid |= stand_off.get("enabled") is not True
    invalid |= stand_off.get("mode") != "authoritative-body-gap"
    invalid |= not isinstance(stand_off.get("distancePx"), (int, float)) or stand_off["distancePx"] <= 0
    if invalid:
        raise ValueError("approved Option C review and production smoothing contracts differ")

    runtime_manifest = load_json(RUNTIME_MANIFEST_PATH)
    piskel_manifest = load_manifest()
    entries = {entry["id"]: entry for entry in piskel_manifest["animations"]}
    sheets = {
        source_id: Image.open(ROOT / source["file"]).convert("RGBA")
        for source_id, source in review_config["sources"].items()
    }
    handoff = build_phase_handoff_package(
        root=ROOT,
        review_config=review_config,
        production_config=production_config,
        runtime_manifest=runtime_manifest,
        sheets=sheets,
        candidate=candidate,
        atlas_entry=entries[production_config["phaseHandoff"]["atlas"]["id"]],
        metadata_builder=runtime_action_metadata,
    )
    metrics = handoff
    if metrics["bottomDriftPx"] > 1 or metrics["maxPelvisAlignmentErrorPx"] > 1:
        raise ValueError(f"composite stability failed: {metrics}")
    contact_envelope_right = int(metrics["contactEnvelopeRightSourcePx"])

    results = []
    for spec in ACTION_SPECS:
        entry = entries[spec["entryId"]]
        variant = next(
            value for value in handoff["variants"]
            if value["base"] is True and value["action"] == spec["sourceAction"]
        )
        frames = handoff["built"][variant["id"]]["frames"]
        records = handoff["built"][variant["id"]]["records"]
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
        assert_pixel_identity(frames, round_trip, entry["id"])
        runtime_info = save_runtime_frames(entry, round_trip)
        artifacts = write_artifacts(entry, round_trip, runtime_info)
        runtime_manifest["actions"][spec["runtimeAction"]] = runtime_action_metadata(
            runtime_manifest,
            review_config,
            candidate,
            round_trip,
            records,
            spec,
            entry,
            contact_envelope_right,
        )
        results.append({
            "id": entry["id"],
            "validation": validation,
            "runtime": runtime_info,
            "artifacts": artifacts,
        })
    results.append({
        "id": production_config["phaseHandoff"]["atlas"]["id"],
        **handoff["atlas"],
    })

    runtime_manifest["moving_side_dig_pipeline"] = {
        "version": 5,
        "builder": "pipelines/piskel/2026-07-28-build-moving-side-dig-piskel-package.py",
        "candidate": candidate["id"],
        "contact_backoff_source_px": candidate["contactBackoffPx"],
        "contact_face_clearance_source_px": candidate["contactFaceClearancePx"],
        "contact_envelope_policy": candidate["contactEnvelopePolicy"],
        "contact_visual_alignment_enabled": production_config["contactVisualAlignmentEnabled"],
        "tile_face_stand_off": deepcopy(stand_off),
        "contact_envelope_right_source_px": contact_envelope_right,
        "bottom_drift_px": metrics["bottomDriftPx"],
        "max_pelvis_alignment_error_px": metrics["maxPelvisAlignmentErrorPx"],
        "phase_handoff": {
            "version": production_config["phaseHandoff"]["version"],
            "action_blend_weights": production_config["phaseHandoff"]["actionBlendWeights"],
            "exit_action_blend_weights": production_config["phaseHandoff"]["exitActionBlendWeights"],
            "variant_count": len(handoff["variants"]),
            "atlas_frame_count": sum(
                len(variant["frames"])
                for variant in handoff["variants"]
                if variant["base"] is not True
            ),
            "entry_variant_ids": handoff["entryVariantIdByOutgoingJogFrame"],
            "pivot_frames": handoff["pivotFrameByOutgoingJogFrame"],
        },
        "moving_quickslash": {
            "animation_key": production_config["quickslash"]["animationKey"],
            "frame_indexes": production_config["quickslash"]["frameIndexes"],
            "contact_frame": production_config["quickslash"]["contactFrame"],
            "contact_sequence_index": production_config["quickslash"]["contactSequenceIndex"],
            "phase_variant_count": len(handoff["variants"]),
        },
    }
    write_json(RUNTIME_MANIFEST_PATH, runtime_manifest)
    print(json.dumps({
        "ok": True,
        "candidate": candidate["id"],
        "contactBackoffPx": candidate["contactBackoffPx"],
        "contactFaceClearancePx": candidate["contactFaceClearancePx"],
        "contactEnvelopeRightSourcePx": contact_envelope_right,
        "bottomDriftPx": metrics["bottomDriftPx"],
        "maxPelvisAlignmentErrorPx": metrics["maxPelvisAlignmentErrorPx"],
        "actions": results,
    }, indent=2))


if __name__ == "__main__":
    main()
