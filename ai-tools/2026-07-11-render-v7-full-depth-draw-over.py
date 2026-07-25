from __future__ import annotations

import base64
import struct
import xml.etree.ElementTree as ET
import zlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_TMX = ROOT / "exports" / "dig-game-world-edit-v-7-30-06-2026-;layered.tmx"
OUTPUT_PNG = ROOT / "exports" / "dig-game-world-v7-full-depth-draw-over.png"
PREVIEW_PNG = ROOT / "exports" / "dig-game-world-v7-full-depth-draw-over-preview.png"
SURFACE_PNG = ROOT / "exports" / "dig-game-world-v7-surface-town-draw-over.png"

SOURCE_LAYER = "00_PAINT_HERE_tile_types"
MAP_WIDTH_TILES = 800
MAP_HEIGHT_TILES = 2120
AUTHORED_RIGHT_TILE = 319
PIXELS_PER_TILE = 8
LEFT_MARGIN = 220
TOP_MARGIN = 96
RIGHT_MARGIN = 360
BOTTOM_MARGIN = 80
GROUND_ROW = 65
SECOND_LEVEL_BOUNDS = (172, 21, 148, 133)
SECOND_LEVEL_RUNTIME_BOUNDS = (132, 0, 148, 133)
TOWN_OUTER_BOUNDS = (245, 2, 35, 22)
TOWN_INTERIOR_BOUNDS = (246, 3, 33, 20)
TOWN_ENTRANCE = (245, 20, 1, 2)
TOWN_FLOOR_Y = 22
PLAYER_TILE = (4, 64)
NPC_TILES = ((33, 64), (43, 64), (50, 64), (53, 64), (63, 64))

BACKGROUND = (13, 16, 22, 255)
UNPAINTED = (20, 24, 31, 255)
EXPLICIT_AIR = (45, 78, 96, 255)
BEDROCK = (54, 51, 58, 255)
SECOND_LEVEL_MARKER = (130, 48, 42, 255)
TOWN_FLOOR = (207, 162, 92, 255)
GRID_MINOR = (255, 255, 255, 18)
GRID_MAJOR = (255, 255, 255, 54)
TEXT = (235, 239, 243, 255)
TEXT_MUTED = (164, 175, 185, 255)
GROUND = (255, 207, 80, 255)
CHARACTER = (96, 226, 164, 255)

SEMANTIC_COLORS = {
    2: (90, 61, 43, 255),
    3: (89, 91, 98, 255),
    4: (166, 94, 54, 255),
    5: BEDROCK,
    6: (72, 49, 43, 255),
    7: (62, 43, 42, 255),
    8: (145, 90, 53, 255),
    9: (105, 118, 124, 255),
    10: (101, 112, 124, 255),
    11: (178, 183, 192, 255),
    12: (214, 166, 73, 255),
    15: TOWN_FLOOR,
    16: TOWN_FLOOR,
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


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        Path("C:/Windows/Fonts/consola.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
    )
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def decode_layer(root: ET.Element) -> tuple[int, ...]:
    layer = root.find(f"layer[@name='{SOURCE_LAYER}']")
    if layer is None:
        raise RuntimeError(f"Missing layer: {SOURCE_LAYER}")
    data = layer.find("data")
    if data is None or data.get("encoding") != "base64" or data.get("compression") != "zlib":
        raise RuntimeError("Expected base64/zlib TMX tile data")
    packed = zlib.decompress(base64.b64decode("".join(data.itertext()).strip()))
    return struct.unpack(f"<{len(packed) // 4}I", packed)


def color_for_gid(gid: int) -> tuple[int, int, int, int]:
    gid &= 0x1FFFFFFF
    if gid == 0:
        return UNPAINTED
    if gid == 1:
        return EXPLICIT_AIR
    if gid == 3094:
        return SECOND_LEVEL_MARKER
    if gid in (1095, 1059):
        return BEDROCK
    if gid in SEMANTIC_COLORS:
        return SEMANTIC_COLORS[gid]
    if gid >= 3086:
        return (100, 70, 58, 255)
    return (76, 72, 76, 255)


def draw_label(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, font, fill=TEXT) -> None:
    draw.text(xy, text, font=font, fill=fill, stroke_width=2, stroke_fill=BACKGROUND)


def render() -> tuple[tuple[int, int, int, int], int]:
    root = ET.parse(SOURCE_TMX).getroot()
    gids = decode_layer(root)
    authored_width = AUTHORED_RIGHT_TILE + 1
    map_pixel_width = authored_width * PIXELS_PER_TILE
    map_pixel_height = MAP_HEIGHT_TILES * PIXELS_PER_TILE
    image = Image.new(
        "RGBA",
        (
            LEFT_MARGIN + map_pixel_width + RIGHT_MARGIN,
            TOP_MARGIN + map_pixel_height + BOTTOM_MARGIN,
        ),
        BACKGROUND,
    )
    draw = ImageDraw.Draw(image, "RGBA")

    min_x = MAP_WIDTH_TILES
    max_x = -1
    min_y = MAP_HEIGHT_TILES
    max_y = -1
    occupied = 0

    for tile_y in range(MAP_HEIGHT_TILES):
        source_row = tile_y * MAP_WIDTH_TILES
        dest_y = TOP_MARGIN + tile_y * PIXELS_PER_TILE
        for tile_x in range(authored_width):
            gid = gids[source_row + tile_x] & 0x1FFFFFFF
            if gid:
                occupied += 1
                min_x = min(min_x, tile_x)
                max_x = max(max_x, tile_x)
                min_y = min(min_y, tile_y)
                max_y = max(max_y, tile_y)
            dest_x = LEFT_MARGIN + tile_x * PIXELS_PER_TILE
            draw.rectangle(
                (dest_x, dest_y, dest_x + PIXELS_PER_TILE - 1, dest_y + PIXELS_PER_TILE - 1),
                fill=color_for_gid(gid),
            )

    for tile_x in range(0, authored_width + 1, 10):
        x = LEFT_MARGIN + tile_x * PIXELS_PER_TILE
        color = GRID_MAJOR if tile_x % 50 == 0 else GRID_MINOR
        draw.line((x, TOP_MARGIN, x, TOP_MARGIN + map_pixel_height), fill=color, width=1)
    for tile_y in range(0, MAP_HEIGHT_TILES + 1, 10):
        y = TOP_MARGIN + tile_y * PIXELS_PER_TILE
        color = GRID_MAJOR if tile_y % 100 == 0 else GRID_MINOR
        draw.line((LEFT_MARGIN, y, LEFT_MARGIN + map_pixel_width, y), fill=color, width=1)

    small_font = load_font(18)
    label_font = load_font(24)
    title_font = load_font(30)
    draw_label(draw, (LEFT_MARGIN, 22), "TMX v7 FULL-DEPTH DRAW-OVER — 1 tile = 8 px", title_font)
    draw_label(draw, (LEFT_MARGIN, 58), "Authored crop x 0..319 • complete depth y 0..2119 • ground row 65", label_font, TEXT_MUTED)

    for tile_y in range(0, MAP_HEIGHT_TILES + 1, 100):
        y = TOP_MARGIN + tile_y * PIXELS_PER_TILE
        draw_label(draw, (18, y - 10), f"row {tile_y:04d}", small_font, TEXT_MUTED)
    for tile_x in range(0, authored_width + 1, 25):
        x = LEFT_MARGIN + tile_x * PIXELS_PER_TILE
        draw_label(draw, (x + 2, TOP_MARGIN - 28), f"x{tile_x}", small_font, TEXT_MUTED)

    ground_y = TOP_MARGIN + GROUND_ROW * PIXELS_PER_TILE
    draw.line((LEFT_MARGIN, ground_y, LEFT_MARGIN + map_pixel_width, ground_y), fill=GROUND, width=3)
    draw_label(draw, (LEFT_MARGIN + map_pixel_width + 18, ground_y - 14), "GROUND / NPC LEVEL — row 65", label_font, GROUND)

    second_x, second_y, second_w, second_h = SECOND_LEVEL_BOUNDS
    second_box = (
        LEFT_MARGIN + second_x * PIXELS_PER_TILE,
        TOP_MARGIN + second_y * PIXELS_PER_TILE,
        LEFT_MARGIN + (second_x + second_w) * PIXELS_PER_TILE,
        TOP_MARGIN + (second_y + second_h) * PIXELS_PER_TILE,
    )
    draw.rectangle(second_box, outline=(255, 92, 75, 255), width=4)
    draw_label(
        draw,
        (second_box[0] + 8, second_box[1] + 8),
        "LEVEL 2 AUTHORED FOOTPRINT\nx172..319  y21..153",
        label_font,
        (255, 139, 122, 255),
    )

    runtime_x, runtime_y, runtime_w, runtime_h = SECOND_LEVEL_RUNTIME_BOUNDS
    runtime_box = (
        LEFT_MARGIN + runtime_x * PIXELS_PER_TILE,
        TOP_MARGIN + runtime_y * PIXELS_PER_TILE,
        LEFT_MARGIN + (runtime_x + runtime_w) * PIXELS_PER_TILE,
        TOP_MARGIN + (runtime_y + runtime_h) * PIXELS_PER_TILE,
    )
    for dash_y in range(runtime_box[1], runtime_box[3], 24):
        draw.line((runtime_box[0], dash_y, runtime_box[0], min(dash_y + 14, runtime_box[3])), fill=(82, 219, 242, 255), width=3)
        draw.line((runtime_box[2], dash_y, runtime_box[2], min(dash_y + 14, runtime_box[3])), fill=(82, 219, 242, 255), width=3)
    for dash_x in range(runtime_box[0], runtime_box[2], 24):
        draw.line((dash_x, runtime_box[1], min(dash_x + 14, runtime_box[2]), runtime_box[1]), fill=(82, 219, 242, 255), width=3)
        draw.line((dash_x, runtime_box[3], min(dash_x + 14, runtime_box[2]), runtime_box[3]), fill=(82, 219, 242, 255), width=3)
    draw_label(
        draw,
        (runtime_box[0] + 8, runtime_box[3] - 34),
        "RUNTIME LEVEL 2 TARGET  x132..279  y0..132",
        small_font,
        (111, 226, 244, 255),
    )

    town_x, town_y, town_w, town_h = TOWN_OUTER_BOUNDS
    town_box = (
        LEFT_MARGIN + town_x * PIXELS_PER_TILE,
        TOP_MARGIN + town_y * PIXELS_PER_TILE,
        LEFT_MARGIN + (town_x + town_w) * PIXELS_PER_TILE,
        TOP_MARGIN + (town_y + town_h) * PIXELS_PER_TILE,
    )
    interior_x, interior_y, interior_w, interior_h = TOWN_INTERIOR_BOUNDS
    interior_box = (
        LEFT_MARGIN + interior_x * PIXELS_PER_TILE,
        TOP_MARGIN + interior_y * PIXELS_PER_TILE,
        LEFT_MARGIN + (interior_x + interior_w) * PIXELS_PER_TILE,
        TOP_MARGIN + (interior_y + interior_h) * PIXELS_PER_TILE,
    )
    draw.rectangle(town_box, fill=(36, 39, 46, 245), outline=(205, 211, 220, 255), width=4)
    draw.rectangle(interior_box, fill=(45, 78, 96, 245))
    floor_y = TOP_MARGIN + TOWN_FLOOR_Y * PIXELS_PER_TILE
    draw.rectangle(
        (interior_box[0], floor_y, interior_box[2], floor_y + PIXELS_PER_TILE - 1),
        fill=TOWN_FLOOR,
    )
    entrance_x, entrance_y, entrance_w, entrance_h = TOWN_ENTRANCE
    entrance_box = (
        LEFT_MARGIN + entrance_x * PIXELS_PER_TILE,
        TOP_MARGIN + entrance_y * PIXELS_PER_TILE,
        LEFT_MARGIN + (entrance_x + entrance_w) * PIXELS_PER_TILE,
        TOP_MARGIN + (entrance_y + entrance_h) * PIXELS_PER_TILE,
    )
    draw.rectangle(entrance_box, fill=(82, 219, 242, 255), outline=(238, 249, 252, 255), width=1)
    draw_label(draw, (town_box[0] + 10, town_box[1] + 10), "RUNTIME TOWN 35 × 22 TILES", label_font)
    draw_label(draw, (town_box[0] + 10, town_box[1] + 42), "interior 33 × 20 • entrance 1 × 2", small_font, TEXT_MUTED)
    draw_label(draw, (entrance_box[0] - 146, entrance_box[1] - 4), "1×2 ENTRY →", small_font, (111, 226, 244, 255))

    for index, (tile_x, tile_y) in enumerate((PLAYER_TILE, *NPC_TILES)):
        x0 = LEFT_MARGIN + tile_x * PIXELS_PER_TILE
        y0 = TOP_MARGIN + tile_y * PIXELS_PER_TILE
        draw.rectangle((x0 + 1, y0 + 1, x0 + PIXELS_PER_TILE - 2, y0 + PIXELS_PER_TILE - 1), fill=CHARACTER)
        if index == 0:
            draw_label(draw, (x0 - 4, y0 - 30), "PLAYER", small_font, CHARACTER)
    draw_label(
        draw,
        (LEFT_MARGIN + map_pixel_width + 18, ground_y + 30),
        "Scale reference:\ncharacter ≈ 0.8–1 tile tall\nbackground doors ≈ 2 tiles tall",
        label_font,
        CHARACTER,
    )

    legend_x = LEFT_MARGIN + map_pixel_width + 18
    legend_y = TOP_MARGIN + 980
    legend = (
        (UNPAINTED, "unpainted / outside"),
        (EXPLICIT_AIR, "authored air / corridor"),
        (BEDROCK, "bedrock / hard boundary"),
        (TOWN_FLOOR, "town floor tiles"),
        (SECOND_LEVEL_MARKER, "Level 2 marker area"),
        ((82, 219, 242, 255), "runtime target / entrance"),
    )
    draw_label(draw, (legend_x, legend_y - 42), "MAP KEY", label_font)
    for index, (color, name) in enumerate(legend):
        y = legend_y + index * 38
        draw.rectangle((legend_x, y, legend_x + 24, y + 24), fill=color, outline=TEXT_MUTED)
        draw_label(draw, (legend_x + 34, y - 2), name, small_font, TEXT_MUTED)

    image.convert("RGB").save(OUTPUT_PNG, optimize=True)
    surface_bottom = TOP_MARGIN + 180 * PIXELS_PER_TILE
    image.convert("RGB").crop((0, 0, image.width, surface_bottom)).save(SURFACE_PNG, optimize=True)
    preview_width = 1280
    preview_height = round(image.height * preview_width / image.width)
    image.convert("RGB").resize((preview_width, preview_height), Image.Resampling.NEAREST).save(PREVIEW_PNG, optimize=True)
    return (min_x, min_y, max_x, max_y), occupied


def main() -> None:
    Image.MAX_IMAGE_PIXELS = None
    bounds, occupied = render()
    print(f"Built {OUTPUT_PNG}")
    print(f"Built {PREVIEW_PNG}")
    print(f"Built {SURFACE_PNG}")
    print(f"Authored non-empty bounds: x={bounds[0]}..{bounds[2]}, y={bounds[1]}..{bounds[3]}")
    print(f"Occupied authored cells in crop: {occupied}")


if __name__ == "__main__":
    main()
