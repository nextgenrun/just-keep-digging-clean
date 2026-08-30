"""Build sixty true terrain plates for the thirty added Level One families."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = ROOT / "visual-approval-previews" / "level-one-biome-ground-materials-v1"
SOURCE_DIR = REVIEW_DIR / "sources"
RUNTIME_DIR = (
    ROOT / "sprites" / "backgrounds" / "world-visual-v2" / "depth"
    / "level1-biome-ground-materials-v1"
)
GROUND_SPEC_PATH = REVIEW_DIR / "2026-08-29-level-one-biome-ground-material-specs-v1.json"
FAMILY_SPEC_PATH = (
    ROOT / "visual-approval-previews" / "level-one-biome-families-v3"
    / "2026-08-29-level-one-biome-50-family-expansion-specs-v3.json"
)
PROMPT_PATH = REVIEW_DIR / "2026-08-29-level-one-biome-ground-material-prompts-v1.md"
MANIFEST_PATH = REVIEW_DIR / "2026-08-29-level-one-biome-ground-material-manifest-v1.json"
CONTACT_PATH = REVIEW_DIR / "2026-08-29-level-one-biome-ground-material-contact-v1.jpg"
EXPECTED_SIZE = (1536, 1024)
FADE_PX = (320, 128)
STRIDE_PX = (1152, 768)
VARIANT_IDS = ("primary", "secondary")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def smoothstep(values: np.ndarray) -> np.ndarray:
    values = np.clip(values, 0.0, 1.0)
    return values * values * (3.0 - 2.0 * values)


def wave(length: int, period_a: float, period_b: float, phase: float) -> np.ndarray:
    positions = np.arange(length, dtype=np.float32)
    return (
        np.sin(positions * math.tau / period_a + phase)
        + 0.42 * np.sin(positions * math.tau / period_b + phase * 1.73)
    )


def incoming_alpha(size: tuple[int, int], seed: int) -> np.ndarray:
    width, height = size
    rng = random.Random(seed)
    vertical = wave(height, rng.uniform(181, 279), rng.uniform(67, 119),
                    rng.uniform(0, math.tau))
    horizontal = wave(width, rng.uniform(271, 419), rng.uniform(97, 173),
                      rng.uniform(0, math.tau))
    left_width = np.clip(FADE_PX[0] * (1 + vertical * 0.14),
                         FADE_PX[0] * 0.68, FADE_PX[0] * 1.32)
    top_width = np.clip(FADE_PX[1] * (1 + horizontal * 0.16),
                        FADE_PX[1] * 0.64, FADE_PX[1] * 1.36)
    x = np.arange(width, dtype=np.float32)
    y = np.arange(height, dtype=np.float32)
    return smoothstep(x[None, :] / left_width[:, None]) * smoothstep(
        y[:, None] / top_width[None, :]
    )


def load_specs() -> tuple[dict[str, object], dict[str, object]]:
    ground = json.loads(GROUND_SPEC_PATH.read_text(encoding="utf-8"))
    families = json.loads(FAMILY_SPEC_PATH.read_text(encoding="utf-8"))
    if tuple(ground.get("variants", {})) != VARIANT_IDS:
        raise RuntimeError("Ground-material variants must be primary then secondary")
    if len(families.get("families", [])) != 30:
        raise RuntimeError("Ground-material V1 requires the thirty added families")
    if len({entry["id"] for entry in families["families"]}) != 30:
        raise RuntimeError("Ground-material family ids must be unique")
    return ground, families


def exact_prompt(
    ground: dict[str, object], family: dict[str, object], variant_id: str
) -> str:
    shared = ground["sharedPrompt"]
    return "\n".join((
        f"Use case: {shared['useCase']}",
        f"Asset type: {shared['assetType']}",
        f"Primary request: Create the {variant_id} true ground-material plate for "
        f"the {family['label']} biome. Use {family['artDirection']}.",
        "Scene/backdrop: No scene and no backdrop; show only one continuous, "
        "edge-to-edge material surface.",
        f"Subject: {ground['variants'][variant_id]}",
        f"Style/medium: {shared['style']}",
        f"Composition/framing: {shared['composition']}",
        f"Lighting/mood: {shared['lighting']}",
        f"Materials/textures: {family['artDirection']}.",
        f"Constraints: {shared['constraints']}.",
    ))


def write_prompt_manifest(
    ground: dict[str, object], families: dict[str, object]
) -> None:
    lines = [
        "# Level One true ground-material ImageGen prompts V1", "",
        "Generation mode: built-in ImageGen, one independent call per distinct asset.", "",
        "This file records the exact sixty prompts used for the thirty added families.", "",
    ]
    for family in families["families"]:
        lines.extend((f"## {family['label']} (`{family['id']}`)", ""))
        for variant_id in VARIANT_IDS:
            lines.extend((f"### {variant_id}", "", "```text",
                          exact_prompt(ground, family, variant_id), "```", ""))
    PROMPT_PATH.write_text("\n".join(lines), encoding="utf-8")


def source_path(family_id: str, variant_id: str) -> Path:
    return SOURCE_DIR / (
        f"2026-08-29-{family_id}-ground-material-{variant_id}-source-v1.png"
    )


def runtime_path(family_id: str, variant_id: str) -> Path:
    return RUNTIME_DIR / f"{family_id}-ground-material-{variant_id}-v1.webp"


def source_metrics(image: Image.Image, asset_id: str) -> dict[str, object]:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8)
    alpha = rgba[..., 3]
    opaque = float(np.count_nonzero(alpha >= 248) / alpha.size)
    edge = np.concatenate((alpha[:12].ravel(), alpha[-12:].ravel(),
                           alpha[:, :12].ravel(), alpha[:, -12:].ravel()))
    edge_opaque = float(np.count_nonzero(edge >= 248) / edge.size)
    rgb = rgba[..., :3].astype(np.float32)
    rgb_std = float(rgb.std())
    if opaque < 0.97 or edge_opaque < 0.95:
        raise RuntimeError(
            f"{asset_id}: source is not full coverage "
            f"opaque={opaque:.4f} edge={edge_opaque:.4f}"
        )
    if rgb_std < 18:
        raise RuntimeError(f"{asset_id}: insufficient material variation {rgb_std:.2f}")
    return {
        "sourceOpaqueCoverage": round(opaque, 6),
        "sourceOpaqueEdgeCoverage": round(edge_opaque, 6),
        "sourceRgbStd": round(rgb_std, 4),
        "sourceMeanRgb": [round(float(value), 2) for value in rgb.mean(axis=(0, 1))],
    }


def build_material(
    ground: dict[str, object], family: dict[str, object], variant_id: str
) -> dict[str, object]:
    family_id = str(family["id"])
    source = source_path(family_id, variant_id)
    if not source.is_file():
        raise RuntimeError(f"Missing ImageGen source: {source}")
    with Image.open(source) as opened:
        if opened.size != EXPECTED_SIZE:
            raise RuntimeError(f"{source.name}: expected {EXPECTED_SIZE}, got {opened.size}")
        metrics = source_metrics(opened, f"{family_id}-{variant_id}")
        rgb = np.asarray(opened.convert("RGB"), dtype=np.uint8)
    seed = int(hashlib.sha256(f"{family_id}:{variant_id}".encode()).hexdigest()[:8], 16)
    alpha = np.round(incoming_alpha(EXPECTED_SIZE, seed) * 255).astype(np.uint8)
    runtime = runtime_path(family_id, variant_id)
    Image.fromarray(np.dstack((rgb, alpha)), "RGBA").save(
        runtime, "WEBP", quality=92, method=6, exact=True
    )
    prompt = exact_prompt(ground, family, variant_id)
    return {
        "familyId": family_id,
        "parentRegionId": family["parentRegionId"],
        "variantId": variant_id,
        "source": source.relative_to(ROOT).as_posix(),
        "runtime": runtime.relative_to(ROOT).as_posix(),
        "width": EXPECTED_SIZE[0], "height": EXPECTED_SIZE[1],
        "incomingFadePx": list(FADE_PX),
        "promptSha256": hashlib.sha256(prompt.encode()).hexdigest(),
        "sourceSha256": sha256(source),
        "runtimeSha256": sha256(runtime),
        "runtimeBytes": runtime.stat().st_size,
        "runtimeAlphaMin": int(alpha.min()),
        "runtimeAlphaMax": int(alpha.max()),
        **metrics,
    }


def build_contact_sheet(families: list[dict[str, object]], path: Path) -> None:
    cell_w, cell_h, header_h = 384, 270, 28
    sheet = Image.new("RGB", (2 * cell_w, header_h + len(families) * cell_h),
                      (13, 16, 21))
    draw, font = ImageDraw.Draw(sheet), ImageFont.load_default()
    for column, variant_id in enumerate(VARIANT_IDS):
        draw.text((column * cell_w + 8, 8), variant_id.upper(), font=font,
                  fill=(235, 238, 244))
    for row, family in enumerate(families):
        for column, variant_id in enumerate(VARIANT_IDS):
            with Image.open(runtime_path(family["id"], variant_id)) as opened:
                image = opened.convert("RGBA")
            image.thumbnail((cell_w - 10, cell_h - 30), Image.Resampling.LANCZOS)
            cell = Image.new("RGB", (cell_w - 8, cell_h - 26), (34, 39, 47))
            cell.paste(image, ((cell.width - image.width) // 2,
                               (cell.height - image.height) // 2), image)
            left, top = column * cell_w + 4, header_h + row * cell_h + 4
            sheet.paste(cell, (left, top))
            draw.text((left + 2, top + cell.height + 3), family["id"], font=font,
                      fill=(235, 238, 244))
    sheet.save(path, "JPEG", quality=91, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompts-only", action="store_true")
    args = parser.parse_args()
    ground, families = load_specs()
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    write_prompt_manifest(ground, families)
    if args.prompts_only:
        print(PROMPT_PATH.relative_to(ROOT).as_posix())
        return
    entries = [
        build_material(ground, family, variant_id)
        for family in families["families"] for variant_id in VARIANT_IDS
    ]
    if len({entry["sourceSha256"] for entry in entries}) != 60:
        raise RuntimeError("Expected sixty unique source hashes")
    if len({entry["runtimeSha256"] for entry in entries}) != 60:
        raise RuntimeError("Expected sixty unique runtime hashes")
    build_contact_sheet(families["families"], CONTACT_PATH)
    region_sheets = {}
    for region_id in sorted({entry["parentRegionId"] for entry in families["families"]}):
        selected = [entry for entry in families["families"]
                    if entry["parentRegionId"] == region_id]
        path = REVIEW_DIR / f"2026-08-29-{region_id}-ground-material-contact-v1.jpg"
        build_contact_sheet(selected, path)
        region_sheets[region_id] = path.relative_to(ROOT).as_posix()
    manifest = {
        "version": 1, "date": "2026-08-29",
        "generationMode": ground["generationMode"],
        "dimensions": list(EXPECTED_SIZE),
        "variants": list(VARIANT_IDS),
        "counts": {
            "addedFamilies": 30, "variantsPerFamily": 2,
            "newImageGenSources": 60, "newRuntimeGroundAssets": 60,
            "retainedLevelOneGroundConcepts": 36,
            "totalLevelOneGroundConcepts": 96,
            "totalGeneratedVisualLibrary": 260,
        },
        "stridePx": list(STRIDE_PX),
        "alphaContract": "left/top incoming feather; right/bottom coverage retained",
        "runtimeContract": (
            "visual-only solid-tile-masked family terrain plates; demand-streamed; "
            "no tile, HP, collision, resource, drop, map-topology, or save authority"
        ),
        "rollback": "?levelOneSourceFamilies=0",
        "specification": GROUND_SPEC_PATH.relative_to(ROOT).as_posix(),
        "promptManifest": PROMPT_PATH.relative_to(ROOT).as_posix(),
        "contactSheet": CONTACT_PATH.relative_to(ROOT).as_posix(),
        "regionContactSheets": region_sheets,
        "entries": entries,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest["counts"], indent=2))
    print(CONTACT_PATH.relative_to(ROOT).as_posix())


if __name__ == "__main__":
    main()
