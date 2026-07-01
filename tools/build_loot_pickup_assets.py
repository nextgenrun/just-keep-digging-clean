import os
import struct
import zlib


OUT_DIR = os.path.join("sprites", "UI", "loot-pickups")

RESOURCES = {
    "dirt": {
        "base": (0x8F, 0x5E, 0x35),
        "mid": (0xB8, 0x7B, 0x48),
        "hi": (0xDA, 0xAD, 0x75),
        "ore": (0x6A, 0x3E, 0x24),
        "spots": [(6, 7, 5, 4), (18, 5, 4, 5), (22, 19, 5, 4), (9, 23, 4, 3)],
    },
    "stone": {
        "base": (0x6C, 0x75, 0x7B),
        "mid": (0x96, 0xA0, 0xA7),
        "hi": (0xD5, 0xDB, 0xDF),
        "ore": (0xB8, 0xC2, 0xC9),
        "spots": [(5, 7, 7, 5), (18, 8, 6, 6), (13, 20, 9, 5)],
    },
    "copper": {
        "base": (0x78, 0x54, 0x38),
        "mid": (0x9B, 0x6D, 0x43),
        "hi": (0xE6, 0xB7, 0x72),
        "ore": (0xF2, 0x8A, 0x32),
        "spots": [(4, 4, 8, 7), (18, 6, 7, 6), (10, 18, 6, 7), (23, 22, 5, 4)],
    },
    "dark-dirt-normal": {
        "base": (0x3B, 0x28, 0x1D),
        "mid": (0x5C, 0x3D, 0x2B),
        "hi": (0x91, 0x64, 0x3E),
        "ore": (0x2A, 0x1B, 0x14),
        "spots": [(5, 6, 7, 5), (20, 8, 5, 6), (13, 21, 7, 4)],
    },
    "dark-dirt-strong": {
        "base": (0x29, 0x1B, 0x14),
        "mid": (0x45, 0x2C, 0x1E),
        "hi": (0x73, 0x4A, 0x2D),
        "ore": (0x16, 0x0F, 0x0B),
        "spots": [(4, 7, 7, 6), (18, 5, 6, 7), (20, 21, 6, 4)],
    },
    "steel": {
        "base": (0x4E, 0x61, 0x6D),
        "mid": (0x7F, 0x96, 0xA4),
        "hi": (0xCF, 0xE0, 0xEA),
        "ore": (0xA8, 0xC2, 0xD2),
        "spots": [(5, 5, 8, 6), (19, 8, 6, 6), (10, 20, 9, 5)],
    },
    "iron": {
        "base": (0x59, 0x57, 0x54),
        "mid": (0x87, 0x83, 0x7B),
        "hi": (0xD1, 0xCA, 0xB9),
        "ore": (0xB8, 0xA1, 0x85),
        "spots": [(4, 6, 7, 7), (16, 5, 8, 6), (20, 20, 6, 5)],
    },
    "bronze": {
        "base": (0x6F, 0x4D, 0x31),
        "mid": (0xA1, 0x6C, 0x3F),
        "hi": (0xE3, 0xA6, 0x5F),
        "ore": (0xCF, 0x7E, 0x32),
        "spots": [(5, 5, 8, 7), (19, 7, 6, 6), (12, 20, 8, 5)],
    },
    "silver": {
        "base": (0x64, 0x6A, 0x73),
        "mid": (0xA9, 0xB0, 0xBC),
        "hi": (0xF1, 0xF5, 0xFA),
        "ore": (0xD9, 0xE2, 0xED),
        "spots": [(5, 6, 8, 6), (18, 5, 7, 7), (11, 20, 9, 5)],
    },
    "gold": {
        "base": (0x92, 0x6B, 0x32),
        "mid": (0xD0, 0x9A, 0x3B),
        "hi": (0xFF, 0xDB, 0x68),
        "ore": (0xFF, 0xB5, 0x1E),
        "spots": [(4, 5, 8, 8), (18, 6, 7, 7), (10, 19, 7, 6), (23, 22, 5, 4)],
    },
}

CHIP_POLY = [(4, 3), (27, 3), (30, 7), (30, 25), (26, 30), (7, 30), (3, 26), (3, 8)]


def inside_poly(x, y, poly):
    inside = False
    j = len(poly) - 1
    for i, (xi, yi) in enumerate(poly):
        xj, yj = poly[j]
        if (yi > y) != (yj > y):
            cross_x = (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi
            if x < cross_x:
                inside = not inside
        j = i
    return inside


def write_png(path, width, height, rgba):
    rows = []
    stride = width * 4
    for y in range(height):
        start = y * stride
        rows.append(b"\x00" + bytes(rgba[start:start + stride]))
    raw = b"".join(rows)

    def chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as handle:
        handle.write(png)


def set_px(rgba, width, x, y, color):
    if x < 0 or y < 0 or x >= width or y >= len(rgba) // (width * 4):
        return
    idx = (y * width + x) * 4
    rgba[idx:idx + 4] = color


def rect(rgba, width, x, y, w, h, color):
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            set_px(rgba, width, xx, yy, color)


def poly_fill(rgba, width, poly, color):
    height = len(rgba) // (width * 4)
    min_x = max(0, int(min(x for x, _ in poly)) - 1)
    max_x = min(width - 1, int(max(x for x, _ in poly)) + 1)
    min_y = max(0, int(min(y for _, y in poly)) - 1)
    max_y = min(height - 1, int(max(y for _, y in poly)) + 1)
    for y in range(min_y, max_y + 1):
        for x in range(min_x, max_x + 1):
            if inside_poly(x + 0.5, y + 0.5, poly):
                set_px(rgba, width, x, y, color)


def poly_rim(rgba, width, poly, top_color, bottom_color):
    height = len(rgba) // (width * 4)
    for y in range(height):
        for x in range(width):
            if not inside_poly(x + 0.5, y + 0.5, poly):
                continue
            edge = any(
                not inside_poly(x + ox + 0.5, y + oy + 0.5, poly)
                for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1))
            )
            if edge:
                set_px(rgba, width, x, y, top_color if y < height // 2 else bottom_color)


def lerp(a, b, t):
    return int(a + (b - a) * t)


def mix(c1, c2, t):
    return (
        lerp(c1[0], c2[0], t),
        lerp(c1[1], c2[1], t),
        lerp(c1[2], c2[2], t),
    )


def render_chip(defn):
    width = height = 32
    rgba = [0] * (width * height * 4)
    base = defn["base"]
    mid = defn["mid"]
    hi = defn["hi"]

    for y in range(height):
        for x in range(width):
            idx = (y * width + x) * 4
            dx = x - 17
            dy = y - 18
            if dx * dx + dy * dy < 15 * 15:
                rgba[idx:idx + 4] = [0, 0, 0, 58]
            if inside_poly(x + 0.5, y + 0.5, CHIP_POLY):
                shade = 0.18 + (x / width) * 0.18 + max(0, 15 - y) * 0.022
                color = mix(base, mid, min(0.78, shade))
                rgba[idx:idx + 4] = [color[0], color[1], color[2], 255]

    # Top-left block facet.
    for y in range(5, 14):
        for x in range(5, 19):
            if inside_poly(x + 0.5, y + 0.5, CHIP_POLY) and x + y < 27:
                color = mix(mid, hi, 0.5)
                set_px(rgba, width, x, y, [color[0], color[1], color[2], 255])

    # Inner cracks.
    crack = [max(0, base[0] - 34), max(0, base[1] - 28), max(0, base[2] - 22), 190]
    for x, y in [(8, 17), (9, 18), (10, 19), (19, 14), (20, 14), (21, 15), (15, 24), (16, 23)]:
        set_px(rgba, width, x, y, crack)

    # Embedded ore/material chunks.
    ore = defn["ore"]
    ore_hi = mix(ore, hi, 0.36)
    ore_shadow = mix(base, ore, 0.42)
    for x, y, w, h in defn["spots"]:
        rect(rgba, width, x + 1, y + 1, w, h, [ore_shadow[0], ore_shadow[1], ore_shadow[2], 245])
        rect(rgba, width, x, y, w, h, [ore[0], ore[1], ore[2], 255])
        rect(rgba, width, x + 1, y + 1, max(1, w - 3), max(1, h - 3), [ore_hi[0], ore_hi[1], ore_hi[2], 255])

    # Pixel-like warm rim and dark lower edge.
    rim = [245, 225, 180, 220]
    dark = [24, 20, 17, 180]
    for y in range(height):
        for x in range(width):
            if not inside_poly(x + 0.5, y + 0.5, CHIP_POLY):
                continue
            edge = any(
                not inside_poly(x + ox + 0.5, y + oy + 0.5, CHIP_POLY)
                for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1))
            )
            if edge:
                set_px(rgba, width, x, y, rim if y < 16 else dark)
    return rgba


def render_bag():
    width = height = 56
    rgba = [0] * (width * height * 4)

    # Soft square HUD shadow.
    for y in range(7, 51):
        for x in range(7, 51):
            dx = abs(x - 28)
            dy = abs(y - 29)
            if dx < 22 and dy < 22:
                alpha = max(0, 76 - int((dx + dy) * 1.4))
                set_px(rgba, width, x, y, [0, 0, 0, alpha])

    leather = (0x88, 0x55, 0x2C)
    leather_dark = (0x4A, 0x2D, 0x18)
    leather_hi = (0xC0, 0x86, 0x43)
    brass = (0xE7, 0xB7, 0x54)

    # Strap arch.
    for y in range(8, 28):
        for x in range(15, 42):
            dx = (x - 28) / 13
            dy = (y - 25) / 17
            ring = dx * dx + dy * dy
            if 0.75 < ring < 1.18 and y < 25:
                set_px(rgba, width, x, y, [leather_dark[0], leather_dark[1], leather_dark[2], 255])

    # Bag body: chunky square pouch.
    body = [(12, 19), (44, 19), (48, 24), (46, 46), (39, 51), (17, 51), (10, 45), (8, 25)]
    for y in range(height):
        for x in range(width):
            if inside_poly(x + 0.5, y + 0.5, body):
                shade = 0.2 + (x / width) * 0.2 + max(0, 34 - y) * 0.015
                color = mix(leather_dark, leather, min(0.9, shade))
                set_px(rgba, width, x, y, [color[0], color[1], color[2], 255])

    rect(rgba, width, 15, 22, 24, 8, [leather_hi[0], leather_hi[1], leather_hi[2], 255])
    rect(rgba, width, 18, 34, 20, 10, [0x6E, 0x42, 0x22, 255])
    rect(rgba, width, 22, 33, 12, 4, [brass[0], brass[1], brass[2], 255])
    rect(rgba, width, 25, 38, 6, 5, [brass[0], brass[1], brass[2], 255])

    rim = [0xF2, 0xD1, 0x82, 235]
    dark = [0x16, 0x12, 0x0F, 220]
    for y in range(height):
        for x in range(width):
            if not inside_poly(x + 0.5, y + 0.5, body):
                continue
            edge = any(
                not inside_poly(x + ox + 0.5, y + oy + 0.5, body)
                for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1))
            )
            if edge:
                set_px(rgba, width, x, y, rim if y < 31 else dark)

    # Small sparkle badge.
    rect(rgba, width, 39, 8, 8, 8, [brass[0], brass[1], brass[2], 255])
    set_px(rgba, width, 43, 5, [0xFF, 0xF0, 0xA0, 230])
    set_px(rgba, width, 43, 18, [0xFF, 0xF0, 0xA0, 230])
    set_px(rgba, width, 36, 12, [0xFF, 0xF0, 0xA0, 230])
    set_px(rgba, width, 50, 12, [0xFF, 0xF0, 0xA0, 230])
    return width, height, rgba


def render_bag_variant_a():
    width = height = 64
    rgba = [0] * (width * height * 4)
    leather = (0x8A, 0x55, 0x28)
    leather_dark = (0x35, 0x20, 0x15)
    leather_mid = (0xB4, 0x73, 0x36)
    leather_hi = (0xE0, 0xA4, 0x55)
    brass = (0xF0, 0xC6, 0x55)
    brass_dark = (0x9A, 0x68, 0x22)

    for y in range(16, 60):
        for x in range(8, 58):
            dx = abs(x - 32)
            dy = abs(y - 40)
            if dx < 26 and dy < 22:
                alpha = max(0, 76 - int((dx + dy) * 1.25))
                set_px(rgba, width, x, y, [0, 0, 0, alpha])

    handle_outer = [(20, 24), (24, 12), (32, 8), (42, 12), (46, 24), (40, 24), (38, 16), (32, 13), (26, 16), (24, 24)]
    poly_fill(rgba, width, handle_outer, [leather_dark[0], leather_dark[1], leather_dark[2], 255])
    poly_rim(rgba, width, handle_outer, [0xD9, 0x99, 0x4A, 230], [0x13, 0x0E, 0x0B, 230])

    body = [(12, 23), (49, 23), (55, 30), (53, 53), (45, 59), (18, 59), (9, 51), (9, 31)]
    for y in range(height):
        for x in range(width):
            if inside_poly(x + 0.5, y + 0.5, body):
                shade = 0.28 + (x / width) * 0.18 + max(0, 38 - y) * 0.018
                color = mix(leather_dark, leather, min(0.92, shade))
                set_px(rgba, width, x, y, [color[0], color[1], color[2], 255])
    poly_rim(rgba, width, body, [0xF2, 0xC9, 0x76, 245], [0x13, 0x0E, 0x0B, 235])

    flap = [(14, 25), (50, 25), (45, 39), (20, 41)]
    poly_fill(rgba, width, flap, [leather_mid[0], leather_mid[1], leather_mid[2], 255])
    poly_rim(rgba, width, flap, [leather_hi[0], leather_hi[1], leather_hi[2], 245], [0x55, 0x30, 0x17, 245])
    rect(rgba, width, 26, 37, 12, 4, [brass_dark[0], brass_dark[1], brass_dark[2], 255])
    rect(rgba, width, 27, 36, 10, 7, [brass[0], brass[1], brass[2], 255])
    rect(rgba, width, 30, 38, 4, 4, [0xFF, 0xE8, 0x94, 255])
    rect(rgba, width, 17, 29, 15, 3, [0xF1, 0xB5, 0x62, 210])
    rect(rgba, width, 42, 10, 8, 8, [0xFF, 0xDD, 0x6A, 255])
    set_px(rgba, width, 46, 6, [0xFF, 0xF4, 0xB2, 235])
    set_px(rgba, width, 46, 21, [0xFF, 0xF4, 0xB2, 235])
    set_px(rgba, width, 38, 14, [0xFF, 0xF4, 0xB2, 235])
    set_px(rgba, width, 54, 14, [0xFF, 0xF4, 0xB2, 235])
    return width, height, rgba


def render_bag_variant_b():
    width = height = 64
    rgba = [0] * (width * height * 4)
    iron = (0x61, 0x69, 0x69)
    iron_dark = (0x25, 0x2A, 0x2B)
    iron_hi = (0xB9, 0xC3, 0xC3)
    leather = (0x78, 0x4C, 0x2C)
    leather_dark = (0x2B, 0x1B, 0x12)
    glow = (0x65, 0xD9, 0xB1)
    gold = (0xE8, 0xBB, 0x4B)

    for y in range(14, 60):
        for x in range(9, 57):
            dx = abs(x - 33)
            dy = abs(y - 40)
            if dx < 25 and dy < 23:
                alpha = max(0, 72 - int((dx + dy) * 1.22))
                set_px(rgba, width, x, y, [0, 0, 0, alpha])

    frame = [(15, 20), (49, 20), (54, 27), (54, 52), (48, 58), (16, 58), (10, 52), (10, 27)]
    for y in range(height):
        for x in range(width):
            if inside_poly(x + 0.5, y + 0.5, frame):
                shade = 0.26 + (x / width) * 0.14 + max(0, 36 - y) * 0.016
                color = mix(iron_dark, iron, min(0.85, shade))
                set_px(rgba, width, x, y, [color[0], color[1], color[2], 255])
    poly_rim(rgba, width, frame, [iron_hi[0], iron_hi[1], iron_hi[2], 245], [0x10, 0x12, 0x12, 235])

    rect(rgba, width, 18, 13, 28, 10, [leather_dark[0], leather_dark[1], leather_dark[2], 255])
    rect(rgba, width, 20, 11, 24, 9, [leather[0], leather[1], leather[2], 255])
    rect(rgba, width, 14, 27, 8, 26, [leather[0], leather[1], leather[2], 255])
    rect(rgba, width, 42, 27, 8, 26, [leather[0], leather[1], leather[2], 255])
    rect(rgba, width, 17, 30, 4, 20, [0xAD, 0x75, 0x42, 240])
    rect(rgba, width, 43, 30, 4, 20, [0xAD, 0x75, 0x42, 240])

    panel = [(22, 27), (42, 27), (45, 34), (41, 47), (23, 47), (19, 34)]
    poly_fill(rgba, width, panel, [0x38, 0x3D, 0x3F, 255])
    poly_rim(rgba, width, panel, [iron_hi[0], iron_hi[1], iron_hi[2], 230], [0x12, 0x14, 0x15, 230])
    rect(rgba, width, 27, 31, 10, 10, [glow[0], glow[1], glow[2], 255])
    rect(rgba, width, 29, 33, 6, 6, [0xC6, 0xFF, 0xEA, 255])
    rect(rgba, width, 28, 50, 8, 5, [gold[0], gold[1], gold[2], 255])
    rect(rgba, width, 36, 50, 8, 5, [0xB8, 0x86, 0x32, 255])
    rect(rgba, width, 46, 16, 7, 7, [gold[0], gold[1], gold[2], 255])
    set_px(rgba, width, 49, 12, [0xFF, 0xF0, 0xA8, 230])
    set_px(rgba, width, 49, 26, [0xFF, 0xF0, 0xA8, 230])
    set_px(rgba, width, 42, 19, [0xFF, 0xF0, 0xA8, 230])
    set_px(rgba, width, 56, 19, [0xFF, 0xF0, 0xA8, 230])
    return width, height, rgba


def render_bag_variant_c():
    width = height = 64
    rgba = [0] * (width * height * 4)
    pouch = (0xA2, 0x66, 0x34)
    pouch_dark = (0x3A, 0x24, 0x17)
    pouch_hi = (0xD9, 0x92, 0x48)
    cord = (0x2A, 0x1A, 0x12)
    blue = (0x59, 0x9D, 0xE0)
    gold = (0xF1, 0xC2, 0x4D)

    for y in range(18, 61):
        for x in range(8, 58):
            dx = abs(x - 31)
            dy = abs(y - 43)
            if dx < 25 and dy < 21:
                alpha = max(0, 70 - int((dx + dy) * 1.24))
                set_px(rgba, width, x, y, [0, 0, 0, alpha])

    neck = [(20, 15), (44, 15), (49, 24), (42, 31), (22, 31), (15, 24)]
    poly_fill(rgba, width, neck, [pouch_dark[0], pouch_dark[1], pouch_dark[2], 255])
    rect(rgba, width, 19, 18, 26, 5, [pouch_hi[0], pouch_hi[1], pouch_hi[2], 255])
    rect(rgba, width, 17, 23, 30, 4, [cord[0], cord[1], cord[2], 255])
    rect(rgba, width, 20, 24, 5, 5, [gold[0], gold[1], gold[2], 255])
    rect(rgba, width, 40, 24, 5, 5, [gold[0], gold[1], gold[2], 255])

    body = [(12, 29), (52, 29), (56, 38), (51, 55), (43, 60), (19, 60), (10, 53), (8, 39)]
    for y in range(height):
        for x in range(width):
            if inside_poly(x + 0.5, y + 0.5, body):
                shade = 0.25 + (x / width) * 0.2 + max(0, 42 - y) * 0.014
                color = mix(pouch_dark, pouch, min(0.9, shade))
                set_px(rgba, width, x, y, [color[0], color[1], color[2], 255])
    poly_rim(rgba, width, body, [0xF0, 0xC7, 0x76, 245], [0x14, 0x0E, 0x0A, 235])

    rect(rgba, width, 20, 34, 25, 13, [0x75, 0x43, 0x22, 255])
    rect(rgba, width, 22, 35, 21, 4, [pouch_hi[0], pouch_hi[1], pouch_hi[2], 255])
    rect(rgba, width, 28, 40, 10, 7, [gold[0], gold[1], gold[2], 255])
    rect(rgba, width, 31, 42, 4, 3, [0xFF, 0xEA, 0x94, 255])
    rect(rgba, width, 13, 38, 8, 8, [blue[0], blue[1], blue[2], 255])
    rect(rgba, width, 15, 40, 4, 4, [0xC4, 0xE7, 0xFF, 255])
    rect(rgba, width, 46, 37, 7, 7, [gold[0], gold[1], gold[2], 255])
    rect(rgba, width, 47, 38, 4, 4, [0xFF, 0xE5, 0x85, 255])
    return width, height, rgba


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, defn in RESOURCES.items():
        rgba = render_chip(defn)
        write_png(os.path.join(OUT_DIR, f"{name}.png"), 32, 32, rgba)

    approved_bag = os.path.join(OUT_DIR, "inventory-bag-approved-full.png")
    if not os.path.exists(approved_bag):
        width, height, rgba = render_bag()
        write_png(os.path.join(OUT_DIR, "inventory-bag.png"), width, height, rgba)
    for suffix, renderer in (
        ("a", render_bag_variant_a),
        ("b", render_bag_variant_b),
        ("c", render_bag_variant_c),
    ):
        width, height, rgba = renderer()
        write_png(os.path.join(OUT_DIR, f"inventory-bag-v2-{suffix}.png"), width, height, rgba)
    print(f"generated {len(RESOURCES)} square loot chips, inventory bag, and 3 bag variants")


if __name__ == "__main__":
    main()
