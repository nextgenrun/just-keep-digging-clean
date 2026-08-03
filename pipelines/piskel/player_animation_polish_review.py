"""Render a compact human-review board from generated animation-polish frames."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        Path("C:/Windows/Fonts/segoeuib.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
    ):
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def _place_frame(
    canvas: Image.Image,
    frame: Image.Image,
    left: int,
    top: int,
    size: int = 150,
) -> None:
    resized = frame.resize((size, size), Image.Resampling.LANCZOS)
    canvas.alpha_composite(resized, (left, top))


def write_review_board(
    root: Path,
    run_frames: list[Image.Image],
    transition_frames: list[Image.Image],
    transition_layout: dict[str, Any],
    diagonal_frames: list[Image.Image],
) -> str:
    width, height = 1280, 1210
    canvas = Image.new("RGBA", (width, height), (6, 19, 27, 255))
    draw = ImageDraw.Draw(canvas)
    title_font, label_font, small_font = _font(30), _font(20), _font(15)
    draw.text((34, 24), "SURVIVAL PLAYER · CENTRAL ANIMATION POLISH", font=title_font, fill="#f4d36d")
    draw.text(
        (34, 64),
        "Generated through Piskel · gameplay timing and input remain unchanged",
        font=small_font,
        fill="#9bb4bf",
    )
    rows = [
        ("PISKEL JOG · centered root + authored contacts", [0, 4, 8, 12, 14, 18, 22, 26], run_frames, 104),
        ("JOG → IDLE · planted 2-frame bridge", [10, 11], transition_frames, 150),
        ("IDLE → JOG · planted 2-frame bridge", [0, 1], transition_frames, 150),
        ("MOVING UP-SIDE · Jog lower body + strike", [15, 19, 22, 25, 29], diagonal_frames, 150),
        ("MOVING DOWN-SIDE · Jog lower body + strike", [75, 79, 81, 85, 89], diagonal_frames, 150),
    ]
    row_top = 104
    for row_index, (label, indices, source, preview_size) in enumerate(rows):
        top = row_top + row_index * 172
        draw.rounded_rectangle((26, top, 1254, top + 156), 12, fill="#0c2531", outline="#2c5868")
        draw.text((44, top + 14), label, font=label_font, fill="#e6f4f7")
        start_x = 300 if len(indices) == 2 else 292 if len(indices) == 8 else 360
        gap = 116 if len(indices) == 8 else 176
        for index, frame_index in enumerate(indices):
            left = start_x + index * gap
            center = left + preview_size // 2
            draw.line((center, top + 134, center, top + 142), fill="#efc85a", width=2)
            _place_frame(canvas, source[frame_index], left, top + 2, preview_size)
            draw.text((left + 8, top + 132), f"frame {frame_index}", font=small_font, fill="#88a8b4")
    footer_top = 1100
    draw.rounded_rectangle((26, footer_top, 1254, 1182), 12, fill="#10232b", outline="#31525e")
    draw.text(
        (44, footer_top + 14),
        "Also wired: source-safe rollback · exact foot markers · phase-matched moving strikes",
        font=label_font,
        fill="#d6e8ec",
    )
    draw.text(
        (44, footer_top + 45),
        "Rollback: ?animationPolish=0  ·  Per-feature switches remain available",
        font=small_font,
        fill="#91aeb8",
    )
    output = (
        root / "sprites" / "character" / "piskel" / "runtime-active"
        / "contact-sheets" / "player-animation-polish-runtime-review.png"
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(output, quality=94)
    return output.relative_to(root).as_posix()
