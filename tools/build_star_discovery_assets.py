from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "sprites" / "UI" / "star-discovery-v1"
SOURCE = PACKAGE / "source"
TIERS = ("common", "uncommon", "rare", "epic", "mythic", "astral")

SHEETS = (
    {
        "source": SOURCE / "star-discovery-plates-alpha-v1.png",
        "suffix": "plate-v1.png",
        "max_width": 768,
        "alpha_threshold": 12,
    },
    {
        "source": SOURCE / "star-discovery-xp-fills-alpha-v1.png",
        "suffix": "xp-fill-v1.png",
        "max_width": 768,
        "alpha_threshold": 18,
    },
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def alpha_bbox(image: Image.Image, threshold: int) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value >= threshold else 0)
    bbox = mask.getbbox()
    if bbox is None:
        raise ValueError("component cell contains no visible pixels")
    return bbox


def padded_crop(image: Image.Image, threshold: int, padding: int = 8) -> Image.Image:
    left, top, right, bottom = alpha_bbox(image, threshold)
    return image.crop((
        max(0, left - padding),
        max(0, top - padding),
        min(image.width, right + padding),
        min(image.height, bottom + padding),
    ))


def split_sheet(sheet: dict[str, object]) -> list[Path]:
    source = Path(sheet["source"])
    image = Image.open(source).convert("RGBA")
    components: list[Image.Image] = []
    for row in range(3):
        top = round(row * image.height / 3)
        bottom = round((row + 1) * image.height / 3)
        for column in range(2):
            left = round(column * image.width / 2)
            right = round((column + 1) * image.width / 2)
            cell = image.crop((left, top, right, bottom))
            components.append(padded_crop(cell, int(sheet["alpha_threshold"])))

    canvas_width = max(component.width for component in components)
    canvas_height = max(component.height for component in components)
    max_width = int(sheet["max_width"])
    scale = min(1.0, max_width / max(1, canvas_width))
    canvas_width = max(1, round(canvas_width * scale))
    canvas_height = max(1, round(canvas_height * scale))

    outputs: list[Path] = []
    for tier, component in zip(TIERS, components, strict=True):
        if scale < 1:
            component = component.resize(
                (
                    max(1, round(component.width * scale)),
                    max(1, round(component.height * scale)),
                ),
                Image.Resampling.LANCZOS,
            )
        canvas = Image.new("RGBA", (canvas_width, canvas_height), (0, 0, 0, 0))
        x = (canvas_width - component.width) // 2
        y = (canvas_height - component.height) // 2
        canvas.alpha_composite(component, (x, y))
        output = PACKAGE / f"star-discovery-{tier}-{sheet['suffix']}"
        canvas.save(output, optimize=True)
        outputs.append(output)
    return outputs


def validate(path: Path) -> dict[str, object]:
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    extrema = alpha.getextrema()
    alpha_values = (
        alpha.get_flattened_data()
        if hasattr(alpha, "get_flattened_data")
        else alpha.getdata()
    )
    visible = sum(1 for value in alpha_values if value > 12)
    coverage = visible / max(1, image.width * image.height)
    corners = (
        alpha.getpixel((0, 0)),
        alpha.getpixel((image.width - 1, 0)),
        alpha.getpixel((0, image.height - 1)),
        alpha.getpixel((image.width - 1, image.height - 1)),
    )
    if extrema[0] != 0 or extrema[1] < 240:
        raise ValueError(f"{path.name}: invalid alpha range {extrema}")
    if max(corners) > 12:
        raise ValueError(f"{path.name}: corners are not transparent {corners}")
    if not 0.03 <= coverage <= 0.9:
        raise ValueError(f"{path.name}: implausible visible coverage {coverage:.4f}")
    return {
        "file": path.name,
        "width": image.width,
        "height": image.height,
        "mode": image.mode,
        "alphaRange": list(extrema),
        "visibleCoverage": round(coverage, 6),
        "sha256": sha256(path),
    }


def main() -> None:
    PACKAGE.mkdir(parents=True, exist_ok=True)
    outputs = [path for sheet in SHEETS for path in split_sheet(sheet)]
    assets = [validate(path) for path in outputs]
    manifest = {
        "packageId": "star-discovery-v1",
        "artSource": "ImageGen",
        "runtimeTierOrder": list(TIERS),
        "assets": assets,
        "sourceSheets": [
            {
                "file": Path(sheet["source"]).name,
                "sha256": sha256(Path(sheet["source"])),
            }
            for sheet in SHEETS
        ],
    }
    manifest_path = PACKAGE / "star-discovery-v1.manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(outputs)} runtime assets and {manifest_path.relative_to(ROOT)}")
    for asset in assets:
        print(
            f"{asset['file']}: {asset['width']}x{asset['height']} "
            f"coverage={asset['visibleCoverage']} sha256={asset['sha256'][:12]}"
        )


if __name__ == "__main__":
    main()
