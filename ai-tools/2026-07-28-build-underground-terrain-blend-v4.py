"""Build the additive underground terrain-blend V4 runtime package."""

from __future__ import annotations

import hashlib
import json
import math
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "visual-approval-previews" / "underground-terrain-blend-v4"
RUNTIME_DIR = (
    ROOT / "sprites" / "backgrounds" / "world-visual-v2" / "depth"
    / "terrain-variation-v4"
)
MANIFEST_PATH = SOURCE_DIR / "2026-07-28-underground-terrain-blend-v4.json"
PROMPT_MANIFEST_PATH = SOURCE_DIR / "2026-07-28-imagegen-prompt-manifest.md"
PLATE_CONTACT_PATH = SOURCE_DIR / "2026-07-28-terrain-plates-contact-sheet-v4.jpg"
CAP_CONTACT_PATH = SOURCE_DIR / "2026-07-28-exposed-top-caps-contact-sheet-v4.png"

EXPECTED_SIZE = (1536, 1024)
EXPECTED_BIOMES = 10
PLATES_PER_BIOME = 5
CAPS_PER_BIOME = 20
PLATE_FEATHER = (192, 128)
CAP_SIZE = (256, 96)
CAP_ATLAS_GRID = (5, 4)
MASK_FRAME_SIZE = (384, 256)
MASK_GRID = (4, 4)
MASK_FEATHER = (48, 32)

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


def smoothstep(values: np.ndarray) -> np.ndarray:
    values = np.clip(values, 0.0, 1.0)
    return values * values * (3.0 - 2.0 * values)


def require_sources() -> dict[str, list[Path]]:
    result: dict[str, list[Path]] = {}
    all_paths = list(SOURCE_DIR.glob("*-v4-master.png"))
    for biome_id, _ in BIOMES:
        matches = sorted(path for path in all_paths if path.name.startswith(f"{biome_id}-"))
        if len(matches) != PLATES_PER_BIOME:
            raise RuntimeError(
                f"{biome_id}: expected {PLATES_PER_BIOME} masters, found {len(matches)}"
            )
        for path in matches:
            with Image.open(path) as image:
                if image.size != EXPECTED_SIZE:
                    raise RuntimeError(
                        f"{path.name}: expected {EXPECTED_SIZE}, found {image.size}"
                    )
        result[biome_id] = matches
    expected = EXPECTED_BIOMES * PLATES_PER_BIOME
    if len(all_paths) != expected:
        raise RuntimeError(f"Expected {expected} total masters, found {len(all_paths)}")
    return result


def feather_alpha(size: tuple[int, int], feather: tuple[int, int]) -> np.ndarray:
    width, height = size
    fx, fy = feather
    x = np.minimum(np.arange(width), np.arange(width)[::-1]) / max(1, fx)
    y = np.minimum(np.arange(height), np.arange(height)[::-1]) / max(1, fy)
    return smoothstep(x)[None, :] * smoothstep(y)[:, None]


def build_plate(source: Path) -> tuple[Path, dict[str, object]]:
    image = Image.open(source).convert("RGB")
    alpha = np.round(feather_alpha(image.size, PLATE_FEATHER) * 255.0).astype(np.uint8)
    rgba = np.dstack((np.asarray(image, dtype=np.uint8), alpha))
    runtime_name = source.name.replace("-master.png", ".webp")
    runtime_path = RUNTIME_DIR / runtime_name
    Image.fromarray(rgba, "RGBA").save(
        runtime_path,
        "WEBP",
        quality=88,
        method=6,
        exact=True,
    )
    return runtime_path, {
        "id": runtime_path.stem.removesuffix("-v4"),
        "source": source.relative_to(ROOT).as_posix(),
        "runtime": runtime_path.relative_to(ROOT).as_posix(),
        "width": image.width,
        "height": image.height,
        "featherPx": list(PLATE_FEATHER),
        "sourceSha256": sha256(source),
        "runtimeSha256": sha256(runtime_path),
        "runtimeBytes": runtime_path.stat().st_size,
    }


def cap_alpha(frame_index: int) -> np.ndarray:
    width, height = CAP_SIZE
    x = np.arange(width, dtype=np.float32)
    rng = random.Random(20260728 + frame_index * 977)
    phase_a = rng.uniform(0.0, math.tau)
    phase_b = rng.uniform(0.0, math.tau)
    phase_c = rng.uniform(0.0, math.tau)
    boundary = (
        62.0
        + 9.0 * np.sin(x * math.tau / rng.uniform(82.0, 146.0) + phase_a)
        + 5.0 * np.sin(x * math.tau / rng.uniform(31.0, 57.0) + phase_b)
        + 3.0 * np.sin(x * math.tau / rng.uniform(17.0, 29.0) + phase_c)
    )
    boundary = np.clip(boundary, 45.0, 84.0)
    rows = np.arange(height, dtype=np.float32)[:, None]
    bottom = np.clip((boundary[None, :] + 10.0 - rows) / 10.0, 0.0, 1.0)
    side = np.minimum(x / 16.0, x[::-1] / 16.0)
    side = smoothstep(side)[None, :]
    return smoothstep(bottom) * side


def build_cap_atlas(
    biome_id: str,
    sources: list[Path],
    biome_index: int,
) -> tuple[Path, dict[str, object]]:
    frame_width, frame_height = CAP_SIZE
    columns, rows = CAP_ATLAS_GRID
    atlas = Image.new("RGBA", (frame_width * columns, frame_height * rows))
    frame_entries: list[dict[str, object]] = []
    opened = [Image.open(path).convert("RGB") for path in sources]
    for frame_index in range(CAPS_PER_BIOME):
        source_index = frame_index % len(opened)
        source = opened[source_index]
        rng = random.Random(20260728 + biome_index * 1009 + frame_index * 67)
        crop_x = rng.randrange(0, source.width - frame_width + 1)
        crop_y = rng.randrange(0, source.height - frame_height + 1)
        crop = source.crop((
            crop_x,
            crop_y,
            crop_x + frame_width,
            crop_y + frame_height,
        ))
        alpha = np.round(cap_alpha(biome_index * CAPS_PER_BIOME + frame_index) * 255.0)
        rgba = np.dstack((np.asarray(crop, dtype=np.uint8), alpha.astype(np.uint8)))
        frame = Image.fromarray(rgba, "RGBA")
        left = (frame_index % columns) * frame_width
        top = (frame_index // columns) * frame_height
        atlas.alpha_composite(frame, (left, top))
        frame_entries.append({
            "index": frame_index,
            "sourceIndex": source_index,
            "crop": [crop_x, crop_y, frame_width, frame_height],
        })
    for image in opened:
        image.close()

    runtime_path = RUNTIME_DIR / f"{biome_id}-exposed-top-caps-v4.webp"
    atlas.save(runtime_path, "WEBP", quality=90, method=6, exact=True)
    return runtime_path, {
        "id": f"{biome_id}-exposed-top-caps",
        "runtime": runtime_path.relative_to(ROOT).as_posix(),
        "frameWidth": frame_width,
        "frameHeight": frame_height,
        "columns": columns,
        "rows": rows,
        "frameCount": CAPS_PER_BIOME,
        "frames": frame_entries,
        "runtimeSha256": sha256(runtime_path),
        "runtimeBytes": runtime_path.stat().st_size,
    }


def build_blend_mask_atlas() -> tuple[Path, dict[str, object]]:
    frame_width, frame_height = MASK_FRAME_SIZE
    columns, rows = MASK_GRID
    atlas = Image.new("RGBA", (frame_width * columns, frame_height * rows))
    x = np.arange(frame_width, dtype=np.float32)
    y = np.arange(frame_height, dtype=np.float32)
    for bits in range(16):
        horizontal = np.ones(frame_width, dtype=np.float32)
        vertical = np.ones(frame_height, dtype=np.float32)
        if bits & 1:
            horizontal *= smoothstep(x / MASK_FEATHER[0])
        if bits & 2:
            horizontal *= smoothstep(x[::-1] / MASK_FEATHER[0])
        if bits & 4:
            vertical *= smoothstep(y / MASK_FEATHER[1])
        if bits & 8:
            vertical *= smoothstep(y[::-1] / MASK_FEATHER[1])
        alpha = np.round(vertical[:, None] * horizontal[None, :] * 255.0).astype(np.uint8)
        white = np.full_like(alpha, 255)
        frame = Image.fromarray(
            np.dstack((white, white, white, alpha)),
            "RGBA",
        )
        atlas.paste(
            frame,
            ((bits % columns) * frame_width, (bits // columns) * frame_height),
        )
    runtime_path = RUNTIME_DIR / "backdrop-card-blend-mask-atlas-v4.png"
    atlas.save(runtime_path, "PNG", optimize=True)
    return runtime_path, {
        "runtime": runtime_path.relative_to(ROOT).as_posix(),
        "frameWidth": frame_width,
        "frameHeight": frame_height,
        "columns": columns,
        "rows": rows,
        "frameCount": 16,
        "edgeBits": {"left": 1, "right": 2, "top": 4, "bottom": 8},
        "featherPxAtMaskScale": list(MASK_FEATHER),
        "runtimeSha256": sha256(runtime_path),
        "runtimeBytes": runtime_path.stat().st_size,
    }


def labeled_contact_sheet(
    items: list[tuple[str, Path]],
    destination: Path,
    columns: int,
    cell_size: tuple[int, int],
    *,
    alpha_preview: bool,
) -> None:
    cell_width, cell_height = cell_size
    rows = math.ceil(len(items) / columns)
    sheet = Image.new("RGB", (columns * cell_width, rows * cell_height), (14, 17, 22))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, (label, path) in enumerate(items):
        image = Image.open(path).convert("RGBA")
        preview_bounds = (cell_width - 12, cell_height - 32)
        image.thumbnail(preview_bounds, Image.Resampling.LANCZOS)
        if alpha_preview:
            canvas = Image.new("RGB", preview_bounds, (39, 44, 52))
            checker = ImageDraw.Draw(canvas)
            for cy in range(0, canvas.height, 12):
                for cx in range(0, canvas.width, 12):
                    if (cx // 12 + cy // 12) % 2:
                        checker.rectangle((cx, cy, cx + 11, cy + 11), fill=(57, 64, 74))
            canvas.paste(image, (
                (canvas.width - image.width) // 2,
                (canvas.height - image.height) // 2,
            ), image)
        else:
            canvas = Image.new("RGB", preview_bounds, (8, 10, 14))
            canvas.paste(image.convert("RGB"), (
                (canvas.width - image.width) // 2,
                (canvas.height - image.height) // 2,
            ))
        left = (index % columns) * cell_width + 6
        top = (index // columns) * cell_height + 4
        sheet.paste(canvas, (left, top))
        draw.text((left + 2, top + canvas.height + 5), label[:48], fill=(231, 235, 242), font=font)
        image.close()
    if destination.suffix.lower() == ".jpg":
        sheet.save(destination, "JPEG", quality=88, optimize=True)
    else:
        sheet.save(destination, "PNG", optimize=True)


def write_prompt_manifest(sources: dict[str, list[Path]]) -> None:
    inventory: list[str] = []
    for biome_id, biome_name in BIOMES:
        inventory.append(f"### {biome_name}")
        inventory.extend(f"- `{path.name}`" for path in sources[biome_id])
        inventory.append("")
    PROMPT_MANIFEST_PATH.write_text(
        "# Underground Terrain Blend V4 - ImageGen Prompt Manifest\n\n"
        "Generation mode: built-in ImageGen, one call per distinct 1536x1024 "
        "master. These assets were generated and accepted as additive terrain "
        "variation; none replaces an approved background or gameplay terrain source.\n\n"
        "## Shared prompt contract\n\n"
        "- Fully opaque, edge-to-edge, flat orthographic side-view material fields.\n"
        "- Premium painterly terrain readable at the production 64 px tile scale.\n"
        "- Asymmetric small, medium, and large geological forms with no focal scene.\n"
        "- The two newest plates per biome deliberately add bolder fault fans, "
        "upheavals, mineral currents, pressure wakes, and interrupted macro gestures.\n"
        "- No mirrored folds, kaleidoscope symmetry, repeating motifs, straight "
        "bands, hard seams, tile grids, platforms, architecture, characters, UI, "
        "text, resource icons, reward icons, or transparent areas.\n"
        "- Palette-specific accents remain restrained so semantic gameplay tiles "
        "stay readable.\n\n"
        "## Accepted master inventory\n\n"
        + "\n".join(inventory)
        + "\n## Review decisions\n\n"
        "The first Amber fossil candidate was rejected before packaging because "
        "it formed broad horizontal bands. Its asymmetric replacement is the "
        "accepted `amber-depths-fossil-sunstone-clay-v4-master.png` above.\n\n"
        "During the bold-variation extension, one Amber resin-fault candidate and "
        "one Blackglass eclipse-impact candidate were rejected because their "
        "high-contrast geology crossed the complete card and could reveal a fold. "
        "Only their disconnected, overlap-safe replacements are in the accepted "
        "inventory.\n",
        encoding="utf-8",
    )


def main() -> None:
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    if "--mask-only" in sys.argv:
        mask_path, mask_entry = build_blend_mask_atlas()
        if MANIFEST_PATH.exists():
            manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
            manifest["backgroundBlendMaskAtlas"] = mask_entry
            MANIFEST_PATH.write_text(
                json.dumps(manifest, indent=2) + "\n",
                encoding="utf-8",
            )
        print(mask_path.relative_to(ROOT).as_posix())
        print(mask_entry["runtimeSha256"])
        return
    sources = require_sources()
    plate_entries: list[dict[str, object]] = []
    cap_entries: list[dict[str, object]] = []
    plate_contact: list[tuple[str, Path]] = []
    cap_contact: list[tuple[str, Path]] = []

    for biome_index, (biome_id, biome_name) in enumerate(BIOMES):
        for source in sources[biome_id]:
            runtime_path, entry = build_plate(source)
            entry["biomeId"] = biome_id
            plate_entries.append(entry)
            plate_contact.append((runtime_path.stem.removesuffix("-v4"), runtime_path))
        cap_path, cap_entry = build_cap_atlas(biome_id, sources[biome_id], biome_index)
        cap_entry["biomeId"] = biome_id
        cap_entries.append(cap_entry)
        cap_contact.append((f"{biome_name} - 20 caps", cap_path))

    mask_path, mask_entry = build_blend_mask_atlas()
    labeled_contact_sheet(
        plate_contact,
        PLATE_CONTACT_PATH,
        columns=5,
        cell_size=(308, 226),
        alpha_preview=False,
    )
    labeled_contact_sheet(
        cap_contact,
        CAP_CONTACT_PATH,
        columns=2,
        cell_size=(520, 190),
        alpha_preview=True,
    )
    write_prompt_manifest(sources)

    manifest = {
        "version": 4,
        "generatedWith": "built-in ImageGen",
        "sourceDimensions": list(EXPECTED_SIZE),
        "contracts": {
            "mode": "additive; existing backgrounds and terrain remain underneath",
            "ground": "authoritative terrain mask and collision remain unchanged",
            "scenery": "buildings, bridges, machinery, roots, and ruins remain background",
            "rollback": "?undergroundTerrainVariation=0",
        },
        "counts": {
            "masterPlates": len(plate_entries),
            "runtimePlateFiles": len(plate_entries),
            "capAtlasFiles": len(cap_entries),
            "capFrames": len(cap_entries) * CAPS_PER_BIOME,
            "backgroundBlendMaskFrames": mask_entry["frameCount"],
            "effectiveTerrainVisuals": len(plate_entries) + len(cap_entries) * CAPS_PER_BIOME,
            "runtimeFiles": len(plate_entries) + len(cap_entries) + 1,
        },
        "plateGeometry": {
            "width": EXPECTED_SIZE[0],
            "height": EXPECTED_SIZE[1],
            "featherPx": list(PLATE_FEATHER),
            "stridePx": [
                EXPECTED_SIZE[0] - PLATE_FEATHER[0],
                EXPECTED_SIZE[1] - PLATE_FEATHER[1],
            ],
        },
        "plates": plate_entries,
        "capAtlases": cap_entries,
        "backgroundBlendMaskAtlas": mask_entry,
        "contactSheets": [
            PLATE_CONTACT_PATH.relative_to(ROOT).as_posix(),
            CAP_CONTACT_PATH.relative_to(ROOT).as_posix(),
        ],
        "promptManifest": PROMPT_MANIFEST_PATH.relative_to(ROOT).as_posix(),
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest["counts"], indent=2))
    print(mask_path.relative_to(ROOT).as_posix())


if __name__ == "__main__":
    main()
