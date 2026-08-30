"""Validate and build the 60 generated Level One biome role assets."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = ROOT / "visual-approval-previews" / "level-one-biome-generated-roles-v2"
SOURCE_DIR = REVIEW_DIR / "sources"
RUNTIME_DIR = (
    ROOT
    / "sprites"
    / "backgrounds"
    / "world-visual-v2"
    / "depth"
    / "level1-biome-generated-roles-v2"
)
MANIFEST_PATH = REVIEW_DIR / "2026-08-29-level-one-biome-generated-roles-v2.json"
CONTACT_PATH = REVIEW_DIR / "2026-08-29-level-one-biome-generated-roles-contact-v2.jpg"
PROMPT_PATH = REVIEW_DIR / "2026-08-29-level-one-biome-generated-role-prompts-v2.md"
SIGNATURE_DIR = (
    ROOT
    / "sprites"
    / "backgrounds"
    / "world-visual-v2"
    / "depth"
    / "level1-biome-signatures-v1"
)
EXPECTED_SIZE = (1536, 1024)
EDGE_FEATHER_PX = 28
ROLE_IDS = ("background", "ground", "foreground")
CONTACT_ROLE_IDS = ("background", "signature", "ground", "foreground")
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


def alpha_metrics(image: Image.Image, asset_id: str) -> dict[str, float | int]:
    alpha = np.asarray(image.getchannel("A"), dtype=np.uint8)
    pixels = alpha.size
    transparent = float(np.count_nonzero(alpha < 8) / pixels)
    soft = float(np.count_nonzero((alpha >= 8) & (alpha < 248)) / pixels)
    opaque = float(np.count_nonzero(alpha >= 248) / pixels)
    occupied = float(np.count_nonzero(alpha >= 16) / pixels)
    if transparent < 0.08:
        raise RuntimeError(f"{asset_id}: insufficient transparent space {transparent:.4f}")
    if not 0.04 <= occupied <= 0.88:
        raise RuntimeError(f"{asset_id}: suspicious occupied coverage {occupied:.4f}")
    if int(alpha.max()) < 240 or int(alpha.min()) != 0:
        raise RuntimeError(f"{asset_id}: invalid alpha extrema {alpha.min()}..{alpha.max()}")
    corners = (
        (0, 0),
        (alpha.shape[1] - 1, 0),
        (0, alpha.shape[0] - 1),
        (alpha.shape[1] - 1, alpha.shape[0] - 1),
    )
    if any(alpha[y, x] != 0 for x, y in corners):
        raise RuntimeError(f"{asset_id}: opaque outer corner")
    return {
        "alphaMin": int(alpha.min()),
        "alphaMax": int(alpha.max()),
        "transparentCoverage": round(transparent, 6),
        "softCoverage": round(soft, 6),
        "opaqueCoverage": round(opaque, 6),
        "occupiedCoverage": round(occupied, 6),
    }


def checkerboard(size: tuple[int, int], cell: int = 14) -> Image.Image:
    canvas = Image.new("RGB", size, (28, 33, 40))
    draw = ImageDraw.Draw(canvas)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(49, 56, 66))
    return canvas


def runtime_path(profile_id: str, role_id: str) -> Path:
    if role_id == "signature":
        return SIGNATURE_DIR / f"{profile_id}-signature-v1.webp"
    return RUNTIME_DIR / f"{profile_id}-{role_id}-v2.webp"


def build_contact_sheet() -> None:
    cell_width, cell_height = 304, 190
    header_height = 26
    sheet = Image.new(
        "RGB",
        (len(CONTACT_ROLE_IDS) * cell_width, header_height + len(PROFILE_IDS) * cell_height),
        (13, 16, 21),
    )
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for column, role_id in enumerate(CONTACT_ROLE_IDS):
        draw.text((column * cell_width + 8, 8), role_id.upper(), font=font, fill=(235, 238, 244))
    for row, profile_id in enumerate(PROFILE_IDS):
        for column, role_id in enumerate(CONTACT_ROLE_IDS):
            image = Image.open(runtime_path(profile_id, role_id)).convert("RGBA")
            preview = image.copy()
            preview.thumbnail((cell_width - 12, cell_height - 28), Image.Resampling.LANCZOS)
            cell = checkerboard((cell_width - 8, cell_height - 24))
            cell.paste(
                preview,
                ((cell.width - preview.width) // 2, (cell.height - preview.height) // 2),
                preview,
            )
            left = column * cell_width + 4
            top = header_height + row * cell_height + 4
            sheet.paste(cell, (left, top))
            draw.text(
                (left + 2, top + cell.height + 4),
                profile_id,
                font=font,
                fill=(235, 238, 244),
            )
    sheet.save(CONTACT_PATH, "JPEG", quality=91, optimize=True)


def build_role(profile_id: str, role_id: str) -> dict[str, object]:
    asset_id = f"{profile_id}-{role_id}"
    source = SOURCE_DIR / f"2026-08-29-{asset_id}-source-v2.png"
    if not source.is_file():
        raise RuntimeError(f"Missing ImageGen source: {source}")
    opened = Image.open(source)
    if opened.size != EXPECTED_SIZE or "A" not in opened.getbands():
        raise RuntimeError(
            f"{source.name}: expected RGBA {EXPECTED_SIZE}, got {opened.mode} {opened.size}"
        )
    runtime_image = edge_feather(opened)
    metrics = alpha_metrics(runtime_image, asset_id)
    runtime = runtime_path(profile_id, role_id)
    runtime_image.save(runtime, "WEBP", quality=89, method=6, exact=True)
    return {
        "profileId": profile_id,
        "roleId": role_id,
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
    entries = [
        build_role(profile_id, role_id)
        for profile_id in PROFILE_IDS
        for role_id in ROLE_IDS
    ]
    source_hashes = [str(entry["sourceSha256"]) for entry in entries]
    runtime_hashes = [str(entry["runtimeSha256"]) for entry in entries]
    if len(set(source_hashes)) != len(entries):
        raise RuntimeError("Expected 60 distinct ImageGen source hashes")
    if len(set(runtime_hashes)) != len(entries):
        raise RuntimeError("Expected 60 distinct runtime role hashes")
    for profile_id in PROFILE_IDS:
        if not runtime_path(profile_id, "signature").is_file():
            raise RuntimeError(f"Missing retained signature for {profile_id}")
    build_contact_sheet()
    manifest = {
        "version": 2,
        "date": "2026-08-29",
        "generationMode": "built-in ImageGen, one call per distinct role asset",
        "dimensions": list(EXPECTED_SIZE),
        "roles": list(CONTACT_ROLE_IDS),
        "counts": {
            "sourceFamilies": len(PROFILE_IDS),
            "newGeneratedSources": len(entries),
            "newRuntimeRoleAssets": len(entries),
            "retainedSignatureAssets": len(PROFILE_IDS),
            "generatedRuntimeLibrary": len(entries) + len(PROFILE_IDS),
            "uniqueSourceHashes": len(set(source_hashes)),
            "uniqueRuntimeHashes": len(set(runtime_hashes)),
        },
        "runtimeContract": (
            "visual-only, terrain-masked, seed-anchored, demand-streamed, "
            "non-colliding, no tile, resource, gameplay, or save authority"
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
