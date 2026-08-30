"""Promote the ImageGen deep-biome transitions to transparent WebPs."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = (
    ROOT
    / "sprites/backgrounds/world-visual-v2/depth/level1-biome-boundaries-v1"
)
SOURCES = PACKAGE / "sources"

ASSETS = (
    (
        SOURCES / "2026-08-29-cobalt-to-silver-imagegen.png",
        PACKAGE / "cobalt-to-silver-v1.webp",
    ),
    (
        SOURCES / "2026-08-28-amber-to-silver-chroma-imagegen.png",
        PACKAGE / "amber-to-silver-v1.webp",
    ),
    (
        SOURCES / "2026-08-28-silver-to-magma-chroma-imagegen.png",
        PACKAGE / "silver-to-magma-v1.webp",
    ),
    (
        SOURCES / "2026-08-28-amber-to-magma-chroma-imagegen.png",
        PACKAGE / "amber-to-magma-v1.webp",
    ),
)

GREEN_KEY_MINIMUM = 80
GREEN_KEY_DOMINANCE = 32
EDGE_FEATHER_PX = 28


def remove_chroma_background(image: Image.Image) -> Image.Image:
    """Remove the isolated ImageGen #00ff00 correction without recoloring art."""

    rgb = np.asarray(image.convert("RGB"), dtype=np.uint8)
    red = rgb[:, :, 0]
    green = rgb[:, :, 1]
    blue = rgb[:, :, 2]
    green_dominance = (
        green.astype(np.int16) - np.maximum(red, blue).astype(np.int16)
    )
    keyed = (green >= GREEN_KEY_MINIMUM) & (green_dominance >= GREEN_KEY_DOMINANCE)
    recovered = rgb.copy()
    recovered[keyed] = 0
    alpha = np.where(keyed, 0, 255).astype(np.uint8)
    rgba = np.dstack((recovered, alpha))
    return Image.fromarray(rgba, "RGBA")


def feather_outer_edges(image: Image.Image) -> Image.Image:
    """Keep boundary cutouts mergeable even when ImageGen touches an edge."""

    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    height, width = rgba.shape[:2]
    x_edge = np.minimum(np.arange(width), np.arange(width)[::-1]).astype(np.float32)
    y_edge = np.minimum(np.arange(height), np.arange(height)[::-1]).astype(np.float32)
    edge = np.minimum(y_edge[:, None], x_edge[None, :]) / EDGE_FEATHER_PX
    edge = np.clip(edge, 0.0, 1.0)
    feather = edge * edge * (3.0 - 2.0 * edge)
    rgba[..., 3] = np.round(rgba[..., 3].astype(np.float32) * feather).astype(np.uint8)
    rgba[rgba[..., 3] < 3] = 0
    return Image.fromarray(rgba, "RGBA")


def promote(source_path: Path, output_path: Path) -> dict[str, object]:
    with Image.open(source_path) as source:
        source_rgba = source.convert("RGBA")
        source_alpha = source_rgba.getchannel("A")
        runtime = feather_outer_edges(
            source_rgba
            if source_alpha.getextrema()[0] == 0
            else remove_chroma_background(source)
        )
    alpha = runtime.getchannel("A")
    alpha_extrema = alpha.getextrema()
    if alpha_extrema[0] != 0 or alpha_extrema[1] < 240:
        raise ValueError(f"{source_path.name} did not produce full alpha: {alpha_extrema}")
    visible_bounds = alpha.getbbox()
    if not visible_bounds:
        raise ValueError(f"{source_path.name} became empty")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    runtime.save(output_path, "WEBP", lossless=True, quality=100, method=6)
    return {
        "source": source_path.relative_to(ROOT).as_posix(),
        "output": output_path.relative_to(ROOT).as_posix(),
        "size": runtime.size,
        "alphaExtrema": alpha_extrema,
        "transparentPixels": int(np.count_nonzero(np.asarray(alpha) == 0)),
        "transparentRatio": round(
            float(np.count_nonzero(np.asarray(alpha) == 0) / (runtime.width * runtime.height)),
            4,
        ),
        "visibleBounds": visible_bounds,
    }


def main() -> None:
    records = [promote(source, output) for source, output in ASSETS]
    for record in records:
        print(record)


if __name__ == "__main__":
    main()
