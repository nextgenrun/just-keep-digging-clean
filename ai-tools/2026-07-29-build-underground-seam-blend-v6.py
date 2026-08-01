"""Build complementary incoming-edge V6 derivatives without replacing V4/V5."""

from __future__ import annotations

import hashlib
import json
import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = ROOT / "visual-approval-previews" / "underground-seam-blend-v6"
TERRAIN_DIR = (
    ROOT / "sprites" / "backgrounds" / "world-visual-v2" / "depth"
    / "terrain-seam-blend-v6"
)
STRUCTURE_DIR = (
    ROOT / "sprites" / "backgrounds" / "world-visual-v2" / "depth"
    / "biome-ground-structures-v6"
)
V4_TERRAIN_SOURCE = (
    ROOT / "visual-approval-previews" / "underground-terrain-blend-v4"
)
V5_TERRAIN_SOURCE = (
    ROOT / "visual-approval-previews" / "whole-world-visual-expansion-v5"
    / "sources" / "terrain"
)
V3_STRUCTURE_MANIFEST = (
    ROOT / "visual-approval-previews" / "underground-visual-expansion-v3"
    / "2026-07-28-underground-visual-expansion-v3.json"
)
MANIFEST_PATH = REVIEW_DIR / "2026-07-29-underground-seam-blend-v6.json"
EXPECTED_SIZE = (1536, 1024)
FADE_PX = (320, 128)
STRIDE_PX = (1152, 768)
BIOMES = (
    "weathered-roots", "blue-caverns", "amber-depths", "silver-core",
    "core-magma", "slagworks", "obsidian-catacombs", "pressure-foundry",
    "blackglass-abyss", "starfire-rift",
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


def wave(length: int, period_a: float, period_b: float, phase: float) -> np.ndarray:
    positions = np.arange(length, dtype=np.float32)
    return (
        np.sin(positions * math.tau / period_a + phase)
        + 0.42 * np.sin(positions * math.tau / period_b + phase * 1.73)
    )


def incoming_alpha(size: tuple[int, int], seed: int) -> np.ndarray:
    width, height = size
    rng = random.Random(seed)
    vertical = wave(
        height,
        rng.uniform(181.0, 279.0),
        rng.uniform(67.0, 119.0),
        rng.uniform(0.0, math.tau),
    )
    horizontal = wave(
        width,
        rng.uniform(271.0, 419.0),
        rng.uniform(97.0, 173.0),
        rng.uniform(0.0, math.tau),
    )
    left_width = np.clip(
        FADE_PX[0] * (1.0 + vertical * 0.14),
        FADE_PX[0] * 0.68,
        FADE_PX[0] * 1.32,
    )
    top_width = np.clip(
        FADE_PX[1] * (1.0 + horizontal * 0.16),
        FADE_PX[1] * 0.64,
        FADE_PX[1] * 1.36,
    )
    x = np.arange(width, dtype=np.float32)
    y = np.arange(height, dtype=np.float32)
    left = smoothstep(x[None, :] / left_width[:, None])
    top = smoothstep(y[:, None] / top_width[None, :])
    return left * top


def save_rgba(rgb: np.ndarray, alpha: np.ndarray, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    rgba = np.dstack((rgb, np.round(alpha).astype(np.uint8)))
    Image.fromarray(rgba, "RGBA").save(
        target,
        "WEBP",
        quality=92,
        method=2,
        exact=True,
    )


def terrain_sources() -> list[tuple[str, str, Path]]:
    result = []
    for path in sorted(V4_TERRAIN_SOURCE.glob("*-v4-master.png")):
        result.append(("v4", path.stem.removesuffix("-v4-master"), path))
    for path in sorted(V5_TERRAIN_SOURCE.glob("terrain-*-v5.png")):
        stem = path.stem.removeprefix("terrain-").removesuffix("-v5")
        result.append(("v5", stem, path))
    if len(result) != 90 or len({stem for _version, stem, _path in result}) != 90:
        raise RuntimeError(f"Expected 90 unique terrain sources, found {len(result)}")
    return result


def build_terrain() -> list[dict[str, object]]:
    records = []
    for source_version, stem, source_path in terrain_sources():
        source = Image.open(source_path).convert("RGB")
        if source.size != EXPECTED_SIZE:
            raise RuntimeError(f"{source_path.name}: invalid size {source.size}")
        seed = int(hashlib.sha256(stem.encode()).hexdigest()[:8], 16)
        alpha = incoming_alpha(source.size, seed) * 255.0
        target = TERRAIN_DIR / f"{stem}-v6.webp"
        save_rgba(np.asarray(source, dtype=np.uint8), alpha, target)
        source.close()
        records.append({
            "id": stem,
            "sourceVersion": source_version,
            "source": source_path.relative_to(ROOT).as_posix(),
            "runtime": target.relative_to(ROOT).as_posix(),
            "sourceSha256": sha256(source_path),
            "runtimeSha256": sha256(target),
            "runtimeBytes": target.stat().st_size,
        })
    return records


def build_structures() -> list[dict[str, object]]:
    manifest = json.loads(V3_STRUCTURE_MANIFEST.read_text(encoding="utf-8"))
    entries = manifest["groundStructures"]
    if len(entries) != 50:
        raise RuntimeError(f"Expected 50 ground structures, found {len(entries)}")
    records = []
    for entry in entries:
        source_path = ROOT / entry["alphaSource"]
        source = Image.open(source_path).convert("RGBA")
        if source.size != EXPECTED_SIZE:
            raise RuntimeError(f"{source_path.name}: invalid size {source.size}")
        rgba = np.asarray(source, dtype=np.uint8)
        seed = int(hashlib.sha256(str(entry["id"]).encode()).hexdigest()[:8], 16)
        alpha = (
            rgba[:, :, 3].astype(np.float32)
            * incoming_alpha(source.size, seed)
        )
        target = STRUCTURE_DIR / f"{entry['id']}-v6.webp"
        save_rgba(rgba[:, :, :3], alpha, target)
        source.close()
        records.append({
            "id": entry["id"],
            "sourceVersion": "v3-alpha-master",
            "source": source_path.relative_to(ROOT).as_posix(),
            "runtime": target.relative_to(ROOT).as_posix(),
            "sourceSha256": sha256(source_path),
            "runtimeSha256": sha256(target),
            "runtimeBytes": target.stat().st_size,
        })
    return records


def biome_for(stem: str) -> str:
    for biome_id in BIOMES:
        if stem.startswith(f"{biome_id}-"):
            return biome_id
    raise RuntimeError(f"Unknown biome stem: {stem}")


def mosaic(entries: list[dict[str, object]], biome_id: str) -> Image.Image:
    selected = [entry for entry in entries if biome_for(entry["id"]) == biome_id][:4]
    if len(selected) < 4:
        selected = (selected * 4)[:4]
    canvas = Image.new(
        "RGBA",
        (EXPECTED_SIZE[0] + STRIDE_PX[0], EXPECTED_SIZE[1] + STRIDE_PX[1]),
        (0, 0, 0, 0),
    )
    positions = ((0, 0), (STRIDE_PX[0], 0), (0, STRIDE_PX[1]), STRIDE_PX)
    for entry, position in zip(selected, positions):
        image = Image.open(ROOT / entry["runtime"]).convert("RGBA")
        canvas.alpha_composite(image, position)
        image.close()
    canvas.thumbnail((672, 448), Image.Resampling.LANCZOS)
    return canvas


def contact_sheet(
    name: str,
    entries: list[dict[str, object]],
) -> Path:
    sheet = Image.new("RGB", (1380, 2360), (13, 16, 22))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, biome_id in enumerate(BIOMES):
        preview = mosaic(entries, biome_id)
        checker = Image.new("RGB", (672, 448), (36, 41, 50))
        checker_draw = ImageDraw.Draw(checker)
        for y in range(0, 448, 16):
            for x in range(0, 672, 16):
                if (x // 16 + y // 16) % 2:
                    checker_draw.rectangle((x, y, x + 15, y + 15), fill=(53, 60, 71))
        checker.paste(preview, (0, 0), preview)
        left = (index % 2) * 690 + 9
        top = (index // 2) * 470 + 8
        sheet.paste(checker, (left, top))
        draw.text((left, top + 452), biome_id, fill=(236, 239, 244), font=font)
    path = REVIEW_DIR / f"2026-07-29-{name}-seam-proof-v6.jpg"
    sheet.save(path, "JPEG", quality=91, optimize=True)
    return path


def main() -> None:
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    terrain = build_terrain()
    structures = build_structures()
    contacts = [
        contact_sheet("terrain", terrain),
        contact_sheet("ground-structures", structures),
    ]
    manifest = {
        "version": 6,
        "mode": "additive complementary incoming-edge derivatives",
        "counts": {
            "terrainV4Derivatives": sum(item["sourceVersion"] == "v4" for item in terrain),
            "terrainV5Derivatives": sum(item["sourceVersion"] == "v5" for item in terrain),
            "terrainTotal": len(terrain),
            "groundStructures": len(structures),
        },
        "dimensions": list(EXPECTED_SIZE),
        "incomingFadePx": list(FADE_PX),
        "stridePx": list(STRIDE_PX),
        "alphaContract": "left/top incoming feather; right/bottom coverage retained",
        "rollback": "?undergroundSeamBlend=0",
        "terrain": terrain,
        "groundStructures": structures,
        "contactSheets": [path.relative_to(ROOT).as_posix() for path in contacts],
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest["counts"], indent=2))
    for path in contacts:
        print(path.relative_to(ROOT).as_posix())


if __name__ == "__main__":
    main()
