"""Pixel-level QA for the 250-light Star identity V2 package."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "sprites" / "environment" / "star-identities-v2"
MANIFEST = json.loads(
    (PACKAGE / "star-identities-v2.manifest.json").read_text(encoding="utf-8")
)
FRAME_SIZE = 256


def bright_fraction(image: Image.Image, threshold: int = 10) -> float:
    rgb = image.convert("RGB")
    pixels = rgb.get_flattened_data()
    return sum(max(pixel) > threshold for pixel in pixels) / (rgb.width * rgb.height)


def source_gutters(source: Image.Image, columns: int, rows: int) -> list[float]:
    fractions = []
    for column in range(1, columns):
        x = round(source.width * column / columns)
        fractions.append(bright_fraction(source.crop((x - 3, 0, x + 3, source.height))))
    for row in range(1, rows):
        y = round(source.height * row / rows)
        fractions.append(bright_fraction(source.crop((0, y - 3, source.width, y + 3))))
    return fractions


def alpha_edge_fraction(cell: Image.Image, threshold: int = 8) -> float:
    alpha = cell.getchannel("A")
    edges = [
        alpha.crop((0, 0, FRAME_SIZE, 2)),
        alpha.crop((0, FRAME_SIZE - 2, FRAME_SIZE, FRAME_SIZE)),
        alpha.crop((0, 2, 2, FRAME_SIZE - 2)),
        alpha.crop((FRAME_SIZE - 2, 2, FRAME_SIZE, FRAME_SIZE - 2)),
    ]
    values = [
        value
        for edge in edges
        for value in edge.get_flattened_data()
    ]
    return sum(value > threshold for value in values) / len(values)


expansion_sources = 0
expansion_frames = 0
for atlas_entry in MANIFEST["atlases"]:
    atlas = Image.open(ROOT / atlas_entry["output"]).convert("RGBA")
    assert atlas.size == (
        atlas_entry["columns"] * FRAME_SIZE,
        atlas_entry["rows"] * FRAME_SIZE,
    )
    for source_entry in atlas_entry["sources"]:
        if source_entry["kind"] != "v2-expansion":
            continue
        expansion_sources += 1
        source = Image.open(ROOT / source_entry["path"]).convert("RGB")
        corners = [
            max(source.getpixel((0, 0))),
            max(source.getpixel((source.width - 1, 0))),
            max(source.getpixel((0, source.height - 1))),
            max(source.getpixel((source.width - 1, source.height - 1))),
        ]
        assert max(corners) <= 4, (source_entry["path"], corners)
        gutters = source_gutters(
            source,
            source_entry["columns"],
            source_entry["rows"],
        )
        assert max(gutters, default=0) < 0.13, source_entry["path"]
        assert sum(gutters) / max(1, len(gutters)) < 0.03, source_entry["path"]
        for local_frame in range(source_entry["frameCount"]):
            frame = source_entry["startFrame"] + local_frame
            row, column = divmod(frame, atlas_entry["columns"])
            cell = atlas.crop((
                column * FRAME_SIZE,
                row * FRAME_SIZE,
                (column + 1) * FRAME_SIZE,
                (row + 1) * FRAME_SIZE,
            ))
            assert alpha_edge_fraction(cell) < 0.07, (
                atlas_entry["rarity"],
                frame,
            )
            expansion_frames += 1

assert expansion_sources == 14
assert expansion_frames == 200
print(
    "star identity V2 art contract: PASS "
    "(14 clean source sheets, 200 bounded expansion frames)"
)
