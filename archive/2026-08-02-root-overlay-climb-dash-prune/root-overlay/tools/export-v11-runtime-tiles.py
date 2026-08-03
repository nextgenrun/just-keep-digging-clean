"""Export gameplay tile overrides from the saved v11 TMX only.

This deliberately leaves values/tiledBackgroundObjects.js untouched. The v11
surface (sky through the NPC ground row) is exported a second time as an
authoritative pass so later procedural systems cannot restore deleted bedrock.
"""

from __future__ import annotations

import base64
import hashlib
import json
import struct
import zlib
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
SOURCE_TMX = ROOT / "exports" / "dig-game-world-edit-v-11-08-07-2026-;1-img-test-saved-before-runtime-wire.tmx"
OUTPUT_JS = ROOT / "values" / "tiledWorldOverrideData.js"

CROP_X = 40
CROP_Y = 40
WORLD_WIDTH = 280
WORLD_HEIGHT = 2000
SURFACE_GROUND_ROW = 65
TILE_LAYER_NAME = "00_PAINT_HERE_tile_types"
ROOT_LAYER_NAME = "01_OPTIONAL_root_overlays"
GID_MASK = 0x0FFFFFFF

TILE_AIR = 0
TILE_BEDROCK = 4
TILE_ROOT_OVERLAY = 25
TILE_ROOT_OVERLAY_DEEP = 26

SOIL_DAMAGE_TILE_TYPES = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11]
RUNTIME_STATIC_TILE_TYPES = {
    950: 4,
    951: 4,
    952: 4,
    953: 4,
    954: 28,
    955: 4,
    956: 29,
    957: 29,
    958: 12,
    959: 13,
    960: 14,
    961: 15,
    962: 17,
    963: 18,
    964: 19,
    966: 20,
    967: 21,
    968: 22,
    969: 23,
    972: 27,
}
CUSTOM_BUILDER_TILE_TYPES = {
    # Cave Town Construction #04 is the v11-authored bedrock/divider brush.
    27: TILE_BEDROCK,
}


def decode_layer(layer: ET.Element) -> list[int]:
    data = layer.find("data")
    if data is None or data.attrib.get("encoding") != "base64" or data.attrib.get("compression") != "zlib":
        raise ValueError(f"Unsupported data encoding on {layer.attrib.get('name')!r}")
    raw = zlib.decompress(base64.b64decode("".join((data.text or "").split())))
    return list(struct.unpack(f"<{len(raw) // 4}I", raw))


def find_layer(root: ET.Element, name: str) -> ET.Element:
    layer = next((item for item in root.findall("layer") if item.attrib.get("name") == name), None)
    if layer is None:
        raise ValueError(f"Missing required layer {name!r}")
    return layer


def find_firstgid(root: ET.Element, source_fragment: str) -> int:
    tileset = next(
        (item for item in root.findall("tileset") if source_fragment in item.attrib.get("source", "")),
        None,
    )
    if tileset is None:
        raise ValueError(f"Missing tileset containing {source_fragment!r}")
    return int(tileset.attrib["firstgid"])


def runtime_gid_to_tile_type(gid: int, runtime_firstgid: int) -> int | None:
    local_id = gid - runtime_firstgid
    if local_id < 0:
        return None
    if local_id < 900:
        soil_type_index = (local_id // 20) % 3
        return [1, 5, 6][soil_type_index]
    if local_id < 950:
        return SOIL_DAMAGE_TILE_TYPES[(local_id - 900) // 5]
    return RUNTIME_STATIC_TILE_TYPES.get(local_id)


def gid_to_tile_type(
    gid: int,
    authoring_firstgid: int,
    runtime_firstgid: int,
    custom_builder_firstgid: int,
) -> int | None:
    if gid == 0:
        return None
    authoring_local_id = gid - authoring_firstgid
    if 0 <= authoring_local_id < 31:
        # CAVE_WALL is an unbreakable visual and remains bedrock in the model.
        return TILE_BEDROCK if authoring_local_id == 24 else authoring_local_id
    runtime_type = runtime_gid_to_tile_type(gid, runtime_firstgid)
    if runtime_type is not None:
        return runtime_type
    return CUSTOM_BUILDER_TILE_TYPES.get(gid - custom_builder_firstgid)


def append_run(runs: list[int], start: int, length: int, tile_type: int) -> None:
    if length <= 0:
        return
    if runs and runs[-3] + runs[-2] == start and runs[-1] == tile_type:
        runs[-2] += length
    else:
        runs.extend([start, length, tile_type])


def encode_runs(types: list[int | None]) -> list[int]:
    runs: list[int] = []
    active_start: int | None = None
    active_type: int | None = None
    active_length = 0

    for index, tile_type in enumerate(types):
        if tile_type is None:
            if active_start is not None and active_type is not None:
                append_run(runs, active_start, active_length, active_type)
            active_start = None
            active_type = None
            active_length = 0
        elif active_start is not None and active_type == tile_type and active_start + active_length == index:
            active_length += 1
        else:
            if active_start is not None and active_type is not None:
                append_run(runs, active_start, active_length, active_type)
            active_start = index
            active_type = tile_type
            active_length = 1

    if active_start is not None and active_type is not None:
        append_run(runs, active_start, active_length, active_type)
    return runs


def format_numbers(values: list[int], per_line: int = 18) -> str:
    if not values:
        return ""
    return "\n".join(
        "  " + ", ".join(str(value) for value in values[index:index + per_line]) + ","
        for index in range(0, len(values), per_line)
    )


def preserve_second_world_block(existing_text: str) -> str:
    marker = "  secondWorldArea: Object.freeze({"
    start = existing_text.find(marker)
    end = existing_text.rfind("\n});")
    if start < 0 or end <= start:
        raise ValueError("Could not preserve the existing secondWorldArea block")
    return existing_text[start:end].rstrip()


def main() -> None:
    tree = ET.parse(SOURCE_TMX)
    root = tree.getroot()
    map_width = int(root.attrib["width"])
    map_height = int(root.attrib["height"])
    if CROP_X + WORLD_WIDTH > map_width or CROP_Y + WORLD_HEIGHT > map_height:
        raise ValueError("Runtime crop exceeds the source TMX")

    authoring_firstgid = find_firstgid(root, "dig-game-authoring-types.tsx")
    runtime_firstgid = find_firstgid(root, "dig-game-runtime-render-94.tsx")
    custom_builder_firstgid = find_firstgid(root, "dig-game-custom-builder-v2.tsx")
    tile_gids = decode_layer(find_layer(root, TILE_LAYER_NAME))
    root_gids = decode_layer(find_layer(root, ROOT_LAYER_NAME))

    tile_types: list[int | None] = []
    surface_types: list[int | None] = []
    root_types: list[int | None] = []
    gid_counts: Counter[int] = Counter()
    stats: Counter[str] = Counter()

    for world_y in range(WORLD_HEIGHT):
        source_y = CROP_Y + world_y
        for world_x in range(WORLD_WIDTH):
            source_x = CROP_X + world_x
            source_index = source_y * map_width + source_x
            gid = tile_gids[source_index] & GID_MASK
            gid_counts[gid] += 1
            tile_type = gid_to_tile_type(
                gid,
                authoring_firstgid,
                runtime_firstgid,
                custom_builder_firstgid,
            )
            tile_types.append(tile_type)

            if tile_type is not None:
                stats["authoredOverrides"] += 1
                stats[f"tileType:{tile_type}"] += 1
            else:
                stats["ignoredNoOverrideOrPreview"] += 1

            # The saved v11 surface is authoritative. Empty sky clears any
            # later procedural geometry; every mapped authored tile is retained.
            if world_y < SURFACE_GROUND_ROW:
                if gid == 0:
                    surface_types.append(TILE_AIR)
                    stats["authoritativeBlankAir"] += 1
                else:
                    surface_types.append(tile_type)
            # Blank ground cells are authoritative openings. Preview-only
            # custom palette GIDs stay unowned so the generated level-two floor
            # can remain underneath them.
            elif world_y == SURFACE_GROUND_ROW and gid == 0:
                surface_types.append(TILE_AIR)
                stats["authoritativeBlankAir"] += 1
            elif world_y == SURFACE_GROUND_ROW:
                surface_types.append(tile_type)
            else:
                surface_types.append(None)

            overlay_gid = root_gids[source_index] & GID_MASK
            root_types.append({2: TILE_ROOT_OVERLAY, 3: TILE_ROOT_OVERLAY_DEEP}.get(overlay_gid))

    runs = encode_runs(tile_types)
    surface_runs = encode_runs(surface_types)
    root_runs = encode_runs(root_types)
    second_world_block = preserve_second_world_block(OUTPUT_JS.read_text(encoding="utf-8"))
    source_rel = SOURCE_TMX.relative_to(ROOT).as_posix()
    source_hash = hashlib.sha256(SOURCE_TMX.read_bytes()).hexdigest()

    text = f'''// Auto-generated by ai-tools/2026-07-13-export-v11-runtime-tiles.py.
// Source: {source_rel}
// Background object data is intentionally not modified by this exporter.

export const TILED_WORLD_OVERRIDE = Object.freeze({{
  enabled: true,
  source: {json.dumps(source_rel)},
  sourceSha256: {json.dumps(source_hash)},
  layer: {json.dumps(TILE_LAYER_NAME)},
  crop: Object.freeze({{ x: {CROP_X}, y: {CROP_Y}, width: {WORLD_WIDTH}, height: {WORLD_HEIGHT} }}),
  width: {WORLD_WIDTH},
  height: {WORLD_HEIGHT},
  gidRules: Object.freeze({{
    noOverride: 0,
    explicitAir: {authoring_firstgid},
    runtimeRenderFirstGid: {runtime_firstgid},
    customBuilderFirstGid: {custom_builder_firstgid},
    customBuilderBedrockLocalId: 27,
    otherPreviewPaletteTiles: "ignored",
  }}),
  // Flat triples: [startIndex, runLength, tileType, ...]
  runs: Object.freeze([
{format_numbers(runs)}
  ]),
  stats: Object.freeze({json.dumps(dict(sorted(stats.items())), indent=2)}),
  gidCounts: Object.freeze({json.dumps({str(key): value for key, value in sorted(gid_counts.items())}, indent=2)}),

  // Re-applied after procedural generation so deleted sky bedrock stays gone.
  surfaceAuthority: Object.freeze({{
    throughRow: {SURFACE_GROUND_ROW},
    runs: Object.freeze([
{format_numbers(surface_runs)}
    ]),
  }}),

  rootOverlays: Object.freeze({{
    runs: Object.freeze([
{format_numbers(root_runs)}
    ]),
  }}),

{second_world_block}
}});
'''
    OUTPUT_JS.write_text(text, encoding="utf-8")
    print(f"Wrote {OUTPUT_JS.relative_to(ROOT)}")
    print(f"Source SHA-256: {source_hash}")
    print(f"Runtime firstgid: {runtime_firstgid}")
    print(f"Tile runs: {len(runs) // 3}")
    print(f"Surface authority runs: {len(surface_runs) // 3}")
    print(f"Surface bedrock cells: {sum(1 for value in surface_types if value == TILE_BEDROCK)}")
    print(f"Surface air cells: {sum(1 for value in surface_types if value == TILE_AIR)}")


if __name__ == "__main__":
    main()
