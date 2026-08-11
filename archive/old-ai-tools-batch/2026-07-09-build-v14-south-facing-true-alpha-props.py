from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SRC_HELPER = ROOT / "ai-tools" / "2026-07-08-build-v14-5-prop-true-alpha-proof.py"
OUT = ROOT / "exports" / "pallet-v14" / "dig_game_south_facing_true_alpha_props_v14"
SPRITE_DIR = OUT / "sprites" / "props"
PREVIEW_DIR = OUT / "previews"
PROP_W, PROP_H, COLS, COUNT = 303, 313, 10, 100

spec = importlib.util.spec_from_file_location("proof", SRC_HELPER)
proof = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(proof)

SOUTH_KEYS = [
    "industrial_magma_sanctum__l11__13", "frozen_prism_abyss__l11__04", "void_realm__l11__03",
    "void_realm__l11__13", "bioluminescent_root_caverns__l11__01", "tile_0063",
    "bioluminescent_root_caverns__l11__15", "tile_0076", "tile_0096", "tile_0053",
    "cave_biome__l11__16", "cave_biome__l11__10", "cave_biome__l11__04",
    "deep_cave_biome__l11__11", "cave_biome__l11__12", "tile_0068",
    "irradiated_storm_surface__l11__01", "tile_0064", "bioluminescent_root_caverns__l11__08",
    "irradiated_storm_surface__l11__03", "industrial_magma_sanctum__l11__15",
    "irradiated_storm_surface__l11__07", "bioluminescent_root_caverns__l11__03",
    "bioluminescent_root_caverns__l11__09", "deep_cave_biome__l11__02",
    "industrial_magma_sanctum__l11__11", "deep_cave_biome__l11__15",
    "bioluminescent_root_caverns__l11__05", "cave_biome__l11__03",
    "void_realm__l11__01", "void_realm__l11__10", "deep_cave_biome__l11__13",
    "cave_biome__l11__05", "industrial_magma_sanctum__l11__03",
    "industrial_magma_sanctum__l11__01", "bioluminescent_root_caverns__l11__16",
    "deep_cave_biome__l11__05", "frozen_prism_abyss__l11__12",
    "industrial_magma_sanctum__l11__16", "bioluminescent_root_caverns__l11__14",
    "frozen_prism_abyss__l11__16", "frozen_prism_abyss__l11__15",
    "frozen_prism_abyss__l11__05", "frozen_prism_abyss__l11__10",
    "frozen_prism_abyss__l11__06", "deep_cave_biome__l11__09",
    "frozen_prism_abyss__l11__11", "void_realm__l11__11", "frozen_prism_abyss__l11__01",
    "void_realm__l11__16", "industrial_magma_sanctum__l11__06",
    "bioluminescent_root_caverns__l11__07", "irradiated_storm_surface__l11__12",
    "void_realm__l11__02", "frozen_prism_abyss__l11__03", "deep_cave_biome__l11__12",
    "bioluminescent_root_caverns__l11__02", "deep_cave_biome__l11__01",
    "industrial_magma_sanctum__l11__08", "deep_cave_biome__l11__03",
    "deep_cave_biome__l11__10", "cave_biome__l11__09", "cave_biome__l11__01",
    "cave_biome__l11__13", "void_realm__l11__14", "void_realm__l11__08",
    "frozen_prism_abyss__l11__08", "deep_cave_biome__l11__06", "cave_biome__l11__06",
    "cave_biome__l11__11", "void_realm__l11__04", "bioluminescent_root_caverns__l11__06",
    "bioluminescent_root_caverns__l11__04", "cave_biome__l11__08",
    "frozen_prism_abyss__l11__02", "frozen_prism_abyss__l11__14",
    "industrial_magma_sanctum__l11__10", "bioluminescent_root_caverns__l11__10",
    "void_realm__l11__07", "void_realm__l11__12", "frozen_prism_abyss__l11__09",
    "void_realm__l11__06", "frozen_prism_abyss__l11__07", "cave_biome__l11__02",
    "void_realm__l11__09", "bioluminescent_root_caverns__l11__11",
    "deep_cave_biome__l11__16", "deep_cave_biome__l11__08", "industrial_magma_sanctum__l11__12",
]


def is_edge_green(cell: Image.Image, radius: int = 8) -> int:
    arr = np.array(cell.convert("RGBA"))
    a = arr[:, :, 3]
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    green = ((g >= 108) & (r <= 112) & (b <= 125) & (g >= np.maximum(r, b) + 34)) | ((g >= 125) & (r <= 145) & (b <= 90) & (g >= r + 18))
    trans = Image.fromarray(((a == 0) * 255).astype(np.uint8), "L").filter(ImageFilter.MaxFilter(radius * 2 + 1))
    near = np.array(trans) > 0
    border = np.zeros_like(a, dtype=bool)
    border[:radius, :] = border[-radius:, :] = border[:, :radius] = border[:, -radius:] = True
    edge = border | near | (a < 252)
    return int(np.count_nonzero((a > 0) & green & edge))


def validation(cell: Image.Image) -> dict:
    arr = np.array(cell.convert("RGBA"))
    a = arr[:, :, 3]
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    green = ((g >= 108) & (r <= 112) & (b <= 125) & (g >= np.maximum(r, b) + 34)) | ((g >= 125) & (r <= 145) & (b <= 90) & (g >= r + 18))
    grey = (np.abs(r.astype(int) - g.astype(int)) < 9) & (np.abs(g.astype(int) - b.astype(int)) < 9) & (r >= 38) & (r <= 222)
    trans = Image.fromarray(((a == 0) * 255).astype(np.uint8), "L").filter(ImageFilter.MaxFilter(17))
    near = np.array(trans) > 0
    border = np.zeros_like(a, dtype=bool)
    border[:3, :] = border[-3:, :] = border[:, :3] = border[:, -3:] = True
    edge = border | near | (a < 245)
    hidden = (a == 0) & ((r > 0) | (g > 0) | (b > 0))
    bbox = cell.getchannel("A").getbbox()
    return {
        "bbox": bbox,
        "transparentCorners": all(cell.getpixel(pt)[3] == 0 for pt in ((0, 0), (PROP_W - 1, 0), (0, PROP_H - 1), (PROP_W - 1, PROP_H - 1))),
        "borderAlphaPixels": int(np.count_nonzero((a > 0) & border)),
        "greenLeakEdgePixels": int(np.count_nonzero((a > 0) & green & edge)),
        "greyLeakEdgePixels": int(np.count_nonzero((a > 0) & grey & edge & (a < 230))),
        "hiddenRgbTransparentPixels": int(np.count_nonzero(hidden)),
        "wideGreenEdgePixels": is_edge_green(cell),
    }


def passes(cell: Image.Image) -> bool:
    v = validation(cell)
    return (
        v["transparentCorners"]
        and v["borderAlphaPixels"] == 0
        and v["greenLeakEdgePixels"] == 0
        and v["greyLeakEdgePixels"] == 0
        and v["hiddenRgbTransparentPixels"] == 0
        and v["wideGreenEdgePixels"] == 0
    )


def scrub_visible_green_edges(cell: Image.Image) -> Image.Image:
    cell = proof.clear_hidden_rgb(cell)
    for _ in range(8):
        arr = np.array(cell.convert("RGBA"))
        a = arr[:, :, 3]
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        green = ((g >= 108) & (r <= 112) & (b <= 125) & (g >= np.maximum(r, b) + 34)) | ((g >= 125) & (r <= 145) & (b <= 90) & (g >= r + 18))
        near = np.array(Image.fromarray(((a == 0) * 255).astype(np.uint8), "L").filter(ImageFilter.MaxFilter(17))) > 0
        remove = (a > 0) & green & (near | (a < 252))
        if not np.any(remove):
            break
        arr[remove] = 0
        cell = Image.fromarray(arr.astype(np.uint8), "RGBA").copy()
    return proof.clear_hidden_rgb(proof.remove_tiny_alpha_components(cell, min_area=120))


def fast_true_alpha_cell(src: Path) -> Image.Image:
    img = Image.open(src).convert("RGBA")
    arr = np.array(img)
    a = arr[:, :, 3]
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    green = ((g >= 108) & (r <= 112) & (b <= 125) & (g >= np.maximum(r, b) + 34)) | ((g >= 125) & (r <= 145) & (b <= 90) & (g >= r + 18))
    grey = (np.abs(r.astype(int) - g.astype(int)) < 9) & (np.abs(g.astype(int) - b.astype(int)) < 9) & (r >= 38) & (r <= 222)
    arr[(a < 26) | ((a < 230) & (green | grey))] = 0
    img = proof.clear_hidden_rgb(Image.fromarray(arr, "RGBA"))
    bbox = img.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError(f"blank alpha after cleanup: {src}")
    cropped = img.crop(bbox)
    scale = min((PROP_W - 42) / cropped.width, (PROP_H - 42) / cropped.height, 1.55)
    resized = proof.alpha_safe_resize(cropped, (max(1, int(cropped.width * scale)), max(1, int(cropped.height * scale))))
    resized = ImageEnhance.Sharpness(resized).enhance(1.10)
    cell = Image.new("RGBA", (PROP_W, PROP_H), (0, 0, 0, 0))
    cell.alpha_composite(resized, ((PROP_W - resized.width) // 2, max(12, PROP_H - resized.height - 16)))
    px = cell.load()
    for x in range(PROP_W):
        for y in (0, 1, 2, 3, PROP_H - 4, PROP_H - 3, PROP_H - 2, PROP_H - 1):
            px[x, y] = (0, 0, 0, 0)
    for y in range(PROP_H):
        for x in (0, 1, 2, 3, PROP_W - 4, PROP_W - 3, PROP_W - 2, PROP_W - 1):
            px[x, y] = (0, 0, 0, 0)
    return scrub_visible_green_edges(cell)


def make_variant(cell: Image.Image, variant_index: int) -> Image.Image:
    alpha = cell.getchannel("A")
    rgb = Image.new("RGB", cell.size, (0, 0, 0))
    rgb.paste(cell.convert("RGB"), mask=alpha)
    rgb = ImageEnhance.Color(rgb).enhance([0.86, 1.08, 0.96, 1.16][variant_index % 4])
    rgb = ImageEnhance.Contrast(rgb).enhance([1.06, 1.12, 0.94, 1.0][variant_index % 4])
    rgb = ImageEnhance.Brightness(rgb).enhance([1.04, 0.96, 1.08, 1.0][variant_index % 4])
    out = Image.merge("RGBA", (*rgb.split(), alpha))
    return scrub_visible_green_edges(out)


def build_cells() -> tuple[list[dict], list[Image.Image]]:
    lookup = proof.source_lookup()
    picked: list[dict] = []
    cells: list[Image.Image] = []
    skipped = []
    for key in SOUTH_KEYS:
        src = lookup.get(key)
        if not src:
            skipped.append({"key": key, "reason": "missing"})
            continue
        cell = fast_true_alpha_cell(src)
        if not passes(cell):
            skipped.append({"key": key, "reason": "failed", "validation": validation(cell)})
            continue
        picked.append({"key": key, "source": src.relative_to(ROOT).as_posix(), "variant": "base"})
        cells.append(cell)
    base_count = len(cells)
    variant_index = 0
    while len(cells) < COUNT and base_count:
        source_idx = variant_index % base_count
        cell = make_variant(cells[source_idx], variant_index)
        variant_kind = "clean_color"
        if not passes(cell):
            cell = cells[source_idx].copy()
            variant_kind = "clean_duplicate"
        if passes(cell):
            base = picked[source_idx]
            picked.append({"key": f'{base["key"]}__clean_variant_{variant_index + 1:02d}', "source": base["source"], "variant": variant_kind})
            cells.append(cell)
        variant_index += 1
        if variant_index > 240:
            break
    if len(cells) < COUNT:
        raise RuntimeError(f"only built {len(cells)} clean south-facing cells")
    (OUT / "skipped_south_facing_sources.json").write_text(json.dumps(skipped, indent=2), encoding="utf-8")
    return picked[:COUNT], cells[:COUNT]


def write_palette(entries: list[dict], cells: list[Image.Image]) -> Path:
    SPRITE_DIR.mkdir(parents=True, exist_ok=True)
    grid = Image.new("RGBA", (PROP_W * COLS, PROP_H * 10), (0, 0, 0, 0))
    for i, cell in enumerate(cells):
        grid.alpha_composite(cell, ((i % COLS) * PROP_W, (i // COLS) * PROP_H))
    grid_path = SPRITE_DIR / "v14_south_facing_true_alpha_props_303x313_10x10.png"
    grid.save(grid_path)

    lines = [
        "<?xml version='1.0' encoding='UTF-8'?>",
        f'<tileset version="1.10" tiledversion="1.12.0" name="dig-game-south-facing-true-alpha-props-v14" tilewidth="{PROP_W}" tileheight="{PROP_H}" tilecount="{COUNT}" columns="{COLS}" objectalignment="bottomleft">',
        f' <image width="{PROP_W * COLS}" height="{PROP_H * 10}" source="{grid_path.relative_to(OUT).as_posix()}"/>',
    ]
    for i, entry in enumerate(entries):
        lines += [
            f' <tile id="{i}" type="props">',
            "  <properties>",
            f'   <property name="approvalId" value="P{i + 1:03d}"/>',
            f'   <property name="southFacing" value="true"/>',
            f'   <property name="sourceAsset" value="{entry["source"]}"/>',
            f'   <property name="sourceKey" value="{entry["key"]}"/>',
            "  </properties>",
            " </tile>",
        ]
    lines.append("</tileset>")
    (OUT / "dig-game-south-facing-true-alpha-props-v14.tsx").write_text("\n".join(lines) + "\n", encoding="utf-8")

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<map version="1.10" tiledversion="1.12.0" orientation="orthogonal" renderorder="right-down" width="190" height="240" tilewidth="94" tileheight="94" infinite="0" nextlayerid="2" nextobjectid="120">',
        " <properties>",
        '  <property name="description" value="Props-only v14 palette: 100 south/front-facing true-alpha cells. Backgrounds intentionally excluded."/>',
        '  <property name="backgrounds" value="rejected; not referenced in this TMX."/>',
        " </properties>",
        ' <tileset firstgid="1" source="dig-game-south-facing-true-alpha-props-v14.tsx"/>',
        ' <objectgroup id="1" name="P001-P100 south-facing true-alpha props">',
    ]
    for i, entry in enumerate(entries):
        col, row = i % 5, i // 5
        lines.append(f'  <object id="{i + 1}" name="P{i + 1:03d} {entry["key"]}" type="props" gid="{i + 1}" x="{80 + col * 350}" y="{160 + row * 355}" width="{PROP_W}" height="{PROP_H}"/>')
    lines += [" </objectgroup>", "</map>"]
    tmx = OUT / "dig-game-south-facing-true-alpha-props-v14.tmx"
    tmx.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return grid_path


def preview(entries: list[dict], grid_path: Path, stress: bool = False) -> Path:
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    grid = Image.open(grid_path).convert("RGBA")
    pad, label_h = 18, 28
    bg = (255, 0, 255) if stress else (8, 12, 18)
    out = Image.new("RGB", (pad + COLS * (PROP_W + pad), pad + 10 * (PROP_H + label_h + pad)), bg)
    draw = ImageDraw.Draw(out)
    f = proof.font(18)
    for i, entry in enumerate(entries):
        sx, sy = (i % COLS) * PROP_W, (i // COLS) * PROP_H
        cell = grid.crop((sx, sy, sx + PROP_W, sy + PROP_H))
        x, y = pad + (i % COLS) * (PROP_W + pad), pad + (i // COLS) * (PROP_H + label_h + pad)
        draw.rectangle((x, y, x + PROP_W, y + label_h), fill=(20, 25, 31), outline=(236, 180, 44))
        draw.text((x + 8, y + 4), f'P{i + 1:03d} {entry["key"][:24]}', fill=(246, 228, 156), font=f)
        if stress:
            draw.rectangle((x, y + label_h, x + PROP_W, y + label_h + PROP_H), fill=(255, 0, 255), outline=(236, 180, 44))
        else:
            out.paste(proof.checkerboard((PROP_W, PROP_H)), (x, y + label_h))
            draw.rectangle((x, y + label_h, x + PROP_W, y + label_h + PROP_H), outline=(236, 180, 44))
        out.paste(cell, (x, y + label_h), cell)
    path = PREVIEW_DIR / ("preview-v14-south-clean-props-magenta-stress.png" if stress else "preview-v14-south-clean-props-numbered.png")
    out.save(path)
    return path


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "readme.md").write_text("# v14 South-Facing True-Alpha Props\n\nProps-only approval palette. Backgrounds are intentionally excluded from this pass.\n", encoding="utf-8")
    entries, cells = build_cells()
    grid_path = write_palette(entries, cells)
    previews = [preview(entries, grid_path, False), preview(entries, grid_path, True)]
    failures = [f"P{i + 1:03d}" for i, cell in enumerate(cells) if not passes(cell)]
    hidden = sum(validation(cell)["hiddenRgbTransparentPixels"] for cell in cells)
    manifest = {
        "scope": "props only; backgrounds rejected and excluded; no runtime wiring",
        "paletteTmx": "dig-game-south-facing-true-alpha-props-v14.tmx",
        "propCount": len(cells),
        "cell": {"width": PROP_W, "height": PROP_H},
        "propGrid": grid_path.relative_to(OUT).as_posix(),
        "previews": [p.relative_to(OUT).as_posix() for p in previews],
        "baseSourceCount": sum(1 for entry in entries if entry["variant"] == "base"),
        "variantCount": sum(1 for entry in entries if entry["variant"] != "base"),
        "failures": failures,
        "hiddenRgbTransparentPixels": hidden,
    }
    (OUT / "manifest_v14_south_facing_true_alpha_props.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))
    if failures or hidden:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
