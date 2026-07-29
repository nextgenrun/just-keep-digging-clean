"""Promote 25 ImageGen Titan Walk stance masters into transparent runtime WebPs."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw


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

RUNTIME_SIZE = 768
SUBJECT_MAX_SIZE = 720
SUBJECT_BASELINE = 744
ALPHA_THRESHOLD = 8
WEBP_QUALITY = 94
CONTACT_COLUMNS = 5
CONTACT_CELL_SIZE = (256, 280)
CONTACT_PREVIEW_SIZE = 232
CONTACT_BACKGROUND = (4, 10, 18, 255)
CONTACT_CELL = (9, 20, 32, 255)
CONTACT_LABEL = (203, 174, 105, 255)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--contact-sheet", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    return parser.parse_args()


def source_path(source_dir: Path, index: int, titan_id: str) -> Path:
    return source_dir / (
        f"2026-07-28-{index:02d}-{titan_id}-surface-stance-alpha-v1.png"
    )


def runtime_path(out_dir: Path, index: int, titan_id: str) -> Path:
    return out_dir / f"{index:02d}-{titan_id}-surface-stance-v1.webp"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalize_stance(source: Image.Image, titan_id: str) -> tuple[Image.Image, tuple[int, ...]]:
    rgba = source.convert("RGBA")
    alpha = rgba.getchannel("A")
    bounds = alpha.point(
        lambda value: 255 if value > ALPHA_THRESHOLD else 0
    ).getbbox()
    if not bounds:
        raise ValueError(f"{titan_id}: alpha master contains no visible subject")

    subject = rgba.crop(bounds)
    scale = min(
        SUBJECT_MAX_SIZE / max(1, subject.width),
        SUBJECT_MAX_SIZE / max(1, subject.height),
    )
    resized = subject.resize(
        (
            max(1, round(subject.width * scale)),
            max(1, round(subject.height * scale)),
        ),
        Image.Resampling.LANCZOS,
    )
    output = Image.new(
        "RGBA",
        (RUNTIME_SIZE, RUNTIME_SIZE),
        (0, 0, 0, 0),
    )
    left = (RUNTIME_SIZE - resized.width) // 2
    top = max(0, SUBJECT_BASELINE - resized.height)
    output.alpha_composite(resized, (left, top))
    return output, bounds


def validate_stance(image: Image.Image, titan_id: str) -> float:
    if image.size != (RUNTIME_SIZE, RUNTIME_SIZE) or image.mode != "RGBA":
        raise ValueError(f"{titan_id}: invalid runtime geometry or mode")
    alpha = image.getchannel("A")
    visible = sum(alpha.histogram()[ALPHA_THRESHOLD + 1:])
    coverage = visible / float(RUNTIME_SIZE * RUNTIME_SIZE)
    if not 0.025 <= coverage <= 0.72:
        raise ValueError(f"{titan_id}: suspicious alpha coverage {coverage:.4f}")
    corners = (
        (0, 0),
        (RUNTIME_SIZE - 1, 0),
        (0, RUNTIME_SIZE - 1),
        (RUNTIME_SIZE - 1, RUNTIME_SIZE - 1),
    )
    if any(image.getpixel(point)[3] for point in corners):
        raise ValueError(f"{titan_id}: runtime corners must be transparent")
    return coverage


def build_contact_sheet(
    stances: list[tuple[int, str, Image.Image]],
) -> Image.Image:
    rows = math.ceil(len(stances) / CONTACT_COLUMNS)
    sheet = Image.new(
        "RGBA",
        (
            CONTACT_COLUMNS * CONTACT_CELL_SIZE[0],
            rows * CONTACT_CELL_SIZE[1],
        ),
        CONTACT_BACKGROUND,
    )
    draw = ImageDraw.Draw(sheet)
    for cell_index, (titan_index, titan_id, stance) in enumerate(stances):
        column = cell_index % CONTACT_COLUMNS
        row = cell_index // CONTACT_COLUMNS
        left = column * CONTACT_CELL_SIZE[0]
        top = row * CONTACT_CELL_SIZE[1]
        draw.rounded_rectangle(
            (
                left + 6,
                top + 6,
                left + CONTACT_CELL_SIZE[0] - 6,
                top + CONTACT_CELL_SIZE[1] - 6,
            ),
            radius=16,
            fill=CONTACT_CELL,
        )
        preview = stance.copy()
        preview.thumbnail(
            (CONTACT_PREVIEW_SIZE, CONTACT_PREVIEW_SIZE),
            Image.Resampling.LANCZOS,
        )
        sheet.alpha_composite(
            preview,
            (
                left + (CONTACT_CELL_SIZE[0] - preview.width) // 2,
                top + 12 + (CONTACT_PREVIEW_SIZE - preview.height) // 2,
            ),
        )
        draw.text(
            (left + 12, top + 248),
            f"{titan_index:02d} {titan_id.replace('-', ' ').upper()}",
            fill=CONTACT_LABEL,
        )
    return sheet


def main() -> int:
    args = parse_args()
    args.out_dir.mkdir(parents=True, exist_ok=True)
    args.contact_sheet.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.parent.mkdir(parents=True, exist_ok=True)

    stances: list[tuple[int, str, Image.Image]] = []
    entries: list[dict[str, object]] = []
    for index, titan_id in enumerate(TITAN_IDS, start=1):
        source = source_path(args.source_dir, index, titan_id)
        if not source.exists():
            raise FileNotFoundError(source)
        with Image.open(source) as source_image:
            source_size = source_image.size
            stance, source_bounds = normalize_stance(source_image, titan_id)
        coverage = validate_stance(stance, titan_id)
        destination = runtime_path(args.out_dir, index, titan_id)
        stance.save(
            destination,
            "WEBP",
            quality=WEBP_QUALITY,
            method=6,
            exact=True,
        )
        with Image.open(destination) as encoded:
            if encoded.size != (RUNTIME_SIZE, RUNTIME_SIZE):
                raise ValueError(f"{titan_id}: encoded size mismatch")
            if encoded.format != "WEBP" or "A" not in encoded.getbands():
                raise ValueError(f"{titan_id}: encoded runtime must be alpha WebP")
        stances.append((index, titan_id, stance))
        entries.append({
            "index": index,
            "id": titan_id,
            "source": source.as_posix(),
            "sourceSize": list(source_size),
            "sourceAlphaBounds": list(source_bounds),
            "runtime": destination.as_posix(),
            "runtimeSize": [RUNTIME_SIZE, RUNTIME_SIZE],
            "alphaCoverage": round(coverage, 6),
            "sha256": sha256(destination),
            "bytes": destination.stat().st_size,
        })

    build_contact_sheet(stances).save(args.contact_sheet, "PNG", optimize=True)
    args.manifest.write_text(
        json.dumps({
            "schemaVersion": 1,
            "generationMode": "built-in ImageGen",
            "count": len(entries),
            "complete": len(entries) == len(TITAN_IDS),
            "runtimeSize": [RUNTIME_SIZE, RUNTIME_SIZE],
            "webpQuality": WEBP_QUALITY,
            "stances": entries,
        }, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Built {len(entries)} Titan surface stances")
    print(f"Contact sheet: {args.contact_sheet}")
    print(f"Manifest: {args.manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
