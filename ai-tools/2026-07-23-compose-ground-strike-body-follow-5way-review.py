"""Compose Blender frame renders into five-way review sheets and GIF loops."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


REPO_ROOT = Path(__file__).resolve().parents[1]
ROOT = (
    REPO_ROOT
    / "testing"
    / "blender-animation-lab-v1"
    / "review-drafts"
    / "ground-strike-body-follow-5way-v1"
)
VARIANTS = [
    ("01-upper-body-hinge", "1. Upper-body hinge"),
    ("02-balanced-chain", "2. Balanced chain"),
    ("03-deep-athletic-crouch", "3. Deep athletic crouch"),
    ("04-forward-lunge", "4. Forward lunge"),
    ("05-impact-compression", "5. Impact compression"),
]
SHEET_FRAMES = [10, 12, 14, 16, 18, 20, 22]
CONTACT_FRAME = 16
BG = (13, 16, 20)
PANEL = (22, 27, 33)
TEXT = (239, 235, 225)
MUTED = (163, 174, 184)
AMBER = (244, 137, 52)


def font(size: int, bold: bool = False):
    font_name = "segoeuib.ttf" if bold else "segoeui.ttf"
    path = Path("C:/Windows/Fonts") / font_name
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def load_frame(variant_id: str, frame: int) -> Image.Image:
    path = ROOT / variant_id / "frames" / f"frame_{frame:04d}.png"
    return Image.open(path).convert("RGB")


def fit(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    copy = image.copy()
    copy.thumbnail(size, Image.Resampling.LANCZOS)
    result = Image.new("RGB", size, PANEL)
    result.paste(copy, ((size[0] - copy.width) // 2, (size[1] - copy.height) // 2))
    return result


def contact_comparison() -> None:
    cell_w, cell_h = 360, 360
    header_h, footer_h = 72, 38
    canvas = Image.new("RGB", (cell_w * 5, header_h + cell_h + footer_h), BG)
    draw = ImageDraw.Draw(canvas)
    for index, (variant_id, label) in enumerate(VARIANTS):
        x = index * cell_w
        draw.rectangle((x + 2, 2, x + cell_w - 2, canvas.height - 2), fill=PANEL)
        draw.text((x + 16, 16), label, fill=TEXT, font=font(20, bold=True))
        draw.text((x + 16, 44), "contact frame 16", fill=AMBER, font=font(15))
        image = fit(load_frame(variant_id, CONTACT_FRAME), (cell_w, cell_h))
        canvas.paste(image, (x, header_h))
        draw.text((x + 16, header_h + cell_h + 8), "review only - not wired", fill=MUTED, font=font(14))
    canvas.save(ROOT / "five-approach-contact-comparison.png", optimize=True)


def motion_sheet() -> None:
    label_w, cell = 260, 220
    title_h, row_h = 70, 256
    width = label_w + cell * len(SHEET_FRAMES)
    height = title_h + row_h * len(VARIANTS)
    canvas = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(canvas)
    draw.text((22, 16), "Ground strike body follow - five review approaches", fill=TEXT, font=font(28, bold=True))
    for column, frame_value in enumerate(SHEET_FRAMES):
        draw.text((label_w + column * cell + 78, 43), f"f{frame_value}", fill=AMBER if frame_value == 16 else MUTED, font=font(15, bold=frame_value == 16))
    for row, (variant_id, label) in enumerate(VARIANTS):
        y = title_h + row * row_h
        draw.rectangle((0, y, width, y + row_h - 2), fill=PANEL)
        draw.text((20, y + 88), label, fill=TEXT, font=font(20, bold=True))
        draw.text((20, y + 120), "hand contact fixed", fill=AMBER, font=font(15))
        for column, frame_value in enumerate(SHEET_FRAMES):
            image = fit(load_frame(variant_id, frame_value), (cell, cell))
            canvas.paste(image, (label_w + column * cell, y + 24))
            if frame_value == CONTACT_FRAME:
                x0 = label_w + column * cell
                draw.rectangle((x0 + 2, y + 26, x0 + cell - 3, y + 241), outline=AMBER, width=3)
    canvas.save(ROOT / "five-approach-motion-sheet.png", optimize=True)


def variant_strips_and_gifs() -> None:
    for variant_id, label in VARIANTS:
        frame_paths = sorted((ROOT / variant_id / "frames").glob("frame_*.png"))
        frames = [Image.open(path).convert("RGB") for path in frame_paths]
        if not frames:
            continue

        thumb = 260
        columns = 3
        rows = (len(frames) + columns - 1) // columns
        header = 58
        strip = Image.new("RGB", (thumb * columns, header + thumb * rows), BG)
        draw = ImageDraw.Draw(strip)
        draw.text((16, 14), label, fill=TEXT, font=font(24, bold=True))
        for index, (path, frame_image) in enumerate(zip(frame_paths, frames)):
            x = (index % columns) * thumb
            y = header + (index // columns) * thumb
            strip.paste(fit(frame_image, (thumb, thumb)), (x, y))
            draw.text((x + 10, y + 10), path.stem.replace("frame_", "f"), fill=AMBER, font=font(14, bold=True))
        strip.save(ROOT / variant_id / "preview-strip.png", optimize=True)

        if len(frames) >= 30:
            gif_frames = [fit(image, (448, 448)).convert("P", palette=Image.Palette.ADAPTIVE, colors=192) for image in frames]
            gif_frames[0].save(
                ROOT / variant_id / f"{variant_id}.gif",
                save_all=True,
                append_images=gif_frames[1:],
                duration=71,
                loop=0,
                disposal=2,
                optimize=False,
            )


def combined_gif() -> None:
    frame_numbers = list(range(1, 35))
    cell = 240
    header = 58
    output_frames = []
    for frame_value in frame_numbers:
        canvas = Image.new("RGB", (cell * len(VARIANTS), header + cell), BG)
        draw = ImageDraw.Draw(canvas)
        for index, (variant_id, label) in enumerate(VARIANTS):
            x = index * cell
            draw.rectangle((x + 1, 1, x + cell - 2, header - 2), fill=PANEL)
            draw.text((x + 10, 10), label, fill=TEXT, font=font(15, bold=True))
            draw.text((x + 10, 34), f"frame {frame_value:02d}", fill=AMBER if frame_value == CONTACT_FRAME else MUTED, font=font(12))
            canvas.paste(fit(load_frame(variant_id, frame_value), (cell, cell)), (x, header))
        output_frames.append(canvas.convert("P", palette=Image.Palette.ADAPTIVE, colors=192))
    output_frames[0].save(
        ROOT / "five-approach-loop-comparison.gif",
        save_all=True,
        append_images=output_frames[1:],
        duration=71,
        loop=0,
        disposal=2,
        optimize=False,
    )


def main() -> None:
    contact_comparison()
    motion_sheet()
    variant_strips_and_gifs()
    combined_gif()
    print(str(ROOT / "five-approach-contact-comparison.png"))
    print(str(ROOT / "five-approach-motion-sheet.png"))
    print(str(ROOT / "five-approach-loop-comparison.gif"))


if __name__ == "__main__":
    main()
