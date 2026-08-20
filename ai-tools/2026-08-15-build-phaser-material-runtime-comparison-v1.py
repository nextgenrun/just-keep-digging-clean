"""Compose truthful runtime A/B sheets without altering captured game pixels."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
CAPTURE_ROOT = ROOT / "visual-approval-previews" / "2026-08-15-phaser-light2d-material-v1"
BEFORE_PATH = CAPTURE_ROOT / "01-before-current-diffuse.png"
AFTER_PATH = CAPTURE_ROOT / "02-after-derived-material-light2d.png"
FULL_PATH = CAPTURE_ROOT / "03-runtime-before-after.png"
DETAIL_PATH = CAPTURE_ROOT / "04-runtime-material-details.png"
INK = (232, 236, 241)
BACKGROUND = (7, 10, 15)


def label(draw: ImageDraw.ImageDraw, x: int, text: str) -> None:
    draw.text((x + 14, 13), text, fill=INK)


def main() -> None:
    before = Image.open(BEFORE_PATH).convert("RGB")
    after = Image.open(AFTER_PATH).convert("RGB")
    if before.size != after.size:
        raise RuntimeError("Runtime captures must share one viewport")

    header = 42
    full = Image.new("RGB", (before.width * 2, before.height + header), BACKGROUND)
    full.paste(before, (0, header))
    full.paste(after, (before.width, header))
    draw = ImageDraw.Draw(full)
    label(draw, 0, "BEFORE - current diffuse rendering")
    label(draw, before.width, "AFTER - derived material maps + Phaser Light2D")
    full.save(FULL_PATH, optimize=True)

    crops = (
        ("COOL CAVE DEPTH", (10, 170, 500, 650)),
        ("PLAYER LIGHT + ROOT RELIEF", (385, 170, 875, 650)),
        ("DARK MATERIAL SEPARATION", (745, 170, 1235, 650)),
    )
    side_width = 900
    row_header = 36
    gap = 10
    row_height = 480 * side_width // 490
    details = Image.new(
        "RGB",
        (side_width * 2, len(crops) * (row_header + row_height) + gap * (len(crops) - 1)),
        BACKGROUND,
    )
    draw = ImageDraw.Draw(details)
    y = 0
    for name, box in crops:
        before_crop = before.crop(box).resize((side_width, row_height), Image.Resampling.LANCZOS)
        after_crop = after.crop(box).resize((side_width, row_height), Image.Resampling.LANCZOS)
        draw.text((14, y + 11), f"{name} - BEFORE", fill=INK)
        draw.text((side_width + 14, y + 11), f"{name} - AFTER", fill=INK)
        details.paste(before_crop, (0, y + row_header))
        details.paste(after_crop, (side_width, y + row_header))
        y += row_header + row_height + gap
    details.save(DETAIL_PATH, optimize=True)
    print(FULL_PATH.relative_to(ROOT).as_posix())
    print(DETAIL_PATH.relative_to(ROOT).as_posix())


if __name__ == "__main__":
    main()
