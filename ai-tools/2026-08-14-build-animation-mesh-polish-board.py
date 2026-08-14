"""Build the review-only Survival player before/after approval board."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "sprites/character/survival-character-blender-v2/previews/dig-up-impact-512.png"
AFTER = ROOT / "visual-approval-previews/2026-08-14-animation-mesh-polish-v1/after-mesh-motion-concept-v1.png"
OUTPUT = ROOT / "visual-approval-previews/2026-08-14-animation-mesh-polish-v1/01-before-after-mesh-motion-mockup.png"

WIDTH = 1600
HEIGHT = 1000
PANEL_TOP = 128
PANEL_HEIGHT = 690
PANEL_WIDTH = 744
SUBJECT_HEIGHT = 600

BG = (7, 18, 27)
PANEL = (12, 31, 43)
PANEL_EDGE = (42, 94, 116)
GOLD = (255, 209, 102)
TEXT = (225, 238, 245)
MUTED = (151, 178, 190)
ACCENT_BEFORE = (231, 111, 81)
ACCENT_AFTER = (91, 201, 147)


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


def subject_crop(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    mask = Image.new("L", rgb.size, 0)
    pixels = rgb.load()
    mask_pixels = mask.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = pixels[x, y]
            if max(r, g, b) > 18:
                mask_pixels[x, y] = 255
    bounds = mask.getbbox()
    if not bounds:
        return rgb
    left, top, right, bottom = bounds
    pad = 12
    return rgb.crop((max(0, left - pad), max(0, top - pad), min(rgb.width, right + pad), min(rgb.height, bottom + pad)))


def place_subject(board: Image.Image, source: Path, panel_x: int) -> None:
    crop = subject_crop(Image.open(source))
    scale = SUBJECT_HEIGHT / crop.height
    resized = crop.resize((round(crop.width * scale), SUBJECT_HEIGHT), Image.Resampling.LANCZOS)
    x = panel_x + (PANEL_WIDTH - resized.width) // 2
    y = PANEL_TOP + 62 + (PANEL_HEIGHT - 90 - resized.height) // 2
    board.paste(resized, (x, y))


def centered(draw: ImageDraw.ImageDraw, text: str, x: int, y: int, width: int, face: ImageFont.FreeTypeFont, fill) -> None:
    box = draw.textbbox((0, 0), text, font=face)
    draw.text((x + (width - (box[2] - box[0])) // 2, y), text, font=face, fill=fill)


def build() -> None:
    board = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(board)

    title = font("segoeuib.ttf", 40)
    subtitle = font("segoeui.ttf", 22)
    label = font("segoeuib.ttf", 22)
    body = font("segoeui.ttf", 20)
    small = font("segoeui.ttf", 17)

    draw.text((42, 28), "SURVIVAL PLAYER · MESH + MOTION POLISH", font=title, fill=GOLD)
    draw.text((44, 82), "Review-only direction · exact current frame on the left · proposed Blender-quality target on the right", font=subtitle, fill=MUTED)

    left_x = 32
    right_x = 824
    for x in (left_x, right_x):
        draw.rounded_rectangle((x, PANEL_TOP, x + PANEL_WIDTH, PANEL_TOP + PANEL_HEIGHT), radius=18, fill=PANEL, outline=PANEL_EDGE, width=2)

    centered(draw, "BEFORE · CURRENT PRODUCTION FRAME", left_x, PANEL_TOP + 20, PANEL_WIDTH, label, ACCENT_BEFORE)
    centered(draw, "AFTER · APPROVAL TARGET", right_x, PANEL_TOP + 20, PANEL_WIDTH, label, ACCENT_AFTER)

    place_subject(board, SOURCE, left_x)
    place_subject(board, AFTER, right_x)

    divider_y = 844
    draw.line((32, divider_y, WIDTH - 32, divider_y), fill=PANEL_EDGE, width=2)

    before_lines = [
        "Current: glove/finger volumes merge at action extremes",
        "Pelvis-to-knee chain reads stiff; small display loses material detail",
    ]
    after_lines = [
        "Target: natural finger curl + aligned wrists + preserved joint volume",
        "Centered pelvis, cleaner knee tracking, controlled high-resolution downsample",
    ]
    draw.text((48, 868), before_lines[0], font=body, fill=TEXT)
    draw.text((48, 902), before_lines[1], font=small, fill=MUTED)
    draw.text((824, 868), after_lines[0], font=body, fill=TEXT)
    draw.text((824, 902), after_lines[1], font=small, fill=MUTED)
    centered(draw, "ART-DIRECTION MOCKUP · NOT A RUNTIME FRAME · PRODUCTION CHANGED: FALSE", 32, 958, WIDTH - 64, small, GOLD)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    board.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    build()
