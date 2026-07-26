from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools" / "piskel-mcp"))

from piskel_frame_polish import analyze_frames, drift_summary, polish_frames  # noqa: E402


def make_frame(root_x: int, arm_reach: int) -> Image.Image:
    frame = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(frame)
    draw.rectangle((root_x - 5, 20, root_x + 5, 46), fill=(70, 90, 120, 255))
    draw.rectangle((root_x - 5, 46, root_x - 1, 59), fill=(55, 70, 95, 255))
    draw.rectangle((root_x + 1, 46, root_x + 5, 59), fill=(55, 70, 95, 255))
    draw.rectangle((root_x + 5, 24, root_x + arm_reach, 29), fill=(85, 105, 135, 255))
    return frame


frames = [
    make_frame(18, 12),
    make_frame(21, 22),
    make_frame(25, 8),
    make_frame(29, 20),
    make_frame(32, 10),
]
entry = {
    "id": "synthetic-body-anchor",
    "centeringPolicy": {
        "anchorMode": "alpha-lower-body",
        "lowerBodyStartFraction": 0.55,
        "anchorAlphaThreshold": 32,
        "anchorSmoothingWindow": 1,
        "targetAnchorX": 32,
        "bottomY": 60,
        "referenceFrames": [0, 1, 2, 3, 4],
        "targetReferenceHeightPx": 40,
        "minUniformScale": 1,
        "maxUniformScale": 1,
    },
}

before = drift_summary(analyze_frames(frames, entry["centeringPolicy"]))
polished, report = polish_frames(entry, frames)
after = drift_summary(analyze_frames(polished, entry["centeringPolicy"]))

assert before["maxAnchorDriftPx"] >= 7
assert report["uniformScale"] == 1
assert after["maxAnchorDriftPx"] <= 1
assert after["maxBottomDriftPx"] == 0
assert all(frame.size == (64, 64) for frame in polished)
assert report["before"]["maxBBoxCenterDriftPx"] > report["after"]["maxAnchorDriftPx"]

print({
    "result": "PISKEL_FRAME_POLISH_CONTRACT_OK",
    "beforeAnchorDriftPx": before["maxAnchorDriftPx"],
    "afterAnchorDriftPx": after["maxAnchorDriftPx"],
    "afterBottomDriftPx": after["maxBottomDriftPx"],
})
