from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from collections import deque

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "exports" / "dig_game_12layer_palette_true_separate_v1"
SRC_TSX = SRC_DIR / "dig-game-12layer-true-separate-v1.tsx"
OUT = ROOT / "exports" / "pallet-v14" / "dig_game_hq_props_backgrounds_v14"
BG_DIR = OUT / "sprites" / "backgrounds" / "hq-12layer"
PROP_DIR = OUT / "sprites" / "props"
PREVIEW_DIR = OUT / "previews"
PROP_W, PROP_H, PROP_COLS, PROP_COUNT = 303, 313, 10, 100
BG_SCALE = 4

PROP_SOURCE_DIRS = [
    ROOT / "exports" / "pallet-v10" / "dig_game_full_non_tile_runtime_assets_v10_08_07_2026" / "sprites" / "props" / "near_props_seam_breakers",
    ROOT / "exports" / "pallet-v9" / "dig_game_empty_backgrounds_and_separate_props_v1" / "sprites" / "props" / "near_props_seam_breakers",
]

BIOME_FILL = {
    "industrial_magma_sanctum": (18, 10, 8),
    "irradiated_storm_surface": (10, 15, 13),
    "deep_cave_biome": (8, 12, 18),
    "bioluminescent_root_caverns": (7, 18, 19),
    "frozen_prism_abyss": (8, 15, 25),
    "cave_biome": (18, 13, 9),
    "void_realm": (8, 6, 18),
}

REJECTED_PROP_STEMS = {
    # Thin/cut silhouettes or rejected side-angle cart style from earlier review.
    "0d411802-tile_0067",
    "cave_biome__l11__14",
}


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def font(size: int):
    for name in ("arial.ttf", "segoeui.ttf", "consola.ttf"):
        path = Path("C:/Windows/Fonts") / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def checkerboard(size: tuple[int, int], step: int = 18) -> Image.Image:
    w, h = size
    img = Image.new("RGB", size, (76, 84, 91))
    draw = ImageDraw.Draw(img)
    for y in range(0, h, step):
        for x in range(0, w, step):
            color = (54, 61, 68) if ((x // step) + (y // step)) % 2 else (88, 96, 103)
            draw.rectangle((x, y, x + step - 1, y + step - 1), fill=color)
    return img


def parse_background_tiles() -> list[dict]:
    tiles = []
    for tile in ET.parse(SRC_TSX).getroot().findall("tile"):
        props = {p.attrib["name"]: p.attrib.get("value", "") for p in tile.find("properties").findall("property")}
        image = tile.find("image")
        tiles.append(
            {
                "id": int(tile.attrib["id"]),
                "biome": props["biome"],
                "layer_id": props["assetLayerId"],
                "layer_name": props["assetLayerName"],
                "loop_x": props.get("loopX", "false"),
                "parallax_x": props.get("parallaxX", "0"),
                "parallax_y": props.get("parallaxY", "0"),
                "source": SRC_DIR / image.attrib["source"],
                "source_w": int(image.attrib["width"]),
                "source_h": int(image.attrib["height"]),
            }
        )
    return tiles


def is_matte_color(color: tuple[int, int, int]) -> bool:
    r, g, b = color
    grey = abs(r - g) < 9 and abs(g - b) < 9 and 45 <= r <= 210
    green = g > 120 and r < 90 and b < 115
    return grey or green


def is_grey_matte_pixel(r: int, g: int, b: int) -> bool:
    return abs(r - g) < 8 and abs(g - b) < 8 and 45 <= r <= 215


def is_green_matte_pixel(r: int, g: int, b: int) -> bool:
    # Targets chroma/matte spill while preserving cyan, yellow, and painted green highlights.
    return g >= 120 and r <= 95 and b <= 115 and g >= max(r, b) + 48


def replace_border_matte(img: Image.Image, fill: tuple[int, int, int]) -> Image.Image:
    img = img.copy().convert("RGB")
    px = img.load()
    w, h = img.size
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.extend([(x, 0), (x, h - 1)])
    for y in range(h):
        q.extend([(0, y), (w - 1, y)])
    while q:
        x, y = q.popleft()
        idx = y * w + x
        if seen[idx]:
            continue
        seen[idx] = 1
        if not is_matte_color(px[x, y]):
            continue
        px[x, y] = fill
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                q.append((nx, ny))
    return img


def replace_all_matte(img: Image.Image, fill: tuple[int, int, int]) -> Image.Image:
    img = img.copy().convert("RGB")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            if is_matte_color(px[x, y]):
                px[x, y] = fill
    return img


def flatten_rgba(img: Image.Image, biome: str) -> Image.Image:
    img = img.convert("RGBA")
    alpha = img.getchannel("A")
    base = BIOME_FILL.get(biome, (10, 12, 16))
    if alpha.getextrema()[0] == 255:
        return replace_border_matte(img.convert("RGB"), base)
    plate = Image.new("RGBA", img.size, base + (255,))
    plate.alpha_composite(img)
    return replace_border_matte(plate.convert("RGB"), base)


def upscale_background(tile: dict) -> dict:
    img = flatten_rgba(Image.open(tile["source"]), tile["biome"])
    if tile["layer_id"] in {"L07", "L08", "L09", "L10", "L11"}:
        img = replace_all_matte(img, BIOME_FILL.get(tile["biome"], (10, 12, 16)))
    target = (tile["source_w"] * BG_SCALE, tile["source_h"] * BG_SCALE)
    img = img.resize(target, Image.Resampling.LANCZOS)
    img = ImageEnhance.Contrast(img).enhance(1.08)
    img = ImageEnhance.Sharpness(img).enhance(1.35)
    detail = img.filter(ImageFilter.UnsharpMask(radius=1.1, percent=70, threshold=3))
    img = Image.blend(img, detail, 0.45)
    rel = Path("sprites") / "backgrounds" / "hq-12layer" / tile["layer_id"].lower() / f"{tile['biome']}_{tile['layer_id'].lower()}.png"
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    return {**tile, "out_source": rel.as_posix(), "out_w": target[0], "out_h": target[1]}


def source_prop_files() -> list[Path]:
    files: list[Path] = []
    for root in PROP_SOURCE_DIRS:
        if not root.exists():
            continue
        files.extend(sorted(root.glob("*.png")))
        files.extend(sorted(root.glob("*.webp")))
    # Put the highest-detail v10 renders first, then fill with the broader v9 prop set.
    files.sort(key=lambda p: (0 if "pallet-v10" in str(p) else 1, -p.stat().st_size, p.name))
    unique = []
    seen = set()
    for path in files:
        if path.stem in REJECTED_PROP_STEMS:
            continue
        key = re.sub(r"^[0-9a-f]{8}-", "", path.stem)
        key = re.sub(r"__v\d+$", "", key)
        if key in seen:
            continue
        seen.add(key)
        unique.append(path)
        if len(unique) >= PROP_COUNT:
            break
    if len(unique) < PROP_COUNT:
        raise RuntimeError(f"Only found {len(unique)} usable prop sources")
    return unique


def matte_clean_prop(path: Path) -> Image.Image:
    img = Image.open(path).convert("RGBA")
    r, g, b, a = img.split()
    alpha = a.point(lambda v: 0 if v < 18 else v)
    # Remove semi-transparent grey or chroma-green fringe without deleting solid green details.
    px = img.load()
    out_a = alpha.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            aa = out_a[x, y]
            if aa == 0:
                continue
            rr, gg, bb, _ = px[x, y]
            grey = is_grey_matte_pixel(rr, gg, bb)
            green_matte = is_green_matte_pixel(rr, gg, bb)
            if aa < 185 and (grey or green_matte):
                out_a[x, y] = 0
    cleaned = Image.merge("RGBA", (r, g, b, alpha))
    bbox = alpha.getbbox()
    if not bbox:
        raise RuntimeError(f"Blank alpha after cleanup: {path}")
    cropped = cleaned.crop(bbox)
    cw, ch = cropped.size
    scale = min((PROP_W - 24) / cw, (PROP_H - 24) / ch)
    scale = min(scale, 1.65)
    resized = cropped.resize((max(1, int(cw * scale)), max(1, int(ch * scale))), Image.Resampling.LANCZOS)
    resized = ImageEnhance.Sharpness(resized).enhance(1.16)
    cell = Image.new("RGBA", (PROP_W, PROP_H), (0, 0, 0, 0))
    x = (PROP_W - resized.width) // 2
    y = PROP_H - resized.height - 11
    cell.alpha_composite(resized, (x, max(8, y)))
    cell = remove_tiny_alpha_components(cell)
    return enforce_true_transparent_prop_cell(cell)


def has_transparent_neighbor(alpha, x: int, y: int, w: int, h: int, radius: int = 1) -> bool:
    for ny in range(max(0, y - radius), min(h, y + radius + 1)):
        for nx in range(max(0, x - radius), min(w, x + radius + 1)):
            if nx == x and ny == y:
                continue
            if alpha[nx, ny] == 0:
                return True
    return False


def enforce_true_transparent_prop_cell(img: Image.Image) -> Image.Image:
    img = img.copy().convert("RGBA")
    px = img.load()
    w, h = img.size

    # Hard-clear the tile perimeter so Tiled slicing never inherits a colored edge.
    for x in range(w):
        for y in (0, 1, h - 2, h - 1):
            px[x, y] = (0, 0, 0, 0)
    for y in range(h):
        for x in (0, 1, w - 2, w - 1):
            px[x, y] = (0, 0, 0, 0)

    for _ in range(8):
        alpha = img.getchannel("A").load()
        removals: list[tuple[int, int]] = []
        despill: list[tuple[int, int, tuple[int, int, int, int]]] = []
        for y in range(2, h - 2):
            for x in range(2, w - 2):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                edge = a < 230 or has_transparent_neighbor(alpha, x, y, w, h, radius=1)
                if not edge:
                    continue
                if is_grey_matte_pixel(r, g, b) and a < 210:
                    removals.append((x, y))
                    continue
                if is_green_matte_pixel(r, g, b):
                    if a < 230:
                        removals.append((x, y))
                    else:
                        capped_g = min(g, max(r, b) + 24)
                        despill.append((x, y, (r, capped_g, b, a)))
                elif a < 42:
                    removals.append((x, y))
        if not removals and not despill:
            break
        for x, y in removals:
            px[x, y] = (0, 0, 0, 0)
        for x, y, color in despill:
            if px[x, y][3] != 0:
                px[x, y] = color

    return remove_tiny_alpha_components(img)


def remove_tiny_alpha_components(img: Image.Image) -> Image.Image:
    img = img.copy()
    alpha = img.getchannel("A")
    px = alpha.load()
    w, h = alpha.size
    seen = bytearray(w * h)
    kill: list[tuple[int, int]] = []
    for sy in range(h):
        for sx in range(w):
            idx = sy * w + sx
            if seen[idx] or px[sx, sy] < 24:
                continue
            q = deque([(sx, sy)])
            seen[idx] = 1
            comp = []
            min_x = max_x = sx
            min_y = max_y = sy
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                min_x, max_x = min(min_x, x), max(max_x, x)
                min_y, max_y = min(min_y, y), max(max_y, y)
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        ni = ny * w + nx
                        if not seen[ni] and px[nx, ny] >= 24:
                            seen[ni] = 1
                            q.append((nx, ny))
            if len(comp) < 75 and (max_x - min_x) < 24 and (max_y - min_y) < 24:
                kill.extend(comp)
    if kill:
        a = alpha.load()
        for x, y in kill:
            a[x, y] = 0
        img.putalpha(alpha)
    return img


def write_props() -> tuple[list[dict], Path]:
    PROP_DIR.mkdir(parents=True, exist_ok=True)
    sources = source_prop_files()
    grid = Image.new("RGBA", (PROP_W * PROP_COLS, PROP_H * PROP_COLS), (0, 0, 0, 0))
    props = []
    for idx, src in enumerate(sources, start=1):
        cell = matte_clean_prop(src)
        x = ((idx - 1) % PROP_COLS) * PROP_W
        y = ((idx - 1) // PROP_COLS) * PROP_H
        grid.alpha_composite(cell, (x, y))
        rel_src = src.relative_to(ROOT).as_posix()
        props.append({"id": f"P{idx:03d}", "source": rel_src, "name": src.stem, "tile_id": idx - 1})
    path = PROP_DIR / "v14_hq_props_grid_303x313_10x10.png"
    grid.save(path)
    return props, path


def write_tsx(backgrounds: list[dict], props: list[dict]) -> None:
    lines = ["<?xml version='1.0' encoding='UTF-8'?>", '<tileset version="1.10" tiledversion="1.12.0" name="dig-game-hq-backgrounds-v14" tilewidth="3984" tileheight="568" tilecount="84" columns="0" objectalignment="bottomleft">']
    for tile in backgrounds:
        lines += [
            f' <tile id="{tile["id"]}" type="backgrounds">',
            "  <properties>",
            f'   <property name="approvalId" value="B{tile["id"] + 1:03d}"/>',
            f'   <property name="biome" value="{tile["biome"]}"/>',
            f'   <property name="assetLayerId" value="{tile["layer_id"]}"/>',
            f'   <property name="assetLayerName" value="{tile["layer_name"]}"/>',
            f'   <property name="loopX" value="{tile["loop_x"]}"/>',
            f'   <property name="parallaxX" value="{tile["parallax_x"]}"/>',
            f'   <property name="parallaxY" value="{tile["parallax_y"]}"/>',
            "  </properties>",
            f'  <image width="{tile["out_w"]}" height="{tile["out_h"]}" source="{tile["out_source"]}"/>',
            " </tile>",
        ]
    lines.append("</tileset>")
    (OUT / "dig-game-hq-backgrounds-v14.tsx").write_text("\n".join(lines) + "\n", encoding="utf-8")

    lines = [
        "<?xml version='1.0' encoding='UTF-8'?>",
        f'<tileset version="1.10" tiledversion="1.12.0" name="dig-game-hq-props-v14" tilewidth="{PROP_W}" tileheight="{PROP_H}" tilecount="{PROP_COUNT}" columns="{PROP_COLS}" objectalignment="bottomleft">',
        f' <image width="{PROP_W * PROP_COLS}" height="{PROP_H * PROP_COLS}" source="sprites/props/v14_hq_props_grid_303x313_10x10.png"/>',
    ]
    for prop in props:
        lines += [
            f' <tile id="{prop["tile_id"]}" type="props">',
            "  <properties>",
            f'   <property name="approvalId" value="{prop["id"]}"/>',
            f'   <property name="sourceAsset" value="{prop["source"]}"/>',
            "  </properties>",
            " </tile>",
        ]
    lines.append("</tileset>")
    (OUT / "dig-game-hq-props-v14.tsx").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_tmx(backgrounds: list[dict], props: list[dict]) -> None:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<map version="1.10" tiledversion="1.12.0" orientation="orthogonal" renderorder="right-down" width="190" height="290" tilewidth="94" tileheight="94" infinite="0" nextlayerid="10" nextobjectid="300">',
        " <properties>",
        '  <property name="description" value="v14 high quality approval palette, no runtime wiring."/>',
        '  <property name="propGrid" value="100 props, 10x10, exact 303x313 cells."/>',
        '  <property name="backgroundScale" value="4x source 12-layer palette dimensions."/>',
        '  <property name="propTransparency" value="true alpha background, cleared perimeter, green/grey edge matte removed."/>',
        " </properties>",
        ' <tileset firstgid="1" source="dig-game-hq-backgrounds-v14.tsx"/>',
        ' <tileset firstgid="85" source="dig-game-hq-props-v14.tsx"/>',
    ]
    obj = 1
    for tile in backgrounds:
        row = tile["id"] // 3
        col = tile["id"] % 3
        lines.append(f' <objectgroup id="{obj}" name="B{tile["id"] + 1:03d} {tile["biome"]} {tile["layer_id"]}">')
        lines.append(f'  <object id="{obj}" name="B{tile["id"] + 1:03d} {tile["biome"]} {tile["layer_id"]} {tile["layer_name"]}" type="backgrounds" gid="{tile["id"] + 1}" x="{80 + col * 610}" y="{140 + row * 190}" width="{tile["out_w"] // 4}" height="{tile["out_h"] // 4}"/>')
        lines.append(" </objectgroup>")
        obj += 1
    lines.append(f' <objectgroup id="{obj}" name="P001-P100 high quality props">')
    for i, prop in enumerate(props, start=1):
        col, row = (i - 1) % 5, (i - 1) // 5
        lines.append(f'  <object id="{obj + i}" name="{prop["id"]} {prop["name"]}" type="props" gid="{84 + i}" x="{80 + col * 350}" y="{5600 + row * 355}" width="{PROP_W}" height="{PROP_H}"/>')
    lines.append(" </objectgroup>")
    lines.append("</map>")
    (OUT / "dig-game-hq-props-backgrounds-v14.tmx").write_text("\n".join(lines) + "\n", encoding="utf-8")


def preview_props(props_path: Path, props: list[dict]) -> Path:
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(props_path).convert("RGBA")
    pad, label_h = 18, 28
    out = Image.new("RGB", (PROP_COLS * (PROP_W + pad) + pad, PROP_COLS * (PROP_H + label_h + pad) + pad), (8, 12, 18))
    draw = ImageDraw.Draw(out)
    f = font(18)
    for i, prop in enumerate(props):
        sx, sy = (i % PROP_COLS) * PROP_W, (i // PROP_COLS) * PROP_H
        cell = sheet.crop((sx, sy, sx + PROP_W, sy + PROP_H))
        x, y = pad + (i % PROP_COLS) * (PROP_W + pad), pad + (i // PROP_COLS) * (PROP_H + label_h + pad)
        draw.rectangle((x, y, x + PROP_W, y + label_h), fill=(20, 25, 31), outline=(236, 180, 44))
        draw.text((x + 8, y + 4), f'{prop["id"]} {prop["name"][:25]}', fill=(246, 228, 156), font=f)
        out.paste(checkerboard((PROP_W, PROP_H)), (x, y + label_h))
        draw.rectangle((x, y + label_h, x + PROP_W, y + label_h + PROP_H), outline=(236, 180, 44))
        out.paste(cell, (x, y + label_h), cell)
    path = PREVIEW_DIR / "preview-v14-hq-props-numbered.png"
    out.save(path)
    return path


def preview_backgrounds(backgrounds: list[dict]) -> Path:
    tw, th, cols, pad, label_h = 320, 96, 3, 16, 24
    rows = (len(backgrounds) + cols - 1) // cols
    out = Image.new("RGB", (cols * (tw + pad) + pad, rows * (th + label_h + pad) + pad), (8, 12, 18))
    draw = ImageDraw.Draw(out)
    f = font(16)
    for i, tile in enumerate(backgrounds):
        img = Image.open(OUT / tile["out_source"]).convert("RGB")
        thumb = img.resize((tw, max(1, int(img.height * tw / img.width))), Image.Resampling.LANCZOS)
        x, y = pad + (i % cols) * (tw + pad), pad + (i // cols) * (th + label_h + pad)
        draw.rectangle((x, y, x + tw, y + label_h), fill=(20, 25, 31), outline=(236, 180, 44))
        draw.text((x + 7, y + 4), f'B{i + 1:03d} {tile["biome"]} {tile["layer_id"]}', fill=(246, 228, 156), font=f)
        draw.rectangle((x, y + label_h, x + tw, y + label_h + th), fill=(14, 19, 26), outline=(236, 180, 44))
        out.paste(thumb, (x, y + label_h + (th - thumb.height) // 2))
    path = PREVIEW_DIR / "preview-v14-hq-backgrounds-numbered.png"
    out.save(path)
    return path


def validate(backgrounds: list[dict], props_path: Path) -> dict:
    problems = []
    warnings = []
    for tile in backgrounds:
        img = Image.open(OUT / tile["out_source"])
        if img.size != (tile["out_w"], tile["out_h"]):
            problems.append(f'bad background dimensions {tile["out_source"]}')
        if img.mode != "RGB":
            problems.append(f'background not opaque RGB {tile["out_source"]}')
        if tile["out_w"] != tile["source_w"] * BG_SCALE or tile["out_h"] != tile["source_h"] * BG_SCALE:
            problems.append(f'background not {BG_SCALE}x source size {tile["out_source"]}')
    grid = Image.open(props_path).convert("RGBA")
    if grid.size != (PROP_W * PROP_COLS, PROP_H * PROP_COLS):
        problems.append("prop grid dimension mismatch")
    total_green_edge_pixels = 0
    for i in range(PROP_COUNT):
        x, y = (i % PROP_COLS) * PROP_W, (i // PROP_COLS) * PROP_H
        cell = grid.crop((x, y, x + PROP_W, y + PROP_H))
        alpha = cell.getchannel("A")
        bbox = alpha.getbbox()
        if not bbox:
            problems.append(f"P{i + 1:03d} blank")
            continue
        if bbox[0] < 2 or bbox[1] < 2 or bbox[2] > PROP_W - 2 or bbox[3] > PROP_H - 2:
            problems.append(f"P{i + 1:03d} touches slice edge {bbox}")
        for pt in ((0, 0), (PROP_W - 1, 0), (0, PROP_H - 1), (PROP_W - 1, PROP_H - 1)):
            if cell.getpixel(pt)[3]:
                problems.append(f"P{i + 1:03d} opaque corner")
        apx = alpha.load()
        cpx = cell.load()
        green_edge_pixels = 0
        semi_transparent_edge_pixels = 0
        for py in range(PROP_H):
            for px_ in range(PROP_W):
                r, g, b, a = cpx[px_, py]
                if a == 0:
                    continue
                edge = px_ < 2 or py < 2 or px_ >= PROP_W - 2 or py >= PROP_H - 2 or a < 230 or has_transparent_neighbor(apx, px_, py, PROP_W, PROP_H, radius=1)
                if not edge:
                    continue
                if a < 64:
                    semi_transparent_edge_pixels += 1
                if is_green_matte_pixel(r, g, b):
                    green_edge_pixels += 1
        total_green_edge_pixels += green_edge_pixels
        if green_edge_pixels:
            problems.append(f"P{i + 1:03d} green edge matte pixels {green_edge_pixels}")
        if semi_transparent_edge_pixels > 350:
            warnings.append(f"P{i + 1:03d} many soft edge pixels {semi_transparent_edge_pixels}")
    return {
        "ok": not problems,
        "problems": problems,
        "warnings": warnings,
        "backgrounds": len(backgrounds),
        "props": PROP_COUNT,
        "propGreenEdgePixels": total_green_edge_pixels,
        "backgroundScale": BG_SCALE,
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    backgrounds = [upscale_background(tile) for tile in parse_background_tiles()]
    props, prop_grid = write_props()
    write_tsx(backgrounds, props)
    write_tmx(backgrounds, props)
    previews = [preview_props(prop_grid, props), preview_backgrounds(backgrounds)]
    validation = validate(backgrounds, prop_grid)
    manifest = {
        "generatedBy": Path(__file__).name,
        "scope": "approval only; no runtime wiring",
        "paletteTmx": "dig-game-hq-props-backgrounds-v14.tmx",
        "backgroundCount": len(backgrounds),
        "propCount": len(props),
        "propGrid": {"columns": PROP_COLS, "cellWidth": PROP_W, "cellHeight": PROP_H},
        "previews": [p.relative_to(OUT).as_posix() for p in previews],
        "validation": validation,
    }
    (OUT / "manifest_v14_hq_props_backgrounds.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))
    if not validation["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
