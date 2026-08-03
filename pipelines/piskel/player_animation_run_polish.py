"""Root-center and baseline-lock the production Jog without changing its poses."""

from __future__ import annotations

import hashlib
import statistics
from copy import deepcopy
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from moving_side_dig_compositor import extract_frame


def verify_source_hash(path: Path, expected_sha256: str) -> str:
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    if actual.lower() != str(expected_sha256).lower():
        raise ValueError(
            f"Jog source hash changed: expected {expected_sha256}, received {actual}",
        )
    return actual


def _shift_frame(frame: Image.Image, dx: int, dy: int) -> Image.Image:
    output = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    output.alpha_composite(frame.convert("RGBA"), (int(dx), int(dy)))
    if np.count_nonzero(np.asarray(output.getchannel("A"))) != np.count_nonzero(
        np.asarray(frame.getchannel("A")),
    ):
        raise ValueError("Jog root polish clipped visible pixels")
    return output


def _shift_markers(
    source: dict[str, dict[str, list[float]]],
    dx: int,
    vertical_shifts: list[int],
) -> dict[str, dict[str, list[float]]]:
    transformed: dict[str, dict[str, list[float]]] = {}
    for index, dy in enumerate(vertical_shifts):
        markers = source[str(index)]
        transformed[str(index)] = {
            name: [round(float(point[0]) + dx, 4), round(float(point[1]) + dy, 4)]
            for name, point in markers.items()
        }
    return transformed


def _alpha_bounds(frames: list[Image.Image]) -> list[list[int]]:
    bounds = []
    for index, frame in enumerate(frames):
        bbox = frame.getbbox()
        if not bbox:
            raise ValueError(f"Jog frame {index} is transparent")
        bounds.append(list(bbox))
    return bounds


def _union(bounds: list[list[int]]) -> list[int]:
    return [
        min(bound[0] for bound in bounds),
        min(bound[1] for bound in bounds),
        max(bound[2] for bound in bounds),
        max(bound[3] for bound in bounds),
    ]


def _loop_seam_mean_absolute(frames: list[Image.Image]) -> float:
    left = np.asarray(frames[-1].convert("RGBA"), dtype=np.float32)
    right = np.asarray(frames[0].convert("RGBA"), dtype=np.float32)
    return round(float(np.mean(np.abs(left - right))) / 255.0, 6)


def build_polished_run(
    config: dict[str, Any],
    runtime_manifest: dict[str, Any],
    sheet: Image.Image,
) -> tuple[
    list[Image.Image],
    dict[str, dict[str, list[float]]],
    dict[str, Any],
]:
    source = config["sources"]["run"]
    polish = config["runPolish"]
    source_action = runtime_manifest["actions"][polish["sourceAction"]]
    frame_count = int(source["frameCount"])
    frames = [
        extract_frame(sheet, index, 256, 256, int(source["columns"]))
        for index in range(frame_count)
    ]
    source_markers = source_action["rig_markers"]["frames"]
    pelvis_x = [float(source_markers[str(index)]["pelvis"][0]) for index in range(frame_count)]
    uniform_translate_x = round(float(polish["targetPelvisX"]) - statistics.median(pelvis_x))
    source_bounds = _alpha_bounds(frames)
    vertical_shifts = [
        int(polish["targetBottomY"]) - int(bound[3])
        for bound in source_bounds
    ]
    polished = [
        _shift_frame(frame, uniform_translate_x, vertical_shifts[index])
        for index, frame in enumerate(frames)
    ]
    markers = _shift_markers(source_markers, uniform_translate_x, vertical_shifts)
    polished_bounds = _alpha_bounds(polished)
    polished_pelvis_x = [markers[str(index)]["pelvis"][0] for index in range(frame_count)]
    contacts = []
    for sequence_index, texture_frame in zip(
        polish["contactSequenceIndices"],
        polish["contactTextureFrames"],
    ):
        feet = markers[str(texture_frame)]
        marker_name = max(("foot_l", "foot_r"), key=lambda name: feet[name][1])
        contacts.append({
            "sequenceIndex": int(sequence_index),
            "textureFrame": int(texture_frame),
            "marker": marker_name,
            "position": feet[marker_name],
        })
    report = {
        "frameCount": frame_count,
        "sourceAction": polish["sourceAction"],
        "manifestAction": polish["manifestAction"],
        "uniformScale": 1.0,
        "uniformTranslateX": uniform_translate_x,
        "verticalShifts": vertical_shifts,
        "sourceBottoms": [bound[3] for bound in source_bounds],
        "polishedBottoms": [bound[3] for bound in polished_bounds],
        "sourceMedianPelvisX": round(statistics.median(pelvis_x), 4),
        "polishedMedianPelvisX": round(statistics.median(polished_pelvis_x), 4),
        "maxPelvisCenterErrorPx": round(max(
            abs(value - float(polish["targetPelvisX"]))
            for value in polished_pelvis_x
        ), 4),
        "loopSeamMeanAbsolute": _loop_seam_mean_absolute(polished),
        "contacts": contacts,
    }
    if len(set(report["polishedBottoms"])) != 1:
        raise ValueError(f"Jog baseline polish failed: {report['polishedBottoms']}")
    if report["maxPelvisCenterErrorPx"] > float(polish["maxPelvisCenterErrorPx"]):
        raise ValueError(f"Jog pelvis-center policy failed: {report}")
    return polished, markers, report


def build_run_action_metadata(
    config: dict[str, Any],
    runtime_manifest: dict[str, Any],
    frames: list[Image.Image],
    markers: dict[str, dict[str, list[float]]],
    report: dict[str, Any],
) -> dict[str, Any]:
    polish = config["runPolish"]
    source = deepcopy(runtime_manifest["actions"][polish["sourceAction"]])
    bounds = _alpha_bounds(frames)
    source.update({
        "file": config["sheets"]["run"]["fileName"],
        "frame_count": len(frames),
        "columns": 16,
        "rows": 2,
        "fps": config["frameRate"],
        "loop": True,
        "source": "piskel-root-centered-baseline-locked-jog",
        "source_crop_mode": "fixed-frame-piskel-root-polish",
        "source_window": config["frameWidth"],
        "source_crops": [[0, 0, config["frameWidth"], config["frameHeight"]]] * len(frames),
        "alpha_bounds": bounds,
        "alpha_union": _union(bounds),
        "motion_origin": "unreal-ik-retargeted-ual-piskel-root-polished",
        "piskel_polish": {
            "version": 1,
            "source_action": polish["sourceAction"],
            "piskel_source": config["sheets"]["run"]["sourcePiskel"],
            "uniform_scale": report["uniformScale"],
            "uniform_translate_x": report["uniformTranslateX"],
            "vertical_shifts": report["verticalShifts"],
            "contact_sequence_indices": polish["contactSequenceIndices"],
            "contact_texture_frames": polish["contactTextureFrames"],
        },
        "runtime_animation_key": polish["animationKey"],
    })
    source["rig_markers"] = {
        **deepcopy(source["rig_markers"]),
        "source": "derived-piskel-run-root-polish",
        "frames": markers,
    }
    return source
