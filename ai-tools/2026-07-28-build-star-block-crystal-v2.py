from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "sprites/environment/star-block-destruction-v1"
OUTPUT_ROOT = ROOT / "sprites/environment/star-block-crystal-v2"
SEMANTIC_ROOT = ROOT / "sprites/backgrounds/world-visual-v2/semantic-decals-v1"
PROOF_ROOT = ROOT / "visual-approval-previews/underground-star-floating-directions-v2"

RARITIES = (
    "cyan",
    "lavender",
    "gold",
    "orange",
    "turquoise",
    "violet",
)

CORE_SIZE = 512
ATLAS_FRAME_SIZE = 256
CONTENT_SIZE = 476
BRIGHTNESS_THRESHOLD = 28
CROP_EXPANSION = 1.28
EDGE_FEATHER_PX = 18
TILE_DISPLAY_SIZE_PX = 94
RELEASE_START_SCALE = 0.90
POP_DISPLAY_SCALE = 1.00
GROWTH_DELAY_MS = 720
PEAK_DISPLAY_SCALE = 1.45
RELEASE_DURATION_MS = 10_800


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require(path: Path) -> Path:
    if not path.is_file():
        raise FileNotFoundError(path)
    return path


def clamp_crop_box(
    width: int,
    height: int,
    center_x: float,
    center_y: float,
    side: int,
) -> tuple[int, int, int, int]:
    side = min(side, width, height)
    left = int(round(center_x - side / 2))
    top = int(round(center_y - side / 2))
    left = max(0, min(width - side, left))
    top = max(0, min(height - side, top))
    return left, top, left + side, top + side


def find_star_crop(source: Image.Image) -> tuple[int, int, int, int]:
    red, green, blue = source.convert("RGB").split()
    brightness = ImageChops.lighter(ImageChops.lighter(red, green), blue)
    mask = brightness.point(
        lambda value: 255 if value >= BRIGHTNESS_THRESHOLD else 0
    )
    bounds = mask.getbbox()
    if bounds is None:
        raise ValueError("No luminous star content was detected")
    left, top, right, bottom = bounds
    center_x = (left + right) / 2
    center_y = (top + bottom) / 2
    side = int(round(max(right - left, bottom - top) * CROP_EXPANSION))
    return clamp_crop_box(source.width, source.height, center_x, center_y, side)


def normalize_core(source_path: Path) -> tuple[Image.Image, tuple[int, int, int, int]]:
    with Image.open(require(source_path)) as raw:
        source = raw.convert("RGB")
    crop_box = find_star_crop(source)
    cropped = source.crop(crop_box)
    fitted = ImageOps.contain(
        cropped,
        (CONTENT_SIZE, CONTENT_SIZE),
        Image.Resampling.LANCZOS,
    )
    core = Image.new("RGB", (CORE_SIZE, CORE_SIZE), (0, 0, 0))
    core.paste(
        fitted,
        ((CORE_SIZE - fitted.width) // 2, (CORE_SIZE - fitted.height) // 2),
    )

    edge_mask = Image.new("L", (CORE_SIZE, CORE_SIZE), 0)
    draw = ImageDraw.Draw(edge_mask)
    draw.rectangle(
        (
            EDGE_FEATHER_PX,
            EDGE_FEATHER_PX,
            CORE_SIZE - EDGE_FEATHER_PX - 1,
            CORE_SIZE - EDGE_FEATHER_PX - 1,
        ),
        fill=255,
    )
    edge_mask = edge_mask.filter(ImageFilter.GaussianBlur(EDGE_FEATHER_PX / 2))
    channels = [
        ImageChops.multiply(
            channel.point(lambda value: 0 if value <= 2 else value),
            edge_mask,
        )
        for channel in core.split()
    ]
    return Image.merge("RGB", channels), crop_box


def make_emissive(frame: Image.Image) -> Image.Image:
    blur = frame.filter(ImageFilter.GaussianBlur(4.2))
    blur = ImageEnhance.Brightness(blur).enhance(1.18)
    emissive = ImageChops.screen(frame, blur)
    return ImageEnhance.Color(emissive).enhance(1.06)


def screen_composite(
    canvas: Image.Image,
    sprite: Image.Image,
    x: int,
    y: int,
    opacity: float = 1.0,
) -> None:
    opacity = max(0.0, min(1.0, opacity))
    if opacity < 1:
        sprite = Image.blend(
            Image.new("RGB", sprite.size, (0, 0, 0)),
            sprite,
            opacity,
        )
    region = canvas.crop((x, y, x + sprite.width, y + sprite.height))
    canvas.paste(ImageChops.screen(region, sprite), (x, y))


def build_proof(cores: dict[str, Image.Image]) -> Path:
    proof = Image.new("RGB", (1536, 820), (8, 10, 15))
    draw = ImageDraw.Draw(proof)
    release_start_size = round(TILE_DISPLAY_SIZE_PX * RELEASE_START_SCALE)
    pop_size = round(TILE_DISPLAY_SIZE_PX * POP_DISPLAY_SCALE)
    peak_size = round(TILE_DISPLAY_SIZE_PX * PEAK_DISPLAY_SCALE)
    draw.text((54, 34), "CHOICE 1 - LIVE BLOCK ICON (94 PX)", fill=(220, 230, 244))
    draw.text(
        (54, 252),
        f"1:1 POP: {pop_size} PX BLOCK -> {pop_size} PX RELEASE",
        fill=(220, 230, 244),
    )
    draw.text(
        (54, 276),
        f"{release_start_size} PX INVISIBLE RAMP - GROWTH BEGINS AFTER LIFT",
        fill=(150, 166, 192),
    )

    lane_width = 230
    start_x = 62
    for index, rarity in enumerate(RARITIES):
        x = start_x + index * lane_width
        tile = cores[rarity].resize(
            (TILE_DISPLAY_SIZE_PX, TILE_DISPLAY_SIZE_PX),
            Image.Resampling.LANCZOS,
        )
        screen_composite(proof, tile, x + 54, 96)
        draw.text((x + 56, 202), rarity.upper(), fill=(150, 166, 192))

    cyan = cores["cyan"]
    positions = (
        (164, 602, pop_size, 1.0),
        (282, 532, 94, 0.26),
        (398, 456, 104, 0.23),
        (520, 370, 115, 0.20),
        (650, 278, 126, 0.17),
        (790, 178, peak_size, 1.0),
    )
    for x, y, size, opacity in positions:
        sprite = cyan.resize((size, size), Image.Resampling.LANCZOS)
        screen_composite(proof, sprite, x, y, opacity)
    draw.line((128, 720, 1010, 112), fill=(46, 61, 86), width=2)
    draw.text((1040, 344), "CALMER 10.8+ SECOND ASCENT", fill=(220, 230, 244))
    draw.text((1040, 378), "6-IMAGE HEAVY ECHO TRAIL", fill=(150, 166, 192))

    output = PROOF_ROOT / "2026-07-29-choice1-production-scale-proof-v4.png"
    output.parent.mkdir(parents=True, exist_ok=True)
    proof.save(output, "PNG", optimize=True)
    return output


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    SEMANTIC_ROOT.mkdir(parents=True, exist_ok=True)

    cores: dict[str, Image.Image] = {}
    records = []
    for rarity in RARITIES:
        source_path = SOURCE_ROOT / f"star-core-{rarity}-v1.png"
        core, crop_box = normalize_core(source_path)
        output_path = OUTPUT_ROOT / f"star-core-{rarity}-v2.png"
        core.save(output_path, "PNG", optimize=True)
        cores[rarity] = core
        records.append(
            {
                "rarity": rarity,
                "source": source_path.relative_to(ROOT).as_posix(),
                "sourceSha256": sha256(source_path),
                "cropBox": list(crop_box),
                "runtime": output_path.relative_to(ROOT).as_posix(),
                "runtimeSha256": sha256(output_path),
            }
        )

    atlas_size = (ATLAS_FRAME_SIZE * 3, ATLAS_FRAME_SIZE * 2)
    beauty = Image.new("RGB", atlas_size, (0, 0, 0))
    emissive = Image.new("RGB", atlas_size, (0, 0, 0))
    for index, rarity in enumerate(RARITIES):
        frame = cores[rarity].resize(
            (ATLAS_FRAME_SIZE, ATLAS_FRAME_SIZE),
            Image.Resampling.LANCZOS,
        )
        x = (index % 3) * ATLAS_FRAME_SIZE
        y = (index // 3) * ATLAS_FRAME_SIZE
        beauty.paste(frame, (x, y))
        emissive.paste(make_emissive(frame), (x, y))

    beauty_path = SEMANTIC_ROOT / "sky-stars-floating-crystal-beauty-v2.png"
    emissive_path = SEMANTIC_ROOT / "sky-stars-floating-crystal-emissive-v2.png"
    beauty.save(beauty_path, "PNG", optimize=True)
    emissive.save(emissive_path, "PNG", optimize=True)
    proof_path = build_proof(cores)

    manifest = {
        "version": 2,
        "artSource": "ImageGen",
        "approvalReference": (
            "visual-approval-previews/underground-star-floating-directions-v2/"
            "2026-07-28-01-pure-crystal-star-v2.png"
        ),
        "rarityOrder": list(RARITIES),
        "coreSizePx": CORE_SIZE,
        "atlasFrameSizePx": ATLAS_FRAME_SIZE,
        "tileDisplaySizePx": TILE_DISPLAY_SIZE_PX,
        "releaseStartScale": RELEASE_START_SCALE,
        "popDisplayScale": POP_DISPLAY_SCALE,
        "growthDelayMs": GROWTH_DELAY_MS,
        "peakDisplayScale": PEAK_DISPLAY_SCALE,
        "releaseDurationMs": RELEASE_DURATION_MS,
        "cores": records,
        "beautyAtlas": {
            "path": beauty_path.relative_to(ROOT).as_posix(),
            "sha256": sha256(beauty_path),
        },
        "emissiveAtlas": {
            "path": emissive_path.relative_to(ROOT).as_posix(),
            "sha256": sha256(emissive_path),
        },
        "proof": {
            "path": proof_path.relative_to(ROOT).as_posix(),
            "sha256": sha256(proof_path),
        },
    }
    manifest_path = OUTPUT_ROOT / "star-block-crystal-v2.manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(
        "Built Star Block Crystal V2: six exact-family cores, "
        "paired 3x2 atlases, and production scale proof"
    )


if __name__ == "__main__":
    main()
