#!/usr/bin/env python3
"""Package generated Celestial UI art into a validated production asset set."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image


PACKAGE_ID = "celestial-overhaul-v1"
PACKAGE_DATE = "2026-08-03"
GENERATION_ID = "019fbd49-acc9-71a1-bfd2-607e9f8e05e1"
DEFAULT_SOURCE_ROOT = Path.home() / ".codex" / "generated_images" / GENERATION_ID
DEFAULT_HELPER = (
    Path.home()
    / ".codex"
    / "skills"
    / ".system"
    / "imagegen"
    / "scripts"
    / "remove_chroma_key.py"
)
SOURCE_SPECS = (
    {
        "id": "celestial-actionbar",
        "role": "actionbar-chroma",
        "input": "exec-860ecdcc-7872-4571-a131-641a396ec92b.png",
        "source": "celestial-actionbar-chroma-imagegen-source-v1.png",
        "output": "celestial-actionbar-v1.png",
        "transparent": True,
    },
    {
        "id": "celestial-currency-hud",
        "role": "currency-chroma",
        "input": "exec-f6650860-889e-4a47-8ade-e0d156bc2d2d.png",
        "source": "celestial-currency-chroma-imagegen-source-v1.png",
        "output": "celestial-currency-hud-v1.png",
        "transparent": True,
    },
    {
        "id": "celestial-talent-foundation",
        "role": "talent-foundation-opaque",
        "input": "exec-ba0d842c-cf09-4f51-8ae1-114bab5eaf98.png",
        "source": "celestial-talent-foundation-imagegen-source-v1.png",
        "output": "celestial-talent-foundation-v1.png",
        "transparent": False,
    },
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def image_facts(path: Path) -> dict:
    with Image.open(path) as image:
        image.load()
        alpha = image.getchannel("A") if "A" in image.getbands() else None
        corners = []
        if alpha is not None:
            corners = [
                alpha.getpixel((0, 0)),
                alpha.getpixel((image.width - 1, 0)),
                alpha.getpixel((0, image.height - 1)),
                alpha.getpixel((image.width - 1, image.height - 1)),
            ]
        return {
            "width": image.width,
            "height": image.height,
            "mode": image.mode,
            "alphaExtrema": list(alpha.getextrema()) if alpha is not None else None,
            "cornerAlpha": corners or None,
        }


def remove_chroma(helper: Path, source: Path, output: Path) -> list[str]:
    command = [
        sys.executable,
        str(helper),
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
    return command


def trim_alpha(source: Path, output: Path, padding: int) -> dict:
    with Image.open(source) as image:
        rgba = image.convert("RGBA")
        alpha_bbox = rgba.getchannel("A").getbbox()
        if alpha_bbox is None:
            raise RuntimeError(f"No visible pixels survived chroma removal: {source}")
        left, top, right, bottom = alpha_bbox
        crop_box = (
            max(0, left - padding),
            max(0, top - padding),
            min(rgba.width, right + padding),
            min(rgba.height, bottom + padding),
        )
        cropped = rgba.crop(crop_box)
        cropped.save(output, format="PNG", optimize=True, compress_level=9)
        return {
            "paddingPx": padding,
            "alphaBoundsBeforeTrim": list(alpha_bbox),
            "cropBox": list(crop_box),
            "resampled": False,
        }


def validate_transparent(path: Path, trim: dict) -> dict:
    facts = image_facts(path)
    if facts["mode"] != "RGBA" or facts["alphaExtrema"] != [0, 255]:
        raise RuntimeError(f"Expected full RGBA alpha range: {path} -> {facts}")
    if facts["cornerAlpha"] != [0, 0, 0, 0]:
        raise RuntimeError(f"Expected transparent corners: {path} -> {facts}")
    crop = trim["cropBox"]
    if facts["width"] != crop[2] - crop[0] or facts["height"] != crop[3] - crop[1]:
        raise RuntimeError(f"Trim geometry mismatch: {path}")
    return facts


def validate_opaque(path: Path) -> dict:
    facts = image_facts(path)
    if facts["alphaExtrema"] is not None and facts["alphaExtrema"] != [255, 255]:
        raise RuntimeError(f"Talent foundation is not opaque: {path} -> {facts}")
    return facts


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def write_docs(root: Path, source_root: Path, records: list[dict]) -> None:
    asset_lines = "\n".join(
        f"- `{record['outputPath']}` — {record['role']}, "
        f"{record['output']['width']}x{record['output']['height']}, "
        f"SHA-256 `{record['outputSha256']}`."
        for record in records
    )
    (root / "readme.md").write_text(
        f"""# Celestial Overhaul V1 UI Assets

Production-ready bitmap package generated on {PACKAGE_DATE}. No runtime asset
keys or UI consumers are changed by this package.

{asset_lines}

The actionbar and currency HUD were processed with the installed ImageGen
chroma helper, then cropped to nonzero alpha bounds plus 24 px padding. Cropping
uses no resampling. The opaque talent foundation is a byte-identical copy.

Rebuild from the repository root:

```powershell
python ai-tools/2026-08-03-package-celestial-overhaul-v1.py
```

See `manifest-v1.json` for production hashes and `provenance-v1.json` for the
source and exact chroma-removal commands.
""",
        encoding="utf-8",
    )
    source_lines = "\n".join(
        f"- `{record['sourcePath']}` copied from `{record['originalPath']}` "
        f"(SHA-256 `{record['sourceSha256']}`)."
        for record in records
    )
    (root / "source" / "readme.md").write_text(
        f"""# ImageGen Sources

These byte-identical source copies preserve generation `{GENERATION_ID}`.
They are never runtime assets and must remain available for rebuilds.

{source_lines}
""",
        encoding="utf-8",
    )
    write_json(
        root / "manifest-v1.json",
        {
            "schemaVersion": 1,
            "packageId": PACKAGE_ID,
            "date": PACKAGE_DATE,
            "assets": records,
        },
    )
    write_json(
        root / "provenance-v1.json",
        {
            "schemaVersion": 1,
            "packageId": PACKAGE_ID,
            "generationId": GENERATION_ID,
            "originalSourceRoot": str(source_root),
            "processor": str(DEFAULT_HELPER),
            "assets": [
                {
                    "id": record["id"],
                    "originalPath": record["originalPath"],
                    "sourceCopy": record["sourcePath"],
                    "sourceSha256": record["sourceSha256"],
                    "processingCommand": record["processingCommand"],
                    "trim": record["trim"],
                }
                for record in records
            ],
        },
    )


def package(source_root: Path, output_root: Path, helper: Path, padding: int) -> None:
    repo_root = Path(__file__).resolve().parents[1]
    output_root = output_root.resolve()
    if not output_root.is_relative_to(repo_root):
        raise RuntimeError(f"Output must stay inside repository: {output_root}")
    if output_root.exists():
        raise FileExistsError(f"Refusing to overwrite existing package: {output_root}")
    if not helper.is_file():
        raise FileNotFoundError(helper)
    for spec in SOURCE_SPECS:
        if not (source_root / spec["input"]).is_file():
            raise FileNotFoundError(source_root / spec["input"])

    output_root.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=f".{PACKAGE_ID}-", dir=output_root.parent) as temp:
        staging = Path(temp) / PACKAGE_ID
        source_dir = staging / "source"
        source_dir.mkdir(parents=True)
        records = []
        for spec in SOURCE_SPECS:
            original = source_root / spec["input"]
            source_copy = source_dir / spec["source"]
            output = staging / spec["output"]
            shutil.copy2(original, source_copy)
            source_facts = image_facts(source_copy)
            trim = None
            processing_command = ["byte-identical-copy"]
            if spec["transparent"]:
                alpha_full = Path(temp) / f"{spec['id']}-alpha-full.png"
                processing_command = remove_chroma(helper, source_copy, alpha_full)
                trim = trim_alpha(alpha_full, output, padding)
                output_facts = validate_transparent(output, trim)
            else:
                shutil.copy2(source_copy, output)
                output_facts = validate_opaque(output)
                if sha256(source_copy) != sha256(output):
                    raise RuntimeError("Opaque foundation copy changed bytes")
            records.append(
                {
                    "id": spec["id"],
                    "role": spec["role"],
                    "sourcePath": f"source/{spec['source']}",
                    "outputPath": spec["output"],
                    "originalPath": str(original),
                    "source": source_facts,
                    "output": output_facts,
                    "sourceSha256": sha256(source_copy),
                    "outputSha256": sha256(output),
                    "trim": trim,
                    "processingCommand": processing_command,
                }
            )
        write_docs(staging, source_root, records)
        shutil.move(str(staging), str(output_root))

    print(f"Packaged {len(SOURCE_SPECS)} assets at {output_root}")
    for record in records:
        print(
            f"{record['outputPath']}: "
            f"{record['output']['width']}x{record['output']['height']} "
            f"{record['outputSha256']}"
        )


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, default=DEFAULT_SOURCE_ROOT)
    parser.add_argument(
        "--output-root",
        type=Path,
        default=repo_root / "sprites" / "UI" / PACKAGE_ID,
    )
    parser.add_argument("--helper", type=Path, default=DEFAULT_HELPER)
    parser.add_argument("--padding", type=int, default=24)
    args = parser.parse_args()
    package(args.source_root.resolve(), args.output_root, args.helper.resolve(), args.padding)


if __name__ == "__main__":
    main()
