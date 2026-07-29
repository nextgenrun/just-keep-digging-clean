"""Frame compositors for the centralized Survival player animation-polish package."""

from __future__ import annotations

from typing import Any

import numpy as np
from PIL import Image

from moving_side_dig_compositor import extract_frame


def _alpha_anchor(frame: Image.Image, threshold: int = 32) -> tuple[float, float]:
    alpha = np.asarray(frame.getchannel("A"))
    ys, xs = np.where(alpha >= threshold)
    if len(xs) == 0:
        raise ValueError("cannot anchor a transparent animation frame")
    top, bottom = int(ys.min()), int(ys.max())
    lower_start = top + (bottom - top) * 0.55
    lower_mask = ys >= lower_start
    lower_xs = xs[lower_mask]
    lower_ys = ys[lower_mask]
    weights = alpha[lower_ys, lower_xs].astype(np.float64)
    return float(np.average(lower_xs, weights=weights)), float(bottom)


def _aligned_frame(
    frame: Image.Image,
    *,
    scale: float,
    target_anchor: tuple[float, float],
) -> tuple[Image.Image, dict[str, float]]:
    source_anchor = _alpha_anchor(frame)
    resized = frame.resize(
        (round(frame.width * scale), round(frame.height * scale)),
        Image.Resampling.LANCZOS,
    )
    paste_x = round(target_anchor[0] - source_anchor[0] * scale)
    paste_y = round(target_anchor[1] - source_anchor[1] * scale)
    output = Image.new("RGBA", frame.size)
    output.alpha_composite(resized, (paste_x, paste_y))
    # LANCZOS can create a 1–3px translucent fringe below the authored foot
    # plant. Trim only that below-baseline fringe so every generated handoff
    # keeps the same runtime ground plane.
    pixels = np.asarray(output).copy()
    pixels[int(round(target_anchor[1])) + 1 :, :, :] = 0
    output = Image.fromarray(pixels, "RGBA")
    return output, {
        "scale": float(scale),
        "pasteX": float(paste_x),
        "pasteY": float(paste_y),
    }


def _blend(left: Image.Image, right: Image.Image, right_weight: float) -> Image.Image:
    return Image.blend(left.convert("RGBA"), right.convert("RGBA"), float(right_weight))


def normalize_source_frame(
    sheet: Image.Image,
    frame_index: int,
    source: dict[str, Any],
    output_display_size: float,
    target_anchor: tuple[float, float] = (128, 247),
) -> Image.Image:
    frame = extract_frame(sheet, frame_index, 256, 256, int(source["columns"]))
    normalized, _ = _aligned_frame(
        frame,
        scale=float(source["displaySizePx"]) / float(output_display_size),
        target_anchor=target_anchor,
    )
    return normalized


def build_transition_frames(
    config: dict[str, Any],
    sheets: dict[str, Image.Image],
) -> tuple[list[Image.Image], dict[str, Any]]:
    output_size = float(config["displaySizePx"])
    idle = normalize_source_frame(sheets["idle"], 0, config["sources"]["idle"], output_size)
    run_source = config["sources"]["run"]
    run_frames = [
        extract_frame(sheets["run"], index, 256, 256, int(run_source["columns"]))
        for index in range(int(run_source["frameCount"]))
    ]
    frames: list[Image.Image] = []
    layout: dict[str, Any] = {"ground": {}, "recovery": {}, "landing": {}, "wall": {}}

    ground = config["groundHandoff"]
    start = len(frames)
    frames.extend([
        _blend(idle, run_frames[0], ground["blendToDestination"]),
        run_frames[0],
    ])
    layout["ground"]["start"] = list(range(start, len(frames)))
    stop_variants = []
    for phase in range(0, ground["runFrameCount"], ground["phaseStep"]):
        start = len(frames)
        frames.extend([
            _blend(run_frames[phase], idle, ground["blendToDestination"]),
            idle,
        ])
        stop_variants.append({"runFrame": phase, "frames": list(range(start, len(frames)))})
    layout["ground"]["stopVariants"] = stop_variants

    recovery = config["actionRecovery"]
    for family, spec in recovery["families"].items():
        source = config["sources"][spec["source"]]
        action = normalize_source_frame(
            sheets[spec["source"]],
            int(spec["sourceFrame"]),
            source,
            output_size,
        )
        start = len(frames)
        frames.extend([_blend(action, idle, recovery["idleBlendWeight"]), idle])
        layout["recovery"][family] = list(range(start, len(frames)))

    landing = config["landing"]
    for strength, source_frames in (
        ("soft", landing["softFrames"]),
        ("hard", landing["hardFrames"]),
    ):
        start = len(frames)
        frames.extend(
            normalize_source_frame(
                sheets["landing"],
                int(frame),
                config["sources"]["landing"],
                output_size,
            )
            for frame in source_frames
        )
        layout["landing"][strength] = list(range(start, len(frames)))

    wall = config["wallBrace"]
    wall_pose = normalize_source_frame(
        sheets["wallPush"],
        int(wall["wallSourceFrame"]),
        config["sources"]["wallPush"],
        output_size,
    )
    start = len(frames)
    frames.extend([_blend(idle, wall_pose, wall["blendWeight"]), wall_pose])
    layout["wall"]["entry"] = list(range(start, len(frames)))
    start = len(frames)
    frames.extend([_blend(wall_pose, idle, wall["blendWeight"]), idle])
    layout["wall"]["exit"] = list(range(start, len(frames)))
    return frames, layout


def frame_stability(frames: list[Image.Image]) -> dict[str, float]:
    anchors = [_alpha_anchor(frame) for frame in frames]
    bottoms = [anchor[1] for anchor in anchors]
    root_x = [anchor[0] for anchor in anchors]
    return {
        "frameCount": len(frames),
        "bottomDriftPx": round(max(bottoms) - min(bottoms), 3),
        "rootAnchorDriftPx": round(max(root_x) - min(root_x), 3),
    }
