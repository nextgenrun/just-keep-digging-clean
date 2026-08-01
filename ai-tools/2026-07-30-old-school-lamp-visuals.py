"""Review boards for the old-school lamp ImageGen/Piskel package."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


FONT_PATH = Path("C:/Windows/Fonts/segoeui.ttf")
FONT_BOLD_PATH = Path("C:/Windows/Fonts/seguisb.ttf")


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    path = FONT_BOLD_PATH if bold else FONT_PATH
    if path.is_file():
        return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def contain(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    copy = image.convert("RGB")
    copy.thumbnail(size, Image.Resampling.LANCZOS)
    result = Image.new("RGB", size, (0, 0, 0))
    result.paste(copy, ((size[0] - copy.width) // 2, (size[1] - copy.height) // 2))
    return result


def build_asset_library(
    path: Path,
    rows: list[dict[str, Any]],
) -> None:
    thumb = 94
    gap = 8
    label_width = 300
    margin = 44
    row_height = thumb * 2 + gap + 34
    width = margin * 2 + label_width + thumb * 8 + gap * 7
    height = 132 + row_height * len(rows) + margin
    board = Image.new("RGB", (width, height), (7, 8, 11))
    draw = ImageDraw.Draw(board)
    draw.text((margin, 30), "OLD-SCHOOL LAMP LIGHT V1", font=font(34, True), fill=(255, 218, 145))
    draw.text(
        (margin, 78),
        "Seven ImageGen atlases · 112 fixed-anchor frames · review-only",
        font=font(20),
        fill=(178, 184, 196),
    )
    for row_index, row in enumerate(rows):
        y = 122 + row_index * row_height
        draw.rounded_rectangle(
            (margin, y, width - margin, y + row_height - 10),
            radius=14,
            fill=(13, 15, 20),
            outline=(53, 48, 38),
            width=2,
        )
        draw.text(
            (margin + 18, y + 22),
            row["displayName"],
            font=font(20, True),
            fill=(244, 203, 124),
        )
        draw.text(
            (margin + 18, y + 56),
            f"{row['anchorMode']} · {row['fps']} fps",
            font=font(16),
            fill=(142, 151, 168),
        )
        for index, frame in enumerate(row["frames"]):
            column = index % 8
            local_row = index // 8
            x = margin + label_width + column * (thumb + gap)
            frame_y = y + 16 + local_row * (thumb + gap)
            board.paste(contain(frame, (thumb, thumb)), (x, frame_y))
    path.parent.mkdir(parents=True, exist_ok=True)
    board.save(path, "PNG", optimize=True)


def build_drift_summary(
    path: Path,
    rows: list[dict[str, Any]],
) -> None:
    width = 1500
    height = 160 + len(rows) * 92
    board = Image.new("RGB", (width, height), (7, 8, 11))
    draw = ImageDraw.Draw(board)
    draw.text((52, 30), "LAMP ANCHOR CONSISTENCY", font=font(32, True), fill=(255, 218, 145))
    draw.text((52, 77), "Before ImageGen drift vs fixed Piskel group range", font=font(19), fill=(174, 182, 196))
    maximum = max(row["beforeRange"] for row in rows) or 1
    bar_x = 460
    bar_width = 900
    for index, row in enumerate(rows):
        y = 132 + index * 92
        draw.text((52, y + 14), row["displayName"], font=font(18, True), fill=(224, 226, 232))
        before_width = max(2, int(bar_width * row["beforeRange"] / maximum))
        after_width = max(2, int(bar_width * row["afterRange"] / maximum))
        draw.rounded_rectangle((bar_x, y + 10, bar_x + before_width, y + 32), 7, fill=(178, 92, 64))
        draw.rounded_rectangle((bar_x, y + 45, bar_x + after_width, y + 67), 7, fill=(70, 205, 151))
        draw.text((bar_x + before_width + 12, y + 8), f"{row['beforeRange']:.2f}px", font=font(15), fill=(232, 170, 139))
        draw.text((bar_x + after_width + 12, y + 43), f"{row['afterRange']:.2f}px", font=font(15), fill=(138, 231, 191))
    path.parent.mkdir(parents=True, exist_ok=True)
    board.save(path, "PNG", optimize=True)
