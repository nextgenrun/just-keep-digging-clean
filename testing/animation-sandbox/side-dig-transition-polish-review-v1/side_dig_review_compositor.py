"""Build review-only planted and phase-exact SIDE-dig candidate frames."""

from __future__ import annotations

from typing import Any

import numpy as np
from PIL import Image, ImageChops

from moving_side_dig_compositor import (
    blend_at_pelvis,
    build_candidate_frames,
    extract_frame,
    marker,
    pack_sheet,
    scale_and_align_action,
)
from player_animation_polish_compositor import normalize_source_frame


def _clean(frame: Image.Image) -> Image.Image:
    pixels = np.asarray(frame.convert("RGBA")).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels, "RGBA")


def _smoothstep(value: float) -> float:
    value = min(1.0, max(0.0, float(value)))
    return value * value * (3.0 - 2.0 * value)


def _action_weight(
    index: int,
    count: int,
    contact_index: int,
    exit_count: int,
) -> float:
    if index <= contact_index:
        return _smoothstep(index / max(1, contact_index))
    exit_start = max(contact_index, count - max(2, exit_count))
    if index >= exit_start:
        return 1.0 - _smoothstep(
            (index - exit_start) / max(1, count - 1 - exit_start)
        )
    return 1.0


def normalized_idle(
    sheets: dict[str, Image.Image],
    config: dict[str, Any],
    frame_index: int | None = None,
) -> Image.Image:
    source = config["sources"]["idle"]
    geometry = config["geometry"]
    return _clean(normalize_source_frame(
        sheets["idle"],
        int(source.get("reviewFrame", 0) if frame_index is None else frame_index),
        source,
        float(geometry["outputDisplaySizePx"]),
        target_anchor=(
            float(geometry["targetPelvisX"]),
            float(geometry["targetBottomY"]),
        ),
    ))


def build_standing_action(
    action_id: str,
    sequence: list[int],
    contact_index: int,
    sheets: dict[str, Image.Image],
    manifest: dict[str, Any],
    config: dict[str, Any],
) -> tuple[list[Image.Image], list[dict[str, Any]]]:
    geometry = config["geometry"]
    source = config["sources"][action_id]
    standing = config["standing"]
    width = int(geometry["frameWidth"])
    height = int(geometry["frameHeight"])
    output_size = float(geometry["outputDisplaySizePx"])
    base = normalized_idle(sheets, config, int(standing["idleFrame"]))
    target_pelvis = (
        float(geometry["targetPelvisX"]),
        float(geometry["targetPelvisY"]),
    )
    action_scale = float(source["displaySizePx"]) / output_size
    frames: list[Image.Image] = []
    records: list[dict[str, Any]] = []
    for output_index, source_index in enumerate(sequence):
        contact_weight = max(
            0.0,
            1.0
            - abs(output_index - int(contact_index))
            / max(1, int(standing["contactBackoffFalloffFrames"])),
        )
        backoff = float(standing["contactBackoffSourcePx"]) * contact_weight
        action = extract_frame(
            sheets[action_id],
            int(source_index),
            width,
            height,
            int(source["columns"]),
        )
        action_pelvis = marker(
            manifest,
            source["manifestAction"],
            int(source_index),
            "pelvis",
        )
        aligned, error, transform = scale_and_align_action(
            action,
            action_pelvis,
            target_pelvis,
            action_scale,
            (
                float(geometry["targetPelvisX"]),
                float(geometry["targetBottomY"]),
            ),
            -backoff,
        )
        composite = blend_at_pelvis(
            base,
            aligned,
            target_pelvis[1],
            float(standing["seamOffsetPx"]),
            float(standing["seamFeatherPx"]),
        )
        weight = _action_weight(
            output_index,
            len(sequence),
            int(contact_index),
            int(standing["exitBlendFrameCount"]),
        )
        frames.append(_clean(Image.blend(base, composite, weight)))
        records.append({
            "outputFrame": output_index,
            "sourceFrame": int(source_index),
            "actionWeight": round(weight, 4),
            "contactWeight": round(contact_weight, 4),
            "contactBackoffPx": round(backoff, 4),
            "pelvisAlignmentErrorPx": round(float(error), 4),
            "transform": transform,
        })
    if ImageChops.difference(frames[0], base).getbbox():
        raise ValueError(f"{action_id} standing entry is not pixel-identical to Idle")
    if ImageChops.difference(frames[-1], base).getbbox():
        raise ValueError(f"{action_id} standing exit is not pixel-identical to Idle")
    return frames, records


def build_moving_action(
    action_id: str,
    run_start_frame: int,
    sheets: dict[str, Image.Image],
    manifest: dict[str, Any],
    config: dict[str, Any],
) -> tuple[list[Image.Image], dict[str, Any]]:
    geometry = config["geometry"]
    moving = config["moving"]
    source_config = {
        key: {
            "file": value["file"],
            "manifestAction": value["manifestAction"],
            "frameCount": value["frameCount"],
            "displaySizePx": value["displaySizePx"],
        }
        for key, value in config["sources"].items()
        if key in {"run", "jab", "cross"}
    }
    build_config = {
        "sources": source_config,
        "build": {
            "frameWidth": int(geometry["frameWidth"]),
            "frameHeight": int(geometry["frameHeight"]),
            "columns": int(geometry["sheetColumns"]),
            "frameCount": int(moving["framesPerAction"]),
            "framesPerAction": int(moving["framesPerAction"]),
            "runPhaseAdvanceFrames": int(moving["runPhaseAdvanceFrames"]),
            "runFrameOffsets": moving["runFrameOffsets"],
            "fps": 30,
            "baselineX": float(geometry["targetPelvisX"]),
            "baselineY": float(geometry["targetBottomY"]),
            "runStartFrame": int(run_start_frame),
            "pelvisMarker": "pelvis",
            "seamOffsetPx": float(moving["seamOffsetPx"]),
            "seamFeatherPx": float(moving["seamFeatherPx"]),
            "contactFrame": int(moving["contactFrame"]),
            "contactBackoffFalloffFrames": int(moving["contactBackoffFalloffFrames"]),
            "contactFrames": [int(moving["contactFrame"])],
            "jabSequence": moving["jabSequence"],
            "crossSequence": moving["crossSequence"],
        },
    }
    candidate = {
        "id": f"review-moving-{action_id}",
        "mode": "layered",
        "punchPattern": [action_id],
        "upperImpulsePx": 0,
        "contactBackoffPx": float(moving["contactBackoffSourcePx"]),
        "entryActionBlendWeights": moving["proposedEntryWeights"],
        "exitActionBlendWeights": moving["proposedExitWeights"],
        "lowerBodyPolicy": "continuous-polished-jog",
    }
    frames, metrics = build_candidate_frames(
        build_config,
        manifest,
        {key: sheets[key] for key in ("run", "jab", "cross")},
        candidate,
    )
    return [_clean(frame) for frame in frames], metrics


def build_blocked_plant(
    standing_frames: list[Image.Image],
    run_start_frame: int,
    sheets: dict[str, Image.Image],
    config: dict[str, Any],
) -> list[Image.Image]:
    geometry = config["geometry"]
    source = config["sources"]["run"]
    offsets = config["moving"]["runFrameOffsets"]
    weights = config["standing"]["blockedPlantBlendWeights"]
    output = []
    for index, standing in enumerate(standing_frames):
        if index >= len(weights):
            output.append(standing.copy())
            continue
        run_index = (int(run_start_frame) + int(offsets[index])) % int(source["frameCount"])
        run = extract_frame(
            sheets["run"],
            run_index,
            int(geometry["frameWidth"]),
            int(geometry["frameHeight"]),
            int(source["columns"]),
        )
        output.append(_clean(Image.blend(run, standing, float(weights[index]))))
    return output


def lower_anchor(frame: Image.Image, config: dict[str, Any]) -> tuple[float, float]:
    alpha = np.asarray(frame.getchannel("A"))
    threshold = int(config["geometry"]["alphaThreshold"])
    lower_y = int(config["geometry"]["lowerAnchorTopY"])
    ys, xs = np.where((alpha >= threshold) & (np.indices(alpha.shape)[0] >= lower_y))
    if len(xs) == 0:
        return 0.0, 0.0
    weights = alpha[ys, xs].astype(np.float64)
    return float(np.average(xs, weights=weights)), float(np.average(ys, weights=weights))


def changed_pixels(left: Image.Image, right: Image.Image) -> int:
    difference = np.asarray(ImageChops.difference(left.convert("RGBA"), right.convert("RGBA")))
    return int(np.count_nonzero(np.any(difference != 0, axis=2)))


def candidate_sheet(frames: list[Image.Image], config: dict[str, Any]) -> Image.Image:
    geometry = config["geometry"]
    return pack_sheet(
        frames,
        int(geometry["sheetColumns"]),
        int(geometry["frameWidth"]),
        int(geometry["frameHeight"]),
    )
