"""Pack ten approved six-variant ImageGen resource overlays for runtime."""

from __future__ import annotations

import hashlib
import json
from math import ceil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SEMANTIC_ROOT = ROOT / "sprites/backgrounds/world-visual-v2/semantic-decals-v1"
PACKAGE_ROOT = SEMANTIC_ROOT / "imagegen-ground-veins-2d-v6"
SOURCE_ROOT = PACKAGE_ROOT / "sources"
ALPHA_ROOT = PACKAGE_ROOT / "alpha-sheets"
STATIC_ROOT = ROOT / "sprites/tiles/resource-ground-veins-imagegen-v6-2d"
SCENIC_ROOT = ROOT / "sprites/backgrounds/world-scenic-regions-v1"
REVIEW_ROOT = ROOT / "visual-approval-previews/overground-texture-audit-v8-wide-embedded-runtime"

RESOURCE_ATLAS = SEMANTIC_ROOT / "resource-ground-veins-imagegen-2d-v6.png"
OLD_RECOGNITION_ATLAS = SCENIC_ROOT / "level1-ground-recognition-atlas-v6.png"
RECOGNITION_ATLAS = SCENIC_ROOT / "level1-ground-recognition-atlas-v7.png"
MANIFEST_PATH = PACKAGE_ROOT / "manifest.json"
COMMON_REVIEW = REVIEW_ROOT / "01-common-six-variants-on-runtime-grounds.png"
DEEP_REVIEW = REVIEW_ROOT / "02-deep-six-variants-on-runtime-grounds.png"

FRAME_PX = 188
NATIVE_PX = 94
VARIANTS = 6
RESOURCE_COLUMNS = 6
RECOGNITION_COLUMNS = 8
RESOURCE_FRAME_COUNT = 60
OLD_SPECIAL_START = 30
NEW_SPECIAL_START = 60
SPECIAL_FRAME_COUNT = 18
RECOGNITION_FRAME_COUNT = NEW_SPECIAL_START + SPECIAL_FRAME_COUNT

RESOURCE_ORDER = (
    ("copper", "copper"),
    ("bronze", "bronze"),
    ("steel", "steel"),
    ("iron", "iron"),
    ("silver", "silver"),
    ("gold", "gold"),
    ("obsidian", "obsidian"),
    ("emberOre", "ember-ore"),
    ("magmaCrystal", "magma-crystal"),
    ("stone", "stone"),
)

GROUND_REFERENCES = (
    ROOT / "sprites/tiles/dynamic-soil/bases/soil-000-200-v1.webp",
    ROOT / "sprites/tiles/dynamic-soil/bases/soil-400-600-v2.webp",
    ROOT / "sprites/tiles/dynamic-soil/bases/soil-800-1000-v3.webp",
    ROOT / "sprites/tiles/dynamic-soil/deep-bases/deep-soil-1400-1600-v1.png",
)

STYLE_REFERENCES = (
    ROOT / "visual-approval-previews/overground-texture-audit-v5-distinct-resources/01-common-resources-three-grounds.jpg",
    ROOT / "visual-approval-previews/overground-texture-audit-v5-distinct-resources/02-deep-resources-three-grounds.jpg",
)


def frame_box(index: int, columns: int, size: int) -> tuple[int, int, int, int]:
    x = index % columns * size
    y = index // columns * size
    return (x, y, x + size, y + size)


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def ensure_inputs() -> None:
    required = [
        OLD_RECOGNITION_ATLAS,
        *GROUND_REFERENCES,
        *STYLE_REFERENCES,
        *(ALPHA_ROOT / f"{file_name}.png" for _key, file_name in RESOURCE_ORDER),
        *(SOURCE_ROOT / f"{file_name}-chroma.png" for _key, file_name in RESOURCE_ORDER),
    ]
    missing = [path for path in required if not path.is_file()]
    if missing:
        raise FileNotFoundError("Missing v6 input(s):\n" + "\n".join(f"- {path}" for path in missing))


def contain_rgba(image: Image.Image, fill_ratio: float = 0.90) -> Image.Image:
    rgba = image.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("Resource source cell has no visible pixels")
    trimmed = rgba.crop(bbox)
    limit = round(FRAME_PX * fill_ratio)
    scale = min(limit / trimmed.width, limit / trimmed.height)
    target = (max(1, round(trimmed.width * scale)), max(1, round(trimmed.height * scale)))
    resized = trimmed.resize(target, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (FRAME_PX, FRAME_PX), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((FRAME_PX - target[0]) // 2, (FRAME_PX - target[1]) // 2))
    return canvas


def split_six(path: Path) -> tuple[Image.Image, ...]:
    sheet = Image.open(path).convert("RGBA")
    frames = []
    for row in range(2):
        top = round(row * sheet.height / 2)
        bottom = round((row + 1) * sheet.height / 2)
        for column in range(3):
            left = round(column * sheet.width / 3)
            right = round((column + 1) * sheet.width / 3)
            frames.append(contain_rgba(sheet.crop((left, top, right, bottom))))
    return tuple(frames)


def build_frames() -> tuple[list[Image.Image], dict[str, tuple[Image.Image, ...]]]:
    frames: list[Image.Image] = []
    by_resource: dict[str, tuple[Image.Image, ...]] = {}
    STATIC_ROOT.mkdir(parents=True, exist_ok=True)
    for resource_key, file_name in RESOURCE_ORDER:
        variants = split_six(ALPHA_ROOT / f"{file_name}.png")
        by_resource[resource_key] = variants
        frames.extend(variants)
        sheet = Image.new("RGBA", (VARIANTS * FRAME_PX, FRAME_PX), (0, 0, 0, 0))
        for index, variant in enumerate(variants):
            sheet.alpha_composite(variant, (index * FRAME_PX, 0))
        sheet.save(STATIC_ROOT / f"{file_name}.webp", "WEBP", lossless=True, method=6)
    if len(frames) != RESOURCE_FRAME_COUNT:
        raise AssertionError(f"Expected {RESOURCE_FRAME_COUNT} frames, got {len(frames)}")
    return frames, by_resource


def validate_frames(frames: list[Image.Image]) -> None:
    for resource_index in range(len(RESOURCE_ORDER)):
        group = frames[resource_index * VARIANTS:(resource_index + 1) * VARIANTS]
        fingerprints = {hashlib.sha256(frame.tobytes()).hexdigest() for frame in group}
        if len(fingerprints) != VARIANTS:
            raise AssertionError(f"{RESOURCE_ORDER[resource_index][0]} variants are not unique")
    for index, frame in enumerate(frames):
        alpha = frame.getchannel("A")
        if alpha.getextrema() != (0, 255):
            raise AssertionError(f"Frame {index}: alpha extrema must be (0, 255)")
        corners = ((0, 0), (FRAME_PX - 1, 0), (0, FRAME_PX - 1), (FRAME_PX - 1, FRAME_PX - 1))
        if any(alpha.getpixel(point) != 0 for point in corners):
            raise AssertionError(f"Frame {index}: corners must stay transparent")
        coverage = sum(value > 8 for value in alpha.get_flattened_data()) / (FRAME_PX * FRAME_PX)
        if not 0.035 <= coverage <= 0.78:
            raise AssertionError(f"Frame {index}: implausible coverage {coverage:.3f}")


def build_resource_atlas(frames: list[Image.Image]) -> None:
    rows = ceil(len(frames) / RESOURCE_COLUMNS)
    atlas = Image.new("RGBA", (RESOURCE_COLUMNS * FRAME_PX, rows * FRAME_PX), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        atlas.alpha_composite(frame, frame_box(index, RESOURCE_COLUMNS, FRAME_PX)[:2])
    atlas.save(RESOURCE_ATLAS, "PNG", optimize=True)


def build_recognition_atlas(frames: list[Image.Image]) -> None:
    old = Image.open(OLD_RECOGNITION_ATLAS).convert("RGBA")
    rows = ceil(RECOGNITION_FRAME_COUNT / RECOGNITION_COLUMNS)
    output = Image.new("RGBA", (RECOGNITION_COLUMNS * NATIVE_PX, rows * NATIVE_PX), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        native = frame.resize((NATIVE_PX, NATIVE_PX), Image.Resampling.LANCZOS)
        output.alpha_composite(native, frame_box(index, RECOGNITION_COLUMNS, NATIVE_PX)[:2])
    for offset in range(SPECIAL_FRAME_COUNT):
        old_index = OLD_SPECIAL_START + offset
        new_index = NEW_SPECIAL_START + offset
        preserved = old.crop(frame_box(old_index, RECOGNITION_COLUMNS, NATIVE_PX))
        destination = frame_box(new_index, RECOGNITION_COLUMNS, NATIVE_PX)
        output.alpha_composite(preserved, destination[:2])
        if output.crop(destination).tobytes() != preserved.tobytes():
            raise AssertionError(f"Special frame {old_index} changed while moving to {new_index}")
    output.save(RECOGNITION_ATLAS, "PNG", optimize=True)


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    path = Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf")
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def ground_cell(reference: Image.Image, seed: int) -> Image.Image:
    width = min(reference.width, 320)
    height = min(reference.height, 320)
    x = (seed * 197 + reference.width // 7) % max(1, reference.width - width + 1)
    y = (seed * 113 + reference.height // 5) % max(1, reference.height - height + 1)
    crop = reference.crop((x, y, x + width, y + height))
    return ImageOps.fit(crop.convert("RGB"), (NATIVE_PX, NATIVE_PX))


def display_name(key: str) -> str:
    return key.replace("Ore", " Ore").replace("Crystal", " Crystal").title()


def build_review(path: Path, entries: tuple[tuple[str, str], ...], by_resource: dict[str, tuple[Image.Image, ...]]) -> None:
    grounds = [Image.open(item).convert("RGB") for item in GROUND_REFERENCES]
    canvas = Image.new("RGB", (1600, 1040), "#080a10")
    draw = ImageDraw.Draw(canvas)
    draw.text((42, 24), "WIDE EMBEDDED RESOURCE VARIATION", fill="#f4f6ff", font=load_font(42, True))
    draw.text((44, 78), "Six authored silhouettes per resource at native 94 px over real runtime grounds.", fill="#b7c0d1", font=load_font(20))
    for row, (resource_key, _file_name) in enumerate(entries):
        y = 128 + row * 178
        draw.rounded_rectangle((32, y, 1568, y + 160), 10, fill="#101522", outline="#46556e", width=2)
        draw.text((52, y + 38), display_name(resource_key), fill="#ffffff", font=load_font(25, True))
        draw.text((52, y + 78), "6 unique", fill="#7fd8c9", font=load_font(17))
        for variant_index, variant in enumerate(by_resource[resource_key]):
            ground = ground_cell(grounds[(row + variant_index) % len(grounds)], row * 17 + variant_index)
            cell = ground.convert("RGBA")
            cell.alpha_composite(variant.resize((NATIVE_PX, NATIVE_PX), Image.Resampling.LANCZOS))
            enlarged = cell.resize((144, 144), Image.Resampling.NEAREST)
            x = 238 + variant_index * 218
            canvas.paste(enlarged.convert("RGB"), (x, y + 8))
            draw.text((x + 58, y + 136), str(variant_index + 1), fill="#d8deeb", font=load_font(14, True))
    REVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    canvas.save(path, "PNG", optimize=True)


def write_manifest() -> None:
    source_paths = [SOURCE_ROOT / f"{name}-chroma.png" for _key, name in RESOURCE_ORDER]
    alpha_paths = [ALPHA_ROOT / f"{name}.png" for _key, name in RESOURCE_ORDER]
    static_paths = [STATIC_ROOT / f"{name}.webp" for _key, name in RESOURCE_ORDER]
    tracked = [*STYLE_REFERENCES, *source_paths, *alpha_paths, RESOURCE_ATLAS, RECOGNITION_ATLAS, COMMON_REVIEW, DEEP_REVIEW, *static_paths]
    manifest = {
        "version": 6,
        "date": "2026-07-28",
        "generator": "OpenAI built-in ImageGen plus local chroma removal",
        "style": "natural ground-embedded resource formations",
        "camera": "strict orthographic top-down 2D",
        "variantsPerResource": VARIANTS,
        "resourceFrameOrder": [key for key, _name in RESOURCE_ORDER],
        "specialFrames": {"preservedFromV6Start": OLD_SPECIAL_START, "v7Start": NEW_SPECIAL_START, "count": SPECIAL_FRAME_COUNT},
        "runtime": {
            "semanticAtlas": relative(RESOURCE_ATLAS),
            "recognitionAtlas": relative(RECOGNITION_ATLAS),
            "staticReferenceFolder": relative(STATIC_ROOT),
        },
        "sha256": {relative(path): sha256(path) for path in tracked},
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    ensure_inputs()
    frames, by_resource = build_frames()
    validate_frames(frames)
    build_resource_atlas(frames)
    build_recognition_atlas(frames)
    build_review(COMMON_REVIEW, (RESOURCE_ORDER[9], RESOURCE_ORDER[0], RESOURCE_ORDER[1], RESOURCE_ORDER[3], RESOURCE_ORDER[2]), by_resource)
    build_review(DEEP_REVIEW, RESOURCE_ORDER[4:9], by_resource)
    write_manifest()
    print(f"Built {relative(RESOURCE_ATLAS)}")
    print(f"Built {relative(RECOGNITION_ATLAS)}")
    print(f"Built {relative(COMMON_REVIEW)}")
    print(f"Built {relative(DEEP_REVIEW)}")


if __name__ == "__main__":
    main()
