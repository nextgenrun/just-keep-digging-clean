#!/usr/bin/env python3
"""Build 33 resident Celestial talent icons from three authored ImageGen sheets."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image


PACKAGE_DATE = "2026-08-14"
CANVAS_SIZE = 256
GLYPH_SIZE = 220
GRID_SIZE = 4
HELPER = (
    Path.home()
    / ".codex"
    / "skills"
    / ".system"
    / "imagegen"
    / "scripts"
    / "remove_chroma_key.py"
)
SHEETS = (
    {
        "family": "wayward",
        "source": "celestial-talent-icons-wayward-imagegen-source-v1.png",
        "original": (
            r"C:\Users\Mila\.codex\generated_images"
            r"\01a0006a-4830-7dd3-920a-fcf678e2b340"
            r"\exec-5e32294f-471e-4543-a121-62661f00c018.png"
        ),
        "nodes": (
            "wayward-star-root",
            "wayward-stellar-bearings",
            "wayward-ricochet-matrix",
            "wayward-nova-lens",
            "wayward-echo-orbit",
            "wayward-vector-command",
            "wayward-fracture-bloom",
            "wayward-perihelion-loop",
            "wayward-impact-lattice",
            "wayward-supernova-core",
            "wayward-white-dwarf-shell",
        ),
    },
    {
        "family": "hollow",
        "source": "celestial-talent-icons-hollow-imagegen-source-v1.png",
        "original": (
            r"C:\Users\Mila\.codex\generated_images"
            r"\01a0006a-4830-7dd3-920a-fcf678e2b340"
            r"\exec-af6e8b81-c617-41c8-a92c-e3aafe6c162c.png"
        ),
        "nodes": (
            "hollow-sun-root",
            "hollow-orbit-anchor",
            "hollow-gravity-well",
            "hollow-echo-seed",
            "hollow-tidal-lens",
            "hollow-event-horizon",
            "hollow-dark-reservoir",
            "hollow-abyssal-field",
            "hollow-collapse-cycle",
            "hollow-singularity-core",
            "hollow-chronosphere",
        ),
    },
    {
        "family": "comet",
        "source": "celestial-talent-icons-comet-imagegen-source-v1.png",
        "original": (
            r"C:\Users\Mila\.codex\generated_images"
            r"\01a0006a-4830-7dd3-920a-fcf678e2b340"
            r"\exec-382e8879-3a37-4a71-8784-0602f40589fc.png"
        ),
        "nodes": (
            "comet-engine-root",
            "comet-ignition-coil",
            "comet-bore-drive",
            "comet-fracture-nose",
            "comet-longburn-reservoir",
            "comet-rider-plating",
            "comet-wide-wake",
            "comet-aphelion-drive",
            "comet-impact-wake",
            "comet-zenith-drive",
            "comet-shockfront",
        ),
    },
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ensure_alpha(source: Path, temporary_root: Path) -> tuple[Path, list[str]]:
    with Image.open(source) as image:
        has_useful_alpha = "A" in image.getbands() and image.getchannel("A").getextrema()[0] == 0
    if has_useful_alpha:
        return source, ["source-alpha-preserved"]
    output = temporary_root / f"{source.stem}-alpha.png"
    command = [
        sys.executable,
        str(HELPER),
        "--input",
        str(source),
        "--out",
        str(output),
        "--auto-key",
        "border",
        "--soft-matte",
        "--transparent-threshold",
        "12",
        "--opaque-threshold",
        "220",
        "--despill",
        "--force",
    ]
    subprocess.run(command, check=True)
    return output, command


def cell_box(width: int, height: int, index: int) -> tuple[int, int, int, int]:
    column = index % GRID_SIZE
    row = index // GRID_SIZE
    return (
        round(column * width / GRID_SIZE),
        round(row * height / GRID_SIZE),
        round((column + 1) * width / GRID_SIZE),
        round((row + 1) * height / GRID_SIZE),
    )


def render_icon(sheet: Image.Image, index: int, output: Path) -> dict:
    box = cell_box(sheet.width, sheet.height, index)
    cell = sheet.crop(box).convert("RGBA")
    alpha_box = cell.getchannel("A").getbbox()
    if alpha_box is None:
        raise RuntimeError(f"Cell {index + 1} is empty in {output.name}")
    glyph = cell.crop(alpha_box)
    scale = min(GLYPH_SIZE / glyph.width, GLYPH_SIZE / glyph.height)
    size = (
        max(1, round(glyph.width * scale)),
        max(1, round(glyph.height * scale)),
    )
    glyph = glyph.resize(size, Image.Resampling.LANCZOS)
    glyph_alpha = glyph.getchannel("A")
    alpha_maximum = glyph_alpha.getextrema()[1]
    if alpha_maximum <= 0:
        raise RuntimeError(f"Cell {index + 1} has no visible alpha in {output.name}")
    if alpha_maximum < 255:
        glyph.putalpha(glyph_alpha.point(
            lambda value: min(255, round(value * 255 / alpha_maximum))
        ))
    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    offset = ((CANVAS_SIZE - size[0]) // 2, (CANVAS_SIZE - size[1]) // 2)
    canvas.alpha_composite(glyph, offset)
    canvas.save(output, format="PNG", optimize=True, compress_level=9)
    alpha = canvas.getchannel("A")
    if alpha.getextrema() != (0, 255):
        raise RuntimeError(f"Expected full alpha range in {output}")
    corners = (
        alpha.getpixel((0, 0)),
        alpha.getpixel((CANVAS_SIZE - 1, 0)),
        alpha.getpixel((0, CANVAS_SIZE - 1)),
        alpha.getpixel((CANVAS_SIZE - 1, CANVAS_SIZE - 1)),
    )
    if corners != (0, 0, 0, 0):
        raise RuntimeError(f"Expected transparent corners in {output}")
    return {
        "sourceCell": index + 1,
        "sourceCellBox": list(box),
        "sourceAlphaBounds": list(alpha_box),
        "outputSize": [CANVAS_SIZE, CANVAS_SIZE],
        "glyphSize": list(size),
        "glyphOffset": list(offset),
    }


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    asset_root = repo_root / "sprites" / "UI" / "celestial-overhaul-v1"
    source_root = asset_root / "source"
    if not HELPER.is_file():
        raise FileNotFoundError(HELPER)

    records = []
    processing = []
    with tempfile.TemporaryDirectory(prefix="celestial-talent-icons-") as temporary:
        temporary_root = Path(temporary)
        for spec in SHEETS:
            source = source_root / spec["source"]
            if not source.is_file():
                raise FileNotFoundError(source)
            alpha_source, command = ensure_alpha(source, temporary_root)
            processing.append({
                "family": spec["family"],
                "source": f"source/{spec['source']}",
                "originalPath": spec["original"],
                "sourceSha256": sha256(source),
                "alphaCommand": command,
            })
            with Image.open(alpha_source) as image:
                image.load()
                sheet = image.convert("RGBA")
                for index, node_id in enumerate(spec["nodes"]):
                    output_name = f"talent-icon-{node_id}-v1.png"
                    output = asset_root / output_name
                    geometry = render_icon(sheet, index, output)
                    records.append({
                        "nodeId": node_id,
                        "family": spec["family"],
                        "outputPath": output_name,
                        "outputSha256": sha256(output),
                        **geometry,
                    })

    output_hashes = {record["outputSha256"] for record in records}
    if len(records) != 33 or len(output_hashes) != 33:
        raise RuntimeError(
            f"Expected 33 unique icons, got {len(records)} files and {len(output_hashes)} hashes"
        )
    manifest = {
        "schemaVersion": 1,
        "packageId": "celestial-talent-icons-v1",
        "date": PACKAGE_DATE,
        "canvasSizePx": CANVAS_SIZE,
        "glyphMaximumPx": GLYPH_SIZE,
        "assets": records,
    }
    provenance = {
        "schemaVersion": 1,
        "packageId": "celestial-talent-icons-v1",
        "date": PACKAGE_DATE,
        "processor": str(HELPER),
        "sheets": processing,
    }
    (asset_root / "talent-icons-manifest-v1.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    (asset_root / "talent-icons-provenance-v1.json").write_text(
        json.dumps(provenance, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Built {len(records)} unique resident talent icons in {asset_root}")


if __name__ == "__main__":
    main()
