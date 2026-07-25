"""Render neutral approval art through exact v11 TMX positions without wiring it."""

from __future__ import annotations

import base64
import importlib.util
import math
import struct
import sys
import xml.etree.ElementTree as ET
import zlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
TMX = ROOT / "exports/dig-game-world-edit-v-11-08-07-2026-;1-img-test-saved-before-runtime-wire.tmx"
ASSET_DIR = ROOT / "sprites/backgrounds/world-v11-scale-correct-0-20m-v3"
TOWN_DIR = ASSET_DIR / "previews/time-neutral-town"
GROUND_DIR = ASSET_DIR / "previews/time-neutral-ground"
OUTPUT_DIR = ROOT / "visual-approval-previews"
OUTPUT = OUTPUT_DIR / "v11-neutral-skyline-exact-tmx-preview-2026-07-12.png"
ANNOTATED = OUTPUT_DIR / "v11-neutral-skyline-exact-tmx-annotated-2026-07-12.png"
CLOSEUP = OUTPUT_DIR / "v11-neutral-skyline-town-closeup-2026-07-12.png"
CLOSEUP_ANNOTATED = OUTPUT_DIR / "v11-neutral-skyline-town-closeup-annotated-2026-07-12.png"
COMPOSITOR_PATH = ROOT / "ai-tools/2026-07-11-v11-0-20m-compositor.py"

GROUP = "V11_SCALE_CORRECT_SKY_GROUND_0_20M_V3"
TILE = 94
VIEW_TILES = (40, 40, 320, 116)
SCALE = 0.12
GROUND_ROW = 105
BEDROCK_GIDS = {5, 25, 947, 983}
FLOOR_GIDS = {15, 16}
AIR_GIDS = {0, 1}


def load_compositor():
    spec = importlib.util.spec_from_file_location("v11_compositor", COMPOSITOR_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load v11 compositor")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def font(size: int):
    for path in (Path("C:/Windows/Fonts/consola.ttf"), Path("C:/Windows/Fonts/arial.ttf")):
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def load_tilesets(root: ET.Element) -> list[tuple[int, dict[int, Path]]]:
    result = []
    for entry in root.findall("tileset"):
        source = entry.get("source")
        if not source:
            continue
        tsx_path = (TMX.parent / source).resolve()
        tsx = ET.parse(tsx_path).getroot()
        images = {}
        for tile in tsx.findall("tile"):
            image = tile.find("image")
            if image is not None and image.get("source"):
                images[int(tile.get("id", "0"))] = (tsx_path.parent / image.get("source", "")).resolve()
        if images:
            result.append((int(entry.get("firstgid", "0")), images))
    return sorted(result, reverse=True)


def image_for_gid(gid: int, tilesets: list[tuple[int, dict[int, Path]]]) -> Path | None:
    gid &= 0x1FFFFFFF
    for first_gid, images in tilesets:
        if gid >= first_gid:
            return images.get(gid - first_gid)
    return None


def build_preview_strips():
    compositor = load_compositor()
    town_widths = [13] * 5
    ground_widths = [13] * 3 + [12] * 7
    town = compositor.feather_top(compositor.compose_strip(
        [TOWN_DIR / f"town-ground-{index:02d}-preview.png" for index in range(1, 6)],
        town_widths, 3, 1101, False, True, True,
    ))
    ground = bottom_aligned_strip(
        compositor,
        [GROUND_DIR / f"level1-ground-{index:02d}.png" for index in range(1, 11)],
        ground_widths,
    )
    ground = unify_ground_sky(ground)
    ground = compositor.fade_overlap(ground, "right")
    return town, ground, town_widths, ground_widths


def bottom_cover(image: Image.Image, size: tuple[int, int], x_bias: float) -> Image.Image:
    target_w, target_h = size
    scale = max(target_w / image.width, target_h / image.height)
    resized = image.convert("RGB").resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = round((resized.width - target_w) * max(0.0, min(1.0, x_bias)))
    top = resized.height - target_h
    return resized.crop((left, top, left + target_w, top + target_h))


def bottom_aligned_strip(compositor, paths: list[Path], widths: list[int]) -> Image.Image:
    height = 11 * TILE
    overlap = 2 * TILE
    canvas = Image.new("RGB", (sum(widths) * TILE, height), (145, 162, 175))
    cursor = 0
    for index, (path, width_tiles) in enumerate(zip(paths, widths)):
        left_extra = overlap if index > 0 else 0
        right_extra = overlap if index < len(widths) - 1 else 0
        piece_size = (width_tiles * TILE + left_extra + right_extra, height)
        with Image.open(path) as source:
            piece = bottom_cover(source, piece_size, 0.3 + 0.2 * (index % 3))
        piece = match_upper_sky(piece, (181, 193, 202))
        mask = compositor.feather_mask(piece.size, left_extra > 0, right_extra > 0, overlap)
        canvas.paste(piece, (cursor - left_extra, 0), mask)
        cursor += width_tiles * TILE
    return compositor.sharpen(canvas)


def match_upper_sky(image: Image.Image, target: tuple[int, int, int]) -> Image.Image:
    sample = image.crop((0, 0, image.width, max(1, round(image.height * 0.28)))).resize((32, 16), Image.Resampling.BOX)
    sample_pixels = sample.load()
    pixels = [sample_pixels[x, y] for y in range(sample.height) for x in range(sample.width) if sum(sample_pixels[x, y]) / 3 > 45]
    if not pixels:
        return image
    mean = tuple(sum(pixel[channel] for pixel in pixels) / len(pixels) for channel in range(3))
    channels = image.split()
    shifted = Image.merge("RGB", tuple(
        channel.point(lambda value, delta=target[index] - mean[index]: max(0, min(255, round(value + delta))))
        for index, channel in enumerate(channels)
    ))
    mask = Image.new("L", image.size)
    draw = ImageDraw.Draw(mask)
    fade_end = round(image.height * 0.78)
    for y in range(fade_end):
        alpha = round(255 * (1 - y / max(1, fade_end - 1)))
        draw.line((0, y, image.width, y), fill=alpha)
    return Image.composite(shifted, image, mask)


def unify_ground_sky(image: Image.Image) -> Image.Image:
    overlay = Image.new("RGB", image.size)
    overlay_draw = ImageDraw.Draw(overlay)
    for y in range(image.height):
        ratio = min(1, y / max(1, 5 * TILE))
        color = tuple(round(a + (b - a) * ratio) for a, b in zip((132, 151, 165), (174, 185, 193)))
        overlay_draw.line((0, y, image.width, y), fill=color)
    mask = Image.new("L", image.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    solid_end = 3 * TILE
    fade_end = 7 * TILE
    mask_draw.rectangle((0, 0, image.width, solid_end), fill=255)
    for y in range(solid_end, fade_end):
        alpha = round(255 * (fade_end - y) / max(1, fade_end - solid_end))
        mask_draw.line((0, y, image.width, y), fill=alpha)
    return Image.composite(overlay, image, mask)


def strip_chunk(strip: Image.Image, widths: list[int], index: int) -> Image.Image:
    left = sum(widths[:index]) * TILE
    width = widths[index] * TILE
    return strip.crop((left, 0, left + width, strip.height))


def neutral_sky(size: tuple[int, int], object_x: float, object_top: float) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size)
    draw = ImageDraw.Draw(image, "RGBA")
    for y in range(height):
        world_ratio = max(0, min(1, (object_top + y) / (94 * TILE)))
        top = (188, 202, 214)
        bottom = (132, 151, 165)
        color = tuple(round(a + (b - a) * world_ratio) for a, b in zip(top, bottom))
        draw.line((0, y, width, y), fill=color)

    ridge_base = 94 * TILE - object_top
    if 0 <= ridge_base <= height:
        step = 2 * TILE
        first = int(object_x // step) - 1
        last = int((object_x + width) // step) + 2
        far = []
        near = []
        for index in range(first, last):
            world_x = index * step
            local_x = world_x - object_x
            far_peak = (7.5 + 2.2 * abs(math.sin(index * 1.37))) * TILE
            near_peak = (3.5 + 2.4 * abs(math.sin(index * 0.91 + 0.8))) * TILE
            far.append((local_x, ridge_base - far_peak))
            near.append((local_x, ridge_base - near_peak))
        draw.polygon([(far[0][0], ridge_base), *far, (far[-1][0], ridge_base)], fill=(116, 135, 148, 125))
        draw.polygon([(near[0][0], ridge_base), *near, (near[-1][0], ridge_base)], fill=(78, 99, 111, 165))
    return image.filter(ImageFilter.GaussianBlur(radius=round(TILE * 0.35)))


def replacement(path: Path, obj: ET.Element, town, ground, town_widths, ground_widths) -> Image.Image:
    name = path.name
    if name.startswith("sky-r"):
        return neutral_sky(
            (int(float(obj.get("width", "0"))), int(float(obj.get("height", "0")))),
            float(obj.get("x", "0")),
            float(obj.get("y", "0")) - float(obj.get("height", "0")),
        )
    if name.startswith("town-ground-"):
        return strip_chunk(town, town_widths, int(name[-7:-5]) - 1)
    if name.startswith("level1-ground-"):
        return strip_chunk(ground, ground_widths, int(name[-7:-5]) - 1)
    with Image.open(path) as source:
        return source.convert("RGBA")


def load_tile_layer(root: ET.Element):
    layer = next(item for item in root.findall("layer") if item.get("name") == "00_PAINT_HERE_tile_types")
    data = layer.find("data")
    packed = zlib.decompress(base64.b64decode("".join(data.itertext()).strip()))
    gids = tuple(value & 0x1FFFFFFF for value in struct.unpack(f"<{len(packed) // 4}I", packed))
    return gids, int(root.get("width", "0"))


def render() -> None:
    Image.MAX_IMAGE_PIXELS = None
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    root = ET.parse(TMX).getroot()
    tilesets = load_tilesets(root)
    town, ground, town_widths, ground_widths = build_preview_strips()
    left, top, right, bottom = (value * TILE for value in VIEW_TILES)
    canvas = Image.new("RGBA", (round((right - left) * SCALE), round((bottom - top) * SCALE)), (175, 190, 202, 255))

    group = next(item for item in root.findall("objectgroup") if item.get("name") == GROUP)
    for obj in group.findall("object"):
        path = image_for_gid(int(obj.get("gid", "0")), tilesets)
        if path is None:
            continue
        source = replacement(path, obj, town, ground, town_widths, ground_widths).convert("RGBA")
        width = float(obj.get("width", source.width))
        height = float(obj.get("height", source.height))
        object_left = float(obj.get("x", "0"))
        object_top = float(obj.get("y", "0")) - height
        clip = (max(left, object_left), max(top, object_top), min(right, object_left + width), min(bottom, object_top + height))
        if clip[2] <= clip[0] or clip[3] <= clip[1]:
            continue
        source_box = (
            round((clip[0] - object_left) / width * source.width),
            round((clip[1] - object_top) / height * source.height),
            round((clip[2] - object_left) / width * source.width),
            round((clip[3] - object_top) / height * source.height),
        )
        piece = source.crop(source_box).resize(
            (max(1, round((clip[2] - clip[0]) * SCALE)), max(1, round((clip[3] - clip[1]) * SCALE))),
            Image.Resampling.LANCZOS,
        )
        destination = (round((clip[0] - left) * SCALE), round((clip[1] - top) * SCALE))
        extend_right = destination[0] + piece.width < canvas.width
        extend_bottom = destination[1] + piece.height < canvas.height
        if extend_right or extend_bottom:
            extended = Image.new("RGBA", (piece.width + int(extend_right), piece.height + int(extend_bottom)))
            extended.paste(piece, (0, 0))
            if extend_right:
                extended.paste(piece.crop((piece.width - 1, 0, piece.width, piece.height)), (piece.width, 0))
            if extend_bottom:
                bottom_edge = extended.crop((0, piece.height - 1, extended.width, piece.height))
                extended.paste(bottom_edge, (0, piece.height))
            piece = extended
        canvas.alpha_composite(piece, destination)

    canvas.convert("RGB").save(OUTPUT, optimize=True)
    annotated = canvas.copy()
    draw = ImageDraw.Draw(annotated, "RGBA")
    gids, map_width = load_tile_layer(root)
    tile_px = TILE * SCALE
    for ty in range(VIEW_TILES[1], VIEW_TILES[3]):
        for tx in range(VIEW_TILES[0], VIEW_TILES[2]):
            gid = gids[ty * map_width + tx]
            if gid in AIR_GIDS:
                continue
            x0 = round((tx - VIEW_TILES[0]) * tile_px)
            y0 = round((ty - VIEW_TILES[1]) * tile_px)
            x1 = round((tx + 1 - VIEW_TILES[0]) * tile_px)
            y1 = round((ty + 1 - VIEW_TILES[1]) * tile_px)
            if gid in BEDROCK_GIDS:
                fill = (43, 43, 48, 235)
            elif gid in FLOOR_GIDS:
                fill = (151, 111, 65, 220)
            elif ty >= GROUND_ROW:
                fill = (77, 56, 43, 220)
            else:
                continue
            draw.rectangle((x0, y0, x1, y1), fill=fill, outline=(18, 18, 22, 180), width=1)

    ground_y = round((GROUND_ROW - VIEW_TILES[1]) * tile_px)
    player_x = round((44 - VIEW_TILES[0]) * tile_px)
    player_h = round(0.8 * tile_px)
    draw.rectangle((player_x, ground_y - player_h, player_x + round(tile_px * 0.34), ground_y), fill=(90, 229, 190, 255))
    draw.line((0, ground_y, annotated.width, ground_y), fill=(255, 201, 91, 210), width=2)
    label_font = font(20)
    draw.text((12, 12), "EXACT TMX GEOMETRY  •  runtime crop x40..319  •  ground row 105", font=label_font, fill=(20, 26, 33, 255), stroke_width=3, stroke_fill=(235, 241, 245, 220))
    draw.text((player_x + 12, ground_y - player_h - 28), "0.8 tile player", font=label_font, fill=(90, 229, 190, 255), stroke_width=2, stroke_fill=(20, 26, 33, 230))
    annotated.convert("RGB").save(ANNOTATED, optimize=True)
    close_box = (
        round((40 - VIEW_TILES[0]) * tile_px),
        round((78 - VIEW_TILES[1]) * tile_px),
        round((160 - VIEW_TILES[0]) * tile_px),
        round((110 - VIEW_TILES[1]) * tile_px),
    )
    clean_close = canvas.crop(close_box)
    marked_close = annotated.crop(close_box)
    close_size = (clean_close.width * 3, clean_close.height * 3)
    clean_close.resize(close_size, Image.Resampling.LANCZOS).convert("RGB").save(CLOSEUP, optimize=True)
    marked_close.resize(close_size, Image.Resampling.NEAREST).convert("RGB").save(CLOSEUP_ANNOTATED, optimize=True)
    print(OUTPUT)
    print(ANNOTATED)
    print(CLOSEUP)
    print(CLOSEUP_ANNOTATED)


if __name__ == "__main__":
    render()
