from __future__ import annotations

import importlib.util
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "exports" / "pallet-v14" / "dig_game_hq_props_backgrounds_v14"
PREVIEW_DIR = OUT / "previews"
PROP_DIR = OUT / "sprites" / "props"
BG_DIR = OUT / "sprites" / "backgrounds" / "mockups-v14"
PROP_W, PROP_H, PROP_COLS, PROP_COUNT = 303, 313, 10, 100
BG_W, BG_H = 3984, 568

PROOF_SCRIPT = ROOT / "ai-tools" / "2026-07-08-build-v14-5-prop-true-alpha-proof.py"
spec = importlib.util.spec_from_file_location("v14_true_alpha_proof", PROOF_SCRIPT)
proof = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(proof)

APPROVED_AND_REPLACEMENT_FIRST = [
    "industrial_magma_sanctum__l11__13",  # approved A01
    "frozen_prism_abyss__l11__04",  # replaces rejected A02 with straighter south-facing gate
    "void_realm__l11__03",  # approved A03
    "void_realm__l11__13",  # replaces rejected A04 with straight-on south-facing portal
    "bioluminescent_root_caverns__l11__01",  # approved A05
]

REJECTED_OR_SIDE_FACING = {
    "tile_0067",
    "cave_biome__l11__14",
    "frozen_prism_abyss__l11__13",
    "deep_cave_biome__l11__07",
}

MOCKUP_BACKGROUNDS = [
    ("B01", "industrial_magma_sanctum", "industrial magma clean strip"),
    ("B02", "bioluminescent_root_caverns", "bioluminescent roots clean strip"),
    ("B03", "frozen_prism_abyss", "frozen prism clean strip"),
    ("B04", "deep_cave_biome", "deep cave clean strip"),
    ("B05", "void_realm", "void realm clean strip"),
]


def ordered_sources() -> list[tuple[str, Path]]:
    lookup = proof.source_lookup()
    ordered = [(key, path) for key, path in lookup.items()]
    front = [(key, lookup[key]) for key in APPROVED_AND_REPLACEMENT_FIRST if key in lookup]
    seen = {key for key, _ in front}
    for key, path in ordered:
        if key in seen or key in REJECTED_OR_SIDE_FACING:
            continue
        front.append((key, path))
        seen.add(key)
    return front


def save_prop_library() -> tuple[list[dict], Path]:
    PROP_DIR.mkdir(parents=True, exist_ok=True)
    selected = ordered_sources()
    grid = Image.new("RGBA", (PROP_W * PROP_COLS, PROP_H * math.ceil(PROP_COUNT / PROP_COLS)), (0, 0, 0, 0))
    cells_dir = PROP_DIR / "true-alpha-set"
    cells_dir.mkdir(parents=True, exist_ok=True)
    props = []
    skipped = []
    for key, src in selected:
        cell = proof.strict_true_alpha_cell(src)
        result = proof.validate_cell(cell)
        if not (
            result["transparentCorners"]
            and result["borderAlphaPixels"] == 0
            and result["greenLeakEdgePixels"] == 0
            and result["greyLeakEdgePixels"] == 0
        ):
            skipped.append({"key": key, "source": src.relative_to(ROOT).as_posix(), "validation": result})
            continue
        index = len(props) + 1
        x = ((index - 1) % PROP_COLS) * PROP_W
        y = ((index - 1) // PROP_COLS) * PROP_H
        grid.alpha_composite(cell, (x, y))
        cell_file = cells_dir / f"P{index:03d}_{key}_303x313.png"
        cell.save(cell_file)
        props.append(
            {
                "id": f"P{index:03d}",
                "key": key,
                "source": src.relative_to(ROOT).as_posix(),
                "cell": cell_file.relative_to(OUT).as_posix(),
                "tileId": index - 1,
                "validation": result,
            }
        )
        if len(props) >= PROP_COUNT:
            break
    if len(props) < PROP_COUNT:
        raise RuntimeError(f"Only built {len(props)} strict-alpha props; skipped {len(skipped)}")
    grid_path = PROP_DIR / "v14_true_alpha_props_grid_303x313_10x10.png"
    grid.save(grid_path)
    (PROP_DIR / "true-alpha-set-skipped.json").write_text(json.dumps(skipped, indent=2), encoding="utf-8")
    return props, grid_path


def vertical_gradient(top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    img = Image.new("RGB", (BG_W, BG_H), top)
    px = img.load()
    for y in range(BG_H):
        t = y / max(1, BG_H - 1)
        color = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        for x in range(BG_W):
            px[x, y] = color
    return img


def draw_soft_band(draw: ImageDraw.ImageDraw, y: int, color: tuple[int, int, int], height: int) -> None:
    for i in range(height):
        alpha = 1 - abs((i / max(1, height - 1)) * 2 - 1)
        shade = tuple(max(0, min(255, int(c * alpha))) for c in color)
        draw.line((0, y + i, BG_W, y + i), fill=shade)


def draw_crystals(draw: ImageDraw.ImageDraw, rng: random.Random, base_y: int, color: tuple[int, int, int], count: int) -> None:
    for _ in range(count):
        x = rng.randint(120, BG_W - 120)
        h = rng.randint(52, 150)
        w = rng.randint(24, 70)
        poly = [(x, base_y - h), (x - w, base_y), (x + w, base_y)]
        draw.polygon(poly, fill=color)
        draw.line((x, base_y - h + 8, x, base_y - 4), fill=tuple(min(255, c + 55) for c in color), width=3)


def draw_roots(draw: ImageDraw.ImageDraw, rng: random.Random) -> None:
    for _ in range(38):
        x = rng.randint(160, BG_W - 160)
        y0 = rng.randint(250, 500)
        points = []
        for step in range(7):
            points.append((x + rng.randint(-42, 42), y0 - step * rng.randint(24, 42)))
        draw.line(points, fill=(14, 68, 62), width=rng.randint(7, 15), joint="curve")
        draw.line(points, fill=(32, 156, 136), width=2)


def create_background(theme: str) -> Image.Image:
    rng = random.Random(theme)
    if theme == "industrial_magma_sanctum":
        img = vertical_gradient((13, 5, 5), (45, 12, 4))
        draw = ImageDraw.Draw(img)
        draw_soft_band(draw, 94, (150, 24, 8), 58)
        for x in range(120, BG_W - 120, 210):
            offset = rng.randint(-35, 35)
            draw.polygon([(x + offset, 462), (x + 70 + offset, 350), (x + 150 + offset, 462)], fill=(43, 16, 8))
        for _ in range(32):
            x = rng.randint(140, BG_W - 140)
            draw.line((x, 460, x + rng.randint(-60, 60), 350), fill=(190, 44, 8), width=5)
            draw.line((x, 460, x + rng.randint(-50, 50), 360), fill=(255, 110, 20), width=2)
        return img
    if theme == "bioluminescent_root_caverns":
        img = vertical_gradient((3, 16, 19), (4, 36, 36))
        draw = ImageDraw.Draw(img)
        draw_soft_band(draw, 118, (17, 165, 155), 78)
        draw_roots(draw, rng)
        for _ in range(55):
            x = rng.randint(120, BG_W - 120)
            y = rng.randint(330, 505)
            draw.ellipse((x - 9, y - 9, x + 9, y + 9), fill=(40, 205, 190))
        return img
    if theme == "frozen_prism_abyss":
        img = vertical_gradient((5, 13, 29), (12, 45, 78))
        draw = ImageDraw.Draw(img)
        draw_soft_band(draw, 88, (76, 166, 230), 70)
        draw_crystals(draw, rng, 500, (42, 126, 188), 34)
        draw_crystals(draw, rng, 520, (86, 196, 240), 16)
        return img
    if theme == "deep_cave_biome":
        img = vertical_gradient((6, 10, 20), (14, 24, 40))
        draw = ImageDraw.Draw(img)
        draw_soft_band(draw, 136, (35, 82, 122), 50)
        for x in range(100, BG_W - 80, 170):
            top = rng.randint(330, 440)
            draw.polygon([(x, BG_H), (x + 60, top), (x + 140, BG_H)], fill=(10, 22, 34))
        for _ in range(46):
            x = rng.randint(140, BG_W - 140)
            y = rng.randint(360, 505)
            draw.ellipse((x - 5, y - 5, x + 5, y + 5), fill=(44, 136, 184))
        return img
    img = vertical_gradient((8, 4, 22), (24, 7, 45))
    draw = ImageDraw.Draw(img)
    draw_soft_band(draw, 112, (96, 28, 190), 68)
    for _ in range(42):
        x = rng.randint(130, BG_W - 130)
        y = rng.randint(300, 505)
        h = rng.randint(30, 88)
        draw.polygon([(x, y - h), (x - 18, y), (x + 18, y)], fill=(100, 40, 180))
        draw.line((x, y - h + 5, x, y - 5), fill=(202, 88, 255), width=2)
    return img


def save_background_mockups() -> list[dict]:
    BG_DIR.mkdir(parents=True, exist_ok=True)
    backgrounds = []
    for tile_id, (approval_id, biome, name) in enumerate(MOCKUP_BACKGROUNDS):
        img = create_background(biome)
        rel = Path("sprites") / "backgrounds" / "mockups-v14" / f"{approval_id.lower()}_{biome}.png"
        img.save(OUT / rel)
        backgrounds.append(
            {
                "id": tile_id,
                "approvalId": approval_id,
                "biome": biome,
                "name": name,
                "source": rel.as_posix(),
                "width": BG_W,
                "height": BG_H,
                "displayWidth": BG_W // 4,
                "displayHeight": BG_H // 4,
            }
        )
    return backgrounds


def write_tsx(props: list[dict], prop_grid: Path, backgrounds: list[dict]) -> None:
    prop_rel = prop_grid.relative_to(OUT).as_posix()
    lines = [
        "<?xml version='1.0' encoding='UTF-8'?>",
        f'<tileset version="1.10" tiledversion="1.12.0" name="dig-game-true-alpha-props-v14" tilewidth="{PROP_W}" tileheight="{PROP_H}" tilecount="{PROP_COUNT}" columns="{PROP_COLS}" objectalignment="bottomleft">',
        f' <image width="{PROP_W * PROP_COLS}" height="{PROP_H * 10}" source="{prop_rel}"/>',
    ]
    for prop in props:
        lines += [
            f' <tile id="{prop["tileId"]}" type="props">',
            "  <properties>",
            f'   <property name="approvalId" value="{prop["id"]}"/>',
            f'   <property name="sourceAsset" value="{prop["source"]}"/>',
            f'   <property name="trueAlpha" value="true"/>',
            "  </properties>",
            " </tile>",
        ]
    lines.append("</tileset>")
    (OUT / "dig-game-true-alpha-props-v14.tsx").write_text("\n".join(lines) + "\n", encoding="utf-8")

    lines = [
        "<?xml version='1.0' encoding='UTF-8'?>",
        f'<tileset version="1.10" tiledversion="1.12.0" name="dig-game-bg-mockups-v14" tilewidth="{BG_W}" tileheight="{BG_H}" tilecount="{len(backgrounds)}" columns="0" objectalignment="bottomleft">',
    ]
    for bg in backgrounds:
        lines += [
            f' <tile id="{bg["id"]}" type="backgrounds">',
            "  <properties>",
            f'   <property name="approvalId" value="{bg["approvalId"]}"/>',
            f'   <property name="biome" value="{bg["biome"]}"/>',
            f'   <property name="mockupOnly" value="true"/>',
            "  </properties>",
            f'  <image width="{bg["width"]}" height="{bg["height"]}" source="{bg["source"]}"/>',
            " </tile>",
        ]
    lines.append("</tileset>")
    (OUT / "dig-game-bg-mockups-v14.tsx").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_tmx(props: list[dict], backgrounds: list[dict]) -> None:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<map version="1.10" tiledversion="1.12.0" orientation="orthogonal" renderorder="right-down" width="190" height="430" tilewidth="94" tileheight="94" infinite="0" nextlayerid="4" nextobjectid="200">',
        " <properties>",
        '  <property name="description" value="v14 true-alpha full prop approval palette plus 5 clean background mockups; no runtime wiring."/>',
        '  <property name="propGrid" value="100 props, exact 303x313 cells, true alpha, green/grey edge leak validation."/>',
        '  <property name="backgroundScope" value="mockup only; rejected old full background set is not referenced here."/>',
        " </properties>",
        ' <tileset firstgid="1" source="dig-game-bg-mockups-v14.tsx"/>',
        ' <tileset firstgid="6" source="dig-game-true-alpha-props-v14.tsx"/>',
        ' <objectgroup id="1" name="B01-B05 clean background mockups">',
    ]
    for i, bg in enumerate(backgrounds):
        lines.append(
            f'  <object id="{i + 1}" name="{bg["approvalId"]} {bg["name"]}" type="backgrounds" gid="{i + 1}" x="80" y="{170 + i * 190}" width="{bg["displayWidth"]}" height="{bg["displayHeight"]}"/>'
        )
    lines += [
        " </objectgroup>",
        ' <objectgroup id="2" name="P001-P100 true-alpha props">',
    ]
    for i, prop in enumerate(props, start=1):
        col = (i - 1) % 5
        row = (i - 1) // 5
        lines.append(
            f'  <object id="{100 + i}" name="{prop["id"]} {prop["key"]}" type="props" gid="{5 + i}" x="{80 + col * 350}" y="{1400 + row * 355}" width="{PROP_W}" height="{PROP_H}"/>'
        )
    lines += [" </objectgroup>", "</map>"]
    (OUT / "dig-game-true-alpha-props-bg-mockups-v14.tmx").write_text("\n".join(lines) + "\n", encoding="utf-8")


def preview_props(props: list[dict], prop_grid: Path) -> Path:
    grid = Image.open(prop_grid).convert("RGBA")
    pad, label_h = 18, 28
    rows = math.ceil(PROP_COUNT / PROP_COLS)
    out = Image.new("RGB", (pad + PROP_COLS * (PROP_W + pad), pad + rows * (PROP_H + label_h + pad)), (8, 12, 18))
    draw = ImageDraw.Draw(out)
    f = proof.font(18)
    for i, prop in enumerate(props):
        sx = (i % PROP_COLS) * PROP_W
        sy = (i // PROP_COLS) * PROP_H
        cell = grid.crop((sx, sy, sx + PROP_W, sy + PROP_H))
        x = pad + (i % PROP_COLS) * (PROP_W + pad)
        y = pad + (i // PROP_COLS) * (PROP_H + label_h + pad)
        draw.rectangle((x, y, x + PROP_W, y + label_h), fill=(20, 25, 31), outline=(236, 180, 44))
        draw.text((x + 8, y + 4), f'{prop["id"]} {prop["key"][:24]}', fill=(246, 228, 156), font=f)
        out.paste(proof.checkerboard((PROP_W, PROP_H)), (x, y + label_h))
        draw.rectangle((x, y + label_h, x + PROP_W, y + label_h + PROP_H), outline=(236, 180, 44))
        out.paste(cell, (x, y + label_h), cell)
    path = PREVIEW_DIR / "preview-v14-true-alpha-full-props-numbered.png"
    out.save(path)
    return path


def preview_first_five(props: list[dict], prop_grid: Path) -> Path:
    grid = Image.open(prop_grid).convert("RGBA")
    pad, label_h = 18, 34
    out = Image.new("RGB", (pad + 5 * (PROP_W + pad), pad * 2 + label_h + PROP_H), (8, 12, 18))
    draw = ImageDraw.Draw(out)
    f = proof.font(18)
    names = ["magma reactor", "frozen gate south", "void altar", "deep portal south", "bio mushrooms"]
    for i, label in enumerate(names):
        cell = grid.crop((i * PROP_W, 0, i * PROP_W + PROP_W, PROP_H))
        x = pad + i * (PROP_W + pad)
        y = pad
        draw.rectangle((x, y, x + PROP_W, y + label_h), fill=(20, 25, 31), outline=(236, 180, 44))
        draw.text((x + 8, y + 7), f"A{i + 1:02d} {label}", fill=(246, 228, 156), font=f)
        out.paste(proof.checkerboard((PROP_W, PROP_H)), (x, y + label_h))
        draw.rectangle((x, y + label_h, x + PROP_W, y + label_h + PROP_H), outline=(236, 180, 44))
        out.paste(cell, (x, y + label_h), cell)
    path = PREVIEW_DIR / "preview-v14-5-props-south-facing-replacements.png"
    out.save(path)
    return path


def preview_backgrounds(backgrounds: list[dict]) -> Path:
    pad, label_h = 18, 30
    thumb_w, thumb_h = 996, 142
    out = Image.new("RGB", (pad * 2 + thumb_w, pad + len(backgrounds) * (thumb_h + label_h + pad)), (8, 12, 18))
    draw = ImageDraw.Draw(out)
    f = proof.font(18)
    for i, bg in enumerate(backgrounds):
        img = Image.open(OUT / bg["source"]).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        x = pad
        y = pad + i * (thumb_h + label_h + pad)
        draw.rectangle((x, y, x + thumb_w, y + label_h), fill=(20, 25, 31), outline=(236, 180, 44))
        draw.text((x + 8, y + 6), f'{bg["approvalId"]} {bg["name"]} - source {BG_W}x{BG_H}, display {thumb_w}x{thumb_h}', fill=(246, 228, 156), font=f)
        draw.rectangle((x, y + label_h, x + thumb_w, y + label_h + thumb_h), outline=(236, 180, 44))
        out.paste(img, (x, y + label_h))
    path = PREVIEW_DIR / "preview-v14-background-mockups-clean-strips.png"
    out.save(path)
    return path


def is_bad_border_pixel(r: int, g: int, b: int) -> bool:
    grey = abs(r - g) < 9 and abs(g - b) < 9 and 38 <= r <= 222
    green = g >= 108 and r <= 112 and b <= 125 and g >= max(r, b) + 34
    return grey or green


def validate_backgrounds(backgrounds: list[dict]) -> list[dict]:
    results = []
    for bg in backgrounds:
        img = Image.open(OUT / bg["source"]).convert("RGB")
        bad_border = 0
        for x in range(BG_W):
            for y in (0, 1, BG_H - 2, BG_H - 1):
                if is_bad_border_pixel(*img.getpixel((x, y))):
                    bad_border += 1
        for y in range(BG_H):
            for x in (0, 1, BG_W - 2, BG_W - 1):
                if is_bad_border_pixel(*img.getpixel((x, y))):
                    bad_border += 1
        results.append({"approvalId": bg["approvalId"], "size": img.size, "badBorderPixels": bad_border})
    return results


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    props, prop_grid = save_prop_library()
    backgrounds = save_background_mockups()
    write_tsx(props, prop_grid, backgrounds)
    write_tmx(props, backgrounds)
    previews = [preview_first_five(props, prop_grid), preview_props(props, prop_grid), preview_backgrounds(backgrounds)]
    bg_validation = validate_backgrounds(backgrounds)
    prop_failures = [
        prop["id"]
        for prop in props
        if prop["validation"]["borderAlphaPixels"] != 0
        or prop["validation"]["greenLeakEdgePixels"] != 0
        or prop["validation"]["greyLeakEdgePixels"] != 0
        or not prop["validation"]["transparentCorners"]
    ]
    bg_failures = [item for item in bg_validation if item["size"] != (BG_W, BG_H) or item["badBorderPixels"] != 0]
    manifest = {
        "scope": "full true-alpha props plus five background mockups; no runtime wiring",
        "paletteTmx": "dig-game-true-alpha-props-bg-mockups-v14.tmx",
        "propCount": len(props),
        "propGrid": prop_grid.relative_to(OUT).as_posix(),
        "backgroundCount": len(backgrounds),
        "backgroundSize": {"width": BG_W, "height": BG_H, "displayWidth": BG_W // 4, "displayHeight": BG_H // 4},
        "previews": [path.relative_to(OUT).as_posix() for path in previews],
        "propFailures": prop_failures,
        "backgroundFailures": bg_failures,
        "backgroundValidation": bg_validation,
        "firstFive": [prop["key"] for prop in props[:5]],
    }
    (OUT / "manifest_v14_true_alpha_props_bg_mockups.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))
    if prop_failures or bg_failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
