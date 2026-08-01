"""Pack ten twelve-state ImageGen ground-damage families for Phaser runtime."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SEMANTIC_ROOT = ROOT / "sprites/backgrounds/world-visual-v2/semantic-decals-v1"
PACKAGE_ROOT = SEMANTIC_ROOT / "imagegen-ground-damage-v1"
SOURCE_ROOT = PACKAGE_ROOT / "sources"
ALPHA_ROOT = PACKAGE_ROOT / "alpha-sheets"
REVIEW_ROOT = ROOT / "visual-approval-previews/ground-damage-imagegen-v1"

RUNTIME_ATLAS = SEMANTIC_ROOT / "ground-damage-imagegen-v1.png"
LIBRARY_REVIEW = REVIEW_ROOT / "01-library-120-states.png"
MATERIAL_REVIEW = REVIEW_ROOT / "02-all-materials-runtime-scale.png"
MANIFEST_PATH = PACKAGE_ROOT / "manifest.json"

FRAME_PX = 188
FRAME_CONTENT_PX = 176
NATIVE_PX = 94
SOURCE_WIDTH = 1536
SOURCE_HEIGHT = 1024
SOURCE_COLUMNS = 4
SOURCE_ROWS = 3
SOURCE_CELL_PX = 341
SOURCE_COLUMN_STRIDE = 384
SOURCE_X_INSET = 21
SOURCE_ROW_BOUNDARIES = (0, 341, 683, SOURCE_HEIGHT)
VARIANTS = 10
STATES = 12
ATLAS_COLUMNS = VARIANTS
FRAME_COUNT = VARIANTS * STATES

FAMILY_NAMES = (
    "diagonal fracture",
    "reverse shear",
    "horizontal shear",
    "vertical pressure",
    "stress arc",
    "hooked fault",
    "double kink",
    "staggered shear",
    "abrasion first",
    "compression crescents",
)

MATERIALS = (
    ("town earth", "sprites/backgrounds/world-visual-v2/materials/town-dark-earth-v1.png"),
    ("shallow blue", "sprites/backgrounds/world-scenic-facade-v1/level1-shallow-blue-seamless.webp"),
    ("amber crystal", "sprites/backgrounds/world-scenic-facade-v1/level1-amber-crystal-seamless.webp"),
    ("silver core", "sprites/backgrounds/world-scenic-facade-v1/level1-silver-core-seamless.webp"),
    ("magma", "sprites/backgrounds/world-scenic-facade-v1/level2-current-magma-seamless.webp"),
    ("obsidian", "sprites/backgrounds/world-scenic-facade-v1/level2-obsidian-ember-seamless.webp"),
    ("foundry", "sprites/backgrounds/world-scenic-facade-v1/level2-foundry-heart-seamless.webp"),
    ("blackglass", "sprites/backgrounds/world-scenic-facade-v1/level2-future-blackglass-seamless.webp"),
    ("starfire", "sprites/backgrounds/world-scenic-facade-v1/level2-future-starfire-seamless.webp"),
)


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    font_path = Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf")
    return ImageFont.truetype(str(font_path), size) if font_path.is_file() else ImageFont.load_default()


def frame_box(index: int, columns: int, size: int) -> tuple[int, int, int, int]:
    x = index % columns * size
    y = index // columns * size
    return (x, y, x + size, y + size)


def source_frame_box(state_index: int) -> tuple[int, int, int, int]:
    column = state_index % SOURCE_COLUMNS
    row = state_index // SOURCE_COLUMNS
    left = column * SOURCE_COLUMN_STRIDE + SOURCE_X_INSET
    top = SOURCE_ROW_BOUNDARIES[row]
    bottom = SOURCE_ROW_BOUNDARIES[row + 1]
    return (left, top, left + SOURCE_CELL_PX, bottom)


def source_path(variant_index: int) -> Path:
    return SOURCE_ROOT / f"variant-{variant_index + 1:02d}-chroma.png"


def alpha_path(variant_index: int) -> Path:
    return ALPHA_ROOT / f"variant-{variant_index + 1:02d}.png"


def ensure_inputs() -> None:
    required = [
        *(source_path(index) for index in range(VARIANTS)),
        *(alpha_path(index) for index in range(VARIANTS)),
        *(ROOT / path for _name, path in MATERIALS),
    ]
    missing = [path for path in required if not path.is_file()]
    if missing:
        raise FileNotFoundError("Missing ground-damage input(s):\n" + "\n".join(f"- {path}" for path in missing))


def split_variant(path: Path) -> tuple[Image.Image, ...]:
    sheet = Image.open(path).convert("RGBA")
    if sheet.size != (SOURCE_WIDTH, SOURCE_HEIGHT):
        raise ValueError(f"{path.name}: expected {SOURCE_WIDTH}x{SOURCE_HEIGHT}, got {sheet.size}")
    frames = []
    inset = (FRAME_PX - FRAME_CONTENT_PX) // 2
    for state in range(STATES):
        content = sheet.crop(source_frame_box(state)).resize(
            (FRAME_CONTENT_PX, FRAME_CONTENT_PX),
            Image.Resampling.LANCZOS,
        )
        frame = Image.new("RGBA", (FRAME_PX, FRAME_PX), (0, 0, 0, 0))
        frame.alpha_composite(content, (inset, inset))
        frames.append(frame)
    return tuple(frames)


def load_frames() -> tuple[tuple[Image.Image, ...], ...]:
    return tuple(split_variant(alpha_path(variant)) for variant in range(VARIANTS))


def alpha_coverage(frame: Image.Image) -> float:
    alpha = frame.getchannel("A")
    return sum(value > 8 for value in alpha.get_flattened_data()) / (FRAME_PX * FRAME_PX)


def validate_frames(by_variant: tuple[tuple[Image.Image, ...], ...]) -> dict[str, list[float]]:
    fingerprints: set[str] = set()
    coverage: dict[str, list[float]] = {}
    corners = ((0, 0), (FRAME_PX - 1, 0), (0, FRAME_PX - 1), (FRAME_PX - 1, FRAME_PX - 1))
    for variant_index, frames in enumerate(by_variant):
        values = []
        for state_index, frame in enumerate(frames):
            alpha = frame.getchannel("A")
            alpha_min, alpha_max = alpha.getextrema()
            if alpha_min != 0 or alpha_max < 40:
                raise AssertionError(
                    f"Variant {variant_index + 1} state {state_index + 1}: "
                    f"alpha extrema must include transparent and visible pixels, got {(alpha_min, alpha_max)}"
                )
            if any(alpha.getpixel(point) != 0 for point in corners):
                raise AssertionError(f"Variant {variant_index + 1} state {state_index + 1}: corners must be transparent")
            current_coverage = alpha_coverage(frame)
            if not 0.001 <= current_coverage <= 0.68:
                raise AssertionError(
                    f"Variant {variant_index + 1} state {state_index + 1}: implausible coverage {current_coverage:.3f}"
                )
            fingerprint = hashlib.sha256(frame.tobytes()).hexdigest()
            if fingerprint in fingerprints:
                raise AssertionError(f"Duplicate frame at variant {variant_index + 1}, state {state_index + 1}")
            fingerprints.add(fingerprint)
            values.append(round(current_coverage, 5))
        if values[-1] < values[0] * 1.6 or values[-1] - values[0] < 0.012:
            raise AssertionError(f"Variant {variant_index + 1}: progression does not expand enough")
        coverage[f"variant-{variant_index + 1:02d}"] = values
    if len(fingerprints) != FRAME_COUNT:
        raise AssertionError(f"Expected {FRAME_COUNT} unique frames, got {len(fingerprints)}")
    return coverage


def runtime_order(by_variant: tuple[tuple[Image.Image, ...], ...]) -> list[Image.Image]:
    return [
        by_variant[variant_index][state_index]
        for state_index in range(STATES)
        for variant_index in range(VARIANTS)
    ]


def build_atlas(frames: list[Image.Image]) -> None:
    atlas = Image.new("RGBA", (ATLAS_COLUMNS * FRAME_PX, STATES * FRAME_PX), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        atlas.alpha_composite(frame, frame_box(index, ATLAS_COLUMNS, FRAME_PX)[:2])
    atlas.save(RUNTIME_ATLAS, "PNG", optimize=True)


def build_library_review(by_variant: tuple[tuple[Image.Image, ...], ...]) -> None:
    label_width = 220
    header_height = 74
    row_height = 104
    canvas = Image.new("RGB", (label_width + STATES * NATIVE_PX, header_height + VARIANTS * row_height), "#07090d")
    draw = ImageDraw.Draw(canvas)
    draw.text((20, 12), "IMAGEGEN GROUND DAMAGE V1 - 120 AUTHORED STATES", fill="#f0dfbf", font=load_font(28, True))
    for state in range(STATES):
        draw.text((label_width + state * NATIVE_PX + 38, 48), str(state + 1), fill="#aeb9c8", font=load_font(14, True))
    for variant, family in enumerate(FAMILY_NAMES):
        y = header_height + variant * row_height
        draw.text((18, y + 33), f"{variant + 1:02d}  {family}", fill="#dbe4ef", font=load_font(17, True))
        for state in range(STATES):
            frame = by_variant[variant][state].resize((NATIVE_PX, NATIVE_PX), Image.Resampling.LANCZOS)
            canvas.paste(frame, (label_width + state * NATIVE_PX, y), frame)
    REVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    canvas.save(LIBRARY_REVIEW, "PNG", optimize=True)


def material_sample(path: Path, material_index: int, state: int) -> Image.Image:
    source = Image.open(path).convert("RGB")
    crop_size = min(source.width, source.height, 512)
    max_x = max(0, source.width - crop_size)
    max_y = max(0, source.height - crop_size)
    left = (material_index * 173 + state * 67) % (max_x + 1)
    top = (material_index * 101 + state * 89) % (max_y + 1)
    return ImageOps.fit(source.crop((left, top, left + crop_size, top + crop_size)), (NATIVE_PX, NATIVE_PX))


def build_material_review(by_variant: tuple[tuple[Image.Image, ...], ...]) -> None:
    label_width = 190
    header_height = 76
    columns = STATES + 1
    canvas = Image.new("RGB", (label_width + columns * NATIVE_PX, header_height + len(MATERIALS) * NATIVE_PX), "#07090d")
    draw = ImageDraw.Draw(canvas)
    draw.text((18, 12), "ALL CURRENT MATERIALS AT NATIVE 94 PX", fill="#f0dfbf", font=load_font(28, True))
    for state in range(columns):
        label = "INTACT" if state == 0 else str(state)
        draw.text((label_width + state * NATIVE_PX + 28, 48), label, fill="#aeb9c8", font=load_font(13, True))
    for material_index, (name, material_path) in enumerate(MATERIALS):
        y = header_height + material_index * NATIVE_PX
        draw.text((16, y + 34), name, fill="#dbe4ef", font=load_font(17, True))
        path = ROOT / material_path
        for column in range(columns):
            ground = material_sample(path, material_index, column).convert("RGBA")
            if column > 0:
                state_index = column - 1
                variant_index = material_index % VARIANTS
                decal = by_variant[variant_index][state_index].resize((NATIVE_PX, NATIVE_PX), Image.Resampling.LANCZOS)
                ground.alpha_composite(decal)
            canvas.paste(ground.convert("RGB"), (label_width + column * NATIVE_PX, y))
    canvas.save(MATERIAL_REVIEW, "PNG", optimize=True)


def write_manifest(coverage: dict[str, list[float]]) -> None:
    tracked = [
        *(source_path(index) for index in range(VARIANTS)),
        *(alpha_path(index) for index in range(VARIANTS)),
        RUNTIME_ATLAS,
        LIBRARY_REVIEW,
        MATERIAL_REVIEW,
    ]
    manifest = {
        "version": 1,
        "date": "2026-07-29",
        "generator": "OpenAI built-in ImageGen plus installed local chroma removal",
        "camera": "strict orthographic top-down 2D",
        "groundOwnership": "transparent damage overlays; runtime material remains visible",
        "variants": VARIANTS,
        "statesPerVariant": STATES,
        "frameCount": FRAME_COUNT,
        "frameOrder": "state-major: frame = stateIndex * variants + variantIndex",
        "families": list(FAMILY_NAMES),
        "runtime": {
            "atlas": relative(RUNTIME_ATLAS),
            "columns": ATLAS_COLUMNS,
            "frameSizePx": FRAME_PX,
        },
        "coverageByVariantAndState": coverage,
        "sha256": {relative(path): sha256(path) for path in tracked},
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    ensure_inputs()
    by_variant = load_frames()
    coverage = validate_frames(by_variant)
    frames = runtime_order(by_variant)
    build_atlas(frames)
    build_library_review(by_variant)
    build_material_review(by_variant)
    write_manifest(coverage)
    print(f"Built {relative(RUNTIME_ATLAS)} ({FRAME_COUNT} frames)")
    print(f"Built {relative(LIBRARY_REVIEW)}")
    print(f"Built {relative(MATERIAL_REVIEW)}")
    print(f"Built {relative(MANIFEST_PATH)}")


if __name__ == "__main__":
    main()
