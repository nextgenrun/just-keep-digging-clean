"""Build an animated fixed-cell before/after animation contract review."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads(
    (ROOT / "values/survivalAnimationContractRepairReview.json").read_text(encoding="utf-8")
)
FRAME = CONFIG["frameSizePx"]
WIDTH = CONFIG["canvasWidthPx"]
HEIGHT = CONFIG["canvasHeightPx"]
CELL = CONFIG["previewCellSizePx"]
OUTPUT = ROOT / CONFIG["output"]
BEFORE = ROOT / CONFIG["beforeRoot"]


def font(size: int, bold: bool = False):
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def load_frames(path: Path, first: int, last: int):
    with Image.open(path) as source:
        sheet = source.convert("RGBA")
    columns = sheet.width // FRAME
    return [
        sheet.crop((
            (index % columns) * FRAME,
            (index // columns) * FRAME,
            (index % columns + 1) * FRAME,
            (index // columns + 1) * FRAME,
        ))
        for index in range(first, last + 1)
    ]


def base_canvas(label: str):
    canvas = Image.new("RGB", (WIDTH, HEIGHT), (7, 11, 16))
    draw = ImageDraw.Draw(canvas)
    draw.text((28, 18), "ANIMATION CONTRACT REPAIR V2", font=font(28, True), fill=(238, 239, 234))
    draw.text((28, 56), label, font=font(19, True), fill=(230, 190, 105))
    draw.text((28, 91), "BEFORE - REJECTED QUALITY V1", font=font(17, True), fill=(235, 128, 122))
    draw.text((518, 91), "AFTER - RESTORED MOTION AUTHORITY", font=font(17, True), fill=(108, 216, 171))
    draw.text((28, 558), "Fixed source-cell scale: drift, clipping and facing are not hidden by per-frame fitting.",
              font=font(15), fill=(157, 171, 181))
    return canvas


def draw_cell(canvas: Image.Image, frame: Image.Image, left: int, grounded: bool):
    top = 130
    scaled = frame.resize((CELL, CELL), Image.Resampling.LANCZOS)
    canvas.paste(scaled, (left, top), scaled)
    draw = ImageDraw.Draw(canvas)
    scale = CELL / FRAME
    center_x = left + round(128 * scale)
    baseline_y = top + round(248 * scale)
    draw.rectangle((left, top, left + CELL, top + CELL), outline=(50, 67, 77), width=2)
    draw.line((center_x, top, center_x, top + CELL), fill=(195, 83, 181), width=2)
    if grounded:
        draw.line((left, baseline_y, left + CELL, baseline_y), fill=(221, 153, 68), width=2)
        half_body = 31 * scale / 2
        body_top = baseline_y - 75 * scale
        draw.rectangle(
            (center_x - half_body, body_top, center_x + half_body, baseline_y),
            outline=(71, 193, 218), width=2,
        )
    else:
        center_y = top + round(135 * scale)
        draw.line((left, center_y, left + CELL, center_y), fill=(71, 193, 218), width=2)


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    rendered = []
    duration = round(1000 / CONFIG["fps"])
    for family in CONFIG["families"]:
        first, last = family["frames"]
        before = load_frames(BEFORE / family["path"], first, last)
        after = load_frames(ROOT / family["path"], first, last)
        count = max(len(before), len(after))
        repeats = max(1, round(CONFIG["fps"] * 1.35 / count))
        for index in range(count):
            canvas = base_canvas(family["label"])
            grounded = not family["label"].startswith("FLIGHT")
            draw_cell(canvas, before[index % len(before)], 55, grounded)
            draw_cell(canvas, after[index % len(after)], 545, grounded)
            draw = ImageDraw.Draw(canvas)
            draw.text((458, 300), "VS", font=font(22, True), fill=(205, 207, 201))
            draw.text((55, 530), f"frame {first + index:02d}", font=font(14), fill=(155, 166, 173))
            for _ in range(repeats):
                rendered.append(canvas.copy())
    target = OUTPUT / "before-vs-after-fixed-cell.gif"
    rendered[0].save(
        target,
        save_all=True,
        append_images=rendered[1:],
        duration=duration,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(f"ANIMATION_CONTRACT_REPAIR_REVIEW_OK {target} frames={len(rendered)}")


if __name__ == "__main__":
    main()
