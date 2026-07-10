from __future__ import annotations

import json, math, random, shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
V3 = ROOT / "exports/ai-enhanced/v7-30-runtime-preview/2026-07-08-simple-mockups-v3"
OUT = ROOT / "exports/ai-enhanced/v7-30-runtime-preview/2026-07-08-expanded-mockups-v4"
TILE, PROP_CELL, BG_CELL = 94, (303, 313), (996, 142)
INK, MUTED = (233, 239, 230, 255), (170, 184, 186, 255)
TILE_CONCEPT = OUT / "source-generated-tile-concept.png"
PROP_CONCEPT = OUT / "source-generated-prop-concept.png"
PROP_BOXES = [
    (0.000, 0.105, 0.250, 0.485), (0.285, 0.040, 0.470, 0.490),
    (0.520, 0.040, 0.720, 0.500), (0.785, 0.035, 0.975, 0.495),
    (0.030, 0.515, 0.240, 0.930), (0.270, 0.525, 0.490, 0.930),
    (0.515, 0.515, 0.745, 0.945), (0.770, 0.515, 0.995, 0.955),
]
DEPTHS = [
    ("0-200m", 5, (164, 107, 58), (210, 126, 54)),
    ("200-500m", 12, (95, 105, 116), (199, 125, 53)),
    ("500-900m", 25, (67, 83, 128), (169, 191, 204)),
    ("900-1300m", 45, (92, 56, 127), (85, 234, 220)),
    ("1300m+", 80, (40, 29, 54), (255, 117, 43)),
]
PROP_NAMES = ["storm bridge", "root lantern", "frozen gate", "magma reactor", "void altar", "crystal cart", "deep portal", "bio mushrooms"]
BG_NAMES = ["root cavern ridge", "frozen prism skyline", "magma mountain band", "void deep mountains"]

def fnt(size=14):
    try: return ImageFont.truetype("arial.ttf", size)
    except OSError: return ImageFont.load_default()

def text(draw, xy, value, fill=MUTED, size=14): draw.text(xy, value, fill=fill, font=fnt(size))

def abox(img, cut=12): return img.getchannel("A").point(lambda a: 255 if a > cut else 0).getbbox()

def copy_sources():
    OUT.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(V3 / "source-generated-tile-concept.png", TILE_CONCEPT)
    shutil.copyfile(V3 / "source-generated-prop-concept.png", PROP_CONCEPT)

def checker(size, step=16):
    img = Image.new("RGBA", size, (33, 36, 39, 255)); d = ImageDraw.Draw(img)
    for y in range(0, size[1], step):
        for x in range(0, size[0], step):
            d.rectangle((x, y, x + step - 1, y + step - 1), fill=(91, 96, 100, 255) if (x // step + y // step) % 2 else (58, 63, 67, 255))
    return img

def fit(img, size, pad=0, anchor="center"):
    box = abox(img) or (0, 0, img.width, img.height); crop = img.crop(box)
    scale = min((size[0] - pad * 2) / crop.width, (size[1] - pad * 2) / crop.height)
    rz = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", size, (0, 0, 0, 0)); x = (size[0] - rz.width) // 2
    y = (size[1] - rz.height) // 2 if anchor == "center" else size[1] - pad - rz.height
    out.alpha_composite(rz, (x, y)); return out

def concept_tile_crops():
    img = Image.open(TILE_CONCEPT).convert("RGBA"); y0, y1 = round(img.height * .20), round(img.height * .80)
    bands = [(0.015, .23), (.215, .395), (.415, .59), (.61, .785), (.805, .985)]
    out = []
    for a, b in bands:
        crop = img.crop((round(img.width * a), y0, round(img.width * b), y1))
        box = ImageOps.grayscale(crop).point(lambda p: 255 if p > 32 else 0).getbbox() or (0, 0, crop.width, crop.height)
        out.append(fit(crop.crop(box), (TILE, TILE)))
    return out

def tint(img, color, amount=.25, contrast=1.08):
    over = Image.new("RGBA", img.size, color + (255,))
    return ImageEnhance.Contrast(Image.blend(img, over, amount)).enhance(contrast)

def draw_ore(img, ore, seed, count=9, crystal=False):
    img = img.copy(); d = ImageDraw.Draw(img); rnd = random.Random(seed)
    for _ in range(count):
        x, y = rnd.randrange(9, 84), rnd.randrange(9, 84); r = rnd.choice([2, 3, 4, 5])
        if crystal:
            pts = [(x, y - r * 2), (x + r, y), (x, y + r * 2), (x - r, y)]
            d.polygon(pts, fill=ore + (230,), outline=(235, 255, 255, 220))
        else:
            d.ellipse((x - r, y - r, x + r, y + r), fill=ore + (230,), outline=(22, 22, 24, 180))
    return img

def crack_overlay(img, seed, color=(35, 20, 18)):
    img = img.copy(); d = ImageDraw.Draw(img); rnd = random.Random(seed)
    for _ in range(3):
        pts = [(rnd.randrange(5, 88), rnd.randrange(4, 90)) for _ in range(4)]
        d.line(pts, fill=color + (210,), width=2, joint="curve")
    return img

def build_tile_sets():
    dirt, stone, deep, cracked, gem = concept_tile_crops(); rows = []
    for i, (_, gp, base, ore) in enumerate(DEPTHS):
        soil = tint(dirt if i < 2 else deep, base, .18 + i * .03)
        stone_v = crack_overlay(tint(stone, base, .12 + i * .05), 20 + i)
        metal = draw_ore(tint(stone, base, .14), ore, 40 + i, 7 + i)
        rare = draw_ore(tint(deep if i > 1 else stone, base, .10), ore, 70 + i, 5 + i, True)
        volcanic = crack_overlay(draw_ore(tint(cracked if i > 2 else stone, (35, 29, 38), .25), ore, 90 + i, 6, i > 2), 130 + i, (72, 24, 18))
        gp_tile = draw_gp_tile(gem, i, gp)
        rows.append([soil, stone_v, metal, rare, volcanic, gp_tile])
    return rows

def draw_gp_tile(base, depth_i, gp):
    colors = [(172, 79, 255), (76, 203, 255), (72, 236, 172), (255, 146, 55), (255, 65, 158)]
    img = tint(base, colors[depth_i], .18 + depth_i * .05, 1.15); d = ImageDraw.Draw(img)
    d.rounded_rectangle((7, 7, 86, 86), radius=10, outline=colors[depth_i] + (255,), width=2 + depth_i // 2)
    d.text((12, 70), f"+{gp}", fill=(255, 250, 210, 245), font=fnt(13))
    return img

def edge_bg_to_alpha(img):
    img = img.convert("RGBA"); w, h = img.size; pix = img.load(); seen = set(); stack = []
    def bg(x, y):
        r, g, b, a = pix[x, y]; return max(r, g, b) < 48 and max(r, g, b) - min(r, g, b) < 30
    for x in range(w): stack += [(x, 0), (x, h - 1)]
    for y in range(h): stack += [(0, y), (w - 1, y)]
    while stack:
        x, y = stack.pop()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h) or not bg(x, y): continue
        seen.add((x, y)); pix[x, y] = pix[x, y][:3] + (0,)
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    for y in range(h):
        for x in range(w):
            if (x, y) not in seen and pix[x, y][3] > 0: pix[x, y] = pix[x, y][:3] + (255,)
    return img

def solid_alpha(img):
    img = img.convert("RGBA"); pix = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pix[x, y]; pix[x, y] = (r, g, b, 255 if a > 80 else 0)
    return img

def prop_cells():
    img = Image.open(PROP_CONCEPT).convert("RGBA"); cells = []
    for x0, y0, x1, y1 in PROP_BOXES:
        crop = img.crop((round(img.width * x0), round(img.height * y0), round(img.width * x1), round(img.height * y1)))
        cells.append(solid_alpha(fit(edge_bg_to_alpha(crop), PROP_CELL, 16, "bottom")))
    return cells

def bg_strip(theme, seed):
    rnd = random.Random(seed); palettes = [
        ((10, 31, 28), (37, 112, 86), (74, 231, 177)), ((15, 27, 48), (53, 124, 172), (151, 236, 255)),
        ((43, 18, 14), (121, 45, 28), (255, 121, 37)), ((14, 11, 30), (67, 45, 110), (178, 77, 255)),
    ]
    bg, mid, glow = palettes[theme]; img = Image.new("RGBA", BG_CELL, bg + (255,)); d = ImageDraw.Draw(img)
    for y in range(BG_CELL[1]):
        t = y / max(1, BG_CELL[1] - 1)
        col = tuple(round(bg[c] * (1 - t) + max(0, bg[c] - 20) * t) for c in range(3))
        d.line((0, y, BG_CELL[0], y), fill=col + (255,))
    for _ in range(220):
        x, y = rnd.randrange(BG_CELL[0]), rnd.randrange(BG_CELL[1])
        d.point((x, y), fill=tuple(min(255, c + rnd.randrange(10, 38)) for c in bg) + (90,))
    for layer in range(4):
        yb = 140 - layer * 20; pts = [(0, yb)]
        step = 58 + layer * 12
        for x in range(0, BG_CELL[0] + step, step):
            pts.append((x, yb - rnd.randrange(12, 65) - layer * 10))
        pts += [(BG_CELL[0], BG_CELL[1]), (0, BG_CELL[1])]
        shade = tuple(max(0, min(255, mid[c] - layer * 20)) for c in range(3))
        d.polygon(pts, fill=shade + (120 + layer * 25,))
        if layer > 0:
            d.line(pts[1:-2], fill=tuple(min(255, shade[c] + 34) for c in range(3)) + (85,), width=1)
    for x in range(28, BG_CELL[0], 95):
        y = rnd.randrange(36, 104); d.line((x, y, x + rnd.randrange(-25, 30), 136), fill=glow + (118,), width=2)
        if theme in (1, 3):
            d.polygon([(x - 5, y + 16), (x, y - 10), (x + 6, y + 16)], fill=glow + (150,), outline=(220, 255, 255, 130))
    for x in range(55, BG_CELL[0], 170):
        if theme == 0:
            d.arc((x - 45, 24, x + 78, 155), 180, 360, fill=glow + (105,), width=3)
        if theme == 2:
            d.rectangle((x - 10, 58, x + 14, 138), fill=(42, 28, 25, 210), outline=glow + (110,))
    return img

def frame(sheet, cell, x, y, title="", candidate=True):
    d = ImageDraw.Draw(sheet); bg = checker(cell.size); bg.alpha_composite(cell); sheet.alpha_composite(bg, (x, y))
    d.rectangle((x, y, x + cell.width - 1, y + cell.height - 1), outline=(255, 212, 84, 255), width=1)
    for gx in range(x, x + cell.width + 1, TILE): d.line((gx, y, gx, y + cell.height), fill=(255, 255, 255, 48))
    for gy in range(y, y + cell.height + 1, TILE): d.line((x, gy, x + cell.width, gy), fill=(255, 255, 255, 48))
    box = abox(cell)
    if box: d.rectangle((x + box[0], y + box[1], x + box[2], y + box[3]), outline=(79, 244, 177, 255), width=2)
    if title: text(d, (x, y - 19), title, INK if candidate else MUTED, 13)

def sheet_tiles(rows):
    cols = ["soil", "stone depth", "metal ore", "rare crystal", "volcanic", "GP regen"]; sw, sh = 1060, 700
    sheet = Image.new("RGBA", (sw, sh), (16, 19, 23, 255)); d = ImageDraw.Draw(sheet)
    text(d, (22, 18), "01 depth resource tile variants v4 - 94 x 94, depth-specific resources + five GP regen tiles", INK, 20)
    for c, name in enumerate(cols): text(d, (150 + c * 142, 66), name, INK, 13)
    for r, (label, gp, *_rest) in enumerate(DEPTHS):
        y = 96 + r * 112; text(d, (24, y + 32), f"{label}  GP +{gp}", INK, 13)
        for c, tile in enumerate(rows[r]):
            x = 150 + c * 142; sheet.alpha_composite(tile, (x, y)); d.rectangle((x, y, x + 93, y + 93), outline=(255, 255, 255, 58))
    return sheet

def sheet_props_backgrounds(props, strips):
    sheet = Image.new("RGBA", (1410, 1350), (16, 19, 23, 255)); d = ImageDraw.Draw(sheet)
    text(d, (22, 18), "02 alpha-fixed props and background assets v4 - opaque interiors, transparent prop edges", INK, 20)
    for i, cell in enumerate(props):
        x, y = 22 + (i % 4) * 340, 76 + (i // 4) * 370; frame(sheet, cell, x, y, PROP_NAMES[i])
    text(d, (22, 845), "background strips use the v9 996 x 142 contract", INK, 16)
    for i, strip in enumerate(strips):
        x, y = 22, 890 + i * 108; small = strip.resize((747, 106), Image.Resampling.LANCZOS)
        sheet.alpha_composite(small, (x, y)); d.rectangle((x, y, x + small.width - 1, y + small.height - 1), outline=(112, 130, 136, 255)); text(d, (790, y + 42), BG_NAMES[i], INK, 13)
    return sheet

def sheet_context(rows, props, strips):
    sheet = Image.new("RGBA", (1410, 880), (15, 18, 22, 255)); d = ImageDraw.Draw(sheet)
    text(d, (24, 18), "03 expanded world context v4 - depth bands, resource variants, GP regen, props and background", INK, 20)
    ox, oy = 38, 76; panel_w, grid_h = 12 * TILE, 6 * TILE; grid_y = oy + 122
    sheet.alpha_composite(strips[2].resize((panel_w, 162), Image.Resampling.LANCZOS), (ox, oy))
    d.rectangle((ox, oy, ox + panel_w - 1, oy + 162), outline=(112, 130, 136, 255))
    text(d, (ox, oy - 22), "background strip visible above same-scale tile grid", INK, 13)
    for y in range(6):
        depth = min(4, max(0, y - 1))
        for x in range(12):
            tile = rows[depth][[0, 1, 2, 1, 3, 1, 4, 1, 5, 1, 2, 0][x]]
            sheet.alpha_composite(tile, (ox + x * TILE, grid_y + y * TILE))
            d.rectangle((ox + x * TILE, grid_y + y * TILE, ox + (x + 1) * TILE, grid_y + (y + 1) * TILE), outline=(255, 255, 255, 44))
    for idx, xcell in [(1, 1), (2, 4), (3, 6), (6, 10)]:
        p = fit(props[idx], (150, 170), 4, "bottom"); sheet.alpha_composite(p, (ox + xcell * TILE - 20, grid_y + grid_h - 170))
    text(d, (ox, grid_y + grid_h + 18), "approval note: this is visual-only; no tile enums, GP values, renderer wiring, or TMX files changed.", INK, 14)
    return sheet

def qa(rows, props, strips):
    prop_checks = []
    for name, img in zip(PROP_NAMES, props):
        pix, box = img.load(), abox(img) or (0, 0, 0, 0); semi = inside = 0
        for y in range(box[1], box[3]):
            for x in range(box[0], box[2]):
                a = pix[x, y][3]; semi += 1 if 0 < a < 220 else 0; inside += 1
        corners = all(pix[x, y][3] <= 12 for x, y in [(0, 0), (302, 0), (0, 312), (302, 312)])
        prop_checks.append({"label": name, "size": list(img.size), "alphaCornersTransparent": corners, "bbox": list(box), "semiTransparentInsidePct": round(semi / max(1, inside), 4)})
    return {"tileCellSizes": [list(t.size) for row in rows for t in row], "propChecks": prop_checks, "backgroundStripSizes": [list(s.size) for s in strips], "passed": all(t.size == (TILE, TILE) for row in rows for t in row) and all(p["alphaCornersTransparent"] and p["semiTransparentInsidePct"] < .01 for p in prop_checks) and all(s.size == BG_CELL for s in strips)}

def write_meta(rows, props, strips, sheets):
    outputs = ["01-depth-resource-tiles-proof.png", "02-alpha-fixed-props-assets-proof.png", "03-expanded-world-context-proof.png"]
    manifest = {"purpose": "v4 expanded approval mockup: depth resource variants, five GP regen tiles, fixed prop alpha, background strips", "runtimeWiringChanged": False, "activeTmxChanged": False, "bulkGenerationStarted": False, "gridContracts": {"tile": [TILE, TILE], "propCell": list(PROP_CELL), "backgroundStrip": list(BG_CELL)}, "gpRegenMockValues": [{"depth": d, "flatGp": gp} for d, gp, *_ in DEPTHS], "outputs": outputs}
    report = qa(rows, props, strips); report["sheetSizes"] = dict(zip(outputs, [list(s.size) for s in sheets]))
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (OUT / "qa-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    (OUT / "readme.md").write_text("# 2026-07-08 Expanded Mockups v4\n\nVisual-only approval mockup. No runtime files, active TMX files, loader overrides, or source assets are changed.\n", encoding="utf-8")
    return outputs, report

def main():
    copy_sources(); rows = build_tile_sets(); props = prop_cells(); strips = [bg_strip(i, 700 + i) for i in range(4)]
    sheets = [sheet_tiles(rows), sheet_props_backgrounds(props, strips), sheet_context(rows, props, strips)]
    outputs, report = write_meta(rows, props, strips, sheets)
    for name, img in zip(outputs, sheets): img.save(OUT / name)
    print(json.dumps({"out": str(OUT), "outputs": outputs, "qaPassed": report["passed"]}, indent=2))

if __name__ == "__main__": main()
