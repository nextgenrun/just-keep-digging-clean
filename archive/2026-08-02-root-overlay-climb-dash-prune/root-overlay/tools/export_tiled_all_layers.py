"""
Export ALL authored data from the v7 layered TMX:
  1. Tile type overrides (from 00_PAINT_HERE_tile_types)
  2. Root overlay data (from 01_OPTIONAL_root_overlays)
  3. Background objects (from all object groups)

Usage: python tools/export_tiled_all_layers.py
Output: values/tiledWorldOverrideData.js (updated with root overlays)
        values/tiledBackgroundObjects.js (new - background object data)
"""

from __future__ import annotations

import base64
import json
import struct
import zlib
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
SOURCE_TMX = ROOT / "exports" / "dig-game-world-edit-v-7-30-06-2026-;layered.tmx"
OUTPUT_OVERRIDE_JS = ROOT / "values" / "tiledWorldOverrideData.js"
OUTPUT_BG_JS = ROOT / "values" / "tiledBackgroundObjects.js"

CROP_X = 40
CROP_Y = 40
WORLD_WIDTH = 280
WORLD_HEIGHT = 2000
LEGACY_WORLD_WIDTH = 120

# Authored tile layer constants (same as before)
LAYER_NAME_TILE_TYPES = "00_PAINT_HERE_tile_types"
LAYER_NAME_ROOT_OVERLAYS = "01_OPTIONAL_root_overlays"

GID_NO_OVERRIDE = 0
GID_EXPLICIT_AIR = 1
GID_AUTHORING_TILE_24 = 25
SECOND_WORLD_MARKER_GID = 3094

AUTHORING_TILESET_FIRSTGID = 1
AUTHORING_TILESET_TILECOUNT = 31
RUNTIME_RENDER_FIRSTGID_IN_WORLD_EDIT = 145
SOIL_ATLAS_FRAME_COUNT = 900
SOIL_TYPE_COUNT = 3
SOIL_RARITY_COUNT = 4
SOIL_DAMAGE_STAGE_COUNT = 5
TILED_GID_FLAG_MASK = 0x0FFFFFFF
TILED_GID_FLIP_HORIZONTAL = 0x80000000
TILED_GID_FLIP_VERTICAL = 0x40000000
TILED_GID_FLIP_DIAGONAL = 0x20000000

# Tile type constants
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
TILE_TYPE_ROOT_OVERLAY = 25
TILE_TYPE_ROOT_OVERLAY_DEEP = 26

RUNTIME_DAMAGE_TILE_TYPES = [
    TILE_TYPE_DIRT, TILE_TYPE_STONE, TILE_TYPE_COPPER,
    TILE_TYPE_DARK_DIRT_NORMAL, TILE_TYPE_DARK_DIRT_STRONG,
    TILE_TYPE_BRONZE, TILE_TYPE_STEEL, TILE_TYPE_IRON,
    TILE_TYPE_SILVER, TILE_TYPE_GOLD,
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

# Root overlay GID mapping
ROOT_OVERLAY_GID_MAP = {
    2: TILE_TYPE_ROOT_OVERLAY,
    3: TILE_TYPE_ROOT_OVERLAY_DEEP,
}

# Background object layers to export
BACKGROUND_OBJECT_GROUPS = [
    # Existing non-V2 layers
    "12_BG_mid_structures",
    "faded-bg-far",
    "bg-back",
    "bg-front",
    "overlay-effect",
    # New V2 layers
    "v2-1-base-colour",
    "v2-2-atmosphere",
    "v2-3-far-light",
    "v2-4-distant-skyline",
    "v2-5-far-landmark-band",
    "v2-6-mid-terrein-masses",
    "v2-7-mid-structure",
    "v2-8-overhang-ceiling",
    "v2-9-foreground",
    "v2-10-traversable-edge",
    "v2-11-near-probs-seambreakers",
    "v2-12-fx-accent",
    "over-tile",
]


def source_tmx_rel() -> str:
    return SOURCE_TMX.relative_to(ROOT).as_posix()

def decode_layer_data(data_el: ET.Element) -> list[int]:
    encoding = data_el.attrib.get("encoding")
    compression = data_el.attrib.get("compression")
    if encoding != "base64" or compression != "zlib":
        raise ValueError(
            f"Unsupported Tiled data format: "
            f"encoding={encoding!r}, compression={compression!r}"
        )
    raw = zlib.decompress(base64.b64decode((data_el.text or "").strip()))
    return list(struct.unpack(f"<{len(raw) // 4}I", raw))


def find_tile_layer(root: ET.Element, layer_name: str) -> ET.Element:
    for layer in root.findall("layer"):
        if layer.attrib.get("name") == layer_name:
            return layer
    raise ValueError(f"Missing required Tiled layer: {layer_name}")


def authored_gid_to_tile_type(gid: int) -> int | None:
    gid &= TILED_GID_FLAG_MASK
    if gid == GID_NO_OVERRIDE:
        return None
    if gid == SECOND_WORLD_MARKER_GID:
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


def append_mask_run(flat_runs: list[int], start: int, length: int) -> None:
    if length <= 0:
        return
    if flat_runs and flat_runs[-2] + flat_runs[-1] == start:
        flat_runs[-1] += length
        return
    flat_runs.extend([start, length])


def build_tile_overrides_from_layer(gids: list[int], map_width: int, map_height: int) -> dict:
    """
    Build tile type overrides from a tile layer, using the same crop as before.
    Returns dict with 'runs', 'stats', etc.
    """
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

            if gid == SECOND_WORLD_MARKER_GID:
                stats["secondWorldMarker"] += 1
                flush_active()
                continue

            try:
                tile_type = authored_gid_to_tile_type(gid)
            except ValueError as exc:
                if world_x >= LEGACY_WORLD_WIDTH:
                    stats["ignoredUnsupportedExpandedArea"] += 1
                    flush_active()
                    continue
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
        raise ValueError(f"Unsupported GIDs found in crop region:\n{preview}")

    return {
        "runs": flat_runs,
        "stats": dict(stats),
        "gidCounts": {str(k): v for k, v in sorted(gid_counts.items())},
    }


def build_second_world_area_from_layer(gids: list[int], map_width: int, map_height: int) -> dict:
    marker_cells: list[tuple[int, int]] = []
    for source_y in range(map_height):
        row_start = source_y * map_width
        for source_x in range(map_width):
            gid = gids[row_start + source_x] & TILED_GID_FLAG_MASK
            if gid == SECOND_WORLD_MARKER_GID:
                marker_cells.append((source_x, source_y))

    if not marker_cells:
        return {
            "enabled": False,
            "markerGid": SECOND_WORLD_MARKER_GID,
            "sourceLayer": LAYER_NAME_TILE_TYPES,
            "sourceBounds": None,
            "targetBounds": None,
            "cellCount": 0,
            "runs": [],
            "stats": {"sourceCells": 0, "mappedCells": 0, "skippedCells": 0},
        }

    source_min_x = min(x for x, _ in marker_cells)
    source_max_x = max(x for x, _ in marker_cells)
    source_min_y = min(y for _, y in marker_cells)
    source_max_y = max(y for _, y in marker_cells)
    world_indices: list[int] = []
    skipped = 0

    for source_x, source_y in marker_cells:
        target_x = source_x - CROP_X
        target_y = source_y - source_min_y
        if 0 <= target_x < WORLD_WIDTH and 0 <= target_y < WORLD_HEIGHT:
            world_indices.append(target_y * WORLD_WIDTH + target_x)
        else:
            skipped += 1

    world_indices = sorted(set(world_indices))
    flat_runs: list[int] = []
    if world_indices:
        run_start = world_indices[0]
        run_len = 1
        for idx in world_indices[1:]:
            if run_start + run_len == idx:
                run_len += 1
            else:
                append_mask_run(flat_runs, run_start, run_len)
                run_start = idx
                run_len = 1
        append_mask_run(flat_runs, run_start, run_len)

    target_xs = [idx % WORLD_WIDTH for idx in world_indices]
    target_ys = [idx // WORLD_WIDTH for idx in world_indices]
    target_bounds = None
    if target_xs and target_ys:
        target_bounds = {
            "x": min(target_xs),
            "y": min(target_ys),
            "width": max(target_xs) - min(target_xs) + 1,
            "height": max(target_ys) - min(target_ys) + 1,
        }

    source_bounds = {
        "x": source_min_x,
        "y": source_min_y,
        "width": source_max_x - source_min_x + 1,
        "height": source_max_y - source_min_y + 1,
    }
    stats = {
        "sourceCells": len(marker_cells),
        "mappedCells": len(world_indices),
        "skippedCells": skipped,
        "runCount": len(flat_runs) // 2,
    }
    print(f"  Second world marker stats: {stats}, source={source_bounds}, target={target_bounds}")
    return {
        "enabled": bool(world_indices),
        "markerGid": SECOND_WORLD_MARKER_GID,
        "sourceLayer": LAYER_NAME_TILE_TYPES,
        "sourceBounds": source_bounds,
        "targetBounds": target_bounds,
        "cellCount": len(world_indices),
        "runs": flat_runs,
        "stats": stats,
    }


def build_root_overlay_from_layer(gids: list[int], map_width: int, map_height: int) -> dict:
    """
    Build root overlay data from the 01_OPTIONAL_root_overlays layer.
    Root overlays don't use the same GID mapping as tile types.
    GID 0 = no overlay, GID 2 = root, GID 3 = deep root.
    Returns dict with 'runs' (world index, length, overlayType).
    """
    flat_runs: list[int] = []
    stats = Counter()

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

            overlay_type = ROOT_OVERLAY_GID_MAP.get(gid, 0)

            if overlay_type == 0:
                stats["noOverlay"] += 1
                flush_active()
                continue

            stats[f"overlayType:{overlay_type}"] += 1

            if active_run_start is None:
                active_run_start = world_index
                active_run_len = 1
                active_run_type = overlay_type
            elif active_run_start + active_run_len == world_index and active_run_type == overlay_type:
                active_run_len += 1
            else:
                flush_active()
                active_run_start = world_index
                active_run_len = 1
                active_run_type = overlay_type

        flush_active()

    overlay_names = {TILE_TYPE_ROOT_OVERLAY: "root", TILE_TYPE_ROOT_OVERLAY_DEEP: "deep_root"}
    print(f"  Root overlay stats: {stats}")
    return {
        "runs": flat_runs,
        "stats": dict(stats),
        "overlayNames": overlay_names,
    }


def resolve_gid_to_filename(root: ET.Element, gid_raw: int) -> str | None:
    """
    Resolve a Tiled GID to a texture filename from the tileset source chain.
    Returns the filename without path, or None if unresolved.
    """
    gid = gid_raw & TILED_GID_FLAG_MASK
    if gid == 0:
        return None

    tilesets = sorted(
        root.findall("tileset"),
        key=lambda ts: int(ts.attrib.get("firstgid", "0")),
        reverse=True,
    )
    for ts in tilesets:
        first_gid = int(ts.attrib["firstgid"])
        if gid < first_gid:
            continue

        source = ts.attrib.get("source", "")
        tsx_path = _resolve_tsx_path(source)
        if not tsx_path or not tsx_path.exists():
            continue

        try:
            tsx_root = ET.parse(tsx_path).getroot()
            tilecount = int(tsx_root.attrib.get("tilecount", "0"))
            local_id = gid - first_gid
            if tilecount and local_id >= tilecount:
                continue

            for tile_el in tsx_root.findall(".//tile"):
                tid = int(tile_el.attrib.get("id", "-1"))
                if tid == local_id:
                    img_el = tile_el.find("image")
                    if img_el is not None:
                        img_source = img_el.attrib.get("source", "")
                        return _extract_filename(img_source)

            img_el = tsx_root.find("image")
            if img_el is not None:
                img_source = img_el.attrib.get("source", "")
                return _extract_filename(img_source)
        except Exception:
            continue

    return f"gid_{gid}"


def _resolve_tsx_path(source: str) -> Path | None:
    """Resolve a .tsx source path relative to the TMX file."""
    if not source:
        return None
    # Try different resolution strategies
    tmx_dir = SOURCE_TMX.parent
    candidates = [
        tmx_dir / source,
        tmx_dir.parent / source,
        tmx_dir / source.replace("../../", ""),
        ROOT / source.replace("../../", ""),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()
    return None


def _extract_filename(path: str) -> str:
    """Extract just the filename from a path."""
    path = path.replace("\\", "/")
    return path.split("/")[-1]


def _extract_props(obj_el: ET.Element) -> dict:
    props = {}
    for prop_el in obj_el.findall(".//property"):
        pname = prop_el.attrib.get("name", "")
        pvalue = prop_el.attrib.get("value", "")
        if pname:
            props[pname] = pvalue
    return props


def safe_js_key(name: str) -> str:
    """Make a safe JS object key. Prefix with underscore if it starts with a digit."""
    key = name.replace("-", "_").replace(" ", "_")
    if key and key[0].isdigit():
        return f"_{key}"
    return key


def decode_gid_flags(gid_raw: int) -> dict:
    return {
        "horizontal": bool(gid_raw & TILED_GID_FLIP_HORIZONTAL),
        "vertical": bool(gid_raw & TILED_GID_FLIP_VERTICAL),
        "diagonal": bool(gid_raw & TILED_GID_FLIP_DIAGONAL),
    }


def find_bg_object_groups(root: ET.Element) -> list[dict]:
    """
    Extract background objects from all relevant object groups.
    Returns layer records in the same order Tiled stores them.
    """
    result = []
    for og in root.findall("objectgroup"):
        name = og.attrib.get("name", "")
        if name not in BACKGROUND_OBJECT_GROUPS:
            continue

        layer = {
            "id": int(og.attrib.get("id", 0)),
            "name": name,
            "key": safe_js_key(name),
            "visible": og.attrib.get("visible", "1") != "0",
            "opacity": float(og.attrib.get("opacity", 1)),
            "offsetX": float(og.attrib.get("offsetx", 0)),
            "offsetY": float(og.attrib.get("offsety", 0)),
            "locked": og.attrib.get("locked", "0") == "1",
            "objects": [],
        }

        objects = []
        for obj_el in og.findall("object"):
            gid_raw = int(obj_el.attrib.get("gid", 0))
            gid = gid_raw & TILED_GID_FLAG_MASK
            props = _extract_props(obj_el)
            resolved_filename = resolve_gid_to_filename(root, gid_raw)

            obj = {
                "id": int(obj_el.attrib.get("id", 0)),
                "gid": gid,
                "gidRaw": gid_raw,
                "flip": decode_gid_flags(gid_raw),
                "name": obj_el.attrib.get("name", ""),
                "resolvedFilename": resolved_filename or "",
                "x": float(obj_el.attrib.get("x", 0)),
                "y": float(obj_el.attrib.get("y", 0)),
                "width": float(obj_el.attrib.get("width", 0)),
                "height": float(obj_el.attrib.get("height", 0)),
                "rotation": float(obj_el.attrib.get("rotation", 0)),
                "opacity": float(obj_el.attrib.get("opacity", 1)),
            }

            if props:
                obj["properties"] = props

            objects.append(obj)

        TILE_PX = 94
        for obj in objects:
            crop_x_px = CROP_X * TILE_PX
            crop_y_px = CROP_Y * TILE_PX
            obj["px"] = obj["x"] - crop_x_px
            obj["py"] = obj["y"] - crop_y_px
            obj["tileX"] = obj["px"] / TILE_PX
            obj["tileY"] = obj["py"] / TILE_PX

        layer["objects"] = objects
        result.append(layer)

    return result


def extract_v7_overrides(source_tmx: Path) -> tuple[dict, dict, dict, list, dict]:
    """
    Main extraction function.
    Returns (tileTypeOverrides, rootOverlayData, mapMeta, bgObjectData, secondWorldArea).
    bgObjectData is list of (layerName, objects).
    """
    root = ET.parse(source_tmx).getroot()
    map_width = int(root.attrib["width"])
    map_height = int(root.attrib["height"])
    tile_width = int(root.attrib.get("tilewidth", 94))
    tile_height = int(root.attrib.get("tileheight", 94))
    map_meta = {
        "width": map_width,
        "height": map_height,
        "tileWidth": tile_width,
        "tileHeight": tile_height,
    }

    if CROP_X + WORLD_WIDTH > map_width or CROP_Y + WORLD_HEIGHT > map_height:
        raise ValueError(
            f"Crop {CROP_X},{CROP_Y},{WORLD_WIDTH},{WORLD_HEIGHT} exceeds "
            f"Tiled map size {map_width}x{map_height}"
        )

    # Extract tile type overrides
    print("Extracting tile type overrides...")
    tile_layer = find_tile_layer(root, LAYER_NAME_TILE_TYPES)
    if int(tile_layer.attrib["width"]) != map_width or int(tile_layer.attrib["height"]) != map_height:
        raise ValueError("Tile layer dimensions do not match map dimensions")

    data_el = tile_layer.find("data")
    if data_el is None:
        raise ValueError(f"Layer {LAYER_NAME_TILE_TYPES} has no data element")
    tile_gids = decode_layer_data(data_el)
    if len(tile_gids) != map_width * map_height:
        raise ValueError(f"Decoded GID count {len(tile_gids)} does not match map area {map_width * map_height}")

    tile_overrides = build_tile_overrides_from_layer(tile_gids, map_width, map_height)
    second_world_area = build_second_world_area_from_layer(tile_gids, map_width, map_height)

    # Extract root overlay data
    print("Extracting root overlay data...")
    try:
        overlay_layer = find_tile_layer(root, LAYER_NAME_ROOT_OVERLAYS)
        if int(overlay_layer.attrib["width"]) != map_width or int(overlay_layer.attrib["height"]) != map_height:
            print(f"  WARNING: Root overlay layer dimensions don't match, skipping")
            root_overlays = {"runs": [], "stats": {"noOverlay": WORLD_WIDTH * WORLD_HEIGHT}, "overlayNames": {}}
        else:
            data_el_ov = overlay_layer.find("data")
            if data_el_ov is None:
                raise ValueError(f"Layer {LAYER_NAME_ROOT_OVERLAYS} has no data element")
            overlay_gids = decode_layer_data(data_el_ov)
            root_overlays = build_root_overlay_from_layer(overlay_gids, map_width, map_height)
    except ValueError as e:
        print(f"  WARNING: Could not extract root overlays: {e}")
        root_overlays = {"runs": [], "stats": {"noOverlay": WORLD_WIDTH * WORLD_HEIGHT}, "overlayNames": {}}

    # Extract background objects
    print("Extracting background objects...")
    bg_objects = find_bg_object_groups(root)

    return tile_overrides, root_overlays, map_meta, bg_objects, second_world_area


def format_number_array(values: list[int], per_line: int = 18) -> str:
    chunks = []
    for i in range(0, len(values), per_line):
        chunks.append("  " + ", ".join(str(value) for value in values[i:i + per_line]))
    return ",\n".join(chunks)


def js_bool(value: bool) -> str:
    return "true" if value else "false"


def js_number(value: float | int, precision: int = 3) -> str:
    if isinstance(value, int) or float(value).is_integer():
        return str(int(value))
    return str(round(float(value), precision))


def js_frozen_object_or_null(value: dict | None) -> str:
    if value is None:
        return "null"
    return f"Object.freeze({json.dumps(value, sort_keys=True)})"


def format_bg_objects_js(map_meta: dict, layer_objects: list[dict]) -> str:
    """Format background objects as a JS module."""
    lines = []
    lines.append("// Auto-generated by tools/export_tiled_all_layers.py.")
    lines.append(f"// Source: {source_tmx_rel()}")
    lines.append("// Do not hand edit; rerun the export script after Tiled edits.")
    lines.append("")
    lines.append("export const TILED_BACKGROUND_OBJECTS = Object.freeze({")
    lines.append("  enabled: true,")
    lines.append(f"  source: {json.dumps(source_tmx_rel())},")
    lines.append(
        "  map: Object.freeze({ "
        f"width: {map_meta['width']}, height: {map_meta['height']}, "
        f"tileWidth: {map_meta['tileWidth']}, tileHeight: {map_meta['tileHeight']} "
        "}),"
    )
    lines.append(f"  crop: Object.freeze({{ x: {CROP_X}, y: {CROP_Y}, width: {WORLD_WIDTH}, height: {WORLD_HEIGHT} }}),")
    lines.append("  tilePx: 94,")
    lines.append("  layerMeta: Object.freeze({")
    for layer in layer_objects:
        layer_key = layer["key"]
        lines.append(f"    {layer_key}: Object.freeze({{")
        lines.append(f"      id: {layer['id']},")
        lines.append(f"      name: {json.dumps(layer['name'])},")
        lines.append(f"      visible: {js_bool(layer['visible'])},")
        lines.append(f"      opacity: {js_number(layer['opacity'])},")
        lines.append(f"      offsetX: {js_number(layer['offsetX'])},")
        lines.append(f"      offsetY: {js_number(layer['offsetY'])},")
        lines.append(f"      locked: {js_bool(layer['locked'])},")
        lines.append(f"      objectCount: {len(layer['objects'])},")
        lines.append("    }),")
    lines.append("  }),")
    lines.append("  layers: Object.freeze({")

    layer_names_list = []
    for layer in layer_objects:
        layer_name = layer["name"]
        layer_key = layer["key"]
        objects = layer["objects"]
        layer_names_list.append(layer_key)

        lines.append(f"    // Layer: {layer_name} ({len(objects)} objects)")
        lines.append(f"    {layer_key}: Object.freeze([")

        for obj in objects:
            tx = round(obj.get("tileX", 0), 2)
            ty = round(obj.get("tileY", 0), 2)
            px = round(obj.get("px", 0), 2)
            py = round(obj.get("py", 0), 2)
            w = round(obj.get("width", 0), 1)
            h = round(obj.get("height", 0), 1)
            gid = obj.get("gid", 0)
            gid_raw = obj.get("gidRaw", gid)
            name = obj.get("name", "")
            rotation = round(obj.get("rotation", 0), 3)
            opacity = js_number(obj.get("opacity", 1))
            flip = obj.get("flip", {})

            props = obj.get("properties", {})
            props_str = f", properties: {json.dumps(props)}" if props else ""
            flip_str = (
                f", flip: Object.freeze({{ horizontal: {js_bool(flip.get('horizontal', False))}, "
                f"vertical: {js_bool(flip.get('vertical', False))}, "
                f"diagonal: {js_bool(flip.get('diagonal', False))} }})"
            )
            source_path = props.get("sourcePath", "")
            source_str = f", sourcePath: {json.dumps(source_path)}" if source_path else ""
            resolved_filename = obj.get("resolvedFilename", "")
            resolved_str = f", resolvedFilename: {json.dumps(resolved_filename)}" if resolved_filename else ""

            lines.append(
                "      Object.freeze({ "
                f"id: {obj.get('id', 0)}, gid: {gid}, gidRaw: {gid_raw}, name: {json.dumps(name)}, "
                f"x: {px}, y: {py}, tx: {tx}, ty: {ty}, w: {w}, h: {h}, rotation: {rotation}, opacity: {opacity}"
                f"{flip_str}{resolved_str}{source_str}{props_str} "
                "}),"
            )

        lines.append("    ]),")
        lines.append("")

    lines.append("  }),")
    lines.append("  layerOrder: Object.freeze([")
    for lk in layer_names_list:
        lines.append(f"    \"{lk}\",")
    lines.append("  ]),")
    lines.append("});")

    return "\n".join(lines)


def write_tiled_world_override_js(tile_overrides: dict, root_overlays: dict, second_world_area: dict) -> None:
    """Write the combined tiledWorldOverrideData.js with both tile types and root overlays."""
    stats_json = json.dumps(tile_overrides["stats"], indent=2, sort_keys=True)
    gid_counts_json = json.dumps(tile_overrides["gidCounts"], indent=2, sort_keys=True)
    runs = format_number_array(tile_overrides["runs"])

    overlay_runs = format_number_array(root_overlays["runs"])
    overlay_stats_json = json.dumps(root_overlays["stats"], indent=2, sort_keys=True)
    second_world_runs = format_number_array(second_world_area["runs"], per_line=20)
    second_world_stats_json = json.dumps(second_world_area["stats"], indent=2, sort_keys=True)
    second_source_bounds_js = js_frozen_object_or_null(second_world_area.get("sourceBounds"))
    second_target_bounds_js = js_frozen_object_or_null(second_world_area.get("targetBounds"))

    text = f"""// Auto-generated by tools/export_tiled_all_layers.py.
// Source: {source_tmx_rel()}
// Do not hand edit; rerun `python tools/export_tiled_all_layers.py` after Tiled edits.

export const TILED_WORLD_OVERRIDE = Object.freeze({{
  enabled: true,
  source: {json.dumps(source_tmx_rel())},
  layer: "00_PAINT_HERE_tile_types",
  crop: Object.freeze({{ x: {CROP_X}, y: {CROP_Y}, width: {WORLD_WIDTH}, height: {WORLD_HEIGHT} }}),
  width: {WORLD_WIDTH},
  height: {WORLD_HEIGHT},
  gidRules: Object.freeze({{
    noOverride: 0,
    explicitAir: 1,
    tile24RemappedToBedrock: 25,
    secondWorldMarker: {SECOND_WORLD_MARKER_GID},
  }}),
  // Tile type overrides (flat triples: [startIndex, runLength, tileType, ...])
  runs: Object.freeze([
{runs}
  ]),
  stats: Object.freeze({stats_json}),
  gidCounts: Object.freeze({gid_counts_json}),

  // Root overlay data from 01_OPTIONAL_root_overlays layer
  rootOverlays: Object.freeze({{
    // Flat triples: [startIndex, runLength, overlayType, ...]
    // overlayType: 25 = ROOT_OVERLAY, 26 = ROOT_OVERLAY_DEEP
    runs: Object.freeze([
{overlay_runs}
    ]),
    stats: Object.freeze({overlay_stats_json}),
  }}),

  // Marker mask for the runtime-generated industrial magma second world.
  // Flat pairs: [startIndex, runLength, ...]
  secondWorldArea: Object.freeze({{
    enabled: {js_bool(bool(second_world_area.get("enabled")))},
    markerGid: {int(second_world_area.get("markerGid", SECOND_WORLD_MARKER_GID))},
    sourceLayer: {json.dumps(second_world_area.get("sourceLayer", LAYER_NAME_TILE_TYPES))},
    sourceBounds: {second_source_bounds_js},
    targetBounds: {second_target_bounds_js},
    cellCount: {int(second_world_area.get("cellCount", 0))},
    runs: Object.freeze([
{second_world_runs}
    ]),
    stats: Object.freeze({second_world_stats_json}),
  }}),
}});
"""
    OUTPUT_OVERRIDE_JS.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_OVERRIDE_JS.write_text(text, encoding="utf-8")
    print(f"Wrote {OUTPUT_OVERRIDE_JS.relative_to(ROOT)}")


def write_tiled_background_objects_js(map_meta: dict, layer_objects: list[dict]) -> None:
    """Write the background objects JS module."""
    text = format_bg_objects_js(map_meta, layer_objects)
    OUTPUT_BG_JS.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_BG_JS.write_text(text, encoding="utf-8")
    print(f"Wrote {OUTPUT_BG_JS.relative_to(ROOT)}")


def main() -> None:
    print(f"=== Exporting all layers from {SOURCE_TMX.name} ===\\n")

    tile_overrides, root_overlays, map_meta, bg_objects, second_world_area = extract_v7_overrides(SOURCE_TMX)

    print(f"\\nTile type overrides: {len(tile_overrides['runs']) // 3} runs")
    print(f"Root overlay runs: {len(root_overlays['runs']) // 3} runs")
    print(f"Second world marker runs: {len(second_world_area['runs']) // 2} runs")
    total_bg = sum(len(layer["objects"]) for layer in bg_objects)
    print(f"Background objects: {total_bg} across {len(bg_objects)} layers")

    write_tiled_world_override_js(tile_overrides, root_overlays, second_world_area)
    write_tiled_background_objects_js(map_meta, bg_objects)

    print("\\nDone!")


if __name__ == "__main__":
    main()
