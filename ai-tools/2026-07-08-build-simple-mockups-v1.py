from __future__ import annotations
import json
import math
import random
import xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "exports/ai-enhanced/v7-30-runtime-preview/2026-07-08-simple-mockups-v1"
WORLD_TMX = ROOT / "exports/dig-game-world-edit-v-7-30-06-2026-;layered.tmx"
PALETTE_DIR = ROOT / "exports/pallet-v9/dig_game_empty_backgrounds_and_separate_props_v1"
PALETTE_TMX = PALETTE_DIR / "dig-game-empty-backgrounds-and-separate-props-v1.tmx"
PROP_TSX = PALETTE_DIR / "dig-game-clean-props-v1.tsx"
BG_TSX = PALETTE_DIR / "dig-game-empty-background-strips-v1.tsx"
TILE = 94
PROP_CELL = (303, 313)
INK = (230, 236, 224, 255)
LABEL = (210, 219, 220, 255)
PROP_BASE = "exports/pallet-v9/dig_game_empty_backgrounds_and_separate_props_v1/sprites/props/near_props_seam_breakers/"
TILE_DEFS = [
    ("dirt", "sprites/tiles/dynamic-soil/bases/soil-000-200-v1.webp", "dirt"),
    ("stone/resource", "sprites/tiles/tiles-under-1000/resource-stone-tile/5-of-5-hp.webp", "stone"),
    ("deep soil", "sprites/tiles/dynamic-soil/deep-bases/deep-soil-1000-1200-v1.png", "deep"),
    ("cracked dirt", "sprites/tiles/tiles-under-1000/dirt-tiles/2-of-5-hp.webp", "cracked"),
    ("special block", "sprites/tiles/special-tiles-v2/gempower-block.webp", "special"),
]
PROP_DEFS = [
    ("storm seam breaker", PROP_BASE + "irradiated_storm_surface__l11__15.png", "spore"),
    ("root cavern pillar", PROP_BASE + "bioluminescent_root_caverns__l11__11.png", "root"),
    ("frozen prism shard", PROP_BASE + "frozen_prism_abyss__l11__13.png", "prism"),
    ("magma vent face", PROP_BASE + "industrial_magma_sanctum__l11__13.png", "magma"),
    ("void eye relic", PROP_BASE + "void_realm__l11__16.png", "void"),
    ("cave stalagmite set", PROP_BASE + "cave_biome__l11__14.png", "cave"),
    ("deep cave crystal", PROP_BASE + "deep_cave_biome__l11__07.png", "deep"),
    ("bio lantern mass", PROP_BASE + "bioluminescent_root_caverns__l11__15.png", "bio"),
]
def fnt(size=14):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default()
def label(draw, xy, value, fill=LABEL, size=14):
    draw.text(xy, value, fill=fill, font=fnt(size))
def bbox(img):
    return img.getchannel("A").point(lambda a: 255 if a > 12 else 0).getbbox()
def checker(size, step=16):
    img = Image.new("RGBA", size, (30, 32, 36, 255))
    draw = ImageDraw.Draw(img)
    for y in range(0, size[1], step):
        for x in range(0, size[0], step):
            fill = (50, 54, 58, 255) if ((x // step) + (y // step)) % 2 else (88, 92, 96, 255)
            draw.rectangle((x, y, x + step - 1, y + step - 1), fill=fill)
    return img
def load_img(rel, fallback_size=(94, 94)):
    path = ROOT / rel
    if path.exists():
        return Image.open(path).convert("RGBA")
    img = Image.new("RGBA", fallback_size, (35, 28, 38, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, fallback_size[0] - 1, fallback_size[1] - 1), outline=(220, 80, 150, 255), width=3)
    label(draw, (6, 8), "missing", (255, 160, 210, 255), 13)
    return img
def fit(img, size, pad=0, anchor="center"):
    box = bbox(img) or (0, 0, img.width, img.height)
    crop = img.crop(box)
    scale = min((size[0] - pad * 2) / crop.width, (size[1] - pad * 2) / crop.height)
    new_size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
    resized = crop.resize(new_size, Image.Resampling.LANCZOS)
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    x = (size[0] - resized.width) // 2
    y = (size[1] - resized.height) // 2 if anchor == "center" else size[1] - pad - resized.height
    out.alpha_composite(resized, (x, y))
    return out
def leak_metrics(img):
    pix = img.convert("RGBA").load()
    w, h = img.size
    border = opaque = green = grey = corners = 0
    for y in range(h):
        for x in range(w):
            if 4 <= x < w - 4 and 4 <= y < h - 4:
                continue
            r, g, b, a = pix[x, y]
            border += 1
            if a <= 12:
                continue
            opaque += 1
            green += 1 if g > 70 and g > r * 1.25 and g > b * 1.18 else 0
            grey += 1 if abs(r - g) <= 10 and abs(g - b) <= 10 and 55 <= r <= 225 else 0
    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        corners += 1 if pix[x, y][3] <= 12 else 0
    return {
        "alphaCornersTransparent": corners == 4,
        "borderOpaquePct": round(opaque / max(1, border), 4),
        "borderGreenPct": round(green / max(1, border), 4),
        "borderGreyPct": round(grey / max(1, border), 4),
        "bbox": bbox(img),
    }
def map_facts():
    world = ET.parse(WORLD_TMX).getroot()
    prop = ET.parse(PROP_TSX).getroot()
    bg = ET.parse(BG_TSX).getroot()
    return {
        "worldTmx": str(WORLD_TMX.relative_to(ROOT)),
        "paletteTmx": str(PALETTE_TMX.relative_to(ROOT)),
        "worldGrid": [int(world.get("tilewidth")), int(world.get("tileheight"))],
        "worldTiles": [int(world.get("width")), int(world.get("height"))],
        "propCell": [int(prop.get("tilewidth")), int(prop.get("tileheight"))],
        "backgroundStripCell": [int(bg.get("tilewidth")), int(bg.get("tileheight"))],
        "propTileCount": int(prop.get("tilecount")),
        "backgroundStripCount": int(bg.get("tilecount")),
    }
def draw_tile(kind, seed):
    rnd = random.Random(seed)
    ramps = {
        "dirt": ((117, 73, 42), (160, 102, 56)),
        "stone": ((82, 88, 93), (142, 150, 154)),
        "deep": ((44, 35, 63), (105, 75, 126)),
        "cracked": ((112, 62, 40), (178, 96, 52)),
        "special": ((36, 58, 73), (38, 152, 171)),
    }
    low, high = ramps[kind]
    img = Image.new("RGBA", (TILE, TILE), low + (255,))
    draw = ImageDraw.Draw(img)
    for y in range(TILE):
        t = y / (TILE - 1)
        draw.line((0, y, TILE, y), fill=tuple(round(low[i] * (1 - t) + high[i] * t) for i in range(3)) + (255,))
    draw.rectangle((0, 0, TILE - 1, TILE - 1), outline=(20, 22, 24, 255), width=2)
    for _ in range(18):
        x, y = rnd.randrange(5, 88), rnd.randrange(7, 88)
        col = (210, 152, 82, 120) if kind == "dirt" else (210, 235, 235, 120)
        draw.ellipse((x - 1, y - 1, x + 2, y + 2), fill=col)
    if kind in {"stone", "deep"}:
        for _ in range(7):
            x, y = rnd.randrange(8, 80), rnd.randrange(12, 78)
            col = (218, 172, 82, 190) if kind == "stone" else (109, 230, 224, 190)
            draw.polygon([(x, y - 5), (x + 5, y), (x, y + 6), (x - 5, y)], fill=col, outline=(22, 25, 28, 190))
    if kind == "cracked":
        for pts in [[(24, 7), (35, 29), (31, 52), (43, 86)], [(72, 13), (57, 36), (62, 60), (51, 88)]]:
            draw.line(pts, fill=(255, 218, 131, 255), width=4, joint="curve")
            draw.line(pts, fill=(55, 24, 18, 255), width=1)
    if kind == "special":
        draw.rounded_rectangle((14, 14, 80, 80), radius=10, fill=(23, 42, 55, 255), outline=(142, 246, 239, 255), width=3)
        draw.ellipse((31, 27, 63, 59), outline=(255, 226, 119, 255), width=4)
        draw.line((47, 19, 47, 75), fill=(102, 238, 226, 255), width=2)
    return img
def draw_prop(style):
    img = Image.new("RGBA", PROP_CELL, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, ground = PROP_CELL[0] // 2, PROP_CELL[1] - 24
    palettes = {
        "spore": ((74, 194, 149), (249, 189, 84)),
        "root": ((117, 76, 45), (91, 187, 134)),
        "prism": ((105, 204, 241), (225, 246, 255)),
        "magma": ((204, 70, 31), (255, 195, 72)),
        "void": ((118, 89, 207), (237, 210, 255)),
        "cave": ((112, 120, 118), (205, 178, 128)),
        "deep": ((77, 58, 112), (102, 238, 214)),
        "bio": ((57, 148, 116), (172, 255, 160)),
    }
    dark, light = palettes[style]
    draw.line((cx, 78, cx, ground), fill=dark + (255,), width=14)
    if style == "root":
        draw.arc((48, 40, 255, 268), 180, 360, fill=dark + (255,), width=18)
        draw.arc((76, 74, 228, 286), 180, 360, fill=light + (210,), width=5)
    elif style == "spore":
        draw.ellipse((76, 50, 228, 132), fill=dark + (255,), outline=light + (255,), width=5)
        for x in [103, 132, 164, 193]:
            draw.ellipse((x, 74, x + 13, 88), fill=light + (230,))
    elif style == "prism":
        for x, h in [(95, 132), (133, 190), (172, 150)]:
            draw.polygon([(x, ground), (x + 24, ground - h), (x + 48, ground)], fill=dark + (245,), outline=light + (255,))
    elif style == "magma":
        draw.rounded_rectangle((78, 112, 226, ground), radius=16, fill=(58, 50, 48, 255), outline=light + (255,), width=4)
        for x in [104, 143, 181]:
            draw.line((x, 130, x + 12, ground - 16), fill=light + (255,), width=5)
    elif style == "void":
        draw.ellipse((83, 70, 221, 205), outline=light + (255,), width=12)
        draw.ellipse((122, 109, 182, 168), fill=dark + (255,), outline=(255, 255, 255, 230), width=3)
    elif style == "cave":
        for x in range(74, 228, 28):
            draw.rounded_rectangle((x, 82 + (x % 3) * 8, x + 18, ground), radius=8, fill=dark + (255,), outline=light + (190,))
    else:
        draw.ellipse((84, 86, 219, 210), fill=dark + (255,), outline=light + (255,), width=5)
        draw.rectangle((114, 198, 190, ground), fill=dark + (255,), outline=light + (220,), width=3)
    draw.ellipse((76, ground - 8, 228, ground + 8), fill=(26, 30, 32, 210))
    return img
def framed(sheet, cell, x, y, title, generated=False):
    draw = ImageDraw.Draw(sheet)
    bg = checker(cell.size)
    bg.alpha_composite(cell)
    sheet.alpha_composite(bg, (x, y))
    draw.rectangle((x, y, x + cell.width - 1, y + cell.height - 1), outline=(96, 118, 126, 255), width=1)
    for gx in range(x, x + cell.width, TILE):
        draw.line((gx, y, gx, y + cell.height), fill=(255, 255, 255, 48))
    for gy in range(y, y + cell.height, TILE):
        draw.line((x, gy, x + cell.width, gy), fill=(255, 255, 255, 48))
    box = bbox(cell)
    if box:
        color = (96, 235, 180, 255) if generated else (255, 210, 90, 255)
        draw.rectangle((box[0] + x, box[1] + y, box[2] + x, box[3] + y), outline=color, width=2)
    label(draw, (x, y - 20), title, size=13)
def tile_sheet():
    sheet = Image.new("RGBA", (1280, 430), (20, 23, 27, 255))
    draw = ImageDraw.Draw(sheet)
    label(draw, (22, 18), "01 tile style proof - current vs generated, fixed 94 x 94 grid", INK, 20)
    for i, (name, src, kind) in enumerate(TILE_DEFS):
        x = 36 + i * 244
        current = fit(load_img(src), (TILE, TILE))
        generated = draw_tile(kind, 100 + i)
        framed(sheet, current, x, 82, "current")
        framed(sheet, generated, x + 116, 82, "generated", True)
        label(draw, (x, 210), name, INK, 14)
        for yy in range(260, 354, TILE):
            for xx in range(x, x + 188, TILE):
                sheet.alpha_composite(generated if xx // TILE % 2 else current, (xx, yy))
                draw.rectangle((xx, yy, xx + TILE - 1, yy + TILE - 1), outline=(255, 255, 255, 50))
    return sheet
def prop_sheet():
    block_w, block_h = 690, 388
    sheet = Image.new("RGBA", (1416, math.ceil(len(PROP_DEFS) / 2) * block_h + 82), (19, 22, 26, 255))
    draw = ImageDraw.Draw(sheet)
    label(draw, (22, 18), "02 prop forward-facing proof - 303 x 313 transparent cells", INK, 20)
    generated = []
    for i, (name, src, style) in enumerate(PROP_DEFS):
        bx, by = 22 + (i % 2) * block_w, 70 + (i // 2) * block_h
        current = fit(load_img(src, PROP_CELL), PROP_CELL, 12, "bottom")
        new_cell = draw_prop(style)
        generated.append((name, new_cell))
        label(draw, (bx, by), name, INK, 14)
        framed(sheet, current, bx, by + 30, "current")
        framed(sheet, new_cell, bx + 337, by + 30, "generated", True)
    return sheet, generated
def world_context():
    panel_w, panel_h = 7 * TILE, 5 * TILE
    sheet = Image.new("RGBA", (1410, panel_h + 132), (17, 20, 24, 255))
    draw = ImageDraw.Draw(sheet)
    label(draw, (24, 18), "03 world context proof - same 94px grid, generated art placed on ground", INK, 20)
    for panel, title in enumerate(["current v7-30 source slice", "generated simple mockup"]):
        ox, oy = 32 + panel * (panel_w + 30), 76
        draw.rectangle((ox, oy, ox + panel_w, oy + panel_h), fill=(39, 35, 46, 255), outline=(120, 138, 146, 255))
        label(draw, (ox, oy - 22), title, size=14)
        for y in range(5):
            for x in range(7):
                idx = 0 if y < 2 else min(len(TILE_DEFS) - 1, y)
                tile = fit(load_img(TILE_DEFS[idx][1]), (TILE, TILE)) if panel == 0 else draw_tile(TILE_DEFS[idx][2], 800 + x * 17 + y)
                sheet.alpha_composite(tile, (ox + x * TILE, oy + y * TILE))
                draw.rectangle((ox + x * TILE, oy + y * TILE, ox + (x + 1) * TILE, oy + (y + 1) * TILE), outline=(255, 255, 255, 42))
        for n, xcell in enumerate([1, 3, 5]):
            _, src, style = PROP_DEFS[n * 2]
            prop = fit(load_img(src, PROP_CELL), (126, 150), 4, "bottom") if panel == 0 else fit(draw_prop(style), (126, 150), 4, "bottom")
            sheet.alpha_composite(prop, (ox + xcell * TILE - 16, oy + panel_h - 150))
    return sheet
def write_text_files(generated_props, sheets):
    qa_props = []
    for name, img in generated_props:
        metrics = leak_metrics(img)
        box = metrics["bbox"]
        ok = bool(box and box[0] > 8 and box[1] > 8 and box[2] < PROP_CELL[0] - 8 and box[3] < PROP_CELL[1] - 8)
        qa_props.append({"label": name, "size": list(img.size), **{k: v for k, v in metrics.items() if k != "bbox"}, "bbox": list(box), "bboxInsidePadding": ok})
    outputs = ["01-tile-style-proof.png", "02-prop-forward-facing-proof.png", "03-world-context-proof.png"]
    manifest = {
        "purpose": "preview-only simple mockup gate before bulk regeneration",
        "facts": map_facts(),
        "outputs": outputs,
        "tileSources": [{"label": a, "source": b, "generatedKind": c, "grid": [TILE, TILE]} for a, b, c in TILE_DEFS],
        "propSources": [{"label": a, "source": b, "generatedStyle": c, "cell": list(PROP_CELL)} for a, b, c in PROP_DEFS],
        "runtimeWiringChanged": False,
        "activeTmxChanged": False,
        "bulkGenerationStarted": False,
    }
    qa = {"gridContracts": {"tile": [TILE, TILE], "propCell": list(PROP_CELL)}, "generatedPropChecks": qa_props, "sheetSizes": dict(zip(outputs, [list(s.size) for s in sheets])), "passed": all(p["alphaCornersTransparent"] and p["borderGreenPct"] == 0 and p["borderGreyPct"] == 0 and p["bboxInsidePadding"] for p in qa_props)}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (OUT / "qa-report.json").write_text(json.dumps(qa, indent=2), encoding="utf-8")
    (OUT / "readme.md").write_text("# 2026-07-08 Simple Mockups v1\n\nPreview-only proof sheets for v7-30 visual regeneration. These files do not alter runtime loaders, active TMX files, or source assets.\n\n- `01-tile-style-proof.png`: fixed 94 x 94 terrain proof.\n- `02-prop-forward-facing-proof.png`: 303 x 313 transparent prop-cell proof.\n- `03-world-context-proof.png`: static scale/context proof on a 94px grid.\n- `manifest.json` and `qa-report.json`: source paths, grid contracts, and alpha/leak checks.\n", encoding="utf-8")
    return manifest, qa
def main():
    OUT.mkdir(parents=True, exist_ok=True)
    first = tile_sheet()
    second, generated_props = prop_sheet()
    third = world_context()
    for name, img in zip(["01-tile-style-proof.png", "02-prop-forward-facing-proof.png", "03-world-context-proof.png"], [first, second, third]):
        img.save(OUT / name)
    manifest, qa = write_text_files(generated_props, [first, second, third])
    print(json.dumps({"out": str(OUT), "outputs": manifest["outputs"], "qaPassed": qa["passed"]}, indent=2))
if __name__ == "__main__":
    main()
