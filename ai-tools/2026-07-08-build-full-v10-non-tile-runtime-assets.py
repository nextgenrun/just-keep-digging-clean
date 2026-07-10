from __future__ import annotations

import hashlib
import importlib.util
import json
import math
import random
import re
import shutil
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps, ImageStat


ROOT = Path(__file__).resolve().parents[1]
WORLD = ROOT / "exports/dig-game-world-edit-v-10-08-07-2026-;layered.tmx"
WORLD_BACKUP = ROOT / "exports/dig-game-world-edit-v-10-08-07-2026-;layered.before-full-non-tile-runtime.tmx"
OUT = ROOT / "exports/pallet-v10/dig_game_full_non_tile_runtime_assets_v10_08_07_2026"
OUT_REL = "exports/pallet-v10/dig_game_full_non_tile_runtime_assets_v10_08_07_2026"
OUT_TMX = OUT / "dig-game-full-non-tile-runtime-assets-v10-08-07-2026.tmx"
MANIFEST = OUT / "v10-full-non-tile-runtime-manifest.json"
TILED_BG_JS = ROOT / "values/tiledBackgroundObjects.js"
OVERRIDES_JS = ROOT / "values/authoredBackgroundAssetOverrides.js"
BOOT_SCENE = ROOT / "ui/scenes/BootScene.js"
LOADING_VIEW = ROOT / "ui/components/LoadingScreenView.js"
TOOLS_EXPORTER = ROOT / "tools/export_tiled_all_layers.py"

TILE_FLAG_MASK = 0x0FFFFFFF
PROP_MIN_SIZE = (303, 313)
MAX_RUNTIME_EDGE = 4096
OLD_RUNTIME_MARKERS = (
    "pallet-v9",
    "dig_game_runtime_bg_props_v1",
    "dig_game_12layer_palette_true_separate_v1",
    "cleaned/dig_game_palette_clean_overwrite_runtime_v3",
    "current-prop-faithful-cleanup",
    "dig_game_bg_props_rendered_v10_08_07_2026",
    "dig_game_gametime_rendered_v10_08_07_2026",
)

DIRECT_BACKGROUND_PATHS = [
    "sprites/backgrounds/base-background-world-1.webp",
    "sprites/backgrounds/background-town/money-monster-npc-house.webp",
    "sprites/backgrounds/background-town/player-upgrade-npc-house.webp",
    "sprites/backgrounds/background-database/ChatGPT Image Jun 29, 2026, 07_32_45 PM.png",
    "sprites/backgrounds/background-database/ChatGPT Image Jun 29, 2026, 07_32_49 PM.png",
    "sprites/backgrounds/background-database/ChatGPT Image Jun 29, 2026, 07_32_52 PM.png",
    "sprites/backgrounds/background-database/ChatGPT Image Jun 29, 2026, 07_32_58 PM.png",
    "sprites/backgrounds/background-database/ChatGPT Image Jun 29, 2026, 07_33_03 PM.png",
    "sprites/backgrounds/background-database/ChatGPT Image Jun 29, 2026, 07_40_41 PM (1).png",
    "sprites/infinate-loops/above-floor-layer.png",
    "sprites/infinate-loops/floor-layer.png",
    "sprites/infinate-loops/underground-0-1000/depth-000-200.png",
    "sprites/infinate-loops/underground-0-1000/depth-200-400.png",
    "sprites/infinate-loops/underground-0-1000/depth-400-600.png",
    "sprites/infinate-loops/underground-0-1000/depth-600-800.png",
    "sprites/infinate-loops/underground-0-1000/depth-800-1000.png",
    "sprites/backgrounds/background-database/sky-background-v3/sky-v3-base.webp",
    "sprites/backgrounds/background-database/sky-background-v3/sky-v3-nebula-veil.webp",
    "sprites/backgrounds/background-database/sky-background-v3/sky-v3-aurora-ribbons.webp",
    "sprites/backgrounds/background-database/sky-background-v3/sky-v3-horizon-glow.webp",
    "sprites/backgrounds/background-database/sky-background-v3/sky-v3-clouds-far.webp",
    "sprites/backgrounds/background-database/sky-background-v3/sky-v3-clouds-near.webp",
    "sprites/backgrounds/background-database/sky-background-v3/sky-v3-planet-1.webp",
    "sprites/backgrounds/background-database/sky-background-v3/sky-v3-planet-2.webp",
]

LAYER_DIRS = {
    "l01": "l01",
    "l02": "l02",
    "l03": "l03",
    "l04": "l04",
    "l05": "l05",
    "l06": "l06",
    "l07": "l07",
    "l08": "l08",
    "l09": "l09",
    "l10": "l10",
    "l12": "l12",
}


def slug(text: str, limit: int = 88) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:limit] or "asset"


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def write_xml(tree: ET.ElementTree, path: Path) -> None:
    ET.indent(tree, space=" ")
    tree.write(path, encoding="UTF-8", xml_declaration=True)


def safe_reset_dir(path: Path) -> None:
    if not path.exists():
        return
    resolved = path.resolve()
    allowed = (ROOT / "exports/pallet-v10").resolve()
    if allowed not in resolved.parents:
        raise RuntimeError(f"Refusing to delete outside pallet-v10: {resolved}")
    try:
        shutil.rmtree(resolved)
    except PermissionError:
        print(f"WARNING: Could not remove locked partial output folder, reusing: {resolved}")


def load_font(size: int = 14):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default()


def seed_for(text: str) -> int:
    return int(hashlib.sha1(text.encode("utf-8")).hexdigest()[:12], 16)


def save_image(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        if path.suffix.lower() == ".webp":
            alpha = img.convert("RGBA").getchannel("A")
            has_transparency = alpha.getextrema()[0] < 255
            if has_transparency:
                img.save(path, lossless=True, quality=100, method=4)
            else:
                img.convert("RGB").save(path, quality=94, method=3)
        else:
            img.save(path)
    except PermissionError:
        if not path.exists():
            raise
        print(f"WARNING: Keeping locked existing generated image: {path}")


def open_optional(path: Path | None, fallback_size: tuple[int, int] = (1024, 576), seed_text: str = "asset") -> Image.Image:
    if path and path.exists():
        return Image.open(path).convert("RGBA")
    return procedural_background(fallback_size, seed_text)


def resolve_path(base: Path, source: str) -> Path | None:
    if not source:
        return None
    cleaned = source.replace("\\", "/")
    candidates = [
        (base / cleaned).resolve(),
        (WORLD.parent / cleaned).resolve(),
        (ROOT / cleaned).resolve(),
        (ROOT / cleaned.replace("../../", "")).resolve(),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    matches = sorted(ROOT.rglob(Path(cleaned).name), key=lambda p: len(str(p)))
    return matches[0] if matches else None


def tileset_records(root: ET.Element) -> list[tuple[int, ET.Element]]:
    return sorted(
        [(int(ts.get("firstgid", "0")), ts) for ts in root.findall("tileset") if ts.get("source")],
        key=lambda item: item[0],
    )


def source_for_gid(records: list[tuple[int, ET.Element]], gid: int) -> tuple[str | None, int]:
    for idx, (first_gid, ts) in enumerate(records):
        next_first = records[idx + 1][0] if idx + 1 < len(records) else 10**10
        if first_gid <= gid < next_first:
            return ts.get("source"), gid - first_gid
    return None, -1


def source_used_by_layers(root: ET.Element) -> Counter:
    records = tileset_records(root)
    counts = Counter()
    for layer in root.findall("layer"):
        data = layer.find("data")
        if data is None or not (data.text or "").strip():
            continue
        import base64
        import struct
        import zlib

        raw = base64.b64decode((data.text or "").strip())
        if data.get("compression") == "zlib":
            raw = zlib.decompress(raw)
        for raw_gid in struct.unpack("<" + "I" * (len(raw) // 4), raw):
            gid = raw_gid & TILE_FLAG_MASK
            if gid:
                src, _ = source_for_gid(records, gid)
                if src:
                    counts[src] += 1
    return counts


def get_properties(obj: ET.Element) -> dict[str, ET.Element]:
    props = obj.find("properties")
    if props is None:
        props = ET.SubElement(obj, "properties")
    return {p.get("name", ""): p for p in props.findall("property")}


def set_property(obj: ET.Element, name: str, value: str) -> None:
    props = obj.find("properties")
    if props is None:
        props = ET.SubElement(obj, "properties")
    found = None
    for prop in props.findall("property"):
        if prop.get("name") == name:
            found = prop
            break
    if found is None:
        found = ET.SubElement(props, "property", {"name": name})
    found.set("value", value)


def load_exporter():
    spec = importlib.util.spec_from_file_location("export_tiled_all_layers", TOOLS_EXPORTER)
    if spec is None or spec.loader is None:
        raise RuntimeError("Cannot load tools/export_tiled_all_layers.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def strip_filename(path: str) -> str:
    return Path(path.replace("\\", "/")).name


def layer_id_from_name(filename: str) -> str:
    match = re.search(r"__(l\d{2})__", filename, re.IGNORECASE)
    return match.group(1).lower() if match else ""


def classify(filename: str, source: str, image_size: tuple[int, int]) -> str:
    text = f"{filename} {source}".lower()
    layer_id = layer_id_from_name(filename)
    if "generated-runtime-v1" in text and filename.startswith("bg_"):
        return "generated_bg"
    if "generated-runtime-v1" in text and filename.startswith("prop_"):
        return "generated_prop"
    if layer_id == "l11" or "/props/" in text or "near_props" in text:
        return "authored_prop"
    if "cards" in text or layer_id in {"l07", "l08", "l10"}:
        return "card"
    if "special" in text or "highres" in text:
        return "background"
    if filename.lower().startswith("bg_"):
        return "generated_bg"
    if filename.lower().startswith("prop_"):
        return "generated_prop"
    if image_size[0] <= 520 and image_size[1] <= 540:
        return "authored_prop"
    return "background"


def output_rel_for_asset(old_filename: str, source: str, kind: str, new_suffix: str) -> Path:
    filename = Path(old_filename).with_suffix(new_suffix).name
    if re.match(r"tile_\d+\.", filename, re.IGNORECASE):
        filename = f"{hashlib.sha1(source.encode('utf-8')).hexdigest()[:8]}-{filename}"
    if kind == "generated_bg":
        return Path("sprites/backgrounds/generated-runtime-v1") / filename
    if kind == "generated_prop":
        return Path("sprites/background-props/generated-runtime-v1") / filename
    if kind == "authored_prop":
        return Path("sprites/props/near_props_seam_breakers") / filename
    if kind == "card":
        layer_id = layer_id_from_name(old_filename)
        layer_dir = LAYER_DIRS.get(layer_id, "cards")
        return Path("sprites/bg12") / layer_dir / filename
    layer_id = layer_id_from_name(old_filename)
    if layer_id in LAYER_DIRS:
        return Path("sprites/bg12") / LAYER_DIRS[layer_id] / filename
    if "background-database" in source.replace("\\", "/"):
        return Path(source.replace("\\", "/"))
    if source.replace("\\", "/").startswith("sprites/"):
        return Path(source.replace("\\", "/"))
    return Path("sprites/bg-other") / filename


def asset_palette(name: str) -> tuple[tuple[int, int, int], tuple[int, int, int], tuple[int, int, int]]:
    text = name.lower()
    if any(k in text for k in ("magma", "lava", "ember", "molten", "industrial", "reactor", "fissure")):
        return (74, 28, 18), (20, 13, 13), (255, 102, 29)
    if any(k in text for k in ("frozen", "ice", "prism", "crystal", "geode", "silver")):
        return (30, 76, 96), (8, 18, 28), (93, 230, 255)
    if any(k in text for k in ("void", "portal", "eclipse", "watcher", "eye", "endcore")):
        return (44, 24, 75), (8, 8, 22), (184, 81, 255)
    if any(k in text for k in ("root", "vine", "bio", "mushroom", "spore", "reed", "forest")):
        return (31, 83, 65), (7, 20, 18), (59, 239, 177)
    if any(k in text for k in ("storm", "toxic", "irradiated", "amber")):
        return (61, 65, 27), (13, 17, 13), (218, 237, 40)
    if any(k in text for k in ("mechanical", "aqueduct", "steel", "cable", "vent")):
        return (69, 74, 75), (15, 17, 18), (238, 178, 55)
    return (72, 50, 35), (14, 14, 15), (82, 194, 218)


def enhance_rgba(img: Image.Image, sharpness: float = 1.25) -> Image.Image:
    img = img.convert("RGBA")
    rgb = img.convert("RGB")
    rgb = ImageEnhance.Color(rgb).enhance(1.12)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.16)
    rgb = ImageEnhance.Sharpness(rgb).enhance(sharpness)
    return Image.merge("RGBA", (*rgb.split(), img.getchannel("A"))).filter(
        ImageFilter.UnsharpMask(radius=1.0, percent=80, threshold=3)
    )


def cover_resize(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    if img.size == size:
        return img.convert("RGBA")
    scale = max(size[0] / img.width, size[1] / img.height)
    resized = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.Resampling.LANCZOS)
    left = max(0, (resized.width - size[0]) // 2)
    top = max(0, (resized.height - size[1]) // 2)
    return resized.crop((left, top, left + size[0], top + size[1])).convert("RGBA")


def procedural_background(size: tuple[int, int], name: str) -> Image.Image:
    rng = random.Random(seed_for(name))
    top, bottom, glow = asset_palette(name)
    w, h = size
    img = Image.new("RGBA", size, (0, 0, 0, 255))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        wave = 0.035 * math.sin(t * math.tau * 2.1 + rng.random() * math.tau)
        tt = min(1, max(0, t + wave))
        col = tuple(round(top[i] * (1 - tt) + bottom[i] * tt) for i in range(3))
        d.line((0, y, w, y), fill=(*col, 255))

    fog = Image.new("RGBA", size, (0, 0, 0, 0))
    fd = ImageDraw.Draw(fog)
    for _ in range(max(10, w // 220)):
        x = rng.randrange(-w // 4, w)
        y = rng.randrange(0, h)
        rx = rng.randrange(max(100, w // 12), max(130, w // 3))
        ry = rng.randrange(max(60, h // 6), max(80, h // 2))
        fd.ellipse((x, y, x + rx, y + ry), fill=(*glow, rng.randrange(12, 36)))
    img = Image.alpha_composite(img, fog.filter(ImageFilter.GaussianBlur(radius=max(2, min(w, h) // 90))))

    cave = Image.new("RGBA", size, (0, 0, 0, 0))
    cd = ImageDraw.Draw(cave)
    rock = tuple(max(0, c - 12) for c in bottom)
    step = max(42, w // 80)
    ceiling = [(x, rng.randrange(0, max(2, h // 5))) for x in range(-step, w + step, step)]
    floor = [(x, h - rng.randrange(max(10, h // 9), max(14, h // 3))) for x in range(-step, w + step, step)]
    cd.polygon([(0, 0), *ceiling, (w, 0)], fill=(*rock, 138))
    cd.polygon([(0, h), *floor, (w, h)], fill=(*rock, 116))
    for x, y in ceiling[::2]:
        length = rng.randrange(max(8, h // 18), max(12, h // 4))
        cd.polygon([(x, y), (x + step, y), (x + step // 2, y + length)], fill=(*rock, 112))
    for _ in range(max(10, w // 170)):
        x = rng.randrange(0, w)
        y = rng.randrange(h // 4, h)
        r = rng.randrange(max(2, min(w, h) // 180), max(4, min(w, h) // 70))
        cd.ellipse((x - r, y - r, x + r, y + r), fill=(*glow, rng.randrange(34, 88)))
    img = Image.alpha_composite(img, cave)
    noise = Image.effect_noise((max(64, w // 3), max(64, h // 3)), 42).convert("L")
    noise = noise.resize(size, Image.Resampling.BICUBIC).point(lambda v: max(0, min(34, v // 7)))
    tex = Image.new("RGBA", size, (255, 255, 255, 0))
    tex.putalpha(noise)
    return Image.alpha_composite(img, tex)


def render_background(source: Image.Image, name: str, target: tuple[int, int]) -> Image.Image:
    base = cover_resize(source, target)
    base = enhance_rgba(base, 1.2)
    procedural = procedural_background(target, name)
    mixed = Image.blend(base.convert("RGB"), procedural.convert("RGB"), 0.34).convert("RGBA")
    return enhance_rgba(mixed, 1.15)


def keyish(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a == 0:
        return False
    green = g > 170 and g > r * 1.25 and g > b * 1.2
    magenta = r > 185 and b > 165 and g < 130 and min(r, b) > g + 44
    grey = abs(r - g) < 10 and abs(g - b) < 10 and 36 <= r <= 170
    return green or magenta or grey


def edge_key_to_alpha(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    pix = img.load()
    w, h = img.size
    corners = [pix[0, 0], pix[w - 1, 0], pix[0, h - 1], pix[w - 1, h - 1]]
    avg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    def is_bg(x: int, y: int) -> bool:
        r, g, b, a = pix[x, y]
        if a < 18 or keyish((r, g, b, a)):
            return True
        return sum(abs((r, g, b)[i] - avg[i]) for i in range(3)) < 42

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


def hard_alpha_cleanup(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    pix = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pix[x, y]
            if a <= 20 or keyish((r, g, b, a)):
                pix[x, y] = (0, 0, 0, 0)
            else:
                pix[x, y] = (r, g, b, 255)
    return img


def threshold_alpha_only(img: Image.Image, cutoff: int = 20) -> Image.Image:
    img = img.convert("RGBA")
    alpha = img.getchannel("A").point(lambda a: 0 if a <= cutoff else 255)
    out = Image.merge("RGBA", (*img.convert("RGB").split(), alpha))
    return out


def has_clean_alpha_corners(img: Image.Image) -> bool:
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    corners = [
        img.getpixel((0, 0))[3],
        img.getpixel((img.width - 1, 0))[3],
        img.getpixel((0, img.height - 1))[3],
        img.getpixel((img.width - 1, img.height - 1))[3],
    ]
    return all(a <= 4 for a in corners)


def alpha_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    alpha = img.getchannel("A").point(lambda a: 255 if a > 18 else 0)
    return alpha.getbbox() or (0, 0, img.width, img.height)


def fit_source_prop(img: Image.Image, target: tuple[int, int], pad: int = 18) -> Image.Image:
    img = img.convert("RGBA")
    if has_clean_alpha_corners(img):
        img = threshold_alpha_only(img)
    else:
        img = hard_alpha_cleanup(edge_key_to_alpha(img))
    crop = img.crop(alpha_bbox(img))
    scale = min((target[0] - pad * 2) / max(1, crop.width), (target[1] - pad * 2) / max(1, crop.height))
    resized = crop.resize((max(1, round(crop.width * scale)), max(1, round(crop.height * scale))), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", target, (0, 0, 0, 0))
    out.alpha_composite(resized, ((target[0] - resized.width) // 2, target[1] - pad - resized.height))
    return threshold_alpha_only(enhance_rgba(out, 1.18))


def draw_crystal(draw: ImageDraw.ImageDraw, cx: int, base: int, height: int, width: int, color: tuple[int, int, int], outline: tuple[int, int, int]) -> None:
    points = [(cx, base - height), (cx + width // 2, base - height // 3), (cx + width // 3, base), (cx - width // 3, base), (cx - width // 2, base - height // 3)]
    draw.polygon(points, fill=(*color, 238), outline=(*outline, 255))
    draw.line((cx, base - height + 8, cx, base - 6), fill=(255, 255, 255, 150), width=max(1, width // 16))
    draw.line((cx - width // 4, base - height // 4, cx + width // 4, base - height // 3), fill=(255, 255, 255, 96), width=1)


def render_procedural_prop(name: str, target: tuple[int, int]) -> Image.Image:
    rng = random.Random(seed_for(name))
    top, bottom, glow = asset_palette(name)
    w, h = target
    img = Image.new("RGBA", target, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    text = name.lower()
    ground_y = h - max(12, h // 18)
    shadow = (*bottom, 210)

    def rock_base(x0: int, x1: int, y: int) -> None:
        for _ in range(max(10, (x1 - x0) // 26)):
            rx = rng.randrange(x0, max(x0 + 1, x1))
            ry = rng.randrange(y - max(8, h // 18), y + max(2, h // 50))
            rr = rng.randrange(max(4, w // 70), max(7, w // 28))
            d.ellipse((rx - rr, ry - rr, rx + rr, ry + rr), fill=(*bottom, 240), outline=(*top, 210))

    if any(k in text for k in ("portal", "gate", "arch", "eclipse")):
        cx = w // 2
        arch_w = int(w * 0.68)
        arch_h = int(h * 0.74)
        x0, x1 = cx - arch_w // 2, cx + arch_w // 2
        y0 = ground_y - arch_h
        d.arc((x0, y0, x1, y0 + arch_h), 180, 360, fill=(*top, 255), width=max(8, w // 22))
        for sx in (x0 + arch_w // 8, x1 - arch_w // 8):
            d.rounded_rectangle((sx - w // 14, y0 + arch_h // 2, sx + w // 14, ground_y), radius=max(4, w // 60), fill=(*bottom, 255), outline=(*top, 255), width=max(2, w // 90))
        for r in range(0, 5):
            bbox = (cx - arch_w // 4 - r * 9, y0 + arch_h // 2 - r * 6, cx + arch_w // 4 + r * 9, ground_y - h // 9 + r * 4)
            d.ellipse(bbox, outline=(*glow, 210 - r * 28), width=max(2, w // 96))
        d.ellipse((cx - arch_w // 5, y0 + arch_h // 2, cx + arch_w // 5, ground_y - h // 10), fill=(*glow, 96))
        rock_base(x0, x1, ground_y)
    elif any(k in text for k in ("lantern", "chandelier", "lamp")):
        cx = w // 2
        d.line((cx, h // 10, cx, h // 3), fill=(*top, 255), width=max(3, w // 80))
        d.ellipse((cx - w // 5, h // 3, cx + w // 5, h // 3 + h // 3), fill=(*bottom, 242), outline=(*top, 255), width=max(3, w // 80))
        d.ellipse((cx - w // 7, h // 3 + h // 15, cx + w // 7, h // 3 + h // 4), fill=(*glow, 210))
        d.polygon([(cx, h // 3 + h // 3 + h // 8), (cx - w // 12, h // 3 + h // 3), (cx + w // 12, h // 3 + h // 3)], fill=(*glow, 200), outline=(230, 255, 255, 230))
    elif any(k in text for k in ("crystal", "geode", "prism", "shard", "ore")):
        rock_base(w // 8, w - w // 8, ground_y)
        for i in range(12):
            cx = rng.randrange(w // 5, w - w // 5)
            ht = rng.randrange(max(30, h // 5), max(40, h // 2))
            wd = rng.randrange(max(18, w // 16), max(24, w // 7))
            draw_crystal(d, cx, ground_y - rng.randrange(0, h // 8), ht, wd, glow, top)
    elif any(k in text for k in ("mushroom", "spore", "reed", "root", "vine")):
        rock_base(w // 8, w - w // 8, ground_y)
        for i in range(7):
            cx = rng.randrange(w // 8, w - w // 8)
            stem_h = rng.randrange(h // 5, h // 2)
            stem_w = max(5, w // 45)
            d.line((cx, ground_y, cx + rng.randrange(-w // 20, w // 20), ground_y - stem_h), fill=(*top, 255), width=stem_w)
            cap_w = rng.randrange(w // 9, w // 4)
            cap_h = rng.randrange(h // 20, h // 9)
            cap_y = ground_y - stem_h
            d.ellipse((cx - cap_w, cap_y - cap_h, cx + cap_w, cap_y + cap_h), fill=(*glow, 226), outline=(235, 255, 255, 190), width=max(1, w // 120))
            d.line((cx - cap_w // 2, cap_y + cap_h // 2, cx + cap_w // 2, cap_y + cap_h // 2), fill=(*bottom, 160), width=2)
    elif any(k in text for k in ("reactor", "vent", "cable", "mechanical", "tank", "cylinder", "core", "orb")):
        cx = w // 2
        body_w = int(w * 0.44)
        body_h = int(h * 0.62)
        x0, x1 = cx - body_w // 2, cx + body_w // 2
        y0, y1 = ground_y - body_h, ground_y
        d.rounded_rectangle((x0, y0, x1, y1), radius=max(8, w // 30), fill=(*bottom, 255), outline=(*top, 255), width=max(3, w // 70))
        d.rectangle((x0 + body_w // 5, y0 + body_h // 8, x1 - body_w // 5, y1 - body_h // 8), fill=(*glow, 130), outline=(*glow, 250), width=max(2, w // 100))
        for yy in range(y0 + body_h // 6, y1, max(18, body_h // 5)):
            d.line((x0 - w // 8, yy, x0, yy + h // 20), fill=(*top, 220), width=max(2, w // 100))
            d.line((x1, yy + h // 20, x1 + w // 8, yy), fill=(*top, 220), width=max(2, w // 100))
        d.ellipse((cx - body_w // 3, y0 - body_w // 3, cx + body_w // 3, y0 + body_w // 3), fill=(*glow, 185), outline=(255, 235, 180, 255), width=max(2, w // 90))
        rock_base(x0 - w // 8, x1 + w // 8, ground_y)
    elif any(k in text for k in ("bone", "rib", "fossil")):
        rock_base(w // 6, w - w // 6, ground_y)
        for i in range(7):
            x = w // 5 + i * (w // 11)
            y = ground_y - rng.randrange(h // 9, h // 3)
            d.arc((x - w // 8, y - h // 8, x + w // 8, y + h // 4), 200, 345, fill=(225, 218, 185, 240), width=max(4, w // 55))
    elif any(k in text for k in ("fissure", "overhang", "lip", "ledge")):
        y = ground_y - h // 4
        points = [(w // 12, y), (w - w // 12, y + rng.randrange(-h // 20, h // 20)), (w - w // 8, y + h // 5), (w // 8, y + h // 4)]
        d.polygon(points, fill=(*bottom, 255), outline=(*top, 255))
        for i in range(9):
            x = rng.randrange(w // 8, w - w // 8)
            d.line((x, y + rng.randrange(0, h // 5), x + rng.randrange(-w // 12, w // 12), y + rng.randrange(h // 8, h // 3)), fill=(*glow, 210), width=max(1, w // 150))
    else:
        rock_base(w // 8, w - w // 8, ground_y)
        for i in range(9):
            cx = rng.randrange(w // 5, w - w // 5)
            cy = rng.randrange(h // 4, ground_y)
            rr = rng.randrange(max(9, w // 24), max(14, w // 9))
            d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=(*top, 210), outline=(*glow, 180))

    glow_layer = Image.new("RGBA", target, (0, 0, 0, 0))
    glow_layer.alpha_composite(img)
    blur = glow_layer.filter(ImageFilter.GaussianBlur(radius=max(2, min(w, h) // 65)))
    img = Image.alpha_composite(ImageChops.multiply(blur, Image.new("RGBA", target, (*glow, 80))), img)
    return threshold_alpha_only(enhance_rgba(img, 1.3))


def render_card_from_source(source: Image.Image, name: str, target: tuple[int, int]) -> Image.Image:
    rng = random.Random(seed_for(name))
    top, bottom, glow = asset_palette(name)
    w, h = target
    texture = procedural_background(target, name)
    mask = Image.new("L", target, 0)
    md = ImageDraw.Draw(mask)
    text = name.lower()
    if "__l08__" in text:
        base_y = int(h * 0.62)
        points = [(0, 0), (w, 0), (w, base_y)]
        for x in range(w, -1, -max(40, w // 22)):
            points.append((x, base_y + rng.randrange(-h // 14, h // 9)))
        points.append((0, base_y))
        md.polygon(points, fill=255)
    elif "__l10__" in text:
        y = int(h * 0.44)
        ledge = [(0, h), (0, y)]
        for x in range(0, w + max(40, w // 24), max(40, w // 24)):
            ledge.append((x, y + rng.randrange(-h // 18, h // 12)))
        ledge += [(w, h)]
        md.polygon(ledge, fill=255)
    else:
        y0 = int(h * 0.30)
        y1 = int(h * 0.82)
        md.rounded_rectangle((w // 18, y0, w - w // 18, y1), radius=max(8, h // 26), fill=255)

    mask = mask.filter(ImageFilter.GaussianBlur(radius=0.35)).point(lambda a: 255 if a > 24 else 0)
    img = Image.new("RGBA", target, (0, 0, 0, 0))
    img.alpha_composite(texture)
    img.putalpha(mask)
    d = ImageDraw.Draw(img)

    if "__l08__" in text:
        base_y = int(h * 0.62)
        for x in range(max(20, w // 30), w, max(80, w // 12)):
            length = rng.randrange(h // 10, h // 3)
            d.polygon([(x, base_y - 4), (x + w // 26, base_y - 2), (x + w // 52, base_y + length)], fill=(*bottom, 230), outline=(*top, 185))
    elif "__l10__" in text:
        y = int(h * 0.48)
        for x in range(0, w, max(60, w // 18)):
            d.line((x, y + rng.randrange(0, h // 6), x + rng.randrange(20, 90), h - 6), fill=(*glow, 140), width=max(1, w // 260))
    else:
        y0 = int(h * 0.35)
        y1 = int(h * 0.78)
        for x in range(w // 8, w - w // 8, max(70, w // 8)):
            d.rounded_rectangle((x, y0 - h // 16, x + w // 22, y1 + h // 8), radius=max(4, w // 80), fill=(*top, 230), outline=(*bottom, 255))
        d.line((w // 12, y0 + h // 8, w - w // 12, y0 + h // 8), fill=(*glow, 135), width=max(2, h // 60))
    d.rectangle((0, 0, w - 1, h - 1), outline=(*top, 120), width=max(1, min(w, h) // 170))
    for _ in range(max(24, w // 110)):
        x = rng.randrange(0, w)
        y = rng.randrange(0, h)
        r = rng.randrange(1, max(2, min(w, h) // 90))
        d.ellipse((x - r, y - r, x + r, y + r), fill=(*glow, rng.randrange(50, 120)))
    return threshold_alpha_only(enhance_rgba(img, 1.2))


def choose_target(kind: str, source_size: tuple[int, int], display_size: tuple[int, int], name: str) -> tuple[int, int]:
    sw, sh = source_size
    dw, dh = display_size
    if kind in {"authored_prop", "generated_prop"}:
        tw = max(PROP_MIN_SIZE[0], sw, math.ceil(dw))
        th = max(PROP_MIN_SIZE[1], sh, math.ceil(dh))
    elif kind == "card":
        tw = max(sw * (2 if max(sw, sh) < 1400 else 1), math.ceil(dw))
        th = max(sh * (2 if max(sw, sh) < 1400 else 1), math.ceil(dh))
    else:
        scale = 4 if max(sw, sh) < 1200 else 2 if max(sw, sh) < 2600 else 1
        tw = max(sw * scale, math.ceil(dw))
        th = max(sh * scale, math.ceil(dh))
    tw = max(1, min(MAX_RUNTIME_EDGE, int(tw)))
    th = max(1, min(MAX_RUNTIME_EDGE, int(th)))
    return tw, th


def inventory_world(root: ET.Element, exporter) -> tuple[Counter, dict[str, Counter], dict[tuple[str, int], dict], dict[str, tuple[int, int]]]:
    records = tileset_records(root)
    layer_sources = source_used_by_layers(root)
    object_sources: dict[str, Counter] = defaultdict(Counter)
    gid_lookup: dict[tuple[str, int], dict] = {}
    display_by_filename: dict[str, tuple[int, int]] = defaultdict(lambda: (0, 0))

    for group in root.findall("objectgroup"):
        if group.get("name", "") not in exporter.BACKGROUND_OBJECT_GROUPS:
            continue
        for obj in group.findall("object"):
            gid_raw = int(obj.get("gid", "0") or 0)
            gid = gid_raw & TILE_FLAG_MASK
            if gid == 0:
                continue
            src, local_id = source_for_gid(records, gid)
            if not src:
                continue
            object_sources[src][local_id] += 1
            filename = exporter.resolve_gid_to_filename(root, gid_raw) or strip_filename(obj.get("name", ""))
            props = {p.get("name"): p.get("value", "") for p in obj.findall("./properties/property")}
            source_path = props.get("sourcePath", "")
            resolved_name = filename or strip_filename(source_path)
            width = float(obj.get("width", "0") or 0)
            height = float(obj.get("height", "0") or 0)
            if "originalWidth" in props:
                width = max(width, float(props.get("originalWidth") or 0))
            if "originalHeight" in props:
                height = max(height, float(props.get("originalHeight") or 0))
            old = display_by_filename[resolved_name.lower()]
            display_by_filename[resolved_name.lower()] = (max(old[0], math.ceil(width)), max(old[1], math.ceil(height)))
            gid_lookup[(src, local_id)] = {
                "filename": resolved_name,
                "sourcePath": source_path,
                "display": display_by_filename[resolved_name.lower()],
            }
    return layer_sources, object_sources, gid_lookup, display_by_filename


def render_asset(kind: str, source_img: Image.Image, name: str, target: tuple[int, int]) -> Image.Image:
    if kind == "generated_prop":
        return render_procedural_prop(name, target)
    if kind == "authored_prop":
        return fit_source_prop(source_img, target)
    if kind == "card":
        return render_card_from_source(source_img, name, target)
    return render_background(source_img, name, target)


def render_collection_tileset(
    src: str,
    tsx_path: Path,
    out_tsx: Path,
    used: Counter,
    gid_lookup: dict[tuple[str, int], dict],
    display_by_filename: dict[str, tuple[int, int]],
    path_by_old_filename: dict[str, str],
    path_by_new_filename: dict[str, str],
) -> dict:
    tree = ET.parse(tsx_path)
    root = tree.getroot()
    max_w = max_h = written = 0
    for tile in list(root.findall("tile")):
        img_node = tile.find("image")
        if img_node is None:
            continue
        tile_id = int(tile.get("id", "0"))
        if tile_id not in used:
            root.remove(tile)
            continue
        old_source = img_node.get("source", "")
        old_filename = strip_filename(old_source)
        src_img_path = resolve_path(tsx_path.parent, old_source)
        source_img = open_optional(src_img_path, (int(img_node.get("width", "1024")), int(img_node.get("height", "576"))), old_filename)
        kind = classify(old_filename, old_source, source_img.size)
        display = display_by_filename.get(old_filename.lower(), (0, 0))
        if (src, tile_id) in gid_lookup:
            display = tuple(max(display[i], gid_lookup[(src, tile_id)]["display"][i]) for i in range(2))
        target = choose_target(kind, source_img.size, display, old_filename)
        rendered = render_asset(kind, source_img, old_filename, target)
        new_suffix = ".png" if kind in {"authored_prop", "generated_prop", "card"} else Path(old_filename).suffix.lower() or ".png"
        out_img_rel = output_rel_for_asset(old_filename, old_source, kind, new_suffix)
        out_img_abs = OUT / out_img_rel
        save_image(rendered, out_img_abs)
        img_node.set("source", Path("..").joinpath(out_img_rel).as_posix())
        img_node.set("width", str(rendered.width))
        img_node.set("height", str(rendered.height))
        full_runtime_path = f"{OUT_REL}/{out_img_rel.as_posix()}"
        path_by_old_filename[old_filename.lower()] = full_runtime_path
        path_by_new_filename[out_img_abs.name.lower()] = full_runtime_path
        max_w, max_h = max(max_w, rendered.width), max(max_h, rendered.height)
        written += 1
    if max_w and max_h:
        root.set("tilewidth", str(max_w))
        root.set("tileheight", str(max_h))
    root.set("name", f"{root.get('name', tsx_path.stem)}-full-v10-non-tile-runtime")
    write_xml(tree, out_tsx)
    return {"mode": "collection", "tiles": written, "tilewidth": max_w, "tileheight": max_h}


def render_single_image_tileset(
    src: str,
    tsx_path: Path,
    out_tsx: Path,
    display_by_filename: dict[str, tuple[int, int]],
    path_by_old_filename: dict[str, str],
    path_by_new_filename: dict[str, str],
) -> dict:
    tree = ET.parse(tsx_path)
    root = tree.getroot()
    img_node = root.find("image")
    if img_node is None:
        return {"mode": "single", "tiles": 0}
    old_source = img_node.get("source", "")
    old_filename = strip_filename(old_source or tsx_path.stem)
    src_img_path = resolve_path(tsx_path.parent, old_source)
    source_img = open_optional(src_img_path, (int(img_node.get("width", "1024")), int(img_node.get("height", "576"))), old_filename)
    kind = classify(old_filename, old_source, source_img.size)
    display = display_by_filename.get(old_filename.lower(), (0, 0))
    target = choose_target(kind, source_img.size, display, old_filename)
    rendered = render_asset(kind, source_img, old_filename, target)
    new_suffix = ".png" if kind in {"authored_prop", "generated_prop", "card"} else Path(old_filename).suffix.lower() or ".png"
    out_img_rel = output_rel_for_asset(old_filename, old_source, kind, new_suffix)
    save_image(rendered, OUT / out_img_rel)
    img_node.set("source", Path("..").joinpath(out_img_rel).as_posix())
    img_node.set("width", str(rendered.width))
    img_node.set("height", str(rendered.height))
    root.set("name", f"{root.get('name', tsx_path.stem)}-full-v10-non-tile-runtime")
    write_xml(tree, out_tsx)
    full_runtime_path = f"{OUT_REL}/{out_img_rel.as_posix()}"
    path_by_old_filename[old_filename.lower()] = full_runtime_path
    path_by_new_filename[(OUT / out_img_rel).name.lower()] = full_runtime_path
    return {"mode": "single", "tiles": int(root.get("tilecount", "1") or 1), "tilewidth": rendered.width, "tileheight": rendered.height}


def render_direct_backgrounds(path_by_old_filename: dict[str, str], path_by_new_filename: dict[str, str]) -> dict:
    stats = {}
    for logical_path in DIRECT_BACKGROUND_PATHS:
        source = ROOT / logical_path
        img = open_optional(source if source.exists() else None, (1920, 1080), logical_path)
        if "infinate-loops" in logical_path:
            target = (max(1920, img.width * (2 if img.width < 1800 else 1)), max(256, img.height * (2 if img.height < 700 else 1)))
        elif "sky-background-v3" in logical_path:
            target = (max(1920, img.width * (2 if img.width < 1800 else 1)), max(1080, img.height * (2 if img.height < 1000 else 1)))
        elif "background-database" in logical_path:
            target = (max(1920, img.width), max(1080, img.height))
        else:
            target = (max(1920, img.width), max(1080, img.height))
        target = (min(MAX_RUNTIME_EDGE, target[0]), min(MAX_RUNTIME_EDGE, target[1]))
        rendered = render_background(img, logical_path, target)
        out_rel = Path(logical_path)
        out_path = OUT / out_rel
        save_image(rendered, out_path)
        full = f"{OUT_REL}/{out_rel.as_posix()}"
        path_by_old_filename[out_path.name.lower()] = full
        path_by_new_filename[out_path.name.lower()] = full
        stats[logical_path] = {"sourceExists": source.exists(), "width": rendered.width, "height": rendered.height, "out": full}
    return stats


def patch_world(
    root: ET.Element,
    source_replacements: dict[str, str],
    gid_lookup: dict[tuple[str, int], dict],
    path_by_old_filename: dict[str, str],
    path_by_new_filename: dict[str, str],
    exporter,
) -> None:
    records = tileset_records(root)
    for _, ts in records:
        src = ts.get("source")
        if src in source_replacements:
            ts.set("source", source_replacements[src])

    for group in root.findall("objectgroup"):
        if group.get("name", "") not in exporter.BACKGROUND_OBJECT_GROUPS:
            continue
        for obj in group.findall("object"):
            gid_raw = int(obj.get("gid", "0") or 0)
            gid = gid_raw & TILE_FLAG_MASK
            src, local_id = source_for_gid(records, gid)
            lookup = gid_lookup.get((src, local_id), {})
            filename = (lookup.get("filename") or exporter.resolve_gid_to_filename(root, gid_raw) or strip_filename(obj.get("name", ""))).lower()
            new_path = path_by_old_filename.get(filename) or path_by_new_filename.get(filename)
            if new_path:
                set_property(obj, "sourcePath", new_path)
                set_property(obj, "fullNonTileRuntimeAsset", "true")

    props = root.find("properties")
    if props is None:
        props = ET.SubElement(root, "properties")
    for prop in list(props.findall("property")):
        if prop.get("name") in {"v10ApprovedPaletteLibrary", "v10BgPropsRenderedLibrary", "v10GametimeRenderedLibrary"}:
            props.remove(prop)
    ET.SubElement(props, "property", {"name": "v10FullNonTileRuntimeLibrary", "value": OUT_REL})


def write_palette_tmx(source_replacements: dict[str, str]) -> None:
    map_el = ET.Element("map", {
        "version": "1.10",
        "tiledversion": "1.11.2",
        "orientation": "orthogonal",
        "renderorder": "right-down",
        "width": "32",
        "height": "32",
        "tilewidth": "94",
        "tileheight": "94",
        "infinite": "0",
        "nextlayerid": "2",
        "nextobjectid": "1",
    })
    firstgid = 1
    for tsx_rel in sorted(set(source_replacements.values())):
        tsx_path = WORLD.parent / tsx_rel
        if not tsx_path.exists():
            tsx_path = ROOT / "exports" / tsx_rel
        try:
            tilecount = int(ET.parse(tsx_path).getroot().get("tilecount", "1") or 1)
        except Exception:
            tilecount = 1
        ET.SubElement(map_el, "tileset", {"firstgid": str(firstgid), "source": tsx_rel})
        firstgid += max(1, tilecount)
    layer = ET.SubElement(map_el, "layer", {"id": "1", "name": "empty-preview-grid", "width": "32", "height": "32"})
    data = ET.SubElement(layer, "data", {"encoding": "csv"})
    data.text = "\n" + ",\n".join(["0," * 31 + "0" for _ in range(32)]) + "\n"
    write_xml(ET.ElementTree(map_el), OUT_TMX)


def write_tiled_background_objects(exporter) -> None:
    exporter.SOURCE_TMX = WORLD
    root = ET.parse(WORLD).getroot()
    map_meta = {
        "width": int(root.get("width", "0")),
        "height": int(root.get("height", "0")),
        "tileWidth": int(root.get("tilewidth", "94")),
        "tileHeight": int(root.get("tileheight", "94")),
    }
    bg_objects = exporter.find_bg_object_groups(root)
    text = exporter.format_bg_objects_js(map_meta, bg_objects)
    TILED_BG_JS.write_text(text, encoding="utf-8")


def write_overrides(path_by_old_filename: dict[str, str], path_by_new_filename: dict[str, str]) -> None:
    all_paths = dict(sorted({**path_by_old_filename, **path_by_new_filename}.items()))
    lines = [
        "export const AUTHORED_BACKGROUND_ASSET_OVERRIDES = Object.freeze({",
        "  enabled: true,",
        '  smoothFiltering: true,',
        '  cleanupVersion: "2026-07-08-full-v10-non-tile-runtime-assets",',
        "  byFilename: Object.freeze({",
    ]
    for filename, path in all_paths.items():
        lines.append(f"    {json.dumps(filename)}: {json.dumps(path)},")
    lines += [
        "  }),",
        "});",
        "",
    ]
    OVERRIDES_JS.write_text("\n".join(lines), encoding="utf-8")


def patch_runtime_js() -> None:
    boot = BOOT_SCENE.read_text(encoding="utf-8")
    old_block = (
        'const AUTHORED_LAYER_BASE = "exports/dig_game_12layer_palette_true_separate_v1/sprites/backgrounds/12layer-true-separate-v1/";\n'
        'const AUTHORED_L11_PROPS_BASE = "exports/pallet-v9/dig_game_empty_backgrounds_and_separate_props_v1/sprites/props/near_props_seam_breakers/";'
    )
    new_block = (
        f'const FULL_NON_TILE_RUNTIME_LIBRARY = "{OUT_REL}/";\n'
        'const FULL_NON_TILE_SPRITES_BASE = `${FULL_NON_TILE_RUNTIME_LIBRARY}sprites/`;\n'
        'const GENERATED_RUNTIME_BG_BASE = `${FULL_NON_TILE_SPRITES_BASE}backgrounds/generated-runtime-v1/`;\n'
        'const GENERATED_RUNTIME_PROP_BASE = `${FULL_NON_TILE_SPRITES_BASE}background-props/generated-runtime-v1/`;\n'
        'const AUTHORED_LAYER_BASE = `${FULL_NON_TILE_SPRITES_BASE}bg12/`;\n'
        'const AUTHORED_L11_PROPS_BASE = `${FULL_NON_TILE_SPRITES_BASE}props/near_props_seam_breakers/`;'
    )
    if old_block in boot:
        boot = boot.replace(old_block, new_block)
    else:
        boot = re.sub(
            r"const FULL_NON_TILE_RUNTIME_LIBRARY = .+?const AUTHORED_L11_PROPS_BASE = .+?;",
            new_block,
            boot,
            flags=re.DOTALL,
        )

    boot = boot.replace(
        '"exports/dig_game_runtime_bg_props_v1/sprites/backgrounds/generated-runtime-v1/"',
        "GENERATED_RUNTIME_BG_BASE",
    )
    boot = boot.replace(
        '"exports/cleaned/dig_game_palette_clean_overwrite_runtime_v3/sprites/background-props/generated-runtime-v1/"',
        "GENERATED_RUNTIME_PROP_BASE",
    )
    boot = boot.replace(
        'return `exports/dig_game_runtime_bg_props_v1/sprites/backgrounds/generated-runtime-v1/${filename}`;',
        'return `${GENERATED_RUNTIME_BG_BASE}${filename}`;',
    )
    boot = boot.replace(
        'return `exports/cleaned/dig_game_palette_clean_overwrite_runtime_v3/sprites/background-props/generated-runtime-v1/${filename}`;',
        'return `${GENERATED_RUNTIME_PROP_BASE}${filename}`;',
    )
    boot = boot.replace(
        'this.queueImage(ASSET_KEYS.background.world1, "sprites/backgrounds/base-background-world-1.webp");',
        'this.queueImage(ASSET_KEYS.background.world1, `${FULL_NON_TILE_SPRITES_BASE}backgrounds/base-background-world-1.webp`);',
    )
    boot = boot.replace(
        'this.queueImage(ASSET_KEYS.background.houseMoneyMonster, "sprites/backgrounds/background-town/money-monster-npc-house.webp");',
        'this.queueImage(ASSET_KEYS.background.houseMoneyMonster, `${FULL_NON_TILE_SPRITES_BASE}backgrounds/background-town/money-monster-npc-house.webp`);',
    )
    boot = boot.replace(
        'this.queueImage(ASSET_KEYS.background.housePlayerUpgrade, "sprites/backgrounds/background-town/player-upgrade-npc-house.webp");',
        'this.queueImage(ASSET_KEYS.background.housePlayerUpgrade, `${FULL_NON_TILE_SPRITES_BASE}backgrounds/background-town/player-upgrade-npc-house.webp`);',
    )
    boot = boot.replace(
        'this.load.image(townLoop.aboveFloor, "sprites/infinate-loops/above-floor-layer.png");',
        'this.load.image(townLoop.aboveFloor, `${FULL_NON_TILE_SPRITES_BASE}infinate-loops/above-floor-layer.png`);',
    )
    boot = boot.replace(
        'this.load.image(townLoop.floor, "sprites/infinate-loops/floor-layer.png");',
        'this.load.image(townLoop.floor, `${FULL_NON_TILE_SPRITES_BASE}infinate-loops/floor-layer.png`);',
    )
    boot = boot.replace(
        'const undergroundBase = "sprites/infinate-loops/underground-0-1000/";',
        'const undergroundBase = `${FULL_NON_TILE_SPRITES_BASE}infinate-loops/underground-0-1000/`;',
    )
    boot = boot.replace(
        'const skyBase = "sprites/backgrounds/background-database/sky-background-v3/";',
        'const skyBase = `${FULL_NON_TILE_SPRITES_BASE}backgrounds/background-database/sky-background-v3/`;',
    )
    BOOT_SCENE.write_text(boot, encoding="utf-8")

    loading = LOADING_VIEW.read_text(encoding="utf-8")
    loading = re.sub(
        r'const MENU_BACKGROUND_BASE_PATH = ".+?";',
        f'const MENU_BACKGROUND_BASE_PATH = "{OUT_REL}/sprites/backgrounds/background-database/";',
        loading,
        count=1,
    )
    LOADING_VIEW.write_text(loading, encoding="utf-8")


def checker(size: tuple[int, int]) -> Image.Image:
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    step = 18
    for y in range(0, size[1], step):
        for x in range(0, size[0], step):
            fill = (76, 83, 86, 255) if (x // step + y // step) % 2 else (55, 60, 63, 255)
            d.rectangle((x, y, x + step - 1, y + step - 1), fill=fill)
    return img


def proof_sheet_props() -> None:
    files = sorted((OUT / "sprites").rglob("*.png"))
    prop_files = [p for p in files if "/props/" in p.as_posix() or "background-props" in p.as_posix()]
    prop_files = prop_files[:48]
    font = load_font(13)
    thumb = (190, 196)
    cols = 6
    rows = max(1, math.ceil(len(prop_files) / cols))
    sheet = Image.new("RGBA", (cols * 220 + 28, rows * 245 + 64), (16, 19, 23, 255))
    d = ImageDraw.Draw(sheet)
    d.text((22, 18), "v10 full non-tile runtime props - regenerated transparent assets, no old leakage folders", fill=(238, 240, 232, 255), font=font)
    for i, path in enumerate(prop_files):
        col, row = i % cols, i // cols
        x, y = 22 + col * 220, 58 + row * 245
        cell = checker(thumb)
        img = Image.open(path).convert("RGBA")
        scale = min(thumb[0] / img.width, thumb[1] / img.height)
        resized = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.Resampling.LANCZOS)
        cell.alpha_composite(resized, ((thumb[0] - resized.width) // 2, thumb[1] - resized.height))
        sheet.alpha_composite(cell, (x, y))
        d.rectangle((x, y, x + thumb[0] - 1, y + thumb[1] - 1), outline=(244, 190, 72, 255))
        d.text((x, y + thumb[1] + 6), path.name[:28], fill=(183, 195, 193, 255), font=font)
    sheet.save(OUT / "preview-v10-full-runtime-props.png")


def proof_sheet_cards_backgrounds() -> None:
    bg_files = [p for p in sorted((OUT / "sprites").rglob("*")) if p.suffix.lower() in {".png", ".webp"} and "props" not in p.as_posix()]
    cards = [p for p in bg_files if "cards" in p.as_posix().lower()][:20]
    bgs = [p for p in bg_files if "cards" not in p.as_posix().lower()][:20]
    font = load_font(13)
    sheet = Image.new("RGBA", (1440, 980), (16, 19, 23, 255))
    d = ImageDraw.Draw(sheet)
    d.text((24, 18), "v10 full non-tile runtime backgrounds/cards - high-res regenerated outputs", fill=(238, 240, 232, 255), font=font)
    for group_idx, files in enumerate((cards, bgs)):
        y0 = 58 + group_idx * 450
        d.text((24, y0 - 24), "cards" if group_idx == 0 else "backgrounds and direct BootScene loads", fill=(238, 240, 232, 255), font=font)
        for i, path in enumerate(files[:10]):
            img = Image.open(path).convert("RGBA")
            x = 24 + (i % 5) * 280
            y = y0 + (i // 5) * 205
            thumb = cover_resize(img, (250, 150)) if img.getbbox() else Image.new("RGBA", (250, 150), (0, 0, 0, 0))
            if "cards" in path.as_posix().lower():
                cell = checker((250, 150))
                fit = img.resize((max(1, min(250, img.width)), max(1, min(150, img.height))), Image.Resampling.LANCZOS)
                cell.alpha_composite(fit, ((250 - fit.width) // 2, 150 - fit.height))
                thumb = cell
            sheet.alpha_composite(thumb, (x, y))
            d.rectangle((x, y, x + 249, y + 149), outline=(83, 239, 190, 255))
            d.text((x, y + 156), path.name[:34], fill=(183, 195, 193, 255), font=font)
    sheet.save(OUT / "preview-v10-full-runtime-cards-backgrounds.png")


def edge_leak_count(img: Image.Image) -> tuple[int, int]:
    img = img.convert("RGBA")
    pix = img.load()
    w, h = img.size
    green = grey = 0
    coords = [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] + [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]
    for x, y in coords:
        r, g, b, a = pix[x, y]
        if a == 0:
            continue
        if g > 170 and g > r * 1.25 and g > b * 1.2:
            green += 1
        if abs(r - g) < 8 and abs(g - b) < 8 and 42 <= r <= 170:
            grey += 1
    return green, grey


def validate(report: dict) -> dict:
    problems: list[str] = []
    for tsx in (OUT / "tilesets").glob("*.tsx"):
        root = ET.parse(tsx).getroot()
        for img_node in root.iter("image"):
            img_path = (tsx.parent / img_node.get("source", "")).resolve()
            if not img_path.exists():
                problems.append(f"missing image: {img_path}")
                continue
            with Image.open(img_path) as img:
                if int(img_node.get("width", "0")) != img.width or int(img_node.get("height", "0")) != img.height:
                    problems.append(f"dimension mismatch: {img_path}")

    scanned_text = "\n".join(
        [
            WORLD.read_text(encoding="utf-8", errors="ignore"),
            TILED_BG_JS.read_text(encoding="utf-8", errors="ignore"),
            OVERRIDES_JS.read_text(encoding="utf-8", errors="ignore"),
            BOOT_SCENE.read_text(encoding="utf-8", errors="ignore"),
            LOADING_VIEW.read_text(encoding="utf-8", errors="ignore"),
        ]
    )
    old_refs = [marker for marker in OLD_RUNTIME_MARKERS if marker in scanned_text]
    if old_refs:
        problems.append(f"old runtime refs remain: {old_refs}")

    alpha_assets = [p for p in (OUT / "sprites").rglob("*.png") if "props" in p.as_posix() or "cards" in p.as_posix()]
    prop_alpha_assets = [p for p in alpha_assets if "props" in p.as_posix()]
    green_total = grey_total = corner_bad = blank = 0
    for path in alpha_assets:
        img = Image.open(path).convert("RGBA")
        if img.getchannel("A").getbbox() is None:
            blank += 1
        if path in prop_alpha_assets:
            corners = [img.getpixel((0, 0))[3], img.getpixel((img.width - 1, 0))[3], img.getpixel((0, img.height - 1))[3], img.getpixel((img.width - 1, img.height - 1))[3]]
            if any(a != 0 for a in corners):
                corner_bad += 1
        g, gr = edge_leak_count(img)
        green_total += g
        grey_total += gr
    if corner_bad:
        problems.append(f"alpha corner failures: {corner_bad}")
    if blank:
        problems.append(f"blank alpha assets: {blank}")
    if green_total or grey_total:
        problems.append(f"edge matte pixels green={green_total} grey={grey_total}")

    report["validation"] = {
        "ok": not problems,
        "problems": problems,
        "alphaAssetsChecked": len(alpha_assets),
        "edgeGreenPixels": green_total,
        "edgeGreyPixels": grey_total,
        "alphaCornerFailures": corner_bad,
        "blankAlphaAssets": blank,
    }
    return report["validation"]


def main() -> None:
    if not WORLD.exists():
        raise FileNotFoundError(WORLD)
    exporter = load_exporter()
    if not WORLD_BACKUP.exists():
        shutil.copy2(WORLD, WORLD_BACKUP)
    source_world = WORLD_BACKUP if WORLD_BACKUP.exists() else WORLD
    exporter.SOURCE_TMX = source_world

    safe_reset_dir(OUT)
    (OUT / "tilesets").mkdir(parents=True, exist_ok=True)

    tree = ET.parse(source_world)
    root = tree.getroot()
    layer_sources, object_sources, gid_lookup, display_by_filename = inventory_world(root, exporter)
    path_by_old_filename: dict[str, str] = {}
    path_by_new_filename: dict[str, str] = {}
    direct_stats = render_direct_backgrounds(path_by_old_filename, path_by_new_filename)

    source_replacements: dict[str, str] = {}
    tileset_stats = {}
    for src, used in sorted(object_sources.items()):
        if any(tile_marker in src for tile_marker in ("dig-game-authoring-types", "dig-game-runtime-render-94", "dig-game-custom-builder")):
            continue
        tsx_path = resolve_path(WORLD.parent, src)
        if tsx_path is None or not tsx_path.exists():
            raise FileNotFoundError(f"Missing object TSX source {src}")
        out_tsx = OUT / "tilesets" / f"{slug(Path(src).stem)}-{hashlib.sha1(src.encode('utf-8')).hexdigest()[:8]}.tsx"
        tsx_root = ET.parse(tsx_path).getroot()
        if tsx_root.find("image") is not None and len(list(tsx_root.iter("image"))) == 1:
            stats = render_single_image_tileset(src, tsx_path, out_tsx, display_by_filename, path_by_old_filename, path_by_new_filename)
        else:
            stats = render_collection_tileset(src, tsx_path, out_tsx, used, gid_lookup, display_by_filename, path_by_old_filename, path_by_new_filename)
        new_src = f"pallet-v10/dig_game_full_non_tile_runtime_assets_v10_08_07_2026/tilesets/{out_tsx.name}"
        source_replacements[src] = new_src
        tileset_stats[src] = stats

    patch_world(root, source_replacements, gid_lookup, path_by_old_filename, path_by_new_filename, exporter)
    write_xml(tree, WORLD)
    write_palette_tmx(source_replacements)
    write_tiled_background_objects(exporter)
    write_overrides(path_by_old_filename, path_by_new_filename)
    patch_runtime_js()
    proof_sheet_props()
    proof_sheet_cards_backgrounds()

    report = {
        "world": rel(WORLD),
        "worldBackup": rel(WORLD_BACKUP),
        "library": rel(OUT),
        "paletteTmx": rel(OUT_TMX),
        "layerSourcesPreserved": dict(layer_sources),
        "objectSourcesRegenerated": {src: sum(counter.values()) for src, counter in object_sources.items() if src in source_replacements},
        "objectSourcesSkippedAsTileGameplay": [src for src in object_sources if src not in source_replacements],
        "sourceReplacements": source_replacements,
        "tilesetStats": tileset_stats,
        "directBackgrounds": direct_stats,
        "filenameOverrideCount": len(path_by_old_filename),
        "previewSheets": [
            rel(OUT / "preview-v10-full-runtime-props.png"),
            rel(OUT / "preview-v10-full-runtime-cards-backgrounds.png"),
        ],
    }
    validate(report)
    MANIFEST.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not report["validation"]["ok"]:
        raise RuntimeError(json.dumps(report["validation"], indent=2))
    print(json.dumps({
        "world": report["world"],
        "library": report["library"],
        "paletteTmx": report["paletteTmx"],
        "objectSourcesRegenerated": len(report["objectSourcesRegenerated"]),
        "directBackgrounds": len(report["directBackgrounds"]),
        "filenameOverrideCount": report["filenameOverrideCount"],
        "validation": report["validation"],
    }, indent=2))


if __name__ == "__main__":
    main()
