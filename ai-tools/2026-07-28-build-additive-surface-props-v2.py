"""Build the seven additive surface-prop cutouts and their review sheet."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = PROJECT_ROOT / "sprites" / "environment" / "surface-props-v2"
ALPHA_ROOT = ASSET_ROOT / "sources" / "alpha-masters"
EXISTING_ROOT = PROJECT_ROOT / "sprites" / "environment" / "surface-props-v1"
REVIEW_ROOT = PROJECT_ROOT / "visual-approval-previews" / "surface-props-v2-additive-runtime"

MAX_OUTPUT_WIDTH_PX = 1024
MAX_SUBJECT_HEIGHT_PX = 640
ALPHA_BBOX_THRESHOLD = 8
SIDE_PADDING_PX = 14
TOP_PADDING_PX = 14
REVIEW_PIXELS_PER_METER = 90

NEW_ASSETS = (
    {
        "id": "forgeShelter",
        "label": "Arrival Forge Shelter",
        "slug": "forge-shelter",
        "heightMeters": 3.10,
        "clearOpeningMeters": 2.20,
        "visualInfluenceRadiusTiles": 3.15,
    },
    {
        "id": "campKitchen",
        "label": "Caravan Camp Kitchen",
        "slug": "camp-kitchen",
        "heightMeters": 2.70,
        "clearOpeningMeters": 2.20,
        "visualInfluenceRadiusTiles": 3.10,
    },
    {
        "id": "herbStation",
        "label": "Starwell Herb Station",
        "slug": "herb-station",
        "heightMeters": 1.65,
        "visualInfluenceRadiusTiles": 2.65,
    },
    {
        "id": "timberGantry",
        "label": "Timberwright Gantry",
        "slug": "timber-gantry",
        "heightMeters": 3.30,
        "clearOpeningMeters": 2.35,
        "visualInfluenceRadiusTiles": 3.25,
    },
    {
        "id": "observatory",
        "label": "Heavenblocks Observatory",
        "slug": "observatory",
        "heightMeters": 2.00,
        "visualInfluenceRadiusTiles": 2.85,
    },
    {
        "id": "surveyStation",
        "label": "Frontier Survey Station",
        "slug": "survey-station",
        "heightMeters": 1.90,
        "visualInfluenceRadiusTiles": 2.75,
    },
    {
        "id": "expeditionShelter",
        "label": "Far-East Expedition Shelter",
        "slug": "expedition-shelter",
        "heightMeters": 3.20,
        "clearOpeningMeters": 2.20,
        "visualInfluenceRadiusTiles": 3.45,
    },
)

EXISTING_ASSETS = (
    ("well", "Existing Well", 2.50),
    ("wagon", "Existing Wagon", 2.35),
    ("pergola", "Existing Pergola", 2.40),
    ("bench", "Existing Bench", 0.95),
    ("handcart", "Existing Handcart", 1.10),
    ("supplies", "Existing Supplies", 1.10),
    ("fence", "Existing Fence", 0.78),
    ("plants", "Existing Plants", 0.68),
    ("lantern", "Existing Lantern", 2.25),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value > ALPHA_BBOX_THRESHOLD else 0)
    bbox = mask.getbbox()
    if bbox is None:
        raise RuntimeError("Alpha master contains no visible subject")
    return bbox


def build_runtime_asset(definition: dict) -> dict:
    slug = definition["slug"]
    source_path = ALPHA_ROOT / f"2026-07-28-level2-{slug}-alpha-v1.png"
    output_path = ASSET_ROOT / f"level2-{slug}-v2.webp"
    if not source_path.exists():
        raise FileNotFoundError(source_path)

    with Image.open(source_path) as opened:
        image = opened.convert("RGBA")
    source_size = image.size
    left, top, right, bottom = alpha_bbox(image)
    subject = image.crop((left, top, right, bottom))

    canvas = Image.new(
        "RGBA",
        (subject.width + SIDE_PADDING_PX * 2, subject.height + TOP_PADDING_PX),
        (0, 0, 0, 0),
    )
    canvas.alpha_composite(subject, (SIDE_PADDING_PX, TOP_PADDING_PX))
    scale = min(
        1.0,
        MAX_OUTPUT_WIDTH_PX / canvas.width,
        MAX_SUBJECT_HEIGHT_PX / subject.height,
    )
    if scale < 1:
        canvas = canvas.resize(
            (
                max(1, round(canvas.width * scale)),
                max(1, round(canvas.height * scale)),
            ),
            Image.Resampling.LANCZOS,
        )

    final_bbox = alpha_bbox(canvas)
    if final_bbox[3] != canvas.height:
        raise RuntimeError(f"{slug}: bottom contact was lost during processing")
    alpha = canvas.getchannel("A")
    corners = (
        alpha.getpixel((0, 0)),
        alpha.getpixel((canvas.width - 1, 0)),
        alpha.getpixel((0, canvas.height - 1)),
        alpha.getpixel((canvas.width - 1, canvas.height - 1)),
    )
    if any(corners):
        raise RuntimeError(f"{slug}: transparent-corner contract failed: {corners}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path, "WEBP", lossless=True, quality=100, method=6)
    alpha_histogram = alpha.histogram()

    return {
        **definition,
        "sourceAlphaPath": source_path.relative_to(PROJECT_ROOT).as_posix(),
        "runtimePath": output_path.relative_to(PROJECT_ROOT).as_posix(),
        "sourceAlphaDimensions": {"width": source_size[0], "height": source_size[1]},
        "runtimeDimensions": {"width": canvas.width, "height": canvas.height},
        "runtimeSubjectBounds": {
            "left": final_bbox[0],
            "top": final_bbox[1],
            "right": final_bbox[2],
            "bottom": final_bbox[3],
        },
        "visiblePixels": sum(alpha_histogram[ALPHA_BBOX_THRESHOLD + 1 :]),
        "partiallyTransparentPixels": sum(alpha_histogram[1:255]),
        "sha256": sha256(output_path),
    }


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = (
        Path("C:/Windows/Fonts/arialbd.ttf") if bold else Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf") if bold else Path("C:/Windows/Fonts/segoeui.ttf"),
    )
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


def draw_review_card(
    board: Image.Image,
    rect: tuple[int, int, int, int],
    path: Path,
    label: str,
    height_meters: float,
    badge: str,
) -> None:
    left, top, right, bottom = rect
    draw = ImageDraw.Draw(board)
    draw.rounded_rectangle(
        rect,
        radius=10,
        fill=(13, 25, 34, 255),
        outline=(75, 102, 118, 255),
        width=2,
    )
    title_font = load_font(23, bold=True)
    detail_font = load_font(18)
    badge_font = load_font(16, bold=True)
    draw.text((left + 18, top + 14), label, font=title_font, fill=(245, 218, 145, 255))
    draw.text(
        (left + 18, top + 48),
        f"{height_meters:.2f} m physical height",
        font=detail_font,
        fill=(170, 201, 218, 255),
    )
    badge_width = draw.textbbox((0, 0), badge, font=badge_font)[2] + 22
    draw.rounded_rectangle(
        (right - badge_width - 16, top + 14, right - 16, top + 43),
        radius=7,
        fill=(39, 68, 78, 255) if badge == "EXISTING" else (84, 54, 31, 255),
    )
    draw.text(
        (right - badge_width - 5, top + 19),
        badge,
        font=badge_font,
        fill=(225, 235, 239, 255),
    )

    ground_y = bottom - 32
    draw.line(
        (left + 16, ground_y, right - 16, ground_y),
        fill=(147, 121, 77, 255),
        width=2,
    )
    ruler_x = left + 26
    ruler_height = round(1.75 * REVIEW_PIXELS_PER_METER)
    draw.line(
        (ruler_x, ground_y - ruler_height, ruler_x, ground_y),
        fill=(101, 218, 248, 255),
        width=3,
    )
    draw.line(
        (ruler_x - 8, ground_y - ruler_height, ruler_x + 8, ground_y - ruler_height),
        fill=(101, 218, 248, 255),
        width=2,
    )
    draw.line(
        (ruler_x - 8, ground_y, ruler_x + 8, ground_y),
        fill=(101, 218, 248, 255),
        width=2,
    )
    draw.text(
        (ruler_x + 10, ground_y - ruler_height - 5),
        "1.75 m",
        font=detail_font,
        fill=(153, 225, 245, 255),
    )

    with Image.open(path) as opened:
        prop = opened.convert("RGBA")
    display_height = max(1, round(height_meters * REVIEW_PIXELS_PER_METER))
    display_width = max(1, round(prop.width * display_height / prop.height))
    available_width = right - left - 120
    available_height = bottom - top - 98
    scale = min(1.0, available_width / display_width, available_height / display_height)
    display_width = max(1, round(display_width * scale))
    display_height = max(1, round(display_height * scale))
    prop = prop.resize((display_width, display_height), Image.Resampling.LANCZOS)
    prop_x = left + 88 + max(0, (available_width - display_width) // 2)
    prop_y = ground_y - display_height
    board.alpha_composite(prop, (prop_x, prop_y))


def build_review_sheet(runtime_assets: list[dict]) -> Path:
    entries = [
        {
            "path": EXISTING_ROOT / f"level2-{slug}-v2.webp",
            "label": label,
            "heightMeters": height,
            "badge": "EXISTING",
        }
        for slug, label, height in EXISTING_ASSETS
    ]
    entries.extend(
        {
            "path": PROJECT_ROOT / item["runtimePath"],
            "label": item["label"],
            "heightMeters": item["heightMeters"],
            "badge": "ADDITIVE",
        }
        for item in runtime_assets
    )

    columns = 4
    card_width = 600
    card_height = 390
    header_height = 116
    rows = (len(entries) + columns - 1) // columns
    board = Image.new(
        "RGBA",
        (columns * card_width, header_height + rows * card_height),
        (5, 15, 23, 255),
    )
    draw = ImageDraw.Draw(board)
    draw.text(
        (30, 20),
        "SURFACE PROP KIT V2 — ADDITIVE, NOT REPLACEMENT",
        font=load_font(34, bold=True),
        fill=(247, 217, 137, 255),
    )
    draw.text(
        (31, 68),
        "Existing production set + seven moon-free ImageGen chapter anchors · 1.75 m scale",
        font=load_font(22),
        fill=(165, 201, 220, 255),
    )

    for index, entry in enumerate(entries):
        column = index % columns
        row = index // columns
        x = column * card_width + 4
        y = header_height + row * card_height + 4
        draw_review_card(
            board,
            (x, y, x + card_width - 8, y + card_height - 8),
            entry["path"],
            entry["label"],
            entry["heightMeters"],
            entry["badge"],
        )

    REVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    output_path = REVIEW_ROOT / "2026-07-28-existing-plus-additive-prop-scale-sheet-v2.png"
    board.convert("RGB").save(output_path, "PNG", optimize=True)
    return output_path


def main() -> None:
    ASSET_ROOT.mkdir(parents=True, exist_ok=True)
    runtime_assets = [build_runtime_asset(definition) for definition in NEW_ASSETS]
    review_path = build_review_sheet(runtime_assets)
    manifest = {
        "version": "surface-props-v2-additive-runtime",
        "date": "2026-07-28",
        "generator": "built-in ImageGen plus installed chroma-key helper",
        "additive": True,
        "replacesExistingAssets": False,
        "backgroundChanged": False,
        "bakedCelestialBodies": False,
        "runtimeAssetCount": len(runtime_assets),
        "reviewSheet": review_path.relative_to(PROJECT_ROOT).as_posix(),
        "assets": runtime_assets,
    }
    manifest_path = ASSET_ROOT / "2026-07-28-surface-props-v2-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(
        f"Built {len(runtime_assets)} additive surface props and "
        f"{review_path.relative_to(PROJECT_ROOT).as_posix()}"
    )


if __name__ == "__main__":
    main()
