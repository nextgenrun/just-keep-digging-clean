"""Build the production Heavenblocks v2 sprite and atmosphere library."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SPRITE_ROOT = ROOT / "sprites" / "heavenblocks-v2"
BACKGROUND_ROOT = ROOT / "sprites" / "backgrounds" / "heavenblocks-v2"
SOURCE_ROOT = SPRITE_ROOT / "sources"
BACKGROUND_SOURCE_ROOT = BACKGROUND_ROOT / "sources"
TILE_SOURCE_SIZE = 384
CONTACT_CELL_SIZE = 192

ATLAS_ASSETS = (
    "terrain-interior",
    "terrain-alternate",
    "terrain-ore",
    "terrain-crystal",
    "terrain-surface",
    "terrain-edge-left",
    "terrain-edge-right",
    "terrain-underside",
    "prop-flora",
    "prop-crystal-cluster",
    "heart-shrine",
    "portal",
    "barrier",
    "relic-vault",
    "craft-component",
    "capstone",
)

BIOMES = {
    "cloud-reef": {
        "source": "2026-07-29-cloud-reef-modular-atlas-alpha-v2.png",
        "prefix": "cloud",
    },
    "halo-bastion": {
        "source": "2026-07-29-halo-bastion-modular-atlas-alpha-v2.png",
        "prefix": "halo",
    },
    "eclipse-scar": {
        "source": "2026-07-29-eclipse-scar-modular-atlas-alpha-v2.png",
        "prefix": "eclipse",
    },
}

BACKGROUND_NAMES = (
    "cloud-reef-atmosphere-v2.webp",
    "halo-bastion-atmosphere-v2.webp",
    "eclipse-scar-atmosphere-v2.webp",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("Sprite cell is fully transparent")
    return bbox


def contain(image: Image.Image, size: int, fill: bool) -> Image.Image:
    image = image.crop(alpha_bbox(image))
    if fill:
        return image.resize((size, size), Image.Resampling.LANCZOS)
    ratio = min(size / image.width, size / image.height)
    width = max(1, round(image.width * ratio))
    height = max(1, round(image.height * ratio))
    resized = image.resize((width, height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((size - width) // 2, size - height))
    return canvas


def save_webp(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", lossless=True, quality=100, method=3)


def split_atlas(biome_id: str, spec: dict[str, str]) -> list[Path]:
    source_path = SOURCE_ROOT / spec["source"]
    source = Image.open(source_path).convert("RGBA")
    output_dir = SPRITE_ROOT / biome_id
    output_dir.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    for index, asset_name in enumerate(ATLAS_ASSETS):
        column = index % 4
        row = index // 4
        left = round(column * source.width / 4)
        right = round((column + 1) * source.width / 4)
        top = round(row * source.height / 4)
        bottom = round((row + 1) * source.height / 4)
        cell = source.crop((left, top, right, bottom))
        if index < 8:
            cell = contain(cell, TILE_SOURCE_SIZE, fill=index < 4)
        else:
            cell = cell.crop(alpha_bbox(cell))
        path = output_dir / f"{spec['prefix']}-{asset_name}-v2.webp"
        save_webp(cell, path)
        paths.append(path)
    return paths


def white_separator_groups(image: Image.Image) -> list[tuple[int, int]]:
    rgb = image.convert("RGB")
    sample_rows = range(0, rgb.height, max(1, rgb.height // 64))
    white_columns: list[int] = []
    for x in range(rgb.width):
        samples = [rgb.getpixel((x, y)) for y in sample_rows]
        white_ratio = sum(
            red > 242 and green > 242 and blue > 242
            and max(red, green, blue) - min(red, green, blue) < 8
            for red, green, blue in samples
        ) / max(1, len(samples))
        if white_ratio > 0.9:
            white_columns.append(x)

    groups: list[tuple[int, int]] = []
    for column in white_columns:
        if not groups or column > groups[-1][1] + 1:
            groups.append((column, column))
        else:
            groups[-1] = (groups[-1][0], column)
    return [group for group in groups if group[1] - group[0] >= 1]


def split_backgrounds() -> list[Path]:
    source_path = BACKGROUND_SOURCE_ROOT / "2026-07-29-heavenblocks-atmosphere-triptych-v2.png"
    source = Image.open(source_path).convert("RGB")
    separators = white_separator_groups(source)
    if len(separators) >= 2:
        first, second = separators[:2]
        spans = ((0, first[0]), (first[1] + 1, second[0]), (second[1] + 1, source.width))
    else:
        spans = tuple(
            (round(index * source.width / 3), round((index + 1) * source.width / 3))
            for index in range(3)
        )

    paths: list[Path] = []
    for name, (left, right) in zip(BACKGROUND_NAMES, spans):
        panel = source.crop((left, 0, right, source.height))
        path = BACKGROUND_ROOT / name
        path.parent.mkdir(parents=True, exist_ok=True)
        panel.save(path, "WEBP", quality=94, method=4)
        paths.append(path)
    return paths


def build_contact_sheet(sprite_paths: list[Path]) -> Path:
    canvas = Image.new("RGBA", (8 * CONTACT_CELL_SIZE, 6 * CONTACT_CELL_SIZE), (17, 22, 30, 255))
    draw = ImageDraw.Draw(canvas)
    for index, path in enumerate(sprite_paths):
        image = Image.open(path).convert("RGBA")
        image.thumbnail((CONTACT_CELL_SIZE - 18, CONTACT_CELL_SIZE - 18), Image.Resampling.LANCZOS)
        x = (index % 8) * CONTACT_CELL_SIZE + (CONTACT_CELL_SIZE - image.width) // 2
        y = (index // 8) * CONTACT_CELL_SIZE + (CONTACT_CELL_SIZE - image.height) // 2
        canvas.alpha_composite(image, (x, y))
        draw.rectangle(
            (
                (index % 8) * CONTACT_CELL_SIZE,
                (index // 8) * CONTACT_CELL_SIZE,
                (index % 8 + 1) * CONTACT_CELL_SIZE - 1,
                (index // 8 + 1) * CONTACT_CELL_SIZE - 1,
            ),
            outline=(58, 75, 94, 255),
            width=2,
        )
    output = SPRITE_ROOT / "2026-07-29-heavenblocks-runtime-contact-sheet-v2.png"
    canvas.save(output, "PNG", optimize=True)
    return output


def write_manifest(paths: list[Path]) -> Path:
    assets = []
    for path in paths:
        with Image.open(path) as image:
            assets.append(
                {
                    "path": path.relative_to(ROOT).as_posix(),
                    "width": image.width,
                    "height": image.height,
                    "mode": image.mode,
                    "sha256": sha256(path),
                }
            )
    manifest = {
        "version": 2,
        "generatedBy": Path(__file__).name,
        "runtimeFacadeImages": 0,
        "sourceAtlases": 3,
        "modularSprites": len(BIOMES) * len(ATLAS_ASSETS),
        "atmosphereOnlyBackgrounds": len(BACKGROUND_NAMES),
        "assets": assets,
    }
    output = SPRITE_ROOT / "manifest-v2.json"
    output.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return output


def main() -> None:
    sprite_paths: list[Path] = []
    for biome_id, spec in BIOMES.items():
        sprite_paths.extend(split_atlas(biome_id, spec))
    background_paths = split_backgrounds()
    contact_sheet = build_contact_sheet(sprite_paths)
    manifest = write_manifest([*sprite_paths, *background_paths, contact_sheet])
    print(f"Built {len(sprite_paths)} modular sprites")
    print(f"Built {len(background_paths)} atmosphere-only backgrounds")
    print(f"Manifest: {manifest.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
