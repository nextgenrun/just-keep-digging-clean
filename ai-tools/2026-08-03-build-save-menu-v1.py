"""Build exact-geometry save-menu UI textures from the approved ImageGen kit."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "sprites" / "UI" / "save-menu-v1"
SOURCE_DIR = ASSET_DIR / "sources"
MASTER_SOURCE = SOURCE_DIR / "2026-08-03-save-menu-ui-kit-chroma-v1.png"
MANIFEST_OUTPUT = ASSET_DIR / "manifest-v1.json"
CHROMA_HELPER = (
    Path.home()
    / ".codex"
    / "skills"
    / ".system"
    / "imagegen"
    / "scripts"
    / "remove_chroma_key.py"
)

# Crops deliberately retain broad chroma gutters around each isolated object.
SOURCE_CROPS = {
    "slot-idle": (18, 28, 766, 478),
    "slot-selected": (768, 28, 1524, 478),
    "modal": (18, 480, 902, 1002),
    "choice": (900, 454, 1438, 1004),
}

# Three times the logical display geometry. At Ultra's 2x backing resolution,
# every asset still supplies 1.5 source pixels per physical render pixel.
OUTPUTS = {
    "slotIdle": ("slot-idle", "save-slot-idle-v1.png", (870, 600)),
    "slotSelected": ("slot-selected", "save-slot-selected-v1.png", (870, 600)),
    "modalConfirm": ("modal", "save-modal-confirm-v1.png", (1440, 420)),
    "modalBackup": ("modal", "save-modal-backup-v1.png", (1800, 1200)),
    "modalImport": ("modal", "save-modal-import-v1.png", (1500, 780)),
    "choiceIdle": ("choice", "save-choice-idle-v1.png", (870, 810)),
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def alpha_bounds(image: Image.Image, threshold: int = 8) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A").point(lambda value: 255 if value >= threshold else 0)
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError("Source contains no visible pixels")
    return bounds


def crop_master(master: Image.Image, slug: str, box: tuple[int, int, int, int]) -> Path:
    path = SOURCE_DIR / f"2026-08-03-{slug}-chroma-crop-v1.png"
    master.crop(box).save(path, optimize=True)
    return path


def remove_chroma(source: Path, slug: str) -> Path:
    if not CHROMA_HELPER.exists():
        raise FileNotFoundError(f"Missing ImageGen chroma helper: {CHROMA_HELPER}")
    output = SOURCE_DIR / f"2026-08-03-{slug}-alpha-v1.png"
    subprocess.run(
        [
            sys.executable,
            str(CHROMA_HELPER),
            "--input",
            str(source),
            "--out",
            str(output),
            "--auto-key",
            "corners",
            "--soft-matte",
            "--transparent-threshold",
            "18",
            "--opaque-threshold",
            "112",
            "--edge-contract",
            "1",
            "--spill-cleanup",
            "--force",
        ],
        check=True,
    )
    return output


def trim_and_pad(image: Image.Image, padding: int = 12) -> Image.Image:
    crop = image.crop(alpha_bounds(image))
    canvas = Image.new(
        "RGBA",
        (crop.width + padding * 2, crop.height + padding * 2),
        (0, 0, 0, 0),
    )
    canvas.alpha_composite(crop, (padding, padding))
    return canvas


def retarget_horizontal_frame(
    image: Image.Image,
    target_size: tuple[int, int],
) -> Image.Image:
    """Retarget width via quiet rail spans while preserving caps and centre crest."""
    target_width, target_height = target_size
    scale = target_height / image.height
    scaled_width = max(1, round(image.width * scale))
    scaled = image.resize((scaled_width, target_height), Image.Resampling.LANCZOS)
    if scaled_width == target_width:
        return scaled

    # cap | rail | centre crest | rail | cap
    source_stops = [0.0, 0.17, 0.43, 0.57, 0.83, 1.0]
    stops = [round(scaled_width * value) for value in source_stops]
    pieces = [
        scaled.crop((stops[index], 0, stops[index + 1], target_height))
        for index in range(5)
    ]
    fixed_width = pieces[0].width + pieces[2].width + pieces[4].width
    flexible_target = target_width - fixed_width
    if flexible_target < 16:
        return scaled.resize(target_size, Image.Resampling.LANCZOS)

    left_share = pieces[1].width / max(1, pieces[1].width + pieces[3].width)
    left_width = max(8, round(flexible_target * left_share))
    right_width = max(8, flexible_target - left_width)
    pieces[1] = pieces[1].resize((left_width, target_height), Image.Resampling.LANCZOS)
    pieces[3] = pieces[3].resize((right_width, target_height), Image.Resampling.LANCZOS)

    output = Image.new("RGBA", target_size, (0, 0, 0, 0))
    cursor = 0
    for piece in pieces:
        output.alpha_composite(piece, (cursor, 0))
        cursor += piece.width
    return output


def selected_variant(idle: Image.Image) -> Image.Image:
    alpha = idle.getchannel("A")
    bright = ImageEnhance.Brightness(idle).enhance(1.08)
    bright = ImageEnhance.Contrast(bright).enhance(1.05)
    bright = ImageEnhance.Color(bright).enhance(1.06)
    bright.putalpha(alpha)

    blurred = alpha.filter(ImageFilter.GaussianBlur(12))
    outside = ImageChops.subtract(blurred, alpha).point(lambda value: round(value * 0.46))
    glow = Image.new("RGBA", idle.size, (76, 194, 255, 0))
    glow.putalpha(outside)
    glow.alpha_composite(bright)
    return glow


def validate(image: Image.Image, label: str, target_size: tuple[int, int]) -> dict[str, object]:
    if image.mode != "RGBA" or image.size != target_size:
        raise ValueError(f"{label} geometry drifted: {image.mode} {image.size}")
    width, height = image.size
    alpha = image.getchannel("A")
    corners = [
        alpha.getpixel((0, 0)),
        alpha.getpixel((width - 1, 0)),
        alpha.getpixel((0, height - 1)),
        alpha.getpixel((width - 1, height - 1)),
    ]
    if any(corners):
        raise ValueError(f"{label} corners must remain transparent: {corners}")
    visible = sum(alpha.histogram()[1:])
    if visible <= width * height * 0.48:
        raise ValueError(f"{label} visible coverage is unexpectedly low")
    return {
        "width": width,
        "height": height,
        "alphaBounds": list(alpha_bounds(image)),
        "visiblePixels": visible,
        "cornerAlpha": corners,
    }


def main() -> None:
    if not MASTER_SOURCE.exists():
        raise FileNotFoundError(MASTER_SOURCE)
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    master = Image.open(MASTER_SOURCE).convert("RGBA")
    if master.size != (1536, 1024):
        raise ValueError(f"Expected a 1536x1024 source sheet, got {master.size}")

    sources: dict[str, dict[str, object]] = {}
    alpha_images: dict[str, Image.Image] = {}
    for slug, box in SOURCE_CROPS.items():
        chroma_path = crop_master(master, slug, box)
        alpha_path = remove_chroma(chroma_path, slug)
        alpha_image = trim_and_pad(Image.open(alpha_path).convert("RGBA"))
        alpha_images[slug] = alpha_image
        sources[slug] = {
            "crop": chroma_path.relative_to(ROOT).as_posix(),
            "alpha": alpha_path.relative_to(ROOT).as_posix(),
            "cropBox": list(box),
            "alphaBounds": list(alpha_bounds(alpha_image)),
            "sha256": sha256(alpha_path),
        }

    assets: dict[str, dict[str, object]] = {}
    built: dict[str, Image.Image] = {}
    for key, (source_key, file_name, target_size) in OUTPUTS.items():
        output = retarget_horizontal_frame(alpha_images[source_key], target_size)
        output_path = ASSET_DIR / file_name
        output.save(output_path, optimize=True)
        built[key] = output
        assets[key] = {
            "path": output_path.relative_to(ROOT).as_posix(),
            **validate(output, key, target_size),
            "sha256": sha256(output_path),
        }

    choice_selected = selected_variant(built["choiceIdle"])
    choice_selected_path = ASSET_DIR / "save-choice-selected-v1.png"
    choice_selected.save(choice_selected_path, optimize=True)
    assets["choiceSelected"] = {
        "path": choice_selected_path.relative_to(ROOT).as_posix(),
        **validate(choice_selected, "choiceSelected", (870, 810)),
        "sha256": sha256(choice_selected_path),
    }

    manifest = {
        "schema": "save-menu-v1@1",
        "masterSource": {
            "path": MASTER_SOURCE.relative_to(ROOT).as_posix(),
            "width": master.width,
            "height": master.height,
            "sha256": sha256(MASTER_SOURCE),
        },
        "displayContract": {
            "logicalDensity": 3,
            "ultraBackingDensity": 2,
            "sourcePixelsPerUltraPixel": 1.5,
            "retargetMethod": "preserved-cap-and-centre-crest horizontal rail retarget",
        },
        "sources": sources,
        "assets": assets,
    }
    MANIFEST_OUTPUT.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(MANIFEST_OUTPUT)


if __name__ == "__main__":
    main()
