"""Build the 120 generated role assets for the 50-family Level One field."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = ROOT / "visual-approval-previews" / "level-one-biome-families-v3"
SOURCE_DIR = REVIEW_DIR / "sources"
RUNTIME_DIR = (
    ROOT / "sprites" / "backgrounds" / "world-visual-v2" / "depth"
    / "level1-biome-generated-roles-v3"
)
SPEC_PATH = REVIEW_DIR / "2026-08-29-level-one-biome-50-family-expansion-specs-v3.json"
PROMPT_PATH = REVIEW_DIR / "2026-08-29-level-one-biome-50-family-prompts-v3.md"
MANIFEST_PATH = REVIEW_DIR / "2026-08-29-level-one-biome-50-family-manifest-v3.json"
CONTACT_PATH = REVIEW_DIR / "2026-08-29-level-one-biome-50-family-contact-v3.jpg"
EXPECTED_SIZE = (1536, 1024)
EDGE_FEATHER_PX = 28
ROLE_IDS = ("background", "signature", "ground", "foreground")


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
    x_edge = np.minimum(np.arange(width), np.arange(width)[::-1]).astype(np.float32)
    y_edge = np.minimum(np.arange(height), np.arange(height)[::-1]).astype(np.float32)
    edge = np.minimum(y_edge[:, None], x_edge[None, :]) / float(EDGE_FEATHER_PX)
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
    if transparent < 0.08 or not 0.04 <= occupied <= 0.88:
        raise RuntimeError(
            f"{asset_id}: invalid coverage transparent={transparent:.4f} occupied={occupied:.4f}"
        )
    if int(alpha.max()) < 240 or int(alpha.min()) != 0:
        raise RuntimeError(f"{asset_id}: invalid alpha extrema {alpha.min()}..{alpha.max()}")
    corners = ((0, 0), (alpha.shape[1] - 1, 0), (0, alpha.shape[0] - 1),
               (alpha.shape[1] - 1, alpha.shape[0] - 1))
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


def load_specs() -> dict[str, object]:
    specs = json.loads(SPEC_PATH.read_text(encoding="utf-8"))
    families = specs.get("families", [])
    roles = specs.get("roles", {})
    if len(families) != 30 or tuple(roles) != ROLE_IDS:
        raise RuntimeError("V3 requires 30 added families and four ordered roles")
    ids = [entry["id"] for entry in families]
    if len(set(ids)) != len(ids):
        raise RuntimeError("V3 family ids must be unique")
    return specs


def exact_prompt(specs: dict[str, object], family: dict[str, object], role_id: str) -> str:
    shared = specs["sharedPrompt"]
    role_clause = specs["roles"][role_id]
    return "\n".join((
        f"Use case: {shared['useCase']}",
        f"Asset type: {shared['assetType']}",
        f"Primary request: Create the {role_id} role for the {family['label']} biome. "
        f"Use {family['artDirection']}.",
        "Scene/backdrop: Transparent canvas only; one isolated underground formation, not a full scene.",
        f"Subject: {role_clause}",
        f"Style/medium: {shared['style']}",
        f"Composition/framing: {shared['composition']}",
        f"Lighting/mood: {shared['lighting']}",
        f"Materials/textures: {family['artDirection']}.",
        f"Constraints: {shared['constraints']}.",
    ))


def write_prompt_manifest(specs: dict[str, object]) -> None:
    lines = [
        "# Level One 50-Family ImageGen Prompts V3",
        "",
        "Generation mode: built-in ImageGen, one independent call per distinct asset.",
        "",
        "This file records the exact 120 prompts assembled from the reviewed V3 spec.",
        "",
    ]
    for family in specs["families"]:
        lines.extend((f"## {family['label']} (`{family['id']}`)", ""))
        for role_id in ROLE_IDS:
            lines.extend((f"### {role_id}", "", "```text",
                          exact_prompt(specs, family, role_id), "```", ""))
    PROMPT_PATH.write_text("\n".join(lines), encoding="utf-8")


def source_path(family_id: str, role_id: str) -> Path:
    return SOURCE_DIR / f"2026-08-29-{family_id}-{role_id}-source-v3.png"


def runtime_path(family_id: str, role_id: str) -> Path:
    return RUNTIME_DIR / f"{family_id}-{role_id}-v3.webp"


def build_role(family: dict[str, object], role_id: str, prompt: str) -> dict[str, object]:
    family_id = str(family["id"])
    asset_id = f"{family_id}-{role_id}"
    source = source_path(family_id, role_id)
    if not source.is_file():
        raise RuntimeError(f"Missing ImageGen source: {source}")
    opened = Image.open(source)
    if opened.size != EXPECTED_SIZE or "A" not in opened.getbands():
        raise RuntimeError(
            f"{source.name}: expected RGBA {EXPECTED_SIZE}, got {opened.mode} {opened.size}"
        )
    runtime_image = edge_feather(opened)
    metrics = alpha_metrics(runtime_image, asset_id)
    runtime = runtime_path(family_id, role_id)
    runtime_image.save(runtime, "WEBP", quality=89, method=6, exact=True)
    return {
        "familyId": family_id,
        "parentRegionId": family["parentRegionId"],
        "roleId": role_id,
        "source": source.relative_to(ROOT).as_posix(),
        "runtime": runtime.relative_to(ROOT).as_posix(),
        "width": runtime_image.width,
        "height": runtime_image.height,
        "promptSha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
        "sourceSha256": sha256(source),
        "runtimeSha256": sha256(runtime),
        "runtimeBytes": runtime.stat().st_size,
        **metrics,
    }


def checkerboard(size: tuple[int, int], cell: int = 14) -> Image.Image:
    canvas = Image.new("RGB", size, (28, 33, 40))
    draw = ImageDraw.Draw(canvas)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(49, 56, 66))
    return canvas


def build_contact_sheet(families: list[dict[str, object]], path: Path) -> None:
    cell_width, cell_height, header_height = 304, 190, 26
    sheet = Image.new("RGB", (4 * cell_width, header_height + len(families) * cell_height),
                      (13, 16, 21))
    draw, font = ImageDraw.Draw(sheet), ImageFont.load_default()
    for column, role_id in enumerate(ROLE_IDS):
        draw.text((column * cell_width + 8, 8), role_id.upper(), font=font,
                  fill=(235, 238, 244))
    for row, family in enumerate(families):
        for column, role_id in enumerate(ROLE_IDS):
            image = Image.open(runtime_path(family["id"], role_id)).convert("RGBA")
            image.thumbnail((cell_width - 12, cell_height - 28), Image.Resampling.LANCZOS)
            cell = checkerboard((cell_width - 8, cell_height - 24))
            cell.paste(image, ((cell.width - image.width) // 2,
                               (cell.height - image.height) // 2), image)
            left, top = column * cell_width + 4, header_height + row * cell_height + 4
            sheet.paste(cell, (left, top))
            draw.text((left + 2, top + cell.height + 4), family["id"], font=font,
                      fill=(235, 238, 244))
    sheet.save(path, "JPEG", quality=91, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompts-only", action="store_true")
    args = parser.parse_args()
    specs = load_specs()
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    write_prompt_manifest(specs)
    if args.prompts_only:
        print(PROMPT_PATH.relative_to(ROOT).as_posix())
        return
    entries = [
        build_role(family, role_id, exact_prompt(specs, family, role_id))
        for family in specs["families"] for role_id in ROLE_IDS
    ]
    source_hashes = {entry["sourceSha256"] for entry in entries}
    runtime_hashes = {entry["runtimeSha256"] for entry in entries}
    if len(source_hashes) != 120 or len(runtime_hashes) != 120:
        raise RuntimeError("Expected 120 unique source and runtime hashes")
    build_contact_sheet(specs["families"], CONTACT_PATH)
    region_sheets = {}
    for region_id in sorted({family["parentRegionId"] for family in specs["families"]}):
        region_families = [family for family in specs["families"]
                           if family["parentRegionId"] == region_id]
        path = REVIEW_DIR / f"2026-08-29-{region_id}-families-contact-v3.jpg"
        build_contact_sheet(region_families, path)
        region_sheets[region_id] = path.relative_to(ROOT).as_posix()
    manifest = {
        "version": 3,
        "date": "2026-08-29",
        "generationMode": specs["generationMode"],
        "dimensions": list(EXPECTED_SIZE),
        "roles": list(ROLE_IDS),
        "counts": {
            "addedSourceFamilies": 30,
            "totalSourceFamilies": 50,
            "newGeneratedSources": len(entries),
            "newRuntimeRoleAssets": len(entries),
            "totalGeneratedRuntimeLibrary": 200,
            "uniqueSourceHashes": len(source_hashes),
            "uniqueRuntimeHashes": len(runtime_hashes),
        },
        "runtimeContract": (
            "visual-only, terrain-masked, seed-anchored, demand-streamed, "
            "non-colliding, no tile, resource, gameplay, or save authority"
        ),
        "rollback": "?levelOneSourceFamilies=0",
        "specification": SPEC_PATH.relative_to(ROOT).as_posix(),
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
