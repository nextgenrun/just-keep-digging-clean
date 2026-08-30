"""Generate the capped Grok V2 event-voice audition library."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LIBRARY_DIR = ROOT / "sound/voice-lines/event-driven-grok-v2"
SOURCE_PATH = LIBRARY_DIR / "2026-08-30-event-voice-library-v2-source.json"
OUTPUT_DIR = LIBRARY_DIR / "audio"
MANIFEST_PATH = LIBRARY_DIR / "2026-08-30-event-voice-library-v2-manifest.json"
OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/audio/speech"
MAX_REQUESTS = 50
MAX_TOTAL_CHARACTERS = 10_000
MIN_CLIP_CHARACTERS = 60
MAX_CLIP_CHARACTERS = 400
RETRYABLE_HTTP_CODES = frozenset({429, 500, 502, 503, 504})
RETRY_DELAYS_SECONDS = (1, 2, 4)
FILE_PATTERN = re.compile(r"^[a-z0-9-]+\.mp3$")


def canonical_json(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest().upper()


def estimated_cost_usd(characters: int, price: Decimal) -> Decimal:
    return Decimal(characters) * price / Decimal(1_000_000)


def safe_error(error: Exception) -> str:
    message = str(error)
    if isinstance(error, urllib.error.HTTPError):
        try:
            body = error.read().decode("utf-8", errors="replace")
            parsed = json.loads(body)
            message = parsed.get("error", {}).get("message") or parsed.get("message") or body
        except Exception:
            message = str(error.reason)
        message = f"HTTP {error.code}: {message}"
    return re.sub(r"sk-or-v1-[A-Za-z0-9_-]+", "[REDACTED]", message)[:500]


def load_and_validate_source() -> tuple[dict, int, Decimal]:
    source = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    clips = source.get("clips", [])
    families = source.get("families", [])
    voices = set(source.get("voices", []))
    family_ids = [family.get("id") for family in families]
    clip_ids = [clip.get("id") for clip in clips]
    files = [clip.get("file") for clip in clips]
    if source.get("reviewOnly") is not True:
        raise RuntimeError("The V2 library must remain review-only.")
    if not clips or len(clips) > MAX_REQUESTS:
        raise RuntimeError(f"Library must contain 1-{MAX_REQUESTS} clips.")
    if len(family_ids) != len(set(family_ids)) or None in family_ids:
        raise RuntimeError("Family IDs must be present and unique.")
    if len(clip_ids) != len(set(clip_ids)) or None in clip_ids:
        raise RuntimeError("Clip IDs must be present and unique.")
    if len(files) != len(set(files)) or any(not FILE_PATTERN.fullmatch(str(item)) for item in files):
        raise RuntimeError("Clip files must be unique lowercase kebab-case MP3 names.")
    for clip in clips:
        text = str(clip.get("text", "")).strip()
        if clip.get("family") not in family_ids:
            raise RuntimeError(f"Unknown family for {clip.get('id')}.")
        if clip.get("voice") not in voices:
            raise RuntimeError(f"Unknown voice for {clip.get('id')}.")
        if not MIN_CLIP_CHARACTERS <= len(text) <= MAX_CLIP_CHARACTERS:
            raise RuntimeError(f"Clip {clip.get('id')} has an invalid text length.")
    total_characters = sum(len(str(clip["text"])) for clip in clips)
    if total_characters > MAX_TOTAL_CHARACTERS:
        raise RuntimeError("Library exceeds the total character ceiling.")
    price = Decimal(str(source["priceUsdPerMillionCharacters"]))
    estimate = estimated_cost_usd(total_characters, price)
    if estimate > Decimal(str(source["localBatchCapUsd"])):
        raise RuntimeError("Planned library exceeds its local USD cap.")
    return source, total_characters, estimate


def clip_source_hash(source: dict, clip: dict) -> str:
    return sha256_bytes(canonical_json({
        "model": source["model"],
        "responseFormat": source["responseFormat"],
        "clip": clip,
    }))


def request_audio(key: str, source: dict, clip: dict) -> tuple[bytes, str, str | None]:
    payload = {
        "model": source["model"],
        "input": clip["text"],
        "voice": clip["voice"],
        "response_format": source["responseFormat"],
    }
    request = urllib.request.Request(
        OPENROUTER_ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
            "HTTP-Referer": "https://localhost/understar-event-voice-library-v2",
            "X-Title": "UNDERSTAR Event Voice Library V2",
        },
    )
    for attempt, delay in enumerate(RETRY_DELAYS_SECONDS, start=1):
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                audio = response.read()
                content_type = response.headers.get("Content-Type", "audio/mpeg")
                generation_id = response.headers.get("X-Generation-Id")
                if len(audio) < 1024 or "json" in content_type.lower():
                    raise RuntimeError("Provider returned an invalid audio payload.")
                return audio, content_type, generation_id
        except urllib.error.HTTPError as error:
            if error.code not in RETRYABLE_HTTP_CODES or attempt == len(RETRY_DELAYS_SECONDS):
                raise
            print(f"  Provider returned HTTP {error.code}; retrying in {delay}s.")
            time.sleep(delay)
    raise RuntimeError("Audio request exhausted retries.")


def read_existing_manifest() -> dict:
    if not MANIFEST_PATH.exists():
        return {}
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def write_manifest(source: dict, source_hash: str, clips: list[dict], run: dict) -> None:
    completed_characters = sum(int(item["characters"]) for item in clips)
    price = Decimal(str(source["priceUsdPerMillionCharacters"]))
    manifest = {
        "schemaVersion": 2,
        "reviewOnly": True,
        "reviewStatus": "candidate",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "model": source["model"],
        "sourceCatalog": SOURCE_PATH.name,
        "sourceCatalogSha256": source_hash,
        "plannedRequests": len(source["clips"]),
        "completedRequests": len(clips),
        "completed": len(clips) == len(source["clips"]),
        "charactersGenerated": completed_characters,
        "estimatedGeneratedCostUsd": float(estimated_cost_usd(completed_characters, price)),
        "localBatchCapUsd": source["localBatchCapUsd"],
        "userMaximumSpendEur": source["userMaximumSpendEur"],
        "apiKeyStored": False,
        "thisRun": run,
        "clips": clips,
    }
    temporary_path = MANIFEST_PATH.with_suffix(".json.tmp")
    temporary_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    temporary_path.replace(MANIFEST_PATH)


def valid_existing_clip(existing: dict, expected_source_hash: str) -> bool:
    path = OUTPUT_DIR / str(existing.get("file", ""))
    if existing.get("sourceSha256") != expected_source_hash or not path.exists():
        return False
    return sha256_bytes(path.read_bytes()) == existing.get("sha256")


def generate_library(source: dict, planned_estimate: Decimal, force: bool) -> int:
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key:
        print("OPENROUTER_API_KEY was not provided.", file=sys.stderr)
        return 2
    source_hash = sha256_bytes(canonical_json(source))
    existing_manifest = read_existing_manifest()
    if existing_manifest and existing_manifest.get("sourceCatalogSha256") != source_hash and not force:
        print("Source catalog changed; review it and use --force intentionally.", file=sys.stderr)
        return 3
    existing_by_id = {item["id"]: item for item in existing_manifest.get("clips", [])}
    completed: list[dict] = []
    run = {"attempted": 0, "generated": 0, "reused": 0, "failed": 0}
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for index, clip in enumerate(source["clips"], start=1):
        source_clip_hash = clip_source_hash(source, clip)
        existing = existing_by_id.get(clip["id"])
        if not force and existing and valid_existing_clip(existing, source_clip_hash):
            completed.append(existing)
            run["reused"] += 1
            print(f"[{index:02}/{len(source['clips'])}] reuse {clip['id']}")
            continue
        print(f"[{index:02}/{len(source['clips'])}] generate {clip['id']} ({clip['voice']})")
        run["attempted"] += 1
        try:
            audio, content_type, generation_id = request_audio(key, source, clip)
        except Exception as error:
            run["failed"] += 1
            write_manifest(source, source_hash, completed, run)
            print(f"Generation stopped: {safe_error(error)}", file=sys.stderr)
            return 1
        output_path = OUTPUT_DIR / clip["file"]
        output_path.write_bytes(audio)
        completed.append({
            **clip,
            "characters": len(clip["text"]),
            "sourceSha256": source_clip_hash,
            "bytes": len(audio),
            "sha256": sha256_bytes(audio),
            "contentType": content_type,
            "generationId": generation_id,
        })
        run["generated"] += 1
        write_manifest(source, source_hash, completed, run)
        time.sleep(0.35)
    print(
        f"Library ready: {len(completed)} clips; planned estimate "
        f"${planned_estimate:.6f} USD; key not stored."
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    try:
        source, total_characters, estimate = load_and_validate_source()
    except Exception as error:
        print(f"Library validation failed: {safe_error(error)}", file=sys.stderr)
        return 4
    print(
        f"Validated {len(source['clips'])} clips across {len(source['families'])} families, "
        f"{total_characters} characters, estimated ${estimate:.6f} USD "
        f"under a ${Decimal(str(source['localBatchCapUsd'])):.2f} local cap."
    )
    if args.validate_only:
        return 0
    return generate_library(source, estimate, args.force)


if __name__ == "__main__":
    raise SystemExit(main())
