from __future__ import annotations

import json
import math
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image


def rounded(value: float) -> float:
    return round(value, 3)


def frame_bounds(image: Image.Image, frame: int, width: int, height: int):
    columns = image.width // width
    x = (frame % columns) * width
    y = (frame // columns) * height
    alpha = image.crop((x, y, x + width, y + height)).getchannel("A")
    return alpha.getbbox()


def metric(bounds, display: float, origin: dict, frame_height: int):
    if not bounds:
        return None
    left, top, right, bottom = bounds
    scale = display / frame_height
    return {
        "widthPx": rounded((right - left) * scale),
        "heightPx": rounded((bottom - top) * scale),
        "centerOffsetXPx": rounded((((left + right) / 2) - origin["x"] * frame_height) * scale),
        "baselineOffsetYPx": rounded((bottom - origin["y"] * frame_height) * scale),
    }


def spread(values):
    return rounded(max(values) - min(values)) if values else 0


def delta(a, b):
    return rounded(math.hypot(
        a["centerOffsetXPx"] - b["centerOffsetXPx"],
        a["baselineOffsetYPx"] - b["baselineOffsetYPx"],
    ))


def gait_skating(source, repo):
    run = next((item for item in source["animations"] if item["key"].endswith("-run-anim")), None)
    manifest_path = repo / "sprites/character/survival-ual-player-v1/runtime/manifest.json"
    if not run or not manifest_path.exists():
        return None
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    markers = manifest["actions"]["run-piskel-polished"]["rig_markers"]["frames"]
    foot_ranges = {}
    for foot in ("foot_l", "foot_r"):
        positions = [float(frame[foot][0]) for frame in markers.values()]
        foot_ranges[foot] = max(positions) - min(positions)
    tile_size = float(source["profile"].get("tileSizePx", 94))
    marker_stride_px = sum(foot_ranges.values()) * run["displaySizePx"] / source["profile"]["frameWidth"]
    configured_tiles = source["profile"].get("strideTilesPerCycleByAnimation", {}).get(
        run["key"], source["profile"]["kinematicMotion"]["locomotion"]["run"]["strideTilesPerCycle"]
    )
    configured_px = configured_tiles * tile_size
    return {
        "animation": run["key"],
        "method": "sum of left/right planted-step marker travel",
        "markerStridePx": rounded(marker_stride_px),
        "markerStrideTiles": rounded(marker_stride_px / tile_size),
        "configuredStridePx": rounded(configured_px),
        "configuredStrideTiles": rounded(configured_tiles),
        "cycleSlipProxyPx": rounded(abs(configured_px - marker_stride_px)),
        "footMarkerRangesSourcePx": {key: rounded(value) for key, value in foot_ranges.items()},
    }


source_path = Path(sys.argv[1])
output_path = Path(sys.argv[2])
repo = Path.cwd()
source = json.loads(source_path.read_text(encoding="utf-8"))
images = {}
missing = []
for sheet in source["sheets"]:
    image_path = repo / sheet["path"]
    if not image_path.exists():
        missing.append(sheet["path"])
        continue
    images[sheet["key"]] = Image.open(image_path).convert("RGBA")

results = []
by_key = {}
issues = []
for animation in source["animations"]:
    image = images.get(animation["sheetKey"])
    if not image:
        continue
    metrics = []
    for frame in animation["frames"]:
        bounds = frame_bounds(image, frame, source["profile"]["frameWidth"], source["profile"]["frameHeight"])
        value = metric(bounds, animation["displaySizePx"], animation["origin"], source["profile"]["frameHeight"])
        if value:
            metrics.append({"frame": frame, **value})
    if not metrics:
        issues.append({"severity": "error", "animation": animation["key"], "finding": "no-visible-frames"})
        continue
    heights = [item["heightPx"] for item in metrics]
    centers = [item["centerOffsetXPx"] for item in metrics]
    baselines = [item["baselineOffsetYPx"] for item in metrics]
    loop_seam = delta(metrics[-1], metrics[0]) if animation["repeat"] == -1 else None
    entry = {
        "key": animation["key"],
        "family": animation["family"],
        "sheetKey": animation["sheetKey"],
        "frameCount": len(metrics),
        "frameRate": animation["frameRate"],
        "displaySizePx": animation["displaySizePx"],
        "origin": animation["origin"],
        "visibleHeightPx": {
            "median": rounded(statistics.median(heights)),
            "min": rounded(min(heights)),
            "max": rounded(max(heights)),
            "spread": spread(heights),
        },
        "centerSpreadPx": spread(centers),
        "baselineSpreadPx": spread(baselines),
        "loopSeamPx": loop_seam,
        "first": metrics[0],
        "last": metrics[-1],
    }
    results.append(entry)
    by_key[entry["key"]] = entry
    if entry["baselineSpreadPx"] > 3 and animation["family"] in {"locomotion", "transition", "mining-combat", "idle-pose"}:
        active_gait = source["profile"].get("groundedGaitRole") == "run" and entry["key"].endswith("-run-anim")
        issues.append({
            "severity": "high" if active_gait else "medium",
            "animation": entry["key"],
            "finding": "baseline-drift" if active_gait else "standby-baseline-variation",
            "valuePx": entry["baselineSpreadPx"],
        })
    if entry["centerSpreadPx"] > 9 and animation["family"] in {"locomotion", "transition", "idle-pose"}:
        issues.append({"severity": "medium", "animation": entry["key"], "finding": "horizontal-drift", "valuePx": entry["centerSpreadPx"]})
    if loop_seam is not None and loop_seam > 4:
        issues.append({"severity": "high", "animation": entry["key"], "finding": "loop-seam-jump", "valuePx": loop_seam})
    minimum_extent = min(max(item["widthPx"], item["heightPx"]) for item in metrics)
    if minimum_extent < 58 and animation["family"] not in {"airborne-flight", "reaction"}:
        issues.append({"severity": "medium", "animation": entry["key"], "finding": "small-visible-silhouette", "valuePx": rounded(minimum_extent)})

edge_results = []
seen_edges = set()
for edge in source["transitionEdges"]:
    pair = (edge["from"], edge["to"], edge["reason"])
    if pair in seen_edges:
        continue
    seen_edges.add(pair)
    before = by_key.get(edge["from"])
    after = by_key.get(edge["to"])
    if not before or not after:
        continue
    seam = delta(before["last"], after["first"])
    before_extent = max(before["last"]["widthPx"], before["last"]["heightPx"])
    after_extent = max(after["first"]["widthPx"], after["first"]["heightPx"])
    height_jump = rounded(abs(before_extent - after_extent))
    result = {**edge, "anchorSeamPx": seam, "visibleExtentJumpPx": height_jump}
    edge_results.append(result)
    if (seam > 5 or height_jump > 10) and edge["reason"] != "flight-land":
        issues.append({
            "severity": "high" if seam > 8 or height_jump > 16 else "medium",
            "animation": f'{edge["from"]} -> {edge["to"]}',
            "finding": "transition-discontinuity",
            "anchorSeamPx": seam,
            "visibleExtentJumpPx": height_jump,
            "reason": edge["reason"],
        })

families = defaultdict(list)
for result in results:
    families[result["family"]].append(result)
family_summary = {}
for family, entries in families.items():
    family_summary[family] = {
        "animations": len(entries),
        "medianVisibleHeightPx": rounded(statistics.median(item["visibleHeightPx"]["median"] for item in entries)),
        "maxBaselineSpreadPx": max(item["baselineSpreadPx"] for item in entries),
        "maxCenterSpreadPx": max(item["centerSpreadPx"] for item in entries),
    }

skating = gait_skating(source, repo)
if skating and skating["cycleSlipProxyPx"] > 10:
    issues.append({
        "severity": "high",
        "animation": skating["animation"],
        "finding": "foot-skating-cadence-mismatch",
        "valuePx": skating["cycleSlipProxyPx"],
    })

report = {
    "generatedAt": source["generatedAt"],
    "profile": source["profile"],
    "inventory": source["counts"],
    "coverage": {
        "animationsMeasured": len(results),
        "sheetsLoaded": len(images),
        "missingSheets": missing,
        "transitionEdgesMeasured": len(edge_results),
    },
    "familySummary": family_summary,
    "gaitSkating": skating,
    "issueCounts": dict(Counter(issue["severity"] for issue in issues)),
    "issues": sorted(issues, key=lambda item: {"error": 0, "high": 1, "medium": 2}.get(item["severity"], 3)),
    "animations": results,
    "transitions": edge_results,
}
output_path.parent.mkdir(parents=True, exist_ok=True)
output_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"coverage": report["coverage"], "issueCounts": report["issueCounts"], "families": family_summary}, indent=2))
