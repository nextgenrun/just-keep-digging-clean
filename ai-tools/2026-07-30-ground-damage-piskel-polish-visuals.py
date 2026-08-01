"""Build visual QA boards for the review-only ground-damage Piskel polish."""

from __future__ import annotations

import math
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
FAMILY_NAMES = (
    "diagonal-fracture",
    "reverse-shear",
    "horizontal-shear",
    "vertical-pressure",
    "stress-arc",
    "hooked-fault",
    "double-kink",
    "staggered-shear",
    "abrasion-first",
    "compression-crescents",
)
MATERIALS = (
    ("town earth", "sprites/backgrounds/world-visual-v2/materials/town-dark-earth-v1.png"),
    ("shallow blue", "sprites/backgrounds/world-scenic-facade-v1/level1-shallow-blue-seamless.webp"),
    ("amber crystal", "sprites/backgrounds/world-scenic-facade-v1/level1-amber-crystal-seamless.webp"),
    ("obsidian", "sprites/backgrounds/world-scenic-facade-v1/level2-obsidian-ember-seamless.webp"),
)


def _font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def _native(frame: Image.Image) -> Image.Image:
    return frame.resize((94, 94), Image.Resampling.LANCZOS)


def _checker(frame: Image.Image, size: int = 94) -> Image.Image:
    cell = Image.new("RGBA", (size, size), (15, 20, 28, 255))
    draw = ImageDraw.Draw(cell)
    pivot = size // 2
    draw.line((pivot, pivot - 8, pivot, pivot + 8), fill=(116, 54, 78, 255))
    draw.line((pivot - 8, pivot, pivot + 8, pivot), fill=(116, 54, 78, 255))
    decal = frame.resize((size, size), Image.Resampling.LANCZOS)
    cell.alpha_composite(decal)
    return cell.convert("RGB")


def build_before_after(
    originals: list[list[Image.Image]],
    polished: list[list[Image.Image]],
    output: Path,
) -> Path:
    label_width = 238
    header_height = 76
    row_height = 94
    canvas = Image.new("RGB", (label_width + 12 * 94, header_height + 10 * row_height * 2), "#080b10")
    draw = ImageDraw.Draw(canvas)
    draw.text((18, 12), "GROUND DAMAGE - PISKEL POLISHED AT 94 PX", fill="#f4dfb9", font=_font(28, True))
    draw.text(
        (18, 45),
        "V1 source versus fixed-seed editable polish; magenta crosshair is the invariant tile center.",
        fill="#aeb9c8",
        font=_font(15),
    )
    for state in range(12):
        draw.text((label_width + state * 94 + 38, 53), str(state + 1), fill="#d2dae5", font=_font(13, True))
    for variant, family in enumerate(FAMILY_NAMES):
        top = header_height + variant * row_height * 2
        draw.text((14, top + 35), f"{variant + 1:02d} {family}", fill="#e6ebf1", font=_font(15, True))
        draw.text((164, top + 18), "BEFORE", fill="#d7907b", font=_font(12, True))
        draw.text((164, top + row_height + 18), "POLISHED", fill="#79cba8", font=_font(12, True))
        for row, frames in enumerate((originals[variant], polished[variant])):
            for state, frame in enumerate(frames):
                canvas.paste(_checker(frame), (label_width + state * 94, top + row * row_height))
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, "PNG", optimize=True)
    return output


def _material_tile(path: Path, sample: int) -> Image.Image:
    source = Image.open(path).convert("RGB")
    crop = min(source.width, source.height, 512)
    left = (sample * 173) % max(1, source.width - crop + 1)
    top = (sample * 97) % max(1, source.height - crop + 1)
    return ImageOps.fit(
        source.crop((left, top, left + crop, top + crop)),
        (94, 94),
        method=Image.Resampling.LANCZOS,
    ).convert("RGBA")


def _context(ground: Image.Image, frame: Image.Image, display_px: int) -> Image.Image:
    native = Image.new("RGBA", (282, 282), (0, 0, 0, 255))
    for y in range(3):
        for x in range(3):
            native.alpha_composite(ground, (x * 94, y * 94))
    native.alpha_composite(_native(frame), (94, 94))
    return native.resize((display_px * 3, display_px * 3), Image.Resampling.LANCZOS).convert("RGB")


def build_material_proof(
    originals: list[list[Image.Image]],
    polished: list[list[Image.Image]],
    output: Path,
) -> Path:
    scales = ((94, "1.0x / 1280x720"), (141, "1.5x / 1920x1080"), (188, "2.0x / 2560x1440"))
    stages = (3, 7, 11)
    label_width = 220
    column_width = 188 * 6 + 34
    header_height = 82
    row_height = 188 * 3 + 58
    canvas = Image.new("RGB", (label_width + 3 * column_width + 20, header_height + 3 * row_height), "#070a0f")
    draw = ImageDraw.Draw(canvas)
    draw.text((18, 12), "ACTUAL 94 PX TILE PLACEMENT - MATERIAL & RESOLUTION PROOF", fill="#f4dfb9", font=_font(28, True))
    draw.text((18, 47), "Logical size and center stay fixed; display density changes backing sharpness only.", fill="#aeb9c8", font=_font(15))
    focus = (0, 3, 9)
    for row, ((display_px, density), family) in enumerate(zip(scales, focus)):
        y = header_height + row * row_height
        material_name, material_path = MATERIALS[row]
        draw.multiline_text((18, y + 18), f"{density}\nF{family + 1:02d} {material_name}\n{display_px}px physical tile", fill="#e6ebf1", font=_font(16, True), spacing=5)
        ground = _material_tile(ROOT / material_path, row)
        for column, state in enumerate(stages):
            x = label_width + column * column_width
            before = _context(ground, originals[family][state], display_px)
            after = _context(ground, polished[family][state], display_px)
            canvas.paste(before, (x, y + 28))
            canvas.paste(after, (x + display_px * 3 + 18, y + 28))
            draw.text((x, y + 6), f"STATE {state + 1} BEFORE", fill="#d7907b", font=_font(11, True))
            draw.text((x + display_px * 3 + 18, y + 6), "PISKEL POLISHED", fill="#79cba8", font=_font(11, True))
    canvas.save(output, "PNG", optimize=True)
    return output


def build_anchor_overlay(
    originals: list[list[Image.Image]],
    polished: list[list[Image.Image]],
    output: Path,
) -> Path:
    panel_w, panel_h = 430, 220
    canvas = Image.new("RGB", (860, math.ceil(10 / 2) * panel_h + 62), "#080b10")
    draw = ImageDraw.Draw(canvas)
    draw.text((18, 12), "SEQUENCE REGISTRATION - FIXED SEED & CUMULATIVE SUPPORT", fill="#f4dfb9", font=_font(26, True))
    colors = ((92, 180, 255, 30), (122, 232, 183, 32), (245, 204, 100, 34), (243, 126, 116, 38))
    for variant, family in enumerate(FAMILY_NAMES):
        left = (variant % 2) * panel_w
        top = 62 + (variant // 2) * panel_h
        draw.text((left + 12, top + 8), f"{variant + 1:02d} {family}", fill="#e5ebf2", font=_font(15, True))
        for side, frames in enumerate((originals[variant], polished[variant])):
            panel = Image.new("RGBA", (188, 188), (12, 16, 23, 255))
            for state, frame in enumerate(frames):
                alpha = frame.getchannel("A").point(lambda value: 54 if value > 12 else 0)
                layer = Image.new("RGBA", (188, 188), colors[state // 3])
                layer.putalpha(alpha)
                panel = Image.alpha_composite(panel, layer)
            overlay = ImageDraw.Draw(panel)
            overlay.line((94, 82, 94, 106), fill=(255, 82, 146, 255))
            overlay.line((82, 94, 106, 94), fill=(255, 82, 146, 255))
            x = left + 16 + side * 204
            canvas.paste(panel.convert("RGB"), (x, top + 34))
            draw.text((x + 56, top + 198), "BEFORE" if side == 0 else "POLISHED", fill="#d7907b" if side == 0 else "#79cba8", font=_font(11, True))
    canvas.save(output, "PNG", optimize=True)
    return output


def build_focus_proof(
    baseline: list[list[Image.Image]],
    polished: list[list[Image.Image]],
    reports: list[dict[str, Any]],
    output: Path,
) -> Path:
    focus = (0, 3, 4, 5, 9)
    stages = (3, 4, 7, 8, 11)
    label = 260
    canvas = Image.new("RGB", (label + len(stages) * 188, 64 + len(focus) * 376), "#080b10")
    draw = ImageDraw.Draw(canvas)
    draw.text((16, 12), "HIGH-RISK FAMILY POLISH - SLICING, SCALE & DEBRIS SUPPRESSION", fill="#f4dfb9", font=_font(25, True))
    for row, variant in enumerate(focus):
        top = 64 + row * 376
        report = reports[variant]
        removed = len(report["polish"]["componentAudit"]["removedComponents"])
        draw.multiline_text(
            (12, top + 18),
            f"F{variant + 1:02d} {FAMILY_NAMES[variant]}\ncrop x={report['sourceCropLeftPx']}\n"
            f"scale {report['registeredSharedScale']:.4f} -> {report['sharedScale']:.4f}\n"
            f"removed bleed/dust: {removed}",
            fill="#e6ebf1",
            font=_font(14, True),
            spacing=4,
        )
        draw.text((182, top + 18), "ANCHOR V2", fill="#d7907b", font=_font(11, True))
        draw.text((182, top + 206), "PISKEL", fill="#79cba8", font=_font(11, True))
        for column, state in enumerate(stages):
            x = label + column * 188
            canvas.paste(_checker(baseline[variant][state], 188), (x, top))
            canvas.paste(_checker(polished[variant][state], 188), (x, top + 188))
    canvas.save(output, "PNG", optimize=True)
    return output


def build_all(
    originals: list[list[Image.Image]],
    baseline: list[list[Image.Image]],
    polished: list[list[Image.Image]],
    reports: list[dict[str, Any]],
    output_root: Path,
) -> list[Path]:
    output_root.mkdir(parents=True, exist_ok=True)
    return [
        build_before_after(originals, polished, output_root / "01-before-after-native-scale.png"),
        build_material_proof(originals, polished, output_root / "02-resolution-material-placement-proof.png"),
        build_anchor_overlay(originals, polished, output_root / "03-sequence-registration-overlay.png"),
        build_focus_proof(baseline, polished, reports, output_root / "04-high-risk-piskel-polish-proof.png"),
    ]
