"""Build the 100-asset underground visual expansion V3 runtime package."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "visual-approval-previews" / "underground-visual-expansion-v3"
BACKGROUND_DIR = (
    ROOT / "sprites" / "backgrounds" / "world-visual-v2" / "depth"
    / "biome-expansion-v3"
)
GROUND_DIR = (
    ROOT / "sprites" / "backgrounds" / "world-visual-v2" / "depth"
    / "biome-ground-structures-v3"
)
MANIFEST_PATH = SOURCE_DIR / "2026-07-28-underground-visual-expansion-v3.json"
PROMPT_MANIFEST_PATH = SOURCE_DIR / "2026-07-28-imagegen-prompt-manifest.md"
BACKGROUND_CONTACT_PATH = SOURCE_DIR / "2026-07-28-backgrounds-contact-sheet-v3.jpg"
GROUND_CONTACT_PATH = SOURCE_DIR / "2026-07-28-ground-structures-contact-sheet-v3.png"

EXPECTED_SIZE = (1536, 1024)
EXPECTED_PER_LIBRARY = 50
BIOME_ORDER = (
    "weathered-roots",
    "blue-caverns",
    "amber-depths",
    "silver-core",
    "core-magma",
    "slagworks",
    "obsidian-catacombs",
    "pressure-foundry",
    "blackglass-abyss",
    "starfire-rift",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ordered(paths: list[Path]) -> list[Path]:
    def sort_key(path: Path) -> tuple[int, str]:
        name = path.name.removeprefix("bg-").removeprefix("ground-")
        for index, biome in enumerate(BIOME_ORDER):
            if name.startswith(biome):
                return index, name
        return len(BIOME_ORDER), name

    return sorted(paths, key=sort_key)


def require_sources(pattern: str) -> list[Path]:
    paths = ordered(list(SOURCE_DIR.glob(pattern)))
    if len(paths) != EXPECTED_PER_LIBRARY:
        raise RuntimeError(
            f"Expected {EXPECTED_PER_LIBRARY} sources for {pattern}, found {len(paths)}"
        )
    return paths


def ensure_size(image: Image.Image, path: Path) -> None:
    if image.size != EXPECTED_SIZE:
        raise RuntimeError(f"{path.name}: expected {EXPECTED_SIZE}, found {image.size}")


def estimate_chroma(rgb: np.ndarray) -> np.ndarray:
    red = rgb[..., 0].astype(np.int16)
    green = rgb[..., 1].astype(np.int16)
    blue = rgb[..., 2].astype(np.int16)
    candidates = (
        (green >= 180)
        & (green - red >= 70)
        & (green - blue >= 70)
    )
    if int(candidates.sum()) < rgb.shape[0] * rgb.shape[1] * 0.08:
        raise RuntimeError("Chroma coverage is too small for reliable alpha extraction")
    return np.median(rgb[candidates], axis=0).astype(np.float32)


def extract_alpha(image: Image.Image) -> tuple[Image.Image, dict[str, float | list[int]]]:
    rgb_u8 = np.asarray(image.convert("RGB"), dtype=np.uint8)
    rgb = rgb_u8.astype(np.float32)
    chroma = estimate_chroma(rgb_u8)

    distance = np.linalg.norm(rgb - chroma[None, None, :], axis=2)
    dominance = rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])
    alpha_distance = np.clip((distance - 16.0) / 98.0, 0.0, 1.0)
    alpha_dominance = np.clip((96.0 - dominance) / 74.0, 0.0, 1.0)
    alpha = np.minimum(alpha_distance, alpha_dominance)
    alpha = alpha * alpha * (3.0 - 2.0 * alpha)

    safe_alpha = np.maximum(alpha[..., None], 0.035)
    decontaminated = (
        rgb - chroma[None, None, :] * (1.0 - alpha[..., None])
    ) / safe_alpha
    decontaminated = np.clip(decontaminated, 0.0, 255.0)
    decontaminated[alpha < 0.01] = 0.0

    rgba = np.dstack((
        decontaminated.astype(np.uint8),
        np.round(alpha * 255.0).astype(np.uint8),
    ))
    coverage = float(np.count_nonzero(alpha >= 0.5) / alpha.size)
    if not 0.05 <= coverage <= 0.72:
        raise RuntimeError(f"Unexpected opaque coverage after chroma key: {coverage:.4f}")
    return Image.fromarray(rgba, "RGBA"), {
        "chromaRgb": [int(round(value)) for value in chroma],
        "opaqueCoverage": round(coverage, 6),
        "alphaMin": int(rgba[..., 3].min()),
        "alphaMax": int(rgba[..., 3].max()),
    }


def build_background(source: Path) -> dict[str, object]:
    image = Image.open(source)
    ensure_size(image, source)
    runtime_name = source.name.removeprefix("bg-").replace(".png", ".webp")
    runtime_path = BACKGROUND_DIR / runtime_name
    image.convert("RGB").save(
        runtime_path,
        "WEBP",
        quality=88,
        method=6,
    )
    return {
        "id": runtime_path.stem.removesuffix("-v3"),
        "source": source.relative_to(ROOT).as_posix(),
        "runtime": runtime_path.relative_to(ROOT).as_posix(),
        "width": image.width,
        "height": image.height,
        "sourceSha256": sha256(source),
        "runtimeSha256": sha256(runtime_path),
        "runtimeBytes": runtime_path.stat().st_size,
    }


def build_ground(source: Path) -> dict[str, object]:
    image = Image.open(source)
    ensure_size(image, source)
    alpha_image, alpha_stats = extract_alpha(image)
    alpha_name = source.name.replace("-chroma.png", ".png")
    alpha_path = SOURCE_DIR / alpha_name
    alpha_image.save(alpha_path, "PNG", optimize=True)

    runtime_name = (
        source.name.removeprefix("ground-").replace("-chroma.png", ".webp")
    )
    runtime_path = GROUND_DIR / runtime_name
    alpha_image.save(
        runtime_path,
        "WEBP",
        quality=90,
        method=6,
        exact=True,
    )
    return {
        "id": runtime_path.stem.removesuffix("-v3"),
        "chromaSource": source.relative_to(ROOT).as_posix(),
        "alphaSource": alpha_path.relative_to(ROOT).as_posix(),
        "runtime": runtime_path.relative_to(ROOT).as_posix(),
        "width": image.width,
        "height": image.height,
        "sourceSha256": sha256(source),
        "alphaSha256": sha256(alpha_path),
        "runtimeSha256": sha256(runtime_path),
        "runtimeBytes": runtime_path.stat().st_size,
        **alpha_stats,
    }


def checkerboard(size: tuple[int, int], cell: int = 16) -> Image.Image:
    canvas = Image.new("RGB", size, (28, 33, 40))
    draw = ImageDraw.Draw(canvas)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(48, 55, 64))
    return canvas


def contact_sheet(
    paths: list[Path],
    destination: Path,
    *,
    alpha_preview: bool,
) -> None:
    columns = 5
    cell_width, cell_height = 304, 226
    rows = (len(paths) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * cell_width, rows * cell_height), (15, 18, 22))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, path in enumerate(paths):
        image = Image.open(path)
        preview = image.copy()
        preview.thumbnail((cell_width - 8, cell_height - 36), Image.Resampling.LANCZOS)
        if alpha_preview:
            cell = checkerboard((cell_width - 8, cell_height - 36))
            x = (cell.width - preview.width) // 2
            y = (cell.height - preview.height) // 2
            cell.paste(preview, (x, y), preview if preview.mode == "RGBA" else None)
        else:
            cell = Image.new("RGB", (cell_width - 8, cell_height - 36), (10, 12, 15))
            x = (cell.width - preview.width) // 2
            y = (cell.height - preview.height) // 2
            cell.paste(preview.convert("RGB"), (x, y))
        left = (index % columns) * cell_width + 4
        top = (index // columns) * cell_height + 4
        sheet.paste(cell, (left, top))
        label = path.stem.removeprefix("bg-").removeprefix("ground-")
        draw.text((left + 2, top + cell.height + 5), label[:44], font=font, fill=(228, 233, 240))
    if destination.suffix.lower() == ".jpg":
        sheet.save(destination, "JPEG", quality=88, optimize=True)
    else:
        sheet.save(destination, "PNG", optimize=True)


def write_prompt_manifest(backgrounds: list[Path], ground: list[Path]) -> None:
    background_names = "\n".join(f"- `{path.stem.removeprefix('bg-')}`" for path in backgrounds)
    ground_names = "\n".join(
        f"- `{path.stem.removeprefix('ground-').removesuffix('-chroma')}`"
        for path in ground
    )
    PROMPT_MANIFEST_PATH.write_text(
        "# Underground Visual Expansion V3 — ImageGen Prompt Manifest\n\n"
        "Generation mode: built-in ImageGen, one call per distinct asset.\n\n"
        "## Background prompt contract\n\n"
        "Each concept requested one complete 1536x1024 cinematic painterly "
        "side-view underground plate using its approved biome card only as a "
        "quality, material, darkness, palette, and depth reference. Every "
        "building, bridge, root, ruin, rail, and machine was required to remain "
        "distant background scenery. Prompts prohibited foreground floors, "
        "playable ledges, collision silhouettes, players, creatures, UI, text, "
        "logos, tile grids, resource icons, and contact sheets.\n\n"
        f"{background_names}\n\n"
        "## Ground-structure prompt contract\n\n"
        "Each concept requested one 1536x1024 irregular physical terrain "
        "structure against uniform #00FF00 chroma. Prompts required clean "
        "painterly edges, internal gaps, biome-matched material, and explicit "
        "integration inside mined ground. They prohibited scenes, free-floating "
        "props, buildings, bridges, UI, ore/reward symbols, damage cracks, "
        "procedural art, cheap decals, and contact sheets. Runtime alpha is "
        "edge-decontaminated and additionally masked by authoritative solid "
        "terrain.\n\n"
        f"{ground_names}\n",
        encoding="utf-8",
    )


def main() -> None:
    BACKGROUND_DIR.mkdir(parents=True, exist_ok=True)
    GROUND_DIR.mkdir(parents=True, exist_ok=True)
    backgrounds = require_sources("bg-*-v3.png")
    ground_chroma = require_sources("ground-*-v3-chroma.png")
    background_entries = [build_background(path) for path in backgrounds]
    ground_entries = [build_ground(path) for path in ground_chroma]

    alpha_paths = ordered([
        SOURCE_DIR / Path(entry["alphaSource"]).name
        for entry in ground_entries
    ])
    contact_sheet(backgrounds, BACKGROUND_CONTACT_PATH, alpha_preview=False)
    contact_sheet(alpha_paths, GROUND_CONTACT_PATH, alpha_preview=True)
    write_prompt_manifest(backgrounds, ground_chroma)

    manifest = {
        "version": 3,
        "generatedWith": "built-in ImageGen",
        "dimensions": list(EXPECTED_SIZE),
        "counts": {
            "backgrounds": len(background_entries),
            "groundStructures": len(ground_entries),
            "totalRuntimeAssets": len(background_entries) + len(ground_entries),
        },
        "contracts": {
            "backgrounds": "distant scenery only; never collision ground",
            "groundStructures": (
                "transparent image art; solid-terrain mask; below semantic feedback"
            ),
        },
        "backgrounds": background_entries,
        "groundStructures": ground_entries,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest["counts"], indent=2))


if __name__ == "__main__":
    main()
