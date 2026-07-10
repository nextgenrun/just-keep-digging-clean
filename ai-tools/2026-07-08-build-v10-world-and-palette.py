from __future__ import annotations

import base64
import json
import shutil
import struct
import zlib
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC_WORLD = ROOT / "exports/dig-game-world-edit-v-7-30-06-2026-;layered.tmx"
OUT_WORLD = ROOT / "exports/dig-game-world-edit-v-10-08-07-2026-;layered.tmx"
V9 = ROOT / "exports/pallet-v9/dig_game_empty_backgrounds_and_separate_props_v1"
MOCK = ROOT / "exports/ai-enhanced/v7-30-runtime-preview/2026-07-08-current-close-mockups-v5"
OUT = ROOT / "exports/pallet-v10/dig_game_empty_backgrounds_and_separate_props_v10_08_07_2026"
PROP_CELL = (303, 313)
TILE = 94
BG_CELL = (996, 142)
BG_TSX = "dig-game-empty-background-strips-v10-08-07-2026.tsx"
PROP_TSX = "dig-game-clean-props-v10-08-07-2026.tsx"
DEEP_TSX = "dig-game-deep-resource-tiles-v10-08-07-2026.tsx"
SPECIAL_BG_TSX = "dig-game-highres-background-specials-v10-08-07-2026.tsx"
PAL_TMX = "dig-game-empty-backgrounds-and-separate-props-v10-08-07-2026.tmx"
BG_SCALE = 4
BG_OUT_CELL = (BG_CELL[0] * BG_SCALE, BG_CELL[1] * BG_SCALE)
RESOURCE_NAMES = [
    "dirt", "stone", "copper", "dark_dirt", "hard_dark_dirt",
    "bronze", "steel", "iron", "silver", "gold",
    "lava_dirt", "obsidian", "ember_ore", "magma_crystal", "geode_crystal",
    "gp_100", "gp_250", "gp_500", "gp_1000", "gp_1700",
]
WORLD_DEEP_FIRSTGID = 3188
WORLD_SPECIAL_BG_FIRSTGID = WORLD_DEEP_FIRSTGID + len(RESOURCE_NAMES)
APPROVED_PROP_FILES = {
    "irradiated_storm_surface__l11__15.png": "storm_bridge",
    "bioluminescent_root_caverns__l11__11.png": "root_lantern",
    "frozen_prism_abyss__l11__13.png": "frozen_gate",
    "industrial_magma_sanctum__l11__13.png": "magma_reactor",
    "void_realm__l11__16.png": "void_altar",
    "cave_biome__l11__14.png": "crystal_cart",
    "deep_cave_biome__l11__07.png": "deep_portal",
    "bioluminescent_root_caverns__l11__15.png": "bio_mushrooms",
}


def read_xml(path: Path) -> ET.ElementTree:
    return ET.parse(path)


def write_xml(tree: ET.ElementTree, path: Path) -> None:
    ET.indent(tree, space=" ")
    tree.write(path, encoding="UTF-8", xml_declaration=True)


def reset_output_dir() -> None:
    if not OUT.exists():
        return
    resolved = OUT.resolve()
    allowed = (ROOT / "exports/pallet-v10").resolve()
    if allowed not in resolved.parents and resolved != allowed:
        raise RuntimeError(f"Refusing to remove outside palette output root: {resolved}")
    shutil.rmtree(resolved)


def abox(img: Image.Image, cut: int = 12):
    return img.getchannel("A").point(lambda a: 255 if a > cut else 0).getbbox()


def fit(img: Image.Image, size: tuple[int, int], pad: int = 0, anchor: str = "center") -> Image.Image:
    img = img.convert("RGBA")
    box = abox(img) or (0, 0, img.width, img.height)
    crop = img.crop(box)
    scale = min((size[0] - pad * 2) / crop.width, (size[1] - pad * 2) / crop.height)
    resized = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    x = (size[0] - resized.width) // 2
    y = (size[1] - resized.height) // 2 if anchor == "center" else size[1] - pad - resized.height
    out.alpha_composite(resized, (x, y))
    return out


def solid_alpha(img: Image.Image, cut: int = 26) -> Image.Image:
    img = img.convert("RGBA")
    pix = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pix[x, y]
            pix[x, y] = (0, 0, 0, 0) if a <= cut else (r, g, b, 255)
    return img


def exact_background_strip(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    if img.size != BG_OUT_CELL:
        img = img.resize(BG_OUT_CELL, Image.Resampling.LANCZOS)
    return img


def is_pink_spill(r: int, g: int, b: int, a: int = 255) -> bool:
    return a > 0 and r > 135 and b > 115 and g < 105 and abs(r - b) < 105 and min(r, b) - g > 62


def is_edge_matte(r: int, g: int, b: int, a: int = 255) -> bool:
    if a == 0:
        return False
    return keyish(r, g, b, a)


def clean_edge_matte(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    src = img.copy()
    pix = img.load()
    spix = src.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = spix[x, y]
            if not is_edge_matte(r, g, b, a):
                continue
            touches_alpha = False
            for oy in range(-2, 3):
                for ox in range(-2, 3):
                    nx, ny = x + ox, y + oy
                    if 0 <= nx < img.width and 0 <= ny < img.height and spix[nx, ny][3] == 0:
                        touches_alpha = True
            if touches_alpha:
                pix[x, y] = (0, 0, 0, 0)
    return img


def purge_edge_keys(img: Image.Image, radius: int = 6) -> Image.Image:
    img = img.convert("RGBA")
    src = img.copy()
    pix = img.load()
    spix = src.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = spix[x, y]
            if not keyish(r, g, b, a):
                continue
            touches_alpha = False
            for oy in range(-radius, radius + 1):
                for ox in range(-radius, radius + 1):
                    nx, ny = x + ox, y + oy
                    if 0 <= nx < img.width and 0 <= ny < img.height and spix[nx, ny][3] == 0:
                        touches_alpha = True
            if touches_alpha:
                pix[x, y] = (0, 0, 0, 0)
    return img


def despill_pink(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    src = img.copy()
    pix = img.load()
    spix = src.load()
    marked = []
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = spix[x, y]
            if is_pink_spill(r, g, b, a):
                marked.append((x, y))
    for x, y in marked:
        replacement = None
        for radius in range(1, 6):
            for oy in range(-radius, radius + 1):
                for ox in range(-radius, radius + 1):
                    nx, ny = x + ox, y + oy
                    if 0 <= nx < img.width and 0 <= ny < img.height:
                        r, g, b, a = spix[nx, ny]
                        if a > 0 and not is_pink_spill(r, g, b, a):
                            replacement = (r, g, b, 255)
                            break
                if replacement:
                    break
            if replacement:
                break
        pix[x, y] = replacement or (0, 0, 0, 0)
    return img


def is_purple_halo(r: int, g: int, b: int, a: int = 255) -> bool:
    if a == 0:
        return False
    return r > 64 and b > 72 and g < 156 and max(r, b) > g + 20 and (r + b - 2 * g) > 44


def edge_halo_to_object_color(img: Image.Image, radius: int = 9) -> Image.Image:
    img = img.convert("RGBA")
    src = img.copy()
    pix = img.load()
    spix = src.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = spix[x, y]
            if not is_purple_halo(r, g, b, a):
                continue
            touches_alpha = False
            for oy in range(-radius, radius + 1):
                for ox in range(-radius, radius + 1):
                    nx, ny = x + ox, y + oy
                    if 0 <= nx < img.width and 0 <= ny < img.height and spix[nx, ny][3] == 0:
                        touches_alpha = True
                        break
                if touches_alpha:
                    break
            if not touches_alpha:
                continue
            replacement = None
            for scan_radius in range(1, radius + 8):
                for oy in range(-scan_radius, scan_radius + 1):
                    for ox in range(-scan_radius, scan_radius + 1):
                        nx, ny = x + ox, y + oy
                        if 0 <= nx < img.width and 0 <= ny < img.height:
                            nr, ng, nb, na = spix[nx, ny]
                            if na > 0 and not keyish(nr, ng, nb, na) and not is_purple_halo(nr, ng, nb, na):
                                replacement = (nr, ng, nb, 255)
                                break
                    if replacement:
                        break
                if replacement:
                    break
            pix[x, y] = replacement or (0, 0, 0, 0)
    return img


def keyish(r: int, g: int, b: int, a: int = 255) -> bool:
    if a == 0:
        return False
    magenta = r > 230 and b > 230 and g < 45
    hot_green = g > 245 and r < 24 and b < 24
    return magenta or hot_green


def edge_key_to_alpha(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    pix = img.load()
    w, h = img.size
    corners = [pix[0, 0], pix[w - 1, 0], pix[0, h - 1], pix[w - 1, h - 1]]
    if all(c[3] < 16 for c in corners):
        return img
    avg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    def is_bg(x: int, y: int) -> bool:
        r, g, b, a = pix[x, y]
        if a < 16 or keyish(r, g, b, a):
            return True
        return sum(abs((r, g, b)[i] - avg[i]) for i in range(3)) < 58

    stack = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)]
    stack += [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    seen: set[tuple[int, int]] = set()
    while stack:
        x, y = stack.pop()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h) or not is_bg(x, y):
            continue
        seen.add((x, y))
        pix[x, y] = (0, 0, 0, 0)
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    return img


def final_prop_cell(img: Image.Image) -> Image.Image:
    return purge_edge_keys(solid_alpha(clean_edge_matte(edge_halo_to_object_color(despill_pink(solid_alpha(img))))))


def component_boxes(img: Image.Image, min_area: int = 5000):
    pix = img.load()
    w, h = img.size
    seen = bytearray(w * h)
    boxes = []
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if seen[i] or pix[x, y][3] == 0:
                continue
            stack = [(x, y)]
            seen[i] = 1
            area = 0
            x0 = x1 = x
            y0 = y1 = y
            while stack:
                cx, cy = stack.pop()
                area += 1
                x0, x1 = min(x0, cx), max(x1, cx)
                y0, y1 = min(y0, cy), max(y1, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if not seen[j] and pix[nx, ny][3] > 0:
                            seen[j] = 1
                            stack.append((nx, ny))
            if area >= min_area:
                boxes.append((area, (x0, y0, x1 + 1, y1 + 1)))
    top = sorted([b for _, b in boxes if b[1] < h // 2], key=lambda b: b[0])
    bottom = sorted([b for _, b in boxes if b[1] >= h // 2], key=lambda b: b[0])
    return top + bottom


def approved_prop_cells() -> dict[str, Image.Image]:
    src = Image.open(MOCK / "source-magenta-key-props.png").convert("RGBA")
    pix = src.load()
    for y in range(src.height):
        for x in range(src.width):
            r, g, b, a = pix[x, y]
            if keyish(r, g, b, a):
                pix[x, y] = (0, 0, 0, 0)
    cells = []
    for box in component_boxes(src)[:8]:
        x0, y0, x1, y1 = box
        crop = src.crop((max(0, x0 - 24), max(0, y0 - 24), min(src.width, x1 + 24), min(src.height, y1 + 24)))
        cells.append(final_prop_cell(fit(crop, PROP_CELL, 16, "bottom")))
    return dict(zip(APPROVED_PROP_FILES.keys(), cells))


def save_backgrounds(bg_tree: ET.ElementTree) -> dict:
    stats = Counter()
    for image in bg_tree.getroot().iter("image"):
        rel = Path(image.get("source"))
        source = V9 / rel
        stats["backgroundFromV9Contract"] += 1
        dest = OUT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        im = exact_background_strip(Image.open(source))
        im.save(dest)
        image.set("width", str(BG_OUT_CELL[0]))
        image.set("height", str(BG_OUT_CELL[1]))
    bg_tree.getroot().set("name", "dig-game-empty-background-strips-v10-08-07-2026")
    bg_tree.getroot().set("tilewidth", str(BG_OUT_CELL[0]))
    bg_tree.getroot().set("tileheight", str(BG_OUT_CELL[1]))
    return dict(stats)


def save_props(prop_tree: ET.ElementTree) -> dict:
    approved = approved_prop_cells()
    stats = Counter()
    for image in prop_tree.getroot().iter("image"):
        rel = Path(image.get("source"))
        if rel.name in approved:
            im = approved[rel.name]
            stats["approvedGeneratedProps"] += 1
        else:
            source = V9 / rel
            stats["propFromV9Contract"] += 1
            im = Image.open(source).convert("RGBA")
            im = final_prop_cell(fit(clean_edge_matte(edge_key_to_alpha(im)), PROP_CELL, 16, "bottom"))
        dest = OUT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        im.save(dest)
        image.set("width", str(PROP_CELL[0]))
        image.set("height", str(PROP_CELL[1]))
    root = prop_tree.getroot()
    root.set("name", "dig-game-clean-props-v10-08-07-2026")
    root.set("tilewidth", str(PROP_CELL[0]))
    root.set("tileheight", str(PROP_CELL[1]))
    return dict(stats)


def full_square_tile(crop: Image.Image) -> Image.Image:
    crop = crop.convert("RGBA")
    rgb = crop.convert("RGB")
    bg = rgb.getpixel((0, 0))
    xs, ys = [], []
    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = rgb.getpixel((x, y))
            if sum(abs((r, g, b)[i] - bg[i]) for i in range(3)) > 42:
                xs.append(x)
                ys.append(y)
    box = (min(xs), min(ys), max(xs) + 1, max(ys) + 1) if xs else (0, 0, crop.width, crop.height)
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    side = min(w, h)
    x0 += max(0, (w - side) // 2)
    # The proof sheet has drop shadows under the square tiles; keep the tile face
    # top-aligned so those shadows do not become part of the runtime tile.
    box = (x0, y0, x0 + side, y0 + side)
    tile = crop.crop(box).resize((TILE, TILE), Image.Resampling.LANCZOS).convert("RGBA")
    pix = tile.load()
    mask = set()
    for y in range(TILE):
        for x in range(TILE):
            r, g, b, a = pix[x, y]
            if a == 0 or sum(abs((r, g, b)[i] - bg[i]) for i in range(3)) < 34:
                mask.add((x, y))
    for x, y in list(mask):
        replacement = None
        for radius in range(1, 16):
            for oy in range(-radius, radius + 1):
                for ox in range(-radius, radius + 1):
                    nx, ny = x + ox, y + oy
                    if 0 <= nx < TILE and 0 <= ny < TILE and (nx, ny) not in mask:
                        replacement = pix[nx, ny]
                        break
                if replacement:
                    break
            if replacement:
                break
        pix[x, y] = replacement or pix[min(max(x, 6), TILE - 7), min(max(y, 6), TILE - 7)]
    return tile


def save_resource_tiles() -> None:
    img = Image.open(MOCK / "source-unique-resource-tiles.png").convert("RGBA")
    xs = [0.015, 0.213, 0.408, 0.603, 0.800, 0.985]
    ys = [0.070, 0.290, 0.503, 0.715, 0.910]
    out_dir = OUT / "sprites/tiles/deep_resource_tiles"
    out_dir.mkdir(parents=True, exist_ok=True)
    for row in range(4):
        for col in range(5):
            crop = img.crop((round(img.width * xs[col]), round(img.height * ys[row]), round(img.width * xs[col + 1]), round(img.height * ys[row + 1])))
            full_square_tile(crop).save(out_dir / f"{RESOURCE_NAMES[row * 5 + col]}.png")


def write_resource_tsx() -> None:
    ts = ET.Element("tileset", {"version": "1.10", "tiledversion": "1.12.0", "name": "dig-game-deep-resource-tiles-v10-08-07-2026", "tilewidth": "94", "tileheight": "94", "tilecount": str(len(RESOURCE_NAMES)), "columns": "0"})
    props = ET.SubElement(ts, "properties")
    ET.SubElement(props, "property", {"name": "tileClass", "value": "v10_deep_resource_visual"})
    ET.SubElement(props, "property", {"name": "intendedUse", "value": "deeper-depth visual editing only; semantic tile-type layer preserved"})
    for idx, name in enumerate(RESOURCE_NAMES):
        tile = ET.SubElement(ts, "tile", {"id": str(idx), "type": "v10_deep_resource_visual"})
        p = ET.SubElement(tile, "properties")
        ET.SubElement(p, "property", {"name": "name", "value": name})
        ET.SubElement(p, "property", {"name": "intendedDepth", "value": "deep" if idx < 15 else "special_gp"})
        ET.SubElement(tile, "image", {"width": "94", "height": "94", "source": f"sprites/tiles/deep_resource_tiles/{name}.png"})
    write_xml(ET.ElementTree(ts), OUT / DEEP_TSX)


def save_special_backgrounds() -> None:
    out_dir = OUT / "sprites/backgrounds/highres_specials"
    out_dir.mkdir(parents=True, exist_ok=True)
    specs = [
        ("industrial_magma_l01_large_fill.png", (4096, 4096), (66, 13, 9), (151, 35, 18), (255, 109, 30)),
        ("industrial_magma_l02_wide_atmosphere.png", (4096, 1024), (29, 15, 15), (119, 32, 18), (255, 124, 43)),
    ]
    for name, size, dark, mid, glow in specs:
        img = Image.new("RGBA", size, dark + (255,))
        d = ImageDraw.Draw(img)
        w, h = size
        for y in range(h):
            t = y / max(1, h - 1)
            col = tuple(round(mid[i] * (1 - t) + dark[i] * t) for i in range(3))
            d.line((0, y, w, y), fill=col + (255,))
        step = 192
        for x in range(-step, w + step, step):
            d.line((x, h, x + 110, 0), fill=glow + (46,), width=5)
            d.line((x + 60, h, x + 180, 0), fill=(70, 22, 14, 112), width=18)
        for x in range(0, w, 384):
            d.ellipse((x - 120, h * 0.58, x + 360, h * 1.15), fill=glow + (18,))
        img.save(out_dir / name)


def write_special_background_tsx() -> None:
    ts = ET.Element("tileset", {"version": "1.10", "tiledversion": "1.12.0", "name": "dig-game-highres-background-specials-v10-08-07-2026", "tilewidth": "4096", "tileheight": "4096", "tilecount": "2", "columns": "0", "objectalignment": "bottomleft"})
    props = ET.SubElement(ts, "properties")
    ET.SubElement(props, "property", {"name": "tileClass", "value": "v10_highres_background_special"})
    ET.SubElement(props, "property", {"name": "reason", "value": "replaces world objects that stretched v9 strips too far"})
    images = [
        ("industrial_magma_large_fill", "sprites/backgrounds/highres_specials/industrial_magma_l01_large_fill.png", "4096", "4096"),
        ("industrial_magma_wide_atmosphere", "sprites/backgrounds/highres_specials/industrial_magma_l02_wide_atmosphere.png", "4096", "1024"),
    ]
    for idx, (name, source, width, height) in enumerate(images):
        tile = ET.SubElement(ts, "tile", {"id": str(idx), "type": "backgrounds"})
        p = ET.SubElement(tile, "properties")
        ET.SubElement(p, "property", {"name": "name", "value": name})
        ET.SubElement(p, "property", {"name": "biome", "value": "industrial_magma_sanctum"})
        ET.SubElement(tile, "image", {"width": width, "height": height, "source": source})
    write_xml(ET.ElementTree(ts), OUT / SPECIAL_BG_TSX)


def write_palette_tmx() -> None:
    tree = read_xml(V9 / "dig-game-empty-backgrounds-and-separate-props-v1.tmx")
    root = tree.getroot()
    for ts in root.findall("tileset"):
        if ts.get("firstgid") == "1":
            ts.set("source", BG_TSX)
        elif ts.get("firstgid") == "78":
            ts.set("source", PROP_TSX)
    ET.SubElement(root, "tileset", {"firstgid": "190", "source": DEEP_TSX})
    ET.SubElement(root, "tileset", {"firstgid": "210", "source": SPECIAL_BG_TSX})
    props = root.find("properties")
    if props is None:
        props = ET.SubElement(root, "properties")
    ET.SubElement(props, "property", {"name": "deepResourceTileCount", "value": str(len(RESOURCE_NAMES))})
    ET.SubElement(props, "property", {"name": "sourcePalette", "value": "dig-game-empty-backgrounds-and-separate-props-v1"})
    ET.SubElement(props, "property", {"name": "approvedProps", "value": "8 imagegen-approved v5 props, component-sliced and matte-cleaned"})
    next_object = max(int(obj.get("id", "0")) for obj in root.iter("object")) + 1
    group = ET.SubElement(root, "objectgroup", {"id": root.get("nextlayerid", "999"), "name": "V10_Deep_Resource_Tiles"})
    ET.SubElement(group, "properties")
    for idx, name in enumerate(RESOURCE_NAMES):
        ET.SubElement(group, "object", {"id": str(next_object + idx), "name": name, "type": "v10_deep_resource_visual", "gid": str(190 + idx), "x": str(60 + (idx % 5) * 130), "y": str(13200 + (idx // 5) * 130), "width": "94", "height": "94"})
    group2 = ET.SubElement(root, "objectgroup", {"id": str(int(root.get("nextlayerid", "999")) + 1), "name": "V10_Highres_Background_Specials"})
    ET.SubElement(group2, "properties")
    specials = [
        ("industrial_magma_large_fill", 210, 760, 13200, 360, 360),
        ("industrial_magma_wide_atmosphere", 211, 1180, 13200, 520, 130),
    ]
    for offset, (name, gid, x, y, width, height) in enumerate(specials):
        ET.SubElement(group2, "object", {"id": str(next_object + len(RESOURCE_NAMES) + offset), "name": name, "type": "backgrounds", "gid": str(gid), "x": str(x), "y": str(y), "width": str(width), "height": str(height)})
    root.set("nextobjectid", str(next_object + len(RESOURCE_NAMES) + len(specials)))
    root.set("nextlayerid", str(int(root.get("nextlayerid", "999")) + 2))
    write_xml(tree, OUT / PAL_TMX)


def write_world() -> None:
    tree = read_xml(SRC_WORLD)
    root = tree.getroot()
    for ts in root.findall("tileset"):
        if ts.get("source") == "pallet-v9/dig_game_empty_backgrounds_and_separate_props_v1/dig-game-empty-background-strips-v1.tsx":
            ts.set("source", f"pallet-v10/dig_game_empty_backgrounds_and_separate_props_v10_08_07_2026/{BG_TSX}")
        if ts.get("source") == "pallet-v9/dig_game_empty_backgrounds_and_separate_props_v1/dig-game-clean-props-v1.tsx":
            ts.set("source", f"pallet-v10/dig_game_empty_backgrounds_and_separate_props_v10_08_07_2026/{PROP_TSX}")
    ET.SubElement(root, "tileset", {"firstgid": str(WORLD_DEEP_FIRSTGID), "source": f"pallet-v10/dig_game_empty_backgrounds_and_separate_props_v10_08_07_2026/{DEEP_TSX}"})
    ET.SubElement(root, "tileset", {"firstgid": str(WORLD_SPECIAL_BG_FIRSTGID), "source": f"pallet-v10/dig_game_empty_backgrounds_and_separate_props_v10_08_07_2026/{SPECIAL_BG_TSX}"})
    props = root.find("properties")
    if props is None:
        props = ET.SubElement(root, "properties")
    for prop in list(props.findall("property")):
        if prop.get("name") == "sourceMap":
            prop.set("value", "dig-game-world-edit-v-7-30-06-2026-;layered.tmx")
    ET.SubElement(props, "property", {"name": "v10ImprovedPalette", "value": f"pallet-v10/dig_game_empty_backgrounds_and_separate_props_v10_08_07_2026/{PAL_TMX}"})
    ET.SubElement(props, "property", {"name": "v10DeepResourceTiles", "value": f"pallet-v10/dig_game_empty_backgrounds_and_separate_props_v10_08_07_2026/{DEEP_TSX}"})
    ET.SubElement(props, "property", {"name": "v10HighresBackgroundSpecials", "value": f"pallet-v10/dig_game_empty_backgrounds_and_separate_props_v10_08_07_2026/{SPECIAL_BG_TSX}"})
    special_replacements = Counter()
    for obj in root.iter("object"):
        gid_text = obj.get("gid")
        if not gid_text:
            continue
        gid = int(gid_text)
        flags = gid & ~0x1FFFFFFF
        base = gid & 0x1FFFFFFF
        width = float(obj.get("width", "0") or 0)
        height = float(obj.get("height", "0") or 0)
        if base == 1726 and max(width / BG_OUT_CELL[0], height / BG_OUT_CELL[1]) > 4:
            obj.set("gid", str(flags | WORLD_SPECIAL_BG_FIRSTGID))
            special_replacements["industrial_magma_l01_large_fill"] += 1
        if base == 1727 and max(width / BG_OUT_CELL[0], height / BG_OUT_CELL[1]) > 4:
            obj.set("gid", str(flags | (WORLD_SPECIAL_BG_FIRSTGID + 1)))
            special_replacements["industrial_magma_l02_wide_atmosphere"] += 1
    root.set("nextlayerid", root.get("nextlayerid", "24"))
    write_xml(tree, OUT_WORLD)
    return dict(special_replacements)


def analyze_world() -> dict:
    root = read_xml(SRC_WORLD).getroot()
    sets = [(int(ts.get("firstgid")), ts.get("source")) for ts in root.findall("tileset")]
    ranges = Counter()
    for obj in root.iter("object"):
        if not obj.get("gid"):
            continue
        gid = int(obj.get("gid")) & 0x1FFFFFFF
        for i, (fg, src) in enumerate(sets):
            nfg = sets[i + 1][0] if i + 1 < len(sets) else 10**9
            if fg <= gid < nfg:
                ranges[src] += 1
                break
    layer = root.find("layer[@name='00_PAINT_HERE_tile_types']")
    nonzero = unique = 0
    if layer is not None:
        data = layer.find("data")
        raw = base64.b64decode((data.text or "").strip())
        if data.get("compression") == "zlib":
            raw = zlib.decompress(raw)
        gids = [g & 0x1FFFFFFF for g in struct.unpack("<" + "I" * (len(raw) // 4), raw)]
        counts = Counter(g for g in gids if g)
        nonzero, unique = sum(counts.values()), len(counts)
    return {"mapSize": [int(root.get("width")), int(root.get("height"))], "tileSize": [int(root.get("tilewidth")), int(root.get("tileheight"))], "tileLayerNonzero": nonzero, "tileLayerUniqueGids": unique, "objectGidRanges": dict(ranges)}


def qa_report() -> dict:
    prop_checks = []
    for path in (OUT / "sprites/props/near_props_seam_breakers").glob("*.png"):
        img = Image.open(path).convert("RGBA")
        pix = img.load()
        semi = 0
        edge_matte = 0
        opaque = 0
        for y in range(img.height):
            for x in range(img.width):
                r, g, b, a = pix[x, y]
                if 0 < a < 255:
                    semi += 1
                if a > 0:
                    opaque += 1
                if is_edge_matte(r, g, b, a):
                    touches_alpha = False
                    for oy in range(-2, 3):
                        for ox in range(-2, 3):
                            nx, ny = x + ox, y + oy
                            if 0 <= nx < img.width and 0 <= ny < img.height and pix[nx, ny][3] == 0:
                                touches_alpha = True
                    if touches_alpha:
                        edge_matte += 1
        corners = all(pix[x, y][3] <= 8 for x, y in [(0, 0), (img.width - 1, 0), (0, img.height - 1), (img.width - 1, img.height - 1)])
        prop_checks.append({"file": path.name, "size": list(img.size), "alphaCornersTransparent": corners, "semiAlphaPixels": semi, "edgeMattePixels": edge_matte, "opaquePixels": opaque})
    tile_checks = [{"file": p.name, "size": list(Image.open(p).size)} for p in (OUT / "sprites/tiles/deep_resource_tiles").glob("*.png")]
    bg_checks = [{"file": str(p.relative_to(OUT)), "size": list(Image.open(p).size)} for p in (OUT / "sprites/backgrounds").glob("*/*.png")]
    xml_paths = [OUT / BG_TSX, OUT / PROP_TSX, OUT / DEEP_TSX, OUT / SPECIAL_BG_TSX, OUT / PAL_TMX, OUT_WORLD]
    for path in xml_paths:
        ET.parse(path)
    return {
        "props": {"count": len(prop_checks), "all303x313": all(p["size"] == [303, 313] for p in prop_checks), "alphaCorners": all(p["alphaCornersTransparent"] for p in prop_checks)},
        "propLeakChecks": {"semiAlphaFree": all(p["semiAlphaPixels"] == 0 for p in prop_checks), "edgeMatteFree": all(p["edgeMattePixels"] == 0 for p in prop_checks), "worstEdgeMatte": max((p["edgeMattePixels"] for p in prop_checks), default=0)},
        "backgrounds": {
            "count": len(bg_checks),
            "normalStripsAll3984x568": all(b["size"] == list(BG_OUT_CELL) for b in bg_checks if "highres_specials" not in b["file"]),
            "specials": [b for b in bg_checks if "highres_specials" in b["file"]],
        },
        "deepResourceTiles": {"count": len(tile_checks), "all94x94": all(t["size"] == [94, 94] for t in tile_checks)},
        "xmlParsed": [str(p.relative_to(ROOT)) for p in xml_paths],
    }


def checkerboard(size: tuple[int, int], cell: int = 18) -> Image.Image:
    img = Image.new("RGBA", size, (84, 91, 94, 255))
    d = ImageDraw.Draw(img)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2 == 0:
                d.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(55, 60, 62, 255))
    return img


def preview() -> None:
    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except OSError:
        font = ImageFont.load_default()
    sheet = Image.new("RGBA", (720, 520), (16, 19, 23, 255))
    d = ImageDraw.Draw(sheet)
    d.text((20, 18), "v10 full-square deep resource tiles - exact 94 x 94", fill=(235, 240, 232, 255), font=font)
    for i, name in enumerate(RESOURCE_NAMES):
        img = Image.open(OUT / f"sprites/tiles/deep_resource_tiles/{name}.png").convert("RGBA")
        x, y = 24 + (i % 5) * 136, 58 + (i // 5) * 112
        sheet.alpha_composite(img, (x, y))
        d.rectangle((x, y, x + 93, y + 93), outline=(90, 244, 180, 255))
        d.text((x, y + 96), name, fill=(180, 190, 190, 255), font=font)
    sheet.save(OUT / "preview-v10-deep-resource-tiles.png")

    prop_sheet = Image.new("RGBA", (760, 1430), (16, 19, 23, 255))
    pd = ImageDraw.Draw(prop_sheet)
    pd.text((20, 18), "v10 approved forward-facing props - exact 303 x 313 transparent cells", fill=(235, 240, 232, 255), font=font)
    for idx, (file_name, label) in enumerate(APPROVED_PROP_FILES.items()):
        path = next((OUT / "sprites/props").rglob(file_name))
        cell_img = checkerboard(PROP_CELL)
        cell_img.alpha_composite(Image.open(path).convert("RGBA"), (0, 0))
        x, y = 34 + (idx % 2) * 365, 58 + (idx // 2) * 335
        prop_sheet.alpha_composite(cell_img, (x, y))
        pd.rectangle((x, y, x + PROP_CELL[0] - 1, y + PROP_CELL[1] - 1), outline=(244, 190, 72, 255), width=2)
        pd.line((x, y + PROP_CELL[1] - 1, x + PROP_CELL[0] - 1, y + PROP_CELL[1] - 1), fill=(90, 244, 180, 255), width=1)
        pd.text((x, y - 18), label, fill=(235, 240, 232, 255), font=font)
    prop_sheet.save(OUT / "preview-v10-approved-props.png")

    bg_sheet = Image.new("RGBA", (1120, 760), (16, 19, 23, 255))
    bd = ImageDraw.Draw(bg_sheet)
    bd.text((20, 18), "v10 background resolution proof - v9 contract scaled 4x plus high-res specials", fill=(235, 240, 232, 255), font=font)
    normal_bg = next(p for p in sorted((OUT / "sprites/backgrounds").glob("*/*.png")) if "highres_specials" not in p.parts)
    samples = [
        normal_bg,
        OUT / "sprites/backgrounds/highres_specials/industrial_magma_l01_large_fill.png",
        OUT / "sprites/backgrounds/highres_specials/industrial_magma_l02_wide_atmosphere.png",
    ]
    labels = ["normal strip 3984 x 568", "special fill 4096 x 4096", "special wide 4096 x 1024"]
    boxes = [(28, 70, 520, 205), (28, 270, 520, 650), (595, 270, 1092, 395)]
    for path, label, box in zip(samples, labels, boxes):
        src = Image.open(path).convert("RGBA")
        bx0, by0, bx1, by1 = box
        scale = min((bx1 - bx0) / src.width, (by1 - by0) / src.height)
        resized = src.resize((max(1, round(src.width * scale)), max(1, round(src.height * scale))), Image.Resampling.LANCZOS)
        bg_sheet.alpha_composite(resized, (bx0, by0))
        bd.rectangle((bx0, by0, bx1, by1), outline=(90, 244, 180, 255), width=2)
        bd.text((bx0, by0 - 20), label, fill=(210, 220, 216, 255), font=font)
        bd.text((bx0, by1 + 8), str(path.relative_to(OUT)), fill=(150, 160, 160, 255), font=font)
    bd.text((595, 70), "World replacement summary:", fill=(235, 240, 232, 255), font=font)
    bd.text((595, 102), "GID 1726 huge-stretched object -> high-res fill", fill=(190, 202, 200, 255), font=font)
    bd.text((595, 126), "GID 1727 huge-stretched objects -> high-res wide atmosphere", fill=(190, 202, 200, 255), font=font)
    bd.text((595, 160), "No runtime wiring was changed; this is an editable v10 TMX/palette copy.", fill=(190, 202, 200, 255), font=font)
    bg_sheet.save(OUT / "preview-v10-background-resolution.png")


def main() -> None:
    reset_output_dir()
    OUT.mkdir(parents=True, exist_ok=True)
    bg_tree = read_xml(V9 / "dig-game-empty-background-strips-v1.tsx")
    prop_tree = read_xml(V9 / "dig-game-clean-props-v1.tsx")
    stats = {"backgrounds": save_backgrounds(bg_tree), "props": save_props(prop_tree)}
    save_resource_tiles()
    write_resource_tsx()
    save_special_backgrounds()
    write_special_background_tsx()
    write_xml(bg_tree, OUT / BG_TSX)
    write_xml(prop_tree, OUT / PROP_TSX)
    write_palette_tmx()
    special_replacements = write_world()
    preview()
    report = {"sourceWorldAnalysis": analyze_world(), "stats": stats, "specialWorldReplacements": special_replacements, "qa": qa_report(), "outputs": {"world": str(OUT_WORLD), "palette": str(OUT / PAL_TMX)}}
    (OUT / "v10-generation-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    (OUT / "README.md").write_text("# v10 improved background and prop palette\n\nGenerated from the v9 palette contract without using the rejected 10x palette as an image source. Props are rebuilt as exact 303 x 313 transparent cells; normal background strips are rebuilt as exact 3984 x 568 high-resolution sources while preserving the v9 strip layout contract; eight approved v5 props replace their matching v9 prop slots. The v10 world copy redirects v9 background/prop TSX references here, replaces the worst overstretched background objects with high-resolution specials, and adds full-square deep resource tiles as an editable tileset.\n", encoding="utf-8")
    print(json.dumps(report["outputs"] | {"qa": report["qa"]}, indent=2))


if __name__ == "__main__":
    main()
