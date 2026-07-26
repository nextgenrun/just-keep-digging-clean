"""Build one review image from the five Phaser milestone-pillar captures."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = ROOT / "visual-approval-previews" / "milestone-pillar-concepts-v1"
OUTPUT_PATH = REVIEW_DIR / "milestone-pillar-five-option-runtime-contact-sheet.png"
CANVAS_SIZE = (1920, 1080)
CAPTURE_SIZE = (600, 338)

OPTIONS = (
    ("a", "A  •  CARVED SLATE DEPTH CHRONICLE", "#62c9dc", (40, 92)),
    ("b", "B  •  LIVING CRYSTAL STRATA", "#7cc9ff", (660, 92)),
    ("c", "C  •  DWARVEN DEPTH ENGINE", "#d6a84a", (1280, 92)),
    ("d", "D  •  ANCIENT ROOT RUNE CAIRN", "#e0a94c", (340, 520)),
    ("e", "E  •  STARFORGE ABYSS OBELISK", "#b6eaff", (980, 520)),
)


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        Path("C:/Windows/Fonts/bahnschrift.ttf"),
        Path("C:/Windows/Fonts/trebucbd.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
    )
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


def main() -> None:
    canvas = Image.new("RGB", CANVAS_SIZE, "#05080b")
    draw = ImageDraw.Draw(canvas)
    title_font = font(34)
    label_font = font(20)
    footer_font = font(18)
    draw.text((960, 34), "MILESTONE PILLAR  •  FIVE IN-ENGINE OPTIONS", font=title_font, fill="#f0dfc2", anchor="mm")

    for option_id, label, accent, (x, y) in OPTIONS:
        capture = Image.open(REVIEW_DIR / f"runtime-option-{option_id}-stage5.png").convert("RGB")
        capture = capture.resize(CAPTURE_SIZE, Image.Resampling.LANCZOS)
        canvas.paste(capture, (x, y))
        draw.rounded_rectangle(
            (x - 2, y - 2, x + CAPTURE_SIZE[0] + 2, y + CAPTURE_SIZE[1] + 44),
            radius=8,
            outline=accent,
            width=3,
        )
        draw.rectangle((x, y + CAPTURE_SIZE[1], x + CAPTURE_SIZE[0], y + CAPTURE_SIZE[1] + 42), fill="#0b1218")
        draw.text(
            (x + CAPTURE_SIZE[0] / 2, y + CAPTURE_SIZE[1] + 21),
            label,
            font=label_font,
            fill=accent,
            anchor="mm",
        )

    draw.text(
        (960, 1018),
        "Each direction has five selectable 0-2000m growth states  •  pillar art remains REVIEW ONLY",
        font=footer_font,
        fill="#a8b1b5",
        anchor="mm",
    )
    canvas.save(OUTPUT_PATH, optimize=True)
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
