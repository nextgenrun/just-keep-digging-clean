"""Pixel-level QA for the layered ground-damage V3 runtime atlases."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-layered-v3"
MANIFEST = PACKAGE / "manifest.json"
FRAME_PX = 188
NATIVE_PX = 94
VISIBLE_ALPHA = 12


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def frame(image: Image.Image, column: int, row: int) -> Image.Image:
    return image.crop((
        column * FRAME_PX,
        row * FRAME_PX,
        (column + 1) * FRAME_PX,
        (row + 1) * FRAME_PX,
    ))


def visible_coverage(image: Image.Image) -> float:
    return float((np.asarray(image.getchannel("A")) > VISIBLE_ALPHA).mean())


data = json.loads(MANIFEST.read_text(encoding="utf-8"))
fracture_entry = data["atlases"]["fracture"]
response_entry = data["atlases"]["response"]
fracture_path = ROOT / fracture_entry["path"]
response_path = ROOT / response_entry["path"]

assert sha256(fracture_path) == fracture_entry["sha256"]
assert sha256(response_path) == response_entry["sha256"]
fracture = Image.open(fracture_path).convert("RGBA")
response = Image.open(response_path).convert("RGBA")
assert fracture.size == (16 * FRAME_PX, 12 * FRAME_PX)
assert response.size == (17 * FRAME_PX, 4 * FRAME_PX)

fracture_hashes: set[str] = set()
final_masks: list[np.ndarray] = []
for variant in range(16):
    coverages = []
    for state in range(12):
        current = frame(fracture, variant, state)
        alpha = current.getchannel("A")
        assert all(alpha.getpixel(point) == 0 for point in (
            (0, 0), (FRAME_PX - 1, 0), (0, FRAME_PX - 1),
            (FRAME_PX - 1, FRAME_PX - 1),
        ))
        coverages.append(visible_coverage(current))
        fracture_hashes.add(hashlib.sha256(current.tobytes()).hexdigest())
    assert all(after >= before for before, after in zip(coverages, coverages[1:]))
    assert coverages[-1] >= coverages[0] * 2.5
    native = frame(fracture, variant, 11).resize(
        (NATIVE_PX, NATIVE_PX), Image.Resampling.LANCZOS
    )
    final_masks.append(np.asarray(native.getchannel("A")) > VISIBLE_ALPHA)

assert len(fracture_hashes) == 16 * 12
maximum_iou = 0.0
for first, second in itertools.combinations(final_masks, 2):
    union = np.logical_or(first, second).sum()
    overlap = np.logical_and(first, second).sum()
    maximum_iou = max(maximum_iou, float(overlap / max(1, union)))
assert maximum_iou < 0.72, maximum_iou

response_hashes: set[str] = set()
for family in range(17):
    coverages = []
    for tier in range(4):
        current = frame(response, family, tier)
        coverages.append(visible_coverage(current))
        response_hashes.add(hashlib.sha256(current.tobytes()).hexdigest())
    assert all(after >= before for before, after in zip(coverages, coverages[1:]))
    assert coverages[-1] > coverages[0]

assert len(response_hashes) == 17 * 4
source_alpha = Image.open(PACKAGE / "fracture-library-alpha-v3.png").convert("RGBA")
rgba = np.asarray(source_alpha)
green_leak = (
    (rgba[:, :, 3] > 12)
    & (rgba[:, :, 1] > rgba[:, :, 0] * 1.35)
    & (rgba[:, :, 1] > rgba[:, :, 2] * 1.25)
    & (rgba[:, :, 1] > 80)
)
assert int(green_leak.sum()) == 0

print(
    "Layered ground-damage V3 art contract passed: 192 unique cumulative "
    f"fracture frames, 68 unique material-response frames, max final-family "
    f"IoU {maximum_iou:.3f}, clean corners, and zero visible chroma-green pixels"
)
