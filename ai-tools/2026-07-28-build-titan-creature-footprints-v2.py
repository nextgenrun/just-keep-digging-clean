"""Build exact underground Titan tile footprints from the 768 px stance art."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEFINITIONS_PATH = ROOT / "values" / "titanDiscoveries.js"
VALUES_PATH = ROOT / "values" / "titanCreatureFootprints.js"
MANIFEST_PATH = (
    ROOT
    / "sprites"
    / "backgrounds"
    / "titan-underground-v2"
    / "2026-07-28-titan-underground-footprints-v2.json"
)
STANCE_ROOT = (
    ROOT / "sprites" / "backgrounds" / "titan-surface-stances-v1"
)
MINIMUM_ALPHA = 24
MINIMUM_OPAQUE_PIXELS_PER_TILE = 1
VERSION = "titan-creature-alpha-footprint-v2-20260728"

TITAN_PATTERN = re.compile(
    r'titan\(\s*(\d+),\s*"([^"]+)",\s*"[^"]+",\s*'
    r"\d+,\s*\d+,\s*0x[0-9a-fA-F]+,\s*(\d+),\s*(\d+),"
)
FIT_PATTERN = re.compile(r"titanFitFraction:\s*([0-9.]+)")


def load_definitions(source: str) -> list[dict[str, int | str]]:
    definitions = []
    for index, titan_id, width, height in TITAN_PATTERN.findall(source):
        definitions.append(
            {
                "index": int(index),
                "id": titan_id,
                "width": int(width),
                "height": int(height),
            }
        )
    if len(definitions) != 25:
        raise ValueError(f"Expected 25 Titan definitions, found {len(definitions)}")
    return definitions


def projected_rows(
    image: Image.Image,
    zone_width: int,
    zone_height: int,
    fit_fraction: float,
) -> list[int]:
    rgba = image.convert("RGBA")
    scale = min(
        zone_width * fit_fraction / rgba.width,
        zone_height * fit_fraction / rgba.height,
    )
    display_width = rgba.width * scale
    display_height = rgba.height * scale
    left = (zone_width - display_width) / 2
    top = (zone_height - display_height) / 2
    counts = [[0] * zone_width for _ in range(zone_height)]
    alpha = rgba.getchannel("A")

    for source_y in range(rgba.height):
        for source_x in range(rgba.width):
            if alpha.getpixel((source_x, source_y)) < MINIMUM_ALPHA:
                continue
            column = int(left + (source_x + 0.5) * scale)
            row = int(top + (source_y + 0.5) * scale)
            if 0 <= column < zone_width and 0 <= row < zone_height:
                counts[row][column] += 1

    return [
        sum(
            2**column
            for column, count in enumerate(row)
            if count >= MINIMUM_OPAQUE_PIXELS_PER_TILE
        )
        for row in counts
    ]


def format_values(entries: list[dict[str, object]]) -> str:
    rows = []
    for entry in entries:
        key = json.dumps(entry["id"])
        values = ", ".join(str(value) for value in entry["rows"])
        rows.append(f"  {key}: Object.freeze([{values}]),")
    return (
        "const EMPTY_FOOTPRINT = Object.freeze([]);\n\n"
        "export const TITAN_CREATURE_FOOTPRINT_BUILD = Object.freeze({\n"
        f'  version: "{VERSION}",\n'
        f"  minimumAlpha: {MINIMUM_ALPHA},\n"
        "  minimumOpaquePixelsPerTile: "
        f"{MINIMUM_OPAQUE_PIXELS_PER_TILE},\n"
        '  projectionAuthority: "TITAN_DISCOVERY_CONFIG.underground.'
        'titanFitFraction",\n'
        '  sourceAuthority: "TITAN_DEFINITIONS.surfaceAsset",\n'
        "});\n\n"
        "export const TITAN_CREATURE_FOOTPRINT_ROWS = Object.freeze({\n"
        + "\n".join(rows)
        + "\n});\n\n"
        "export function getTitanCreatureFootprintRows(titanId) {\n"
        "  return TITAN_CREATURE_FOOTPRINT_ROWS[titanId] || EMPTY_FOOTPRINT;\n"
        "}\n"
    )


def main() -> None:
    source = DEFINITIONS_PATH.read_text(encoding="utf-8")
    definitions = load_definitions(source)
    fit_match = FIT_PATTERN.search(source)
    if not fit_match:
        raise ValueError("Missing underground.titanFitFraction")
    fit_fraction = float(fit_match.group(1))
    entries = []

    for definition in definitions:
        index = int(definition["index"])
        titan_id = str(definition["id"])
        source_path = STANCE_ROOT / (
            f"{index:02d}-{titan_id}-surface-stance-v1.webp"
        )
        source_bytes = source_path.read_bytes()
        with Image.open(source_path) as image:
            if image.size != (768, 768):
                raise ValueError(f"{source_path.name} must remain 768x768")
            rows = projected_rows(
                image,
                int(definition["width"]),
                int(definition["height"]),
                fit_fraction,
            )
        entries.append(
            {
                "id": titan_id,
                "source": source_path.relative_to(ROOT).as_posix(),
                "sha256": hashlib.sha256(source_bytes).hexdigest(),
                "zoneWidthTiles": definition["width"],
                "zoneHeightTiles": definition["height"],
                "rows": rows,
                "coveredTiles": sum(value.bit_count() for value in rows),
            }
        )

    VALUES_PATH.write_text(format_values(entries), encoding="utf-8")
    MANIFEST_PATH.write_text(
        json.dumps(
            {
                "version": VERSION,
                "complete": True,
                "count": len(entries),
                "sourceAssetVersion": "titan-surface-stances-v1",
                "fitFraction": fit_fraction,
                "minimumAlpha": MINIMUM_ALPHA,
                "minimumOpaquePixelsPerTile": (
                    MINIMUM_OPAQUE_PIXELS_PER_TILE
                ),
                "titans": entries,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    counts = [int(entry["coveredTiles"]) for entry in entries]
    print(
        f"Wrote {len(entries)} Titan footprints "
        f"({min(counts)}-{max(counts)} covering tiles)"
    )


if __name__ == "__main__":
    main()
