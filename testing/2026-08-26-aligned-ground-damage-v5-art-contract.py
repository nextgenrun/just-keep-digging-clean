"""Pixel and registration QA for aligned ground-damage V5 atlases."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "sprites/backgrounds/world-visual-v2/semantic-decals-v1/ground-damage-aligned-v5"
MANIFEST = PACKAGE / "manifest.json"
FRAME_PX = 188
NATIVE_PX = 94
CONTENT_BOX_PX = 160
SAFE_MARGIN_PX = (FRAME_PX - CONTENT_BOX_PX) // 2
VISIBLE_ALPHA = 12
VARIANTS = 24
STATES = 12
PROFILES = 33
RESPONSE_TIERS = 6


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


def visible_box(image: Image.Image) -> tuple[int, int, int, int]:
    box = image.getchannel("A").point(
        lambda value: 255 if value > VISIBLE_ALPHA else 0
    ).getbbox()
    assert box is not None
    return box


def assert_tile_safe(image: Image.Image, require_centered_box: bool = False) -> None:
    left, top, right, bottom = visible_box(image)
    assert left >= SAFE_MARGIN_PX
    assert top >= SAFE_MARGIN_PX
    assert right <= FRAME_PX - SAFE_MARGIN_PX
    assert bottom <= FRAME_PX - SAFE_MARGIN_PX
    if require_centered_box:
        assert abs((left + right) / 2 - FRAME_PX / 2) <= 2.0
        assert abs((top + bottom) / 2 - FRAME_PX / 2) <= 2.0


data = json.loads(MANIFEST.read_text(encoding="utf-8"))
fracture_entry = data["atlases"]["fracture"]
response_entry = data["atlases"]["response"]
fracture_path = ROOT / fracture_entry["path"]
response_path = ROOT / response_entry["path"]

assert sha256(fracture_path) == fracture_entry["sha256"]
assert sha256(response_path) == response_entry["sha256"]
fracture = Image.open(fracture_path).convert("RGBA")
response = Image.open(response_path).convert("RGBA")
assert fracture.size == (3008, 3384)
assert response.size == (3008, 2444)
assert fracture_entry["frameCount"] == VARIANTS * STATES
assert response_entry["frameCount"] == PROFILES * RESPONSE_TIERS
assert fracture_entry["decodedBytes"] + response_entry["decodedBytes"] == 70122496
assert data["contracts"]["decodedBytes"] <= data["contracts"]["decodedBudgetBytes"]

fracture_hashes: set[str] = set()
final_masks: list[np.ndarray] = []
minimum_growth = float("inf")
for variant in range(VARIANTS):
    coverages = []
    previous_mask = None
    final_frame = frame_by_index(
        fracture,
        (STATES - 1) * VARIANTS + variant,
        16,
    )
    final_mask = visible_mask(final_frame)
    for state in range(STATES):
        current = frame_by_index(fracture, state * VARIANTS + variant, 16)
        current_mask = visible_mask(current)
        assert_tile_safe(current, state == STATES - 1)
        coverages.append(float(current_mask.mean()))
        fracture_hashes.add(hashlib.sha256(current.tobytes()).hexdigest())
        if previous_mask is not None:
            assert np.logical_and(previous_mask, np.logical_not(current_mask)).sum() == 0
        previous_mask = current_mask
    assert all(after > before for before, after in zip(coverages, coverages[1:]))
    minimum_growth = min(minimum_growth, coverages[-1] / coverages[0])
    final_masks.append(visible_mask(final_frame.resize(
        (NATIVE_PX, NATIVE_PX), Image.Resampling.LANCZOS,
    )))

assert len(fracture_hashes) == VARIANTS * STATES
assert minimum_growth > 5.0
maximum_iou = 0.0
for first, second in itertools.combinations(final_masks, 2):
    union = np.logical_or(first, second).sum()
    overlap = np.logical_and(first, second).sum()
    maximum_iou = max(maximum_iou, float(overlap / max(1, union)))
assert maximum_iou < 0.93, maximum_iou

fracture_rgba = np.asarray(fracture)
visible = fracture_rgba[:, :, 3] > VISIBLE_ALPHA
assert np.array_equal(fracture_rgba[:, :, 0][visible], fracture_rgba[:, :, 1][visible])
assert np.array_equal(fracture_rgba[:, :, 1][visible], fracture_rgba[:, :, 2][visible])

response_hashes: set[str] = set()
for profile in range(PROFILES):
    coverages = []
    for tier in range(RESPONSE_TIERS):
        current = frame_by_index(response, tier * PROFILES + profile, 16)
        current_mask = visible_mask(current)
        assert not current_mask[0, :].any()
        assert not current_mask[-1, :].any()
        assert not current_mask[:, 0].any()
        assert not current_mask[:, -1].any()
        coverages.append(float(current_mask.mean()))
        response_hashes.add(hashlib.sha256(current.tobytes()).hexdigest())
    assert all(after > before for before, after in zip(coverages, coverages[1:]))
assert len(response_hashes) == PROFILES * RESPONSE_TIERS

for source in ("groundAlignedAlpha", "crystalAlignedAlpha"):
    entry = data["sources"][source]
    assert entry["mode"] == "RGBA"
    image = Image.open(ROOT / entry["path"]).convert("RGBA")
    assert image.getchannel("A").getextrema()[0] == 0

contracts = data["contracts"]
assert contracts["logicalTilePx"] == NATIVE_PX
assert contracts["fixedDisplayScale"] == 1.0
assert contracts["displayOrigin"] == [0.5, 0.5]
assert contracts["contentBoxPx"] == CONTENT_BOX_PX
assert contracts["nativeSafeInsetPx"] == 7.0
assert contracts["stateScaleByState"] == [1.0] * STATES
assert contracts["fractureTierByState"] == list(range(STATES))
assert contracts["responseTierByState"] == [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]
assert contracts["effectiveStructuralCombinations"] == 2304

print(
    "Aligned ground-damage V5 art contract passed: 288 unique fixed-registration "
    f"fracture states, 198 unique response states, {minimum_growth:.2f}x minimum "
    f"severity growth, max final IoU {maximum_iou:.3f}, seven-pixel native inset, "
    "neutral crack RGB, true source alpha, and a 70.1 MB decoded package"
)
