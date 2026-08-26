"""Generate bounded ElevenLabs narration and optional SFX for UNDERSTAR media."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from elevenLabsPromoApi import ElevenLabsPromoClient, ElevenLabsPromoError


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PLAN_PATH = ROOT / "steam-marketing/2026-08-26-elevenlabs-promo-shorts-v1/request-plan.json"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def safe_path(relative_path: str) -> Path:
    candidate = (ROOT / relative_path).resolve()
    try:
        candidate.relative_to(ROOT.resolve())
    except ValueError:
        raise ValueError(f"Configured path escapes workspace: {relative_path}") from None
    return candidate


def write_json(path: Path, payload: object) -> None:
    temporary = path.with_suffix(path.suffix + ".partial")
    temporary.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    temporary.replace(path)


def save_audio(path: Path, audio: bytes) -> None:
    temporary = path.with_suffix(path.suffix + ".partial")
    temporary.write_bytes(audio)
    temporary.replace(path)


def reconcile(path: Path, job: dict) -> dict | None:
    if not path.exists():
        return None
    return {
        **job,
        "status": "ready",
        "bytes": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }


def compile_jobs(plan: dict) -> list[dict]:
    if "narrations" in plan:
        voice = plan.get("voice", {})
        return [
            {
                "jobKey": f"{item['id']}:narration",
                "kind": "narration",
                "file": item["file"],
                "voiceId": item["voiceId"] if "voiceId" in item else voice["voiceId"],
                "voiceName": item["voiceName"] if "voiceName" in item else voice["voiceName"],
                "text": item["text"],
                "settings": item["settings"] if "settings" in item else voice["settings"],
            }
            for item in plan["narrations"]
        ]
    if "shorts" not in plan:
        raise ValueError("Plan requires either narrations or shorts")
    jobs = []
    for short in plan["shorts"]:
        jobs.append({
            "jobKey": f"{short['id']}:narration",
            "kind": "narration",
            "file": short["audio"]["narrationFile"],
            "voiceId": short["narration"]["voiceId"],
            "voiceName": short["narration"]["voiceName"],
            "text": short["narration"]["text"],
            "settings": short["narration"]["settings"],
        })
        if short["audio"].get("sfxFile"):
            jobs.append({
                "jobKey": f"{short['id']}:sfx",
                "kind": "sfx",
                "file": short["audio"]["sfxFile"],
                "durationSeconds": short["durationSeconds"],
                "prompt": short["sfxPrompt"],
            })
    return jobs


def audio_target(audio_dir: Path, filename: str) -> Path:
    target = (audio_dir / filename).resolve()
    try:
        target.relative_to(audio_dir.resolve())
    except ValueError:
        raise ValueError(f"Configured audio path escapes package: {filename}") from None
    return target


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", type=Path, default=DEFAULT_PLAN_PATH, help="Request plan inside this workspace")
    parser.add_argument("--execute", action="store_true", help="Perform paid API requests")
    parser.add_argument("--max-requests", type=int, help="Hard request ceiling")
    parser.add_argument("--max-sfx-seconds", type=float, help="Hard SFX duration ceiling")
    parser.add_argument("--max-tts-characters", type=int, help="Hard narration character ceiling")
    args = parser.parse_args()
    try:
        plan_path = args.plan if args.plan.is_absolute() else ROOT / args.plan
        plan_path = plan_path.resolve()
        plan_path.relative_to(ROOT.resolve())
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
        if plan.get("schemaVersion") != 1:
            raise ValueError("Unsupported UNDERSTAR audio plan schema")
        package = safe_path(plan["outputRoot"])
        audio_dir = (package / plan.get("audioDir", "audio")).resolve()
        try:
            audio_dir.relative_to(package.resolve())
        except ValueError:
            raise ValueError("Configured audio directory escapes package") from None
        jobs = compile_jobs(plan)
        pending_jobs = [job for job in jobs if not audio_target(audio_dir, job["file"]).exists()]
        requests = len(pending_jobs)
        sfx_seconds = sum(
            job["durationSeconds"]
            for job in pending_jobs
            if job["kind"] == "sfx"
        )
        tts_characters = sum(
            len(job["text"])
            for job in pending_jobs
            if job["kind"] == "narration"
        )
        print(
            f"Plan: {len(jobs)} audio jobs, {requests} pending requests, "
            f"{tts_characters} TTS characters, {sfx_seconds:g} SFX seconds"
        )
        for job in jobs:
            detail = job["voiceName"] if job["kind"] == "narration" else f"{job['durationSeconds']:g}s SFX"
            print(f"  {job['jobKey']}: {detail} -> {job['file']}")
        if not args.execute:
            print("Dry run only. Add --execute with all three ceilings.")
            return 0
        if args.max_requests is None or args.max_requests < requests:
            raise ValueError(f"--max-requests must be at least {requests}")
        if args.max_sfx_seconds is None or args.max_sfx_seconds < sfx_seconds:
            raise ValueError(f"--max-sfx-seconds must be at least {sfx_seconds:g}")
        if args.max_tts_characters is None or args.max_tts_characters < tts_characters:
            raise ValueError(f"--max-tts-characters must be at least {tts_characters}")
        api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
        if not api_key:
            raise ValueError("ELEVENLABS_API_KEY is not set")
        audio_dir.mkdir(parents=True, exist_ok=True)
        manifest_path = package / plan.get("audioManifestFile", "audio-generation-manifest.json")
        manifest = (
            json.loads(manifest_path.read_text(encoding="utf-8"))
            if manifest_path.exists()
            else {
                "schemaVersion": 1,
                "provider": "ElevenLabs",
                "reviewOnly": True,
                "runtimeWired": False,
                "createdAt": utc_now(),
                "results": {},
            }
        )
        client = ElevenLabsPromoClient(api_key)
        total_jobs = len(jobs)
        ready = failed = generated = reused = processed = consecutive_failures = 0
        for job in jobs:
            target = audio_target(audio_dir, job["file"])
            existing = reconcile(target, job)
            if existing:
                manifest["results"][job["jobKey"]] = existing
                ready += 1
                reused += 1
                processed += 1
                manifest["updatedAt"] = utc_now()
                write_json(manifest_path, manifest)
                print(f"[{processed}/{total_jobs}] {job['jobKey']}: reused", flush=True)
                continue
            try:
                if job["kind"] == "narration":
                    result = client.narration(
                        plan["tts"]["endpointTemplate"],
                        job["voiceId"],
                        plan["tts"]["outputFormat"],
                        {
                            "text": job["text"],
                            "model_id": plan["tts"]["modelId"],
                            "voice_settings": job["settings"],
                        },
                    )
                else:
                    result = client.sound_effect(
                        plan["sfx"]["endpoint"],
                        plan["sfx"]["outputFormat"],
                        {
                            "text": job["prompt"],
                            "duration_seconds": job["durationSeconds"],
                            "prompt_influence": plan["sfx"]["promptInfluence"],
                            "loop": False,
                            "model_id": plan["sfx"]["modelId"],
                        },
                    )
                save_audio(target, result.audio)
                manifest["results"][job["jobKey"]] = {
                    **job,
                    "status": "ready",
                    "bytes": len(result.audio),
                    "sha256": hashlib.sha256(result.audio).hexdigest(),
                    "contentType": result.content_type,
                    "reportedCost": result.reported_cost,
                    "requestId": result.request_id,
                    "completedAt": utc_now(),
                }
                ready += 1
                generated += 1
                consecutive_failures = 0
            except (ElevenLabsPromoError, OSError, ValueError) as error:
                manifest["results"][job["jobKey"]] = {
                    **job,
                    "status": "error",
                    "lastError": str(error),
                    "failedAt": utc_now(),
                }
                failed += 1
                consecutive_failures += 1
            processed += 1
            manifest["updatedAt"] = utc_now()
            write_json(manifest_path, manifest)
            status = manifest["results"][job["jobKey"]]["status"]
            print(f"[{processed}/{total_jobs}] {job['jobKey']}: {status}", flush=True)
            if consecutive_failures >= 2:
                print("Stopped after two consecutive provider failures.", flush=True)
                return 1
        print(
            f"Promo audio complete: {ready} ready "
            f"({generated} generated, {reused} reused), {failed} failed"
        )
        return 1 if failed else 0
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Promo audio error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
