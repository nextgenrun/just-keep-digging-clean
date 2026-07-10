from __future__ import annotations

from pathlib import Path
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PAL = ROOT / "exports/pallet-v10/dig_game_empty_backgrounds_and_separate_props_v10_08_07_2026"
PROP_DIR = PAL / "sprites/props/near_props_seam_breakers"
TARGET = PROP_DIR / "cave_biome__l11__14.png"
CELL = (303, 313)
SCALE = 4


def sc(v: int | float) -> int:
    return round(v * SCALE)


def box(x0: int, y0: int, x1: int, y1: int) -> tuple[int, int, int, int]:
    return (sc(x0), sc(y0), sc(x1), sc(y1))


def pts(values: list[tuple[int, int]]) -> list[tuple[int, int]]:
    return [(sc(x), sc(y)) for x, y in values]


def checker(size: tuple[int, int]) -> Image.Image:
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for y in range(0, size[1], 16):
        for x in range(0, size[0], 16):
            fill = (76, 83, 86, 255) if (x // 16 + y // 16) % 2 else (55, 60, 63, 255)
            d.rectangle((x, y, x + 15, y + 15), fill=fill)
    return img


def draw_crystal(d: ImageDraw.ImageDraw, cx: int, base_y: int, height: int, width: int, color: tuple[int, int, int]) -> None:
    left, right = cx - width // 2, cx + width // 2
    top = base_y - height
    outline = (37, 215, 244, 255)
    dark = tuple(max(0, c - 65) for c in color) + (255,)
    mid = color + (255,)
    light = (210, 255, 255, 255)
    d.polygon(pts([(cx, top), (right, base_y - height // 5), (cx, base_y), (left, base_y - height // 6)]), fill=dark, outline=outline)
    d.polygon(pts([(cx, top + 4), (right - 4, base_y - height // 5), (cx + 1, base_y - 3)]), fill=mid)
    d.polygon(pts([(cx, top + 5), (cx - 3, base_y - 2), (left + 4, base_y - height // 6)]), fill=(74, 235, 252, 255))
    d.line(pts([(cx, top + 7), (cx + 1, base_y - 5)]), fill=light, width=sc(1))
    d.line(pts([(left + 7, base_y - height // 7), (right - 8, base_y - height // 5)]), fill=(155, 246, 255, 180), width=sc(1))


def draw_cart_front() -> Image.Image:
    img = Image.new("RGBA", (CELL[0] * SCALE, CELL[1] * SCALE), (0, 0, 0, 0))
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse(box(37, 252, 267, 304), fill=(0, 0, 0, 76))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(sc(4))))
    d = ImageDraw.Draw(img)

    for cx, by, h, w in [
        (151, 120, 104, 38),
        (111, 127, 82, 30),
        (190, 130, 78, 32),
        (73, 153, 61, 24),
        (230, 154, 58, 24),
        (137, 156, 60, 23),
        (170, 158, 54, 22),
    ]:
        draw_crystal(d, cx, by, h, w, (57, 211, 229))

    d.rounded_rectangle(box(38, 120, 265, 246), radius=sc(7), fill=(52, 33, 22, 255), outline=(14, 12, 10, 255), width=sc(4))
    d.rectangle(box(46, 127, 257, 238), fill=(94, 57, 29, 255))
    rng = random.Random(1407)
    for y in (135, 163, 191, 219):
        d.line((sc(49), sc(y), sc(254), sc(y - 4)), fill=(49, 31, 20, 255), width=sc(3))
        d.line((sc(51), sc(y + 3), sc(252), sc(y - 1)), fill=(184, 113, 55, 165), width=sc(1))
    for x in (64, 102, 141, 181, 221):
        d.line((sc(x), sc(126), sc(x), sc(239)), fill=(44, 28, 18, 255), width=sc(3))
        d.line((sc(x + 4), sc(128), sc(x + 4), sc(237)), fill=(151, 93, 48, 120), width=sc(1))
    for _ in range(135):
        y = rng.randrange(132, 232)
        x = rng.randrange(53, 245)
        length = rng.randrange(10, 38)
        col = rng.choice([(42, 25, 15, 120), (143, 86, 42, 135), (185, 119, 62, 95), (24, 18, 13, 115)])
        d.line((sc(x), sc(y), sc(min(252, x + length)), sc(y + rng.randrange(-2, 3))), fill=col, width=sc(1))
    for cx, cy, rx, ry in [(83, 150, 10, 5), (123, 205, 13, 6), (203, 174, 11, 5), (231, 219, 9, 4)]:
        d.ellipse(box(cx - rx, cy - ry, cx + rx, cy + ry), fill=(48, 29, 17, 155), outline=(23, 16, 11, 180), width=sc(1))

    metal = (111, 103, 84, 255)
    dark_metal = (40, 37, 34, 255)
    for rect in [box(35, 117, 268, 134), box(37, 226, 266, 247), box(35, 117, 55, 247), box(248, 117, 268, 247)]:
        d.rounded_rectangle(rect, radius=sc(3), fill=metal, outline=dark_metal, width=sc(2))
    for x in (48, 88, 128, 176, 216, 256):
        for y in (126, 236):
            d.ellipse(box(x - 3, y - 3, x + 3, y + 3), fill=(205, 190, 142, 255), outline=(32, 28, 24, 255), width=sc(1))
    for x in (45, 258):
        for y in (145, 176, 207):
            d.ellipse(box(x - 3, y - 3, x + 3, y + 3), fill=(204, 188, 137, 255), outline=(32, 28, 24, 255), width=sc(1))

    d.ellipse(box(115, 155, 188, 228), fill=(59, 46, 30, 255), outline=(12, 11, 10, 255), width=sc(4))
    d.ellipse(box(129, 169, 174, 214), fill=(132, 97, 43, 255), outline=(39, 30, 19, 255), width=sc(2))
    d.ellipse(box(143, 183, 160, 200), fill=(244, 213, 104, 255), outline=(58, 45, 23, 255), width=sc(1))
    for a in range(0, 360, 45):
        import math
        x0 = 151 + math.cos(math.radians(a)) * 12
        y0 = 192 + math.sin(math.radians(a)) * 12
        x1 = 151 + math.cos(math.radians(a)) * 29
        y1 = 192 + math.sin(math.radians(a)) * 29
        d.line((sc(x0), sc(y0), sc(x1), sc(y1)), fill=(211, 178, 89, 255), width=sc(2))

    for cx in (78, 226):
        d.ellipse(box(cx - 29, 228, cx + 29, 286), fill=(23, 22, 20, 255), outline=(7, 7, 6, 255), width=sc(4))
        d.ellipse(box(cx - 20, 237, cx + 20, 277), fill=(83, 70, 51, 255), outline=(26, 22, 18, 255), width=sc(2))
        d.ellipse(box(cx - 7, 250, cx + 7, 264), fill=(196, 172, 109, 255), outline=(36, 30, 24, 255), width=sc(1))
        for dx in (-14, 0, 14):
            d.line((sc(cx), sc(257), sc(cx + dx), sc(242)), fill=(195, 172, 110, 220), width=sc(2))
            d.line((sc(cx), sc(257), sc(cx + dx), sc(272)), fill=(195, 172, 110, 220), width=sc(2))

    for cx, by, h, w in [(43, 247, 36, 20), (263, 247, 34, 18), (250, 266, 25, 16), (57, 269, 22, 14)]:
        draw_crystal(d, cx, by, h, w, (64, 218, 238))

    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for cx, cy, rx, ry, alpha in [(151, 82, 72, 55, 18), (49, 249, 31, 18, 22), (255, 251, 31, 18, 22)]:
        gd.ellipse(box(cx - rx, cy - ry, cx + rx, cy + ry), fill=(37, 209, 228, alpha))
    img = Image.alpha_composite(glow.filter(ImageFilter.GaussianBlur(sc(10))), img)
    img = img.resize(CELL, Image.Resampling.LANCZOS)
    pix = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pix[x, y]
            if a < 18:
                pix[x, y] = (0, 0, 0, 0)
    return img


def refresh_approved_preview() -> None:
    entries = [
        ("storm_bridge", "irradiated_storm_surface__l11__15.png"),
        ("root_lantern", "bioluminescent_root_caverns__l11__11.png"),
        ("frozen_gate", "frozen_prism_abyss__l11__13.png"),
        ("magma_reactor", "industrial_magma_sanctum__l11__13.png"),
        ("void_altar", "void_realm__l11__16.png"),
        ("crystal_cart_front", "cave_biome__l11__14.png"),
        ("deep_portal", "deep_cave_biome__l11__07.png"),
        ("bio_mushrooms", "bioluminescent_root_caverns__l11__13.png"),
    ]
    sheet = Image.new("RGBA", (760, 1460), (16, 19, 23, 255))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except OSError:
        font = ImageFont.load_default()
    d.text((20, 14), "v10 approved forward-facing props - exact 303 x 313 transparent cells", fill=(238, 240, 232, 255), font=font)
    for i, (label, file_name) in enumerate(entries):
        col, row = i % 2, i // 2
        x, y = 34 + col * 366, 58 + row * 335
        cell = checker(CELL)
        cell.alpha_composite(Image.open(PROP_DIR / file_name).convert("RGBA"), (0, 0))
        d.text((x, y - 18), label, fill=(238, 240, 232, 255), font=font)
        sheet.alpha_composite(cell, (x, y))
        d.rectangle((x, y, x + CELL[0] - 1, y + CELL[1] - 1), outline=(244, 190, 72, 255), width=2)
    sheet.save(PAL / "preview-v10-approved-props.png")


def refresh_all_props_preview() -> None:
    files = sorted(path for path in PROP_DIR.glob("*.png") if "__l11__" in path.stem)
    cell = (151, 156)
    cols = 8
    rows = (len(files) + cols - 1) // cols
    out = Image.new("RGBA", (cols * cell[0] + 40, rows * (cell[1] + 28) + 55), (16, 19, 23, 255))
    d = ImageDraw.Draw(out)
    try:
        font = ImageFont.truetype("arial.ttf", 11)
    except OSError:
        font = ImageFont.load_default()
    d.text((20, 15), f"full v10 approved palette prop inventory - {len(files)} exact cells", fill=(238, 240, 232, 255), font=font)
    for i, path in enumerate(files):
        thumb = Image.open(path).convert("RGBA").resize(cell, Image.Resampling.LANCZOS)
        x, y = 20 + (i % cols) * cell[0], 50 + (i // cols) * (cell[1] + 28)
        bg = checker(cell)
        bg.alpha_composite(thumb, (0, 0))
        out.alpha_composite(bg, (x, y))
        d.rectangle((x, y, x + cell[0] - 1, y + cell[1] - 1), outline=(244, 190, 72, 255))
        d.text((x, y + cell[1] + 3), path.stem, fill=(180, 194, 192, 255), font=font)
    out.save(PAL / "preview-v10-all-props.png")


def main() -> None:
    backup_dir = PAL / "_backups"
    backup_dir.mkdir(exist_ok=True)
    old_inline_backup = TARGET.with_suffix(".before-front-view-reject.png")
    backup = backup_dir / old_inline_backup.name
    if old_inline_backup.exists() and not backup.exists():
        old_inline_backup.replace(backup)
    elif old_inline_backup.exists():
        old_inline_backup.unlink()
    if TARGET.exists() and not backup.exists():
        Image.open(TARGET).save(backup)
    draw_cart_front().save(TARGET)
    refresh_approved_preview()
    refresh_all_props_preview()
    print(TARGET)


if __name__ == "__main__":
    main()
