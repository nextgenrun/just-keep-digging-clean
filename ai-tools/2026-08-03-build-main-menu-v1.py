"""Build exact-ratio, high-density main-menu button textures from ImageGen art."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "sprites" / "UI" / "main-menu-v1"
SOURCE = ASSET_DIR / "sources" / "2026-08-03-main-menu-button-alpha-v1.png"
IDLE_OUTPUT = ASSET_DIR / "main-menu-button-idle-v1.png"
SELECTED_OUTPUT = ASSET_DIR / "main-menu-button-selected-v1.png"
MANIFEST_OUTPUT = ASSET_DIR / "manifest-v1.json"

TARGET_ASPECT = 5.0
EDGE_PADDING_PX = 12
CAP_WIDTH_PX = 480
SELECTED_GLOW_RADIUS_PX = 10


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def alpha_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Source contains no visible pixels")
    return bounds


def extend_center(image: Image.Image, target_width: int) -> Image.Image:
    """Extend only the unornamented middle span; preserve both authored end caps."""
    if target_width < image.width:
        raise ValueError("Target width must not shrink the authored plate")
    cap_width = min(CAP_WIDTH_PX, image.width // 3)
    center_width = image.width - cap_width * 2
    target_center_width = target_width - cap_width * 2
    left = image.crop((0, 0, cap_width, image.height))
    center = image.crop((cap_width, 0, cap_width + center_width, image.height))
    right = image.crop((image.width - cap_width, 0, image.width, image.height))
    center = center.resize((target_center_width, image.height), Image.Resampling.LANCZOS)
    extended = Image.new("RGBA", (target_width, image.height), (0, 0, 0, 0))
    extended.alpha_composite(left, (0, 0))
    extended.alpha_composite(center, (cap_width, 0))
    extended.alpha_composite(right, (cap_width + target_center_width, 0))
    return extended


def crop_and_pad(image: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    bounds = alpha_bounds(image)
    crop = image.crop(bounds)
    target_height = crop.height + EDGE_PADDING_PX * 2
    if target_height % 2:
        target_height += 1
    target_width = round(target_height * TARGET_ASPECT)
    if target_width % 2:
        target_width += 1
    content = extend_center(crop, target_width - EDGE_PADDING_PX * 2)
    canvas = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))
    canvas.alpha_composite(content, (EDGE_PADDING_PX, EDGE_PADDING_PX))
    return canvas, bounds


def selected_variant(idle: Image.Image) -> Image.Image:
    alpha = idle.getchannel("A")
    bright = ImageEnhance.Brightness(idle).enhance(1.08)
    bright = ImageEnhance.Contrast(bright).enhance(1.05)
    bright = ImageEnhance.Color(bright).enhance(1.04)
    bright.putalpha(alpha)

    blurred = alpha.filter(ImageFilter.GaussianBlur(SELECTED_GLOW_RADIUS_PX))
    outside = ImageChops.subtract(blurred, alpha).point(lambda value: round(value * 0.42))
    glow = Image.new("RGBA", idle.size, (68, 205, 255, 0))
    glow.putalpha(outside)
    glow.alpha_composite(bright)
    return glow


def validate(image: Image.Image, label: str) -> dict[str, object]:
    if image.mode != "RGBA":
        raise ValueError(f"{label} must be RGBA")
    width, height = image.size
    if abs(width / height - TARGET_ASPECT) > 0.01:
        raise ValueError(f"{label} aspect ratio drifted: {width}x{height}")
    alpha = image.getchannel("A")
    corners = [alpha.getpixel((0, 0)), alpha.getpixel((width - 1, 0)),
               alpha.getpixel((0, height - 1)), alpha.getpixel((width - 1, height - 1))]
    if any(corners):
        raise ValueError(f"{label} corners must remain transparent: {corners}")
    histogram = alpha.histogram()
    opaque = sum(histogram[250:])
    visible = sum(histogram[1:])
    if visible <= width * height * 0.30:
        raise ValueError(f"{label} visible coverage is unexpectedly low")
    return {
        "width": width,
        "height": height,
        "alphaBounds": list(alpha_bounds(image)),
        "visiblePixels": visible,
        "opaquePixels": opaque,
        "cornerAlpha": corners,
    }


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    if any(source.getchannel("A").getpixel(point) for point in (
        (0, 0), (source.width - 1, 0), (0, source.height - 1),
        (source.width - 1, source.height - 1),
    )):
        raise ValueError("Alpha-clean source corners are not transparent")

    idle, source_bounds = crop_and_pad(source)
    selected = selected_variant(idle)
    idle.save(IDLE_OUTPUT, optimize=True)
    selected.save(SELECTED_OUTPUT, optimize=True)

    manifest = {
        "schema": "main-menu-v1@1",
        "source": {
            "path": SOURCE.relative_to(ROOT).as_posix(),
            "width": source.width,
            "height": source.height,
            "alphaBounds": list(source_bounds),
            "sha256": sha256(SOURCE),
        },
        "displayContract": {
            "widthPx": 260,
            "heightPx": 52,
            "sourceDensityAtUltra": idle.width / (260 * 2),
            "aspect": TARGET_ASPECT,
            "preservedCapWidthPx": CAP_WIDTH_PX,
            "centerExtensionOnly": True,
        },
        "assets": {
            "idle": {
                "path": IDLE_OUTPUT.relative_to(ROOT).as_posix(),
                **validate(idle, "idle"),
                "sha256": sha256(IDLE_OUTPUT),
            },
            "selected": {
                "path": SELECTED_OUTPUT.relative_to(ROOT).as_posix(),
                **validate(selected, "selected"),
                "sha256": sha256(SELECTED_OUTPUT),
            },
        },
    }
    MANIFEST_OUTPUT.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(MANIFEST_OUTPUT)


if __name__ == "__main__":
    main()
