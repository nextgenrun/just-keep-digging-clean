"""Build the 50-frame Star identity atlases and the authored I-menu foundation."""

from __future__ import annotations

import hashlib
import json
from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
STAR_ROOT = ROOT / "sprites" / "environment" / "star-identities-v1"
STAR_SOURCE = STAR_ROOT / "source"
UI_ROOT = ROOT / "sprites" / "UI" / "star-atlas-v1"
UI_SOURCE = UI_ROOT / "source" / "star-atlas-foundation-source-v1.png"
FRAME_SIZE = 320
FOUNDATION_SIZE = (1536, 800)
BLACK_THRESHOLD = 3
FOUNDATION_BACKGROUND_THRESHOLD = 10

RARITY_SOURCES = (
    ("common", 4, 3, 12),
    ("uncommon", 5, 2, 10),
    ("rare", 5, 2, 10),
    ("epic", 4, 2, 8),
    ("mythic", 3, 2, 6),
    ("astral", 2, 2, 4),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def luminosity_to_alpha(source: Image.Image) -> Image.Image:
    """Convert black-backed additive art into straight-alpha RGBA."""
    rgb = source.convert("RGB")
    output = Image.new("RGBA", rgb.size, (0, 0, 0, 0))
    converted = []
    for red, green, blue in rgb.getdata():
        maximum = max(red, green, blue)
        if maximum <= BLACK_THRESHOLD:
            converted.append((0, 0, 0, 0))
            continue
        alpha = round(
            ((maximum - BLACK_THRESHOLD) / (255 - BLACK_THRESHOLD)) ** 0.88
            * 255
        )
        alpha = max(1, min(255, alpha))
        scale = 255 / alpha
        converted.append((
            min(255, round(red * scale)),
            min(255, round(green * scale)),
            min(255, round(blue * scale)),
            alpha,
        ))
    output.putdata(converted)
    return output


def square_cell(source: Image.Image, column: int, row: int, columns: int, rows: int) -> Image.Image:
    left = round(column * source.width / columns)
    right = round((column + 1) * source.width / columns)
    top = round(row * source.height / rows)
    bottom = round((row + 1) * source.height / rows)
    width = right - left
    height = bottom - top
    size = min(width, height)
    crop_left = left + (width - size) // 2
    crop_top = top + (height - size) // 2
    return source.crop((crop_left, crop_top, crop_left + size, crop_top + size))


def build_rarity_atlas(rarity: str, columns: int, rows: int, count: int) -> dict:
    source_path = STAR_SOURCE / f"star-identities-{rarity}-source-v1.png"
    output_path = STAR_ROOT / f"star-identities-{rarity}-atlas-v1.png"
    source = Image.open(source_path).convert("RGB")
    atlas = Image.new(
        "RGBA",
        (columns * FRAME_SIZE, rows * FRAME_SIZE),
        (0, 0, 0, 0),
    )
    coverages = []
    for frame in range(count):
        row, column = divmod(frame, columns)
        cell = square_cell(source, column, row, columns, rows)
        cell = cell.resize((FRAME_SIZE, FRAME_SIZE), Image.Resampling.LANCZOS)
        cell = luminosity_to_alpha(cell)
        atlas.alpha_composite(cell, (column * FRAME_SIZE, row * FRAME_SIZE))
        alpha = cell.getchannel("A")
        occupied = sum(1 for value in alpha.getdata() if value > 0)
        coverages.append(round(occupied / (FRAME_SIZE * FRAME_SIZE), 6))
    atlas.save(output_path, optimize=True)
    return {
        "rarity": rarity,
        "source": source_path.relative_to(ROOT).as_posix(),
        "sourceSha256": sha256(source_path),
        "output": output_path.relative_to(ROOT).as_posix(),
        "outputSha256": sha256(output_path),
        "sourceSize": list(source.size),
        "frameSize": FRAME_SIZE,
        "columns": columns,
        "rows": rows,
        "frameCount": count,
        "coverage": coverages,
    }


def remove_connected_black_background(source: Image.Image) -> Image.Image:
    rgba = source.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    seen = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if seen[index]:
            return
        red, green, blue, _ = pixels[x, y]
        if max(red, green, blue) > FOUNDATION_BACKGROUND_THRESHOLD:
            return
        seen[index] = 1
        queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        pixels[x, y] = (*pixels[x, y][:3], 0)
        if x > 0:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y > 0:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)
    return rgba


def build_foundation() -> dict:
    output_path = UI_ROOT / "star-atlas-foundation-v1.png"
    source = Image.open(UI_SOURCE).convert("RGBA")
    alpha_safe = remove_connected_black_background(source)
    bounds = alpha_safe.getchannel("A").getbbox()
    if not bounds:
        raise RuntimeError("Star Atlas foundation has no visible pixels")
    cropped = alpha_safe.crop(bounds)
    runtime = cropped.resize(FOUNDATION_SIZE, Image.Resampling.LANCZOS)
    runtime.save(output_path, optimize=True)
    return {
        "source": UI_SOURCE.relative_to(ROOT).as_posix(),
        "sourceSha256": sha256(UI_SOURCE),
        "output": output_path.relative_to(ROOT).as_posix(),
        "outputSha256": sha256(output_path),
        "sourceSize": list(source.size),
        "sourceBounds": list(bounds),
        "outputSize": list(runtime.size),
        "transparentCorners": [
            runtime.getpixel((0, 0))[3],
            runtime.getpixel((runtime.width - 1, 0))[3],
            runtime.getpixel((0, runtime.height - 1))[3],
            runtime.getpixel((runtime.width - 1, runtime.height - 1))[3],
        ],
    }


def main() -> None:
    STAR_ROOT.mkdir(parents=True, exist_ok=True)
    UI_ROOT.mkdir(parents=True, exist_ok=True)
    atlases = [
        build_rarity_atlas(rarity, columns, rows, count)
        for rarity, columns, rows, count in RARITY_SOURCES
    ]
    foundation = build_foundation()
    manifest = {
        "schemaVersion": 1,
        "packageId": "star-identities-v1",
        "artSource": "ImageGen built-in",
        "identityCount": sum(entry[3] for entry in RARITY_SOURCES),
        "frameSize": FRAME_SIZE,
        "atlases": atlases,
        "inventoryFoundation": foundation,
    }
    manifest_path = STAR_ROOT / "star-identities-v1.manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Built {manifest['identityCount']} Star identities across "
        f"{len(atlases)} atlases and {foundation['output']}."
    )


if __name__ == "__main__":
    main()
