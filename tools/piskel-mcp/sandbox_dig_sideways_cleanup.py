#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
import character_piskel_pipeline as pipeline  # noqa: E402


OUT_DIR = ROOT / "visual-approval-previews" / "piskel-dig-sideways-sandbox"
SOURCE_DIR = ROOT / "sprites" / "character" / "piskel" / "sandbox" / "dig-sideways-cleanup"
FOCUS_FRAMES = [1, 8, 9]
EDGE_WATCH_FRAMES = [1, 7, 8, 9, 17]
VISUAL_CENTER_ADJUSTMENTS = {
    6: -3,
    12: 4,
    13: -8,
    14: -9,
}
THREE_WAY_FOCUS_FRAMES = [1, 6, 8, 9, 12, 13, 14]
FOOT_STABILIZE_STRENGTH = 0.75
FOOT_STABILIZE_FOCUS_FRAMES = [1, 6, 8, 9, 10, 12, 13, 14, 15]


def luminance(red: int, green: int, blue: int) -> float:
    return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue)


def has_clear_neighbor(pixels: Any, width: int, height: int, x: int, y: int, radius: int = 1) -> bool:
    for yy in range(max(0, y - radius), min(height, y + radius + 1)):
        for xx in range(max(0, x - radius), min(width, x + radius + 1)):
            if xx == x and yy == y:
                continue
            if pixels[xx, yy][3] <= 4:
                return True
    return False


def clean_gray_halo(frame: Image.Image) -> tuple[Image.Image, dict[str, int]]:
    image = frame.copy().convert("RGBA")
    pixels = image.load()
    width, height = image.size
    counts = {
        "transparent_rgb_cleared": 0,
        "very_low_alpha_removed": 0,
        "gray_edge_halo_removed": 0,
        "pale_edge_halo_faded": 0,
    }

    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                if red or green or blue:
                    pixels[x, y] = (0, 0, 0, 0)
                    counts["transparent_rgb_cleared"] += 1
                continue

            value_span = max(red, green, blue) - min(red, green, blue)
            lightness = luminance(red, green, blue)
            near_clear = has_clear_neighbor(pixels, width, height, x, y, 1)

            if alpha <= 6:
                pixels[x, y] = (0, 0, 0, 0)
                counts["very_low_alpha_removed"] += 1
            elif alpha <= 32 and value_span <= 24 and lightness >= 80:
                pixels[x, y] = (0, 0, 0, 0)
                counts["gray_edge_halo_removed"] += 1
            elif near_clear and alpha <= 72 and value_span <= 18 and lightness >= 70:
                pixels[x, y] = (0, 0, 0, 0)
                counts["gray_edge_halo_removed"] += 1
            elif near_clear and alpha <= 140 and value_span <= 28 and lightness >= 135:
                pixels[x, y] = (0, 0, 0, 0)
                counts["gray_edge_halo_removed"] += 1
            elif near_clear and alpha <= 190 and value_span <= 22 and lightness >= 185:
                pixels[x, y] = (red, green, blue, max(0, round(alpha * 0.35)))
                counts["pale_edge_halo_faded"] += 1

    return image, counts


def soften_new_left_edge(frame: Image.Image, clip_px: int = 4, fade_px: int = 4) -> Image.Image:
    image = frame.copy().convert("RGBA")
    pixels = image.load()
    width, height = image.size
    for x in range(clip_px, min(width, clip_px + fade_px)):
        factor = (x - clip_px + 1) / (fade_px + 1)
        for y in range(height):
            red, green, blue, alpha = pixels[x, y]
            if alpha:
                pixels[x, y] = (red, green, blue, round(alpha * factor))
    return image


def shift_frame(frame: Image.Image, dx: int, dy: int = 0) -> Image.Image:
    width, height = frame.size
    canvas = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    src_x = max(0, -dx)
    src_y = max(0, -dy)
    dst_x = max(0, dx)
    dst_y = max(0, dy)
    copy_width = min(width - src_x, width - dst_x)
    copy_height = min(height - src_y, height - dst_y)
    if copy_width > 0 and copy_height > 0:
        canvas.alpha_composite(frame.crop((src_x, src_y, src_x + copy_width, src_y + copy_height)), (dst_x, dst_y))
    return canvas


def lower_body_anchor_x(frame: Image.Image) -> float | None:
    pixels = frame.load()
    width, height = frame.size
    total_weight = 0.0
    weighted_x = 0.0
    for y in range(225, height):
        y_weight = 1 + max(0, y - 260) / 60
        for x in range(width):
            alpha = pixels[x, y][3]
            if alpha < 35:
                continue
            weight = (alpha / 255) * y_weight
            total_weight += weight
            weighted_x += x * weight
    return weighted_x / total_weight if total_weight else None


def lower_body_summary(frames: list[Image.Image]) -> dict[str, Any]:
    anchors = [lower_body_anchor_x(frame) for frame in frames]
    visible = [anchor for anchor in anchors if anchor is not None]
    median_anchor = sum(visible) / len(visible) if visible else None
    if visible:
        import statistics
        median_anchor = statistics.median(visible)
    deltas = [
        round(anchor - median_anchor, 2) if anchor is not None and median_anchor is not None else None
        for anchor in anchors
    ]
    max_drift = max(abs(delta) for delta in deltas if delta is not None) if any(delta is not None for delta in deltas) else 0
    return {
        "medianLowerBodyAnchorX": round(median_anchor, 2) if median_anchor is not None else None,
        "maxLowerBodyDriftPx": round(max_drift, 2),
        "frameDeltas": deltas,
    }


def clamp_dx_for_frame(frame: Image.Image, dx: int) -> tuple[int, bool]:
    bbox = frame.getbbox()
    if not bbox:
        return 0, dx != 0
    min_dx = 1 - bbox[0]
    max_dx = (frame.width - 1) - bbox[2]
    clamped = max(min_dx, min(max_dx, dx))
    return clamped, clamped != dx


def foot_stabilize_frames(frames: list[Image.Image], strength: float) -> tuple[list[Image.Image], list[dict[str, Any]], dict[str, Any]]:
    anchors = [lower_body_anchor_x(frame) for frame in frames]
    visible = [anchor for anchor in anchors if anchor is not None]
    import statistics
    target = statistics.median(visible) if visible else 0.0
    stabilized: list[Image.Image] = []
    actions: list[dict[str, Any]] = []
    for index, (frame, anchor) in enumerate(zip(frames, anchors)):
        requested_dx = round((target - anchor) * strength) if anchor is not None else 0
        dx, clamped = clamp_dx_for_frame(frame, requested_dx)
        stabilized.append(shift_frame(frame, dx, 0))
        actions.append({
            "frame": index,
            "dx": dx,
            "requestedDx": requested_dx,
            "clamped": clamped,
            "lowerBodyAnchorX": round(anchor, 2) if anchor is not None else None,
            "targetLowerBodyAnchorX": round(target, 2),
        })
    return stabilized, actions, {"targetLowerBodyAnchorX": round(target, 2), "strength": strength}


def make_sheet(frames: list[Image.Image], columns: int) -> Image.Image:
    width, height = frames[0].size
    rows = math.ceil(len(frames) / columns)
    sheet = Image.new("RGBA", (columns * width, rows * height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, ((index % columns) * width, (index // columns) * height))
    return sheet


def preview_cell(frame: Image.Image, size: int = 170) -> Image.Image:
    return pipeline.preview_frame(frame, size).convert("RGB")


def diff_cell(before: Image.Image, after: Image.Image, size: int = 170) -> Image.Image:
    diff = ImageChops.difference(before.convert("RGBA"), after.convert("RGBA"))
    alpha = diff.getchannel("A")
    boosted = Image.new("RGBA", diff.size, (255, 64, 64, 0))
    boosted.putalpha(alpha.point(lambda value: min(255, value * 4)))
    base = pipeline.checker(diff.size).convert("RGBA")
    base.alpha_composite(boosted)
    return preview_cell(base, size)


def write_focus_sheet(path: Path, before: list[Image.Image], after: list[Image.Image], focus_frames: list[int]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    cell = 170
    label_h = 24
    columns = 3
    rows = len(focus_frames)
    sheet = Image.new("RGB", (columns * cell, rows * (cell + label_h)), (24, 26, 30))
    draw = ImageDraw.Draw(sheet)
    headers = ["before", "candidate", "diff"]
    for row, frame_index in enumerate(focus_frames):
        y = row * (cell + label_h)
        cells = [
            preview_cell(before[frame_index], cell),
            preview_cell(after[frame_index], cell),
            diff_cell(before[frame_index], after[frame_index], cell),
        ]
        for column, image in enumerate(cells):
            x = column * cell
            sheet.paste(image, (x, y + label_h))
            draw.text((x + 6, y + 5), f"f{frame_index} {headers[column]}", fill=(255, 255, 255))
    sheet.save(path)


def labeled_preview(frame: Image.Image, label: str, size: int = 220, label_h: int = 28) -> Image.Image:
    image = Image.new("RGB", (size, size + label_h), (22, 24, 28))
    draw = ImageDraw.Draw(image)
    image.paste(preview_cell(frame, size), (0, label_h))
    draw.text((8, 7), label, fill=(255, 255, 255))
    return image


def write_compare_gif(
    path: Path,
    before: list[Image.Image],
    after: list[Image.Image],
    fps: int,
    speed_multiplier: float = 1.0,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    frames: list[Image.Image] = []
    gap = 8
    size = 220
    label_h = 28
    for index, (before_frame, after_frame) in enumerate(zip(before, after)):
        left = labeled_preview(before_frame, f"before f{index}", size, label_h)
        right = labeled_preview(after_frame, f"candidate f{index}", size, label_h)
        combined = Image.new("RGB", (size * 2 + gap, size + label_h), (14, 15, 18))
        combined.paste(left, (0, 0))
        combined.paste(right, (size + gap, 0))
        frames.append(combined)
    duration = max(1, round((1000 / max(1, fps)) * max(0.01, speed_multiplier)))
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=duration, loop=0)


def write_three_way_gif(
    path: Path,
    before: list[Image.Image],
    candidate: list[Image.Image],
    candidate_v2: list[Image.Image],
    fps: int,
    speed_multiplier: float = 1.0,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    frames: list[Image.Image] = []
    gap = 8
    size = 190
    label_h = 28
    for index, trio in enumerate(zip(before, candidate, candidate_v2)):
        cells = [
            labeled_preview(trio[0], f"current f{index}", size, label_h),
            labeled_preview(trio[1], f"candidate 1 f{index}", size, label_h),
            labeled_preview(trio[2], f"candidate 2 f{index}", size, label_h),
        ]
        combined = Image.new("RGB", (size * 3 + gap * 2, size + label_h), (14, 15, 18))
        for column, cell in enumerate(cells):
            combined.paste(cell, (column * (size + gap), 0))
        frames.append(combined)
    duration = max(1, round((1000 / max(1, fps)) * max(0.01, speed_multiplier)))
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=duration, loop=0)


def write_three_way_focus_sheet(
    path: Path,
    before: list[Image.Image],
    candidate: list[Image.Image],
    candidate_v2: list[Image.Image],
    focus_frames: list[int],
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    cell = 150
    label_h = 24
    columns = 4
    rows = len(focus_frames)
    sheet = Image.new("RGB", (columns * cell, rows * (cell + label_h)), (24, 26, 30))
    draw = ImageDraw.Draw(sheet)
    headers = ["current", "candidate 1", "candidate 2", "diff 1->2"]
    for row, frame_index in enumerate(focus_frames):
        y = row * (cell + label_h)
        cells = [
            preview_cell(before[frame_index], cell),
            preview_cell(candidate[frame_index], cell),
            preview_cell(candidate_v2[frame_index], cell),
            diff_cell(candidate[frame_index], candidate_v2[frame_index], cell),
        ]
        for column, image in enumerate(cells):
            x = column * cell
            sheet.paste(image, (x, y + label_h))
            draw.text((x + 6, y + 5), f"f{frame_index} {headers[column]}", fill=(255, 255, 255))
    sheet.save(path)


def summarize(entry: dict[str, Any], frames: list[Image.Image]) -> dict[str, Any]:
    stats = pipeline.analyze_frames(frames)
    drift = pipeline.drift_summary(stats)
    source_stem = Path(entry["sourcePiskel"]).stem
    report_path = OUT_DIR / f"{source_stem}-drift-report.json"
    pipeline.write_drift_report(report_path, entry, stats)
    return {
        "drift": drift,
        "stats": stats,
        "reportPath": pipeline.rel_path(report_path),
    }


def main() -> int:
    manifest = pipeline.load_manifest()
    entry = next(item for item in manifest["animations"] if item["id"] == "dig-sideways")
    before_frames, _width, _height, fps = pipeline.read_piskel(pipeline.repo_path(entry["sourcePiskel"]))
    candidate_frames = [frame.copy() for frame in before_frames]

    halo_counts: list[dict[str, Any]] = []
    for index, frame in enumerate(candidate_frames):
        cleaned, counts = clean_gray_halo(frame)
        candidate_frames[index] = cleaned
        halo_counts.append({"frame": index, **counts})

    recenter_actions: list[dict[str, Any]] = []
    before_stats = pipeline.analyze_frames(before_frames)
    for frame_index in FOCUS_FRAMES:
        frame = candidate_frames[frame_index]
        softened = soften_new_left_edge(frame, clip_px=4, fade_px=4)
        candidate_frames[frame_index] = shift_frame(softened, dx=-4, dy=0)
        stat = before_stats[frame_index]
        recenter_actions.append({
            "frame": frame_index,
            "reason": "root-core drift above target and left edge is action-constrained",
            "operation": "soften first 4px of the extended left edge, then shift frame left by 4px",
            "beforeRootAnchorX": stat.get("rootAnchorX"),
            "beforeCenterX": stat.get("centerX"),
            "beforeBBox": stat.get("bbox"),
        })

    candidate_v2_frames = [frame.copy() for frame in candidate_frames]
    visual_center_actions: list[dict[str, Any]] = []
    candidate_stats = pipeline.analyze_frames(candidate_frames)
    for frame_index, dx in VISUAL_CENTER_ADJUSTMENTS.items():
        candidate_v2_frames[frame_index] = shift_frame(candidate_v2_frames[frame_index], dx=dx, dy=0)
        stat = candidate_stats[frame_index]
        visual_center_actions.append({
            "frame": frame_index,
            "dx": dx,
            "reason": "user-noticed visual centering adjustment after candidate 1 review",
            "candidate1RootAnchorX": stat.get("rootAnchorX"),
            "candidate1CenterX": stat.get("centerX"),
            "candidate1BBox": stat.get("bbox"),
        })

    candidate_v3_frames, foot_stabilize_actions, foot_stabilize_info = foot_stabilize_frames(
        candidate_v2_frames,
        FOOT_STABILIZE_STRENGTH,
    )

    source_entry = deepcopy(entry)
    source_entry["sourcePiskel"] = pipeline.rel_path(SOURCE_DIR / "dig-sideways-candidate.piskel")
    source_entry["metadataPath"] = pipeline.rel_path(SOURCE_DIR / "dig-sideways-candidate-metadata.json")
    source_entry["previewPath"] = pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-preview.gif")
    source_entry["contactSheetPath"] = pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-contact-sheet.png")
    source_entry["runtimeOutputs"] = [pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-sheet.webp")]

    source_entry_v2 = deepcopy(entry)
    source_entry_v2["sourcePiskel"] = pipeline.rel_path(SOURCE_DIR / "dig-sideways-candidate-v2.piskel")
    source_entry_v2["metadataPath"] = pipeline.rel_path(SOURCE_DIR / "dig-sideways-candidate-v2-metadata.json")
    source_entry_v2["previewPath"] = pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-v2-preview.gif")
    source_entry_v2["contactSheetPath"] = pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-v2-contact-sheet.png")
    source_entry_v2["runtimeOutputs"] = [pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-v2-sheet.webp")]

    source_entry_v3 = deepcopy(entry)
    source_entry_v3["sourcePiskel"] = pipeline.rel_path(SOURCE_DIR / "dig-sideways-candidate-v3-foot-stabilized.piskel")
    source_entry_v3["metadataPath"] = pipeline.rel_path(SOURCE_DIR / "dig-sideways-candidate-v3-foot-stabilized-metadata.json")
    source_entry_v3["previewPath"] = pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-v3-foot-stabilized-preview.gif")
    source_entry_v3["contactSheetPath"] = pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-v3-foot-stabilized-contact-sheet.png")
    source_entry_v3["runtimeOutputs"] = [pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-v3-foot-stabilized-sheet.webp")]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)

    pipeline.write_json(SOURCE_DIR / "dig-sideways-before.piskel", pipeline.make_piskel(entry, before_frames))
    pipeline.write_json(SOURCE_DIR / "dig-sideways-candidate.piskel", pipeline.make_piskel(entry, candidate_frames))
    pipeline.write_json(SOURCE_DIR / "dig-sideways-candidate-v2.piskel", pipeline.make_piskel(entry, candidate_v2_frames))
    pipeline.write_json(SOURCE_DIR / "dig-sideways-candidate-v3-foot-stabilized.piskel", pipeline.make_piskel(entry, candidate_v3_frames))
    pipeline.write_preview(OUT_DIR / "dig-sideways-before-preview.gif", before_frames, fps)
    pipeline.write_preview(OUT_DIR / "dig-sideways-candidate-preview.gif", candidate_frames, fps)
    pipeline.write_preview(OUT_DIR / "dig-sideways-candidate-v2-preview.gif", candidate_v2_frames, fps)
    pipeline.write_preview(OUT_DIR / "dig-sideways-candidate-v3-foot-stabilized-preview.gif", candidate_v3_frames, fps)
    pipeline.write_contact_sheet(OUT_DIR / "dig-sideways-before-contact-sheet.png", before_frames)
    pipeline.write_contact_sheet(OUT_DIR / "dig-sideways-candidate-contact-sheet.png", candidate_frames)
    pipeline.write_contact_sheet(OUT_DIR / "dig-sideways-candidate-v2-contact-sheet.png", candidate_v2_frames)
    pipeline.write_contact_sheet(OUT_DIR / "dig-sideways-candidate-v3-foot-stabilized-contact-sheet.png", candidate_v3_frames)
    pipeline.write_alignment_overlay(OUT_DIR / "dig-sideways-before-overlay.png", before_frames, pipeline.analyze_frames(before_frames), entry.get("centeringPolicy") or {})
    pipeline.write_alignment_overlay(OUT_DIR / "dig-sideways-candidate-overlay.png", candidate_frames, pipeline.analyze_frames(candidate_frames), entry.get("centeringPolicy") or {})
    pipeline.write_alignment_overlay(OUT_DIR / "dig-sideways-candidate-v2-overlay.png", candidate_v2_frames, pipeline.analyze_frames(candidate_v2_frames), entry.get("centeringPolicy") or {})
    pipeline.write_alignment_overlay(OUT_DIR / "dig-sideways-candidate-v3-foot-stabilized-overlay.png", candidate_v3_frames, pipeline.analyze_frames(candidate_v3_frames), entry.get("centeringPolicy") or {})
    write_focus_sheet(OUT_DIR / "dig-sideways-focus-before-after.png", before_frames, candidate_frames, FOCUS_FRAMES)
    write_focus_sheet(OUT_DIR / "dig-sideways-original-vs-foot-stabilized-focus.png", before_frames, candidate_v3_frames, FOOT_STABILIZE_FOCUS_FRAMES)
    write_three_way_focus_sheet(OUT_DIR / "dig-sideways-3-way-focus.png", before_frames, candidate_frames, candidate_v2_frames, THREE_WAY_FOCUS_FRAMES)
    write_compare_gif(OUT_DIR / "dig-sideways-before-after-compare.gif", before_frames, candidate_frames, fps)
    write_compare_gif(
        OUT_DIR / "dig-sideways-before-after-compare-10x-slower.gif",
        before_frames,
        candidate_frames,
        fps,
        speed_multiplier=10.0,
    )
    write_three_way_gif(OUT_DIR / "dig-sideways-3-way-compare.gif", before_frames, candidate_frames, candidate_v2_frames, fps)
    write_three_way_gif(
        OUT_DIR / "dig-sideways-3-way-compare-10x-slower.gif",
        before_frames,
        candidate_frames,
        candidate_v2_frames,
        fps,
        speed_multiplier=10.0,
    )
    write_compare_gif(OUT_DIR / "dig-sideways-original-vs-foot-stabilized.gif", before_frames, candidate_v3_frames, fps)
    write_compare_gif(
        OUT_DIR / "dig-sideways-original-vs-foot-stabilized-10x-slower.gif",
        before_frames,
        candidate_v3_frames,
        fps,
        speed_multiplier=10.0,
    )
    pipeline.save_image(OUT_DIR / "dig-sideways-candidate-sheet.webp", make_sheet(candidate_frames, int(entry["sheetColumns"])))
    pipeline.save_image(OUT_DIR / "dig-sideways-candidate-v2-sheet.webp", make_sheet(candidate_v2_frames, int(entry["sheetColumns"])))
    pipeline.save_image(OUT_DIR / "dig-sideways-candidate-v3-foot-stabilized-sheet.webp", make_sheet(candidate_v3_frames, int(entry["sheetColumns"])))

    before_summary = summarize(entry, before_frames)
    candidate_summary = summarize(source_entry, candidate_frames)
    candidate_v2_summary = summarize(source_entry_v2, candidate_v2_frames)
    candidate_v3_summary = summarize(source_entry_v3, candidate_v3_frames)
    report = {
        "ok": True,
        "source": entry["sourcePiskel"],
        "sandboxSource": source_entry["sourcePiskel"],
        "runtimeTouched": False,
        "focusFrames": FOCUS_FRAMES,
        "edgeWatchFrames": EDGE_WATCH_FRAMES,
        "fps": fps,
        "before": before_summary["drift"],
        "candidate": candidate_summary["drift"],
        "candidateV2": candidate_v2_summary["drift"],
        "candidateV3FootStabilized": candidate_v3_summary["drift"],
        "lowerBodyAnalysis": {
            "before": lower_body_summary(before_frames),
            "candidate": lower_body_summary(candidate_frames),
            "candidateV2": lower_body_summary(candidate_v2_frames),
            "candidateV3FootStabilized": lower_body_summary(candidate_v3_frames),
        },
        "haloCleanupTotals": {
            key: sum(item[key] for item in halo_counts)
            for key in [
                "transparent_rgb_cleared",
                "very_low_alpha_removed",
                "gray_edge_halo_removed",
                "pale_edge_halo_faded",
            ]
        },
        "haloCleanupByFrame": halo_counts,
        "recenterActions": recenter_actions,
        "visualCenterActions": visual_center_actions,
        "footStabilizeInfo": foot_stabilize_info,
        "footStabilizeActions": foot_stabilize_actions,
        "artifacts": {
            "beforePreview": pipeline.rel_path(OUT_DIR / "dig-sideways-before-preview.gif"),
            "candidatePreview": pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-preview.gif"),
            "candidateV2Preview": pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-v2-preview.gif"),
            "candidateV3FootStabilizedPreview": pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-v3-foot-stabilized-preview.gif"),
            "beforeContactSheet": pipeline.rel_path(OUT_DIR / "dig-sideways-before-contact-sheet.png"),
            "candidateContactSheet": pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-contact-sheet.png"),
            "candidateV2ContactSheet": pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-v2-contact-sheet.png"),
            "candidateV3FootStabilizedContactSheet": pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-v3-foot-stabilized-contact-sheet.png"),
            "beforeOverlay": pipeline.rel_path(OUT_DIR / "dig-sideways-before-overlay.png"),
            "candidateOverlay": pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-overlay.png"),
            "candidateV2Overlay": pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-v2-overlay.png"),
            "candidateV3FootStabilizedOverlay": pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-v3-foot-stabilized-overlay.png"),
            "focusBeforeAfter": pipeline.rel_path(OUT_DIR / "dig-sideways-focus-before-after.png"),
            "originalVsFootStabilizedFocus": pipeline.rel_path(OUT_DIR / "dig-sideways-original-vs-foot-stabilized-focus.png"),
            "threeWayFocus": pipeline.rel_path(OUT_DIR / "dig-sideways-3-way-focus.png"),
            "beforeAfterCompareGif": pipeline.rel_path(OUT_DIR / "dig-sideways-before-after-compare.gif"),
            "beforeAfterCompareGif10xSlower": pipeline.rel_path(OUT_DIR / "dig-sideways-before-after-compare-10x-slower.gif"),
            "threeWayCompareGif": pipeline.rel_path(OUT_DIR / "dig-sideways-3-way-compare.gif"),
            "threeWayCompareGif10xSlower": pipeline.rel_path(OUT_DIR / "dig-sideways-3-way-compare-10x-slower.gif"),
            "originalVsFootStabilizedGif": pipeline.rel_path(OUT_DIR / "dig-sideways-original-vs-foot-stabilized.gif"),
            "originalVsFootStabilizedGif10xSlower": pipeline.rel_path(OUT_DIR / "dig-sideways-original-vs-foot-stabilized-10x-slower.gif"),
            "candidateSheet": pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-sheet.webp"),
            "candidateV2Sheet": pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-v2-sheet.webp"),
            "candidateV3FootStabilizedSheet": pipeline.rel_path(OUT_DIR / "dig-sideways-candidate-v3-foot-stabilized-sheet.webp"),
            "candidateDriftReport": candidate_summary["reportPath"],
            "candidateV2DriftReport": candidate_v2_summary["reportPath"],
            "candidateV3FootStabilizedDriftReport": candidate_v3_summary["reportPath"],
        },
    }
    pipeline.write_json(OUT_DIR / "dig-sideways-sandbox-report.json", report)
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
