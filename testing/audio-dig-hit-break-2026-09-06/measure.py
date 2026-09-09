import json, math, subprocess
from pathlib import Path
import numpy as np
BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
FF = r"C:\Users\Mila\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe"
catalog = json.loads((BASE / "catalog.json").read_text(encoding="utf-8"))
settings = catalog["settings"]
report = []
for source in catalog["sources"]:
 path = ROOT / source["path"]
 probe = json.loads(subprocess.check_output([FF.replace("ffmpeg.exe", "ffprobe.exe"), "-v", "error", "-show_entries", "stream=channels,sample_rate", "-of", "json", str(path)]))["streams"][0]
 channels, rate = probe["channels"], settings["sampleRate"]
 raw = subprocess.check_output([FF, "-v", "error", "-i", str(path), "-ar", str(rate), "-f", "f32le", "pipe:1"])
 data = np.frombuffer(raw, dtype="<f4").reshape(-1, channels).copy()
 original_ms = len(data) / rate * 1000
 window = source.get("window")
 if window:
  start, length = round(window["start"] * rate), round(window["duration"] * rate)
  data = data[start:start+length].copy()
  fade_in, fade_out = round(window["fadeIn"]*rate), round(window["fadeOut"]*rate)
  for n in range(min(fade_in, len(data))): data[n] *= n/max(1,fade_in-1)
  for n in range(min(fade_out, len(data))): data[-1-n] *= n/max(1,fade_out-1)
 energy = np.mean(data.astype(np.float64)**2, axis=1)
 width = round(rate * settings["analysisWindowMs"] / 1000)
 rms = np.sqrt(np.convolve(energy, np.ones(width)/width, mode="valid"))
 peak = float(np.max(np.abs(data)))
 attack_ms = float(np.argmax(rms >= np.max(rms)*settings["bodyThresholdRatio"])) / rate * 1000
 active = np.where(np.max(np.abs(data),axis=1) > max(peak*0.01, 0.00001))[0]
 active_end_ms = float(active[-1])/rate*1000 if len(active) else 0
 routes=[]
 for route in catalog["routes"]:
  for event in route["events"]:
   if event["sourceId"] == source["id"]:
    routes.append({"id":route["id"], "label":route["label"], "mode":route.get("mode","primary"), "stage":route["stage"],
     "gain":event["outputGain"],"rate":event["rate"],"durationMs":len(data)/rate/event["rate"]*1000,
     "attackMs":attack_ms/event["rate"], "estimatedPeakDb":20*math.log10(max(1e-9,peak*event["outputGain"]))})
 flags=[]
 if attack_ms > settings["attackWarningMs"]: flags.append("Main sound body starts after 35 ms")
 if len(data)/rate*1000 > settings["repeatedTailWarningMs"] and source["assetId"] != "starDestruction": flags.append("Tail exceeds a 400 ms contact interval")
 if source["assetId"] == "starDestruction": flags.append("Long special-block cue; judge separately from routine hits")
 if source["assetId"] == "libToolContact": flags.append("Same recording for blocked hits and hard-material fallback")
 if source["assetId"] == "libStoneBreak": flags.append("Shared stone / metal destruction texture")
 if source["assetId"] == "dig-star-0": flags.append("Star hit uses a musical chime; audit sustained tone and retriggering")
 source["measurement"]={"originalMs":original_ms,"bufferMs":len(data)/rate*1000,"channels":channels,"peak":peak,
  "attackMs":attack_ms,"activeEndMs":active_end_ms,"flags":flags,"routes":routes}
 report.append({"assetId":source["assetId"],**source["measurement"]})
# Compare actual alternatives within the same dispatch, not unrelated source loudness.
by_id = {source["id"]: source for source in catalog["sources"]}
seen_groups, comparisons = set(), []
for route in catalog["routes"]:
 events = route["events"]
 group = tuple(sorted(event["sourceId"] for event in events))
 if len(group) < 2 or group in seen_groups: continue
 seen_groups.add(group)
 levels = [20*math.log10(max(1e-9, by_id[e["sourceId"]]["measurement"]["peak"]*e["outputGain"])) for e in events]
 spread = max(levels)-min(levels)
 if spread >= 4:
  text = f"Alternatives in this bank differ by {spread:.1f} dB in estimated peak; compare their balance"
  for event in events: by_id[event["sourceId"]]["measurement"]["flags"].append(text)
  comparisons.append({"route":route["id"],"peakSpreadDb":spread,"sources":list(group)})
normal_events = [e for route in catalog["routes"] if route.get("mode")=="primary" and route["stage"]=="hit" and route.get("tileName")!="SKY_TILE" for e in route["events"]]
normal_max = max(20*math.log10(max(1e-9,by_id[e["sourceId"]]["measurement"]["peak"]*e["outputGain"])) for e in normal_events)
star_hit = next(source for source in catalog["sources"] if source["assetId"]=="dig-star-0")
star_peak = max(route["estimatedPeakDb"] for route in star_hit["measurement"]["routes"])
star_hit["measurement"]["flags"].append(f"Estimated peak is {star_peak-normal_max:.1f} dB above the loudest ordinary hit in this audit")
catalog["comparisons"] = {"banks":comparisons,"starHitAboveOrdinaryPeakDb":star_peak-normal_max}
(BASE/"catalog.json").write_text(json.dumps(catalog,indent=2),encoding="utf-8")
(BASE/"measurements.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
print(json.dumps([{k:r[k] for k in ["assetId","bufferMs","attackMs","flags"]} for r in report],indent=2))
