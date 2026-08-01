"""Build the 250-frame ImageGen Star identity atlas package."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
V1_ROOT = ROOT / "sprites" / "environment" / "star-identities-v1"
V2_ROOT = ROOT / "sprites" / "environment" / "star-identities-v2"
V2_SOURCE = V2_ROOT / "source"
FRAME_SIZE = 256
ATLAS_COLUMNS = 10
BLACK_THRESHOLD = 3

RARITIES = (
    ("common", 4, 3, 12, (16, 16, 16)),
    ("uncommon", 5, 2, 10, (16, 16, 8)),
    ("rare", 5, 2, 10, (16, 16, 8)),
    ("epic", 4, 2, 8, (16, 16)),
    ("mythic", 3, 2, 6, (16, 8)),
    ("astral", 2, 2, 4, (16,)),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def luminosity_to_alpha(source: Image.Image) -> Image.Image:
    """Convert black-backed additive art into straight-alpha RGBA."""
    rgb = source.convert("RGB")
    output = Image.new("RGBA", rgb.size, (0, 0, 0, 0))
    converted = []
    for red, green, blue in rgb.get_flattened_data():
        maximum = max(red, green, blue)
        if maximum <= BLACK_THRESHOLD:
            converted.append((0, 0, 0, 0))
            continue
        alpha = round(
            ((maximum - BLACK_THRESHOLD) / (255 - BLACK_THRESHOLD)) ** 0.88
            * 255
        )
        alpha = max(1, min(255, alpha))
        scale = 255 / alpha
        converted.append((
            min(255, round(red * scale)),
            min(255, round(green * scale)),
            min(255, round(blue * scale)),
            alpha,
        ))
    output.putdata(converted)
    return output


def square_cell(
    source: Image.Image,
    frame: int,
    columns: int,
    rows: int,
) -> Image.Image:
    row, column = divmod(frame, columns)
    left = round(column * source.width / columns)
    right = round((column + 1) * source.width / columns)
    top = round(row * source.height / rows)
    bottom = round((row + 1) * source.height / rows)
    size = min(right - left, bottom - top)
    crop_left = left + (right - left - size) // 2
    crop_top = top + (bottom - top - size) // 2
    return source.crop((
        crop_left,
        crop_top,
        crop_left + size,
        crop_top + size,
    ))


def source_spec(
    path: Path,
    columns: int,
    rows: int,
    frame_count: int,
    start_frame: int,
    kind: str,
) -> dict:
    if not path.is_file():
        raise FileNotFoundError(f"Missing Star source sheet: {path}")
    source = Image.open(path).convert("RGB")
    return {
        "kind": kind,
        "path": path,
        "image": source,
        "columns": columns,
        "rows": rows,
        "frameCount": frame_count,
        "startFrame": start_frame,
    }


def rarity_sources(
    rarity: str,
    base_columns: int,
    base_rows: int,
    base_count: int,
    page_counts: tuple[int, ...],
) -> list[dict]:
    sources = [source_spec(
        V1_ROOT / "source" / f"star-identities-{rarity}-source-v1.png",
        base_columns,
        base_rows,
        base_count,
        0,
        "v1-base",
    )]
    start_frame = base_count
    for page_index, frame_count in enumerate(page_counts, start=1):
        rows = (frame_count + 3) // 4
        sources.append(source_spec(
            V2_SOURCE / (
                f"star-identities-{rarity}-expansion-page-"
                f"{page_index:02d}-source-v2.png"
            ),
            4,
            rows,
            frame_count,
            start_frame,
            "v2-expansion",
        ))
        start_frame += frame_count
    return sources


def build_rarity(
    rarity: str,
    base_columns: int,
    base_rows: int,
    base_count: int,
    page_counts: tuple[int, ...],
) -> dict:
    sources = rarity_sources(
        rarity,
        base_columns,
        base_rows,
        base_count,
        page_counts,
    )
    frame_count = base_count + sum(page_counts)
    rows = (frame_count + ATLAS_COLUMNS - 1) // ATLAS_COLUMNS
    atlas = Image.new(
        "RGBA",
        (ATLAS_COLUMNS * FRAME_SIZE, rows * FRAME_SIZE),
        (0, 0, 0, 0),
    )
    coverage = [0.0] * frame_count
    for spec in sources:
        for local_frame in range(spec["frameCount"]):
            global_frame = spec["startFrame"] + local_frame
            cell = square_cell(
                spec["image"],
                local_frame,
                spec["columns"],
                spec["rows"],
            ).resize((FRAME_SIZE, FRAME_SIZE), Image.Resampling.LANCZOS)
            cell = luminosity_to_alpha(cell)
            row, column = divmod(global_frame, ATLAS_COLUMNS)
            atlas.alpha_composite(
                cell,
                (column * FRAME_SIZE, row * FRAME_SIZE),
            )
            occupied = sum(
                1 for value in cell.getchannel("A").get_flattened_data()
                if value > 0
            )
            coverage[global_frame] = round(
                occupied / (FRAME_SIZE * FRAME_SIZE),
                6,
            )
    output = V2_ROOT / f"star-identities-{rarity}-atlas-v2.png"
    atlas.save(output, optimize=True)
    manifest_sources = []
    for spec in sources:
        manifest_sources.append({
            "kind": spec["kind"],
            "path": spec["path"].relative_to(ROOT).as_posix(),
            "sha256": sha256(spec["path"]),
            "sourceSize": list(spec["image"].size),
            "columns": spec["columns"],
            "rows": spec["rows"],
            "frameCount": spec["frameCount"],
            "startFrame": spec["startFrame"],
        })
    return {
        "rarity": rarity,
        "sources": manifest_sources,
        "output": output.relative_to(ROOT).as_posix(),
        "outputSha256": sha256(output),
        "frameSize": FRAME_SIZE,
        "columns": ATLAS_COLUMNS,
        "rows": rows,
        "frameCount": frame_count,
        "decodedBytes": atlas.width * atlas.height * 4,
        "coverage": coverage,
    }


def main() -> None:
    V2_ROOT.mkdir(parents=True, exist_ok=True)
    atlases = [build_rarity(*config) for config in RARITIES]
    manifest = {
        "schemaVersion": 2,
        "packageId": "star-identities-v2",
        "artSource": "OpenAI ImageGen built-in plus preserved v1 sources",
        "identityCount": sum(atlas["frameCount"] for atlas in atlases),
        "frameSize": FRAME_SIZE,
        "atlasColumns": ATLAS_COLUMNS,
        "decodedBytes": sum(atlas["decodedBytes"] for atlas in atlases),
        "atlases": atlases,
    }
    manifest_path = V2_ROOT / "star-identities-v2.manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Built {manifest['identityCount']} identities across "
        f"{len(atlases)} atlases ({manifest['decodedBytes']} decoded bytes)."
    )


if __name__ == "__main__":
    main()
