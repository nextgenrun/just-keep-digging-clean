"""Re-decode the 562 frozen derivatives and render bounded orchestration cases."""
from __future__ import annotations

import argparse
import json
import subprocess
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
REPORTS = ROOT / "testing/audio-review-2026-09-03"
RATE = 48000


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", required=True, help="Trusted local FFmpeg executable")
    args = parser.parse_args()
    settings = json.loads((REPORTS / "freesound-mix-settings.json").read_text(encoding="utf-8"))
    old = json.loads((REPORTS / "mix-settings.json").read_text(encoding="utf-8"))["assets"]
    assets = {asset["id"]: asset for asset in settings["assets"]}
    levels = []

    def decode(asset, rate=RATE, channels=2):
        raw = subprocess.check_output([args.ffmpeg, "-v", "error", "-i", str(ROOT / asset["path"]),
            "-f", "f32le", "-ac", str(channels), "-ar", str(rate), "pipe:1"])
        pcm = np.frombuffer(raw, dtype="<f4").reshape(-1, channels)
        assert pcm.size and np.isfinite(pcm).all(), asset["path"]
        return pcm

    def upsample(pcm):
        raw = subprocess.check_output([args.ffmpeg, "-v", "error", "-f", "f32le", "-ar", str(RATE),
            "-ac", "2", "-i", "pipe:0", "-af", "aresample=192000", "-f", "f32le", "pipe:1"],
            input=pcm.astype("<f4").tobytes())
        return float(np.max(np.abs(np.frombuffer(raw, dtype="<f4"))))

    for index, asset in enumerate(assets.values(), 1):
        # A fresh 4x decode of every final file also catches invalid local media.
        pcm = decode(asset, RATE * 4, asset["channels"])
        peak = float(np.max(np.abs(pcm)))
        clipped = int(np.count_nonzero(np.abs(pcm) >= 1))
        assert not clipped and peak < 1, asset["id"]
        levels.append({"id": asset["id"], "truePeak4x": round(peak, 7), "clippedSamples": clipped})
        if index % 100 == 0:
            print(json.dumps({"decoded": index, "total": len(assets)}), flush=True)

    def entry(role, bus="sfx", weight=1, variant=0):
        candidates = sorted((a for a in assets.values() if a["role"] == role),
                            key=lambda a: a["gain"] * a["peak"], reverse=True)
        asset = candidates[variant % len(candidates)]
        return {"asset": asset, "bus": bus, "gain": asset["gain"] * weight}

    def legacy(ident, bus="sfx", weight=1):
        return {"asset": {"id": ident, **old[ident]}, "bus": bus, "gain": old[ident]["gain"] * weight}

    cases = {
        "near-star-and-earth-contact": [entry("starHum", "stars"), entry("starGrain", "stars"),
            entry("mineEarth"), legacy("libDirtBreak"), entry("footstepDirt")],
        "two-star-handover": [entry("starHum", "stars", .5), entry("starHum", "stars", .5, 1),
            entry("starGrain", "stars", .5), entry("starGrain", "stars", .5, 1)],
        "critical-metal-and-reward": [entry("panicFast", "panic"), entry("mineStone"), entry("mineMetal"),
            entry("crystalBreak"), entry("coinReward"), legacy("libPressureRumble")],
        "quiet-refuge-recovery": [entry("starHum", "stars"), entry("panicSlow", "panic", .45),
            legacy("libDeepCaveBedA", "cave", .55)],
        "interface-and-impact": [entry("uiClick"), entry("coinReward"), entry("coinPickup"),
            entry("mineStone"), entry("mineMetal"), entry("crystalBreak"), entry("flightWhoosh"),
            legacy("libLandingDebris"), legacy("starDestruction"), legacy("levelUpShort")],
    }
    cases["unity-sliders-full-overlap"] = cases["critical-metal-and-reward"] + [
        entry("starHum", "stars"), entry("starGrain", "stars"),
        legacy("libDeepCaveBedA", "cave"), legacy("libTownHeavyRain", "weather")]
    cfg, mix = settings["config"], settings["mix"]
    budgets = {"sfx": mix["oneShotPeakBudget"], "stars": cfg["stars"]["peakBudget"],
               "panic": cfg["panic"]["peakBudget"], "cave": mix["cave"]["peakBudget"],
               "weather": mix["weather"]["peakBudget"]}
    out = REPORTS / "orchestra-renders"
    out.mkdir(exist_ok=True)
    results = []
    for name, layers in cases.items():
        decoded = [decode(layer["asset"]) for layer in layers]
        length = min(RATE * 12, max(len(pcm) for pcm in decoded))
        sums = {bus: sum(layer["gain"] * layer["asset"]["peak"] for layer in layers if layer["bus"] == bus) for bus in budgets}
        scales = {bus: min(1, budgets[bus] / max(sums[bus], 1e-9)) for bus in budgets}
        user = 1 if name.startswith("unity") else settings["defaults"]["master"] * settings["defaults"]["sfx"]
        pcm = np.zeros((length, 2), dtype=np.float32)
        for layer, source in zip(layers, decoded):
            if layer["asset"].get("loop"):
                source = np.tile(source, (int(np.ceil(length / len(source))), 1))
            count = min(length, len(source))
            pcm[:count] += source[:count] * layer["gain"] * scales[layer["bus"]] * user
        true_peak = upsample(pcm)
        clipped = int(np.count_nonzero(np.abs(pcm) >= 1))
        assert not clipped and true_peak < 1, name
        path = out / f"{name}.wav"
        with wave.open(str(path), "wb") as stream:
            stream.setparams((2, 2, RATE, 0, "NONE", "not compressed"))
            stream.writeframes((pcm * 32767).astype("<i2").tobytes())
        results.append({"case": name, "samplePeak": round(float(np.max(np.abs(pcm))), 7),
            "truePeak4x": round(true_peak, 7), "clippedSamples": clipped, "busScales": scales,
            "userGain": user, "layers": [{"id": x["asset"]["id"], "bus": x["bus"], "gain": x["gain"]} for x in layers],
            "render": path.relative_to(ROOT).as_posix()})
    report = {"passed": True, "decoded": len(levels), "method": "FFmpeg 4x resampling",
        "limits": "Conservative simultaneous source overlaps using exported bus budgets. No fades, filtering or panning; existing music, speech and procedural effects excluded. Not speaker SPL or perceptual acceptance.",
        "maxSourceTruePeak": max(x["truePeak4x"] for x in levels), "sourceLevels": levels, "cases": results}
    (REPORTS / "freesound-rendered-volume-audit.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"passed": True, "decoded": len(levels), "cases": len(results),
        "maxSourceTruePeak": report["maxSourceTruePeak"], "maxMixTruePeak": max(x["truePeak4x"] for x in results), "clippedSamples": 0}))


if __name__ == "__main__":
    main()
