from __future__ import annotations

import hashlib
import json
import math
import random
import re
import shutil
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
WORLD = ROOT / "exports/dig-game-world-edit-v-10-08-07-2026-;layered.tmx"
BASE_WORLD = ROOT / "exports/dig-game-world-edit-v-10-08-07-2026-;layered.before-gametime-rendered.tmx"
OUT = ROOT / "exports/pallet-v10/dig_game_bg_props_rendered_v10_08_07_2026"
PROP_CELL = (303, 313)
APPROVED_PALETTE = "pallet-v10/dig_game_empty_backgrounds_and_separate_props_v10_08_07_2026"


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:78] or "asset"


def write_xml(tree: ET.ElementTree, path: Path) -> None:
    ET.indent(tree, space=" ")
    tree.write(path, encoding="UTF-8", xml_declaration=True)


def reset_dir(path: Path) -> None:
    if not path.exists():
        return
    resolved = path.resolve()
    allowed = (ROOT / "exports/pallet-v10").resolve()
    if allowed not in resolved.parents:
        raise RuntimeError(f"Refusing to remove outside pallet-v10: {resolved}")
    shutil.rmtree(resolved)


def resolve_src(src: str) -> Path:
    return (BASE_WORLD.parent / src).resolve()


def tilesets(root: ET.Element) -> list[tuple[int, str]]:
    return sorted((int(ts.get("firstgid")), ts.get("source")) for ts in root.findall("tileset") if ts.get("source"))


def source_for(gid: int, sets: list[tuple[int, str]]) -> str | None:
    for idx, (firstgid, src) in enumerate(sets):
        next_firstgid = sets[idx + 1][0] if idx + 1 < len(sets) else 10**9
        if firstgid <= gid < next_firstgid:
            return src
    return None


def used_sources_by_kind(root: ET.Element) -> tuple[Counter, Counter]:
    sets = tilesets(root)
    layer_sources, object_sources = Counter(), Counter()
    for layer in root.findall("layer"):
        data = layer.find("data")
        if data is None or not (data.text or "").strip():
            continue
        import base64, struct, zlib
        raw = base64.b64decode((data.text or "").strip())
        if data.get("compression") == "zlib":
            raw = zlib.decompress(raw)
        for raw_gid in struct.unpack("<" + "I" * (len(raw) // 4), raw):
            gid = raw_gid & 0x1FFFFFFF
            if gid:
                layer_sources[source_for(gid, sets)] += 1
    for obj in root.iter("object"):
        if obj.get("gid"):
            object_sources[source_for(int(obj.get("gid")) & 0x1FFFFFFF, sets)] += 1
    return layer_sources, object_sources


def load_font(size: int = 14):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default()


def enhance_rgba(img: Image.Image, sharp: float = 1.25) -> Image.Image:
    img = img.convert("RGBA")
    rgb = ImageEnhance.Color(img.convert("RGB")).enhance(1.10)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.14)
    rgb = ImageEnhance.Sharpness(rgb).enhance(sharp)
    return Image.merge("RGBA", (*rgb.split(), img.getchannel("A"))).filter(ImageFilter.UnsharpMask(radius=1.0, percent=70, threshold=4))


def background_palette(name: str) -> tuple[tuple[int, int, int], tuple[int, int, int], tuple[int, int, int]]:
    text = name.lower()
    if any(key in text for key in ("magma", "lava", "ember", "industrial")):
        return (55, 20, 14), (19, 13, 12), (239, 91, 28)
    if any(key in text for key in ("ice", "frozen", "crystal")):
        return (18, 53, 70), (6, 15, 24), (76, 224, 255)
    if any(key in text for key in ("void", "portal", "deep")):
        return (28, 16, 50), (7, 8, 18), (157, 72, 255)
    if any(key in text for key in ("root", "bio", "mushroom", "forest")):
        return (22, 60, 52), (8, 18, 17), (55, 228, 177)
    return (42, 37, 31), (12, 15, 18), (79, 191, 226)


def render_background(img: Image.Image, name: str) -> Image.Image:
    scale = 2 if max(img.size) < 3000 else 1
    w, h = img.width * scale, img.height * scale
    top, bottom, glow = background_palette(name)
    rng = random.Random(hashlib.sha1(name.encode("utf-8")).hexdigest())
    out = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    d = ImageDraw.Draw(out)
    for y in range(h):
        t = y / max(1, h - 1)
        wave = 0.04 * math.sin((y / max(1, h)) * math.tau * 2.0 + rng.random())
        tt = max(0, min(1, t + wave))
        color = tuple(round(top[i] * (1 - tt) + bottom[i] * tt) for i in range(3))
        d.line((0, y, w, y), fill=(*color, 255))

    mist = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    md = ImageDraw.Draw(mist)
    for _ in range(max(16, w // 170)):
        x = rng.randrange(-w // 5, w)
        y = rng.randrange(0, h)
        rx = rng.randrange(max(90, w // 20), max(140, w // 5))
        ry = rng.randrange(max(60, h // 5), max(90, h // 2))
        col = tuple(min(255, round(glow[i] * rng.uniform(0.35, 0.8))) for i in range(3))
        md.ellipse((x, y, x + rx, y + ry), fill=(*col, rng.randrange(18, 46)))
    for _ in range(max(10, w // 260)):
        x = rng.randrange(0, w)
        y0 = rng.randrange(0, max(1, h // 3))
        y1 = rng.randrange(max(y0 + 1, h // 2), h)
        md.line((x, y0, x + rng.randrange(-w // 16, w // 16), y1), fill=(*glow, rng.randrange(18, 42)), width=max(1, w // 1300))
    out = Image.alpha_composite(out, mist.filter(ImageFilter.GaussianBlur(radius=max(1, min(w, h) // 360))))

    cave = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    cd = ImageDraw.Draw(cave)
    rock = tuple(max(0, c - 10) for c in bottom)
    ceiling = []
    floor = []
    step = max(24, w // 90)
    for x in range(-step, w + step, step):
        ceiling.append((x, rng.randrange(0, max(1, h // 5))))
        floor.append((x, h - rng.randrange(max(8, h // 10), max(12, h // 3))))
    cd.polygon([(0, 0), *ceiling, (w, 0)], fill=(*rock, 180))
    cd.polygon([(0, h), *floor, (w, h)], fill=(*rock, 150))
    for x, y in ceiling[::2]:
        length = rng.randrange(max(12, h // 16), max(16, h // 4))
        cd.polygon([(x, y), (x + step // 2, y), (x + step // 4, y + length)], fill=(*rock, 120))
    for _ in range(max(18, w // 140)):
        x = rng.randrange(0, w)
        y = rng.randrange(max(0, h // 4), h)
        r = rng.randrange(max(2, min(w, h) // 180), max(4, min(w, h) // 70))
        cd.ellipse((x - r, y - r, x + r, y + r), fill=(*glow, rng.randrange(38, 96)))
    out = Image.alpha_composite(out, cave)

    noise = Image.effect_noise((max(64, w // 4), max(64, h // 4)), rng.uniform(22, 42)).convert("L")
    noise = noise.resize((w, h), Image.Resampling.BICUBIC).point(lambda v: max(0, min(54, v // 5)))
    texture = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    texture.putalpha(noise)
    return Image.alpha_composite(out, texture).filter(ImageFilter.UnsharpMask(radius=1.0, percent=45, threshold=4))


def magma_background(size: tuple[int, int], seed_text: str) -> Image.Image:
    rng = random.Random(hashlib.sha1(seed_text.encode("utf-8")).hexdigest())
    w, h = size
    img = Image.new("RGBA", size, (30, 15, 13, 255))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        d.line((0, y, w, y), fill=(round(74 - 42 * t), round(30 - 16 * t), round(22 - 10 * t), 255))
    for i in range(max(22, w // 170)):
        x = round(i * w / max(1, w // 170)) + rng.randrange(-70, 70)
        d.line((x, h, x + rng.randrange(-80, 120), 0), fill=(245, 87, 24, 62), width=max(2, w // 1200))
        d.line((x + 18, h, x + rng.randrange(-60, 130), 0), fill=(67, 20, 14, 145), width=max(7, w // 480))
    for x in range(-w // 10, w + w // 10, max(120, w // 20)):
        y = round(h * (0.62 + rng.random() * 0.12))
        d.ellipse((x, y, x + w // 5, y + h // 2), fill=(255, 98, 28, 35))
    return img.filter(ImageFilter.GaussianBlur(radius=0.35))


def remove_edge_key(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    pix = img.load()
    w, h = img.size
    corners = [pix[0, 0], pix[w - 1, 0], pix[0, h - 1], pix[w - 1, h - 1]]
    avg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    def is_bg(x: int, y: int) -> bool:
        r, g, b, a = pix[x, y]
        if a < 18:
            return True
        green = g > 205 and r < 120 and b < 130
        magenta = r > 200 and b > 185 and g < 110
        grey = abs(r - g) < 8 and abs(g - b) < 8 and 38 <= r <= 165
        close_corner = sum(abs((r, g, b)[i] - avg[i]) for i in range(3)) < 44
        return green or magenta or grey or close_corner

    stack = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] + [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    seen: set[tuple[int, int]] = set()
    while stack:
        x, y = stack.pop()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h) or not is_bg(x, y):
            continue
        seen.add((x, y))
        pix[x, y] = (0, 0, 0, 0)
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    return img


def render_prop(img: Image.Image) -> Image.Image:
    img = remove_edge_key(img)
    box = img.getchannel("A").point(lambda a: 255 if a > 22 else 0).getbbox() or (0, 0, img.width, img.height)
    crop = img.crop(box)
    scale = min((PROP_CELL[0] - 28) / crop.width, (PROP_CELL[1] - 28) / crop.height)
    crop = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", PROP_CELL, (0, 0, 0, 0))
    out.alpha_composite(crop, ((PROP_CELL[0] - crop.width) // 2, PROP_CELL[1] - 14 - crop.height))
    out = enhance_rgba(out, 1.15)
    pix = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = pix[x, y]
            pix[x, y] = (0, 0, 0, 0) if a <= 28 else (r, g, b, 255)
    return remove_small_alpha_islands(clean_prop_edge_chroma(out))


def clean_prop_edge_chroma(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    src = img.copy()
    pix = img.load()
    spix = src.load()

    def is_edge_key(px) -> bool:
        r, g, b, a = px
        if a == 0:
            return False
        green = g > 130 and g > r * 1.18 and g > b * 1.16
        magenta = r > 170 and b > 160 and g < 125
        grey = abs(r - g) < 8 and abs(g - b) < 8 and 36 <= r <= 170
        return green or magenta or grey

    for y in range(img.height):
        for x in range(img.width):
            if not is_edge_key(spix[x, y]):
                continue
            near_alpha = False
            for oy in range(-3, 4):
                for ox in range(-3, 4):
                    nx, ny = x + ox, y + oy
                    if 0 <= nx < img.width and 0 <= ny < img.height and spix[nx, ny][3] == 0:
                        near_alpha = True
                        break
                if near_alpha:
                    break
            if not near_alpha:
                continue
            repl = None
            for radius in range(1, 9):
                for oy in range(-radius, radius + 1):
                    for ox in range(-radius, radius + 1):
                        nx, ny = x + ox, y + oy
                        if 0 <= nx < img.width and 0 <= ny < img.height and spix[nx, ny][3] > 0 and not is_edge_key(spix[nx, ny]):
                            repl = (*spix[nx, ny][:3], 255)
                            break
                    if repl:
                        break
                if repl:
                    break
            pix[x, y] = repl or (0, 0, 0, 0)
    return img


def remove_small_alpha_islands(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    pix = img.load()
    w, h = img.size
    seen: set[tuple[int, int]] = set()
    for sy in range(h):
        for sx in range(w):
            if (sx, sy) in seen or pix[sx, sy][3] == 0:
                continue
            stack = [(sx, sy)]
            comp = []
            seen.add((sx, sy))
            min_x = max_x = sx
            min_y = max_y = sy
            while stack:
                x, y = stack.pop()
                comp.append((x, y))
                min_x, max_x = min(min_x, x), max(max_x, x)
                min_y, max_y = min(min_y, y), max(max_y, y)
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and pix[nx, ny][3] > 0:
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            near_slice_edge = min_x < 10 or min_y < 10 or max_x > w - 11
            if len(comp) < 240 or (near_slice_edge and len(comp) < 320):
                for x, y in comp:
                    pix[x, y] = (0, 0, 0, 0)
    return img


def resolve_image_path(tsx: Path, source: str) -> Path:
    direct = (tsx.parent / source).resolve()
    if direct.exists():
        return direct
    matches = sorted((ROOT / "exports").rglob(Path(source).name), key=lambda p: len(str(p)))
    if matches:
        return matches[0]
    raise FileNotFoundError(direct)


def render_tileset(src: str, out_tsx: Path) -> dict:
    tsx = resolve_src(src)
    tree = ET.parse(tsx)
    root = tree.getroot()
    max_w = max_h = written = 0
    folder = slug(Path(src).stem + "-" + hashlib.sha1(src.encode("utf-8")).hexdigest()[:8])
    is_prop_set = int(root.get("tilewidth", "9999")) <= 380 and int(root.get("tileheight", "9999")) <= 380
    for tile in root.findall("tile"):
        img_node = tile.find("image")
        if img_node is None:
            continue
        source_img = resolve_image_path(tsx, img_node.get("source"))
        img = Image.open(source_img).convert("RGBA")
        if "highres-background-specials" in src:
            img = magma_background((int(img_node.get("width")), int(img_node.get("height"))), img_node.get("source"))
        elif is_prop_set or max(img.size) <= 380:
            img = render_prop(img)
        else:
            img = render_background(img, img_node.get("source"))
        rel = Path("images") / folder / f"tile_{int(tile.get('id')):04d}.png"
        (out_tsx.parent / rel).parent.mkdir(parents=True, exist_ok=True)
        img.save(out_tsx.parent / rel)
        img_node.set("source", rel.as_posix())
        img_node.set("width", str(img.width))
        img_node.set("height", str(img.height))
        max_w, max_h = max(max_w, img.width), max(max_h, img.height)
        written += 1
    root.set("name", f"{root.get('name')}-v10-bg-props-rendered")
    if max_w and max_h:
        root.set("tilewidth", str(max_w))
        root.set("tileheight", str(max_h))
    write_xml(tree, out_tsx)
    return {"tiles": written, "tilewidth": max_w, "tileheight": max_h}


def update_world(layer_sources: Counter, object_sources: Counter, replacements: dict[str, str], removed: list[str]) -> None:
    tree = ET.parse(BASE_WORLD)
    root = tree.getroot()
    keep = set(layer_sources) | set(object_sources)
    for ts in list(root.findall("tileset")):
        src = ts.get("source")
        if src in object_sources:
            ts.set("source", replacements[src])
        elif src not in keep:
            removed.append(src)
            root.remove(ts)
    props = root.find("properties")
    if props is None:
        props = ET.SubElement(root, "properties")
    ET.SubElement(props, "property", {"name": "v10ApprovedPaletteLibrary", "value": APPROVED_PALETTE})
    ET.SubElement(props, "property", {"name": "v10BgPropsRenderedLibrary", "value": "pallet-v10/dig_game_bg_props_rendered_v10_08_07_2026"})
    write_xml(tree, WORLD)


def preview(report: dict) -> None:
    font = load_font()
    sheet = Image.new("RGBA", (1280, 850), (16, 19, 23, 255))
    d = ImageDraw.Draw(sheet)
    d.text((24, 18), "v10 background/prop rendered library - gameplay tile sheets preserved", fill=(238, 240, 232, 255), font=font)
    y = 60
    d.text((24, y), "Unchanged gameplay/layer sources:", fill=(238, 240, 232, 255), font=font)
    y += 28
    for src, count in report["layerSources"].items():
        d.text((24, y), f"{count:6d} -> {Path(src).name}", fill=(180, 194, 192, 255), font=font)
        y += 24
    y += 20
    d.text((24, y), "Regenerated object/background/prop sources:", fill=(238, 240, 232, 255), font=font)
    y += 28
    for src, count in report["objectSources"].items():
        d.text((24, y), f"{count:4d} placed -> {Path(src).name}", fill=(180, 194, 192, 255), font=font)
        y += 24
    samples = []
    for path in sorted((OUT / "tilesets/images").glob("*/*.png")):
        if len(samples) >= 12:
            break
        samples.append(path)
    for i, path in enumerate(samples):
        img = Image.open(path).convert("RGBA")
        x, y = 810 + (i % 3) * 150, 58 + (i // 3) * 180
        scale = max(132 / img.width, 132 / img.height)
        thumb = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.Resampling.LANCZOS)
        ox = max(0, (thumb.width - 132) // 2)
        oy = max(0, (thumb.height - 132) // 2)
        cell = Image.new("RGBA", (132, 132), (16, 19, 23, 255))
        cell.alpha_composite(thumb.crop((ox, oy, ox + 132, oy + 132)), (0, 0))
        sheet.alpha_composite(cell, (x, y))
        d.rectangle((x, y, x + 131, y + 131), outline=(244, 190, 72, 255))
    d.text((24, 800), f"Rendered TSX sources: {len(report['stats'])}   Removed unused stale TSX: {len(report['removedUnusedTilesets'])}", fill=(238, 240, 232, 255), font=font)
    sheet.save(OUT / "preview-v10-bg-props-rendered.png")


def checker(size: tuple[int, int]) -> Image.Image:
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    step = 16
    for y in range(0, size[1], step):
        for x in range(0, size[0], step):
            fill = (76, 83, 86, 255) if (x // step + y // step) % 2 else (55, 60, 63, 255)
            d.rectangle((x, y, x + step - 1, y + step - 1), fill=fill)
    return img


def preview_props_alpha() -> None:
    folders = sorted((OUT / "tilesets/images").glob("dig-game-clean-props-v10-08-07-2026*"))
    if not folders:
        return
    prop_files = sorted(folders[0].glob("*.png"))[:12]
    font = load_font()
    cell_w, cell_h = PROP_CELL
    pad_x, pad_y = 22, 58
    sheet = Image.new("RGBA", (1420, 1260), (16, 19, 23, 255))
    d = ImageDraw.Draw(sheet)
    d.text((24, 18), "v10 regenerated prop cells - checkerboard alpha preview, exact 303 x 313", fill=(238, 240, 232, 255), font=font)
    for i, path in enumerate(prop_files):
        col, row = i % 4, i // 4
        x = pad_x + col * (cell_w + 36)
        y = pad_y + row * (cell_h + 68)
        cell = checker(PROP_CELL)
        cell.alpha_composite(Image.open(path).convert("RGBA"), (0, 0))
        sheet.alpha_composite(cell, (x, y))
        d.rectangle((x, y, x + cell_w - 1, y + cell_h - 1), outline=(244, 190, 72, 255))
        d.text((x, y + cell_h + 7), path.stem, fill=(180, 194, 192, 255), font=font)
    sheet.save(OUT / "preview-v10-props-alpha.png")


def main() -> None:
    if not BASE_WORLD.exists():
        raise FileNotFoundError(BASE_WORLD)
    reset_dir(OUT)
    (OUT / "tilesets").mkdir(parents=True, exist_ok=True)
    root = ET.parse(BASE_WORLD).getroot()
    layer_sources, object_sources = used_sources_by_kind(root)
    replacements, stats, removed = {}, {}, []
    for src in sorted(object_sources):
        if src.startswith(APPROVED_PALETTE + "/"):
            replacements[src] = src
            stats[src] = {"preservedApprovedPalette": True}
            continue
        digest = hashlib.sha1(src.encode("utf-8")).hexdigest()[:8]
        out_tsx = OUT / "tilesets" / f"{slug(Path(src).stem)}-{digest}.tsx"
        stats[src] = render_tileset(src, out_tsx)
        replacements[src] = f"pallet-v10/dig_game_bg_props_rendered_v10_08_07_2026/tilesets/{out_tsx.name}"
    update_world(layer_sources, object_sources, replacements, removed)
    report = {
        "world": str(WORLD),
        "library": str(OUT),
        "layerSources": dict(layer_sources),
        "objectSources": dict(object_sources),
        "removedUnusedTilesets": removed,
        "stats": stats,
    }
    (OUT / "v10-bg-props-rendered-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    preview(report)
    preview_props_alpha()
    print(json.dumps({"world": str(WORLD), "library": str(OUT), "renderedObjectSources": len(stats), "removedUnusedTilesets": len(removed)}, indent=2))


if __name__ == "__main__":
    main()
