#!/usr/bin/env python3
"""Build alpha-safe, cap-preserving runtime UI shells from ImageGen masters."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
EXPEDITION = ROOT / "sprites" / "UI" / "expedition-setup-v2"
FEEDBACK = ROOT / "sprites" / "UI" / "dynamic-feedback-v2"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def alpha_bounds(image: Image.Image) -> list[int]:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("runtime asset has no visible alpha")
    return list(bounds)


def crop_visible(image: Image.Image, padding: int = 0) -> Image.Image:
    rgba = image.convert("RGBA")
    bounds = rgba.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("source asset has no visible alpha")
    left, top, right, bottom = bounds
    return rgba.crop((
        max(0, left - padding),
        max(0, top - padding),
        min(rgba.width, right + padding),
        min(rgba.height, bottom + padding),
    ))


def retarget_middle(
    image: Image.Image,
    target_size: tuple[int, int],
    left_keep_ratio: float,
    right_keep_ratio: float,
) -> Image.Image:
    target_width, target_height = target_size
    scaled_width = max(1, round(image.width * target_height / image.height))
    scaled = image.resize((scaled_width, target_height), Image.Resampling.LANCZOS)
    left_width = max(1, round(scaled.width * left_keep_ratio))
    right_width = max(1, round(scaled.width * right_keep_ratio))
    middle_right = max(left_width + 1, scaled.width - right_width)
    middle = scaled.crop((left_width, 0, middle_right, target_height))
    middle_target_width = target_width - left_width - right_width
    if middle_target_width <= 0:
        raise ValueError("target width is too small for preserved end caps")
    middle = middle.resize(
        (middle_target_width, target_height),
        Image.Resampling.LANCZOS,
    )
    runtime = Image.new("RGBA", target_size, (0, 0, 0, 0))
    runtime.alpha_composite(scaled.crop((0, 0, left_width, target_height)), (0, 0))
    runtime.alpha_composite(middle, (left_width, 0))
    runtime.alpha_composite(
        scaled.crop((scaled.width - right_width, 0, scaled.width, target_height)),
        (target_width - right_width, 0),
    )
    return runtime


def extract_checker_alpha(source: Image.Image) -> Image.Image:
    rgb = source.convert("RGB")
    candidate = Image.new("L", rgb.size)
    pixels = rgb.load()
    candidate.putdata([
        255 if min(pixels[x, y]) >= 188 and max(pixels[x, y]) - min(pixels[x, y]) <= 26 else 0
        for y in range(rgb.height)
        for x in range(rgb.width)
    ])
    seeds = [
        (0, 0),
        (rgb.width - 1, 0),
        (0, rgb.height - 1),
        (rgb.width - 1, rgb.height - 1),
        (rgb.width // 2, 0),
        (rgb.width // 2, rgb.height - 1),
        (0, rgb.height // 2),
        (rgb.width - 1, rgb.height // 2),
        (round(rgb.width * 0.13), round(rgb.height * 0.5)),
    ]
    for seed in seeds:
        if candidate.getpixel(seed) == 255:
            ImageDraw.floodfill(candidate, seed, 128, thresh=0)
    background = candidate.point(lambda value: 255 if value == 128 else 0)
    background = background.filter(ImageFilter.GaussianBlur(radius=1.1))
    rgba = rgb.convert("RGBA")
    rgba.putalpha(ImageChops.invert(background))
    return rgba


def save_runtime(image: Image.Image, path: Path) -> dict[str, object]:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, optimize=True)
    reopened = Image.open(path).convert("RGBA")
    corners = [
        reopened.getpixel((0, 0))[3],
        reopened.getpixel((reopened.width - 1, 0))[3],
        reopened.getpixel((0, reopened.height - 1))[3],
        reopened.getpixel((reopened.width - 1, reopened.height - 1))[3],
    ]
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "width": reopened.width,
        "height": reopened.height,
        "mode": "RGBA",
        "alphaBounds": alpha_bounds(reopened),
        "cornerAlpha": corners,
        "sha256": sha256(path),
    }


def build() -> None:
    selection_source = Image.open(
        EXPEDITION / "sources" / "2026-08-31-new-expedition-selection-imagegen-master.png",
    )
    selection = retarget_middle(
        crop_visible(selection_source, padding=5),
        (1194, 498),
        left_keep_ratio=0.34,
        right_keep_ratio=0.12,
    )

    status_source = Image.open(
        FEEDBACK / "sources" / "2026-08-31-hardcore-status-shell-imagegen-master.png",
    )
    status_alpha = crop_visible(extract_checker_alpha(status_source), padding=4)
    status = retarget_middle(
        status_alpha,
        (1344, 224),
        left_keep_ratio=0.27,
        right_keep_ratio=0.12,
    )

    level_source = Image.open(
        FEEDBACK / "sources" / "2026-08-31-level-up-shell-alpha-imagegen-master.png",
    )
    level = retarget_middle(
        crop_visible(level_source, padding=5),
        (1240, 264),
        left_keep_ratio=0.28,
        right_keep_ratio=0.12,
    )

    crest_source = crop_visible(Image.open(
        FEEDBACK / "sources" / "2026-08-31-hardcore-oath-crest-alpha-imagegen-master.png",
    ))
    crest_source.thumbnail((456, 360), Image.Resampling.LANCZOS)
    crest = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    crest.alpha_composite(
        crest_source,
        ((crest.width - crest_source.width) // 2, (crest.height - crest_source.height) // 2),
    )

    assets = {
        "newExpeditionFoundation": {
            "path": "sprites/UI/expedition-setup-v2/new-expedition-foundation-v2.png",
            "width": 1536,
            "height": 1024,
            "mode": Image.open(EXPEDITION / "new-expedition-foundation-v2.png").mode,
            "sha256": sha256(EXPEDITION / "new-expedition-foundation-v2.png"),
        },
        "newExpeditionSelection": save_runtime(
            selection,
            EXPEDITION / "new-expedition-selection-v2.png",
        ),
        "hardcoreStatusShell": save_runtime(
            status,
            FEEDBACK / "hardcore-status-shell-v2.png",
        ),
        "levelUpShell": save_runtime(
            level,
            FEEDBACK / "level-up-shell-v2.png",
        ),
        "hardcoreCrest": save_runtime(
            crest,
            FEEDBACK / "hardcore-oath-crest-alpha-v2.png",
        ),
    }
    manifest = {
        "schema": "dynamic-ui-shells-v2@1",
        "generatedOn": "2026-08-31",
        "presentationOnly": True,
        "noBakedText": True,
        "noBakedRuntimeIcons": True,
        "assets": assets,
    }
    (FEEDBACK / "manifest-v2.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print("DYNAMIC_UI_SHELLS_V2_OK")


if __name__ == "__main__":
    build()
