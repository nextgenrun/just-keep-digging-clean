from __future__ import annotations

import base64
import json
import struct
import zlib
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
SOURCE_TMX = ROOT / "exports" / "dig-game-world-edit-v-5-26-06-2026.tmx"
OUTPUT_JS = ROOT / "values" / "tiledWorldOverrideData.js"

LAYER_NAME = "00_PAINT_HERE_tile_types"
CROP_X = 40
CROP_Y = 40
WORLD_WIDTH = 120
WORLD_HEIGHT = 2000

GID_NO_OVERRIDE = 0
GID_EXPLICIT_AIR = 1
GID_AUTHORING_TILE_24 = 25

TILE_TYPE_AIR = 0
TILE_TYPE_DIRT = 1
TILE_TYPE_STONE = 2
TILE_TYPE_COPPER = 3
TILE_TYPE_BEDROCK = 4
TILE_TYPE_DARK_DIRT_NORMAL = 5
TILE_TYPE_DARK_DIRT_STRONG = 6
TILE_TYPE_BRONZE = 7
TILE_TYPE_STEEL = 8
TILE_TYPE_IRON = 9
TILE_TYPE_SILVER = 10
TILE_TYPE_GOLD = 11
TILE_TYPE_TELEPORT_TILE = 12
TILE_TYPE_GAMBLE_TILE = 13
TILE_TYPE_FLOOR_TOWN_1 = 14
TILE_TYPE_FLOOR_TOWN_2 = 15
TILE_TYPE_GEM_POWER_BLOCK = 17
TILE_TYPE_SPEED_BLOCK = 18
TILE_TYPE_XP_BLOCK = 19
TILE_TYPE_CRIT_BLOCK = 20
TILE_TYPE_BERSERK_BLOCK = 21
TILE_TYPE_COMBO_BLOCK = 22
TILE_TYPE_LEGEND_BLOCK = 23
TILE_TYPE_GEODE_WALL = 28
TILE_TYPE_CHEST = 29
AUTHORING_TILESET_FIRSTGID = 1
AUTHORING_TILESET_TILECOUNT = 31
RUNTIME_RENDER_FIRSTGID_IN_WORLD_EDIT = 145
SOIL_ATLAS_FRAME_COUNT = 900
SOIL_TYPE_COUNT = 3
SOIL_RARITY_COUNT = 4
SOIL_DAMAGE_STAGE_COUNT = 5
RUNTIME_DAMAGE_TILE_TYPES = [
    TILE_TYPE_DIRT,
    TILE_TYPE_STONE,
    TILE_TYPE_COPPER,
    TILE_TYPE_DARK_DIRT_NORMAL,
    TILE_TYPE_DARK_DIRT_STRONG,
    TILE_TYPE_BRONZE,
    TILE_TYPE_STEEL,
    TILE_TYPE_IRON,
    TILE_TYPE_SILVER,
    TILE_TYPE_GOLD,
]
RUNTIME_STATIC_LOCAL_ID_TO_TILE_TYPE = {
    950: TILE_TYPE_BEDROCK,
    951: TILE_TYPE_BEDROCK,
    952: TILE_TYPE_BEDROCK,
    953: TILE_TYPE_BEDROCK,
    954: TILE_TYPE_GEODE_WALL,
    955: TILE_TYPE_BEDROCK,
    956: TILE_TYPE_CHEST,
    957: TILE_TYPE_CHEST,
    958: TILE_TYPE_TELEPORT_TILE,
    959: TILE_TYPE_GAMBLE_TILE,
    960: TILE_TYPE_FLOOR_TOWN_1,
    961: TILE_TYPE_FLOOR_TOWN_2,
    962: TILE_TYPE_GEM_POWER_BLOCK,
    963: TILE_TYPE_SPEED_BLOCK,
    964: TILE_TYPE_XP_BLOCK,
    966: TILE_TYPE_CRIT_BLOCK,
    967: TILE_TYPE_BERSERK_BLOCK,
    968: TILE_TYPE_COMBO_BLOCK,
    969: TILE_TYPE_LEGEND_BLOCK,
    972: 27,
}
RUNTIME_STATIC_LOCAL_IDS_TO_IGNORE = {965, 970, 971}
TILED_GID_FLAG_MASK = 0x0FFFFFFF


def decode_layer_data(data_el: ET.Element) -> list[int]:
    encoding = data_el.attrib.get("encoding")
    compression = data_el.attrib.get("compression")
    if encoding != "base64" or compression != "zlib":
        raise ValueError(
            f"Unsupported Tiled data format for {LAYER_NAME}: "
            f"encoding={encoding!r}, compression={compression!r}"
        )

    raw = zlib.decompress(base64.b64decode((data_el.text or "").strip()))
    return list(struct.unpack(f"<{len(raw) // 4}I", raw))


def find_tile_layer(root: ET.Element) -> ET.Element:
    for layer in root.findall("layer"):
        if layer.attrib.get("name") == LAYER_NAME:
            return layer
    raise ValueError(f"Missing required Tiled layer: {LAYER_NAME}")


def authored_gid_to_tile_type(gid: int) -> int | None:
    gid &= TILED_GID_FLAG_MASK

    if gid == GID_NO_OVERRIDE:
        return None

    if gid == GID_AUTHORING_TILE_24:
        return TILE_TYPE_BEDROCK

    if AUTHORING_TILESET_FIRSTGID <= gid < AUTHORING_TILESET_FIRSTGID + AUTHORING_TILESET_TILECOUNT:
        return gid - AUTHORING_TILESET_FIRSTGID

    runtime_tile_type = runtime_gid_to_tile_type(gid)
    if runtime_tile_type is not None:
        return runtime_tile_type

    if gid - RUNTIME_RENDER_FIRSTGID_IN_WORLD_EDIT in RUNTIME_STATIC_LOCAL_IDS_TO_IGNORE:
        return None

    if gid >= 5000:
        return None

    raise ValueError(f"Unsupported non-authoring GID in runtime crop: {gid}")


def runtime_gid_to_tile_type(gid: int) -> int | None:
    local_id = gid - RUNTIME_RENDER_FIRSTGID_IN_WORLD_EDIT
    if local_id < 0:
        return None

    if local_id < SOIL_ATLAS_FRAME_COUNT:
        soil_tuple_index = local_id // (SOIL_RARITY_COUNT * SOIL_DAMAGE_STAGE_COUNT)
        soil_type_index = soil_tuple_index % SOIL_TYPE_COUNT
        return [TILE_TYPE_DIRT, TILE_TYPE_DARK_DIRT_NORMAL, TILE_TYPE_DARK_DIRT_STRONG][soil_type_index]

    damage_start = SOIL_ATLAS_FRAME_COUNT
    damage_end = damage_start + len(RUNTIME_DAMAGE_TILE_TYPES) * 5
    if damage_start <= local_id < damage_end:
        return RUNTIME_DAMAGE_TILE_TYPES[(local_id - damage_start) // 5]

    return RUNTIME_STATIC_LOCAL_ID_TO_TILE_TYPE.get(local_id)


def append_run(flat_runs: list[int], start: int, length: int, tile_type: int) -> None:
    if length <= 0:
        return

    if flat_runs and flat_runs[-3] + flat_runs[-2] == start and flat_runs[-1] == tile_type:
        flat_runs[-2] += length
        return

    flat_runs.extend([start, length, tile_type])


def build_override() -> dict:
    root = ET.parse(SOURCE_TMX).getroot()
    map_width = int(root.attrib["width"])
    map_height = int(root.attrib["height"])

    if CROP_X + WORLD_WIDTH > map_width or CROP_Y + WORLD_HEIGHT > map_height:
        raise ValueError(
            f"Crop {CROP_X},{CROP_Y},{WORLD_WIDTH},{WORLD_HEIGHT} exceeds "
            f"Tiled map size {map_width}x{map_height}"
        )

    layer = find_tile_layer(root)
    if int(layer.attrib["width"]) != map_width or int(layer.attrib["height"]) != map_height:
        raise ValueError("Layer dimensions do not match map dimensions")

    data_el = layer.find("data")
    if data_el is None:
        raise ValueError(f"Layer {LAYER_NAME} has no data element")
    gids = decode_layer_data(data_el)
    if len(gids) != map_width * map_height:
        raise ValueError(f"Decoded GID count {len(gids)} does not match map area {map_width * map_height}")

    flat_runs: list[int] = []
    stats = Counter()
    gid_counts = Counter()
    invalid: list[dict] = []

    active_run_start: int | None = None
    active_run_len = 0
    active_run_type: int | None = None

    def flush_active() -> None:
        nonlocal active_run_start, active_run_len, active_run_type
        if active_run_start is not None and active_run_type is not None:
            append_run(flat_runs, active_run_start, active_run_len, active_run_type)
        active_run_start = None
        active_run_len = 0
        active_run_type = None

    for world_y in range(WORLD_HEIGHT):
        source_y = CROP_Y + world_y
        for world_x in range(WORLD_WIDTH):
            source_x = CROP_X + world_x
            source_index = source_y * map_width + source_x
            world_index = world_y * WORLD_WIDTH + world_x
            gid = gids[source_index] & TILED_GID_FLAG_MASK
            gid_counts[gid] += 1

            try:
                tile_type = authored_gid_to_tile_type(gid)
            except ValueError as exc:
                if len(invalid) < 25:
                    invalid.append({"x": world_x, "y": world_y, "gid": gid, "error": str(exc)})
                stats["invalidGids"] += 1
                tile_type = None

            if tile_type is None:
                stats["ignoredNoOverride"] += 1
                flush_active()
                continue

            stats["authoredOverrides"] += 1
            if gid == GID_EXPLICIT_AIR:
                stats["explicitAir"] += 1
            if gid == GID_AUTHORING_TILE_24:
                stats["tile24RemappedToBedrock"] += 1
            stats[f"tileType:{tile_type}"] += 1

            if active_run_start is None:
                active_run_start = world_index
                active_run_len = 1
                active_run_type = tile_type
            elif active_run_start + active_run_len == world_index and active_run_type == tile_type:
                active_run_len += 1
            else:
                flush_active()
                active_run_start = world_index
                active_run_len = 1
                active_run_type = tile_type

        flush_active()

    if invalid:
        preview = "\n".join(json.dumps(item) for item in invalid)
        raise ValueError(f"Unsupported GIDs found in crop:\n{preview}")

    return {
        "enabled": True,
        "source": str(SOURCE_TMX.relative_to(ROOT)).replace("\\", "/"),
        "layer": LAYER_NAME,
        "crop": {"x": CROP_X, "y": CROP_Y, "width": WORLD_WIDTH, "height": WORLD_HEIGHT},
        "width": WORLD_WIDTH,
        "height": WORLD_HEIGHT,
        "gidRules": {
            "noOverride": GID_NO_OVERRIDE,
            "explicitAir": GID_EXPLICIT_AIR,
            "tile24RemappedToBedrock": GID_AUTHORING_TILE_24,
        },
        "stats": dict(stats),
        "gidCounts": {str(k): v for k, v in sorted(gid_counts.items())},
        "runs": flat_runs,
    }


def format_number_array(values: list[int], per_line: int = 18) -> str:
    chunks = []
    for i in range(0, len(values), per_line):
        chunks.append("  " + ", ".join(str(value) for value in values[i:i + per_line]))
    return ",\n".join(chunks)


def write_js_module(data: dict) -> None:
    stats_json = json.dumps(data["stats"], indent=2, sort_keys=True)
    gid_counts_json = json.dumps(data["gidCounts"], indent=2, sort_keys=True)
    rules_json = json.dumps(data["gidRules"], indent=2, sort_keys=True)
    crop_json = json.dumps(data["crop"], indent=2, sort_keys=True)
    runs = format_number_array(data["runs"])

    text = f"""// Auto-generated by tools/export_tiled_runtime_override.py.
// Source: {data['source']} / layer {data['layer']}
// Do not hand edit; rerun `npm run tiled:runtime-override` after Tiled edits.

export const TILED_WORLD_OVERRIDE = Object.freeze({{
  enabled: true,
  source: {json.dumps(data['source'])},
  layer: {json.dumps(data['layer'])},
  crop: Object.freeze({crop_json}),
  width: {data['width']},
  height: {data['height']},
  gidRules: Object.freeze({rules_json}),
  stats: Object.freeze({stats_json}),
  gidCounts: Object.freeze({gid_counts_json}),
  // Flat triples: [startIndex, runLength, tileType, ...].
  runs: Object.freeze([
{runs}
  ]),
}});
"""
    OUTPUT_JS.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JS.write_text(text, encoding="utf-8")


def main() -> None:
    data = build_override()
    write_js_module(data)
    print(f"Wrote {OUTPUT_JS.relative_to(ROOT)}")
    print(f"Crop: {WORLD_WIDTH}x{WORLD_HEIGHT} at {CROP_X},{CROP_Y}")
    print(f"Runs: {len(data['runs']) // 3}")
    print(f"Authored overrides: {data['stats'].get('authoredOverrides', 0)}")
    print(f"Ignored no-override cells: {data['stats'].get('ignoredNoOverride', 0)}")
    print(f"Explicit AIR cells: {data['stats'].get('explicitAir', 0)}")
    print(f"Tile 24 -> BEDROCK cells: {data['stats'].get('tile24RemappedToBedrock', 0)}")


if __name__ == "__main__":
    main()