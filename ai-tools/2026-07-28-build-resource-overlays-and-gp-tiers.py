"""Build the approved ImageGen resource overlays and Gem Power tier atlases.

This script does not draw replacement art. It only trims, scales, mirrors, and
packs the reviewed ImageGen masters into the runtime formats used by Phaser.
"""

from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SEMANTIC_ROOT = ROOT / "sprites/backgrounds/world-visual-v2/semantic-decals-v1"
MASTER_ROOT = SEMANTIC_ROOT / "imagegen-overlay-v3/masters"
RESOURCE_MASTER_ROOT = MASTER_ROOT / "alpha"
GP_MASTER_ROOT = MASTER_ROOT / "gp-tiers"
STATIC_RESOURCE_ROOT = ROOT / "sprites/tiles/resource-overlays-imagegen-v4"
STATIC_GP_ROOT = ROOT / "sprites/tiles/special-tiles-imagegen-v4"
SCENIC_ROOT = ROOT / "sprites/backgrounds/world-scenic-regions-v1"
REVIEW_ROOT = ROOT / "visual-approval-previews/overground-texture-audit-v3-overlays"

RESOURCE_ATLAS_PATH = SEMANTIC_ROOT / "resource-overlays-imagegen-v3.png"
SPECIAL_ATLAS_PATH = SEMANTIC_ROOT / "special-blocks-imagegen-gp-tiers-v3.png"
OLD_SPECIAL_ATLAS_PATH = SEMANTIC_ROOT / "special-blocks-imagegen-opaque-v2.png"
OLD_RECOGNITION_ATLAS_PATH = SCENIC_ROOT / "level1-ground-recognition-atlas-v4.png"
RECOGNITION_ATLAS_PATH = SCENIC_ROOT / "level1-ground-recognition-atlas-v5.png"
LIVE_GROUND_CAPTURE = (
    ROOT
    / "visual-approval-previews/overground-texture-audit-v2-imagegen"
    / "02-live-runtime-resource-context.png"
)

RESOURCE_FRAME_PX = 188
RECOGNITION_FRAME_PX = 94
RESOURCE_COLUMNS = 6
RECOGNITION_COLUMNS = 8

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

GP_TIERS = (
    ("gp100", 100, 0),
    ("gp250", 250, 250),
    ("gp500", 500, 500),
    ("gp1000", 1000, 1000),
    ("gp1700", 1700, 1500),
)


def ensure_inputs(paths: Iterable[Path]) -> None:
    missing = [path for path in paths if not path.is_file()]
    if missing:
        joined = "\n".join(f"- {path}" for path in missing)
        raise FileNotFoundError(f"Required ImageGen/source inputs are missing:\n{joined}")


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = (
        Path("C:/Windows/Fonts/arialbd.ttf") if bold else Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf") if bold else Path("C:/Windows/Fonts/segoeui.ttf"),
    )
    for path in candidates:
        if path.is_file():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def frame_box(index: int, columns: int, frame_px: int) -> tuple[int, int, int, int]:
    x = index % columns * frame_px
    y = index // columns * frame_px
    return (x, y, x + frame_px, y + frame_px)


def alpha_trimmed(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("ImageGen resource master has no visible pixels")
    return rgba.crop(bbox)


def contain_rgba(image: Image.Image, size: int, fill_ratio: float = 0.86) -> Image.Image:
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


def cover_rgb(image: Image.Image, size: int) -> Image.Image:
    return ImageOps.fit(
        image.convert("RGB"),
        (size, size),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )


def save_webp(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "WEBP", lossless=True, method=6)


def build_resource_frames() -> tuple[list[Image.Image], dict[str, Image.Image]]:
    frames: list[Image.Image] = []
    static_frames: dict[str, Image.Image] = {}
    for resource_key, file_name in RESOURCE_ORDER:
        master = Image.open(RESOURCE_MASTER_ROOT / f"{file_name}.png")
        original = contain_rgba(master, RESOURCE_FRAME_PX)
        variants = (
            original,
            ImageOps.mirror(original),
            original.rotate(180, resample=Image.Resampling.BICUBIC),
        )
        frames.extend(variants)
        static_frames[resource_key] = original
        save_webp(original, STATIC_RESOURCE_ROOT / f"{file_name}.webp")
    return frames, static_frames


def build_resource_atlas(frames: list[Image.Image]) -> None:
    rows = (len(frames) + RESOURCE_COLUMNS - 1) // RESOURCE_COLUMNS
    atlas = Image.new(
        "RGBA",
        (RESOURCE_COLUMNS * RESOURCE_FRAME_PX, rows * RESOURCE_FRAME_PX),
        (0, 0, 0, 0),
    )
    for index, frame in enumerate(frames):
        atlas.alpha_composite(frame, frame_box(index, RESOURCE_COLUMNS, RESOURCE_FRAME_PX)[:2])
    RESOURCE_ATLAS_PATH.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(RESOURCE_ATLAS_PATH, "PNG", optimize=True)


def build_gp_frames() -> list[Image.Image]:
    frames: list[Image.Image] = []
    for tier_id, restore_amount, _min_depth in GP_TIERS:
        master = Image.open(GP_MASTER_ROOT / f"gp-{restore_amount}.png")
        frame = cover_rgb(master, RESOURCE_FRAME_PX)
        frames.append(frame)
        save_webp(frame, STATIC_GP_ROOT / f"gem-power-{restore_amount}.webp")
    return frames


def build_special_atlas(gp_frames: list[Image.Image]) -> list[Image.Image]:
    old = Image.open(OLD_SPECIAL_ATLAS_PATH).convert("RGB")
    preserved = [
        old.crop(frame_box(index, 4, RESOURCE_FRAME_PX))
        for index in range(1, 8)
    ]
    frames = [*gp_frames, *preserved]
    atlas = Image.new("RGB", (4 * RESOURCE_FRAME_PX, 3 * RESOURCE_FRAME_PX))
    for index, frame in enumerate(frames):
        atlas.paste(frame, frame_box(index, 4, RESOURCE_FRAME_PX)[:2])
    SPECIAL_ATLAS_PATH.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(SPECIAL_ATLAS_PATH, "PNG", optimize=True)
    return frames


def build_recognition_atlas(
    resource_frames: list[Image.Image],
    gp_frames: list[Image.Image],
) -> None:
    old = Image.open(OLD_RECOGNITION_ATLAS_PATH).convert("RGBA")
    # Resource candidates stay review-only until explicitly approved. Production
    # v5 preserves the current 0..29 resource frames while adding approved GP tiers.
    frames: list[Image.Image] = [
        old.crop(frame_box(index, RECOGNITION_COLUMNS, RECOGNITION_FRAME_PX))
        for index in range(len(resource_frames))
    ]
    frames.extend(
        old.crop(frame_box(index, RECOGNITION_COLUMNS, RECOGNITION_FRAME_PX))
        for index in (30, 31)
    )
    frames.extend(
        frame.convert("RGBA").resize(
            (RECOGNITION_FRAME_PX, RECOGNITION_FRAME_PX),
            Image.Resampling.LANCZOS,
        )
        for frame in gp_frames
    )
    frames.extend(
        old.crop(frame_box(index, RECOGNITION_COLUMNS, RECOGNITION_FRAME_PX))
        for index in range(33, 44)
    )
    if len(frames) != 48:
        raise AssertionError(f"Expected 48 recognition frames, got {len(frames)}")
    atlas = Image.new(
        "RGBA",
        (RECOGNITION_COLUMNS * RECOGNITION_FRAME_PX, 6 * RECOGNITION_FRAME_PX),
        (0, 0, 0, 0),
    )
    for index, frame in enumerate(frames):
        atlas.alpha_composite(
            frame.convert("RGBA"),
            frame_box(index, RECOGNITION_COLUMNS, RECOGNITION_FRAME_PX)[:2],
        )
    atlas.save(RECOGNITION_ATLAS_PATH, "PNG", optimize=True)


def crop_ground(image: Image.Image, index: int, size: tuple[int, int]) -> Image.Image:
    target_w, target_h = size
    if image.width < target_w or image.height < target_h:
        return ImageOps.fit(image.convert("RGB"), size, method=Image.Resampling.LANCZOS)
    usable_x = max(1, image.width - target_w)
    usable_y = max(1, image.height - target_h)
    x = (index * 197) % usable_x
    y = (index * 113 + image.height // 3) % usable_y
    return image.convert("RGB").crop((x, y, x + target_w, y + target_h))


def draw_resource_review(static_frames: dict[str, Image.Image]) -> None:
    width, height = 1600, 1040
    canvas = Image.new("RGB", (width, height), "#090b14")
    draw = ImageDraw.Draw(canvas)
    title_font = load_font(42, bold=True)
    label_font = load_font(25, bold=True)
    small_font = load_font(19)
    draw.text((54, 34), "RESOURCE OVERLAYS — ACTUAL GROUND + IMAGEGEN RGBA", fill="#f3f5ff", font=title_font)
    draw.text(
        (56, 88),
        "No baked soil squares. The live ground remains visible through every mineral silhouette.",
        fill="#aeb8d0",
        font=small_font,
    )
    ground = Image.open(LIVE_GROUND_CAPTURE) if LIVE_GROUND_CAPTURE.is_file() else Image.new("RGB", (500, 400), "#493326")
    panel_w, panel_h = 284, 402
    start_x, start_y, gap_x, gap_y = 54, 138, 25, 38
    for index, (resource_key, _file_name) in enumerate(RESOURCE_ORDER):
        column, row = index % 5, index // 5
        x = start_x + column * (panel_w + gap_x)
        y = start_y + row * (panel_h + gap_y)
        panel = crop_ground(ground, index, (panel_w, panel_h))
        shade = Image.new("RGBA", panel.size, (4, 7, 15, 35))
        panel = Image.alpha_composite(panel.convert("RGBA"), shade)
        overlay = static_frames[resource_key].resize((232, 232), Image.Resampling.LANCZOS)
        panel.alpha_composite(overlay, ((panel_w - 232) // 2, 66))
        canvas.paste(panel.convert("RGB"), (x, y))
        draw.rounded_rectangle((x, y, x + panel_w, y + panel_h), radius=12, outline="#57617a", width=2)
        label = resource_key.replace("Ore", " Ore").replace("Crystal", " Crystal").title()
        draw.text((x + 18, y + 18), label, fill="#ffffff", font=label_font)
        draw.text((x + 18, y + panel_h - 44), "transparent mineral overlay", fill="#d0d7e8", font=small_font)
    REVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    canvas.save(REVIEW_ROOT / "01-resource-overlay-ground-context.png", "PNG", optimize=True)


def draw_gp_review(gp_frames: list[Image.Image]) -> None:
    width, height = 1700, 520
    canvas = Image.new("RGB", (width, height), "#090b14")
    draw = ImageDraw.Draw(canvas)
    title_font = load_font(40, bold=True)
    value_font = load_font(28, bold=True)
    small_font = load_font(19)
    draw.text((50, 30), "GEM POWER SPECIAL TILE FAMILY — DEPTH = TEXTURE = RESTORE CAPACITY", fill="#f4efff", font=title_font)
    panel_w, panel_h, gap = 300, 360, 25
    start_x, start_y = 50, 112
    for index, ((tier_id, amount, min_depth), frame) in enumerate(zip(GP_TIERS, gp_frames)):
        x = start_x + index * (panel_w + gap)
        y = start_y
        panel = Image.new("RGB", (panel_w, panel_h), "#121426")
        art = frame.resize((260, 260), Image.Resampling.LANCZOS)
        panel.paste(art, (20, 18))
        canvas.paste(panel, (x, y))
        draw.rounded_rectangle((x, y, x + panel_w, y + panel_h), radius=12, outline="#7156a0", width=2)
        draw.text((x + 18, y + 286), f"+{amount} GP", fill="#e8d5ff", font=value_font)
        depth_text = "surface tier" if min_depth == 0 else f"from depth {min_depth}"
        draw.text((x + 18, y + 328), f"{tier_id} • {depth_text}", fill="#acb5ce", font=small_font)
    canvas.save(REVIEW_ROOT / "02-gp-tier-family.png", "PNG", optimize=True)


def validate_resource_alpha(static_frames: dict[str, Image.Image]) -> None:
    for resource_key, frame in static_frames.items():
        alpha = frame.getchannel("A")
        extrema = alpha.getextrema()
        corner_alpha = [
            alpha.getpixel((0, 0)),
            alpha.getpixel((alpha.width - 1, 0)),
            alpha.getpixel((0, alpha.height - 1)),
            alpha.getpixel((alpha.width - 1, alpha.height - 1)),
        ]
        visible = sum(1 for value in alpha.getdata() if value > 0)
        coverage = visible / (alpha.width * alpha.height)
        if extrema != (0, 255):
            raise AssertionError(f"{resource_key}: expected alpha extrema (0, 255), got {extrema}")
        if any(corner_alpha):
            raise AssertionError(f"{resource_key}: overlay corners must be transparent")
        if not 0.08 <= coverage <= 0.70:
            raise AssertionError(f"{resource_key}: implausible visible coverage {coverage:.3f}")


def main() -> None:
    required = [
        *(RESOURCE_MASTER_ROOT / f"{file_name}.png" for _, file_name in RESOURCE_ORDER),
        *(GP_MASTER_ROOT / f"gp-{amount}.png" for _, amount, _ in GP_TIERS),
        OLD_SPECIAL_ATLAS_PATH,
        OLD_RECOGNITION_ATLAS_PATH,
    ]
    ensure_inputs(required)
    resource_frames, static_frames = build_resource_frames()
    validate_resource_alpha(static_frames)
    build_resource_atlas(resource_frames)
    gp_frames = build_gp_frames()
    build_special_atlas(gp_frames)
    build_recognition_atlas(resource_frames, gp_frames)
    draw_resource_review(static_frames)
    draw_gp_review(gp_frames)
    print(f"Built {RESOURCE_ATLAS_PATH.relative_to(ROOT)}")
    print(f"Built {SPECIAL_ATLAS_PATH.relative_to(ROOT)}")
    print(f"Built {RECOGNITION_ATLAS_PATH.relative_to(ROOT)}")
    print(f"Built {REVIEW_ROOT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
