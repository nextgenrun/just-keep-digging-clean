"""Build a preview-only town/exterior approval grid from exact-dimension masters."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "sprites/backgrounds/world-v11-scale-correct-0-20m-v3/previews"
TOWN_DIR = ASSET_DIR / "time-neutral-town"
GROUND_DIR = ASSET_DIR / "time-neutral-ground"
OUTPUT = ROOT / "visual-approval-previews/v11-neutral-town-exterior-contact-sheet-2026-07-12.png"

WIDTH = 4000
MARGIN = 36
GAP = 18
CARD_WIDTH = (WIDTH - MARGIN * 2 - GAP * 4) // 5
TOWN_CARD_HEIGHT = 500
GROUND_CARD_HEIGHT = 440
HEADER_HEIGHT = 72
BACKGROUND = (19, 24, 30)
CARD = (29, 36, 44)
TEXT = (236, 240, 244)
MUTED = (155, 171, 184)


def font(size: int):
    for path in (Path("C:/Windows/Fonts/consola.ttf"), Path("C:/Windows/Fonts/arial.ttf")):
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def draw_card(canvas: Image.Image, draw: ImageDraw.ImageDraw, path: Path, index: int, x: int, y: int, height: int, prefix: str) -> None:
    draw.rounded_rectangle((x, y, x + CARD_WIDTH, y + height), radius=10, fill=CARD, outline=(72, 84, 94), width=2)
    with Image.open(path) as source:
        source = source.convert("RGB")
        original_size = source.size
        max_size = (CARD_WIDTH - 20, height - 54)
        source.thumbnail(max_size, Image.Resampling.LANCZOS)
        image_x = x + (CARD_WIDTH - source.width) // 2
        image_y = y + height - source.height - 10
        canvas.paste(source, (image_x, image_y))
        dimensions = f"{original_size[0]}x{original_size[1]} master"
    label = f"{prefix}-{index:02d}"
    draw.text((x + 12, y + 9), label, font=font(24), fill=TEXT)
    draw.text((x + CARD_WIDTH - 12, y + 12), dimensions, anchor="ra", font=font(17), fill=MUTED)


def build() -> None:
    total_height = MARGIN + HEADER_HEIGHT + TOWN_CARD_HEIGHT + 44 + HEADER_HEIGHT + GROUND_CARD_HEIGHT * 2 + GAP + MARGIN
    canvas = Image.new("RGB", (WIDTH, total_height), BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    heading = font(34)
    body = font(20)

    y = MARGIN
    draw.text((MARGIN, y), "TIME-NEUTRAL TOWN 01–05", font=heading, fill=TEXT)
    draw.text((MARGIN, y + 42), "Exact source dimensions; bottom aligned; no baked sun, moon, stars, or weather", font=body, fill=MUTED)
    y += HEADER_HEIGHT
    for index in range(1, 6):
        x = MARGIN + (index - 1) * (CARD_WIDTH + GAP)
        draw_card(canvas, draw, TOWN_DIR / f"town-ground-{index:02d}-preview.png", index, x, y, TOWN_CARD_HEIGHT, "town")

    y += TOWN_CARD_HEIGHT + 44
    draw.text((MARGIN, y), "TIME-NEUTRAL EXTERIOR / LEVEL 1 01–10", font=heading, fill=TEXT)
    draw.text((MARGIN, y + 42), "Shared sky rule; unique lower horizons; runtime owns celestial and weather lighting", font=body, fill=MUTED)
    y += HEADER_HEIGHT
    for index in range(1, 11):
        row = (index - 1) // 5
        column = (index - 1) % 5
        x = MARGIN + column * (CARD_WIDTH + GAP)
        card_y = y + row * (GROUND_CARD_HEIGHT + GAP)
        draw_card(canvas, draw, GROUND_DIR / f"level1-ground-{index:02d}.png", index, x, card_y, GROUND_CARD_HEIGHT, "exterior")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    build()
