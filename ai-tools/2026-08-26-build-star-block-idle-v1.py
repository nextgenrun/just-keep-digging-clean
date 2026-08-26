"""Extract neutral additive Star Block idle frames from OpenRouter source clips."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "sprites/environment/star-block-idle-v1"
SOURCE = PACKAGE / "source"
CLIPS = SOURCE / "clips"
OUTPUT = ROOT / "sprites/backgrounds/world-visual-v2/semantic-decals-v1/star-block-idle-motion-atlas-v1.png"
PREVIEW = PACKAGE / "star-block-idle-motion-preview-v1.gif"
CONTACT = PACKAGE / "star-block-idle-motion-contact-v1.png"
MANIFEST = PACKAGE / "star-block-idle-v1.manifest.json"
CORE_ATLAS = ROOT / "sprites/backgrounds/world-visual-v2/semantic-decals-v1/sky-stars-floating-crystal-beauty-v2.png"
VARIANTS = ("facet-sweep", "core-breath", "stardust-orbit")
SOURCE_FPS = 6
FRAMES_PER_VARIANT = 24
WORK_SIZE = 256
FRAME_SIZE = 128
ATLAS_COLUMNS = 12
SOURCE_CROP_PX = 400
EDGE_GUARD_PX = 6
TARGET_FRAME_MEAN = 3.8
MAX_LUMINANCE = 235
TEMPORAL_NEIGHBOR_WEIGHT = 0.18


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def run_ffmpeg(ffmpeg: str, clip: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    filter_graph = (
        f"fps={SOURCE_FPS},"
        f"crop={SOURCE_CROP_PX}:{SOURCE_CROP_PX}:"
        f"(iw-{SOURCE_CROP_PX})/2:(ih-{SOURCE_CROP_PX})/2,"
        f"scale={WORK_SIZE}:{WORK_SIZE}:flags=lanczos"
    )
    subprocess.run(
        [
            ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(clip), "-vf", filter_graph,
            str(destination / "frame-%03d.png"),
        ],
        check=True,
    )

def grayscale(rgb: np.ndarray) -> np.ndarray:
    return rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722

def translate(frame: np.ndarray, dx: int, dy: int) -> np.ndarray:
    shifted = np.zeros_like(frame)
    source_x0 = max(0, -dx)
    source_x1 = min(frame.shape[1], frame.shape[1] - dx)
    source_y0 = max(0, -dy)
    source_y1 = min(frame.shape[0], frame.shape[0] - dy)
    target_x0 = max(0, dx)
    target_y0 = max(0, dy)
    width = source_x1 - source_x0
    height = source_y1 - source_y0
    if width > 0 and height > 0:
        shifted[target_y0:target_y0 + height, target_x0:target_x0 + width] = (
            frame[source_y0:source_y1, source_x0:source_x1]
        )
    return shifted

def align_frames(frames: list[np.ndarray]) -> tuple[list[np.ndarray], list[list[int]]]:
    reference = grayscale(frames[0])
    aligned = []
    shifts = []
    inset = 36
    for frame in frames:
        candidate_gray = grayscale(frame)
        best = (float("inf"), 0, 0)
        for dy in range(-7, 8):
            for dx in range(-7, 8):
                shifted = translate(candidate_gray, dx, dy)
                score = float(np.mean(np.abs(
                    reference[inset:-inset, inset:-inset]
                    - shifted[inset:-inset, inset:-inset]
                )))
                if score < best[0]:
                    best = (score, dx, dy)
        aligned.append(translate(frame, best[1], best[2]))
        shifts.append([best[1], best[2]])
    return aligned, shifts

def radial_mask(size: int) -> np.ndarray:
    axis = np.arange(size, dtype=np.float32) - (size - 1) / 2
    xx, yy = np.meshgrid(axis, axis)
    radius = np.sqrt(xx * xx + yy * yy) / (size * 0.5)
    mask = np.clip((0.98 - radius) / 0.18, 0, 1)
    mask[:EDGE_GUARD_PX, :] = 0
    mask[-EDGE_GUARD_PX:, :] = 0
    mask[:, :EDGE_GUARD_PX] = 0
    mask[:, -EDGE_GUARD_PX:] = 0
    return mask

def normalize_frame_energy(frame: np.ndarray) -> np.ndarray:
    work = np.maximum(frame.astype(np.float32), 0)
    for _ in range(5):
        current = float(np.mean(np.clip(work, 0, MAX_LUMINANCE)))
        if current <= 0.001:
            break
        work *= TARGET_FRAME_MEAN / current
    return np.clip(work, 0, MAX_LUMINANCE).astype(np.uint8)

def motion_metrics(arrays: list[np.ndarray]) -> dict:
    stack = np.stack(arrays).astype(np.float32)
    energy = np.mean(stack, axis=(1, 2))
    axis = np.arange(FRAME_SIZE, dtype=np.float32) - (FRAME_SIZE - 1) / 2
    xx, yy = np.meshgrid(axis, axis)
    radius = np.sqrt(xx * xx + yy * yy) / (FRAME_SIZE * 0.5)
    total = max(float(np.sum(stack)), 1)
    adjacent = [float(np.mean(np.abs(stack[index + 1] - stack[index])))
                for index in range(len(stack) - 1)]
    seam = float(np.mean(np.abs(stack[-1] - stack[0])))
    mean_energy = float(np.mean(energy))
    mean_adjacent = float(np.mean(adjacent))
    return {
        "meanEnergy": round(mean_energy, 4),
        "energyCoefficientOfVariation": round(float(np.std(energy) / mean_energy), 4),
        "maxFrameEnergyDeviationRatio": round(float(np.max(np.abs(energy - mean_energy)) / mean_energy), 4),
        "innerEnergyFraction": round(float(np.sum(stack[:, radius < 0.42]) / total), 4),
        "coronaEnergyFraction": round(float(np.sum(stack[:, radius >= 0.42]) / total), 4),
        "maxEnergy": int(np.max(stack)),
        "meanAdjacentDelta": round(mean_adjacent, 4),
        "seamMeanAbsoluteDelta": round(seam, 4),
        "seamToAdjacentRatio": round(seam / max(mean_adjacent, 0.001), 4),
        "uniqueFrameHashes": len({hashlib.sha256(item.tobytes()).hexdigest() for item in arrays}),
    }

def extract_motion(frames: list[np.ndarray]) -> tuple[list[Image.Image], dict]:
    aligned, shifts = align_frames(frames)
    stack = np.stack(aligned).astype(np.float32)
    gray_stack = np.stack([grayscale(frame) for frame in aligned])
    median = np.median(gray_stack, axis=0)
    coverage_source = Image.fromarray(np.clip(median, 0, 255).astype(np.uint8))
    coverage = np.asarray(
        coverage_source.filter(ImageFilter.GaussianBlur(14)), dtype=np.float32
    ) / 255
    coverage = np.clip(coverage * 1.8 + 0.22, 0.22, 1)
    mask = radial_mask(WORK_SIZE) * coverage
    regression_weight = mask * np.clip(median / 24, 0, 1)
    regression_denominator = max(float(np.sum(median * median * regression_weight)), 1)
    raw = []
    brightness_gains = []
    for gray in gray_stack:
        brightness_gain = (
            float(np.sum(gray * median * regression_weight))
            / regression_denominator
        )
        brightness_gains.append(brightness_gain)
        residual = gray - median * brightness_gain
        absolute = np.maximum(np.abs(residual) - 2.5, 0)
        positive = np.maximum(residual - 1.0, 0)
        raw.append((absolute * 1.75 + positive * 0.85) * mask)
    raw_stack = np.stack(raw)
    raw_stack = (
        raw_stack * (1 - TEMPORAL_NEIGHBOR_WEIGHT * 2)
        + np.roll(raw_stack, 1, axis=0) * TEMPORAL_NEIGHBOR_WEIGHT
        + np.roll(raw_stack, -1, axis=0) * TEMPORAL_NEIGHBOR_WEIGHT
    )
    persistent = np.percentile(raw_stack, 8, axis=0)
    raw_stack = np.maximum(raw_stack - persistent, 0)
    active = raw_stack[raw_stack > 0.5]
    ceiling = float(np.percentile(active, 99.4)) if active.size else 1.0
    scale = 220 / max(ceiling, 1)
    rendered_arrays = []
    for motion in raw_stack:
        luminance = np.clip(motion * scale, 0, MAX_LUMINANCE).astype(np.uint8)
        image = Image.fromarray(luminance, "L").filter(ImageFilter.GaussianBlur(0.45))
        image = image.resize((FRAME_SIZE, FRAME_SIZE), Image.Resampling.LANCZOS)
        rendered_arrays.append(np.asarray(image, dtype=np.float32))
    for distance, weight in ((3, 0.25), (2, 0.5), (1, 0.75)):
        index = len(rendered_arrays) - distance
        rendered_arrays[index] = (
            rendered_arrays[index] * (1 - weight)
            + rendered_arrays[0] * weight
        )
    arrays = [normalize_frame_energy(frame) for frame in rendered_arrays]
    rendered = [
        Image.merge("RGB", (Image.fromarray(frame, "L"),) * 3)
        for frame in arrays
    ]
    return rendered, {
        "alignmentShiftsPx": shifts,
        "sourceBrightnessGainRange": [round(min(brightness_gains), 4), round(max(brightness_gains), 4)],
        "normalizationCeiling": round(ceiling, 4),
        **motion_metrics(arrays),
    }

def build_atlas(variant_frames: list[list[Image.Image]]) -> Image.Image:
    flattened = [frame for frames in variant_frames for frame in frames]
    rows = (len(flattened) + ATLAS_COLUMNS - 1) // ATLAS_COLUMNS
    atlas = Image.new("RGB", (ATLAS_COLUMNS * FRAME_SIZE, rows * FRAME_SIZE), "black")
    for index, frame in enumerate(flattened):
        atlas.paste(frame, ((index % ATLAS_COLUMNS) * FRAME_SIZE, (index // ATLAS_COLUMNS) * FRAME_SIZE))
    return atlas

def load_core_frames() -> list[Image.Image]:
    with Image.open(CORE_ATLAS) as atlas:
        return [
            atlas.crop(((index % 3) * 256, (index // 3) * 256, (index % 3 + 1) * 256, (index // 3 + 1) * 256))
            .convert("RGB")
            .resize((FRAME_SIZE, FRAME_SIZE), Image.Resampling.LANCZOS)
            for index in range(6)
        ]

def build_preview(variant_frames: list[list[Image.Image]]) -> None:
    cores = [np.asarray(frame, dtype=np.int16) for frame in load_core_frames()]
    preview_frames = []
    snapshots = []
    for frame_index in range(FRAMES_PER_VARIANT):
        canvas = Image.new("RGB", (FRAME_SIZE * 6, FRAME_SIZE * len(VARIANTS)), "black")
        for variant_index, frames in enumerate(variant_frames):
            overlay = np.asarray(frames[frame_index], dtype=np.float32) * 0.26
            for rarity, core in enumerate(cores):
                combined = Image.fromarray(np.clip(core + overlay, 0, 255).astype(np.uint8), "RGB")
                canvas.paste(combined, (rarity * FRAME_SIZE, variant_index * FRAME_SIZE))
        preview_frames.append(canvas)
        if frame_index in {0, 6, 12, 18}:
            snapshots.append(canvas)
    preview_frames[0].save(
        PREVIEW, save_all=True, append_images=preview_frames[1:],
        duration=round(1000 / SOURCE_FPS), loop=0, optimize=False,
    )
    contact = Image.new("RGB", (snapshots[0].width, snapshots[0].height * len(snapshots)), "black")
    for index, snapshot in enumerate(snapshots):
        contact.paste(snapshot, (0, index * snapshot.height))
    contact.save(CONTACT, optimize=True)

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg") or "ffmpeg")
    args = parser.parse_args()
    PACKAGE.mkdir(parents=True, exist_ok=True)
    metrics = []
    variant_frames = []
    with tempfile.TemporaryDirectory(prefix="understar-star-idle-") as temporary:
        temp = Path(temporary)
        for variant in VARIANTS:
            clip = CLIPS / f"{variant}.mp4"
            if not clip.exists():
                raise FileNotFoundError(f"Missing OpenRouter source clip: {clip}")
            destination = temp / variant
            run_ffmpeg(args.ffmpeg, clip, destination)
            source_frames = sorted(destination.glob("frame-*.png"))[:FRAMES_PER_VARIANT]
            if len(source_frames) != FRAMES_PER_VARIANT:
                raise RuntimeError(f"{variant} yielded {len(source_frames)} frames, expected {FRAMES_PER_VARIANT}")
            arrays = [np.asarray(Image.open(path).convert("RGB"), dtype=np.uint8) for path in source_frames]
            frames, report = extract_motion(arrays)
            variant_frames.append(frames)
            metrics.append({"id": variant, "source": clip.relative_to(ROOT).as_posix(), "sourceSha256": sha256(clip), **report})
    atlas = build_atlas(variant_frames)
    atlas.save(OUTPUT, optimize=True)
    build_preview(variant_frames)
    decoded_bytes = atlas.width * atlas.height * 4
    manifest = {
        "schemaVersion": 1,
        "generatedBy": "ai-tools/2026-08-26-build-star-block-idle-v1.py",
        "sourceProvider": "OpenRouter",
        "sourceModel": "google/veo-3.1-lite",
        "runtimeAtlas": OUTPUT.relative_to(ROOT).as_posix(),
        "runtimeAtlasSha256": sha256(OUTPUT),
        "frameSizePx": FRAME_SIZE,
        "columns": ATLAS_COLUMNS,
        "rows": atlas.height // FRAME_SIZE,
        "frameCount": len(VARIANTS) * FRAMES_PER_VARIANT,
        "framesPerVariant": FRAMES_PER_VARIANT,
        "variantCount": len(VARIANTS),
        "fps": SOURCE_FPS,
        "decodedBytes": decoded_bytes,
        "preview": PREVIEW.relative_to(ROOT).as_posix(),
        "contactSheet": CONTACT.relative_to(ROOT).as_posix(),
        "variants": metrics,
        "apiKeyStored": False,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({
        "atlas": manifest["runtimeAtlas"],
        "frames": manifest["frameCount"],
        "decodedMiB": round(decoded_bytes / 1048576, 2),
        "preview": manifest["preview"],
    }, indent=2))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
