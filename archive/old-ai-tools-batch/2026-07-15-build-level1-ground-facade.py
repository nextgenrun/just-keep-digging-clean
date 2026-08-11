"""Build the rollback-safe Level 1 surface facade and recognition atlas."""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SCENIC_DIR = ROOT / "sprites" / "backgrounds" / "world-scenic-regions-v1"
SCENIC_SOURCE = ROOT / "sprites" / "backgrounds" / "start-zone-scenic-v1" / "npc-town-scenic-composite-v1.webp"
SCENIC_EXTENDED_OUTPUT = ROOT / "sprites" / "backgrounds" / "start-zone-scenic-v1" / "npc-town-scenic-composite-v2.webp"
CONTINUATION_SOURCE = SCENIC_DIR / "town-ground-solid-facade-v1.png"
CELL = 94
TOWN_COLUMNS = 13
TOWN_VIEW_COLUMNS = 14
TOTAL_COLUMNS = 280
TOTAL_ROWS = 10
CHUNK_COLUMNS = (32, 32, 32, 32, 32, 32, 32, 32, 24)
ATLAS_COLUMNS = 8
SCENIC_GROUND_FRACTION = 0.5675
EXACT_BLEND_START_ROWS = 2.25

RESOURCE_MARKERS = (
    ("copper", 0xF28A32),
    ("bronze", 0xCF7E32),
    ("steel", 0xA8C2D2),
    ("iron", 0xB8A185),
    ("silver", 0xD9E2ED),
    ("gold", 0xFFB51E),
    ("obsidian", 0xB247FF),
    ("ember-ore", 0xFFD166),
    ("magma-crystal", 0xFFB1FF),
    ("stone", 0xAEB8C1),
)

PROP_SOURCE = ROOT / "exports/dig_game_runtime_bg_props_v1/sprites/background-props/generated-runtime-v1"
SPECIAL_MARKERS = (
    ("teleport", ROOT / "sprites/tiles/special-tiles-v2/teleport-tile.webp"),
    ("gamble", ROOT / "sprites/tiles/special-tiles-v2/gamble-tile.webp"),
    ("gem-power", ROOT / "sprites/tiles/special-tiles-v2/gempower-block.webp"),
    ("speed", ROOT / "sprites/tiles/special-tiles-v2/speed-block.webp"),
    ("xp", ROOT / "sprites/tiles/special-tiles-v2/xp-block.webp"),
    ("crit", ROOT / "sprites/tiles/special-tiles-v2/crit-block.webp"),
    ("berserk", ROOT / "sprites/tiles/special-tiles-v2/berserk-block.webp"),
    ("combo", ROOT / "sprites/tiles/special-tiles-v2/combo-block.webp"),
    ("legend", ROOT / "sprites/tiles/special-tiles-v2/crown-block.webp"),
    ("geode-interior", ROOT / "exports/pallet-v10/dig_game_empty_backgrounds_and_separate_props_v10_08_07_2026/sprites/tiles/deep_resource_tiles/geode_crystal.png"),
    ("geode-wall", PROP_SOURCE / "prop_026_glowing_geode_arch.webp"),
    ("chest", ROOT / "sprites/tiles/approved-world/chest-normal.webp"),
    ("ancient-relic", PROP_SOURCE / "prop_049_relic_beacon.webp"),
    ("glow-crystal", PROP_SOURCE / "prop_022_wide_crystal_cluster.webp"),
)

def rgb(color: int) -> tuple[int, int, int]:
    return ((color >> 16) & 255, (color >> 8) & 255, color & 255)

def build_extended_scenic() -> None:
    """Add one right continuation tile without rescaling the approved town span."""
    scenic = Image.open(SCENIC_SOURCE).convert("RGB")
    target_width = round(scenic.width * TOWN_VIEW_COLUMNS / TOWN_COLUMNS)
    extension_width = target_width - scenic.width
    extension = scenic.crop((scenic.width - extension_width, 0, scenic.width, scenic.height))
    extension = extension.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    result = Image.new("RGB", (target_width, scenic.height))
    result.paste(scenic, (0, 0))
    result.paste(extension, (scenic.width, 0))
    # Keep every approved mockup pixel in the original 13-tile span exact.
    # Only the appended continuation tile is new artwork; lossless WebP avoids
    # a second lossy encode subtly softening the approved town plate.
    result.save(SCENIC_EXTENDED_OUTPUT, "WEBP", lossless=True, method=6)

def build_town_ground_template() -> tuple[Image.Image, int]:
    """Keep the visible town transition pixel-aligned to the approved mockup."""
    scenic = Image.open(SCENIC_SOURCE).convert("RGB")
    continuation = Image.open(CONTINUATION_SOURCE).convert("RGB")
    target_width = TOWN_COLUMNS * CELL
    target_height = TOTAL_ROWS * CELL
    ground_y = round(scenic.height * SCENIC_GROUND_FRACTION)
    exact = scenic.crop((0, ground_y, scenic.width, scenic.height))
    exact_height = round(exact.height * target_width / scenic.width)
    exact = exact.resize((target_width, exact_height), Image.Resampling.LANCZOS)

    if continuation.width != target_width:
        continuation = continuation.resize(
            (target_width, round(continuation.height * target_width / continuation.width)),
            Image.Resampling.LANCZOS,
        )
    blend_start = round(EXACT_BLEND_START_ROWS * CELL)
    continuation_top = min(continuation.height - 1, round(continuation.height * 0.18))
    lower = continuation.crop((0, continuation_top, continuation.width, continuation.height)).resize(
        (target_width, target_height - blend_start),
        Image.Resampling.LANCZOS,
    )

    result = Image.new("RGB", (target_width, target_height))
    result.paste(exact, (0, 0))
    mask = Image.new("L", lower.size, 255)
    mask_pixels = mask.load()
    feather = max(1, exact_height - blend_start)
    for y in range(min(feather, lower.height)):
        alpha = round(255 * y / feather)
        for x in range(lower.width):
            mask_pixels[x, y] = alpha
    result.paste(lower, (0, blend_start), mask)
    return result, ground_y


def build_continuous_ground() -> tuple[Image.Image, Image.Image, int]:
    source, ground_y = build_town_ground_template()

    total_width = TOTAL_COLUMNS * CELL
    panorama = Image.new("RGB", (total_width, source.height))
    scales = (1.0, 1.045, 0.965, 1.025, 0.985, 1.06, 0.95)
    overlap = 2 * CELL
    panorama.paste(source, (0, 0))
    cursor = source.width
    segment_index = 1
    while cursor < total_width:
        width = round(source.width * scales[segment_index % len(scales)])
        segment = source.resize((width, source.height), Image.Resampling.LANCZOS)
        if segment_index % 2:
            segment = segment.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        start = cursor
        available = min(segment.width, total_width - start)
        segment = segment.crop((0, 0, available, segment.height))
        blend_width = min(overlap, segment.width, cursor)
        previous = panorama.crop((cursor - blend_width, 0, cursor, source.height))
        previous = previous.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        incoming = segment.crop((0, 0, blend_width, source.height))
        mask = Image.new("L", incoming.size)
        mask_pixels = mask.load()
        for x in range(blend_width):
            alpha = round(255 * x / max(1, blend_width - 1))
            for y in range(source.height):
                mask_pixels[x, y] = alpha
        transition = Image.composite(incoming, previous, mask)
        panorama.paste(transition, (start, 0))
        if segment.width > blend_width:
            panorama.paste(segment.crop((blend_width, 0, segment.width, segment.height)), (start + blend_width, 0))
        cursor = start + segment.width
        segment_index += 1
    return panorama, source, ground_y


def make_resource_marker(color: int, seed: int) -> Image.Image:
    scale = 3
    size = CELL * scale
    rng = random.Random(seed)
    body = Image.new("RGBA", (size, size))
    glow = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(body)
    glow_draw = ImageDraw.Draw(glow)
    base = rgb(color)
    shadow = tuple(max(0, round(channel * 0.28)) for channel in base)
    bright = tuple(min(255, round(channel + (255 - channel) * 0.52)) for channel in base)

    direction = rng.choice((-1, 1))
    points = []
    for index in range(6):
        t = index / 5
        x = size * (0.16 + 0.68 * t)
        if direction < 0:
            x = size - x
        y = size * (0.28 + 0.44 * t) + rng.uniform(-0.08, 0.08) * size
        points.append((round(x), round(y)))
    glow_draw.line(points, fill=(*base, 115), width=28, joint="curve")
    draw.line(points, fill=(*shadow, 210), width=22, joint="curve")
    draw.line(points, fill=(*base, 235), width=13, joint="curve")
    draw.line(points, fill=(*bright, 215), width=4, joint="curve")

    for branch in range(3):
        root = points[rng.randrange(1, 5)]
        target = (
            round(root[0] + rng.uniform(-0.20, 0.20) * size),
            round(root[1] + rng.uniform(-0.22, 0.22) * size),
        )
        glow_draw.line((root, target), fill=(*base, 85), width=18)
        draw.line((root, target), fill=(*shadow, 190), width=14)
        draw.line((root, target), fill=(*base, 225), width=8)
        draw.line((root, target), fill=(*bright, 180), width=3)

    for _ in range(10):
        x = rng.randint(round(size * 0.20), round(size * 0.80))
        y = rng.randint(round(size * 0.20), round(size * 0.82))
        radius = rng.randint(4, 12)
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(*base, 220))
        draw.ellipse((x - radius // 2, y - radius // 2, x + 1, y + 1), fill=(*bright, 205))

    glow = glow.filter(ImageFilter.GaussianBlur(radius=12))
    glow.alpha_composite(body)
    return glow.resize((CELL, CELL), Image.Resampling.LANCZOS)

def extracted_marker(path: Path) -> Image.Image:
    source = Image.open(path).convert("RGBA")
    emblem_only = path.parent.name == "special-tiles-v2"
    width, height = source.size
    source_pixels = source.load()
    mask = Image.new("L", source.size)
    mask_pixels = mask.load()
    for y in range(height):
        for x in range(width):
            r, g, b, source_alpha = source_pixels[x, y]
            high, low = max(r, g, b), min(r, g, b)
            saturation = high - low
            luminance = (r * 3 + g * 5 + b * 2) / 10
            nx = (x + 0.5) / width - 0.5
            ny = (y + 0.5) / height - 0.5
            radial = max(0.0, min(1.0, (0.53 - math.hypot(nx, ny)) / 0.13))
            if emblem_only:
                # Preserve the authored luminous rune and colored fissures,
                # while dropping the opaque round/square stone backplate.
                signal = max((luminance - 145) * 2.5, (saturation - 28) * 3.4)
            else:
                signal = max((luminance - 48) * 2.5, (saturation - 14) * 2.25)
            alpha = round(max(0, min(255, signal)) * radial * source_alpha / 255)
            mask_pixels[x, y] = alpha
    source.putalpha(mask)
    bounds = source.getbbox()
    if not bounds: raise ValueError(f"Required facade marker source has no visible signal: {path}")
    source = source.crop(bounds)
    marker_size = round(CELL * 0.78)
    source.thumbnail((marker_size, marker_size), Image.Resampling.LANCZOS)
    marker = Image.new("RGBA", (CELL, CELL))
    marker.alpha_composite(source, ((CELL - source.width) // 2, (CELL - source.height) // 2))
    return marker

def build_recognition_atlas() -> tuple[Image.Image, list[dict[str, object]]]:
    frames: list[tuple[str, Image.Image]] = []
    for resource_index, (name, color) in enumerate(RESOURCE_MARKERS):
        for variant in range(3):
            frames.append((f"{name}-{variant + 1}", make_resource_marker(color, resource_index * 97 + variant * 31 + 7)))
    for name, path in SPECIAL_MARKERS:
        if not path.is_file() or path.stat().st_size <= 1:
            raise FileNotFoundError(f"Required facade marker source '{name}' is missing: {path}")
        frames.append((name, extracted_marker(path)))

    rows = math.ceil(len(frames) / ATLAS_COLUMNS)
    atlas = Image.new("RGBA", (ATLAS_COLUMNS * CELL, rows * CELL))
    manifest = []
    for index, (name, frame) in enumerate(frames):
        x = index % ATLAS_COLUMNS * CELL
        y = index // ATLAS_COLUMNS * CELL
        atlas.alpha_composite(frame, (x, y))
        manifest.append({"index": index, "name": name})
    return atlas, manifest

def main() -> None:
    SCENIC_DIR.mkdir(parents=True, exist_ok=True)
    build_extended_scenic()
    ground, town_ground, ground_y = build_continuous_ground()
    start_column = 0
    chunks = []
    for index, columns in enumerate(CHUNK_COLUMNS, start=1):
        left = start_column * CELL
        right = (start_column + columns) * CELL
        filename = f"level1-ground-facade-{index:02d}-v2.webp"
        ground.crop((left, 0, right, TOTAL_ROWS * CELL)).save(
            SCENIC_DIR / filename,
            "WEBP",
            quality=91,
            method=6,
        )
        chunks.append({"file": filename, "startColumn": start_column, "columns": columns})
        start_column += columns

    overview = ground.resize((2400, 200), Image.Resampling.LANCZOS)
    overview.save(SCENIC_DIR / "level1-ground-facade-overview-v2.webp", "WEBP", quality=90, method=6)
    scenic = Image.open(SCENIC_SOURCE).convert("RGB")
    preview_width = TOWN_COLUMNS * CELL
    scenic_top = scenic.crop((0, 0, scenic.width, ground_y))
    scenic_top = scenic_top.resize(
        (preview_width, round(scenic_top.height * preview_width / scenic.width)),
        Image.Resampling.LANCZOS,
    )
    preview = Image.new("RGB", (preview_width, scenic_top.height + 4 * CELL))
    preview.paste(scenic_top, (0, 0))
    preview.paste(town_ground.crop((0, 0, preview_width, 4 * CELL)), (0, scenic_top.height))
    preview.save(SCENIC_DIR / "level1-ground-town-transition-preview-v2.webp", "WEBP", quality=91, method=6)
    atlas, marker_manifest = build_recognition_atlas()
    atlas.save(SCENIC_DIR / "level1-ground-recognition-atlas-v2.png", "PNG", optimize=True)
    (SCENIC_DIR / "level1-ground-facade-manifest-v2.json").write_text(
        json.dumps({
            "cellPx": CELL,
            "rows": TOTAL_ROWS,
            "groundSourceY": ground_y,
            "exactTownColumns": TOWN_COLUMNS,
            "chunks": chunks,
            "markers": marker_manifest,
        }, indent=2),
        encoding="utf-8",
    )
    print(f"Built {len(chunks)} facade chunks, {len(marker_manifest)} recognition frames")


if __name__ == "__main__":
    main()
