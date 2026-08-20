"""Pack the V3.2 representative loop and produce an animated review proof."""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "values/survivalMicrodetailSecondaryV32Review.json").read_text(encoding="utf-8"))
V2_CONFIG = json.loads((ROOT / "values/survivalMeshQualityV2Review.json").read_text(encoding="utf-8"))
OUTPUT = ROOT / CONFIG["outputRoot"]
V2_ROOT = ROOT / CONFIG["v21Root"]
CELL = CONFIG["packedFrameSizePx"]
FAMILY_ID = "walk"


def font(size, bold=False):
    path = Path("C:/Windows/Fonts") / ("segoeuib.ttf" if bold else "segoeui.ttf")
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def load(path):
    with Image.open(path) as image:
        return image.convert("RGBA")


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


def alpha_stats(authority, candidate):
    a = authority.getchannel("A").point(lambda value: 255 if value >= 8 else 0)
    b = candidate.getchannel("A").point(lambda value: 255 if value >= 8 else 0)
    a_pixels = set(index for index, value in enumerate(a.get_flattened_data()) if value)
    b_pixels = set(index for index, value in enumerate(b.get_flattened_data()) if value)
    intersection = len(a_pixels & b_pixels)
    union = len(a_pixels | b_pixels)
    def centroid(points):
        return (sum(index % CELL for index in points) / len(points),
                sum(index // CELL for index in points) / len(points))
    ca, cb = centroid(a_pixels), centroid(b_pixels)
    return {
        "iou": intersection / union,
        "centroidDeltaPx": math.dist(ca, cb),
        "authorityBounds": a.getbbox(),
        "candidateBounds": b.getbbox(),
    }


def upper_crop(frame, box):
    return frame.crop(box).resize((260, 220), Image.Resampling.LANCZOS)


def review_frame(index, base, candidate, crop_box, stats):
    canvas = Image.new("RGB", (1200, 840), (7, 11, 16))
    draw = ImageDraw.Draw(canvas)
    draw.text((28, 18), "V3.2 REAL DETAIL + SECONDARY MOTION", font=font(28, True), fill=(239, 240, 235))
    draw.text((28, 58), f"WALK  |  frame {index:02d}", font=font(18, True), fill=(225, 188, 105))
    columns = ((40, "V2.1 APPROVED LOOK", base, (160, 179, 190)),
               (630, "V3.2 MICRODETAIL + FABRIC/HAIR", candidate, (100, 220, 172)))
    for left, label, source, color in columns:
        draw.text((left, 98), label, font=font(17, True), fill=color)
        enlarged = source.resize((500, 500), Image.Resampling.LANCZOS)
        canvas.paste(enlarged, (left, 132), enlarged)
        draw.rectangle((left, 132, left + 500, 632), outline=(48, 66, 77), width=2)
        runtime = source.resize((123, 123), Image.Resampling.LANCZOS)
        canvas.paste(runtime, (left, 660), runtime)
        zoom = upper_crop(source, crop_box)
        canvas.paste(zoom, (left + 170, 660), zoom)
    draw.text((177, 787), "123 px runtime", font=font(13), fill=(157, 173, 182))
    draw.text((420, 787), "upper-body detail zoom", font=font(13), fill=(157, 173, 182))
    draw.text((28, 815),
              f"same body action + anchors | secondary only | alpha IoU {stats['iou']:.4f} | centroid {stats['centroidDeltaPx']:.2f}px",
              font=font(13), fill=(157, 173, 182))
    return canvas


def main():
    family = V2_CONFIG["families"][FAMILY_ID]
    contract = json.loads((V2_ROOT / "contract-report.json").read_text(encoding="utf-8"))
    movements = contract["families"][FAMILY_ID]["rigidRootTranslations"]
    base_frames = []
    candidate_frames = []
    packed = OUTPUT / "packed-256" / FAMILY_ID
    packed.mkdir(parents=True, exist_ok=True)
    for index in range(family["frameCount"]):
        base = load(V2_ROOT / "packed-256" / FAMILY_ID / f"frame-{index:03d}.png")
        raw = load(OUTPUT / "raw-2048" / FAMILY_ID / f"frame-{index:03d}.png")
        candidate = raw.resize((CELL, CELL), Image.Resampling.LANCZOS)
        candidate = scale_frame(candidate, family.get("renderScale", 1.0))
        if family.get("mirror"):
            candidate = ImageOps.mirror(candidate)
        candidate = translate(candidate, movements[index])
        candidate.save(packed / f"frame-{index:03d}.png", optimize=True)
        base_frames.append(base)
        candidate_frames.append(candidate)
    union = None
    for frame in base_frames + candidate_frames:
        bounds = frame.getchannel("A").getbbox()
        if bounds:
            union = bounds if union is None else (
                min(union[0], bounds[0]), min(union[1], bounds[1]),
                max(union[2], bounds[2]), max(union[3], bounds[3]))
    left, top, right, bottom = union
    height = bottom - top
    crop_box = (max(0, left - 8), max(0, top - 8), min(CELL, right + 8), min(CELL, round(top + height * 0.61)))
    stats = [alpha_stats(base, candidate) for base, candidate in zip(base_frames, candidate_frames)]
    review = [review_frame(index, base, candidate, crop_box, stats[index])
              for index, (base, candidate) in enumerate(zip(base_frames, candidate_frames))]
    output_gif = OUTPUT / "v2-1-vs-v3-2-microdetail-secondary.gif"
    review[0].save(output_gif, save_all=True, append_images=review[1:],
                   duration=round(1000 / family["fps"]), loop=0, optimize=True, disposal=2)
    report = {
        "version": CONFIG["version"],
        "reviewOnly": True,
        "productionChanged": False,
        "family": FAMILY_ID,
        "frames": len(review),
        "fps": family["fps"],
        "bodyActionChanged": False,
        "subdivisionAdded": False,
        "alpha": {
            "minimumIou": min(value["iou"] for value in stats),
            "maximumCentroidDeltaPx": max(value["centroidDeltaPx"] for value in stats),
        },
        "preview": str(output_gif),
    }
    (OUTPUT / "comparison-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"SURVIVAL_MICRODETAIL_V32_PACK_OK output={output_gif}")


if __name__ == "__main__":
    main()
