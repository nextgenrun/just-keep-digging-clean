"""Build seamless runtime weather loops from explicitly approved Sonniss excerpts."""

from __future__ import annotations

import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from audioWavMixer import read_wav, write_wav


ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = (
    ROOT
    / "sound/library-v2/SoundLibrary_Review/00_INBOX_RAW_EXPORTS"
    / "sonniss-gdc2019-recorded-mining-pilot-2026-08-26/source-recordings"
)
OUTPUT_DIR = ROOT / "sound/soundEffects/weather-ambience-v1"
SAMPLE_RATE = 32_000
APPROVED_WINDOW_SECONDS = 12.0
LOOP_SECONDS = 10.0
CROSSFADE_SECONDS = 2.0
TARGET_RMS_DB = -20.0
MAX_GAIN_DB = 6.0
CEILING_DB = -1.5

ASSETS = (
    {
        "id": "SONNISS19-SRC-096",
        "role": "rain-open",
        "source": "Soft-rain--water-flowing-down-from-t-p5-ebede6a7.wav",
        "output": "rain-open-soft-v1.wav",
    },
    {
        "id": "SONNISS19-SRC-079",
        "role": "rain-roof",
        "source": "rain_medium_steady_some_drops_on_met-p5-326e6ed5.wav",
        "output": "rain-roof-medium-v1.wav",
    },
    {
        "id": "SONNISS19-SRC-061",
        "role": "rain-shelter-heavy",
        "source": "Heavy-rain-drops-on-a-car-window--st-p5-436d77f3.wav",
        "output": "rain-shelter-heavy-v1.wav",
    },
    {
        "id": "SONNISS19-SRC-101",
        "role": "storm-open",
        "source": "thunderstorm_summer_morning_distant_-p5-04c89f43.wav",
        "output": "storm-distant-v1.wav",
    },
    {
        "id": "SONNISS19-SRC-117",
        "role": "wind-open",
        "source": "wind-winter-open-space-v2-p1-128f2531.wav",
        "output": "wind-open-v1.wav",
    },
    {
        "id": "SONNISS19-SRC-116",
        "role": "wind-strong",
        "source": "wind-blowing-mike-v1-p1-f725dd60.wav",
        "output": "wind-strong-v1.wav",
    },
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def make_seamless_loop(audio: np.ndarray) -> np.ndarray:
    loop_frames = round(LOOP_SECONDS * SAMPLE_RATE)
    crossfade_frames = round(CROSSFADE_SECONDS * SAMPLE_RATE)
    required_frames = loop_frames + crossfade_frames
    if len(audio) < required_frames:
        raise ValueError(
            f"Approved excerpt requires {required_frames} frames, received {len(audio)}"
        )

    excerpt = audio[:required_frames].copy()
    loop = excerpt[:loop_frames].copy()
    phase = np.linspace(0.0, 1.0, crossfade_frames, endpoint=False, dtype=np.float32)
    blend = (0.5 - 0.5 * np.cos(np.pi * phase))[:, None]
    continuation = excerpt[loop_frames:loop_frames + crossfade_frames]
    loop[:crossfade_frames] = continuation * (1.0 - blend) + excerpt[:crossfade_frames] * blend
    return loop


def normalize_ambience(audio: np.ndarray) -> tuple[np.ndarray, float, float, float]:
    rms = float(np.sqrt(np.mean(np.square(audio, dtype=np.float64))))
    peak = float(np.max(np.abs(audio)))
    target_rms = 10.0 ** (TARGET_RMS_DB / 20.0)
    max_gain = 10.0 ** (MAX_GAIN_DB / 20.0)
    ceiling = 10.0 ** (CEILING_DB / 20.0)
    rms_gain = target_rms / max(rms, 1e-9)
    peak_gain = ceiling / max(peak, 1e-9)
    gain = min(max_gain, rms_gain, peak_gain)
    normalized = audio * gain
    return normalized, rms, peak, 20.0 * math.log10(max(gain, 1e-9))


def build() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    records = []
    for asset in ASSETS:
        source_path = SOURCE_DIR / asset["source"]
        output_path = OUTPUT_DIR / asset["output"]
        audio = read_wav(source_path, target_rate=SAMPLE_RATE)
        approved_frames = round(APPROVED_WINDOW_SECONDS * SAMPLE_RATE)
        loop = make_seamless_loop(audio[:approved_frames])
        loop, source_rms, source_peak, gain_db = normalize_ambience(loop)
        write_wav(output_path, loop, rate=SAMPLE_RATE)
        records.append(
            {
                **asset,
                "sourcePath": source_path.relative_to(ROOT).as_posix(),
                "runtimePath": output_path.relative_to(ROOT).as_posix(),
                "sourceSha256": sha256(source_path),
                "runtimeSha256": sha256(output_path),
                "durationSeconds": LOOP_SECONDS,
                "sampleRate": SAMPLE_RATE,
                "channels": 2,
                "sourceWindowSeconds": APPROVED_WINDOW_SECONDS,
                "crossfadeSeconds": CROSSFADE_SECONDS,
                "sourceRms": round(source_rms, 8),
                "sourcePeak": round(source_peak, 8),
                "normalizationGainDb": round(gain_db, 4),
                "loopBoundaryDelta": round(float(np.max(np.abs(loop[-1] - loop[0]))), 8),
                "runtimeEligible": True,
            }
        )

    manifest = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "Sonniss GameAudioGDC 2019",
        "sourceUrl": "https://sonniss.com/gameaudiogdc/",
        "licenseUrl": "https://sonniss.com/gdc-bundle-license/",
        "approvalDate": "2026-08-30",
        "approvalScope": "All six auditioned weather sources approved as game-worthy when contextually applied.",
        "mixRule": "Select one rain bed and one wind bed at a time; overlap only during a bounded context crossfade.",
        "runtimeEligible": True,
        "records": records,
    }
    (OUTPUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    build()
