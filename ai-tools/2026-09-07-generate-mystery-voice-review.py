"""2026-09-07: Generate a bounded, unapproved mystery voice audition."""
import array
import hashlib
import importlib.util
import json
import math
import msvcrt
from pathlib import Path
import re
import shutil
import subprocess
import sys
import urllib.error

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "values/playerVoiceMysteryReviewV1.json"


def save_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def hash_bytes(data):
    return hashlib.sha256(data).hexdigest()


def private_key():
    print("SECURE_INPUT_READY: enter the temporary key; characters are not echoed.", flush=True)
    chars = []
    try:
        while True:
            char = msvcrt.getwch()
            if char in ("\r", "\n"):
                break
            if char == "\x03":
                raise KeyboardInterrupt()
            if char == "\b":
                if chars:
                    chars.pop()
            elif char not in ("\x00", "\xe0"):
                chars.append(char)
        key = "".join(chars).strip()
        if not key.startswith("sk-or-"):
            raise ValueError("Expected an OpenRouter key; nothing was submitted.")
        return key
    finally:
        chars.clear()


def run_command(args):
    result = subprocess.run(
        [str(item) for item in args], capture_output=True, check=False,
        creationflags=subprocess.CREATE_NO_WINDOW)
    if result.returncode:
        raise RuntimeError("Audio conversion failed: " + result.stderr.decode("utf-8", "replace")[-1000:])
    return result


def process_audio(raw, target, settings):
    ffmpeg = shutil.which("ffmpeg")
    ffprobe = shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        raise RuntimeError("ffmpeg and ffprobe are required.")
    rate = settings["sampleRate"]
    decoded = run_command([ffmpeg, "-v", "error", "-i", raw, "-ac", 1, "-ar", rate, "-f", "s16le", "-"]).stdout
    samples = array.array("h", decoded)
    frame = max(1, rate // 100)
    threshold = 32768 * 10 ** (settings["trimThresholdDb"] / 20)
    active = []
    for start in range(0, len(samples), frame):
        chunk = samples[start:start + frame]
        rms = math.sqrt(sum(float(v) * v for v in chunk) / max(1, len(chunk)))
        if rms > threshold:
            active.append(start)
    if not active:
        raise RuntimeError("The provider returned silence.")
    first = max(0, active[0] / rate - settings["leadPadSeconds"])
    last = min(len(samples) / rate, (active[-1] + frame) / rate + settings["tailPadSeconds"])
    clean = f"atrim=start={first:.4f}:end={last:.4f},asetpts=PTS-STARTPTS,highpass=f={settings['highpassHz']}"
    meter = f"loudnorm=I={settings['targetLufs']}:TP={settings['truePeakDb']}:LRA={settings['loudnessRange']}:print_format=json"
    def measured(path, filters):
        result = run_command([ffmpeg, "-hide_banner", "-i", path, "-af", filters, "-f", "null", "-"])
        log = result.stderr.decode("utf-8", "replace")
        return json.loads(log[log.rfind("{"):log.rfind("}") + 1])
    before = measured(raw, clean + "," + meter)
    gain_db = settings["targetLufs"] - float(before["input_i"])
    limiter = settings["limiter"]
    ceiling = 10 ** (settings["truePeakDb"] / 20)
    for render_pass in range(limiter["passes"]):
        rendered_gain_db = gain_db
        filters = (
            f"{clean},aresample={limiter['oversampleRate']},volume={gain_db:.5f}dB,"
            f"alimiter=limit={ceiling:.8f}:level=false:attack={limiter['attackMs']}:"
            f"release={limiter['releaseMs']}:latency=true"
        )
        run_command([ffmpeg, "-hide_banner", "-y", "-i", raw, "-af", filters,
                     "-ac", settings["channels"], "-ar", rate,
                     "-c:a", "libmp3lame", "-b:a", settings["bitrate"], target])
        after = measured(target, meter)
        correction = settings["targetLufs"] - float(after["input_i"])
        if abs(correction) <= limiter["lufsTolerance"]:
            break
        gain_db += correction
    loudness = {"output_i": after["input_i"], "output_tp": after["input_tp"]}
    probe = json.loads(run_command([ffprobe, "-v", "error", "-show_entries",
        "format=duration:stream=sample_rate,channels", "-of", "json", target]).stdout)
    duration = float(probe["format"]["duration"])
    return {
        "durationSeconds": round(duration, 3),
        "rawDurationSeconds": round(len(samples) / rate, 3),
        "trimStartSeconds": round(first, 3),
        "trimEndSeconds": round(last, 3),
        "outputIntegratedLufs": float(loudness["output_i"]),
        "outputTruePeakDb": float(loudness["output_tp"]),
        "loudnessMeasurement": "Decoded final MP3; integrated LUFS and true peak",
        "gainDb": round(rendered_gain_db,3),
        "loudnessWithinTolerance": abs(float(loudness["output_i"])-settings["targetLufs"]) <= limiter["lufsTolerance"],
        "durationFlag": duration > settings["maxDurationSeconds"],
        "sampleRate": int(probe["streams"][0]["sample_rate"]),
        "channels": int(probe["streams"][0]["channels"]),
        "rawSha256": hash_bytes(raw.read_bytes()),
        "audioSha256": hash_bytes(target.read_bytes())
    }


def montage(name, sequence, out, settings):
    rate = settings["sampleRate"]
    pcm = bytearray()
    gap = bytes(round(settings["montageGapSeconds"] * rate) * 2)
    timeline = []
    for item in sequence:
        filename = out / item["audio"]
        decoded = run_command([shutil.which("ffmpeg"), "-v", "error", "-i", filename,
                               "-ac", 1, "-ar", rate, "-f", "s16le", "-"]).stdout
        timeline.append({"id": item["id"], "voice": item["voice"], "text": item["text"],
                         "startSeconds": round(len(pcm) / (rate * 2), 3),
                         "durationSeconds": round(len(decoded) / (rate * 2), 3)})
        pcm.extend(decoded)
        pcm.extend(gap)
    target = out / "audio" / (name + ".mp3")
    result = subprocess.run([shutil.which("ffmpeg"), "-v", "error", "-y", "-f", "s16le",
        "-ar", str(rate), "-ac", "1", "-i", "-", "-c:a", "libmp3lame", "-b:a", "128k", str(target)],
        input=bytes(pcm), capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)
    if result.returncode:
        raise RuntimeError("Montage conversion failed.")
    return {"audio": target.relative_to(out).as_posix(), "timeline": timeline,
            "durationSeconds": round(len(pcm) / (rate * 2), 3), "sha256": hash_bytes(target.read_bytes())}


def main():
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise RuntimeError("Put the installed ffmpeg and ffprobe on PATH before running this tool.")
    if source["runtimeWired"] or not source["reviewOnly"]:
        raise RuntimeError("This generator only creates review assets.")
    out = (ROOT / source["outputRoot"]).resolve()
    if ROOT.resolve() not in out.parents:
        raise RuntimeError("Output must remain inside this checkout.")
    clips = [dict(clip, group=group["id"], voice=source["voice"])
             for group in source["groups"] for clip in group["clips"]]
    comparisons = [dict(clip, voice=source["comparison"]["voice"])
                   for clip in clips if clip["id"] in source["comparison"]["clipIds"]]
    requests = clips + comparisons
    limits = source["generation"]
    chars = sum(len(item["text"]) for item in requests)
    estimate = chars * limits["pricePerMillionCharactersUSD"] / 1_000_000
    if len(requests) > limits["maxRequests"] or chars > limits["maxCharacters"]:
        raise RuntimeError("Audition exceeds the bounded request/character budget.")
    if estimate > limits["estimatedSpendLimitUSD"]:
        raise RuntimeError("Audition exceeds the estimated cost budget.")
    if len({(item["id"], item["voice"]) for item in requests}) != len(requests):
        raise RuntimeError("Duplicate audition IDs.")
    for item in requests:
        if not limits["minWords"] <= len(re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", item["text"])) <= limits["maxWords"]:
            raise RuntimeError("Keep each audition between three and seven words.")
    spec = importlib.util.spec_from_file_location("understar_existing_tts",
        ROOT / "ai-tools/2026-08-30-generate-player-leo-library.py")
    provider = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(provider)
    manifest_path = out / "2026-09-07-audition-manifest.json"
    manifest = {"created": source["created"], "reviewOnly": True, "runtimeWired": False,
        "reviewStatus": "awaiting-listening-review", "model": source["model"],
        "source": SOURCE.relative_to(ROOT).as_posix(), "sourceSha256": hash_bytes(SOURCE.read_bytes()),
        "requestedRecordings": len(requests), "submittedCharactersEstimate": chars,
        "estimatedCostUSD": round(estimate, 6), "status": "generating", "clips": []}
    print(f"Bounded audition: {len(requests)} recordings, {chars} characters; estimated USD {estimate:.4f}.", flush=True)
    key = None if "--process-only" in sys.argv else private_key()
    try:
        for index, item in enumerate(requests, 1):
            basename = item["id"].lower() + "-" + item["voice"]
            raw = out / "raw" / (basename + ".mp3")
            target = out / "audio" / (basename + ".mp3")
            digest = hash_bytes(json.dumps({name: value for name, value in
                [("model", source["model"]), ("voice", item["voice"]), ("input", item["text"]),
                 ("format", source["responseFormat"])]}, sort_keys=True).encode())
            receipt = out / "raw" / (basename + ".json")
            reused = raw.exists() and receipt.exists() and json.loads(receipt.read_text())["requestSha256"] == digest
            if not reused:
                if "--process-only" in sys.argv:
                    raise RuntimeError("Missing matching raw audio; offline processing cannot generate it.")
                audio, media_type, generation_id = provider.request_audio(key, dict(source, voice=item["voice"]), item)
                raw.write_bytes(audio)
                save_json(receipt, {"id": item["id"], "voice": item["voice"], "text": item["text"],
                    "model": source["model"], "requestSha256": digest, "contentType": media_type,
                    "generationId": generation_id, "rawSha256": hash_bytes(audio)})
            metrics = process_audio(raw, target, source["audio"])
            record = dict(item, raw=raw.relative_to(out).as_posix(),
                          audio=target.relative_to(out).as_posix(), requestSha256=digest, **metrics)
            manifest["clips"].append(record)
            save_json(manifest_path, manifest)
            print(f"{index:02}/{len(requests)} {item['id']} {item['voice']}: {metrics['durationSeconds']:.2f}s" +
                  (" [DURATION REVIEW]" if metrics["durationFlag"] else ""), flush=True)
        primary = [item for item in manifest["clips"] if item["voice"] == source["voice"]]
        paired = [item for clip_id in source["comparison"]["clipIds"]
                  for voice in (source["voice"], source["comparison"]["voice"])
                  for item in manifest["clips"] if item["id"] == clip_id and item["voice"] == voice]
        manifest["montages"] = {
            "primary": montage("01-leo-all-twelve", primary, out, source["audio"]),
            "comparison": montage("02-leo-rex-matched-comparison", paired, out, source["audio"])}
        manifest["status"] = "complete"
        manifest["subjectiveListeningStatus"] = "Awaiting human accept/reject; technical checks do not prove intelligibility."
        save_json(manifest_path, manifest)
        (out / "review" / "audition-data.js").write_text("window.AUDITION = " + json.dumps({"source": source, "manifest": manifest}, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
        print("AUDITION_COMPLETE: recordings and montages saved; no game integration.", flush=True)
    except Exception as error:
        manifest["status"] = "incomplete"
        manifest["failureType"] = type(error).__name__
        if isinstance(error, urllib.error.HTTPError):
            manifest["httpStatus"] = error.code
        save_json(manifest_path, manifest)
        print("AUDITION_STOPPED:", type(error).__name__, getattr(error, "code", ""), flush=True)
        raise SystemExit(1)
    finally:
        key = None


if __name__ == "__main__":
    main()
