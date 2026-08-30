"""Promote the three approved background-only loops into runtime media."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "testing/animation-sandbox/2026-08-26-surface-background-loops-v2"
SOURCE_MANIFEST = REVIEW / "loops-v3/loop-manifest.json"
OUTPUT_DIR = ROOT / "sprites/backgrounds/start-zone-scenic-v1/living-background-v1"
OUTPUT_MANIFEST = OUTPUT_DIR / "surface-living-background-v1.manifest.json"
WIDTH = 1800
HEIGHT = 534
FPS = 24
EXPECTED_FRAMES = 432
VARIANTS = (
    ("01-mini-soft-canopy-cycle", "surface-soft-canopy-v1.mp4"),
    ("02-mini-town-air-cycle", "surface-town-air-v1.mp4"),
    ("03-mini-layered-night-cycle", "surface-layered-night-v1.mp4"),
)


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


def run(command: list[str], binary: bool = False) -> bytes | str:
    completed = subprocess.run(command, capture_output=True, check=False)
    if completed.returncode:
        raise RuntimeError(completed.stderr.decode("utf-8", errors="replace").strip())
    return completed.stdout if binary else completed.stdout.decode("utf-8", errors="replace")


def encode(ffmpeg: Path, source: Path, output: Path) -> None:
    run([
        str(ffmpeg), "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
        "-vf", f"scale={WIDTH}:{HEIGHT}:flags=lanczos,setsar=1,format=yuv420p",
        "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "18",
        "-movflags", "+faststart", str(output),
    ])


def verify(ffmpeg: Path, output: Path) -> dict:
    first_frame = run([
        str(ffmpeg), "-hide_banner", "-loglevel", "error", "-i", str(output),
        "-frames:v", "1", "-pix_fmt", "rgb24", "-f", "rawvideo", "pipe:1",
    ], binary=True)
    if len(first_frame) != WIDTH * HEIGHT * 3:
        raise RuntimeError(f"Unexpected frame geometry for {output.name}")
    frame_ticks = run([
        str(ffmpeg), "-hide_banner", "-loglevel", "error", "-i", str(output),
        "-vf", "scale=1:1", "-pix_fmt", "gray", "-f", "rawvideo", "pipe:1",
    ], binary=True)
    frame_count = len(frame_ticks)
    if frame_count != EXPECTED_FRAMES:
        raise RuntimeError(f"Expected {EXPECTED_FRAMES} frames, got {frame_count}")
    return {
        "width": WIDTH,
        "height": HEIGHT,
        "fps": FPS,
        "frames": frame_count,
        "durationSeconds": frame_count / FPS,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ffmpeg", default="")
    args = parser.parse_args()
    ffmpeg = find_ffmpeg(args.ffmpeg)
    source_manifest = json.loads(SOURCE_MANIFEST.read_text(encoding="utf-8"))
    source_by_id = {item["id"]: item for item in source_manifest["results"]}
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    results = []
    for variant_id, filename in VARIANTS:
        source_record = source_by_id[variant_id]
        source = ROOT / source_record["output"]
        if sha256(source) != source_record["outputSha256"]:
            raise RuntimeError(f"Source hash changed: {source.name}")
        if source_record["groundIncluded"] is not False:
            raise RuntimeError(f"Ground-contaminated source refused: {source.name}")
        output = OUTPUT_DIR / filename
        print(f"Promoting {variant_id} -> {filename}", flush=True)
        encode(ffmpeg, source, output)
        results.append({
            "id": variant_id,
            "source": source.relative_to(ROOT).as_posix(),
            "sourceSha256": source_record["outputSha256"],
            "output": output.relative_to(ROOT).as_posix(),
            "outputSha256": sha256(output),
            "bytes": output.stat().st_size,
            "groundIncluded": False,
            "audioIncluded": False,
            **verify(ffmpeg, output),
        })
    payload = {
        "schemaVersion": "surface-living-background-runtime-v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceManifest": SOURCE_MANIFEST.relative_to(ROOT).as_posix(),
        "playback": "forward-only seamless cycle",
        "staticFallback": (
            "sprites/backgrounds/start-zone-scenic-v1/"
            "npc-town-scenic-composite-v2.webp"
        ),
        "groundIncluded": False,
        "results": results,
    }
    OUTPUT_MANIFEST.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
