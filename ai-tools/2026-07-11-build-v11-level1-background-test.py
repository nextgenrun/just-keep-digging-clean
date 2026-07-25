from __future__ import annotations

import base64
import copy
import struct
import xml.etree.ElementTree as ET
import zlib
from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_TMX = ROOT / "exports" / "dig-game-world-edit-v-7-30-06-2026-;layered.tmx"
TARGET_TMX = ROOT / "exports" / "dig-game-world-edit-v-11-08-07-2026-;1-img-test.tmx"
ASSET_DIR = ROOT / "sprites" / "backgrounds" / "world-v11-test"
TARGET_TSX = ASSET_DIR / "level-1-background-bands-v1.tsx"

TILE_SIZE = 94
LEVEL_X_TILE = 41
LEVEL_WIDTH_TILES = 118
SURFACE_X_TILE = 0
SURFACE_WIDTH_TILES = 159
BAND_HEIGHT_TILES = 250
BAND_OVERLAP_TILES = 25
SOURCE_PIXELS_PER_TILE = 32
BACKGROUND_FIRST_GID = 50000
BACKGROUND_LAYER_ID = 24

SOURCE_NAMES = [
    "level-1-band-01-ground-row-65-master.png",
    *[f"level-1-band-{index:02d}-source.png" for index in range(2, 11)],
]
OUTPUT_NAMES = [f"level-1-band-{index:02d}-hires.png" for index in range(1, 11)]


def decode_layer_gids(layer: ET.Element) -> set[int]:
    data = layer.find("data")
    if data is None or data.get("encoding") != "base64" or data.get("compression") != "zlib":
        raise ValueError(f"Unsupported tile encoding in {layer.get('name')}")
    payload = zlib.decompress(base64.b64decode("".join(data.itertext()).strip()))
    gids = struct.unpack(f"<{len(payload) // 4}I", payload)
    return {gid & 0x1FFFFFFF for gid in gids if gid & 0x1FFFFFFF}


def required_tilesets(root: ET.Element, layers: list[ET.Element]) -> list[ET.Element]:
    tilesets = sorted(root.findall("tileset"), key=lambda element: int(element.get("firstgid", "0")))
    used_gids = set().union(*(decode_layer_gids(layer) for layer in layers))
    required: set[int] = set()
    for gid in used_gids:
        selected_index = None
        for index, tileset in enumerate(tilesets):
            if int(tileset.get("firstgid", "0")) <= gid:
                selected_index = index
            else:
                break
        if selected_index is not None:
            required.add(selected_index)
    return [copy.deepcopy(tilesets[index]) for index in sorted(required)]


def crop_to_ratio(image: Image.Image, target_ratio: float) -> Image.Image:
    source_ratio = image.width / image.height
    if source_ratio > target_ratio:
        width = round(image.height * target_ratio)
        left = (image.width - width) // 2
        return image.crop((left, 0, left + width, image.height))
    height = round(image.width / target_ratio)
    top = (image.height - height) // 2
    return image.crop((0, top, image.width, top + height))


def apply_top_feather(image: Image.Image, feather_height: int) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = Image.new("L", rgba.size, 255)
    gradient = Image.new("L", (1, feather_height))
    gradient.putdata([round(255 * row / max(1, feather_height - 1)) for row in range(feather_height)])
    alpha.paste(gradient.resize((rgba.width, feather_height)), (0, 0))
    rgba.putalpha(alpha)
    return rgba


def band_x_and_width(index: int) -> tuple[int, int]:
    return (SURFACE_X_TILE, SURFACE_WIDTH_TILES) if index == 0 else (LEVEL_X_TILE, LEVEL_WIDTH_TILES)


def build_hires_bands() -> list[tuple[int, int]]:
    output_height = BAND_HEIGHT_TILES * SOURCE_PIXELS_PER_TILE
    output_sizes: list[tuple[int, int]] = []

    for index, (source_name, output_name) in enumerate(zip(SOURCE_NAMES, OUTPUT_NAMES)):
        _, width_tiles = band_x_and_width(index)
        output_width = width_tiles * SOURCE_PIXELS_PER_TILE
        target_ratio = output_width / output_height
        source_path = ASSET_DIR / source_name
        if not source_path.exists():
            raise FileNotFoundError(source_path)
        with Image.open(source_path) as source:
            image = crop_to_ratio(source.convert("RGB"), target_ratio)
            image = image.resize((output_width, output_height), Image.Resampling.LANCZOS)
            image = image.filter(ImageFilter.UnsharpMask(radius=1.1, percent=72, threshold=3))
            if index > 0:
                image = apply_top_feather(image, BAND_OVERLAP_TILES * SOURCE_PIXELS_PER_TILE)
            else:
                image = image.convert("RGBA")
            image.save(ASSET_DIR / output_name, optimize=True)
            output_sizes.append(image.size)
    return output_sizes


def build_background_tsx(output_sizes: list[tuple[int, int]]) -> None:
    tileset = ET.Element(
        "tileset",
        {
            "version": "1.10",
            "tiledversion": "1.12.0",
            "name": "level-1-background-bands-v1",
            "tilewidth": str(max(width for width, _ in output_sizes)),
            "tileheight": str(max(height for _, height in output_sizes)),
            "tilecount": str(len(output_sizes)),
            "columns": "0",
        },
    )
    for tile_id, (output_name, (width, height)) in enumerate(zip(OUTPUT_NAMES, output_sizes)):
        tile = ET.SubElement(tileset, "tile", {"id": str(tile_id)})
        ET.SubElement(tile, "image", {"source": output_name, "width": str(width), "height": str(height)})
    ET.indent(tileset, space=" ")
    ET.ElementTree(tileset).write(TARGET_TSX, encoding="UTF-8", xml_declaration=True)


def add_property(parent: ET.Element, name: str, value: str, property_type: str | None = None) -> None:
    attributes = {"name": name, "value": value}
    if property_type:
        attributes["type"] = property_type
    ET.SubElement(parent, "property", attributes)


def build_background_group() -> ET.Element:
    group = ET.Element(
        "objectgroup",
        {
            "id": str(BACKGROUND_LAYER_ID),
            "name": "V11_LEVEL1_COMPOSITION_MASTER",
            "locked": "1",
            "draworder": "index",
        },
    )
    destination_height = BAND_HEIGHT_TILES * TILE_SIZE
    step_tiles = BAND_HEIGHT_TILES - BAND_OVERLAP_TILES

    for index, output_name in enumerate(OUTPUT_NAMES):
        x_tile, width_tiles = band_x_and_width(index)
        destination_x = x_tile * TILE_SIZE
        destination_width = width_tiles * TILE_SIZE
        top_tile = index * step_tiles
        top_y = top_tile * TILE_SIZE
        obj = ET.SubElement(
            group,
            "object",
            {
                "id": str(index + 1),
                "name": output_name.removesuffix(".png"),
                "type": "v11_level1_background_band",
                "gid": str(BACKGROUND_FIRST_GID + index),
                "x": str(destination_x),
                "y": str(top_y + destination_height),
                "width": str(destination_width),
                "height": str(destination_height),
            },
        )
        properties = ET.SubElement(obj, "properties")
        add_property(properties, "topTileY", str(top_tile), "int")
        add_property(properties, "leftTileX", str(x_tile), "int")
        add_property(properties, "widthTiles", str(width_tiles), "int")
        add_property(properties, "heightTiles", str(BAND_HEIGHT_TILES), "int")
        add_property(properties, "overlapTiles", str(BAND_OVERLAP_TILES), "int")
        add_property(properties, "placementFormula", "pixel = tile * 94")
    return group


def build_test_tmx() -> None:
    source_root = ET.parse(SOURCE_TMX).getroot()
    tile_layer_names = {"00_PAINT_HERE_tile_types", "01_OPTIONAL_root_overlays"}
    tile_layers = [layer for layer in source_root.findall("layer") if layer.get("name") in tile_layer_names]
    if len(tile_layers) != 2:
        raise RuntimeError("Expected both v7 gameplay tile layers")

    attributes = dict(source_root.attrib)
    attributes["nextlayerid"] = str(BACKGROUND_LAYER_ID + 1)
    attributes["nextobjectid"] = str(len(OUTPUT_NAMES) + 1)
    target_root = ET.Element("map", attributes)

    properties = ET.SubElement(target_root, "properties")
    add_property(properties, "sourceMap", SOURCE_TMX.name)
    add_property(properties, "backgroundTestStatus", "complete-level-1-composition-master")
    add_property(properties, "backgroundPlacement", "surface x=0..158; mine x=41..158; band=250 tiles; overlap=25 tiles")
    add_property(properties, "runtimeWired", "false", "bool")

    for tileset in required_tilesets(source_root, tile_layers):
        target_root.append(tileset)
    target_root.append(
        ET.Element(
            "tileset",
            {
                "firstgid": str(BACKGROUND_FIRST_GID),
                "source": "../sprites/backgrounds/world-v11-test/level-1-background-bands-v1.tsx",
            },
        )
    )
    target_root.append(build_background_group())
    for layer in tile_layers:
        target_root.append(copy.deepcopy(layer))

    ET.indent(target_root, space=" ")
    ET.ElementTree(target_root).write(TARGET_TMX, encoding="UTF-8", xml_declaration=True)


def main() -> None:
    Image.MAX_IMAGE_PIXELS = None
    output_sizes = build_hires_bands()
    build_background_tsx(output_sizes)
    build_test_tmx()
    print(f"Built {TARGET_TMX}")
    print(f"Level 1 master coverage: town x=0..158, mine x=41..158, y=0..2119 tiles")
    print(f"Surface source size: {output_sizes[0][0]}x{output_sizes[0][1]} px")
    print(f"Mine source size: {output_sizes[1][0]}x{output_sizes[1][1]} px")


if __name__ == "__main__":
    main()
