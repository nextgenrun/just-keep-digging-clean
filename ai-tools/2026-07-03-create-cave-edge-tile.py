from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
APPROVED_WORLD = ROOT / "sprites" / "tiles" / "approved-world"
SOURCE_WALL = APPROVED_WORLD / "cave-wall.webp"
SOURCE_CEILING = APPROVED_WORLD / "cave-ceiling.webp"
OUTPUT = APPROVED_WORLD / "cave-edge.webp"


def main() -> None:
    wall = Image.open(SOURCE_WALL).convert("RGBA")
    ceiling = Image.open(SOURCE_CEILING).convert("RGBA").resize(wall.size, Image.Resampling.LANCZOS)
    mixed = Image.blend(wall, ceiling, 0.28)
    mixed = ImageEnhance.Contrast(mixed).enhance(1.18)
    mixed = ImageEnhance.Color(mixed).enhance(0.82)

    width, height = mixed.size
    rim = Image.new("RGBA", mixed.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(rim)
    for inset, alpha in [(0, 155), (3, 100), (7, 58), (12, 30)]:
        draw.rectangle(
            (inset, inset, width - 1 - inset, height - 1 - inset),
            outline=(4, 3, 7, alpha),
            width=3,
        )

    vertical_shadow = Image.new("RGBA", mixed.size, (0, 0, 0, 0))
    shadow_px = vertical_shadow.load()
    for y in range(height):
        edge = min(y, height - 1 - y) / max(1, height / 2)
        alpha = int((1 - edge) * 62)
        for x in range(width):
            side = min(x, width - 1 - x) / max(1, width / 2)
            side_alpha = int((1 - side) * 46)
            shadow_px[x, y] = (0, 0, 0, max(alpha, side_alpha))

    texture = Image.alpha_composite(mixed, vertical_shadow.filter(ImageFilter.GaussianBlur(1.1)))
    texture = Image.alpha_composite(texture, rim)

    highlight = ImageChops.screen(
        Image.new("RGBA", mixed.size, (0, 0, 0, 0)),
        Image.new("RGBA", mixed.size, (42, 54, 68, 24)),
    )
    texture = Image.alpha_composite(texture, highlight)
    texture.save(OUTPUT, quality=92, method=6)
    print(OUTPUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
