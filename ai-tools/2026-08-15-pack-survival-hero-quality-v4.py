"""Pack the isolated V4 walk and build current/123/155 animated approval proof."""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "values/survivalHeroQualityV4Review.json").read_text(encoding="utf-8"))
V2_CONFIG = json.loads((ROOT / CONFIG["baseConfig"]).read_text(encoding="utf-8"))
OUTPUT = ROOT / CONFIG["outputRoot"]
V2_ROOT = ROOT / V2_CONFIG["outputRoot"]
CELL = CONFIG["comparison"]["packedCellPx"]


def font(size, bold=False):
    path = Path("C:/Windows/Fonts") / ("segoeuib.ttf" if bold else "segoeui.ttf")
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def load(path):
    with Image.open(path) as image:
        return image.convert("RGBA")


def runtime_frames(family):
    sheet = load(ROOT / family["legacySheet"])
    columns = sheet.width // CELL
    start = family.get("legacyFrameStart", 0)
    return [sheet.crop((((start + index) % columns) * CELL, ((start + index) // columns) * CELL,
                        ((start + index) % columns + 1) * CELL, ((start + index) // columns + 1) * CELL))
            for index in range(family["frameCount"])]


def translate(frame, movement):
    result = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    result.alpha_composite(frame, (movement["x"], movement["y"]))
    return result


def scale_frame(frame, scale):
    if scale == 1.0:
        return frame
    size = round(CELL * scale)
    resized = frame.resize((size, size), Image.Resampling.LANCZOS)
    result = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    result.alpha_composite(resized, ((CELL - size) // 2, (CELL - size) // 2))
    return result


def alpha_metrics(authority, candidate):
    a = authority.getchannel("A").point(lambda value: 255 if value >= 8 else 0)
    b = candidate.getchannel("A").point(lambda value: 255 if value >= 8 else 0)
    ap = {index for index, value in enumerate(a.get_flattened_data()) if value}
    bp = {index for index, value in enumerate(b.get_flattened_data()) if value}
    def centroid(points):
        return (sum(index % CELL for index in points) / len(points),
                sum(index // CELL for index in points) / len(points))
    ab, bb = a.getbbox(), b.getbbox()
    return {
        "iou": len(ap & bp) / len(ap | bp),
        "centroidDeltaPx": math.dist(centroid(ap), centroid(bp)),
        "boundsDeltaPx": max(abs(ab[i] - bb[i]) for i in range(4)),
    }


def saturated_green_pixels(frame):
    return sum(1 for red, green, blue, alpha in frame.get_flattened_data()
               if alpha > 16 and green > 80 and green > red * 1.25 and green > blue * 1.20)


def detail_crop(frame, box):
    return frame.crop(box).resize((250, 210), Image.Resampling.LANCZOS)


def review_frame(label, index, current, v4, crop_box, metrics):
    canvas = Image.new("RGB", (1600, 900), (7, 11, 16))
    draw = ImageDraw.Draw(canvas)
    draw.text((28, 18), "V4 HERO-QUALITY RECONSTRUCTION", font=font(30, True), fill=(239, 240, 235))
    draw.text((28, 62), f"{label}  |  frame {index:02d}", font=font(18, True), fill=(225, 188, 105))
    columns = (
        (30, "CURRENT RUNTIME 123 PX", current, current, (160, 179, 190)),
        (545, "V4 REBUILD 123 PX", v4, v4, (100, 220, 172)),
        (1060, "V4 REBUILD 155 PX", v4, v4, (121, 190, 255)),
    )
    runtime_sizes = (123, 123, 155)
    for column, (left, label, source, crop_source, color) in enumerate(columns):
        draw.text((left, 106), label, font=font(17, True), fill=color)
        enlarged = source.resize((480, 480), Image.Resampling.LANCZOS)
        canvas.paste(enlarged, (left, 140), enlarged)
        draw.rectangle((left, 140, left + 480, 620), outline=(48, 66, 77), width=2)
        size = runtime_sizes[column]
        runtime = source.resize((size, size), Image.Resampling.LANCZOS)
        canvas.paste(runtime, (left, 657), runtime)
        crop = detail_crop(crop_source, crop_box)
        canvas.paste(crop, (left + 190, 650), crop)
    draw.text((28, 835), "native runtime-scale playback + fixed upper-body detail crop", font=font(14), fill=(157, 173, 182))
    draw.text((28, 864),
              f"exact body action + registration | ORM channels rebuilt | IoU {metrics['iou']:.4f} | centroid {metrics['centroidDeltaPx']:.2f}px",
              font=font(14), fill=(157, 173, 182))
    return canvas


def main():
    contract = json.loads((V2_ROOT / "contract-report.json").read_text(encoding="utf-8"))
    report = {
        "version": CONFIG["version"], "reviewOnly": True, "productionChanged": False,
        "bodyMotionChanged": False, "facingChanged": False, "subdivisionAdded": False,
        "families": {},
    }
    combined_frames = []
    combined_durations = []
    for family_id in CONFIG["actionReview"]["order"]:
        render_report = OUTPUT / "raw-2048" / family_id / "render-report.json"
        if not render_report.is_file():
            continue
        family = V2_CONFIG["families"][family_id]
        review_config = CONFIG["actionReview"]["families"][family_id]
        movements = contract["families"][family_id]["rigidRootTranslations"]
        current = runtime_frames(family)
        v4 = []
        packed = OUTPUT / "packed-256" / family_id
        packed.mkdir(parents=True, exist_ok=True)
        start = family.get("candidateFrameStart", 0)
        for target_index, source_index in enumerate(range(start, start + family["frameCount"])):
            raw = load(OUTPUT / "raw-2048" / family_id / f"frame-{source_index:03d}.png")
            candidate = raw.resize((CELL, CELL), Image.Resampling.LANCZOS)
            candidate = scale_frame(candidate, family.get("renderScale", 1.0))
            if family.get("mirror"):
                candidate = candidate.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            candidate = translate(candidate, movements[target_index])
            candidate.save(packed / f"frame-{target_index:03d}.png", optimize=True)
            v4.append(candidate)
        all_bounds = [frame.getchannel("A").getbbox() for frame in current + v4]
        union = (min(box[0] for box in all_bounds), min(box[1] for box in all_bounds),
                 max(box[2] for box in all_bounds), max(box[3] for box in all_bounds))
        left, top, right, bottom = union
        crop_box = (max(0, left - 8), max(0, top - 8), min(CELL, right + 8),
                    min(CELL, round(top + (bottom - top) * 0.63)))
        metrics = [alpha_metrics(authority, candidate) for authority, candidate in zip(current, v4)]
        review = [review_frame(review_config["label"], index, current[index], v4[index], crop_box, metrics[index])
                  for index in range(family["frameCount"])]
        preview = OUTPUT / review_config["output"]
        duration = round(1000 / family["fps"])
        review[0].save(preview, save_all=True, append_images=review[1:],
                       duration=duration, loop=0, optimize=True, disposal=2)
        combined_frames.extend(review)
        combined_durations.extend([duration] * len(review))
        report["families"][family_id] = {
            "frames": len(review), "fps": family["fps"], "currentRuntimeSheet": family["legacySheet"],
            "minimumAlphaIou": min(value["iou"] for value in metrics),
            "maximumCentroidDeltaPx": max(value["centroidDeltaPx"] for value in metrics),
            "maximumBoundsDeltaPx": max(value["boundsDeltaPx"] for value in metrics),
            "saturatedGreenPixels": max(saturated_green_pixels(frame) for frame in v4),
            "preview": str(preview),
        }
    if combined_frames:
        combined = OUTPUT / CONFIG["actionReview"]["combinedOutput"]
        combined_frames[0].save(combined, save_all=True, append_images=combined_frames[1:],
                                duration=combined_durations, loop=0, optimize=True, disposal=2)
        report["combinedPreview"] = str(combined)
    (OUTPUT / "comparison-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"SURVIVAL_HERO_V4_PACK_OK output={OUTPUT}")


if __name__ == "__main__":
    main()
