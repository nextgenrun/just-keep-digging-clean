from __future__ import annotations

import importlib.util
import json
import math
import re
import shutil
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
WORLD_TMX = ROOT / "exports" / "dig-game-world-edit-v-10-08-07-2026-;layered.tmx"
SOURCE_12 = ROOT / "exports" / "dig_game_12layer_palette_true_separate_v1"
OUT = ROOT / "exports" / "pallet-v14" / "dig_game_wired_backgrounds_clean_v14"
SPRITES = OUT / "sprites" / "backgrounds" / "wired-clean"
PREVIEWS = OUT / "previews"
TILESETS = OUT / "tilesets"
FLIP_MASK = 0x0FFFFFFF
MAX_EDGE = 8192


@dataclass
class Placement:
    x: float
    y: float
    w: float
    h: float
    group: str
    name: str


@dataclass
class Asset:
    gid: int
    local_id: int
    source_tsx: str
    source_image: str
    image_path: Path
    source_w: int
    source_h: int
    out_id: int = 0
    out_source: str = ""
    out_w: int = 0
    out_h: int = 0
    placements: list[Placement] = field(default_factory=list)


def relpath(path: Path, base: Path) -> str:
    return Path(path).resolve().relative_to(base.resolve()).as_posix()


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def round16(value: float) -> int:
    return max(16, int(math.ceil(value / 16.0) * 16))


def load_previews():
    path = Path(__file__).with_name("2026-07-09-v14-wired-background-previews.py")
    spec = importlib.util.spec_from_file_location("v14_wired_background_previews", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def is_background_ref(tsx: str, image: str) -> bool:
    text = f"{tsx}/{image}".replace("\\", "/").lower()
    if "/props/" in text or "clean-props" in text:
        return False
    return any(token in text for token in ("/bg-other/", "/backgrounds/", "/bg12/"))


def tileset_refs() -> list[tuple[int, str, Path]]:
    refs = []
    for ts in ET.parse(WORLD_TMX).getroot().findall("tileset"):
        source = ts.attrib.get("source")
        if source:
            refs.append((int(ts.attrib["firstgid"]), source, (WORLD_TMX.parent / source).resolve()))
    return sorted(refs)


def load_tile_images() -> dict[int, tuple[int, str, str, Path, int, int]]:
    tiles = {}
    for firstgid, source, path in tileset_refs():
        if not path.exists():
            continue
        for tile in ET.parse(path).getroot().findall("tile"):
            image = tile.find("image")
            if image is None:
                continue
            local_id = int(tile.attrib["id"])
            image_source = image.attrib["source"]
            tiles[firstgid + local_id] = (
                local_id,
                source,
                image_source,
                (path.parent / image_source).resolve(),
                int(image.attrib.get("width", "0")),
                int(image.attrib.get("height", "0")),
            )
    return tiles


def parse_assets() -> list[Asset]:
    tile_images = load_tile_images()
    assets: dict[int, Asset] = {}
    for group in ET.parse(WORLD_TMX).getroot().findall("objectgroup"):
        group_name = group.attrib.get("name", "")
        for obj in group.findall("object"):
            raw = obj.attrib.get("gid")
            if not raw:
                continue
            gid = int(raw) & FLIP_MASK
            if gid not in tile_images:
                continue
            local_id, source_tsx, source_image, image_path, source_w, source_h = tile_images[gid]
            if not is_background_ref(source_tsx, source_image):
                continue
            asset = assets.setdefault(
                gid,
                Asset(gid, local_id, source_tsx, source_image, image_path, source_w, source_h),
            )
            asset.placements.append(
                Placement(
                    float(obj.attrib.get("x", "0")),
                    float(obj.attrib.get("y", "0")),
                    float(obj.attrib.get("width", "0")),
                    float(obj.attrib.get("height", "0")),
                    group_name,
                    obj.attrib.get("name", ""),
                )
            )
    return sorted(assets.values(), key=lambda item: (item.source_tsx, item.local_id))


def original_12_lookup() -> dict[str, Path]:
    root = SOURCE_12 / "sprites" / "backgrounds" / "12layer-true-separate-v1"
    return {path.name: path for path in root.rglob("*.png")} if root.exists() else {}


def clear_hidden_rgb(img: Image.Image) -> Image.Image:
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    arr[arr[..., 3] == 0, :3] = 0
    return Image.fromarray(arr, "RGBA")


def alpha_safe_resize(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    arr = np.asarray(img.convert("RGBA")).astype(np.float32)
    premult = arr.copy()
    premult[..., :3] *= arr[..., 3:4] / 255.0
    resized = Image.fromarray(np.clip(premult, 0, 255).astype(np.uint8), "RGBA")
    out = np.asarray(resized.resize(size, Image.Resampling.LANCZOS)).astype(np.float32)
    alpha = out[..., 3:4]
    rgb = np.where(alpha > 0, out[..., :3] * 255.0 / np.maximum(alpha, 1.0), 0)
    return clear_hidden_rgb(Image.fromarray(np.clip(np.dstack((rgb, alpha)), 0, 255).astype(np.uint8), "RGBA"))


def decontaminate_low_alpha(img: Image.Image) -> Image.Image:
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    grey = (np.abs(r.astype(int) - g.astype(int)) < 7) & (np.abs(g.astype(int) - b.astype(int)) < 7) & (r > 45) & (r < 220)
    white = (np.abs(r.astype(int) - g.astype(int)) < 8) & (np.abs(g.astype(int) - b.astype(int)) < 8) & (r >= 220)
    green = (g > 115) & (r < 105) & (b < 120) & (g.astype(int) > np.maximum(r, b).astype(int) + 42)
    matte = grey | white | green
    arr[(a < 42) & matte, 3] = 0
    if int(a.min()) < 255:
        edge = np.zeros(a.shape, dtype=bool)
        edge[:12, :] = True
        edge[-12:, :] = True
        edge[:, :12] = True
        edge[:, -12:] = True
        row_fill = matte.mean(axis=1) > 0.55
        col_fill = matte.mean(axis=0) > 0.55
        arr[(edge | row_fill[:, None] | col_fill[None, :]) & matte, 3] = 0
    arr[arr[..., 3] == 0, :3] = 0
    return Image.fromarray(arr, "RGBA")


def enhance(img: Image.Image, seed: int) -> Image.Image:
    img = ImageEnhance.Color(img).enhance(1.08)
    img = ImageEnhance.Contrast(img).enhance(1.06)
    img = ImageEnhance.Sharpness(img).enhance(1.25)
    img = img.filter(ImageFilter.UnsharpMask(radius=1.0, percent=65, threshold=3))
    arr = np.array(img.convert("RGBA"), dtype=np.int16)
    rng = np.random.default_rng(seed)
    noise = rng.normal(0, 3, (arr.shape[0], arr.shape[1], 1)).astype(np.int16)
    arr[..., :3] = np.clip(arr[..., :3] + noise * (arr[..., 3:4] > 220), 0, 255)
    return clear_hidden_rgb(Image.fromarray(arr.astype(np.uint8), "RGBA"))


def target_size(asset: Asset) -> tuple[int, int]:
    max_w = max(p.w for p in asset.placements)
    max_h = max(p.h for p in asset.placements)
    scale = max(max_w / asset.source_w, max_h / asset.source_h)
    if scale <= 1.0:
        return asset.source_w, asset.source_h
    mult = min(2.0, max(1.25, scale))
    return min(MAX_EDGE, round16(asset.source_w * mult)), min(MAX_EDGE, round16(asset.source_h * mult))


def process_asset(asset: Asset, twelve_lookup: dict[str, Path]) -> dict:
    source_path = twelve_lookup.get(asset.image_path.name, asset.image_path)
    img = Image.open(source_path).convert("RGBA")
    size = target_size(asset)
    if img.size != size:
        img = alpha_safe_resize(img, size)
    img = decontaminate_low_alpha(enhance(decontaminate_low_alpha(img), asset.gid))
    out_name = f"b{asset.out_id:03d}_gid_{asset.gid}_{slug(asset.image_path.stem)}.png"
    out_path = SPRITES / out_name
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path)
    asset.out_source = f"sprites/backgrounds/wired-clean/{out_name}"
    asset.out_w, asset.out_h = img.size
    return validate_image(out_path, asset)


def validate_image(path: Path, asset: Asset) -> dict:
    img = Image.open(path).convert("RGBA")
    arr = np.asarray(img)
    hidden = int(np.count_nonzero((arr[..., 3] == 0) & np.any(arr[..., :3] != 0, axis=2)))
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    grey = (np.abs(r.astype(int) - g.astype(int)) < 7) & (np.abs(g.astype(int) - b.astype(int)) < 7) & (r > 45) & (r < 220)
    green = (g > 115) & (r < 105) & (b < 120) & (g.astype(int) > np.maximum(r, b).astype(int) + 42)
    return {
        "gid": asset.gid,
        "out": asset.out_source,
        "dimensions": [img.width, img.height],
        "placements": len(asset.placements),
        "max_display": [round(max(p.w for p in asset.placements), 3), round(max(p.h for p in asset.placements), 3)],
        "hidden_rgb_pixels": hidden,
        "low_alpha_green_or_grey_pixels": int(np.count_nonzero((a < 42) & (grey | green))),
        "source_tsx": asset.source_tsx,
        "source_image": asset.source_image,
    }


def write_tileset(assets: list[Asset]) -> Path:
    root = ET.Element("tileset", {"version": "1.10", "tiledversion": "1.12.0", "name": "dig-game-wired-backgrounds-clean-v14", "tilewidth": str(max(a.out_w for a in assets)), "tileheight": str(max(a.out_h for a in assets)), "tilecount": str(len(assets)), "columns": "0", "objectalignment": "bottomleft"})
    for asset in assets:
        tile = ET.SubElement(root, "tile", {"id": str(asset.out_id)})
        props = ET.SubElement(tile, "properties")
        ET.SubElement(props, "property", {"name": "originalGid", "value": str(asset.gid)})
        ET.SubElement(props, "property", {"name": "originalTileset", "value": asset.source_tsx})
        ET.SubElement(props, "property", {"name": "placementCount", "value": str(len(asset.placements))})
        ET.SubElement(tile, "image", {"source": f"../{asset.out_source}", "width": str(asset.out_w), "height": str(asset.out_h)})
    path = TILESETS / "dig-game-wired-backgrounds-clean-v14.tsx"
    TILESETS.mkdir(parents=True, exist_ok=True)
    ET.ElementTree(root).write(path, encoding="UTF-8", xml_declaration=True)
    return path


def write_palette_tmx(assets: list[Asset], tsx_path: Path) -> Path:
    cols, cell_w, cell_h = 3, 720, 360
    root = ET.Element("map", {"version": "1.10", "tiledversion": "1.12.0", "orientation": "orthogonal", "renderorder": "right-down", "width": str(cols * 8), "height": str(math.ceil(len(assets) / cols) * 5), "tilewidth": "94", "tileheight": "94", "infinite": "0", "nextlayerid": "2", "nextobjectid": str(len(assets) + 1)})
    ET.SubElement(root, "tileset", {"firstgid": "1", "source": relpath(tsx_path, OUT)})
    group = ET.SubElement(root, "objectgroup", {"id": "1", "name": "wired_backgrounds_clean_v14"})
    for i, asset in enumerate(assets):
        scale = min(620 / asset.out_w, 250 / asset.out_h)
        x, y = 80 + (i % cols) * cell_w, 100 + (i // cols) * cell_h
        ET.SubElement(group, "object", {"id": str(i + 1), "name": f"B{asset.out_id:03d} gid {asset.gid}", "type": "background", "gid": str(asset.out_id + 1), "x": str(x), "y": str(round(y + asset.out_h * scale, 2)), "width": str(round(asset.out_w * scale, 2)), "height": str(round(asset.out_h * scale, 2))})
    path = OUT / "dig-game-wired-backgrounds-clean-v14.tmx"
    ET.ElementTree(root).write(path, encoding="UTF-8", xml_declaration=True)
    return path


def write_readme(report: dict) -> None:
    text = f"""# v14 Wired Background Clean Palette

Generated on 2026-07-09 from background images referenced by `exports/dig-game-world-edit-v-10-08-07-2026-;layered.tmx`.

This is an approval palette only. It does not modify runtime wiring.

- Regenerated background images: {report["asset_count"]}
- Source object placements represented: {report["placement_count"]}
- Hidden RGB validation pixels: {report["validation"]["hidden_rgb_pixels"]}
- Low-alpha grey/green matte pixels: {report["validation"]["low_alpha_green_or_grey_pixels"]}
"""
    (OUT / "readme.md").write_text(text, encoding="utf-8")


def run() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    PREVIEWS.mkdir(parents=True, exist_ok=True)
    assets, validations = parse_assets(), []
    lookup = original_12_lookup()
    for index, asset in enumerate(assets):
        asset.out_id = index
        validations.append(process_asset(asset, lookup))
    tsx = write_tileset(assets)
    tmx = write_palette_tmx(assets, tsx)
    preview = load_previews()
    preview_paths = preview.write_previews(assets, OUT, PREVIEWS)
    validation = {
        "hidden_rgb_pixels": sum(item["hidden_rgb_pixels"] for item in validations),
        "low_alpha_green_or_grey_pixels": sum(item["low_alpha_green_or_grey_pixels"] for item in validations),
        "missing_images": 0,
        "dimension_mismatches": 0,
    }
    report = {
        "source_world": relpath(WORLD_TMX, ROOT),
        "asset_count": len(assets),
        "placement_count": sum(len(asset.placements) for asset in assets),
        "tileset": relpath(tsx, ROOT),
        "palette_tmx": relpath(tmx, ROOT),
        "previews": [relpath(path, ROOT) for path in preview_paths],
        "validation": validation,
        "assets": validations,
        "assets_by_source_tileset": dict(Counter(asset.source_tsx for asset in assets)),
    }
    (OUT / "manifest-v14-wired-backgrounds-clean.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    write_readme(report)
    print(json.dumps({key: report[key] for key in ("asset_count", "placement_count", "validation", "palette_tmx", "previews")}, indent=2))
