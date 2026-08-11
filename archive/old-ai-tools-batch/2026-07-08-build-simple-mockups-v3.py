from __future__ import annotations

import base64, json, math, struct, zlib
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "exports/ai-enhanced/v7-30-runtime-preview/2026-07-08-simple-mockups-v3"
WORLD_TMX = ROOT / "exports/dig-game-world-edit-v-7-30-06-2026-;layered.tmx"
PALETTE_DIR = ROOT / "exports/pallet-v9/dig_game_empty_backgrounds_and_separate_props_v1"
PALETTE_TMX = PALETTE_DIR / "dig-game-empty-backgrounds-and-separate-props-v1.tmx"
PROP_TSX = PALETTE_DIR / "dig-game-clean-props-v1.tsx"
BG_TSX = PALETTE_DIR / "dig-game-empty-background-strips-v1.tsx"
TILE_CONCEPT = OUT / "source-generated-tile-concept.png"
PROP_CONCEPT = OUT / "source-generated-prop-concept.png"
TILE = 94
PROP_CELL = (303, 313)
INK = (232, 239, 230, 255)
MUTED = (170, 184, 186, 255)

TILE_DEFS = [
    ("dirt", "sprites/tiles/dynamic-soil/bases/soil-000-200-v1.webp"),
    ("ore stone", "sprites/tiles/tiles-under-1000/resource-stone-tile/5-of-5-hp.webp"),
    ("deep soil", "sprites/tiles/dynamic-soil/deep-bases/deep-soil-1000-1200-v1.png"),
    ("cracked dirt", "sprites/tiles/tiles-under-1000/dirt-tiles/2-of-5-hp.webp"),
    ("gem power block", "sprites/tiles/special-tiles-v2/gempower-block.webp"),
]
PROP_DEFS = [
    ("storm bridge", "irradiated_storm_surface__l11__15.png"),
    ("root lantern", "bioluminescent_root_caverns__l11__11.png"),
    ("frozen gate", "frozen_prism_abyss__l11__13.png"),
    ("magma reactor", "industrial_magma_sanctum__l11__13.png"),
    ("void eye altar", "void_realm__l11__16.png"),
    ("crystal cart", "cave_biome__l11__14.png"),
    ("deep portal", "deep_cave_biome__l11__07.png"),
    ("bio mushrooms", "bioluminescent_root_caverns__l11__15.png"),
]
PROP_BASE = "exports/pallet-v9/dig_game_empty_backgrounds_and_separate_props_v1/sprites/props/near_props_seam_breakers"

def fnt(size=14):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default()
def txt(draw, xy, value, fill=MUTED, size=14):
    draw.text(xy, value, fill=fill, font=fnt(size))
def abox(img, cut=12):
    return img.getchannel("A").point(lambda a: 255 if a > cut else 0).getbbox()
def checker(size, step=16):
    img = Image.new("RGBA", size, (30, 33, 36, 255))
    draw = ImageDraw.Draw(img)
    for y in range(0, size[1], step):
        for x in range(0, size[0], step):
            fill = (64, 69, 72, 255) if ((x // step) + (y // step)) % 2 else (94, 99, 101, 255)
            draw.rectangle((x, y, x + step - 1, y + step - 1), fill=fill)
    return img
def load_rel(rel, fallback):
    path = ROOT / rel
    if path.exists():
        return Image.open(path).convert("RGBA")
    img = Image.new("RGBA", fallback, (76, 31, 76, 255))
    ImageDraw.Draw(img).rectangle((1, 1, fallback[0] - 2, fallback[1] - 2), outline=(255, 80, 180, 255), width=3)
    return img
def fit(img, size, pad=0, anchor="center"):
    box = abox(img) or (0, 0, img.width, img.height)
    crop = img.crop(box)
    scale = min((size[0] - pad * 2) / crop.width, (size[1] - pad * 2) / crop.height)
    resized = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    x = (size[0] - resized.width) // 2
    y = (size[1] - resized.height) // 2 if anchor == "center" else size[1] - pad - resized.height
    out.alpha_composite(resized, (x, y))
    return out
def dark_bbox(img, limit=32):
    rgb = img.convert("RGB")
    pix = rgb.load()
    xs, ys = [], []
    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = pix[x, y]
            if max(r, g, b) > limit or max(r, g, b) - min(r, g, b) > 22:
                xs.append(x)
                ys.append(y)
    if not xs:
        return (0, 0, img.width, img.height)
    return (max(0, min(xs) - 3), max(0, min(ys) - 3), min(img.width, max(xs) + 4), min(img.height, max(ys) + 4))
def square_to_tile(img):
    crop = img.crop(dark_bbox(img))
    side = max(crop.width, crop.height)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 255))
    sq.alpha_composite(crop.convert("RGBA"), ((side - crop.width) // 2, (side - crop.height) // 2))
    return sq.resize((TILE, TILE), Image.Resampling.LANCZOS)
def dark_to_alpha(img):
    img = img.convert("RGBA")
    pix = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pix[x, y]
            mx, mn = max(r, g, b), min(r, g, b)
            sat = mx - mn
            if (mx < 32 and sat < 24) or (mx < 54 and sat < 12):
                pix[x, y] = (r, g, b, 0)
    return img
def crop_generated_tiles():
    img = Image.open(TILE_CONCEPT).convert("RGBA")
    bands = [(0.015, 0.23), (0.215, 0.395), (0.415, 0.59), (0.61, 0.785), (0.805, 0.985)]
    y0, y1 = round(img.height * 0.20), round(img.height * 0.80)
    return [square_to_tile(img.crop((round(img.width * a), y0, round(img.width * b), y1))) for a, b in bands]
def crop_generated_props():
    img = Image.open(PROP_CONCEPT).convert("RGBA")
    boxes = [
        (0.000, 0.105, 0.250, 0.485),
        (0.285, 0.040, 0.470, 0.490),
        (0.520, 0.040, 0.720, 0.500),
        (0.785, 0.035, 0.975, 0.495),
        (0.030, 0.515, 0.240, 0.930),
        (0.270, 0.525, 0.490, 0.930),
        (0.515, 0.515, 0.745, 0.945),
        (0.770, 0.515, 0.995, 0.955),
    ]
    cells = []
    for x0, y0, x1, y1 in boxes:
        crop = img.crop((round(img.width * x0), round(img.height * y0), round(img.width * x1), round(img.height * y1)))
        cells.append(fit(dark_to_alpha(crop), PROP_CELL, 16, "bottom"))
    return cells
def frame(sheet, cell, x, y, title, candidate=False):
    draw = ImageDraw.Draw(sheet)
    bg = checker(cell.size)
    bg.alpha_composite(cell)
    sheet.alpha_composite(bg, (x, y))
    draw.rectangle((x, y, x + cell.width - 1, y + cell.height - 1), outline=(112, 130, 136, 255), width=1)
    for gx in range(x, x + cell.width + 1, TILE):
        draw.line((gx, y, gx, y + cell.height), fill=(255, 255, 255, 46))
    for gy in range(y, y + cell.height + 1, TILE):
        draw.line((x, gy, x + cell.width, gy), fill=(255, 255, 255, 46))
    box = abox(cell)
    if box:
        color = (85, 246, 175, 255) if candidate else (255, 211, 91, 255)
        draw.rectangle((x + box[0], y + box[1], x + box[2], y + box[3]), outline=color, width=2)
    txt(draw, (x, y - 19), title, size=13)
def build_tile_sheet(tiles):
    sheet = Image.new("RGBA", (1320, 430), (16, 19, 23, 255))
    draw = ImageDraw.Draw(sheet)
    txt(draw, (22, 18), "01 tile style proof v3 - imagegen style target cut to exact 94 x 94 cells", INK, 20)
    for i, (name, src) in enumerate(TILE_DEFS):
        x = 36 + i * 254
        current = fit(load_rel(src, (TILE, TILE)), (TILE, TILE))
        frame(sheet, current, x, 76, "current")
        frame(sheet, tiles[i], x + 116, 76, "v3")
        txt(draw, (x, 192), name, INK, 14)
        for yy in range(246, 246 + TILE * 2, TILE):
            for xx in range(x, x + TILE * 2, TILE):
                sheet.alpha_composite(tiles[i], (xx, yy))
                draw.rectangle((xx, yy, xx + TILE - 1, yy + TILE - 1), outline=(255, 255, 255, 42))
    return sheet


def build_prop_sheet(props):
    rows = math.ceil(len(PROP_DEFS) / 2)
    sheet = Image.new("RGBA", (1410, rows * 390 + 84), (16, 19, 23, 255))
    draw = ImageDraw.Draw(sheet)
    txt(draw, (22, 18), "02 prop forward-facing proof v3 - 303 x 313 transparent cells, no angled perspective", INK, 20)
    for i, ((name, file_name), cell) in enumerate(zip(PROP_DEFS, props)):
        x, y = 22 + (i % 2) * 690, 74 + (i // 2) * 390
        current = fit(load_rel(f"{PROP_BASE}/{file_name}", PROP_CELL), PROP_CELL, 16, "bottom")
        txt(draw, (x, y - 26), name, INK, 14)
        frame(sheet, current, x, y, "current")
        frame(sheet, cell, x + 337, y, "v3")
    return sheet


def real_layer_sample():
    root = ET.parse(WORLD_TMX).getroot()
    layer = next(item for item in root.findall("layer") if item.get("name") == "00_PAINT_HERE_tile_types")
    w, h = int(layer.get("width")), int(layer.get("height"))
    data = (layer.find("data").text or "").strip()
    raw = zlib.decompress(base64.b64decode(data))
    gids = list(struct.unpack("<" + "I" * (len(raw) // 4), raw))
    best = (None, -1)
    for y in range(0, h - 5, 8):
        for x in range(0, w - 7, 8):
            cells = [gids[(y + yy) * w + x + xx] for yy in range(5) for xx in range(7)]
            nonzero = [c for c in cells if c]
            score = len(nonzero) * 3 + len(set(nonzero))
            if score > best[1]:
                best = ((x, y, cells), score)
    return w, h, best[0]


def tile_index(gid):
    if gid == 0:
        return None
    return (gid - 1) % len(TILE_DEFS)


def build_world_context(tiles, props):
    _, _, sample = real_layer_sample()
    sx, sy, cells = sample
    panel_w, panel_h = 7 * TILE, 5 * TILE
    sheet = Image.new("RGBA", (1410, panel_h + 138), (15, 18, 22, 255))
    draw = ImageDraw.Draw(sheet)
    txt(draw, (24, 18), f"03 world context proof v3 - real v7-30 layer slice at tile {sx},{sy}", INK, 20)
    current_tiles = [fit(load_rel(src, (TILE, TILE)), (TILE, TILE)) for _, src in TILE_DEFS]
    for panel, title in enumerate(["current source classification", "v3 regenerated mockup"]):
        ox, oy = 32 + panel * (panel_w + 34), 76
        draw.rectangle((ox, oy, ox + panel_w, oy + panel_h), fill=(28, 31, 38, 255), outline=(115, 132, 138, 255))
        txt(draw, (ox, oy - 22), title, size=14)
        for yy in range(5):
            for xx in range(7):
                idx = tile_index(cells[yy * 7 + xx])
                if idx is not None:
                    img = current_tiles[idx] if panel == 0 else tiles[idx]
                    sheet.alpha_composite(img, (ox + xx * TILE, oy + yy * TILE))
                draw.rectangle((ox + xx * TILE, oy + yy * TILE, ox + (xx + 1) * TILE, oy + (yy + 1) * TILE), outline=(255, 255, 255, 44))
        for n, xcell in enumerate([1, 3, 5]):
            if panel == 0:
                file_name = PROP_DEFS[n * 2][1]
                prop = fit(load_rel(f"{PROP_BASE}/{file_name}", PROP_CELL), (136, 150), 5, "bottom")
            else:
                prop = fit(props[n * 2], (136, 150), 5, "bottom")
            sheet.alpha_composite(prop, (ox + xcell * TILE - 20, oy + panel_h - 150))
    return sheet


def map_facts():
    world = ET.parse(WORLD_TMX).getroot()
    prop_tsx = ET.parse(PROP_TSX).getroot()
    bg_tsx = ET.parse(BG_TSX).getroot()
    return {
        "worldTmx": str(WORLD_TMX.relative_to(ROOT)),
        "paletteTmx": str(PALETTE_TMX.relative_to(ROOT)),
        "worldGrid": [int(world.get("tilewidth")), int(world.get("tileheight"))],
        "worldTiles": [int(world.get("width")), int(world.get("height"))],
        "propCell": [int(prop_tsx.get("tilewidth")), int(prop_tsx.get("tileheight"))],
        "backgroundStripCell": [int(bg_tsx.get("tilewidth")), int(bg_tsx.get("tileheight"))],
        "sourceConceptSizes": {"tiles": list(Image.open(TILE_CONCEPT).size), "props": list(Image.open(PROP_CONCEPT).size)},
    }


def prop_checks(props):
    checks = []
    for (name, _), img in zip(PROP_DEFS, props):
        pix = img.load()
        corners = all(pix[x, y][3] <= 12 for x, y in [(0, 0), (302, 0), (0, 312), (302, 312)])
        box = abox(img) or (0, 0, 0, 0)
        inside = box[0] > 4 and box[1] > 4 and box[2] < 299 and box[3] < 309
        checks.append({"label": name, "size": list(img.size), "alphaCornersTransparent": corners, "bbox": list(box), "bboxInsidePadding": inside})
    return checks


def write_reports(tiles, props, sheets):
    outputs = ["01-tile-style-proof.png", "02-prop-forward-facing-proof.png", "03-world-context-proof.png"]
    checks = prop_checks(props)
    manifest = {
        "purpose": "v3 redo using generated style-target concepts after v1/v2 were not acceptable",
        "gridContracts": {"gameplayTile": [TILE, TILE], "propCell": list(PROP_CELL)},
        "facts": map_facts(),
        "outputs": outputs,
        "runtimeWiringChanged": False,
        "activeTmxChanged": False,
        "bulkGenerationStarted": False,
        "tileSources": [{"label": n, "source": s} for n, s in TILE_DEFS],
        "propSources": [{"label": n, "source": f"{PROP_BASE}/{f}"} for n, f in PROP_DEFS],
    }
    qa = {
        "tileCellSizes": [list(img.size) for img in tiles],
        "generatedPropChecks": checks,
        "sheetSizes": dict(zip(outputs, [list(s.size) for s in sheets])),
        "passed": all(img.size == (TILE, TILE) for img in tiles) and all(c["alphaCornersTransparent"] and c["bboxInsidePadding"] for c in checks),
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (OUT / "qa-report.json").write_text(json.dumps(qa, indent=2), encoding="utf-8")
    (OUT / "readme.md").write_text(
        "# 2026-07-08 Simple Mockups v3\n\nPreview-only redo using generated concept sources copied into this folder. No runtime files, loader overrides, active TMX files, or source assets are changed.\n\n- `01-tile-style-proof.png`: exact 94 x 94 tile style proof.\n- `02-prop-forward-facing-proof.png`: exact 303 x 313 transparent front-facing prop proof.\n- `03-world-context-proof.png`: v7-30 TMX layer slice with current-vs-v3 scale context.\n",
        encoding="utf-8",
    )
    return manifest, qa


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    tiles = crop_generated_tiles()
    props = crop_generated_props()
    sheets = [build_tile_sheet(tiles), build_prop_sheet(props), build_world_context(tiles, props)]
    for name, img in zip(["01-tile-style-proof.png", "02-prop-forward-facing-proof.png", "03-world-context-proof.png"], sheets):
        img.save(OUT / name)
    manifest, qa = write_reports(tiles, props, sheets)
    print(json.dumps({"out": str(OUT), "outputs": manifest["outputs"], "qaPassed": qa["passed"]}, indent=2))


if __name__ == "__main__":
    main()
