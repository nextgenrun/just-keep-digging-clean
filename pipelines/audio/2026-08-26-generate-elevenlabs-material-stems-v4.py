"""Prepare or execute the bounded ElevenLabs V4 material-stem anti-glass pilot."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from elevenLabsAudioQc import flag_cross_family_similarity, inspect_audio
from elevenLabsPromptContrastReviewPage import write_prompt_contrast_review_page
from elevenLabsSoundApi import ElevenLabsSoundClient, ElevenLabsSoundError


ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = Path(__file__).with_name("2026-08-26-elevenlabs-material-stems-v4.json")
BATCH_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]{1,79}$")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".partial")
    temporary.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    temporary.replace(path)


def workspace_path(relative_path: str) -> Path:
    candidate = (ROOT / relative_path).resolve()
    try:
        candidate.relative_to(ROOT.resolve())
    except ValueError:
        raise ValueError(f"Configured path escapes the workspace: {relative_path}") from None
    return candidate


def csv_set(value: str | None) -> set[str] | None:
    return {part.strip() for part in value.split(",") if part.strip()} if value else None


def load_config() -> dict:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    if config.get("schemaVersion") != 1 or not config.get("assets"):
        raise ValueError("Unsupported or empty V4 material-stem config")
    if config.get("modelId") != "eleven_text_to_sound_v2":
        raise ValueError("V4 requires ElevenLabs Sound Effects V2")
    return config


def validate_prompt(prompt: str, lint: dict, job_key: str) -> None:
    if len(prompt) > lint["maxCharacters"]:
        raise ValueError(f"Prompt exceeds {lint['maxCharacters']} characters: {job_key}")
    found = [
        term for term in lint["forbiddenTerms"]
        if re.search(rf"\b{re.escape(term)}\b", prompt, flags=re.IGNORECASE)
    ]
    if found:
        raise ValueError(f"Forbidden prompt terms in {job_key}: {', '.join(found)}")


def build_jobs(config: dict, selected_ids: set[str] | None,
               selected_stems: set[str] | None, selected_takes: set[str] | None) -> list[dict]:
    profiles = {profile["id"]: profile for profile in config["takeProfiles"]}
    jobs = []
    for asset in config["assets"]:
        if selected_ids and asset["id"] not in selected_ids:
            continue
        take_ids = asset.get("takeProfileIds", list(profiles))
        for stem in asset["stems"]:
            if selected_stems and stem["id"] not in selected_stems:
                continue
            for take_id in take_ids:
                if selected_takes and take_id not in selected_takes:
                    continue
                take = profiles.get(take_id)
                if not take:
                    raise ValueError(f"Unknown take profile: {take_id}")
                key = f"{asset['id']}:{stem['id']}:{take_id}"
                validate_prompt(stem["prompt"], config["promptLint"], key)
                filename = (
                    f"{asset['id']}_{asset['name']}__{stem['id']}__{take_id}__"
                    f"UNTESTED.{config['outputExtension']}"
                )
                jobs.append({
                    "jobKey": key,
                    "assetId": asset["id"],
                    "assetName": asset["name"],
                    "assetType": asset["type"],
                    "variant": f"{stem['id']}:{take_id}",
                    "title": f"{stem['title']} · {take['title']}",
                    "durationSeconds": stem["durationSeconds"],
                    "loop": asset["type"] == "Loop",
                    "promptInfluence": take["promptInfluence"],
                    "qcProfile": stem["qcProfile"],
                    "prompt": stem["prompt"],
                    "file": filename,
                })
    if not jobs:
        raise ValueError("No V4 jobs matched the requested filters")
    return jobs


def load_manifest(path: Path, config: dict) -> dict:
    if path.exists():
        manifest = json.loads(path.read_text(encoding="utf-8"))
        if manifest.get("modelId") != config["modelId"]:
            raise ValueError("Existing V4 manifest uses a different model")
        return manifest
    return {
        "schemaVersion": 1,
        "provider": config["provider"],
        "modelId": config["modelId"],
        "reviewOnly": True,
        "runtimeWired": False,
        "createdAt": utc_now(),
        "results": {},
    }


def save_audio(path: Path, audio: bytes) -> None:
    temporary = path.with_suffix(path.suffix + ".partial")
    temporary.write_bytes(audio)
    temporary.replace(path)


def apply_qc(target: Path, job: dict, config: dict) -> dict:
    try:
        return inspect_audio(target, config["qcProfiles"][job["qcProfile"]])
    except Exception as error:
        return {
            "verdict": "QUARANTINE",
            "flags": [f"qc-unavailable:{type(error).__name__}"],
            "metrics": {},
        }


def refresh_review(output_dir: Path, config: dict, jobs: list[dict], manifest: dict) -> None:
    review_jobs = []
    for job in jobs:
        result = manifest["results"].get(job["jobKey"], {})
        review_jobs.append({**job, "qc": result.get("qc")})
    write_prompt_contrast_review_page(output_dir, config, review_jobs)


def generate(jobs: list[dict], output_dir: Path, config: dict,
             api_key: str | None) -> tuple[int, int, int]:
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = output_dir / "2026-08-26-elevenlabs-material-stems-v4-results.json"
    status_path = output_dir / "2026-08-26-elevenlabs-material-stems-v4-status.json"
    manifest = load_manifest(manifest_path, config)
    client = ElevenLabsSoundClient(api_key) if api_key else None
    ready = failed = consecutive_failures = 0
    for index, job in enumerate(jobs, start=1):
        target = output_dir / job["file"]
        if target.exists():
            previous = manifest["results"].get(job["jobKey"], {})
            row = {
                **previous, **job, "status": "ready", "bytes": target.stat().st_size,
                "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
            }
            consecutive_failures = 0
        else:
            if client is None:
                raise ValueError(f"Cannot recheck missing audio: {target.name}")
            try:
                result = client.generate(config["endpoint"], config["outputFormat"], {
                    "text": job["prompt"],
                    "duration_seconds": job["durationSeconds"],
                    "prompt_influence": job["promptInfluence"],
                    "loop": job["loop"],
                    "model_id": config["modelId"],
                })
                save_audio(target, result.audio)
                row = {
                    **job, "status": "ready", "bytes": len(result.audio),
                    "sha256": hashlib.sha256(result.audio).hexdigest(),
                    "contentType": result.content_type, "reportedCost": result.reported_cost,
                    "completedAt": utc_now(),
                }
                consecutive_failures = 0
            except (ElevenLabsSoundError, OSError, ValueError) as error:
                row = {**job, "status": "error", "lastError": str(error), "failedAt": utc_now()}
                failed += 1
                consecutive_failures += 1
        if row["status"] == "ready":
            row["qc"] = apply_qc(target, job, config)
            ready += 1
        manifest["results"][job["jobKey"]] = row
        manifest["updatedAt"] = utc_now()
        write_json(manifest_path, manifest)
        print(f"[{index}/{len(jobs)}] {job['jobKey']}: {row['status']}", flush=True)
        if consecutive_failures >= 3:
            print("Stopped after three consecutive API failures; rerun resumes safely.", flush=True)
            break

    rows = [manifest["results"][job["jobKey"]] for job in jobs if job["jobKey"] in manifest["results"]]
    flag_cross_family_similarity(rows, config["crossFamilySimilarityMax"])
    quarantined = sum((row.get("qc") or {}).get("verdict") == "QUARANTINE" for row in rows)
    manifest["updatedAt"] = utc_now()
    write_json(manifest_path, manifest)
    write_json(status_path, {
        "state": "completed" if ready + failed == len(jobs) else "stopped",
        "total": len(jobs), "ready": ready, "quarantined": quarantined,
        "failed": failed, "updatedAt": utc_now(),
    })
    refresh_review(output_dir, config, jobs, manifest)
    return ready, quarantined, failed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ids", help="Comma-separated asset subset")
    parser.add_argument("--stems", help="Comma-separated stem subset")
    parser.add_argument("--takes", help="Comma-separated take profiles")
    parser.add_argument("--batch", help="Safe output batch directory name")
    parser.add_argument("--execute", action="store_true", help="Perform paid API requests")
    parser.add_argument("--recheck", action="store_true", help="Re-run QC without API requests")
    parser.add_argument("--max-generations", type=int, help="Hard request ceiling")
    parser.add_argument("--max-credit-units", type=int, help="Hard estimated-credit ceiling")
    args = parser.parse_args()
    try:
        config = load_config()
        jobs = build_jobs(config, csv_set(args.ids), csv_set(args.stems), csv_set(args.takes))
        seconds = sum(job["durationSeconds"] for job in jobs)
        estimated = int(seconds * config["estimatedApiCreditsPerSecond"])
        print(f"Plan: {len(jobs)} generations, {seconds:g}s, conservative ceiling {estimated} credit units")
        for job in jobs[:10]:
            print(f"  {job['jobKey']} -> {job['file']} ({job['durationSeconds']:g}s)")
        if len(jobs) > 10:
            print(f"  ... {len(jobs) - 10} more")
        batch = args.batch or config["defaultBatch"]
        if not BATCH_PATTERN.fullmatch(batch):
            raise ValueError("Batch name is unsafe")
        output_dir = workspace_path(config["outputRoot"]) / batch
        output_dir.mkdir(parents=True, exist_ok=True)
        write_json(output_dir / "2026-08-26-elevenlabs-material-stems-v4-plan.json", {
            "schemaVersion": 1, "reviewOnly": True, "runtimeWired": False,
            "plannedJobs": len(jobs), "plannedSeconds": seconds,
            "conservativeCreditCeiling": estimated, "jobs": jobs,
        })
        if args.recheck:
            ready, quarantined, failed = generate(jobs, output_dir, config, None)
            print(f"V4 QC recheck complete: {ready} ready, {quarantined} quarantined, {failed} failed")
            return 1 if failed else 0
        if not args.execute:
            refresh_review(output_dir, config, jobs, {"results": {}})
            print("Dry run only. Add --execute with both hard ceilings to generate.")
            return 0
        if args.max_generations is None or args.max_generations < len(jobs):
            raise ValueError(f"--max-generations must be at least {len(jobs)}")
        if args.max_credit_units is None or args.max_credit_units < estimated:
            raise ValueError(f"--max-credit-units must be at least {estimated}")
        api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
        if not api_key:
            raise ValueError("ELEVENLABS_API_KEY is not set")
        ready, quarantined, failed = generate(jobs, output_dir, config, api_key)
        print(f"V4 pilot complete: {ready} ready, {quarantined} auto-quarantined, {failed} failed")
        return 1 if failed else 0
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as error:
        print(f"Pipeline error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
