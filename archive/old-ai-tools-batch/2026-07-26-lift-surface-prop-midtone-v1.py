"""Build alpha-safe Level 2 surface prop v2 variants with lifted midtones."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "sprites" / "environment" / "surface-props-v1"
ASSET_IDS = (
    "well",
    "wagon",
    "pergola",
    "bench",
    "handcart",
    "supplies",
    "fence",
    "plants",
    "lantern",
)
GAMMA = 0.82
COLOR = 1.05
CONTRAST = 1.03


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def lift_midtone(source: Image.Image) -> Image.Image:
    rgba = source.convert("RGBA")
    alpha = rgba.getchannel("A")
    gamma_lut = [
        round(255 * ((value / 255) ** GAMMA))
        for value in range(256)
    ]
    rgb = rgba.convert("RGB").point(gamma_lut * 3)
    rgb = ImageEnhance.Color(rgb).enhance(COLOR)
    rgb = ImageEnhance.Contrast(rgb).enhance(CONTRAST)
    red, green, blue = rgb.split()
    result = Image.merge("RGBA", (red, green, blue, alpha))
    result.paste((0, 0, 0, 0), mask=alpha.point(lambda value: 255 if value == 0 else 0))
    return result


def validate(source: Image.Image, output: Image.Image, output_path: Path) -> None:
    if output.size != source.size:
        raise RuntimeError(f"{output_path.name}: dimensions changed")
    alpha = output.getchannel("A")
    if alpha.getextrema()[0] != 0 or alpha.getextrema()[1] == 0:
        raise RuntimeError(f"{output_path.name}: invalid alpha range")
    corners = (
        alpha.getpixel((0, 0)),
        alpha.getpixel((output.width - 1, 0)),
        alpha.getpixel((0, output.height - 1)),
        alpha.getpixel((output.width - 1, output.height - 1)),
    )
    if any(corners):
        raise RuntimeError(f"{output_path.name}: corner alpha contamination")


def main() -> None:
    manifest_assets = []
    for asset_id in ASSET_IDS:
        source_path = ASSET_DIR / f"level2-{asset_id}-v1.webp"
        output_path = ASSET_DIR / f"level2-{asset_id}-v2.webp"
        with Image.open(source_path) as source:
            source.load()
            output = lift_midtone(source)
            validate(source, output, output_path)
            output.save(output_path, "WEBP", lossless=True, method=6, exact=True)
        manifest_assets.append(
            {
                "id": asset_id,
                "source": source_path.relative_to(ROOT).as_posix(),
                "sourceSha256": sha256(source_path),
                "output": output_path.relative_to(ROOT).as_posix(),
                "outputSha256": sha256(output_path),
                "width": output.width,
                "height": output.height,
            }
        )

    manifest = {
        "version": "surface-props-level2-tone-v2",
        "generator": Path(__file__).name,
        "transform": {
            "gamma": GAMMA,
            "color": COLOR,
            "contrast": CONTRAST,
            "alphaPreserved": True,
            "resized": False,
        },
        "assets": manifest_assets,
    }
    manifest_path = ASSET_DIR / "2026-07-26-surface-props-level2-tone-v2-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Built {len(manifest_assets)} Level 2 midtone-safe modular props")


if __name__ == "__main__":
    main()
