from __future__ import annotations

import re
import struct
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "ai-tools" / "weather-tuning" / "outputs"
OVERRIDE_PATH = ROOT / "values" / "tiledWorldOverrideData.js"
WEATHER_CONFIG_PATH = ROOT / "values" / "weatherConfig.js"

AIR = 0
BEDROCK = 4
CAVE_WALL = 24

COLORS = {
    "background": (250, 252, 255, 255),
    "air": (255, 255, 255, 255),
    "solid": (205, 211, 219, 255),
    "bedrock": (221, 209, 255, 255),
    "cave_wall": (229, 218, 247, 255),
    "cover": (255, 176, 176, 255),
    "grid": (122, 134, 150, 255),
    "major_grid": (65, 76, 94, 255),
}


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def extract_number(text: str, key: str) -> int:
    match = re.search(rf"{re.escape(key)}:\s*(\d+)", text)
    if not match:
        raise ValueError(f"Missing {key} in {OVERRIDE_PATH}")
    return int(match.group(1))


def extract_runs(text: str) -> list[int]:
    match = re.search(r"runs:\s*Object\.freeze\(\[(.*?)\]\)", text, re.S)
    if not match:
        raise ValueError(f"Missing runs array in {OVERRIDE_PATH}")
    return [int(value) for value in re.findall(r"-?\d+", match.group(1))]


def build_tile_grid() -> tuple[list[list[int]], dict[str, int]]:
    text = read_text(OVERRIDE_PATH)
    width = extract_number(text, "width")
    height = extract_number(text, "height")
    crop_x = extract_number(text, "x")
    crop_y = extract_number(text, "y")
    flat = [AIR] * (width * height)
    runs = extract_runs(text)
    for index in range(0, len(runs), 3):
        start, length, tile_type = runs[index:index + 3]
        for offset in range(length):
            flat[start + offset] = tile_type
    rows = [flat[row * width:(row + 1) * width] for row in range(height)]
    return rows, {"width": width, "height": height, "cropX": crop_x, "cropY": crop_y}


def parse_cover_objects() -> list[dict[str, float]]:
    text = read_text(WEATHER_CONFIG_PATH)
    covers: list[dict[str, float]] = []
    pattern = re.compile(
        r"Object\.freeze\(\{\s*kind:\s*\"cover\",\s*xTile:\s*([\d.]+),\s*yTile:\s*([\d.]+),\s*"
        r"widthTiles:\s*([\d.]+),\s*heightTiles:\s*([\d.]+)\s*\}\)"
    )
    for match in pattern.finditer(text):
        x_tile, y_tile, width_tiles, height_tiles = (float(value) for value in match.groups())
        covers.append({"kind": "cover", "x": x_tile, "y": y_tile, "w": width_tiles, "h": height_tiles})

    roof_match = re.search(
        r"kind:\s*\"townRoof\".*?startTileX:\s*([\d.]+).*?endTileOffsetFromSpawn:\s*([\d.]+).*?"
        r"yTilesAboveFloor:\s*([\d.]+).*?heightTiles:\s*([\d.]+)",
        text,
        re.S,
    )
    if roof_match:
        start_x, end_x, above_floor, height = (float(value) for value in roof_match.groups())
        floor_y = max((cover["y"] + cover["h"] for cover in covers), default=64.0)
        covers.append({
            "kind": "townRoof",
            "x": start_x,
            "y": max(0.0, floor_y - above_floor),
            "w": max(1.0, end_x - start_x),
            "h": height,
        })
    return covers


def png_chunk(chunk_type: bytes, payload: bytes) -> bytes:
    return (
        struct.pack(">I", len(payload))
        + chunk_type
        + payload
        + struct.pack(">I", zlib.crc32(chunk_type + payload) & 0xFFFFFFFF)
    )


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


def tile_color(tile_type: int) -> tuple[int, int, int, int]:
    if tile_type == AIR:
        return COLORS["air"]
    if tile_type == BEDROCK:
        return COLORS["bedrock"]
    if tile_type == CAVE_WALL:
        return COLORS["cave_wall"]
    return COLORS["solid"]


def draw_region(
    rows: list[list[int]],
    covers: list[dict[str, float]],
    path: Path,
    row_start: int,
    row_end: int,
    scale_x: int,
    scale_y: int,
) -> None:
    width = len(rows[0])
    height = len(rows)
    row_start = max(0, min(height - 1, row_start))
    row_end = max(row_start + 1, min(height, row_end))
    out_width = width * scale_x
    out_height = (row_end - row_start) * scale_y
    pixels = [COLORS["background"]] * (out_width * out_height)

    for y in range(row_start, row_end):
        for x in range(width):
            color = tile_color(rows[y][x])
            for sy in range(scale_y):
                out_y = (y - row_start) * scale_y + sy
                for sx in range(scale_x):
                    out_x = x * scale_x + sx
                    pixels[out_y * out_width + out_x] = color

    for cover in covers:
        x0 = max(0, int(cover["x"] * scale_x))
        x1 = min(out_width - 1, int((cover["x"] + cover["w"]) * scale_x))
        y0 = int((cover["y"] - row_start) * scale_y)
        y1 = int((cover["y"] + cover["h"] - row_start) * scale_y)
        if y1 < 0 or y0 >= out_height:
            continue
        y0 = max(0, y0)
        y1 = min(out_height - 1, y1)
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if 0 <= x < out_width and 0 <= y < out_height:
                    pixels[y * out_width + x] = COLORS["cover"]

    for y in range(0, out_height, scale_y):
        color = COLORS["major_grid"] if (row_start + y // scale_y) % 10 == 0 else COLORS["grid"]
        for x in range(out_width):
            pixels[y * out_width + x] = color
    for x in range(0, out_width, scale_x):
        color = COLORS["major_grid"] if (x // scale_x) % 10 == 0 else COLORS["grid"]
        for y in range(out_height):
            pixels[y * out_width + x] = color

    write_png(path, out_width, out_height, pixels)


def write_surface_svg(path: Path, covers: list[dict[str, float]], width_tiles: int, row_start: int, row_end: int) -> None:
    cell = 10
    label_w = 56
    label_h = 34
    svg_width = label_w + width_tiles * cell + 24
    svg_height = label_h + (row_end - row_start) * cell + 34
    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{svg_width}" height="{svg_height}" viewBox="0 0 {svg_width} {svg_height}">',
        '<rect width="100%" height="100%" fill="#fafcff"/>',
        '<text x="16" y="22" font-family="Arial, sans-serif" font-size="16" fill="#111827">Draw rain/no-rain zones on this layout</text>',
    ]
    for x in range(width_tiles + 1):
        xx = label_w + x * cell
        stroke = "#415066" if x % 10 == 0 else "#9aa6b5"
        lines.append(f'<line x1="{xx}" y1="{label_h}" x2="{xx}" y2="{svg_height - 24}" stroke="{stroke}" stroke-width="1"/>')
        if x % 10 == 0:
            lines.append(f'<text x="{xx + 2}" y="{label_h - 6}" font-family="Arial, sans-serif" font-size="10" fill="#334155">x{x}</text>')
    for y in range(row_end - row_start + 1):
        yy = label_h + y * cell
        source_y = row_start + y
        stroke = "#415066" if source_y % 10 == 0 else "#9aa6b5"
        lines.append(f'<line x1="{label_w}" y1="{yy}" x2="{svg_width - 24}" y2="{yy}" stroke="{stroke}" stroke-width="1"/>')
        if source_y % 10 == 0:
            lines.append(f'<text x="10" y="{yy + 4}" font-family="Arial, sans-serif" font-size="10" fill="#334155">y{source_y}</text>')
    for cover in covers:
        x = label_w + cover["x"] * cell
        y = label_h + (cover["y"] - row_start) * cell
        w = cover["w"] * cell
        h = cover["h"] * cell
        if y + h < label_h or y > svg_height:
            continue
        lines.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" fill="#ffb0b0" opacity="0.55" stroke="#dc2626"/>')
    lines.append("</svg>")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_notes(path: Path, metadata: dict[str, int]) -> None:
    path.write_text(
        "\n".join([
            "# Rain Draw Layout",
            "",
            "These files are neutral drawing templates. They do not classify where rain should fall.",
            "",
            f"- Runtime crop: x={metadata['cropX']}, y={metadata['cropY']}, width={metadata['width']}, height={metadata['height']}",
            "- White: air / empty space",
            "- Light gray: solid runtime tile context",
            "- Pale purple: bedrock/cave-wall context",
            "- Pale red: current configured visual cover rectangles",
            "- Grid: every tile; darker line every 10 tiles",
            "",
            "Recommended drawing marks:",
            "- Blue: direct rain/snow/hail can fall",
            "- Orange: landing/splash/accumulation surface",
            "- Purple: sheltered/no direct precipitation",
            "- Green: drip-only underside",
        ]) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    rows, metadata = build_tile_grid()
    covers = parse_cover_objects()
    draw_region(rows, covers, OUT_DIR / "2026-07-03-rain-draw-layout-full.png", 0, metadata["height"], 8, 1)
    draw_region(rows, covers, OUT_DIR / "2026-07-03-rain-draw-layout-surface-town.png", 0, 130, 8, 8)
    draw_region(rows, covers, OUT_DIR / "2026-07-03-rain-draw-layout-upper-underground.png", 120, 360, 8, 4)
    draw_region(rows, covers, OUT_DIR / "2026-07-03-rain-draw-layout-deep-underground.png", 720, 960, 8, 4)
    write_surface_svg(OUT_DIR / "2026-07-03-rain-draw-layout-surface-town.svg", covers, metadata["width"], 0, 130)
    write_notes(OUT_DIR / "2026-07-03-rain-draw-layout-notes.md", metadata)
    print(f"Wrote rain draw layouts to {OUT_DIR}")


if __name__ == "__main__":
    main()
