"""Build phase-locked Jog lower bodies with directional mining upper bodies."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

import numpy as np
from PIL import Image

from moving_side_dig_compositor import blend_at_pelvis, extract_frame
from player_animation_polish_compositor import _aligned_frame, _alpha_anchor


def _marker(
    manifest: dict[str, Any],
    action_id: str,
    frame_index: int,
    marker_name: str,
) -> tuple[float, float]:
    value = manifest["actions"][action_id]["rig_markers"]["frames"][str(frame_index)][marker_name]
    return float(value[0]), float(value[1])


def _transform_marker(
    marker: tuple[float, float],
    transform: dict[str, float],
) -> list[float]:
    return [
        round(transform["pasteX"] + marker[0] * transform["scale"], 4),
        round(transform["pasteY"] + marker[1] * transform["scale"], 4),
    ]


def _silhouette_upper_marker(frame: Image.Image, pelvis_y: float) -> list[float]:
    alpha = np.asarray(frame.getchannel("A"))
    ys, xs = np.where((alpha >= 48) & (np.indices(alpha.shape)[0] <= pelvis_y + 8))
    if len(xs) == 0:
        anchor = _alpha_anchor(frame)
        return [round(anchor[0], 4), round(anchor[1], 4)]
    scores = xs.astype(np.float64) - ys.astype(np.float64) * 0.72
    cutoff = np.quantile(scores, 0.992)
    chosen = scores >= cutoff
    weights = alpha[ys[chosen], xs[chosen]].astype(np.float64)
    return [
        round(float(np.average(xs[chosen], weights=weights)), 4),
        round(float(np.average(ys[chosen], weights=weights)), 4),
    ]


def _run_markers(
    manifest: dict[str, Any],
    run_action: str,
    run_frame: int,
) -> dict[str, list[float]]:
    source = manifest["actions"][run_action]["rig_markers"]["frames"][str(run_frame)]
    return {
        name: [round(float(value), 4) for value in source[name]]
        for name in ("foot_l", "foot_r", "pelvis")
    }


def _align_action_to_run(
    action_frame: Image.Image,
    action_source: dict[str, Any],
    action_index: int,
    run_frame: Image.Image,
    run_action: str,
    run_index: int,
    manifest: dict[str, Any],
    output_display_size: float,
) -> tuple[Image.Image, dict[str, float]]:
    scale = float(action_source["displaySizePx"]) / output_display_size
    action_id = action_source.get("manifestAction")
    if not action_id:
        return _aligned_frame(
            action_frame,
            scale=scale,
            target_anchor=_alpha_anchor(run_frame),
        )
    action_pelvis = _marker(manifest, action_id, action_index, "pelvis")
    run_pelvis = _marker(manifest, run_action, run_index, "pelvis")
    resized = action_frame.resize(
        (round(action_frame.width * scale), round(action_frame.height * scale)),
        Image.Resampling.LANCZOS,
    )
    transform = {
        "scale": scale,
        "pasteX": round(run_pelvis[0] - action_pelvis[0] * scale),
        "pasteY": round(run_pelvis[1] - action_pelvis[1] * scale),
    }
    aligned = Image.new("RGBA", action_frame.size)
    aligned.alpha_composite(resized, (int(transform["pasteX"]), int(transform["pasteY"])))
    return aligned, transform


def build_diagonal_frames(
    config: dict[str, Any],
    manifest: dict[str, Any],
    sheets: dict[str, Image.Image],
) -> tuple[list[Image.Image], list[dict[str, Any]]]:
    diagonal = config["diagonalMining"]
    run_source = config["sources"]["run"]
    output_size = float(config["displaySizePx"])
    all_frames: list[Image.Image] = []
    variants: list[dict[str, Any]] = []
    for family in ("up", "down"):
        family_config = diagonal[family]
        action_source = config["sources"][family_config["source"]]
        action_id = action_source.get("manifestAction")
        for run_start in diagonal["phaseStarts"]:
            variant_frames = []
            marker_frames: dict[str, dict[str, list[float]]] = {}
            atlas_start = len(all_frames)
            for local_index, action_index in enumerate(family_config["sourceFrames"]):
                run_index = (int(run_start) + local_index) % diagonal["runFrameCount"]
                run = extract_frame(
                    sheets["run"], run_index, 256, 256, int(run_source["columns"]),
                )
                action = extract_frame(
                    sheets[family_config["source"]],
                    int(action_index),
                    256,
                    256,
                    int(action_source["columns"]),
                )
                aligned, transform = _align_action_to_run(
                    action,
                    action_source,
                    int(action_index),
                    run,
                    run_source["manifestAction"],
                    run_index,
                    manifest,
                    output_size,
                )
                pelvis = _marker(manifest, run_source["manifestAction"], run_index, "pelvis")
                composite = blend_at_pelvis(
                    run,
                    aligned,
                    pelvis[1],
                    float(diagonal["seamOffsetPx"]),
                    float(diagonal["seamFeatherPx"]),
                )
                variant_frames.append(composite)
                markers = _run_markers(manifest, run_source["manifestAction"], run_index)
                if action_id:
                    for name in ("hand_l", "hand_r", "head"):
                        markers[name] = _transform_marker(
                            _marker(manifest, action_id, int(action_index), name),
                            transform,
                        )
                else:
                    hand = _silhouette_upper_marker(composite, pelvis[1])
                    markers.update({"hand_l": hand, "hand_r": hand, "head": hand})
                markers["contact"] = deepcopy(max(
                    (markers["hand_l"], markers["hand_r"]),
                    key=lambda point: point[0] - point[1] * (
                        0.7 if family == "up" else -0.7
                    ),
                ))
                marker_frames[str(local_index)] = markers
            all_frames.extend(variant_frames)
            variants.append({
                "family": family,
                "runStartFrame": int(run_start),
                "atlasFrameStart": atlas_start,
                "frames": list(range(atlas_start, atlas_start + len(variant_frames))),
                "markers": marker_frames,
            })
    return all_frames, variants
