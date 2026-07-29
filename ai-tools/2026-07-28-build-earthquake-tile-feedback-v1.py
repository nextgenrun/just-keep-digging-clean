"""Split the approved ImageGen seismic atlas into Phaser tile-feedback sprites."""

from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "sprites" / "UI" / "earthquake-feedback-v2"
SOURCE = (
    ASSET_DIR
    / "sources"
    / "2026-07-28-seismic-tile-fx-atlas-transparent-master.png"
)
OUTPUT_SIZE = (512, 512)
OUTPUTS = (
    ("seismic-tile-fracture-v1.png", 0),
    ("seismic-tile-collapse-v1.png", 1),
    ("seismic-rubble-return-v1.png", 2),
)


def fit_alpha_asset(image: Image.Image, margin: int = 22) -> Image.Image:
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
        ((OUTPUT_SIZE[0] - resized.width) // 2, (OUTPUT_SIZE[1] - resized.height) // 2),
    )
    return canvas


def atlas_cell(master: Image.Image, index: int) -> Image.Image:
    left = round(master.width * index / len(OUTPUTS))
    right = round(master.width * (index + 1) / len(OUTPUTS))
    return master.crop((left, 0, right, master.height))


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
            raise RuntimeError(f"{path.name}: transparent corner contract failed: {corners}")


def main() -> None:
    with Image.open(SOURCE) as image:
        master = image.convert("RGBA")
        if master.width < 3 or master.height < 1:
            raise RuntimeError(f"Unexpected atlas dimensions: {master.size}")
        for filename, index in OUTPUTS:
            output = ASSET_DIR / filename
            fit_alpha_asset(atlas_cell(master, index)).save(output, optimize=True)
            validate(output)
            print(
                f"{output.relative_to(ROOT)} {output.stat().st_size} bytes "
                f"sha256={sha256(output)}"
            )


if __name__ == "__main__":
    main()
