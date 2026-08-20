"""Generate an isolated OpenRouter audio comparison library for human review."""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TOOL_DIR = Path(__file__).resolve().parent
CONFIG_PATH = TOOL_DIR / "2026-08-14-openrouter-audio-lab-config.json"
OUTPUT_DIR = ROOT / "sound/library-v2/SoundLibrary_Review/00_INBOX_RAW_EXPORTS/openrouter-demo-2026-08-14"
STATUS_PATH = OUTPUT_DIR / "2026-08-14-openrouter-audio-status.json"
MANIFEST_PATH = OUTPUT_DIR / "2026-08-14-openrouter-audio-results.json"
MANIFEST_JS_PATH = OUTPUT_DIR / "2026-08-14-openrouter-audio-results.js"
OPENROUTER_BASE = "https://openrouter.ai/api/v1"


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def update_status(state: str, message: str, completed: int = 0, total: int = 0) -> None:
    write_json(STATUS_PATH, {
        "state": state,
        "message": message,
        "completed": completed,
        "total": total,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    })


def request_json(url: str, key: str | None = None, payload: dict | None = None) -> dict:
    headers = {"Accept": "application/json", "User-Agent": "DigGameAudioLab/1.0"}
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if key:
        headers["Authorization"] = f"Bearer {key}"
        headers["HTTP-Referer"] = "https://localhost/dig-game-audio-lab"
        headers["X-Title"] = "Dig Game Audio Review Lab"
    with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers), timeout=90) as response:
        return json.loads(response.read().decode("utf-8"))


def safe_error(error: Exception) -> str:
    if isinstance(error, urllib.error.HTTPError):
        try:
            body = error.read().decode("utf-8", errors="replace")
            parsed = json.loads(body)
            message = parsed.get("error", {}).get("message") or parsed.get("message") or body
        except Exception:
            message = error.reason
        return f"HTTP {error.code}: {str(message)[:300]}"
    return re.sub(r"sk-or-v1-[A-Za-z0-9_-]+", "[REDACTED]", str(error))[:300]


def post_audio(key: str, payload: dict) -> tuple[bytes, str, str | None]:
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
        "HTTP-Referer": "https://localhost/dig-game-audio-lab",
        "X-Title": "Dig Game Audio Review Lab",
    }
    request = urllib.request.Request(
        f"{OPENROUTER_BASE}/audio/speech",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read(), response.headers.get("Content-Type", "audio/mpeg"), response.headers.get("X-Generation-Id")


def generate_tts(key: str, model: dict, script: dict, catalog: dict) -> dict:
    available = catalog.get(model["id"], {})
    voices = available.get("supported_voices") or []
    preferred = model.get("preferredVoice")
    voice = preferred if preferred in voices else (voices[0] if voices else preferred)
    payload = {
        "model": model["id"],
        "input": script["text"],
        "response_format": "mp3",
        "speed": 1.0,
    }
    if voice:
        payload["voice"] = voice
    result = {
        "kind": "voice",
        "model": model["id"],
        "modelLabel": model["label"],
        "voice": voice,
        "characterFit": model["characterFit"],
        **script,
    }
    try:
        audio, content_type, generation_id = post_audio(key, payload)
        filename = f"voice__{script['id']}__{model['id'].replace('/', '__').replace(':', '_')}.mp3"
        (OUTPUT_DIR / filename).write_bytes(audio)
        result.update(status="ready", file=filename, contentType=content_type, generationId=generation_id, bytes=len(audio))
    except Exception as error:
        result.update(status="error", error=safe_error(error))
    return result


def generate_sfx(key: str, model: str, voice: str, prompt: dict) -> dict:
    payload = {
        "model": model,
        "stream": True,
        "modalities": ["text", "audio"],
        "audio": {"voice": voice, "format": "wav"},
        "messages": [{"role": "user", "content": prompt["text"]}],
    }
    result = {"kind": "sfx", "model": model, **prompt}
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        "HTTP-Referer": "https://localhost/dig-game-audio-lab",
        "X-Title": "Dig Game Audio Review Lab",
    }
    try:
        request = urllib.request.Request(
            f"{OPENROUTER_BASE}/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
        )
        chunks: list[str] = []
        transcript: list[str] = []
        with urllib.request.urlopen(request, timeout=180) as response:
            for raw_line in response:
                line = raw_line.decode("utf-8", errors="replace").strip()
                if not line.startswith("data: ") or line == "data: [DONE]":
                    continue
                event = json.loads(line[6:])
                delta = (event.get("choices") or [{}])[0].get("delta") or {}
                audio = delta.get("audio") or {}
                if audio.get("data"):
                    chunks.append(audio["data"])
                if audio.get("transcript"):
                    transcript.append(audio["transcript"])
        if not chunks:
            raise RuntimeError("The model returned no audio chunks")
        audio_bytes = base64.b64decode("".join(chunks))
        filename = f"sfx__{prompt['id']}__gpt-audio-mini.wav"
        (OUTPUT_DIR / filename).write_bytes(audio_bytes)
        result.update(status="ready", file=filename, transcript="".join(transcript), bytes=len(audio_bytes))
    except Exception as error:
        result.update(status="error", error=safe_error(error))
    return result


def resolve_stt_source(source: str) -> Path | None:
    if source.endswith("manifest:first"):
        manifest = ROOT / source.removesuffix("manifest:first") / "manifest.json"
        if not manifest.exists():
            return None
        entries = json.loads(manifest.read_text(encoding="utf-8"))
        return manifest.parent / entries[0] if entries else None
    path = ROOT / source
    return path if path.exists() else None


def transcribe(key: str, model: str, source: Path) -> dict:
    suffix = source.suffix.lower().lstrip(".")
    payload = {
        "model": model,
        "input_audio": {"data": base64.b64encode(source.read_bytes()).decode("ascii"), "format": suffix},
        "language": "en",
    }
    result = {"kind": "transcript", "model": model, "source": source.relative_to(ROOT).as_posix()}
    try:
        response = request_json(f"{OPENROUTER_BASE}/audio/transcriptions", key, payload)
        result.update(status="ready", text=response.get("text", ""), usage=response.get("usage", {}))
    except Exception as error:
        result.update(status="error", error=safe_error(error))
    return result


def save_manifest(results: list[dict], started_at: str) -> None:
    manifest = {
        "schemaVersion": 1,
        "reviewOnly": True,
        "runtimeWired": False,
        "startedAt": started_at,
        "completedAt": datetime.now(timezone.utc).isoformat(),
        "outputDirectory": OUTPUT_DIR.relative_to(ROOT).as_posix(),
        "results": results,
        "voiceClone": {
            "status": "locked",
            "reason": "Reference voice ownership and explicit consent must be confirmed before cloning."
        }
    }
    write_json(MANIFEST_PATH, manifest)
    MANIFEST_JS_PATH.write_text(
        "window.OPENROUTER_AUDIO_RESULTS = " + json.dumps(manifest, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if args.validate_only:
        print(f"Validated config: {len(config['ttsModels'])} TTS models, {len(config['voiceScripts'])} scripts")
        return 0
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key:
        print("OPENROUTER_API_KEY was not provided.", file=sys.stderr)
        return 2
    started_at = datetime.now(timezone.utc).isoformat()
    total = len(config["ttsModels"]) * len(config["voiceScripts"]) + len(config["sfxPrompts"]) + len(config["sttModels"]) * len(config["sttSources"])
    update_status("running", "Discovering current OpenRouter audio models", 0, total)
    catalog_response = request_json(f"{OPENROUTER_BASE}/models?output_modalities=speech")
    catalog = {entry["id"]: entry for entry in catalog_response.get("data", [])}
    results: list[dict] = []
    completed = 0
    for model in config["ttsModels"]:
        for script in config["voiceScripts"]:
            update_status("running", f"Generating {script['role']} with {model['label']}", completed, total)
            results.append(generate_tts(key, model, script, catalog))
            completed += 1
            time.sleep(0.15)
    for prompt in config["sfxPrompts"]:
        update_status("running", f"Testing SFX: {prompt['role']}", completed, total)
        results.append(generate_sfx(key, config["sfxModel"], config["sfxVoice"], prompt))
        completed += 1
    for source_spec in config["sttSources"]:
        source = resolve_stt_source(source_spec)
        for model in config["sttModels"]:
            update_status("running", f"Transcribing with {model}", completed, total)
            if source and source.exists():
                results.append(transcribe(key, model, source))
            else:
                results.append({"kind": "transcript", "model": model, "source": source_spec, "status": "error", "error": "Source file was not found"})
            completed += 1
    save_manifest(results, started_at)
    ready = sum(1 for item in results if item.get("status") == "ready")
    failed = len(results) - ready
    update_status("completed", f"Review library ready: {ready} samples, {failed} failed", completed, total)
    print(f"Audio lab complete: {ready} ready, {failed} failed")
    return 0 if ready else 1


if __name__ == "__main__":
    raise SystemExit(main())
