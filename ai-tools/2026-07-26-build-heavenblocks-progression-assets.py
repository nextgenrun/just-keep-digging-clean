"""Build runtime relic and Heavenblock progression sprites from alpha masters."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SEMANTIC_ROOT = ROOT / "sprites" / "backgrounds" / "world-visual-v2" / "semantic-decals-v1"
SEMANTIC_SOURCE = SEMANTIC_ROOT / "sources"
UI_ROOT = ROOT / "sprites" / "UI" / "heavenblocks-v1"
UI_SOURCE = UI_ROOT / "sources"
TILE_ROOT = ROOT / "sprites" / "tiles" / "approved-world"
WORLD_HEAVEN_ROOT = ROOT / "sprites" / "backgrounds" / "heavenblocks-v1"
WORLD_HEAVEN_SOURCE = WORLD_HEAVEN_ROOT / "sources"

FRAME_SIZE = 256
SPECIAL_COLUMNS = 4
RELIC_FRAME_INDEX = 7


def require(path: Path) -> Path:
    if not path.is_file():
        raise FileNotFoundError(f"Required progression-art source is missing: {path}")
    return path


def normalize_cutout(image: Image.Image, size: int, padding: int) -> Image.Image:
    source = image.convert("RGBA")
    bbox = source.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("Progression-art cutout contains no visible pixels")
    crop = source.crop(bbox)
    target = size - padding * 2
    scale = min(target / crop.width, target / crop.height)
    fitted_size = (
        max(1, round(crop.width * scale)),
        max(1, round(crop.height * scale)),
    )
    crop = crop.resize(fitted_size, Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    frame.alpha_composite(
        crop,
        ((size - fitted_size[0]) // 2, (size - fitted_size[1]) // 2),
    )
    return frame


def make_emissive(image: Image.Image) -> Image.Image:
    source = image.convert("RGBA")
    red, green, blue, alpha = source.split()
    gold = ImageChops.lighter(red, green)
    violet = ImageChops.subtract(blue, green.point(lambda value: value // 2))
    luminance = ImageOps.grayscale(source.convert("RGB"))
    bright = luminance.point(lambda value: max(0, min(255, round((value - 72) * 1.65))))
    energy = ImageChops.lighter(bright, violet)
    energy = ImageChops.multiply(energy, alpha)
    core = Image.new("RGBA", source.size, (243, 201, 105, 0))
    core.putalpha(energy)
    bloom = core.filter(ImageFilter.GaussianBlur(5))
    result = Image.new("RGBA", source.size, (0, 0, 0, 0))
    result.alpha_composite(bloom)
    result.alpha_composite(core)
    return result


def clear_frame(atlas: Image.Image, frame_index: int) -> tuple[int, int]:
    x = (frame_index % SPECIAL_COLUMNS) * FRAME_SIZE
    y = (frame_index // SPECIAL_COLUMNS) * FRAME_SIZE
    atlas.paste((0, 0, 0, 0), (x, y, x + FRAME_SIZE, y + FRAME_SIZE))
    return x, y


def build_relic_assets() -> list[Path]:
    with Image.open(require(SEMANTIC_SOURCE / "ancient-relic-cache-alpha-v1.png")) as raw:
        cache_frame = normalize_cutout(raw, FRAME_SIZE, 16)
        cache_tile = normalize_cutout(raw, 94, 3)

    beauty_path = SEMANTIC_ROOT / "special-reward-insets-beauty-v2.png"
    emissive_path = SEMANTIC_ROOT / "special-reward-insets-emissive-v2.png"
    with Image.open(require(SEMANTIC_ROOT / "special-reward-insets-beauty-v1.png")) as raw:
        beauty = raw.convert("RGBA")
    with Image.open(require(SEMANTIC_ROOT / "special-reward-insets-emissive-v1.png")) as raw:
        emissive = raw.convert("RGBA")
    expected_size = (SPECIAL_COLUMNS * FRAME_SIZE, 2 * FRAME_SIZE)
    if beauty.size != expected_size or emissive.size != expected_size:
        raise ValueError(f"Unexpected special-reward atlas size; expected {expected_size}")
    x, y = clear_frame(beauty, RELIC_FRAME_INDEX)
    clear_frame(emissive, RELIC_FRAME_INDEX)
    beauty.alpha_composite(cache_frame, (x, y))
    emissive.alpha_composite(make_emissive(cache_frame), (x, y))
    beauty.save(beauty_path, "PNG", optimize=True)
    emissive.save(emissive_path, "PNG", optimize=True)

    tile_path = TILE_ROOT / "ancient-relic-cache-v1.webp"
    TILE_ROOT.mkdir(parents=True, exist_ok=True)
    cache_tile.save(tile_path, "WEBP", lossless=True, method=6)
    return [beauty_path, emissive_path, tile_path]


def build_ui_assets() -> list[Path]:
    outputs: list[Path] = []
    with Image.open(require(UI_SOURCE / "ancient-relic-token-alpha-v1.png")) as raw:
        for filename, size, padding in (
            ("ancient-relic-token-v1.png", 64, 4),
            ("ancient-relic-icon-v1.png", 32, 2),
        ):
            output = UI_ROOT / filename
            normalize_cutout(raw, size, padding).save(output, "PNG", optimize=True)
            outputs.append(output)

    component_names = (
        "aether-turbine-v1.png",
        "halo-regulator-v1.png",
        "eclipse-crucible-v1.png",
    )
    with Image.open(require(UI_SOURCE / "heavenblock-components-alpha-v1.png")) as raw:
        source = raw.convert("RGBA")
        cell_width = source.width / len(component_names)
        for index, filename in enumerate(component_names):
            left = round(index * cell_width)
            right = round((index + 1) * cell_width)
            component = source.crop((left, 0, right, source.height))
            output = UI_ROOT / filename
            normalize_cutout(component, 64, 4).save(output, "PNG", optimize=True)
            outputs.append(output)
    return outputs


def build_world_heart_assets() -> list[Path]:
    outputs: list[Path] = []
    WORLD_HEAVEN_ROOT.mkdir(parents=True, exist_ok=True)
    heart_names = (
        ("aether-turbine-heart-alpha-v2.png", "aether-turbine-heart-v2.png"),
        ("halo-regulator-heart-alpha-v2.png", "halo-regulator-heart-v2.png"),
        ("eclipse-crucible-heart-alpha-v2.png", "eclipse-crucible-heart-v2.png"),
    )
    for source_name, output_name in heart_names:
        with Image.open(require(WORLD_HEAVEN_SOURCE / source_name)) as raw:
            output = WORLD_HEAVEN_ROOT / output_name
            normalize_cutout(raw, 512, 18).save(output, "PNG", optimize=True)
            outputs.append(output)
    return outputs


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    UI_ROOT.mkdir(parents=True, exist_ok=True)
    outputs = [*build_relic_assets(), *build_ui_assets(), *build_world_heart_assets()]
    manifest_path = UI_ROOT / "manifest-v1.json"
    manifest = {
        "version": 2,
        "relicSemanticFrame": RELIC_FRAME_INDEX,
        "nativeWorldHearts": True,
        "outputs": {
            path.relative_to(ROOT).as_posix(): {
                "sha256": sha256(path),
                "bytes": path.stat().st_size,
            }
            for path in outputs
        },
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    for path in (*outputs, manifest_path):
        print(f"Built {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
