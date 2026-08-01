"""Compose untouched WebGL captures into the old-school lamp review board."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BOARD_WIDTH = 2560
MARGIN = 52
COLUMN_GAP = 28
COLUMN_WIDTH = (BOARD_WIDTH - MARGIN * 2 - COLUMN_GAP) // 2
HEADER_HEIGHT = 154
LABEL_HEIGHT = 70
PANEL_HEIGHT = round(COLUMN_WIDTH * 9 / 16)
ZOOM_GAP = 42
FOOTER_HEIGHT = 76
BOARD_HEIGHT = (
    HEADER_HEIGHT
    + LABEL_HEIGHT
    + PANEL_HEIGHT * 2
    + ZOOM_GAP
    + FOOTER_HEIGHT
)
FONT_REGULAR = Path("C:/Windows/Fonts/segoeui.ttf")
FONT_BOLD = Path("C:/Windows/Fonts/seguisb.ttf")


def font(size: int, *, bold: bool = False) -> ImageFont.ImageFont:
    path = FONT_BOLD if bold else FONT_REGULAR
    if path.is_file():
        return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def fit_capture(image: Image.Image) -> Image.Image:
    if image.width * 9 != image.height * 16:
        raise ValueError(f"Expected a 16:9 WebGL capture, got {image.size}")
    return image.convert("RGB").resize(
        (COLUMN_WIDTH, PANEL_HEIGHT),
        Image.Resampling.LANCZOS,
    )


def close_crop(image: Image.Image) -> Image.Image:
    center_x = image.width // 2
    center_y = image.height // 2
    crop_width = min(image.width, 680)
    crop_height = round(crop_width * 9 / 16)
    left = max(0, center_x - crop_width // 2)
    top = max(0, center_y - crop_height // 2)
    crop = image.crop((left, top, left + crop_width, top + crop_height))
    return crop.convert("RGB").resize(
        (COLUMN_WIDTH, PANEL_HEIGHT),
        Image.Resampling.LANCZOS,
    )


def label(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    title: str,
    subtitle: str,
    badge: str,
    accent: tuple[int, int, int],
) -> None:
    draw.rounded_rectangle(
        (x, y, x + COLUMN_WIDTH, y + LABEL_HEIGHT - 10),
        radius=14,
        fill=(17, 19, 24),
        outline=accent,
        width=2,
    )
    draw.text((x + 22, y + 10), title, font=font(25, bold=True), fill=(246, 239, 224))
    draw.text((x + 22, y + 39), subtitle, font=font(16), fill=(160, 167, 181))
    badge_font = font(15, bold=True)
    badge_box = draw.textbbox((0, 0), badge, font=badge_font)
    badge_width = badge_box[2] - badge_box[0] + 28
    badge_x = x + COLUMN_WIDTH - badge_width - 18
    draw.rounded_rectangle(
        (badge_x, y + 14, badge_x + badge_width, y + 45),
        radius=15,
        fill=accent,
    )
    draw.text((badge_x + 14, y + 20), badge, font=badge_font, fill=(9, 10, 13))


def panel(
    board: Image.Image,
    draw: ImageDraw.ImageDraw,
    image: Image.Image,
    x: int,
    y: int,
    accent: tuple[int, int, int],
    caption: str,
) -> None:
    board.paste(image, (x, y))
    draw.rectangle(
        (x, y, x + COLUMN_WIDTH - 1, y + PANEL_HEIGHT - 1),
        outline=accent,
        width=3,
    )
    draw.rounded_rectangle((x + 18, y + 18, x + 206, y + 53), 12, fill=(7, 8, 11))
    draw.text((x + 34, y + 25), caption, font=font(16, bold=True), fill=(232, 234, 239))


def build(torch_path: Path, lamp_path: Path, output_path: Path) -> None:
    torch = Image.open(torch_path)
    lamp = Image.open(lamp_path)
    if torch.size != lamp.size:
        raise ValueError(f"Capture sizes differ: {torch.size} vs {lamp.size}")

    board = Image.new("RGB", (BOARD_WIDTH, BOARD_HEIGHT), (7, 8, 11))
    draw = ImageDraw.Draw(board)
    draw.text(
        (MARGIN, 30),
        "CARRIED LIGHT — IN-GAME A/B",
        font=font(38, bold=True),
        fill=(255, 222, 159),
    )
    draw.text(
        (MARGIN, 85),
        "Same world · same underground tile · same darkness mask · full GP",
        font=font(21),
        fill=(180, 186, 198),
    )

    left_x = MARGIN
    right_x = MARGIN + COLUMN_WIDTH + COLUMN_GAP
    torch_accent = (237, 113, 48)
    lamp_accent = (225, 176, 82)
    label(draw, left_x, HEADER_HEIGHT, "FIRE LIGHT V3", "exposed torch · turbulent omni spill", "DEFAULT", torch_accent)
    label(draw, right_x, HEADER_HEIGHT, "OLD-SCHOOL SAFETY LAMP", "shielded flame · reflector-weighted spill", "REVIEW", lamp_accent)

    full_y = HEADER_HEIGHT + LABEL_HEIGHT
    panel(board, draw, fit_capture(torch), left_x, full_y, torch_accent, "FULL GAME VIEW")
    panel(board, draw, fit_capture(lamp), right_x, full_y, lamp_accent, "FULL GAME VIEW")
    zoom_y = full_y + PANEL_HEIGHT + ZOOM_GAP
    panel(board, draw, close_crop(torch), left_x, zoom_y, torch_accent, "2× LIGHT DETAIL")
    panel(board, draw, close_crop(lamp), right_x, zoom_y, lamp_accent, "2× LIGHT DETAIL")

    footer_y = zoom_y + PANEL_HEIGHT
    draw.text(
        (MARGIN, footer_y + 28),
        "Review gate: ?carriedLightStyle=lamp-review  ·  Removing the query keeps Fire Light V3 unchanged",
        font=font(19),
        fill=(171, 178, 190),
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    board.save(output_path, "PNG", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--torch", type=Path, required=True)
    parser.add_argument("--lamp", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    build(args.torch, args.lamp, args.output)
    print(args.output.resolve())


if __name__ == "__main__":
    main()
