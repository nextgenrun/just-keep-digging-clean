from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
WORK_DIR = ROOT / "debugging" / "2026-07-01-root-overlay-imagegen"
SOURCE = WORK_DIR / "source-contact-sheet.png"
ASSET_DIR = WORK_DIR / "assets"
REVIEW_SHEET = WORK_DIR / "review-sheet.png"
RESOURCE_SHEET = WORK_DIR / "resource-review-sheet.png"
CURRENT_TILE_SHEET = WORK_DIR / "current-tiles-review-sheet.png"

TILE = 94
CELL_COLUMNS = 3
CELL_ROWS = 2
NAMES = [
    "shallow-roots",
    "tangled-roots",
    "hanging-vines",
    "deep-fungal-roots",
    "mineral-veins",
    "fossil-fragments",
]


def load_font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/seguisb.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def remove_magenta_key(image):
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            magenta_distance = abs(r - 255) + abs(g - 0) + abs(b - 255)
            is_key = r > 185 and b > 185 and g < 95 and magenta_distance < 190
            if is_key:
                pixels[x, y] = (r, g, b, 0)
            elif a:
                # Despill edge pixels that picked up the chroma background.
                if r > 120 and b > 120 and g < 120:
                    r = min(r, 170)
                    b = min(b, 170)
                pixels[x, y] = (r, g, b, a)

    alpha = rgba.getchannel("A")
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.35))
    rgba.putalpha(alpha)
    return rgba


def trim_alpha(image, padding=24):
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))

    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    return image.crop((left, top, right, bottom))


def fit_tile(image):
    image = trim_alpha(image)
    scale = min((TILE - 4) / image.width, (TILE - 4) / image.height)
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    resized = image.resize(size, Image.Resampling.LANCZOS)
    tile = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
    tile.alpha_composite(resized, ((TILE - size[0]) // 2, (TILE - size[1]) // 2))
    return tile


def make_night_variant(day_tile, name):
    base = day_tile.copy()
    pixels = base.load()
    alpha = base.getchannel("A")
    width, height = base.size
    glow_color = (95, 236, 205, 180) if name in {"deep-fungal-roots", "mineral-veins"} else (135, 168, 105, 95)

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if not a:
                continue
            if name in {"deep-fungal-roots", "mineral-veins"} and (g > 120 or b > 135):
                pixels[x, y] = (min(255, int(r * 1.08)), min(255, int(g * 1.18)), min(255, int(b * 1.25)), a)
            else:
                pixels[x, y] = (int(r * 0.72), int(g * 0.72), int(b * 0.82), a)

    glow = Image.new("RGBA", base.size, glow_color)
    glow.putalpha(alpha.filter(ImageFilter.GaussianBlur(3.2)).point(lambda v: min(125, int(v * 0.55))))
    glow.alpha_composite(base)
    return glow


def make_flicker_variants(night_tile, name):
    variants = []
    for index, multiplier in enumerate([0.78, 1.0, 1.22], start=1):
        frame = night_tile.copy()
        if name in {"deep-fungal-roots", "mineral-veins"}:
            pixels = frame.load()
            for y in range(frame.height):
                for x in range(frame.width):
                    r, g, b, a = pixels[x, y]
                    if a and (g > 115 or b > 130):
                        pixels[x, y] = (
                            min(255, int(r * multiplier)),
                            min(255, int(g * multiplier)),
                            min(255, int(b * multiplier)),
                            a,
                        )
        variants.append((index, frame))
    return variants


def composite(base, overlay):
    out = base.copy()
    out.alpha_composite(overlay)
    return out


def build_review_sheet(assets):
    shallow = Image.open(ROOT / "sprites/tiles/dynamic-soil/bases/soil-000-200-v2.webp").convert("RGBA").resize((TILE, TILE))
    deep = Image.open(ROOT / "sprites/tiles/dynamic-soil/bases/soil-800-1000-v2.webp").convert("RGBA").resize((TILE, TILE))
    scale = 2
    cell_w = 250
    cell_h = 252
    pad = 28
    header = 86
    sheet = Image.new("RGBA", (pad * 2 + cell_w * 3, header + pad + cell_h * 2), (18, 20, 23, 255))
    draw = ImageDraw.Draw(sheet)
    title_font = load_font(27, True)
    label_font = load_font(16, True)
    small_font = load_font(12)
    draw.text((pad, 22), "Image-Generated Root Overlay Assets", font=title_font, fill=(242, 232, 211, 255))
    draw.text((pad, 56), "Transparent 94x94 PNGs, composited on existing soil. Day, night glow, and flicker frames exported.", font=small_font, fill=(174, 187, 191, 255))

    for index, name in enumerate(NAMES):
        col = index % 3
        row = index // 3
        x = pad + col * cell_w
        y = header + pad + row * cell_h
        draw.rounded_rectangle((x, y, x + cell_w - 18, y + cell_h - 18), radius=8, fill=(28, 32, 36, 255), outline=(62, 70, 76, 255))
        draw.text((x + 12, y + 12), name, font=label_font, fill=(239, 230, 211, 255))

        for sample_index, (caption, base, overlay) in enumerate([
            ("day", shallow, assets[name]["day"]),
            ("night", deep, assets[name]["night"]),
        ]):
            sx = x + 12 + sample_index * 108
            sy = y + 52
            draw.text((sx, sy - 17), caption, font=small_font, fill=(184, 197, 199, 255))
            preview = composite(base, overlay).resize((TILE * scale, TILE * scale), Image.Resampling.NEAREST)
            sheet.alpha_composite(preview, (sx, sy))

        fy = y + 184
        draw.text((x + 12, fy - 16), "night flicker", font=small_font, fill=(184, 197, 199, 255))
        for frame_index, frame in enumerate(assets[name]["flicker"]):
            tiny = composite(deep, frame).resize((31, 31), Image.Resampling.NEAREST)
            sheet.alpha_composite(tiny, (x + 92 + frame_index * 35, fy - 4))

    sheet.convert("RGB").save(REVIEW_SHEET, quality=95)


def build_resource_sheet(assets):
    resource_tiles = [
        ("stone", "sprites/tiles/tiles-under-1000/resource-stone-tile/5-of-5-hp.webp"),
        ("copper", "sprites/tiles/tiles-under-1000/resource-copper-tile/5-of-5-hp.webp"),
        ("bronze", "sprites/tiles/tiles-under-1000/resource-bronze-tile/5-of-5-hp.webp"),
        ("iron", "sprites/tiles/tiles-under-1000/resource-iron-tile/5-of-5-hp.webp"),
        ("silver", "sprites/tiles/tiles-under-1000/resource-silver-tile/5-of-5-hp.webp"),
        ("gold", "sprites/tiles/tiles-under-1000/resource-gold-tile/5-of-5-hp.webp"),
    ]
    resources = [
        (name, Image.open(ROOT / path).convert("RGBA").resize((TILE, TILE), Image.Resampling.LANCZOS))
        for name, path in resource_tiles
    ]

    scale = 2
    tile_gap = 18
    row_h = TILE * scale + 72
    label_w = 186
    pad = 28
    header = 92
    width = pad * 2 + label_w + len(resources) * (TILE * scale + tile_gap)
    height = header + pad + len(NAMES) * row_h
    sheet = Image.new("RGBA", (width, height), (18, 20, 23, 255))
    draw = ImageDraw.Draw(sheet)
    title_font = load_font(27, True)
    label_font = load_font(15, True)
    small_font = load_font(12)
    micro_font = load_font(10)

    draw.text((pad, 22), "Root Overlay Concepts on Resource Tiles", font=title_font, fill=(242, 232, 211, 255))
    draw.text((pad, 56), "Actual resource sprites with image-generated transparent overlays composited at 94x94.", font=small_font, fill=(174, 187, 191, 255))

    table_x = pad + label_w
    for col, (resource_name, _tile) in enumerate(resources):
        x = table_x + col * (TILE * scale + tile_gap)
        draw.text((x, header + 2), resource_name, font=small_font, fill=(188, 201, 204, 255))

    for row, overlay_name in enumerate(NAMES):
        y = header + pad + row * row_h
        draw.text((pad, y + 30), overlay_name, font=label_font, fill=(239, 230, 211, 255))
        draw.text((pad, y + 52), "day overlay", font=micro_font, fill=(139, 151, 156, 255))
        overlay = assets[overlay_name]["day"]
        for col, (_resource_name, tile) in enumerate(resources):
            x = table_x + col * (TILE * scale + tile_gap)
            preview = composite(tile, overlay).resize((TILE * scale, TILE * scale), Image.Resampling.NEAREST)
            draw.rectangle((x - 2, y + 24, x + TILE * scale + 1, y + 24 + TILE * scale + 1), outline=(7, 9, 11, 255), width=2)
            sheet.alpha_composite(preview, (x, y + 26))

    sheet.convert("RGB").save(RESOURCE_SHEET, quality=95)


def build_current_tile_sheet(assets):
    current_tiles = [
        ("soil 0-200", "sprites/tiles/dynamic-soil/bases/soil-000-200-v2.webp"),
        ("soil 400-600", "sprites/tiles/dynamic-soil/bases/soil-400-600-v2.webp"),
        ("soil 800-1000", "sprites/tiles/dynamic-soil/bases/soil-800-1000-v2.webp"),
        ("dirt", "sprites/tiles/tiles-under-1000/dirt-tiles/5-of-5-hp.webp"),
        ("stone", "sprites/tiles/tiles-under-1000/resource-stone-tile/5-of-5-hp.webp"),
        ("copper", "sprites/tiles/tiles-under-1000/resource-copper-tile/5-of-5-hp.webp"),
        ("iron", "sprites/tiles/tiles-under-1000/resource-iron-tile/5-of-5-hp.webp"),
        ("gold", "sprites/tiles/tiles-under-1000/resource-gold-tile/5-of-5-hp.webp"),
    ]
    tiles = [
        (name, Image.open(ROOT / path).convert("RGBA").resize((TILE, TILE), Image.Resampling.LANCZOS))
        for name, path in current_tiles
    ]
    current_roots = Image.open(ROOT / "sprites/tiles/dynamic-soil/overlays/roots-shallow.png").convert("RGBA").resize((TILE, TILE), Image.Resampling.LANCZOS)
    current_deep = Image.open(ROOT / "sprites/tiles/dynamic-soil/overlays/roots-deep.png").convert("RGBA").resize((TILE, TILE), Image.Resampling.LANCZOS)

    rows = [
        ("current shallow", current_roots),
        ("current deep", current_deep),
        ("shallow-roots", assets["shallow-roots"]["day"]),
        ("tangled-roots", assets["tangled-roots"]["day"]),
        ("hanging-vines", assets["hanging-vines"]["day"]),
        ("deep-fungal night", assets["deep-fungal-roots"]["night"]),
        ("mineral-veins night", assets["mineral-veins"]["night"]),
        ("fossil-fragments", assets["fossil-fragments"]["day"]),
    ]

    scale = 2
    tile_gap = 14
    row_h = TILE * scale + 42
    label_w = 178
    pad = 28
    header = 94
    width = pad * 2 + label_w + len(tiles) * (TILE * scale + tile_gap)
    height = header + pad + len(rows) * row_h
    sheet = Image.new("RGBA", (width, height), (18, 20, 23, 255))
    draw = ImageDraw.Draw(sheet)
    title_font = load_font(27, True)
    label_font = load_font(14, True)
    small_font = load_font(11)

    draw.text((pad, 22), "Overlay Concepts on Current Tile Sprites", font=title_font, fill=(242, 232, 211, 255))
    draw.text((pad, 56), "Rows compare current root PNGs against image-generated transparent overlays on active tile art.", font=small_font, fill=(174, 187, 191, 255))

    table_x = pad + label_w
    for col, (tile_name, _tile) in enumerate(tiles):
        x = table_x + col * (TILE * scale + tile_gap)
        draw.text((x, header + 2), tile_name, font=small_font, fill=(188, 201, 204, 255))

    for row_index, (row_name, overlay) in enumerate(rows):
        y = header + pad + row_index * row_h
        draw.text((pad, y + 36), row_name, font=label_font, fill=(239, 230, 211, 255))
        for col, (_tile_name, tile) in enumerate(tiles):
            x = table_x + col * (TILE * scale + tile_gap)
            preview = composite(tile, overlay).resize((TILE * scale, TILE * scale), Image.Resampling.NEAREST)
            draw.rectangle((x - 2, y + 22, x + TILE * scale + 1, y + 22 + TILE * scale + 1), outline=(7, 9, 11, 255), width=2)
            sheet.alpha_composite(preview, (x, y + 24))

    sheet.convert("RGB").save(CURRENT_TILE_SHEET, quality=95)


def main():
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing image-generated source sheet: {SOURCE}")

    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    for old in ASSET_DIR.glob("*.png"):
        old.unlink()

    source = Image.open(SOURCE).convert("RGBA")
    cell_w = source.width // CELL_COLUMNS
    cell_h = source.height // CELL_ROWS
    assets = {}

    for index, name in enumerate(NAMES):
        col = index % CELL_COLUMNS
        row = index // CELL_COLUMNS
        crop = source.crop((col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h))
        keyed = remove_magenta_key(crop)
        day_tile = fit_tile(keyed)
        night_tile = make_night_variant(day_tile, name)

        day_tile.save(ASSET_DIR / f"{name}-day.png")
        night_tile.save(ASSET_DIR / f"{name}-night.png")
        assets[name] = {"day": day_tile, "night": night_tile, "flicker": []}

        for frame_number, frame in make_flicker_variants(night_tile, name):
            frame.save(ASSET_DIR / f"{name}-night-flicker-{frame_number}.png")
            assets[name]["flicker"].append(frame)

    build_review_sheet(assets)
    build_resource_sheet(assets)
    build_current_tile_sheet(assets)
    print(REVIEW_SHEET)
    print(RESOURCE_SHEET)
    print(CURRENT_TILE_SHEET)
    print(ASSET_DIR)


if __name__ == "__main__":
    main()
