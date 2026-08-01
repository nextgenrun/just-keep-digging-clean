"""Pack 400 additive ImageGen underground foreground details into 20 atlases."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = ROOT / "visual-approval-previews" / "underground-foreground-library-v6"
SOURCE_DIR = REVIEW_DIR / "sources" / "alpha"
DEPTH_ROOT = ROOT / "sprites" / "backgrounds" / "world-visual-v2" / "depth"
RUNTIME_DIRS = {
    "foreground-textures": DEPTH_ROOT / "underground-foreground-textures-v6",
    "overlay-props": DEPTH_ROOT / "underground-overlay-props-v6",
}
MANIFEST_PATH = REVIEW_DIR / "2026-07-29-underground-detail-library-v6.json"
FRAME_SIZE = (320, 256)
GRID = (5, 4)
SOURCE_SIZE = (1536, 1024)
ITEMS_PER_ATLAS = GRID[0] * GRID[1]
MULTI_TILE_PROP_FRAMES = (0, 1, 3, 6, 8)

BIOMES = (
    ("weathered-roots", "Weathered Roots"),
    ("blue-caverns", "Blue Caverns"),
    ("amber-depths", "Amber Depths"),
    ("silver-core", "Silver Core"),
    ("core-magma", "Core Magma"),
    ("slagworks", "Slagworks"),
    ("obsidian-catacombs", "Obsidian Catacombs"),
    ("pressure-foundry", "Pressure Foundry"),
    ("blackglass-abyss", "Blackglass Abyss"),
    ("starfire-rift", "Starfire Rift"),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def cell_bounds(column: int, row: int) -> tuple[int, int, int, int]:
    left = round(column * SOURCE_SIZE[0] / GRID[0])
    right = round((column + 1) * SOURCE_SIZE[0] / GRID[0])
    top = round(row * SOURCE_SIZE[1] / GRID[1])
    bottom = round((row + 1) * SOURCE_SIZE[1] / GRID[1])
    return left, top, right, bottom


def normalize_frame(cell: Image.Image, source_name: str, index: int) -> Image.Image:
    alpha = cell.getchannel("A")
    bounds = alpha.point(lambda value: 255 if value >= 8 else 0).getbbox()
    if not bounds:
        raise RuntimeError(f"{source_name} frame {index}: no isolated asset")
    isolated = cell.crop(bounds)
    max_size = (FRAME_SIZE[0] - 24, FRAME_SIZE[1] - 22)
    scale = min(max_size[0] / isolated.width, max_size[1] / isolated.height, 1.0)
    if scale < 1.0:
        isolated = isolated.resize(
            (
                max(1, round(isolated.width * scale)),
                max(1, round(isolated.height * scale)),
            ),
            Image.Resampling.LANCZOS,
        )
    frame = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    frame.alpha_composite(
        isolated,
        (
            (FRAME_SIZE[0] - isolated.width) // 2,
            (FRAME_SIZE[1] - isolated.height) // 2,
        ),
    )
    pixels = frame.load()
    for y in range(frame.height):
        for x in range(frame.width):
            if pixels[x, y][3] < 3:
                pixels[x, y] = (0, 0, 0, 0)
    return frame


def frame_record(
    biome_id: str,
    kind: str,
    index: int,
    frame: Image.Image,
    runtime_path: Path,
) -> dict[str, object]:
    alpha = frame.getchannel("A")
    opaque = sum(alpha.histogram()[16:])
    coverage = opaque / (FRAME_SIZE[0] * FRAME_SIZE[1])
    if not 0.01 <= coverage <= 0.82:
        raise RuntimeError(
            f"{biome_id} {kind} frame {index}: suspicious alpha coverage {coverage:.4f}"
        )
    if any(alpha.getpixel(point) > 0 for point in (
        (0, 0), (FRAME_SIZE[0] - 1, 0),
        (0, FRAME_SIZE[1] - 1), (FRAME_SIZE[0] - 1, FRAME_SIZE[1] - 1),
    )):
        raise RuntimeError(f"{biome_id} {kind} frame {index}: opaque corner")
    record = {
        "id": f"{biome_id}-{kind}-{index + 1:02d}",
        "biomeId": biome_id,
        "kind": kind,
        "frame": index,
        "crop": [
            (index % GRID[0]) * FRAME_SIZE[0],
            (index // GRID[0]) * FRAME_SIZE[1],
            *FRAME_SIZE,
        ],
        "alphaCoverage": round(coverage, 6),
        "rgbaSha256": hashlib.sha256(frame.tobytes()).hexdigest(),
        "runtime": runtime_path.relative_to(ROOT).as_posix(),
    }
    if kind == "overlay-props":
        record["scaleClass"] = (
            "multi-tile" if index in MULTI_TILE_PROP_FRAMES else "localized"
        )
    return record


def build_atlas(biome_id: str, kind: str) -> tuple[dict[str, object], list[dict]]:
    source_path = SOURCE_DIR / f"{biome_id}-{kind}-alpha-master-v6.png"
    if not source_path.is_file():
        raise RuntimeError(f"Missing alpha master: {source_path}")
    source = Image.open(source_path).convert("RGBA")
    if source.size != SOURCE_SIZE:
        raise RuntimeError(f"{source_path.name}: expected {SOURCE_SIZE}, got {source.size}")
    runtime_dir = RUNTIME_DIRS[kind]
    runtime_dir.mkdir(parents=True, exist_ok=True)
    runtime_path = runtime_dir / f"{biome_id}-{kind}-atlas-v6.webp"
    atlas = Image.new(
        "RGBA",
        (FRAME_SIZE[0] * GRID[0], FRAME_SIZE[1] * GRID[1]),
        (0, 0, 0, 0),
    )
    records = []
    for index in range(ITEMS_PER_ATLAS):
        column, row = index % GRID[0], index // GRID[0]
        frame = normalize_frame(
            source.crop(cell_bounds(column, row)),
            source_path.name,
            index,
        )
        atlas.alpha_composite(
            frame,
            (column * FRAME_SIZE[0], row * FRAME_SIZE[1]),
        )
        records.append(frame_record(biome_id, kind, index, frame, runtime_path))
    atlas.save(runtime_path, "WEBP", quality=92, method=6, exact=True)
    source.close()
    return {
        "biomeId": biome_id,
        "kind": kind,
        "source": source_path.relative_to(ROOT).as_posix(),
        "runtime": runtime_path.relative_to(ROOT).as_posix(),
        "sourceSha256": sha256(source_path),
        "runtimeSha256": sha256(runtime_path),
        "runtimeBytes": runtime_path.stat().st_size,
        "frameCount": ITEMS_PER_ATLAS,
    }, records


def build_contact_sheet(kind: str, atlases: list[dict[str, object]]) -> Path:
    thumb_size = (640, 410)
    columns = 2
    rows = math.ceil(len(atlases) / columns)
    sheet = Image.new("RGB", (columns * 660, rows * 448), (13, 16, 22))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, entry in enumerate(atlases):
        image = Image.open(ROOT / entry["runtime"]).convert("RGBA")
        image.thumbnail(thumb_size, Image.Resampling.LANCZOS)
        checker = Image.new("RGB", thumb_size, (35, 40, 49))
        checker_draw = ImageDraw.Draw(checker)
        for y in range(0, checker.height, 16):
            for x in range(0, checker.width, 16):
                if (x // 16 + y // 16) % 2:
                    checker_draw.rectangle((x, y, x + 15, y + 15), fill=(52, 59, 70))
        checker.paste(image, ((640 - image.width) // 2, (410 - image.height) // 2), image)
        left = (index % columns) * 660 + 10
        top = (index // columns) * 448 + 8
        sheet.paste(checker, (left, top))
        draw.text((left, top + 416), entry["biomeId"], fill=(236, 239, 244), font=font)
    path = REVIEW_DIR / f"2026-07-29-{kind}-contact-sheet-v6.jpg"
    sheet.save(path, "JPEG", quality=91, optimize=True)
    return path


def main() -> None:
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    atlases: list[dict[str, object]] = []
    entries: list[dict[str, object]] = []
    for biome_id, _label in BIOMES:
        for kind in RUNTIME_DIRS:
            atlas, frames = build_atlas(biome_id, kind)
            atlases.append(atlas)
            entries.extend(frames)
    hashes = [entry["rgbaSha256"] for entry in entries]
    if len(entries) != 400 or len(set(hashes)) != 400:
        raise RuntimeError("Expected exactly 400 unique underground detail frames")
    multi_tile_props = [
        entry for entry in entries
        if entry.get("scaleClass") == "multi-tile"
    ]
    localized_props = [
        entry for entry in entries
        if entry.get("scaleClass") == "localized"
    ]
    if len(multi_tile_props) != 50 or len(localized_props) != 150:
        raise RuntimeError("Expected 50 multi-tile and 150 localized overlay props")
    contacts = [
        build_contact_sheet(kind, [item for item in atlases if item["kind"] == kind])
        for kind in RUNTIME_DIRS
    ]
    manifest = {
        "version": 6,
        "mode": "additive ImageGen foreground texture and overlay prop atlases",
        "counts": {
            "biomes": len(BIOMES),
            "atlases": len(atlases),
            "foregroundTextures": 200,
            "overlayProps": 200,
            "multiTileOverlayProps": len(multi_tile_props),
            "localizedOverlayProps": len(localized_props),
            "totalEntries": len(entries),
            "uniqueRgbaFrames": len(set(hashes)),
        },
        "frameSize": list(FRAME_SIZE),
        "grid": list(GRID),
        "terrainAuthority": "visual-only; masked by existing authoritative terrain",
        "rollback": "?undergroundDetailLibrary=0",
        "propScaleClasses": {
            "multiTileFrameIndexes": list(MULTI_TILE_PROP_FRAMES),
            "multiTileWidthTiles": [9, 17],
            "multiTileHeightTiles": [5.5, 11.5],
            "localizedWidthTiles": [3.2, 7.8],
            "localizedHeightTiles": [2.4, 5.8],
        },
        "atlases": atlases,
        "entries": entries,
        "contactSheets": [path.relative_to(ROOT).as_posix() for path in contacts],
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest["counts"], indent=2))
    for path in contacts:
        print(path.relative_to(ROOT).as_posix())


if __name__ == "__main__":
    main()
