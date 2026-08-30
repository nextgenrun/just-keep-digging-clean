"""Crop, conditionally stabilize, and measure closed Seedance background loops."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "testing/animation-sandbox/2026-08-26-surface-background-loops-v2"
RAW_DIR = REVIEW / "raw-v2"
OUTPUT_DIR = REVIEW / "loops-v2"
MANIFEST = OUTPUT_DIR / "loop-manifest.json"
CONTACT_SHEET = OUTPUT_DIR / "motion-contact-sheet.png"
RAW_WIDTH = 1470
RAW_HEIGHT = 630
OUTPUT_WIDTH = RAW_WIDTH
OUTPUT_HEIGHT = round(498 / 720 * RAW_HEIGHT)
SAMPLE_WIDTH = 420
SAMPLE_HEIGHT = 124
RAW_SAMPLE_HEIGHT = 180
SAMPLE_TIMES = (0.0, 3.75, 7.5, 11.25, 14.92)
STABILIZE_THRESHOLD_PX = 1.5


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def find_ffmpeg(supplied: str) -> Path:
    if supplied and Path(supplied).is_file():
        return Path(supplied).resolve()
    matches = sorted((ROOT / "tmp/seedance-loop-tools").glob(
        "imageio_ffmpeg/binaries/ffmpeg*.exe"
    ))
    if matches:
        return matches[0]
    raise FileNotFoundError("Pass --ffmpeg to an FFmpeg executable")


def run(command: list[str], cwd: Path | None = None) -> None:
    completed = subprocess.run(
        command,
        cwd=cwd,
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode:
        raise RuntimeError(completed.stderr.strip() or "FFmpeg failed")


def sample_rgb(
    ffmpeg: Path,
    video: Path,
    position: list[str],
    width: int,
    height: int,
) -> np.ndarray:
    command = [
        str(ffmpeg), "-hide_banner", "-loglevel", "error", *position,
        "-i", str(video), "-frames:v", "1",
        "-vf", f"scale={width}:{height}",
        "-pix_fmt", "rgb24", "-f", "rawvideo", "pipe:1",
    ]
    completed = subprocess.run(command, capture_output=True, check=False)
    expected = width * height * 3
    if completed.returncode or len(completed.stdout) != expected:
        error = completed.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(error or f"Frame sample failed for {video.name}")
    return np.frombuffer(completed.stdout, dtype=np.uint8).reshape(height, width, 3)


def gray_edges(frame: np.ndarray) -> np.ndarray:
    gray = np.dot(frame[..., :3], np.array([0.2126, 0.7152, 0.0722]))
    gy, gx = np.gradient(gray.astype(np.float32))
    return np.hypot(gx, gy)


def phase_shift(a: np.ndarray, b: np.ndarray, scale: float) -> dict:
    first = gray_edges(a)
    second = gray_edges(b)
    window = np.outer(np.hanning(first.shape[0]), np.hanning(first.shape[1]))
    fa = np.fft.fft2((first - first.mean()) * window)
    fb = np.fft.fft2((second - second.mean()) * window)
    cross = fa * np.conj(fb)
    cross /= np.maximum(np.abs(cross), 1e-7)
    correlation = np.abs(np.fft.ifft2(cross))
    y, x = np.unravel_index(np.argmax(correlation), correlation.shape)
    if x > first.shape[1] // 2:
        x -= first.shape[1]
    if y > first.shape[0] // 2:
        y -= first.shape[0]
    dx = float(x * scale)
    dy = float(y * scale)
    return {"dx": dx, "dy": dy, "magnitude": math.hypot(dx, dy)}


def mae(a: np.ndarray, b: np.ndarray, row_start: int, row_end: int) -> float:
    delta = np.abs(
        a[row_start:row_end].astype(np.int16)
        - b[row_start:row_end].astype(np.int16)
    )
    return float(delta.mean())


def raw_ground_shifts(ffmpeg: Path, source: Path) -> list[dict]:
    frames = [
        sample_rgb(ffmpeg, source, ["-ss", str(time)], SAMPLE_WIDTH, RAW_SAMPLE_HEIGHT)
        for time in SAMPLE_TIMES
    ]
    ground_start = round(OUTPUT_HEIGHT / RAW_HEIGHT * RAW_SAMPLE_HEIGHT) + 4
    reference = frames[0][ground_start:RAW_SAMPLE_HEIGHT - 2]
    return [
        {
            "time": time,
            **phase_shift(
                reference,
                frame[ground_start:RAW_SAMPLE_HEIGHT - 2],
                RAW_WIDTH / SAMPLE_WIDTH,
            ),
        }
        for time, frame in zip(SAMPLE_TIMES, frames)
    ]


def crop_only(ffmpeg: Path, source: Path, output: Path) -> None:
    run([
        str(ffmpeg), "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(source),
        "-vf", f"fps=24,crop={OUTPUT_WIDTH}:{OUTPUT_HEIGHT}:0:0,setsar=1,format=yuv420p",
        "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "18",
        "-movflags", "+faststart", str(output),
    ])


def tripod_stabilize(ffmpeg: Path, source: Path, output: Path) -> None:
    transforms = OUTPUT_DIR / f"{source.stem}.trf"
    run([
        str(ffmpeg), "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(source),
        "-vf", (
            "vidstabdetect=shakiness=2:accuracy=15:stepsize=4:"
            f"mincontrast=0.35:tripod=1:result={transforms.name}"
        ),
        "-f", "null", "NUL",
    ], OUTPUT_DIR)
    run([
        str(ffmpeg), "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(source),
        "-vf", (
            f"vidstabtransform=input={transforms.name}:tripod=1:maxshift=24:"
            "maxangle=0:optzoom=0:crop=keep:interpol=bicubic,"
            f"fps=24,crop={OUTPUT_WIDTH}:{OUTPUT_HEIGHT}:0:0,setsar=1,format=yuv420p"
        ),
        "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "18",
        "-movflags", "+faststart", str(output),
    ], OUTPUT_DIR)
    transforms.unlink(missing_ok=True)


def metrics(ffmpeg: Path, output: Path) -> dict:
    frames = [
        sample_rgb(ffmpeg, output, ["-ss", str(time)], SAMPLE_WIDTH, SAMPLE_HEIGHT)
        for time in SAMPLE_TIMES[:-1]
    ]
    end = sample_rgb(
        ffmpeg, output, ["-sseof", "-0.042"], SAMPLE_WIDTH, SAMPLE_HEIGHT
    )
    reference = frames[0]
    architecture_start = round(300 / OUTPUT_HEIGHT * SAMPLE_HEIGHT)
    canopy_end = architecture_start
    architecture_roi = reference[architecture_start:SAMPLE_HEIGHT - 2]
    shifts = [
        {
            "time": time,
            **phase_shift(
                architecture_roi,
                frame[architecture_start:SAMPLE_HEIGHT - 2],
                OUTPUT_WIDTH / SAMPLE_WIDTH,
            ),
        }
        for time, frame in zip(SAMPLE_TIMES[:-1], frames)
    ]
    motion = [
        {
            "time": time,
            "canopyMae": mae(reference, frame, 0, canopy_end),
            "architectureMae": mae(reference, frame, architecture_start, SAMPLE_HEIGHT),
        }
        for time, frame in zip(SAMPLE_TIMES[1:-1], frames[1:])
    ]
    return {
        "sceneAnchorShifts": shifts,
        "maxSceneAnchorShiftPx": max(item["magnitude"] for item in shifts),
        "motionSamples": motion,
        "peakCanopyMae": max(item["canopyMae"] for item in motion),
        "peakArchitectureMae": max(item["architectureMae"] for item in motion),
        "loopSeamMae": mae(reference, end, 0, SAMPLE_HEIGHT),
    }


def build_contact_sheet(ffmpeg: Path, outputs: list[Path]) -> None:
    command = [str(ffmpeg), "-hide_banner", "-loglevel", "error", "-y"]
    for output in outputs:
        command.extend(["-i", str(output)])
    rows = []
    filters = []
    for index in range(len(outputs)):
        row = f"r{index}"
        rows.append(f"[{row}]")
        filters.append(
            f"[{index}:v]fps=1/3,scale=420:124,tile=5x1[{row}]"
        )
    filters.append(f"{''.join(rows)}vstack=inputs={len(rows)}[out]")
    command.extend([
        "-filter_complex", ";".join(filters), "-map", "[out]",
        "-frames:v", "1", str(CONTACT_SHEET),
    ])
    run(command)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ffmpeg", default="")
    args = parser.parse_args()
    ffmpeg = find_ffmpeg(args.ffmpeg)
    sources = sorted(RAW_DIR.glob("*.mp4"))
    if len(sources) != 3:
        raise RuntimeError(f"Expected 3 raw clips, found {len(sources)}")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    results = []
    outputs = []
    for source in sources:
        shifts = raw_ground_shifts(ffmpeg, source)
        max_shift = max(item["magnitude"] for item in shifts)
        stabilized = max_shift > STABILIZE_THRESHOLD_PX
        output = OUTPUT_DIR / f"{source.stem}-closed-loop.mp4"
        print(f"Building {output.name}; raw anchor shift {max_shift:.2f}px", flush=True)
        if stabilized:
            tripod_stabilize(ffmpeg, source, output)
        else:
            crop_only(ffmpeg, source, output)
        outputs.append(output)
        results.append({
            "id": source.stem,
            "raw": source.relative_to(ROOT).as_posix(),
            "rawSha256": sha256(source),
            "rawContextGroundShifts": shifts,
            "rawMaxContextGroundShiftPx": max_shift,
            "stabilizationApplied": stabilized,
            "loop": output.relative_to(ROOT).as_posix(),
            "loopSha256": sha256(output),
            "bytes": output.stat().st_size,
            "dimensions": [OUTPUT_WIDTH, OUTPUT_HEIGHT],
            "groundIncluded": False,
            **metrics(ffmpeg, output),
        })
    build_contact_sheet(ffmpeg, outputs)
    payload = {
        "schemaVersion": "surface-background-closed-loops-v2",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "strategy": "identical first and last anchors; optional virtual-tripod lock; no ping-pong",
        "durationSeconds": 15.041667,
        "fps": 24,
        "animatedCrop": [0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT],
        "groundIncluded": False,
        "apiKeyStored": False,
        "contactSheet": CONTACT_SHEET.relative_to(ROOT).as_posix(),
        "results": results,
    }
    MANIFEST.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
