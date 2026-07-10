from __future__ import annotations

import base64
import hashlib
import json
import re
import shutil
import struct
import zlib
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
WORLD = ROOT / "exports/dig-game-world-edit-v-10-08-07-2026-;layered.tmx"
BASE_WORLD = ROOT / "exports/dig-game-world-edit-v-10-08-07-2026-;layered.before-gametime-rendered.tmx"
LIB = ROOT / "exports/pallet-v10/dig_game_gametime_rendered_v10_08_07_2026"
V10 = ROOT / "exports/pallet-v10/dig_game_empty_backgrounds_and_separate_props_v10_08_07_2026"
TILE = 94
PROP_CELL = (303, 313)
RESOURCE_DIR = V10 / "sprites/tiles/deep_resource_tiles"
AUTHORING_REPLACE = {
    1: "dirt", 2: "stone", 3: "copper", 4: "obsidian", 5: "dark_dirt",
    6: "hard_dark_dirt", 7: "bronze", 8: "steel", 9: "iron", 10: "silver",
    11: "gold", 17: "gp_100", 24: "hard_dark_dirt", 27: "geode_crystal",
    28: "geode_crystal",
}
RUNTIME_REPLACE = {914: "copper", 934: "steel", 939: "iron", 950: "obsidian", 964: "gp_500"}


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:72] or "tileset"


def write_xml(tree: ET.ElementTree, path: Path) -> None:
    ET.indent(tree, space=" ")
    tree.write(path, encoding="UTF-8", xml_declaration=True)


def reset() -> None:
    if not LIB.exists():
        return
    resolved = LIB.resolve()
    allowed = (ROOT / "exports/pallet-v10").resolve()
    if allowed not in resolved.parents:
        raise RuntimeError(f"Refusing to remove outside pallet-v10: {resolved}")
    shutil.rmtree(resolved)


def resolve_tsx(world_base: Path, src: str) -> Path:
    return (world_base / src).resolve()


def load_font(size: int = 14):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default()


def used_gids(root: ET.Element) -> dict[str, Counter]:
    tilesets = sorted((int(ts.get("firstgid")), ts.get("source")) for ts in root.findall("tileset") if ts.get("source"))
    used: dict[str, Counter] = defaultdict(Counter)

    def source_for(gid: int) -> tuple[str | None, int]:
        for i, (fg, src) in enumerate(tilesets):
            next_fg = tilesets[i + 1][0] if i + 1 < len(tilesets) else 10**9
            if fg <= gid < next_fg:
                return src, gid - fg
        return None, 0

    for layer in root.findall("layer"):
        data = layer.find("data")
        if data is None or not (data.text or "").strip():
            continue
        raw = base64.b64decode((data.text or "").strip())
        if data.get("compression") == "zlib":
            raw = zlib.decompress(raw)
        for raw_gid in struct.unpack("<" + "I" * (len(raw) // 4), raw):
            gid = raw_gid & 0x1FFFFFFF
            if gid:
                src, tile_id = source_for(gid)
                if src:
                    used[src][tile_id] += 1
    for obj in root.iter("object"):
        if obj.get("gid"):
            src, tile_id = source_for(int(obj.get("gid")) & 0x1FFFFFFF)
            if src:
                used[src][tile_id] += 1
    return used


def enhance(img: Image.Image, sharp: float = 1.4) -> Image.Image:
    img = img.convert("RGBA")
    rgb = img.convert("RGB")
    rgb = ImageEnhance.Color(rgb).enhance(1.13)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.18)
    rgb = ImageEnhance.Sharpness(rgb).enhance(sharp)
    out = Image.merge("RGBA", (*rgb.split(), img.getchannel("A")))
    return out.filter(ImageFilter.UnsharpMask(radius=1.0, percent=90, threshold=3))


def keyish(r: int, g: int, b: int, a: int = 255) -> bool:
    if a == 0:
        return False
    magenta = r > 210 and b > 190 and g < 95 and min(r, b) > g + 70
    hot_green = g > 210 and r < 80 and b < 100
    grey_edge = abs(r - g) < 9 and abs(g - b) < 9 and 42 <= r <= 142
    return magenta or hot_green or grey_edge


def edge_key_to_alpha(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    pix = img.load()
    w, h = img.size

    def is_bg(x: int, y: int) -> bool:
        r, g, b, a = pix[x, y]
        if a < 16 or keyish(r, g, b, a):
            return True
        corners = [pix[0, 0], pix[w - 1, 0], pix[0, h - 1], pix[w - 1, h - 1]]
        avg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))
        return sum(abs((r, g, b)[i] - avg[i]) for i in range(3)) < 38

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


def fit_alpha(img: Image.Image, size: tuple[int, int], pad: int = 14) -> Image.Image:
    img = edge_key_to_alpha(img)
    alpha = img.getchannel("A").point(lambda a: 255 if a > 16 else 0)
    box = alpha.getbbox() or (0, 0, img.width, img.height)
    crop = img.crop(box)
    scale = min((size[0] - pad * 2) / crop.width, (size[1] - pad * 2) / crop.height)
    resized = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.alpha_composite(resized, ((size[0] - resized.width) // 2, size[1] - pad - resized.height))
    pix = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = pix[x, y]
            pix[x, y] = (0, 0, 0, 0) if a <= 28 or keyish(r, g, b, a) else (r, g, b, 255)
    return enhance(out, 1.25)


def tile_from_resource(name: str) -> Image.Image:
    return Image.open(RESOURCE_DIR / f"{name}.png").convert("RGBA").resize((TILE, TILE), Image.Resampling.LANCZOS)


def render_cell(cell: Image.Image, tile_id: int, kind: str) -> Image.Image:
    if kind == "authoring" and tile_id in AUTHORING_REPLACE:
        return tile_from_resource(AUTHORING_REPLACE[tile_id])
    if kind == "runtime" and tile_id in RUNTIME_REPLACE:
        return tile_from_resource(RUNTIME_REPLACE[tile_id])
    if kind == "runtime" and tile_id == 884:
        base = tile_from_resource("hard_dark_dirt")
        cracks = cell.convert("RGBA").resize((TILE, TILE), Image.Resampling.LANCZOS)
        return Image.blend(base, enhance(cracks), 0.32)
    return enhance(cell.resize((TILE, TILE), Image.Resampling.LANCZOS))


def render_sheet(tsx: Path, out_tsx: Path, kind: str) -> dict:
    tree = ET.parse(tsx)
    root = tree.getroot()
    image = root.find("image")
    if image is None:
        raise RuntimeError(f"Expected single image tileset: {tsx}")
    tw, th = int(root.get("tilewidth")), int(root.get("tileheight"))
    cols = int(root.get("columns") or max(1, int(image.get("width")) // tw))
    count = int(root.get("tilecount") or 0)
    src_img = Image.open((tsx.parent / image.get("source")).resolve()).convert("RGBA")
    rows = (count + cols - 1) // cols
    out = Image.new("RGBA", (cols * tw, rows * th), (0, 0, 0, 0))
    for tile_id in range(count):
        sx, sy = (tile_id % cols) * tw, (tile_id // cols) * th
        cell = src_img.crop((sx, sy, sx + tw, sy + th))
        out.alpha_composite(render_cell(cell, tile_id, kind), (sx, sy))
    img_rel = Path("images") / f"{slug(root.get('name') or tsx.stem)}-rendered.png"
    (out_tsx.parent / img_rel).parent.mkdir(parents=True, exist_ok=True)
    out.save(out_tsx.parent / img_rel)
    root.set("name", f"{root.get('name')}-v10-rendered")
    image.set("source", img_rel.as_posix())
    image.set("width", str(out.width))
    image.set("height", str(out.height))
    write_xml(tree, out_tsx)
    return {"mode": "sheet", "count": count, "image": str((out_tsx.parent / img_rel).relative_to(LIB))}


def magma_background(size: tuple[int, int], seed: int) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size, (26, 13, 12, 255))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        col = (round(82 - 46 * t), round(34 - 20 * t), round(22 - 10 * t), 255)
        d.line((0, y, w, y), fill=col)
    step = max(90, w // 24)
    for i, x in enumerate(range(-step, w + step, step)):
        offset = ((i * 37 + seed * 17) % 140) - 70
        d.line((x + offset, h, x + step // 2, 0), fill=(255, 94, 30, 70), width=max(3, w // 900))
        d.line((x + offset + 12, h, x + step // 2 + 26, 0), fill=(75, 24, 16, 160), width=max(8, w // 340))
    for x in range(0, w, max(160, w // 18)):
        d.ellipse((x - w // 18, h * 0.55, x + w // 7, h * 1.18), fill=(255, 92, 24, 24))
    return enhance(img, 1.1)


def render_collection(tsx: Path, out_tsx: Path, used: Counter, include_all: bool) -> dict:
    tree = ET.parse(tsx)
    root = tree.getroot()
    source_tiles = {int(t.get("id")): t for t in root.findall("tile")}
    for tile in list(root.findall("tile")):
        root.remove(tile)
    written = 0
    max_w = max_h = 0
    for tile_id in sorted(source_tiles):
        if not include_all and tile_id not in used:
            continue
        old_tile = source_tiles[tile_id]
        image = old_tile.find("image")
        if image is None:
            continue
        src = (tsx.parent / image.get("source")).resolve()
        if "highres_specials" in image.get("source", ""):
            img = magma_background((int(image.get("width")), int(image.get("height"))), tile_id)
        else:
            img = Image.open(src).convert("RGBA")
            is_prop = int(image.get("width", "0")) <= 380 and int(image.get("height", "0")) <= 380
            if is_prop:
                img = fit_alpha(img, PROP_CELL)
            else:
                scale = 2 if max(img.width, img.height) < 3000 else 1
                img = img.resize((img.width * scale, img.height * scale), Image.Resampling.LANCZOS)
                img = enhance(img, 1.35)
        rel = Path("images") / slug(tsx.stem) / f"tile_{tile_id:04d}{src.suffix if src.suffix.lower() in ['.png', '.webp'] else '.png'}"
        if img.mode == "RGBA" and rel.suffix.lower() == ".webp":
            rel = rel.with_suffix(".png")
        (out_tsx.parent / rel).parent.mkdir(parents=True, exist_ok=True)
        img.save(out_tsx.parent / rel)
        new_tile = ET.fromstring(ET.tostring(old_tile))
        new_image = new_tile.find("image")
        new_image.set("source", rel.as_posix())
        new_image.set("width", str(img.width))
        new_image.set("height", str(img.height))
        root.append(new_tile)
        written += 1
        max_w = max(max_w, img.width)
        max_h = max(max_h, img.height)
    root.set("name", f"{root.get('name')}-v10-rendered")
    if max_w and max_h:
        root.set("tilewidth", str(max_w))
        root.set("tileheight", str(max_h))
    write_xml(tree, out_tsx)
    return {"mode": "collection", "writtenTiles": written, "includeAll": include_all}


def update_world(source_map: dict[str, str], used: dict[str, Counter]) -> list[str]:
    tree = ET.parse(BASE_WORLD)
    root = tree.getroot()
    removed = []
    for ts in list(root.findall("tileset")):
        src = ts.get("source")
        if not src:
            continue
        if src not in used:
            removed.append(src)
            root.remove(ts)
        else:
            ts.set("source", source_map[src])
    props = root.find("properties")
    if props is None:
        props = ET.SubElement(root, "properties")
    ET.SubElement(props, "property", {"name": "v10GametimeRenderedLibrary", "value": "pallet-v10/dig_game_gametime_rendered_v10_08_07_2026"})
    write_xml(tree, WORLD)
    return removed


def main() -> None:
    if not BASE_WORLD.exists():
        shutil.copy2(WORLD, BASE_WORLD)
    reset()
    (LIB / "tilesets").mkdir(parents=True, exist_ok=True)
    world_root = ET.parse(BASE_WORLD).getroot()
    used = used_gids(world_root)
    source_map, stats = {}, {}
    for src, counter in used.items():
        tsx = resolve_tsx(BASE_WORLD.parent, src)
        digest = hashlib.sha1(src.encode("utf-8")).hexdigest()[:8]
        out_tsx = LIB / "tilesets" / f"{slug(Path(src).stem)}-{digest}.tsx"
        root = ET.parse(tsx).getroot()
        include_all = "pallet-v10" in src
        if root.find("image") is not None and len(list(root.iter("image"))) == 1:
            kind = "authoring" if "authoring-types" in src else "runtime" if "runtime-render-94" in src else "builder"
            stats[src] = render_sheet(tsx, out_tsx, kind)
        else:
            stats[src] = render_collection(tsx, out_tsx, counter, include_all)
        source_map[src] = f"pallet-v10/dig_game_gametime_rendered_v10_08_07_2026/tilesets/{out_tsx.name}"
    removed = update_world(source_map, used)
    report = {"world": str(WORLD), "library": str(LIB), "tilesetsRendered": len(stats), "removedUnusedTilesets": removed, "usedTileCounts": {k: sum(v.values()) for k, v in used.items()}, "stats": stats}
    (LIB / "v10-gametime-rendered-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    make_preview(report)
    print(json.dumps({"world": str(WORLD), "library": str(LIB), "tilesetsRendered": len(stats), "removedUnusedTilesets": len(removed)}, indent=2))


def make_preview(report: dict) -> None:
    font = load_font(14)
    sheet = Image.new("RGBA", (1280, 900), (16, 19, 23, 255))
    d = ImageDraw.Draw(sheet)
    d.text((24, 18), "v10 gametime rendered assets - QA preview only, actual assets are the referenced TSX images", fill=(238, 240, 232, 255), font=font)
    samples = [RESOURCE_DIR / f"{name}.png" for name in ["dirt", "stone", "copper", "steel", "iron", "gold", "obsidian", "gp_500"]]
    for i, path in enumerate(samples):
        x, y = 24 + i * 110, 58
        img = Image.open(path).convert("RGBA")
        sheet.alpha_composite(img, (x, y))
        d.rectangle((x, y, x + 93, y + 93), outline=(90, 244, 180, 255))
    prop_dir = LIB / "tilesets/images/dig-game-clean-props-v10-08-07-2026"
    prop_ids = [0, 28, 30, 89, 95, 99]
    for i, tile_id in enumerate(prop_ids):
        prop_path = prop_dir / f"tile_{tile_id:04d}.png"
        if not prop_path.exists():
            continue
        x, y = 900 + (i % 2) * 180, 58 + (i // 2) * 180
        cell = Image.new("RGBA", (150, 155), (84, 91, 94, 255))
        cd = ImageDraw.Draw(cell)
        for cy in range(0, cell.height, 15):
            for cx in range(0, cell.width, 15):
                if (cx // 15 + cy // 15) % 2 == 0:
                    cd.rectangle((cx, cy, cx + 14, cy + 14), fill=(55, 60, 62, 255))
        prop = Image.open(prop_path).convert("RGBA").resize((150, 155), Image.Resampling.LANCZOS)
        cell.alpha_composite(prop, (0, 0))
        sheet.alpha_composite(cell, (x, y))
        d.rectangle((x, y, x + 149, y + 154), outline=(244, 190, 72, 255))
    y = 190
    for src, count in list(report["usedTileCounts"].items())[:10]:
        d.text((24, y), f"{count:6d} used -> {Path(src).name}", fill=(190, 202, 200, 255), font=font)
        y += 28
    d.text((24, 820), f"Rendered tilesets: {report['tilesetsRendered']}   Removed unused stale tilesets: {len(report['removedUnusedTilesets'])}", fill=(238, 240, 232, 255), font=font)
    sheet.save(LIB / "preview-v10-gametime-rendered-assets.png")


if __name__ == "__main__":
    main()
