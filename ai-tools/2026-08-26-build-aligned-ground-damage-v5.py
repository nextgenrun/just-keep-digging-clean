"""Build fixed-registration V5 ground-damage and material-response atlases."""

from __future__ import annotations

import hashlib
import json
import math
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SEMANTIC = ROOT / "sprites/backgrounds/world-visual-v2/semantic-decals-v1"
PACKAGE = SEMANTIC / "ground-damage-aligned-v5"
SOURCES = PACKAGE / "sources"
GROUND_SOURCE = SOURCES / "2026-08-26-ground-damage-ground-aligned-alpha-v5.png"
CRYSTAL_SOURCE = SOURCES / "2026-08-26-ground-damage-crystal-aligned-alpha-v5.png"
SHARD_SOURCE = ROOT / "sprites/fx/tile-destruction-fx-v3/tile-break-shards-v3.png"
FRACTURE_ATLAS = SEMANTIC / "ground-damage-fracture-aligned-v5.png"
RESPONSE_ATLAS = SEMANTIC / "ground-damage-response-aligned-v5.png"
MANIFEST = PACKAGE / "manifest.json"

FRAME = 188
NATIVE = 94
CONTENT_BOX = 160
SOURCE_COLUMNS = 4
SOURCE_ROWS = 3
VARIANTS = 24
LOGICAL_STATES = 12
RASTER_TIERS = LOGICAL_STATES
ATLAS_COLUMNS = 16
RESPONSE_TIERS = 6
RESPONSE_COLUMNS = 16
VISIBLE_ALPHA = 12
SOURCE_ALPHA_CUTOFF = 22
STATE_FRACTIONS = (
    0.075, 0.13, 0.195, 0.27, 0.35, 0.44,
    0.535, 0.63, 0.725, 0.815, 0.905, 1.0,
)
STATE_OPACITY = (
    0.64, 0.69, 0.74, 0.79, 0.83, 0.87,
    0.90, 0.93, 0.95, 0.97, 0.985, 1.0,
)
RESPONSE_COUNTS = (1, 1, 2, 3, 4, 5)
RESPONSE_TIER_BY_STATE = (0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5)

GROUND_PROMPT = (
    "Create exactly sixteen distinct crack-only damage decals in a 4x4 grid, "
    "matching the dark earthy and blue-mineral UNDERSTAR ground references. "
    "Use fixed centered anchors, transparent gutters, charcoal fissure cores, "
    "narrow pale mineral lips, and no filled ground patches or damage badges."
)
GROUND_ALPHA_PROMPT = (
    "Remove only the generated checkerboard and replace it with genuine alpha; "
    "preserve the crack linework, placement, scale, and grid."
)
CRYSTAL_PROMPT = (
    "Create exactly twelve crack-only crystalline, obsidian, and magma damage "
    "decals in a 4x3 grid, matching the UNDERSTAR blackglass and magma ground "
    "references. Use fixed centered anchors and genuine transparent gutters; "
    "no filled tiles, round badges, rubble piles, or opaque backing."
)


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pixel_hash(image: Image.Image) -> str:
    return hashlib.sha256(image.convert("RGBA").tobytes()).hexdigest()


def image_record(path: Path) -> dict[str, object]:
    with Image.open(path) as source:
        image = source.convert("RGBA")
        return {
            "path": rel(path),
            "sha256": sha256(path),
            "width": image.width,
            "height": image.height,
            "mode": image.mode,
            "decodedBytes": image.width * image.height * 4,
        }


def normalize_decal(cell: Image.Image) -> Image.Image:
    rgba = cell.convert("RGBA")
    pixels = np.asarray(rgba, dtype=np.uint8).copy()
    alpha = pixels[:, :, 3].astype(np.int16)
    alpha = np.clip(
        (alpha - SOURCE_ALPHA_CUTOFF) * 255 / (255 - SOURCE_ALPHA_CUTOFF),
        0,
        255,
    ).astype(np.uint8)
    pixels[:, :, 3] = alpha
    cleaned = Image.fromarray(pixels, "RGBA")
    box = cleaned.getchannel("A").point(
        lambda value: 255 if value > VISIBLE_ALPHA else 0
    ).getbbox()
    if not box:
        raise ValueError("Generated fracture cell became empty")
    crop = cleaned.crop(box)
    scale = min(CONTENT_BOX / crop.width, CONTENT_BOX / crop.height)
    crop = crop.resize(
        (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
        Image.Resampling.LANCZOS,
    )
    neutral = ImageOps.grayscale(crop.convert("RGB"))
    crop = Image.merge(
        "RGBA",
        (neutral, neutral, neutral, crop.getchannel("A")),
    )
    aligned_box = crop.getchannel("A").point(
        lambda value: 255 if value > VISIBLE_ALPHA else 0
    ).getbbox()
    if not aligned_box:
        raise ValueError("Normalized fracture cell became empty")
    crop = crop.crop(aligned_box)
    frame = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    frame.alpha_composite(
        crop,
        ((FRAME - crop.width) // 2, (FRAME - crop.height) // 2),
    )
    return frame


def split_sheet(path: Path) -> list[Image.Image]:
    with Image.open(path) as source:
        sheet = source.convert("RGBA")
    cells = []
    for row in range(SOURCE_ROWS):
        top = round(row * sheet.height / SOURCE_ROWS)
        bottom = round((row + 1) * sheet.height / SOURCE_ROWS)
        for column in range(SOURCE_COLUMNS):
            left = round(column * sheet.width / SOURCE_COLUMNS)
            right = round((column + 1) * sheet.width / SOURCE_COLUMNS)
            cells.append(normalize_decal(sheet.crop((left, top, right, bottom))))
    return cells


def progressive_states(final: Image.Image) -> list[Image.Image]:
    rgba = np.asarray(final.convert("RGBA"), dtype=np.uint8)
    alpha = rgba[:, :, 3].astype(np.float32)
    core_y, core_x = np.nonzero(alpha > 36)
    if len(core_x) < 96:
        raise ValueError("Fracture motif has insufficient visible structure")
    center = (FRAME - 1) / 2
    seed = np.argmin((core_x - center) ** 2 + (core_y - center) ** 2)
    grid_y, grid_x = np.mgrid[:FRAME, :FRAME]
    distance = np.hypot(grid_x - core_x[seed], grid_y - core_y[seed])
    visible_distances = distance[alpha > VISIBLE_ALPHA]
    previous = np.zeros_like(alpha)
    frames = []
    for fraction, opacity in zip(STATE_FRACTIONS, STATE_OPACITY):
        threshold = float(np.quantile(visible_distances, fraction))
        reveal = np.clip((threshold + 2.4 - distance) / 2.4, 0.0, 1.0)
        state_alpha = np.maximum(
            previous,
            np.rint(alpha * reveal * opacity),
        ).astype(np.uint8)
        previous = state_alpha.astype(np.float32)
        state = rgba.copy()
        state[:, :, 3] = state_alpha
        frames.append(Image.fromarray(state, "RGBA"))
    frames[-1] = final
    return frames


def pack_frames(frames: list[Image.Image], path: Path, columns: int) -> None:
    rows = math.ceil(len(frames) / columns)
    atlas = Image.new("RGBA", (columns * FRAME, rows * FRAME), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        atlas.alpha_composite(
            frame,
            ((index % columns) * FRAME, (index // columns) * FRAME),
        )
    atlas.save(path, "PNG", optimize=True)


def build_fractures() -> tuple[list[Image.Image], dict[str, list[float]]]:
    finals = [cell for source in (GROUND_SOURCE, CRYSTAL_SOURCE) for cell in split_sheet(source)]
    if len(finals) != VARIANTS:
        raise AssertionError(f"Expected {VARIANTS} structural motifs, got {len(finals)}")
    states = [progressive_states(final) for final in finals]
    frames = [states[variant][tier] for tier in range(RASTER_TIERS) for variant in range(VARIANTS)]
    if len({pixel_hash(frame) for frame in frames}) != len(frames):
        raise AssertionError("Aligned fracture atlas contains duplicate frames")
    coverage = {}
    for variant, variant_frames in enumerate(states):
        values = [
            round(float((np.asarray(frame.getchannel("A")) > VISIBLE_ALPHA).mean()), 6)
            for frame in variant_frames
        ]
        if any(after <= before for before, after in zip(values, values[1:])):
            raise AssertionError(f"Structural motif {variant + 1} is not strictly cumulative")
        coverage[f"variant-{variant + 1:02d}"] = values
    pack_frames(frames, FRACTURE_ATLAS, ATLAS_COLUMNS)
    return frames, coverage


def extract_section(source: str, declaration: str) -> str:
    tail = source.split(declaration, 1)[1]
    return tail.split("});", 1)[0]


def response_profiles() -> list[dict[str, object]]:
    types_source = (ROOT / "values/tileTypes.js").read_text(encoding="utf-8")
    fx_source = (ROOT / "values/tileDestructionFx.js").read_text(encoding="utf-8")
    type_ids = {
        name: int(value)
        for name, value in re.findall(
            r"^\s*([A-Z][A-Z0-9_]+):\s*(\d+),",
            types_source,
            re.M,
        )
    }
    family_rows = {
        name: int(value)
        for name, value in re.findall(
            r"^\s*([a-z]+):\s*(\d+),",
            extract_section(fx_source, "const FAMILY_ROWS"),
            re.M,
        )
    }
    mappings = re.findall(
        r"\[TILE_TYPES\.([A-Z0-9_]+)\]:\s*\"([a-z]+)\"[,]?",
        extract_section(fx_source, "const FAMILY_BY_TILE"),
    )
    profiles = [
        {
            "tileType": type_ids[name],
            "tileName": name,
            "family": family,
            "familyRow": family_rows[family],
        }
        for name, family in mappings
    ]
    profiles.sort(key=lambda item: item["tileType"])
    if len(profiles) != 33 or len(family_rows) != 17:
        raise AssertionError("Unexpected tile response profile inventory")
    return profiles


def shard(sheet: Image.Image, family: int, index: int) -> Image.Image:
    frame = sheet.crop((index * 80, family * 80, (index + 1) * 80, (family + 1) * 80))
    box = frame.getchannel("A").point(
        lambda value: 255 if value > 5 else 0
    ).getbbox()
    return frame.crop(box) if box else Image.new("RGBA", (1, 1), (0, 0, 0, 0))


def profile_responses(
    sheet: Image.Image,
    profile: dict[str, object],
    profile_index: int,
) -> list[Image.Image]:
    pieces = [shard(sheet, int(profile["familyRow"]), piece) for piece in range(5)]
    frames = []
    for tier, count in enumerate(RESPONSE_COUNTS):
        frame = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
        for piece_index in range(count):
            source = pieces[(int(profile["tileType"]) + piece_index * 2) % len(pieces)]
            angle = (profile_index * 47 + piece_index * 79) % 360
            radius = (3, 16, 25, 32, 38)[piece_index]
            x = math.cos(math.radians(angle)) * radius
            y = math.sin(math.radians(angle)) * radius
            target = 13 + tier * 2 + piece_index * 3 + profile_index % 3
            scale = target / max(source.size)
            resized = source.resize(
                (max(1, round(source.width * scale)), max(1, round(source.height * scale))),
                Image.Resampling.LANCZOS,
            ).rotate(
                (profile_index * 29 + piece_index * 53) % 91 - 45,
                resample=Image.Resampling.BICUBIC,
                expand=True,
            )
            frame.alpha_composite(
                resized,
                (
                    round(FRAME / 2 + x - resized.width / 2),
                    round(FRAME / 2 + y - resized.height / 2),
                ),
            )
        frames.append(frame)
    return frames


def build_responses(profiles: list[dict[str, object]]) -> list[Image.Image]:
    with Image.open(SHARD_SOURCE) as source:
        sheet = source.convert("RGBA")
    if sheet.size != (400, 1360):
        raise ValueError(f"Unexpected destruction shard source size {sheet.size}")
    responses = [
        profile_responses(sheet, profile, index)
        for index, profile in enumerate(profiles)
    ]
    frames = [
        responses[index][tier]
        for tier in range(RESPONSE_TIERS)
        for index in range(len(profiles))
    ]
    if len({pixel_hash(frame) for frame in frames}) != len(frames):
        raise AssertionError("Aligned exact-tile response atlas contains duplicate frames")
    pack_frames(frames, RESPONSE_ATLAS, RESPONSE_COLUMNS)
    return frames


def write_manifest(
    coverage: dict[str, list[float]],
    profiles: list[dict[str, object]],
) -> None:
    fracture = image_record(FRACTURE_ATLAS)
    response = image_record(RESPONSE_ATLAS)
    decoded_bytes = int(fracture["decodedBytes"]) + int(response["decodedBytes"])
    data = {
        "version": 5,
        "date": "2026-08-26",
        "production": True,
        "generator": rel(Path(__file__)),
        "imageGeneration": {
            "mode": "OpenAI built-in image generation",
            "promptSet": {
                "groundAligned": GROUND_PROMPT,
                "groundAlphaCorrection": GROUND_ALPHA_PROMPT,
                "crystalAligned": CRYSTAL_PROMPT,
            },
            "referenceAssets": [
                "sprites/backgrounds/world-visual-v2/depth/underground-foreground-textures-v6/weathered-roots-foreground-textures-atlas-v6.webp",
                "sprites/backgrounds/world-visual-v2/depth/underground-foreground-textures-v6/blue-caverns-foreground-textures-atlas-v6.webp",
                "sprites/backgrounds/world-visual-v2/depth/underground-foreground-textures-v6/blackglass-abyss-foreground-textures-atlas-v6.webp",
                "sprites/backgrounds/world-visual-v2/depth/underground-foreground-textures-v6/core-magma-foreground-textures-atlas-v6.webp",
            ],
        },
        "sources": {
            "groundAlignedAlpha": image_record(GROUND_SOURCE),
            "crystalAlignedAlpha": image_record(CRYSTAL_SOURCE),
            "materialResponses": image_record(SHARD_SOURCE),
        },
        "atlases": {
            "fracture": {
                **fracture,
                "frameSizePx": FRAME,
                "columns": ATLAS_COLUMNS,
                "variants": VARIANTS,
                "rasterTiers": RASTER_TIERS,
                "logicalStates": LOGICAL_STATES,
                "frameCount": VARIANTS * RASTER_TIERS,
            },
            "response": {
                **response,
                "frameSizePx": FRAME,
                "columns": RESPONSE_COLUMNS,
                "profiles": len(profiles),
                "tiers": RESPONSE_TIERS,
                "frameCount": len(profiles) * RESPONSE_TIERS,
            },
        },
        "contracts": {
            "logicalTilePx": NATIVE,
            "fixedDisplayScale": 1.0,
            "displayOrigin": [0.5, 0.5],
            "frameCenterPx": [FRAME / 2, FRAME / 2],
            "contentBoxPx": CONTENT_BOX,
            "nativeSafeInsetPx": (FRAME - CONTENT_BOX) / 4,
            "stateScaleByState": [1.0] * LOGICAL_STATES,
            "fractureTierByState": list(range(LOGICAL_STATES)),
            "responseTierByState": list(RESPONSE_TIER_BY_STATE),
            "transformCount": 8,
            "effectiveStructuralCombinations": VARIANTS * LOGICAL_STATES * 8,
            "fractureFrameOrder": "tier-major: tierIndex * 24 + variantIndex",
            "responseFrameOrder": "tier-major: tierIndex * 33 + profileIndex",
            "responseProfiles": profiles,
            "coverage": coverage,
            "decodedBytes": decoded_bytes,
            "decodedBudgetBytes": 72 * 1024 * 1024,
        },
        "rollback": {
            "v4Query": "?groundDamageAtlas=v4",
            "v3Query": "?groundDamageAtlas=v3",
            "v2Query": "?groundDamageAtlas=v2",
            "v1Query": "?groundDamageAtlas=legacy",
            "rendererQuery": "?groundDamage=legacy",
        },
    }
    MANIFEST.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    required = (GROUND_SOURCE, CRYSTAL_SOURCE, SHARD_SOURCE)
    missing = [rel(path) for path in required if not path.is_file()]
    if missing:
        raise FileNotFoundError(f"Missing V5 source assets: {missing}")
    PACKAGE.mkdir(parents=True, exist_ok=True)
    _, coverage = build_fractures()
    profiles = response_profiles()
    build_responses(profiles)
    write_manifest(coverage, profiles)
    print("ALIGNED_GROUND_DAMAGE_V5_OK")
    print(f"fracture={rel(FRACTURE_ATLAS)} sha256={sha256(FRACTURE_ATLAS)}")
    print(f"response={rel(RESPONSE_ATLAS)} sha256={sha256(RESPONSE_ATLAS)}")


if __name__ == "__main__":
    main()
