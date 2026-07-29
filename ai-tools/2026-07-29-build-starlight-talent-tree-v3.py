"""Build the proportion-safe ImageGen Starlight talent-tree V3 runtime pack."""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
V2_PACK = ROOT / "sprites" / "UI" / "starlight-talent-tree-v2"
PACK = ROOT / "sprites" / "UI" / "starlight-talent-tree-v3"
SOURCES = PACK / "sources"
TEMP = ROOT / "tmp" / "imagegen" / "starlight-talent-tree-v3"
CHROMA_HELPER = (
    Path.home()
    / ".codex"
    / "skills"
    / ".system"
    / "imagegen"
    / "scripts"
    / "remove_chroma_key.py"
)

FOUNDATION_SOURCE = SOURCES / "starlight-ultrawide-foundation-imagegen-source-v3.png"
PLAQUE_SOURCE = SOURCES / "starlight-plaque-sheet-imagegen-source-v3.png"
CAROUSEL_SOURCE = SOURCES / "starlight-carousel-sheet-imagegen-source-v3.png"

PLAQUE_NAMES = (
    "navigation-plaque-idle-v3.png",
    "navigation-plaque-selected-v3.png",
    "talent-ribbon-idle-v3.png",
    "talent-ribbon-selected-v3.png",
    "status-seal-v3.png",
    "progress-plaque-v3.png",
)
CAROUSEL_NAMES = (
    "carousel-left-v3.png",
    "carousel-right-v3.png",
    "carousel-step-idle-v3.png",
    "carousel-step-active-v3.png",
)
FOUNDATION_NAME = "starlight-ultrawide-foundation-v3.png"
MAX_WORKERS = 4


def require_sources() -> tuple[str, ...]:
    required = (FOUNDATION_SOURCE, PLAQUE_SOURCE, CAROUSEL_SOURCE, CHROMA_HELPER)
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise FileNotFoundError(f"Missing Starlight V3 source: {missing}")
    manifest_path = V2_PACK / "manifest-v2.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    inherited_names = tuple(manifest["assets"].keys())
    missing_v2 = [
        str(V2_PACK / name)
        for name in inherited_names
        if not (V2_PACK / name).is_file()
    ]
    if missing_v2:
        raise FileNotFoundError(f"Missing inherited V2 runtime asset: {missing_v2}")
    return inherited_names


def crop_grid(
    source: Path,
    columns: int,
    rows: int,
    names: tuple[str, ...],
) -> list[Path]:
    image = Image.open(source).convert("RGBA")
    if len(names) != columns * rows:
        raise ValueError("Grid name count mismatch")
    outputs: list[Path] = []
    for index, name in enumerate(names):
        column = index % columns
        row = index // columns
        left = round(column * image.width / columns)
        right = round((column + 1) * image.width / columns)
        top = round(row * image.height / rows)
        bottom = round((row + 1) * image.height / rows)
        output = TEMP / f"raw-{name}"
        image.crop((left, top, right, bottom)).save(output)
        outputs.append(output)
    return outputs


def remove_chroma(source: Path, output: Path) -> None:
    subprocess.run(
        (
            sys.executable,
            str(CHROMA_HELPER),
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
        ),
        check=True,
    )


def retain_centered_component(image: Image.Image, threshold: int = 4) -> Image.Image:
    width, height = image.size
    alpha = image.getchannel("A")
    binary = alpha.point(lambda value: 255 if value > threshold else 0)
    center_x = width / 2
    center_y = height / 2
    seed = None
    distance = float("inf")
    for index, value in enumerate(binary.get_flattened_data()):
        if not value:
            continue
        x = index % width
        y = index // width
        next_distance = (x - center_x) ** 2 + (y - center_y) ** 2
        if next_distance < distance:
            seed = (x, y)
            distance = next_distance
    if seed is None:
        raise ValueError("No alpha component survived chroma removal")
    ImageDraw.floodfill(binary, seed, 128, thresh=0)
    keep_mask = binary.point(lambda value: 255 if value == 128 else 0)
    image.putalpha(ImageChops.multiply(alpha, keep_mask))
    return image


def trim_alpha(source: Path, output: Path, padding: int = 12) -> None:
    image = retain_centered_component(Image.open(source).convert("RGBA"))
    alpha_box = image.getchannel("A").getbbox()
    if not alpha_box:
        raise ValueError(f"No visible pixels after chroma removal: {source.name}")
    image = image.crop(alpha_box)
    padded = Image.new(
        "RGBA",
        (image.width + padding * 2, image.height + padding * 2),
        (0, 0, 0, 0),
    )
    padded.alpha_composite(image, (padding, padding))
    padded.save(output, optimize=True)


def build_transparent_asset(job: tuple[Path, str]) -> None:
    raw_crop, name = job
    keyed = TEMP / f"keyed-{name}"
    remove_chroma(raw_crop, keyed)
    trim_alpha(keyed, PACK / name)


def asset_report(path: Path) -> dict[str, object]:
    image = Image.open(path)
    has_alpha = "A" in image.getbands()
    alpha_extrema = image.getchannel("A").getextrema() if has_alpha else None
    if has_alpha:
        corners = (
            image.getpixel((0, 0)),
            image.getpixel((image.width - 1, 0)),
            image.getpixel((0, image.height - 1)),
            image.getpixel((image.width - 1, image.height - 1)),
        )
        if any(pixel[3] != 0 for pixel in corners):
            raise ValueError(f"Transparent asset has opaque corner: {path.name}")
    return {
        "width": image.width,
        "height": image.height,
        "mode": image.mode,
        "alphaExtrema": alpha_extrema,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }


def main() -> None:
    inherited_names = require_sources()
    PACK.mkdir(parents=True, exist_ok=True)
    if TEMP.exists():
        expected_parent = (ROOT / "tmp" / "imagegen").resolve()
        if expected_parent not in TEMP.resolve().parents:
            raise ValueError(f"Unsafe temporary path: {TEMP}")
        shutil.rmtree(TEMP)
    TEMP.mkdir(parents=True, exist_ok=True)

    for name in inherited_names:
        shutil.copy2(V2_PACK / name, PACK / name)
    Image.open(FOUNDATION_SOURCE).convert("RGB").save(
        PACK / FOUNDATION_NAME,
        optimize=True,
    )

    plaque_crops = crop_grid(PLAQUE_SOURCE, 2, 3, PLAQUE_NAMES)
    carousel_crops = crop_grid(CAROUSEL_SOURCE, 4, 1, CAROUSEL_NAMES)
    transparent_names = PLAQUE_NAMES + CAROUSEL_NAMES
    jobs = list(zip(plaque_crops + carousel_crops, transparent_names))
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        list(executor.map(build_transparent_asset, jobs))

    runtime_names = (*inherited_names, FOUNDATION_NAME, *transparent_names)
    manifest = {
        "version": 3,
        "generator": "built-in ImageGen plus remove_chroma_key.py",
        "inherits": "starlight-talent-tree-v2/manifest-v2.json",
        "assets": {
            name: asset_report(PACK / name)
            for name in runtime_names
        },
    }
    (PACK / "manifest-v3.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    shutil.rmtree(TEMP)
    print(f"Built {len(runtime_names)} Starlight V3 assets")


if __name__ == "__main__":
    main()
