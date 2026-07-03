from __future__ import annotations

import os
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
IGNORED_OUTER_SHELL_TILE_TYPES = {BEDROCK, CAVE_WALL}
OUTER_SHELL_IGNORE_TILES = 1
DIRECT_RAIN_DEPTH_LIMIT_TILES = 140

COLORS = {
    "air": (12, 22, 36, 255),
    "direct": (64, 198, 255, 255),
    "snow": (226, 246, 255, 255),
    "hail": (178, 210, 245, 255),
    "sheltered": (66, 46, 83, 255),
    "solid": (70, 75, 83, 255),
    "surface": (255, 187, 89, 255),
    "visual_cover": (255, 101, 93, 255),
    "ignored_shell": (151, 92, 255, 255),
    "grid": (32, 41, 55, 255),
    "text": (238, 242, 255, 255),
    "background": (7, 11, 19, 255),
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
    runs = extract_runs(text)

    flat = [AIR] * (width * height)
    for index in range(0, len(runs), 3):
        start, length, tile_type = runs[index:index + 3]
        for offset in range(length):
            flat[start + offset] = tile_type

    rows = [flat[row * width:(row + 1) * width] for row in range(height)]
    metadata = {"width": width, "height": height, "cropX": crop_x, "cropY": crop_y}
    return rows, metadata


def parse_cover_objects() -> list[dict[str, float]]:
    text = read_text(WEATHER_CONFIG_PATH)
    covers: list[dict[str, float]] = []
    pattern = re.compile(
        r"Object\.freeze\(\{\s*kind:\s*\"cover\",\s*xTile:\s*([\d.]+),\s*yTile:\s*([\d.]+),\s*"
        r"widthTiles:\s*([\d.]+),\s*heightTiles:\s*([\d.]+)\s*\}\)"
    )
    for match in pattern.finditer(text):
        x_tile, y_tile, width_tiles, height_tiles = (float(value) for value in match.groups())
        covers.append({
            "kind": "cover",
            "x": x_tile,
            "y": y_tile,
            "w": width_tiles,
            "h": height_tiles,
        })

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


def is_outer_shell(x: int, y: int, width: int, height: int) -> bool:
    return (
        x < OUTER_SHELL_IGNORE_TILES
        or x >= width - OUTER_SHELL_IGNORE_TILES
        or y < OUTER_SHELL_IGNORE_TILES
        or y >= height - OUTER_SHELL_IGNORE_TILES
    )


def is_blocker(tile_type: int, x: int, y: int, width: int, height: int) -> bool:
    if tile_type == AIR:
        return False
    if is_outer_shell(x, y, width, height) and tile_type in IGNORED_OUTER_SHELL_TILE_TYPES:
        return False
    return True


def cover_at(covers: list[dict[str, float]], x: int, y: int) -> bool:
    cell_x = x + 0.5
    cell_y = y + 0.5
    for cover in covers:
        if cover["x"] <= cell_x < cover["x"] + cover["w"] and cover["y"] <= cell_y < cover["y"] + cover["h"]:
            return True
    return False


def classify(rows: list[list[int]], covers: list[dict[str, float]]) -> list[list[str]]:
    height = len(rows)
    width = len(rows[0])
    mask = [["sheltered" for _ in range(width)] for _ in range(height)]

    for x in range(width):
        first_landing_y = None
        first_landing_from_cover = False
        for y in range(height):
            tile_type = rows[y][x]
            if is_outer_shell(x, y, width, height) and tile_type in IGNORED_OUTER_SHELL_TILE_TYPES:
                mask[y][x] = "ignored_shell"
                continue
            if cover_at(covers, x, y):
                first_landing_y = y
                first_landing_from_cover = True
                break
            if is_blocker(tile_type, x, y, width, height):
                first_landing_y = y
                break

        rain_end = first_landing_y if first_landing_y is not None else min(height, DIRECT_RAIN_DEPTH_LIMIT_TILES)
        for y in range(rain_end):
            if mask[y][x] != "ignored_shell":
                mask[y][x] = "direct"
        if first_landing_y is not None and mask[first_landing_y][x] != "ignored_shell":
            mask[first_landing_y][x] = "visual_cover" if first_landing_from_cover else "surface"

    for y, row in enumerate(rows):
        for x, tile_type in enumerate(row):
            if mask[y][x] == "ignored_shell":
                continue
            if mask[y][x] in {"surface", "visual_cover"}:
                continue
            if is_blocker(tile_type, x, y, width, height):
                mask[y][x] = "solid"

    return mask


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
    payload = b"".join([
        b"\x89PNG\r\n\x1a\n",
        png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)),
        png_chunk(b"IDAT", zlib.compress(bytes(raw), 9)),
        png_chunk(b"IEND", b""),
    ])
    path.write_bytes(payload)


def render_region(mask: list[list[str]], rows: list[list[int]], path: Path, row_start: int, row_end: int, scale_x: int, scale_y: int) -> None:
    height = len(mask)
    width = len(mask[0])
    row_start = max(0, min(height - 1, row_start))
    row_end = max(row_start + 1, min(height, row_end))
    out_width = width * scale_x
    out_height = (row_end - row_start) * scale_y
    pixels = [COLORS["background"]] * (out_width * out_height)

    for y in range(row_start, row_end):
        for x in range(width):
            key = mask[y][x]
            color = COLORS[key]
            if key == "direct" and rows[y][x] == AIR:
                color = COLORS["direct"]
            for sy in range(scale_y):
                out_y = (y - row_start) * scale_y + sy
                for sx in range(scale_x):
                    out_x = x * scale_x + sx
                    pixels[out_y * out_width + out_x] = color

    if scale_y >= 4:
        for y in range(0, out_height, scale_y * 10):
            for x in range(out_width):
                pixels[y * out_width + x] = COLORS["grid"]
    if scale_x >= 4:
        for x in range(0, out_width, scale_x * 10):
            for y in range(out_height):
                pixels[y * out_width + x] = COLORS["grid"]

    write_png(path, out_width, out_height, pixels)


def write_legend(path: Path) -> None:
    labels = [
        ("direct", "direct rain/snow/hail path"),
        ("surface", "landing surface / splash line"),
        ("visual_cover", "town roof / visual cover blocker"),
        ("sheltered", "sheltered: no direct precipitation"),
        ("solid", "solid terrain/interior blocker"),
        ("ignored_shell", "ignored outer bedrock/cave-wall shell"),
    ]
    width = 760
    row_height = 44
    height = 28 + len(labels) * row_height
    pixels = [COLORS["background"]] * (width * height)
    for index, (key, _label) in enumerate(labels):
        y0 = 18 + index * row_height
        for y in range(y0, min(height, y0 + 26)):
            for x in range(24, 92):
                pixels[y * width + x] = COLORS[key]
    write_png(path, width, height, pixels)

    text_path = path.with_suffix(".txt")
    text_path.write_text(
        "\n".join([f"{key}: {label}" for key, label in labels]) + "\n",
        encoding="utf-8",
    )

    svg_rows = []
    for index, (key, label) in enumerate(labels):
        y = 30 + index * 34
        r, g, b, _a = COLORS[key]
        svg_rows.append(
            f'<rect x="24" y="{y - 18}" width="72" height="22" fill="rgb({r},{g},{b})"/>'
            f'<text x="112" y="{y}" fill="#eef2ff" font-family="Arial, sans-serif" font-size="18">{label}</text>'
        )
    svg = "\n".join([
        '<svg xmlns="http://www.w3.org/2000/svg" width="760" height="250" viewBox="0 0 760 250">',
        '<rect width="760" height="250" fill="#070b13"/>',
        '<text x="24" y="24" fill="#eef2ff" font-family="Arial, sans-serif" font-size="20" font-weight="700">Weather precipitation mask legend</text>',
        *svg_rows,
        "</svg>",
    ])
    path.with_suffix(".svg").write_text(svg + "\n", encoding="utf-8")


def write_contact_sheet(path: Path) -> None:
    html = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Weather Precipitation Mask Mockups</title>
  <style>
    body { margin: 0; background: #070b13; color: #eef2ff; font: 15px Arial, sans-serif; }
    main { max-width: 1180px; margin: 0 auto; padding: 24px; }
    h1 { font-size: 24px; margin: 0 0 16px; }
    h2 { font-size: 18px; margin: 24px 0 10px; }
    img { background: #0c1624; border: 1px solid #243244; max-width: 100%; image-rendering: pixelated; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 20px; align-items: start; }
    .wide { grid-column: 1 / -1; }
  </style>
</head>
<body>
<main>
  <h1>Weather Precipitation Mask Mockups</h1>
  <p>Visual-only masks. Purple perimeter is ignored outer shell; cyan is direct precipitation; orange/red is first landing or visual cover; dark purple is sheltered.</p>
  <div class="grid">
    <section class="wide"><h2>Legend</h2><img src="2026-07-03-precipitation-mask-legend.svg" alt="mask legend"></section>
    <section class="wide"><h2>Full Runtime Crop</h2><img src="2026-07-03-precipitation-mask-full.png" alt="full precipitation mask"></section>
    <section><h2>Surface / Town</h2><img src="2026-07-03-precipitation-mask-surface-town.png" alt="surface town precipitation mask"></section>
    <section><h2>Upper Underground</h2><img src="2026-07-03-precipitation-mask-upper-underground.png" alt="upper underground precipitation mask"></section>
    <section><h2>Deep Underground</h2><img src="2026-07-03-precipitation-mask-deep-underground.png" alt="deep underground precipitation mask"></section>
  </div>
</main>
</body>
</html>
"""
    path.write_text(html, encoding="utf-8")


def write_report(path: Path, metadata: dict[str, int], mask: list[list[str]]) -> None:
    total = len(mask) * len(mask[0])
    counts: dict[str, int] = {}
    for row in mask:
        for key in row:
            counts[key] = counts.get(key, 0) + 1

    lines = [
        "# Weather Precipitation Mask Mockups",
        "",
        "Generated visual-only outputs. Runtime weather is not wired by this tool.",
        "",
        f"- Crop: x={metadata['cropX']}, y={metadata['cropY']}, width={metadata['width']}, height={metadata['height']}",
        f"- Ignored outer shell thickness: {OUTER_SHELL_IGNORE_TILES} tile",
        f"- Ignored perimeter blocker tile types: {sorted(IGNORED_OUTER_SHELL_TILE_TYPES)}",
        f"- Direct precipitation depth limit for no-blocker columns: {DIRECT_RAIN_DEPTH_LIMIT_TILES} tiles",
        "",
        "## Mask Counts",
        "",
    ]
    for key in sorted(counts):
        pct = counts[key] / total * 100
        lines.append(f"- {key}: {counts[key]} tiles ({pct:.2f}%)")
    lines.extend([
        "",
        "## Output Files",
        "",
        "- 2026-07-03-precipitation-mask-full.png",
        "- 2026-07-03-precipitation-mask-surface-town.png",
        "- 2026-07-03-precipitation-mask-upper-underground.png",
        "- 2026-07-03-precipitation-mask-deep-underground.png",
        "- 2026-07-03-precipitation-mask-contact-sheet.html",
        "- 2026-07-03-precipitation-mask-legend.png",
        "- 2026-07-03-precipitation-mask-legend.svg",
        "- 2026-07-03-precipitation-mask-legend.txt",
    ])
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    rows, metadata = build_tile_grid()
    covers = parse_cover_objects()
    mask = classify(rows, covers)

    render_region(mask, rows, OUT_DIR / "2026-07-03-precipitation-mask-full.png", 0, metadata["height"], 8, 1)
    render_region(mask, rows, OUT_DIR / "2026-07-03-precipitation-mask-surface-town.png", 0, 130, 8, 8)
    render_region(mask, rows, OUT_DIR / "2026-07-03-precipitation-mask-upper-underground.png", 120, 360, 8, 4)
    render_region(mask, rows, OUT_DIR / "2026-07-03-precipitation-mask-deep-underground.png", 720, 960, 8, 4)
    write_legend(OUT_DIR / "2026-07-03-precipitation-mask-legend.png")
    write_contact_sheet(OUT_DIR / "2026-07-03-precipitation-mask-contact-sheet.html")
    write_report(OUT_DIR / "2026-07-03-precipitation-mask-report.md", metadata, mask)
    print(f"Wrote precipitation mask mockups to {OUT_DIR}")


if __name__ == "__main__":
    main()
