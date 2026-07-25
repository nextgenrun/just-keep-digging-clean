"""Build the aligned height map for the V11 WebGL background-relief review."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = (
    ROOT
    / "sprites"
    / "backgrounds"
    / "world-v11-runtime-polished-v4"
    / "sources"
    / "level1-silver-core-detail.png"
)
OUTPUT = (
    ROOT
    / "visual-approval-previews"
    / "v11-background-relief-poc-v3"
    / "silver-core-depth-map.png"
)


def image_array(image: Image.Image) -> np.ndarray:
    return np.asarray(image, dtype=np.float32) / 255.0


def percentile_normalize(values: np.ndarray) -> np.ndarray:
    low, high = np.percentile(values, (1.0, 99.0))
    return np.clip((values - low) / max(high - low, 1e-6), 0.0, 1.0)


def build_height_map(source: Path, output: Path) -> None:
    color = Image.open(source).convert("RGB")
    grayscale = ImageOps.grayscale(color)

    fine = image_array(grayscale)
    medium = image_array(grayscale.filter(ImageFilter.GaussianBlur(9)))
    broad = image_array(grayscale.filter(ImageFilter.GaussianBlur(34)))

    # Broad luminance establishes the rock masses. Local contrast preserves the
    # carved channels, fissures, and crystal pockets without repainting them.
    height = broad * 0.58
    height += (medium - broad) * 1.05
    height += (fine - medium) * 0.34
    height = percentile_normalize(height)
    height = np.power(height, 0.86)

    encoded = Image.fromarray(np.uint8(np.round(height * 255.0)), mode="L")
    encoded = encoded.filter(ImageFilter.GaussianBlur(0.65))
    output.parent.mkdir(parents=True, exist_ok=True)
    encoded.save(output, optimize=True)

    print(f"source={source.relative_to(ROOT)}")
    print(f"output={output.relative_to(ROOT)}")
    print(f"size={encoded.width}x{encoded.height}")


if __name__ == "__main__":
    build_height_map(SOURCE, OUTPUT)
