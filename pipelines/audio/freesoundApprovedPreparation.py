"""Approved-source classification and measured, bounded preview derivatives."""
from __future__ import annotations

import hashlib
import re
import subprocess
from pathlib import Path

import numpy as np


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def classify(entry, config):
    family, title = entry["family"], entry["title"].lower()
    direct = {"mining-earth": "mineEarth", "mining-stone": "mineStone",
              "mining-metal": "mineMetal", "mining-ice": "crystalBreak",
              "wood-supports": "structuralCreak", "footsteps": "footstepDirt",
              "flight-air": "flightWhoosh"}
    if family in direct:
        return direct[family]
    if family == "reward-economy":
        return "coinReward" if re.search(r"several|clinking|tossed|29|31|32|33", title) else "coinPickup"
    if family == "ui-tactile":
        return "uiMechanical" if re.search(r"switch|lever|latch|key|mechan|tape|cassette|lock", title) else "uiClick"
    if family == "star-texture":
        if entry["soundId"] in config["starHumIds"]:
            return "starHum"
        return "starGrain" if re.search(r"crackl|static|noise|granular|popping|poping|vinyl", title) else "starAccent"
    if family == "danger-panic":
        if not re.search(r"heart|kickdrum", title):
            return "quakeRumble"
        match = re.search(r"(\d+)\s*bpm", title)
        bpm = int(match[1]) if match else 100
        if bpm <= 60:
            return "panicSlow"
        return "panicFast" if bpm >= 120 or re.search(r"fast|buildup|louder", title) else "panicPulse"
    raise ValueError(f"No authorized gameplay role for {entry['id']}: {family}")


def decode(path, ffmpeg, rate, channels):
    result = subprocess.run([ffmpeg, "-v", "error", "-i", str(path), "-map", "0:a:0",
                             "-f", "f32le", "-ar", str(rate), "-ac", str(channels), "pipe:1"],
                            capture_output=True, check=True)
    pcm = np.frombuffer(result.stdout, dtype="<f4").reshape(-1, channels).copy()
    if not pcm.size or not np.isfinite(pcm).all():
        raise ValueError(f"Invalid decoded samples: {path.name}")
    return pcm


def measure(pcm, rate):
    peak = float(np.max(np.abs(pcm)))
    envelope = np.max(np.abs(pcm), axis=1)
    active = pcm[envelope > max(peak * 0.03, 1e-6)]
    audible = np.flatnonzero(envelope > max(peak * 0.01, 1e-5))
    rms = float(np.sqrt(np.mean(active.astype(np.float64) ** 2))) if active.size else 0
    return {"duration": round(len(pcm) / rate, 6), "peak": round(peak, 7),
            "activeRmsDb": round(20 * np.log10(max(rms, 1e-9)), 3),
            "onsetMs": round(int(audible[0]) / rate * 1000, 3) if audible.size else None,
            "clippedSamples": int(np.count_nonzero(np.abs(pcm) >= 1)),
            "seamStep": round(float(np.max(np.abs(pcm[-1] - pcm[0]))), 7)}


def prepare(entry, role, source, dest, config, ffmpeg):
    settings = config["roles"][role]
    rate, channels = config["sampleRate"], 1 if settings.get("mono") else 2
    pcm = decode(source, ffmpeg, rate, channels)
    before = measure(pcm, rate)
    peak = before["peak"]
    if peak < 1e-5:
        raise ValueError(f"Silent approved source: {entry['id']}")
    envelope = np.max(np.abs(pcm), axis=1)
    active = np.flatnonzero(envelope >= peak * config["onsetThreshold"])
    start = max(0, int(active[0]) - round(rate * config["prerollMs"] / 1000))
    pcm = pcm[start:start + round(rate * settings["maxSeconds"])]
    if settings.get("loop"):
        bpm_match = re.search(r"(\d+)\s*bpm", entry["title"].lower())
        bpm = int(bpm_match[1]) if bpm_match else settings.get("bpm")
        # Short single heartbeats get silence between beats, never a machine-gun loop.
        if bpm and before["duration"] < 1.3:
            period = max(len(pcm), round(rate * 60 / bpm))
            pcm = np.pad(pcm, ((0, period - len(pcm)), (0, 0)))
            pcm = np.tile(pcm, (max(2, int(settings["maxSeconds"] * rate / period)), 1))
        elif bpm:
            period = round(rate * 60 / bpm)
            length = len(pcm) // period * period
            if length > 0:
                pcm = pcm[:length]
        count = min(round(rate * config["loopOverlapMs"] / 1000), len(pcm) // 8)
        # Keep loop duration (and heartbeat tempo) fixed. Both edges converge
        # to the same waveform value with a smooth boundary treatment.
        ramp = np.linspace(0, 1, count, dtype=np.float32)[:, None]
        join = (pcm[:count] + pcm[-count:]) * 0.5
        pcm[:count] = join * (1 - ramp) + pcm[:count] * ramp
        pcm[-count:] = pcm[-count:] * (1 - ramp) + join * ramp
        boundary = (pcm[0] + pcm[-1]) * 0.5
        pcm[:count] = boundary * (1 - ramp) + pcm[:count] * ramp
        pcm[-count:] = pcm[-count:] * (1 - ramp) + boundary * ramp
    else:
        attack = min(round(rate * config["fadeInMs"] / 1000), len(pcm) // 4)
        tail = min(round(rate * config["fadeOutMs"] / 1000), len(pcm) // 4)
        pcm[:attack] *= np.linspace(0, 1, attack, dtype=np.float32)[:, None]
        pcm[-tail:] *= np.linspace(1, 0, tail, dtype=np.float32)[:, None]
    prepared = measure(pcm, rate)
    gain = min(10 ** ((config["activeRmsDb"] - prepared["activeRmsDb"]) / 20),
               config["peakCeiling"] / max(prepared["peak"], 1e-9))
    pcm *= gain
    subprocess.run([ffmpeg, "-v", "error", "-y", "-f", "f32le", "-ar", str(rate),
                    "-ac", str(channels), "-i", "pipe:0", "-c:a", "libvorbis",
                    "-q:a", str(config["vorbisQuality"]), str(dest)],
                   input=pcm.astype("<f4").tobytes(), capture_output=True, check=True)
    after = measure(decode(dest, ffmpeg, rate, channels), rate)
    if after["clippedSamples"] or after["peak"] > 0.95 or after["onsetMs"] is None:
        raise ValueError(f"Derivative failed amplitude QC: {entry['id']}")
    return {"before": before, "after": after, "channels": channels,
            "trimStartMs": round(start / rate * 1000, 3),
            "normalizationDb": round(20 * np.log10(gain), 3),
            "loop": settings.get("loop", False), "sourceSha256": digest(source),
            "sha256": digest(dest), "bytes": dest.stat().st_size}
