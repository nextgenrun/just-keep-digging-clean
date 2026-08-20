"""Validate and pack accepted 1024px Mixamo/Survival renders once to 256px."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "values/mixamoAcceptedRuntime.json").read_text(encoding="utf-8"))


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def alpha_metrics(image):
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    threshold = CONFIG["render"]["alphaThreshold"]
    mask = alpha.point(lambda value: 255 if value > threshold else 0)
    bounds = mask.getbbox()
    if bounds is None:
        raise RuntimeError("Rendered frame has no visible alpha")
    histogram = mask.histogram()
    pixels = histogram[255]
    weighted_x = 0
    weighted_y = 0
    for y in range(bounds[1], bounds[3]):
        for x in range(bounds[0], bounds[2]):
            if mask.getpixel((x, y)):
                weighted_x += x
                weighted_y += y
    red, green, blue, source_alpha = rgba.split()
    suspicious_green = 0
    for r, g, b, a in zip(red.getdata(), green.getdata(), blue.getdata(), source_alpha.getdata()):
        if a > threshold and g > 80 and g > r * 1.35 and g > b * 1.2:
            suspicious_green += 1
    size = image.width
    margin = min(bounds[0], bounds[1], size - bounds[2], size - bounds[3])
    return {
        "bounds": list(bounds),
        "centroid": [round(weighted_x / pixels, 3), round(weighted_y / pixels, 3)],
        "visiblePixels": pixels,
        "edgeMarginPx": margin,
        "baselinePx": bounds[3] - 1,
        "suspiciousGreenPixels": suspicious_green,
    }


def font(size):
    path = Path("C:/Windows/Fonts/segoeuib.ttf")
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def pack_clip(clip_id, clip):
    source_root = ROOT / CONFIG["renderRoot"] / clip_id
    paths = [source_root / f"frame-{index:03d}.png" for index in range(clip["frames"])]
    missing = [str(path) for path in paths if not path.is_file()]
    if missing:
        raise FileNotFoundError(f"{clip_id}: missing rendered frames: {missing[:3]}")
    source_size = CONFIG["render"]["sourceSizePx"]
    packed_size = CONFIG["render"]["packedSizePx"]
    metrics = []
    packed = []
    for path in paths:
        with Image.open(path) as image:
            if image.size != (source_size, source_size):
                raise RuntimeError(f"{path}: expected {source_size}px square, got {image.size}")
            metrics.append(alpha_metrics(image))
            packed.append(image.convert("RGBA").resize(
                (packed_size, packed_size), Image.Resampling.LANCZOS
            ))
    minimum_margin = min(item["edgeMarginPx"] for item in metrics)
    maximum_green = max(item["suspiciousGreenPixels"] for item in metrics)
    if minimum_margin < CONFIG["gates"]["minimumRawEdgeMarginPx"]:
        index = min(range(len(metrics)), key=lambda value: metrics[value]["edgeMarginPx"])
        raise RuntimeError(
            f"{clip_id}: clipped alpha at frame {index}, bounds={metrics[index]['bounds']}, "
            f"minimum raw margin {minimum_margin}px"
        )
    if maximum_green > CONFIG["gates"]["maximumSuspiciousGreenPixelsPerFrame"]:
        raise RuntimeError(f"{clip_id}: suspicious green pixels returned ({maximum_green})")
    baselines = [item["baselinePx"] for item in metrics]
    baseline_range = max(baselines) - min(baselines)
    if clip["grounding"] == "PER_FRAME" and baseline_range > CONFIG["gates"]["maximumGroundedBaselineRangePx"]:
        raise RuntimeError(f"{clip_id}: grounded baseline range {baseline_range}px")
    columns = min(CONFIG["render"]["columns"], clip["frames"])
    rows = math.ceil(clip["frames"] / columns)
    sheet = Image.new("RGBA", (columns * packed_size, rows * packed_size), (0, 0, 0, 0))
    for index, frame in enumerate(packed):
        sheet.alpha_composite(frame, ((index % columns) * packed_size, (index // columns) * packed_size))
    output_root = ROOT / CONFIG["candidateRoot"]
    output_root.mkdir(parents=True, exist_ok=True)
    sheet_path = output_root / clip["file"]
    sheet.save(sheet_path, optimize=True)
    preview_frames = []
    for frame in packed:
        canvas = Image.new("RGB", (packed_size, packed_size), (7, 14, 18))
        canvas.paste(frame, (0, 0), frame)
        preview_frames.append(canvas)
    gif_path = output_root / f"{clip_id}.gif"
    preview_frames[0].save(
        gif_path,
        save_all=True,
        append_images=preview_frames[1:],
        duration=round(1000 / clip["fps"]),
        loop=0 if clip["loop"] else 1,
        optimize=True,
    )
    sample_indices = [round(value * (clip["frames"] - 1) / 5) for value in range(6)]
    sample_size = CONFIG["render"]["contactSheetFrameSizePx"]
    title_height = 42
    contact = Image.new("RGB", (sample_size * 6, sample_size + title_height), (7, 14, 18))
    draw = ImageDraw.Draw(contact)
    draw.text((12, 9), f"{clip_id.upper()} · {clip['role']}", font=font(18), fill=(236, 241, 247))
    for column, index in enumerate(sample_indices):
        frame = preview_frames[index].resize((sample_size, sample_size), Image.Resampling.LANCZOS)
        contact.paste(frame, (column * sample_size, title_height))
        draw.text((column * sample_size + 6, title_height + 6), str(index), font=font(15), fill=(244, 189, 105))
    contact_path = output_root / f"{clip_id}-contact-sheet.png"
    contact.save(contact_path, optimize=True)
    return {
        "file": clip["file"],
        "frames": clip["frames"],
        "columns": columns,
        "rows": rows,
        "fps": clip["fps"],
        "loop": clip["loop"],
        "role": clip["role"],
        "source": clip["source"],
        "sourceRenderSizePx": source_size,
        "packedFrameSizePx": packed_size,
        "downsamplePasses": 1,
        "minimumRawEdgeMarginPx": minimum_margin,
        "baselineRangePx": baseline_range,
        "maximumSuspiciousGreenPixels": maximum_green,
        "sheetSha256": sha256(sheet_path),
        "preview": gif_path.name,
        "contactSheet": contact_path.name,
        "frameMetrics": metrics,
        **({"contactSequenceIndex": clip["contactSequenceIndex"]} if "contactSequenceIndex" in clip else {}),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--clip", choices=CONFIG["clips"].keys())
    args = parser.parse_args()
    clips = {args.clip: CONFIG["clips"][args.clip]} if args.clip else CONFIG["clips"]
    report_path = ROOT / CONFIG["renderRoot"] / "render-report.json"
    if not report_path.is_file():
        raise FileNotFoundError(f"Missing Blender render report: {report_path}")
    render_report = json.loads(report_path.read_text(encoding="utf-8"))
    for clip_id in clips:
        residual = render_report.get("clips", {}).get(clip_id, {}).get("alignmentResidualWorld")
        if residual is not None and residual > CONFIG["gates"]["maximumRetargetResidualWorld"]:
            raise RuntimeError(f"{clip_id}: retarget residual {residual}")
    manifest = {
        "version": CONFIG["version"],
        "productionChanged": False,
        "runtimeWired": False,
        "qualityAuthority": "Survival V4 PBR, full-resolution textures, full glove and four-light rig",
        "clips": {clip_id: pack_clip(clip_id, clip) for clip_id, clip in clips.items()},
    }
    output = ROOT / CONFIG["candidateRoot"] / "manifest.json"
    output.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"MIXAMO_ACCEPTED_SURVIVAL_PACK_OK clips={len(clips)} manifest={output}")


if __name__ == "__main__":
    main()
