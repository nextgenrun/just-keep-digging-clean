from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_SHEET = Path(
    r"C:\Users\Mila\.codex\generated_images\019f18a9-92e6-7452-b0cc-666eb7f1af83"
    r"\ig_0f179aad2c629059016a471054998481918c259ef8c2a01d9e.png"
)

TILE_SIZE = 94
ICON_SIZE = 64

FAMILIES = (
    ("lava-dirt", "lava-dirt-icon.webp"),
    ("obsidian", "obsidian-icon.webp"),
    ("ember-ore", "ember-ore-icon.webp"),
    ("magma-crystal", "magma-crystal-icon.webp"),
)

# Crop boxes are measured from the approved 4x5 visual sheet.
# Rows are material families; columns are damage stages from intact to broken.
COLUMNS = (
    (31, 31, 270, 282),
    (307, 31, 548, 282),
    (584, 31, 820, 282),
    (862, 31, 1104, 282),
    (1137, 31, 1371, 282),
)

ROWS = (
    (31, 282),
    (311, 550),
    (578, 817),
    (843, 1092),
)


def crop_square(sheet, column_box, row_box):
    left, _, right, _ = column_box
    top, bottom = row_box
    crop = sheet.crop((left, top, right, bottom))
    width, height = crop.size
    size = max(width, height)
    square = Image.new("RGB", (size, size), (9, 13, 13))
    square.paste(crop, ((size - width) // 2, (size - height) // 2))
    return square


def save_tile(image, out_path):
    image.resize((TILE_SIZE, TILE_SIZE), Image.Resampling.LANCZOS).save(
        out_path,
        "WEBP",
        quality=95,
        method=6,
    )


def save_icon(image, out_path):
    image.resize((ICON_SIZE, ICON_SIZE), Image.Resampling.LANCZOS).convert("RGBA").save(
        out_path,
        "WEBP",
        quality=95,
        method=6,
    )


def build_preview(tiles):
    preview = Image.new("RGBA", (TILE_SIZE * 5, TILE_SIZE * 4), (12, 14, 14, 255))
    for row_index, row in enumerate(tiles):
        for column_index, tile in enumerate(row):
            preview.paste(tile.convert("RGBA"), (column_index * TILE_SIZE, row_index * TILE_SIZE))
    return preview


def main():
    if not SOURCE_SHEET.exists():
        raise FileNotFoundError(f"Approved source sheet not found: {SOURCE_SHEET}")

    sheet = Image.open(SOURCE_SHEET).convert("RGB")
    exported_tiles = []

    for row_index, (family, icon_name) in enumerate(FAMILIES):
        family_dir = ROOT / "sprites" / "tiles" / "second-world" / family
        family_dir.mkdir(parents=True, exist_ok=True)
        row_tiles = []

        for column_index, column_box in enumerate(COLUMNS, start=1):
            tile = crop_square(sheet, column_box, ROWS[row_index])
            row_tiles.append(tile.resize((TILE_SIZE, TILE_SIZE), Image.Resampling.LANCZOS))
            save_tile(tile, family_dir / f"{column_index}-of-5-hp.webp")

        icon_dir = ROOT / "sprites" / "UI" / "second-world"
        icon_dir.mkdir(parents=True, exist_ok=True)
        save_icon(row_tiles[0], icon_dir / icon_name)
        exported_tiles.append(row_tiles)

    preview_dir = ROOT / "sprites" / "tiles" / "second-world" / "previews"
    preview_dir.mkdir(parents=True, exist_ok=True)
    build_preview(exported_tiles).save(preview_dir / "second-world-contact-sheet.png")
    sheet.save(preview_dir / "approved-red-volcanic-source-sheet.png")


if __name__ == "__main__":
    main()
