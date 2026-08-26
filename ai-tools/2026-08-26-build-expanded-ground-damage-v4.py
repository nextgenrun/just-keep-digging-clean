"""Build optimized V4 structural and exact-tile damage response atlases."""

from __future__ import annotations

import hashlib
import json
import math
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SEMANTIC = ROOT / "sprites/backgrounds/world-visual-v2/semantic-decals-v1"
PACKAGE = SEMANTIC / "ground-damage-expanded-v4"
SOURCES = PACKAGE / "sources"
V3_SOURCE = SEMANTIC / "ground-damage-layered-v3/fracture-library-alpha-v3.png"
COMPRESSION_SOURCE = SOURCES / "2026-08-26-ground-damage-compression-chroma-v4.png"
COMPRESSION_ALPHA = PACKAGE / "compression-alpha-v4.png"
SHEAR_SOURCE = SOURCES / "2026-08-26-ground-damage-shear-alpha-v4.png"
BRITTLE_SOURCE = SOURCES / "2026-08-26-ground-damage-brittle-alpha-v4.png"
SHARD_SOURCE = ROOT / "sprites/fx/tile-destruction-fx-v3/tile-break-shards-v3.png"
FRACTURE_ATLAS = SEMANTIC / "ground-damage-fracture-expanded-v4.png"
RESPONSE_ATLAS = SEMANTIC / "ground-damage-response-expanded-v4.png"
MANIFEST = PACKAGE / "manifest.json"
CHROMA_HELPER = Path.home() / ".codex/skills/.system/imagegen/scripts/remove_chroma_key.py"

FRAME = 188
NATIVE = 94
GRID = 4
SOURCE_GROUPS = 4
VARIANTS = 64
RASTER_TIERS = 4
LOGICAL_STATES = 12
ATLAS_COLUMNS = 16
RESPONSE_COLUMNS = 16
TIER_FRACTIONS = (0.18, 0.40, 0.68, 1.0)
TIER_OPACITY = (0.82, 0.92, 0.98, 1.0)
RESPONSE_COUNTS = (1, 2, 3, 5)
TIER_BY_STATE = (0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3)

PROMPT_SET = {
    "compression": "4x4 transparent orthographic compression and blunt-impact fractures; sixteen distinct intact-surface silhouettes; neutral charcoal fissures and pale rims.",
    "shear": "4x4 transparent orthographic directional shear and split fractures; sixteen faults, forks, hooks, crescents, chevrons and zig-zags.",
    "brittle": "4x4 transparent orthographic brittle and delamination fractures; sixteen plate, lattice, mosaic, splinter and branching-network silhouettes.",
    "compressionCleanup": "Correct two open void motifs, then replace only the failed checkerboard background with flat chroma green for deterministic alpha extraction.",
}


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pixel_hash(image: Image.Image) -> str:
    return hashlib.sha256(image.convert("RGBA").tobytes()).hexdigest()


def image_record(path: Path) -> dict[str, object]:
    image = Image.open(path)
    return {
        "path": rel(path), "sha256": sha256(path), "width": image.width,
        "height": image.height, "mode": image.mode,
        "decodedBytes": image.width * image.height * 4,
    }


def alpha_clean_compression() -> None:
    required = (COMPRESSION_SOURCE, CHROMA_HELPER)
    if not all(path.is_file() for path in required):
        raise FileNotFoundError("Missing compression source or bundled chroma helper")
    subprocess.run(
        (
            sys.executable, str(CHROMA_HELPER), "--input", str(COMPRESSION_SOURCE),
            "--out", str(COMPRESSION_ALPHA), "--auto-key", "border", "--soft-matte",
            "--transparent-threshold", "14", "--opaque-threshold", "154",
            "--despill", "--force",
        ),
        check=True,
    )


def normalize_decal(cell: Image.Image) -> Image.Image:
    rgba = cell.convert("RGBA")
    box = rgba.getchannel("A").point(lambda value: 255 if value > 7 else 0).getbbox()
    if not box:
        raise ValueError("Generated fracture cell became empty")
    crop = rgba.crop(box)
    scale = min(164 / crop.width, 164 / crop.height)
    crop = crop.resize(
        (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
        Image.Resampling.LANCZOS,
    )
    frame = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    frame.alpha_composite(crop, ((FRAME - crop.width) // 2, (FRAME - crop.height) // 2))
    return frame


def split_sheet(path: Path) -> list[Image.Image]:
    sheet = Image.open(path).convert("RGBA")
    cells = []
    for row in range(GRID):
        top, bottom = round(row * sheet.height / GRID), round((row + 1) * sheet.height / GRID)
        for column in range(GRID):
            left = round(column * sheet.width / GRID)
            right = round((column + 1) * sheet.width / GRID)
            cells.append(normalize_decal(sheet.crop((left, top, right, bottom))))
    return cells


def progressive_anchors(final: Image.Image) -> list[Image.Image]:
    rgba = np.asarray(final.convert("RGBA"), dtype=np.uint8)
    alpha = rgba[:, :, 3].astype(np.float32)
    core_y, core_x = np.nonzero(alpha > 36)
    if len(core_x) < 64:
        raise ValueError("Fracture motif has insufficient visible structure")
    center = (FRAME - 1) / 2
    seed = np.argmin((core_x - center) ** 2 + (core_y - center) ** 2)
    grid_y, grid_x = np.mgrid[:FRAME, :FRAME]
    distance = np.hypot(grid_x - core_x[seed], grid_y - core_y[seed])
    visible = distance[alpha > 7]
    previous = np.zeros_like(alpha)
    frames = []
    for fraction, opacity in zip(TIER_FRACTIONS, TIER_OPACITY):
        threshold = float(np.quantile(visible, fraction))
        reveal = np.clip((threshold + 3.0 - distance) / 3.0, 0.0, 1.0)
        state_alpha = np.maximum(previous, np.rint(alpha * reveal * opacity)).astype(np.uint8)
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
        atlas.alpha_composite(frame, ((index % columns) * FRAME, (index // columns) * FRAME))
    atlas.save(path, "PNG", optimize=True)


def build_fractures() -> tuple[list[Image.Image], dict[str, list[float]]]:
    sources = (V3_SOURCE, COMPRESSION_ALPHA, SHEAR_SOURCE, BRITTLE_SOURCE)
    finals = [cell for source in sources for cell in split_sheet(source)]
    if len(finals) != VARIANTS:
        raise AssertionError(f"Expected {VARIANTS} structural motifs, got {len(finals)}")
    anchors = [progressive_anchors(final) for final in finals]
    frames = [anchors[variant][tier] for tier in range(RASTER_TIERS) for variant in range(VARIANTS)]
    if len({pixel_hash(frame) for frame in frames}) != len(frames):
        raise AssertionError("Expanded fracture atlas contains duplicate frames")
    coverage = {}
    for variant, variant_frames in enumerate(anchors):
        values = [round(float((np.asarray(frame.getchannel("A")) > 7).mean()), 6) for frame in variant_frames]
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
    type_ids = {name: int(value) for name, value in re.findall(r"^\s*([A-Z][A-Z0-9_]+):\s*(\d+),", types_source, re.M)}
    family_rows = {name: int(value) for name, value in re.findall(
        r"^\s*([a-z]+):\s*(\d+),", extract_section(fx_source, "const FAMILY_ROWS"), re.M,
    )}
    mappings = re.findall(
        r"\[TILE_TYPES\.([A-Z0-9_]+)\]:\s*\"([a-z]+)\"[,]?",
        extract_section(fx_source, "const FAMILY_BY_TILE"),
    )
    profiles = [
        {"tileType": type_ids[name], "tileName": name, "family": family,
         "familyRow": family_rows[family]}
        for name, family in mappings
    ]
    profiles.sort(key=lambda item: item["tileType"])
    if len(profiles) != 33 or len(family_rows) != 17:
        raise AssertionError("Unexpected tile response profile inventory")
    return profiles


def shard(sheet: Image.Image, family: int, index: int) -> Image.Image:
    frame = sheet.crop((index * 80, family * 80, (index + 1) * 80, (family + 1) * 80))
    box = frame.getchannel("A").point(lambda value: 255 if value > 5 else 0).getbbox()
    return frame.crop(box) if box else Image.new("RGBA", (1, 1), (0, 0, 0, 0))


def profile_anchors(sheet: Image.Image, profile: dict[str, object], index: int) -> list[Image.Image]:
    pieces = [shard(sheet, int(profile["familyRow"]), piece) for piece in range(5)]
    frames = []
    for tier, count in enumerate(RESPONSE_COUNTS):
        frame = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
        for piece_index in range(count):
            source = pieces[(int(profile["tileType"]) + piece_index * 2) % len(pieces)]
            angle = (index * 47 + piece_index * 79) % 360
            radius = (5, 17, 24, 30, 34)[piece_index]
            x = math.cos(math.radians(angle)) * radius
            y = math.sin(math.radians(angle)) * radius
            target = 15 + tier * 2 + piece_index * 3 + index % 3
            scale = target / max(source.size)
            resized = source.resize(
                (max(1, round(source.width * scale)), max(1, round(source.height * scale))),
                Image.Resampling.LANCZOS,
            ).rotate((index * 29 + piece_index * 53) % 91 - 45,
                     resample=Image.Resampling.BICUBIC, expand=True)
            frame.alpha_composite(resized, (round(FRAME / 2 + x - resized.width / 2),
                                            round(FRAME / 2 + y - resized.height / 2)))
        frames.append(frame)
    return frames


def build_responses(profiles: list[dict[str, object]]) -> list[Image.Image]:
    sheet = Image.open(SHARD_SOURCE).convert("RGBA")
    if sheet.size != (400, 1360):
        raise ValueError(f"Unexpected destruction shard source size {sheet.size}")
    anchors = [profile_anchors(sheet, profile, index) for index, profile in enumerate(profiles)]
    frames = [anchors[index][tier] for tier in range(RASTER_TIERS) for index in range(len(profiles))]
    if len({pixel_hash(frame) for frame in frames}) != len(frames):
        raise AssertionError("Exact-tile response atlas contains duplicate frames")
    pack_frames(frames, RESPONSE_ATLAS, RESPONSE_COLUMNS)
    return frames


def write_manifest(coverage: dict[str, list[float]], profiles: list[dict[str, object]]) -> None:
    fracture = image_record(FRACTURE_ATLAS)
    response = image_record(RESPONSE_ATLAS)
    data = {
        "version": 4, "date": "2026-08-26", "production": True,
        "generator": rel(Path(__file__)),
        "imageGeneration": {"mode": "OpenAI built-in image generation", "promptSet": PROMPT_SET},
        "sources": {
            "retainedV3": image_record(V3_SOURCE),
            "compressionChroma": image_record(COMPRESSION_SOURCE),
            "compressionAlpha": image_record(COMPRESSION_ALPHA),
            "shearAlpha": image_record(SHEAR_SOURCE),
            "brittleAlpha": image_record(BRITTLE_SOURCE),
            "materialResponses": image_record(SHARD_SOURCE),
        },
        "atlases": {
            "fracture": {**fracture, "frameSizePx": FRAME, "columns": ATLAS_COLUMNS,
                         "variants": VARIANTS, "rasterTiers": RASTER_TIERS,
                         "logicalStates": LOGICAL_STATES, "frameCount": VARIANTS * RASTER_TIERS},
            "response": {**response, "frameSizePx": FRAME, "columns": RESPONSE_COLUMNS,
                         "profiles": len(profiles), "tiers": RASTER_TIERS,
                         "frameCount": len(profiles) * RASTER_TIERS},
        },
        "contracts": {
            "logicalTilePx": NATIVE, "tierByState": list(TIER_BY_STATE),
            "transformCount": 8,
            "effectiveStructuralCombinations": VARIANTS * LOGICAL_STATES * 8,
            "fractureFrameOrder": "tier-major: tierIndex * 64 + variantIndex",
            "responseFrameOrder": "tier-major: tierIndex * 33 + profileIndex",
            "responseProfiles": profiles, "coverage": coverage,
            "decodedBytes": fracture["decodedBytes"] + response["decodedBytes"],
        },
        "rollback": {
            "v3Query": "?groundDamageAtlas=v3", "v2Query": "?groundDamageAtlas=v2",
            "v1Query": "?groundDamageAtlas=legacy", "rendererQuery": "?groundDamage=legacy",
        },
    }
    MANIFEST.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    PACKAGE.mkdir(parents=True, exist_ok=True)
    alpha_clean_compression()
    _, coverage = build_fractures()
    profiles = response_profiles()
    build_responses(profiles)
    write_manifest(coverage, profiles)
    print("EXPANDED_GROUND_DAMAGE_V4_OK")
    print(f"fracture={rel(FRACTURE_ATLAS)} sha256={sha256(FRACTURE_ATLAS)}")
    print(f"response={rel(RESPONSE_ATLAS)} sha256={sha256(RESPONSE_ATLAS)}")


if __name__ == "__main__":
    main()
