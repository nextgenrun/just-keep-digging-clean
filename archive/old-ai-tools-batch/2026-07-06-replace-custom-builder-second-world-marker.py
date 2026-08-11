from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]

PALETTE_IMAGE = ROOT / "exports" / "palettes" / "tiles" / "images" / "dig-game-custom-builder-v2.png"
REPLACEMENT_TILE = ROOT / "sprites" / "tiles" / "second-world" / "lava-dirt" / "1-of-5-hp.webp"

TARGET_GID = 3094
TARGET_FIRSTGID = 3086
TILE_SIZE = 94

LOCAL_TILE_ID = TARGET_GID - TARGET_FIRSTGID
COLUMNS = 16
TARGET_X = (LOCAL_TILE_ID % COLUMNS) * TILE_SIZE
TARGET_Y = (LOCAL_TILE_ID // COLUMNS) * TILE_SIZE

BEFORE_PREVIEW = ROOT / "ai-tools" / "2026-07-06-custom-builder-local-id-8-before.png"
AFTER_PREVIEW = ROOT / "ai-tools" / "2026-07-06-custom-builder-local-id-8-after.png"


def main():
    palette = Image.open(PALETTE_IMAGE).convert("RGBA")
    replacement = Image.open(REPLACEMENT_TILE).convert("RGBA").resize(
        (TILE_SIZE, TILE_SIZE),
        Image.Resampling.LANCZOS,
    )

    box = (TARGET_X, TARGET_Y, TARGET_X + TILE_SIZE, TARGET_Y + TILE_SIZE)
    palette.crop(box).save(BEFORE_PREVIEW)
    palette.paste(replacement, (TARGET_X, TARGET_Y), replacement)
    palette.crop(box).save(AFTER_PREVIEW)

    if palette.mode != "RGBA":
        raise RuntimeError("Unexpected palette image mode after replacement.")

    palette.save(PALETTE_IMAGE)


if __name__ == "__main__":
    main()
