"""Build the approved neutral v11 surface package and its runtime manifest."""

from __future__ import annotations

import importlib.util
import shutil
import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
TMX = ROOT / "exports/dig-game-world-edit-v-11-08-07-2026-;1-img-test-saved-before-runtime-wire.tmx"
V3_CHUNKS = ROOT / "sprites/backgrounds/world-v11-scale-correct-0-20m-v3/chunks"
V4_SURFACE = ROOT / "sprites/backgrounds/world-v11-runtime-polished-v4/surface"
MANIFEST_OUTPUT = ROOT / "values/v11PolishedSurfaceRuntimeManifest.js"
EXPORTER_PATH = ROOT / "ai-tools/2026-07-11-export-v11-background-runtime-manifest.py"
NEUTRAL_PATH = ROOT / "ai-tools/2026-07-12-render-v11-neutral-skyline-preview.py"
RUNTIME_PREFIX = "sprites/backgrounds/world-v11-runtime-polished-v4/surface/"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def save_webp(image: Image.Image, path: Path) -> None:
    image.save(path, "WEBP", quality=96, method=6)


def write_strip(strip: Image.Image, widths: list[int], prefix: str, tile_px: int) -> None:
    cursor = 0
    for index, width_tiles in enumerate(widths, start=1):
        width = width_tiles * tile_px
        piece = strip.crop((cursor, 0, cursor + width, strip.height))
        save_webp(piece, V4_SURFACE / f"{prefix}-{index:02d}.webp")
        cursor += width


def copy_baseline() -> None:
    V4_SURFACE.mkdir(parents=True, exist_ok=True)
    for source in V3_CHUNKS.glob("*.webp"):
        shutil.copy2(source, V4_SURFACE / source.name)


def build_neutral_replacements(neutral, manifest: dict) -> None:
    town, ground, town_widths, ground_widths = neutral.build_preview_strips()
    write_strip(town, town_widths, "town-ground", neutral.TILE)
    write_strip(ground, ground_widths, "level1-ground", neutral.TILE)

    for entry in manifest["objects"]:
        if not entry["name"].startswith("sky-r"):
            continue
        image = neutral.neutral_sky(
            (entry["sourceWidthPx"], entry["sourceHeightPx"]),
            entry["xPx"],
            entry["yPx"],
        )
        save_webp(image, V4_SURFACE / Path(entry["path"]).name)


def write_manifest(exporter, manifest: dict) -> None:
    manifest["version"] = 2
    manifest["generatedBy"] = "ai-tools/2026-07-12-build-v11-polished-surface-v4.py"
    manifest["package"] = "world-v11-runtime-polished-v4"
    for entry in manifest["objects"]:
        filename = Path(entry["path"]).name
        path = V4_SURFACE / filename
        if not path.is_file():
            raise FileNotFoundError(path)
        with Image.open(path) as image:
            entry["sourceWidthPx"], entry["sourceHeightPx"] = image.size
        entry["path"] = RUNTIME_PREFIX + filename
        entry["runtimePackage"] = "v11-polished-surface-v4"
    rendered = exporter.render_js(manifest).replace(
        "V11_BACKGROUND_RUNTIME_MANIFEST",
        "V11_POLISHED_SURFACE_RUNTIME_MANIFEST",
    )
    MANIFEST_OUTPUT.write_text(rendered, encoding="utf-8", newline="\n")


def validate(manifest: dict) -> None:
    expected = {Path(entry["path"]).name for entry in manifest["objects"]}
    actual = {path.name for path in V4_SURFACE.glob("*.webp")}
    missing = sorted(expected - actual)
    if missing:
        raise RuntimeError(f"Missing v4 surface chunks: {missing}")
    if len(expected) != manifest["objectCount"]:
        raise RuntimeError("Surface manifest object count changed")


def main() -> None:
    Image.MAX_IMAGE_PIXELS = None
    exporter = load_module("v11_surface_exporter", EXPORTER_PATH)
    neutral = load_module("v11_neutral_surface", NEUTRAL_PATH)
    source_bytes = TMX.read_bytes()
    manifest = exporter.build_manifest(source_bytes)
    copy_baseline()
    build_neutral_replacements(neutral, manifest)
    write_manifest(exporter, manifest)
    validate(manifest)
    print(f"Built {manifest['objectCount']} polished surface objects", flush=True)
    print(MANIFEST_OUTPUT, flush=True)


if __name__ == "__main__":
    main()
