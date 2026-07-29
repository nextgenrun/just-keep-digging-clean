"""Build the approved seven-tier pickaxe HUD overlays and visual QA sheet."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
HUD_DIR = ROOT / "sprites" / "UI" / "hud-approved-v1"
ICON_DIR = ROOT / "sprites" / "UI" / "pickaxe-icons-v1"
OUTPUT_DIR = ROOT / "sprites" / "UI" / "pickaxe-hud-v1"
BASE_HUD = HUD_DIR / "player-core.png"
OVERLAY_SIZE = (417, 93)
BUILD_SCALE = 4
ALPHA_THRESHOLD = 8
DISC_BOX = (9, 8, 85, 85)
BAR_BOX = (126, 56, 350, 81)
PIP_START_X = 306
PIP_STEP_X = 6
PIP_Y = 24

TIERS = (
    ("bronzePickaxe", "bronze", "BRONZE I", 1, "#c47d42"),
    ("ironPickaxe", "iron", "IRON II", 2, "#aeb8c1"),
    ("steelPickaxe", "steel", "STEEL III", 3, "#d6e0e8"),
    ("mithrilPickaxe", "mithril", "MITHRIL IV", 4, "#63d7e8"),
    ("adamantPickaxe", "adamant", "ADAMANT V", 5, "#45cf83"),
    ("runePickaxe", "rune", "RUNE VI", 6, "#a873ff"),
    ("dragonPickaxe", "dragon", "DRAGON VII", 7, "#f07b38"),
)


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def digest(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = (
        Path("C:/Windows/Fonts/bahnschrift.ttf"),
        Path("C:/Windows/Fonts/trebucbd.ttf" if bold else "C:/Windows/Fonts/trebuc.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
    )
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    return (
        int(hex_color[1:3], 16),
        int(hex_color[3:5], 16),
        int(hex_color[5:7], 16),
        alpha,
    )


def alpha_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    bounds = alpha.point(lambda value: 255 if value > ALPHA_THRESHOLD else 0).getbbox()
    if bounds is None:
        raise ValueError("Image has no visible alpha subject")
    return bounds


def scaled_box(box: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    return tuple(value * BUILD_SCALE for value in box)


def draw_medallion(
    overlay: Image.Image,
    base: Image.Image,
    icon: Image.Image,
    accent: str,
) -> None:
    disc_width = (DISC_BOX[2] - DISC_BOX[0]) * BUILD_SCALE
    disc_height = (DISC_BOX[3] - DISC_BOX[1]) * BUILD_SCALE
    texture = base.crop((105, 16, 350, 49)).convert("RGBA")
    texture = texture.resize((disc_width, disc_height), Image.Resampling.LANCZOS)
    texture = ImageEnhance.Brightness(texture).enhance(0.72)
    texture = texture.filter(ImageFilter.GaussianBlur(BUILD_SCALE * 0.7))

    mask = Image.new("L", overlay.size, 0)
    ImageDraw.Draw(mask).ellipse(scaled_box(DISC_BOX), fill=255)
    disc_layer = Image.new("RGBA", overlay.size, (0, 0, 0, 0))
    disc_layer.alpha_composite(texture, (DISC_BOX[0] * BUILD_SCALE, DISC_BOX[1] * BUILD_SCALE))
    disc_layer.putalpha(mask)
    overlay.alpha_composite(disc_layer)

    draw = ImageDraw.Draw(overlay)
    accent_rgba = rgba(accent, 176)
    draw.ellipse(
        scaled_box((10, 9, 84, 84)),
        outline=accent_rgba,
        width=2 * BUILD_SCALE,
    )
    draw.line(
        [(22 * BUILD_SCALE, 18 * BUILD_SCALE), (70 * BUILD_SCALE, 73 * BUILD_SCALE)],
        fill=rgba(accent, 32),
        width=BUILD_SCALE,
    )
    draw.line(
        [(72 * BUILD_SCALE, 19 * BUILD_SCALE), (21 * BUILD_SCALE, 72 * BUILD_SCALE)],
        fill=(212, 182, 122, 22),
        width=BUILD_SCALE,
    )

    subject = icon.crop(alpha_bounds(icon))
    max_size = 66 * BUILD_SCALE
    subject = subject.resize(
        (
            max(1, round(subject.width * min(max_size / subject.width, max_size / subject.height))),
            max(1, round(subject.height * min(max_size / subject.width, max_size / subject.height))),
        ),
        Image.Resampling.LANCZOS,
    )
    center_x = 47 * BUILD_SCALE
    center_y = 47 * BUILD_SCALE
    icon_x = center_x - subject.width // 2
    icon_y = center_y - subject.height // 2

    shadow_alpha = subject.getchannel("A").filter(ImageFilter.GaussianBlur(3 * BUILD_SCALE))
    shadow = Image.new("RGBA", subject.size, (0, 0, 0, 0))
    shadow.putalpha(shadow_alpha.point(lambda value: round(value * 0.55)))
    overlay.alpha_composite(shadow, (icon_x + BUILD_SCALE, icon_y + 2 * BUILD_SCALE))
    overlay.alpha_composite(subject, (icon_x, icon_y))


def draw_tier_accents(overlay: Image.Image, tier: int, accent: str) -> None:
    draw = ImageDraw.Draw(overlay)
    lit = rgba(accent, 238)
    dim = (92, 82, 66, 190)
    highlight = (250, 242, 208, 220)

    for index in range(7):
        cx = (PIP_START_X + index * PIP_STEP_X) * BUILD_SCALE
        cy = PIP_Y * BUILD_SCALE
        radius = 2.4 * BUILD_SCALE
        draw.ellipse(
            (cx - radius, cy - radius, cx + radius, cy + radius),
            fill=(5, 10, 14, 230),
            outline=(184, 147, 83, 190),
            width=BUILD_SCALE,
        )
        inner = radius - BUILD_SCALE
        draw.ellipse(
            (cx - inner, cy - inner, cx + inner, cy + inner),
            fill=lit if index < tier else dim,
        )
        if index < tier:
            draw.ellipse(
                (
                    cx - 0.8 * BUILD_SCALE,
                    cy - 1.2 * BUILD_SCALE,
                    cx,
                    cy - 0.4 * BUILD_SCALE,
                ),
                fill=highlight,
            )

    left, top, right, bottom = scaled_box(BAR_BOX)
    draw.rounded_rectangle(
        (left, top, right, bottom),
        radius=3 * BUILD_SCALE,
        outline=rgba(accent, 82),
        width=BUILD_SCALE,
    )
    for center_x in (174, 218, 262, 306):
        cx = center_x * BUILD_SCALE
        cy = 68.5 * BUILD_SCALE
        size = 5 * BUILD_SCALE
        draw.polygon(
            [(cx, cy - size), (cx + size, cy), (cx, cy + size), (cx - size, cy)],
            outline=rgba(accent, 34),
        )
    draw.line(
        [
            (338 * BUILD_SCALE, 59 * BUILD_SCALE),
            (348 * BUILD_SCALE, 68.5 * BUILD_SCALE),
            (338 * BUILD_SCALE, 78 * BUILD_SCALE),
        ],
        fill=rgba(accent, 202),
        width=2 * BUILD_SCALE,
        joint="curve",
    )
    draw.line(
        [
            (333 * BUILD_SCALE, 61 * BUILD_SCALE),
            (341 * BUILD_SCALE, 68.5 * BUILD_SCALE),
            (333 * BUILD_SCALE, 76 * BUILD_SCALE),
        ],
        fill=(216, 177, 98, 116),
        width=BUILD_SCALE,
        joint="curve",
    )


def build_overlay(base: Image.Image, icon_path: Path, output_path: Path, tier: int, accent: str) -> dict[str, object]:
    high_size = tuple(value * BUILD_SCALE for value in OVERLAY_SIZE)
    overlay = Image.new("RGBA", high_size, (0, 0, 0, 0))
    icon = Image.open(icon_path).convert("RGBA").resize(
        (256 * BUILD_SCALE, 256 * BUILD_SCALE),
        Image.Resampling.LANCZOS,
    )
    draw_medallion(overlay, base, icon, accent)
    draw_tier_accents(overlay, tier, accent)
    overlay = overlay.resize(OVERLAY_SIZE, Image.Resampling.LANCZOS)
    overlay.save(output_path, "PNG", optimize=True)

    alpha = overlay.getchannel("A")
    visible = sum(1 for value in alpha.get_flattened_data() if value > ALPHA_THRESHOLD)
    return {
        "dimensions": list(overlay.size),
        "alphaBounds": list(alpha_bounds(overlay)),
        "coverage": round(visible / (overlay.width * overlay.height), 5),
        "sha256": digest(output_path),
    }


def compose_panel(base: Image.Image, overlay: Image.Image, label: str, accent: str) -> Image.Image:
    panel = base.copy()
    draw = ImageDraw.Draw(panel)
    draw.rounded_rectangle((126, 58, 281, 79), radius=2, fill=(154, 97, 224, 255))
    draw.text((108, 18), "DEPTH 0 m", font=font(23, True), fill="#f4e8c8")
    draw.text((297, 19), label, font=font(10, True), fill=accent, anchor="ra")
    draw.text((132, 60), "GP 105 / 150", font=font(17, True), fill="#f4e8c8")
    panel.alpha_composite(overlay)
    return panel


def build_review(base: Image.Image, overlays: dict[str, Image.Image]) -> Path:
    canvas = Image.new("RGB", (1920, 760), "#070b0f")
    draw = ImageDraw.Draw(canvas)
    draw.text((960, 38), "PICKAXE HUD THEMES  •  PRODUCTION OVERLAYS V1", font=font(34, True), fill="#f0dfc2", anchor="mm")
    draw.text((960, 77), "Current tool stays visible  •  GP remains purple  •  low-GP warning colors remain authoritative", font=font(18), fill="#a8b1b5", anchor="mm")

    positions = ((30, 118), (504, 118), (978, 118), (1452, 118), (267, 385), (741, 385), (1215, 385))
    for (upgrade_id, _slug, label, _tier, accent), (x, y) in zip(TIERS, positions):
        panel = compose_panel(base, overlays[upgrade_id], label, accent)
        large = panel.resize((438, 98), Image.Resampling.LANCZOS)
        canvas.paste(large, (x, y), large)
        runtime = panel.resize((320, 71), Image.Resampling.LANCZOS)
        canvas.paste(runtime, (x + 59, y + 128), runtime)
        draw.text((x + 219, y + 224), f"{label}  •  320x71 RUNTIME READ", font=font(15, True), fill=accent, anchor="mm")

    output = OUTPUT_DIR / "pickaxe-hud-runtime-contact-sheet-v1.png"
    canvas.save(output, "PNG", optimize=True)
    return output


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    base = Image.open(BASE_HUD).convert("RGBA")
    if base.size != OVERLAY_SIZE:
        raise ValueError(f"Expected {OVERLAY_SIZE} HUD base, got {base.size}")

    manifest: dict[str, object] = {
        "version": 1,
        "generatedDate": "2026-07-28",
        "overlaySize": list(OVERLAY_SIZE),
        "approvedHudSource": relative(BASE_HUD),
        "approvedHudSourceSha256": digest(BASE_HUD),
        "assets": [],
    }
    overlays: dict[str, Image.Image] = {}
    for upgrade_id, slug, label, tier, accent in TIERS:
        icon_path = ICON_DIR / f"{slug}-pickaxe-v1.png"
        output_path = OUTPUT_DIR / f"{slug}-pickaxe-hud-overlay-v1.png"
        metrics = build_overlay(base, icon_path, output_path, tier, accent)
        overlays[upgrade_id] = Image.open(output_path).convert("RGBA")
        manifest["assets"].append(
            {
                "upgradeId": upgrade_id,
                "label": label,
                "tier": tier,
                "accent": accent,
                "icon": relative(icon_path),
                "iconSha256": digest(icon_path),
                "overlay": relative(output_path),
                **metrics,
            }
        )

    review_path = build_review(base, overlays)
    manifest["reviewSheet"] = relative(review_path)
    manifest["reviewSheetSha256"] = digest(review_path)
    manifest_path = OUTPUT_DIR / "pickaxe-hud-manifest-v1.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(TIERS)} pickaxe HUD overlays")
    print(f"Wrote {review_path}")
    print(f"Wrote {manifest_path}")


if __name__ == "__main__":
    main()
