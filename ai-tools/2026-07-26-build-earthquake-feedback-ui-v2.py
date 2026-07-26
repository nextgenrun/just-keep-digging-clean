"""Pack the approved ImageGen seismic UI master into Phaser runtime assets."""

from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "sprites" / "UI" / "earthquake-feedback-v2"
SOURCE = ASSET_DIR / "sources" / "2026-07-26-seismic-status-transparent-master.png"
STATUS_OUTPUT = ASSET_DIR / "seismic-status-frame-v2.png"
MEDALLION_OUTPUT = ASSET_DIR / "seismic-medallion-v2.png"

STATUS_SIZE = (960, 180)
MEDALLION_SIZE = (256, 256)
MEDALLION_SOURCE_BOX = (104, 188, 470, 555)


def fit_alpha_asset(image: Image.Image, size: tuple[int, int], margin: int) -> Image.Image:
    alpha_box = image.getchannel("A").getbbox()
    if alpha_box is None:
        raise RuntimeError("Source contains no visible alpha pixels")

    cropped = image.crop(alpha_box)
    available = (size[0] - margin * 2, size[1] - margin * 2)
    scale = min(available[0] / cropped.width, available[1] / cropped.height)
    resized = cropped.resize(
        (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(
        resized,
        ((size[0] - resized.width) // 2, (size[1] - resized.height) // 2),
    )
    return canvas


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate(path: Path, expected_size: tuple[int, int]) -> None:
    with Image.open(path) as image:
        rgba = image.convert("RGBA")
        if rgba.size != expected_size:
            raise RuntimeError(f"{path.name}: expected {expected_size}, got {rgba.size}")
        if rgba.getchannel("A").getbbox() is None:
            raise RuntimeError(f"{path.name}: output is fully transparent")
        corners = [
            rgba.getpixel((0, 0))[3],
            rgba.getpixel((rgba.width - 1, 0))[3],
            rgba.getpixel((0, rgba.height - 1))[3],
            rgba.getpixel((rgba.width - 1, rgba.height - 1))[3],
        ]
        if any(corners):
            raise RuntimeError(f"{path.name}: transparent corner contract failed: {corners}")


def main() -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE) as image:
        master = image.convert("RGBA")
        status = fit_alpha_asset(master, STATUS_SIZE, margin=4)
        medallion_source = master.crop(MEDALLION_SOURCE_BOX)
        medallion = fit_alpha_asset(medallion_source, MEDALLION_SIZE, margin=8)

    status.save(STATUS_OUTPUT, optimize=True)
    medallion.save(MEDALLION_OUTPUT, optimize=True)
    validate(STATUS_OUTPUT, STATUS_SIZE)
    validate(MEDALLION_OUTPUT, MEDALLION_SIZE)

    for path in (STATUS_OUTPUT, MEDALLION_OUTPUT):
        print(f"{path.relative_to(ROOT)} {path.stat().st_size} bytes sha256={sha256(path)}")


if __name__ == "__main__":
    main()
