"""Build Steam-ready UNDERSTAR store assets from the approved cover and live screenshots."""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "ai-tools" / "2026-07-17-understar-steam-assets"
COVER = Path(
    r"C:\Users\Mila\.codex\generated_images\019f66da-9981-7151-b9b1-844dca92b65f"
    r"\exec-440e2be0-25ce-48a5-bb47-5b7aa25ac3e6.png"
)
ARC_CORE = ROOT / "sprites" / "vehicles" / "arc-core-v1" / "arc-core.png"
SCREENSHOTS = [
    ROOT / "ai-tools" / "2026-07-17-steam-screenshot-01-surface.png",
    ROOT / "ai-tools" / "2026-07-17-steam-screenshot-02-camp-resources.png",
    ROOT / "ai-tools" / "2026-07-17-steam-screenshot-03-constellation-star.png",
    ROOT / "ai-tools" / "2026-07-17-steam-screenshot-04-torchlit-depths.png",
    ROOT / "ai-tools" / "2026-07-17-steam-screenshot-05-storm-town.png",
]

RESAMPLE = Image.Resampling.LANCZOS


def save_png(image: Image.Image, name: str) -> Path:
    path = OUT / name
    image.save(path, "PNG", optimize=True)
    return path


def fit(image: Image.Image, size: tuple[int, int], centering=(0.5, 0.5)) -> Image.Image:
    return ImageOps.fit(image, size, method=RESAMPLE, centering=centering)


def resize_to_width(image: Image.Image, width: int) -> Image.Image:
    height = max(1, round(image.height * width / image.width))
    return image.resize((width, height), RESAMPLE)


def title_transparency(source: Image.Image) -> Image.Image:
    # Tight crop around the corrected UNDERSTAR wordmark and its decorative rule.
    crop = source.crop((48, 48, 1118, 365)).convert("RGBA")
    luminance = ImageOps.grayscale(crop)
    # The title is bright stone/metal on near-black rock. A feathered luminance
    # key preserves its hand-painted edge texture while removing the cave field.
    mask = luminance.point(lambda value: max(0, min(255, (value - 27) * 7)))
    mask = mask.filter(ImageFilter.GaussianBlur(0.55))
    crop.putalpha(mask)
    bbox = mask.getbbox()
    return crop.crop(bbox) if bbox else crop


def add_top_vignette(image: Image.Image, opacity: int = 220) -> Image.Image:
    base = image.convert("RGBA")
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    pixels = overlay.load()
    limit = max(1, round(base.height * 0.56))
    for y in range(limit):
        alpha = round(opacity * (1.0 - y / limit) ** 1.6)
        for x in range(base.width):
            pixels[x, y] = (1, 7, 12, alpha)
    return Image.alpha_composite(base, overlay)


def add_core_glow(base: Image.Image, core: Image.Image, width: int, x: int, y: int) -> Image.Image:
    resized = resize_to_width(core.convert("RGBA"), width)
    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    cx = x + resized.width // 2
    cy = y + resized.height // 2
    radius = round(width * 0.52)
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=(0, 178, 255, 120))
    glow = glow.filter(ImageFilter.GaussianBlur(max(10, width // 9)))
    composed = Image.alpha_composite(base.convert("RGBA"), glow)
    composed.alpha_composite(resized, (x, y))
    return composed


def portrait_capsule(
    source: Image.Image,
    wordmark: Image.Image,
    core: Image.Image,
    size: tuple[int, int],
) -> Image.Image:
    width, height = size
    # Use only the lower painted scene so the original horizontal wordmark is
    # never duplicated behind the portrait-safe logo treatment.
    scene_only = source.crop((0, 455, source.width, source.height))
    background = fit(scene_only, size, centering=(0.67, 0.55)).convert("RGBA")
    background = ImageEnhance.Color(background).enhance(1.07)
    background = add_top_vignette(background)

    logo = resize_to_width(wordmark, round(width * 0.92))
    logo_x = (width - logo.width) // 2
    logo_y = round(height * 0.045)
    background.alpha_composite(logo, (logo_x, logo_y))

    core_width = round(width * 0.63)
    core_x = round(-width * 0.055)
    core_y = round(height * 0.53)
    background = add_core_glow(background, core, core_width, core_x, core_y)
    return background.convert("RGB")


def icon_from_core(core: Image.Image, size: int) -> Image.Image:
    background = Image.new("RGBA", (size, size), (3, 11, 18, 255))
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    margin = round(size * 0.1)
    draw.ellipse((margin, margin, size - margin, size - margin), fill=(0, 196, 255, 155))
    glow = glow.filter(ImageFilter.GaussianBlur(max(6, size // 12)))
    background = Image.alpha_composite(background, glow)
    core_fit = ImageOps.contain(core.convert("RGBA"), (round(size * 0.94), round(size * 0.94)), RESAMPLE)
    background.alpha_composite(core_fit, ((size - core_fit.width) // 2, (size - core_fit.height) // 2))
    return background.convert("RGB")


def label_font() -> ImageFont.ImageFont:
    candidates = [
        Path(r"C:\Windows\Fonts\segoeuib.ttf"),
        Path(r"C:\Windows\Fonts\arialbd.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), 25)
    return ImageFont.load_default()


def make_contact_sheet(items: list[tuple[str, Path]]) -> Image.Image:
    columns = 3
    cell_w, cell_h = 520, 330
    rows = (len(items) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * cell_w, rows * cell_h), (7, 13, 20))
    draw = ImageDraw.Draw(sheet)
    font = label_font()
    for index, (label, path) in enumerate(items):
        col, row = index % columns, index // columns
        x, y = col * cell_w, row * cell_h
        image = Image.open(path).convert("RGB")
        thumb = ImageOps.contain(image, (cell_w - 24, cell_h - 64), RESAMPLE)
        thumb_x = x + (cell_w - thumb.width) // 2
        thumb_y = y + 10 + (cell_h - 64 - thumb.height) // 2
        sheet.paste(thumb, (thumb_x, thumb_y))
        draw.text((x + 14, y + cell_h - 42), label, fill=(230, 238, 244), font=font)
    return sheet


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(COVER).convert("RGB")
    core = Image.open(ARC_CORE).convert("RGBA")
    wordmark = title_transparency(source)

    shutil.copy2(COVER, OUT / "understar-approved-cover-source-rounded-u.png")

    assets: list[tuple[str, Path]] = []

    main_capsule = fit(source, (1232, 706), centering=(0.5, 0.5))
    assets.append(("Main capsule 1232x706", save_png(main_capsule, "understar-main-capsule-1232x706.png")))

    header = fit(source, (920, 430), centering=(0.47, 0.42))
    assets.append(("Header capsule 920x430", save_png(header, "understar-header-capsule-920x430.png")))
    save_png(header, "understar-library-header-920x430.png")

    small_crop = source.crop((0, 35, 1325, 534))
    small = fit(small_crop, (462, 174), centering=(0.49, 0.46))
    assets.append(("Small capsule 462x174", save_png(small, "understar-small-capsule-462x174.png")))

    vertical = portrait_capsule(source, wordmark, core, (748, 896))
    assets.append(("Vertical capsule 748x896", save_png(vertical, "understar-vertical-capsule-748x896.png")))

    library_capsule = portrait_capsule(source, wordmark, core, (600, 900))
    assets.append(("Library capsule 600x900", save_png(library_capsule, "understar-library-capsule-600x900.png")))

    hero_crop = source.crop((72, 448, source.width, source.height))
    hero = fit(hero_crop, (3840, 1240), centering=(0.54, 0.56))
    hero = ImageEnhance.Color(hero).enhance(1.04)
    assets.append(("Library hero 3840x1240", save_png(hero, "understar-library-hero-3840x1240.png")))

    logo = resize_to_width(wordmark, min(1200, wordmark.width))
    assets.append(("Transparent library logo", save_png(logo, "understar-library-logo-transparent.png")))

    app_icon = icon_from_core(core, 184)
    assets.append(("App icon 184x184", save_png(app_icon, "understar-app-icon-184x184.png")))

    shortcut_icon = icon_from_core(core, 256)
    save_png(shortcut_icon, "understar-shortcut-icon-256x256.png")

    for index, screenshot_path in enumerate(SCREENSHOTS, start=1):
        screenshot = Image.open(screenshot_path).convert("RGB")
        screenshot = fit(screenshot, (1920, 1080))
        screenshot = screenshot.filter(ImageFilter.UnsharpMask(radius=1.0, percent=45, threshold=3))
        output = save_png(screenshot, f"understar-screenshot-{index:02d}-1920x1080.png")
        assets.append((f"Gameplay screenshot {index}", output))

    contact_sheet = make_contact_sheet(assets)
    save_png(contact_sheet, "understar-steam-assets-contact-sheet.png")

    print(f"Built {len(assets)} reviewed assets in {OUT}")


if __name__ == "__main__":
    main()
