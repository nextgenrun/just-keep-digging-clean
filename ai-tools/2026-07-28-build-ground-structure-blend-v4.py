"""Build additive feathered V4 derivatives of approved V3 ground structures."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
V3_MANIFEST_PATH = (
    ROOT
    / "visual-approval-previews"
    / "underground-visual-expansion-v3"
    / "2026-07-28-underground-visual-expansion-v3.json"
)
REVIEW_DIR = ROOT / "visual-approval-previews" / "underground-terrain-blend-v4"
RUNTIME_DIR = (
    ROOT
    / "sprites"
    / "backgrounds"
    / "world-visual-v2"
    / "depth"
    / "biome-ground-structures-v4"
)
MANIFEST_PATH = REVIEW_DIR / "2026-07-28-ground-structure-blend-v4.json"
CONTACT_PATH = REVIEW_DIR / "2026-07-28-ground-structure-blend-contact-sheet-v4.png"

EXPECTED_SIZE = (1536, 1024)
EXPECTED_COUNT = 50
FEATHER_PX = (192, 128)
STRIDE_PX = (
    EXPECTED_SIZE[0] - FEATHER_PX[0],
    EXPECTED_SIZE[1] - FEATHER_PX[1],
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


def feather_alpha(size: tuple[int, int]) -> np.ndarray:
    width, height = size
    feather_x, feather_y = FEATHER_PX
    x = np.minimum(np.arange(width), np.arange(width)[::-1]) / feather_x
    y = np.minimum(np.arange(height), np.arange(height)[::-1]) / feather_y
    return smoothstep(x)[None, :] * smoothstep(y)[:, None]


def build_derivative(entry: dict[str, object]) -> tuple[Path, dict[str, object]]:
    source_path = ROOT / str(entry["alphaSource"])
    source = Image.open(source_path).convert("RGBA")
    if source.size != EXPECTED_SIZE:
        raise RuntimeError(
            f"{source_path.name}: expected {EXPECTED_SIZE}, found {source.size}"
        )
    rgba = np.asarray(source, dtype=np.uint8).copy()
    original_alpha = rgba[:, :, 3].astype(np.float32)
    blended_alpha = np.round(original_alpha * feather_alpha(source.size)).astype(np.uint8)
    rgba[:, :, 3] = blended_alpha

    runtime_path = RUNTIME_DIR / f"{entry['id']}-v4.webp"
    Image.fromarray(rgba, "RGBA").save(
        runtime_path,
        "WEBP",
        quality=90,
        method=6,
        exact=True,
    )
    source.close()
    return runtime_path, {
        "id": entry["id"],
        "v3AlphaSource": entry["alphaSource"],
        "v3Runtime": entry["runtime"],
        "runtime": runtime_path.relative_to(ROOT).as_posix(),
        "width": EXPECTED_SIZE[0],
        "height": EXPECTED_SIZE[1],
        "featherPx": list(FEATHER_PX),
        "v3AlphaSha256": entry["alphaSha256"],
        "runtimeSha256": sha256(runtime_path),
        "runtimeBytes": runtime_path.stat().st_size,
        "opaqueCoverageBefore": round(float(np.count_nonzero(original_alpha)) / original_alpha.size, 6),
        "opaqueCoverageAfter": round(float(np.count_nonzero(blended_alpha)) / blended_alpha.size, 6),
        "alphaMin": int(blended_alpha.min()),
        "alphaMax": int(blended_alpha.max()),
    }


def build_contact_sheet(items: list[tuple[str, Path]]) -> None:
    columns = 5
    cell_width = 308
    cell_height = 222
    rows = math.ceil(len(items) / columns)
    sheet = Image.new(
        "RGB",
        (columns * cell_width, rows * cell_height),
        (13, 16, 21),
    )
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, (label, path) in enumerate(items):
        image = Image.open(path).convert("RGBA")
        preview_size = (cell_width - 12, cell_height - 30)
        image.thumbnail(preview_size, Image.Resampling.LANCZOS)
        checker = Image.new("RGB", preview_size, (36, 41, 49))
        checker_draw = ImageDraw.Draw(checker)
        for y in range(0, checker.height, 12):
            for x in range(0, checker.width, 12):
                if (x // 12 + y // 12) % 2:
                    checker_draw.rectangle(
                        (x, y, x + 11, y + 11),
                        fill=(53, 60, 70),
                    )
        checker.paste(
            image,
            (
                (checker.width - image.width) // 2,
                (checker.height - image.height) // 2,
            ),
            image,
        )
        left = (index % columns) * cell_width + 6
        top = (index // columns) * cell_height + 4
        sheet.paste(checker, (left, top))
        draw.text(
            (left + 2, top + checker.height + 5),
            label[:46],
            fill=(231, 235, 242),
            font=font,
        )
        image.close()
    sheet.save(CONTACT_PATH, "PNG", optimize=True)


def main() -> None:
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    v3_manifest = json.loads(V3_MANIFEST_PATH.read_text(encoding="utf-8"))
    source_entries = v3_manifest["groundStructures"]
    if len(source_entries) != EXPECTED_COUNT:
        raise RuntimeError(
            f"Expected {EXPECTED_COUNT} V3 structures, found {len(source_entries)}"
        )

    derivatives: list[dict[str, object]] = []
    contact_items: list[tuple[str, Path]] = []
    for entry in source_entries:
        runtime_path, derivative = build_derivative(entry)
        derivatives.append(derivative)
        contact_items.append((str(entry["id"]), runtime_path))

    build_contact_sheet(contact_items)
    manifest = {
        "version": 4,
        "mode": "additive alpha-feathered derivatives; V3 files remain intact",
        "sourceVersion": 3,
        "counts": {
            "sourceV3Structures": len(source_entries),
            "runtimeV4Structures": len(derivatives),
        },
        "dimensions": list(EXPECTED_SIZE),
        "featherPx": list(FEATHER_PX),
        "stridePx": list(STRIDE_PX),
        "rollback": "?groundStructureBlend=0",
        "terrainContract": (
            "authoritative terrain geometry mask, collision, HP, drops, and "
            "topology remain unchanged"
        ),
        "derivatives": derivatives,
        "contactSheet": CONTACT_PATH.relative_to(ROOT).as_posix(),
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(manifest["counts"], indent=2))
    print(CONTACT_PATH.relative_to(ROOT).as_posix())


if __name__ == "__main__":
    main()
