"""Build compact phase-aware moving-dig variants and runtime configuration."""

from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from typing import Any, Callable

from PIL import Image, ImageChops

from moving_side_dig_compositor import (
    alpha_bottom,
    build_candidate_frames,
)
from moving_side_dig_runtime_module import write_runtime_module
from piskel_artifacts import write_artifacts
from piskel_commands import validate_piskel_frames
from piskel_document import (
    ensure_parent,
    make_piskel,
    read_piskel,
    repo_path,
    save_runtime_frames,
    write_json,
)


def _circular_distance(left: int, right: int, count: int) -> int:
    distance = abs(left - right) % count
    return min(distance, count - distance)


def _planted_foot(
    manifest: dict[str, Any],
    phase: int,
    flip_x: bool = False,
) -> tuple[float, float]:
    markers = manifest["actions"]["run"]["rig_markers"]["frames"][str(phase)]
    foot = max((markers["foot_l"], markers["foot_r"]), key=lambda point: point[1])
    return ((256 - float(foot[0])) if flip_x else float(foot[0]), float(foot[1]))


def _pivot_map(
    manifest: dict[str, Any],
    frame_count: int,
    vertical_weight: float,
) -> list[int]:
    output = []
    for outgoing_phase in range(frame_count):
        outgoing = _planted_foot(manifest, outgoing_phase)
        candidates = []
        for target_phase in range(frame_count):
            target = _planted_foot(manifest, target_phase, True)
            score = abs(target[0] - outgoing[0]) + abs(target[1] - outgoing[1]) * vertical_weight
            candidates.append((score, target_phase))
        output.append(min(candidates)[1])
    return output


def _animation_key(action: str, phase: int) -> str:
    return f"survival-ual-player-v1-moving-side-dig-{action}-phase-{phase:02d}-anim"


def _manifest_action(prefix: str, action: str, phase: int) -> str:
    return f"{prefix}-{action}-{phase:02d}"


def _variant_specs(config: dict[str, Any]) -> list[dict[str, Any]]:
    handoff = config["phaseHandoff"]
    atlas = handoff["atlas"]
    frame_count = handoff["actionFrameCount"]
    run_count = handoff["runFrameCount"]
    run_advance = handoff["runPhaseAdvanceFrames"]
    run_offsets = handoff["runFrameOffsets"]
    atlas_cursor = 0
    variants = []
    for source in handoff["variants"]:
        action = config["actions"][source["action"]]
        is_base = source.get("base") is True
        frames = list(range(frame_count)) if is_base else list(range(atlas_cursor, atlas_cursor + frame_count))
        variants.append({
            **source,
            "base": is_base,
            "animationKey": action["animationKey"] if is_base else _animation_key(
                source["action"],
                source["runStartFrame"],
            ),
            "sheetKey": action["sheetKey"] if is_base else atlas["sheetKey"],
            "frames": frames,
            "runFrames": [
                (source["runStartFrame"] + offset) % run_count
                for offset in run_offsets
            ],
            "manifestAction": action["sourceAction"] if is_base else _manifest_action(
                atlas["manifestActionPrefix"],
                source["action"],
                source["runStartFrame"],
            ),
            "resumeJogFrame": (source["runStartFrame"] + run_advance) % run_count,
            "atlasFrameStart": None if is_base else atlas_cursor,
        })
        if not is_base:
            atlas_cursor += frame_count
    return variants


def _entry_variant_ids(config: dict[str, Any], variants: list[dict[str, Any]]) -> list[str]:
    handoff = config["phaseHandoff"]
    count = handoff["runFrameCount"]
    offset = handoff["entryPhaseOffset"]
    output = []
    maximum_error = 0
    for outgoing in range(count):
        ideal = (outgoing + offset) % count
        selected = min(
            variants,
            key=lambda variant: (
                _circular_distance(ideal, variant["runStartFrame"], count),
                variant["runStartFrame"],
            ),
        )
        maximum_error = max(
            maximum_error,
            _circular_distance(ideal, selected["runStartFrame"], count),
        )
        output.append(selected["id"])
    if maximum_error > handoff["maxEntryPhaseError"]:
        raise ValueError(
            f"phase family error {maximum_error} exceeds {handoff['maxEntryPhaseError']}"
        )
    return output


def _build_variant(
    review_config: dict[str, Any],
    runtime_manifest: dict[str, Any],
    sheets: dict[str, Image.Image],
    candidate: dict[str, Any],
    variant: dict[str, Any],
    production_config: dict[str, Any],
) -> tuple[list[Image.Image], list[dict[str, Any]], dict[str, Any]]:
    build_config = deepcopy(review_config)
    build_config["build"]["runStartFrame"] = variant["runStartFrame"]
    action_candidate = deepcopy(candidate)
    action_candidate["punchPattern"] = [variant["action"], variant["action"]]
    frames, metrics = build_candidate_frames(
        build_config,
        runtime_manifest,
        sheets,
        action_candidate,
    )
    frame_count = production_config["phaseHandoff"]["actionFrameCount"]
    frames = frames[:frame_count]
    records = metrics["sourceFrames"][:frame_count]
    return frames, records, metrics


def _assert_identity(expected: list[Image.Image], actual: list[Image.Image]) -> None:
    for index, (left, right) in enumerate(zip(expected, actual)):
        if ImageChops.difference(left.convert("RGBA"), right.convert("RGBA")).getbbox():
            raise ValueError(f"phase handoff Piskel round-trip changed frame {index}")


def build_phase_handoff_package(
    *,
    root: Path,
    review_config: dict[str, Any],
    production_config: dict[str, Any],
    runtime_manifest: dict[str, Any],
    sheets: dict[str, Image.Image],
    candidate: dict[str, Any],
    atlas_entry: dict[str, Any],
    metadata_builder: Callable[..., dict[str, Any]],
) -> dict[str, Any]:
    variants = _variant_specs(production_config)
    built = {}
    all_frames = []
    maximum_alignment_error = 0.0
    for variant in variants:
        frames, records, metrics = _build_variant(
            review_config,
            runtime_manifest,
            sheets,
            candidate,
            variant,
            production_config,
        )
        built[variant["id"]] = {"frames": frames, "records": records}
        all_frames.extend(frames)
        maximum_alignment_error = max(
            maximum_alignment_error,
            float(metrics["maxPelvisAlignmentErrorPx"]),
        )
    bounds = [frame.getchannel("A").getbbox() for frame in all_frames]
    contact_envelope_right = max(bound[2] - 1 for bound in bounds if bound)
    bottoms = [value for value in map(alpha_bottom, all_frames) if value is not None]
    bottom_drift = max(bottoms) - min(bottoms)

    atlas_variants = [variant for variant in variants if variant["base"] is not True]
    atlas_frames = [
        frame
        for variant in atlas_variants
        for frame in built[variant["id"]]["frames"]
    ]
    source_path = repo_path(atlas_entry["sourcePiskel"])
    ensure_parent(source_path)
    write_json(source_path, make_piskel(atlas_entry, atlas_frames))
    round_trip, width, height, fps = read_piskel(source_path)
    validation = validate_piskel_frames(
        atlas_entry,
        round_trip,
        width,
        height,
        fps,
        atlas_entry["sourcePiskel"],
    )
    if not validation["ok"]:
        raise ValueError(f"phase handoff Piskel validation failed: {validation['errors']}")
    _assert_identity(atlas_frames, round_trip)
    runtime_info = save_runtime_frames(atlas_entry, round_trip)
    artifacts = write_artifacts(atlas_entry, round_trip, runtime_info)

    for variant in atlas_variants:
        record = built[variant["id"]]
        spec = {
            "runtimeAction": variant["manifestAction"],
            "sourceAction": variant["action"],
        }
        runtime_manifest["actions"][variant["manifestAction"]] = metadata_builder(
            runtime_manifest,
            review_config,
            candidate,
            record["frames"],
            record["records"],
            spec,
            atlas_entry,
            contact_envelope_right,
            variant["atlasFrameStart"],
        )
    entry_ids = _entry_variant_ids(production_config, variants)
    pivot_frames = _pivot_map(
        runtime_manifest,
        production_config["phaseHandoff"]["runFrameCount"],
        production_config["phaseHandoff"]["pivot"]["verticalWeight"],
    )
    write_runtime_module(root, production_config, variants, entry_ids, pivot_frames)
    return {
        "variants": variants,
        "built": built,
        "contactEnvelopeRightSourcePx": contact_envelope_right,
        "bottomDriftPx": bottom_drift,
        "maxPelvisAlignmentErrorPx": round(maximum_alignment_error, 3),
        "atlas": {
            "validation": validation,
            "runtime": runtime_info,
            "artifacts": artifacts,
        },
        "entryVariantIdByOutgoingJogFrame": entry_ids,
        "pivotFrameByOutgoingJogFrame": pivot_frames,
    }
