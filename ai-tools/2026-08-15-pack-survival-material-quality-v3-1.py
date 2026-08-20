"""Pack and compare V3.1 real-material renders without changing motion alpha."""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "values/survivalMaterialQualityV31Review.json").read_text(encoding="utf-8"))
V2_CONFIG = json.loads((ROOT / CONFIG["baseConfig"]).read_text(encoding="utf-8"))
V2_ROOT = ROOT / CONFIG["v2Root"]
V3_ROOT = ROOT / CONFIG["rejectedV3Root"]
OUTPUT = ROOT / CONFIG["outputRoot"]
CELL = V2_CONFIG["packedFrameSizePx"]


def font(size, bold=False):
    path = Path("C:/Windows/Fonts") / ("segoeuib.ttf" if bold else "segoeui.ttf")
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def load_frame(path):
    with Image.open(path) as image:
        return image.convert("RGBA")


def scale_frame(frame, scale):
    if scale == 1.0:
        return frame
    size = round(CELL * scale)
    resized = frame.resize((size, size), Image.Resampling.LANCZOS)
    result = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    result.alpha_composite(resized, ((CELL - size) // 2, (CELL - size) // 2))
    return result


def translate(frame, movement):
    result = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    result.alpha_composite(frame, (movement["x"], movement["y"]))
    return result


def minimal_final_pixel(frame):
    settings = CONFIG["finalPixel"]
    alpha = frame.getchannel("A")
    rgb = ImageEnhance.Color(frame.convert("RGB")).enhance(settings["saturation"])
    rgb = ImageEnhance.Contrast(rgb).enhance(settings["contrast"])
    rgb = rgb.filter(ImageFilter.UnsharpMask(
        radius=settings["crispRadiusPx"], percent=settings["crispPercent"],
        threshold=settings["crispThreshold"],
    ))
    result = rgb.convert("RGBA")
    result.putalpha(alpha)
    return result


def alpha_lock(authority, candidate):
    result = candidate.copy()
    result.putalpha(authority.getchannel("A"))
    return result


def candidate_frames(family_id, family, movements):
    start = family.get("candidateFrameStart", 0)
    scale = family.get("renderScale", 1.0)
    result = []
    for target_index, source_index in enumerate(range(start, start + family["frameCount"])):
        raw = load_frame(OUTPUT / "raw-2048" / family_id / f"frame-{source_index:03d}.png")
        frame = raw.resize((CELL, CELL), Image.Resampling.LANCZOS)
        if family.get("mirror"):
            frame = ImageOps.mirror(frame)
        frame = translate(scale_frame(frame, scale), movements[target_index])
        authority = load_frame(V2_ROOT / "packed-256" / family_id / f"frame-{target_index:03d}.png")
        result.append(alpha_lock(authority, minimal_final_pixel(frame)))
    return result


def three_way_frame(family_id, index, v2, rejected, v31):
    canvas = Image.new("RGB", (1500, 760), (7, 11, 16))
    draw = ImageDraw.Draw(canvas)
    draw.text((28, 18), "QUALITY DIRECTION: GRADE vs REAL MATERIAL", font=font(28, True), fill=(239, 240, 235))
    draw.text((28, 58), f"{family_id.upper()}  |  frame {index:02d}", font=font(18, True), fill=(225, 188, 105))
    columns = (
        (30, "V2.1 BASE", v2, (160, 179, 190)),
        (520, "REJECTED V3 CONTRAST", rejected, (220, 132, 118)),
        (1010, "V3.1 REAL MATERIAL", v31, (100, 220, 172)),
    )
    for left, label, source, color in columns:
        draw.text((left, 98), label, font=font(17, True), fill=color)
        enlarged = source.resize((430, 430), Image.Resampling.LANCZOS)
        canvas.paste(enlarged, (left, 132), enlarged)
        draw.rectangle((left, 132, left + 430, 562), outline=(48, 66, 77), width=2)
        runtime = source.resize((123, 123), Image.Resampling.LANCZOS)
        canvas.paste(runtime, (left + 154, 590), runtime)
    draw.text(
        (28, 730), "Same motion + alpha + anchors | V3.1 uses shader/material separation; near-neutral final grade",
        font=font(14), fill=(157, 173, 182),
    )
    return canvas


def main():
    contract = json.loads((V2_ROOT / "contract-report.json").read_text(encoding="utf-8"))
    all_review = []
    report = {"version": CONFIG["version"], "reviewOnly": True, "productionChanged": False, "families": {}}
    for family_id, family in V2_CONFIG["families"].items():
        if not (OUTPUT / "raw-2048" / family_id / "render-report.json").is_file():
            continue
        movements = contract["families"][family_id]["rigidRootTranslations"]
        v31_frames = candidate_frames(family_id, family, movements)
        family_output = OUTPUT / "packed-256" / family_id
        family_output.mkdir(parents=True, exist_ok=True)
        review = []
        for index, v31 in enumerate(v31_frames):
            v2 = load_frame(V2_ROOT / "packed-256" / family_id / f"frame-{index:03d}.png")
            rejected = load_frame(V3_ROOT / "v3-frames" / family_id / f"frame-{index:03d}.png")
            v31.save(family_output / f"frame-{index:03d}.png", optimize=True)
            review.append(three_way_frame(family_id, index, v2, rejected, v31))
        duration = round(1000 / family["fps"])
        review[0].save(
            OUTPUT / CONFIG["threeWayPreviewOutput"], save_all=True,
            append_images=review[1:], duration=duration, loop=0, optimize=True, disposal=2,
        )
        all_review.extend(review)
        report["families"][family_id] = {
            "frames": len(review), "fps": family["fps"], "motionChanged": False,
            "alphaAuthority": str(V2_ROOT / "packed-256" / family_id),
        }
    (OUTPUT / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"SURVIVAL_MATERIAL_V31_PACK_OK output={OUTPUT}")


if __name__ == "__main__":
    main()
