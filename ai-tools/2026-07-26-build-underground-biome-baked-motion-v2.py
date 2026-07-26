from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import tempfile

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = (
    ROOT
    / "visual-approval-previews"
    / "underground-biome-motion-mockups-v1"
)
KEYFRAME_DIR = (
    ROOT
    / "visual-approval-previews"
    / "underground-biome-baked-motion-v2"
)
OUTPUT_DIR = (
    ROOT
    / "sprites"
    / "backgrounds"
    / "world-visual-v2"
    / "depth"
    / "biome-motion-v2"
)
MANIFEST_PATH = OUTPUT_DIR / "2026-07-26-baked-motion-runtime-manifest-v2.json"

EXPECTED_SIZE = (1536, 1024)
EXPECTED_CODEC = "vp9"
EXPECTED_PIXEL_FORMAT = "yuv420p"
EXPECTED_FRAME_RATE = "24/1"
EXPECTED_DURATION_SECONDS = 4.0
MIN_OUTPUT_BYTES = 180_000

MOTION_STEMS = (
    "weathered-roots-root-tide-lantern-hollow",
    "blue-caverns-resonant-crystal-rain",
    "amber-depths-golden-dust-cathedral",
    "silver-core-mercury-shimmerfall",
    "core-magma-basalt-heartbeat",
    "slagworks-pressure-breath-foundry",
    "obsidian-catacombs-violet-ash-procession",
    "pressure-foundry-condenser-surge",
    "blackglass-abyss-prismatic-star-drift",
    "starfire-rift-celestial-current",
)

FLOW_FILTER = (
    "scale=1024:684:flags=lanczos,"
    "minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:"
    "me_mode=bidir:vsbmc=1,"
    "scale=1548:1032:flags=lanczos,"
    "crop=1536:1024:"
    "x=6+4*sin(2*PI*t/4):"
    "y=4+3*cos(2*PI*t/4),"
    "format=yuv420p"
)


def run(command):
    completed = subprocess.run(
        command,
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        raise RuntimeError(
            f"Command failed ({completed.returncode}): {' '.join(command)}\n"
            f"{completed.stderr}"
        )
    return completed.stdout


def verify_png(path):
    if not path.is_file():
        raise RuntimeError(f"Missing motion source: {path}")
    with Image.open(path) as image:
        if image.format != "PNG" or image.size != EXPECTED_SIZE:
            raise RuntimeError(
                f"Invalid source {path.name}: format={image.format}, size={image.size}"
            )


def build_loop(ffmpeg, stem):
    source_path = SOURCE_DIR / f"2026-07-26-{stem}.png"
    keyframe_path = KEYFRAME_DIR / f"2026-07-26-{stem}-keyframe-b-v2.png"
    output_path = OUTPUT_DIR / f"{stem}-loop-v2.webm"
    verify_png(source_path)
    verify_png(keyframe_path)

    with tempfile.TemporaryDirectory(prefix=f"dig-game-{stem}-") as temp_dir:
        temp_root = Path(temp_dir)
        shutil.copy2(source_path, temp_root / "frame-00.png")
        shutil.copy2(keyframe_path, temp_root / "frame-01.png")
        shutil.copy2(source_path, temp_root / "frame-02.png")
        shutil.copy2(source_path, temp_root / "frame-03.png")
        run([
            ffmpeg,
            "-y",
            "-framerate",
            "0.5",
            "-i",
            str(temp_root / "frame-%02d.png"),
            "-t",
            "4",
            "-vf",
            FLOW_FILTER,
            "-an",
            "-c:v",
            "libvpx-vp9",
            "-crf",
            "26",
            "-b:v",
            "0",
            "-row-mt",
            "1",
            "-tile-columns",
            "2",
            "-deadline",
            "good",
            "-cpu-used",
            "3",
            "-auto-alt-ref",
            "1",
            "-lag-in-frames",
            "25",
            str(output_path),
        ])
    return source_path, keyframe_path, output_path


def inspect_loop(ffprobe, output_path):
    payload = json.loads(run([
        ffprobe,
        "-v",
        "error",
        "-show_entries",
        "stream=codec_name,width,height,pix_fmt,r_frame_rate",
        "-show_entries",
        "format=duration,size",
        "-of",
        "json",
        str(output_path),
    ]))
    stream = payload["streams"][0]
    file_format = payload["format"]
    duration = float(file_format["duration"])
    size = int(file_format["size"])
    if stream["codec_name"] != EXPECTED_CODEC:
        raise RuntimeError(f"{output_path.name} codec is {stream['codec_name']}")
    if (stream["width"], stream["height"]) != EXPECTED_SIZE:
        raise RuntimeError(
            f"{output_path.name} size is {(stream['width'], stream['height'])}"
        )
    if stream["pix_fmt"] != EXPECTED_PIXEL_FORMAT:
        raise RuntimeError(f"{output_path.name} pixel format is {stream['pix_fmt']}")
    if stream["r_frame_rate"] != EXPECTED_FRAME_RATE:
        raise RuntimeError(f"{output_path.name} frame rate is {stream['r_frame_rate']}")
    if abs(duration - EXPECTED_DURATION_SECONDS) > 0.05:
        raise RuntimeError(f"{output_path.name} duration is {duration}")
    if size < MIN_OUTPUT_BYTES:
        raise RuntimeError(f"{output_path.name} is unexpectedly small: {size}")
    return {
        "codec": stream["codec_name"],
        "width": stream["width"],
        "height": stream["height"],
        "pixelFormat": stream["pix_fmt"],
        "frameRate": stream["r_frame_rate"],
        "durationSeconds": duration,
        "bytes": size,
    }


def build():
    ffmpeg = shutil.which("ffmpeg")
    ffprobe = shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        raise RuntimeError("FFmpeg and FFprobe must be available on PATH")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    records = []
    hashes = set()
    for index, stem in enumerate(MOTION_STEMS, start=1):
        print(f"[{index}/{len(MOTION_STEMS)}] Baking {stem}", flush=True)
        source_path, keyframe_path, output_path = build_loop(ffmpeg, stem)
        details = inspect_loop(ffprobe, output_path)
        digest = hashlib.sha256(output_path.read_bytes()).hexdigest()
        hashes.add(digest)
        records.append({
            "stem": stem,
            "source": source_path.relative_to(ROOT).as_posix(),
            "keyframeB": keyframe_path.relative_to(ROOT).as_posix(),
            "runtime": output_path.relative_to(ROOT).as_posix(),
            "sha256": digest,
            **details,
        })

    expected_paths = {
        OUTPUT_DIR / f"{stem}-loop-v2.webm"
        for stem in MOTION_STEMS
    }
    actual_paths = set(OUTPUT_DIR.glob("*-loop-v2.webm"))
    if actual_paths != expected_paths:
        missing = sorted(path.name for path in expected_paths - actual_paths)
        extra = sorted(path.name for path in actual_paths - expected_paths)
        raise RuntimeError(f"Output inventory mismatch: missing={missing}, extra={extra}")
    if len(hashes) != len(MOTION_STEMS):
        raise RuntimeError("Baked loops are not all unique")

    manifest = {
        "version": "underground-biome-baked-motion-v2",
        "reviewOnly": True,
        "productionChanged": False,
        "status": "rejected",
        "rejectionReason": "Choppy optical-flow deformation and low temporal quality",
        "motionSource": "painted-keyframe-optical-flow",
        "overlayGraphics": False,
        "subtleFloatBakedIntoImage": True,
        "loops": records,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    total_bytes = sum(record["bytes"] for record in records)
    print(
        f"Built and verified {len(records)} baked loops "
        f"({total_bytes / 1024 / 1024:.2f} MiB) in {OUTPUT_DIR}",
        flush=True,
    )


if __name__ == "__main__":
    build()
