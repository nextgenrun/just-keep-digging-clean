"""Build the review-only ground Observatory static base and cloud sprites."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


BASE_SIZE = (2048, 1152)
CLOUD_GRID = (4, 3)
ALPHA_MINIMUM = 3
TRIM_PADDING = 10
SKYLINE_POINTS = (
    (0, 382), (132, 430), (286, 490), (452, 560), (616, 600),
    (790, 548), (948, 442), (1110, 338), (1270, 276), (1435, 198),
    (1604, 132), (1770, 168), (1908, 134), (2048, 92),
)
MOON_EXCLUSION = (344, 108, 504, 268)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def cloud_alpha(rgb: np.ndarray) -> np.ndarray:
    """Remove the neutral generated checker while retaining blue vapor."""
    red = rgb[:, :, 0].astype(np.float32)
    green = rgb[:, :, 1].astype(np.float32)
    blue = rgb[:, :, 2].astype(np.float32)
    chroma = np.maximum(blue - red, 0.0) * 4.8 + np.maximum(blue - green, 0.0) * 2.2
    moonlit = np.maximum(blue - 18.0, 0.0) * np.clip((blue - red) / 26.0, 0.0, 1.0)
    return np.uint8(np.clip(np.maximum(chroma, moonlit) - 5.0, 0.0, 255.0))


def green_key_cloud(source: np.ndarray) -> np.ndarray:
    rgb = source.astype(np.float32) / 255.0
    red, green, blue = (rgb[:, :, index] for index in range(3))
    dominance = green - np.maximum(red, blue)
    key = np.clip((dominance - 0.04) / 0.72, 0.0, 1.0)
    key *= np.clip((green - 0.38) / 0.62, 0.0, 1.0)
    alpha = np.clip(((1.0 - key) - 0.045) / 0.955, 0.0, 1.0)
    safe = np.maximum(alpha, 0.035)
    clean = np.empty_like(rgb)
    clean[:, :, 0] = red / safe
    clean[:, :, 1] = (green - (1.0 - alpha)) / safe
    clean[:, :, 2] = blue / safe
    clean = np.clip(clean, 0.0, 1.0)
    clean[:, :, 0] = np.minimum(clean[:, :, 0], clean[:, :, 2] * 0.72)
    clean[:, :, 1] = np.maximum(clean[:, :, 1], clean[:, :, 2] * 0.64)
    clean[:, :, 1] = np.minimum(clean[:, :, 1], clean[:, :, 2] * 0.92 + 0.012)
    alpha_image = Image.fromarray(np.uint8(alpha * 255.0), "L").filter(ImageFilter.GaussianBlur(0.7))
    rgba = np.dstack((np.uint8(clean * 255.0), np.asarray(alpha_image)))
    rgba[rgba[:, :, 3] < 14] = 0
    return rgba


def trim_cloud(cell: Image.Image) -> Image.Image:
    source = np.asarray(cell.convert("RGB"))
    rgb = source.astype(np.float32) / 255.0
    green_dominance = float(np.median(rgb[:, :, 1] - np.maximum(rgb[:, :, 0], rgb[:, :, 2])))
    if green_dominance > 0.18:
        rgba = green_key_cloud(source)
    else:
        raw_alpha = Image.fromarray(cloud_alpha(source), "L")
        alpha_image = raw_alpha.filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(1.15))
        alpha = np.asarray(alpha_image)
        density = np.asarray(alpha_image.filter(ImageFilter.GaussianBlur(4.5)), dtype=np.float32) / 255.0
        rgba = np.zeros((*alpha.shape, 4), dtype=np.uint8)
        rgba[:, :, 0] = np.uint8(np.clip(66.0 + density * 96.0, 0.0, 255.0))
        rgba[:, :, 1] = np.uint8(np.clip(92.0 + density * 105.0, 0.0, 255.0))
        rgba[:, :, 2] = np.uint8(np.clip(142.0 + density * 108.0, 0.0, 255.0))
        rgba[:, :, 3] = alpha
    rgba[rgba[:, :, 3] < ALPHA_MINIMUM] = 0
    cleaned = Image.fromarray(rgba, "RGBA")
    bounds = cleaned.getbbox()
    if not bounds:
        raise ValueError("Generated cloud cell has no recoverable vapor pixels.")
    left, top, right, bottom = bounds
    left = max(0, left - TRIM_PADDING)
    top = max(0, top - TRIM_PADDING)
    right = min(cleaned.width, right + TRIM_PADDING)
    bottom = min(cleaned.height, bottom + TRIM_PADDING)
    return cleaned.crop((left, top, right, bottom))


def build_stars(star_source: Path, output: Path) -> dict:
    stars = Image.open(star_source).convert("RGBA").resize(BASE_SIZE, Image.Resampling.NEAREST)
    sky_mask = Image.new("L", BASE_SIZE)
    draw = ImageDraw.Draw(sky_mask)
    draw.polygon([(0, 0), (BASE_SIZE[0], 0), *reversed(SKYLINE_POINTS)], fill=255)
    draw.ellipse(MOON_EXCLUSION, fill=0)
    sky_mask = sky_mask.filter(ImageFilter.GaussianBlur(7.5))
    rgba = np.asarray(stars).copy()
    alpha = np.asarray(sky_mask, dtype=np.float32) / 255.0
    rgba[:, :, 3] = np.uint8(rgba[:, :, 3].astype(np.float32) * alpha)
    rgba[rgba[:, :, 3] < ALPHA_MINIMUM] = 0
    path = output / "observatory-star-ids-v1.png"
    Image.fromarray(rgba, "RGBA").save(path, optimize=True)
    return {"path": path.name, "width": BASE_SIZE[0], "height": BASE_SIZE[1], "sha256": sha256(path)}


def build(base_source: Path, cloud_source: Path, star_source: Path, output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    base = Image.open(base_source).convert("RGB").resize(BASE_SIZE, Image.Resampling.LANCZOS)
    base_path = output / "observatory-static-base-v1.webp"
    base.save(base_path, "WEBP", quality=94, method=6)
    stars = build_stars(star_source, output)

    cloud_sheet = Image.open(cloud_source).convert("RGB")
    columns, rows = CLOUD_GRID
    modules = []
    for row in range(rows):
        for column in range(columns):
            left = round(column * cloud_sheet.width / columns)
            top = round(row * cloud_sheet.height / rows)
            right = round((column + 1) * cloud_sheet.width / columns)
            bottom = round((row + 1) * cloud_sheet.height / rows)
            index = row * columns + column + 1
            try:
                cloud = trim_cloud(cloud_sheet.crop((left, top, right, bottom)))
            except ValueError:
                continue
            filename = f"observatory-atmosphere-{index:02d}-v1.png"
            path = output / filename
            cloud.save(path, optimize=True)
            modules.append({
                "id": f"observatory-atmosphere-{index:02d}",
                "path": filename,
                "width": cloud.width,
                "height": cloud.height,
                "sha256": sha256(path),
            })

    manifest = {
        "version": "ground-observatory-background-pack-v1",
        "reviewOnly": True,
        "productionChanged": False,
        "runtimePixelReuseFromReference": False,
        "base": {
            "path": base_path.name,
            "width": base.width,
            "height": base.height,
            "sha256": sha256(base_path),
            "immutable": ["moon", "mountains", "forest", "terrain-geometry"],
        },
        "atmosphere": modules,
        "stars": {
            **stars,
            "independentIds": True,
            "skylineMaskPoints": SKYLINE_POINTS,
            "moonExclusion": MOON_EXCLUSION,
        },
        "sourceProvenance": {
            "base": {"path": str(base_source), "sha256": sha256(base_source)},
            "cloudAtlas": {"path": str(cloud_source), "sha256": sha256(cloud_source)},
            "starIds": {"path": str(star_source), "sha256": sha256(star_source)},
            "generatedFromScratch": True,
            "approvedPanelPixelsCopied": False,
        },
    }
    (output / "manifest-v1.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "base": base_path.name,
        "cloudSprites": len(modules),
        "mountainMotionPixels": 0,
        "runtimePixelReuseFromReference": False,
    }, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-source", required=True, type=Path)
    parser.add_argument("--cloud-source", required=True, type=Path)
    parser.add_argument("--star-source", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    build(args.base_source.resolve(), args.cloud_source.resolve(), args.star_source.resolve(), args.output.resolve())


if __name__ == "__main__":
    main()
