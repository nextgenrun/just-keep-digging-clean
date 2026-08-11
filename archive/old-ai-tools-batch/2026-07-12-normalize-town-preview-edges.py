"""Normalize town preview PNG dimensions without scaling any artwork."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "sprites/backgrounds/world-v11-scale-correct-0-20m-v3/sources"
PREVIEW_DIR = ROOT / "sprites/backgrounds/world-v11-scale-correct-0-20m-v3/previews/time-neutral-town"


def extend_edges(image: Image.Image, width: int, height: int) -> Image.Image:
    """Crop excess right/bottom pixels and edge-extend missing pixels."""
    cropped = image.crop((0, 0, min(image.width, width), min(image.height, height)))
    if cropped.size == (width, height):
        return cropped

    output = Image.new(cropped.mode, (width, height))
    output.paste(cropped, (0, 0))

    if cropped.width < width:
        right_edge = cropped.crop((cropped.width - 1, 0, cropped.width, cropped.height))
        output.paste(right_edge.resize((width - cropped.width, cropped.height), Image.Resampling.NEAREST), (cropped.width, 0))

    filled_width = width
    if cropped.height < height:
        bottom_edge = output.crop((0, cropped.height - 1, filled_width, cropped.height))
        output.paste(bottom_edge.resize((filled_width, height - cropped.height), Image.Resampling.NEAREST), (0, cropped.height))

    return output


def normalize(panel: int, check: bool) -> str:
    stem = f"town-ground-{panel:02d}"
    source_path = SOURCE_DIR / f"{stem}.png"
    preview_path = PREVIEW_DIR / f"{stem}-preview.png"
    if not preview_path.exists():
        return f"skip {stem}: preview missing"

    with Image.open(source_path) as source:
        target_size = source.size
    with Image.open(preview_path) as preview:
        original_size = preview.size
        if check:
            if original_size != target_size:
                raise SystemExit(f"{stem}: {original_size} != {target_size}")
            return f"ok {stem}: {target_size[0]}x{target_size[1]}"
        normalized = extend_edges(preview.convert("RGB"), *target_size)
        normalized.save(preview_path, "PNG", optimize=True)

    return (
        f"normalized {stem}: {original_size[0]}x{original_size[1]} -> "
        f"{target_size[0]}x{target_size[1]} (crop/edge-extension only)"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--panels", nargs="*", type=int, default=[1, 2, 3, 4, 5])
    args = parser.parse_args()
    for panel in args.panels:
        print(normalize(panel, args.check))


if __name__ == "__main__":
    main()
