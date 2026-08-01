#!/usr/bin/env python3
"""Prepare the approved surface hero landmark cutouts for Phaser runtime use."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
LANDMARK_ROOT = ROOT / "sprites" / "environment" / "surface-hero-landmarks-v4"
MASTER_ROOT = LANDMARK_ROOT / "sources" / "alpha-masters"
MANIFEST_PATH = LANDMARK_ROOT / "2026-07-30-surface-hero-landmarks-v4-manifest.json"

SIDE_PADDING_PX = 8
TOP_PADDING_PX = 8
BOTTOM_PADDING_PX = 2

ASSETS: tuple[dict[str, str], ...] = (
    {
        "id": "arrivalForgeShelter",
        "master": "arrival-forge-shelter-alpha-v4.png",
        "output": "arrival-forge-shelter-v4.png",
        "chromaSource": (
            "sources/2026-07-30-arrival-forge-shelter-chroma-v4.png"
        ),
        "keyColor": "green",
    },
    {
        "id": "caravanWaystation",
        "master": "caravan-waystation-alpha-v4.png",
        "output": "caravan-waystation-v4.png",
        "chromaSource": (
            "sources/2026-07-30-caravan-waystation-chroma-v4.png"
        ),
        "keyColor": "green",
    },
    {
        "id": "starwellPortalFrame",
        "master": "starwell-portal-frame-alpha-v4.png",
        "output": "starwell-portal-frame-v4.png",
        "chromaSource": (
            "sources/2026-07-30-starwell-portal-frame-chroma-v4.png"
        ),
        "keyColor": "green",
    },
    {
        "id": "timberwrightYard",
        "master": "timberwright-yard-alpha-v4.png",
        "output": "timberwright-yard-v4.png",
        "chromaSource": (
            "sources/2026-07-30-timberwright-yard-chroma-v4.png"
        ),
        "keyColor": "green",
    },
    {
        "id": "observatoryTelescope",
        "master": "observatory-telescope-alpha-v4.png",
        "output": "observatory-telescope-v4.png",
        "chromaSource": (
            "sources/2026-07-30-observatory-telescope-chroma-v4.png"
        ),
        "keyColor": "green",
    },
    {
        "id": "frontierSurveyPavilion",
        "master": "frontier-survey-pavilion-alpha-v4.png",
        "output": "frontier-survey-pavilion-v4.png",
        "chromaSource": (
            "sources/2026-07-30-frontier-survey-pavilion-chroma-v4.png"
        ),
        "keyColor": "magenta",
    },
    {
        "id": "threeKingsOverlook",
        "master": "three-kings-overlook-alpha-v4.png",
        "output": "three-kings-overlook-v4.png",
        "chromaSource": (
            "sources/2026-07-30-three-kings-overlook-chroma-v4.png"
        ),
        "keyColor": "green",
    },
)


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def count_alpha_quality(image: Image.Image) -> dict[str, int | float]:
    transparent = 0
    partial = 0
    opaque = 0
    green_residual = 0
    magenta_residual = 0
    for red, green, blue, alpha in image.get_flattened_data():
        if alpha == 0:
            transparent += 1
        elif alpha == 255:
            opaque += 1
        else:
            partial += 1
        if (
            alpha > 8
            and green > 155
            and green > red * 1.55
            and green > blue * 1.55
        ):
            green_residual += 1
        if (
            alpha > 8
            and red > 155
            and blue > 155
            and red > green * 1.55
            and blue > green * 1.55
        ):
            magenta_residual += 1
    total = image.width * image.height
    return {
        "totalPixels": total,
        "transparentPixels": transparent,
        "partialAlphaPixels": partial,
        "opaquePixels": opaque,
        "transparentRatio": round(transparent / total, 6),
        "greenResidualPixels": green_residual,
        "magentaResidualPixels": magenta_residual,
    }


def crop_to_contact(master: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    alpha_box = master.getchannel("A").getbbox()
    if alpha_box is None:
        raise RuntimeError("Alpha master is fully transparent")
    left, top, right, bottom = alpha_box
    crop_box = (
        max(0, left - SIDE_PADDING_PX),
        max(0, top - TOP_PADDING_PX),
        min(master.width, right + SIDE_PADDING_PX),
        min(master.height, bottom + BOTTOM_PADDING_PX),
    )
    return master.crop(crop_box), crop_box


def opening_probe(image: Image.Image) -> dict[str, Any]:
    """Measure the central Starwell opening without treating the frame as portal logic."""

    left = round(image.width * 0.42)
    right = round(image.width * 0.58)
    top = round(image.height * 0.36)
    bottom = round(image.height * 0.60)
    alpha = image.getchannel("A").crop((left, top, right, bottom))
    values = tuple(alpha.get_flattened_data())
    transparent = sum(value <= 8 for value in values)
    return {
        "sampleBox": [left, top, right, bottom],
        "transparentRatio": round(transparent / len(values), 6),
        "centerAlpha": image.getpixel((image.width // 2, image.height // 2))[3],
    }


def prepare_asset(spec: dict[str, str]) -> dict[str, Any]:
    master_path = MASTER_ROOT / spec["master"]
    output_path = LANDMARK_ROOT / spec["output"]
    if not master_path.is_file():
        raise FileNotFoundError(f"Missing alpha master: {relative(master_path)}")

    with Image.open(master_path) as source:
        master = source.convert("RGBA")
    output, crop_box = crop_to_contact(master)
    if output_path.is_file():
        with Image.open(output_path) as existing_source:
            existing = existing_source.convert("RGBA")
        if existing.size != output.size or existing.tobytes() != output.tobytes():
            raise RuntimeError(
                f"Existing runtime asset differs from rebuilt pixels: "
                f"{relative(output_path)}"
            )
    else:
        temporary_path = output_path.with_suffix(".tmp.png")
        output.save(temporary_path, format="PNG", optimize=True)
        temporary_path.replace(output_path)

    quality = count_alpha_quality(output)
    residual_key = (
        "magentaResidualPixels"
        if spec["keyColor"] == "magenta"
        else "greenResidualPixels"
    )
    if quality[residual_key] > 64:
        raise RuntimeError(
            f"{spec['id']} retains {quality[residual_key]} "
            f"{spec['keyColor']}-key pixels"
        )

    report: dict[str, Any] = {
        "id": spec["id"],
        "keyColor": spec["keyColor"],
        "runtimePath": relative(output_path),
        "alphaMasterPath": relative(master_path),
        "chromaSourcePath": relative(LANDMARK_ROOT / spec["chromaSource"]),
        "sourceCanvas": {"width": master.width, "height": master.height},
        "cropBox": list(crop_box),
        "width": output.width,
        "height": output.height,
        "bottomTransparentPaddingPx": output.height
        - output.getchannel("A").getbbox()[3],
        "sha256": sha256(output_path),
        "alpha": quality,
    }
    if spec["id"] == "starwellPortalFrame":
        report["portalOpening"] = opening_probe(output)
        if (
            report["portalOpening"]["centerAlpha"] > 8
            or report["portalOpening"]["transparentRatio"] < 0.96
        ):
            raise RuntimeError("Starwell frame does not retain a clean portal opening")
    return report


def main() -> None:
    LANDMARK_ROOT.mkdir(parents=True, exist_ok=True)
    reports = [prepare_asset(spec) for spec in ASSETS]
    manifest = {
        "schema": "surface-hero-landmarks-v4-manifest@1",
        "generatedUtc": "2026-07-30",
        "staticTransforms": True,
        "runtimeMotion": False,
        "cropPaddingPx": {
            "left": SIDE_PADDING_PX,
            "right": SIDE_PADDING_PX,
            "top": TOP_PADDING_PX,
            "bottom": BOTTOM_PADDING_PX,
        },
        "assets": reports,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {relative(MANIFEST_PATH)}")
    for report in reports:
        print(
            f"{report['id']}: {report['width']}x{report['height']} "
            f"alpha={report['alpha']['transparentRatio']:.3f} "
            f"sha256={report['sha256'][:12]}"
        )


if __name__ == "__main__":
    main()
