from __future__ import annotations

import json
import math
import random
import re
import xml.etree.ElementTree as ET
from html import escape
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "exports" / "dig_game_12layer_palette_true_separate_v1"
SRC_TSX = SRC_DIR / "dig-game-12layer-true-separate-v1.tsx"
OUT = ROOT / "exports" / "pallet-v14" / "dig_game_clean_props_backgrounds_v14"
BG_ROOT = OUT / "sprites" / "backgrounds" / "bg-v14"
PROP_ROOT = OUT / "sprites" / "props"
PREVIEW_ROOT = OUT / "previews"

PROP_W = 303
PROP_H = 313
PROP_COLS = 10
PROP_COUNT = 100
BG_FIRST_GID = 1
PROP_FIRST_GID = 85


BIOME_PALETTES = {
    "industrial_magma_sanctum": {
        "base": (65, 23, 14),
        "dark": (22, 15, 14),
        "mid": (122, 47, 23),
        "accent": (238, 92, 25),
        "glow": (255, 154, 41),
    },
    "irradiated_storm_surface": {
        "base": (36, 43, 34),
        "dark": (12, 18, 18),
        "mid": (74, 80, 58),
        "accent": (215, 226, 44),
        "glow": (240, 255, 72),
    },
    "deep_cave_biome": {
        "base": (28, 24, 33),
        "dark": (11, 10, 16),
        "mid": (67, 55, 74),
        "accent": (83, 176, 207),
        "glow": (127, 228, 255),
    },
    "bioluminescent_root_caverns": {
        "base": (24, 38, 38),
        "dark": (10, 16, 18),
        "mid": (54, 76, 59),
        "accent": (42, 210, 184),
        "glow": (82, 246, 226),
    },
    "frozen_prism_abyss": {
        "base": (26, 42, 62),
        "dark": (10, 17, 28),
        "mid": (64, 98, 132),
        "accent": (95, 199, 250),
        "glow": (176, 238, 255),
    },
    "cave_biome": {
        "base": (54, 39, 28),
        "dark": (18, 13, 10),
        "mid": (105, 71, 42),
        "accent": (218, 143, 69),
        "glow": (255, 184, 94),
    },
    "void_realm": {
        "base": (36, 22, 56),
        "dark": (10, 7, 19),
        "mid": (75, 42, 106),
        "accent": (187, 79, 240),
        "glow": (238, 135, 255),
    },
}

PROP_KINDS = [
    "crystal_cluster",
    "lantern_arch",
    "stone_gate",
    "reactor_core",
    "void_altar",
    "portal_ring",
    "mushroom_grove",
    "front_bridge",
    "power_pillar",
    "resource_cache_front",
]


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def font(size: int) -> ImageFont.ImageFont:
    for path in (
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/consola.ttf"),
    ):
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))


def add_noise(img: Image.Image, amount: float, seed: int) -> Image.Image:
    random.seed(seed)
    noise = Image.effect_noise(img.size, 36).convert("L")
    noise = ImageEnhance.Contrast(noise).enhance(1.4)
    tint = Image.merge("RGB", (noise, noise, noise))
    return Image.blend(img.convert("RGB"), ImageChops.multiply(img.convert("RGB"), tint), amount)


def parse_source_tiles() -> list[dict]:
    tiles = []
    root = ET.parse(SRC_TSX).getroot()
    for tile in root.findall("tile"):
        props = {
            p.attrib["name"]: p.attrib.get("value", "")
            for p in tile.find("properties").findall("property")
        }
        image = tile.find("image")
        tiles.append(
            {
                "id": int(tile.attrib["id"]),
                "type": tile.attrib.get("type", "backgrounds"),
                "biome": props["biome"],
                "layer_id": props["assetLayerId"],
                "layer_name": props["assetLayerName"],
                "loop_x": props.get("loopX", "false"),
                "parallax_x": props.get("parallaxX", "0"),
                "parallax_y": props.get("parallaxY", "0"),
                "width": int(image.attrib["width"]),
                "height": int(image.attrib["height"]),
            }
        )
    return tiles


def background_image(tile: dict) -> Image.Image:
    w, h = tile["width"], tile["height"]
    pal = BIOME_PALETTES[tile["biome"]]
    img = Image.new("RGB", (w, h), pal["dark"])
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        c = mix(mix(pal["base"], pal["dark"], t * 0.65), pal["mid"], 0.08)
        for x in range(w):
            px[x, y] = c
    img = add_noise(img, 0.16, tile["id"] * 31 + 7)
    d = ImageDraw.Draw(img, "RGBA")
    lid = tile["layer_id"]

    if lid == "L01":
        for x in range(0, w, 34):
            d.line([(x, 0), (x + 18, h)], fill=(*pal["mid"], 30), width=3)
    elif lid in {"L02", "L03"}:
        for i in range(7):
            cx = (i * 157 + tile["id"] * 31) % w
            cy = int(h * (0.2 + 0.1 * (i % 4)))
            r = 80 + (i % 3) * 32
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*pal["glow"], 24 if lid == "L03" else 14))
        img = img.filter(ImageFilter.GaussianBlur(1.1))
    elif lid == "L04":
        draw_silhouette_band(d, w, h, pal, 0.58, 18)
    elif lid == "L05":
        draw_landmarks(d, w, h, pal, tall=False)
    elif lid == "L06":
        draw_silhouette_band(d, w, h, pal, 0.36, 34)
        draw_rocks(d, w, h, pal, 30, h - 48, h - 8)
    elif lid == "L07":
        draw_structures(d, w, h, pal, ceiling=False)
    elif lid == "L08":
        draw_structures(d, w, h, pal, ceiling=True)
    elif lid == "L09":
        draw_frame_layer(d, w, h, pal)
    elif lid == "L10":
        draw_rocks(d, w, h, pal, 52, h - 58, h - 6)
    elif lid == "L11":
        draw_landmarks(d, w, h, pal, tall=True)
        draw_rocks(d, w, h, pal, 24, h - 38, h - 5)
    elif lid == "L12":
        for i in range(18):
            x = (i * 61 + tile["id"] * 17) % w
            y = 16 + (i * 19) % max(20, h - 26)
            d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=(*pal["glow"], 190))
            d.ellipse((x - 14, y - 14, x + 14, y + 14), outline=(*pal["accent"], 50), width=2)
    return img.convert("RGB")


def draw_silhouette_band(d, w, h, pal, top_ratio, step):
    pts = [(0, h)]
    for x in range(0, w + step, step):
        y = int(h * top_ratio + math.sin(x * 0.019) * h * 0.08 + ((x // step) % 5) * 3)
        pts.append((x, y))
    pts.append((w, h))
    d.polygon(pts, fill=(*pal["dark"], 230))
    d.line(pts[1:-1], fill=(*pal["accent"], 50), width=2)


def draw_rocks(d, w, h, pal, count, y0, y1):
    random.seed(w + h + count + y0)
    for _ in range(count):
        cx = random.randint(0, w)
        cy = random.randint(y0, y1)
        rw = random.randint(12, 38)
        rh = random.randint(6, 18)
        d.rounded_rectangle((cx - rw, cy - rh, cx + rw, cy + rh), radius=6, fill=(*pal["mid"], 160), outline=(*pal["accent"], 40))


def draw_landmarks(d, w, h, pal, tall):
    base = h - 4
    step = 115 if tall else 155
    for x in range(35, w, step):
        ht = (h * (0.76 if tall else 0.58)) * (0.65 + ((x // step) % 4) * 0.08)
        d.polygon([(x - 36, base), (x, base - ht), (x + 36, base)], fill=(*pal["mid"], 145), outline=(*pal["accent"], 70))
        d.line([(x, base - ht + 8), (x, base - 7)], fill=(*pal["glow"], 65), width=3)


def draw_structures(d, w, h, pal, ceiling):
    y0, y1 = (0, int(h * 0.45)) if ceiling else (int(h * 0.38), h - 5)
    for x in range(20, w, 96):
        d.rounded_rectangle((x, y0 + 8, x + 48, y1), radius=9, fill=(*pal["mid"], 165), outline=(*pal["accent"], 70), width=2)
        d.rectangle((x + 7, y0 + 18, x + 41, y1 - 12), outline=(*pal["dark"], 150), width=3)
    if ceiling:
        d.rectangle((0, 0, w, 18), fill=(*pal["dark"], 230))


def draw_frame_layer(d, w, h, pal):
    d.rounded_rectangle((0, 0, 58, h), radius=14, fill=(*pal["dark"], 230), outline=(*pal["accent"], 70), width=3)
    d.rounded_rectangle((w - 58, 0, w, h), radius=14, fill=(*pal["dark"], 230), outline=(*pal["accent"], 70), width=3)
    draw_rocks(d, w, h, pal, 36, h - 42, h - 4)


def new_prop_canvas(scale=3):
    return Image.new("RGBA", (PROP_W * scale, PROP_H * scale), (0, 0, 0, 0))


def scaled_draw(img):
    return ImageDraw.Draw(img, "RGBA")


def S(v, scale=3):
    if isinstance(v, tuple):
        return tuple(int(x * scale) for x in v)
    return int(v * scale)


def line(d, xy, fill, width=1):
    d.line([S(p) for p in xy], fill=fill, width=S(width))


def prop_shadow(d, pal):
    d.ellipse(S((48, 263, 255, 296)), fill=(5, 8, 12, 95))
    d.ellipse(S((72, 272, 232, 291)), fill=(*pal["accent"], 35))


def draw_prop(index: int) -> tuple[Image.Image, dict]:
    rng = random.Random(3000 + index * 73)
    kind = PROP_KINDS[(index - 1) // 10]
    biome = list(BIOME_PALETTES)[(index - 1) % len(BIOME_PALETTES)]
    pal = BIOME_PALETTES[biome]
    img = new_prop_canvas()
    d = scaled_draw(img)
    prop_shadow(d, pal)
    globals()[f"prop_{kind}"](d, pal, rng, index)
    img = img.resize((PROP_W, PROP_H), Image.Resampling.LANCZOS)
    img = ImageEnhance.Sharpness(img).enhance(1.08)
    return img, {"id": f"P{index:03d}", "kind": kind, "biome": biome}


def crystal_poly(cx, base, h, w):
    return [(cx, base - h), (cx - w, base - h // 3), (cx - w // 2, base), (cx + w // 2, base), (cx + w, base - h // 3)]


def draw_crystal(d, cx, base, h, w, pal):
    pts = crystal_poly(cx, base, h, w)
    d.polygon([S(p) for p in pts], fill=(*pal["accent"], 220), outline=(245, 255, 255, 220))
    line(d, [(cx, base - h), (cx, base - 3)], fill=(*pal["glow"], 210), width=2)


def prop_crystal_cluster(d, pal, rng, index):
    for x in range(55, 250, 32):
        d.rounded_rectangle(S((x - 22, 255 + rng.randint(-8, 8), x + 26, 282)), 6, fill=(*pal["dark"], 230), outline=(*pal["mid"], 180), width=S(2))
    for cx, ht, ww in [(86, 126, 29), (137, 178, 37), (188, 145, 31), (221, 96, 22), (57, 82, 18)]:
        draw_crystal(d, cx + rng.randint(-5, 5), 266, ht + rng.randint(-10, 10), ww, pal)


def prop_lantern_arch(d, pal, rng, index):
    for x in (62, 218):
        d.rounded_rectangle(S((x - 18, 112, x + 18, 272)), 11, fill=(*pal["dark"], 240), outline=(*pal["mid"], 230), width=S(5))
    for y in range(84, 142, 13):
        d.arc(S((55, y - 60, 225, y + 94)), 190, 350, fill=(*pal["mid"], 235), width=S(9))
    d.ellipse(S((123, 127, 181, 202)), fill=(*pal["glow"], 190), outline=(245, 255, 240, 230), width=S(3))
    d.rectangle(S((146, 102, 158, 129)), fill=(*pal["accent"], 210))
    for x in (92, 206):
        line(d, [(x, 138), (x - 18, 190), (x - 4, 238)], fill=(*pal["accent"], 150), width=3)


def prop_stone_gate(d, pal, rng, index):
    d.rounded_rectangle(S((45, 82, 258, 272)), 20, fill=(*pal["dark"], 245), outline=(*pal["mid"], 230), width=S(7))
    d.rounded_rectangle(S((88, 117, 215, 272)), 28, fill=(0, 0, 0, 0), outline=(*pal["accent"], 190), width=S(5))
    d.rectangle(S((92, 180, 211, 272)), fill=(0, 0, 0, 0))
    for x in range(61, 244, 42):
        d.rounded_rectangle(S((x, 72, x + 28, 112)), 7, fill=(*pal["mid"], 220), outline=(*pal["glow"], 120), width=S(2))


def prop_reactor_core(d, pal, rng, index):
    d.rounded_rectangle(S((91, 63, 212, 278)), 25, fill=(*pal["dark"], 245), outline=(*pal["mid"], 230), width=S(7))
    d.ellipse(S((86, 51, 217, 95)), fill=(*pal["mid"], 230), outline=(*pal["glow"], 210), width=S(4))
    d.ellipse(S((96, 151, 207, 248)), fill=(*pal["glow"], 170), outline=(255, 245, 220, 220), width=S(4))
    for x in (75, 228):
        d.rounded_rectangle(S((x - 13, 105, x + 13, 263)), 8, fill=(*pal["mid"], 220), outline=(*pal["accent"], 190), width=S(3))


def prop_void_altar(d, pal, rng, index):
    d.rounded_rectangle(S((68, 219, 235, 275)), 12, fill=(*pal["dark"], 245), outline=(*pal["mid"], 230), width=S(5))
    d.ellipse(S((67, 175, 236, 236)), fill=(*pal["mid"], 210), outline=(*pal["accent"], 220), width=S(5))
    draw_crystal(d, 152, 159, 82, 26, pal)
    for cx in (86, 216):
        line(d, [(cx, 194), (cx - 18, 252)], fill=(*pal["accent"], 170), width=4)


def prop_portal_ring(d, pal, rng, index):
    d.ellipse(S((42, 53, 261, 275)), fill=(*pal["dark"], 245), outline=(*pal["mid"], 230), width=S(12))
    d.ellipse(S((80, 90, 223, 236)), fill=(*pal["glow"], 170), outline=(*pal["accent"], 230), width=S(5))
    for r in range(0, 360, 30):
        x = 152 + math.cos(math.radians(r)) * 101
        y = 164 + math.sin(math.radians(r)) * 101
        d.rounded_rectangle(S((x - 11, y - 11, x + 11, y + 11)), 5, fill=(*pal["mid"], 230), outline=(*pal["glow"], 160), width=S(2))


def prop_mushroom_grove(d, pal, rng, index):
    for cx, cy, rw, rh in [(152, 116, 62, 34), (81, 179, 45, 25), (225, 183, 43, 24), (125, 218, 28, 18), (195, 229, 25, 16)]:
        d.rounded_rectangle(S((cx - 10, cy, cx + 10, 270)), 8, fill=(*pal["mid"], 220), outline=(*pal["dark"], 220), width=S(2))
        d.ellipse(S((cx - rw, cy - rh, cx + rw, cy + rh)), fill=(*pal["accent"], 235), outline=(*pal["glow"], 210), width=S(3))
        d.arc(S((cx - rw + 8, cy - rh + 6, cx + rw - 8, cy + rh)), 10, 170, fill=(245, 255, 255, 180), width=S(2))


def prop_front_bridge(d, pal, rng, index):
    d.rounded_rectangle(S((35, 144, 268, 194)), 9, fill=(*pal["mid"], 235), outline=(*pal["glow"], 150), width=S(4))
    for x in range(50, 250, 38):
        d.rectangle(S((x, 193, x + 20, 272)), fill=(*pal["dark"], 235), outline=(*pal["mid"], 210), width=S(3))
    for x in range(46, 250, 28):
        line(d, [(x, 203), (x + 16, 251)], fill=(*pal["accent"], 150), width=3)


def prop_power_pillar(d, pal, rng, index):
    d.rounded_rectangle(S((106, 74, 197, 278)), 20, fill=(*pal["dark"], 245), outline=(*pal["mid"], 230), width=S(6))
    d.ellipse(S((90, 52, 213, 132)), fill=(*pal["glow"], 170), outline=(255, 250, 215, 220), width=S(4))
    d.rectangle(S((123, 134, 180, 260)), fill=(*pal["mid"], 160), outline=(*pal["accent"], 200), width=S(4))
    for y in range(148, 240, 24):
        line(d, [(118, y), (185, y)], fill=(*pal["glow"], 170), width=2)


def prop_resource_cache_front(d, pal, rng, index):
    d.rounded_rectangle(S((67, 151, 236, 273)), 11, fill=mix(pal["mid"], (120, 74, 39), 0.45) + (245,), outline=(*pal["dark"], 240), width=S(6))
    d.rectangle(S((75, 171, 228, 214)), fill=(*pal["dark"], 120), outline=(*pal["accent"], 150), width=S(3))
    for cx in (100, 130, 164, 197):
        draw_crystal(d, cx, 163, 68 + rng.randint(-8, 8), 18 + rng.randint(0, 7), pal)
    d.ellipse(S((89, 252, 119, 282)), fill=(*pal["dark"], 245), outline=(*pal["mid"], 230), width=S(4))
    d.ellipse(S((184, 252, 214, 282)), fill=(*pal["dark"], 245), outline=(*pal["mid"], 230), width=S(4))


def write_backgrounds(tiles: list[dict]) -> list[dict]:
    out_tiles = []
    for tile in tiles:
        rel = Path("sprites") / "backgrounds" / "bg-v14" / tile["layer_id"].lower() / f"{tile['biome']}_{tile['layer_id'].lower()}.png"
        path = OUT / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        img = background_image(tile)
        img.save(path)
        out_tiles.append({**tile, "source": rel.as_posix()})
    return out_tiles


def write_props() -> tuple[list[dict], Path]:
    PROP_ROOT.mkdir(parents=True, exist_ok=True)
    grid = Image.new("RGBA", (PROP_W * PROP_COLS, PROP_H * PROP_COLS), (0, 0, 0, 0))
    props = []
    for i in range(1, PROP_COUNT + 1):
        img, meta = draw_prop(i)
        x = ((i - 1) % PROP_COLS) * PROP_W
        y = ((i - 1) // PROP_COLS) * PROP_H
        grid.alpha_composite(img, (x, y))
        props.append({**meta, "tile_id": i - 1, "grid_x": x, "grid_y": y})
    path = PROP_ROOT / "v14_props_grid_303x313_10x10.png"
    grid.save(path)
    return props, path


def write_tsx(backgrounds: list[dict], props: list[dict]):
    bg_lines = [
        "<?xml version='1.0' encoding='UTF-8'?>",
        '<tileset version="1.10" tiledversion="1.12.0" name="dig-game-clean-12layer-backgrounds-v14" tilewidth="996" tileheight="142" tilecount="84" columns="0" objectalignment="bottomleft">',
        " <properties>",
        '  <property name="sourceContract" value="dig_game_12layer_palette_true_separate_v1"/>',
        '  <property name="backgroundLeakPolicy" value="opaque RGB, no grey/green matte or transparent fill"/>',
        " </properties>",
    ]
    for tile in backgrounds:
        bg_lines += [
            f' <tile id="{tile["id"]}" type="backgrounds">',
            "  <properties>",
            f'   <property name="approvalId" value="B{tile["id"] + 1:03d}"/>',
            f'   <property name="biome" value="{escape(tile["biome"])}"/>',
            f'   <property name="assetLayerId" value="{tile["layer_id"]}"/>',
            f'   <property name="assetLayerName" value="{escape(tile["layer_name"])}"/>',
            f'   <property name="loopX" value="{tile["loop_x"]}"/>',
            f'   <property name="parallaxX" value="{tile["parallax_x"]}"/>',
            f'   <property name="parallaxY" value="{tile["parallax_y"]}"/>',
            "  </properties>",
            f'  <image width="{tile["width"]}" height="{tile["height"]}" source="{escape(tile["source"])}"/>',
            " </tile>",
        ]
    bg_lines.append("</tileset>")
    (OUT / "dig-game-clean-12layer-backgrounds-v14.tsx").write_text("\n".join(bg_lines) + "\n", encoding="utf-8")

    prop_lines = [
        "<?xml version='1.0' encoding='UTF-8'?>",
        f'<tileset version="1.10" tiledversion="1.12.0" name="dig-game-clean-props-303x313-grid-v14" tilewidth="{PROP_W}" tileheight="{PROP_H}" tilecount="{PROP_COUNT}" columns="{PROP_COLS}" objectalignment="bottomleft">',
        " <properties>",
        '  <property name="gridPrepared" value="true"/>',
        '  <property name="backgroundLeakPolicy" value="transparent outside silhouette only; no grey/green matte"/>',
        " </properties>",
        f' <image width="{PROP_W * PROP_COLS}" height="{PROP_H * PROP_COLS}" source="sprites/props/v14_props_grid_303x313_10x10.png"/>',
    ]
    for prop in props:
        prop_lines += [
            f' <tile id="{prop["tile_id"]}" type="props">',
            "  <properties>",
            f'   <property name="approvalId" value="{prop["id"]}"/>',
            f'   <property name="kind" value="{prop["kind"]}"/>',
            f'   <property name="biomeTheme" value="{prop["biome"]}"/>',
            "  </properties>",
            " </tile>",
        ]
    prop_lines.append("</tileset>")
    (OUT / "dig-game-clean-props-303x313-grid-v14.tsx").write_text("\n".join(prop_lines) + "\n", encoding="utf-8")


def write_tmx(backgrounds: list[dict], props: list[dict]):
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<map version="1.10" tiledversion="1.12.0" orientation="orthogonal" renderorder="right-down" width="170" height="260" tilewidth="94" tileheight="94" infinite="0" nextlayerid="10" nextobjectid="500">',
        " <properties>",
        '  <property name="description" value="v14 clean approval palette: regenerated 12-layer backgrounds and 100 numbered prop cells; no runtime wiring."/>',
        '  <property name="sourceReference" value="../dig_game_12layer_palette_true_separate_v1/dig-game-12layer-true-separate-v1.tmx"/>',
        '  <property name="propGrid" value="10x10 cells, 303x313 each, transparent outside silhouettes"/>',
        '  <property name="backgroundContract" value="84 opaque RGB images matching source TSX dimensions"/>',
        " </properties>",
        ' <tileset firstgid="1" source="dig-game-clean-12layer-backgrounds-v14.tsx"/>',
        ' <tileset firstgid="85" source="dig-game-clean-props-303x313-grid-v14.tsx"/>',
    ]
    object_id = 1
    for biome in BIOME_PALETTES:
        lines.append(f' <objectgroup id="{object_id}" name="B backgrounds - {biome}">')
        group_tiles = [t for t in backgrounds if t["biome"] == biome]
        for layer_idx, tile in enumerate(group_tiles):
            x = 90 + (layer_idx % 3) * 560
            y = 120 + (layer_idx // 3) * 132 + list(BIOME_PALETTES).index(biome) * 570
            lines.append(
                f'  <object id="{object_id}" name="B{tile["id"] + 1:03d} {tile["biome"]} {tile["layer_id"]} {escape(tile["layer_name"])}" type="backgrounds" gid="{BG_FIRST_GID + tile["id"]}" x="{x}" y="{y}" width="{tile["width"] // 2}" height="{max(1, tile["height"] // 2)}"/>'
            )
            object_id += 1
        lines.append(" </objectgroup>")
    lines.append(f' <objectgroup id="{object_id}" name="P props numbered 001-100 - 303x313 grid">')
    object_id += 1
    for prop in props:
        i = int(prop["id"][1:])
        x = 90 + ((i - 1) % 5) * 350
        y = 4200 + ((i - 1) // 5) * 355
        lines.append(
            f'  <object id="{object_id}" name="{prop["id"]} {prop["kind"]} {prop["biome"]}" type="props" gid="{PROP_FIRST_GID + i - 1}" x="{x}" y="{y}" width="{PROP_W}" height="{PROP_H}"/>'
        )
        object_id += 1
    lines.append(" </objectgroup>")
    lines.append("</map>")
    (OUT / "dig-game-clean-props-backgrounds-v14.tmx").write_text("\n".join(lines) + "\n", encoding="utf-8")


def preview_props(props_path: Path, props: list[dict]) -> Path:
    PREVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    grid = Image.open(props_path).convert("RGBA")
    pad, label_h = 22, 32
    out = Image.new("RGB", (PROP_COLS * (PROP_W + pad) + pad, PROP_COLS * (PROP_H + label_h + pad) + pad), (9, 14, 20))
    d = ImageDraw.Draw(out)
    f = font(20)
    for i, prop in enumerate(props):
        sx = (i % PROP_COLS) * PROP_W
        sy = (i // PROP_COLS) * PROP_H
        cell = grid.crop((sx, sy, sx + PROP_W, sy + PROP_H))
        x = pad + (i % PROP_COLS) * (PROP_W + pad)
        y = pad + (i // PROP_COLS) * (PROP_H + label_h + pad)
        d.rectangle((x, y, x + PROP_W, y + label_h - 1), fill=(17, 25, 35), outline=(88, 198, 222))
        d.text((x + 8, y + 5), f'{prop["id"]}  {prop["kind"]}', fill=(238, 222, 125), font=f)
        d.rectangle((x, y + label_h, x + PROP_W, y + label_h + PROP_H), fill=(12, 18, 26), outline=(88, 198, 222))
        out.paste(cell, (x, y + label_h), cell)
    path = PREVIEW_ROOT / "preview-v14-props-numbered-approval-sheet.png"
    out.save(path)
    return path


def preview_backgrounds(backgrounds: list[dict]) -> Path:
    thumb_w, row_h, cols = 312, 82, 3
    pad, label_h = 18, 22
    rows = math.ceil(len(backgrounds) / cols)
    out = Image.new("RGB", (cols * (thumb_w + pad) + pad, rows * (row_h + label_h + pad) + pad), (9, 14, 20))
    d = ImageDraw.Draw(out)
    f = font(15)
    for i, tile in enumerate(backgrounds):
        img = Image.open(OUT / tile["source"]).convert("RGB")
        h = max(1, int(img.height * (thumb_w / img.width)))
        thumb = img.resize((thumb_w, h), Image.Resampling.LANCZOS)
        x = pad + (i % cols) * (thumb_w + pad)
        y = pad + (i // cols) * (row_h + label_h + pad)
        label = f'B{i + 1:03d} {tile["biome"]} {tile["layer_id"]}'
        d.rectangle((x, y, x + thumb_w, y + label_h - 1), fill=(17, 25, 35), outline=(88, 198, 222))
        d.text((x + 6, y + 3), label, fill=(238, 222, 125), font=f)
        d.rectangle((x, y + label_h, x + thumb_w, y + label_h + row_h), fill=(12, 18, 26), outline=(88, 198, 222))
        out.paste(thumb, (x, y + label_h + (row_h - h) // 2))
    path = PREVIEW_ROOT / "preview-v14-backgrounds-numbered-approval-sheet.png"
    out.save(path)
    return path


def validate(backgrounds: list[dict], props_path: Path) -> dict:
    problems = []
    forbidden_exact = {(0, 255, 0), (128, 128, 128), (127, 127, 127), (192, 192, 192), (64, 64, 64)}
    for tile in backgrounds:
        img = Image.open(OUT / tile["source"])
        if img.size != (tile["width"], tile["height"]):
            problems.append(f'background dimension mismatch {tile["source"]}')
        if img.mode not in {"RGB", "RGBA"}:
            problems.append(f'background mode unsupported {tile["source"]}: {img.mode}')
        if img.mode == "RGBA" and min(img.getchannel("A").getextrema()) < 255:
            problems.append(f'background has transparency {tile["source"]}')
        rgb = img.convert("RGB")
        edge = []
        w, h = rgb.size
        for x in range(w):
            edge.append(rgb.getpixel((x, 0)))
            edge.append(rgb.getpixel((x, h - 1)))
        for y in range(h):
            edge.append(rgb.getpixel((0, y)))
            edge.append(rgb.getpixel((w - 1, y)))
        if any(p in forbidden_exact for p in edge):
            problems.append(f'background exact grey/green edge matte {tile["source"]}')

    grid = Image.open(props_path).convert("RGBA")
    if grid.size != (PROP_W * PROP_COLS, PROP_H * PROP_COLS):
        problems.append("prop grid dimension mismatch")
    for i in range(PROP_COUNT):
        sx = (i % PROP_COLS) * PROP_W
        sy = (i // PROP_COLS) * PROP_H
        cell = grid.crop((sx, sy, sx + PROP_W, sy + PROP_H))
        alpha = cell.getchannel("A")
        if alpha.getbbox() is None:
            problems.append(f"P{i + 1:03d} blank")
            continue
        bbox = alpha.getbbox()
        if bbox[0] < 8 or bbox[1] < 8 or bbox[2] > PROP_W - 8 or bbox[3] > PROP_H - 8:
            problems.append(f"P{i + 1:03d} cropped or insufficient padding bbox={bbox}")
        for pt in [(0, 0), (PROP_W - 1, 0), (0, PROP_H - 1), (PROP_W - 1, PROP_H - 1)]:
            if cell.getpixel(pt)[3] != 0:
                problems.append(f"P{i + 1:03d} nontransparent cell corner {pt}")
        for x in range(PROP_W):
            for y in (0, PROP_H - 1):
                r, g, b, a = cell.getpixel((x, y))
                if a and (r, g, b) in forbidden_exact:
                    problems.append(f"P{i + 1:03d} edge matte color")
        for y in range(PROP_H):
            for x in (0, PROP_W - 1):
                r, g, b, a = cell.getpixel((x, y))
                if a and (r, g, b) in forbidden_exact:
                    problems.append(f"P{i + 1:03d} edge matte color")
    return {"ok": not problems, "problems": problems, "backgrounds": len(backgrounds), "props": PROP_COUNT}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    BG_ROOT.mkdir(parents=True, exist_ok=True)
    PREVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    tiles = parse_source_tiles()
    backgrounds = write_backgrounds(tiles)
    props, props_path = write_props()
    write_tsx(backgrounds, props)
    write_tmx(backgrounds, props)
    prop_preview = preview_props(props_path, props)
    bg_preview = preview_backgrounds(backgrounds)
    validation = validate(backgrounds, props_path)
    manifest = {
        "generatedBy": Path(__file__).name,
        "scope": "approval palette only; no runtime wiring",
        "source": str(SRC_TSX.relative_to(ROOT)).replace("\\", "/"),
        "output": str(OUT.relative_to(ROOT)).replace("\\", "/"),
        "paletteTmx": "dig-game-clean-props-backgrounds-v14.tmx",
        "backgroundCount": len(backgrounds),
        "propCount": len(props),
        "propGrid": {"columns": PROP_COLS, "cellWidth": PROP_W, "cellHeight": PROP_H},
        "previews": [str(prop_preview.relative_to(OUT)).replace("\\", "/"), str(bg_preview.relative_to(OUT)).replace("\\", "/")],
        "validation": validation,
    }
    (OUT / "manifest_v14_clean_props_backgrounds.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))
    if not validation["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
