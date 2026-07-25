"""Prepare the v11 image-generated weather VFX mockup assets.

Black-backed cloud/atmosphere/lightning sheets are converted to compact WebP.
Chroma-keyed rain/snow/water sheets must first be converted to alpha PNGs by
the installed imagegen remove_chroma_key helper. Exact v2 skyline layers are
copied non-destructively into the versioned v3 mockup.
"""

from pathlib import Path
from shutil import copy2

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
V2 = ROOT / "testing/animation-sandbox/v11-skyline-weather-mockup-v2/assets"
V3 = ROOT / "testing/animation-sandbox/v11-skyline-weather-vfx-mockup-v3/assets"
SOURCES = V3 / "sources"
PROCESSED = V3 / "processed"

BLACK_SHEETS = {
    "clouds": "clouds-source.png",
    "atmosphere": "atmosphere-source.png",
    "lightning": "lightning-source.png",
}
ALPHA_SHEETS = {
    "rain": "rain-alpha.png",
    "snow": "snow-alpha.png",
    "water": "water-alpha.png",
}


def main() -> None:
    V3.mkdir(parents=True, exist_ok=True)
    PROCESSED.mkdir(parents=True, exist_ok=True)
    copy2(V2 / "skyline-base-clean.webp", V3 / "skyline-base-clean.webp")
    for source_name, output_name in (
        ("town-foreground.png", "town-foreground.webp"),
        ("windmill-foreground.png", "windmill-foreground.webp"),
    ):
        image = Image.open(V2 / source_name).convert("RGBA")
        image.save(V3 / output_name, "WEBP", quality=92, method=6)

    for output_name, source_name in BLACK_SHEETS.items():
        image = Image.open(SOURCES / source_name).convert("RGB")
        rgb = np.asarray(image, dtype=np.uint8)
        light = rgb.max(axis=2).astype(np.float32) / 255.0
        alpha = np.where(light < 0.012, 0, np.power(np.clip(light, 0, 1), 0.55) * 255).astype(np.uint8)
        rgba = np.dstack((rgb, alpha))
        Image.fromarray(rgba, "RGBA").save(PROCESSED / f"{output_name}-screen.webp", "WEBP", quality=92, method=6)

    for output_name, source_name in ALPHA_SHEETS.items():
        image = Image.open(SOURCES / source_name).convert("RGBA")
        image.save(PROCESSED / f"{output_name}-alpha.webp", "WEBP", quality=94, method=6)

    print(f"Prepared weather VFX assets in {PROCESSED}")


if __name__ == "__main__":
    main()
