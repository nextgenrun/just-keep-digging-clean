"""Build transparent runtime HUD frames from the user-approved 16:9 mockup."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RUNTIME_DIR = ROOT / "sprites" / "UI" / "hud-approved-v1"
PREVIEW_DIR = ROOT / "visual-approval-previews" / "approved-player-hud-v1"
APPROVED_SOURCE = PREVIEW_DIR / "approved-player-hud-v1.png"

DARK = (7, 13, 18, 242)


def octagon_mask(size: tuple[int, int], cut: int = 11, scale: int = 4) -> Image.Image:
    width, height = size
    mask = Image.new("L", (width * scale, height * scale), 0)
    draw = ImageDraw.Draw(mask)
    c = cut * scale
    w = width * scale - 1
    h = height * scale - 1
    draw.polygon([(c, 0), (w - c, 0), (w, c), (w, h - c), (w - c, h), (c, h), (0, h - c), (0, c)], fill=255)
    return mask.resize(size, Image.Resampling.LANCZOS)


def rounded_mask(size: tuple[int, int], radius: int = 12, scale: int = 4) -> Image.Image:
    width, height = size
    mask = Image.new("L", (width * scale, height * scale), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, width * scale - 1, height * scale - 1), radius * scale, fill=255)
    return mask.resize(size, Image.Resampling.LANCZOS)


def crop_asset(source: Image.Image, name: str, box: tuple[int, int, int, int], mask: Image.Image) -> Image.Image:
    asset = source.crop(box).convert("RGBA")
    asset.putalpha(Image.composite(asset.getchannel("A"), Image.new("L", asset.size, 0), mask))
    asset.save(RUNTIME_DIR / name, optimize=True)
    return asset


def cover(asset: Image.Image, box: tuple[int, int, int, int], radius: int = 3) -> None:
    ImageDraw.Draw(asset).rounded_rectangle(box, radius=radius, fill=DARK)


def build(source_path: Path) -> None:
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source_path, APPROVED_SOURCE)
    source = Image.open(source_path).convert("RGBA")

    player = source.crop((14, 18, 431, 111)).convert("RGBA")
    mask = Image.new("L", player.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse((0, 0, 94, 92), fill=255)
    mask_draw.polygon([(75, 10), (402, 10), (416, 23), (416, 82), (405, 92), (75, 92)], fill=255)
    player.putalpha(mask)
    cover(player, (101, 17, 347, 47))
    cover(player, (128, 55, 350, 81))
    player.save(RUNTIME_DIR / "player-core.png", optimize=True)

    buff = source.crop((19, 119, 190, 158)).convert("RGBA")
    buff.putalpha(octagon_mask(buff.size, 9))
    cover(buff, (13, 8, 158, 30))
    buff.save(RUNTIME_DIR / "buff-chip.png", optimize=True)

    combo = source.crop((690, 27, 979, 99)).convert("RGBA")
    combo.putalpha(octagon_mask(combo.size, 12))
    cover(combo, (25, 11, 265, 43))
    cover(combo, (15, 39, 274, 56), radius=2)
    combo.save(RUNTIME_DIR / "combo-frame.png", optimize=True)

    notification = source.crop((690, 134, 979, 190)).convert("RGBA")
    notification.putalpha(octagon_mask(notification.size, 11))
    cover(notification, (70, 10, 264, 45))
    notification.save(RUNTIME_DIR / "notification-frame.png", optimize=True)

    world = source.crop((1222, 27, 1567, 111)).convert("RGBA")
    world.putalpha(octagon_mask(world.size, 13))
    cover(world, (12, 9, 329, 72))
    world.save(RUNTIME_DIR / "world-state.png", optimize=True)

    crop_asset(source, "audio-music.png", (1583, 27, 1651, 77), octagon_mask((68, 50), 10))
    crop_asset(source, "audio-sfx.png", (1583, 82, 1651, 133), octagon_mask((68, 51), 10))

    xp = source.crop((508, 864, 1167, 914)).convert("RGBA")
    xp.putalpha(octagon_mask(xp.size, 10))
    cover(xp, (18, 9, 641, 40))
    xp.save(RUNTIME_DIR / "xp-frame.png", optimize=True)

    inventory = source.crop((1508, 763, 1651, 915)).convert("RGBA")
    inventory.putalpha(rounded_mask(inventory.size, 13))
    inventory.save(RUNTIME_DIR / "inventory-bag.png", optimize=True)

    build_contact_sheet()


def build_contact_sheet() -> None:
    assets = [
        "player-core.png", "buff-chip.png", "combo-frame.png", "notification-frame.png",
        "world-state.png", "audio-music.png", "audio-sfx.png", "xp-frame.png", "inventory-bag.png",
    ]
    canvas = Image.new("RGB", (1100, 650), (10, 18, 26))
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()
    x, y, row_height = 24, 42, 0
    for filename in assets:
        asset = Image.open(RUNTIME_DIR / filename).convert("RGBA")
        if x + asset.width + 24 > canvas.width:
            x, y, row_height = 24, y + row_height + 58, 0
        checker = Image.new("RGB", asset.size, (33, 43, 53))
        check = ImageDraw.Draw(checker)
        for cy in range(0, asset.height, 12):
            for cx in range(0, asset.width, 12):
                if (cx // 12 + cy // 12) % 2:
                    check.rectangle((cx, cy, cx + 11, cy + 11), fill=(49, 60, 70))
        checker.paste(asset, mask=asset.getchannel("A"))
        canvas.paste(checker, (x, y))
        draw.text((x, y - 18), filename, fill=(225, 205, 150), font=font)
        x += asset.width + 24
        row_height = max(row_height, asset.height)
    canvas.save(PREVIEW_DIR / "approved-player-hud-v1-runtime-parts.png", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="Approved mockup PNG")
    args = parser.parse_args()
    build(args.source.resolve())


if __name__ == "__main__":
    main()
