#!/usr/bin/env python3
"""Build the topology-correct Celestial talent-tree V2 runtime art package."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "sprites" / "UI" / "celestial-overhaul-v2"
SOURCE = PACKAGE / "source"
HELPER = (
    Path.home()
    / ".codex"
    / "skills"
    / ".system"
    / "imagegen"
    / "scripts"
    / "remove_chroma_key.py"
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def chroma(source: Path, destination: Path) -> None:
    subprocess.run(
        [
            sys.executable,
            str(HELPER),
            "--input",
            str(source),
            "--out",
            str(destination),
            "--auto-key",
            "border",
            "--soft-matte",
            "--transparent-threshold",
            "12",
            "--opaque-threshold",
            "220",
            "--despill",
            "--force",
        ],
        check=True,
    )


def alpha_crop(image: Image.Image, padding: int) -> Image.Image:
    rgba = image.convert("RGBA")
    bounds = rgba.getchannel("A").getbbox()
    if bounds is None:
        raise RuntimeError("Chroma removal produced an empty image")
    left, top, right, bottom = bounds
    return rgba.crop((
        max(0, left - padding),
        max(0, top - padding),
        min(rgba.width, right + padding),
        min(rgba.height, bottom + padding),
    ))


def build_frame(alpha_path: Path, output: Path) -> None:
    with Image.open(alpha_path) as image:
        cropped = alpha_crop(image, 24)
        side = max(cropped.size)
        square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        square.alpha_composite(
            cropped,
            ((side - cropped.width) // 2, (side - cropped.height) // 2),
        )
        square.resize((256, 256), Image.Resampling.LANCZOS).save(
            output,
            optimize=True,
            compress_level=9,
        )


def build_connector(alpha_path: Path, output: Path) -> None:
    with Image.open(alpha_path) as image:
        cropped = alpha_crop(image, 16)
        cropped.resize((1024, 64), Image.Resampling.LANCZOS).save(
            output,
            optimize=True,
            compress_level=9,
        )


def build_tooltip(source: Path, output: Path) -> None:
    """Remove ImageGen's baked light checker and normalize the wide panel."""
    with Image.open(source) as image:
        rgba = image.convert("RGBA")
        pixels = []
        for red, green, blue, _alpha in rgba.getdata():
            is_light_neutral = min(red, green, blue) >= 170 and (
                max(red, green, blue) - min(red, green, blue)
            ) <= 20
            pixels.append((red, green, blue, 0 if is_light_neutral else 255))
        rgba.putdata(pixels)
        cropped = alpha_crop(rgba, 12)
        cropped.resize((1200, 360), Image.Resampling.LANCZOS).save(
            output,
            optimize=True,
            compress_level=9,
        )


def facts(path: Path) -> dict:
    with Image.open(path) as image:
        alpha = image.getchannel("A") if "A" in image.getbands() else None
        return {
            "path": path.relative_to(PACKAGE).as_posix(),
            "width": image.width,
            "height": image.height,
            "mode": image.mode,
            "alphaExtrema": list(alpha.getextrema()) if alpha else None,
            "sha256": sha256(path),
        }


def main() -> None:
    if not HELPER.is_file():
        raise FileNotFoundError(HELPER)
    foundation_source = SOURCE / "celestial-talent-foundation-imagegen-source-v2.png"
    frame_source = SOURCE / "talent-node-frame-magenta-imagegen-source-v2.png"
    connector_source = SOURCE / "talent-connector-magenta-imagegen-source-v2.png"
    tooltip_source = SOURCE / "talent-tooltip-imagegen-source-v2.png"
    for source in (foundation_source, frame_source, connector_source, tooltip_source):
        if not source.is_file():
            raise FileNotFoundError(source)

    foundation = PACKAGE / "celestial-talent-foundation-v2.png"
    frame = PACKAGE / "talent-node-frame-v2.png"
    connector = PACKAGE / "talent-connector-v2.png"
    tooltip = PACKAGE / "talent-tooltip-v2.png"
    foundation.write_bytes(foundation_source.read_bytes())
    with tempfile.TemporaryDirectory(prefix="celestial-v2-") as temp:
        temporary = Path(temp)
        frame_alpha = temporary / "frame-alpha.png"
        connector_alpha = temporary / "connector-alpha.png"
        chroma(frame_source, frame_alpha)
        chroma(connector_source, connector_alpha)
        build_frame(frame_alpha, frame)
        build_connector(connector_alpha, connector)
        build_tooltip(tooltip_source, tooltip)

    assets = [facts(path) for path in (foundation, frame, connector, tooltip)]
    expected = [(1672, 941), (256, 256), (1024, 64), (1200, 360)]
    if [(asset["width"], asset["height"]) for asset in assets] != expected:
        raise RuntimeError(f"Unexpected output geometry: {assets}")
    if any(asset["alphaExtrema"] != [0, 255] for asset in assets[1:]):
        raise RuntimeError("Transparent runtime assets lost their full alpha range")
    (PACKAGE / "manifest-v2.json").write_text(
        json.dumps({
            "schemaVersion": 2,
            "packageId": "celestial-overhaul-v2",
            "date": "2026-08-15",
            "topology": {"branchCount": 3, "nodeCount": 33, "bakedSockets": 0},
            "assets": assets,
        }, indent=2) + "\n",
        encoding="utf-8",
    )
    print("celestial talent tree v2: PASS")
    for asset in assets:
        print(asset)


if __name__ == "__main__":
    main()
