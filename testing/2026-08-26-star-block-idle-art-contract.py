"""Pixel-level contract for the OpenRouter-derived Star Block idle atlas."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "sprites/environment/star-block-idle-v1"
MANIFEST_PATH = PACKAGE / "star-block-idle-v1.manifest.json"
FRAME_SIZE = 128
FRAME_COUNT = 72
FRAMES_PER_VARIANT = 24
COLUMNS = 12


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
ATLAS_PATH = ROOT / manifest["runtimeAtlas"]
image = Image.open(ATLAS_PATH)
assert image.mode == "RGB", f"idle atlas must remain neutral RGB, got {image.mode}"
assert image.size == (1536, 768), f"unexpected idle atlas dimensions: {image.size}"
assert sha256(ATLAS_PATH) == manifest["runtimeAtlasSha256"]

atlas = np.asarray(image, dtype=np.uint8)
frames = []
for index in range(FRAME_COUNT):
    left = (index % COLUMNS) * FRAME_SIZE
    top = (index // COLUMNS) * FRAME_SIZE
    frame = atlas[top:top + FRAME_SIZE, left:left + FRAME_SIZE]
    assert frame.shape == (FRAME_SIZE, FRAME_SIZE, 3)
    assert np.array_equal(frame[..., 0], frame[..., 1])
    assert np.array_equal(frame[..., 1], frame[..., 2])
    mean_energy = float(np.mean(frame))
    assert 3.4 < mean_energy < 4.0, (
        f"frame {index} energy escaped anchored bounds: {mean_energy:.3f}"
    )
    frames.append(frame)

assert len({hashlib.sha256(frame.tobytes()).hexdigest() for frame in frames}) == FRAME_COUNT
edge_samples = []
for frame in frames:
    edge_samples.extend((
        frame[:4].reshape(-1),
        frame[-4:].reshape(-1),
        frame[:, :4].reshape(-1),
        frame[:, -4:].reshape(-1),
    ))
edges = np.concatenate(edge_samples)
assert float(np.mean(edges)) < 0.02, "motion cells must retain effectively black additive borders"
assert float(np.percentile(edges, 99.9)) <= 3, "motion cell borders contain visible seam energy"

for variant in range(3):
    start = variant * FRAMES_PER_VARIANT
    sequence = np.stack(frames[start:start + FRAMES_PER_VARIANT])[..., 0]
    temporal_minimum = sequence.min(axis=0)
    assert float(np.mean(temporal_minimum)) < 0.4, "static crystal body leaked into motion-only atlas"
    assert float(np.mean(temporal_minimum > 16)) < 0.002
    frame_energy = np.mean(sequence, axis=(1, 2))
    energy_cv = float(np.std(frame_energy) / np.mean(frame_energy))
    assert energy_cv < 0.025, (
        f"variant {variant} still reads as a global pulse: {energy_cv:.4f}"
    )
    seam_delta = float(np.mean(np.abs(
        sequence[-1].astype(np.int16) - sequence[0].astype(np.int16)
    )))
    assert seam_delta < 1, f"variant {variant} has a visible loop seam: {seam_delta:.3f}"
    axis = np.arange(FRAME_SIZE, dtype=np.float32) - (FRAME_SIZE - 1) / 2
    xx, yy = np.meshgrid(axis, axis)
    radius = np.sqrt(xx * xx + yy * yy) / (FRAME_SIZE * 0.5)
    assert float(np.sum(sequence[:, radius >= 0.42]) / np.sum(sequence)) > 0.08
    assert float(np.sum(sequence[:, radius < 0.42]) / np.sum(sequence)) > 0.08

for variant in manifest["variants"]:
    source = ROOT / variant["source"]
    assert source.exists() and source.stat().st_size > 100_000
    assert sha256(source) == variant["sourceSha256"]

print(
    "Star Block idle art contract passed: 72 unique neutral motion frames, "
    "fixed frame energy, living inner/corona detail, black borders, and seamless loops"
)
