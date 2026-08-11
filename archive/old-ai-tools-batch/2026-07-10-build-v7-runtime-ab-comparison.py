"""Build a deterministic presentation sheet from two already-captured Phaser frames."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "exports" / "visual-gap-analysis" / "v7-runtime-renderer-matrix-v1"


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    try:
        return ImageFont.truetype(f"C:/Windows/Fonts/{name}", size)
    except OSError:
        return ImageFont.load_default()


def fit_frame(path: Path, width: int, height: int) -> Image.Image:
    with Image.open(path) as source:
        image = source.convert("RGB")
    return image.resize((width, height), Image.Resampling.LANCZOS)


def main() -> None:
    canvas = Image.new("RGB", (1920, 1080), (7, 10, 17))
    draw = ImageDraw.Draw(canvas)
    title_font = font(28, bold=True)
    body_font = font(16)
    label_font = font(15, bold=True)
    small_font = font(14)

    draw.text((32, 24), "v7 deep-cavern renderer direction", font=title_font, fill=(241, 245, 251))
    draw.text((32, 66), "Same WorldModel · camera · geometry · legacy frame", font=body_font, fill=(151, 166, 186))
    badge = "visual target mockup—not runtime proof"
    badge_box = draw.textbbox((0, 0), badge, font=small_font)
    badge_width = badge_box[2] - badge_box[0] + 28
    draw.rounded_rectangle((1888 - badge_width, 28, 1888, 66), radius=19, outline=(54, 132, 122), width=1)
    draw.text((1902 - badge_width, 38), badge, font=small_font, fill=(181, 244, 235))

    panel_y = 112
    panel_width = 922
    image_height = 519
    panels = [
        (32, "CURRENT V7 RENDER", "current-v7-deep.png", (188, 200, 217)),
        (966, "OPTIMIZED RENDERER TARGET", "optimized-v7-deep.png", (143, 239, 224)),
    ]
    for x, label, filename, label_color in panels:
        draw.rounded_rectangle((x, panel_y, x + panel_width, panel_y + 567), radius=8, fill=(12, 17, 27), outline=(42, 56, 75), width=1)
        draw.text((x + 16, panel_y + 14), label, font=label_font, fill=label_color)
        canvas.paste(fit_frame(OUTPUT / filename, panel_width, image_height), (x, panel_y + 48))

    current_notes = ["nearest global sampling", "flat empty-space lighting", "no material light response"]
    target_notes = ["role-aware filtering", "torso-centered visibility", "depth + color bounce + restrained bloom"]
    for x, notes, color in ((32, current_notes, (151, 166, 186)), (966, target_notes, (102, 218, 202))):
        for index, note in enumerate(notes):
            note_y = 714 + index * 38
            draw.ellipse((x + 2, note_y + 7, x + 8, note_y + 13), fill=color)
            draw.text((x + 20, note_y), note, font=body_font, fill=(179, 190, 205))

    draw.line((32, 852, 1888, 852), fill=(31, 43, 59), width=1)
    draw.text((32, 880), "Decision gate", font=label_font, fill=(241, 245, 251))
    draw.text(
        (32, 914),
        "Approve the lighting and material-response direction before any runtime, TMX, or active-asset wiring.",
        font=body_font,
        fill=(163, 176, 194),
    )
    draw.text((32, 1008), "v10 / v14 / robot / run animation: excluded", font=small_font, fill=(111, 128, 151))
    canvas.save(OUTPUT / "ab-comparison.png", optimize=True)


if __name__ == "__main__":
    main()
