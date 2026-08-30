"""Build slow, forward-only cyclic loops from the three stable Seedance takes."""

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
SOURCE_METRICS = REVIEW / "loops-v2/loop-manifest.json"
OUTPUT_DIR = REVIEW / "loops-v3"
MANIFEST = OUTPUT_DIR / "loop-manifest.json"
CONTACT_SHEET = OUTPUT_DIR / "motion-contact-sheet.png"
WIDTH = 1470
HEIGHT = 436
FPS = 24
OVERLAP_SECONDS = 3
BASE_SECONDS = 12
OUTPUT_SECONDS = 18
LOOKAHEAD_SECONDS = 0.25
SAMPLE_WIDTH = 420
SAMPLE_HEIGHT = 124
MAX_ALLOWED_DRIFT_PX = 1.5


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


def run(command: list[str]) -> None:
    completed = subprocess.run(command, capture_output=True, text=True, check=False)
    if completed.returncode:
        raise RuntimeError(completed.stderr.strip() or "FFmpeg failed")


def render_loop(ffmpeg: Path, source: Path, output: Path) -> None:
    filter_graph = (
        f"[0:v]fps={FPS},crop={WIDTH}:{HEIGHT}:0:0,split=4[a][b][c][d];"
        f"[a]trim=start={BASE_SECONDS}:end={BASE_SECONDS + OVERLAP_SECONDS},"
        "setpts=PTS-STARTPTS[tail];"
        f"[b]trim=start=0:end={OVERLAP_SECONDS},setpts=PTS-STARTPTS[head];"
        f"[tail][head]blend=all_expr='A*(1-T/{OVERLAP_SECONDS})+"
        f"B*(T/{OVERLAP_SECONDS})':shortest=1[closure];"
        f"[c]trim=start={OVERLAP_SECONDS}:end={BASE_SECONDS},"
        "setpts=PTS-STARTPTS[middle];"
        f"[d]trim=start={BASE_SECONDS}:end={BASE_SECONDS + LOOKAHEAD_SECONDS},"
        "setpts=PTS-STARTPTS[lookahead];"
        f"[closure][middle][lookahead]concat=n=3:v=1:a=0,"
        f"setpts={OUTPUT_SECONDS / BASE_SECONDS}*PTS,"
        f"minterpolate=fps={FPS}:mi_mode=blend,trim=duration={OUTPUT_SECONDS},"
        "setpts=PTS-STARTPTS,setsar=1,format=yuv420p[out]"
    )
    run([
        str(ffmpeg), "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
        "-filter_complex", filter_graph, "-map", "[out]", "-an", "-c:v", "libx264",
        "-preset", "slow", "-crf", "18", "-movflags", "+faststart", str(output),
    ])


def decode_samples(ffmpeg: Path, video: Path) -> np.ndarray:
    command = [
        str(ffmpeg), "-hide_banner", "-loglevel", "error", "-i", str(video),
        "-vf", f"fps={FPS},scale={SAMPLE_WIDTH}:{SAMPLE_HEIGHT}",
        "-pix_fmt", "rgb24", "-f", "rawvideo", "pipe:1",
    ]
    completed = subprocess.run(command, capture_output=True, check=False)
    if completed.returncode:
        raise RuntimeError(completed.stderr.decode("utf-8", errors="replace").strip())
    frame_bytes = SAMPLE_WIDTH * SAMPLE_HEIGHT * 3
    if len(completed.stdout) % frame_bytes:
        raise RuntimeError(f"Unexpected decoded byte count for {video.name}")
    return np.frombuffer(completed.stdout, dtype=np.uint8).reshape(
        -1, SAMPLE_HEIGHT, SAMPLE_WIDTH, 3
    )


def gray_edges(frame: np.ndarray) -> np.ndarray:
    gray = np.dot(frame[..., :3], np.array([0.2126, 0.7152, 0.0722]))
    gy, gx = np.gradient(gray.astype(np.float32))
    return np.hypot(gx, gy)


def phase_shift(first: np.ndarray, second: np.ndarray) -> dict:
    first_edges = gray_edges(first)
    second_edges = gray_edges(second)
    window = np.outer(np.hanning(first.shape[0]), np.hanning(first.shape[1]))
    fa = np.fft.fft2((first_edges - first_edges.mean()) * window)
    fb = np.fft.fft2((second_edges - second_edges.mean()) * window)
    cross = fa * np.conj(fb)
    cross /= np.maximum(np.abs(cross), 1e-7)
    correlation = np.abs(np.fft.ifft2(cross))
    y, x = np.unravel_index(np.argmax(correlation), correlation.shape)
    x -= first.shape[1] if x > first.shape[1] // 2 else 0
    y -= first.shape[0] if y > first.shape[0] // 2 else 0
    scale = WIDTH / SAMPLE_WIDTH
    dx, dy = float(x * scale), float(y * scale)
    return {"dx": dx, "dy": dy, "magnitude": math.hypot(dx, dy)}


def measure(frames: np.ndarray) -> dict:
    frame_count = len(frames)
    if frame_count != OUTPUT_SECONDS * FPS:
        raise RuntimeError(f"Expected {OUTPUT_SECONDS * FPS} frames, got {frame_count}")
    signed = frames.astype(np.int16)
    steps = np.abs(signed[1:] - signed[:-1]).mean(axis=(1, 2, 3))
    wrap = float(np.abs(signed[-1] - signed[0]).mean())
    sample_indices = [0, 108, 216, 324, frame_count - 1]
    architecture_top = round(300 / HEIGHT * SAMPLE_HEIGHT)
    reference_roi = frames[0, architecture_top:SAMPLE_HEIGHT - 2]
    shifts = [
        {
            "time": round(index / FPS, 3),
            **phase_shift(reference_roi, frames[index, architecture_top:SAMPLE_HEIGHT - 2]),
        }
        for index in sample_indices
    ]
    motion = [
        float(np.abs(signed[index] - signed[0]).mean()) for index in sample_indices[1:-1]
    ]
    return {
        "renderedFrameCount": frame_count,
        "durationSeconds": frame_count / FPS,
        "sceneAnchorShifts": shifts,
        "maxSceneAnchorShiftPx": max(item["magnitude"] for item in shifts),
        "loopSeamMae": wrap,
        "medianFrameStepMae": float(np.median(steps)),
        "p95FrameStepMae": float(np.percentile(steps, 95)),
        "maxFrameStepMae": float(np.max(steps)),
        "peakMotionFromStartMae": max(motion),
    }


def build_contact_sheet(ffmpeg: Path, outputs: list[Path]) -> None:
    command = [str(ffmpeg), "-hide_banner", "-loglevel", "error", "-y"]
    for output in outputs:
        command.extend(["-i", str(output)])
    filters, rows = [], []
    selected = "+".join(f"eq(n\\,{index})" for index in (0, 108, 216, 324, 431))
    for index in range(len(outputs)):
        label = f"row{index}"
        rows.append(f"[{label}]")
        filters.append(
            f"[{index}:v]select='{selected}',scale={SAMPLE_WIDTH}:{SAMPLE_HEIGHT},"
            f"tile=5x1[{label}]"
        )
    filters.append(f"{''.join(rows)}vstack=inputs={len(rows)}[out]")
    command.extend([
        "-filter_complex", ";".join(filters), "-map", "[out]", "-frames:v", "1",
        str(CONTACT_SHEET),
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
    prior = json.loads(SOURCE_METRICS.read_text(encoding="utf-8"))
    prior_by_id = {item["id"]: item for item in prior["results"]}
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    results, outputs = [], []
    for source in sources:
        source_metric = prior_by_id[source.stem]
        source_drift = max(
            source_metric["rawMaxContextGroundShiftPx"],
            source_metric["maxSceneAnchorShiftPx"],
        )
        if source_drift > MAX_ALLOWED_DRIFT_PX:
            raise RuntimeError(f"Refusing drifting source {source.name}: {source_drift:.2f}px")
        output = OUTPUT_DIR / f"{source.stem}-18s-seamless.mp4"
        print(f"Closing {source.name} into {OUTPUT_SECONDS}s forward loop", flush=True)
        render_loop(ffmpeg, source, output)
        metrics = measure(decode_samples(ffmpeg, output))
        if metrics["maxSceneAnchorShiftPx"] > MAX_ALLOWED_DRIFT_PX:
            raise RuntimeError(f"Output drifted: {output.name}")
        outputs.append(output)
        results.append({
            "id": source.stem,
            "source": source.relative_to(ROOT).as_posix(),
            "sourceSha256": sha256(source),
            "sourceMaxMeasuredDriftPx": source_drift,
            "output": output.relative_to(ROOT).as_posix(),
            "outputSha256": sha256(output),
            "bytes": output.stat().st_size,
            "dimensions": [WIDTH, HEIGHT],
            "groundIncluded": False,
            **metrics,
        })
    build_contact_sheet(ffmpeg, outputs)
    payload = {
        "schemaVersion": "surface-background-cyclic-loops-v3",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "strategy": (
            "3s forward-moving tail-to-head overlap, then 1.5x temporal stretch; "
            "no reverse, no ping-pong, no duplicated cycle"
        ),
        "sourceDurationSeconds": 15.041667,
        "closureOverlapSeconds": OVERLAP_SECONDS,
        "durationSeconds": OUTPUT_SECONDS,
        "fps": FPS,
        "animatedCrop": [0, 0, WIDTH, HEIGHT],
        "groundIncluded": False,
        "cameraLockGatePx": MAX_ALLOWED_DRIFT_PX,
        "apiKeyStored": False,
        "contactSheet": CONTACT_SHEET.relative_to(ROOT).as_posix(),
        "results": results,
    }
    MANIFEST.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
