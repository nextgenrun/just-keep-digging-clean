"""Build image-generated terrain semantics for the scenic world renderer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "sprites" / "backgrounds" / "world-visual-v2" / "semantic-decals-v1"
SOURCE = ASSET_ROOT / "sources"
FRAME_SIZE = 256
RESOURCE_COLUMNS = 8
RESOURCE_VARIANTS = 3
BEDROCK_TILE_SIZE = 2048
SPECIAL_COLUMNS = 4

RESOURCE_ORDER = (
    "copper",
    "bronze",
    "steel",
    "iron",
    "silver",
    "gold",
    "obsidian",
    "ember-ore",
    "magma-crystal",
    "stone",
)

STAR_RARITIES = (
    ("common", (126, 226, 255)),
    ("rare", (183, 126, 255)),
    ("legendary", (255, 210, 74)),
    ("ancient", (255, 126, 58)),
    ("cosmic", (80, 255, 244)),
    ("void", (157, 75, 255)),
)

SPECIAL_REWARDS = (
    ("gemPower", "magma-crystal", (76, 255, 178)),
    ("speed", "steel", (92, 214, 255)),
    ("xp", "gold", (255, 205, 62)),
    ("crit", "sky-star", (255, 72, 58)),
    ("berserk", "ember-ore", (255, 105, 38)),
    ("combo", "copper", (74, 255, 207)),
    ("legend", "sky-star", (255, 179, 44)),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require(path: Path) -> Path:
    if not path.exists():
        raise FileNotFoundError(f"Required semantic source is missing: {path}")
    return path


def normalize_cutout(image: Image.Image, padding: int = 14) -> Image.Image:
    image = image.convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("Semantic cutout contains no visible pixels")
    crop = image.crop(bbox)
    target = FRAME_SIZE - padding * 2
    scale = min(target / crop.width, target / crop.height)
    size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
    crop = crop.resize(size, Image.Resampling.LANCZOS)
    frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    frame.alpha_composite(crop, ((FRAME_SIZE - size[0]) // 2, (FRAME_SIZE - size[1]) // 2))
    return frame


def make_variant(base: Image.Image, variant: int) -> Image.Image:
    if variant == 0:
        return base.copy()
    # Preserve the authored top-down light direction; never vertically flip
    # mineral formations merely to manufacture variety.
    transformed = ImageOps.mirror(base) if variant == 1 else base.copy()
    angle = 7 if variant == 1 else -9
    return transformed.rotate(angle, Image.Resampling.BICUBIC, expand=False)


def tint_highlights(image: Image.Image, color: tuple[int, int, int], strength: float = 0.82) -> Image.Image:
    image = image.convert("RGBA")
    rgb = image.convert("RGB")
    luminance = ImageOps.grayscale(rgb)
    highlight = luminance.point(lambda value: max(0, min(255, round((value - 72) * 1.55))))
    highlight = ImageEnhance.Contrast(highlight).enhance(1.18)
    highlight = Image.composite(highlight, Image.new("L", image.size, 0), image.getchannel("A"))
    color_layer = Image.new("RGB", image.size, color)
    mixed = Image.blend(rgb, color_layer, strength)
    recolored = Image.composite(mixed, rgb, highlight)
    recolored.putalpha(image.getchannel("A"))
    return recolored


def make_emissive(image: Image.Image, color: tuple[int, int, int]) -> Image.Image:
    image = image.convert("RGBA")
    luminance = ImageOps.grayscale(image.convert("RGB"))
    core_alpha = luminance.point(lambda value: max(0, min(255, round((value - 68) * 1.75))))
    core_alpha = Image.composite(core_alpha, Image.new("L", image.size, 0), image.getchannel("A"))
    core = Image.new("RGBA", image.size, (*color, 0))
    core.putalpha(core_alpha)
    bloom = core.filter(ImageFilter.GaussianBlur(5))
    result = Image.new("RGBA", image.size, (0, 0, 0, 0))
    result.alpha_composite(bloom)
    result.alpha_composite(core)
    return result


def make_offset_seamless(source: Image.Image) -> Image.Image:
    """Move source seams inward and cover them with a feathered texture patch.

    Both inputs are wrapped offsets, so the output's opposite edges remain
    periodic without the four-way mirror/kaleidoscope pattern.
    """
    source = source.convert("RGB")
    width, height = source.size
    base = ImageChops.offset(source, width // 2, height // 2)
    patch = ImageChops.offset(source, width // 4, height // 4)
    half_band = max(48, round(min(width, height) * 0.12))
    vertical = Image.new("L", (width, 1), 0)
    horizontal = Image.new("L", (1, height), 0)
    vertical_pixels = vertical.load()
    horizontal_pixels = horizontal.load()
    center_x = width // 2
    center_y = height // 2
    for x in range(max(0, center_x - half_band), min(width, center_x + half_band + 1)):
        distance = abs(x - center_x) / half_band
        vertical_pixels[x, 0] = round(255 * (1 - distance) ** 2)
    for y in range(max(0, center_y - half_band), min(height, center_y + half_band + 1)):
        distance = abs(y - center_y) / half_band
        horizontal_pixels[0, y] = round(255 * (1 - distance) ** 2)
    vertical = vertical.resize((width, height), Image.Resampling.NEAREST)
    horizontal = horizontal.resize((width, height), Image.Resampling.NEAREST)
    mask = ImageChops.lighter(vertical, horizontal).filter(ImageFilter.GaussianBlur(8))
    return Image.composite(patch, base, mask)


def build_resource_atlas() -> tuple[Path, dict[str, int]]:
    frame_count = len(RESOURCE_ORDER) * RESOURCE_VARIANTS
    rows = (frame_count + RESOURCE_COLUMNS - 1) // RESOURCE_COLUMNS
    atlas = Image.new(
        "RGBA",
        (RESOURCE_COLUMNS * FRAME_SIZE, rows * FRAME_SIZE),
        (0, 0, 0, 0),
    )
    starts: dict[str, int] = {}
    for resource_index, resource in enumerate(RESOURCE_ORDER):
        starts[resource] = resource_index * RESOURCE_VARIANTS
        source_path = require(SOURCE / f"{resource}-alpha.png")
        with Image.open(source_path) as raw:
            base = normalize_cutout(raw)
        for variant in range(RESOURCE_VARIANTS):
            frame_index = starts[resource] + variant
            x = (frame_index % RESOURCE_COLUMNS) * FRAME_SIZE
            y = (frame_index // RESOURCE_COLUMNS) * FRAME_SIZE
            atlas.alpha_composite(make_variant(base, variant), (x, y))
    output = ASSET_ROOT / "resource-insets-beauty-v1.png"
    atlas.save(output, "PNG", optimize=True)
    return output, starts


def build_star_atlases() -> tuple[Path, Path]:
    with Image.open(require(SOURCE / "sky-star-alpha.png")) as raw:
        base = normalize_cutout(raw, padding=9)
    beauty = Image.new("RGBA", (FRAME_SIZE * 3, FRAME_SIZE * 2), (0, 0, 0, 0))
    emissive = Image.new("RGBA", beauty.size, (0, 0, 0, 0))
    for index, (_, color) in enumerate(STAR_RARITIES):
        frame = make_variant(base, index % RESOURCE_VARIANTS)
        frame = tint_highlights(frame, color)
        x = (index % 3) * FRAME_SIZE
        y = (index // 3) * FRAME_SIZE
        beauty.alpha_composite(frame, (x, y))
        emissive.alpha_composite(make_emissive(frame, color), (x, y))
    beauty_path = ASSET_ROOT / "sky-stars-beauty-v1.png"
    emissive_path = ASSET_ROOT / "sky-stars-emissive-v1.png"
    beauty.save(beauty_path, "PNG", optimize=True)
    emissive.save(emissive_path, "PNG", optimize=True)
    return beauty_path, emissive_path


def build_special_reward_atlases() -> tuple[Path, Path, dict[str, int]]:
    rows = (len(SPECIAL_REWARDS) + SPECIAL_COLUMNS - 1) // SPECIAL_COLUMNS
    size = (SPECIAL_COLUMNS * FRAME_SIZE, rows * FRAME_SIZE)
    beauty = Image.new("RGBA", size, (0, 0, 0, 0))
    emissive = Image.new("RGBA", size, (0, 0, 0, 0))
    frames: dict[str, int] = {}
    for index, (reward, source_name, color) in enumerate(SPECIAL_REWARDS):
        frames[reward] = index
        with Image.open(require(SOURCE / f"{source_name}-alpha.png")) as raw:
            base = normalize_cutout(raw, padding=16 if source_name == "sky-star" else 22)
        frame = make_variant(base, index % RESOURCE_VARIANTS)
        frame = tint_highlights(frame, color, strength=0.74)
        frame = ImageEnhance.Sharpness(frame).enhance(1.08)
        x = (index % SPECIAL_COLUMNS) * FRAME_SIZE
        y = (index // SPECIAL_COLUMNS) * FRAME_SIZE
        beauty.alpha_composite(frame, (x, y))
        emissive.alpha_composite(make_emissive(frame, color), (x, y))
    beauty_path = ASSET_ROOT / "special-reward-insets-beauty-v1.png"
    emissive_path = ASSET_ROOT / "special-reward-insets-emissive-v1.png"
    beauty.save(beauty_path, "PNG", optimize=True)
    emissive.save(emissive_path, "PNG", optimize=True)
    return beauty_path, emissive_path, frames


def build_bedrock() -> Path:
    with Image.open(require(SOURCE / "bedrock-material-source.png")) as raw:
        source = ImageOps.fit(
            raw.convert("RGB"),
            (BEDROCK_TILE_SIZE, BEDROCK_TILE_SIZE),
            Image.Resampling.LANCZOS,
        )
    seamless = make_offset_seamless(source)
    output = ASSET_ROOT / "bedrock-seamless-v1.webp"
    seamless.save(output, "WEBP", quality=92, method=6)
    return output


def build_preview(resource_path: Path, star_path: Path, special_path: Path, bedrock_path: Path) -> Path:
    preview = Image.new("RGB", (1280, 720), (8, 11, 17))
    with Image.open(bedrock_path) as bedrock:
        swatch = ImageOps.fit(bedrock.convert("RGB"), (1280, 720), Image.Resampling.LANCZOS)
        preview = Image.blend(preview, swatch, 0.52)
    with Image.open(resource_path) as atlas:
        for index in range(len(RESOURCE_ORDER)):
            frame_index = index * RESOURCE_VARIANTS
            frame = atlas.crop((
                (frame_index % RESOURCE_COLUMNS) * FRAME_SIZE,
                (frame_index // RESOURCE_COLUMNS) * FRAME_SIZE,
                (frame_index % RESOURCE_COLUMNS + 1) * FRAME_SIZE,
                (frame_index // RESOURCE_COLUMNS + 1) * FRAME_SIZE,
            )).resize((150, 150), Image.Resampling.LANCZOS)
            x = 50 + (index % 5) * 190
            y = 34 + (index // 5) * 184
            preview.paste(frame, (x, y), frame)
    with Image.open(star_path) as stars:
        for index in range(len(STAR_RARITIES)):
            frame = stars.crop((
                (index % 3) * FRAME_SIZE,
                (index // 3) * FRAME_SIZE,
                (index % 3 + 1) * FRAME_SIZE,
                (index // 3 + 1) * FRAME_SIZE,
            )).resize((120, 120), Image.Resampling.LANCZOS)
            preview.paste(frame, (70 + index * 190, 430), frame)
    with Image.open(special_path) as specials:
        for index in range(len(SPECIAL_REWARDS)):
            frame = specials.crop((
                (index % SPECIAL_COLUMNS) * FRAME_SIZE,
                (index // SPECIAL_COLUMNS) * FRAME_SIZE,
                (index % SPECIAL_COLUMNS + 1) * FRAME_SIZE,
                (index // SPECIAL_COLUMNS + 1) * FRAME_SIZE,
            )).resize((100, 100), Image.Resampling.LANCZOS)
            preview.paste(frame, (50 + index * 170, 594), frame)
    output = ASSET_ROOT / "semantic-decals-preview-v1.webp"
    preview.save(output, "WEBP", quality=90, method=6)
    return output


def main() -> None:
    ASSET_ROOT.mkdir(parents=True, exist_ok=True)
    resource_path, starts = build_resource_atlas()
    star_path, emissive_path = build_star_atlases()
    special_path, special_emissive_path, special_frames = build_special_reward_atlases()
    bedrock_path = build_bedrock()
    preview_path = build_preview(resource_path, star_path, special_path, bedrock_path)
    outputs = (
        resource_path,
        star_path,
        emissive_path,
        special_path,
        special_emissive_path,
        bedrock_path,
        preview_path,
    )
    manifest = {
        "version": 2,
        "frameSizePx": FRAME_SIZE,
        "resourceAtlas": {
            "columns": RESOURCE_COLUMNS,
            "variants": RESOURCE_VARIANTS,
            "frameStarts": starts,
            "path": resource_path.relative_to(ROOT).as_posix(),
        },
        "skyStars": {
            "columns": 3,
            "rarities": [name for name, _ in STAR_RARITIES],
            "beautyPath": star_path.relative_to(ROOT).as_posix(),
            "emissivePath": emissive_path.relative_to(ROOT).as_posix(),
        },
        "specialRewards": {
            "columns": SPECIAL_COLUMNS,
            "frames": special_frames,
            "beautyPath": special_path.relative_to(ROOT).as_posix(),
            "emissivePath": special_emissive_path.relative_to(ROOT).as_posix(),
        },
        "bedrock": {"path": bedrock_path.relative_to(ROOT).as_posix()},
        "sha256": {path.name: sha256(path) for path in outputs},
    }
    manifest_path = ASSET_ROOT / "semantic-decals-manifest-v1.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    for path in (*outputs, manifest_path):
        print(f"Built {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
