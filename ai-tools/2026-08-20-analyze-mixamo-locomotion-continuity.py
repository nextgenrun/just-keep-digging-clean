"""Measure review-sheet silhouette continuity across current and Mixamo locomotion."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
ACCEPTED = ROOT / "testing/blender-animation-lab-v1/review-drafts/mixamo-library-v1/renders/candidate-runtime"
DRAFT = ROOT / "testing/blender-animation-lab-v1/review-drafts/mixamo-locomotion-comparison-v1"
RUNTIME = ROOT / "sprites/character"
OUTPUT = DRAFT / "continuity-report.json"
STAGE_SIZE = 256
GROUND_Y = 224


def spec(path, frames, columns, display, origin_y):
    return {
        "path": path,
        "frames": list(frames),
        "columns": columns,
        "display": display,
        "originY": origin_y,
    }


SPECS = {
    "start": spec(ACCEPTED / "survival-character-mixamo-v1-walk-start-sheet.png", range(16), 16, 101, 899 / 1024),
    "stop": spec(ACCEPTED / "survival-character-mixamo-v1-walk-stop-sheet.png", range(16), 16, 101, 898 / 1024),
    "currentWalk": spec(RUNTIME / "survival-character-blender-v2/runtime/survival-character-blender-v2-walk-sheet.png", range(24), 16, 104, 224 / 256),
    "currentRun": spec(RUNTIME / "survival-ual-player-v1/runtime/survival-ual-player-v1-animation-polish-run-sheet.webp", range(28), 16, 123, 248 / 256),
    "mixamoWalk": spec(DRAFT / "renders/candidate-runtime/survival-character-mixamo-locomotion-v1-walk-loop-sheet.png", range(24), 16, 101, 904 / 1024),
    "mixamoRun": spec(DRAFT / "renders/candidate-runtime/survival-character-mixamo-locomotion-v1-run-loop-sheet.png", range(20), 16, 108, 904 / 1024),
}


def frame_alpha(item, frame):
    with Image.open(item["path"]) as sheet:
        alpha = sheet.convert("RGBA").getchannel("A").crop((
            (frame % item["columns"]) * 256,
            (frame // item["columns"]) * 256,
            (frame % item["columns"] + 1) * 256,
            (frame // item["columns"] + 1) * 256,
        ))
    display = item["display"]
    scaled = alpha.resize((display, display), Image.Resampling.LANCZOS)
    stage = Image.new("L", (STAGE_SIZE, STAGE_SIZE), 0)
    x = round((STAGE_SIZE - display) / 2)
    y = round(GROUND_Y - display * item["originY"])
    stage.paste(scaled, (x, y))
    return stage


def score(left, right):
    a = left.point(lambda value: 255 if value > 8 else 0)
    b = right.point(lambda value: 255 if value > 8 else 0)
    intersection = ImageChops.multiply(a, b).histogram()[255]
    union = ImageChops.lighter(a, b).histogram()[255]
    return 1.0 - (intersection / union if union else 1.0)


def best(source_name, target_name, source_frames=None, target_frames=None):
    source = SPECS[source_name]
    target = SPECS[target_name]
    source_frames = list(source_frames if source_frames is not None else source["frames"])
    target_frames = list(target_frames if target_frames is not None else target["frames"])
    candidates = []
    for source_frame in source_frames:
        source_alpha = frame_alpha(source, source_frame)
        for target_frame in target_frames:
            candidates.append((score(source_alpha, frame_alpha(target, target_frame)), source_frame, target_frame))
    value, source_frame, target_frame = min(candidates)
    return {
        "source": source_name,
        "target": target_name,
        "sourceFrame": source_frame,
        "targetFrame": target_frame,
        "silhouetteDiscontinuity": round(value, 4),
    }


def main():
    report = {
        "version": "mixamo-locomotion-continuity-v1-20260820",
        "reviewOnly": True,
        "productionChanged": False,
        "runtimeWired": False,
        "method": "Runtime-scale alpha-silhouette IoU after active display-size and origin projection",
        "comparisons": {
            "startToCurrentWalk": best("start", "currentWalk", [15]),
            "startToMixamoWalk": best("start", "mixamoWalk", [15]),
            "currentWalkToRun": best("currentWalk", "currentRun"),
            "currentWalkToMixamoRun": best("currentWalk", "mixamoRun"),
            "mixamoWalkToCurrentRun": best("mixamoWalk", "currentRun"),
            "mixamoWalkToRun": best("mixamoWalk", "mixamoRun"),
            "currentWalkToStop": best("currentWalk", "stop", target_frames=[0]),
            "mixamoWalkToStop": best("mixamoWalk", "stop", target_frames=[0]),
        },
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"MIXAMO_LOCOMOTION_CONTINUITY_OK report={OUTPUT}")


if __name__ == "__main__":
    main()
