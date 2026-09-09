"""Render and measure black-plate Seedance aftereffect candidates."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
LAB = ROOT / "testing/animation-sandbox/2026-09-04-seedance-player-effects-eur10-v1"
RAW = LAB / "raw"
QA = LAB / "qa"
FFMPEG = ROOT / "tmp/seedance-loop-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe"
WIDTH = 320
HEIGHT = 180
FPS = 8


def decode(video: Path) -> np.ndarray:
    command = [
        str(FFMPEG), "-hide_banner", "-loglevel", "error", "-i", str(video),
        "-vf", f"scale={WIDTH}:{HEIGHT}:flags=lanczos,fps={FPS}",
        "-an", "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
    ]
    completed = subprocess.run(command, check=True, stdout=subprocess.PIPE)
    frame_bytes = WIDTH * HEIGHT * 3
    count = len(completed.stdout) // frame_bytes
    return np.frombuffer(completed.stdout[:count * frame_bytes], dtype=np.uint8).reshape(count, HEIGHT, WIDTH, 3)


def reverse_cosine(frames: np.ndarray) -> float:
    gray = frames.astype(np.float32).mean(axis=3)
    deltas = gray[1:] - gray[:-1]
    half = len(deltas) // 2
    if half < 2:
        return 0.0
    left = deltas[:half].reshape(-1)
    right = (-deltas[-half:][::-1]).reshape(-1)
    denominator = float(np.linalg.norm(left) * np.linalg.norm(right))
    return float(np.dot(left, right) / denominator) if denominator else 0.0


def metrics(frames: np.ndarray) -> dict:
    light = frames.max(axis=3).astype(np.float32)
    activity = light.mean(axis=(1, 2))
    active = (light > 14).mean(axis=(1, 2)) * 100
    peak_index = int(np.argmax(activity))
    peak = max(float(activity[peak_index]), 1e-6)
    first_count = max(1, round(FPS * 0.25))
    tail_count = max(1, round(FPS * 0.5))
    late = activity[int(len(activity) * 0.70):]
    corners = np.concatenate([
        light[:, :12, :].reshape(len(frames), -1),
        light[:, -12:, :].reshape(len(frames), -1),
        light[:, :, :12].reshape(len(frames), -1),
        light[:, :, -12:].reshape(len(frames), -1),
    ], axis=1)
    gray = frames.astype(np.float32).mean(axis=3)
    deltas = np.mean(np.abs(gray[1:] - gray[:-1]), axis=(1, 2))
    result = {
        "peakTimeSeconds": peak_index / FPS,
        "peakMeanLight": peak,
        "peakActivePixelsPercent": float(active[peak_index]),
        "startActivityToPeak": float(activity[:first_count].mean() / peak),
        "endActivityToPeak": float(activity[-tail_count:].mean() / peak),
        "lateReboundToPeak": float(late.max() / peak),
        "maxBorderLight": float(corners.mean(axis=1).max()),
        "frameDeltaMedian": float(np.median(deltas)),
        "frameDeltaP95": float(np.percentile(deltas, 95)),
        "reverseVelocityCosine": reverse_cosine(frames),
    }
    flags = []
    if result["startActivityToPeak"] > 0.06:
        flags.append("unclean-start")
    if result["endActivityToPeak"] > 0.12:
        flags.append("end-residue")
    if result["lateReboundToPeak"] > 0.28:
        flags.append("late-rebound")
    if result["peakActivePixelsPercent"] > 35:
        flags.append("scene-or-background-generation")
    if result["reverseVelocityCosine"] > 0.62:
        flags.append("reverse-like-motion")
    result["screeningFlags"] = flags
    return result


def render_sheet(frames: np.ndarray, output: Path, title: str) -> None:
    picks = np.linspace(0, len(frames) - 1, 8).round().astype(int)
    canvas = Image.new("RGB", (WIDTH * 4, (HEIGHT + 28) * 2 + 42), (12, 16, 24))
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 12), title, fill=(235, 241, 255))
    for slot, frame_index in enumerate(picks):
        x = (slot % 4) * WIDTH
        y = 42 + (slot // 4) * (HEIGHT + 28)
        canvas.paste(Image.fromarray(frames[frame_index]), (x, y))
        draw.text((x + 8, y + HEIGHT + 6), f"{frame_index / FPS:.2f}s  f{frame_index}", fill=(210, 220, 238))
    canvas.save(output, optimize=True)


def main() -> int:
    if not FFMPEG.is_file():
        raise FileNotFoundError(FFMPEG)
    QA.mkdir(parents=True, exist_ok=True)
    results = []
    for video in sorted(RAW.glob("fx-*.mp4")):
        frames = decode(video)
        sheet = QA / f"{video.stem}-contact-sheet.png"
        render_sheet(frames, sheet, video.stem)
        result = {
            "id": video.stem,
            "source": video.relative_to(ROOT).as_posix(),
            "sourceSha256": hashlib.sha256(video.read_bytes()).hexdigest(),
            "decodedFrames": len(frames),
            "sampleFps": FPS,
            "contactSheet": sheet.relative_to(ROOT).as_posix(),
            "metrics": metrics(frames),
        }
        results.append(result)
        print(video.stem, json.dumps(result["metrics"], sort_keys=True), flush=True)
    payload = {
        "schemaVersion": "seedance-effects-qa-v1",
        "reviewOnly": True,
        "productionChanged": False,
        "method": {
            "decode": f"{WIDTH}x{HEIGHT} at {FPS} fps",
            "screeningOnly": True,
            "manualThreeCyclePlaybackStillRequired": True,
            "noOpticalFlow": True,
        },
        "results": results,
    }
    output = QA / "effects-metrics.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"candidates": len(results), "metrics": output.relative_to(ROOT).as_posix()}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
