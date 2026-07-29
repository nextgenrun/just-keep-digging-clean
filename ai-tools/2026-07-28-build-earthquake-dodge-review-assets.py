"""Split the approved ImageGen dodge atlas into transparent Phaser review sprites."""

from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "testing" / "animation-sandbox" / "earthquake-dodge-world-v1"
SOURCE = ASSET_DIR / "2026-07-28-earthquake-dodge-atlas-transparent-master.png"
OUTPUT_SIZE = (512, 512)
OUTPUTS = (
    ("earthquake-landing-footprint-v1.png", 0, 0, 18),
    ("earthquake-falling-boulder-v1.png", 1, 0, 28),
    ("earthquake-ceiling-fracture-v1.png", 0, 1, 20),
    ("earthquake-impact-debris-v1.png", 1, 1, 14),
)


def atlas_cell(master: Image.Image, column: int, row: int) -> Image.Image:
    cell_width = master.width / 2
    cell_height = master.height / 2
    return master.crop(
        (
            round(column * cell_width),
            round(row * cell_height),
            round((column + 1) * cell_width),
            round((row + 1) * cell_height),
        )
    )


def fit_alpha_asset(image: Image.Image, margin: int) -> Image.Image:
    alpha_box = image.getchannel("A").getbbox()
    if alpha_box is None:
        raise RuntimeError("Atlas cell contains no visible alpha pixels")

    cropped = image.crop(alpha_box)
    available = (OUTPUT_SIZE[0] - margin * 2, OUTPUT_SIZE[1] - margin * 2)
    scale = min(available[0] / cropped.width, available[1] / cropped.height)
    resized = cropped.resize(
        (
            max(1, round(cropped.width * scale)),
            max(1, round(cropped.height * scale)),
        ),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", OUTPUT_SIZE, (0, 0, 0, 0))
    canvas.alpha_composite(
        resized,
        (
            (OUTPUT_SIZE[0] - resized.width) // 2,
            (OUTPUT_SIZE[1] - resized.height) // 2,
        ),
    )
    return canvas


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate(path: Path) -> None:
    with Image.open(path) as image:
        rgba = image.convert("RGBA")
        if rgba.size != OUTPUT_SIZE:
            raise RuntimeError(f"{path.name}: expected {OUTPUT_SIZE}, got {rgba.size}")
        alpha = rgba.getchannel("A")
        if alpha.getbbox() is None:
            raise RuntimeError(f"{path.name}: output is fully transparent")
        corners = (
            rgba.getpixel((0, 0))[3],
            rgba.getpixel((rgba.width - 1, 0))[3],
            rgba.getpixel((0, rgba.height - 1))[3],
            rgba.getpixel((rgba.width - 1, rgba.height - 1))[3],
        )
        if any(corners):
            raise RuntimeError(
                f"{path.name}: transparent corner contract failed: {corners}"
            )


def main() -> None:
    with Image.open(SOURCE) as image:
        master = image.convert("RGBA")
        if master.width < 2 or master.height < 2:
            raise RuntimeError(f"Unexpected atlas dimensions: {master.size}")
        for filename, column, row, margin in OUTPUTS:
            output = ASSET_DIR / filename
            fit_alpha_asset(atlas_cell(master, column, row), margin).save(
                output,
                optimize=True,
            )
            validate(output)
            print(
                f"{output.relative_to(ROOT)} {output.stat().st_size} bytes "
                f"sha256={sha256(output)}"
            )


if __name__ == "__main__":
    main()
