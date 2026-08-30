"""Verify same-action Standard Walk handoffs at the exact game projection."""

from __future__ import annotations

import json
import statistics
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads(
    (ROOT / "values/survivalUnifiedAnimationRuntimeV1.json").read_text(encoding="utf-8")
)
RUNTIME = ROOT / CONFIG["runtimeRoot"]
DISPLAY_SIZE = int(CONFIG["render"]["displaySizePx"])
ALPHA_THRESHOLD = int(CONFIG["render"]["alphaThreshold"])
HANDOFF_KEY = "survival-mixamo-v2-walk-handoff-sheet"
HANDOFF_SPEC = CONFIG["sheets"][HANDOFF_KEY]

SPECS = {
    "idle": ("2026-08-25-survival-blender-v2-idle-sheet.webp", 48, 256),
    "walk": ("2026-08-25-survival-mixamo-v1-walk-loop-sheet.webp", 24, 256),
    "handoff": (
        "2026-08-25-survival-mixamo-v2-walk-handoff-sheet.webp",
        int(HANDOFF_SPEC["frames"]),
        int(HANDOFF_SPEC["packedSizePx"]),
    ),
}


def frames_for(path: Path, count: int, frame_size: int):
    with Image.open(path) as source:
        sheet = source.convert("RGBA")
    frames = []
    for index in range(count):
        x = index % 16 * frame_size
        y = index // 16 * frame_size
        frame = sheet.crop((x, y, x + frame_size, y + frame_size))
        assert frame.getchannel("A").getbbox() is not None, (
            f"{path.name} frame {index} is blank"
        )
        frames.append(frame)
    return frames


def display_mask(frame):
    alpha = frame.resize(
        (DISPLAY_SIZE, DISPLAY_SIZE),
        Image.Resampling.LANCZOS,
    ).getchannel("A")
    return alpha.point(lambda value: 255 if value > ALPHA_THRESHOLD else 0)


def silhouette_discontinuity(first, second):
    first_mask = display_mask(first)
    second_mask = display_mask(second)
    first_values = first_mask.get_flattened_data()
    second_values = second_mask.get_flattened_data()
    intersection = sum(a > 0 and b > 0 for a, b in zip(first_values, second_values))
    union = sum(a > 0 or b > 0 for a, b in zip(first_values, second_values))
    return 1.0 - intersection / max(1, union)


metrics = {}
frames = {}
for role, (file_name, count, frame_size) in SPECS.items():
    path = RUNTIME / file_name
    assert path.is_file(), f"missing {role} sheet: {path}"
    frames[role] = frames_for(path, count, frame_size)
    bounds = [frame.getchannel("A").getbbox() for frame in frames[role]]
    metrics[role] = {
        "visibleHeightPx": statistics.median(
            item[3] - item[1] for item in bounds
        ) * DISPLAY_SIZE / frame_size,
        "baselinePx": statistics.median(
            item[3] - 1 for item in bounds
        ) * DISPLAY_SIZE / frame_size,
    }

height_values = [item["visibleHeightPx"] for item in metrics.values()]
baseline_values = [item["baselinePx"] for item in metrics.values()]
height_delta = max(height_values) - min(height_values)
baseline_delta = max(baseline_values) - min(baseline_values)
assert height_delta <= CONFIG["gates"]["maximumCoreVisibleHeightDeltaPx"], metrics
assert baseline_delta <= CONFIG["gates"]["maximumCoreBaselineMedianDeltaPx"], metrics

start_frames = HANDOFF_SPEC["start"]["walkFrames"]
stop_phases = HANDOFF_SPEC["stop"]["phases"]
stop_frame_count = len(HANDOFF_SPEC["stop"]["idleBlendWeights"])
stop_start = len(start_frames)
seams = {
    "idleToStart": silhouette_discontinuity(frames["idle"][0], frames["handoff"][0]),
    "startToWalk": silhouette_discontinuity(
        frames["handoff"][len(start_frames) - 1],
        frames["walk"][start_frames[-1]],
    ),
}
for variant_index, phase in enumerate(stop_phases):
    first = stop_start + variant_index * stop_frame_count
    seams[f"walk{phase:02d}ToStop"] = silhouette_discontinuity(
        frames["walk"][phase],
        frames["handoff"][first],
    )
    seams[f"stop{phase:02d}ToIdle"] = silhouette_discontinuity(
        frames["handoff"][first + stop_frame_count - 1],
        frames["idle"][0],
    )
maximum_seam = max(seams.values())
assert maximum_seam <= 0.035, seams

print(
    "MIXAMO_WALK_RUNTIME_ART_CONTRACT_OK",
    json.dumps({
        "metrics": metrics,
        "visibleHeightDeltaPx": round(height_delta, 3),
        "baselineMedianDeltaPx": round(baseline_delta, 3),
        "maximumSeamDiscontinuity": round(maximum_seam, 4),
        "seams": {key: round(value, 4) for key, value in seams.items()},
    }),
)
