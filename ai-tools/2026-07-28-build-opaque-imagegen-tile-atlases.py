from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SEMANTIC_DIR = ROOT / "sprites/backgrounds/world-visual-v2/semantic-decals-v1"
MASTER_DIR = SEMANTIC_DIR / "imagegen-opaque-v2/masters"
RESOURCE_TILE_DIR = ROOT / "sprites/tiles/resource-tiles-imagegen-v3"
SPECIAL_TILE_DIR = ROOT / "sprites/tiles/special-tiles-imagegen-v3"
PREVIEW_DIR = ROOT / "visual-approval-previews/overground-texture-audit-v2-imagegen"

FRAME_SIZE = 188
GAME_TILE_SIZE = 94
RESOURCE_COLUMNS = 6
SPECIAL_COLUMNS = 4
RECOGNITION_COLUMNS = 8

RESOURCE_MASTER_COMMON = MASTER_DIR / "resources-common-imagegen-master.png"
RESOURCE_MASTER_RARE = MASTER_DIR / "resources-rare-imagegen-master.png"
SPECIAL_MASTER = MASTER_DIR / "special-blocks-imagegen-master.png"
SELL_GAMBLE_MASTER = MASTER_DIR / "sell-gamble-imagegen-master.png"
APPROVED_TELEPORT = ROOT / "sprites/tiles/special-tiles-v2/teleport-tile.webp"
APPROVED_RELIC_CACHE = ROOT / "sprites/tiles/approved-world/ancient-relic-cache-v1.webp"
RECOGNITION_V2 = (
    ROOT
    / "sprites/backgrounds/world-scenic-regions-v1/level1-ground-recognition-atlas-v2.png"
)

RESOURCE_ATLAS = SEMANTIC_DIR / "resource-blocks-imagegen-opaque-v2.png"
SPECIAL_ATLAS = SEMANTIC_DIR / "special-blocks-imagegen-opaque-v2.png"
RECOGNITION_V4 = (
    ROOT
    / "sprites/backgrounds/world-scenic-regions-v1/level1-ground-recognition-atlas-v4.png"
)
CONTACT_SHEET = PREVIEW_DIR / "01-opaque-imagegen-production-contact-sheet.png"
LIVE_RUNTIME_CAPTURE = PREVIEW_DIR / "02-live-runtime-resource-context.png"
LIVE_DENSITY_COMPARISON = PREVIEW_DIR / "04-live-runtime-density-comparison.png"
LIVE_SPECIAL_COMPOSITE = PREVIEW_DIR / "05-special-blocks-live-context-composite.png"


def open_rgb(path: Path) -> Image.Image:
    if not path.exists():
        raise FileNotFoundError(path)
    return Image.open(path).convert("RGB")


def grid_cell(image: Image.Image, columns: int, rows: int, column: int, row: int) -> Image.Image:
    left = round(column * image.width / columns)
    top = round(row * image.height / rows)
    right = round((column + 1) * image.width / columns)
    bottom = round((row + 1) * image.height / rows)
    return ImageOps.fit(
        image.crop((left, top, right, bottom)),
        (min(right - left, bottom - top),) * 2,
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )


def crop_variant(source: Image.Image, variant: int, output_size: int) -> Image.Image:
    if variant == 0:
        crop = source
    else:
        scale = (0.94, 0.90)[variant - 1]
        center = ((0.47, 0.49), (0.53, 0.52))[variant - 1]
        side = round(min(source.size) * scale)
        center_x = round(source.width * center[0])
        center_y = round(source.height * center[1])
        left = max(0, min(source.width - side, center_x - side // 2))
        top = max(0, min(source.height - side, center_y - side // 2))
        crop = source.crop((left, top, left + side, top + side))
    return crop.resize((output_size, output_size), Image.Resampling.LANCZOS).convert("RGB")


def paste_frame(atlas: Image.Image, frame: Image.Image, index: int, columns: int, size: int) -> None:
    atlas.paste(frame, ((index % columns) * size, (index // columns) * size))


def save_webp(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(path, "WEBP", quality=96, method=6)


def build_resource_assets() -> tuple[list[Image.Image], dict[str, Image.Image]]:
    common = open_rgb(RESOURCE_MASTER_COMMON)
    rare = open_rgb(RESOURCE_MASTER_RARE)
    source_cells = {
        "stone": grid_cell(common, 3, 2, 0, 0),
        "copper": grid_cell(common, 3, 2, 1, 0),
        "bronze": grid_cell(common, 3, 2, 2, 0),
        "iron": grid_cell(common, 3, 2, 0, 1),
        "steel": grid_cell(common, 3, 2, 1, 1),
        "silver": grid_cell(rare, 3, 2, 0, 0),
        "gold": grid_cell(rare, 3, 2, 1, 0),
        "obsidian": grid_cell(rare, 3, 2, 2, 0),
        "ember-ore": grid_cell(rare, 3, 2, 0, 1),
        "magma-crystal": grid_cell(rare, 3, 2, 1, 1),
    }
    order = [
        "copper",
        "bronze",
        "steel",
        "iron",
        "silver",
        "gold",
        "obsidian",
        "ember-ore",
        "magma-crystal",
        "stone",
    ]
    frames = [
        crop_variant(source_cells[name], variant, FRAME_SIZE)
        for name in order
        for variant in range(3)
    ]
    atlas_rows = (len(frames) + RESOURCE_COLUMNS - 1) // RESOURCE_COLUMNS
    atlas = Image.new("RGB", (RESOURCE_COLUMNS * FRAME_SIZE, atlas_rows * FRAME_SIZE))
    for index, frame in enumerate(frames):
        paste_frame(atlas, frame, index, RESOURCE_COLUMNS, FRAME_SIZE)
    RESOURCE_ATLAS.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(RESOURCE_ATLAS, "PNG", optimize=True)

    RESOURCE_TILE_DIR.mkdir(parents=True, exist_ok=True)
    game_tiles = {}
    for name in order:
        tile = crop_variant(source_cells[name], 0, GAME_TILE_SIZE)
        game_tiles[name] = tile
        save_webp(tile, RESOURCE_TILE_DIR / f"{name}.webp")
    return frames, game_tiles


def build_special_assets() -> tuple[list[Image.Image], dict[str, Image.Image]]:
    master = open_rgb(SPECIAL_MASTER)
    sell_gamble = open_rgb(SELL_GAMBLE_MASTER)
    generated_cells = {
        "gem-power": grid_cell(master, 3, 3, 0, 0),
        "speed": grid_cell(master, 3, 3, 1, 0),
        "level-up": grid_cell(master, 3, 3, 2, 0),
        "crit": grid_cell(master, 3, 3, 0, 1),
        "berserk": grid_cell(master, 3, 3, 1, 1),
        "combo": grid_cell(master, 3, 3, 2, 1),
        "legend": grid_cell(master, 3, 3, 0, 2),
        "sell": grid_cell(sell_gamble, 2, 2, 0, 0),
        "gamble": grid_cell(sell_gamble, 2, 2, 1, 0),
    }
    atlas_order = ["gem-power", "speed", "level-up", "crit", "berserk", "combo", "legend"]
    frames = [
        crop_variant(generated_cells[name], 0, FRAME_SIZE)
        for name in atlas_order
    ]
    relic = open_rgb(APPROVED_RELIC_CACHE).resize(
        (FRAME_SIZE, FRAME_SIZE),
        Image.Resampling.NEAREST,
    )
    frames.append(relic)
    atlas_rows = (len(frames) + SPECIAL_COLUMNS - 1) // SPECIAL_COLUMNS
    atlas = Image.new("RGB", (SPECIAL_COLUMNS * FRAME_SIZE, atlas_rows * FRAME_SIZE))
    for index, frame in enumerate(frames):
        paste_frame(atlas, frame, index, SPECIAL_COLUMNS, FRAME_SIZE)
    SPECIAL_ATLAS.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(SPECIAL_ATLAS, "PNG", optimize=True)

    SPECIAL_TILE_DIR.mkdir(parents=True, exist_ok=True)
    game_tiles = {}
    for name, source in generated_cells.items():
        tile = crop_variant(source, 0, GAME_TILE_SIZE)
        game_tiles[name] = tile
        save_webp(tile, SPECIAL_TILE_DIR / f"{name}.webp")
    return frames, game_tiles


def build_recognition_atlas(
    resource_frames: list[Image.Image],
    special_frames: list[Image.Image],
    special_tiles: dict[str, Image.Image],
) -> None:
    atlas = open_rgb(RECOGNITION_V2)
    expected_width = RECOGNITION_COLUMNS * GAME_TILE_SIZE
    if atlas.width != expected_width or atlas.height < 6 * GAME_TILE_SIZE:
        raise ValueError(f"Unexpected recognition atlas dimensions: {atlas.size}")

    for index, frame in enumerate(resource_frames):
        paste_frame(
            atlas,
            frame.resize((GAME_TILE_SIZE, GAME_TILE_SIZE), Image.Resampling.LANCZOS),
            index,
            RECOGNITION_COLUMNS,
            GAME_TILE_SIZE,
        )

    teleport = open_rgb(APPROVED_TELEPORT).resize(
        (GAME_TILE_SIZE, GAME_TILE_SIZE),
        Image.Resampling.NEAREST,
    )
    paste_frame(atlas, teleport, 30, RECOGNITION_COLUMNS, GAME_TILE_SIZE)
    paste_frame(atlas, special_tiles["gamble"], 31, RECOGNITION_COLUMNS, GAME_TILE_SIZE)

    for offset, frame in enumerate(special_frames[:7]):
        paste_frame(
            atlas,
            frame.resize((GAME_TILE_SIZE, GAME_TILE_SIZE), Image.Resampling.LANCZOS),
            32 + offset,
            RECOGNITION_COLUMNS,
            GAME_TILE_SIZE,
        )

    relic = open_rgb(APPROVED_RELIC_CACHE).resize(
        (GAME_TILE_SIZE, GAME_TILE_SIZE),
        Image.Resampling.NEAREST,
    )
    paste_frame(atlas, relic, 42, RECOGNITION_COLUMNS, GAME_TILE_SIZE)
    RECOGNITION_V4.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(RECOGNITION_V4, "PNG", optimize=True)


def text_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def build_contact_sheet(
    resource_tiles: dict[str, Image.Image],
    special_tiles: dict[str, Image.Image],
) -> None:
    width, height = 1440, 910
    canvas = Image.new("RGB", (width, height), "#090c12")
    draw = ImageDraw.Draw(canvas)
    title_font = text_font(34, bold=True)
    section_font = text_font(23, bold=True)
    label_font = text_font(16, bold=True)
    note_font = text_font(16)
    draw.text((52, 34), "OVERGROUND TEXTURE AUDIT V2 — OPAQUE IMAGEGEN PRODUCTION", fill="#f3f6ff", font=title_font)
    draw.text((52, 82), "Full raster blocks • zero transparency • no runtime-drawn ore or reward overlays", fill="#9eacc4", font=note_font)

    tile_display = 152
    gap = 22
    left = 52

    draw.text((left, 126), "RESOURCE BLOCKS — ALL PRIOR TEXTURES REJECTED", fill="#f4c66c", font=section_font)
    resource_order = [
        "stone",
        "copper",
        "bronze",
        "iron",
        "steel",
        "silver",
        "gold",
        "obsidian",
        "ember-ore",
        "magma-crystal",
    ]
    for index, name in enumerate(resource_order):
        column = index % 5
        row = index // 5
        x = left + column * (tile_display + gap)
        y = 174 + row * 206
        tile = resource_tiles[name].resize((tile_display, tile_display), Image.Resampling.LANCZOS)
        canvas.paste(tile, (x, y))
        draw.text((x, y + tile_display + 9), name.replace("-", " ").upper(), fill="#dce4f2", font=label_font)

    special_top = 588
    draw.text((left, special_top), "SPECIAL BLOCKS — LATEST TELEPORT PRESERVED", fill="#b993ff", font=section_font)
    teleport = open_rgb(APPROVED_TELEPORT)
    special_preview = [
        ("teleport approved", teleport),
        ("gem power", special_tiles["gem-power"]),
        ("speed", special_tiles["speed"]),
        ("level up", special_tiles["level-up"]),
        ("crit", special_tiles["crit"]),
        ("berserk", special_tiles["berserk"]),
        ("combo", special_tiles["combo"]),
        ("legend", special_tiles["legend"]),
        ("sell", special_tiles["sell"]),
        ("gamble", special_tiles["gamble"]),
    ]
    special_display = 116
    special_gap = 21
    for index, (name, source) in enumerate(special_preview):
        x = left + index * (special_display + special_gap)
        y = special_top + 46
        tile = source.resize((special_display, special_display), Image.Resampling.LANCZOS)
        canvas.paste(tile, (x, y))
        label = name.upper()
        box = draw.textbbox((0, 0), label, font=label_font)
        draw.text(
            (x + (special_display - (box[2] - box[0])) / 2, y + special_display + 9),
            label,
            fill="#dce4f2",
            font=label_font,
        )
    draw.text(
        (left, 850),
        "Teleport is the existing approved special-tiles-v2 asset. Relic Cache remains unchanged and is not shown here.",
        fill="#8f9cb0",
        font=note_font,
    )
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    canvas.save(CONTACT_SHEET, "PNG", optimize=True)


def captioned_live_panel(
    canvas: Image.Image,
    image: Image.Image,
    top: int,
    caption: str,
    caption_color: str,
) -> None:
    draw = ImageDraw.Draw(canvas)
    panel_left = 50
    draw.text((panel_left, top), caption, fill=caption_color, font=text_font(21, bold=True))
    canvas.paste(image, (panel_left, top + 38))


def build_live_context_examples(
    resource_tiles: dict[str, Image.Image],
    special_tiles: dict[str, Image.Image],
) -> list[Path]:
    if not LIVE_RUNTIME_CAPTURE.exists():
        print(f"Skipped live-context comparisons; capture not found: {LIVE_RUNTIME_CAPTURE.relative_to(ROOT)}")
        return []

    live = open_rgb(LIVE_RUNTIME_CAPTURE)
    crop_top = max(0, live.height - 330)
    live_crop = live.crop((0, crop_top, live.width, live.height))
    density = live_crop.copy()
    resource_order = [
        "stone",
        "copper",
        "bronze",
        "iron",
        "steel",
        "silver",
        "gold",
        "obsidian",
        "ember-ore",
        "magma-crystal",
    ]
    for row, y in enumerate((104, 198)):
        for column, x in enumerate(range(0, density.width, GAME_TILE_SIZE)):
            name = resource_order[(column + row * 3) % len(resource_order)]
            density.paste(resource_tiles[name], (x, y))
    # HUD stays above terrain in the real renderer.
    density.paste(live_crop.crop((376, 242, 912, 330)), (376, 242))
    density.paste(live_crop.crop((1138, 190, 1280, 330)), (1138, 190))

    comparison = Image.new("RGB", (live.width + 100, 850), "#080b11")
    draw = ImageDraw.Draw(comparison)
    draw.text(
        (50, 28),
        "REAL GAMEPLAY DENSITY CHECK — EXACT 94 PX PRODUCTION TILES",
        fill="#f4f7ff",
        font=text_font(30, bold=True),
    )
    draw.text(
        (50, 66),
        "Top is an untouched Phaser runtime capture. Bottom changes placement density only.",
        fill="#9ba8ba",
        font=text_font(16),
    )
    captioned_live_panel(
        comparison,
        live_crop,
        104,
        "ACTUAL RUNTIME — RESOURCE CELLS ONLY",
        "#74d6b4",
    )
    captioned_live_panel(
        comparison,
        density,
        500,
        "EXACT-PIXEL DENSITY SIMULATION — EVERY GROUND CELL (REJECT)",
        "#ff8c79",
    )
    comparison.save(LIVE_DENSITY_COMPARISON, "PNG", optimize=True)

    special_context = live_crop.copy()
    special_preview = [
        open_rgb(APPROVED_TELEPORT).resize((GAME_TILE_SIZE, GAME_TILE_SIZE), Image.Resampling.NEAREST),
        special_tiles["gamble"],
        special_tiles["gem-power"],
        special_tiles["speed"],
        special_tiles["level-up"],
        special_tiles["crit"],
        special_tiles["berserk"],
        special_tiles["combo"],
        special_tiles["legend"],
        open_rgb(APPROVED_RELIC_CACHE).resize((GAME_TILE_SIZE, GAME_TILE_SIZE), Image.Resampling.NEAREST),
    ]
    start_x = round((special_context.width - len(special_preview) * GAME_TILE_SIZE) / 2)
    for index, tile in enumerate(special_preview):
        special_context.paste(tile, (start_x + index * GAME_TILE_SIZE, 112))
    special_context.paste(live_crop.crop((376, 242, 912, 330)), (376, 242))
    special_context.paste(live_crop.crop((1138, 190, 1280, 330)), (1138, 190))

    special_sheet = Image.new("RGB", (live.width + 100, 470), "#080b11")
    draw = ImageDraw.Draw(special_sheet)
    draw.text(
        (50, 28),
        "SPECIAL BLOCKS AT TRUE GAME SCALE",
        fill="#f4f7ff",
        font=text_font(30, bold=True),
    )
    draw.text(
        (50, 66),
        "Exact production pixels over a live mine capture; placement composite only, not a renderer capture.",
        fill="#9ba8ba",
        font=text_font(16),
    )
    captioned_live_panel(
        special_sheet,
        special_context,
        104,
        "TELEPORT • GAMBLE • GEM • SPEED • LEVEL • CRIT • BERSERK • COMBO • LEGEND • RELIC",
        "#b993ff",
    )
    special_sheet.save(LIVE_SPECIAL_COMPOSITE, "PNG", optimize=True)
    return [LIVE_DENSITY_COMPARISON, LIVE_SPECIAL_COMPOSITE]


def checksum(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:16]


def assert_opaque(path: Path) -> None:
    image = Image.open(path)
    if image.mode in {"RGBA", "LA"}:
        alpha = image.getchannel("A")
        if alpha.getextrema() != (255, 255):
            raise ValueError(f"Transparency detected in {path}: {alpha.getextrema()}")


def main() -> None:
    resource_frames, resource_tiles = build_resource_assets()
    special_frames, special_tiles = build_special_assets()
    build_recognition_atlas(resource_frames, special_frames, special_tiles)
    build_contact_sheet(resource_tiles, special_tiles)
    live_outputs = build_live_context_examples(resource_tiles, special_tiles)

    outputs = [RESOURCE_ATLAS, SPECIAL_ATLAS, RECOGNITION_V4, CONTACT_SHEET]
    outputs.extend(live_outputs)
    outputs.extend(sorted(RESOURCE_TILE_DIR.glob("*.webp")))
    outputs.extend(sorted(SPECIAL_TILE_DIR.glob("*.webp")))
    for output in outputs:
        assert_opaque(output)
        relative = output.relative_to(ROOT)
        print(f"{relative}  sha256:{checksum(output)}  mode:{Image.open(output).mode}")


if __name__ == "__main__":
    main()
