"""Build lossless runtime assets for the Hardcore memorial flow."""

from __future__ import annotations

import argparse
from collections import deque
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, ImageOps


ALPHA_BBOX_THRESHOLD = 6
SOURCE_PADDING_PX = 10


@dataclass(frozen=True)
class AssetBuild:
    source: Path
    output: Path
    canvas: tuple[int, int]
    content: tuple[int, int]
    symmetric_alpha: bool = False


BUILDS = (
    AssetBuild(
        Path("sprites/environment/hardcore-memorial-v1/hardcore-memorial-master-v1.png"),
        Path("sprites/environment/hardcore-memorial-v1/hardcore-memorial-runtime-v1.webp"),
        (512, 768),
        (484, 736),
    ),
    AssetBuild(
        Path("sprites/UI/hardcore-mode-v1/hardcore-death-action-master-v1.png"),
        Path("sprites/UI/hardcore-mode-v1/hardcore-death-action-runtime-v1.webp"),
        (768, 256),
        (740, 228),
        True,
    ),
)


def threshold_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    binary = alpha.point(
        lambda value: 255 if value > ALPHA_BBOX_THRESHOLD else 0,
    )
    bbox = binary.getbbox()
    if bbox is None:
        raise ValueError("Asset contains no visible alpha pixels")
    left, top, right, bottom = bbox
    return (
        max(0, left - SOURCE_PADDING_PX),
        max(0, top - SOURCE_PADDING_PX),
        min(image.width, right + SOURCE_PADDING_PX),
        min(image.height, bottom + SOURCE_PADDING_PX),
    )


def normalize_asset(image: Image.Image, build: AssetBuild) -> Image.Image:
    crop = image.crop(threshold_bbox(image))
    content_width, content_height = build.content
    scale = min(content_width / crop.width, content_height / crop.height)
    size = (
        max(1, round(crop.width * scale)),
        max(1, round(crop.height * scale)),
    )
    resized = crop.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", build.canvas)
    canvas.alpha_composite(
        resized,
        (
            (build.canvas[0] - resized.width) // 2,
            (build.canvas[1] - resized.height) // 2,
        ),
    )
    normalized = keep_primary_component(canvas)
    return constrain_symmetric_silhouette(normalized) if build.symmetric_alpha else normalized


def keep_primary_component(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    pixels = alpha.load()
    visited: set[tuple[int, int]] = set()
    largest: list[tuple[int, int]] = []
    for y in range(image.height):
        for x in range(image.width):
            if (x, y) in visited or pixels[x, y] <= ALPHA_BBOX_THRESHOLD:
                continue
            component: list[tuple[int, int]] = []
            queue = deque([(x, y)])
            visited.add((x, y))
            while queue:
                px, py = queue.popleft()
                component.append((px, py))
                for oy in (-1, 0, 1):
                    for ox in (-1, 0, 1):
                        nx, ny = px + ox, py + oy
                        if (
                            (ox == 0 and oy == 0)
                            or nx < 0
                            or ny < 0
                            or nx >= image.width
                            or ny >= image.height
                            or (nx, ny) in visited
                            or pixels[nx, ny] <= ALPHA_BBOX_THRESHOLD
                        ):
                            continue
                        visited.add((nx, ny))
                        queue.append((nx, ny))
            if len(component) > len(largest):
                largest = component
    if not largest:
        raise ValueError("Asset contains no connected visible component")
    keep = Image.new("L", image.size)
    keep_pixels = keep.load()
    for x, y in largest:
        keep_pixels[x, y] = 255
    keep = keep.filter(ImageFilter.MaxFilter(5))
    cleaned = image.copy()
    cleaned.putalpha(ImageChops.multiply(alpha, keep))
    return cleaned


def constrain_symmetric_silhouette(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    mirrored_support = ImageOps.mirror(alpha).filter(ImageFilter.MaxFilter(9))
    cleaned = image.copy()
    cleaned.putalpha(ImageChops.multiply(alpha, mirrored_support))
    return cleaned


def validate_asset(image: Image.Image, path: Path) -> None:
    alpha = image.getchannel("A")
    if alpha.getbbox() is None:
        raise ValueError(f"{path} has no visible pixels")
    corners = (
        alpha.getpixel((0, 0)),
        alpha.getpixel((image.width - 1, 0)),
        alpha.getpixel((0, image.height - 1)),
        alpha.getpixel((image.width - 1, image.height - 1)),
    )
    if any(corners):
        raise ValueError(f"{path} does not have transparent corners")


def build_assets(root: Path, force: bool) -> None:
    for build in BUILDS:
        source_path = root / build.source
        output_path = root / build.output
        if not source_path.exists():
            raise FileNotFoundError(source_path)
        if output_path.exists() and not force:
            raise FileExistsError(
                f"Refusing to overwrite {output_path}; rerun with --force",
            )
        source = Image.open(source_path).convert("RGBA")
        runtime = normalize_asset(source, build)
        validate_asset(runtime, output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        runtime.save(output_path, "WEBP", lossless=True, quality=100, method=6)
        digest = sha256(output_path.read_bytes()).hexdigest()
        print(
            f"{build.output.as_posix()}: {runtime.width}x{runtime.height} "
            f"bytes={output_path.stat().st_size} sha256={digest}",
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    build_assets(args.root.resolve(), args.force)


if __name__ == "__main__":
    main()
