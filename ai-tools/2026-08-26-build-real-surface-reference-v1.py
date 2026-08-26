"""Compose a review-only 16:9 surface reference from current production assets."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "testing/animation-sandbox/2026-08-26-real-surface-living-background-v1"
OUTPUT_PATH = OUTPUT_DIR / "real-surface-world-reference-v1.png"
MANIFEST_PATH = OUTPUT_DIR / "reference-manifest.json"

BEAUTY_PATH = ROOT / (
    "sprites/backgrounds/start-zone-scenic-v1/"
    "npc-town-scenic-composite-v2.webp"
)
FLOOR_PATH = ROOT / (
    "sprites/backgrounds/start-zone-scenic-v1/"
    "town-square-slate-strip-v3.png"
)
GROUND_PATH = ROOT / (
    "sprites/backgrounds/world-scenic-regions-v1/"
    "level1-ground-facade-01-v2.webp"
)

WIDTH = 1672
HEIGHT = 941
SURFACE_Y = 534
FLOOR_HEIGHT = 48


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def assert_minimum_size(image: Image.Image, path: Path, width: int, height: int) -> None:
    if image.width < width or image.height < height:
        raise ValueError(
            f"{path.relative_to(ROOT)} is {image.width}x{image.height}; "
            f"expected at least {width}x{height}"
        )


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with Image.open(BEAUTY_PATH) as source:
        beauty = source.convert("RGB")
    with Image.open(FLOOR_PATH) as source:
        floor = source.convert("RGBA")
    with Image.open(GROUND_PATH) as source:
        ground = source.convert("RGB")

    earth_height = HEIGHT - SURFACE_Y
    assert_minimum_size(beauty, BEAUTY_PATH, WIDTH, SURFACE_Y)
    assert_minimum_size(floor, FLOOR_PATH, WIDTH, FLOOR_HEIGHT)
    assert_minimum_size(ground, GROUND_PATH, WIDTH, earth_height)

    result = Image.new("RGB", (WIDTH, HEIGHT))
    result.paste(beauty.crop((0, 0, WIDTH, SURFACE_Y)), (0, 0))
    result.paste(ground.crop((0, 0, WIDTH, earth_height)), (0, SURFACE_Y))
    floor_crop = floor.crop((0, 0, WIDTH, FLOOR_HEIGHT))
    result.paste(floor_crop.convert("RGB"), (0, SURFACE_Y), floor_crop.getchannel("A"))
    result.save(OUTPUT_PATH, format="PNG", optimize=True)

    manifest = {
        "schemaVersion": "real-surface-world-reference-v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "reviewOnly": True,
        "output": str(OUTPUT_PATH.relative_to(ROOT)).replace("\\", "/"),
        "dimensions": {"width": WIDTH, "height": HEIGHT},
        "surfaceY": SURFACE_Y,
        "visibleEarthPx": earth_height,
        "noUndergroundFloor": True,
        "sources": [
            {
                "role": "production surface beauty",
                "path": str(BEAUTY_PATH.relative_to(ROOT)).replace("\\", "/"),
                "sha256": sha256(BEAUTY_PATH),
                "crop": [0, 0, WIDTH, SURFACE_Y],
            },
            {
                "role": "production town surface cap",
                "path": str(FLOOR_PATH.relative_to(ROOT)).replace("\\", "/"),
                "sha256": sha256(FLOOR_PATH),
                "crop": [0, 0, WIDTH, FLOOR_HEIGHT],
            },
            {
                "role": "production Level One ground facade",
                "path": str(GROUND_PATH.relative_to(ROOT)).replace("\\", "/"),
                "sha256": sha256(GROUND_PATH),
                "crop": [0, 0, WIDTH, earth_height],
            },
        ],
        "outputSha256": sha256(OUTPUT_PATH),
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
