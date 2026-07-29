"""Build organically feathered Titan chamber cards from approved ImageGen masters."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps


RUNTIME_SIZE = (1536, 848)
WEBP_QUALITY = 94
FEATHER_X_FRACTION = 0.16
FEATHER_Y_FRACTION = 0.22
FEATHER_IRREGULARITY = 0.18
OUTER_CLEAR_FRACTION = 0.025
CONTACT_COLUMNS = 5
CONTACT_CELL_SIZE = (320, 204)
CONTACT_CARD_SIZE = (292, 161)
CONTACT_LABEL = (220, 190, 116, 255)
DISCOVERED_PREVIEW_ALPHA = 0.82

BIOME_BY_INDEX = (
    "weathered-roots",
    "blue-caverns", "blue-caverns", "blue-caverns", "blue-caverns",
    "amber-depths", "amber-depths", "amber-depths", "amber-depths",
    "silver-core", "silver-core", "silver-core", "silver-core", "silver-core",
    "core-magma", "core-magma", "core-magma",
    "slagworks", "slagworks",
    "obsidian-catacombs", "obsidian-catacombs",
    "pressure-foundry",
    "blackglass-abyss", "blackglass-abyss",
    "starfire-rift",
)

BIOME_REFERENCE_PATHS = {
    "weathered-roots":
        "sprites/backgrounds/world-visual-v2/depth/biome-variation-v2/"
        "weathered-roots-root-canyon-v2.webp",
    "blue-caverns":
        "sprites/backgrounds/world-visual-v2/depth/biome-variation-v2/"
        "blue-caverns-crystal-ravine-v2.webp",
    "amber-depths":
        "sprites/backgrounds/world-visual-v2/depth/biome-variation-v2/"
        "amber-depths-amber-canyon-v2.webp",
    "silver-core":
        "sprites/backgrounds/world-visual-v2/depth/biome-variation-v2/"
        "silver-core-cleaved-silver-canyon-v2.webp",
    "core-magma":
        "sprites/backgrounds/world-visual-v2/depth/biome-variation-v2/"
        "core-magma-lava-ravine-v2.webp",
    "slagworks":
        "sprites/backgrounds/world-visual-v2/depth/biome-variation-v2/"
        "slagworks-slag-trench-v2.webp",
    "obsidian-catacombs":
        "sprites/backgrounds/world-visual-v2/depth/biome-variation-v2/"
        "obsidian-catacombs-glass-ravine-v2.webp",
    "pressure-foundry":
        "sprites/backgrounds/world-visual-v2/depth/biome-variation-v2/"
        "pressure-foundry-pressure-trench-v2.webp",
    "blackglass-abyss":
        "sprites/backgrounds/world-visual-v2/depth/biome-variation-v2/"
        "blackglass-abyss-mirror-chasm-v2.webp",
    "starfire-rift":
        "sprites/backgrounds/world-visual-v2/depth/biome-variation-v2/"
        "starfire-rift-cosmic-ravine-v2.webp",
}


def parse_args() -> argparse.Namespace:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=root)
    parser.add_argument(
        "--source-manifest",
        type=Path,
        default=Path(
            "sprites/backgrounds/titan-chambers-v2/"
            "2026-07-26-titan-chambers-production-manifest-v2.json"
        ),
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("sprites/backgrounds/titan-chambers-v3"),
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path(
            "sprites/backgrounds/titan-chambers-v3/"
            "2026-07-28-titan-chambers-production-manifest-v3.json"
        ),
    )
    parser.add_argument(
        "--contact-sheet",
        type=Path,
        default=Path(
            "visual-approval-previews/titan-chambers-production-v3/"
            "2026-07-28-titan-chambers-blended-contact-sheet-v3.png"
        ),
    )
    parser.add_argument(
        "--comparison",
        type=Path,
        default=Path(
            "visual-approval-previews/titan-chambers-production-v3/"
            "2026-07-28-mossback-seam-comparison-v3.png"
        ),
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-encode valid existing WebPs instead of resuming the build.",
    )
    return parser.parse_args()


def resolve(root: Path, path: Path | str) -> Path:
    candidate = Path(path)
    return candidate if candidate.is_absolute() else root / candidate


def relative(root: Path, path: Path) -> str:
    return path.resolve().relative_to(root.resolve()).as_posix()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def smooth_edge_noise(length: int, seed: int) -> np.ndarray:
    coordinate = np.linspace(0.0, 1.0, length, dtype=np.float32)
    rng = np.random.default_rng(seed)
    signal = np.zeros(length, dtype=np.float32)
    for frequency, weight in ((0.85, 0.52), (1.9, 0.29), (3.7, 0.19)):
        phase = rng.uniform(0.0, math.tau)
        drift = rng.uniform(0.88, 1.14)
        signal += weight * np.sin(
            math.tau * coordinate * frequency * drift + phase
        )
    maximum = float(np.max(np.abs(signal)))
    return signal / maximum if maximum > 0 else signal


def build_organic_alpha(index: int) -> Image.Image:
    width, height = RUNTIME_SIZE
    x = np.arange(width, dtype=np.float32)[None, :]
    y = np.arange(height, dtype=np.float32)[:, None]
    left_width = width * FEATHER_X_FRACTION * (
        1.0 + FEATHER_IRREGULARITY * smooth_edge_noise(height, index * 11 + 1)
    )
    right_width = width * FEATHER_X_FRACTION * (
        1.0 + FEATHER_IRREGULARITY * smooth_edge_noise(height, index * 11 + 2)
    )
    top_width = height * FEATHER_Y_FRACTION * (
        1.0 + FEATHER_IRREGULARITY * smooth_edge_noise(width, index * 11 + 3)
    )
    bottom_width = height * FEATHER_Y_FRACTION * (
        1.0 + FEATHER_IRREGULARITY * smooth_edge_noise(width, index * 11 + 4)
    )
    distance = np.minimum.reduce((
        x / left_width[:, None],
        (width - 1 - x) / right_width[:, None],
        y / top_width[None, :],
        (height - 1 - y) / bottom_width[None, :],
    ))
    transition = np.clip(
        (distance - OUTER_CLEAR_FRACTION)
        / (1.0 - OUTER_CLEAR_FRACTION),
        0.0,
        1.0,
    )
    smooth = transition * transition * (3.0 - 2.0 * transition)
    alpha = np.rint(np.power(smooth, 0.92) * 255.0).astype(np.uint8)
    return Image.fromarray(alpha, mode="L")


def build_card(source: Image.Image, index: int) -> Image.Image:
    normalized = ImageOps.fit(
        source.convert("RGB"),
        RUNTIME_SIZE,
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    ).convert("RGBA")
    normalized.putalpha(build_organic_alpha(index))
    return normalized


def alpha_metrics(card: Image.Image) -> dict[str, float | int]:
    alpha = np.asarray(card.getchannel("A"), dtype=np.uint8)
    height, width = alpha.shape
    border_x = max(1, round(width * 0.05))
    border_y = max(1, round(height * 0.05))
    edge = np.concatenate((
        alpha[:border_y, :].ravel(),
        alpha[-border_y:, :].ravel(),
        alpha[:, :border_x].ravel(),
        alpha[:, -border_x:].ravel(),
    ))
    center = alpha[
        round(height * 0.36):round(height * 0.64),
        round(width * 0.34):round(width * 0.66),
    ]
    return {
        "cornerAlphaMax": int(max(
            alpha[0, 0],
            alpha[0, -1],
            alpha[-1, 0],
            alpha[-1, -1],
        )),
        "edgeMeanAlpha": round(float(edge.mean()), 4),
        "centerMinAlpha": int(center.min()),
        "meanAlpha": round(float(alpha.mean()), 4),
        "transparentPixelRatio": round(float(np.mean(alpha == 0)), 6),
    }


def validate_card(card: Image.Image, titan_id: str) -> dict[str, float | int]:
    if card.size != RUNTIME_SIZE:
        raise ValueError(f"{titan_id}: expected {RUNTIME_SIZE}, got {card.size}")
    if card.mode != "RGBA":
        raise ValueError(f"{titan_id}: expected RGBA, got {card.mode}")
    metrics = alpha_metrics(card)
    if metrics["cornerAlphaMax"] != 0:
        raise ValueError(f"{titan_id}: corners must be transparent")
    if metrics["edgeMeanAlpha"] >= 72:
        raise ValueError(f"{titan_id}: outer edge is too opaque")
    if metrics["centerMinAlpha"] < 250:
        raise ValueError(f"{titan_id}: focal center must remain fully readable")
    if not 0.48 <= metrics["meanAlpha"] / 255 <= 0.82:
        raise ValueError(f"{titan_id}: suspicious alpha coverage")
    return metrics


def faded_for_preview(card: Image.Image) -> Image.Image:
    preview = card.copy()
    alpha = np.asarray(preview.getchannel("A"), dtype=np.float32)
    alpha = np.rint(alpha * DISCOVERED_PREVIEW_ALPHA).astype(np.uint8)
    preview.putalpha(Image.fromarray(alpha, mode="L"))
    return preview


def load_biome_preview(root: Path, biome: str, size: tuple[int, int]) -> Image.Image:
    with Image.open(root / BIOME_REFERENCE_PATHS[biome]) as image:
        return ImageOps.fit(
            image.convert("RGBA"),
            size,
            method=Image.Resampling.LANCZOS,
        )


def build_contact_sheet(
    root: Path,
    cards: list[tuple[int, str, str, Image.Image]],
) -> Image.Image:
    rows = math.ceil(len(cards) / CONTACT_COLUMNS)
    sheet = Image.new(
        "RGBA",
        (CONTACT_COLUMNS * CONTACT_CELL_SIZE[0], rows * CONTACT_CELL_SIZE[1]),
        (3, 8, 14, 255),
    )
    draw = ImageDraw.Draw(sheet)
    for cell_index, (index, titan_id, biome, card) in enumerate(cards):
        column = cell_index % CONTACT_COLUMNS
        row = cell_index // CONTACT_COLUMNS
        left = column * CONTACT_CELL_SIZE[0]
        top = row * CONTACT_CELL_SIZE[1]
        backdrop = load_biome_preview(root, biome, CONTACT_CARD_SIZE)
        foreground = ImageOps.fit(
            faded_for_preview(card),
            CONTACT_CARD_SIZE,
            method=Image.Resampling.LANCZOS,
        )
        backdrop.alpha_composite(foreground)
        sheet.alpha_composite(backdrop, (left + 14, top + 8))
        draw.text(
            (left + 14, top + CONTACT_CARD_SIZE[1] + 16),
            f"{index:02d}  {titan_id.replace('-', ' ').upper()}",
            fill=CONTACT_LABEL,
        )
    return sheet


def build_comparison(
    root: Path,
    original: Image.Image,
    blended: Image.Image,
) -> Image.Image:
    panel_size = (768, 424)
    card_size = (648, 358)
    canvas = Image.new("RGBA", (panel_size[0] * 2, panel_size[1]), (3, 8, 14, 255))
    for panel_index, (label, card) in enumerate((
        ("V2 OPAQUE CARD", original.convert("RGBA")),
        ("V3 ORGANIC FEATHER", blended),
    )):
        panel = load_biome_preview(root, "weathered-roots", panel_size)
        foreground = ImageOps.fit(
            card,
            card_size,
            method=Image.Resampling.LANCZOS,
        )
        if panel_index == 0:
            foreground.putalpha(round(255 * DISCOVERED_PREVIEW_ALPHA))
        else:
            foreground = faded_for_preview(foreground)
        panel.alpha_composite(
            foreground,
            (
                (panel_size[0] - card_size[0]) // 2,
                (panel_size[1] - card_size[1]) // 2,
            ),
        )
        draw = ImageDraw.Draw(panel)
        draw.rectangle((16, 14, 238, 42), fill=(4, 10, 18, 214))
        draw.text((26, 22), label, fill=CONTACT_LABEL)
        canvas.alpha_composite(panel, (panel_index * panel_size[0], 0))
    return canvas


def main() -> int:
    args = parse_args()
    root = args.root.resolve()
    source_manifest_path = resolve(root, args.source_manifest)
    output_dir = resolve(root, args.out_dir)
    manifest_path = resolve(root, args.manifest)
    contact_sheet_path = resolve(root, args.contact_sheet)
    comparison_path = resolve(root, args.comparison)
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    contact_sheet_path.parent.mkdir(parents=True, exist_ok=True)
    comparison_path.parent.mkdir(parents=True, exist_ok=True)

    source_manifest = json.loads(source_manifest_path.read_text(encoding="utf-8"))
    cards: list[tuple[int, str, str, Image.Image]] = []
    entries: list[dict[str, object]] = []
    first_original: Image.Image | None = None

    for item in source_manifest["cards"]:
        index = int(item["index"])
        titan_id = str(item["id"])
        biome = BIOME_BY_INDEX[index - 1]
        source_path = resolve(root, item["source"])
        destination = output_dir / f"{index:02d}-{titan_id}-chamber-v3.webp"
        with Image.open(source_path) as source:
            source_size = source.size
            original = ImageOps.fit(
                source.convert("RGB"),
                RUNTIME_SIZE,
                method=Image.Resampling.LANCZOS,
            )
            card = build_card(source, index)
        metrics = validate_card(card, titan_id)
        encoded_metrics = None
        if destination.exists() and destination.stat().st_size > 0 and not args.force:
            try:
                with Image.open(destination) as encoded:
                    encoded_metrics = validate_card(encoded.convert("RGBA"), titan_id)
            except (OSError, ValueError):
                encoded_metrics = None
        if encoded_metrics is None:
            card.save(
                destination,
                "WEBP",
                quality=WEBP_QUALITY,
                method=6,
                exact=True,
            )
            with Image.open(destination) as encoded:
                encoded_card = encoded.convert("RGBA")
                encoded_metrics = validate_card(encoded_card, titan_id)
        cards.append((index, titan_id, biome, card))
        entries.append({
            "index": index,
            "id": titan_id,
            "biome": biome,
            "source": relative(root, source_path),
            "sourceSize": list(source_size),
            "runtime": relative(root, destination),
            "runtimeSize": list(RUNTIME_SIZE),
            **encoded_metrics,
            "sha256": sha256(destination),
            "bytes": destination.stat().st_size,
        })
        if first_original is None:
            first_original = original

    if len(entries) != 25 or len(cards) != len(BIOME_BY_INDEX):
        raise ValueError(f"Expected 25 Titan chamber cards, built {len(entries)}")

    build_contact_sheet(root, cards).save(contact_sheet_path, "PNG", optimize=True)
    build_comparison(root, first_original, cards[0][3]).save(
        comparison_path,
        "PNG",
        optimize=True,
    )
    manifest_path.write_text(
        json.dumps({
            "schemaVersion": 1,
            "sourceGenerationMode": "built-in ImageGen",
            "sourceVersion": "titan-chambers-v2",
            "runtimeVersion": "titan-chambers-v3",
            "transformation":
                "organic alpha feather over approved ImageGen chamber masters",
            "runtimeSize": list(RUNTIME_SIZE),
            "webpQuality": WEBP_QUALITY,
            "feather": {
                "horizontalFraction": FEATHER_X_FRACTION,
                "verticalFraction": FEATHER_Y_FRACTION,
                "irregularity": FEATHER_IRREGULARITY,
                "outerClearFraction": OUTER_CLEAR_FRACTION,
            },
            "complete": True,
            "count": len(entries),
            "cards": entries,
        }, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Built {len(entries)} organically feathered Titan chamber cards")
    print(f"Contact sheet: {relative(root, contact_sheet_path)}")
    print(f"Comparison: {relative(root, comparison_path)}")
    print(f"Manifest: {relative(root, manifest_path)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
