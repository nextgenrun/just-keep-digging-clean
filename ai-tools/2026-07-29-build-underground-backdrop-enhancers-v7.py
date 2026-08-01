"""Build transparent, feathered V7 underground backdrop enhancer assets.

The ImageGen source files are kept as chroma-key PNGs in the visual review
folder. This tool uses the bundled ImageGen chroma helper, applies a second
frame-edge falloff, writes high-resolution WebP runtime files, and produces
checkerboard/context proof sheets plus a hash manifest.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REVIEW_ROOT = ROOT / "visual-approval-previews" / "underground-backdrop-enhancers-v7"
CHROMA_ROOT = REVIEW_ROOT / "sources" / "chroma"
ALPHA_ROOT = REVIEW_ROOT / "sources" / "alpha"
RUNTIME_ROOT = (
    ROOT
    / "sprites"
    / "backgrounds"
    / "world-visual-v2"
    / "depth"
    / "biome-backdrop-enhancers-v7"
)
SOURCE_SIZE = (1536, 1024)
EDGE_FEATHER_PX = 192


BIOME_STEMS = {
    "weathered-roots": [
        "ceiling-root-crown",
        "twin-rootstone-arches",
        "mycelial-lace-curtain",
        "amber-seed-orbit",
        "drowned-timber-silhouettes",
        "rootwater-ribbons",
        "spore-constellation",
        "fossil-root-ribs",
        "rain-thread-veils",
        "ancient-knot-aperture",
    ],
    "blue-caverns": [
        "ice-chandelier-crown",
        "twin-cobalt-arches",
        "frozen-chain-web",
        "resonance-geode-halo",
        "drowned-observatory-silhouettes",
        "caustic-ribbons",
        "aurora-crystal-constellation",
        "leviathan-rib-arcs",
        "water-veil-curtains",
        "inverted-ice-aperture",
    ],
    "amber-depths": [
        "resin-stalactite-crown",
        "twin-fossil-wing-arches",
        "honeyglass-chain-network",
        "fossil-sun-halo",
        "archive-tower-silhouettes",
        "resin-light-ribbons",
        "gilded-insect-constellation",
        "fossil-rib-fragments",
        "gold-dust-columns",
        "clockwork-iris-aperture",
    ],
    "silver-core": [
        "needle-crystal-crown",
        "mirror-organ-arches",
        "mercury-droplet-network",
        "eclipsed-reflector-halo",
        "mint-tower-silhouettes",
        "mirror-ribbons",
        "magnetic-spark-constellation",
        "suspended-rib-fragments",
        "shimmerfall-curtains",
        "lunar-gear-aperture",
    ],
    "core-magma": [
        "basalt-stalactite-crown",
        "obsidian-furnace-arches",
        "lava-chain-network",
        "ember-eclipse-halo",
        "watchtower-silhouettes",
        "heat-shimmer-ribbons",
        "cinder-constellation",
        "lava-wheel-fragments",
        "ashfall-columns",
        "basalt-sun-aperture",
    ],
    "slagworks": [
        "pipe-gantry-crown",
        "twin-crane-arches",
        "chain-hose-network",
        "pressure-gauge-halo",
        "smelter-skyline",
        "molten-runoff-ribbons",
        "iron-spark-constellation",
        "broken-rail-fragments",
        "steam-curtains",
        "rotary-drum-aperture",
    ],
    "obsidian-catacombs": [
        "shard-crown",
        "blackglass-arches",
        "reliquary-chain-network",
        "violet-eclipse-halo",
        "crypt-silhouettes",
        "mirror-violet-ribbons",
        "ash-constellation",
        "broken-glass-ribs",
        "violet-ash-curtains",
        "memory-iris-aperture",
    ],
    "pressure-foundry": [
        "boiler-pipe-crown",
        "piston-arches",
        "hose-cable-network",
        "turbine-halo",
        "condenser-skyline",
        "coolant-ribbons",
        "indicator-constellation",
        "riveted-truss-fragments",
        "condensate-curtains",
        "valve-iris-aperture",
    ],
    "blackglass-abyss": [
        "prismatic-crown",
        "eclipse-arches",
        "star-chain-network",
        "fractured-planet-halo",
        "mirror-city-silhouettes",
        "spectral-ribbons",
        "star-map-constellation",
        "prism-bridge-fragments",
        "stardust-curtains",
        "infinite-mirror-aperture",
    ],
    "starfire-rift": [
        "nebula-crystal-crown",
        "orbital-ring-arches",
        "celestial-chain-network",
        "binary-star-halo",
        "celestial-silhouettes",
        "aurora-current-ribbons",
        "comet-constellation",
        "star-metal-bridge-fragments",
        "nebula-waterfall-curtains",
        "cosmic-iris-aperture",
    ],
}

CONTEXT_BACKGROUNDS = {
    "weathered-roots": "weathered-roots-root-canyon-v2.webp",
    "blue-caverns": "blue-caverns-crystal-ravine-v2.webp",
    "amber-depths": "amber-depths-amber-canyon-v2.webp",
    "silver-core": "silver-core-cleaved-silver-canyon-v2.webp",
    "core-magma": "core-magma-lava-ravine-v2.webp",
    "slagworks": "slagworks-slag-trench-v2.webp",
    "obsidian-catacombs": "obsidian-catacombs-glass-ravine-v2.webp",
    "pressure-foundry": "pressure-foundry-pressure-trench-v2.webp",
    "blackglass-abyss": "blackglass-abyss-mirror-chasm-v2.webp",
    "starfire-rift": "starfire-rift-cosmic-ravine-v2.webp",
}


def parse_args() -> argparse.Namespace:
    default_helper = (
        Path.home()
        / ".codex"
        / "skills"
        / ".system"
        / "imagegen"
        / "scripts"
        / "remove_chroma_key.py"
    )
    parser = argparse.ArgumentParser()
    parser.add_argument("--chroma-helper", type=Path, default=default_helper)
    parser.add_argument("--force", action="store_true")
    return parser.parse_args()


def stems() -> list[tuple[str, str]]:
    return [
        (biome, f"{biome}-{suffix}")
        for biome, suffixes in BIOME_STEMS.items()
        for suffix in suffixes
    ]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def apply_frame_feather(image: Image.Image) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    height, width = rgba.shape[:2]
    yy, xx = np.ogrid[:height, :width]
    distance = np.minimum.reduce([
        np.broadcast_to(xx, (height, width)),
        np.broadcast_to(yy, (height, width)),
        np.broadcast_to(width - 1 - xx, (height, width)),
        np.broadcast_to(height - 1 - yy, (height, width)),
    ]).astype(np.float32)
    ramp = np.clip(distance / EDGE_FEATHER_PX, 0.0, 1.0)
    ramp = ramp * ramp * (3.0 - 2.0 * ramp)
    rgba[:, :, 3] = np.rint(rgba[:, :, 3].astype(np.float32) * ramp).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def checkerboard(size: tuple[int, int], cell: int = 18) -> Image.Image:
    width, height = size
    board = Image.new("RGB", size, (38, 42, 48))
    draw = ImageDraw.Draw(board)
    for y in range(0, height, cell):
        for x in range(0, width, cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(62, 68, 76))
    return board


def make_sheet(
    entries: list[dict],
    out_path: Path,
    contextual: bool,
    columns: int = 5,
) -> None:
    thumb_size = (288, 192)
    label_height = 30
    rows = (len(entries) + columns - 1) // columns
    sheet = Image.new(
        "RGB",
        (columns * thumb_size[0], rows * (thumb_size[1] + label_height)),
        (14, 17, 21),
    )
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    backdrop_root = (
        ROOT
        / "sprites"
        / "backgrounds"
        / "world-visual-v2"
        / "depth"
        / "biome-variation-v2"
    )
    backdrop_cache: dict[str, Image.Image] = {}
    for index, entry in enumerate(entries):
        x = (index % columns) * thumb_size[0]
        y = (index // columns) * (thumb_size[1] + label_height)
        overlay = Image.open(ROOT / entry["alpha"]).convert("RGBA")
        if contextual:
            biome = entry["biome"]
            if biome not in backdrop_cache:
                backdrop_cache[biome] = Image.open(
                    backdrop_root / CONTEXT_BACKGROUNDS[biome]
                ).convert("RGB")
            base = backdrop_cache[biome].resize(thumb_size, Image.Resampling.LANCZOS)
        else:
            base = checkerboard(thumb_size)
        overlay.thumbnail(thumb_size, Image.Resampling.LANCZOS)
        layer = Image.new("RGBA", thumb_size, (0, 0, 0, 0))
        layer.alpha_composite(
            overlay,
            ((thumb_size[0] - overlay.width) // 2, (thumb_size[1] - overlay.height) // 2),
        )
        if contextual:
            runtime_alpha = float(entry["runtimeAlpha"])
            alpha = layer.getchannel("A").point(
                lambda value: round(value * runtime_alpha)
            )
            layer.putalpha(alpha)
            if entry["blendMode"] == "ADD":
                added = ImageChops.add(base, layer.convert("RGB"))
                base = Image.composite(added, base, alpha)
            else:
                base.paste(layer, (0, 0), layer)
        else:
            base.paste(layer, (0, 0), layer)
        sheet.paste(base, (x, y))
        draw.text(
            (x + 5, y + thumb_size[1] + 6),
            entry["stem"][:44],
            fill=(224, 230, 238),
            font=font,
        )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path, "JPEG", quality=91, optimize=True)


def build_entry(
    biome: str,
    stem: str,
    helper: Path,
    force: bool,
) -> dict:
    chroma_path = CHROMA_ROOT / f"{stem}-v7-chroma.png"
    alpha_path = ALPHA_ROOT / f"{stem}-v7.png"
    runtime_path = RUNTIME_ROOT / f"{stem}-v7.webp"
    if not chroma_path.exists():
        raise FileNotFoundError(chroma_path)
    with Image.open(chroma_path) as source:
        if source.size != SOURCE_SIZE:
            raise ValueError(f"{chroma_path.name}: expected {SOURCE_SIZE}, got {source.size}")

    if force or not alpha_path.exists():
        subprocess.run([
            sys.executable,
            str(helper),
            "--input",
            str(chroma_path),
            "--out",
            str(alpha_path),
            "--auto-key",
            "border",
            "--soft-matte",
            "--transparent-threshold",
            "12",
            "--opaque-threshold",
            "220",
            "--edge-feather",
            "1",
            "--despill",
            "--force",
        ], check=True)
        feathered = apply_frame_feather(Image.open(alpha_path))
        feathered.save(alpha_path, "PNG", optimize=True)

    alpha_image = Image.open(alpha_path).convert("RGBA")
    if alpha_image.size != SOURCE_SIZE:
        raise ValueError(f"{alpha_path.name}: incorrect processed dimensions")
    alpha = np.asarray(alpha_image.getchannel("A"), dtype=np.uint8)
    if force or not runtime_path.exists():
        alpha_image.save(
            runtime_path,
            "WEBP",
            quality=92,
            method=6,
            lossless=False,
            exact=True,
        )
    edge = np.concatenate([
        alpha[:8, :].ravel(),
        alpha[-8:, :].ravel(),
        alpha[:, :8].ravel(),
        alpha[:, -8:].ravel(),
    ])
    suffix = stem[len(biome) + 1:]
    asset_index = BIOME_STEMS[biome].index(suffix)
    blend_mode = "ADD" if asset_index in {3, 5, 6, 8} else "NORMAL"
    runtime_alpha = 0.42 if blend_mode == "ADD" else (
        0.58 if asset_index == 4 else 0.66
    )
    return {
        "biome": biome,
        "stem": stem,
        "blendMode": blend_mode,
        "runtimeAlpha": runtime_alpha,
        "source": chroma_path.relative_to(ROOT).as_posix(),
        "alpha": alpha_path.relative_to(ROOT).as_posix(),
        "runtime": runtime_path.relative_to(ROOT).as_posix(),
        "width": SOURCE_SIZE[0],
        "height": SOURCE_SIZE[1],
        "occupiedFractionAlpha16": round(float(np.mean(alpha > 16)), 6),
        "maximumOuter8Alpha": int(edge.max(initial=0)),
        "sourceSha256": sha256(chroma_path),
        "alphaSha256": sha256(alpha_path),
        "runtimeSha256": sha256(runtime_path),
    }


def main() -> None:
    args = parse_args()
    if not args.chroma_helper.exists():
        raise FileNotFoundError(args.chroma_helper)
    ALPHA_ROOT.mkdir(parents=True, exist_ok=True)
    RUNTIME_ROOT.mkdir(parents=True, exist_ok=True)
    entries = [
        build_entry(biome, stem, args.chroma_helper, args.force)
        for biome, stem in stems()
    ]
    checker_path = REVIEW_ROOT / "2026-07-29-backdrop-enhancers-contact-sheet-v7.jpg"
    context_path = (
        REVIEW_ROOT
        / "2026-07-29-backdrop-enhancers-context-contact-sheet-v7.jpg"
    )
    make_sheet(entries, checker_path, contextual=False)
    make_sheet(entries, context_path, contextual=True)
    manifest = {
        "version": 7,
        "date": "2026-07-29",
        "counts": {
            "biomes": len(BIOME_STEMS),
            "assetsPerBiome": 10,
            "totalAssets": len(entries),
        },
        "sourceSize": list(SOURCE_SIZE),
        "edgeFeatherPx": EDGE_FEATHER_PX,
        "entries": entries,
        "contactSheets": [
            checker_path.relative_to(ROOT).as_posix(),
            context_path.relative_to(ROOT).as_posix(),
        ],
    }
    manifest_path = REVIEW_ROOT / "2026-07-29-backdrop-enhancers-v7.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Built {len(entries)} V7 enhancers; "
        f"occupancy {min(e['occupiedFractionAlpha16'] for e in entries):.3f}-"
        f"{max(e['occupiedFractionAlpha16'] for e in entries):.3f}"
    )


if __name__ == "__main__":
    main()

