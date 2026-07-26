"""Promote the two user-approved pillar sheets into production stage sprites."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = ROOT / "visual-approval-previews" / "milestone-pillar-concepts-v1"
OUTPUT_DIR = ROOT / "sprites" / "environment" / "approved-pillars-v1"

PILLARS = {
    "milestone": {
        "review_sheet": "option-c-dwarven-depth-engine-chroma.png",
        "review_prefix": "option-c-stage",
        "output_prefix": "milestone-pillar-stage",
        "approval": "user screenshot 1",
    },
    "star": {
        "review_sheet": "option-a-carved-slate-depth-chronicle-chroma.png",
        "review_prefix": "option-a-stage",
        "output_prefix": "star-pillar-stage",
        "approval": "user screenshot 2",
    },
}


def decoded_pixels_match(left_path: Path, right_path: Path) -> bool:
    with Image.open(left_path) as left_image, Image.open(right_path) as right_image:
        left = left_image.convert("RGBA")
        right = right_image.convert("RGBA")
        return left.size == right.size and ImageChops.difference(left, right).getbbox() is None


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file_handle:
        for chunk in iter(lambda: file_handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def promote_pillar(name: str, definition: dict, attachment: Path | None) -> dict:
    review_sheet = REVIEW_DIR / definition["review_sheet"]
    if attachment and not decoded_pixels_match(review_sheet, attachment):
        raise ValueError(f"{name} approval attachment does not pixel-match {review_sheet.name}")

    stages = []
    previous_height = 0
    for stage_number in range(1, 6):
        source = REVIEW_DIR / f"{definition['review_prefix']}-{stage_number}.png"
        target = OUTPUT_DIR / f"{definition['output_prefix']}-{stage_number}.png"
        with Image.open(source) as stage_image:
            if stage_image.mode != "RGBA":
                raise ValueError(f"{source.name} must be RGBA, got {stage_image.mode}")
            width, height = stage_image.size
        if height <= previous_height:
            raise ValueError(f"{name} stage heights must grow naturally")
        previous_height = height
        shutil.copy2(source, target)
        stages.append({
            "stage": stage_number,
            "file": target.name,
            "source": source.relative_to(ROOT).as_posix(),
            "width": width,
            "height": height,
            "sha256": sha256(target),
        })

    return {
        "approval": definition["approval"],
        "approvedOn": "2026-07-26",
        "reviewSheet": review_sheet.relative_to(ROOT).as_posix(),
        "attachmentPixelMatchVerified": bool(attachment),
        "stages": stages,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--milestone-sheet", type=Path)
    parser.add_argument("--star-sheet", type=Path)
    arguments = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {
        "version": 1,
        "generatedOn": "2026-07-26",
        "productionChanged": True,
        "pillars": {
            "milestone": promote_pillar(
                "milestone",
                PILLARS["milestone"],
                arguments.milestone_sheet,
            ),
            "star": promote_pillar(
                "star",
                PILLARS["star"],
                arguments.star_sheet,
            ),
        },
    }
    manifest_path = OUTPUT_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote approved pillar assets and {manifest_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
