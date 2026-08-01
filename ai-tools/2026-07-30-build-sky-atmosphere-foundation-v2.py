"""Build a horizontally seamless atmosphere foundation from approved sky art."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = (
    ROOT / "sprites" / "backgrounds" / "world-visual-v2"
    / "far" / "sky-cohesion-v1"
)
OUTPUT_ROOT = (
    ROOT / "sprites" / "backgrounds" / "world-visual-v2"
    / "far" / "sky-foundation-v2"
)
OUTPUT = OUTPUT_ROOT / "sky-atmosphere-foundation-v2.webp"
MANIFEST = OUTPUT_ROOT / "sky-atmosphere-foundation-v2.manifest.json"
SAFE_FRAME = (209, 118, 1463, 823)
OUTPUT_WIDTH = 1024
OUTPUT_HEIGHT = 2048
PROFILE_SMOOTH_RADIUS = 32
NOISE_AMPLITUDE = 3.5
NOISE_HARMONICS = (1, 2, 3, 5, 8)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def smooth_profile(profile: np.ndarray, radius: int) -> np.ndarray:
    padded = np.pad(profile, ((radius, radius), (0, 0)), mode="edge")
    kernel = np.ones(radius * 2 + 1, dtype=np.float32)
    kernel /= kernel.sum()
    return np.stack(
        [
            np.convolve(padded[:, channel], kernel, mode="valid")
            for channel in range(3)
        ],
        axis=1,
    )


def resize_profile(profile: np.ndarray, height: int) -> np.ndarray:
    source_y = np.linspace(0, 1, profile.shape[0])
    target_y = np.linspace(0, 1, height)
    return np.stack(
        [
            np.interp(target_y, source_y, profile[:, channel])
            for channel in range(3)
        ],
        axis=1,
    )


def periodic_noise(width: int, height: int) -> np.ndarray:
    x = np.linspace(0, 1, width, dtype=np.float32)
    y = np.linspace(0, 1, height, dtype=np.float32)
    horizontal = np.zeros(width, dtype=np.float32)
    for index, harmonic in enumerate(NOISE_HARMONICS):
        amplitude = 1 / (index + 1)
        phase = index * 0.71
        horizontal += amplitude * np.cos(
            np.pi * 2 * harmonic * x + phase
        )
    horizontal /= np.max(np.abs(horizontal))
    vertical = (
        0.58
        + 0.24 * np.sin(np.pi * 2 * y * 1.5)
        + 0.18 * np.sin(np.pi * 2 * y * 4.0 + 0.8)
    )
    return vertical[:, None] * horizontal[None, :]


def main() -> None:
    sources = sorted(SOURCE_ROOT.glob("*.webp"))
    if len(sources) != 20:
        raise ValueError(f"expected 20 approved sky sources, found {len(sources)}")

    profiles = []
    source_entries = []
    for path in sources:
        image = Image.open(path).convert("RGB")
        if image.size != (1672, 941):
            raise ValueError(f"unexpected source dimensions: {path.name} {image.size}")
        safe = np.asarray(image.crop(SAFE_FRAME), dtype=np.float32)
        profiles.append(np.median(safe, axis=1))
        source_entries.append({
            "path": path.relative_to(ROOT).as_posix(),
            "sha256": sha256(path),
        })

    median_profile = np.median(np.stack(profiles, axis=0), axis=0)
    median_profile = smooth_profile(median_profile, PROFILE_SMOOTH_RADIUS)
    profile = resize_profile(median_profile, OUTPUT_HEIGHT)
    field = np.repeat(profile[:, None, :], OUTPUT_WIDTH, axis=1)
    noise = periodic_noise(OUTPUT_WIDTH, OUTPUT_HEIGHT) * NOISE_AMPLITUDE
    channel_weights = np.array((0.72, 0.92, 1.0), dtype=np.float32)
    field += noise[:, :, None] * channel_weights[None, None, :]
    field = np.clip(field, 0, 255).astype(np.uint8)
    # The analytic periodic field has identical first and last columns.
    field[:, -1] = field[:, 0]

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(field, "RGB").save(
        OUTPUT,
        "WEBP",
        lossless=True,
        method=6,
    )
    seam_delta = int(
        np.abs(
            field[:, 0].astype(np.int16)
            - field[:, -1].astype(np.int16)
        ).max()
    )
    if seam_delta != 0:
        raise ValueError(f"foundation horizontal seam is not exact: {seam_delta}")

    payload = {
        "version": "sky-atmosphere-foundation-v2",
        "path": OUTPUT.relative_to(ROOT).as_posix(),
        "width": OUTPUT_WIDTH,
        "height": OUTPUT_HEIGHT,
        "sha256": sha256(OUTPUT),
        "safeFrame": {
            "x": SAFE_FRAME[0],
            "y": SAFE_FRAME[1],
            "width": SAFE_FRAME[2] - SAFE_FRAME[0],
            "height": SAFE_FRAME[3] - SAFE_FRAME[1],
        },
        "horizontalSeamMaximumChannelDelta": seam_delta,
        "sourceCount": len(source_entries),
        "sources": source_entries,
    }
    MANIFEST.write_text(
        json.dumps(payload, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT}")
    print(f"Wrote {MANIFEST}")


if __name__ == "__main__":
    main()
