"""Build streamed v11 Level 1/2 depth chunks and a runtime-only manifest."""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "sprites/backgrounds/world-v11-runtime-polished-v4"
SOURCES = PACKAGE / "sources"
CHUNKS = PACKAGE / "depth-chunks"
MANIFEST = ROOT / "values/v11DepthBackgroundRuntimeManifest.js"
PREVIEW = ROOT / "visual-approval-previews/v11-runtime-depth-v4-sample-contact-sheet-2026-07-12.png"

DISPLAY_TILE_PX = 94
SOURCE_TILE_PX = 47
CHUNK_WIDTH_TILES = 64
CHUNK_HEIGHT_TILES = 32
GROUND_RAW_Y = 105
PREPARED_DEPTH_TILES = 2000
CURRENT_RUNTIME_DEPTH_TILES = 1935
LEVELS = (
    {"id": "level1", "rawX": 41, "widthTiles": 112, "concept": "level1-0-2000m-overview.png"},
    {"id": "level2", "rawX": 153, "widthTiles": 167, "concept": "level2-0-5000m-overview.png"},
)
FUTURE_SOURCES = (
    "level2-future-blackglass-detail.png",
    "level2-future-starfire-detail.png",
    "level2-0-5000m-overview.png",
)
DETAIL_FAMILIES = {
    "level1": (
        (0, 700, "level1-shallow-blue-detail.png"),
        (700, 1300, "level1-amber-crystal-detail.png"),
        (1300, 2000, "level1-silver-core-detail.png"),
    ),
    "level2": (
        (0, 600, "level2-current-magma-detail.png"),
        (600, 1400, "level2-obsidian-ember-detail.png"),
        (1400, 2000, "level2-foundry-heart-detail.png"),
    ),
}


def font(size: int, bold: bool = False):
    path = Path("C:/Windows/Fonts") / ("arialbd.ttf" if bold else "arial.ttf")
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def detail_source(level_id: str, depth: int) -> Path:
    for start, end, filename in DETAIL_FAMILIES[level_id]:
        if start <= depth < end:
            return SOURCES / filename
    return SOURCES / DETAIL_FAMILIES[level_id][-1][2]


def transformed_variants(source: Image.Image) -> tuple[Image.Image, ...]:
    return (
        source,
        ImageOps.mirror(source),
        ImageOps.flip(source),
        source.rotate(90, expand=False),
        source.rotate(180, expand=False),
        source.rotate(270, expand=False),
    )


def collage_strip(source: Image.Image, size: tuple[int, int], seed: int) -> Image.Image:
    import random

    width, height = size
    variants = transformed_variants(source.convert("RGB"))
    canvas = Image.new("RGB", size)
    overlap = max(96, height // 7)
    segment = max(720, min(round(height * 0.90), 1350))
    cursor, index = 0, 0
    while cursor < width:
        rng = random.Random(seed + index * 104729)
        piece_width = min(segment + (overlap if cursor else 0), width - max(0, cursor - overlap))
        variant = variants[rng.randrange(len(variants))]
        piece = ImageOps.fit(
            variant,
            (piece_width, height),
            method=Image.Resampling.LANCZOS,
            centering=(0.2 + rng.random() * 0.6, 0.2 + rng.random() * 0.6),
        )
        paste_x = max(0, cursor - overlap)
        if paste_x == 0:
            canvas.paste(piece, (paste_x, 0))
        else:
            mask = Image.new("L", piece.size, 255)
            mask_draw = ImageDraw.Draw(mask)
            for x in range(min(overlap, piece.width)):
                mask_draw.line((x, 0, x, piece.height), fill=round(255 * x / max(1, overlap - 1)))
            canvas.paste(piece, (paste_x, 0), mask)
        cursor += segment - overlap
        index += 1
    return canvas


def concept_color(concept: Image.Image, depth: int, total_depth: int) -> tuple[int, int, int]:
    y = max(0, min(concept.height - 1, round(depth / total_depth * (concept.height - 1))))
    stripe = concept.crop((0, max(0, y - 4), concept.width, min(concept.height, y + 5)))
    return stripe.resize((1, 1), Image.Resampling.BOX).getpixel((0, 0))


def polish_strip(image: Image.Image, color: tuple[int, int, int]) -> Image.Image:
    wash = Image.new("RGB", image.size, color)
    result = Image.blend(image, wash, 0.13)
    blurred = result.filter(ImageFilter.GaussianBlur(radius=4))
    high = ImageChops.subtract(result, blurred, scale=1.0, offset=128)
    result = ImageChops.soft_light(result, high)
    result = ImageEnhance.Contrast(result).enhance(1.06)
    result = ImageEnhance.Color(result).enhance(0.96)
    return result.filter(ImageFilter.UnsharpMask(radius=0.7, percent=70, threshold=3))


def overlap_alpha(image: Image.Image, left: bool, right: bool, top: bool, bottom: bool) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = Image.new("L", rgba.size, 255)
    draw = ImageDraw.Draw(alpha)
    fade = 2 * SOURCE_TILE_PX
    if left:
        for x in range(min(fade, rgba.width)):
            draw.line((x, 0, x, rgba.height), fill=round(255 * x / max(1, fade - 1)))
    if right:
        for offset in range(min(fade, rgba.width)):
            x = rgba.width - 1 - offset
            draw.line((x, 0, x, rgba.height), fill=round(255 * offset / max(1, fade - 1)))
    vertical = Image.new("L", rgba.size, 255)
    vertical_draw = ImageDraw.Draw(vertical)
    if top:
        for y in range(min(fade, rgba.height)):
            vertical_draw.line((0, y, rgba.width, y), fill=round(255 * y / max(1, fade - 1)))
    if bottom:
        for offset in range(min(fade, rgba.height)):
            y = rgba.height - 1 - offset
            vertical_draw.line((0, y, rgba.width, y), fill=round(255 * offset / max(1, fade - 1)))
    rgba.putalpha(ImageChops.multiply(alpha, vertical))
    return rgba


def make_entry(level: dict, row: int, column: int, rel_x: int, depth: int,
               width_tiles: int, height_tiles: int, filename: str) -> dict:
    raw_x, raw_y = level["rawX"] + rel_x, GROUND_RAW_Y + depth
    sequence = row * 10 + column
    return {
        "id": f"v11-depth-v4-{level['id']}-r{row + 1:03d}-c{column + 1:02d}",
        "name": Path(filename).stem,
        "textureKey": f"v11-depth-v4-{level['id']}-{row + 1:03d}-{column + 1:02d}",
        "path": f"sprites/backgrounds/world-v11-runtime-polished-v4/depth-chunks/{filename}",
        "scope": "underground-depth",
        "level": level["id"],
        "active": True,
        "xTile": raw_x,
        "yTile": raw_y,
        "widthTiles": width_tiles,
        "heightTiles": height_tiles,
        "xPx": raw_x * DISPLAY_TILE_PX,
        "yPx": raw_y * DISPLAY_TILE_PX,
        "widthPx": width_tiles * DISPLAY_TILE_PX,
        "heightPx": height_tiles * DISPLAY_TILE_PX,
        "sourceWidthPx": width_tiles * SOURCE_TILE_PX,
        "sourceHeightPx": height_tiles * SOURCE_TILE_PX,
        "opacity": 1.0,
        "visible": True,
        "depth": -7.0 + sequence * 0.0000001,
        "drawOrder": sequence,
    }


def render_level(level: dict) -> list[dict]:
    concept = Image.open(SOURCES / level["concept"]).convert("RGB")
    entries = []
    row_count = math.ceil(PREPARED_DEPTH_TILES / CHUNK_HEIGHT_TILES)
    column_count = math.ceil(level["widthTiles"] / CHUNK_WIDTH_TILES)
    for row in range(row_count):
        depth = row * CHUNK_HEIGHT_TILES
        logical_height = min(CHUNK_HEIGHT_TILES, PREPARED_DEPTH_TILES - depth)
        row_start = max(0, depth - 1)
        row_end = min(PREPARED_DEPTH_TILES, depth + logical_height + 1)
        height_tiles = row_end - row_start
        total_depth = 2000 if level["id"] == "level1" else 5000
        plate_path = detail_source(level["id"], depth + logical_height // 2)
        with Image.open(plate_path) as plate:
            strip = collage_strip(
                plate,
                (level["widthTiles"] * SOURCE_TILE_PX, height_tiles * SOURCE_TILE_PX),
                seed=20260712 + row * 8191 + (0 if level["id"] == "level1" else 900001),
            )
        strip = polish_strip(strip, concept_color(concept, depth + logical_height // 2, total_depth))
        for column in range(column_count):
            logical_x = column * CHUNK_WIDTH_TILES
            logical_width = min(CHUNK_WIDTH_TILES, level["widthTiles"] - logical_x)
            rel_x = max(0, logical_x - 1)
            rel_end = min(level["widthTiles"], logical_x + logical_width + 1)
            width_tiles = rel_end - rel_x
            image = strip.crop((rel_x * SOURCE_TILE_PX, 0, rel_end * SOURCE_TILE_PX, strip.height))
            image = overlap_alpha(
                image,
                left=logical_x > 0,
                right=logical_x + logical_width < level["widthTiles"],
                top=depth > 0,
                bottom=depth + logical_height < PREPARED_DEPTH_TILES,
            )
            filename = f"{level['id']}-r{row + 1:03d}-c{column + 1:02d}.webp"
            image.save(CHUNKS / filename, "WEBP", quality=90, method=4)
            entries.append(make_entry(level, row, column, rel_x, row_start, width_tiles, height_tiles, filename))
        print(f"{level['id']}: row {row + 1}/{row_count}", flush=True)
    concept.close()
    return entries


def render_manifest(entries: list[dict]) -> None:
    data = {
        "version": 1,
        "generatedBy": "ai-tools/2026-07-12-build-v11-depth-backgrounds-v4.py",
        "tileSize": DISPLAY_TILE_PX,
        "sourcePixelsPerTile": SOURCE_TILE_PX,
        "xOffsetTiles": -40,
        "xOffsetPx": -40 * DISPLAY_TILE_PX,
        "yOffsetTiles": -40,
        "yOffsetPx": -40 * DISPLAY_TILE_PX,
        "runtimeCrop": {"sourceLeftTile": 40, "sourceTopTile": 40, "sourceRightTileExclusive": 320, "sourceBottomTileExclusive": 2040},
        "preparedDepthTiles": PREPARED_DEPTH_TILES,
        "currentRuntimeDepthTiles": CURRENT_RUNTIME_DEPTH_TILES,
        "futureLevel2DepthTiles": 5000,
        "futureLevel2Active": False,
        "futureSources": [f"sprites/backgrounds/world-v11-runtime-polished-v4/sources/{name}" for name in FUTURE_SOURCES],
        "objectCount": len(entries),
        "objects": entries,
    }
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    text = (
        "// Generated file. Re-run the dated builder; do not edit by hand.\n"
        "const deepFreeze = value => {\n"
        "  if (!value || typeof value !== \"object\" || Object.isFrozen(value)) return value;\n"
        "  Object.values(value).forEach(deepFreeze);\n"
        "  return Object.freeze(value);\n"
        "};\n\n"
        f"export const V11_DEPTH_BACKGROUND_RUNTIME_MANIFEST = deepFreeze({payload});\n"
    )
    MANIFEST.write_text(text, encoding="utf-8", newline="\n")


def render_preview(entries: list[dict]) -> None:
    depths = (96, 352, 704, 1088, 1440, 1792)
    canvas = Image.new("RGB", (1460, 1120), (9, 12, 17))
    draw = ImageDraw.Draw(canvas)
    draw.text((36, 24), "V11 RUNTIME DEPTH V4 • GENERATED CHUNK SAMPLES", font=font(32, True), fill="white")
    draw.text((36, 66), "47 source px/tile • displayed at 94 px/tile • no chunk stretching", font=font(20), fill=(166, 178, 192))
    for column, level_id in enumerate(("level1", "level2")):
        draw.text((36 + column * 710, 105), level_id.upper(), font=font(24, True), fill=(232, 235, 239))
        for row, depth in enumerate(depths):
            entry = next(item for item in entries if item["level"] == level_id and item["yTile"] - GROUND_RAW_Y <= depth < item["yTile"] - GROUND_RAW_Y + item["heightTiles"] and item["xTile"] in (41, 153))
            with Image.open(ROOT / entry["path"]) as image:
                sample = ImageOps.fit(image.convert("RGB"), (640, 300), method=Image.Resampling.LANCZOS).resize((640, 130), Image.Resampling.LANCZOS)
            y = 145 + row * 155
            canvas.paste(sample, (36 + column * 710, y))
            draw.text((48 + column * 710, y + 100), f"{depth:,}m", font=font(18, True), fill="white")
    canvas.save(PREVIEW, optimize=True)


def main() -> None:
    Image.MAX_IMAGE_PIXELS = None
    CHUNKS.mkdir(parents=True, exist_ok=True)
    for old in CHUNKS.glob("level*-r*-c*.webp"):
        old.unlink()
    entries = []
    for level in LEVELS:
        entries.extend(render_level(level))
    render_manifest(entries)
    render_preview(entries)
    print(f"Built {len(entries)} streamed depth chunks", flush=True)
    print(MANIFEST, flush=True)
    print(PREVIEW, flush=True)


if __name__ == "__main__":
    main()
