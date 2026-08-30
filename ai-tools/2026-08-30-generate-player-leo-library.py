"""Generate the capped canonical LEO player voice library through OpenRouter."""

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
SOURCE_PATH = ROOT / "values/playerVoiceCharacterLeoV1.json"
LIBRARY_DIR = ROOT / "sound/voice-lines/player-character-leo-v1"
OUTPUT_DIR = LIBRARY_DIR / "audio"
MANIFEST_PATH = LIBRARY_DIR / "2026-08-30-player-character-leo-v1-manifest.json"
OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/audio/speech"
MAX_REQUESTS = 120
MAX_TOTAL_CHARACTERS = 20_000
MIN_CLIP_CHARACTERS = 45
MAX_CLIP_CHARACTERS = 240
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


def resolve_workspace_path(relative_path: str) -> Path:
    candidate = (ROOT / relative_path).resolve()
    try:
        candidate.relative_to(ROOT.resolve())
    except ValueError as error:
        raise RuntimeError("reuseFrom must stay inside the workspace.") from error
    return candidate


def load_and_validate_source() -> tuple[dict, int, int, Decimal]:
    source = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    clips = source.get("clips", [])
    families = source.get("families", [])
    family_ids = [family.get("id") for family in families]
    clip_ids = [clip.get("id") for clip in clips]
    files = [clip.get("file") for clip in clips]
    if source.get("voice") != "leo":
        raise RuntimeError("The canonical player catalog must use LEO only.")
    if source.get("runtime", {}).get("legacyPlayerRandomEnabled") is not False:
        raise RuntimeError("Legacy random player speech must remain disabled.")
    if not clips or len(clips) > MAX_REQUESTS:
        raise RuntimeError(f"Library must contain 1-{MAX_REQUESTS} clips.")
    if len(family_ids) != len(set(family_ids)) or None in family_ids:
        raise RuntimeError("Family IDs must be present and unique.")
    if len(clip_ids) != len(set(clip_ids)) or None in clip_ids:
        raise RuntimeError("Clip IDs must be present and unique.")
    if len(files) != len(set(files)) or any(not FILE_PATTERN.fullmatch(str(item)) for item in files):
        raise RuntimeError("Clip files must be unique lowercase kebab-case MP3 names.")
    family_counts = {family_id: 0 for family_id in family_ids}
    for clip in clips:
        text = str(clip.get("text", "")).strip()
        family_id = clip.get("family")
        if family_id not in family_counts:
            raise RuntimeError(f"Unknown family for {clip.get('id')}.")
        family_counts[family_id] += 1
        if not MIN_CLIP_CHARACTERS <= len(text) <= MAX_CLIP_CHARACTERS:
            raise RuntimeError(f"Clip {clip.get('id')} has an invalid text length.")
        if not isinstance(clip.get("tags"), list) or not clip["tags"]:
            raise RuntimeError(f"Clip {clip.get('id')} requires context tags.")
        reuse_from = clip.get("reuseFrom")
        if reuse_from and not resolve_workspace_path(str(reuse_from)).is_file():
            raise RuntimeError(f"Approved reuse source is missing for {clip.get('id')}.")
    if any(count < 4 for count in family_counts.values()):
        raise RuntimeError("Every family requires at least four authored variants.")
    total_characters = sum(len(str(clip["text"])) for clip in clips)
    provider_characters = sum(
        len(str(clip["text"])) for clip in clips if not clip.get("reuseFrom")
    )
    if total_characters > MAX_TOTAL_CHARACTERS:
        raise RuntimeError("Library exceeds the total character ceiling.")
    price = Decimal(str(source["priceUsdPerMillionCharacters"]))
    estimate = estimated_cost_usd(provider_characters, price)
    if estimate > Decimal(str(source["localBatchCapUsd"])):
        raise RuntimeError("Planned library exceeds its local USD cap.")
    return source, total_characters, provider_characters, estimate


def clip_source_hash(source: dict, clip: dict) -> str:
    return sha256_bytes(canonical_json({
        "model": source["model"],
        "responseFormat": source["responseFormat"],
        "voice": source["voice"],
        "clip": clip,
    }))


def request_audio(key: str, source: dict, clip: dict) -> tuple[bytes, str, str | None]:
    request = urllib.request.Request(
        OPENROUTER_ENDPOINT,
        data=json.dumps({
            "model": source["model"],
            "input": clip["text"],
            "voice": source["voice"],
            "response_format": source["responseFormat"],
        }).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
            "HTTP-Referer": "https://localhost/understar-player-character-leo-v1",
            "X-Title": "UNDERSTAR Player Character LEO V1",
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


def write_manifest(source: dict, digest: str, clips: list[dict], run: dict) -> None:
    provider_characters = sum(
        int(item["characters"])
        for item in clips
        if item.get("generationSource") == "openrouter"
    )
    price = Decimal(str(source["priceUsdPerMillionCharacters"]))
    manifest = {
        "schemaVersion": 1,
        "reviewStatus": source["reviewStatus"],
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "model": source["model"],
        "voice": source["voice"],
        "sourceCatalog": str(SOURCE_PATH.relative_to(ROOT)).replace("\\", "/"),
        "sourceCatalogSha256": digest,
        "plannedRequests": len(source["clips"]),
        "completedRequests": len(clips),
        "completed": len(clips) == len(source["clips"]),
        "charactersAuthored": sum(len(item["text"]) for item in source["clips"]),
        "providerCharactersGenerated": provider_characters,
        "estimatedProviderCostUsd": float(estimated_cost_usd(provider_characters, price)),
        "localBatchCapUsd": source["localBatchCapUsd"],
        "userMaximumSpendEur": source["userMaximumSpendEur"],
        "apiKeyStored": False,
        "thisRun": run,
        "clips": clips,
    }
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = MANIFEST_PATH.with_suffix(".json.tmp")
    temporary_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    temporary_path.replace(MANIFEST_PATH)


def valid_existing_clip(existing: dict, expected_source_hash: str) -> bool:
    path = OUTPUT_DIR / str(existing.get("file", ""))
    if existing.get("sourceSha256") != expected_source_hash or not path.exists():
        return False
    return sha256_bytes(path.read_bytes()) == existing.get("sha256")


def completed_record(clip: dict, payload: bytes, source_hash: str, **extra: object) -> dict:
    return {
        **clip,
        "characters": len(clip["text"]),
        "sourceSha256": source_hash,
        "bytes": len(payload),
        "sha256": sha256_bytes(payload),
        "contentType": "audio/mpeg",
        **extra,
    }


def generate_library(source: dict, planned_estimate: Decimal, force: bool) -> int:
    digest = sha256_bytes(canonical_json(source))
    existing_manifest = read_existing_manifest()
    if existing_manifest and existing_manifest.get("sourceCatalogSha256") != digest and not force:
        print("Source catalog changed; review it and use --force intentionally.", file=sys.stderr)
        return 3
    existing_by_id = {item["id"]: item for item in existing_manifest.get("clips", [])}
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key and any(not clip.get("reuseFrom") for clip in source["clips"]):
        print("OPENROUTER_API_KEY was not provided.", file=sys.stderr)
        return 2
    completed: list[dict] = []
    run = {"attempted": 0, "generated": 0, "reusedExisting": 0, "reusedApproved": 0, "failed": 0}
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for index, clip in enumerate(source["clips"], start=1):
        expected_hash = clip_source_hash(source, clip)
        existing = existing_by_id.get(clip["id"])
        if not force and existing and valid_existing_clip(existing, expected_hash):
            completed.append(existing)
            run["reusedExisting"] += 1
            print(f"[{index:03}/{len(source['clips'])}] reuse {clip['id']}")
            continue
        reuse_from = clip.get("reuseFrom")
        if reuse_from:
            payload = resolve_workspace_path(str(reuse_from)).read_bytes()
            (OUTPUT_DIR / clip["file"]).write_bytes(payload)
            completed.append(completed_record(
                clip,
                payload,
                expected_hash,
                generationSource="approved-local-reuse",
                generationId=None,
            ))
            run["reusedApproved"] += 1
            write_manifest(source, digest, completed, run)
            print(f"[{index:03}/{len(source['clips'])}] preserve approved {clip['id']}")
            continue
        print(f"[{index:03}/{len(source['clips'])}] generate {clip['id']} (leo)")
        run["attempted"] += 1
        try:
            payload, content_type, generation_id = request_audio(key, source, clip)
        except Exception as error:
            run["failed"] += 1
            write_manifest(source, digest, completed, run)
            print(f"Generation stopped: {safe_error(error)}", file=sys.stderr)
            return 1
        (OUTPUT_DIR / clip["file"]).write_bytes(payload)
        record = completed_record(
            clip,
            payload,
            expected_hash,
            generationSource="openrouter",
            generationId=generation_id,
        )
        record["contentType"] = content_type
        completed.append(record)
        run["generated"] += 1
        write_manifest(source, digest, completed, run)
        time.sleep(0.35)
    print(
        f"LEO library ready: {len(completed)} clips; provider estimate "
        f"${planned_estimate:.6f} USD; key not stored."
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    try:
        source, total_characters, provider_characters, estimate = load_and_validate_source()
    except Exception as error:
        print(f"Library validation failed: {safe_error(error)}", file=sys.stderr)
        return 4
    print(
        f"Validated {len(source['clips'])} LEO clips across {len(source['families'])} families, "
        f"{total_characters} authored characters ({provider_characters} provider characters), "
        f"estimated ${estimate:.6f} USD under a "
        f"${Decimal(str(source['localBatchCapUsd'])):.2f} local cap."
    )
    if args.validate_only:
        return 0
    return generate_library(source, estimate, args.force)


if __name__ == "__main__":
    raise SystemExit(main())
