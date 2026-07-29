"""Build the audited overworld resource and special-tile clarity atlases.

This is a deterministic repack of earlier approved raster art. It does not
invent Phaser/HTML glyphs, alter gameplay tile types, or touch the authored
sky-island eclipse-gate props.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
FRAME_NATIVE = 94
FRAME_SEMANTIC = 188
RECOGNITION_COLUMNS = 8
RECOGNITION_FRAME_COUNT = 44

SCENIC_DIR = ROOT / "sprites" / "backgrounds" / "world-scenic-regions-v1"
SEMANTIC_DIR = ROOT / "sprites" / "backgrounds" / "world-visual-v2" / "semantic-decals-v1"
PREVIEW_DIR = ROOT / "visual-approval-previews" / "overground-texture-audit-v1"

RECOGNITION_V2 = SCENIC_DIR / "level1-ground-recognition-atlas-v2.png"
RECOGNITION_V3 = SCENIC_DIR / "level1-ground-recognition-atlas-v3.png"
TELEPORT_EARLIER = (
    ROOT
    / "sprites"
    / "tiles"
    / "tiles-under-1000"
    / "special-tiles"
    / "special-tile-teleport-up-.webp"
)
RESOURCE_PHYSICAL_V1 = SEMANTIC_DIR / "resource-insets-beauty-v1.png"
SPECIAL_PHYSICAL_V2 = SEMANTIC_DIR / "special-reward-insets-beauty-v2.png"

RESOURCE_CLARITY = SEMANTIC_DIR / "resource-recognition-clarity-v1.png"
SPECIAL_CLARITY_BEAUTY = SEMANTIC_DIR / "special-reward-clarity-beauty-v1.png"
SPECIAL_CLARITY_EMISSIVE = SEMANTIC_DIR / "special-reward-clarity-emissive-v1.png"
MANIFEST = SEMANTIC_DIR / "overground-texture-clarity-v1.manifest.json"
QA_SHEET = PREVIEW_DIR / "04-selected-production-textures.png"

RESOURCE_LABELS = (
    "COPPER",
    "BRONZE",
    "STEEL",
    "IRON",
    "SILVER",
    "GOLD",
    "OBSIDIAN",
    "EMBER ORE",
    "MAGMA CRYSTAL",
    "STONE",
)
SPECIAL_LABELS = (
    "GEM POWER",
    "SPEED",
    "XP +1",
    "CRITICAL",
    "BERSERK",
    "COMBO +50",
    "LEGEND +5",
    "ANCIENT CACHE",
)


def require_image(path: Path, expected_size: tuple[int, int] | None = None) -> Image.Image:
    if not path.is_file():
        raise FileNotFoundError(f"Missing required source: {path.relative_to(ROOT)}")
    image = Image.open(path).convert("RGBA")
    if expected_size and image.size != expected_size:
        raise ValueError(
            f"{path.relative_to(ROOT)} must be {expected_size[0]}x{expected_size[1]}, "
            f"got {image.width}x{image.height}"
        )
    return image


def frame(atlas: Image.Image, index: int, columns: int, frame_size: int) -> Image.Image:
    left = (index % columns) * frame_size
    top = (index // columns) * frame_size
    return atlas.crop((left, top, left + frame_size, top + frame_size))


def paste_frame(atlas: Image.Image, image: Image.Image, index: int, columns: int, frame_size: int):
    if image.size != (frame_size, frame_size):
        raise ValueError(f"Frame {index} must be {frame_size}px, got {image.size}")
    atlas.alpha_composite(
        image,
        ((index % columns) * frame_size, (index // columns) * frame_size),
    )


def fit_square(image: Image.Image, size: int) -> Image.Image:
    if image.size == (size, size):
        return image.copy()
    return image.resize((size, size), Image.Resampling.LANCZOS)


def build_recognition_v3() -> Image.Image:
    source = require_image(
        RECOGNITION_V2,
        (RECOGNITION_COLUMNS * FRAME_NATIVE, 6 * FRAME_NATIVE),
    )
    result = source.copy()
    teleport = fit_square(require_image(TELEPORT_EARLIER), FRAME_NATIVE)
    x = (30 % RECOGNITION_COLUMNS) * FRAME_NATIVE
    y = (30 // RECOGNITION_COLUMNS) * FRAME_NATIVE
    result.paste((0, 0, 0, 0), (x, y, x + FRAME_NATIVE, y + FRAME_NATIVE))
    result.alpha_composite(teleport, (x, y))
    result.save(RECOGNITION_V3, optimize=True)
    return result


def build_resource_clarity(recognition: Image.Image) -> Image.Image:
    columns = 8
    rows = 4
    output = Image.new(
        "RGBA",
        (columns * FRAME_SEMANTIC, rows * FRAME_SEMANTIC),
        (0, 0, 0, 0),
    )
    physical = require_image(RESOURCE_PHYSICAL_V1, (2048, 1024))
    for index in range(30):
        if index < 27:
            source_frame = frame(recognition, index, RECOGNITION_COLUMNS, FRAME_NATIVE)
        else:
            # Common stone remains restrained physical geology rather than a
            # high-contrast collectible marker.
            source_frame = frame(physical, index, 8, 256)
        source_frame = fit_square(source_frame, FRAME_SEMANTIC)
        paste_frame(output, source_frame, index, columns, FRAME_SEMANTIC)
    output.save(RESOURCE_CLARITY, optimize=True)
    return output


def build_special_beauty(recognition: Image.Image) -> Image.Image:
    columns = 4
    rows = 2
    output = Image.new(
        "RGBA",
        (columns * FRAME_SEMANTIC, rows * FRAME_SEMANTIC),
        (0, 0, 0, 0),
    )
    physical = require_image(SPECIAL_PHYSICAL_V2, (1024, 512))
    for index in range(7):
        source_frame = frame(
            recognition,
            32 + index,
            RECOGNITION_COLUMNS,
            FRAME_NATIVE,
        )
        paste_frame(
            output,
            fit_square(source_frame, FRAME_SEMANTIC),
            index,
            columns,
            FRAME_SEMANTIC,
        )
    ancient_cache = frame(physical, 7, 4, 256)
    paste_frame(
        output,
        fit_square(ancient_cache, FRAME_SEMANTIC),
        7,
        columns,
        FRAME_SEMANTIC,
    )
    output.save(SPECIAL_CLARITY_BEAUTY, optimize=True)
    return output


def emissive_frame(beauty: Image.Image) -> Image.Image:
    rgb = beauty.convert("RGB")
    alpha = beauty.getchannel("A")
    hsv = rgb.convert("HSV")
    saturation = hsv.getchannel("S")
    value = hsv.getchannel("V")

    saturation = saturation.point(
        lambda channel: max(0, min(255, int((channel - 34) * 1.24)))
    )
    value = value.point(
        lambda channel: max(0, min(255, int((channel - 56) * 1.12)))
    )
    energy = ImageChops.lighter(
        saturation.point(lambda channel: int(channel * 0.76)),
        value.point(lambda channel: int(channel * 0.54)),
    )
    energy = ImageChops.multiply(energy, alpha)
    bloom = energy.filter(ImageFilter.GaussianBlur(radius=4.2))
    emissive_alpha = ImageChops.lighter(
        energy.point(lambda channel: int(channel * 0.72)),
        bloom.point(lambda channel: int(channel * 0.58)),
    )
    color = ImageEnhance.Color(rgb).enhance(1.14).convert("RGBA")
    color.putalpha(emissive_alpha)
    return color


def build_special_emissive(beauty: Image.Image) -> Image.Image:
    output = Image.new("RGBA", beauty.size, (0, 0, 0, 0))
    for index in range(8):
        source_frame = frame(beauty, index, 4, FRAME_SEMANTIC)
        paste_frame(
            output,
            emissive_frame(source_frame),
            index,
            4,
            FRAME_SEMANTIC,
        )
    output.save(SPECIAL_CLARITY_EMISSIVE, optimize=True)
    return output


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    filename = "segoeuib.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype(str(Path(r"C:\Windows\Fonts") / filename), size)


def native_frame(source: Image.Image, index: int, columns: int) -> Image.Image:
    image = frame(source, index, columns, FRAME_SEMANTIC)
    return image.resize((FRAME_NATIVE, FRAME_NATIVE), Image.Resampling.LANCZOS)


def checker(size: tuple[int, int]) -> Image.Image:
    image = Image.new("RGBA", size, (34, 31, 30, 255))
    draw = ImageDraw.Draw(image)
    step = 12
    for y in range(0, size[1], step):
        for x in range(0, size[0], step):
            if ((x // step) + (y // step)) % 2:
                draw.rectangle(
                    (x, y, x + step - 1, y + step - 1),
                    fill=(45, 39, 35, 255),
                )
    return image


def draw_asset_row(
    canvas: Image.Image,
    draw: ImageDraw.ImageDraw,
    title: str,
    labels: tuple[str, ...],
    images: list[Image.Image],
    top: int,
):
    draw.text((28, top), title, font=font(22, True), fill=(247, 242, 232, 255))
    y = top + 44
    cell_width = 125
    for index, (label, image) in enumerate(zip(labels, images)):
        x = 28 + index * cell_width
        canvas.alpha_composite(checker((108, 108)), (x, y))
        canvas.alpha_composite(image, (x + 7, y + 7))
        label_font = font(11, True)
        text_width = draw.textlength(label, font=label_font)
        draw.text(
            (x + (108 - text_width) / 2, y + 114),
            label,
            font=label_font,
            fill=(207, 196, 181, 255),
        )


def build_qa_sheet(
    resource_atlas: Image.Image,
    special_atlas: Image.Image,
    recognition: Image.Image,
):
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    canvas = Image.new("RGBA", (1300, 520), (17, 17, 22, 255))
    draw = ImageDraw.Draw(canvas)
    draw.text(
        (28, 18),
        "SELECTED PRODUCTION TEXTURES — NATIVE 94 PX",
        font=font(27, True),
        fill=(247, 242, 232, 255),
    )
    draw.text(
        (28, 56),
        "Earlier colored resource veins + emblem rewards; physical stone and Ancient Cache retained.",
        font=font(15),
        fill=(181, 171, 158, 255),
    )
    resource_starts = (0, 3, 6, 9, 12, 15, 18, 21, 24, 27)
    resource_images = [
        native_frame(resource_atlas, index, 8)
        for index in resource_starts
    ]
    special_images = [
        native_frame(special_atlas, index, 4)
        for index in range(8)
    ]
    teleport = frame(recognition, 30, RECOGNITION_COLUMNS, FRAME_NATIVE)
    gamble = frame(recognition, 31, RECOGNITION_COLUMNS, FRAME_NATIVE)
    special_images.extend((teleport, gamble))
    special_labels = SPECIAL_LABELS + ("TELEPORT UP", "GAMBLE x3")
    draw_asset_row(
        canvas,
        draw,
        "RESOURCES",
        RESOURCE_LABELS,
        resource_images,
        92,
    )
    draw_asset_row(
        canvas,
        draw,
        "SPECIAL TILES",
        special_labels,
        special_images,
        285,
    )
    canvas.convert("RGB").save(QA_SHEET, quality=96)


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_manifest(outputs: list[Path]):
    source_paths = [
        RECOGNITION_V2,
        TELEPORT_EARLIER,
        RESOURCE_PHYSICAL_V1,
        SPECIAL_PHYSICAL_V2,
    ]
    payload = {
        "version": 1,
        "generatedOn": "2026-07-28",
        "purpose": "Audited overworld resource and special-tile clarity rollback",
        "runtimeContract": {
            "gameplayChanged": False,
            "savesChanged": False,
            "skyIslandEclipseGateChanged": False,
            "nativeCellPx": FRAME_NATIVE,
            "semanticFramePx": FRAME_SEMANTIC,
        },
        "sources": {
            relative(path): {"sha256": sha256(path), "bytes": path.stat().st_size}
            for path in source_paths
        },
        "outputs": {
            relative(path): {"sha256": sha256(path), "bytes": path.stat().st_size}
            for path in outputs
        },
    }
    MANIFEST.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def validate_alpha(path: Path, expected_size: tuple[int, int]):
    image = require_image(path, expected_size)
    alpha = image.getchannel("A")
    if alpha.getextrema() == (255, 255):
        raise ValueError(f"{path.relative_to(ROOT)} unexpectedly lost transparency")


def main():
    SCENIC_DIR.mkdir(parents=True, exist_ok=True)
    SEMANTIC_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    recognition = build_recognition_v3()
    resources = build_resource_clarity(recognition)
    special_beauty = build_special_beauty(recognition)
    build_special_emissive(special_beauty)
    build_qa_sheet(resources, special_beauty, recognition)

    validate_alpha(
        RECOGNITION_V3,
        (RECOGNITION_COLUMNS * FRAME_NATIVE, 6 * FRAME_NATIVE),
    )
    validate_alpha(
        RESOURCE_CLARITY,
        (8 * FRAME_SEMANTIC, 4 * FRAME_SEMANTIC),
    )
    validate_alpha(
        SPECIAL_CLARITY_BEAUTY,
        (4 * FRAME_SEMANTIC, 2 * FRAME_SEMANTIC),
    )
    validate_alpha(
        SPECIAL_CLARITY_EMISSIVE,
        (4 * FRAME_SEMANTIC, 2 * FRAME_SEMANTIC),
    )

    outputs = [
        RECOGNITION_V3,
        RESOURCE_CLARITY,
        SPECIAL_CLARITY_BEAUTY,
        SPECIAL_CLARITY_EMISSIVE,
        QA_SHEET,
    ]
    write_manifest(outputs)
    for path in [*outputs, MANIFEST]:
        print(relative(path))


if __name__ == "__main__":
    main()
