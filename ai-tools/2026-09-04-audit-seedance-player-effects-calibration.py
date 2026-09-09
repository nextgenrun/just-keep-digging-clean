"""Measure and render contact sheets for Seedance calibration candidates."""

from __future__ import annotations

import hashlib
import json
import math
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
MAGENTA = np.array([255, 0, 255], dtype=np.int16)


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


def mad(left: np.ndarray, right: np.ndarray) -> float:
    return float(np.mean(np.abs(left.astype(np.int16) - right.astype(np.int16))))


def velocity_reverse_cosine(frames: np.ndarray) -> float:
    gray = frames.astype(np.float32).mean(axis=3)
    deltas = gray[1:] - gray[:-1]
    half = len(deltas) // 2
    if half < 2:
        return 0.0
    first = deltas[:half].reshape(-1)
    second_reversed = (-deltas[-half:][::-1]).reshape(-1)
    denominator = float(np.linalg.norm(first) * np.linalg.norm(second_reversed))
    return float(np.dot(first, second_reversed) / denominator) if denominator else 0.0


def player_metrics(frames: np.ndarray) -> dict:
    envelope = np.zeros((HEIGHT, WIDTH), dtype=bool)
    envelope[15:165, 45:285] = True
    background_mask = ~envelope
    drifts = []
    bottoms = []
    areas = []
    for frame in frames:
        delta = np.max(np.abs(frame.astype(np.int16) - frames[0].astype(np.int16)), axis=2)
        drifts.append(float(np.mean(delta[background_mask] > 24) * 100))
        chroma_distance = np.linalg.norm(frame.astype(np.int16) - MAGENTA, axis=2)
        foreground = (chroma_distance > 70) & envelope & (np.indices((HEIGHT, WIDTH))[0] < 164)
        ys, _ = np.nonzero(foreground)
        bottoms.append(int(ys.max()) if len(ys) else 0)
        areas.append(int(foreground.sum()))
    useful_areas = np.array([area for area in areas if area > 0], dtype=np.float64)
    area_ratio = float(np.percentile(useful_areas, 95) / max(1.0, np.percentile(useful_areas, 5)))
    deltas = [mad(frames[index], frames[index - 1]) for index in range(1, len(frames))]
    return {
        "seamMadRgb": mad(frames[0], frames[-1]),
        "backgroundDriftP95Percent": float(np.percentile(drifts, 95)),
        "baselineRangeSourcePx": int((max(bottoms) - min(bottoms)) * 4),
        "silhouetteAreaP95P05Ratio": area_ratio,
        "frameDeltaMedian": float(np.median(deltas)),
        "frameDeltaP95": float(np.percentile(deltas, 95)),
        "reverseVelocityCosine": velocity_reverse_cosine(frames),
    }


def effect_metrics(frames: np.ndarray) -> dict:
    anchor = frames[0].astype(np.int16)
    activity = np.mean(np.abs(frames.astype(np.int16) - anchor), axis=(1, 2, 3))
    peak_index = int(np.argmax(activity))
    peak = float(activity[peak_index])
    end = float(np.mean(activity[-max(1, len(activity) // 8):]))
    early = float(np.mean(activity[:max(1, len(activity) // 8)]))
    outside = np.ones((HEIGHT, WIDTH), dtype=bool)
    outside[55:176, 82:238] = False
    drift = []
    for frame in frames:
        delta = np.max(np.abs(frame.astype(np.int16) - anchor), axis=2)
        drift.append(float(np.mean(delta[outside] > 20) * 100))
    tail = activity[int(len(activity) * 0.70):]
    tail_rebound = float(np.max(tail) / max(peak, 1e-6))
    return {
        "peakTimeSeconds": peak_index / FPS,
        "peakActivityMadRgb": peak,
        "earlyActivityToPeak": early / max(peak, 1e-6),
        "endActivityToPeak": end / max(peak, 1e-6),
        "lateReboundToPeak": tail_rebound,
        "backgroundDriftP95Percent": float(np.percentile(drift, 95)),
        "reverseVelocityCosine": velocity_reverse_cosine(frames),
    }


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
    for video in sorted(RAW.glob("cal-*.mp4")):
        frames = decode(video)
        if len(frames) < 16:
            raise RuntimeError(f"Too few decoded frames: {video}")
        kind = "effect" if "soil-impact" in video.stem else "player"
        metrics = effect_metrics(frames) if kind == "effect" else player_metrics(frames)
        sheet = QA / f"{video.stem}-contact-sheet.png"
        render_sheet(frames, sheet, video.stem)
        results.append({
            "id": video.stem,
            "kind": kind,
            "source": video.relative_to(ROOT).as_posix(),
            "sourceSha256": hashlib.sha256(video.read_bytes()).hexdigest(),
            "decodedFrames": len(frames),
            "sampleFps": FPS,
            "contactSheet": sheet.relative_to(ROOT).as_posix(),
            "metrics": metrics,
        })
        print(video.stem, json.dumps(metrics, sort_keys=True), flush=True)

    payload = {
        "schemaVersion": "seedance-player-effects-calibration-qa-v1",
        "reviewOnly": True,
        "productionChanged": False,
        "method": {
            "decode": f"{WIDTH}x{HEIGHT} at {FPS} fps",
            "reverseMetric": "cosine between first-half velocity and negated reversed second-half velocity; high values require manual playback review",
            "noOpticalFlow": True,
        },
        "results": results,
    }
    output = QA / "calibration-metrics.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"candidates": len(results), "metrics": output.relative_to(ROOT).as_posix()}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
