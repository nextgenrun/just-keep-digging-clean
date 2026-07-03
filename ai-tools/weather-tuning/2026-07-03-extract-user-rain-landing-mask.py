from __future__ import annotations

import json
import struct
import zlib
from collections import deque
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "ai-tools" / "weather-tuning" / "outputs"
ANNOTATION_PATH = Path(r"C:\Users\Mila\AppData\Local\Temp\codex-clipboard-ecb9da00-5b20-46d0-a394-0982a70841e5.png")

TILE_WIDTH = 120
TILE_HEIGHT = 130
CELL_PX = 8
LAYOUT_WIDTH = TILE_WIDTH * CELL_PX
LAYOUT_HEIGHT = TILE_HEIGHT * CELL_PX

COLORS = {
    "background": (250, 252, 255, 255),
    "blocked": (28, 32, 40, 255),
    "allowed": (47, 167, 255, 255),
    "landing": (255, 177, 67, 255),
    "outline": (255, 44, 44, 255),
    "grid": (103, 114, 130, 255),
    "major_grid": (45, 55, 72, 255),
}


def png_chunk(chunk_type: bytes, payload: bytes) -> bytes:
    return (
        struct.pack(">I", len(payload))
        + chunk_type
        + payload
        + struct.pack(">I", zlib.crc32(chunk_type + payload) & 0xFFFFFFFF)
    )


def read_png(path: Path) -> tuple[int, int, list[tuple[int, int, int, int]]]:
    data = path.read_bytes()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError(f"Not a PNG: {path}")
    pos = 8
    width = height = None
    color_type = None
    idat = bytearray()
    while pos < len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        chunk_type = data[pos + 4:pos + 8]
        payload = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if chunk_type == b"IHDR":
            width, height, bit_depth, color_type, _compression, _filter, _interlace = struct.unpack(">IIBBBBB", payload)
            if bit_depth != 8 or color_type not in (2, 6):
                raise ValueError(f"Unsupported PNG format: bit_depth={bit_depth}, color_type={color_type}")
        elif chunk_type == b"IDAT":
            idat.extend(payload)
        elif chunk_type == b"IEND":
            break
    if width is None or height is None or color_type is None:
        raise ValueError(f"Missing PNG header: {path}")

    channels = 4 if color_type == 6 else 3
    stride = width * channels
    raw = zlib.decompress(bytes(idat))
    rows: list[bytearray] = []
    src = 0
    previous = bytearray(stride)
    for _y in range(height):
        filter_type = raw[src]
        src += 1
        row = bytearray(raw[src:src + stride])
        src += stride
        recon = bytearray(stride)
        for i, value in enumerate(row):
            left = recon[i - channels] if i >= channels else 0
            up = previous[i]
            up_left = previous[i - channels] if i >= channels else 0
            if filter_type == 0:
                recon[i] = value
            elif filter_type == 1:
                recon[i] = (value + left) & 0xFF
            elif filter_type == 2:
                recon[i] = (value + up) & 0xFF
            elif filter_type == 3:
                recon[i] = (value + ((left + up) // 2)) & 0xFF
            elif filter_type == 4:
                p = left + up - up_left
                pa = abs(p - left)
                pb = abs(p - up)
                pc = abs(p - up_left)
                predictor = left if pa <= pb and pa <= pc else up if pb <= pc else up_left
                recon[i] = (value + predictor) & 0xFF
            else:
                raise ValueError(f"Unsupported PNG filter {filter_type}")
        rows.append(recon)
        previous = recon

    pixels: list[tuple[int, int, int, int]] = []
    for row in rows:
        for x in range(width):
            base = x * channels
            r, g, b = row[base], row[base + 1], row[base + 2]
            a = row[base + 3] if channels == 4 else 255
            pixels.append((r, g, b, a))
    return width, height, pixels


def write_png(path: Path, width: int, height: int, pixels: list[tuple[int, int, int, int]]) -> None:
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        start = y * width
        for r, g, b, a in pixels[start:start + width]:
            raw.extend((r, g, b, a))
    path.write_bytes(b"".join([
        b"\x89PNG\r\n\x1a\n",
        png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)),
        png_chunk(b"IDAT", zlib.compress(bytes(raw), 9)),
        png_chunk(b"IEND", b""),
    ]))


def is_red(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    return a > 64 and r > 180 and g < 115 and b < 115 and r > g * 1.45 and r > b * 1.45


def detect_layout_bounds(width: int, height: int, pixels: list[tuple[int, int, int, int]]) -> tuple[int, int, int, int]:
    xs: list[int] = []
    ys: list[int] = []
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[y * width + x]
            if a > 0 and (r > 80 or g > 80 or b > 80):
                xs.append(x)
                ys.append(y)
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def close_red_lines(red: list[list[bool]]) -> list[list[bool]]:
    height = len(red)
    width = len(red[0])
    expanded = [[False for _ in range(width)] for _ in range(height)]
    radius = 7
    for y in range(height):
        for x in range(width):
            if not red[y][x]:
                continue
            for dy in range(-radius, radius + 1):
                yy = y + dy
                if yy < 0 or yy >= height:
                    continue
                for dx in range(-radius, radius + 1):
                    xx = x + dx
                    if 0 <= xx < width:
                        expanded[yy][xx] = True
    return expanded


def fill_inside(red: list[list[bool]]) -> list[list[bool]]:
    height = len(red)
    width = len(red[0])
    outside = [[False for _ in range(width)] for _ in range(height)]
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))
    while queue:
        x, y = queue.popleft()
        if x < 0 or x >= width or y < 0 or y >= height:
            continue
        if outside[y][x] or red[y][x]:
            continue
        outside[y][x] = True
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return [[not outside[y][x] for x in range(width)] for y in range(height)]


def tile_mask_from_pixels(inside: list[list[bool]]) -> list[list[bool]]:
    mask = [[False for _ in range(TILE_WIDTH)] for _ in range(TILE_HEIGHT)]
    for ty in range(TILE_HEIGHT):
        for tx in range(TILE_WIDTH):
            hits = 0
            total = 0
            for py in range(ty * CELL_PX + 1, (ty + 1) * CELL_PX - 1):
                if py >= len(inside):
                    continue
                for px in range(tx * CELL_PX + 1, (tx + 1) * CELL_PX - 1):
                    if px >= len(inside[0]):
                        continue
                    total += 1
                    if inside[py][px]:
                        hits += 1
            mask[ty][tx] = total > 0 and hits / total >= 0.35
    return mask


def first_landing_by_column(mask: list[list[bool]]) -> list[int | None]:
    landings: list[int | None] = []
    for tx in range(TILE_WIDTH):
        landing = None
        for ty in range(TILE_HEIGHT):
            if mask[ty][tx]:
                landing = ty
        landings.append(landing)
    return landings


def render_tile_mask(mask: list[list[bool]], red: list[list[bool]], path: Path) -> None:
    width = TILE_WIDTH * CELL_PX
    height = TILE_HEIGHT * CELL_PX
    pixels = [COLORS["blocked"]] * (width * height)
    landings = first_landing_by_column(mask)
    for ty in range(TILE_HEIGHT):
        for tx in range(TILE_WIDTH):
            if not mask[ty][tx]:
                continue
            color = COLORS["landing"] if landings[tx] == ty else COLORS["allowed"]
            for sy in range(CELL_PX):
                for sx in range(CELL_PX):
                    pixels[(ty * CELL_PX + sy) * width + tx * CELL_PX + sx] = color
    for y in range(min(height, len(red))):
        for x in range(min(width, len(red[0]))):
            if red[y][x]:
                pixels[y * width + x] = COLORS["outline"]
    for y in range(0, height, CELL_PX):
        color = COLORS["major_grid"] if (y // CELL_PX) % 10 == 0 else COLORS["grid"]
        for x in range(width):
            pixels[y * width + x] = color
    for x in range(0, width, CELL_PX):
        color = COLORS["major_grid"] if (x // CELL_PX) % 10 == 0 else COLORS["grid"]
        for y in range(height):
            pixels[y * width + x] = color
    write_png(path, width, height, pixels)


def render_landing_only(mask: list[list[bool]], red: list[list[bool]], path: Path) -> None:
    width = TILE_WIDTH * CELL_PX
    height = TILE_HEIGHT * CELL_PX
    pixels = [COLORS["blocked"]] * (width * height)
    landings = first_landing_by_column(mask)
    for tx, landing_y in enumerate(landings):
        if landing_y is None:
            continue
        for sy in range(CELL_PX):
            for sx in range(CELL_PX):
                pixels[(landing_y * CELL_PX + sy) * width + tx * CELL_PX + sx] = COLORS["landing"]
    for y in range(min(height, len(red))):
        for x in range(min(width, len(red[0]))):
            if red[y][x]:
                pixels[y * width + x] = COLORS["outline"]
    for y in range(0, height, CELL_PX):
        color = COLORS["major_grid"] if (y // CELL_PX) % 10 == 0 else COLORS["grid"]
        for x in range(width):
            pixels[y * width + x] = color
    for x in range(0, width, CELL_PX):
        color = COLORS["major_grid"] if (x // CELL_PX) % 10 == 0 else COLORS["grid"]
        for y in range(height):
            pixels[y * width + x] = color
    write_png(path, width, height, pixels)


def mask_to_runs(mask: list[list[bool]]) -> list[dict[str, int]]:
    runs: list[dict[str, int]] = []
    for y, row in enumerate(mask):
        x = 0
        while x < TILE_WIDTH:
            if not row[x]:
                x += 1
                continue
            start = x
            while x < TILE_WIDTH and row[x]:
                x += 1
            runs.append({"y": y, "x": start, "width": x - start})
    return runs


def write_outputs(mask: list[list[bool]], red: list[list[bool]]) -> None:
    landings = first_landing_by_column(mask)
    runs = mask_to_runs(mask)
    data = {
        "source": str(ANNOTATION_PATH),
        "template": "2026-07-03-rain-draw-layout-surface-town.png",
        "tileWidth": TILE_WIDTH,
        "tileHeight": TILE_HEIGHT,
        "cellPx": CELL_PX,
        "meaning": {
            "allowedTileRuns": "Tiles inside the user's red outline; direct precipitation may visually land here.",
            "landingYByColumn": "Lowest allowed tile per column; useful for splash/settle y if runtime uses one landing per column.",
        },
        "allowedTileRuns": runs,
        "landingYByColumn": landings,
    }
    json_path = OUT_DIR / "2026-07-03-user-rain-landing-mask.json"
    json_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    render_tile_mask(mask, red, OUT_DIR / "2026-07-03-user-rain-landing-mask.png")
    render_landing_only(mask, red, OUT_DIR / "2026-07-03-user-rain-landing-surface-only.png")

    allowed_tiles = sum(1 for row in mask for value in row if value)
    report = [
        "# User Rain Landing Mask",
        "",
        "This is extracted from the user's red drawing. It is visual-only data and is not wired into runtime weather yet.",
        "",
        f"- Allowed landing tiles: {allowed_tiles}",
        f"- Tile grid: {TILE_WIDTH} x {TILE_HEIGHT}",
        f"- JSON: {json_path.name}",
        f"- Preview: 2026-07-03-user-rain-landing-mask.png",
        "- Landing-only preview: 2026-07-03-user-rain-landing-surface-only.png",
    ]
    (OUT_DIR / "2026-07-03-user-rain-landing-mask-report.md").write_text("\n".join(report) + "\n", encoding="utf-8")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    width, height, pixels = read_png(ANNOTATION_PATH)
    left, top, right, bottom = detect_layout_bounds(width, height, pixels)
    crop_width = min(LAYOUT_WIDTH, right - left)
    crop_height = min(LAYOUT_HEIGHT, bottom - top)
    red = [[False for _ in range(LAYOUT_WIDTH)] for _ in range(LAYOUT_HEIGHT)]
    for y in range(crop_height):
        for x in range(crop_width):
            if is_red(pixels[(top + y) * width + left + x]):
                red[y][x] = True
    closed = close_red_lines(red)
    inside = fill_inside(closed)
    mask = tile_mask_from_pixels(inside)
    write_outputs(mask, red)
    print(f"Wrote user rain landing mask to {OUT_DIR}")


if __name__ == "__main__":
    main()
