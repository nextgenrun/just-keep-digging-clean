"""Pixel QA for the Stone-diversified V6 ground-damage response atlas."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SEMANTIC = ROOT / "sprites/backgrounds/world-visual-v2/semantic-decals-v1"
V6_MANIFEST = SEMANTIC / "ground-damage-dynamic-response-v6/manifest.json"
V5_MANIFEST = SEMANTIC / "ground-damage-aligned-v5/manifest.json"
FRAME = 188
VISIBLE_ALPHA = 12
STONE_TILE_TYPE = 2
STONE_VARIANTS = 10
TIERS = 6


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def frame_by_index(image: Image.Image, index: int, columns: int) -> Image.Image:
    left = (index % columns) * FRAME
    top = (index // columns) * FRAME
    return image.crop((left, top, left + FRAME, top + FRAME))


def mask(image: Image.Image) -> np.ndarray:
    return np.asarray(image.getchannel("A")) > VISIBLE_ALPHA


v6 = json.loads(V6_MANIFEST.read_text(encoding="utf-8"))
v5 = json.loads(V5_MANIFEST.read_text(encoding="utf-8"))
response_entry = v6["atlases"]["response"]
response_path = ROOT / response_entry["path"]
response = Image.open(response_path).convert("RGBA")
v5_response = Image.open(ROOT / v5["atlases"]["response"]["path"]).convert("RGBA")

assert sha256(response_path) == response_entry["sha256"]
assert response.size == (3384, 2632)
assert response_entry["frameSizePx"] == FRAME
assert response_entry["columns"] == 18
assert response_entry["frameCount"] == 252
assert v6["contracts"]["decodedBytes"] == 76343040
assert v6["contracts"]["decodedBytes"] <= v6["contracts"]["decodedBudgetBytes"]
assert v6["contracts"]["decodedBudgetBytes"] == 76 * 1024 * 1024
assert v6["atlases"]["fracture"]["sha256"] == v5["atlases"]["fracture"]["sha256"]

source_entry = v6["sources"]["stoneFragmentsAlpha"]
source = Image.open(ROOT / source_entry["path"]).convert("RGBA")
assert source_entry["mode"] == "RGBA"
assert source.getchannel("A").getextrema()[0] == 0
assert source.getchannel("A").getpixel((0, 0)) == 0
assert v6["imageGeneration"]["mode"] == "OpenAI built-in image generation"

profiles = v6["contracts"]["responseProfiles"]
assert len(profiles) == 33
stone_index = next(
    index for index, profile in enumerate(profiles)
    if int(profile["tileType"]) == STONE_TILE_TYPE
)
stone_profile = profiles[stone_index]
assert stone_profile["tileName"] == "STONE"
assert stone_profile["variantCount"] == STONE_VARIANTS
assert sum(profile["variantCount"] for profile in profiles) * TIERS == 252
assert all(
    profile["variantCount"] == 1
    for profile in profiles
    if int(profile["tileType"]) != STONE_TILE_TYPE
)

stone_hashes = set()
final_masks = []
minimum_growth = float("inf")
visible_rgb = []
for variant in range(STONE_VARIANTS):
    coverages = []
    previous = None
    for tier in range(TIERS):
        index = stone_profile["frameOffset"] + tier * STONE_VARIANTS + variant
        current = frame_by_index(response, index, response_entry["columns"])
        current_mask = mask(current)
        assert not current_mask[0, :].any()
        assert not current_mask[-1, :].any()
        assert not current_mask[:, 0].any()
        assert not current_mask[:, -1].any()
        if previous is not None:
            assert np.logical_and(previous, np.logical_not(current_mask)).sum() == 0
        previous = current_mask
        coverages.append(float(current_mask.mean()))
        stone_hashes.add(hashlib.sha256(current.tobytes()).hexdigest())
        rgba = np.asarray(current)
        visible_rgb.append(rgba[:, :, :3][current_mask])
    assert all(after > before for before, after in zip(coverages, coverages[1:]))
    minimum_growth = min(minimum_growth, coverages[-1] / coverages[0])
    final_masks.append(previous)

assert len(stone_hashes) == STONE_VARIANTS * TIERS
assert minimum_growth > 4.5
assert float(np.percentile(np.concatenate(visible_rgb), 99)) < 130
maximum_iou = max(
    np.logical_and(first, second).sum() / np.logical_or(first, second).sum()
    for first, second in itertools.combinations(final_masks, 2)
)
assert maximum_iou < 0.5

v5_profiles = v5["contracts"]["responseProfiles"]
for profile_index, profile in enumerate(profiles):
    if int(profile["tileType"]) == STONE_TILE_TYPE:
        continue
    for tier in range(TIERS):
        old = frame_by_index(v5_response, tier * len(v5_profiles) + profile_index, 16)
        new = frame_by_index(
            response,
            profile["frameOffset"] + tier,
            response_entry["columns"],
        )
        assert old.tobytes() == new.tobytes()

contracts = v6["contracts"]
assert contracts["responseVariantSalt"] == 2909
assert contracts["stoneResponseVariants"] == 10
assert contracts["effectiveStoneResponseCombinations"] == 80
assert contracts["nonStoneFramesPreservedFromV5"] == 192
assert contracts["responseFrameOrder"].startswith("profile-major")

print(
    "Dynamic ground-damage V6 art contract passed: 10x Stone response layouts, "
    f"60 unique cumulative Stone frames, {minimum_growth:.2f}x minimum growth, "
    f"max Stone IoU {maximum_iou:.3f}, dark 99th-percentile RGB, 192 byte-identical "
    "non-Stone frames, true source alpha, and a 72.8 MiB decoded package"
)
