"""Build the in-engine layered Arc Core sprite review contact sheet.

Updated: 2026-07-26
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


CELL_WIDTH = 640
CELL_HEIGHT = 360
HEADER_HEIGHT = 78
COLS = 3
ROWS = 2
CAPTURES = (
    ("01-small-idle.png", "SMALL ARC — IDLE PRECESSION"),
    ("02-small-dig.png", "SMALL ARC — SHUTTER DIG"),
    ("03-small-cloud-exit.png", "SMALL ARC — CLOUD EXIT"),
    ("04-omega-idle.png", "OMEGA ARC — TIDAL IDLE"),
    ("05-omega-dig.png", "OMEGA ARC — LATTICE DIG"),
    ("06-omega-cloud-exit.png", "OMEGA ARC — CLOUD EXIT"),
)


def _font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    font_name = "seguisb.ttf" if bold else "segoeui.ttf"
    font_path = Path("C:/Windows/Fonts") / font_name
    if font_path.exists():
        return ImageFont.truetype(str(font_path), size)
    return ImageFont.load_default()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    canvas = Image.new(
        "RGB",
        (CELL_WIDTH * COLS, HEADER_HEIGHT + CELL_HEIGHT * ROWS),
        "#0b1015",
    )
    draw = ImageDraw.Draw(canvas, "RGBA")
    title_font = _font(31, bold=True)
    label_font = _font(21, bold=True)
    draw.text(
        (28, 17),
        "ARC CORE LAYERED .SPRITE — IN-ENGINE MOTION REVIEW",
        fill="#effaff",
        font=title_font,
    )
    draw.text(
        (28, 52),
        "reviewOnly: true  ·  productionChanged: false  ·  B = cloud enter / exit",
        fill="#86a8b8",
        font=_font(14),
    )

    for index, (file_name, label) in enumerate(CAPTURES):
        source = Image.open(args.input_dir / file_name).convert("RGB")
        frame = source.resize((CELL_WIDTH, CELL_HEIGHT), Image.Resampling.LANCZOS)
        col = index % COLS
        row = index // COLS
        x = col * CELL_WIDTH
        y = HEADER_HEIGHT + row * CELL_HEIGHT
        canvas.paste(frame, (x, y))
        accent = "#65edff" if row == 0 else "#e284ff"
        draw.rectangle(
            (x + 1, y + 1, x + CELL_WIDTH - 2, y + CELL_HEIGHT - 2),
            outline=accent,
            width=2,
        )
        draw.rectangle(
            (x + 2, y + CELL_HEIGHT - 42, x + CELL_WIDTH - 2, y + CELL_HEIGHT - 2),
            fill=(4, 9, 13, 218),
        )
        draw.text(
            (x + 18, y + CELL_HEIGHT - 36),
            label,
            fill="#ffffff",
            font=label_font,
        )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.output.exists():
        raise FileExistsError(f"Refusing to overwrite {args.output}")
    canvas.save(args.output, optimize=True)
    print(f"Wrote {args.output} ({canvas.width}x{canvas.height})")


if __name__ == "__main__":
    main()
