"""Build the dedicated 250-frame ImageGen Star light atlas package."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PACKAGE_ROOT = ROOT / "sprites" / "environment" / "star-identity-lights-v1"
SOURCE_ROOT = PACKAGE_ROOT / "source"
FRAME_SIZE = 192
ATLAS_COLUMNS = 10
SOURCE_COLUMNS = 5
SOURCE_ROWS = 5
SOURCE_PAGE_COUNT = 10
BLACK_THRESHOLD = 4
EDGE_FEATHER_PX = 32
RADIAL_FADE_START = 0.72

RARITIES = (
    ("common", 60),
    ("uncommon", 50),
    ("rare", 50),
    ("epic", 40),
    ("mythic", 30),
    ("astral", 20),
)

# The live identity library preserves its first fifty V1 entries, then appends
# each rarity's V2 expansion. Target frames intentionally match the core atlas.
IDENTITY_SEGMENTS = (
    (0, 12, "common", 0),
    (12, 22, "uncommon", 0),
    (22, 32, "rare", 0),
    (32, 40, "epic", 0),
    (40, 46, "mythic", 0),
    (46, 50, "astral", 0),
    (50, 98, "common", 12),
    (98, 138, "uncommon", 10),
    (138, 178, "rare", 10),
    (178, 210, "epic", 8),
    (210, 234, "mythic", 6),
    (234, 250, "astral", 4),
)

IMAGEGEN_CALL_IDS = (
    "call_svmAdwM3dW7gdFPy3BbiXy4O",
    "call_Y009sSURxPgeVA5bb6q9ALuF",
    "call_3cKJBNkejSq3dmPC57xQbnDw",
    "call_LTg3QY647BdxTIAW3rtP2mr9",
    "call_GN8MPzucoqWbaAFnfdgLGhmM",
    "call_29WfO9mBGlvxgwLptCP6OoXG",
    "call_Npr1cWrGnL4MVRANZWh3qmew",
    "call_VN6lJXlgPdFlVsmRVBQ3Fjw9",
    "call_gHjcAaO2wOgMtJrehvP0ogt7",
    "call_v0uK5dCNABroxU00yLhoyvIh",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def rgba_sha256(image: Image.Image) -> str:
    return hashlib.sha256(image.tobytes()).hexdigest()


def source_path(page_index: int) -> Path:
    return SOURCE_ROOT / (
        f"star-identity-lights-page-{page_index + 1:02d}-source-v1.png"
    )


def crop_source_cell(source: Image.Image, local_index: int) -> Image.Image:
    row, column = divmod(local_index, SOURCE_COLUMNS)
    left = round(column * source.width / SOURCE_COLUMNS)
    right = round((column + 1) * source.width / SOURCE_COLUMNS)
    top = round(row * source.height / SOURCE_ROWS)
    bottom = round((row + 1) * source.height / SOURCE_ROWS)
    size = min(right - left, bottom - top)
    crop_left = left + (right - left - size) // 2
    crop_top = top + (bottom - top - size) // 2
    return source.crop((
        crop_left,
        crop_top,
        crop_left + size,
        crop_top + size,
    ))


def luminosity_to_alpha(source: Image.Image) -> Image.Image:
    """Convert pure-black additive art to straight-alpha RGBA."""
    rgb = source.convert("RGB")
    output = Image.new("RGBA", rgb.size, (0, 0, 0, 0))
    converted = []
    for red, green, blue in rgb.get_flattened_data():
        maximum = max(red, green, blue)
        if maximum <= BLACK_THRESHOLD:
            converted.append((0, 0, 0, 0))
            continue
        alpha = round(
            ((maximum - BLACK_THRESHOLD) / (255 - BLACK_THRESHOLD)) ** 0.84
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


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3 - 2 * value)


def feather_frame_edges(source: Image.Image) -> Image.Image:
    """Force every authored light to transparent before its atlas boundary."""
    output = source.copy()
    pixels = []
    center = (FRAME_SIZE - 1) / 2
    radius = max(1.0, center)
    for y in range(FRAME_SIZE):
        for x in range(FRAME_SIZE):
            red, green, blue, alpha = source.getpixel((x, y))
            edge_distance = min(
                x,
                y,
                FRAME_SIZE - 1 - x,
                FRAME_SIZE - 1 - y,
            )
            edge_factor = smoothstep(edge_distance / EDGE_FEATHER_PX)
            normalized_radius = (
                ((x - center) ** 2 + (y - center) ** 2) ** 0.5 / radius
            )
            radial_factor = 1 - smoothstep(
                (normalized_radius - RADIAL_FADE_START)
                / (1 - RADIAL_FADE_START)
            )
            pixels.append((
                red,
                green,
                blue,
                round(alpha * edge_factor * radial_factor),
            ))
    output.putdata(pixels)
    return output


def resolve_target(global_index: int) -> tuple[str, int]:
    for start, end, rarity, frame_start in IDENTITY_SEGMENTS:
        if start <= global_index < end:
            return rarity, frame_start + global_index - start
    raise ValueError(f"Unmapped Star identity index: {global_index}")


def frame_metrics(frame: Image.Image) -> dict:
    alpha = frame.getchannel("A")
    values = list(alpha.get_flattened_data())
    occupied = sum(1 for value in values if value > 0)
    edge_values = []
    edge_width = max(1, round(FRAME_SIZE * 0.035))
    for y in range(FRAME_SIZE):
        for x in range(FRAME_SIZE):
            if (
                x < edge_width
                or y < edge_width
                or x >= FRAME_SIZE - edge_width
                or y >= FRAME_SIZE - edge_width
            ):
                edge_values.append(alpha.getpixel((x, y)))
    return {
        "rgbaSha256": rgba_sha256(frame),
        "alphaCoverage": round(occupied / (FRAME_SIZE * FRAME_SIZE), 6),
        "edgeAlphaMaximum": max(edge_values, default=0),
    }


def load_sources() -> tuple[list[Image.Image], list[dict]]:
    images = []
    metadata = []
    for page_index in range(SOURCE_PAGE_COUNT):
        path = source_path(page_index)
        if not path.is_file():
            raise FileNotFoundError(f"Missing ImageGen light source: {path}")
        image = Image.open(path).convert("RGB")
        images.append(image)
        metadata.append({
            "page": page_index + 1,
            "path": path.relative_to(ROOT).as_posix(),
            "sha256": sha256(path),
            "sourceSize": list(image.size),
            "columns": SOURCE_COLUMNS,
            "rows": SOURCE_ROWS,
            "frameCount": SOURCE_COLUMNS * SOURCE_ROWS,
            "globalStartIndex": page_index * 25,
            "imageGenCallId": IMAGEGEN_CALL_IDS[page_index],
        })
    return images, metadata


def build_frames(sources: list[Image.Image]) -> dict[str, list[Image.Image]]:
    frames = {rarity: [None] * count for rarity, count in RARITIES}
    for global_index in range(250):
        page_index, local_index = divmod(global_index, 25)
        frame = crop_source_cell(
            sources[page_index],
            local_index,
        ).resize((FRAME_SIZE, FRAME_SIZE), Image.Resampling.LANCZOS)
        frame = luminosity_to_alpha(frame)
        frame = feather_frame_edges(frame)
        rarity, target_frame = resolve_target(global_index)
        frames[rarity][target_frame] = frame
    if any(frame is None for rarity_frames in frames.values() for frame in rarity_frames):
        raise RuntimeError("Star light atlas mapping left an empty target frame")
    return frames


def build_atlas(rarity: str, frames: list[Image.Image]) -> dict:
    rows = (len(frames) + ATLAS_COLUMNS - 1) // ATLAS_COLUMNS
    atlas = Image.new(
        "RGBA",
        (ATLAS_COLUMNS * FRAME_SIZE, rows * FRAME_SIZE),
        (0, 0, 0, 0),
    )
    metrics = []
    for frame_index, frame in enumerate(frames):
        row, column = divmod(frame_index, ATLAS_COLUMNS)
        atlas.alpha_composite(
            frame,
            (column * FRAME_SIZE, row * FRAME_SIZE),
        )
        metrics.append(frame_metrics(frame))
    output = PACKAGE_ROOT / f"star-identity-lights-{rarity}-atlas-v1.png"
    atlas.save(output, optimize=True)
    return {
        "rarity": rarity,
        "output": output.relative_to(ROOT).as_posix(),
        "outputSha256": sha256(output),
        "frameSize": FRAME_SIZE,
        "columns": ATLAS_COLUMNS,
        "rows": rows,
        "frameCount": len(frames),
        "decodedBytes": atlas.width * atlas.height * 4,
        "frames": metrics,
    }


def main() -> None:
    PACKAGE_ROOT.mkdir(parents=True, exist_ok=True)
    sources, source_metadata = load_sources()
    frames = build_frames(sources)
    atlases = [
        build_atlas(rarity, frames[rarity])
        for rarity, unused_count in RARITIES
    ]
    decoded_bytes = sum(atlas["decodedBytes"] for atlas in atlases)
    original_light_budget_bytes = 6 * 1254 * 1254 * 4
    manifest = {
        "schemaVersion": 1,
        "packageId": "star-identity-lights-v1",
        "artSource": "OpenAI ImageGen built-in",
        "identityCount": sum(count for unused_rarity, count in RARITIES),
        "frameSize": FRAME_SIZE,
        "atlasColumns": ATLAS_COLUMNS,
        "decodedBytes": decoded_bytes,
        "originalSixLightDecodedBytes": original_light_budget_bytes,
        "withinOriginalDecodedBudget": decoded_bytes <= original_light_budget_bytes,
        "sources": source_metadata,
        "atlases": atlases,
    }
    manifest_path = PACKAGE_ROOT / "star-identity-lights-v1.manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Built {manifest['identityCount']} dedicated Star lights across "
        f"{len(atlases)} atlases ({decoded_bytes} decoded bytes)."
    )


if __name__ == "__main__":
    main()
