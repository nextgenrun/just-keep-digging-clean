"""Validate review mixes, source windows, hashes, and runtime-isolation flags."""

from __future__ import annotations

import hashlib
import json
import math
import re
import wave
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / (
    "sound/library-v2/SoundLibrary_Review/00_INBOX_RAW_EXPORTS/"
    "sonniss-ingame-sfx-mockup-v1-2026-08-27"
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def wav_metrics(path: Path) -> dict:
    with wave.open(str(path), "rb") as source:
        channels = source.getnchannels()
        width = source.getsampwidth()
        rate = source.getframerate()
        frames = source.getnframes()
        raw = source.readframes(frames)
    if width != 2:
        raise ValueError(f"Expected 16-bit PCM: {path}")
    audio = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    rms = float(np.sqrt(np.mean(np.square(audio)))) if audio.size else 0.0
    return {"channels": channels, "sampleWidth": width, "rate": rate, "frames": frames, "duration": frames / rate, "peakDb": 20.0 * math.log10(peak) if peak > 0 else None, "rmsDb": 20.0 * math.log10(rms) if rms > 0 else None}


def main() -> int:
    errors = []
    manifest = json.loads((OUTPUT / "manifest.json").read_text(encoding="utf-8"))
    source_path = ROOT / manifest["sourceManifest"]
    source_manifest = json.loads(source_path.read_text(encoding="utf-8"))
    source_records = {record["id"]: record for record in source_manifest["records"]}
    scenarios = manifest["scenarios"]
    events = [event for scenario in scenarios for event in scenario["events"]]
    if manifest["runtimeWired"] or manifest["runtimeEligible"]:
        errors.append("mockup is marked runtime eligible")
    if len(scenarios) != 4 or len(events) != 55:
        errors.append(f"unexpected topology {len(scenarios)}/{len(events)}")
    if manifest["sourceApprovalCount"] != 118 or source_manifest["approvedSourceCount"] != 118:
        errors.append("approval count is not 118")
    for scenario in scenarios:
        mix_path = OUTPUT / scenario["mixFile"]
        if not mix_path.exists() or sha256(mix_path) != scenario["mixSha256"]:
            errors.append(f"mix hash mismatch: {scenario['id']}")
            continue
        metrics = wav_metrics(mix_path)
        if (metrics["channels"], metrics["sampleWidth"], metrics["rate"]) != (2, 2, 48_000):
            errors.append(f"mix format mismatch: {scenario['id']}")
        if abs(metrics["duration"] - scenario["durationSeconds"]) > 0.001:
            errors.append(f"mix duration mismatch: {scenario['id']}")
        if metrics["peakDb"] is None or metrics["peakDb"] > -0.95:
            errors.append(f"mix peak unsafe: {scenario['id']}")
        for event in scenario["events"]:
            source = source_records.get(event["sourceId"])
            if not source or not source["sourceApproved"]:
                errors.append(f"unapproved source: {event['sourceId']}")
                continue
            if event["sourceSha256"] != source["sourceSha256"]:
                errors.append(f"source hash drift: {event['sourceId']}")
            if event["sourceStart"] + event["sourceDuration"] > source["durationSeconds"] + 0.001:
                errors.append(f"source overflow: {scenario['id']}/{event['key']}")
            if event["at"] + event["sourceDuration"] > scenario["durationSeconds"] + 0.001:
                errors.append(f"scenario overflow: {scenario['id']}/{event['key']}")
            slice_path = OUTPUT / event["sliceFile"]
            if not slice_path.exists() or sha256(slice_path) != event["sliceSha256"]:
                errors.append(f"slice hash mismatch: {scenario['id']}/{event['key']}")
    full = manifest["fullSequence"]
    full_path = OUTPUT / full["mixFile"]
    full_metrics = wav_metrics(full_path)
    if sha256(full_path) != full["mixSha256"] or abs(full_metrics["duration"] - full["durationSeconds"]) > 0.001:
        errors.append("full sequence mismatch")
    expected_duration = sum(item["durationSeconds"] for item in scenarios) + 0.75 * (len(scenarios) - 1)
    if abs(full["durationSeconds"] - expected_duration) > 0.001:
        errors.append("full sequence timing mismatch")
    page = (OUTPUT / "index.html").read_text(encoding="utf-8")
    if len(re.findall(r'<article class="card"', page)) != 4 or len(re.findall(r"<audio controls", page)) != 5:
        errors.append("review page topology mismatch")
    mix_files = list((OUTPUT / "mixes").glob("*.wav"))
    slice_files = list((OUTPUT / "slices").glob("*.wav"))
    if len(mix_files) != 5 or len(slice_files) != 55:
        errors.append(f"file count mismatch {len(mix_files)}/{len(slice_files)}")
    print(f"Scenarios={len(scenarios)} Events={len(events)} Sources={len(set(event['sourceId'] for event in events))} CompoundPlacements={sum(event['sourceWasCompound'] for event in events)}")
    print(f"Mixes={len(mix_files)} Slices={len(slice_files)} Full={full_metrics['duration']:.2f}s Peak={full_metrics['peakDb']:.2f}dBFS RMS={full_metrics['rmsDb']:.2f}dBFS")
    if errors:
        print("VALIDATION_FAILED: " + "; ".join(errors))
        return 1
    print("SONNISS_INGAME_MOCKUP_VALIDATION_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
