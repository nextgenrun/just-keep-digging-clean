from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = (
    ROOT
    / "sprites"
    / "UI"
    / "loot-pickups-v2"
    / "source"
    / "soil-mini-atlas-v1-imagegen-master.png"
)
OUTPUT = ROOT / "sprites" / "UI" / "loot-pickups-v2" / "soil-mini-atlas-v1.png"
FRAME_SIZE = 96
ATLAS_SIZE = FRAME_SIZE * 2


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    if source.width != source.height:
        raise ValueError(f"Expected a square source atlas, got {source.size}")
    alpha_range = source.getchannel("A").getextrema()
    if alpha_range != (0, 255):
        raise ValueError(f"Source must contain true transparent and opaque pixels: {alpha_range}")

    atlas = source.resize(
        (ATLAS_SIZE, ATLAS_SIZE),
        Image.Resampling.LANCZOS,
        reducing_gap=3,
    )
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(OUTPUT, optimize=True)

    for row in range(2):
        for column in range(2):
            frame = atlas.crop((
                column * FRAME_SIZE,
                row * FRAME_SIZE,
                (column + 1) * FRAME_SIZE,
                (row + 1) * FRAME_SIZE,
            ))
            if frame.getchannel("A").getbbox() is None:
                raise ValueError(f"Generated frame {row * 2 + column} is empty")

    print(
        "LOOT_SOIL_MINI_ATLAS_OK "
        f"source={source.width}x{source.height} output={atlas.width}x{atlas.height} "
        f"frames=4 decodedKiB={(atlas.width * atlas.height * 4) / 1024:.0f}"
    )


if __name__ == "__main__":
    main()
