"""Build review-only V2.1 versus V3 animated Survival comparisons."""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "values/survivalMeshQualityV3Review.json").read_text(encoding="utf-8"))
V2_CONFIG = json.loads((ROOT / CONFIG["sourceConfig"]).read_text(encoding="utf-8"))
SOURCE = ROOT / CONFIG["sourceRoot"] / "packed-256"
OUTPUT = ROOT / CONFIG["outputRoot"]
CELL = CONFIG["cellSizePx"]


def font(size, bold=False):
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def load_family(family_id, count):
    frames = []
    for index in range(count):
        with Image.open(SOURCE / family_id / f"frame-{index:03d}.png") as image:
            frames.append(image.convert("RGBA"))
    return frames


def tone_lut():
    grade = CONFIG["grade"]
    black, white, gamma = grade["blackPoint"], grade["whitePoint"], grade["midtoneGamma"]
    result = []
    for value in range(256):
        normalized = max(0.0, min(1.0, (value - black) / max(1, white - black)))
        result.append(round((normalized ** gamma) * 255))
    return result


def grade_frame(frame):
    grade = CONFIG["grade"]
    alpha = frame.getchannel("A")
    rgb = frame.convert("RGB")
    rgb = ImageEnhance.Color(rgb).enhance(grade["saturation"])
    rgb = ImageEnhance.Contrast(rgb).enhance(grade["contrast"])
    rgb = ImageEnhance.Brightness(rgb).enhance(grade["brightness"])
    rgb = rgb.point(tone_lut() * 3)
    rgb = rgb.filter(ImageFilter.UnsharpMask(
        radius=grade["localContrastRadiusPx"],
        percent=grade["localContrastPercent"],
        threshold=grade["localContrastThreshold"],
    ))
    rgb = rgb.filter(ImageFilter.UnsharpMask(
        radius=grade["crispRadiusPx"],
        percent=grade["crispPercent"],
        threshold=grade["crispThreshold"],
    ))
    result = rgb.convert("RGBA")
    result.putalpha(alpha)
    return result


def preview_frame(family_id, index, v2, v3):
    preview = CONFIG["preview"]
    width, height = preview["canvasWidthPx"], preview["canvasHeightPx"]
    size = preview["inspectionSizePx"]
    canvas = Image.new("RGB", (width, height), (7, 11, 16))
    draw = ImageDraw.Draw(canvas)
    draw.text((28, 18), "SURVIVAL QUALITY  V2.1  vs  V3", font=font(28, True), fill=(239, 240, 235))
    draw.text((28, 58), f"{family_id.upper()}  |  frame {index:02d}", font=font(18, True), fill=(225, 188, 105))
    draw.text((55, 98), "V2.1 MOTION-LOCKED", font=font(17, True), fill=(160, 179, 190))
    draw.text((545, 98), "V3 CRISP MATERIAL GRADE", font=font(17, True), fill=(100, 220, 172))
    for left, source in ((55, v2), (545, v3)):
        enlarged = source.resize((size, size), Image.Resampling.LANCZOS)
        canvas.paste(enlarged, (left, 132), enlarged)
        draw.rectangle((left, 132, left + size, 132 + size), outline=(48, 66, 77), width=2)
    runtime = CONFIG["runtimeDisplaySizePx"]
    draw.text((28, 550), f"TRUE RUNTIME SCALE  {runtime} PX", font=font(15, True), fill=(225, 188, 105))
    for left, source in ((194, v2), (684, v3)):
        small = source.resize((runtime, runtime), Image.Resampling.LANCZOS)
        canvas.paste(small, (left, 580), small)
        draw.rectangle((left, 580, left + runtime, 580 + runtime), outline=(48, 66, 77), width=1)
    grade = CONFIG["grade"]
    summary = (
        f"RGB only | alpha + frames + anchors identical | saturation {grade['saturation']:.2f}x | "
        f"contrast {grade['contrast']:.2f}x | crisp {grade['crispPercent']}%"
    )
    draw.text((28, 726), summary, font=font(14), fill=(157, 173, 182))
    return canvas


def save_gif(path, frames, durations):
    frames[0].save(
        path, save_all=True, append_images=frames[1:], duration=durations,
        loop=0, optimize=True, disposal=2,
    )


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    combined, combined_durations = [], []
    report = {
        "version": CONFIG["version"], "reviewOnly": True,
        "productionChanged": False, "grade": CONFIG["grade"], "families": {},
    }
    for family_id, family in V2_CONFIG["families"].items():
        v2_frames = load_family(family_id, family["frameCount"])
        v3_frames = [grade_frame(frame) for frame in v2_frames]
        assert all(
            old.getchannel("A").tobytes() == new.getchannel("A").tobytes()
            for old, new in zip(v2_frames, v3_frames)
        )
        family_output = OUTPUT / "v3-frames" / family_id
        family_output.mkdir(parents=True, exist_ok=True)
        review = []
        for index, (v2, v3) in enumerate(zip(v2_frames, v3_frames)):
            v3.save(family_output / f"frame-{index:03d}.png", optimize=True)
            review.append(preview_frame(family_id, index, v2, v3))
        duration = round(1000 / family["fps"])
        pattern = CONFIG["nativeOutputPattern"].format(family=family_id)
        save_gif(OUTPUT / pattern, review, duration)
        combined.extend(review)
        combined_durations.extend([duration] * len(review))
        report["families"][family_id] = {
            "frames": len(review), "fps": family["fps"],
            "alphaIdentical": True, "motionChanged": False,
        }
    save_gif(OUTPUT / CONFIG["combinedOutput"], combined, combined_durations)
    (OUTPUT / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"SURVIVAL_MESH_QUALITY_V2_V3_OK output={OUTPUT}")


if __name__ == "__main__":
    main()
