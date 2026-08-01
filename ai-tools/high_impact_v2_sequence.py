"""Shared spatial normalization for five-frame ImageGen sequence rows."""

from __future__ import annotations

from typing import Any

import numpy as np
from PIL import Image


VISIBLE_ALPHA = 8
OUTPUT_ALPHA_FLOOR = 3
Bounds = tuple[int, int, int, int]
Point = tuple[float, float]


def _normalize_centered_row(
    images: list[Image.Image],
    *,
    canvas_size: tuple[int, int],
    content_size: tuple[int, int],
    padding_px: int,
) -> list[Image.Image]:
    """Retain the original center-crop behavior byte-for-byte."""
    width = max(image.width for image in images)
    height = max(image.height for image in images)
    padded: list[Image.Image] = []
    union_alpha = np.zeros((height, width), dtype=np.uint8)
    for image in images:
        canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        canvas.alpha_composite(
            image,
            ((width - image.width) // 2, (height - image.height) // 2),
        )
        padded.append(canvas)
        union_alpha = np.maximum(
            union_alpha,
            np.asarray(canvas.getchannel("A"), dtype=np.uint8),
        )
    ys, xs = np.where(union_alpha >= VISIBLE_ALPHA)
    if not len(xs):
        raise RuntimeError("Sequence row became empty after chroma removal")
    box = (
        max(0, int(xs.min()) - padding_px),
        max(0, int(ys.min()) - padding_px),
        min(width, int(xs.max()) + 1 + padding_px),
        min(height, int(ys.max()) + 1 + padding_px),
    )
    box_width, box_height = box[2] - box[0], box[3] - box[1]
    scale = min(content_size[0] / box_width, content_size[1] / box_height, 1.0)
    target = (max(1, round(box_width * scale)), max(1, round(box_height * scale)))
    normalized: list[Image.Image] = []
    for image in padded:
        frame = image.crop(box)
        if frame.size != target:
            frame = frame.resize(target, Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
        canvas.alpha_composite(
            frame,
            ((canvas.width - frame.width) // 2, (canvas.height - frame.height) // 2),
        )
        array = np.asarray(canvas, dtype=np.uint8).copy()
        array[array[:, :, 3] < OUTPUT_ALPHA_FLOOR] = 0
        normalized.append(Image.fromarray(array, mode="RGBA"))
    return normalized


def _alpha_bounds(
    image: Image.Image,
    threshold: int,
) -> tuple[Bounds | None, int | None]:
    alpha = np.asarray(image.getchannel("A"), dtype=np.uint8)
    for candidate in dict.fromkeys((threshold, OUTPUT_ALPHA_FLOOR)):
        ys, xs = np.where(alpha >= candidate)
        if len(xs):
            bounds = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
            return bounds, candidate
    return None, None


def _validate_bounds(bounds: Bounds, image: Image.Image, index: int) -> Bounds:
    left, top, right, bottom = bounds
    if not (0 <= left < right <= image.width and 0 <= top < bottom <= image.height):
        raise ValueError(
            f"fit_bounds[{index}] must be a non-empty box inside "
            f"{image.width}x{image.height}"
        )
    return bounds


def _composite_clipped(
    canvas: Image.Image,
    image: Image.Image,
    offset: tuple[int, int],
) -> bool:
    offset_x, offset_y = offset
    clipped = (
        offset_x < 0 or offset_y < 0
        or offset_x + image.width > canvas.width
        or offset_y + image.height > canvas.height
    )
    source_x, source_y = max(0, -offset_x), max(0, -offset_y)
    destination_x, destination_y = max(0, offset_x), max(0, offset_y)
    copy_width = min(image.width - source_x, canvas.width - destination_x)
    copy_height = min(image.height - source_y, canvas.height - destination_y)
    if copy_width > 0 and copy_height > 0:
        box = (source_x, source_y, source_x + copy_width, source_y + copy_height)
        region = image.crop(box)
        canvas.alpha_composite(region, (destination_x, destination_y))
    return clipped


def _anchor_relative_row(
    images: list[Image.Image],
    *,
    canvas_size: tuple[int, int],
    content_size: tuple[int, int],
    padding_px: int,
    source_anchors: list[Point],
    target_contact: Point,
    fit_bounds: list[Bounds | None] | None,
    fit_alpha_threshold: int,
    allow_upscale: bool,
) -> tuple[list[Image.Image], dict[str, Any]]:
    if not images:
        raise ValueError("images must contain at least one frame")
    if len(source_anchors) != len(images):
        raise ValueError("source_anchors must contain one point per frame")
    if fit_bounds is not None and len(fit_bounds) != len(images):
        raise ValueError("fit_bounds must contain one box or None per frame")
    if padding_px < 0:
        raise ValueError("padding_px cannot be negative")
    if not 1 <= fit_alpha_threshold <= 255:
        raise ValueError("fit_alpha_threshold must be between 1 and 255")
    canvas_width, canvas_height = canvas_size
    content_width, content_height = content_size
    if not (
        canvas_width > 0 and canvas_height > 0
        and 0 < content_width <= canvas_width
        and 0 < content_height <= canvas_height
    ):
        raise ValueError("content_size must be positive and fit inside canvas_size")

    target_x, target_y = target_contact
    actual_target = (round(target_x), round(target_y))
    content_left = (canvas_width - content_width) // 2
    content_top = (canvas_height - content_height) // 2
    content_right = content_left + content_width
    content_bottom = content_top + content_height
    if not (
        content_left <= actual_target[0] <= content_right
        and content_top <= actual_target[1] <= content_bottom
    ):
        raise ValueError("target_contact must lie inside the centered content area")

    selected_bounds: list[Bounds | None] = []
    threshold_used: list[int | str | None] = []
    relative_bounds: list[tuple[float, float, float, float]] = []
    for index, (image, anchor) in enumerate(zip(images, source_anchors)):
        anchor_x, anchor_y = anchor
        if not (0 <= anchor_x <= image.width and 0 <= anchor_y <= image.height):
            raise ValueError(f"source_anchors[{index}] lies outside its frame")
        supplied = fit_bounds[index] if fit_bounds is not None else None
        if supplied is not None:
            bounds = _validate_bounds(supplied, image, index)
            used: int | str | None = "explicit"
        else:
            bounds, used = _alpha_bounds(image, fit_alpha_threshold)
        selected_bounds.append(bounds)
        threshold_used.append(used)
        if bounds is not None:
            relative_bounds.append(
                (
                    bounds[0] - anchor_x,
                    bounds[1] - anchor_y,
                    bounds[2] - anchor_x,
                    bounds[3] - anchor_y,
                )
            )
    if not relative_bounds:
        raise RuntimeError("Sequence row became empty after chroma removal")

    union = (
        min(bounds[0] for bounds in relative_bounds) - padding_px,
        min(bounds[1] for bounds in relative_bounds) - padding_px,
        max(bounds[2] for bounds in relative_bounds) + padding_px,
        max(bounds[3] for bounds in relative_bounds) + padding_px,
    )
    scale_limits: list[float] = []
    for extent, room in (
        (-union[0], actual_target[0] - content_left),
        (union[2], content_right - actual_target[0]),
        (-union[1], actual_target[1] - content_top),
        (union[3], content_bottom - actual_target[1]),
    ):
        if extent > 0:
            scale_limits.append(room / extent)
    scale = min(scale_limits)
    if not allow_upscale:
        scale = min(scale, 1.0)
    if scale <= 0:
        raise ValueError("target_contact leaves no room for the aligned sequence")

    normalized: list[Image.Image] = []
    frame_metadata: list[dict[str, Any]] = []
    for index, (image, anchor) in enumerate(zip(images, source_anchors)):
        scaled_size = (
            max(1, round(image.width * scale)),
            max(1, round(image.height * scale)),
        )
        scaled = image
        if image.size != scaled_size:
            scaled = image.resize(scaled_size, Image.Resampling.LANCZOS)
        scaled_anchor = (round(anchor[0] * scale), round(anchor[1] * scale))
        translation = (
            actual_target[0] - scaled_anchor[0],
            actual_target[1] - scaled_anchor[1],
        )
        canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
        clipped = _composite_clipped(canvas, scaled, translation)
        array = np.asarray(canvas, dtype=np.uint8).copy()
        array[array[:, :, 3] < OUTPUT_ALPHA_FLOOR] = 0
        normalized.append(Image.fromarray(array, mode="RGBA"))
        frame_metadata.append(
            {
                "index": index,
                "sourceSizePx": list(image.size),
                "scaledSizePx": list(scaled_size),
                "sourceAnchorPx": [anchor[0], anchor[1]],
                "scaledAnchorPx": list(scaled_anchor),
                "translationPx": list(translation),
                "mappedContactPx": list(actual_target),
                "fitBoundsPx": (
                    list(selected_bounds[index])
                    if selected_bounds[index] is not None
                    else None
                ),
                "fitAlphaThresholdUsed": threshold_used[index],
                "clipped": clipped,
            }
        )

    metadata = {
        "mode": "anchor-relative",
        "canvasSizePx": list(canvas_size),
        "contentRectPx": [content_left, content_top, content_right, content_bottom],
        "requestedTargetContactPx": [target_x, target_y],
        "targetContactPx": list(actual_target),
        "sharedScale": scale,
        "allowUpscale": allow_upscale,
        "fitAlphaThreshold": fit_alpha_threshold,
        "unionRelativeFitBoundsPx": list(union),
        "frames": frame_metadata,
    }
    return normalized, metadata


def normalize_sequence_row(
    images: list[Image.Image],
    *,
    canvas_size: tuple[int, int],
    content_size: tuple[int, int],
    padding_px: int,
    source_anchors: list[Point] | None = None,
    target_contact: Point | None = None,
    fit_bounds: list[Bounds | None] | None = None,
    fit_alpha_threshold: int = VISIBLE_ALPHA,
    allow_upscale: bool = False,
) -> list[Image.Image] | tuple[list[Image.Image], dict[str, Any]]:
    """Normalize a row, optionally locking every frame to one contact point.

    With no alignment arguments this executes the original center-crop path.
    ``fit_bounds`` may isolate persistent art from detached debris while the
    complete source image is still transformed and retained.
    """
    if source_anchors is None and target_contact is None:
        return _normalize_centered_row(
            images,
            canvas_size=canvas_size,
            content_size=content_size,
            padding_px=padding_px,
        )
    if source_anchors is None or target_contact is None:
        raise ValueError("source_anchors and target_contact must be supplied together")
    return _anchor_relative_row(
        images,
        canvas_size=canvas_size,
        content_size=content_size,
        padding_px=padding_px,
        source_anchors=source_anchors,
        target_contact=target_contact,
        fit_bounds=fit_bounds,
        fit_alpha_threshold=fit_alpha_threshold,
        allow_upscale=allow_upscale,
    )
