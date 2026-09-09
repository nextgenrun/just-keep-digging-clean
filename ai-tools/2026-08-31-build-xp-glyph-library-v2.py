from __future__ import annotations

import hashlib
import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
PACK_DIR = ROOT / "sprites" / "UI" / "xp-gathering-v2"
SOURCE_PATH = PACK_DIR / "source" / "xp-glyph-library-v2-source.png"
MANIFEST_PATH = PACK_DIR / "xp-glyph-library-v2-manifest.json"
REVIEW_PATH = PACK_DIR / "xp-glyph-library-v2-review.png"

SOURCE_GRID_COLUMNS = 3
SOURCE_GRID_ROWS = 3
REVIEW_COLUMNS = 4
REVIEW_ROWS = 3
OUTPUT_SIZE_PX = 256
CONTENT_SIZE_PX = 216
ALPHA_COMPONENT_THRESHOLD = 24
COMPONENT_PADDING_PX = 22
MIN_COMPONENT_PIXELS = 2_000
MIN_ALPHA_COVERAGE = 0.08
MAX_ALPHA_COVERAGE = 0.78

OUTPUTS = (
    ("routineFacet", "xp-mote-facet-v2.png"),
    ("routineCompass", "xp-mote-compass-v2.png"),
    ("routineKite", "xp-mote-kite-v2.png"),
    ("clusterTwin", "xp-cluster-twin-v2.png"),
    ("clusterOrbit", "xp-cluster-orbit-v2.png"),
    ("clusterTriad", "xp-cluster-triad-v2.png"),
    ("specialRune", "xp-sigil-rune-v2.png"),
    ("specialLegend", "xp-sigil-legend-v2.png"),
    ("levelCrown", "xp-crest-crown-v2.png"),
)

V1_CARRIERS = (
    ("routineCore", "xp-mote-core-v2.png", ROOT / "sprites" / "UI" / "xp-gathering-v1" / "xp-mote-routine.png"),
    ("specialCore", "xp-sigil-core-v2.png", ROOT / "sprites" / "UI" / "xp-gathering-v1" / "xp-sigil-special.png"),
    ("levelCore", "xp-crest-core-v2.png", ROOT / "sprites" / "UI" / "xp-gathering-v1" / "xp-crest-level.png"),
)

REVIEW_ORDER = (
    "routineCore", "routineFacet", "routineCompass", "routineKite",
    "clusterTwin", "clusterOrbit", "clusterTriad", "specialCore",
    "specialRune", "specialLegend", "levelCore", "levelCrown",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def largest_component_bbox(alpha: Image.Image) -> tuple[tuple[int, int, int, int], int]:
    width, height = alpha.size
    alpha_bytes = alpha.tobytes()
    active = bytearray(value >= ALPHA_COMPONENT_THRESHOLD for value in alpha_bytes)
    visited = bytearray(width * height)
    largest: list[int] = []

    for start in range(width * height):
        if not active[start] or visited[start]:
            continue
        queue = deque([start])
        visited[start] = 1
        component: list[int] = []
        while queue:
            index = queue.popleft()
            component.append(index)
            x = index % width
            y = index // width
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if nx < 0 or nx >= width or ny < 0 or ny >= height:
                    continue
                neighbor = ny * width + nx
                if active[neighbor] and not visited[neighbor]:
                    visited[neighbor] = 1
                    queue.append(neighbor)
        if len(component) > len(largest):
            largest = component

    if len(largest) < MIN_COMPONENT_PIXELS:
        raise RuntimeError(
            f"Main glyph component retained only {len(largest)} pixels; expected at least "
            f"{MIN_COMPONENT_PIXELS}."
        )

    xs = [index % width for index in largest]
    ys = [index // width for index in largest]
    return (min(xs), min(ys), max(xs) + 1, max(ys) + 1), len(largest)


def expanded_bbox(
    bbox: tuple[int, int, int, int],
    width: int,
    height: int,
) -> tuple[int, int, int, int]:
    left, top, right, bottom = bbox
    return (
        max(0, left - COMPONENT_PADDING_PX),
        max(0, top - COMPONENT_PADDING_PX),
        min(width, right + COMPONENT_PADDING_PX),
        min(height, bottom + COMPONENT_PADDING_PX),
    )


def fit_glyph(glyph: Image.Image) -> Image.Image:
    scale = min(CONTENT_SIZE_PX / glyph.width, CONTENT_SIZE_PX / glyph.height)
    resized = glyph.resize(
        (max(1, round(glyph.width * scale)), max(1, round(glyph.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (OUTPUT_SIZE_PX, OUTPUT_SIZE_PX), (0, 0, 0, 0))
    x = (OUTPUT_SIZE_PX - resized.width) // 2
    y = (OUTPUT_SIZE_PX - resized.height) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def build_review(outputs: list[dict[str, object]]) -> None:
    cell = 292
    review = Image.new("RGB", (cell * REVIEW_COLUMNS, cell * REVIEW_ROWS), (6, 16, 25))
    draw = ImageDraw.Draw(review)
    for index, output in enumerate(outputs):
        row, column = divmod(index, REVIEW_COLUMNS)
        icon = Image.open(PACK_DIR / str(output["file"])).convert("RGBA")
        left = column * cell + (cell - OUTPUT_SIZE_PX) // 2
        top = row * cell + 14
        review.paste(icon, (left, top), icon)
        draw.text((column * cell + 12, row * cell + cell - 20), str(output["id"]), fill=(185, 200, 211))
    review.save(REVIEW_PATH, "PNG", optimize=True)


def main() -> None:
    if not SOURCE_PATH.exists():
        raise FileNotFoundError(f"Missing approved XP atlas source: {SOURCE_PATH}")

    source = Image.open(SOURCE_PATH).convert("RGBA")
    if source.getchannel("A").getextrema()[0] != 0:
        raise RuntimeError("XP source must contain genuine transparent pixels.")

    x_edges = [
        round(source.width * index / SOURCE_GRID_COLUMNS)
        for index in range(SOURCE_GRID_COLUMNS + 1)
    ]
    y_edges = [
        round(source.height * index / SOURCE_GRID_ROWS)
        for index in range(SOURCE_GRID_ROWS + 1)
    ]
    outputs: list[dict[str, object]] = []

    for index, (asset_id, filename) in enumerate(OUTPUTS):
        row, column = divmod(index, SOURCE_GRID_COLUMNS)
        cell_box = (
            x_edges[column],
            y_edges[row],
            x_edges[column + 1],
            y_edges[row + 1],
        )
        cell = source.crop(cell_box)
        main_bbox, component_pixels = largest_component_bbox(cell.getchannel("A"))
        crop_box = expanded_bbox(main_bbox, cell.width, cell.height)
        runtime = fit_glyph(cell.crop(crop_box))
        output_path = PACK_DIR / filename
        runtime.save(output_path, "PNG", optimize=True)

        alpha = runtime.getchannel("A")
        opaque_pixels = sum(value > 8 for value in alpha.tobytes())
        coverage = opaque_pixels / (OUTPUT_SIZE_PX * OUTPUT_SIZE_PX)
        if not MIN_ALPHA_COVERAGE <= coverage <= MAX_ALPHA_COVERAGE:
            raise RuntimeError(f"{filename} alpha coverage {coverage:.3f} is outside the safe range.")
        if alpha.getbbox() in (None, (0, 0, OUTPUT_SIZE_PX, OUTPUT_SIZE_PX)):
            raise RuntimeError(f"{filename} must retain transparent padding on every side.")

        outputs.append({
            "id": asset_id,
            "file": filename,
            "sourceCell": {"row": row, "column": column},
            "sourceCrop": list(crop_box),
            "componentPixels": component_pixels,
            "alphaCoverage": round(coverage, 6),
            "sha256": sha256(output_path),
        })

    for asset_id, filename, legacy_path in V1_CARRIERS:
        legacy = Image.open(legacy_path).convert("RGBA")
        main_bbox, component_pixels = largest_component_bbox(legacy.getchannel("A"))
        crop_box = expanded_bbox(main_bbox, legacy.width, legacy.height)
        runtime = fit_glyph(legacy.crop(crop_box))
        output_path = PACK_DIR / filename
        runtime.save(output_path, "PNG", optimize=True)
        alpha = runtime.getchannel("A")
        opaque_pixels = sum(value > 8 for value in alpha.tobytes())
        coverage = opaque_pixels / (OUTPUT_SIZE_PX * OUTPUT_SIZE_PX)
        if not MIN_ALPHA_COVERAGE <= coverage <= MAX_ALPHA_COVERAGE:
            raise RuntimeError(f"{filename} alpha coverage {coverage:.3f} is outside the safe range.")
        if alpha.getbbox() in (None, (0, 0, OUTPUT_SIZE_PX, OUTPUT_SIZE_PX)):
            raise RuntimeError(f"{filename} must retain transparent padding on every side.")
        outputs.append({
            "id": asset_id,
            "file": filename,
            "source": legacy_path.relative_to(ROOT).as_posix(),
            "sourceCrop": list(crop_box),
            "componentPixels": component_pixels,
            "alphaCoverage": round(coverage, 6),
            "sha256": sha256(output_path),
        })

    output_order = {asset_id: index for index, asset_id in enumerate(REVIEW_ORDER)}
    outputs.sort(key=lambda output: output_order[str(output["id"])])

    build_review(outputs)
    manifest = {
        "id": "understar-xp-glyph-library-v2",
        "version": 2,
        "source": {
            "file": SOURCE_PATH.relative_to(ROOT).as_posix(),
            "size": list(source.size),
            "sha256": sha256(SOURCE_PATH),
            "generator": "Codex built-in image generation",
            "alphaCorrection": "background-extraction edit",
        },
        "runtimeSizePx": OUTPUT_SIZE_PX,
        "outputs": outputs,
        "review": REVIEW_PATH.relative_to(ROOT).as_posix(),
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(
        "XP_GLYPH_LIBRARY_V2_OK "
        f"icons={len(outputs)} source={source.width}x{source.height} runtime={OUTPUT_SIZE_PX}px"
    )


if __name__ == "__main__":
    main()
