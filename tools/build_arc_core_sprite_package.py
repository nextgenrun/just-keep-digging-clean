"""Build drift-locked Arc Core runtime sprites from approved alpha masters.

Updated: 2026-07-26
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path

from PIL import Image, PngImagePlugin


CANVAS_SIZE = 512
ALPHA_BBOX_THRESHOLD = 6
SOURCE_PADDING_PX = 6


@dataclass(frozen=True)
class SpriteBuild:
    source_name: str
    output_name: str
    role: str
    content_size: int
    quadrant: tuple[int, int] | None = None


BUILDS = (
    SpriteBuild(
        "2026-07-26-small-arc-master-v3-alpha.png",
        "small-arc-master-v3.png",
        "small.body",
        468,
    ),
    SpriteBuild(
        "2026-07-26-omega-arc-master-v2-alpha.png",
        "omega-arc-master-v2.png",
        "omega.body",
        488,
    ),
    SpriteBuild(
        "2026-07-26-arc-vfx-atlas-v2-alpha.png",
        "small-arc-cloud-v2.png",
        "small.cloud",
        470,
        (0, 0),
    ),
    SpriteBuild(
        "2026-07-26-arc-vfx-atlas-v2-alpha.png",
        "small-arc-gyro-ring-v2.png",
        "small.ring",
        470,
        (1, 0),
    ),
    SpriteBuild(
        "2026-07-26-arc-vfx-atlas-v2-alpha.png",
        "omega-arc-cloud-v2.png",
        "omega.cloud",
        470,
        (0, 1),
    ),
    SpriteBuild(
        "2026-07-26-arc-vfx-atlas-v2-alpha.png",
        "omega-arc-lattice-sigil-v2.png",
        "omega.sigil",
        470,
        (1, 1),
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


def _extract_source(
    image: Image.Image,
    quadrant: tuple[int, int] | None,
) -> Image.Image:
    if quadrant is None:
        return image
    col, row = quadrant
    cell_width = image.width // 2
    cell_height = image.height // 2
    return image.crop((
        col * cell_width,
        row * cell_height,
        (col + 1) * cell_width,
        (row + 1) * cell_height,
    ))


def _normalize_sprite(image: Image.Image, content_size: int) -> Image.Image:
    crop = image.crop(_threshold_bbox(image))
    scale = min(content_size / crop.width, content_size / crop.height)
    width = max(1, round(crop.width * scale))
    height = max(1, round(crop.height * scale))
    resized = crop.resize((width, height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE))
    canvas.alpha_composite(
        resized,
        ((CANVAS_SIZE - width) // 2, (CANVAS_SIZE - height) // 2),
    )
    return canvas


def _write_sprite(
    image: Image.Image,
    output_path: Path,
    build: SpriteBuild,
    force: bool,
) -> None:
    if output_path.exists() and not force:
        raise FileExistsError(
            f"Refusing to overwrite {output_path}; rerun with --force",
        )
    metadata = PngImagePlugin.PngInfo()
    metadata.add_text("arcCoreSpriteRole", build.role)
    metadata.add_text("arcCoreSpriteSource", build.source_name)
    metadata.add_text("arcCoreSpriteCanvas", f"{CANVAS_SIZE}x{CANVAS_SIZE}")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path, optimize=True, pnginfo=metadata)
    digest = sha256(output_path.read_bytes()).hexdigest()
    print(f"{build.role}: {output_path.name} sha256={digest}")


def build_package(source_dir: Path, output_dir: Path, force: bool) -> None:
    source_cache: dict[str, Image.Image] = {}
    for build in BUILDS:
        if build.source_name not in source_cache:
            source_path = source_dir / build.source_name
            if not source_path.exists():
                raise FileNotFoundError(source_path)
            source_cache[build.source_name] = Image.open(source_path).convert(
                "RGBA",
            )

        source = _extract_source(
            source_cache[build.source_name],
            build.quadrant,
        )
        sprite = _normalize_sprite(source, build.content_size)
        _write_sprite(sprite, output_dir / build.output_name, build, force)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    build_package(args.source_dir, args.output_dir, args.force)


if __name__ == "__main__":
    main()
