"""Crop and validate the approved Thunderstrike v3 ImageGen component sheets."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "sprites" / "UI" / "thunderstrike-chain-v3"
ALPHA_THRESHOLD = 16
PADDING_PX = 10

SHEETS = (
    (
        "2026-07-28-thunderstrike-milestones-alpha.png",
        (
            ("thunderstrike-milestone-dormant-v3.webp", (0, 0, 520, 807)),
            ("thunderstrike-milestone-challenge-v3.webp", (520, 0, 1025, 807)),
            ("thunderstrike-milestone-completed-v3.webp", (1025, 0, 1530, 807)),
            ("thunderstrike-milestone-check-v3.webp", (1530, 0, 1950, 807)),
        ),
    ),
    (
        "2026-07-28-thunderstrike-plates-alpha.png",
        (
            ("thunderstrike-prompt-plate-v3.webp", (0, 0, 1024, 512)),
            ("thunderstrike-stage-plate-v3.webp", (0, 512, 1024, 1024)),
            ("thunderstrike-badge-plate-v3.webp", (0, 1024, 1024, 1536)),
        ),
    ),
    (
        "2026-07-28-thunderstrike-glyphs-alpha.png",
        (
            ("thunderstrike-glyph-i-v3.webp", (0, 0, 500, 913)),
            ("thunderstrike-glyph-v-v3.webp", (500, 0, 1080, 913)),
            ("thunderstrike-glyph-x-v3.webp", (1080, 0, 1723, 913)),
        ),
    ),
)


def resolve_subject_box(image: Image.Image, region: tuple[int, int, int, int]):
    crop = image.crop(region)
    mask = crop.getchannel("A").point(
        lambda alpha: 255 if alpha > ALPHA_THRESHOLD else 0,
    )
    local_box = mask.getbbox()
    if local_box is None:
        raise RuntimeError(f"No visible subject found inside region {region}")
    left = max(region[0], region[0] + local_box[0] - PADDING_PX)
    top = max(region[1], region[1] + local_box[1] - PADDING_PX)
    right = min(region[2], region[0] + local_box[2] + PADDING_PX)
    bottom = min(region[3], region[1] + local_box[3] + PADDING_PX)
    return left, top, right, bottom


def validate_component(image: Image.Image, name: str):
    if image.mode != "RGBA":
        raise RuntimeError(f"{name} is not RGBA")
    alpha = image.getchannel("A")
    if alpha.getextrema() != (0, 255):
        raise RuntimeError(f"{name} lacks both transparent and opaque pixels")
    if any(alpha.getpixel(corner) > 0 for corner in (
        (0, 0),
        (image.width - 1, 0),
        (0, image.height - 1),
        (image.width - 1, image.height - 1),
    )):
        raise RuntimeError(f"{name} has non-transparent crop corners")


def main():
    outputs = []
    for source_name, components in SHEETS:
        source_path = ASSET_DIR / source_name
        source = Image.open(source_path).convert("RGBA")
        for output_name, region in components:
            component = source.crop(resolve_subject_box(source, region))
            validate_component(component, output_name)
            output_path = ASSET_DIR / output_name
            component.save(output_path, "WEBP", lossless=True, method=6, exact=True)
            outputs.append((output_name, component.size))
    for output_name, size in outputs:
        print(f"{output_name}: {size[0]}x{size[1]}")


if __name__ == "__main__":
    main()
