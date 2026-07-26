"""Build compact alpha-safe runtime sprites for the Golden Five opening."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "sprites" / "onboarding" / "opening-flight-v2" / "runtime"

TARGETS = {
    "flight-artifact-alpha-v1.png": ("flight-artifact-v2.webp", 1024),
    "shaft-marker-alpha-v1.png": ("shaft-marker-v2.webp", 768),
    "first-ascent-cache-alpha-v1.png": ("first-ascent-cache-v2.webp", 768),
    "flight-ring-alpha-v1.png": ("flight-ring-v2.webp", 768),
    "objective-hud-frame-alpha-v1.png": ("objective-hud-frame-v2.webp", 1280),
}


def alpha_crop(image: Image.Image, padding: int = 24) -> Image.Image:
    rgba = image.convert("RGBA")
    bounds = rgba.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("source contains no visible pixels")
    left, top, right, bottom = bounds
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(rgba.width, right + padding)
    bottom = min(rgba.height, bottom + padding)
    return rgba.crop((left, top, right, bottom))


def fit_long_edge(image: Image.Image, long_edge: int) -> Image.Image:
    current = max(image.size)
    if current <= long_edge:
        return image
    scale = long_edge / current
    size = (
        max(1, round(image.width * scale)),
        max(1, round(image.height * scale)),
    )
    return image.resize(size, Image.Resampling.LANCZOS)


def main() -> None:
    for source_name, (output_name, long_edge) in TARGETS.items():
        source = RUNTIME / source_name
        output = RUNTIME / output_name
        image = fit_long_edge(alpha_crop(Image.open(source)), long_edge)
        image.save(output, "WEBP", lossless=True, method=6)
        print(f"{output.relative_to(ROOT)} {image.width}x{image.height}")


if __name__ == "__main__":
    main()
