"""Build the alpha-clean ImageGen Starlight talent-tree V2 runtime pack."""

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
PACK = ROOT / "sprites" / "UI" / "starlight-talent-tree-v2"
SOURCES = PACK / "sources"
TEMP = ROOT / "tmp" / "imagegen" / "starlight-talent-tree-v2"
CHROMA_HELPER = (
    Path.home()
    / ".codex"
    / "skills"
    / ".system"
    / "imagegen"
    / "scripts"
    / "remove_chroma_key.py"
)

SOURCE_FILES = {
    "tree": SOURCES / "tree-panel-imagegen-source-v2.png",
    "detail": SOURCES / "detail-panel-imagegen-source-v2.png",
    "enginePage": SOURCES / "engine-page-imagegen-source-v2.png",
    "components": SOURCES / "component-sheet-imagegen-source-v2.png",
    "connectors": SOURCES / "connector-sheet-imagegen-source-v2.png",
    "medallions": SOURCES / "engine-medallion-sheet-imagegen-source-v2.png",
    "modal": SOURCES / "modal-shell-imagegen-source-v2.png",
    "modalGlyphs": SOURCES / "modal-glyphs-green-imagegen-source-v2.png",
    "quickFrame": SOURCES / "quickslash-frame-green-imagegen-source-v2.png",
    "quickConnector": SOURCES / "quickslash-connector-green-imagegen-source-v2.png",
}

COMPONENT_NAMES = (
    "node-frame-quickslash-v2.png",
    "node-frame-thunderstrike-v2.png",
    "node-frame-bobo-locked-v2.png",
    "node-selection-halo-v2.png",
    "bobo-lock-seal-v2.png",
    "star-heart-socket-v2.png",
)
MEDALLION_NAMES = (
    "star-heart-ui-v2.png",
    "wayward-star-ui-v2.png",
    "hollow-sun-ui-v2.png",
    "comet-engine-ui-v2.png",
)
CONNECTOR_NAMES = (
    "connector-quickslash-v2.png",
    "connector-thunderstrike-v2.png",
)
MODAL_GLYPH_NAMES = (
    "constellation-crest-v2.png",
    "celestial-close-v2.png",
)
MAX_WORKERS = 4


def require_sources() -> None:
    missing = [str(path) for path in SOURCE_FILES.values() if not path.is_file()]
    if missing:
        raise FileNotFoundError(f"Missing ImageGen sources: {missing}")
    if not CHROMA_HELPER.is_file():
        raise FileNotFoundError(f"Missing chroma helper: {CHROMA_HELPER}")


def crop_grid(source: Path, columns: int, rows: int, names: tuple[str, ...]) -> list[Path]:
    image = Image.open(source).convert("RGBA")
    if image.width % columns or image.height % rows:
        raise ValueError(f"{source.name} is not divisible by {columns}x{rows}")
    cell_width = image.width // columns
    cell_height = image.height // rows
    if len(names) != columns * rows:
        raise ValueError("Grid name count mismatch")
    outputs = []
    for index, name in enumerate(names):
        column = index % columns
        row = index // columns
        box = (
            column * cell_width,
            row * cell_height,
            (column + 1) * cell_width,
            (row + 1) * cell_height,
        )
        output = TEMP / f"raw-{name}"
        image.crop(box).save(output)
        outputs.append(output)
    return outputs


def crop_connectors(source: Path) -> list[Path]:
    image = Image.open(source).convert("RGBA")
    split = image.height // 2
    output = TEMP / f"raw-{CONNECTOR_NAMES[1]}"
    image.crop((0, split, image.width, image.height)).save(output)
    return [SOURCE_FILES["quickConnector"], output]


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


def retain_centered_alpha_component(image: Image.Image, threshold: int = 4) -> Image.Image:
    width, height = image.size
    alpha = image.getchannel("A")
    binary = alpha.point(lambda value: 255 if value > threshold else 0)
    data = binary.get_flattened_data()
    center_x = width / 2
    center_y = height / 2
    seed = None
    seed_distance = float("inf")
    for index, value in enumerate(data):
        if not value:
            continue
        x = index % width
        y = index // width
        distance = (x - center_x) ** 2 + (y - center_y) ** 2
        if distance < seed_distance:
            seed = (x, y)
            seed_distance = distance
    if seed is None:
        raise ValueError("No alpha component survived chroma removal")
    ImageDraw.floodfill(binary, seed, 128, thresh=0)
    keep_mask = binary.point(lambda value: 255 if value == 128 else 0)
    image.putalpha(ImageChops.multiply(alpha, keep_mask))
    return image


def trim_alpha(source: Path, output: Path, padding: int = 12, max_size: int = 1024) -> None:
    image = Image.open(source).convert("RGBA")
    image = retain_centered_alpha_component(image)
    alpha_box = image.getchannel("A").getbbox()
    if not alpha_box:
        raise ValueError(f"No visible pixels after chroma removal: {source.name}")
    image = image.crop(alpha_box)
    scale = min(1.0, max_size / max(image.size))
    if scale < 1.0:
        image = image.resize(
            (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
            Image.Resampling.LANCZOS,
        )
    padded = Image.new(
        "RGBA",
        (image.width + padding * 2, image.height + padding * 2),
        (0, 0, 0, 0),
    )
    padded.alpha_composite(image, (padding, padding))
    padded.save(output, optimize=True)


def save_panel(source: Path, output: Path) -> None:
    image = Image.open(source).convert("RGB")
    image.save(output, optimize=True)


def alpha_report(path: Path) -> dict[str, object]:
    image = Image.open(path)
    has_alpha = "A" in image.getbands()
    alpha_extrema = image.getchannel("A").getextrema() if has_alpha else None
    corners = (
        image.getpixel((0, 0)),
        image.getpixel((image.width - 1, 0)),
        image.getpixel((0, image.height - 1)),
        image.getpixel((image.width - 1, image.height - 1)),
    )
    if has_alpha and any(pixel[3] != 0 for pixel in corners):
        raise ValueError(f"Transparent runtime asset has opaque corner: {path.name}")
    return {
        "width": image.width,
        "height": image.height,
        "mode": image.mode,
        "alphaExtrema": alpha_extrema,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }


def build_transparent_asset(job: tuple[Path, str]) -> None:
    raw_crop, name = job
    keyed = TEMP / f"keyed-{name}"
    remove_chroma(raw_crop, keyed)
    max_size = 1536 if name.startswith("connector-") else 768
    trim_alpha(keyed, PACK / name, max_size=max_size)


def main() -> None:
    require_sources()
    PACK.mkdir(parents=True, exist_ok=True)
    if TEMP.exists():
        expected_parent = (ROOT / "tmp" / "imagegen").resolve()
        if expected_parent not in TEMP.resolve().parents:
            raise ValueError(f"Unsafe temporary path: {TEMP}")
        shutil.rmtree(TEMP)
    TEMP.mkdir(parents=True, exist_ok=True)

    save_panel(SOURCE_FILES["tree"], PACK / "starlight-tree-panel-v2.png")
    save_panel(SOURCE_FILES["detail"], PACK / "starlight-detail-panel-v2.png")
    save_panel(SOURCE_FILES["enginePage"], PACK / "starlight-engine-page-v2.png")
    save_panel(SOURCE_FILES["modal"], PACK / "starlight-modal-shell-v2.png")

    component_crops = crop_grid(SOURCE_FILES["components"], 3, 2, COMPONENT_NAMES)
    component_crops[0] = SOURCE_FILES["quickFrame"]
    medallion_crops = crop_grid(SOURCE_FILES["medallions"], 2, 2, MEDALLION_NAMES)
    connector_crops = crop_connectors(SOURCE_FILES["connectors"])
    modal_glyph_crops = crop_grid(
        SOURCE_FILES["modalGlyphs"],
        2,
        1,
        MODAL_GLYPH_NAMES,
    )
    transparent_names = (
        COMPONENT_NAMES
        + MEDALLION_NAMES
        + CONNECTOR_NAMES
        + MODAL_GLYPH_NAMES
    )
    raw_crops = (
        component_crops
        + medallion_crops
        + connector_crops
        + modal_glyph_crops
    )

    jobs = list(zip(raw_crops, transparent_names))
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        list(executor.map(build_transparent_asset, jobs))

    runtime_names = (
        "starlight-tree-panel-v2.png",
        "starlight-detail-panel-v2.png",
        "starlight-engine-page-v2.png",
        "starlight-modal-shell-v2.png",
        *transparent_names,
    )
    manifest = {
        "version": 2,
        "generator": "built-in ImageGen plus remove_chroma_key.py",
        "assets": {
            name: alpha_report(PACK / name)
            for name in runtime_names
        },
    }
    (PACK / "manifest-v2.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    shutil.rmtree(TEMP)
    print(f"Built {len(runtime_names)} Starlight V2 assets")


if __name__ == "__main__":
    main()
