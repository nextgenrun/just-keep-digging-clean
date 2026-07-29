"""Normalize the seven ImageGen pickaxes and build their visual review sheet."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "sprites" / "UI" / "pickaxe-icons-v1"
ICON_SIZE = 256
SUBJECT_SIZE = 232
ALPHA_THRESHOLD = 8
REVIEW_SIZE = (1920, 1080)

TIERS = (
    {
        "id": "bronzePickaxe",
        "slug": "bronze",
        "name": "BRONZE PICKAXE",
        "tier": "TIER I  •  HAND-FORGED",
        "accent": "#c47d42",
    },
    {
        "id": "ironPickaxe",
        "slug": "iron",
        "name": "IRON PICKAXE",
        "tier": "TIER II  •  INDUSTRIAL",
        "accent": "#aeb8c1",
    },
    {
        "id": "steelPickaxe",
        "slug": "steel",
        "name": "STEEL PICKAXE",
        "tier": "TIER III  •  PRECISION",
        "accent": "#d6e0e8",
    },
    {
        "id": "mithrilPickaxe",
        "slug": "mithril",
        "name": "MITHRIL PICKAXE",
        "tier": "TIER IV  •  MOON-SILVER",
        "accent": "#63d7e8",
    },
    {
        "id": "adamantPickaxe",
        "slug": "adamant",
        "name": "ADAMANT PICKAXE",
        "tier": "TIER V  •  DEEP-EARTH",
        "accent": "#45cf83",
    },
    {
        "id": "runePickaxe",
        "slug": "rune",
        "name": "RUNE PICKAXE",
        "tier": "TIER VI  •  ARCANE",
        "accent": "#a873ff",
    },
    {
        "id": "dragonPickaxe",
        "slug": "dragon",
        "name": "DRAGON PICKAXE",
        "tier": "TIER VII  •  LEGENDARY",
        "accent": "#f07b38",
    },
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


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value > ALPHA_THRESHOLD else 0)
    bounds = mask.getbbox()
    if bounds is None:
        raise ValueError("Transparent master contains no visible subject")
    return bounds


def normalize_icon(master_path: Path, output_path: Path) -> dict[str, object]:
    master = Image.open(master_path).convert("RGBA")
    source_bounds = alpha_bbox(master)
    subject = master.crop(source_bounds)
    subject.thumbnail((SUBJECT_SIZE, SUBJECT_SIZE), Image.Resampling.LANCZOS)

    icon = Image.new("RGBA", (ICON_SIZE, ICON_SIZE), (0, 0, 0, 0))
    offset = ((ICON_SIZE - subject.width) // 2, (ICON_SIZE - subject.height) // 2)
    icon.alpha_composite(subject, offset)
    runtime_bounds = alpha_bbox(icon)
    corners = (
        icon.getpixel((0, 0))[3],
        icon.getpixel((ICON_SIZE - 1, 0))[3],
        icon.getpixel((0, ICON_SIZE - 1))[3],
        icon.getpixel((ICON_SIZE - 1, ICON_SIZE - 1))[3],
    )
    if any(corners):
        raise ValueError(f"{output_path.name} has opaque corner pixels: {corners}")

    icon.save(output_path, "PNG", optimize=True)
    visible = sum(
        1
        for value in icon.getchannel("A").get_flattened_data()
        if value > ALPHA_THRESHOLD
    )
    return {
        "sourceDimensions": list(master.size),
        "sourceBounds": list(source_bounds),
        "runtimeDimensions": list(icon.size),
        "runtimeBounds": list(runtime_bounds),
        "runtimeCoverage": round(visible / (ICON_SIZE * ICON_SIZE), 5),
        "runtimeSha256": digest(output_path),
    }


def add_soft_icon_shadow(canvas: Image.Image, icon: Image.Image, x: int, y: int) -> None:
    shadow_alpha = icon.getchannel("A").filter(ImageFilter.GaussianBlur(14))
    shadow = Image.new("RGBA", icon.size, (0, 0, 0, 0))
    shadow.putalpha(shadow_alpha.point(lambda value: round(value * 0.58)))
    canvas.alpha_composite(shadow, (x + 8, y + 12))
    canvas.alpha_composite(icon, (x, y))


def draw_runtime_badge(
    canvas: Image.Image,
    draw: ImageDraw.ImageDraw,
    icon: Image.Image,
    x: int,
    y: int,
    accent: str,
) -> None:
    size = 74
    draw.rounded_rectangle(
        (x, y, x + size, y + size),
        radius=8,
        fill="#0b1015",
        outline=accent,
        width=2,
    )
    sample = icon.resize((58, 58), Image.Resampling.LANCZOS)
    canvas.alpha_composite(sample, (x + 8, y + 8))
    draw.text(
        (x + size + 12, y + size / 2),
        "64 PX UI READ",
        font=font(15, True),
        fill="#a8b1b5",
        anchor="lm",
    )


def draw_card(
    canvas: Image.Image,
    draw: ImageDraw.ImageDraw,
    tier: dict[str, str],
    icon: Image.Image,
    x: int,
    y: int,
) -> None:
    width = 414
    height = 402
    accent = tier["accent"]
    draw.rounded_rectangle(
        (x, y, x + width, y + height),
        radius=16,
        fill="#111a21",
        outline=accent,
        width=3,
    )
    draw.rounded_rectangle(
        (x + 10, y + 10, x + width - 10, y + height - 10),
        radius=12,
        outline="#4a4033",
        width=1,
    )
    for radius, opacity in ((114, 24), (88, 18), (62, 12)):
        glow = Image.new("RGBA", REVIEW_SIZE, (0, 0, 0, 0))
        glow_draw = ImageDraw.Draw(glow)
        color = tuple(int(accent[index:index + 2], 16) for index in (1, 3, 5))
        cx = x + width // 2
        cy = y + 153
        glow_draw.ellipse(
            (cx - radius, cy - radius, cx + radius, cy + radius),
            fill=(*color, opacity),
        )
        canvas.alpha_composite(glow)

    large = icon.resize((246, 246), Image.Resampling.LANCZOS)
    add_soft_icon_shadow(canvas, large, x + (width - 246) // 2, y + 29)
    draw.text(
        (x + width / 2, y + 286),
        tier["name"],
        font=font(24, True),
        fill="#f0dfc2",
        anchor="mm",
    )
    draw.text(
        (x + width / 2, y + 319),
        tier["tier"],
        font=font(15, True),
        fill=accent,
        anchor="mm",
    )
    draw_runtime_badge(canvas, draw, icon, x + 26, y + 342, accent)


def build_review_sheet(runtime_icons: dict[str, Image.Image]) -> Path:
    canvas = Image.new("RGBA", REVIEW_SIZE, "#070b0f")
    draw = ImageDraw.Draw(canvas)
    draw.text(
        (REVIEW_SIZE[0] / 2, 44),
        "PICKAXE PROGRESSION  •  UNIQUE ICON FAMILY V1",
        font=font(36, True),
        fill="#f0dfc2",
        anchor="mm",
    )
    draw.text(
        (REVIEW_SIZE[0] / 2, 88),
        "Seven gameplay tiers  •  one coherent silhouette language  •  runtime-scale proof included",
        font=font(19),
        fill="#a8b1b5",
        anchor="mm",
    )

    positions = (
        (81, 130),
        (529, 130),
        (977, 130),
        (1425, 130),
        (305, 574),
        (753, 574),
        (1201, 574),
    )
    for tier, position in zip(TIERS, positions):
        draw_card(canvas, draw, tier, runtime_icons[tier["id"]], *position)

    draw.text(
        (REVIEW_SIZE[0] / 2, 1038),
        "Exact transparent assets used by the Phaser merchant list and upgrade detail panel",
        font=font(17),
        fill="#6f7d83",
        anchor="mm",
    )
    output = ASSET_DIR / "pickaxe-progression-contact-sheet-v1.png"
    canvas.convert("RGB").save(output, "PNG", optimize=True)
    return output


def main() -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {
        "version": 1,
        "generatedDate": "2026-07-28",
        "iconSize": ICON_SIZE,
        "subjectEnvelope": SUBJECT_SIZE,
        "assets": [],
    }
    runtime_icons: dict[str, Image.Image] = {}
    for tier in TIERS:
        slug = tier["slug"]
        source = ASSET_DIR / f"2026-07-28-{slug}-pickaxe-chroma-source.png"
        master = ASSET_DIR / f"2026-07-28-{slug}-pickaxe-transparent-master.png"
        runtime = ASSET_DIR / f"{slug}-pickaxe-v1.png"
        for required in (source, master):
            if not required.exists():
                raise FileNotFoundError(required)
        metrics = normalize_icon(master, runtime)
        runtime_icons[tier["id"]] = Image.open(runtime).convert("RGBA")
        manifest["assets"].append(
            {
                "upgradeId": tier["id"],
                "name": tier["name"].title(),
                "source": relative(source),
                "sourceSha256": digest(source),
                "transparentMaster": relative(master),
                "transparentMasterSha256": digest(master),
                "runtime": relative(runtime),
                **metrics,
            }
        )

    review = build_review_sheet(runtime_icons)
    manifest["reviewSheet"] = relative(review)
    manifest["reviewSheetSha256"] = digest(review)
    manifest_path = ASSET_DIR / "pickaxe-icon-manifest-v1.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(TIERS)} runtime icons")
    print(f"Wrote {review}")
    print(f"Wrote {manifest_path}")


if __name__ == "__main__":
    main()
