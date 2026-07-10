from __future__ import annotations

import json, math, shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "exports/ai-enhanced/v7-30-runtime-preview/2026-07-08-current-close-mockups-v5"
GEN_TILE = Path(r"C:\Users\Mila\.codex\generated_images\019f3ea7-b4ea-7b21-b2ae-bed885b86728\ig_056cf92223a65aef016a4e08023d0c8191acdf0374c647f6b7.png")
GEN_PROP = Path(r"C:\Users\Mila\.codex\generated_images\019f3ea7-b4ea-7b21-b2ae-bed885b86728\ig_056cf92223a65aef016a4e087db0a881918621db9305f6811f.png")
SRC_TILE = OUT / "source-unique-resource-tiles.png"
SRC_PROP = OUT / "source-magenta-key-props.png"
TILE, PROP_CELL = 94, (303, 313)
INK, MUTED = (232, 239, 230, 255), (170, 184, 186, 255)
GP_TIERS = [100, 250, 500, 1000, 1700]
TILES = [
    ("dirt", "sprites/tiles/dynamic-soil/bases/soil-000-200-v1.webp"),
    ("stone", "sprites/tiles/tiles-under-1000/resource-stone-tile/5-of-5-hp.webp"),
    ("copper", "sprites/tiles/tiles-under-1000/resource-copper-tile/5-of-5-hp.webp"),
    ("dark dirt", "sprites/tiles/tiles-under-1000/dirt-tiles/dark-dirt/dark-dirt-normal/5-of-5-hp.webp"),
    ("hard dark dirt", "sprites/tiles/tiles-under-1000/dirt-tiles/dark-dirt/dark-dirt-strong/5-of-5-hp.webp"),
    ("bronze", "sprites/tiles/tiles-under-1000/resource-bronze-tile/5-of-5-hp.webp"),
    ("steel", "sprites/tiles/tiles-under-1000/resource-steel-tile/5-of-5-hp.webp"),
    ("iron", "sprites/tiles/tiles-under-1000/resource-iron-tile/5-of-5-hp.webp"),
    ("silver", "sprites/tiles/tiles-under-1000/resource-silver-tile/5-of-5-hp.webp"),
    ("gold", "sprites/tiles/tiles-under-1000/resource-gold-tile/5-of-5-hp.webp"),
    ("lava dirt", "sprites/tiles/second-world/lava-dirt/5-of-5-hp.webp"),
    ("obsidian", "sprites/tiles/second-world/obsidian/5-of-5-hp.webp"),
    ("ember ore", "sprites/tiles/second-world/ember-ore/5-of-5-hp.webp"),
    ("magma crystal", "sprites/tiles/second-world/magma-crystal/5-of-5-hp.webp"),
    ("geode crystal", "sprites/tiles/approved-world/treasure-stone.webp"),
    ("GP +100", "sprites/tiles/special-tiles-v2/gempower-block.webp"),
    ("GP +250", "sprites/tiles/special-tiles-v2/gempower-block.webp"),
    ("GP +500", "sprites/tiles/special-tiles-v2/gempower-block.webp"),
    ("GP +1000", "sprites/tiles/special-tiles-v2/gempower-block.webp"),
    ("GP +1700", "sprites/tiles/special-tiles-v2/gempower-block.webp"),
]
PROP_DEFS = [
    ("storm bridge", "irradiated_storm_surface__l11__15.png"),
    ("root lantern", "bioluminescent_root_caverns__l11__11.png"),
    ("frozen gate", "frozen_prism_abyss__l11__13.png"),
    ("magma reactor", "industrial_magma_sanctum__l11__13.png"),
    ("void altar", "void_realm__l11__16.png"),
    ("crystal cart", "cave_biome__l11__14.png"),
    ("deep portal", "deep_cave_biome__l11__07.png"),
    ("bio mushrooms", "bioluminescent_root_caverns__l11__15.png"),
]
PROP_NAMES = [name for name, _ in PROP_DEFS]
PROP_BASE = ROOT / "exports/pallet-v9/dig_game_empty_backgrounds_and_separate_props_v1/sprites/props/near_props_seam_breakers"

def fnt(size=14):
    try: return ImageFont.truetype("arial.ttf", size)
    except OSError: return ImageFont.load_default()

def text(draw, xy, value, fill=MUTED, size=14): draw.text(xy, value, fill=fill, font=fnt(size))

def abox(img, cut=12): return img.getchannel("A").point(lambda a: 255 if a > cut else 0).getbbox()

def copy_sources():
    OUT.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(GEN_TILE, SRC_TILE); shutil.copyfile(GEN_PROP, SRC_PROP)

def checker(size, step=16):
    img = Image.new("RGBA", size, (31, 34, 37, 255)); d = ImageDraw.Draw(img)
    for y in range(0, size[1], step):
        for x in range(0, size[0], step):
            d.rectangle((x, y, x + step - 1, y + step - 1), fill=(92, 96, 99, 255) if (x // step + y // step) % 2 else (57, 62, 66, 255))
    return img

def fit(img, size, pad=0, anchor="center"):
    img = img.convert("RGBA"); box = abox(img) or (0, 0, img.width, img.height); crop = img.crop(box)
    scale = min((size[0] - pad * 2) / crop.width, (size[1] - pad * 2) / crop.height)
    rz = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", size, (0, 0, 0, 0)); x = (size[0] - rz.width) // 2
    y = (size[1] - rz.height) // 2 if anchor == "center" else size[1] - pad - rz.height
    out.alpha_composite(rz, (x, y)); return out

def is_key_color(r, g, b, a=255):
    return a > 0 and r > 210 and b > 210 and g < 60

def is_pink_spill(r, g, b, a=255):
    return a > 0 and r > 135 and b > 115 and g < 105 and abs(r - b) < 105 and min(r, b) - g > 62

def solid_alpha(img, cut=28):
    img = img.convert("RGBA"); pix = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pix[x, y]
            pix[x, y] = (0, 0, 0, 0) if a <= cut or is_key_color(r, g, b, a) else (r, g, b, 255)
    return img

def despill(img):
    img = img.convert("RGBA"); src = img.copy(); pix = img.load(); spix = src.load()
    marked = []
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = spix[x, y]
            if is_pink_spill(r, g, b, a): marked.append((x, y))
    for x, y in marked:
        edge = False
        for oy in range(-2, 3):
            for ox in range(-2, 3):
                nx, ny = x + ox, y + oy
                if 0 <= nx < img.width and 0 <= ny < img.height and spix[nx, ny][3] == 0: edge = True
        if edge:
            pix[x, y] = (0, 0, 0, 0); continue
        replacement = None
        for radius in range(1, 6):
            for oy in range(-radius, radius + 1):
                for ox in range(-radius, radius + 1):
                    nx, ny = x + ox, y + oy
                    if 0 <= nx < img.width and 0 <= ny < img.height:
                        r, g, b, a = spix[nx, ny]
                        if a > 0 and not is_pink_spill(r, g, b, a):
                            replacement = (r, g, b, 255); break
                if replacement: break
            if replacement: break
        pix[x, y] = replacement or (0, 0, 0, 0)
    return solid_alpha(img)

def current_tile(rel): return fit(Image.open(ROOT / rel), (TILE, TILE))

def current_props():
    return [fit(Image.open(PROP_BASE / file_name).convert("RGBA"), PROP_CELL, 16, "bottom") for _, file_name in PROP_DEFS]

def visual_bbox(crop):
    rgb = crop.convert("RGB"); pix = rgb.load(); xs, ys = [], []
    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = pix[x, y]
            if max(r, g, b) > 34 or max(r, g, b) - min(r, g, b) > 22:
                xs.append(x); ys.append(y)
    return (min(xs), min(ys), max(xs) + 1, max(ys) + 1) if xs else (0, 0, crop.width, crop.height)

def generated_tiles():
    img = Image.open(SRC_TILE).convert("RGBA"); out = []
    xs = [0.015, 0.213, 0.408, 0.603, 0.800, 0.985]
    ys = [0.070, 0.290, 0.503, 0.715, 0.910]
    for row in range(4):
        for col in range(5):
            crop = img.crop((round(img.width * xs[col]), round(img.height * ys[row]), round(img.width * xs[col + 1]), round(img.height * ys[row + 1])))
            out.append(fit(crop.crop(visual_bbox(crop)), (TILE, TILE)))
    return out

def flood_key_to_alpha(crop):
    img = crop.convert("RGBA"); w, h = img.size; pix = img.load(); stack = []
    def key(x, y):
        r, g, b, _ = pix[x, y]
        return is_key_color(r, g, b)
    for x in range(w): stack += [(x, 0), (x, h - 1)]
    for y in range(h): stack += [(0, y), (w - 1, y)]
    seen = set()
    while stack:
        x, y = stack.pop()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h) or not key(x, y): continue
        seen.add((x, y)); pix[x, y] = (0, 0, 0, 0)
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    for y in range(h):
        for x in range(w):
            if (x, y) not in seen and pix[x, y][3] > 0: pix[x, y] = pix[x, y][:3] + (255,)
    return img

def key_source_to_alpha(img):
    img = img.convert("RGBA"); pix = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pix[x, y]
            pix[x, y] = (0, 0, 0, 0) if is_key_color(r, g, b, a) else (r, g, b, 255)
    return img

def component_boxes(img, min_area=5000):
    pix = img.load(); w, h = img.size; seen = bytearray(w * h); boxes = []
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if seen[i] or pix[x, y][3] == 0: continue
            stack = [(x, y)]; seen[i] = 1; area = 0; x0 = x1 = x; y0 = y1 = y
            while stack:
                cx, cy = stack.pop(); area += 1
                x0 = min(x0, cx); x1 = max(x1, cx); y0 = min(y0, cy); y1 = max(y1, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if not seen[j] and pix[nx, ny][3] > 0:
                            seen[j] = 1; stack.append((nx, ny))
            if area >= min_area: boxes.append((area, (x0, y0, x1 + 1, y1 + 1)))
    top = sorted([b for _, b in boxes if b[1] < h // 2], key=lambda b: b[0])
    bottom = sorted([b for _, b in boxes if b[1] >= h // 2], key=lambda b: b[0])
    return top + bottom

def generated_props():
    img = key_source_to_alpha(Image.open(SRC_PROP)); cells = []
    for box in component_boxes(img)[:8]:
        x0, y0, x1, y1 = box; pad = 24
        crop = img.crop((max(0, x0 - pad), max(0, y0 - pad), min(img.width, x1 + pad), min(img.height, y1 + pad)))
        cells.append(despill(solid_alpha(fit(crop, PROP_CELL, 16, "bottom"))))
    return cells

def draw_tile_sheet(current, cand):
    sheet = Image.new("RGBA", (1420, 1060), (16, 19, 23, 255)); d = ImageDraw.Draw(sheet)
    text(d, (22, 18), "01 current-close unique resource sprites v5 - no overlay recolor pass, exact 94 x 94", INK, 20)
    for i, ((name, _), cur, new) in enumerate(zip(TILES, current, cand)):
        x, y = 26 + (i % 5) * 276, 76 + (i // 5) * 238
        text(d, (x, y - 22), name, INK, 13); text(d, (x, y + 102), "current", MUTED, 12); text(d, (x + 118, y + 102), "v5 candidate", MUTED, 12)
        sheet.alpha_composite(cur, (x, y)); sheet.alpha_composite(new, (x + 118, y))
        d.rectangle((x, y, x + 93, y + 93), outline=(255, 211, 91, 255)); d.rectangle((x + 118, y, x + 211, y + 93), outline=(80, 241, 176, 255))
    return sheet

def prop_frame(sheet, cell, x, y, title, candidate=True):
    bg = checker(cell.size); bg.alpha_composite(cell); sheet.alpha_composite(bg, (x, y)); d = ImageDraw.Draw(sheet)
    d.rectangle((x, y, x + cell.width - 1, y + cell.height - 1), outline=(80, 241, 176, 255) if candidate else (112, 130, 136, 255), width=2 if candidate else 1)
    for gx in range(x, x + cell.width + 1, TILE): d.line((gx, y, gx, y + cell.height), fill=(255, 255, 255, 46))
    for gy in range(y, y + cell.height + 1, TILE): d.line((x, gy, x + cell.width, gy), fill=(255, 255, 255, 46))
    box = abox(cell)
    if box: d.rectangle((x + box[0], y + box[1], x + box[2], y + box[3]), outline=(255, 211, 91, 255) if not candidate else (80, 241, 176, 255), width=2)
    text(d, (x, y - 20), title, INK, 13)

def draw_prop_sheet(current, props):
    rows = math.ceil(len(props) / 2)
    sheet = Image.new("RGBA", (1410, rows * 390 + 84), (16, 19, 23, 255)); d = ImageDraw.Draw(sheet)
    text(d, (22, 18), "02 current-vs-v5 props - solid alpha, component bboxes, no matte blocks", INK, 20)
    for i, ((name, _), cur, cell) in enumerate(zip(PROP_DEFS, current, props)):
        x, y = 22 + (i % 2) * 690, 76 + (i // 2) * 390
        text(d, (x, y - 35), name, INK, 14)
        prop_frame(sheet, cur, x, y, "current", False)
        prop_frame(sheet, cell, x + 337, y, "v5 cleaned", True)
    return sheet

def draw_context(cand, props):
    sheet = Image.new("RGBA", (1410, 760), (15, 18, 22, 255)); d = ImageDraw.Draw(sheet)
    text(d, (24, 18), "03 current-close world context v5 - unique resources, readable GP tiers, solid props", INK, 20)
    ox, oy, cols, rows = 38, 78, 12, 6
    pattern = [0, 1, 2, 1, 3, 6, 15, 7, 8, 9, 1, 0]
    for y in range(rows):
        for x in range(cols):
            idx = min(len(cand) - 1, pattern[x] + (5 if y > 2 and pattern[x] < 5 else 0))
            if x == 6: idx = 15 + min(4, y)
            sheet.alpha_composite(cand[idx], (ox + x * TILE, oy + y * TILE))
            d.rectangle((ox + x * TILE, oy + y * TILE, ox + (x + 1) * TILE, oy + (y + 1) * TILE), outline=(255, 255, 255, 45))
    for idx, xcell in [(1, 1), (2, 4), (3, 8), (6, 10)]:
        p = fit(props[idx], (148, 168), 4, "bottom"); sheet.alpha_composite(p, (ox + xcell * TILE - 20, oy + rows * TILE - 168))
    text(d, (ox, oy + rows * TILE + 18), "visual-only approval proof; no source assets, TMX, enums, loader, or runtime GP behavior changed.", INK, 14)
    return sheet

def qa(cand, props, sheets):
    prop_checks = []
    for name, img in zip(PROP_NAMES, props):
        pix = img.load(); box = abox(img) or (0, 0, 0, 0); semi = leak = 0; inside = max(1, (box[2] - box[0]) * (box[3] - box[1]))
        for y in range(box[1], box[3]):
            for x in range(box[0], box[2]):
                r, g, b, a = pix[x, y]; semi += 1 if 0 < a < 255 else 0; leak += 1 if is_key_color(r, g, b, a) else 0
        corners = all(pix[x, y][3] <= 12 for x, y in [(0, 0), (302, 0), (0, 312), (302, 312)])
        prop_checks.append({"label": name, "size": list(img.size), "alphaCornersTransparent": corners, "bbox": list(box), "semiAlphaPct": round(semi / inside, 4), "magentaLeakPct": round(leak / inside, 4)})
    return {"tileCellSizes": [list(t.size) for t in cand], "propChecks": prop_checks, "sheetSizes": [list(s.size) for s in sheets], "passed": all(t.size == (TILE, TILE) for t in cand) and all(p["alphaCornersTransparent"] and p["semiAlphaPct"] == 0 and p["magentaLeakPct"] < .002 for p in prop_checks)}

def write_meta(outputs, report):
    manifest = {"purpose": "v5 current-close redo after rejected v4 overlays/transparency", "runtimeWiringChanged": False, "activeTmxChanged": False, "bulkGenerationStarted": False, "gridContracts": {"tile": [TILE, TILE], "propCell": list(PROP_CELL)}, "gpBenchmark": {"baseMax": 100, "level99Bonus": 990, "tankMaxEffect": 600, "mockFlatRestoreTiers": GP_TIERS}, "outputs": outputs}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (OUT / "qa-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    (OUT / "readme.md").write_text("# 2026-07-08 Current-Close Mockups v5\n\nRejected v4 overlay/alpha direction replaced with current-close unique resource tiles and component-sliced, magenta-key solid prop alpha. Prop sheet includes current-vs-v5 comparison. Preview-only; no runtime wiring.\n", encoding="utf-8")

def main():
    copy_sources(); current = [current_tile(src) for _, src in TILES]; cand = generated_tiles(); props = generated_props(); cur_props = current_props()
    sheets = [draw_tile_sheet(current, cand), draw_prop_sheet(cur_props, props), draw_context(cand, props)]
    outputs = ["01-current-close-resource-sprites-proof.png", "02-solid-prop-alpha-proof.png", "03-current-close-world-context-proof.png"]
    report = qa(cand, props, sheets); write_meta(outputs, report)
    for name, img in zip(outputs, sheets): img.save(OUT / name)
    print(json.dumps({"out": str(OUT), "outputs": outputs, "qaPassed": report["passed"]}, indent=2))

if __name__ == "__main__": main()
