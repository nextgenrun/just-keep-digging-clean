"""Build the compact production ImageGen weather-particle sheet.

The approved v11 rain, snow, and water sources are chroma keyed again from
their clean PNG masters so the rejected horizontal matte bars never enter the
runtime sheet. Atmosphere frames reuse the already alpha-processed source.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = (
    ROOT
    / "testing/animation-sandbox/v11-skyline-weather-vfx-mockup-v3/assets/sources"
)
PROCESSED_DIR = (
    ROOT
    / "testing/animation-sandbox/v11-skyline-weather-vfx-mockup-v3/assets/processed"
)
OUTPUT_DIR = ROOT / "sprites/environment/v11-skyline-weather-vfx-v1"
OUTPUT_SHEET = OUTPUT_DIR / "weather-particles-v2.png"
OUTPUT_MANIFEST = OUTPUT_DIR / "weather-particles-v2.manifest.json"

FRAME_SIZE = 256
COLUMNS = 8
ROWS = 4
CONTENT_SIZE = 224

LAYOUTS = {
    "rain": (4, 4, 6),
    "snow": (4, 4, 6),
    "water": (4, 4, 4),
    "atmosphere": (4, 4, 4),
}

FRAME_GROUPS = {
    "rainStreaks": list(range(0, 4)),
    "snowFlakes": list(range(4, 12)),
    "rainSplashes": list(range(12, 16)),
    "rainRipples": list(range(16, 20)),
    "waterDrops": list(range(20, 22)),
    "rainSpray": list(range(22, 24)),
    "snowPowder": list(range(24, 27)),
    "steam": list(range(27, 29)),
    "smoke": list(range(29, 31)),
    "groundMist": [31],
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def chroma_to_alpha(path: Path) -> Image.Image:
    rgba = np.asarray(Image.open(path).convert("RGBA")).copy()
    rgb = rgba[:, :, :3].astype(np.float32)
    red, green, blue = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    dominance = green - np.maximum(red, blue)
    key_amount = np.clip((dominance - 22.0) / 68.0, 0.0, 1.0)
    alpha = rgba[:, :, 3].astype(np.float32) * (1.0 - key_amount)

    edge = alpha < 250.0
    neutral_green = np.maximum(red, blue) * 1.04 + 5.0
    rgb[:, :, 1] = np.where(edge, np.minimum(green, neutral_green), green)
    rgba[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    rgba[:, :, 3] = alpha.astype(np.uint8)
    residual_key = (dominance > 80.0) & (rgba[:, :, 3] > 2)
    rgba[residual_key, 3] = 0
    rgba[rgba[:, :, 3] <= 16, 3] = 0
    rgba[rgba[:, :, 3] == 0, :3] = 0
    return Image.fromarray(rgba, "RGBA")


def frame_rect(image: Image.Image, layout: tuple[int, ...], frame_index: int):
    remaining = frame_index
    for row, columns in enumerate(layout):
        if remaining < columns:
            top = round(row * image.height / len(layout))
            bottom = round((row + 1) * image.height / len(layout))
            left = round(remaining * image.width / columns)
            right = round((remaining + 1) * image.width / columns)
            return left, top, right, bottom
        remaining -= columns
    raise IndexError(f"Frame {frame_index} is outside layout {layout}")


def extract_frame(image: Image.Image, sheet_name: str, frame_index: int) -> Image.Image:
    return image.crop(frame_rect(image, LAYOUTS[sheet_name], frame_index))


def extract_best_rain_streak(frame: Image.Image) -> Image.Image:
    rgba = np.asarray(frame.convert("RGBA")).copy()
    mask = (rgba[:, :, 3] > 18).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    candidates = []
    for label in range(1, count):
        x, y, width, height, area = stats[label]
        if height < 24 or width <= 0 or area < 16 or height / width < 1.8:
            continue
        score = height * 4.0 + area * 0.18 - width
        candidates.append((score, label, x, y, width, height))
    if not candidates:
        raise RuntimeError("No isolated ImageGen rain streak was found")

    _, selected, x, y, width, height = max(candidates)
    component = labels == selected
    rgba[~component, 3] = 0
    padding = 4
    left = max(0, x - padding)
    top = max(0, y - padding)
    right = min(frame.width, x + width + padding)
    bottom = min(frame.height, y + height + padding)
    return Image.fromarray(rgba, "RGBA").crop((left, top, right, bottom))


def trim(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > 3 else 0).getbbox()
    if not bbox:
        raise RuntimeError("Particle frame has no visible alpha")
    return image.crop(bbox)


def place_in_cell(image: Image.Image) -> Image.Image:
    source = trim(image)
    scale = min(CONTENT_SIZE / source.width, CONTENT_SIZE / source.height)
    size = (
        max(1, round(source.width * scale)),
        max(1, round(source.height * scale)),
    )
    source = source.resize(size, Image.Resampling.LANCZOS)
    resized = np.asarray(source).copy()
    fringe = (
        resized[:, :, 1].astype(np.int16)
        > np.maximum(resized[:, :, 0], resized[:, :, 2]).astype(np.int16) + 80
    ) & (resized[:, :, 3] < 64)
    resized[fringe, 3] = 0
    resized[resized[:, :, 3] == 0, :3] = 0
    source = Image.fromarray(resized, "RGBA")
    cell = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    cell.alpha_composite(
        source,
        ((FRAME_SIZE - size[0]) // 2, (FRAME_SIZE - size[1]) // 2),
    )
    return cell


def build_frames() -> tuple[list[Image.Image], list[str], dict[str, str]]:
    sheets = {
        kind: chroma_to_alpha(SOURCE_DIR / f"{kind}-source.png")
        for kind in ("rain", "snow", "water")
    }
    sheets["atmosphere"] = Image.open(
        PROCESSED_DIR / "atmosphere-screen.webp"
    ).convert("RGBA")

    frames: list[Image.Image] = []
    names: list[str] = []

    for index in range(4, 8):
        frame = extract_frame(sheets["rain"], "rain", index)
        frames.append(place_in_cell(extract_best_rain_streak(frame)))
        names.append(f"rain-streak-{index - 3}")
    for index in range(8):
        frames.append(place_in_cell(extract_frame(sheets["snow"], "snow", index)))
        names.append(f"snow-flake-{index + 1}")
    for index in range(4):
        frames.append(place_in_cell(extract_frame(sheets["water"], "water", index)))
        names.append(f"rain-splash-{index + 1}")
    for index in range(4, 8):
        frames.append(place_in_cell(extract_frame(sheets["water"], "water", index)))
        names.append(f"rain-ripple-{index - 3}")
    for index in (10, 11):
        frames.append(place_in_cell(extract_frame(sheets["rain"], "rain", index)))
        names.append(f"water-drop-{index - 9}")
    for index in (12, 13):
        frames.append(place_in_cell(extract_frame(sheets["rain"], "rain", index)))
        names.append(f"rain-spray-{index - 11}")
    for index in (11, 12, 13):
        frames.append(place_in_cell(extract_frame(sheets["snow"], "snow", index)))
        names.append(f"snow-powder-{index - 10}")
    for index in (8, 9):
        frames.append(
            place_in_cell(extract_frame(sheets["atmosphere"], "atmosphere", index))
        )
        names.append(f"steam-{index - 7}")
    for index in (4, 5):
        frames.append(
            place_in_cell(extract_frame(sheets["atmosphere"], "atmosphere", index))
        )
        names.append(f"smoke-{index - 3}")
    frames.append(
        place_in_cell(extract_frame(sheets["atmosphere"], "atmosphere", 10))
    )
    names.append("ground-mist-1")

    sources = {
        path.name: sha256(path)
        for path in (
            SOURCE_DIR / "rain-source.png",
            SOURCE_DIR / "snow-source.png",
            SOURCE_DIR / "water-source.png",
            PROCESSED_DIR / "atmosphere-screen.webp",
        )
    }
    return frames, names, sources


def measure_frame(frame: Image.Image, name: str) -> dict[str, object]:
    alpha = np.asarray(frame.getchannel("A"))
    visible_y, visible_x = np.nonzero(alpha > 12)
    if visible_x.size == 0:
        raise RuntimeError(f"Particle frame {name} has no production-visible alpha")
    left = int(visible_x.min())
    top = int(visible_y.min())
    right = int(visible_x.max()) + 1
    bottom = int(visible_y.max()) + 1
    width = right - left
    height = bottom - top
    if width > CONTENT_SIZE or height > CONTENT_SIZE:
        raise RuntimeError(
            f"Particle frame {name} exceeds {CONTENT_SIZE}px safe area: {width}x{height}"
        )
    return {
        "name": name,
        "visibleAlphaPixels": int((alpha > 12).sum()),
        "visibleBounds": {
            "x": left,
            "y": top,
            "width": width,
            "height": height,
        },
        "clearBorderPx": min(left, top, FRAME_SIZE - right, FRAME_SIZE - bottom),
    }


def main() -> None:
    frames, names, sources = build_frames()
    expected = COLUMNS * ROWS
    if len(frames) != expected or len(names) != expected:
        raise RuntimeError(f"Expected {expected} frames, got {len(frames)}")

    sheet = Image.new(
        "RGBA",
        (COLUMNS * FRAME_SIZE, ROWS * FRAME_SIZE),
        (0, 0, 0, 0),
    )
    for index, frame in enumerate(frames):
        sheet.alpha_composite(
            frame,
            ((index % COLUMNS) * FRAME_SIZE, (index // COLUMNS) * FRAME_SIZE),
        )

    pixels = np.asarray(sheet)
    visible = pixels[:, :, 3] > 12
    green_leak = visible & (
        pixels[:, :, 1].astype(np.int16)
        > np.maximum(pixels[:, :, 0], pixels[:, :, 2]).astype(np.int16) + 100
    )
    if int(green_leak.sum()) > 0:
        raise RuntimeError(f"Detected {int(green_leak.sum())} chroma-green pixels")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    sheet.save(OUTPUT_SHEET, "PNG", optimize=True, compress_level=9)
    manifest = {
        "version": 2,
        "method": "approved-imagegen-chroma-reextract-and-pack",
        "sheet": OUTPUT_SHEET.name,
        "width": sheet.width,
        "height": sheet.height,
        "frameWidth": FRAME_SIZE,
        "frameHeight": FRAME_SIZE,
        "contentSafeAreaPx": CONTENT_SIZE,
        "columns": COLUMNS,
        "rows": ROWS,
        "frames": dict(enumerate(names)),
        "frameMetrics": {
            str(index): measure_frame(frame, names[index])
            for index, frame in enumerate(frames)
        },
        "groups": FRAME_GROUPS,
        "visibleAlphaPixels": int(visible.sum()),
        "residualChromaGreenPixels": int(green_leak.sum()),
        "sources": sources,
    }
    OUTPUT_MANIFEST.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    manifest["outputSha256"] = sha256(OUTPUT_SHEET)
    OUTPUT_MANIFEST.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Built {OUTPUT_SHEET} with {len(frames)} clean ImageGen frames")


if __name__ == "__main__":
    main()
