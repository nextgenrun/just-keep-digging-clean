"""Split five transparent milestone-pillar progression sheets into stage assets."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "visual-approval-previews" / "milestone-pillar-concepts-v1"
ALPHA_THRESHOLD = 20
MERGE_GAP_PX = 8
PADDING_PX = 18
STAGE_DEPTHS = (0, 400, 800, 1200, 1600)

OPTIONS = (
    ("a", "Carved Slate Depth Chronicle", "option-a-carved-slate-depth-chronicle.png"),
    ("b", "Living Crystal Strata", "option-b-living-crystal-strata.png"),
    ("c", "Dwarven Depth Engine", "option-c-dwarven-depth-engine.png"),
    ("d", "Ancient Root Rune Cairn", "option-d-ancient-root-rune-cairn.png"),
    ("e", "Starforge Abyss Obelisk", "option-e-starforge-abyss-obelisk.png"),
)


def occupied_column_spans(alpha: Image.Image) -> list[tuple[int, int]]:
    pixels = alpha.load()
    occupied = [
        any(pixels[x, y] > ALPHA_THRESHOLD for y in range(alpha.height))
        for x in range(alpha.width)
    ]
    spans: list[tuple[int, int]] = []
    start: int | None = None
    for x, is_occupied in enumerate(occupied):
        if is_occupied and start is None:
            start = x
        elif not is_occupied and start is not None:
            spans.append((start, x - 1))
            start = None
    if start is not None:
        spans.append((start, alpha.width - 1))

    merged: list[list[int]] = []
    for left, right in spans:
        if merged and left - merged[-1][1] - 1 <= MERGE_GAP_PX:
            merged[-1][1] = right
        else:
            merged.append([left, right])
    return [(left, right) for left, right in merged if right - left >= 30]


def crop_stage(image: Image.Image, span: tuple[int, int]) -> tuple[Image.Image, tuple[int, int, int, int]]:
    left, right = span
    alpha = image.getchannel("A")
    local_bbox = alpha.crop((left, 0, right + 1, image.height)).getbbox()
    if local_bbox is None:
        raise ValueError(f"No visible pixels in span {span}")

    top = local_bbox[1]
    bottom = local_bbox[3]
    crop_box = (
        max(0, left - PADDING_PX),
        max(0, top - PADDING_PX),
        min(image.width, right + 1 + PADDING_PX),
        min(image.height, bottom + PADDING_PX),
    )
    return image.crop(crop_box), crop_box


def main() -> None:
    manifest = {
        "reviewOnly": True,
        "productionChanged": False,
        "stageDepths": list(STAGE_DEPTHS),
        "options": [],
    }

    for option_id, label, sheet_name in OPTIONS:
        sheet_path = OUTPUT_DIR / sheet_name
        image = Image.open(sheet_path).convert("RGBA")
        spans = occupied_column_spans(image.getchannel("A"))
        if len(spans) != len(STAGE_DEPTHS):
            raise ValueError(f"{sheet_name}: expected 5 pillar spans, found {len(spans)}: {spans}")

        option_entry = {
            "id": option_id,
            "label": label,
            "sheet": sheet_name,
            "stages": [],
        }
        for stage_index, (depth, span) in enumerate(zip(STAGE_DEPTHS, spans), start=1):
            stage_image, crop_box = crop_stage(image, span)
            stage_name = f"option-{option_id}-stage-{stage_index}.png"
            stage_image.save(OUTPUT_DIR / stage_name, optimize=True)
            option_entry["stages"].append(
                {
                    "stage": stage_index,
                    "depth": depth,
                    "path": stage_name,
                    "width": stage_image.width,
                    "height": stage_image.height,
                    "sourceCrop": list(crop_box),
                }
            )
        manifest["options"].append(option_entry)

    manifest_path = OUTPUT_DIR / "stage-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {manifest_path}")
    for option in manifest["options"]:
        sizes = ", ".join(f"{stage['width']}x{stage['height']}" for stage in option["stages"])
        print(f"Option {option['id'].upper()}: {sizes}")


if __name__ == "__main__":
    main()
