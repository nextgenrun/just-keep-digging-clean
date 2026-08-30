"""Build the V6 response atlas with ten stable Stone response layouts."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SEMANTIC = ROOT / "sprites/backgrounds/world-visual-v2/semantic-decals-v1"
PACKAGE = SEMANTIC / "ground-damage-dynamic-response-v6"
SOURCES = PACKAGE / "sources"
STONE_SOURCE = SOURCES / "2026-08-26-stone-response-fragments-alpha-v6.png"
V5_PACKAGE = SEMANTIC / "ground-damage-aligned-v5"
V5_MANIFEST = V5_PACKAGE / "manifest.json"
V5_FRACTURE = SEMANTIC / "ground-damage-fracture-aligned-v5.png"
V5_RESPONSE = SEMANTIC / "ground-damage-response-aligned-v5.png"
RESPONSE_ATLAS = SEMANTIC / "ground-damage-response-dynamic-v6.png"
MANIFEST = PACKAGE / "manifest.json"

FRAME = 188
NATIVE = 94
SOURCE_COLUMNS = 5
SOURCE_ROWS = 4
SOURCE_PIECES = SOURCE_COLUMNS * SOURCE_ROWS
STONE_TILE_TYPE = 2
STONE_VARIANTS = 10
RESPONSE_TIERS = 6
RESPONSE_COUNTS = (1, 2, 3, 4, 5, 6)
RESPONSE_COLUMNS = 18
VISIBLE_ALPHA = 12
DECODED_BUDGET = 76 * 1024 * 1024

STONE_PROMPT = (
    "Create exactly twenty distinct small broken Stone fragments, chips, thin "
    "slate flakes, and angular mineral splinters in a clean 5x4 contact sheet. "
    "Match the dark blue-charcoal UNDERSTAR stone reference with muted cobalt "
    "grain, restrained mineral edges, genuine transparent gutters, and no "
    "bright white faces, cracks, filled ground patches, or rubble piles."
)
STONE_ALPHA_PROMPT = (
    "Remove only the pale checkerboard and replace it with genuine alpha. "
    "Preserve all twenty fragments, their dark stone colors, scale, spacing, "
    "orientation, clean edges, and exact 5x4 layout."
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


def split_stone_fragments() -> list[Image.Image]:
    with Image.open(STONE_SOURCE) as source:
        sheet = source.convert("RGBA")
    if sheet.getchannel("A").getextrema()[0] != 0:
        raise AssertionError("Stone response source must contain genuine alpha")
    pieces = []
    for row in range(SOURCE_ROWS):
        top = round(row * sheet.height / SOURCE_ROWS)
        bottom = round((row + 1) * sheet.height / SOURCE_ROWS)
        for column in range(SOURCE_COLUMNS):
            left = round(column * sheet.width / SOURCE_COLUMNS)
            right = round((column + 1) * sheet.width / SOURCE_COLUMNS)
            cell = sheet.crop((left, top, right, bottom))
            alpha = np.asarray(cell.getchannel("A"), dtype=np.uint8)
            cleaned = np.where(alpha > 5, alpha, 0).astype(np.uint8)
            cell.putalpha(Image.fromarray(cleaned, "L"))
            box = cell.getchannel("A").point(
                lambda value: 255 if value > VISIBLE_ALPHA else 0
            ).getbbox()
            if not box:
                raise AssertionError("Stone source cell became empty")
            pieces.append(cell.crop(box))
    if len(pieces) != SOURCE_PIECES:
        raise AssertionError("Unexpected Stone source inventory")
    return pieces


def prepare_piece(source: Image.Image, variant: int, slot: int) -> Image.Image:
    target = 15 + slot * 2 + ((variant * 3 + slot * 5) % 6)
    scale = target / max(source.size)
    resized = source.resize(
        (max(1, round(source.width * scale)), max(1, round(source.height * scale))),
        Image.Resampling.LANCZOS,
    )
    return resized.rotate(
        (variant * 53 + slot * 71) % 111 - 55,
        resample=Image.Resampling.BICUBIC,
        expand=True,
    )


def build_stone_responses(pieces: list[Image.Image]) -> tuple[list[list[Image.Image]], dict[str, list[float]]]:
    radii = (2, 12, 20, 27, 34, 40)
    variants = []
    coverage = {}
    for variant in range(STONE_VARIANTS):
        placements = []
        for slot in range(RESPONSE_TIERS):
            source = pieces[(variant * 3 + slot * 7) % len(pieces)]
            piece = prepare_piece(source, variant, slot)
            angle = math.radians((variant * 37 + slot * 137) % 360)
            radius = radii[slot] + ((variant + slot * 2) % 5 - 2)
            x = round(FRAME / 2 + math.cos(angle) * radius - piece.width / 2)
            y = round(FRAME / 2 + math.sin(angle) * radius - piece.height / 2)
            placements.append((piece, (x, y)))

        frame = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
        states = []
        values = []
        for count in RESPONSE_COUNTS:
            piece, position = placements[count - 1]
            frame.alpha_composite(piece, position)
            state = frame.copy()
            states.append(state)
            values.append(round(float((np.asarray(state.getchannel("A")) > VISIBLE_ALPHA).mean()), 6))
        if any(after <= before for before, after in zip(values, values[1:])):
            raise AssertionError(f"Stone response variant {variant + 1} is not cumulative")
        variants.append(states)
        coverage[f"stone-variant-{variant + 1:02d}"] = values
    return variants, coverage


def extract_v5_frames(manifest: dict[str, object]) -> list[Image.Image]:
    response = manifest["atlases"]["response"]
    columns = int(response["columns"])
    count = int(response["frameCount"])
    with Image.open(V5_RESPONSE) as source:
        atlas = source.convert("RGBA")
    frames = []
    for index in range(count):
        left = (index % columns) * FRAME
        top = (index // columns) * FRAME
        frames.append(atlas.crop((left, top, left + FRAME, top + FRAME)))
    return frames


def build_response_atlas(
    v5_manifest: dict[str, object],
    stone_states: list[list[Image.Image]],
) -> tuple[list[Image.Image], list[dict[str, object]]]:
    profiles = v5_manifest["contracts"]["responseProfiles"]
    old_frames = extract_v5_frames(v5_manifest)
    old_profile_count = len(profiles)
    frames = []
    contracts = []
    preserved_hashes = []
    for profile_index, profile in enumerate(profiles):
        variant_count = STONE_VARIANTS if int(profile["tileType"]) == STONE_TILE_TYPE else 1
        frame_offset = len(frames)
        for tier in range(RESPONSE_TIERS):
            if variant_count == STONE_VARIANTS:
                frames.extend(stone_states[variant][tier] for variant in range(STONE_VARIANTS))
            else:
                frame = old_frames[tier * old_profile_count + profile_index]
                frames.append(frame)
                preserved_hashes.append(pixel_hash(frame))
        contracts.append({
            **profile,
            "frameOffset": frame_offset,
            "variantCount": variant_count,
        })
    expected = (old_profile_count - 1) * RESPONSE_TIERS + STONE_VARIANTS * RESPONSE_TIERS
    if len(frames) != expected or len({pixel_hash(frame) for frame in frames}) != len(frames):
        raise AssertionError("Unexpected or duplicate V6 response frames")
    old_non_stone = [
        old_frames[tier * old_profile_count + profile_index]
        for profile_index, profile in enumerate(profiles)
        if int(profile["tileType"]) != STONE_TILE_TYPE
        for tier in range(RESPONSE_TIERS)
    ]
    if sorted(preserved_hashes) != sorted(pixel_hash(frame) for frame in old_non_stone):
        raise AssertionError("A non-Stone V5 response frame changed")
    return frames, contracts


def pack_frames(frames: list[Image.Image]) -> None:
    rows = math.ceil(len(frames) / RESPONSE_COLUMNS)
    atlas = Image.new("RGBA", (RESPONSE_COLUMNS * FRAME, rows * FRAME), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        atlas.alpha_composite(frame, ((index % RESPONSE_COLUMNS) * FRAME, (index // RESPONSE_COLUMNS) * FRAME))
    atlas.save(RESPONSE_ATLAS, "PNG", optimize=True)


def write_manifest(
    v5_manifest: dict[str, object],
    frames: list[Image.Image],
    profiles: list[dict[str, object]],
    coverage: dict[str, list[float]],
) -> None:
    fracture = image_record(V5_FRACTURE)
    response = image_record(RESPONSE_ATLAS)
    decoded_bytes = int(fracture["decodedBytes"]) + int(response["decodedBytes"])
    if decoded_bytes > DECODED_BUDGET:
        raise AssertionError("V6 decoded atlas budget exceeded")
    data = {
        "version": 6,
        "date": "2026-08-26",
        "production": True,
        "generator": rel(Path(__file__)),
        "imageGeneration": {
            "mode": "OpenAI built-in image generation",
            "promptSet": {
                "stoneFragments": STONE_PROMPT,
                "stoneAlphaCorrection": STONE_ALPHA_PROMPT,
            },
            "referenceAssets": [
                "sprites/backgrounds/world-visual-v2/depth/underground-foreground-textures-v6/blue-caverns-foreground-textures-atlas-v6.webp",
            ],
        },
        "sources": {
            "stoneFragmentsAlpha": image_record(STONE_SOURCE),
            "alignedV5Response": image_record(V5_RESPONSE),
        },
        "atlases": {
            "fracture": {
                **fracture,
                "reusedFrom": "aligned-v5",
                "frameSizePx": FRAME,
                "columns": 16,
                "variants": 24,
                "rasterTiers": 12,
                "frameCount": 288,
            },
            "response": {
                **response,
                "frameSizePx": FRAME,
                "columns": RESPONSE_COLUMNS,
                "profiles": len(profiles),
                "tiers": RESPONSE_TIERS,
                "frameCount": len(frames),
            },
        },
        "contracts": {
            "logicalTilePx": NATIVE,
            "fixedDisplayScale": 1.0,
            "displayOrigin": [0.5, 0.5],
            "responseFrameOrder": "profile-major: frameOffset + tier * variantCount + variant",
            "responseTierByState": v5_manifest["contracts"]["responseTierByState"],
            "responseVariantSalt": 2909,
            "stoneResponseVariants": STONE_VARIANTS,
            "stoneTransformCount": 8,
            "effectiveStoneResponseCombinations": STONE_VARIANTS * 8,
            "nonStoneFramesPreservedFromV5": (len(profiles) - 1) * RESPONSE_TIERS,
            "responseProfiles": profiles,
            "stoneCoverage": coverage,
            "decodedBytes": decoded_bytes,
            "decodedBudgetBytes": DECODED_BUDGET,
        },
        "rollback": {
            "v5Query": "?groundDamageAtlas=v5",
            "v4Query": "?groundDamageAtlas=v4",
            "v3Query": "?groundDamageAtlas=v3",
            "v2Query": "?groundDamageAtlas=v2",
            "v1Query": "?groundDamageAtlas=legacy",
            "rendererQuery": "?groundDamage=legacy",
        },
    }
    MANIFEST.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    required = (STONE_SOURCE, V5_MANIFEST, V5_FRACTURE, V5_RESPONSE)
    missing = [rel(path) for path in required if not path.is_file()]
    if missing:
        raise FileNotFoundError(f"Missing V6 source assets: {missing}")
    v5_manifest = json.loads(V5_MANIFEST.read_text(encoding="utf-8"))
    pieces = split_stone_fragments()
    stone_states, coverage = build_stone_responses(pieces)
    frames, profiles = build_response_atlas(v5_manifest, stone_states)
    pack_frames(frames)
    write_manifest(v5_manifest, frames, profiles, coverage)
    print("DYNAMIC_GROUND_DAMAGE_V6_OK")
    print(f"response={rel(RESPONSE_ATLAS)} sha256={sha256(RESPONSE_ATLAS)}")


if __name__ == "__main__":
    main()
