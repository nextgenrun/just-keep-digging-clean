from __future__ import annotations

import argparse
from pathlib import Path
import hashlib
import json
import math
import shutil
import subprocess

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "visual-approval-previews" / "underground-biome-motion-mockups-v1"
REVIEW_OUTPUT_DIR = ROOT / "visual-approval-previews" / "underground-biome-smooth-motion-v3"
REVIEW_OUTPUT = REVIEW_OUTPUT_DIR / "2026-07-26-weathered-roots-smooth-plate-float-v3.mp4"
REVIEW_MANIFEST = REVIEW_OUTPUT_DIR / "2026-07-26-smooth-motion-v3-manifest.json"
PRODUCTION_OUTPUT_DIR = ROOT / "sprites" / "backgrounds" / "world-visual-v2" / "depth" / "biome-motion-v3"
PRODUCTION_MANIFEST = PRODUCTION_OUTPUT_DIR / "2026-07-26-smooth-motion-runtime-manifest-v3.json"

LOOPS = (
    ("weathered-roots-root-tide-lantern-hollow", "roots"),
    ("blue-caverns-resonant-crystal-rain", "blue"),
    ("amber-depths-golden-dust-cathedral", "amber"),
    ("silver-core-mercury-shimmerfall", "silver"),
    ("core-magma-basalt-heartbeat", "core"),
    ("slagworks-pressure-breath-foundry", "slagworks"),
    ("obsidian-catacombs-violet-ash-procession", "obsidian"),
    ("pressure-foundry-condenser-surge", "foundry"),
    ("blackglass-abyss-prismatic-star-drift", "blackglass"),
    ("starfire-rift-celestial-current", "starfire"),
)

WIDTH = 1536
HEIGHT = 1024
FRAME_RATE = 60
DURATION_SECONDS = 8
FRAME_COUNT = FRAME_RATE * DURATION_SECONDS
ZOOM = 1.012
X_AMPLITUDE_PX = 3.2
Y_AMPLITUDE_PX = 2.1
CRF = 14


def run(command: list[str]) -> str:
    completed = subprocess.run(command, capture_output=True, text=True, check=False)
    if completed.returncode:
        message = f"Command failed ({completed.returncode}): {' '.join(command)}"
        raise RuntimeError(f"{message}\n{completed.stderr}")
    return completed.stdout


def position(frame_index: int) -> tuple[float, float]:
    theta = math.tau * frame_index / FRAME_COUNT
    return X_AMPLITUDE_PX * math.sin(theta), Y_AMPLITUDE_PX * math.cos(theta)


def max_frame_step() -> float:
    positions = [position(index) for index in range(FRAME_COUNT)]
    positions.append(positions[0])
    return max(
        math.hypot(next_x - x, next_y - y)
        for (x, y), (next_x, next_y) in zip(positions, positions[1:])
    )


def build(ffmpeg: str, source_path: Path, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source_path) as opened:
        if opened.size != (WIDTH, HEIGHT):
            raise RuntimeError(f"Unexpected source size for {source_path.name}: {opened.size}")
        source = opened.convert("RGB")

    command = [
        ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo", "-pixel_format", "rgb24",
        "-video_size", f"{WIDTH}x{HEIGHT}", "-framerate", str(FRAME_RATE),
        "-i", "-", "-an", "-c:v", "libx264", "-preset", "medium",
        "-crf", str(CRF), "-pix_fmt", "yuv420p", "-profile:v", "high",
        "-level", "5.1", "-movflags", "+faststart",
        str(output_path),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    if process.stdin is None or process.stderr is None:
        raise RuntimeError("Unable to open FFmpeg frame pipe")

    inverse_zoom = 1 / ZOOM
    base_x = (WIDTH - WIDTH * inverse_zoom) * 0.5
    base_y = (HEIGHT - HEIGHT * inverse_zoom) * 0.5
    try:
        for frame_index in range(FRAME_COUNT):
            x, y = position(frame_index)
            frame = source.transform(
                (WIDTH, HEIGHT),
                Image.Transform.AFFINE,
                (inverse_zoom, 0, base_x + x, 0, inverse_zoom, base_y + y),
                resample=Image.Resampling.BICUBIC,
            )
            process.stdin.write(frame.tobytes())
    finally:
        process.stdin.close()

    error = process.stderr.read().decode("utf-8", errors="replace")
    return_code = process.wait()
    if return_code:
        raise RuntimeError(f"FFmpeg failed ({return_code}):\n{error}")


def inspect(ffprobe: str, output_path: Path) -> dict[str, object]:
    details = json.loads(run([
        ffprobe,
        "-v",
        "error",
        "-show_entries",
        "stream=codec_name,width,height,pix_fmt,r_frame_rate,nb_frames",
        "-show_entries",
        "format=duration,size",
        "-of",
        "json",
        str(output_path),
    ]))
    stream = details["streams"][0]
    media_format = details["format"]
    expected = {
        "codec_name": "h264",
        "width": WIDTH,
        "height": HEIGHT,
        "pix_fmt": "yuv420p",
        "r_frame_rate": f"{FRAME_RATE}/1",
        "nb_frames": str(FRAME_COUNT),
    }
    for key, value in expected.items():
        if stream.get(key) != value:
            raise RuntimeError(f"Unexpected {key}: {stream.get(key)}")
    duration = float(media_format["duration"])
    if abs(duration - DURATION_SECONDS) > 0.02:
        raise RuntimeError(f"Unexpected duration: {duration}")
    return {
        "codec": stream["codec_name"],
        "width": stream["width"],
        "height": stream["height"],
        "pixelFormat": stream["pix_fmt"],
        "frameRate": stream["r_frame_rate"],
        "frames": int(stream["nb_frames"]),
        "durationSeconds": duration,
        "bytes": int(media_format["size"]),
    }


def make_record(
    ffmpeg: str,
    ffprobe: str,
    stem: str,
    region_id: str,
    output_path: Path,
    temporal_step: float,
    reuse_approved: bool = False,
) -> dict[str, object]:
    source_path = SOURCE_DIR / f"2026-07-26-{stem}.png"
    if reuse_approved and REVIEW_OUTPUT.exists():
        output_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(REVIEW_OUTPUT, output_path)
        print(f"Reused approved artifact: {output_path.name}", flush=True)
    else:
        print(f"Rendering {region_id}: {output_path.name}", flush=True)
        build(ffmpeg, source_path, output_path)
    media = inspect(ffprobe, output_path)
    digest = hashlib.sha256(output_path.read_bytes()).hexdigest()
    return {
        "regionId": region_id,
        "source": source_path.relative_to(ROOT).as_posix(),
        "output": output_path.relative_to(ROOT).as_posix(),
        "motionSource": "subpixel-affine-whole-finished-image",
        "opticalFlow": False,
        "overlayGraphics": False,
        "zoom": ZOOM,
        "xAmplitudePx": X_AMPLITUDE_PX,
        "yAmplitudePx": Y_AMPLITUDE_PX,
        "maxFrameStepPx": temporal_step,
        "crf": CRF,
        "sha256": digest,
        **media,
    }


def build_review(ffmpeg: str, ffprobe: str, temporal_step: float) -> None:
    stem, region_id = LOOPS[0]
    record = make_record(
        ffmpeg,
        ffprobe,
        stem,
        region_id,
        REVIEW_OUTPUT,
        temporal_step,
    )
    manifest = {
        "version": "underground-biome-smooth-motion-v3",
        "reviewOnly": True,
        "productionChanged": False,
        "status": "approved",
        "scope": "one-biome-temporal-quality-gate",
        **record,
    }
    REVIEW_MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(
        f"Built approved smooth-motion reference: {REVIEW_OUTPUT.name} "
        f"({record['bytes'] / 1024 / 1024:.2f} MiB)",
        flush=True,
    )


def build_production(ffmpeg: str, ffprobe: str, temporal_step: float) -> None:
    records = []
    for stem, region_id in LOOPS:
        output_path = PRODUCTION_OUTPUT_DIR / f"{stem}-loop-v3.mp4"
        records.append(make_record(
            ffmpeg,
            ffprobe,
            stem,
            region_id,
            output_path,
            temporal_step,
            reuse_approved=region_id == "roots",
        ))
    manifest = {
        "version": "underground-biome-smooth-motion-v3",
        "reviewOnly": False,
        "productionChanged": True,
        "status": "approved",
        "approval": "Explicit user approval after smooth-motion V3 review",
        "scope": "one-approved-whole-image-loop-per-underground-biome",
        "motionSource": "subpixel-affine-whole-finished-image",
        "opticalFlow": False,
        "overlayGraphics": False,
        "loopCount": len(records),
        "loops": records,
    }
    PRODUCTION_MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    total_bytes = sum(record["bytes"] for record in records)
    print(
        f"Built {len(records)} production loops "
        f"({total_bytes / 1024 / 1024:.2f} MiB)",
        flush=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--production",
        action="store_true",
        help="Build the ten explicitly approved production biome loops.",
    )
    args = parser.parse_args()
    ffmpeg = shutil.which("ffmpeg")
    ffprobe = shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        raise RuntimeError("FFmpeg and FFprobe must be on PATH")

    temporal_step = max_frame_step()
    if temporal_step >= 0.08:
        raise RuntimeError(f"Frame-to-frame movement is too large: {temporal_step}")
    if args.production:
        build_production(ffmpeg, ffprobe, temporal_step)
    else:
        build_review(ffmpeg, ffprobe, temporal_step)


if __name__ == "__main__":
    main()
