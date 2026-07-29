"""Shared compositor for review and production moving-side-dig animations."""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image


UPPER_MARKERS = ("hand_l", "hand_r", "head")
LOWER_MARKERS = ("foot_l", "foot_r", "pelvis")


def extract_frame(
    sheet: Image.Image,
    index: int,
    frame_width: int,
    frame_height: int,
    columns: int,
) -> Image.Image:
    left = (index % columns) * frame_width
    top = (index // columns) * frame_height
    return sheet.crop((left, top, left + frame_width, top + frame_height)).convert("RGBA")


def marker(
    manifest: dict[str, Any],
    action_id: str,
    frame_index: int,
    marker_name: str,
) -> tuple[float, float]:
    point = manifest["actions"][action_id]["rig_markers"]["frames"][str(frame_index)][marker_name]
    return float(point[0]), float(point[1])


def transform_point(
    point: tuple[float, float],
    transform: dict[str, float],
) -> tuple[float, float]:
    return (
        transform["finalX"] + point[0] * transform["actionScale"],
        transform["finalY"] + point[1] * transform["actionScale"],
    )


def scale_and_align_action(
    frame: Image.Image,
    action_pelvis: tuple[float, float],
    run_pelvis: tuple[float, float],
    action_scale: float,
    anchor: tuple[float, float],
    impulse_x: float,
) -> tuple[Image.Image, float, dict[str, float]]:
    width, height = frame.size
    scaled_size = (round(width * action_scale), round(height * action_scale))
    scaled = frame.resize(scaled_size, Image.Resampling.LANCZOS)
    paste_x = anchor[0] - anchor[0] * action_scale
    paste_y = anchor[1] - anchor[1] * action_scale
    transformed_pelvis = (
        paste_x + action_pelvis[0] * action_scale,
        paste_y + action_pelvis[1] * action_scale,
    )
    shift_x = run_pelvis[0] - transformed_pelvis[0] + impulse_x
    shift_y = run_pelvis[1] - transformed_pelvis[1]
    final_x = round(paste_x + shift_x)
    final_y = round(paste_y + shift_y)
    output = Image.new("RGBA", frame.size)
    output.alpha_composite(scaled, (final_x, final_y))
    aligned = (
        final_x + action_pelvis[0] * action_scale,
        final_y + action_pelvis[1] * action_scale,
    )
    error = math.hypot(
        aligned[0] - run_pelvis[0] - impulse_x,
        aligned[1] - run_pelvis[1],
    )
    return output, error, {
        "actionScale": action_scale,
        "finalX": float(final_x),
        "finalY": float(final_y),
        "impulseX": float(impulse_x),
    }


def blend_at_pelvis(
    run_frame: Image.Image,
    action_frame: Image.Image,
    pelvis_y: float,
    seam_offset: float,
    seam_feather: float,
) -> Image.Image:
    run = np.asarray(run_frame, dtype=np.float32) / 255
    action = np.asarray(action_frame, dtype=np.float32) / 255
    height = run.shape[0]
    center = pelvis_y + seam_offset
    top = center - seam_feather / 2
    upper_weight = np.clip((top + seam_feather - np.arange(height)) / seam_feather, 0, 1)
    upper_weight = upper_weight[:, None, None]
    lower_weight = 1 - upper_weight
    upper_alpha = action[:, :, 3:4] * upper_weight
    lower_alpha = run[:, :, 3:4] * lower_weight
    combined_alpha = upper_alpha + lower_alpha
    premultiplied = action[:, :, :3] * upper_alpha + run[:, :, :3] * lower_alpha
    rgb = np.divide(
        premultiplied,
        np.maximum(combined_alpha, 1e-6),
        out=np.zeros_like(premultiplied),
        where=combined_alpha > 1e-6,
    )
    output = np.concatenate((rgb, np.clip(combined_alpha, 0, 1)), axis=2)
    return Image.fromarray(np.round(output * 255).astype(np.uint8), "RGBA")


def alpha_bottom(frame: Image.Image) -> int | None:
    bounds = frame.getchannel("A").getbbox()
    return None if bounds is None else bounds[3] - 1


def pack_sheet(
    frames: list[Image.Image],
    columns: int,
    frame_width: int,
    frame_height: int,
) -> Image.Image:
    rows = math.ceil(len(frames) / columns)
    sheet = Image.new("RGBA", (columns * frame_width, rows * frame_height))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, ((index % columns) * frame_width, (index // columns) * frame_height))
    return sheet


def build_derived_markers(
    manifest: dict[str, Any],
    source_config: dict[str, Any],
    source_record: dict[str, Any],
) -> dict[str, list[float]]:
    run_action = source_config["run"]["manifestAction"]
    action = source_config[source_record["action"]]["manifestAction"]
    run_frame = manifest["actions"][run_action]["rig_markers"]["frames"][str(source_record["run"])]
    action_frame = manifest["actions"][action]["rig_markers"]["frames"][str(source_record["actionFrame"])]
    transformed = {
        name: list(transform_point(tuple(action_frame[name]), source_record["transform"]))
        for name in UPPER_MARKERS
    }
    # Keep the authored fist-tip clearance after the runtime aligns the hand marker.
    marker_lead = source_record["contactMarkerLeadPx"]
    for name in ("hand_l", "hand_r"):
        transformed[name][0] += marker_lead
    transformed.update({name: [float(value) for value in run_frame[name]] for name in LOWER_MARKERS})
    return {
        name: [round(float(value[0]), 4), round(float(value[1]), 4)]
        for name, value in transformed.items()
    }


def build_candidate_frames(
    config: dict[str, Any],
    manifest: dict[str, Any],
    sheets: dict[str, Image.Image],
    candidate: dict[str, Any],
) -> tuple[list[Image.Image], dict[str, Any]]:
    build = config["build"]
    sources = config["sources"]
    width, height, columns = build["frameWidth"], build["frameHeight"], build["columns"]
    frames_per_action = int(build.get("framesPerAction", len(build["jabSequence"])))
    run_phase_advance = int(build.get("runPhaseAdvanceFrames", frames_per_action))
    run_offsets = build.get("runFrameOffsets", list(range(frames_per_action)))
    if len(run_offsets) != frames_per_action:
        raise ValueError("moving-side-dig runFrameOffsets must match framesPerAction")
    for action_id in set(candidate["punchPattern"]):
        if len(build[f"{action_id}Sequence"]) != frames_per_action:
            raise ValueError(f"{action_id} sequence must match framesPerAction")
    action_scale = sources["jab"]["displaySizePx"] / sources["run"]["displaySizePx"]
    frames: list[Image.Image] = []
    alignment_errors: list[float] = []
    source_frames: list[dict[str, Any]] = []
    for output_index in range(build["frameCount"]):
        cycle = output_index // frames_per_action
        phase = output_index % frames_per_action
        action_id = candidate["punchPattern"][cycle % len(candidate["punchPattern"])]
        action_index = build[f"{action_id}Sequence"][phase]
        run_index = (
            build["runStartFrame"]
            + cycle * run_phase_advance
            + int(run_offsets[phase])
        ) % sources["run"]["frameCount"]
        run_frame = extract_frame(sheets["run"], run_index, width, height, columns)
        action_frame = extract_frame(sheets[action_id], action_index, width, height, columns)
        source_record: dict[str, Any] = {
            "output": output_index,
            "run": run_index,
            "action": action_id,
            "actionFrame": action_index,
        }
        if candidate["mode"] == "control":
            composite = action_frame
            alignment_error = 0.0
        else:
            run_pelvis = marker(manifest, sources["run"]["manifestAction"], run_index, build["pelvisMarker"])
            action_pelvis = marker(manifest, sources[action_id]["manifestAction"], action_index, build["pelvisMarker"])
            contact_weight = max(
                0.0,
                1.0
                - abs(phase - int(build["contactFrame"]))
                / max(1, int(build["contactBackoffFalloffFrames"])),
            )
            backoff = float(candidate.get("contactBackoffPx", 0)) * contact_weight
            impulse = (float(candidate.get("upperImpulsePx", 0)) * contact_weight) - backoff
            aligned_action, alignment_error, transform = scale_and_align_action(
                action_frame,
                action_pelvis,
                run_pelvis,
                action_scale,
                (build["baselineX"], build["baselineY"]),
                impulse,
            )
            composite = blend_at_pelvis(
                run_frame,
                aligned_action,
                run_pelvis[1],
                build["seamOffsetPx"],
                build["seamFeatherPx"],
            )
            source_record.update({
                "transform": transform,
                "contactWeight": round(contact_weight, 4),
                "contactMarkerLeadPx": round(backoff, 4),
            })
        action_weight = 1.0
        entry_weights = candidate.get("entryActionBlendWeights", [])
        exit_weights = candidate.get("exitActionBlendWeights", [])
        if phase < len(entry_weights):
            action_weight = float(entry_weights[phase])
        elif phase >= frames_per_action - len(exit_weights):
            action_weight = float(exit_weights[phase - (frames_per_action - len(exit_weights))])
        if action_weight < 1:
            composite = Image.blend(run_frame, composite, action_weight)
        source_record["actionBlendWeight"] = round(action_weight, 4)
        frames.append(composite)
        alignment_errors.append(alignment_error)
        source_frames.append(source_record)
    bottoms = [value for value in map(alpha_bottom, frames) if value is not None]
    alpha_bounds = [frame.getchannel("A").getbbox() for frame in frames]
    right_edges = [bounds[2] - 1 for bounds in alpha_bounds if bounds is not None]
    metrics = {
        "id": candidate["id"],
        "mode": candidate["mode"],
        "lowerBodyPolicy": candidate["lowerBodyPolicy"],
        "contactBackoffPx": candidate.get("contactBackoffPx", 0),
        "contactFrames": build["contactFrames"],
        "framesPerAction": frames_per_action,
        "runPhaseAdvanceFrames": run_phase_advance,
        "frameCount": len(frames),
        "bottomDriftPx": max(bottoms) - min(bottoms),
        "contactEnvelopeRightSourcePx": max(right_edges),
        "maxPelvisAlignmentErrorPx": round(max(alignment_errors), 3),
        "sourceFrames": source_frames,
    }
    return frames, metrics
