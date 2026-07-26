"""Build optimized Graveborer Wurm runtime sprites from alpha masters."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path

from PIL import Image


ALPHA_BBOX_THRESHOLD = 6
SOURCE_PADDING_PX = 8


@dataclass(frozen=True)
class SpriteBuild:
    source_name: str
    output_name: str
    canvas: tuple[int, int]
    content: tuple[int, int]


BUILDS = (
    SpriteBuild(
        "graveborer-head-v1.png",
        "graveborer-head-runtime-v1.webp",
        (512, 384),
        (488, 352),
    ),
    SpriteBuild(
        "graveborer-body-v1.png",
        "graveborer-body-runtime-v1.webp",
        (384, 384),
        (350, 350),
    ),
    SpriteBuild(
        "graveborer-tail-v1.png",
        "graveborer-tail-runtime-v1.webp",
        (512, 384),
        (486, 340),
    ),
    SpriteBuild(
        "graveborer-medallion-v1.png",
        "graveborer-medallion-runtime-v1.webp",
        (384, 384),
        (364, 364),
    ),
    SpriteBuild(
        "graveborer-burrow-warning-v1.png",
        "graveborer-burrow-warning-runtime-v1.webp",
        (768, 320),
        (742, 286),
    ),
)


def _threshold_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    binary = alpha.point(
        lambda value: 255 if value > ALPHA_BBOX_THRESHOLD else 0,
    )
    bbox = binary.getbbox()
    if bbox is None:
        raise ValueError("Sprite source contains no visible alpha pixels")
    left, top, right, bottom = bbox
    return (
        max(0, left - SOURCE_PADDING_PX),
        max(0, top - SOURCE_PADDING_PX),
        min(image.width, right + SOURCE_PADDING_PX),
        min(image.height, bottom + SOURCE_PADDING_PX),
    )


def _normalize_sprite(image: Image.Image, build: SpriteBuild) -> Image.Image:
    crop = image.crop(_threshold_bbox(image))
    content_width, content_height = build.content
    scale = min(content_width / crop.width, content_height / crop.height)
    width = max(1, round(crop.width * scale))
    height = max(1, round(crop.height * scale))
    resized = crop.resize((width, height), Image.Resampling.LANCZOS)
    canvas_width, canvas_height = build.canvas
    canvas = Image.new("RGBA", build.canvas)
    canvas.alpha_composite(
        resized,
        ((canvas_width - width) // 2, (canvas_height - height) // 2),
    )
    return canvas


def build_package(source_dir: Path, output_dir: Path, force: bool) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for build in BUILDS:
        source_path = source_dir / build.source_name
        output_path = output_dir / build.output_name
        if not source_path.exists():
            raise FileNotFoundError(source_path)
        if output_path.exists() and not force:
            raise FileExistsError(
                f"Refusing to overwrite {output_path}; rerun with --force",
            )
        source = Image.open(source_path).convert("RGBA")
        sprite = _normalize_sprite(source, build)
        sprite.save(output_path, "WEBP", lossless=True, quality=100, method=6)
        digest = sha256(output_path.read_bytes()).hexdigest()
        print(
            f"{output_path.name}: {sprite.width}x{sprite.height} "
            f"sha256={digest}",
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    build_package(args.source_dir, args.output_dir, args.force)


if __name__ == "__main__":
    main()
