"""Key black-plate Seedance selections into review-only alpha WebM aftereffects."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
LAB = ROOT / "testing/animation-sandbox/2026-09-04-seedance-player-effects-eur10-v1"
SELECTION = LAB / "qa/effects-selection.json"
OUTPUT_DIR = LAB / "processed"
MANIFEST = OUTPUT_DIR / "manifest.json"
FFMPEG = ROOT / "tmp/seedance-loop-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def encode_alpha(source: Path, output: Path, trim_start: float, trim_duration: float) -> None:
    filters = (
        f"trim=start={trim_start:.3f}:duration={trim_duration:.3f},setpts=PTS-STARTPTS,"
        "format=rgba,colorkey=0x000000:0.075:0.16"
    )
    command = [
        str(FFMPEG), "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
        "-vf", filters,
        "-an", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-auto-alt-ref", "0",
        "-deadline", "good", "-cpu-used", "2", "-crf", "22", "-b:v", "0", str(output),
    ]
    subprocess.run(command, check=True)


def alpha_evidence(video: Path) -> dict:
    width, height, fps = 160, 90, 4
    command = [
        str(FFMPEG), "-hide_banner", "-loglevel", "error", "-c:v", "libvpx-vp9", "-i", str(video),
        "-vf", f"scale={width}:{height}:flags=lanczos,fps={fps}",
        "-f", "rawvideo", "-pix_fmt", "rgba", "-",
    ]
    completed = subprocess.run(command, check=True, stdout=subprocess.PIPE)
    frame_bytes = width * height * 4
    count = len(completed.stdout) // frame_bytes
    frames = np.frombuffer(completed.stdout[:count * frame_bytes], dtype=np.uint8).reshape(count, height, width, 4)
    alpha = frames[:, :, :, 3]
    evidence = {
        "sampleFrames": count,
        "minimumAlpha": int(alpha.min()),
        "maximumAlpha": int(alpha.max()),
        "transparentPixelsPercent": float(np.mean(alpha < 16) * 100),
        "partialAlphaPixelsPercent": float(np.mean((alpha >= 16) & (alpha < 240)) * 100),
    }
    if evidence["minimumAlpha"] > 16 or evidence["maximumAlpha"] < 100 or evidence["transparentPixelsPercent"] < 20:
        raise RuntimeError(f"Alpha verification failed for {video.name}: {evidence}")
    return evidence


def main() -> int:
    if not SELECTION.is_file():
        raise FileNotFoundError(SELECTION)
    selection = json.loads(SELECTION.read_text(encoding="utf-8"))
    accepted = [item for item in selection.get("selections", []) if item.get("status") == "accepted"]
    if not accepted:
        raise RuntimeError("Selection manifest contains no accepted candidates")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    outputs = []
    for item in accepted:
        identifier = item["id"]
        source = LAB / "raw" / f"{identifier}.mp4"
        if not source.is_file():
            raise FileNotFoundError(source)
        output = OUTPUT_DIR / f"{identifier}-alpha.webm"
        trim_start = float(item.get("trimStartSeconds") or 0)
        trim_duration = float(item.get("trimDurationSeconds") or 4)
        encode_alpha(source, output, trim_start, trim_duration)
        evidence = alpha_evidence(output)
        record = {
            "id": identifier,
            "role": item["role"],
            "intendedUse": item["intendedUse"],
            "source": source.relative_to(ROOT).as_posix(),
            "sourceSha256": sha256(source),
            "output": output.relative_to(ROOT).as_posix(),
            "outputSha256": sha256(output),
            "bytes": output.stat().st_size,
            "playback": "forward-only one-shot; restart from time zero; never reverse or ping-pong",
            "sourceTrim": {"startSeconds": trim_start, "durationSeconds": trim_duration},
            "composite": "straight alpha over exact current sprites; additive/screen optional only for luminous roles",
            "alphaEvidence": evidence,
        }
        outputs.append(record)
        print(identifier, json.dumps(evidence, sort_keys=True), flush=True)
    payload = {
        "schemaVersion": "seedance-review-aftereffects-v1",
        "reviewOnly": True,
        "productionChanged": False,
        "sourceSelection": SELECTION.relative_to(ROOT).as_posix(),
        "processing": {
            "blackKey": {"color": "#000000", "similarity": 0.075, "blend": 0.16},
            "temporalInterpolation": False,
            "frameOrderChanged": False,
            "playbackDirection": "forward",
        },
        "outputs": outputs,
    }
    MANIFEST.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"processed": len(outputs), "manifest": MANIFEST.relative_to(ROOT).as_posix()}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
