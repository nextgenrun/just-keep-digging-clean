"""Audit every unified Survival runtime frame for abrupt apparent-scale changes."""

from __future__ import annotations

import argparse
import io
import json
import math
import subprocess
import statistics
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = (
    ROOT
    / "sprites/character/survival-character-unified-v1/runtime"
    / "2026-08-25-survival-unified-animation-runtime-v1-manifest.json"
)
DEFAULT_OUTPUT = ROOT / "testing/animation-sandbox/2026-08-30-piskel-scale-pass"


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    font_path = Path("C:/Windows/Fonts/consola.ttf")
    return ImageFont.truetype(str(font_path), size) if font_path.is_file() else ImageFont.load_default()


def frame_metrics(frame: Image.Image, threshold: int) -> dict:
    alpha = frame.getchannel("A")
    mask = alpha.point(lambda value: 255 if value > threshold else 0)
    bounds = mask.getbbox()
    if bounds is None:
        return {"blank": True}
    left, top, right, bottom = bounds
    histogram = mask.histogram()
    opaque_area = int(histogram[255])
    return {
        "blank": False,
        "bounds": list(bounds),
        "width": right - left,
        "height": bottom - top,
        "extent": max(right - left, bottom - top),
        "opaqueArea": opaque_area,
        "bottom": bottom,
        "centerX": round((left + right) / 2, 3),
        "edgeTouch": left == 0 or top == 0 or right == frame.width or bottom == frame.height,
    }


def ratio(a: float, b: float) -> float:
    return max(a / b, b / a) if a > 0 and b > 0 else math.inf


def detect_candidates(sheet_key: str, metrics: list, indices: list[int], animation: str | None = None) -> list[dict]:
    visible = [metrics[index] for index in indices if not metrics[index]["blank"]]
    if not visible:
        return []
    median_area = statistics.median(item["opaqueArea"] for item in visible)
    median_extent = statistics.median(item["extent"] for item in visible)
    candidates = []
    for sequence_index, index in enumerate(indices):
        item = metrics[index]
        if item["blank"]:
            candidates.append({"sheet": sheet_key, "animation": animation, "frame": index, "reason": "blank", "score": 99.0})
            continue
        area_scale = math.sqrt(item["opaqueArea"] / median_area)
        extent_scale = item["extent"] / median_extent
        if sequence_index == 0:
            continue
        previous_index = indices[sequence_index - 1]
        previous = metrics[previous_index]
        if previous["blank"]:
            continue
        area_jump = math.sqrt(ratio(item["opaqueArea"], previous["opaqueArea"]))
        extent_jump = ratio(item["extent"], previous["extent"])
        width_jump = ratio(item["width"], previous["width"])
        height_jump = ratio(item["height"], previous["height"])
        median_outlier = (area_scale < 0.82 or area_scale > 1.18) and (
            extent_scale < 0.84 or extent_scale > 1.16
        )
        shape_jump = max(width_jump, height_jump)
        abrupt_jump = (area_jump >= 1.08 and shape_jump >= 1.15) or shape_jump >= 1.28
        if not median_outlier and not abrupt_jump:
            continue
        context = indices[max(0, sequence_index - 1):sequence_index + 3]
        while len(context) < 4:
            context.append(context[-1])
        candidates.append({
            "sheet": sheet_key,
            "animation": animation,
            "sequenceIndex": sequence_index,
            "frame": index,
            "previousFrame": previous_index,
            "contextFrames": context,
            "reason": "median-and-shape-outlier" if median_outlier else "abrupt-neighbor-jump",
            "score": round((area_jump - 1) + (shape_jump - 1), 4),
            "areaScaleVsMedian": round(area_scale, 4),
            "extentScaleVsMedian": round(extent_scale, 4),
            "areaScaleJumpFromPrevious": round(area_jump, 4),
            "extentJumpFromPrevious": round(extent_jump, 4),
            "widthJumpFromPrevious": round(width_jump, 4),
            "heightJumpFromPrevious": round(height_jump, 4),
        })
    return candidates


def analyze_sheet(sheet_key: str, spec: dict, runtime_root: Path, threshold: int) -> tuple[dict, list]:
    path = runtime_root / spec["file"]
    frame_size = int(spec["frameSizePx"])
    columns = int(spec["columns"])
    frame_count = int(spec["frames"])
    with Image.open(path) as source:
        sheet = source.convert("RGBA")
    frames = []
    metrics = []
    for index in range(frame_count):
        x = (index % columns) * frame_size
        y = (index // columns) * frame_size
        frame = sheet.crop((x, y, x + frame_size, y + frame_size))
        frames.append(frame)
        metrics.append(frame_metrics(frame, threshold))
    visible = [item for item in metrics if not item["blank"]]
    median_area = statistics.median(item["opaqueArea"] for item in visible)
    median_extent = statistics.median(item["extent"] for item in visible)
    result = {
        "sheet": sheet_key,
        "path": str(path.relative_to(ROOT)).replace("\\", "/"),
        "frameCount": frame_count,
        "frameSizePx": frame_size,
        "medianOpaqueArea": median_area,
        "medianExtentPx": median_extent,
        "candidateCount": 0,
        "edgeTouchFrames": [index for index, item in enumerate(metrics) if not item["blank"] and item["edgeTouch"]],
        "frames": metrics,
    }
    return result, frames


def checker(size: int) -> Image.Image:
    tile = max(4, size // 16)
    image = Image.new("RGB", (size, size), (29, 34, 42))
    draw = ImageDraw.Draw(image)
    for y in range(0, size, tile):
        for x in range(0, size, tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle((x, y, x + tile - 1, y + tile - 1), fill=(48, 54, 64))
    return image


def draw_candidate_board(candidates: list, output: Path, limit: int) -> None:
    chosen = sorted(candidates, key=lambda item: item[0]["score"], reverse=True)[:limit]
    cell = 148
    label_height = 48
    columns = 4
    rows = max(1, len(chosen))
    canvas = Image.new("RGB", (columns * cell, 54 + rows * (cell + label_height)), (9, 14, 21))
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 14), "UNIFIED SURVIVAL - APPARENT SCALE CANDIDATES", font=load_font(20), fill=(238, 242, 248))
    small = load_font(12)
    for row, (candidate, frames) in enumerate(chosen):
        focus = int(candidate["frame"])
        indices = candidate["contextFrames"]
        top = 54 + row * (cell + label_height)
        for column, index in enumerate(indices):
            frame = frames[index]
            tile = checker(cell)
            fitted = frame.copy()
            fitted.thumbnail((cell, cell), Image.Resampling.LANCZOS)
            tile.paste(fitted, ((cell - fitted.width) // 2, (cell - fitted.height) // 2), fitted)
            if index == focus:
                ImageDraw.Draw(tile).rectangle((1, 1, cell - 2, cell - 2), outline=(255, 92, 80), width=3)
            canvas.paste(tile, (column * cell, top))
            draw.text((column * cell + 5, top + 5), f"f{index}", font=small, fill=(255, 218, 120))
        label = f"{candidate.get('animation') or candidate['sheet']}  f{focus}  {candidate['reason']}  score {candidate['score']}"
        draw.text((8, top + cell + 5), label[:96], font=small, fill=(210, 219, 231))
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, optimize=True)


def draw_regression_before_after(manifest: dict, runtime_root: Path, output: Path, ref: str) -> None:
    key = "survival-ual-player-v1-animation-polish-transitions-sheet"
    spec = manifest["sheets"][key]
    current_path = runtime_root / spec["file"]
    relative = current_path.relative_to(ROOT).as_posix()
    baseline_bytes = subprocess.run(
        ["git", "show", f"{ref}:{relative}"],
        cwd=ROOT,
        capture_output=True,
        check=True,
    ).stdout
    with Image.open(io.BytesIO(baseline_bytes)) as source:
        baseline = source.convert("RGBA")
    with Image.open(current_path) as source:
        current = source.convert("RGBA")
    size, columns, indices = int(spec["frameSizePx"]), int(spec["columns"]), (14, 15, 16, 17)
    cell, header = 148, 48
    canvas = Image.new("RGB", (cell * len(indices), header + cell * 2), (7, 14, 18))
    draw = ImageDraw.Draw(canvas)
    draw.text((10, 8), "JOG -> IDLE SCALE REGRESSION", font=load_font(17), fill=(235, 241, 247))
    for row, (label, sheet) in enumerate(((f"BEFORE {ref}", baseline), ("AFTER PISKEL", current))):
        for column, index in enumerate(indices):
            x, y = column * cell, header + row * cell
            box = ((index % columns) * size, (index // columns) * size)
            frame = sheet.crop((box[0], box[1], box[0] + size, box[1] + size))
            tile = checker(size).convert("RGB")
            tile.paste(frame, (0, 0), frame)
            canvas.paste(tile.resize((cell, cell), Image.Resampling.LANCZOS), (x, y))
            height = frame.getchannel("A").point(lambda value: 255 if value > 8 else 0).getbbox()
            draw.text((x + 5, y + 5), f"{label} f{index} h{height[3] - height[1]}", font=load_font(11), fill=(244, 189, 105))
    canvas.save(output, optimize=True)
    review = []
    for index in (14, 15):
        box = ((index % columns) * size, (index // columns) * size)
        frame = current.crop((box[0], box[1], box[0] + size, box[1] + size))
        tile = checker(size).convert("RGB")
        tile.paste(frame, (0, 0), frame)
        review.append(tile)
    review[0].save(
        output.with_name("jog-idle-runtime-slow-review.gif"),
        save_all=True, append_images=review[1:], duration=220, loop=0, optimize=False,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--inventory", type=Path)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--threshold", type=int, default=8)
    parser.add_argument("--board-limit", type=int, default=60)
    parser.add_argument("--baseline-ref")
    args = parser.parse_args()
    manifest_path = args.manifest.resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    runtime_root = manifest_path.parent
    reports = []
    frames_by_sheet = {}
    for sheet_key, spec in manifest["sheets"].items():
        report, frames = analyze_sheet(sheet_key, spec, runtime_root, args.threshold)
        reports.append(report)
        frames_by_sheet[sheet_key] = frames
    report_by_sheet = {item["sheet"]: item for item in reports}
    candidate_frames = []
    inventory_count = 0
    if args.inventory:
        inventory = json.loads(args.inventory.resolve().read_text(encoding="utf-8"))
        for animation in inventory["animations"]:
            sheet_key = animation["sheetKey"]
            report = report_by_sheet.get(sheet_key)
            if report is None:
                continue
            indices = [int(index) for index in animation["frames"] if 0 <= int(index) < report["frameCount"]]
            if not indices:
                continue
            inventory_count += 1
            candidates = detect_candidates(sheet_key, report["frames"], indices, animation["key"])
            candidate_frames.extend((candidate, frames_by_sheet[sheet_key]) for candidate in candidates)
    else:
        for report in reports:
            candidates = detect_candidates(report["sheet"], report["frames"], list(range(report["frameCount"])))
            candidate_frames.extend((candidate, frames_by_sheet[report["sheet"]]) for candidate in candidates)
    for candidate, _frames in candidate_frames:
        report_by_sheet[candidate["sheet"]]["candidateCount"] += 1
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    summary = {
        "manifest": str(manifest_path.relative_to(ROOT)).replace("\\", "/"),
        "sheetCount": len(reports),
        "frameCount": sum(item["frameCount"] for item in reports),
        "animationCount": inventory_count,
        "candidateCount": len(candidate_frames),
        "candidateFrames": [item[0] for item in sorted(candidate_frames, key=lambda pair: pair[0]["score"], reverse=True)],
        "sheets": reports,
    }
    (output / "scale-audit.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    draw_candidate_board(candidate_frames, output / "scale-candidates.png", args.board_limit)
    if args.baseline_ref:
        draw_regression_before_after(
            manifest, runtime_root, output / "scale-regression-before-after.png", args.baseline_ref
        )
    print(json.dumps({key: summary[key] for key in ("sheetCount", "frameCount", "candidateCount")}, indent=2))


if __name__ == "__main__":
    main()
