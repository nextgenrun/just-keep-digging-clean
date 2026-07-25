from __future__ import annotations

import math
import random
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


TILE_PX = 94
CHARACTER_TILES = 0.8
CHARACTER_METERS = 1.70
METERS_PER_TILE = CHARACTER_METERS / CHARACTER_TILES
MAX_DEPTH_METERS = 20.0
MAX_DEPTH_TILES = MAX_DEPTH_METERS / METERS_PER_TILE
GROUND_ROW = 105
MAX_Y_TILE = GROUND_ROW + MAX_DEPTH_TILES
FENCE_HEIGHT_TILES = 0.30
DOOR_TILES = 1.0
@dataclass(frozen=True)
class ChunkSpec:
    name: str
    path: Path
    x_tile: float
    y_tile: float
    width_tiles: float
    height_tiles: float
    width_px: int
    height_px: int


def cover(image: Image.Image, size: tuple[int, int], x_bias: float = 0.5) -> Image.Image:
    target_w, target_h = size
    scale = max(target_w / image.width, target_h / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    left = round((resized.width - target_w) * max(0.0, min(1.0, x_bias)))
    top = (resized.height - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h)).convert("RGB")


def populated_lower_panorama(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Remove generated letterboxing, then select the facade-rich lower band."""
    rgb = image.convert("RGB")
    row_luma = rgb.convert("L").resize((1, rgb.height), Image.Resampling.BOX)
    active = row_luma.point(lambda value: 255 if value > 7 else 0).getbbox()
    if active:
        rgb = rgb.crop((0, max(0, active[1] - 2), rgb.width, min(rgb.height, active[3] + 2)))
    target_w, target_h = size
    crop_h = min(rgb.height, max(1, round(rgb.width * target_h / target_w)))
    if crop_h < rgb.height:
        edge_rows = list(
            rgb.convert("L").filter(ImageFilter.FIND_EDGES).resize((1, rgb.height), Image.Resampling.BOX).getdata()
        )
        travel = rgb.height - crop_h
        scores = [sum(edge_rows[top : top + crop_h]) * (1.0 + 0.12 * top / max(1, travel)) for top in range(travel + 1)]
        top = max(range(travel + 1), key=scores.__getitem__)
        top = max(0, top - round(crop_h * 0.22))
        rgb = rgb.crop((0, top, rgb.width, top + crop_h))
    return rgb.resize(size, Image.Resampling.LANCZOS)


def sharpen(image: Image.Image) -> Image.Image:
    image = ImageEnhance.Contrast(image).enhance(1.06)
    image = ImageEnhance.Sharpness(image).enhance(1.18)
    return image.filter(ImageFilter.UnsharpMask(radius=1.0, percent=78, threshold=3))


def feather_mask(size: tuple[int, int], left: bool, right: bool, feather: int) -> Image.Image:
    width, height = size
    mask = Image.new("L", size, 255)
    pixels = mask.load()
    for x in range(width):
        alpha = 255
        if left and x < feather:
            alpha = min(alpha, round(255 * x / max(1, feather - 1)))
        if right and x >= width - feather:
            alpha = min(alpha, round(255 * (width - 1 - x) / max(1, feather - 1)))
        if alpha < 255:
            for y in range(height):
                pixels[x, y] = alpha
    return mask


def surface_piece(image: Image.Image, size: tuple[int, int], industrial: bool, x_bias: float) -> Image.Image:
    target_w, target_h = size
    top_color = (10, 19, 36)
    bottom_color = (43, 22, 25) if industrial else (18, 31, 45)
    canvas = Image.new("RGB", size)
    draw = ImageDraw.Draw(canvas)
    for y in range(target_h):
        mix = y / max(1, target_h - 1)
        draw.line((0, y, target_w, y), fill=tuple(round(a + (b - a) * mix) for a, b in zip(top_color, bottom_color)))
    if industrial:
        detail = cover(image.convert("RGB"), (target_w, 4 * TILE_PX), x_bias)
    else:
        rgb = image.convert("RGB")
        probe = rgb.convert("L").resize((256, 512), Image.Resampling.BOX)
        pixels = list(probe.getdata())
        scores = [sum(abs(pixels[y * 256 + x] - pixels[(y - 1) * 256 + x]) for x in range(256)) for y in range(1, 512)]
        low, high = round(512 * 0.18), round(512 * 0.78)
        floor_row = low + max(range(high - low), key=lambda index: scores[low + index - 1])
        crop = rgb.crop((0, 0, rgb.width, max(1, round(rgb.height * floor_row / 512))))
        scale = target_w / crop.width
        detail = crop.resize((target_w, max(1, round(crop.height * scale))), Image.Resampling.LANCZOS)
        if detail.height > target_h:
            detail = detail.crop((0, detail.height - target_h, target_w, detail.height))
    detail = detail.convert("RGBA")
    alpha = Image.new("L", detail.size, 255)
    feather = min(detail.height, round(TILE_PX * 0.75))
    for y in range(feather):
        alpha.paste(round(255 * y / max(1, feather - 1)), (0, y, detail.width, y + 1))
    detail.putalpha(alpha)
    canvas.paste(detail, (0, target_h - detail.height), detail)
    return canvas


def compose_strip(source_paths: list[Path], widths: list[int], height_tiles: float, seed: int,
                  industrial: bool, ground_strip: bool, town_panorama: bool = False,
                  surface: bool = False) -> Image.Image:
    width_px = sum(widths) * TILE_PX
    height_px = round(height_tiles * TILE_PX)
    canvas = Image.new("RGB", (width_px, height_px), (12, 14, 18))
    overlap = TILE_PX
    cursor = 0

    for index, (source_path, width_tiles) in enumerate(zip(source_paths, widths)):
        segment_w = width_tiles * TILE_PX
        left_extra = overlap if index > 0 else 0
        right_extra = overlap if index < len(widths) - 1 else 0
        with Image.open(source_path) as source:
            piece_size = (segment_w + left_extra + right_extra, height_px)
            x_bias = 0.3 + 0.4 * (index % 3) / 2
            piece = populated_lower_panorama(source, piece_size) if town_panorama else (
                surface_piece(source, piece_size, industrial, x_bias) if surface else cover(source.convert("RGB"), piece_size, x_bias)
            )
        mask = feather_mask(piece.size, left_extra > 0, right_extra > 0, overlap)
        canvas.paste(piece, (cursor - left_extra, 0), mask)
        cursor += segment_w

    return sharpen(canvas)


def save_chunks(strip: Image.Image, widths: list[int], x_tile: int, y_tile: float,
                height_tiles: float, prefix: str, chunks_dir: Path) -> list[ChunkSpec]:
    specs: list[ChunkSpec] = []
    cursor_px = 0
    cursor_tile = x_tile
    for index, width_tiles in enumerate(widths):
        width_px = width_tiles * TILE_PX
        chunk = strip.crop((cursor_px, 0, cursor_px + width_px, strip.height))
        name = f"{prefix}-{index + 1:02d}.webp"
        path = chunks_dir / name
        chunk.save(path, "WEBP", quality=94, method=6)
        specs.append(ChunkSpec(name, path, cursor_tile, y_tile, width_tiles, height_tiles, width_px, strip.height))
        cursor_px += width_px
        cursor_tile += width_tiles
    return specs


def feather_depth_bottom(image: Image.Image, feather_tiles: float = 0.75) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = Image.new("L", rgba.size, 255)
    draw = ImageDraw.Draw(alpha)
    feather = max(1, round(TILE_PX * feather_tiles))
    top = rgba.height - feather
    for y in range(top, rgba.height):
        value = round(255 * (rgba.height - 1 - y) / max(1, feather - 1))
        draw.line((0, y, rgba.width, y), fill=value)
    rgba.putalpha(alpha)
    return rgba


def feather_top(image: Image.Image, feather_tiles: float = 0.30) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    feather = min(rgba.height, max(1, round(TILE_PX * feather_tiles)))
    for y in range(feather):
        alpha.paste(round(255 * y / max(1, feather - 1)), (0, y, rgba.width, y + 1))
    rgba.putalpha(alpha)
    return rgba


def fade_overlap(image: Image.Image, side: str, tiles: int = 6) -> Image.Image:
    rgba = image.convert("RGBA")
    horizontal = Image.new("L", rgba.size, 255)
    width = min(rgba.width, max(1, tiles * TILE_PX))
    draw = ImageDraw.Draw(horizontal)
    if side == "right":
        start = rgba.width - width
        for x in range(start, rgba.width):
            value = round(255 * (rgba.width - 1 - x) / max(1, width - 1))
            draw.line((x, 0, x, rgba.height), fill=value)
    else:
        for x in range(width):
            value = round(255 * x / max(1, width - 1))
            draw.line((x, 0, x, rgba.height), fill=value)
    rgba.putalpha(ImageChops.multiply(rgba.getchannel("A"), horizontal))
    return rgba


def build_sky(chunks_dir: Path) -> list[ChunkSpec]:
    widths = [32] * 10 + [27]
    heights = [32, 32, 30]
    specs: list[ChunkSpec] = []
    for row, height_tiles in enumerate(heights):
        x_tile = 0
        y_tile = sum(heights[:row])
        for column, width_tiles in enumerate(widths):
            width = width_tiles * TILE_PX
            height = height_tiles * TILE_PX
            origin_x, origin_y = x_tile * TILE_PX, y_tile * TILE_PX
            gradient = Image.new("RGB", (1, height))
            for y in range(height):
                ratio = (origin_y + y) / (94 * TILE_PX)
                color = (max(5, round(9 + 9 * ratio)), max(10, round(19 + 8 * ratio)), max(18, round(38 + 10 * ratio)))
                gradient.putpixel((0, y), color)
            image = gradient.resize((width, height))
            draw = ImageDraw.Draw(image, "RGBA")

            cloud_cell, cloud_margin = 12 * TILE_PX, 6 * TILE_PX
            cloud_x0, cloud_y0 = math.floor((origin_x - cloud_margin) / cloud_cell), math.floor((origin_y - cloud_margin) / cloud_cell)
            for cloud_y in range(cloud_y0, math.ceil((origin_y + height + cloud_margin) / cloud_cell)):
                for cloud_x in range(cloud_x0, math.ceil((origin_x + width + cloud_margin) / cloud_cell)):
                    rng = random.Random(20260712 + cloud_x * 92821 + cloud_y * 68917)
                    center_x, center_y = cloud_x * cloud_cell + rng.randrange(cloud_cell), cloud_y * cloud_cell + rng.randrange(cloud_cell)
                    radius_x, radius_y = rng.randint(3, 6) * TILE_PX, rng.randint(1, 2) * TILE_PX
                    for lobe in (-1, 0, 1):
                        local_x, local_y = center_x - origin_x + lobe * radius_x // 3, center_y - origin_y + rng.randint(-TILE_PX // 3, TILE_PX // 3)
                        draw.ellipse((local_x - radius_x, local_y - radius_y, local_x + radius_x, local_y + radius_y), fill=(29, 51, 72, 18))

            star_cell = 256
            for star_y in range(origin_y // star_cell, (origin_y + height - 1) // star_cell + 1):
                for star_x in range(origin_x // star_cell, (origin_x + width - 1) // star_cell + 1):
                    rng = random.Random(20260711 + star_x * 104729 + star_y * 130363)
                    for _ in range(1 + rng.randrange(2)):
                        x = star_x * star_cell + rng.randrange(star_cell) - origin_x
                        y = star_y * star_cell + rng.randrange(star_cell) - origin_y
                        radius = rng.choice((1, 1, 1, 2))
                        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(180, 215, 238, rng.randint(90, 210)))
            if row == len(heights) - 1:
                base = height - 1
                ridge_step = 3 * TILE_PX
                first = math.floor(origin_x / ridge_step) - 1
                last = math.ceil((origin_x + width) / ridge_step) + 1
                points = [
                    (index * ridge_step - origin_x, base - (2 + ((index * 1103515245 + 12345) & 0x7FFFFFFF) % 7) * TILE_PX)
                    for index in range(first, last + 1)
                ]
                draw.polygon([(points[0][0], base), *points, (points[-1][0], base)], fill=(10, 16, 24, 210))
            name = f"sky-r{row + 1:02d}-c{column + 1:02d}.webp"
            path = chunks_dir / name
            image.save(path, "WEBP", quality=94, method=6)
            specs.append(ChunkSpec(name, path, x_tile, y_tile, width_tiles, height_tiles, width, height))
            x_tile += width_tiles
    return specs


def build_all(asset_dir: Path) -> list[ChunkSpec]:
    sources = asset_dir / "sources"
    chunks = asset_dir / "chunks"
    chunks.mkdir(parents=True, exist_ok=True)

    specs = build_sky(chunks)
    town_widths = [13] * 5
    level1_ground_widths = [13] * 3 + [12] * 7
    level2_widths = [13] * 14 + [12]
    level1_depth_widths = [12] * 9 + [10]

    level1_ground = compose_strip([sources / f"level1-ground-{i:02d}.png" for i in range(1, 11)], level1_ground_widths, 11, 1051, False, False, surface=True)
    level1_ground = fade_overlap(level1_ground, "right")
    specs += save_chunks(level1_ground, level1_ground_widths, 36, 94, 11, "level1-ground", chunks)
    level2_ground = compose_strip([sources / f"level2-ground-{i:02d}.png" for i in range(1, 16)], level2_widths, 11, 2201, True, False, surface=True)
    level2_ground = fade_overlap(level2_ground, "left")
    specs += save_chunks(level2_ground, level2_widths, 153, 94, 11, "level2-ground", chunks)

    town = feather_top(compose_strip(
        [sources / f"town-ground-{i:02d}.png" for i in range(1, 6)], town_widths, 3, 1101, False, True, True
    ))
    specs += save_chunks(town, town_widths, 43, 102, 3, "town-ground", chunks)
    with Image.open(sources / "level1-exit-01.png") as source:
        exit_image = sharpen(cover(source.convert("RGB"), (TILE_PX, TILE_PX))).convert("RGBA")
    exit_path = chunks / "level1-exit-01.webp"
    exit_image.save(exit_path, "WEBP", quality=96, method=6)
    specs.append(ChunkSpec(exit_path.name, exit_path, 108, 104, 1, 1, TILE_PX, TILE_PX))

    depth_height = MAX_DEPTH_TILES
    level1_depth = feather_depth_bottom(compose_strip([sources / f"level1-depth-{i:02d}.png" for i in range(1, 11)], level1_depth_widths, depth_height, 3301, False, False))
    level1_depth = fade_overlap(level1_depth, "right")
    specs += save_chunks(level1_depth, level1_depth_widths, 41, GROUND_ROW, depth_height, "level1-depth", chunks)
    level2_depth = feather_depth_bottom(compose_strip([sources / f"level2-depth-{i:02d}.png" for i in range(1, 16)], level2_widths, depth_height, 4401, True, False))
    level2_depth = fade_overlap(level2_depth, "left")
    specs += save_chunks(level2_depth, level2_widths, 153, GROUND_ROW, depth_height, "level2-depth", chunks)
    cavity_height = MAX_Y_TILE - 106
    with Image.open(sources / "level2-cavity-01.png") as source:
        cavity = cover(source.convert("RGB"), (14 * TILE_PX, round(cavity_height * TILE_PX)), 0.5)
    cavity = feather_depth_bottom(sharpen(cavity))
    specs += save_chunks(cavity, [14], 172, 106, cavity_height, "level2-cavity", chunks)
    return specs
