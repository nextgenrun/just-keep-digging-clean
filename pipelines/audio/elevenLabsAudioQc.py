"""Measure ElevenLabs SFX and quarantine bright, ringing, humming, or duplicate-like stems."""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

import numpy as np


SAMPLE_RATE = 24_000
FFT_SIZE = 1024
HOP_SIZE = 256


def find_ffmpeg() -> str:
    configured = os.environ.get("FFMPEG_BINARY", "").strip()
    candidates = [configured, shutil.which("ffmpeg") or ""]
    winget = Path.home() / "AppData/Local/Microsoft/WinGet/Packages"
    if winget.exists():
        candidates.extend(str(path) for path in winget.glob("Gyan.FFmpeg_*/ffmpeg-*/bin/ffmpeg.exe"))
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return candidate
    raise RuntimeError("FFmpeg is required for the V4 spectral quarantine gate")


def decode_mono(path: Path, ffmpeg: str) -> np.ndarray:
    result = subprocess.run(
        [
            ffmpeg, "-v", "error", "-i", str(path), "-map", "0:a:0",
            "-f", "f32le", "-ac", "1", "-ar", str(SAMPLE_RATE), "pipe:1",
        ],
        capture_output=True,
        check=True,
    )
    samples = np.frombuffer(result.stdout, dtype="<f4").astype(np.float64)
    if samples.size < 64:
        raise RuntimeError(f"Decoded audio is implausibly short: {path.name}")
    return samples


def _spectrum(samples: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    centered = samples - np.mean(samples)
    if centered.size < FFT_SIZE:
        centered = np.pad(centered, (0, FFT_SIZE - centered.size))
    window = np.hanning(FFT_SIZE)
    frames = []
    for offset in range(0, max(1, centered.size - FFT_SIZE + 1), HOP_SIZE):
        frame = centered[offset:offset + FFT_SIZE]
        if frame.size < FFT_SIZE:
            frame = np.pad(frame, (0, FFT_SIZE - frame.size))
        frames.append(np.abs(np.fft.rfft(frame * window)) ** 2)
    powers = np.asarray(frames)
    energies = powers.sum(axis=1)
    active = energies > max(float(energies.max()) * 1e-4, 1e-18)
    return centered, powers[active], np.fft.rfftfreq(FFT_SIZE, 1 / SAMPLE_RATE)


def _feature_vector(spectrum: np.ndarray, frequencies: np.ndarray) -> list[float]:
    edges = np.geomspace(80, SAMPLE_RATE / 2, 33)
    total = float(spectrum.sum())
    bands = []
    for low, high in zip(edges[:-1], edges[1:]):
        mask = (frequencies >= low) & (frequencies < high)
        bands.append(float(spectrum[mask].sum() / total))
    vector = np.log10(np.asarray(bands) + 1e-12)
    vector -= vector.mean()
    vector /= np.linalg.norm(vector) + 1e-12
    return [round(float(value), 6) for value in vector]


def inspect_audio(path: Path, profile: dict, ffmpeg: str | None = None) -> dict:
    samples = decode_mono(path, ffmpeg or find_ffmpeg())
    centered, active_powers, frequencies = _spectrum(samples)
    spectrum = active_powers.sum(axis=0) + 1e-18
    total = float(spectrum.sum())
    centroid = float((frequencies * spectrum).sum() / total)
    high_ratio = float(spectrum[frequencies >= 4000].sum() / total)
    audible = (frequencies >= 100) & (frequencies <= 10_000)
    audible_spectrum = spectrum[audible]
    peak_index = int(np.argmax(audible_spectrum))
    peak_hz = float(frequencies[audible][peak_index])
    prominence = float(10 * np.log10(audible_spectrum.max() / np.median(audible_spectrum)))

    hum_band = (frequencies >= 80) & (frequencies <= 2000)
    frame_band = active_powers[:, hum_band] + 1e-18
    dominant_bins = np.argmax(frame_band, axis=1)
    persistence = float(np.bincount(dominant_bins).max() / dominant_bins.size)
    tone_share = float(np.median(frame_band.max(axis=1) / frame_band.sum(axis=1)))
    hum_score = persistence * tone_share
    peak = float(np.max(np.abs(centered)))

    flags = []
    if centroid > profile["centroidMaxHz"]:
        flags.append(f"bright-centroid:{centroid:.0f}Hz")
    if high_ratio > profile["high4kMax"]:
        flags.append(f"bright-high-band:{high_ratio:.0%}")
    if prominence > profile["peakProminenceMaxDb"] and peak_hz >= 2200:
        flags.append(f"glassy-ring:{peak_hz:.0f}Hz/{prominence:.1f}dB")
    if hum_score > profile["humScoreMax"]:
        flags.append(f"stationary-hum:{hum_score:.3f}")
    # Lossy MP3 reconstruction can overshoot 1.0 without source clipping.
    if peak >= 1.5:
        flags.append(f"clipping-risk:{peak:.3f}")

    return {
        "verdict": "QUARANTINE" if flags else "REVIEW",
        "flags": flags,
        "metrics": {
            "durationSeconds": round(samples.size / SAMPLE_RATE, 4),
            "rms": round(float(np.sqrt(np.mean(centered * centered))), 6),
            "peak": round(peak, 6),
            "spectralCentroidHz": round(centroid, 1),
            "highBandRatioAbove4k": round(high_ratio, 5),
            "dominantPeakHz": round(peak_hz, 1),
            "peakProminenceDb": round(prominence, 2),
            "stationaryHumScore": round(hum_score, 5),
        },
        "spectrumVector": _feature_vector(spectrum, frequencies),
    }


def flag_cross_family_similarity(rows: list[dict], threshold: float) -> None:
    available = [row for row in rows if (row.get("qc") or {}).get("spectrumVector")]
    for left_index, left in enumerate(available):
        left_vector = np.asarray(left["qc"]["spectrumVector"])
        for right in available[left_index + 1:]:
            if left["assetId"] == right["assetId"]:
                continue
            similarity = float(left_vector @ np.asarray(right["qc"]["spectrumVector"]))
            if similarity < threshold:
                continue
            for row, other in ((left, right), (right, left)):
                flag = f"near-duplicate-spectrum:{other['jobKey']}:{similarity:.3f}"
                if flag not in row["qc"]["flags"]:
                    row["qc"]["flags"].append(flag)
                row["qc"]["verdict"] = "QUARANTINE"
