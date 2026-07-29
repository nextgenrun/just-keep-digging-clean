"""Build the approved thin Town Square and full-width surface ground strips."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
SOURCE = (
    ROOT
    / "visual-approval-previews"
    / "village-floor-concepts-v1"
    / "01-worn-mountain-slate-street.png"
)
TOWN_OUTPUT = (
    ROOT
    / "sprites"
    / "backgrounds"
    / "start-zone-scenic-v1"
    / "town-square-slate-strip-v3.png"
)
SURFACE_OUTPUT = (
    ROOT
    / "sprites"
    / "backgrounds"
    / "world-visual-v2"
    / "surface"
    / "town-surface-edge-thin-v2.png"
)
MANIFEST = SURFACE_OUTPUT.with_suffix(".manifest.json")

EXPECTED_SOURCE_SIZE = (1672, 941)
SOURCE_CROP = (0, 468, 1672, 516)
CORE_SIZE = (1672, 48)
HANDOFF_WIDTH = 129
TOWN_OUTPUT_SIZE = (CORE_SIZE[0] + HANDOFF_WIDTH, CORE_SIZE[1])


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file_handle:
        for chunk in iter(lambda: file_handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def pixel_sha256(image: Image.Image) -> str:
    rgba = image.convert("RGBA")
    payload = f"{rgba.width}x{rgba.height}:RGBA:".encode() + rgba.tobytes()
    return hashlib.sha256(payload).hexdigest()


def build_handoff(core: Image.Image) -> Image.Image:
    extension = core.crop(
        (CORE_SIZE[0] - HANDOFF_WIDTH, 0, CORE_SIZE[0], CORE_SIZE[1])
    ).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    alpha = Image.new("L", extension.size)
    denominator = max(1, HANDOFF_WIDTH - 1)
    alpha.putdata(
        [
            round(255 * (HANDOFF_WIDTH - 1 - x) / denominator)
            for _y in range(CORE_SIZE[1])
            for x in range(HANDOFF_WIDTH)
        ]
    )
    extension.putalpha(alpha)
    return extension


def main() -> None:
    with Image.open(SOURCE) as source_image:
        source = source_image.convert("RGBA")
    if source.size != EXPECTED_SOURCE_SIZE:
        raise ValueError(
            f"Approved Option A changed: {source.size}; expected {EXPECTED_SOURCE_SIZE}"
        )

    core = source.crop(SOURCE_CROP)
    if core.size != CORE_SIZE:
        raise ValueError(f"Thin strip crop changed: {core.size}; expected {CORE_SIZE}")

    town = Image.new("RGBA", TOWN_OUTPUT_SIZE, (0, 0, 0, 0))
    town.alpha_composite(core, (0, 0))
    town.alpha_composite(build_handoff(core), (CORE_SIZE[0], 0))

    surface = core.copy()
    installed_core = town.crop((0, 0, CORE_SIZE[0], CORE_SIZE[1]))
    if ImageChops.difference(installed_core, core).getbbox() is not None:
        raise ValueError("Town strip core must remain pixel-exact to approved Option A")
    if ImageChops.difference(surface, core).getbbox() is not None:
        raise ValueError("Full-width strip must share the exact Town Square core")
    if town.getpixel((TOWN_OUTPUT_SIZE[0] - 1, CORE_SIZE[1] // 2))[3] != 0:
        raise ValueError("The Town Square continuation must finish at zero alpha")

    TOWN_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    SURFACE_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    town.save(TOWN_OUTPUT, format="PNG", optimize=True, compress_level=9)
    surface.save(SURFACE_OUTPUT, format="PNG", optimize=True, compress_level=9)

    manifest = {
        "version": 3,
        "generatedOn": "2026-07-28",
        "productionChanged": True,
        "scope": "Thin full-width surface ground and Town Square handoff",
        "source": SOURCE.relative_to(ROOT).as_posix(),
        "sourceSize": list(EXPECTED_SOURCE_SIZE),
        "sourceCrop": {
            "x": SOURCE_CROP[0],
            "y": SOURCE_CROP[1],
            "width": CORE_SIZE[0],
            "height": CORE_SIZE[1],
        },
        "approvedCorePixelExact": True,
        "approvedCoreWidth": CORE_SIZE[0],
        "handoffWidth": HANDOFF_WIDTH,
        "townOutput": TOWN_OUTPUT.relative_to(ROOT).as_posix(),
        "townOutputSize": list(TOWN_OUTPUT_SIZE),
        "surfaceOutput": SURFACE_OUTPUT.relative_to(ROOT).as_posix(),
        "surfaceOutputSize": list(CORE_SIZE),
        "sourceFileSha256": file_sha256(SOURCE),
        "sourcePixelSha256": pixel_sha256(source),
        "approvedCorePixelSha256": pixel_sha256(core),
        "townOutputFileSha256": file_sha256(TOWN_OUTPUT),
        "townOutputPixelSha256": pixel_sha256(town),
        "surfaceOutputFileSha256": file_sha256(SURFACE_OUTPUT),
        "surfaceOutputPixelSha256": pixel_sha256(surface),
        "invariants": {
            "resizedApprovedPixels": False,
            "repaintedApprovedPixels": False,
            "includesUnderground": False,
            "changesGameplayState": False,
        },
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(
        "Wrote thin approved surface ground: "
        f"{TOWN_OUTPUT.relative_to(ROOT)}, "
        f"{SURFACE_OUTPUT.relative_to(ROOT)}, and "
        f"{MANIFEST.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    main()
