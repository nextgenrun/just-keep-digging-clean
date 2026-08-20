"""Derive Phaser Light2D normal maps from the owned shallow-cave plates."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
DEPTH_ROOT = ROOT / "sprites" / "backgrounds" / "world-visual-v2" / "depth"
OUTPUT_ROOT = DEPTH_ROOT / "material-normal-v1"
DIFFUSE_ROOT = DEPTH_ROOT / "material-diffuse-v1"
SOURCE_GLOBS = (
    "biome-variation-v2/weathered-roots-*.webp",
    "biome-expansion-v3/weathered-roots-*.webp",
    "biome-expansion-v5/weathered-roots-*.webp",
)
STRENGTH = 7.5
HEIGHT_BLUR_PX = 1.15
MICRO_DETAIL_STRENGTH = 0.72
MEDIUM_DETAIL_STRENGTH = 0.38
DETAIL_CEILING = 0.072


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def smoothstep(edge0: float, edge1: float, values: np.ndarray) -> np.ndarray:
    unit = np.clip((values - edge0) / max(edge1 - edge0, 1e-6), 0.0, 1.0)
    return unit * unit * (3.0 - 2.0 * unit)


def build_material_maps(source_path: Path) -> tuple[Path, dict[str, object]]:
    image = Image.open(source_path).convert("RGB")
    rgb = np.asarray(image, dtype=np.float32) / 255.0
    height = (
        rgb[..., 0] * 0.2126
        + rgb[..., 1] * 0.7152
        + rgb[..., 2] * 0.0722
    )
    height_image = Image.fromarray(np.uint8(np.round(height * 255.0)), "L")
    smooth = np.asarray(
        height_image.filter(ImageFilter.GaussianBlur(HEIGHT_BLUR_PX)),
        dtype=np.float32,
    ) / 255.0
    medium = np.asarray(
        height_image.filter(ImageFilter.GaussianBlur(5.0)),
        dtype=np.float32,
    ) / 255.0
    gradient_y, gradient_x = np.gradient(smooth)
    nx = -gradient_x * STRENGTH
    ny = gradient_y * STRENGTH
    nz = np.ones_like(nx)
    magnitude = np.sqrt(nx * nx + ny * ny + nz * nz)
    normal = np.stack((nx / magnitude, ny / magnitude, nz / magnitude), axis=-1)
    encoded = np.uint8(np.round((normal * 0.5 + 0.5) * 255.0))

    output_path = OUTPUT_ROOT / f"{source_path.stem}-normal-v1.webp"
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(encoded, "RGB").save(output_path, "WEBP", lossless=True, method=6)

    detail = (
        (height - smooth) * MICRO_DETAIL_STRENGTH
        + (smooth - medium) * MEDIUM_DETAIL_STRENGTH
    )
    detail *= smoothstep(0.035, 0.20, height) * (1.0 - smoothstep(0.82, 0.985, height))
    detail = np.clip(detail, -DETAIL_CEILING, DETAIL_CEILING)
    corrected = np.clip(rgb + detail[..., None], 0.0, 1.0)
    diffuse_path = DIFFUSE_ROOT / f"{source_path.stem}-material-v1.webp"
    DIFFUSE_ROOT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.uint8(np.round(corrected * 255.0)), "RGB").save(
        diffuse_path,
        "WEBP",
        quality=96,
        method=6,
    )
    return output_path, {
        "source": source_path.relative_to(ROOT).as_posix(),
        "output": output_path.relative_to(ROOT).as_posix(),
        "sourceSha256": digest(source_path),
        "outputSha256": digest(output_path),
        "materialDiffuse": diffuse_path.relative_to(ROOT).as_posix(),
        "materialDiffuseSha256": digest(diffuse_path),
        "width": image.width,
        "height": image.height,
    }


def main() -> None:
    sources = sorted({path for pattern in SOURCE_GLOBS for path in DEPTH_ROOT.glob(pattern)})
    if not sources:
        raise RuntimeError("No weathered-roots source plates found")
    assets = [build_material_maps(path)[1] for path in sources]
    manifest = {
        "kind": "derived-phaser-light2d-normal-maps",
        "sourceArtChanged": False,
        "strength": STRENGTH,
        "heightBlurPx": HEIGHT_BLUR_PX,
        "microDetailStrength": MICRO_DETAIL_STRENGTH,
        "mediumDetailStrength": MEDIUM_DETAIL_STRENGTH,
        "detailCeiling": DETAIL_CEILING,
        "assets": assets,
    }
    manifest_path = OUTPUT_ROOT / "manifest-v1.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"count": len(assets), "manifest": manifest_path.as_posix()}, indent=2))


if __name__ == "__main__":
    main()
