"""Build the real upper-town Seedance anchor with ground kept context-only."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "testing/animation-sandbox/2026-08-26-surface-background-loops-v2"
BEAUTY_CROP = REVIEW / "production-beauty-crop-v2.png"
ANCHOR = REVIEW / "seedance-loop-anchor-v2.png"
END_ANCHOR = REVIEW / "seedance-loop-end-anchor-v2.png"
STATIC_LOWER = REVIEW / "static-ground-context-v2.png"
MANIFEST = REVIEW / "reference-manifest.json"

BEAUTY_SOURCE = ROOT / (
    "sprites/backgrounds/start-zone-scenic-v1/"
    "npc-town-scenic-composite-v2.webp"
)
FLOOR_SOURCE = ROOT / (
    "sprites/backgrounds/start-zone-scenic-v1/"
    "town-square-slate-strip-v3.png"
)
GROUND_SOURCE = ROOT / (
    "sprites/backgrounds/world-scenic-regions-v1/"
    "level1-ground-facade-01-v2.webp"
)

SOURCE_WIDTH = 1801
SOURCE_GROUND_Y = 534
SOURCE_FLOOR_HEIGHT = 48
ANCHOR_WIDTH = 1680
ANCHOR_HEIGHT = 720
ANIMATED_HEIGHT = round(SOURCE_GROUND_Y * ANCHOR_WIDTH / SOURCE_WIDTH)
STATIC_LOWER_HEIGHT = ANCHOR_HEIGHT - ANIMATED_HEIGHT


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def load(path: Path, mode: str) -> Image.Image:
    with Image.open(path) as source:
        return source.convert(mode)


def main() -> None:
    REVIEW.mkdir(parents=True, exist_ok=True)
    beauty = load(BEAUTY_SOURCE, "RGB")
    floor = load(FLOOR_SOURCE, "RGBA")
    ground = load(GROUND_SOURCE, "RGB")
    if beauty.size != (1801, 941):
        raise ValueError(f"Unexpected beauty size: {beauty.size}")
    if floor.size != (1801, 48):
        raise ValueError(f"Unexpected floor size: {floor.size}")
    if ground.width < SOURCE_WIDTH or ground.height < STATIC_LOWER_HEIGHT:
        raise ValueError(f"Ground source is undersized: {ground.size}")

    crop = beauty.crop((0, 0, SOURCE_WIDTH, SOURCE_GROUND_Y))
    crop.save(BEAUTY_CROP, format="PNG", optimize=True)

    scale = ANCHOR_WIDTH / SOURCE_WIDTH
    resampling = Image.Resampling.LANCZOS
    animated = crop.resize((ANCHOR_WIDTH, ANIMATED_HEIGHT), resampling)
    required_ground_source_height = min(
        ground.height,
        max(1, round(STATIC_LOWER_HEIGHT / scale)),
    )
    lower = ground.crop(
        (0, 0, SOURCE_WIDTH, required_ground_source_height)
    ).resize((ANCHOR_WIDTH, STATIC_LOWER_HEIGHT), resampling)

    floor_height = max(1, round(SOURCE_FLOOR_HEIGHT * scale))
    floor_scaled = floor.resize((ANCHOR_WIDTH, floor_height), resampling)
    lower_rgba = lower.convert("RGBA")
    lower_rgba.alpha_composite(floor_scaled, (0, 0))
    lower_rgb = lower_rgba.convert("RGB")
    lower_rgb.save(STATIC_LOWER, format="PNG", optimize=True)

    anchor = Image.new("RGB", (ANCHOR_WIDTH, ANCHOR_HEIGHT))
    anchor.paste(animated, (0, 0))
    anchor.paste(lower_rgb, (0, ANIMATED_HEIGHT))
    anchor.save(ANCHOR, format="PNG", optimize=True)
    end_anchor = anchor.copy()
    marker_x = ANCHOR_WIDTH - 1
    marker_y = ANCHOR_HEIGHT - 1
    red, green, blue = end_anchor.getpixel((marker_x, marker_y))
    end_anchor.putpixel((marker_x, marker_y), (red, green, (blue + 1) % 256))
    if (
        anchor.crop((0, 0, ANCHOR_WIDTH, ANIMATED_HEIGHT)).tobytes()
        != end_anchor.crop((0, 0, ANCHOR_WIDTH, ANIMATED_HEIGHT)).tobytes()
    ):
        raise RuntimeError("The end-anchor marker entered the animated region")
    end_anchor.save(END_ANCHOR, format="PNG", optimize=True)

    payload = {
        "schemaVersion": "surface-background-loop-reference-v2",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "reviewOnly": True,
        "productionBeautyCrop": {
            "path": relative(BEAUTY_CROP),
            "dimensions": [SOURCE_WIDTH, SOURCE_GROUND_Y],
            "sha256": sha256(BEAUTY_CROP),
        },
        "seedanceAnchor": {
            "path": relative(ANCHOR),
            "dimensions": [ANCHOR_WIDTH, ANCHOR_HEIGHT],
            "sha256": sha256(ANCHOR),
            "aspectRatio": "21:9",
        },
        "seedanceEndAnchor": {
            "path": relative(END_ANCHOR),
            "dimensions": [ANCHOR_WIDTH, ANCHOR_HEIGHT],
            "sha256": sha256(END_ANCHOR),
            "animatedRegionPixelIdentical": True,
            "contextMarkerPixel": [marker_x, marker_y],
        },
        "animatedRegion": {
            "x": 0,
            "y": 0,
            "width": ANCHOR_WIDTH,
            "height": ANIMATED_HEIGHT,
            "finalVideoIncludesGround": False,
        },
        "contextOnlyGroundRegion": {
            "x": 0,
            "y": ANIMATED_HEIGHT,
            "width": ANCHOR_WIDTH,
            "height": STATIC_LOWER_HEIGHT,
            "path": relative(STATIC_LOWER),
            "sha256": sha256(STATIC_LOWER),
        },
        "sources": [
            {"path": relative(BEAUTY_SOURCE), "sha256": sha256(BEAUTY_SOURCE)},
            {"path": relative(FLOOR_SOURCE), "sha256": sha256(FLOOR_SOURCE)},
            {"path": relative(GROUND_SOURCE), "sha256": sha256(GROUND_SOURCE)},
        ],
    }
    MANIFEST.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
