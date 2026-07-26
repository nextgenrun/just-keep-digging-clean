"""Normalize ImageGen Titan chamber masters into streamed Phaser WebP cards."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


TITAN_IDS = (
    "mossback-wanderer",
    "bellhorn-grazer",
    "lantern-jaw",
    "archwalker",
    "shale-mother",
    "ribbon-wyrm",
    "crowned-mole",
    "hammerhead-pilgrim",
    "cathedral-stag",
    "hollowback-bear",
    "silver-strider",
    "mirror-ray",
    "needlecrown",
    "moon-shell",
    "veilwing",
    "ember-tusk",
    "furnace-drake",
    "ash-colossus",
    "magma-whale",
    "cinder-centipede",
    "obsidian-sleeper",
    "rift-heron",
    "star-eater",
    "deep-crown",
    "worldroot-titan",
)

RUNTIME_SIZE = (1536, 848)
CONTACT_COLUMNS = 5
CONTACT_CELL_SIZE = (320, 204)
CONTACT_CARD_SIZE = (304, 168)
CONTACT_BACKGROUND = (4, 10, 18)
CONTACT_LABEL = (203, 174, 105)
WEBP_QUALITY = 92


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--contact-sheet", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--allow-partial", action="store_true")
    return parser.parse_args()


def source_path(source_dir: Path, index: int, titan_id: str) -> Path:
    return source_dir / f"2026-07-26-{index:02d}-{titan_id}-imagegen-v2.png"


def runtime_path(out_dir: Path, index: int, titan_id: str) -> Path:
    return out_dir / f"{index:02d}-{titan_id}-chamber-v2.webp"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalize_card(source: Image.Image) -> Image.Image:
    rgb = source.convert("RGB")
    return ImageOps.fit(
        rgb,
        RUNTIME_SIZE,
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )


def validate_card(card: Image.Image, titan_id: str) -> None:
    if card.size != RUNTIME_SIZE:
        raise ValueError(f"{titan_id}: expected {RUNTIME_SIZE}, got {card.size}")
    if card.mode != "RGB":
        raise ValueError(f"{titan_id}: expected opaque RGB, got {card.mode}")
    extrema = card.getextrema()
    if all(low == high for low, high in extrema):
        raise ValueError(f"{titan_id}: generated card is a flat color")


def build_contact_sheet(cards: list[tuple[int, str, Image.Image]]) -> Image.Image:
    rows = max(1, math.ceil(len(cards) / CONTACT_COLUMNS))
    sheet = Image.new(
        "RGB",
        (CONTACT_COLUMNS * CONTACT_CELL_SIZE[0], rows * CONTACT_CELL_SIZE[1]),
        CONTACT_BACKGROUND,
    )
    draw = ImageDraw.Draw(sheet)
    for cell_index, (titan_index, titan_id, card) in enumerate(cards):
        column = cell_index % CONTACT_COLUMNS
        row = cell_index // CONTACT_COLUMNS
        left = column * CONTACT_CELL_SIZE[0]
        top = row * CONTACT_CELL_SIZE[1]
        preview = ImageOps.fit(
            card,
            CONTACT_CARD_SIZE,
            method=Image.Resampling.LANCZOS,
        )
        sheet.paste(preview, (left + 8, top + 8))
        draw.text(
            (left + 10, top + CONTACT_CARD_SIZE[1] + 14),
            f"{titan_index:02d}  {titan_id.replace('-', ' ').upper()}",
            fill=CONTACT_LABEL,
        )
    return sheet


def main() -> int:
    args = parse_args()
    args.out_dir.mkdir(parents=True, exist_ok=True)
    args.contact_sheet.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    cards: list[tuple[int, str, Image.Image]] = []
    entries: list[dict[str, object]] = []

    for index, titan_id in enumerate(TITAN_IDS, start=1):
        source = source_path(args.source_dir, index, titan_id)
        if not source.exists():
            if args.allow_partial:
                continue
            raise FileNotFoundError(source)
        destination = runtime_path(args.out_dir, index, titan_id)
        with Image.open(source) as image:
            source_size = image.size
            card = normalize_card(image)
        validate_card(card, titan_id)
        card.save(
            destination,
            "WEBP",
            quality=WEBP_QUALITY,
            method=6,
            exact=True,
        )
        with Image.open(destination) as encoded:
            if encoded.size != RUNTIME_SIZE or encoded.format != "WEBP":
                raise ValueError(f"{titan_id}: encoded runtime validation failed")
        cards.append((index, titan_id, card))
        entries.append({
            "index": index,
            "id": titan_id,
            "source": source.as_posix(),
            "sourceSize": list(source_size),
            "runtime": destination.as_posix(),
            "runtimeSize": list(RUNTIME_SIZE),
            "sha256": sha256(destination),
            "bytes": destination.stat().st_size,
        })

    if not cards:
        raise ValueError("No Titan chamber sources were found")
    build_contact_sheet(cards).save(args.contact_sheet, "PNG", optimize=True)
    args.manifest.write_text(
        json.dumps({
            "schemaVersion": 1,
            "runtimeSize": list(RUNTIME_SIZE),
            "webpQuality": WEBP_QUALITY,
            "complete": len(entries) == len(TITAN_IDS),
            "count": len(entries),
            "cards": entries,
        }, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Built {len(entries)} Titan chamber cards")
    print(f"Contact sheet: {args.contact_sheet}")
    print(f"Manifest: {args.manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
