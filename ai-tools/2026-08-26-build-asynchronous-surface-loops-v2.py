#!/usr/bin/env python3
"""Build restrained, seamless living-surface experiments from existing loops."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
FPS = 24
FRAMES = 432
DURATION = 18
WIDTH = 1800
HEIGHT = 534
SOURCE_ROOT = ROOT / "sprites/backgrounds/start-zone-scenic-v1/living-background-v1"
OUTPUT_ROOT = ROOT / "sprites/backgrounds/start-zone-scenic-v1/living-background-v2"
REVIEW_ROOT = (
    ROOT
    / "testing/animation-sandbox"
    / "2026-08-26-surface-living-background-layers-v2"
)

SOURCES = {
    "soft": SOURCE_ROOT / "surface-soft-canopy-v1.mp4",
    "town": SOURCE_ROOT / "surface-town-air-v1.mp4",
    "night": SOURCE_ROOT / "surface-layered-night-v1.mp4",
}

VARIANTS = (
    {
        "id": "natural-canopy",
        "label": "Natural canopy",
        "sources": ("town", "town", "town", "town"),
        "amplitudes": (24, 39, 31, 46),
        "phases": (0.35, 2.10, 4.25, 5.35),
        "zoneStrength": 0.88,
        "structureLock": 0.94,
        "starStrength": 0.55,
        "starCount": 10,
    },
    {
        "id": "depth-breeze",
        "label": "Depth breeze",
        "sources": ("soft", "town", "night", "soft"),
        "amplitudes": (26, 44, 52, 33),
        "phases": (3.45, 0.90, 4.80, 2.25),
        "zoneStrength": 0.74,
        "structureLock": 0.96,
        "starStrength": 0.45,
        "starCount": 9,
    },
    {
        "id": "quiet-stars",
        "label": "Quiet stars",
        "sources": ("town", "town", "town", "town"),
        "amplitudes": (17, 31, 23, 38),
        "phases": (1.15, 4.05, 2.45, 5.65),
        "zoneStrength": 0.82,
        "structureLock": 0.97,
        "starStrength": 0.76,
        "starCount": 14,
    },
)

STAR_POSITIONS = (
    (92, 53), (205, 32), (493, 41), (578, 96), (691, 60),
    (805, 104), (930, 53), (1056, 87), (1188, 42), (1294, 113),
    (1417, 67), (1542, 45), (1667, 94), (1740, 31),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def find_ffmpeg() -> Path:
    candidates = sorted((ROOT / "tmp/seedance-loop-tools").rglob("ffmpeg*.exe"))
    if not candidates:
        raise FileNotFoundError("Bundled ffmpeg was not found under tmp/seedance-loop-tools")
    return candidates[0]


def smoothstep(value: np.ndarray) -> np.ndarray:
    value = np.clip(value, 0.0, 1.0)
    return value * value * (3.0 - 2.0 * value)


def build_masks(mask_root: Path) -> tuple[list[Path], Path, Path, Path]:
    mask_root.mkdir(parents=True, exist_ok=True)
    x = np.arange(WIDTH, dtype=np.float32)[None, :]
    y = np.arange(HEIGHT, dtype=np.float32)[:, None]
    boundaries = (410.0, 780.0, 1160.0)
    feather = 72.0
    transitions = [smoothstep((x - (edge - feather)) / (feather * 2)) for edge in boundaries]
    x_weights = (
        1.0 - transitions[0],
        transitions[0] * (1.0 - transitions[1]),
        transitions[1] * (1.0 - transitions[2]),
        transitions[2],
    )
    tops = (145.0, 215.0, 225.0, 195.0)
    bottoms = (432.0, 414.0, 426.0, 432.0)
    zone_paths = []
    for index, (x_weight, top, bottom) in enumerate(zip(x_weights, tops, bottoms), start=1):
        upper = smoothstep((y - (top - 42.0)) / 84.0)
        lower = 1.0 - smoothstep((y - (bottom - 62.0)) / 92.0)
        mask = np.clip(x_weight * upper * lower, 0.0, 1.0)
        path = mask_root / f"canopy-zone-{index}.png"
        Image.fromarray(np.uint8(np.round(mask * 255)), "L").save(path)
        zone_paths.append(path)

    structure = smoothstep((y - 342.0) / 124.0)
    structure = np.broadcast_to(structure, (HEIGHT, WIDTH))
    structure_path = mask_root / "structure-lock.png"
    Image.fromarray(np.uint8(np.round(structure * 255)), "L").save(structure_path)

    star = Image.new("RGBA", (11, 11), (205, 229, 255, 0))
    pixels = star.load()
    for py in range(11):
        for px in range(11):
            distance2 = (px - 5) ** 2 + (py - 5) ** 2
            pixels[px, py] = (205, 229, 255, round(104 * math.exp(-distance2 / 4.2)))
    star = star.filter(ImageFilter.GaussianBlur(0.22))
    star_path = mask_root / "star-sprite.png"
    star.save(star_path)

    static_path = mask_root / "town-static-frame.png"
    return zone_paths, structure_path, star_path, static_path


def looped_image_args(path: Path) -> list[str]:
    return ["-loop", "1", "-framerate", str(FPS), "-t", str(DURATION), "-i", str(path)]


def retime_expression(amplitude: int, phase: float) -> str:
    return (
        f"(N+{amplitude}*(sin(2*PI*N/{FRAMES - 1}+{phase})"
        f"-sin({phase})))/({FPS}*TB)"
    )


def build_filter(variant: dict) -> str:
    filters = [
        f"[0:v]trim=duration={DURATION},setpts=PTS-STARTPTS,fps={FPS},"
        "format=yuv444p[base]"
    ]
    for index, (amplitude, phase) in enumerate(
        zip(variant["amplitudes"], variant["phases"]), start=1
    ):
        filters.append(
            f"[{index}:v]trim=duration={DURATION},"
            f"setpts={retime_expression(amplitude, phase)},fps={FPS},"
            f"format=yuv444p[z{index}]"
        )
        filters.append(
            f"[{index + 4}:v]format=gray,"
            f"lut=y='val*{variant['zoneStrength']}'[m{index}]"
        )

    previous = "base"
    for index in range(1, 5):
        output = f"mix{index}"
        filters.append(f"[{previous}][z{index}][m{index}]maskedmerge[{output}]")
        previous = output

    filters.extend(
        [
            "[9:v]format=yuv444p[still]",
            f"[10:v]format=gray,lut=y='val*{variant['structureLock']}'[lockmask]",
            f"[{previous}][still][lockmask]maskedmerge[locked]",
            f"[11:v]format=rgba,split={variant['starCount']}"
            + "".join(f"[star{index}]" for index in range(variant["starCount"])),
        ]
    )

    previous = "locked"
    periods = (6.0, 9.0, 18.0, 9.0, 6.0)
    for index, (star_x, star_y) in enumerate(STAR_POSITIONS[: variant["starCount"]]):
        period = periods[index % len(periods)]
        phase = (index * 2.3999632297) % (2 * math.pi)
        strength = variant["starStrength"] * (0.78 + 0.055 * (index % 4))
        filters.append(
            f"[star{index}]geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':"
            f"a='alpha(X,Y)*{strength:.4f}*(0.14+0.86*(0.5+0.5*"
            f"sin(2*PI*T/{period}+{phase:.5f})))'[pulse{index}]"
        )
        output = f"stars{index}"
        filters.append(
            f"[{previous}][pulse{index}]overlay=x={star_x - 5}:y={star_y - 5}:"
            f"shortest=1:eof_action=pass:format=auto[{output}]"
        )
        previous = output
    filters.append(f"[{previous}]format=yuv420p[out]")
    return ";".join(filters)


def run_ffmpeg(command: list[str], label: str) -> None:
    print(f"Rendering {label}...", flush=True)
    completed = subprocess.run(command, capture_output=True, text=True)
    if completed.returncode:
        tail = "\n".join(completed.stderr.splitlines()[-35:])
        raise RuntimeError(f"ffmpeg failed while {label}:\n{tail}")


def render_variant(ffmpeg: Path, variant: dict, paths: tuple) -> Path:
    zone_paths, structure_path, star_path, static_path = paths
    output = OUTPUT_ROOT / f"surface-{variant['id']}-v2.mp4"
    command = [str(ffmpeg), "-hide_banner", "-y"]
    command += ["-i", str(SOURCES["town"])]
    for source_name in variant["sources"]:
        command += ["-i", str(SOURCES[source_name])]
    for mask_path in zone_paths:
        command += looped_image_args(mask_path)
    command += looped_image_args(static_path)
    command += looped_image_args(structure_path)
    command += looped_image_args(star_path)
    command += [
        "-filter_complex", build_filter(variant), "-map", "[out]", "-an",
        "-t", str(DURATION), "-r", str(FPS), "-frames:v", str(FRAMES),
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output),
    ]
    run_ffmpeg(command, variant["label"])
    return output


def decode_probe(ffmpeg: Path, path: Path) -> np.ndarray:
    command = [
        str(ffmpeg), "-hide_banner", "-loglevel", "error", "-i", str(path),
        "-vf", f"scale=450:134,fps={FPS}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
    ]
    completed = subprocess.run(command, capture_output=True)
    if completed.returncode:
        raise RuntimeError(completed.stderr.decode("utf-8", errors="replace"))
    frame_bytes = 450 * 134 * 3
    count = len(completed.stdout) // frame_bytes
    return np.frombuffer(completed.stdout[: count * frame_bytes], dtype=np.uint8).reshape(
        count, 134, 450, 3
    )


def motion_metrics(frames: np.ndarray) -> dict:
    data = frames.astype(np.int16)
    steps = np.abs(data[1:] - data[:-1])
    rois = ((0, 104, 35, 108), (92, 205, 52, 108), (180, 305, 55, 109), (280, 450, 48, 109))
    signals = []
    for x0, x1, y0, y1 in rois:
        signals.append(steps[:, y0:y1, x0:x1].mean(axis=(1, 2, 3)))
    correlations = []
    for left in range(len(signals)):
        for right in range(left + 1, len(signals)):
            correlations.append(float(np.corrcoef(signals[left], signals[right])[0, 1]))
    upper_steps = steps[:, :112]
    step_signal = upper_steps.mean(axis=(1, 2, 3))
    seam = float(np.abs(data[-1, :112] - data[0, :112]).mean())
    return {
        "meanCanopyMotionCorrelation": round(float(np.mean(correlations)), 4),
        "maxCanopyMotionCorrelation": round(float(np.max(correlations)), 4),
        "meanUpperFrameStepMae": round(float(np.mean(step_signal)), 4),
        "maxUpperFrameStepMae": round(float(np.max(step_signal)), 4),
        "loopSeamMae": round(seam, 4),
        "loopSeamToMedianStepRatio": round(seam / max(float(np.median(step_signal)), 0.0001), 4),
        "lowerStructureMeanStepMae": round(float(steps[:, 108:].mean()), 4),
        "peakMotionFromStartMae": round(
            float(np.max(np.abs(data[:, :112] - data[0, :112]).mean(axis=(1, 2, 3)))), 4
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", choices=[item["id"] for item in VARIANTS])
    args = parser.parse_args()
    ffmpeg = find_ffmpeg()
    for source in SOURCES.values():
        if not source.exists():
            raise FileNotFoundError(source)
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    REVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    mask_root = REVIEW_ROOT / "masks"
    paths = build_masks(mask_root)
    static_path = paths[-1]
    run_ffmpeg(
        [str(ffmpeg), "-hide_banner", "-y", "-i", str(SOURCES["town"]),
         "-frames:v", "1", str(static_path)],
        "static structure anchor",
    )

    selected = [item for item in VARIANTS if not args.only or item["id"] == args.only]
    baseline = motion_metrics(decode_probe(ffmpeg, SOURCES["town"]))
    results = []
    for variant in selected:
        output = render_variant(ffmpeg, variant, paths)
        results.append(
            {
                "id": variant["id"],
                "output": output.relative_to(ROOT).as_posix(),
                "sha256": sha256(output),
                "bytes": output.stat().st_size,
                "width": WIDTH,
                "height": HEIGHT,
                "fps": FPS,
                "frames": FRAMES,
                "durationSeconds": DURATION,
                "groundIncluded": False,
                "audioIncluded": False,
                "sources": list(variant["sources"]),
                "amplitudesFrames": list(variant["amplitudes"]),
                "phasesRadians": list(variant["phases"]),
                "zoneStrength": variant["zoneStrength"],
                "structureLock": variant["structureLock"],
                "starCount": variant["starCount"],
                "metrics": motion_metrics(decode_probe(ffmpeg, output)),
            }
        )
    manifest = {
        "id": "surface-living-background-layers-v2",
        "generated": "2026-08-26",
        "strategy": (
            "forward-only 18 second loops; four feathered canopy zones use independent "
            "monotonic time curves; structures are anchored; star pulses close exactly"
        ),
        "runtimeDecoderCount": 1,
        "groundIncluded": False,
        "audioIncluded": False,
        "sourceHashes": {name: sha256(path) for name, path in SOURCES.items()},
        "baselineTownAirMetrics": baseline,
        "results": results,
    }
    manifest_path = OUTPUT_ROOT / "surface-living-background-v2.manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (REVIEW_ROOT / "result-manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(manifest, indent=2), flush=True)


if __name__ == "__main__":
    main()
