"""Build the 2026-08-16 UNDERSTAR Steam static upload pack.

The script performs deterministic crops and exact-size exports from the approved
runtime logo and two text-free ImageGen background masters. It deliberately
keeps gameplay review candidates separate from upload-ready graphical assets.
"""

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "steam-marketing" / "2026-08-16-static-upload-pack-v1"

WIDE_SOURCE = Path(
    r"C:\Users\Mila\.codex\generated_images\01a00c2e-af7a-7912-bc18-993b45394719\exec-5e7444ee-e28d-4981-9715-d49c54b4833b.png"
)
PORTRAIT_SOURCE = Path(
    r"C:\Users\Mila\.codex\generated_images\01a00c2e-af7a-7912-bc18-993b45394719\exec-9bace3d5-4a64-45a3-95c0-6794ab526afd.png"
)
USER_KEY_ART = Path(
    r"C:\Users\Mila\AppData\Local\Temp\codex-clipboard-629db57a-4c1a-4c0a-b4a0-b9888b1de13d.png"
)
LOGO_SOURCE = ROOT / "sprites" / "branding" / "understar-logo-v1" / "understar-rift-monolith-runtime.png"

SCREENSHOT_SOURCES = (
    (
        ROOT / "output" / "roboplaytest-human-2000m-run32" / "01-fresh-save.png",
        "review-only-screenshot-01-surface-town-1920x1080.png",
    ),
    (
        ROOT / "output" / "roboplaytest-human-2000m-run32" / "02-starter-dig.png",
        "review-only-screenshot-02-first-dig-1920x1080.png",
    ),
    (
        ROOT / "testing" / "artifacts" / "celestial-talent-level1-locks.png",
        "review-only-screenshot-03-celestial-talents-1920x1080.png",
    ),
)


def require(path: Path) -> Path:
    if not path.is_file():
        raise FileNotFoundError(path)
    return path


def cover(image: Image.Image, size: tuple[int, int], focus: tuple[float, float] = (0.5, 0.5)) -> Image.Image:
    image = image.convert("RGB")
    target_w, target_h = size
    scale = max(target_w / image.width, target_h / image.height)
    resized = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = round((resized.width - target_w) * focus[0])
    top = round((resized.height - target_h) * focus[1])
    left = max(0, min(left, resized.width - target_w))
    top = max(0, min(top, resized.height - target_h))
    return resized.crop((left, top, left + target_w, top + target_h))


def add_vignette(image: Image.Image, strength: int = 150) -> Image.Image:
    rgba = image.convert("RGBA")
    mask = Image.new("L", rgba.size, 0)
    draw = ImageDraw.Draw(mask)
    inset_x = round(rgba.width * 0.12)
    inset_y = round(rgba.height * 0.10)
    draw.ellipse(
        (-inset_x, -inset_y, rgba.width + inset_x, rgba.height + inset_y),
        fill=255,
    )
    mask = mask.filter(ImageFilter.GaussianBlur(max(18, rgba.width // 14)))
    darkness = Image.new("RGBA", rgba.size, (2, 7, 13, strength))
    darkness.putalpha(Image.eval(mask, lambda p: 255 - p))
    return Image.alpha_composite(rgba, darkness)


def top_logo_plate(image: Image.Image, opacity: int = 138) -> Image.Image:
    rgba = image.convert("RGBA")
    overlay = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    alpha = Image.new("L", rgba.size, 0)
    draw = ImageDraw.Draw(alpha)
    stop = round(rgba.height * 0.48)
    for y in range(stop):
        value = round(opacity * (1 - y / max(1, stop)) ** 1.4)
        draw.line((0, y, rgba.width, y), fill=value)
    overlay.putalpha(alpha)
    return Image.alpha_composite(rgba, overlay)


def trimmed_logo() -> Image.Image:
    logo = Image.open(require(LOGO_SOURCE)).convert("RGBA")
    bbox = logo.getchannel("A").getbbox()
    if bbox:
        logo = logo.crop(bbox)
    return logo


def composite_logo(
    background: Image.Image,
    width_ratio: float,
    y_ratio: float,
    max_height_ratio: float = 0.38,
    x_ratio: float = 0.5,
) -> Image.Image:
    canvas = top_logo_plate(add_vignette(background, 118), 150)
    logo = trimmed_logo()
    max_w = round(canvas.width * width_ratio)
    max_h = round(canvas.height * max_height_ratio)
    scale = min(max_w / logo.width, max_h / logo.height)
    logo = logo.resize(
        (max(1, round(logo.width * scale)), max(1, round(logo.height * scale))),
        Image.Resampling.LANCZOS,
    )
    x = round(canvas.width * x_ratio - logo.width / 2)
    y = round(canvas.height * y_ratio)
    shadow_alpha = logo.getchannel("A").filter(ImageFilter.GaussianBlur(max(2, canvas.width // 220)))
    shadow = Image.new("RGBA", logo.size, (0, 0, 0, 210))
    shadow.putalpha(shadow_alpha.point(lambda p: round(p * 0.78)))
    canvas.alpha_composite(shadow, (x + max(2, canvas.width // 280), y + max(3, canvas.height // 100)))
    canvas.alpha_composite(logo, (x, y))
    return canvas


def save_png(image: Image.Image, name: str) -> Path:
    path = OUT / name
    image.save(path, "PNG", optimize=True)
    return path


def save_jpg(image: Image.Image, name: str, quality: int = 95) -> Path:
    path = OUT / name
    image.convert("RGB").save(path, "JPEG", quality=quality, optimize=True, subsampling=0)
    return path


def engine_icon(wide: Image.Image, size: int) -> Image.Image:
    source = wide.convert("RGB")
    crop = source.crop((0, round(source.height * 0.32), round(source.width * 0.46), source.height))
    icon = cover(crop, (size, size), focus=(0.32, 0.72))
    icon = ImageEnhance.Contrast(icon).enhance(1.10)
    icon = ImageEnhance.Color(icon).enhance(1.06)
    return add_vignette(icon, 180).convert("RGB")


def create_library_logo() -> Image.Image:
    logo = trimmed_logo()
    scale = 1280 / logo.width
    return logo.resize((1280, round(logo.height * scale)), Image.Resampling.LANCZOS)


def create_contact_sheet(paths: list[Path]) -> Path:
    previews: list[tuple[str, Image.Image]] = []
    for path in paths:
        if path.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
            continue
        image = Image.open(path).convert("RGB")
        if "logo-transparent" in path.name:
            checker = Image.new("RGB", image.size, (25, 31, 39))
            checker.paste(Image.open(path).convert("RGBA"), (0, 0), Image.open(path).convert("RGBA"))
            image = checker
        thumb = Image.new("RGB", (480, 270), (15, 22, 31))
        contained = ImageOps.contain(image, (480, 270), Image.Resampling.LANCZOS)
        thumb.paste(contained, ((480 - contained.width) // 2, (270 - contained.height) // 2))
        previews.append((path.name, thumb))

    margin = 24
    label_h = 40
    cols = 3
    rows = (len(previews) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * 480 + (cols + 1) * margin, rows * (270 + label_h) + (rows + 1) * margin), (7, 12, 20))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=18)
    for index, (label, image) in enumerate(previews):
        col = index % cols
        row = index // cols
        x = margin + col * (480 + margin)
        y = margin + row * (270 + label_h)
        sheet.paste(image, (x, y))
        draw.text((x, y + 278), label, fill=(218, 229, 239), font=font)
    path = OUT / "understar-steam-static-pack-contact-sheet.png"
    sheet.save(path, "PNG", optimize=True)
    return path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    wide = Image.open(require(WIDE_SOURCE)).convert("RGB")
    portrait = Image.open(require(PORTRAIT_SOURCE)).convert("RGB")

    source_copies = (
        (WIDE_SOURCE, OUT / "source-textless-wide-imagegen-v1.png"),
        (PORTRAIT_SOURCE, OUT / "source-textless-portrait-imagegen-v1.png"),
        (require(USER_KEY_ART), OUT / "source-user-key-art-reference.png"),
        (require(LOGO_SOURCE), OUT / "source-runtime-logo-transparent.png"),
    )
    for source, destination in source_copies:
        shutil.copy2(source, destination)

    outputs: list[Path] = []

    outputs.append(save_png(composite_logo(cover(wide, (920, 430), (0.50, 0.48)), 0.90, 0.055, 0.48), "store-header-capsule-920x430.png"))
    outputs.append(save_png(composite_logo(cover(wide, (462, 174), (0.50, 0.43)), 0.94, 0.08, 0.66), "store-small-capsule-462x174.png"))
    outputs.append(save_png(composite_logo(cover(wide, (1232, 706), (0.50, 0.48)), 0.76, 0.045, 0.34, 0.39), "store-main-capsule-1232x706.png"))
    outputs.append(save_png(composite_logo(cover(portrait, (748, 896), (0.50, 0.51)), 0.90, 0.075, 0.28), "store-vertical-capsule-748x896.png"))

    outputs.append(save_png(composite_logo(cover(portrait, (600, 900), (0.50, 0.52)), 0.90, 0.075, 0.27), "library-capsule-600x900.png"))
    outputs.append(save_png(composite_logo(cover(wide, (920, 430), (0.50, 0.48)), 0.90, 0.055, 0.48), "library-header-capsule-920x430.png"))
    hero = cover(wide, (3840, 1240), (0.50, 0.46))
    hero = ImageEnhance.Brightness(hero).enhance(0.86)
    outputs.append(save_png(hero, "library-hero-artwork-only-3840x1240.png"))
    outputs.append(save_png(create_library_logo(), "library-logo-transparent-1280px-wide.png"))

    page_background = cover(wide, (1438, 810), (0.50, 0.48)).filter(ImageFilter.GaussianBlur(1.4))
    page_background = ImageEnhance.Contrast(page_background).enhance(0.78)
    page_background = ImageEnhance.Brightness(page_background).enhance(0.52)
    page_background = ImageEnhance.Color(page_background).enhance(0.72)
    outputs.append(save_png(add_vignette(page_background, 190), "store-page-background-1438x810.png"))

    outputs.append(save_png(composite_logo(cover(wide, (1920, 1080), (0.50, 0.48)), 0.70, 0.055, 0.31, 0.38), "broadcast-slate-1920x1080.png"))
    outputs.append(save_png(engine_icon(wide, 256), "client-shortcut-icon-256x256.png"))
    outputs.append(save_jpg(engine_icon(wide, 184), "client-app-icon-184x184.jpg", 96))

    for source, name in SCREENSHOT_SOURCES:
        if source.is_file():
            image = cover(Image.open(source), (1920, 1080), (0.50, 0.50))
            outputs.append(save_png(image, name))

    contact_sheet = create_contact_sheet(outputs)
    outputs.append(contact_sheet)

    manifest = []
    for path in outputs:
        image = Image.open(path)
        manifest.append(
            {
                "file": path.name,
                "width": image.width,
                "height": image.height,
                "mode": image.mode,
                "sha256": sha256(path),
                "upload_ready": not path.name.startswith("review-only-") and "contact-sheet" not in path.name,
            }
        )
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    build()
