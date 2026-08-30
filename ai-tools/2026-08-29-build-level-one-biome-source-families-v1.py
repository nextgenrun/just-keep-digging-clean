"""Validate and build the 20 Level One biome signature formations."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = ROOT / "visual-approval-previews" / "level-one-biome-source-families-v1"
SOURCE_DIR = REVIEW_DIR / "sources"
RUNTIME_DIR = (
    ROOT
    / "sprites"
    / "backgrounds"
    / "world-visual-v2"
    / "depth"
    / "level1-biome-signatures-v1"
)
MANIFEST_PATH = REVIEW_DIR / "2026-08-29-level-one-biome-source-families-v1.json"
CONTACT_PATH = REVIEW_DIR / "2026-08-29-level-one-biome-signatures-contact-v1.jpg"
PROMPT_PATH = REVIEW_DIR / "2026-08-29-level-one-biome-signature-prompts-v1.md"
EXPECTED_SIZE = (1536, 1024)
EDGE_FEATHER_PX = 28
PROFILE_IDS = (
    "weathered-rootways",
    "fungal-rainwells",
    "sunken-orchard",
    "timber-cisterns",
    "cobalt-aquifer",
    "sapphire-grotto",
    "glacial-waterveil",
    "drowned-observatory",
    "amber-silt-fault",
    "honeyglass-pocket",
    "resin-archive",
    "fossil-sun-vault",
    "mercury-fold",
    "magnetic-needle-reef",
    "lunar-mint-galleries",
    "mirrorstone-convergence",
    "basalt-emberworks",
    "obsidian-caldera",
    "lavawheel-necropolis",
    "shattered-furnace",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def smoothstep(values: np.ndarray) -> np.ndarray:
    clipped = np.clip(values, 0.0, 1.0)
    return clipped * clipped * (3.0 - 2.0 * clipped)


def edge_feather(image: Image.Image) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    height, width = rgba.shape[:2]
    x = np.minimum(np.arange(width), np.arange(width)[::-1]).astype(np.float32)
    y = np.minimum(np.arange(height), np.arange(height)[::-1]).astype(np.float32)
    edge = np.minimum(y[:, None], x[None, :]) / float(EDGE_FEATHER_PX)
    alpha = rgba[..., 3].astype(np.float32) / 255.0
    alpha *= smoothstep(edge)
    rgba[..., 3] = np.round(alpha * 255.0).astype(np.uint8)
    rgba[rgba[..., 3] < 3] = 0
    return Image.fromarray(rgba, "RGBA")


def alpha_metrics(image: Image.Image, profile_id: str) -> dict[str, float | int]:
    alpha = np.asarray(image.getchannel("A"), dtype=np.uint8)
    pixels = alpha.size
    transparent = float(np.count_nonzero(alpha < 8) / pixels)
    soft = float(np.count_nonzero((alpha >= 8) & (alpha < 248)) / pixels)
    opaque = float(np.count_nonzero(alpha >= 248) / pixels)
    occupied = float(np.count_nonzero(alpha >= 16) / pixels)
    if transparent < 0.25:
        raise RuntimeError(f"{profile_id}: insufficient transparent space {transparent:.4f}")
    if not 0.10 <= occupied <= 0.75:
        raise RuntimeError(f"{profile_id}: suspicious occupied coverage {occupied:.4f}")
    if int(alpha.max()) < 240 or int(alpha.min()) != 0:
        raise RuntimeError(f"{profile_id}: invalid alpha extrema {alpha.min()}..{alpha.max()}")
    if any(alpha[y, x] != 0 for x, y in (
        (0, 0), (alpha.shape[1] - 1, 0),
        (0, alpha.shape[0] - 1),
        (alpha.shape[1] - 1, alpha.shape[0] - 1),
    )):
        raise RuntimeError(f"{profile_id}: opaque outer corner")
    return {
        "alphaMin": int(alpha.min()),
        "alphaMax": int(alpha.max()),
        "transparentCoverage": round(transparent, 6),
        "softCoverage": round(soft, 6),
        "opaqueCoverage": round(opaque, 6),
        "occupiedCoverage": round(occupied, 6),
    }


def checkerboard(size: tuple[int, int], cell: int = 16) -> Image.Image:
    canvas = Image.new("RGB", size, (28, 33, 40))
    draw = ImageDraw.Draw(canvas)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(49, 56, 66))
    return canvas


def build_contact_sheet(entries: list[dict[str, object]]) -> None:
    columns = 5
    cell_width, cell_height = 304, 226
    rows = (len(entries) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * cell_width, rows * cell_height), (13, 16, 21))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, entry in enumerate(entries):
        image = Image.open(ROOT / str(entry["runtime"])).convert("RGBA")
        preview = image.copy()
        preview.thumbnail((cell_width - 12, cell_height - 34), Image.Resampling.LANCZOS)
        cell = checkerboard((cell_width - 8, cell_height - 30))
        cell.paste(
            preview,
            ((cell.width - preview.width) // 2, (cell.height - preview.height) // 2),
            preview,
        )
        left = (index % columns) * cell_width + 4
        top = (index // columns) * cell_height + 4
        sheet.paste(cell, (left, top))
        draw.text((left + 2, top + cell.height + 4), str(entry["profileId"]), font=font, fill=(235, 238, 244))
    sheet.save(CONTACT_PATH, "JPEG", quality=91, optimize=True)


def build_profile(profile_id: str) -> dict[str, object]:
    source = SOURCE_DIR / f"2026-08-29-{profile_id}-signature-source-v1.png"
    if not source.is_file():
        raise RuntimeError(f"Missing ImageGen source: {source}")
    image = Image.open(source).convert("RGBA")
    if image.size != EXPECTED_SIZE:
        raise RuntimeError(f"{source.name}: expected {EXPECTED_SIZE}, got {image.size}")
    runtime_image = edge_feather(image)
    metrics = alpha_metrics(runtime_image, profile_id)
    runtime = RUNTIME_DIR / f"{profile_id}-signature-v1.webp"
    runtime_image.save(runtime, "WEBP", quality=91, method=6, exact=True)
    return {
        "profileId": profile_id,
        "source": source.relative_to(ROOT).as_posix(),
        "runtime": runtime.relative_to(ROOT).as_posix(),
        "width": runtime_image.width,
        "height": runtime_image.height,
        "sourceSha256": sha256(source),
        "runtimeSha256": sha256(runtime),
        "runtimeBytes": runtime.stat().st_size,
        **metrics,
    }


def main() -> None:
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    if not PROMPT_PATH.is_file():
        raise RuntimeError(f"Missing prompt provenance: {PROMPT_PATH}")
    entries = [build_profile(profile_id) for profile_id in PROFILE_IDS]
    source_hashes = [str(entry["sourceSha256"]) for entry in entries]
    runtime_hashes = [str(entry["runtimeSha256"]) for entry in entries]
    if len(set(source_hashes)) != len(PROFILE_IDS):
        raise RuntimeError("Expected 20 distinct ImageGen source hashes")
    if len(set(runtime_hashes)) != len(PROFILE_IDS):
        raise RuntimeError("Expected 20 distinct runtime signature hashes")
    build_contact_sheet(entries)
    manifest = {
        "version": 1,
        "date": "2026-08-29",
        "generationMode": "built-in ImageGen, one call per distinct signature",
        "dimensions": list(EXPECTED_SIZE),
        "sourceFamilyExpansion": {
            "previousFamilies": 5,
            "productionFamilies": len(PROFILE_IDS),
            "multiplier": len(PROFILE_IDS) / 5,
        },
        "counts": {
            "sourceFamilies": len(PROFILE_IDS),
            "generatedSignatures": len(entries),
            "uniqueSourceHashes": len(set(source_hashes)),
            "uniqueRuntimeHashes": len(set(runtime_hashes)),
        },
        "runtimeContract": (
            "visual-only, terrain-masked, seed-anchored, non-colliding, "
            "no tile or save authority"
        ),
        "rollback": "?levelOneSourceFamilies=0",
        "promptManifest": PROMPT_PATH.relative_to(ROOT).as_posix(),
        "contactSheet": CONTACT_PATH.relative_to(ROOT).as_posix(),
        "entries": entries,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest["counts"], indent=2))
    print(CONTACT_PATH.relative_to(ROOT).as_posix())


if __name__ == "__main__":
    main()
