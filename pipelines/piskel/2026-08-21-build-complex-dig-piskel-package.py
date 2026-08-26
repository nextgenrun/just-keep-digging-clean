"""Tone-match and round-trip the approved complex-dig family through Piskel.

The approved Survival V4 render remains the geometry/detail authority. This
pass applies one family-wide, highlight-preserving gamma curve so the brighter
Mixamo lighting matches the existing idle/walk sprites, creates editable Piskel
documents, verifies a lossless Piskel round-trip, and gates the runtime handoff
origins at gameplay scale. It never rescales individual frames or downsamples
again.
"""

from __future__ import annotations

import hashlib
import json
import math
import statistics
import sys
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageStat


ROOT = Path(__file__).resolve().parents[2]
PISKEL_TOOLS = ROOT / "tools" / "piskel-mcp"
sys.path.insert(0, str(PISKEL_TOOLS))

from piskel_document import make_piskel, read_piskel, write_json  # noqa: E402


RUNTIME_ROOT = ROOT / "sprites" / "character" / "survival-character-blender-v2" / "runtime"
RUNTIME_MANIFEST_PATH = RUNTIME_ROOT / "mixamo-complex-dig-runtime-v1-manifest.json"
SOURCE_MANIFEST_PATH = (
    ROOT
    / "testing"
    / "blender-animation-lab-v1"
    / "review-drafts"
    / "mixamo-punch-sequence-sandbox-v1"
    / "renders"
    / "candidate"
    / "manifest.json"
)
REFERENCE_MANIFEST_PATH = RUNTIME_ROOT / "manifest.json"
REFERENCE_FAMILIES = {
    # Runtime values from SURVIVAL_BLENDER_V2_RUNTIME.groundedVisualCalibration.
    "idle": {"displaySizePx": 101},
    "walk": {"displaySizePx": 104},
}
ALPHA_THRESHOLD = 16


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sheet_frames(path: Path, frame_count: int, columns: int, frame_size: int) -> list[Image.Image]:
    sheet = Image.open(path).convert("RGBA")
    expected_rows = (frame_count + columns - 1) // columns
    if sheet.size != (columns * frame_size, expected_rows * frame_size):
        raise ValueError(f"{path.name}: unexpected sheet size {sheet.size}")
    return [
        sheet.crop((
            (index % columns) * frame_size,
            (index // columns) * frame_size,
            (index % columns + 1) * frame_size,
            (index // columns + 1) * frame_size,
        ))
        for index in range(frame_count)
    ]


def save_sheet(path: Path, frames: list[Image.Image], columns: int, frame_size: int) -> None:
    rows = (len(frames) + columns - 1) // columns
    sheet = Image.new("RGBA", (columns * frame_size, rows * frame_size), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, ((index % columns) * frame_size, (index // columns) * frame_size))
    sheet.save(path, optimize=True)


def gamma_grade(frame: Image.Image, gamma: float) -> Image.Image:
    lookup = [round(255 * ((value / 255) ** gamma)) for value in range(256)]
    red, green, blue, alpha = frame.split()
    return Image.merge("RGBA", (red.point(lookup), green.point(lookup), blue.point(lookup), alpha))


def assert_pixel_identity(expected: list[Image.Image], actual: list[Image.Image], clip_id: str) -> None:
    if len(expected) != len(actual):
        raise ValueError(f"{clip_id}: Piskel frame count changed")
    for index, (left, right) in enumerate(zip(expected, actual)):
        if ImageChops.difference(left, right).getbbox() is not None:
            raise ValueError(f"{clip_id}: Piskel round-trip changed frame {index}")


def visible_luminance(frame: Image.Image) -> float:
    alpha = frame.getchannel("A")
    mask = alpha.point(lambda value: 255 if value > ALPHA_THRESHOLD else 0)
    if mask.getbbox() is None:
        raise ValueError("fully transparent frame")
    red, green, blue = ImageStat.Stat(frame.convert("RGB"), mask=mask).mean
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue


def visible_height_game_px(frame: Image.Image, display_size_px: int) -> float:
    alpha = frame.getchannel("A")
    bounds = alpha.point(lambda value: 255 if value > ALPHA_THRESHOLD else 0).getbbox()
    if bounds is None:
        raise ValueError("fully transparent frame")
    return (bounds[3] - bounds[1]) * display_size_px / frame.height


def reference_continuity() -> dict[str, Any]:
    manifest = load_json(REFERENCE_MANIFEST_PATH)
    families: dict[str, Any] = {}
    luminance_samples: list[float] = []
    height_samples: list[float] = []
    for clip_id, policy in REFERENCE_FAMILIES.items():
        clip = manifest["clips"][clip_id]
        frames = sheet_frames(
            RUNTIME_ROOT / clip["file"],
            int(clip["frames"]),
            int(clip["columns"]),
            int(manifest["frameWidth"]),
        )
        display_size = int(policy["displaySizePx"])
        luminances = [visible_luminance(frame) for frame in frames]
        heights = [visible_height_game_px(frame, display_size) for frame in frames]
        luminance_samples.extend(luminances)
        height_samples.extend(heights)
        families[clip_id] = {
            "runtimeFile": clip["file"],
            "displaySizePx": display_size,
            "medianVisibleLuminance": round(statistics.median(luminances), 3),
            "medianVisibleHeightGamePx": round(statistics.median(heights), 3),
        }
    return {
        "authority": "existing Survival Blender V2 idle/walk runtime",
        "families": families,
        "medianVisibleLuminance": round(statistics.median(luminance_samples), 3),
        "medianVisibleHeightGamePx": round(statistics.median(height_samples), 3),
    }


def handoff_residual_game_px(
    source_clip: dict[str, Any],
    runtime_clip: dict[str, Any],
    display_size: int,
) -> list[float]:
    metrics = source_clip["frameMetrics"]
    indexes = runtime_clip["frames"]
    origin_y = float(runtime_clip["origin"]["y"])
    return [
        (float(metrics[index]["baselinePx"]) / 1024 - origin_y) * display_size
        for index in (indexes[0], indexes[-1])
    ]


def main() -> None:
    runtime = load_json(RUNTIME_MANIFEST_PATH)
    source = load_json(SOURCE_MANIFEST_PATH)
    polish = runtime["visualPolish"]
    output_root = ROOT / polish["editableSourceDirectory"]
    output_root.mkdir(parents=True, exist_ok=True)
    clips: dict[str, Any] = {}
    maximum_handoff_drift = 0.0
    complex_luminance_samples: list[float] = []
    complex_height_samples: list[float] = []
    references = reference_continuity()
    source_luminance_samples: list[float] = []
    source_frames_by_clip: dict[str, list[Image.Image]] = {}
    for clip_id, runtime_clip in runtime["clips"].items():
        source_clip = source["clips"][runtime_clip["sourceId"]]
        source_frames = sheet_frames(
            SOURCE_MANIFEST_PATH.parent / source_clip["file"],
            int(source_clip["frames"]),
            int(source_clip["columns"]),
            int(source_clip["packedFrameSizePx"]),
        )
        source_frames_by_clip[clip_id] = source_frames
        source_luminance_samples.extend(
            visible_luminance(source_frames[index]) for index in runtime_clip["frames"]
        )
    source_median_luminance = statistics.median(source_luminance_samples)
    target_median_luminance = float(references["medianVisibleLuminance"])
    # Solve against the actual masked sprite pixels. A direct scalar estimate is
    # not exact because RGB luminance is measured after applying the curve.
    gamma_low = math.log(target_median_luminance / 255) / math.log(source_median_luminance / 255)
    gamma_high = max(3.0, gamma_low)
    for _ in range(14):
        candidate_gamma = (gamma_low + gamma_high) / 2
        candidate_luminances = [
            visible_luminance(gamma_grade(source_frames_by_clip[clip_id][index], candidate_gamma))
            for clip_id, runtime_clip in runtime["clips"].items()
            for index in runtime_clip["frames"]
        ]
        if statistics.median(candidate_luminances) > target_median_luminance:
            gamma_low = candidate_gamma
        else:
            gamma_high = candidate_gamma
    gamma = (gamma_low + gamma_high) / 2

    for clip_id, runtime_clip in runtime["clips"].items():
        source_clip = source["clips"][runtime_clip["sourceId"]]
        frame_size = int(source_clip["packedFrameSizePx"])
        frame_count = int(source_clip["frames"])
        columns = int(source_clip["columns"])
        source_path = SOURCE_MANIFEST_PATH.parent / source_clip["file"]
        source_frames = source_frames_by_clip[clip_id]
        frames = [gamma_grade(frame, gamma) for frame in source_frames]
        runtime_path = RUNTIME_ROOT / runtime_clip["runtimeFile"]
        save_sheet(runtime_path, frames, columns, frame_size)
        piskel_path = ROOT / runtime_clip["piskelSource"]
        entry = {
            "id": f"complex-dig-{clip_id}",
            "displayName": f"Complex Dig · {clip_id}",
            "frameSize": [frame_size, frame_size],
            "frameCount": frame_count,
            "sheetColumns": columns,
            "fps": int(source_clip["fps"]),
        }
        write_json(piskel_path, make_piskel(entry, frames))
        round_trip, width, height, fps = read_piskel(piskel_path)
        if width != frame_size or height != frame_size or fps != int(source_clip["fps"]):
            raise ValueError(f"{clip_id}: Piskel dimensions or fps changed")
        assert_pixel_identity(frames, round_trip, clip_id)

        used_frames = [round_trip[index] for index in runtime_clip["frames"]]
        used_luminances = [visible_luminance(frame) for frame in used_frames]
        used_heights = [
            visible_height_game_px(frame, int(runtime["displaySizePx"]))
            for frame in used_frames
        ]
        complex_luminance_samples.extend(used_luminances)
        complex_height_samples.extend(used_heights)
        residuals = handoff_residual_game_px(
            source_clip,
            runtime_clip,
            int(runtime["displaySizePx"]),
        )
        handoff_drift = max(abs(value) for value in residuals)
        maximum_handoff_drift = max(maximum_handoff_drift, handoff_drift)
        clips[clip_id] = {
            "piskelSource": runtime_clip["piskelSource"],
            "runtimeFile": runtime_clip["runtimeFile"],
            "runtimeSha256": sha256(runtime_path),
            "sourceSha256": sha256(source_path),
            "frameCount": frame_count,
            "runtimeFrameCount": len(used_frames),
            "frameSizePx": frame_size,
            "fps": fps,
            "uniformDisplaySizePx": runtime["displaySizePx"],
            "entryExitHandoffResidualGamePx": [round(value, 3) for value in residuals],
            "maximumHandoffDriftGamePx": round(handoff_drift, 3),
            "medianVisibleLuminance": round(statistics.median(used_luminances), 3),
            "medianVisibleHeightGamePx": round(statistics.median(used_heights), 3),
            "maximumSuspiciousGreenPixels": source_clip["maximumSuspiciousGreenPixels"],
            "piskelRoundTripPixelExact": True,
            "perFrameRescaleApplied": False,
            "additionalColourGradeApplied": True,
            "familyWideGamma": round(gamma, 6),
            "additionalDownsampleApplied": False,
        }

    allowed_drift = float(polish["maximumHandoffDriftPx"])
    if maximum_handoff_drift > allowed_drift + 1e-9:
        raise ValueError(
            f"complex-dig handoff drift {maximum_handoff_drift:.3f}px exceeds {allowed_drift}px"
        )
    complex_median_luminance = statistics.median(complex_luminance_samples)
    complex_median_height = statistics.median(complex_height_samples)
    luminance_delta = abs(complex_median_luminance - references["medianVisibleLuminance"])
    if luminance_delta > 1.0:
        raise ValueError(f"complex-dig luminance delta {luminance_delta:.3f} exceeds 1.0")
    report = {
        "version": polish["piskelPackage"],
        "generatedAt": "2026-08-21",
        "runtimeChangedByPiskelPass": True,
        "runtimePixelAuthority": polish["renderAuthority"],
        "colorPolicy": polish["colorPolicy"],
        "scalePolicy": polish["scalePolicy"],
        "familyWideGamma": round(gamma, 6),
        "sourceMedianVisibleLuminance": round(source_median_luminance, 3),
        "targetMedianVisibleLuminance": round(target_median_luminance, 3),
        "uniformDisplaySizePx": polish["uniformDisplaySizePx"],
        "maximumHandoffDriftGamePx": round(maximum_handoff_drift, 3),
        "maximumAllowedHandoffDriftGamePx": allowed_drift,
        "existingAnimationContinuity": {
            **references,
            "complexDigMedianVisibleLuminance": round(complex_median_luminance, 3),
            "absoluteMedianLuminanceDelta": round(luminance_delta, 3),
            "complexDigMedianVisibleHeightGamePx": round(complex_median_height, 3),
            "absoluteMedianVisibleHeightDeltaGamePx": round(abs(
                complex_median_height - references["medianVisibleHeightGamePx"]
            ), 3),
        },
        "clips": clips,
    }
    report_path = output_root / "complex-dig-piskel-polish-v2-report.json"
    write_json(report_path, report)
    print(json.dumps({
        "ok": True,
        "clips": len(clips),
        "maximumHandoffDriftGamePx": report["maximumHandoffDriftGamePx"],
        "report": str(report_path.relative_to(ROOT)).replace("\\", "/"),
    }, indent=2))


if __name__ == "__main__":
    main()
