"""Build the approved HUD torch-off frame from the locked ON frame and ImageGen art."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
HUD_DIR = ROOT / "sprites" / "UI" / "hud-approved-v1"
ON_FRAME = HUD_DIR / "player-core.png"
OFF_SOURCE = ROOT / "ai-tools" / "2026-07-26-hud-torch-off-source-v2.png"
OFF_FRAME = HUD_DIR / "player-core-torch-off.png"

TORCH_CLEAN_POLYGON = (
    (351, 76),
    (350, 62),
    (359, 43),
    (371, 23),
    (379, 7),
    (393, 7),
    (402, 21),
    (397, 40),
    (388, 54),
    (383, 72),
    (368, 82),
)
KEY_BADGE_PRESERVE_BOX = (382, 53, 417, 93)
BACKGROUND_SAMPLE_BOX = (299, 4, 350, 84)
BACKGROUND_TARGET_BOX = (350, 4, 401, 84)
OFF_ICON_HEIGHT_PX = 54
OFF_ICON_LEFT_PX = 359
OFF_ICON_TOP_PX = 24


def crop_alpha(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        raise RuntimeError(f"Image has no visible pixels: {OFF_SOURCE}")
    return image.crop(bounds)


def build_off_frame() -> None:
    on_frame = Image.open(ON_FRAME).convert("RGBA")
    off_source = crop_alpha(Image.open(OFF_SOURCE).convert("RGBA"))

    clean_patch = on_frame.crop(BACKGROUND_SAMPLE_BOX).resize(
        (
            BACKGROUND_TARGET_BOX[2] - BACKGROUND_TARGET_BOX[0],
            BACKGROUND_TARGET_BOX[3] - BACKGROUND_TARGET_BOX[1],
        ),
        Image.Resampling.LANCZOS,
    )
    clean_layer = Image.new("RGBA", on_frame.size, (0, 0, 0, 0))
    clean_layer.paste(clean_patch, BACKGROUND_TARGET_BOX[:2])

    mask = Image.new("L", on_frame.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon(TORCH_CLEAN_POLYGON, fill=255)
    draw.rectangle(KEY_BADGE_PRESERVE_BOX, fill=0)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=1.25))
    off_frame = Image.composite(clean_layer, on_frame, mask)

    ratio = OFF_ICON_HEIGHT_PX / max(1, off_source.height)
    off_icon = off_source.resize(
        (max(1, round(off_source.width * ratio)), OFF_ICON_HEIGHT_PX),
        Image.Resampling.LANCZOS,
    )
    off_frame.alpha_composite(off_icon, (OFF_ICON_LEFT_PX, OFF_ICON_TOP_PX))

    if off_frame.size != on_frame.size:
        raise RuntimeError("Torch state frame geometry drifted.")
    OFF_FRAME.parent.mkdir(parents=True, exist_ok=True)
    off_frame.save(OFF_FRAME, optimize=True)
    print(f"Wrote {OFF_FRAME.relative_to(ROOT)} ({off_frame.width}x{off_frame.height})")


if __name__ == "__main__":
    build_off_frame()
