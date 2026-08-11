from __future__ import annotations

raise SystemExit(
    "Superseded by ai-tools/2026-07-03-slice-approved-second-world-sprites.py; "
    "do not regenerate the rejected procedural overlay second-world assets."
)

import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
TILE_SIZE = 94
ICON_SIZE = 64

MATERIALS = {
    "lava-dirt": {
        "tile_dir": ROOT / "sprites" / "tiles" / "second-world" / "lava-dirt",
        "icon": ROOT / "sprites" / "UI" / "second-world" / "lava-dirt-icon.webp",
        "base": (73, 29, 20),
        "base_2": (131, 48, 22),
        "accent": (255, 93, 31),
        "hot": (255, 184, 64),
        "ore": (181, 35, 17),
    },
    "obsidian": {
        "tile_dir": ROOT / "sprites" / "tiles" / "second-world" / "obsidian",
        "icon": ROOT / "sprites" / "UI" / "second-world" / "obsidian-icon.webp",
        "base": (22, 17, 29),
        "base_2": (45, 29, 58),
        "accent": (114, 68, 183),
        "hot": (195, 87, 255),
        "ore": (15, 12, 20),
    },
    "ember-ore": {
        "tile_dir": ROOT / "sprites" / "tiles" / "second-world" / "ember-ore",
        "icon": ROOT / "sprites" / "UI" / "second-world" / "ember-ore-icon.webp",
        "base": (42, 23, 22),
        "base_2": (82, 42, 28),
        "accent": (255, 97, 28),
        "hot": (255, 216, 101),
        "ore": (197, 55, 22),
    },
    "magma-crystal": {
        "tile_dir": ROOT / "sprites" / "tiles" / "second-world" / "magma-crystal",
        "icon": ROOT / "sprites" / "UI" / "second-world" / "magma-crystal-icon.webp",
        "base": (48, 18, 31),
        "base_2": (86, 22, 46),
        "accent": (255, 43, 110),
        "hot": (255, 177, 255),
        "ore": (173, 35, 118),
    },
}


def mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def clamp_channel(value: int) -> int:
    return max(0, min(255, int(value)))


def jitter(color: tuple[int, int, int], amount: int, rng: random.Random) -> tuple[int, int, int]:
    return tuple(clamp_channel(c + rng.randint(-amount, amount)) for c in color)


def add_base_texture(draw: ImageDraw.ImageDraw, mat: dict, rng: random.Random) -> None:
    for y in range(TILE_SIZE):
        t = y / max(1, TILE_SIZE - 1)
        row_color = mix(mat["base"], mat["base_2"], t * 0.65)
        draw.line([(0, y), (TILE_SIZE, y)], fill=jitter(row_color, 5, rng))

    for _ in range(54):
        x = rng.randint(-8, TILE_SIZE - 4)
        y = rng.randint(-8, TILE_SIZE - 4)
        w = rng.randint(8, 24)
        h = rng.randint(5, 18)
        color = jitter(mix(mat["base"], mat["base_2"], rng.random()), 10, rng)
        draw.polygon(
            [
                (x + rng.randint(0, 4), y),
                (x + w, y + rng.randint(0, 5)),
                (x + w - rng.randint(0, 5), y + h),
                (x, y + h - rng.randint(0, 5)),
            ],
            fill=color,
        )


def add_veins(draw: ImageDraw.ImageDraw, mat: dict, rng: random.Random, density: int) -> None:
    for _ in range(density):
        points = []
        x = rng.randint(0, TILE_SIZE)
        y = rng.randint(0, TILE_SIZE)
        for _ in range(rng.randint(3, 6)):
            points.append((x, y))
            x += rng.randint(-16, 18)
            y += rng.randint(-10, 14)
        width = rng.choice([2, 2, 3, 4])
        draw.line(points, fill=mat["accent"], width=width, joint="curve")
        if rng.random() < 0.55:
            draw.line(points, fill=mat["hot"], width=max(1, width - 2), joint="curve")


def add_cracks(draw: ImageDraw.ImageDraw, rng: random.Random, damage_level: int) -> None:
    crack_count = 2 + damage_level * 4
    for _ in range(crack_count):
        points = []
        x = rng.randint(0, TILE_SIZE)
        y = rng.randint(0, TILE_SIZE)
        for _ in range(rng.randint(2, 5 + damage_level)):
            points.append((x, y))
            x += rng.randint(-18, 18)
            y += rng.randint(-18, 18)
        draw.line(points, fill=(12, 8, 8), width=rng.randint(1, 2 + damage_level // 2))
        if damage_level >= 3 and rng.random() < 0.6:
            draw.line(points[: max(2, len(points) - 1)], fill=(255, 86, 29), width=1)


def add_edge_shadow(image: Image.Image) -> Image.Image:
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for i, alpha in enumerate([74, 52, 32, 18]):
        draw.rectangle([i, i, TILE_SIZE - 1 - i, TILE_SIZE - 1 - i], outline=(0, 0, 0, alpha), width=1)
    return Image.alpha_composite(image.convert("RGBA"), overlay)


def make_tile(material_name: str, mat: dict, stage: int) -> Image.Image:
    rng = random.Random(f"{material_name}-{stage}")
    image = Image.new("RGBA", (TILE_SIZE, TILE_SIZE), mat["base"] + (255,))
    draw = ImageDraw.Draw(image)
    add_base_texture(draw, mat, rng)
    add_veins(draw, mat, rng, density=4 if material_name == "lava-dirt" else 7)
    add_cracks(draw, rng, damage_level=5 - stage)

    if material_name == "magma-crystal":
        for _ in range(7):
            cx = rng.randint(12, TILE_SIZE - 12)
            cy = rng.randint(12, TILE_SIZE - 12)
            h = rng.randint(10, 24)
            w = rng.randint(5, 12)
            draw.polygon([(cx, cy - h), (cx + w, cy), (cx, cy + h), (cx - w, cy)], fill=mat["accent"])
            draw.line([(cx, cy - h + 2), (cx, cy + h - 2)], fill=mat["hot"], width=2)

    image = image.filter(ImageFilter.UnsharpMask(radius=1.2, percent=135, threshold=3))
    return add_edge_shadow(image)


def make_icon(material_name: str, mat: dict) -> Image.Image:
    rng = random.Random(f"{material_name}-icon")
    image = Image.new("RGBA", (ICON_SIZE, ICON_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    points = [
        (10, 8), (47, 5), (58, 18), (55, 48),
        (43, 59), (15, 55), (5, 41), (7, 18),
    ]
    draw.polygon(points, fill=mat["base"])
    draw.line(points + [points[0]], fill=(245, 190, 140, 150), width=2)
    for _ in range(6):
        x = rng.randint(12, 48)
        y = rng.randint(12, 48)
        draw.ellipse([x - 4, y - 3, x + 5, y + 4], fill=mat["accent"])
        draw.point((x, y), fill=mat["hot"])
    draw.line([(12, 18), (42, 12), (54, 25)], fill=(255, 236, 190, 115), width=2)
    return image.filter(ImageFilter.UnsharpMask(radius=1, percent=150, threshold=2))


def save_assets() -> None:
    preview_tiles: list[tuple[str, int, Image.Image]] = []
    for name, mat in MATERIALS.items():
        mat["tile_dir"].mkdir(parents=True, exist_ok=True)
        mat["icon"].parent.mkdir(parents=True, exist_ok=True)
        for stage in range(1, 6):
            tile = make_tile(name, mat, stage)
            tile.save(mat["tile_dir"] / f"{stage}-of-5-hp.webp", "WEBP", quality=92, method=6)
            preview_tiles.append((name, stage, tile))
        make_icon(name, mat).save(mat["icon"], "WEBP", quality=94, method=6)

    preview_dir = ROOT / "sprites" / "tiles" / "second-world" / "previews"
    preview_dir.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (5 * TILE_SIZE, len(MATERIALS) * TILE_SIZE), (12, 10, 12, 255))
    for row, name in enumerate(MATERIALS):
        for stage in range(1, 6):
            tile = next(img for material, s, img in preview_tiles if material == name and s == stage)
            sheet.alpha_composite(tile, ((stage - 1) * TILE_SIZE, row * TILE_SIZE))
    sheet.save(preview_dir / "second-world-contact-sheet.png")


if __name__ == "__main__":
    save_assets()
    print("Generated second-world tile and UI assets.")
