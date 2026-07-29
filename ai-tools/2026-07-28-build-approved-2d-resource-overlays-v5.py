"""Pack the approved flat-2D ImageGen resources into runtime atlases.

This script does not draw replacement resource art. It trims, scales, packs,
and validates the approved ImageGen alpha sheets while preserving the four
previously accepted resources and every non-resource recognition frame.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SEMANTIC_ROOT = ROOT / "sprites/backgrounds/world-visual-v2/semantic-decals-v1"
SOURCE_ROOT = SEMANTIC_ROOT / "imagegen-overlay-2d-v5"
ALPHA_SHEET_ROOT = SOURCE_ROOT / "alpha-sheets"
RETAINED_ROOT = ROOT / "sprites/tiles/resource-overlays-imagegen-v4"
STATIC_ROOT = ROOT / "sprites/tiles/resource-overlays-imagegen-v5-2d"
SCENIC_ROOT = ROOT / "sprites/backgrounds/world-scenic-regions-v1"
REVIEW_ROOT = ROOT / "visual-approval-previews/overground-texture-audit-v7-approved-2d-runtime"

RESOURCE_ATLAS = SEMANTIC_ROOT / "resource-overlays-imagegen-2d-v5.png"
OLD_RECOGNITION_ATLAS = SCENIC_ROOT / "level1-ground-recognition-atlas-v5.png"
RECOGNITION_ATLAS = SCENIC_ROOT / "level1-ground-recognition-atlas-v6.png"
MANIFEST_PATH = SOURCE_ROOT / "manifest.json"
REVIEW_PATH = REVIEW_ROOT / "01-approved-2d-overlays-on-four-grounds.png"

FRAME_PX = 188
RECOGNITION_FRAME_PX = 94
RESOURCE_COLUMNS = 6
RECOGNITION_COLUMNS = 8
RESOURCE_FRAME_COUNT = 30
RECOGNITION_FRAME_COUNT = 48

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

APPROVED_2D_SHEETS = {
    "copper": "copper.png",
    "iron": "iron.png",
    "silver": "silver.png",
    "gold": "gold.png",
    "obsidian": "obsidian.png",
    "emberOre": "ember-ore.png",
}

RETAINED_RESOURCES = {"bronze", "steel", "magmaCrystal", "stone"}

GROUND_REFERENCES = (
    ROOT / "sprites/tiles/dynamic-soil/bases/soil-000-200-v1.webp",
    ROOT / "sprites/tiles/dynamic-soil/bases/soil-400-600-v2.webp",
    ROOT / "sprites/tiles/dynamic-soil/bases/soil-800-1000-v3.webp",
    ROOT / "sprites/tiles/dynamic-soil/deep-bases/deep-soil-1400-1600-v1.png",
)


def frame_box(index: int, columns: int, frame_px: int) -> tuple[int, int, int, int]:
    x = index % columns * frame_px
    y = index // columns * frame_px
    return (x, y, x + frame_px, y + frame_px)


def ensure_inputs() -> None:
    required = [
        OLD_RECOGNITION_ATLAS,
        *GROUND_REFERENCES,
        *(ALPHA_SHEET_ROOT / file_name for file_name in APPROVED_2D_SHEETS.values()),
        *(RETAINED_ROOT / f"{file_name}.webp" for key, file_name in RESOURCE_ORDER if key in RETAINED_RESOURCES),
    ]
    missing = [path for path in required if not path.is_file()]
    if missing:
        raise FileNotFoundError(
            "Missing approved 2D resource input(s):\n"
            + "\n".join(f"- {path}" for path in missing)
        )


def alpha_trimmed(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("Approved resource source has no visible pixels")
    return rgba.crop(bbox)


def contain_rgba(image: Image.Image, size: int = FRAME_PX, fill_ratio: float = 0.88) -> Image.Image:
    trimmed = alpha_trimmed(image)
    limit = max(1, round(size * fill_ratio))
    scale = min(limit / trimmed.width, limit / trimmed.height)
    target = (
        max(1, round(trimmed.width * scale)),
        max(1, round(trimmed.height * scale)),
    )
    resized = trimmed.resize(target, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((size - target[0]) // 2, (size - target[1]) // 2))
    return canvas


def split_approved_sheet(path: Path) -> tuple[Image.Image, Image.Image, Image.Image]:
    sheet = Image.open(path).convert("RGBA")
    variants = []
    for index in range(3):
        left = round(index * sheet.width / 3)
        right = round((index + 1) * sheet.width / 3)
        variants.append(contain_rgba(sheet.crop((left, 0, right, sheet.height))))
    return tuple(variants)


def retained_variants(path: Path) -> tuple[Image.Image, Image.Image, Image.Image]:
    original = contain_rgba(Image.open(path).convert("RGBA"))
    return (
        original,
        ImageOps.mirror(original),
        original.rotate(180, resample=Image.Resampling.BICUBIC),
    )


def build_resource_frames() -> tuple[list[Image.Image], dict[str, tuple[Image.Image, ...]]]:
    frames: list[Image.Image] = []
    by_resource: dict[str, tuple[Image.Image, ...]] = {}
    STATIC_ROOT.mkdir(parents=True, exist_ok=True)
    for resource_key, file_name in RESOURCE_ORDER:
        if resource_key in APPROVED_2D_SHEETS:
            variants = split_approved_sheet(ALPHA_SHEET_ROOT / APPROVED_2D_SHEETS[resource_key])
        else:
            variants = retained_variants(RETAINED_ROOT / f"{file_name}.webp")
        by_resource[resource_key] = variants
        frames.extend(variants)
        variants[0].save(STATIC_ROOT / f"{file_name}.webp", "WEBP", lossless=True, method=6)
    if len(frames) != RESOURCE_FRAME_COUNT:
        raise AssertionError(f"Expected {RESOURCE_FRAME_COUNT} resource frames, got {len(frames)}")
    return frames, by_resource


def build_resource_atlas(frames: list[Image.Image]) -> None:
    atlas = Image.new("RGBA", (RESOURCE_COLUMNS * FRAME_PX, 5 * FRAME_PX), (0, 0, 0, 0))
    for index, resource_frame in enumerate(frames):
        atlas.alpha_composite(resource_frame, frame_box(index, RESOURCE_COLUMNS, FRAME_PX)[:2])
    atlas.save(RESOURCE_ATLAS, "PNG", optimize=True)


def build_recognition_atlas(frames: list[Image.Image]) -> None:
    old = Image.open(OLD_RECOGNITION_ATLAS).convert("RGBA")
    output = Image.new(
        "RGBA",
        (RECOGNITION_COLUMNS * RECOGNITION_FRAME_PX, 6 * RECOGNITION_FRAME_PX),
        (0, 0, 0, 0),
    )
    for index, resource_frame in enumerate(frames):
        native = resource_frame.resize(
            (RECOGNITION_FRAME_PX, RECOGNITION_FRAME_PX),
            Image.Resampling.LANCZOS,
        )
        output.alpha_composite(
            native,
            frame_box(index, RECOGNITION_COLUMNS, RECOGNITION_FRAME_PX)[:2],
        )
    for index in range(RESOURCE_FRAME_COUNT, RECOGNITION_FRAME_COUNT):
        preserved = old.crop(frame_box(index, RECOGNITION_COLUMNS, RECOGNITION_FRAME_PX))
        output.alpha_composite(
            preserved,
            frame_box(index, RECOGNITION_COLUMNS, RECOGNITION_FRAME_PX)[:2],
        )
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
    return ImageOps.fit(crop.convert("RGB"), (RECOGNITION_FRAME_PX, RECOGNITION_FRAME_PX))


def build_review(by_resource: dict[str, tuple[Image.Image, ...]]) -> None:
    references = [Image.open(path).convert("RGB") for path in GROUND_REFERENCES]
    canvas = Image.new("RGB", (1600, 1060), "#080a10")
    draw = ImageDraw.Draw(canvas)
    draw.text((50, 30), "APPROVED TRUE-2D RESOURCE OVERLAYS", fill="#f3f5ff", font=load_font(42, True))
    draw.text(
        (52, 86),
        "Front-facing 94 px decals over four real ground families — no perspective slab and no baked square.",
        fill="#b6bfd1",
        font=load_font(20),
    )
    panel_w, panel_h = 286, 430
    for resource_index, (resource_key, _file_name) in enumerate(RESOURCE_ORDER):
        column = resource_index % 5
        row = resource_index // 5
        x = 50 + column * 304
        y = 136 + row * 452
        draw.rounded_rectangle((x, y, x + panel_w, y + panel_h), 12, fill="#101522", outline="#526078", width=2)
        label = resource_key.replace("Ore", " Ore").replace("Crystal", " Crystal").title()
        draw.text((x + 16, y + 14), label, fill="#ffffff", font=load_font(24, True))
        variants = by_resource[resource_key]
        for cell_index in range(4):
            cell = ground_cell(references[cell_index], resource_index * 11 + cell_index)
            variant = variants[cell_index % 3].resize(
                (RECOGNITION_FRAME_PX, RECOGNITION_FRAME_PX),
                Image.Resampling.LANCZOS,
            )
            cell = cell.convert("RGBA")
            cell.alpha_composite(variant)
            enlarged = cell.resize((120, 120), Image.Resampling.NEAREST)
            cell_x = x + 16 + (cell_index % 2) * 134
            cell_y = y + 60 + (cell_index // 2) * 134
            canvas.paste(enlarged.convert("RGB"), (cell_x, cell_y))
        draw.text((x + 16, y + 344), "94 px native overlay", fill="#aeb8ca", font=load_font(17))
        draw.text((x + 16, y + 378), "transparent ground decal", fill="#7fd8c9", font=load_font(17))
    REVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    canvas.save(REVIEW_PATH, "PNG", optimize=True)


def validate_frames(frames: list[Image.Image]) -> None:
    for index, resource_frame in enumerate(frames):
        alpha = resource_frame.getchannel("A")
        if alpha.getextrema() != (0, 255):
            raise AssertionError(f"Frame {index}: expected alpha extrema (0, 255)")
        if any(alpha.getpixel(point) != 0 for point in ((0, 0), (187, 0), (0, 187), (187, 187))):
            raise AssertionError(f"Frame {index}: corners must stay transparent")
        visible = sum(value > 8 for value in alpha.get_flattened_data()) / (FRAME_PX * FRAME_PX)
        if not 0.06 <= visible <= 0.72:
            raise AssertionError(f"Frame {index}: implausible visible coverage {visible:.3f}")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def write_manifest() -> None:
    static_paths = [STATIC_ROOT / f"{file_name}.webp" for _key, file_name in RESOURCE_ORDER]
    tracked = [RESOURCE_ATLAS, RECOGNITION_ATLAS, REVIEW_PATH, *static_paths]
    manifest = {
        "version": 5,
        "date": "2026-07-28",
        "generator": "OpenAI built-in ImageGen plus local chroma removal",
        "camera": "strict orthographic front-facing 2D",
        "runtimeChanged": True,
        "approvedNewResources": list(APPROVED_2D_SHEETS),
        "retainedResources": sorted(RETAINED_RESOURCES),
        "resourceFrameOrder": [key for key, _file_name in RESOURCE_ORDER],
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
    frames, by_resource = build_resource_frames()
    validate_frames(frames)
    build_resource_atlas(frames)
    build_recognition_atlas(frames)
    build_review(by_resource)
    write_manifest()
    print(f"Built {relative(RESOURCE_ATLAS)}")
    print(f"Built {relative(RECOGNITION_ATLAS)}")
    print(f"Built {relative(REVIEW_PATH)}")


if __name__ == "__main__":
    main()
