"""Build seamless runtime materials from the approved v11 depth-detail sources."""

from pathlib import Path
from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "sprites" / "backgrounds" / "world-v11-runtime-polished-v4" / "sources"
OUTPUT = ROOT / "sprites" / "backgrounds" / "world-scenic-facade-v1"

MATERIALS = {
    "level1-shallow-blue": "level1-shallow-blue-detail.png",
    "level1-amber-crystal": "level1-amber-crystal-detail.png",
    "level1-silver-core": "level1-silver-core-detail.png",
    "level2-current-magma": "level2-current-magma-detail.png",
    "level2-obsidian-ember": "level2-obsidian-ember-detail.png",
    "level2-foundry-heart": "level2-foundry-heart-detail.png",
    "level2-future-blackglass": "level2-future-blackglass-detail.png",
    "level2-future-starfire": "level2-future-starfire-detail.png",
}


def make_mirrored_seamless(source: Image.Image) -> Image.Image:
    source = source.convert("RGB")
    width, height = source.size
    result = Image.new("RGB", (width * 2, height * 2))
    result.paste(source, (0, 0))
    result.paste(ImageOps.mirror(source), (width, 0))
    result.paste(ImageOps.flip(source), (0, height))
    result.paste(ImageOps.flip(ImageOps.mirror(source)), (width, height))
    return result


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for output_name, source_name in MATERIALS.items():
        source_path = SOURCE / source_name
        if not source_path.exists():
            raise FileNotFoundError(f"Required approved material is missing: {source_path}")
        with Image.open(source_path) as image:
            seamless = make_mirrored_seamless(image)
        output_path = OUTPUT / f"{output_name}-seamless.webp"
        seamless.save(output_path, "WEBP", quality=92, method=6)
        print(f"Built {output_path.relative_to(ROOT)} {seamless.size[0]}x{seamless.size[1]}")


if __name__ == "__main__":
    main()
