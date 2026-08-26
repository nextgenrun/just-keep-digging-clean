"""Pixel-level QA for optimized expanded ground-damage V4 atlases."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-expanded-v4"
MANIFEST = PACKAGE / "manifest.json"
FRAME_PX = 188
NATIVE_PX = 94
VISIBLE_ALPHA = 12
VARIANTS = 64
TIERS = 4
PROFILES = 33


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def frame_by_index(image: Image.Image, index: int, columns: int) -> Image.Image:
    column, row = index % columns, index // columns
    return image.crop((
        column * FRAME_PX,
        row * FRAME_PX,
        (column + 1) * FRAME_PX,
        (row + 1) * FRAME_PX,
    ))


def visible_mask(image: Image.Image) -> np.ndarray:
    return np.asarray(image.getchannel("A")) > VISIBLE_ALPHA


def coverage(image: Image.Image) -> float:
    return float(visible_mask(image).mean())


def assert_clean_corners(image: Image.Image) -> None:
    alpha = image.getchannel("A")
    assert all(alpha.getpixel(point) == 0 for point in (
        (0, 0), (FRAME_PX - 1, 0),
        (0, FRAME_PX - 1), (FRAME_PX - 1, FRAME_PX - 1),
    ))


data = json.loads(MANIFEST.read_text(encoding="utf-8"))
fracture_entry = data["atlases"]["fracture"]
response_entry = data["atlases"]["response"]
fracture_path = ROOT / fracture_entry["path"]
response_path = ROOT / response_entry["path"]

assert sha256(fracture_path) == fracture_entry["sha256"]
assert sha256(response_path) == response_entry["sha256"]
fracture = Image.open(fracture_path).convert("RGBA")
response = Image.open(response_path).convert("RGBA")
assert fracture.size == (3008, 3008)
assert response.size == (3008, 1692)
assert fracture_entry["decodedBytes"] + response_entry["decodedBytes"] == 56550400

fracture_hashes: set[str] = set()
final_masks: list[np.ndarray] = []
minimum_growth = float("inf")
for variant in range(VARIANTS):
    coverages = []
    previous_mask = None
    for tier in range(TIERS):
        current = frame_by_index(fracture, tier * VARIANTS + variant, 16)
        assert_clean_corners(current)
        current_mask = visible_mask(current)
        coverages.append(float(current_mask.mean()))
        fracture_hashes.add(hashlib.sha256(current.tobytes()).hexdigest())
        if previous_mask is not None:
            assert np.logical_and(previous_mask, np.logical_not(current_mask)).sum() == 0
        previous_mask = current_mask
    assert all(after > before for before, after in zip(coverages, coverages[1:]))
    minimum_growth = min(minimum_growth, coverages[-1] / coverages[0])
    final_masks.append(visible_mask(frame_by_index(
        fracture, 3 * VARIANTS + variant, 16,
    ).resize((NATIVE_PX, NATIVE_PX), Image.Resampling.LANCZOS)))

assert len(fracture_hashes) == VARIANTS * TIERS
assert minimum_growth > 2.5
maximum_iou = 0.0
for first, second in itertools.combinations(final_masks, 2):
    union = np.logical_or(first, second).sum()
    overlap = np.logical_and(first, second).sum()
    maximum_iou = max(maximum_iou, float(overlap / max(1, union)))
assert maximum_iou < 0.93, maximum_iou

response_hashes: set[str] = set()
for profile in range(PROFILES):
    coverages = []
    for tier in range(TIERS):
        current = frame_by_index(response, tier * PROFILES + profile, 16)
        assert_clean_corners(current)
        coverages.append(coverage(current))
        response_hashes.add(hashlib.sha256(current.tobytes()).hexdigest())
    assert all(after > before for before, after in zip(coverages, coverages[1:]))
assert len(response_hashes) == PROFILES * TIERS

profile_ids = [item["tileType"] for item in data["contracts"]["responseProfiles"]]
assert len(profile_ids) == PROFILES
assert profile_ids == sorted(set(profile_ids))
assert data["contracts"]["effectiveStructuralCombinations"] == 6144
assert data["contracts"]["tierByState"] == [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3]

rgba = np.asarray(fracture)
green_leak = (
    (rgba[:, :, 3] > 32)
    & (rgba[:, :, 1] > rgba[:, :, 0] * 2.0)
    & (rgba[:, :, 1] > rgba[:, :, 2] * 1.8)
    & (rgba[:, :, 1] > 110)
)
assert int(green_leak.sum()) == 0

print(
    "Expanded ground-damage V4 art contract passed: 256 unique cumulative fracture "
    f"anchors, 132 unique exact-tile response anchors, 64 distinct final motifs "
    f"(max IoU {maximum_iou:.3f}), {minimum_growth:.2f}x minimum severity growth, "
    "clean corners, zero chroma leak, and a 56.6 MB decoded atlas budget"
)
