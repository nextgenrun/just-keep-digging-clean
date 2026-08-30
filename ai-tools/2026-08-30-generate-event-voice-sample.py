"""Generate one budget-capped Grok TTS bark for the event-voice demo."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "sound/voice-lines/event-driven-grok-v1"
OUTPUT_PATH = OUTPUT_DIR / "earthquake-warning-rex.mp3"
MANIFEST_PATH = OUTPUT_DIR / "2026-08-30-event-voice-sample-manifest.json"
OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/audio/speech"
MODEL = "x-ai/grok-voice-tts-1.0"
VOICE = "rex"
SAMPLE_ID = "earthquake-warning"
SAMPLE_TEXT = "Move! The ceiling is coming down!"
PRICE_USD_PER_MILLION_CHARACTERS = Decimal("15")
LOCAL_REQUEST_CAP_USD = Decimal("0.01")
MAX_REQUESTS = 1
MAX_INPUT_CHARACTERS = 120


def estimated_cost_usd(text: str) -> Decimal:
    return Decimal(len(text)) * PRICE_USD_PER_MILLION_CHARACTERS / Decimal(1_000_000)


def safe_error(error: Exception) -> str:
    if isinstance(error, urllib.error.HTTPError):
        try:
            body = error.read().decode("utf-8", errors="replace")
            parsed = json.loads(body)
            message = parsed.get("error", {}).get("message") or parsed.get("message") or body
        except Exception:
            message = str(error.reason)
        return f"HTTP {error.code}: {message[:300]}"
    return re.sub(r"sk-or-v1-[A-Za-z0-9_-]+", "[REDACTED]", str(error))[:300]


def validate_budget() -> Decimal:
    if MAX_REQUESTS != 1:
        raise RuntimeError("This pilot must remain a one-request batch.")
    if len(SAMPLE_TEXT) > MAX_INPUT_CHARACTERS:
        raise RuntimeError("Sample text exceeds the local character cap.")
    estimate = estimated_cost_usd(SAMPLE_TEXT)
    if estimate > LOCAL_REQUEST_CAP_USD:
        raise RuntimeError("Estimated sample cost exceeds the local request cap.")
    return estimate


def generate(key: str) -> tuple[bytes, str, str | None]:
    payload = {
        "model": MODEL,
        "input": SAMPLE_TEXT,
        "voice": VOICE,
        "response_format": "mp3",
    }
    request = urllib.request.Request(
        OPENROUTER_ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
            "HTTP-Referer": "https://localhost/understar-event-voice-demo",
            "X-Title": "UNDERSTAR Event Voice Demo",
        },
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return (
            response.read(),
            response.headers.get("Content-Type", "audio/mpeg"),
            response.headers.get("X-Generation-Id"),
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    estimate = validate_budget()
    if args.validate_only:
        print(
            f"Validated one request, {len(SAMPLE_TEXT)} characters, "
            f"estimated ${estimate:.6f} USD."
        )
        return 0

    if OUTPUT_PATH.exists() and not args.force:
        print(f"Sample already exists: {OUTPUT_PATH}", file=sys.stderr)
        return 3

    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key:
        print("OPENROUTER_API_KEY was not provided.", file=sys.stderr)
        return 2

    try:
        audio, content_type, generation_id = generate(key)
    except Exception as error:
        print(f"Generation failed: {safe_error(error)}", file=sys.stderr)
        return 1

    if not audio:
        print("Generation returned an empty audio response.", file=sys.stderr)
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_bytes(audio)
    manifest = {
        "schemaVersion": 1,
        "reviewOnly": True,
        "runtimeQueryGate": "eventVoices=1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sampleId": SAMPLE_ID,
        "model": MODEL,
        "voice": VOICE,
        "text": SAMPLE_TEXT,
        "characters": len(SAMPLE_TEXT),
        "requests": 1,
        "userMaximumSpendEur": 5,
        "localRequestCapUsd": float(LOCAL_REQUEST_CAP_USD),
        "estimatedCostUsd": float(estimate),
        "contentType": content_type,
        "generationId": generation_id,
        "file": OUTPUT_PATH.name,
        "bytes": len(audio),
        "sha256": hashlib.sha256(audio).hexdigest().upper(),
        "apiKeyStored": False,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(
        f"Generated {OUTPUT_PATH.name}: {len(audio)} bytes, "
        f"estimated ${estimate:.6f} USD."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
