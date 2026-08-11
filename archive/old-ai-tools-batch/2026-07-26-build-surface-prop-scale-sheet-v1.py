"""Render the live modular prop library at one shared player-relative scale."""

from __future__ import annotations

import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
VALUES_PATH = ROOT / "values" / "worldVisualSurfacePropAssets.js"
KEYS_PATH = ROOT / "values" / "assetKeys.js"
OUTPUT_PATH = (
    ROOT
    / "visual-approval-previews"
    / "2026-07-26-modular-surface-props-scale-sheet-v1.png"
)
PLAYER_HEIGHT_METERS = 1.75
PLAYER_VISIBLE_HEIGHT_TILES = 0.8
TILE_SIZE = 94
INSPECTION_SCALE = 2
CELL_WIDTH = 512
CELL_HEIGHT = 250
HEADER_HEIGHT = 92


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    filename = "bahnschrift.ttf" if not bold else "bahnschrift.ttf"
    path = Path("C:/Windows/Fonts") / filename
    return ImageFont.truetype(path, size) if path.exists() else ImageFont.load_default()


def parse_asset_definitions() -> dict[str, list[tuple[str, float]]]:
    source = VALUES_PATH.read_text(encoding="utf-8")
    sections = {
        "level1": source.split("const LEVEL_ONE", 1)[1].split("const LEVEL_TWO", 1)[0],
        "level2": source.split("const LEVEL_TWO", 1)[1].split(
            "export const WORLD_VISUAL_SURFACE_PROP_ASSETS", 1
        )[0],
    }
    pattern = re.compile(r"^\s*(\w+):\s*asset\(([\d.]+),", re.MULTILINE)
    return {
        level: [(asset_id, float(height)) for asset_id, height in pattern.findall(section)]
        for level, section in sections.items()
    }


def resolve_runtime_asset(level: str, asset_id: str) -> Path:
    source = KEYS_PATH.read_text(encoding="utf-8")
    pattern = re.compile(
        rf'{asset_id}:\s*\{{\s*key:\s*"surface-prop-{level}-{asset_id}-v\d+",'
        rf'\s*path:\s*"([^"]+)"'
    )
    matches = pattern.findall(source)
    if len(matches) != 1:
        raise RuntimeError(f"Expected one live path for {level}/{asset_id}, found {len(matches)}")
    return ROOT / matches[0]


def draw_scale_bracket(draw: ImageDraw.ImageDraw, x: int, baseline: int, height: int) -> None:
    top = baseline - height
    color = (101, 214, 241, 210)
    draw.line((x, top, x, baseline), fill=color, width=2)
    draw.line((x - 6, top, x + 6, top), fill=color, width=2)
    draw.line((x - 6, baseline, x + 6, baseline), fill=color, width=2)
    draw.text(
        (x + 10, top + height // 2 - 11),
        "1.75 m",
        font=font(20),
        fill=(168, 224, 237, 235),
    )


def main() -> None:
    definitions = parse_asset_definitions()
    canvas = Image.new(
        "RGBA",
        (CELL_WIDTH * 3, HEADER_HEIGHT + CELL_HEIGHT * 6),
        (7, 15, 23, 255),
    )
    draw = ImageDraw.Draw(canvas, "RGBA")
    draw.rectangle((0, 0, canvas.width, HEADER_HEIGHT), fill=(10, 24, 35, 255))
    draw.text(
        (36, 17),
        "MODULAR SURFACE PROP KIT — PHYSICAL SCALE REVIEW",
        font=font(34, bold=True),
        fill=(233, 210, 142, 255),
    )
    draw.text(
        (38, 57),
        "2× inspection view • identical runtime ratios • 94 px tile • 1.75 m player = 0.8 tile",
        font=font(20),
        fill=(159, 191, 207, 255),
    )

    pixels_per_meter = (
        PLAYER_VISIBLE_HEIGHT_TILES * TILE_SIZE / PLAYER_HEIGHT_METERS
    ) * INSPECTION_SCALE
    player_height = round(PLAYER_HEIGHT_METERS * pixels_per_meter)

    for level_index, level in enumerate(("level1", "level2")):
        for asset_index, (asset_id, height_meters) in enumerate(definitions[level]):
            row = level_index * 3 + asset_index // 3
            column = asset_index % 3
            left = column * CELL_WIDTH
            top = HEADER_HEIGHT + row * CELL_HEIGHT
            baseline = top + CELL_HEIGHT - 12
            band = (15, 29, 40, 255) if level == "level1" else (27, 22, 27, 255)
            draw.rectangle(
                (left + 3, top + 3, left + CELL_WIDTH - 3, top + CELL_HEIGHT - 3),
                fill=band,
                outline=(82, 103, 114, 180),
                width=1,
            )
            draw.line(
                (left + 18, baseline, left + CELL_WIDTH - 18, baseline),
                fill=(122, 106, 75, 190),
                width=2,
            )
            source_path = resolve_runtime_asset(level, asset_id)
            with Image.open(source_path) as source:
                prop = source.convert("RGBA")
            display_height = round(height_meters * pixels_per_meter)
            display_width = round(prop.width * display_height / prop.height)
            prop = prop.resize((display_width, display_height), Image.Resampling.LANCZOS)
            prop_x = left + (CELL_WIDTH - display_width) // 2 + 38
            prop_y = baseline - display_height
            canvas.alpha_composite(prop, (prop_x, prop_y))
            draw_scale_bracket(draw, left + 28, baseline, player_height)
            draw.text(
                (left + 18, top + 12),
                f"{level.upper()}  •  {asset_id.upper()}",
                font=font(22, bold=True),
                fill=(236, 221, 177, 255),
            )
            runtime_height = height_meters * (
                PLAYER_VISIBLE_HEIGHT_TILES * TILE_SIZE / PLAYER_HEIGHT_METERS
            )
            draw.text(
                (left + 18, top + 42),
                f"{height_meters:.2f} m  •  {runtime_height:.1f} runtime px",
                font=font(17),
                fill=(161, 185, 198, 235),
            )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(OUTPUT_PATH, "PNG", optimize=True)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
