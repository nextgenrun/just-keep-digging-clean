"""Build an exact-alignment material-relief variant from the active town plate."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "values" / "townSurfaceReliefBake.json"


def smoothstep(edge0: float, edge1: float, values: np.ndarray) -> np.ndarray:
    span = max(edge1 - edge0, 1e-6)
    unit = np.clip((values - edge0) / span, 0.0, 1.0)
    return unit * unit * (3.0 - 2.0 * unit)


def normalized_signed(values: np.ndarray) -> np.ndarray:
    scale = float(np.percentile(np.abs(values), 99.0))
    return np.clip(values / max(scale, 1e-6), -1.0, 1.0)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def build() -> None:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    source_path = ROOT / config["source"]
    output_path = ROOT / config["output"]
    manifest_path = ROOT / config["manifest"]
    review_path = ROOT / config["reviewOutput"]
    detail_review_path = ROOT / config["detailReviewOutput"]
    runtime_before_path = ROOT / config["runtimeBefore"]
    runtime_after_path = ROOT / config["runtimeAfter"]
    runtime_review_path = ROOT / config["runtimeReviewOutput"]

    source_image = Image.open(source_path).convert("RGB")
    rgb = np.asarray(source_image, dtype=np.float32) / 255.0
    luma = (
        rgb[..., 0] * 0.2126
        + rgb[..., 1] * 0.7152
        + rgb[..., 2] * 0.0722
    )
    luma_image = Image.fromarray(np.uint8(np.round(luma * 255.0)), mode="L")
    fine = np.asarray(
        luma_image.filter(ImageFilter.GaussianBlur(config["fineBlurPx"])),
        dtype=np.float32,
    ) / 255.0
    medium = np.asarray(
        luma_image.filter(ImageFilter.GaussianBlur(config["mediumBlurPx"])),
        dtype=np.float32,
    ) / 255.0

    micro = normalized_signed(luma - fine)
    meso = normalized_signed(fine - medium)
    gradient_y, gradient_x = np.gradient(medium)
    directional = normalized_signed(
        -(gradient_x * config["lightVector"]["x"])
        -(gradient_y * config["lightVector"]["y"])
    )
    correction = (
        micro * config["microDetailStrength"]
        + meso * config["mediumDetailStrength"]
        + directional * config["directionalReliefStrength"]
    )

    dark_protection = smoothstep(
        config["darkProtectStart"],
        config["darkProtectEnd"],
        luma,
    )
    bright_protection = 1.0 - smoothstep(
        config["brightProtectStart"],
        config["brightProtectEnd"],
        luma,
    )
    rows = np.linspace(0.0, 1.0, source_image.height, dtype=np.float32)[:, None]
    vertical_strength = config["upperPlateStrength"] + (
        1.0 - config["upperPlateStrength"]
    ) * smoothstep(
        config["fullStrengthStartFraction"] - 0.08,
        config["fullStrengthStartFraction"] + 0.08,
        rows,
    )
    correction *= dark_protection * bright_protection * vertical_strength
    correction = np.clip(
        correction,
        -config["shadowCeiling"],
        config["highlightCeiling"],
    )

    # Apply one neutral luminance correction to all channels. This keeps the
    # source palette and authored warm/cool lighting intact while making local
    # material planes and edges read more clearly.
    corrected = np.clip(rgb + correction[..., None], 0.0, 1.0)
    output_image = Image.fromarray(np.uint8(np.round(corrected * 255.0)), mode="RGB")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_image.save(
        output_path,
        format="WEBP",
        quality=int(config["webpQuality"]),
        method=6,
    )

    diff = np.abs(corrected - rgb)
    manifest = {
        "kind": "deterministic-material-relief-bake",
        "source": config["source"],
        "output": config["output"],
        "sourceSha256": sha256(source_path),
        "outputSha256": sha256(output_path),
        "width": source_image.width,
        "height": source_image.height,
        "meanAbsoluteChannelDifference": round(float(np.mean(diff)), 6),
        "p95AbsoluteChannelDifference": round(float(np.percentile(diff, 95)), 6),
        "maximumPositiveCorrection": round(float(np.max(correction)), 6),
        "maximumNegativeCorrection": round(float(np.min(correction)), 6),
        "config": config,
    }
    manifest_path.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )

    preview_scale = min(1.0, 900.0 / source_image.width)
    preview_size = (
        max(1, round(source_image.width * preview_scale)),
        max(1, round(source_image.height * preview_scale)),
    )
    before = source_image.resize(preview_size, Image.Resampling.LANCZOS)
    after = output_image.resize(preview_size, Image.Resampling.LANCZOS)
    label_height = 42
    review = Image.new(
        "RGB",
        (preview_size[0] * 2, preview_size[1] + label_height),
        (8, 12, 18),
    )
    review.paste(before, (0, label_height))
    review.paste(after, (preview_size[0], label_height))
    draw = ImageDraw.Draw(review)
    draw.text((16, 13), "BEFORE - exact active town asset", fill=(225, 231, 238))
    draw.text(
        (preview_size[0] + 16, 13),
        "AFTER - deterministic relief bake",
        fill=(225, 231, 238),
    )
    review_path.parent.mkdir(parents=True, exist_ok=True)
    review.save(review_path, optimize=True)

    detail_width = 1800
    detail_label_height = 34
    detail_gap = 12
    detail_rows = []
    for crop in config["detailCrops"]:
        box = (
            crop["x"],
            crop["y"],
            crop["x"] + crop["width"],
            crop["y"] + crop["height"],
        )
        before_crop = source_image.crop(box)
        after_crop = output_image.crop(box)
        side_width = detail_width // 2
        scale = side_width / crop["width"]
        row_height = max(1, round(crop["height"] * scale))
        before_crop = before_crop.resize((side_width, row_height), Image.Resampling.LANCZOS)
        after_crop = after_crop.resize((side_width, row_height), Image.Resampling.LANCZOS)
        detail_rows.append((crop["label"], before_crop, after_crop))

    detail_height = sum(
        detail_label_height + before_crop.height
        for _, before_crop, _ in detail_rows
    ) + detail_gap * (len(detail_rows) - 1)
    detail_review = Image.new("RGB", (detail_width, detail_height), (8, 12, 18))
    detail_draw = ImageDraw.Draw(detail_review)
    y_cursor = 0
    for label, before_crop, after_crop in detail_rows:
        detail_draw.text(
            (14, y_cursor + 9),
            f"{label} - BEFORE",
            fill=(225, 231, 238),
        )
        detail_draw.text(
            (detail_width // 2 + 14, y_cursor + 9),
            f"{label} - AFTER",
            fill=(225, 231, 238),
        )
        y_cursor += detail_label_height
        detail_review.paste(before_crop, (0, y_cursor))
        detail_review.paste(after_crop, (detail_width // 2, y_cursor))
        y_cursor += before_crop.height + detail_gap
    detail_review_path.parent.mkdir(parents=True, exist_ok=True)
    detail_review.save(detail_review_path, optimize=True)

    if runtime_before_path.exists() and runtime_after_path.exists():
        runtime_before = Image.open(runtime_before_path).convert("RGB")
        runtime_after = Image.open(runtime_after_path).convert("RGB")
        if runtime_before.size != runtime_after.size:
            raise RuntimeError("Runtime before/after captures do not share one viewport")
        runtime_label_height = 44
        runtime_review = Image.new(
            "RGB",
            (
                runtime_before.width + runtime_after.width,
                runtime_before.height + runtime_label_height,
            ),
            (8, 12, 18),
        )
        runtime_review.paste(runtime_before, (0, runtime_label_height))
        runtime_review.paste(runtime_after, (runtime_before.width, runtime_label_height))
        runtime_draw = ImageDraw.Draw(runtime_review)
        runtime_draw.text(
            (16, 14),
            "BEFORE - ACTIVE SURFACE PLATE",
            fill=(225, 231, 238),
        )
        runtime_draw.text(
            (runtime_before.width + 16, 14),
            "AFTER - SAME SAVE + RELIEF BAKE",
            fill=(225, 231, 238),
        )
        runtime_review.save(runtime_review_path, optimize=True)

    print(json.dumps(manifest, indent=2))
    print(f"review={review_path.relative_to(ROOT)}")
    print(f"detail_review={detail_review_path.relative_to(ROOT)}")
    if runtime_review_path.exists():
        print(f"runtime_review={runtime_review_path.relative_to(ROOT)}")


if __name__ == "__main__":
    build()
