"""Gate, alpha-lock, pack and animate the motion-locked Blender quality v2 review."""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "values/survivalMeshQualityV2Review.json").read_text(encoding="utf-8"))
OUTPUT = ROOT / CONFIG["outputRoot"]
CELL = CONFIG["packedFrameSizePx"]
THRESHOLD = CONFIG["contractGate"]["alphaThreshold"]


def font(size, bold=False):
    path = Path("C:/Windows/Fonts") / ("segoeuib.ttf" if bold else "segoeui.ttf")
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def legacy_frames(path, count, start=0):
    with Image.open(path) as source:
        sheet = source.convert("RGBA")
    columns = sheet.width // CELL
    return [
        sheet.crop(((index % columns) * CELL, (index // columns) * CELL,
                    (index % columns + 1) * CELL, (index // columns + 1) * CELL))
        for index in range(start, start + count)
    ]


def candidate_frames(family_id, family):
    result = []
    start = int(family.get("candidateFrameStart", 0))
    scale = float(family.get("renderScale", 1.0))
    for index in range(start, start + family["frameCount"]):
        path = OUTPUT / "raw-2048" / family_id / f"frame-{index:03d}.png"
        with Image.open(path) as source:
            frame = source.convert("RGBA").resize((CELL, CELL), Image.Resampling.LANCZOS)
        if scale != 1.0:
            scaled_size = max(1, round(CELL * scale))
            scaled = frame.resize((scaled_size, scaled_size), Image.Resampling.LANCZOS)
            frame = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
            frame.alpha_composite(scaled, ((CELL - scaled_size) // 2, (CELL - scaled_size) // 2))
        result.append(ImageOps.mirror(frame) if family.get("mirror") else frame)
    return result


def binary(alpha):
    values = alpha.get_flattened_data() if hasattr(alpha, "get_flattened_data") else alpha.getdata()
    return [value >= THRESHOLD for value in values]


def bounds(mask):
    xs, ys = [], []
    for index, value in enumerate(mask):
        if value:
            xs.append(index % CELL)
            ys.append(index // CELL)
    return (min(xs), min(ys), max(xs) + 1, max(ys) + 1) if xs else (0, 0, 0, 0)


def centroid(mask):
    points = [(index % CELL, index // CELL) for index, value in enumerate(mask) if value]
    if not points:
        return (0.0, 0.0)
    return (sum(x for x, _ in points) / len(points), sum(y for _, y in points) / len(points))


def metrics(old, new):
    old_mask = binary(old.getchannel("A"))
    new_mask = binary(new.getchannel("A"))
    intersection = sum(a and b for a, b in zip(old_mask, new_mask))
    union = sum(a or b for a, b in zip(old_mask, new_mask)) or 1
    old_center, new_center = centroid(old_mask), centroid(new_mask)
    old_bounds, new_bounds = bounds(old_mask), bounds(new_mask)
    return {
        "alphaIou": intersection / union,
        "centroidDeltaPx": math.dist(old_center, new_center),
        "boundsDeltaPx": max(abs(a - b) for a, b in zip(old_bounds, new_bounds)),
        "legacyBounds": old_bounds,
        "candidateBounds": new_bounds,
    }


def rigid_root_align(old, new):
    old_mask = binary(old.getchannel("A"))
    new_mask = binary(new.getchannel("A"))
    old_center, new_center = centroid(old_mask), centroid(new_mask)
    dx = round(old_center[0] - new_center[0])
    dy = round(old_center[1] - new_center[1])
    aligned = Image.new("RGBA", new.size, (0, 0, 0, 0))
    aligned.alpha_composite(new, (dx, dy))
    return aligned, {"x": dx, "y": dy}


def alpha_lock(old, new):
    new_alpha = new.getchannel("A").point(lambda value: 255 if value >= THRESHOLD else 0)
    rgb_source = Image.composite(new, old, new_alpha)
    rgb_source.putalpha(old.getchannel("A"))
    return rgb_source


def pack_sheet(frames, columns=12):
    rows = math.ceil(len(frames) / columns)
    sheet = Image.new("RGBA", (columns * CELL, rows * CELL), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, ((index % columns) * CELL, (index // columns) * CELL))
    return sheet


def review_frame(label, index, old, candidate, frame_metrics, translation):
    preview = CONFIG["preview"]
    width, height, cell = preview["canvasWidthPx"], preview["canvasHeightPx"], preview["cellSizePx"]
    canvas = Image.new("RGB", (width, height), (7, 11, 16))
    draw = ImageDraw.Draw(canvas)
    draw.text((28, 18), CONFIG["previewTitle"], font=font(28, True), fill=(239, 240, 235))
    draw.text((28, 58), f"{label.upper()}  |  frame {index:02d}", font=font(18, True), fill=(225, 188, 105))
    draw.text((55, 98), "CURRENT RESTORED", font=font(17, True), fill=(160, 179, 190))
    draw.text((545, 98), CONFIG["candidateLabel"], font=font(17, True), fill=(100, 220, 172))
    for left, source in ((55, old), (545, candidate)):
        scaled = source.resize((cell, cell), Image.Resampling.LANCZOS)
        canvas.paste(scaled, (left, 132), scaled)
        center = left + round(128 * cell / CELL)
        draw.rectangle((left, 132, left + cell, 132 + cell), outline=(48, 66, 77), width=2)
        draw.line((center, 132, center, 132 + cell), fill=(191, 78, 180), width=2)
    runtime_size = CONFIG["previewDisplaySizePx"]
    draw.text((28, 550), f"TRUE RUNTIME SCALE  {runtime_size} PX", font=font(15, True), fill=(225, 188, 105))
    for left, source in ((194, old), (684, candidate)):
        runtime = source.resize((runtime_size, runtime_size), Image.Resampling.LANCZOS)
        canvas.paste(runtime, (left, 580), runtime)
        draw.rectangle(
            (left, 580, left + runtime_size, 580 + runtime_size),
            outline=(48, 66, 77), width=1,
        )
    draw.text(
        (28, 726),
        f"Rigid root {translation['x']:+d},{translation['y']:+d}px | gate IoU {frame_metrics['alphaIou']:.3f} | centroid {frame_metrics['centroidDeltaPx']:.2f}px | bounds {frame_metrics['boundsDeltaPx']}px",
        font=font(14), fill=(157, 173, 182),
    )
    return canvas


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    report = {"version": CONFIG["version"], "reviewOnly": True, "productionChanged": False, "families": {}}
    review = []
    for family_id, family in CONFIG["families"].items():
        old = legacy_frames(
            ROOT / family["legacySheet"], family["frameCount"], family.get("legacyFrameStart", 0),
        )
        rendered = candidate_frames(family_id, family)
        raw_metrics = [metrics(a, b) for a, b in zip(old, rendered)]
        aligned_and_translation = [rigid_root_align(a, b) for a, b in zip(old, rendered)]
        aligned = [item[0] for item in aligned_and_translation]
        translations = [item[1] for item in aligned_and_translation]
        frame_metrics = [metrics(a, b) for a, b in zip(old, aligned)]
        gate = CONFIG["contractGate"]
        passed = all(
            item["alphaIou"] >= gate["minimumAlphaIou"]
            and item["centroidDeltaPx"] <= gate["maximumCentroidDeltaPx"]
            and item["boundsDeltaPx"] <= gate["maximumBoundsDeltaPx"]
            for item in frame_metrics
        )
        locked = [alpha_lock(a, b) for a, b in zip(old, aligned)]
        family_root = OUTPUT / "packed-256" / family_id
        family_root.mkdir(parents=True, exist_ok=True)
        for index, frame in enumerate(locked):
            frame.save(family_root / f"frame-{index:03d}.png", optimize=True)
            review.append(review_frame(
                family_id, index, old[index], frame, frame_metrics[index], translations[index],
            ))
        pack_sheet(locked).save(OUTPUT / f"{family_id}-motion-locked-quality-v2-sheet.png", optimize=True)
        report["families"][family_id] = {
            "passed": passed,
            "frames": family["frameCount"],
            "candidateFrameStart": family.get("candidateFrameStart", 0),
            "renderScale": family.get("renderScale", 1.0),
            "minimumAlphaIou": min(item["alphaIou"] for item in frame_metrics),
            "maximumCentroidDeltaPx": max(item["centroidDeltaPx"] for item in frame_metrics),
            "maximumBoundsDeltaPx": max(item["boundsDeltaPx"] for item in frame_metrics),
            "maximumRigidRootTranslationPx": max(
                max(abs(item["x"]), abs(item["y"])) for item in translations
            ),
            "rigidRootTranslations": translations,
            "rawFrameMetrics": raw_metrics,
            "frameMetrics": frame_metrics,
            "packedAlphaAuthority": family["legacySheet"],
        }
    (OUTPUT / "contract-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    duration = round(1000 / CONFIG["preview"]["fps"])
    review[0].save(
        OUTPUT / CONFIG["previewOutput"], save_all=True,
        append_images=review[1:], duration=duration, loop=0, optimize=True, disposal=2,
    )
    if not all(family["passed"] for family in report["families"].values()):
        raise RuntimeError("Motion contract gate failed; candidate remains rejected")
    print(f"MOTION_LOCKED_MESH_QUALITY_V2_PACK_OK output={OUTPUT}")


if __name__ == "__main__":
    main()
