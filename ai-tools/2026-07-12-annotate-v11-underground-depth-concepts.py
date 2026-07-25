from __future__ import annotations

import base64
import struct
import xml.etree.ElementTree as ET
import zlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
TMX = ROOT / "exports" / "dig-game-world-edit-v-11-08-07-2026-;1-img-test.tmx"
PREVIEWS = ROOT / "visual-approval-previews"
LEVEL1_SOURCE = PREVIEWS / "v11-level1-underground-0-2000m-concept-2026-07-12.png"
LEVEL2_SOURCE = PREVIEWS / "v11-level2-underground-0-5000m-concept-2026-07-12.png"
LEVEL1_OUTPUT = PREVIEWS / "v11-level1-underground-0-2000m-annotated-2026-07-12.png"
LEVEL2_OUTPUT = PREVIEWS / "v11-level2-underground-0-5000m-annotated-2026-07-12.png"
BLUEPRINT_OUTPUT = PREVIEWS / "v11-underground-depth-plan-blueprint-2026-07-12.png"
CONTACT_OUTPUT = PREVIEWS / "v11-underground-depth-approval-contact-sheet-2026-07-12.png"

TILE_LAYER = "00_PAINT_HERE_tile_types"
TMX_GROUND_ROW = 105
RUNTIME_SOURCE_Y = 40
RUNTIME_ROWS = 2000
TOP_AIR_ROWS = 65
CURRENT_VISIBLE_DEPTH = RUNTIME_ROWS - TOP_AIR_ROWS
PREPARED_DEPTH = 2000
FUTURE_LEVEL2_DEPTH = 5000
LEVEL1_X = (41, 152)
LEVEL2_X = (153, 319)
LEVEL2_MARKER_GIDS = {1033, 3094}

LEVEL1_BANDS = (
    (0, 200, "Weathered Roots", (77, 54, 39)),
    (200, 500, "Blue Caverns", (25, 82, 116)),
    (500, 900, "Amber Depths", (130, 77, 27)),
    (900, 1300, "Crystal Void", (70, 101, 135)),
    (1300, 1600, "Silver Vein", (122, 140, 154)),
    (1600, 2000, "The Core", (118, 42, 29)),
)
LEVEL2_BANDS = (
    (0, 250, "Slagworks", (114, 41, 24)),
    (250, 600, "Furnace Fault", (137, 48, 23)),
    (600, 1000, "Obsidian Catacombs", (55, 49, 62)),
    (1000, 1400, "Ember Vaults", (131, 43, 30)),
    (1400, 1700, "Pressure Foundry", (109, 51, 31)),
    (1700, 2000, "Magma Heart", (158, 49, 23)),
    (2000, 2700, "Blackglass Abyss", (38, 48, 62)),
    (2700, 3500, "Mantle Engines", (91, 45, 41)),
    (3500, 4300, "Starfire Rift", (79, 55, 112)),
    (4300, 5000, "Infernal Core", (149, 39, 24)),
)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    name = "arialbd.ttf" if bold else "arial.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def decode_tmx() -> tuple[int, int, tuple[int, ...]]:
    root = ET.parse(TMX).getroot()
    width, height = int(root.get("width", "0")), int(root.get("height", "0"))
    layer = root.find(f"layer[@name='{TILE_LAYER}']")
    if layer is None:
        raise RuntimeError(f"Missing {TILE_LAYER}")
    data = layer.find("data")
    if data is None or data.get("encoding") != "base64" or data.get("compression") != "zlib":
        raise RuntimeError("Expected base64/zlib TMX tile layer")
    packed = zlib.decompress(base64.b64decode("".join(data.itertext()).strip()))
    gids = tuple(value & 0x1FFFFFFF for value in struct.unpack(f"<{len(packed) // 4}I", packed))
    return width, height, gids


def annotate_concept(source: Path, output: Path, depth: int, bands, title: str) -> Image.Image:
    image = Image.open(source).convert("RGB")
    bar = 300
    canvas = Image.new("RGB", (image.width + bar, image.height + 120), (12, 14, 18))
    canvas.paste(image, (bar, 120))
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.text((24, 20), title, font=font(34, True), fill=(245, 241, 230))
    draw.text((24, 66), "approval concept • exact depth ruler • not wired", font=font(20), fill=(170, 178, 188))
    top = 120
    for start, end, name, color in bands:
        y0 = top + round(start / depth * image.height)
        y1 = top + round(end / depth * image.height)
        draw.rectangle((0, y0, bar - 1, y1), fill=(*color, 235))
        draw.line((bar, y0, canvas.width, y0), fill=(255, 255, 255, 120), width=2)
        draw.text((20, y0 + 12), f"{start:,}–{end:,}m", font=font(20, True), fill="white")
        draw.multiline_text((20, y0 + 42), name, font=font(21), fill=(231, 233, 236), spacing=3)
    for value in range(0, depth + 1, 100):
        y = top + round(value / depth * image.height)
        width = 12 if value % 500 else 24
        draw.line((bar - width, y, bar, y), fill=(255, 255, 255, 210), width=2)
    if depth == FUTURE_LEVEL2_DEPTH:
        y = top + round(PREPARED_DEPTH / depth * image.height)
        draw.line((0, y, canvas.width, y), fill=(103, 219, 255, 255), width=5)
        draw.rectangle((bar + 18, y - 44, bar + 390, y - 6), fill=(5, 18, 24, 225))
        draw.text((bar + 30, y - 39), "2,000m • future reserve starts", font=font(20, True), fill=(123, 225, 255))
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, optimize=True)
    return canvas


def draw_blueprint(width: int, height: int, gids: tuple[int, ...]) -> dict[str, object]:
    image = Image.new("RGB", (1900, 3000), (10, 13, 18))
    draw = ImageDraw.Draw(image, "RGBA")
    draw.text((70, 40), "V11 UNDERGROUND BACKGROUND DEPTH PLAN", font=font(43, True), fill=(244, 239, 226))
    draw.text((70, 96), "exact TMX/runtime envelope • concept approval only • no production wiring", font=font(23), fill=(167, 177, 190))
    top, plan_h = 220, 2500
    columns = ((170, 760, PREPARED_DEPTH, LEVEL1_BANDS, "LEVEL 1"), (1030, 1620, FUTURE_LEVEL2_DEPTH, LEVEL2_BANDS, "LEVEL 2"))
    for left, right, depth, bands, label in columns:
        draw.text((left, 160), label, font=font(32, True), fill="white")
        for start, end, name, color in bands:
            y0 = top + round(start / FUTURE_LEVEL2_DEPTH * plan_h)
            y1 = top + round(end / FUTURE_LEVEL2_DEPTH * plan_h)
            draw.rectangle((left, y0, right, y1), fill=(*color, 255))
            draw.text((left + 18, y0 + 10), f"{start:,}–{end:,}m  {name}", font=font(19, True), fill="white")
        stop_y = top + round(depth / FUTURE_LEVEL2_DEPTH * plan_h)
        draw.line((left, stop_y, right, stop_y), fill=(255, 255, 255, 240), width=4)
        if depth == PREPARED_DEPTH:
            draw.rectangle((left, stop_y, right, top + plan_h), fill=(8, 10, 14, 230))
            draw.text((left + 18, stop_y + 26), "Level 1 ends at prepared 2,000m", font=font(20), fill=(160, 169, 180))
    current_y = top + round(CURRENT_VISIBLE_DEPTH / FUTURE_LEVEL2_DEPTH * plan_h)
    prepared_y = top + round(PREPARED_DEPTH / FUTURE_LEVEL2_DEPTH * plan_h)
    draw.line((100, current_y, 1690, current_y), fill=(255, 206, 92, 255), width=4)
    draw.text((100, current_y - 34), f"CURRENT RUNTIME LIMIT ≈ {CURRENT_VISIBLE_DEPTH:,}m", font=font(22, True), fill=(255, 215, 118))
    draw.line((100, prepared_y, 1690, prepared_y), fill=(98, 222, 255, 255), width=4)
    draw.text((100, prepared_y + 8), "PREPARED ART LIMIT 2,000m • final 65m dormant until world rows are extended", font=font(21, True), fill=(117, 226, 255))
    for value in range(0, FUTURE_LEVEL2_DEPTH + 1, 500):
        y = top + round(value / FUTURE_LEVEL2_DEPTH * plan_h)
        draw.line((55, y, 95, y), fill=(215, 219, 226), width=2)
        draw.text((12, y - 12), f"{value:,}m", font=font(18), fill=(190, 198, 209))
    marker_cells = [(i % width, i // width) for i, gid in enumerate(gids) if gid in LEVEL2_MARKER_GIDS]
    marker_bounds = None
    if marker_cells:
        xs, ys = zip(*marker_cells)
        marker_bounds = (min(xs), min(ys), max(xs), max(ys), len(marker_cells))
    notes = (
        f"TMX: {width}×{height} tiles • ground raw row {TMX_GROUND_ROW} • runtime crop y={RUNTIME_SOURCE_Y}..{RUNTIME_SOURCE_Y + RUNTIME_ROWS - 1}",
        f"Level 1 background width: raw x{LEVEL1_X[0]}..{LEVEL1_X[1]} ({LEVEL1_X[1] - LEVEL1_X[0] + 1} tiles)",
        f"Level 2 visible width: raw x{LEVEL2_X[0]}..{LEVEL2_X[1]} ({LEVEL2_X[1] - LEVEL2_X[0] + 1} tiles)",
        "Production intent: high-resolution masters split into streamed, feather-overlapped chunks; never one 5,000m decoded texture.",
    )
    draw.rounded_rectangle((90, 2760, 1810, 2950), radius=18, fill=(22, 27, 35), outline=(73, 84, 101), width=2)
    for index, note in enumerate(notes):
        draw.text((120, 2790 + index * 38), note, font=font(19), fill=(208, 214, 222))
    image.save(BLUEPRINT_OUTPUT, optimize=True)
    return {"markerBounds": marker_bounds, "tmx": (width, height)}


def contact_sheet(level1: Image.Image, level2: Image.Image) -> None:
    target_h = 1480
    panels = []
    for panel in (level1, level2):
        ratio = target_h / panel.height
        panels.append(panel.resize((round(panel.width * ratio), target_h), Image.Resampling.LANCZOS))
    width = sum(panel.width for panel in panels) + 90
    sheet = Image.new("RGB", (width, target_h + 130), (8, 11, 15))
    draw = ImageDraw.Draw(sheet)
    draw.text((30, 24), "UNDERGROUND ART-DIRECTION APPROVAL • L1 0–2,000m / L2 0–5,000m", font=font(30, True), fill="white")
    x = 30
    for panel in panels:
        sheet.paste(panel, (x, 100))
        x += panel.width + 30
    sheet.save(CONTACT_OUTPUT, optimize=True)


def main() -> None:
    Image.MAX_IMAGE_PIXELS = None
    width, height, gids = decode_tmx()
    level1 = annotate_concept(LEVEL1_SOURCE, LEVEL1_OUTPUT, PREPARED_DEPTH, LEVEL1_BANDS, "LEVEL 1 • COMPLETE 0–2,000m")
    level2 = annotate_concept(LEVEL2_SOURCE, LEVEL2_OUTPUT, FUTURE_LEVEL2_DEPTH, LEVEL2_BANDS, "LEVEL 2 • CURRENT + FUTURE 0–5,000m")
    stats = draw_blueprint(width, height, gids)
    contact_sheet(level1, level2)
    for output in (LEVEL1_OUTPUT, LEVEL2_OUTPUT, BLUEPRINT_OUTPUT, CONTACT_OUTPUT):
        print(f"Built {output}")
    print(stats)


if __name__ == "__main__":
    main()
