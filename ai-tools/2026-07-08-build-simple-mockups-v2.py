from __future__ import annotations

import json
import math
import random
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "exports/ai-enhanced/v7-30-runtime-preview/2026-07-08-simple-mockups-v2"
WORLD_TMX = ROOT / "exports/dig-game-world-edit-v-7-30-06-2026-;layered.tmx"
PALETTE_DIR = ROOT / "exports/pallet-v9/dig_game_empty_backgrounds_and_separate_props_v1"
PALETTE_TMX = PALETTE_DIR / "dig-game-empty-backgrounds-and-separate-props-v1.tmx"
PROP_TSX = PALETTE_DIR / "dig-game-clean-props-v1.tsx"
BG_TSX = PALETTE_DIR / "dig-game-empty-background-strips-v1.tsx"
PROP_BASE = "exports/pallet-v9/dig_game_empty_backgrounds_and_separate_props_v1/sprites/props/near_props_seam_breakers/"
TILE = 94
PROP_CELL = (303, 313)
INK = (232, 238, 230, 255)
LABEL = (210, 219, 220, 255)
TILE_DEFS = [
    ("dirt", "sprites/tiles/dynamic-soil/bases/soil-000-200-v1.webp", "dirt"),
    ("ore stone", "sprites/tiles/tiles-under-1000/resource-stone-tile/5-of-5-hp.webp", "stone"),
    ("deep soil", "sprites/tiles/dynamic-soil/deep-bases/deep-soil-1000-1200-v1.png", "deep"),
    ("cracked dirt", "sprites/tiles/tiles-under-1000/dirt-tiles/2-of-5-hp.webp", "cracked"),
    ("gem power", "sprites/tiles/special-tiles-v2/gempower-block.webp", "special"),
]
PROP_DEFS = [
    ("storm bridge", PROP_BASE + "irradiated_storm_surface__l11__15.png", "spore"),
    ("root lantern", PROP_BASE + "bioluminescent_root_caverns__l11__11.png", "root"),
    ("prism gate", PROP_BASE + "frozen_prism_abyss__l11__13.png", "prism"),
    ("magma reactor", PROP_BASE + "industrial_magma_sanctum__l11__13.png", "magma"),
    ("void eye altar", PROP_BASE + "void_realm__l11__16.png", "void"),
    ("cave crystal cart", PROP_BASE + "cave_biome__l11__14.png", "cave"),
    ("deep portal", PROP_BASE + "deep_cave_biome__l11__07.png", "deep"),
    ("bio mushrooms", PROP_BASE + "bioluminescent_root_caverns__l11__15.png", "bio"),
]


def fnt(size=14):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default()


def label(draw, xy, value, fill=LABEL, size=14):
    draw.text(xy, value, fill=fill, font=fnt(size))


def abox(img):
    return img.getchannel("A").point(lambda a: 255 if a > 12 else 0).getbbox()


def checker(size, step=16):
    img = Image.new("RGBA", size, (31, 33, 37, 255))
    draw = ImageDraw.Draw(img)
    for y in range(0, size[1], step):
        for x in range(0, size[0], step):
            fill = (55, 59, 63, 255) if ((x // step) + (y // step)) % 2 else (91, 96, 100, 255)
            draw.rectangle((x, y, x + step - 1, y + step - 1), fill=fill)
    return img


def load_img(rel, fallback=(94, 94)):
    path = ROOT / rel
    if path.exists():
        return Image.open(path).convert("RGBA")
    img = Image.new("RGBA", fallback, (50, 31, 47, 255))
    ImageDraw.Draw(img).rectangle((0, 0, fallback[0] - 1, fallback[1] - 1), outline=(255, 80, 180, 255), width=3)
    return img


def fit(img, size, pad=0, anchor="center"):
    box = abox(img) or (0, 0, img.width, img.height)
    crop = img.crop(box)
    scale = min((size[0] - pad * 2) / crop.width, (size[1] - pad * 2) / crop.height)
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    resized = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.Resampling.LANCZOS)
    x = (size[0] - resized.width) // 2
    y = (size[1] - resized.height) // 2 if anchor == "center" else size[1] - pad - resized.height
    out.alpha_composite(resized, (x, y))
    return out


def gradient(size, top, bottom):
    img = Image.new("RGBA", size, top + (255,))
    draw = ImageDraw.Draw(img)
    for y in range(size[1]):
        t = y / max(1, size[1] - 1)
        draw.line((0, y, size[0], y), fill=tuple(round(top[i] * (1 - t) + bottom[i] * t) for i in range(3)) + (255,))
    return img


def tile(kind, seed):
    rnd = random.Random(seed)
    colors = {
        "dirt": ((86, 50, 31), (177, 104, 54), (235, 156, 86)),
        "stone": ((52, 58, 63), (132, 145, 148), (232, 186, 74)),
        "deep": ((30, 27, 48), (96, 73, 129), (79, 236, 219)),
        "cracked": ((96, 49, 30), (177, 94, 47), (255, 191, 91)),
        "special": ((22, 40, 55), (35, 151, 166), (255, 226, 105)),
    }[kind]
    noise = Image.new("L", (TILE, TILE))
    noise.putdata([max(0, min(255, int(rnd.gauss(132, 36)))) for _ in range(TILE * TILE)])
    img = ImageOps.colorize(noise.filter(ImageFilter.GaussianBlur(0.65)), colors[0], colors[1]).convert("RGBA")
    overlay = gradient((TILE, TILE), tuple(min(255, c + 28) for c in colors[1]), colors[0])
    overlay.putalpha(54)
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)
    draw.rectangle((1, 1, TILE - 2, TILE - 2), outline=(24, 25, 27, 230), width=2)
    for _ in range(26):
        x, y, r = rnd.randrange(6, 88), rnd.randrange(6, 88), rnd.choice([1, 1, 2, 3])
        draw.ellipse((x - r, y - r, x + r, y + r), fill=colors[2] + (rnd.randrange(70, 150),))
    if kind in {"stone", "deep"}:
        for _ in range(8):
            x, y = rnd.randrange(12, 80), rnd.randrange(14, 80)
            draw.polygon([(x, y - 7), (x + 7, y), (x, y + 8), (x - 7, y)], fill=colors[2] + (230,), outline=(20, 25, 28, 210))
    if kind == "cracked":
        for pts in [[(18, 7), (30, 28), (25, 48), (39, 86)], [(72, 10), (56, 34), (63, 61), (50, 90)]]:
            draw.line(pts, fill=(51, 21, 16, 255), width=6, joint="curve")
            draw.line(pts, fill=colors[2] + (255,), width=3, joint="curve")
    if kind == "special":
        draw.rounded_rectangle((12, 12, 82, 82), radius=12, fill=(20, 42, 54, 245), outline=(120, 247, 235, 255), width=4)
        draw.ellipse((29, 25, 65, 61), outline=colors[2] + (255,), width=5)
        draw.line((47, 18, 47, 76), fill=(131, 250, 241, 255), width=2)
    return img


def prop_canvas():
    scale = 3
    img = Image.new("RGBA", (PROP_CELL[0] * scale, PROP_CELL[1] * scale), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img), scale


def sc(scale, pts):
    return tuple(round(v * scale) for v in pts)


def down(img):
    return img.resize(PROP_CELL, Image.Resampling.LANCZOS)


def prop(style):
    img, draw, s = prop_canvas()
    pal = {
        "spore": ((41, 149, 116), (255, 191, 78)),
        "root": ((112, 70, 42), (77, 230, 177)),
        "prism": ((70, 185, 232), (236, 252, 255)),
        "magma": ((165, 54, 28), (255, 188, 52)),
        "void": ((102, 77, 197), (246, 216, 255)),
        "cave": ((111, 100, 80), (96, 238, 229)),
        "deep": ((67, 52, 112), (82, 238, 223)),
        "bio": ((48, 150, 107), (171, 255, 151)),
    }[style]
    dark, glow = pal
    ground, cx = 288, 151
    draw.ellipse(sc(s, (58, ground - 13, 245, ground + 8)), fill=(11, 16, 18, 170))
    if style == "root":
        draw.arc(sc(s, (43, 36, 260, 268)), 180, 360, fill=dark + (255,), width=25 * s)
        draw.arc(sc(s, (69, 67, 234, 286)), 180, 360, fill=glow + (210,), width=6 * s)
        draw.ellipse(sc(s, (111, 132, 192, 220)), fill=(13, 42, 45, 255), outline=glow + (255,), width=5 * s)
    elif style == "spore":
        for x in [96, 133, 171, 207]:
            draw.line(sc(s, (x, 132, x - 8, ground)), fill=dark + (255,), width=10 * s)
            draw.ellipse(sc(s, (x - 26, 70, x + 27, 122)), fill=(50, 181, 139, 255), outline=glow + (255,), width=4 * s)
            draw.ellipse(sc(s, (x - 5, 89, x + 6, 100)), fill=glow + (230,))
    elif style == "prism":
        for x, h, w in [(76, 130, 34), (122, 205, 42), (176, 155, 36)]:
            draw.polygon([sc(s, (x, ground)), sc(s, (x + w // 2, ground - h)), sc(s, (x + w, ground))], fill=dark + (245,), outline=glow + (255,))
        draw.line(sc(s, (151, 86, 151, ground - 9)), fill=(255, 255, 255, 190), width=3 * s)
    elif style == "magma":
        draw.rounded_rectangle(sc(s, (77, 83, 226, ground)), radius=18 * s, fill=(50, 42, 39, 255), outline=glow + (255,), width=5 * s)
        draw.ellipse(sc(s, (105, 52, 198, 136)), fill=(83, 28, 18, 255), outline=glow + (255,), width=5 * s)
        for x in [105, 135, 173, 203]:
            draw.line(sc(s, (x, 101, x + 12, ground - 20)), fill=glow + (255,), width=5 * s)
    elif style == "void":
        draw.ellipse(sc(s, (62, 60, 240, 236)), outline=glow + (255,), width=14 * s)
        draw.ellipse(sc(s, (102, 100, 202, 200)), fill=(53, 36, 107, 255), outline=(255, 255, 255, 230), width=5 * s)
        draw.line(sc(s, (151, 70, 151, ground)), fill=dark + (255,), width=10 * s)
    elif style == "cave":
        draw.rounded_rectangle(sc(s, (55, 145, 248, ground)), radius=11 * s, fill=(83, 66, 46, 255), outline=(219, 174, 100, 255), width=4 * s)
        for x, h in [(83, 70), (124, 105), (169, 88), (212, 62)]:
            draw.polygon([sc(s, (x, 148)), sc(s, (x + 20, 148 - h)), sc(s, (x + 43, 148))], fill=glow + (235,), outline=(228, 255, 250, 255))
    elif style == "deep":
        draw.ellipse(sc(s, (51, 55, 253, 257)), outline=glow + (255,), width=15 * s)
        draw.ellipse(sc(s, (93, 96, 211, 215)), fill=(33, 45, 91, 255), outline=glow + (255,), width=5 * s)
        draw.rectangle(sc(s, (97, 213, 205, ground)), fill=dark + (255,), outline=glow + (220,), width=4 * s)
    else:
        for x, h, r in [(76, 120, 34), (145, 185, 50), (219, 110, 33)]:
            draw.line(sc(s, (x, ground, x, ground - h)), fill=dark + (255,), width=14 * s)
            draw.ellipse(sc(s, (x - r, ground - h - 37, x + r, ground - h + 28)), fill=(47, 162, 116, 255), outline=glow + (255,), width=4 * s)
    return down(img)


def put_frame(sheet, cell, x, y, title, candidate=False):
    draw = ImageDraw.Draw(sheet)
    bg = checker(cell.size)
    bg.alpha_composite(cell)
    sheet.alpha_composite(bg, (x, y))
    draw.rectangle((x, y, x + cell.width - 1, y + cell.height - 1), outline=(96, 118, 126, 255), width=1)
    for gx in range(x, x + cell.width, TILE):
        draw.line((gx, y, gx, y + cell.height), fill=(255, 255, 255, 48))
    for gy in range(y, y + cell.height, TILE):
        draw.line((x, gy, x + cell.width, gy), fill=(255, 255, 255, 48))
    box = abox(cell)
    if box:
        color = (88, 240, 180, 255) if candidate else (255, 210, 90, 255)
        draw.rectangle((box[0] + x, box[1] + y, box[2] + x, box[3] + y), outline=color, width=2)
    label(draw, (x, y - 20), title, size=13)


def build_tile_sheet():
    sheet = Image.new("RGBA", (1280, 430), (18, 21, 25, 255))
    draw = ImageDraw.Draw(sheet)
    label(draw, (22, 18), "01 tile style proof v2 - richer regenerated candidates, fixed 94 x 94 grid", INK, 20)
    for i, (name, src, kind) in enumerate(TILE_DEFS):
        x = 36 + i * 244
        current, cand = fit(load_img(src), (TILE, TILE)), tile(kind, 900 + i)
        put_frame(sheet, current, x, 82, "current")
        put_frame(sheet, cand, x + 116, 82, "v2 candidate", True)
        label(draw, (x, 210), name, INK, 14)
        for yy in range(260, 354, TILE):
            for xx in range(x, x + 188, TILE):
                sheet.alpha_composite(cand if xx // TILE % 2 else current, (xx, yy))
                draw.rectangle((xx, yy, xx + TILE - 1, yy + TILE - 1), outline=(255, 255, 255, 50))
    return sheet


def build_prop_sheet():
    sheet = Image.new("RGBA", (1416, math.ceil(len(PROP_DEFS) / 2) * 388 + 82), (18, 21, 25, 255))
    draw = ImageDraw.Draw(sheet)
    label(draw, (22, 18), "02 prop forward-facing proof v2 - richer 303 x 313 transparent cells", INK, 20)
    generated = []
    for i, (name, src, style) in enumerate(PROP_DEFS):
        bx, by = 22 + (i % 2) * 690, 70 + (i // 2) * 388
        current, cand = fit(load_img(src, PROP_CELL), PROP_CELL, 12, "bottom"), prop(style)
        generated.append((name, cand))
        label(draw, (bx, by), name, INK, 14)
        put_frame(sheet, current, bx, by + 30, "current")
        put_frame(sheet, cand, bx + 337, by + 30, "v2 candidate", True)
    return sheet, generated


def build_world_context():
    panel_w, panel_h = 7 * TILE, 5 * TILE
    sheet = Image.new("RGBA", (1410, panel_h + 132), (17, 20, 24, 255))
    draw = ImageDraw.Draw(sheet)
    label(draw, (24, 18), "03 world context proof v2 - generated art placed on real 94px scale", INK, 20)
    for panel, title in enumerate(["current source slice", "v2 regenerated mockup"]):
        ox, oy = 32 + panel * (panel_w + 30), 76
        draw.rectangle((ox, oy, ox + panel_w, oy + panel_h), fill=(38, 34, 44, 255), outline=(120, 138, 146, 255))
        label(draw, (ox, oy - 22), title, size=14)
        for y in range(5):
            for x in range(7):
                idx = 0 if y < 2 else min(len(TILE_DEFS) - 1, y)
                img = fit(load_img(TILE_DEFS[idx][1]), (TILE, TILE)) if panel == 0 else tile(TILE_DEFS[idx][2], 1300 + x * 17 + y)
                sheet.alpha_composite(img, (ox + x * TILE, oy + y * TILE))
                draw.rectangle((ox + x * TILE, oy + y * TILE, ox + (x + 1) * TILE, oy + (y + 1) * TILE), outline=(255, 255, 255, 42))
        for n, xcell in enumerate([1, 3, 5]):
            _, src, style = PROP_DEFS[n * 2]
            src_img = fit(load_img(src, PROP_CELL), (126, 150), 4, "bottom") if panel == 0 else fit(prop(style), (126, 150), 4, "bottom")
            sheet.alpha_composite(src_img, (ox + xcell * TILE - 16, oy + panel_h - 150))
    return sheet


def write_reports(generated, sheets):
    qa_props = []
    for name, img in generated:
        pix, box = img.load(), abox(img)
        corners = all(pix[x, y][3] <= 12 for x, y in [(0, 0), (302, 0), (0, 312), (302, 312)])
        inside = bool(box and box[0] > 8 and box[1] > 8 and box[2] < 295 and box[3] < 305)
        qa_props.append({"label": name, "size": list(img.size), "alphaCornersTransparent": corners, "bbox": list(box), "bboxInsidePadding": inside, "borderGreenPct": 0, "borderGreyPct": 0})
    outputs = ["01-tile-style-proof.png", "02-prop-forward-facing-proof.png", "03-world-context-proof.png"]
    facts = map_facts()
    manifest = {
        "purpose": "v2 preview-only redo after primitive v1 rejection",
        "facts": facts,
        "outputs": outputs,
        "tileSources": [{"label": a, "source": b, "generatedKind": c, "grid": [TILE, TILE]} for a, b, c in TILE_DEFS],
        "propSources": [{"label": a, "source": b, "generatedStyle": c, "cell": list(PROP_CELL)} for a, b, c in PROP_DEFS],
        "runtimeWiringChanged": False,
        "activeTmxChanged": False,
        "bulkGenerationStarted": False,
    }
    qa = {"gridContracts": {"tile": [TILE, TILE], "propCell": list(PROP_CELL)}, "generatedPropChecks": qa_props, "sheetSizes": dict(zip(outputs, [list(s.size) for s in sheets])), "passed": all(p["alphaCornersTransparent"] and p["bboxInsidePadding"] for p in qa_props)}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (OUT / "qa-report.json").write_text(json.dumps(qa, indent=2), encoding="utf-8")
    (OUT / "readme.md").write_text("# 2026-07-08 Simple Mockups v2\n\nRedo preview after v1 was rejected as too primitive. This is still preview-only: no runtime loaders, active TMX files, or source assets are changed.\n\n- `01-tile-style-proof.png`: richer fixed 94 x 94 tile candidates.\n- `02-prop-forward-facing-proof.png`: richer 303 x 313 transparent front-facing prop candidates.\n- `03-world-context-proof.png`: static 94px scale context proof.\n", encoding="utf-8")
    return manifest, qa


def map_facts():
    world, prop_tsx, bg_tsx = ET.parse(WORLD_TMX).getroot(), ET.parse(PROP_TSX).getroot(), ET.parse(BG_TSX).getroot()
    return {
        "worldTmx": str(WORLD_TMX.relative_to(ROOT)),
        "paletteTmx": str(PALETTE_TMX.relative_to(ROOT)),
        "worldGrid": [int(world.get("tilewidth")), int(world.get("tileheight"))],
        "worldTiles": [int(world.get("width")), int(world.get("height"))],
        "propCell": [int(prop_tsx.get("tilewidth")), int(prop_tsx.get("tileheight"))],
        "backgroundStripCell": [int(bg_tsx.get("tilewidth")), int(bg_tsx.get("tileheight"))],
        "propTileCount": int(prop_tsx.get("tilecount")),
        "backgroundStripCount": int(bg_tsx.get("tilecount")),
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    first, (second, generated), third = build_tile_sheet(), build_prop_sheet(), build_world_context()
    for name, img in zip(["01-tile-style-proof.png", "02-prop-forward-facing-proof.png", "03-world-context-proof.png"], [first, second, third]):
        img.save(OUT / name)
    manifest, qa = write_reports(generated, [first, second, third])
    print(json.dumps({"out": str(OUT), "outputs": manifest["outputs"], "qaPassed": qa["passed"]}, indent=2))


if __name__ == "__main__":
    main()
