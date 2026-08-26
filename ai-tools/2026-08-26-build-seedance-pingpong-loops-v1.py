"""Turn Seedance half-cycles into deterministic forward/reverse MP4 loops."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "testing/animation-sandbox/2026-08-26-real-surface-living-background-v1"
RAW_DIR = REVIEW / "raw-v1"
OUTPUT_DIR = REVIEW / "loops-v1"
MANIFEST_PATH = OUTPUT_DIR / "loop-manifest.json"
SAMPLE_WIDTH = 320
SAMPLE_HEIGHT = 180
SURFACE_SAMPLE_Y = round(534 / 941 * SAMPLE_HEIGHT)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def find_ffmpeg(supplied: str) -> Path:
    if supplied:
        candidate = Path(supplied).resolve()
        if candidate.is_file():
            return candidate
    matches = sorted((ROOT / "tmp/seedance-loop-tools").glob(
        "imageio_ffmpeg/binaries/ffmpeg*.exe"
    ))
    if matches:
        return matches[0]
    raise FileNotFoundError("Pass --ffmpeg to an FFmpeg 7 executable")


def run_ffmpeg(ffmpeg: Path, source: Path, output: Path) -> None:
    filter_graph = (
        "[0:v]fps=24,setpts=PTS-STARTPTS,split=2[forward][reversein];"
        "[reversein]reverse,setpts=PTS-STARTPTS[reverse];"
        "[forward][reverse]concat=n=2:v=1:a=0,format=yuv420p[outv]"
    )
    command = [
        str(ffmpeg), "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(source), "-filter_complex", filter_graph,
        "-map", "[outv]", "-an", "-c:v", "libx264", "-preset", "slow",
        "-crf", "18", "-movflags", "+faststart", str(output),
    ]
    completed = subprocess.run(command, capture_output=True, text=True, check=False)
    if completed.returncode:
        raise RuntimeError(completed.stderr.strip() or f"FFmpeg failed for {source.name}")


def sample_rgb(ffmpeg: Path, video: Path, position: list[str]) -> bytes:
    command = [
        str(ffmpeg), "-hide_banner", "-loglevel", "error", *position,
        "-i", str(video), "-frames:v", "1",
        "-vf", f"scale={SAMPLE_WIDTH}:{SAMPLE_HEIGHT}",
        "-pix_fmt", "rgb24", "-f", "rawvideo", "pipe:1",
    ]
    completed = subprocess.run(command, capture_output=True, check=False)
    expected = SAMPLE_WIDTH * SAMPLE_HEIGHT * 3
    if completed.returncode or len(completed.stdout) != expected:
        error = completed.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(error or f"Frame sample failed for {video.name}")
    return completed.stdout


def compare(a: bytes, b: bytes, start_row: int = 0, end_row: int = SAMPLE_HEIGHT) -> dict:
    start = start_row * SAMPLE_WIDTH * 3
    end = end_row * SAMPLE_WIDTH * 3
    rgb_delta = 0
    luma_a = 0.0
    luma_b = 0.0
    samples = (end - start) // 3
    for index in range(start, end, 3):
        ar, ag, ab = a[index:index + 3]
        br, bg, bb = b[index:index + 3]
        rgb_delta += abs(ar - br) + abs(ag - bg) + abs(ab - bb)
        luma_a += ar * 0.2126 + ag * 0.7152 + ab * 0.0722
        luma_b += br * 0.2126 + bg * 0.7152 + bb * 0.0722
    return {
        "mae": rgb_delta / (samples * 3),
        "lumaDelta": abs(luma_a - luma_b) / samples,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ffmpeg", default="")
    args = parser.parse_args()
    ffmpeg = find_ffmpeg(args.ffmpeg)
    sources = sorted(RAW_DIR.glob("*.mp4"))
    if not sources:
        raise FileNotFoundError(f"No raw MP4 files found in {RAW_DIR}")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    results = []
    for source in sources:
        output = OUTPUT_DIR / f"{source.stem}-pingpong.mp4"
        print(f"Building {output.name}", flush=True)
        run_ffmpeg(ffmpeg, source, output)

        raw_start = sample_rgb(ffmpeg, source, ["-ss", "0"])
        raw_peak = sample_rgb(ffmpeg, source, ["-ss", "3.45"])
        loop_start = sample_rgb(ffmpeg, output, ["-ss", "0"])
        loop_end = sample_rgb(ffmpeg, output, ["-sseof", "-0.04"])
        results.append({
            "id": source.stem,
            "raw": source.relative_to(ROOT).as_posix(),
            "rawSha256": sha256(source),
            "loop": output.relative_to(ROOT).as_posix(),
            "loopSha256": sha256(output),
            "bytes": output.stat().st_size,
            "motion": {
                "wholeFrame": compare(raw_start, raw_peak),
                "upperWorld": compare(raw_start, raw_peak, 0, SURFACE_SAMPLE_Y),
                "earth": compare(raw_start, raw_peak, SURFACE_SAMPLE_Y, SAMPLE_HEIGHT),
            },
            "loopSeam": compare(loop_start, loop_end),
        })

    manifest = {
        "schemaVersion": "seedance-pingpong-loops-v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "strategy": "24 fps forward plus exact reverse; silent H.264",
        "referenceSurfaceSampleRow": SURFACE_SAMPLE_Y,
        "apiKeyStored": False,
        "results": results,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
