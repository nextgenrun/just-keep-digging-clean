"""Validate v11 polished runtime background files and texture limits."""

from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "sprites/backgrounds/world-v11-runtime-polished-v4"
SURFACE = PACKAGE / "surface"
DEPTH = PACKAGE / "depth-chunks"
TMX = ROOT / "exports/dig-game-world-edit-v-11-08-07-2026-;1-img-test-saved-before-runtime-wire.tmx"
EXPECTED_TMX_HASH = "937cb35ce0b4702bc5c8e65848d91500d1d66e322c7d7765cf3c44e660c021d5"
MAX_TEXTURE_SIDE = 4096


def validate_images(paths: list[Path], require_alpha: bool) -> tuple[int, int, int]:
    max_width = max_height = total_bytes = 0
    for path in paths:
        total_bytes += path.stat().st_size
        with Image.open(path) as image:
            width, height = image.size
            if width <= 0 or height <= 0 or width > MAX_TEXTURE_SIDE or height > MAX_TEXTURE_SIDE:
                raise ValueError(f"Invalid texture dimensions {image.size}: {path}")
            if require_alpha and "A" not in image.getbands():
                raise ValueError(f"Missing overlap alpha: {path}")
            max_width, max_height = max(max_width, width), max(max_height, height)
    return max_width, max_height, total_bytes


def main() -> None:
    surface = sorted(SURFACE.glob("*.webp"))
    depth = sorted(DEPTH.glob("level*-r*-c*.webp"))
    if len(surface) != 90:
        raise ValueError(f"Expected 90 surface chunks, found {len(surface)}")
    if len(depth) != 315:
        raise ValueError(f"Expected 315 depth chunks, found {len(depth)}")
    surface_stats = validate_images(surface, False)
    depth_stats = validate_images(depth, True)
    tmx_hash = hashlib.sha256(TMX.read_bytes()).hexdigest()
    if tmx_hash != EXPECTED_TMX_HASH:
        raise ValueError(f"Saved v11 TMX changed: {tmx_hash}")
    print({
        "surfaceChunks": len(surface),
        "depthChunks": len(depth),
        "surfaceMaxTexture": surface_stats[:2],
        "depthMaxTexture": depth_stats[:2],
        "packageMiB": round((surface_stats[2] + depth_stats[2]) / 1024 / 1024, 2),
        "tmxSha256": tmx_hash,
    })


if __name__ == "__main__":
    main()
