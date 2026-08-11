from __future__ import annotations

import copy
import importlib.util
import shutil
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TMX = ROOT / "exports" / "dig-game-world-edit-v-11-08-07-2026-;1-img-test.tmx"
BACKUP = ROOT / "exports" / "dig-game-world-edit-v-11-08-07-2026-;1-img-test-before-0-20m-v3.tmx"
ASSET_DIR = ROOT / "sprites" / "backgrounds" / "world-v11-scale-correct-0-20m-v3"
TSX = ASSET_DIR / "v11-scale-correct-0-20m-v3.tsx"
COMPOSITOR = ROOT / "ai-tools" / "2026-07-11-v11-0-20m-compositor.py"

GROUP_NAME = "V11_SCALE_CORRECT_SKY_GROUND_0_20M_V3"
TILESET_SOURCE = "../sprites/backgrounds/world-v11-scale-correct-0-20m-v3/v11-scale-correct-0-20m-v3.tsx"
FIRST_GID = 50000
TILE_SIZE = 94


def load_compositor():
    spec = importlib.util.spec_from_file_location("v11_background_compositor", COMPOSITOR)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {COMPOSITOR}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def add_property(parent: ET.Element, name: str, value: str, kind: str | None = None) -> None:
    attributes = {"name": name, "value": value}
    if kind:
        attributes["type"] = kind
    ET.SubElement(parent, "property", attributes)


def build_tsx(specs) -> None:
    tileset = ET.Element(
        "tileset",
        {
            "version": "1.10",
            "tiledversion": "1.12.0",
            "name": "v11-scale-correct-0-20m-v3",
            "tilewidth": str(max(item.width_px for item in specs)),
            "tileheight": str(max(item.height_px for item in specs)),
            "tilecount": str(len(specs)),
            "columns": "0",
        },
    )
    properties = ET.SubElement(tileset, "properties")
    add_property(properties, "characterTiles", "0.8", "float")
    add_property(properties, "characterMeters", "1.7", "float")
    add_property(properties, "metersPerTile", "2.125", "float")
    add_property(properties, "maxDepthMeters", "20", "float")
    add_property(properties, "doorTiles", "1", "float")
    add_property(properties, "fenceTiles", "0.3", "float")
    for tile_id, item in enumerate(specs):
        tile = ET.SubElement(tileset, "tile", {"id": str(tile_id)})
        ET.SubElement(tile, "image", {"source": f"chunks/{item.name}", "width": str(item.width_px), "height": str(item.height_px)})
    ET.indent(tileset, space=" ")
    ET.ElementTree(tileset).write(TSX, encoding="UTF-8", xml_declaration=True)


def replace_generated_elements(root: ET.Element, specs) -> None:
    for tileset in list(root.findall("tileset")):
        if tileset.get("source") == TILESET_SOURCE:
            root.remove(tileset)
    for group in list(root.findall("objectgroup")):
        if group.get("name") == GROUP_NAME:
            root.remove(group)

    new_tileset = ET.Element("tileset", {"firstgid": str(FIRST_GID), "source": TILESET_SOURCE})
    children = list(root)
    insert_tileset_at = max((index for index, item in enumerate(children) if item.tag == "tileset"), default=-1) + 1
    root.insert(insert_tileset_at, new_tileset)

    next_layer_id = max((int(item.get("id", "0")) for item in root.findall("objectgroup") + root.findall("layer")), default=0) + 1
    next_object_id = max((int(item.get("id", "0")) for group in root.findall("objectgroup") for item in group.findall("object")), default=0) + 1
    group = ET.Element("objectgroup", {"id": str(next_layer_id), "name": GROUP_NAME, "draworder": "index", "locked": "1"})
    properties = ET.SubElement(group, "properties")
    add_property(properties, "scope", "sky, ground, and exactly 0-20m")
    add_property(properties, "groundRow", "105", "int")
    add_property(properties, "maxYTile", "114.41176470588235", "float")
    add_property(properties, "metersPerTile", "2.125", "float")
    add_property(properties, "runtimeWired", "false", "bool")

    for index, item in enumerate(specs):
        target_width = item.width_tiles * TILE_SIZE
        target_height = item.height_tiles * TILE_SIZE
        obj = ET.SubElement(
            group,
            "object",
            {
                "id": str(next_object_id + index),
                "name": item.name.removesuffix(".webp"),
                "type": "v11_scale_correct_background_chunk",
                "gid": str(FIRST_GID + index),
                "x": f"{item.x_tile * TILE_SIZE:.6f}",
                "y": f"{(item.y_tile * TILE_SIZE) + target_height:.6f}",
                "width": f"{target_width:.6f}",
                "height": f"{target_height:.6f}",
            },
        )
        obj_properties = ET.SubElement(obj, "properties")
        add_property(obj_properties, "leftTileX", f"{item.x_tile:g}", "float")
        add_property(obj_properties, "topTileY", f"{item.y_tile:g}", "float")
        add_property(obj_properties, "widthTiles", f"{item.width_tiles:g}", "float")
        add_property(obj_properties, "heightTiles", f"{item.height_tiles:g}", "float")

    children = list(root)
    first_tile_layer = next((index for index, item in enumerate(children) if item.tag == "layer"), len(children))
    root.insert(first_tile_layer, group)
    root.set("nextlayerid", str(next_layer_id + 1))
    root.set("nextobjectid", str(next_object_id + len(specs)))


def update_map_properties(root: ET.Element) -> None:
    properties = root.find("properties")
    if properties is None:
        properties = ET.Element("properties")
        root.insert(0, properties)
    for prop in list(properties.findall("property")):
        if prop.get("name") in {"v11BackgroundGeneration", "v11BackgroundScope", "v11BackgroundRuntimeWired"}:
            properties.remove(prop)
    add_property(properties, "v11BackgroundGeneration", "scale-correct-0-20m-v3")
    add_property(properties, "v11BackgroundScope", "ground row 105 to exact 20m cutoff row 114.4117647")
    add_property(properties, "v11BackgroundRuntimeWired", "false", "bool")


def main() -> None:
    if not BACKUP.exists():
        shutil.copy2(TMX, BACKUP)
    compositor = load_compositor()
    specs = compositor.build_all(ASSET_DIR)
    build_tsx(specs)

    tree = ET.parse(TMX)
    root = tree.getroot()
    update_map_properties(root)
    replace_generated_elements(root, specs)
    ET.indent(root, space=" ")
    tree.write(TMX, encoding="UTF-8", xml_declaration=True)

    print(f"Backed up original to {BACKUP}")
    print(f"Built {len(specs)} native-resolution chunks")
    print(f"Updated {TMX}")
    print("Maximum new background Y: row 114.4117647 (exactly 20m below row 105)")


if __name__ == "__main__":
    main()
