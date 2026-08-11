from __future__ import annotations

import base64
import collections
import struct
import xml.etree.ElementTree as ET
import zlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_TMX = ROOT / "exports" / "dig-game-world-edit-v-11-08-07-2026-;1-img-test.tmx"
FULL_OUTPUT = ROOT / "exports" / "dig-game-world-v11-scale-correct-full-depth-mockup.png"
SURFACE_OUTPUT = ROOT / "exports" / "dig-game-world-v11-scale-correct-surface-mockup.png"
PREVIEW_OUTPUT = ROOT / "exports" / "dig-game-world-v11-scale-correct-preview.png"
ART_CONTROL_OUTPUT = ROOT / "exports" / "dig-game-world-v11-town-level2-art-control.png"

SOURCE_LAYER = "00_PAINT_HERE_tile_types"
DISPLAY_RIGHT_TILE = 360
SURFACE_END_ROW = 220
FULL_SCALE = 8
SURFACE_SCALE = 16
CHARACTER_HEIGHT_TILES = 0.8
DOOR_SIZE_TILES = 1
TOWN_BAY_BOUNDS = (43, 102, 65, 3)
TOWN_EXIT_TILE = (108, 104)
RIGHT_CAVITY_BOUNDS = (172, 106, 14, 22)
FLOOR_GIDS = {15, 16}
LEVEL_TWO_GID = 1033
BEDROCK_GIDS = {5, 25, 947, 983}

BACKGROUND = (13, 16, 22, 255)
UNPAINTED = (20, 24, 31, 255)
AIR = (43, 70, 85, 255)
BEDROCK = (54, 51, 58, 255)
LEVEL_TWO = (126, 49, 43, 255)
FLOOR = (214, 166, 83, 255)
CHARACTER = (93, 224, 164, 255)
DOOR = (74, 210, 237, 255)
TEXT = (235, 239, 243, 255)
TEXT_MUTED = (164, 175, 185, 255)
GRID_MINOR = (255, 255, 255, 18)
GRID_MAJOR = (255, 255, 255, 52)

SEMANTIC_COLORS = {
    1: AIR,
    2: (91, 61, 43, 255),
    3: (88, 91, 98, 255),
    4: (166, 94, 54, 255),
    5: BEDROCK,
    6: (72, 49, 43, 255),
    7: (62, 43, 42, 255),
    8: (145, 90, 53, 255),
    9: (105, 118, 124, 255),
    10: (101, 112, 124, 255),
    11: (178, 183, 192, 255),
    12: (214, 166, 73, 255),
    15: FLOOR,
    16: FLOOR,
    17: (74, 91, 112, 255),
    18: (89, 195, 213, 255),
    19: (130, 202, 117, 255),
    20: (157, 120, 214, 255),
    21: (232, 91, 79, 255),
    22: (222, 154, 66, 255),
    23: (76, 155, 214, 255),
    24: (232, 198, 71, 255),
    25: BEDROCK,
    28: (91, 180, 196, 255),
    29: (95, 84, 112, 255),
    30: (211, 137, 54, 255),
    31: (116, 221, 214, 255),
}
def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (Path("C:/Windows/Fonts/consola.ttf"), Path("C:/Windows/Fonts/arial.ttf")):
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()
def load_tiles() -> tuple[ET.Element, tuple[int, ...], int, int]:
    root = ET.parse(SOURCE_TMX).getroot()
    width = int(root.get("width", "0"))
    height = int(root.get("height", "0"))
    layer = next((item for item in root.findall("layer") if item.get("name") == SOURCE_LAYER), None)
    if layer is None:
        raise RuntimeError(f"Missing {SOURCE_LAYER}")
    data = layer.find("data")
    if data is None or data.get("encoding") != "base64" or data.get("compression") != "zlib":
        raise RuntimeError("Expected base64/zlib TMX data")
    packed = zlib.decompress(base64.b64decode("".join(data.itertext()).strip()))
    gids = tuple(value & 0x1FFFFFFF for value in struct.unpack(f"<{len(packed) // 4}I", packed))
    return root, gids, width, height


def tile_color(gid: int) -> tuple[int, int, int, int]:
    if gid == 0:
        return UNPAINTED
    if gid == LEVEL_TWO_GID:
        return LEVEL_TWO
    if gid in BEDROCK_GIDS:
        return BEDROCK
    if gid in SEMANTIC_COLORS:
        return SEMANTIC_COLORS[gid]
    if 33 <= gid < 1025:
        return (76, 72, 76, 255)
    return (95, 66, 54, 255)


def floor_runs(gids: tuple[int, ...], width: int) -> list[tuple[int, int, int]]:
    runs: list[tuple[int, int, int]] = []
    for row in range(len(gids) // width):
        xs = [x for x in range(width) if gids[row * width + x] in FLOOR_GIDS]
        if not xs:
            continue
        start = previous = xs[0]
        for x in xs[1:]:
            if x != previous + 1:
                runs.append((row, start, previous))
                start = x
            previous = x
        runs.append((row, start, previous))
    return runs


def label(draw: ImageDraw.ImageDraw, xy: tuple[int, int], value: str, text_font, color=TEXT) -> None:
    draw.multiline_text(xy, value, font=text_font, fill=color, spacing=3, stroke_width=2, stroke_fill=BACKGROUND)


def draw_scale_reference(
    draw: ImageDraw.ImageDraw,
    map_right: int,
    top: int,
    scale: int,
    text_font,
) -> None:
    x = map_right + 28
    tile_y = top + 64
    draw.rectangle((x, tile_y, x + scale - 1, tile_y + scale - 1), outline=DOOR, width=max(2, scale // 8))
    character_height = round(scale * CHARACTER_HEIGHT_TILES)
    character_width = max(3, round(scale * 0.34))
    character_x = x + scale + 18
    draw.rectangle(
        (character_x, tile_y + scale - character_height, character_x + character_width, tile_y + scale - 1),
        fill=CHARACTER,
    )
    label(draw, (x, top), "LOCKED ART SCALE", text_font)
    label(draw, (x, tile_y + scale + 16), "door / entry / exit = 1 tile\ncharacter = 0.8 tile", text_font, TEXT_MUTED)


def render(
    gids: tuple[int, ...],
    width: int,
    rows: int,
    scale: int,
    output: Path,
    title: str,
) -> Image.Image:
    left = 200 if scale <= 8 else 240
    top = 100
    right = 440 if scale <= 8 else 560
    bottom = 80
    map_width = (DISPLAY_RIGHT_TILE + 1) * scale
    map_height = rows * scale
    image = Image.new("RGBA", (left + map_width + right, top + map_height + bottom), BACKGROUND)
    draw = ImageDraw.Draw(image, "RGBA")

    for y in range(rows):
        source = y * width
        py = top + y * scale
        for x in range(DISPLAY_RIGHT_TILE + 1):
            px = left + x * scale
            draw.rectangle((px, py, px + scale - 1, py + scale - 1), fill=tile_color(gids[source + x]))

    minor_step = 1 if scale >= 16 else 10
    major_x = 10 if scale >= 16 else 50
    major_y = 10 if scale >= 16 else 100
    for x in range(0, DISPLAY_RIGHT_TILE + 2, minor_step):
        px = left + x * scale
        color = GRID_MAJOR if x % major_x == 0 else GRID_MINOR
        draw.line((px, top, px, top + map_height), fill=color, width=1)
    for y in range(0, rows + 1, minor_step):
        py = top + y * scale
        color = GRID_MAJOR if y % major_y == 0 else GRID_MINOR
        draw.line((left, py, left + map_width, py), fill=color, width=1)

    small = font(18 if scale <= 8 else 22)
    heading = font(30 if scale <= 8 else 34)
    label(draw, (left, 18), title, heading)
    label(draw, (left, 58), f"{SOURCE_TMX.name}  •  exact tile layer  •  1 tile = {scale} px", small, TEXT_MUTED)
    for y in range(0, rows + 1, 100 if scale <= 8 else 20):
        label(draw, (18, top + y * scale - 10), f"row {y:04d}", small, TEXT_MUTED)
    for x in range(0, DISPLAY_RIGHT_TILE + 1, 25 if scale <= 8 else 10):
        label(draw, (left + x * scale + 2, top - 28), f"x{x}", small, TEXT_MUTED)

    runs = [run for run in floor_runs(gids, width) if run[0] < rows]
    for row, start_x, end_x in runs:
        floor_y = top + row * scale
        start = left + start_x * scale
        end = left + (end_x + 1) * scale
        draw.line((start, floor_y, end, floor_y), fill=FLOOR, width=max(3, scale // 4))
        label(
            draw,
            (start + 8, floor_y - 40),
            f"TOWN GROUND • row {row} • x{start_x}..{end_x}",
            small,
            FLOOR,
        )
        figure_x = start + scale * 2
        figure_height = round(scale * CHARACTER_HEIGHT_TILES)
        figure_width = max(3, round(scale * 0.34))
        draw.rectangle(
            (figure_x, floor_y - figure_height, figure_x + figure_width, floor_y - 1),
            fill=CHARACTER,
        )

    if TOWN_EXIT_TILE[1] < rows:
        exit_x = left + TOWN_EXIT_TILE[0] * scale
        exit_y = top + TOWN_EXIT_TILE[1] * scale
        draw.rectangle(
            (exit_x, exit_y, exit_x + scale - 1, exit_y + scale - 1),
            outline=DOOR,
            width=max(2, scale // 8),
        )
        label(draw, (exit_x + scale + 6, exit_y), "EXACT 1-TILE EXIT", small, DOOR)

    bay_x, bay_y, bay_width, bay_height = TOWN_BAY_BOUNDS
    if bay_y < rows:
        draw.rectangle(
            (
                left + bay_x * scale,
                top + bay_y * scale,
                left + (bay_x + bay_width) * scale,
                top + (bay_y + bay_height) * scale,
            ),
            outline=FLOOR,
            width=max(2, scale // 8),
        )

    cavity_x, cavity_y, cavity_width, cavity_height = RIGHT_CAVITY_BOUNDS
    if cavity_y < rows:
        cavity_box = (
            left + cavity_x * scale,
            top + cavity_y * scale,
            left + (cavity_x + cavity_width) * scale,
            top + (cavity_y + cavity_height) * scale,
        )
        draw.rectangle(cavity_box, outline=(170, 133, 214, 255), width=max(2, scale // 8))
        label(draw, (cavity_box[0] + 6, cavity_box[1] + 6), "RIGHT CAVITY 14×22", small, (196, 167, 228, 255))

    marker_cells = [index for index, gid in enumerate(gids) if gid == LEVEL_TWO_GID]
    marker_bounds = (
        min(index % width for index in marker_cells),
        min(index // width for index in marker_cells),
        max(index % width for index in marker_cells),
        max(index // width for index in marker_cells),
    )
    label(
        draw,
        (left + map_width + 28, top + 330),
        f"LEVEL 2 EDITED FOOTPRINT\nx{marker_bounds[0]}..{marker_bounds[2]}\ny{marker_bounds[1]}..{marker_bounds[3]}\n{len(marker_cells):,} tiles",
        small,
        (239, 139, 124, 255),
    )
    draw_scale_reference(draw, left + map_width, top, scale, small)
    image.convert("RGB").save(output, optimize=True)
    return image


def main() -> None:
    Image.MAX_IMAGE_PIXELS = None
    root, gids, width, height = load_tiles()
    full = render(gids, width, height, FULL_SCALE, FULL_OUTPUT, "V11 SCALE-CORRECT FULL DEPTH")
    surface = render(gids, width, min(SURFACE_END_ROW, height), SURFACE_SCALE, SURFACE_OUTPUT, "V11 SURFACE + TOWN SCALE CHECK")
    surface_left = 240
    surface_top = 100
    control_bounds = (
        surface_left + 30 * SURFACE_SCALE,
        surface_top + 85 * SURFACE_SCALE,
        surface_left + 211 * SURFACE_SCALE,
        surface_top + 145 * SURFACE_SCALE,
    )
    surface.crop(control_bounds).save(ART_CONTROL_OUTPUT, optimize=True)
    preview_width = 1280
    preview_height = round(full.height * preview_width / full.width)
    full.resize((preview_width, preview_height), Image.Resampling.NEAREST).save(PREVIEW_OUTPUT, optimize=True)
    print(f"Built {FULL_OUTPUT}")
    print(f"Built {SURFACE_OUTPUT}")
    print(f"Built {PREVIEW_OUTPUT}")
    print(f"Built {ART_CONTROL_OUTPUT}")
    print(f"Floor runs: {floor_runs(gids, width)}")
    print(f"Map: {width}x{height}; ignored object background layers: {len(root.findall('objectgroup'))}")
    print(f"Top GIDs: {collections.Counter(gids).most_common(8)}")


if __name__ == "__main__":
    main()
