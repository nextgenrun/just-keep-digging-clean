"""Render repeatable approved-only mixes and measure sample/4x true peaks."""
from __future__ import annotations

import json
import os
import subprocess
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
REPORTS = ROOT / "testing/audio-review-2026-09-03"
OUT = REPORTS / "renders"
RATE = 48000


def main():
    settings = json.loads((REPORTS / "mix-settings.json").read_text(encoding="utf-8"))
    assets, mix, defaults = settings["assets"], settings["mix"], settings["defaults"]
    ffmpeg = os.environ.get("FFMPEG_BINARY")
    if not ffmpeg:
        raise SystemExit("Set FFMPEG_BINARY to a trusted local FFmpeg binary.")
    cache = {}

    def decode(ident):
        if ident not in cache:
            path = ROOT / assets[ident]["path"]
            pcm = subprocess.check_output([ffmpeg, "-v", "error", "-i", str(path),
                "-f", "f32le", "-ac", "2", "-ar", str(RATE), "pipe:1"])
            cache[ident] = np.frombuffer(pcm, dtype="<f4").reshape(-1, 2)
        return cache[ident]

    def entry(ident, bus="sfx", gain=None, delay=0):
        return {"id": ident, "bus": bus, "gain": gain if gain is not None else assets[ident]["gain"], "delay": delay}

    cases = {
        "dirt-contact": [entry("digOne"), entry("libDirtBreak")],
        "stone-contact": [entry("digTwo"), entry("libToolContact"), entry("libStoneBreak")],
        "star-plus-contact": [entry("starDestruction"), entry("digOne"), entry("libToolContact"), entry("libStoneBreak"), entry("libUiClick")],
        "level-short": [entry("levelUpShort")],
        "level-epic": [entry("levelUpEpic")],
        "creepy-detail": [entry("libDeepCaveBedA", "cave"), entry("libWhispersDeep", "cave", delay=1)],
        "approved-cave-composite": [entry("caveEerie", "cave", .08), entry("miningMars", "cave", .045), entry("evilSpell", "cave", .055), entry("panicTimber", "cave")],
        "reference-rain": [entry("rainReference", "weather"), entry("windReference", "weather")],
        "heavy-rain": [entry("libTownHeavyRain", "weather")],
        "sheltered-rain": [entry("libWoodRainInside", "weather")],
        "danger-and-contact": [entry("libPressureRumble"), entry("libStoneBreak"), entry("digOne"), entry("libDeepCaveBedB", "cave")],
    }
    cases["max-approved-overlap"] = cases["star-plus-contact"] + cases["approved-cave-composite"] + cases["reference-rain"]
    OUT.mkdir(parents=True, exist_ok=True)
    results = []
    for name, layers in cases.items():
        budgets = {"sfx": mix["oneShotPeakBudget"], "cave": mix["cave"]["peakBudget"], "weather": mix["weather"]["peakBudget"]}
        peaks = {bus: sum(layer["gain"] * assets[layer["id"]]["peak"] for layer in layers if layer["bus"] == bus) for bus in budgets}
        scales = {bus: min(1, budgets[bus] / max(peaks[bus], 1e-9)) for bus in budgets}
        # Maximum overlap uses unity sliders; other renders use shipping defaults.
        user_gain = 1 if name == "max-approved-overlap" else defaults["master"] * defaults["sfx"]
        length = min(RATE * 12, max(len(decode(layer["id"])) + round(layer["delay"] * RATE) for layer in layers))
        output = np.zeros((length, 2), dtype=np.float32)
        for layer in layers:
            pcm = decode(layer["id"])
            delay = round(layer["delay"] * RATE)
            count = min(len(pcm), length - delay)
            output[delay:delay + count] += pcm[:count] * layer["gain"] * scales[layer["bus"]] * user_gain
        peak = float(np.max(np.abs(output)))
        clipped = int(np.count_nonzero(np.abs(output) >= 1))
        oversampled = subprocess.check_output([ffmpeg, "-v", "error", "-f", "f32le", "-ar", str(RATE), "-ac", "2",
            "-i", "pipe:0", "-af", "aresample=192000", "-f", "f32le", "pipe:1"], input=output.astype("<f4").tobytes())
        true_peak = float(np.max(np.abs(np.frombuffer(oversampled, dtype="<f4"))))
        if clipped or true_peak >= 1:
            raise AssertionError(f"Clipping in {name}: sample={peak}, 4x true peak={true_peak}")
        path = OUT / (name + ".wav")
        with wave.open(str(path), "wb") as target:
            target.setnchannels(2)
            target.setsampwidth(2)
            target.setframerate(RATE)
            target.writeframes((output * 32767).astype("<i2").tobytes())
        rms = float(np.sqrt(np.mean(output.astype(np.float64) ** 2)))
        results.append({"case": name, "durationSeconds": round(length / RATE, 3),
            "samplePeak": round(peak, 7), "truePeak4x": round(true_peak, 7),
            "truePeakDbfs": round(20 * np.log10(max(true_peak, 1e-12)), 2),
            "rmsDbfs": round(20 * np.log10(max(rms, 1e-12)), 2), "clippedSamples": clipped,
            "busScales": scales, "userGain": user_gain, "layers": layers,
            "render": path.relative_to(ROOT).as_posix()})
    report = {"audit": "offline-approved-mix-headroom", "passed": True,
        "scope": "Approved SFX and recorded ambience, full overlaps without fade-in. Existing music, speech and procedural effects are not in these renders.",
        "truePeakMethod": "FFmpeg 4x resampling; not hardware SPL measurement", "cases": results}
    (REPORTS / "rendered-volume-audit.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"passed": True, "cases": len(results), "maxTruePeak": max(row["truePeak4x"] for row in results), "clippedSamples": 0}))


if __name__ == "__main__":
    main()
