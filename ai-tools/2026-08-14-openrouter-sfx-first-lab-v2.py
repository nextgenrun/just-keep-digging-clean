"""Build a review-only SFX-first OpenRouter and local-mastering comparison."""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
import wave
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TOOL_DIR = Path(__file__).resolve().parent
CONFIG_PATH = TOOL_DIR / "2026-08-14-openrouter-sfx-first-lab-config-v2.json"
OUTPUT_DIR = ROOT / "sound/library-v2/SoundLibrary_Review/00_INBOX_RAW_EXPORTS/openrouter-sfx-first-v2-2026-08-14"
STATUS_PATH = OUTPUT_DIR / "2026-08-14-openrouter-sfx-first-status-v2.json"
MANIFEST_PATH = OUTPUT_DIR / "2026-08-14-openrouter-sfx-first-results-v2.json"
MANIFEST_JS_PATH = OUTPUT_DIR / "2026-08-14-openrouter-sfx-first-results-v2.js"
OPENROUTER_BASE = "https://openrouter.ai/api/v1"


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def status(state: str, message: str, completed: int, total: int) -> None:
    write_json(STATUS_PATH, {
        "state": state,
        "message": message,
        "completed": completed,
        "total": total,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    })


def safe_error(error: Exception) -> str:
    message = str(error)
    if isinstance(error, urllib.error.HTTPError):
        try:
            body = json.loads(error.read().decode("utf-8", errors="replace"))
            detail = body.get("error", body)
            message = detail.get("message", detail) if isinstance(detail, dict) else detail
        except Exception:
            message = error.reason
        message = f"HTTP {error.code}: {message}"
    return re.sub(r"sk-or-v1-[A-Za-z0-9_-]+", "[REDACTED]", str(message))[:600]


def auth_headers(key: str, accept: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": accept,
        "HTTP-Referer": "https://localhost/dig-game-sfx-review",
        "X-Title": "Dig Game SFX First Review Lab V2",
    }


def post_speech(key: str, payload: dict) -> tuple[bytes, str, str | None]:
    request = urllib.request.Request(
        f"{OPENROUTER_BASE}/audio/speech",
        data=json.dumps(payload).encode("utf-8"),
        headers=auth_headers(key, "audio/mpeg, audio/pcm"),
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        return response.read(), response.headers.get("Content-Type", ""), response.headers.get("X-Generation-Id")


def post_chat_audio(key: str, payload: dict) -> tuple[bytes, str]:
    request = urllib.request.Request(
        f"{OPENROUTER_BASE}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers=auth_headers(key, "text/event-stream"),
    )
    audio_chunks: list[bytes] = []
    transcript: list[str] = []
    with urllib.request.urlopen(request, timeout=240) as response:
        for raw_line in response:
            line = raw_line.decode("utf-8", errors="replace").strip()
            if not line.startswith("data: ") or line == "data: [DONE]":
                continue
            event = json.loads(line[6:])
            delta = (event.get("choices") or [{}])[0].get("delta") or {}
            audio = delta.get("audio") or {}
            if audio.get("data"):
                audio_chunks.append(base64.b64decode(audio["data"]))
            if audio.get("transcript"):
                transcript.append(audio["transcript"])
    if not audio_chunks:
        raise RuntimeError("Model returned no audio chunks")
    return b"".join(audio_chunks), "".join(transcript)


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def generate_chat_sample(key: str, model: dict, sample_id: str, label: str, prompt: str, kind: str) -> dict:
    result = {
        "kind": kind,
        "id": sample_id,
        "role": label,
        "model": model["id"],
        "modelLabel": model["label"],
        "prompt": prompt,
    }
    payload = {
        "model": model["id"],
        "stream": True,
        "modalities": ["text", "audio"],
        "audio": {"voice": model["voice"], "format": "wav"},
        "messages": [{"role": "user", "content": prompt}],
    }
    try:
        audio, transcript = post_chat_audio(key, payload)
        filename = f"{kind}__{slug(sample_id)}__{slug(model['id'])}.wav"
        (OUTPUT_DIR / filename).write_bytes(audio)
        result.update(status="ready", file=filename, transcript=transcript, bytes=len(audio))
    except Exception as error:
        result.update(status="error", error=safe_error(error))
    return result


def find_source(spec: dict) -> Path | None:
    folder = ROOT / spec["searchRoot"]
    candidates = [path for path in folder.glob("*") if path.is_file() and spec["filenameContains"].lower() in path.name.lower()]
    candidates.sort(key=lambda path: ("(1)" in path.name, path.suffix.lower() != ".wav", path.name.lower()))
    return candidates[0] if candidates else None


def build_local_variants(config: dict) -> list[dict]:
    results: list[dict] = []
    ffmpeg = shutil.which("ffmpeg")
    for source_spec in config["localSfxSources"]:
        source = find_source(source_spec)
        for treatment in config["localTreatments"]:
            result = {
                "kind": "local-sfx",
                "id": f"{source_spec['id']}-{treatment['id']}",
                "cueId": source_spec["id"],
                "role": source_spec["role"],
                "model": "local-ffmpeg" if treatment["id"] != "source" else "existing-library",
                "modelLabel": treatment["label"],
                "treatment": treatment["id"],
                "source": source.relative_to(ROOT).as_posix() if source else None,
            }
            try:
                if not source:
                    raise FileNotFoundError(f"No source matched {source_spec['filenameContains']}")
                if treatment["id"] == "source":
                    filename = f"local__{source_spec['id']}__source{source.suffix.lower()}"
                    shutil.copy2(source, OUTPUT_DIR / filename)
                else:
                    if not ffmpeg:
                        raise RuntimeError("ffmpeg was not found")
                    filename = f"local__{source_spec['id']}__{treatment['id']}.wav"
                    command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(source), "-af", treatment["filter"], "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", str(OUTPUT_DIR / filename)]
                    subprocess.run(command, check=True, capture_output=True, text=True)
                result.update(status="ready", file=filename, bytes=(OUTPUT_DIR / filename).stat().st_size)
            except Exception as error:
                result.update(status="error", error=safe_error(error))
            results.append(result)
    return results


def generate_voice(key: str, model: dict, voice_name: str, script: dict) -> dict:
    response_format = model["responseFormat"]
    tagged = model["id"].startswith("x-ai/")
    result = {
        "kind": "voice",
        "id": f"{script['id']}-{slug(voice_name)}",
        "role": script["role"],
        "model": model["id"],
        "modelLabel": model["label"],
        "voice": voice_name,
        "text": script["text"] if tagged else script["plainText"],
    }
    payload = {"model": model["id"], "input": result["text"], "voice": voice_name, "response_format": response_format, "speed": 1.0}
    try:
        audio, content_type, generation_id = post_speech(key, payload)
        stem = f"voice__{slug(model['label'])}__{slug(voice_name)}"
        if response_format == "pcm":
            filename = stem + ".wav"
            with wave.open(str(OUTPUT_DIR / filename), "wb") as output:
                output.setnchannels(1)
                output.setsampwidth(2)
                output.setframerate(model.get("pcmRate", 24000))
                output.writeframes(audio)
        else:
            filename = stem + ".mp3"
            (OUTPUT_DIR / filename).write_bytes(audio)
        result.update(status="ready", file=filename, contentType=content_type, generationId=generation_id, bytes=(OUTPUT_DIR / filename).stat().st_size)
    except Exception as error:
        result.update(status="error", error=safe_error(error))
    return result


def save_manifest(results: list[dict], started_at: str) -> None:
    ready = sum(item.get("status") == "ready" for item in results)
    manifest = {
        "schemaVersion": 2,
        "reviewOnly": True,
        "runtimeWired": False,
        "startedAt": started_at,
        "completedAt": datetime.now(timezone.utc).isoformat(),
        "outputDirectory": OUTPUT_DIR.relative_to(ROOT).as_posix(),
        "summary": {"ready": ready, "failed": sum(item.get("status") == "error" for item in results), "skipped": sum(item.get("status") == "skipped" for item in results)},
        "results": results,
    }
    write_json(MANIFEST_PATH, manifest)
    MANIFEST_JS_PATH.write_text("window.OPENROUTER_SFX_V2_RESULTS = " + json.dumps(manifest, ensure_ascii=False) + ";\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    if args.validate_only:
        print(f"Validated V2: {len(config['sfxModels'])} audio models, {len(config['sfxCues'])} SFX cues, {sum(len(model['voices']) for model in config['voiceCandidates'])} voice variants")
        return 0
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key:
        print("OPENROUTER_API_KEY was not provided.", file=sys.stderr)
        return 2
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    started_at = datetime.now(timezone.utc).isoformat()
    expanded_count = len(config["sfxCues"]) * len(config["promptStyles"])
    total = len(config["localSfxSources"]) * len(config["localTreatments"]) + len(config["sfxModels"]) * (1 + len(config["sfxProbePrompts"]) + expanded_count) + sum(len(model["voices"]) for model in config["voiceCandidates"])
    results: list[dict] = []
    status("running", "Building local SFX mastering comparisons", 0, total)
    results.extend(build_local_variants(config))
    completed = len(results)
    for model in config["sfxModels"]:
        status("running", f"Checking audio output for {model['label']}", completed, total)
        control = generate_chat_sample(key, model, "speech-control", "Speech capability control", "Say exactly: Audio route working.", "capability")
        results.append(control)
        completed += 1
        probes = []
        for prompt in config["sfxProbePrompts"]:
            status("running", f"Probing non-speech SFX with {model['label']}", completed, total)
            probe = generate_chat_sample(key, model, f"probe-{prompt['id']}", prompt["label"], prompt["text"], "sfx-probe")
            results.append(probe)
            probes.append(probe)
            completed += 1
        if any(item.get("status") == "ready" for item in probes):
            for cue in config["sfxCues"]:
                for style in config["promptStyles"]:
                    prompt = style["template"].format(**cue)
                    status("running", f"{model['label']}: {cue['role']} / {style['label']}", completed, total)
                    item = generate_chat_sample(key, model, f"{cue['id']}-{style['id']}", f"{cue['role']} · {style['label']}", prompt, "model-sfx")
                    item.update(cueId=cue["id"], promptStyle=style["id"], promptStyleLabel=style["label"])
                    results.append(item)
                    completed += 1
                    time.sleep(0.1)
        else:
            for cue in config["sfxCues"]:
                for style in config["promptStyles"]:
                    results.append({"kind": "model-sfx", "id": f"{cue['id']}-{style['id']}", "cueId": cue["id"], "role": f"{cue['role']} · {style['label']}", "model": model["id"], "modelLabel": model["label"], "promptStyle": style["id"], "status": "skipped", "error": "Both non-speech capability probes failed; expanded calls were skipped to protect budget."})
                    completed += 1
    for model in config["voiceCandidates"]:
        for voice_name in model["voices"]:
            status("running", f"Voice side test: {model['label']} / {voice_name}", completed, total)
            results.append(generate_voice(key, model, voice_name, config["voiceScript"]))
            completed += 1
            time.sleep(0.1)
    save_manifest(results, started_at)
    playable = sum(item.get("status") == "ready" for item in results)
    status("completed", f"SFX-first library ready: {playable} playable samples", completed, total)
    print(f"SFX-first V2 complete: {playable} playable samples")
    return 0 if playable else 1


if __name__ == "__main__":
    raise SystemExit(main())
