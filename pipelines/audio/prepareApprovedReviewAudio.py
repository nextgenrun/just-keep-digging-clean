"""Prepare only the frozen, user-approved review sources. No runtime wiring."""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np

from elevenLabsAudioQc import find_ffmpeg

ROOT = Path(__file__).resolve().parents[2]
INPUT = ROOT / "pipelines/audio/2026-09-03-approved-review-input.json"
DEST = ROOT / "sound/soundEffects/approved-review-2026-09-03"
REPORT = ROOT / "testing/audio-review-2026-09-03/source-measurements.json"
RATE = 48000


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def db(value):
    return round(20 * np.log10(max(float(value), 1e-9)), 3)


def measure(samples):
    peak = float(np.max(np.abs(samples)))
    blocks = samples[:len(samples) // 960 * 960].reshape(-1, 960, 2)
    energy = np.mean(blocks.astype(np.float64) ** 2, axis=(1, 2))
    active = energy[energy > max(float(energy.max()) * 0.001, 1e-10)]
    envelope = np.max(np.abs(samples), axis=1)
    nonzero = np.flatnonzero(envelope > max(peak * 0.005, 0.0001))
    return {
        "durationSeconds": round(len(samples) / RATE, 5),
        "peakLinear": round(peak, 7), "peakDbfs": db(peak),
        "rmsDbfs": db(np.sqrt(np.mean(samples.astype(np.float64) ** 2))),
        "activeRmsDbfs": db(np.sqrt(np.mean(active))) if active.size else -180,
        "onsetMs": round(float(nonzero[0]) / RATE * 1000, 3) if nonzero.size else None,
        "clippedSamples": int(np.count_nonzero(np.abs(samples) >= 1)),
    }


def decode(path, ffmpeg):
    result = subprocess.run([
        ffmpeg, "-v", "error", "-i", str(path), "-map", "0:a:0", "-f", "f32le",
        "-ac", "2", "-ar", str(RATE), "pipe:1",
    ], capture_output=True, check=True)
    return np.frombuffer(result.stdout, dtype="<f4").reshape(-1, 2).copy()


def prepare(entry, ffmpeg, inspect_only):
    source = (ROOT / entry["previewPath"]).resolve()
    if not source.is_relative_to(ROOT) or not source.is_file():
        raise ValueError(f"Invalid approved source: {entry['id']}")
    pcm = decode(source, ffmpeg)
    before = measure(pcm)
    result = {
        "id": entry["id"], "approvedBy": entry["approvedBy"],
        "mixOnly": entry["mixOnly"], "label": entry["label"],
        "sourcePath": entry["previewPath"], "sourceSha256": digest(source),
        "provenance": entry.get("provenance", ""), "before": before,
    }
    if inspect_only:
        return result
    # Existing production cues remain byte-identical. New promoted files are
    # isolated from the raw review tree and receive only documented safe edits.
    if "SoundLibrary_Review/" not in entry["previewPath"]:
        result.update(path=entry["previewPath"], reused=True, after=before,
                      sha256=digest(source), trimStartMs=0, attenuationDb=0)
        return result
    trim = 0
    if entry["role"] != "loop" and before["onsetMs"] is not None:
        trim = max(0, round((before["onsetMs"] - 2) * RATE / 1000))
        pcm = pcm[trim:]
    attenuation = min(1, 0.85 / max(before["peakLinear"], 1e-6))
    pcm *= attenuation
    if entry["role"] == "loop":
        # Overlap the boundary instead of fading both ends to silence.
        count = min(round(RATE * 0.04), len(pcm) // 8)
        ramp = np.linspace(0, 1, count, dtype=np.float32)[:, None]
        pcm[-count:] = pcm[-count:] * (1 - ramp) + pcm[:count] * ramp
        pcm = pcm[count:]
    else:
        count = min(144, len(pcm) // 8)
        pcm[:count] *= np.linspace(0, 1, count, dtype=np.float32)[:, None]
        pcm[-count:] *= np.linspace(1, 0, count, dtype=np.float32)[:, None]
    destination = DEST / f"{entry['id']}.ogg"
    subprocess.run([
        ffmpeg, "-v", "error", "-y", "-f", "f32le", "-ar", str(RATE),
        "-ac", "2", "-i", "pipe:0", "-c:a", "libvorbis", "-q:a", "6",
        str(destination),
    ], input=pcm.astype("<f4").tobytes(), capture_output=True, check=True)
    result.update(path=destination.relative_to(ROOT).as_posix(), reused=False,
                  after=measure(decode(destination, ffmpeg)),
                  sha256=digest(destination), bytes=destination.stat().st_size,
                  trimStartMs=round(trim / RATE * 1000, 3),
                  attenuationDb=db(attenuation),
                  seamOverlapMs=40 if entry["role"] == "loop" else 0)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inspect-only", action="store_true")
    args = parser.parse_args()
    frozen = json.loads(INPUT.read_text(encoding="utf-8"))
    ffmpeg = find_ffmpeg()
    if not args.inspect_only:
        DEST.mkdir(parents=True, exist_ok=True)
    entries = []
    for entry in frozen["sources"]:
        item = prepare(entry, ffmpeg, args.inspect_only)
        entries.append(item)
        print(json.dumps({"id": item["id"], **item.get("after", item["before"])}), flush=True)
    report = {"schemaVersion": 1, "decisionExportSha256": frozen["decisionExportSha256"],
              "inspectOnly": args.inspect_only, "assets": entries}
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if not args.inspect_only:
        (DEST / "manifest.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"measuredSources": len(entries), "report": str(REPORT)}))


if __name__ == "__main__":
    main()
