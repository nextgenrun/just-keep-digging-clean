"""Plan, prepare, or generate the bounded ElevenLabs prompt contrast library."""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from elevenLabsPromptContrastReviewPage import write_prompt_contrast_review_page
from elevenLabsSoundApi import ElevenLabsSoundClient, ElevenLabsSoundError
ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = Path(__file__).with_name("2026-08-26-elevenlabs-prompt-contrast-v3.json")
ASSET_ID_PATTERN = re.compile(r"^[A-Z]{2}\d{3}$")
BATCH_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]{1,79}$")
VARIANT_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{1,49}$")
RESULTS_FILE = "2026-08-26-elevenlabs-prompt-contrast-results.json"
STATUS_FILE = "2026-08-26-elevenlabs-prompt-contrast-status.json"
PLAN_FILE = "2026-08-26-elevenlabs-prompt-contrast-plan.json"
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

def load_config() -> dict:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    if config.get("schemaVersion") != 1 or not config.get("assets"):
        raise ValueError("Unsupported or empty ElevenLabs contrast config")
    if config.get("modelId") != "eleven_text_to_sound_v2":
        raise ValueError("The contrast library requires ElevenLabs Sound Effects V2")
    return config

def csv_set(value: str | None) -> set[str] | None:
    return {part.strip() for part in value.split(",") if part.strip()} if value else None

def safe_name(value: str) -> str:
    name = re.sub(r"[^A-Za-z0-9_-]+", "-", value).strip("-_")
    if not name:
        raise ValueError("Asset name cannot be normalized")
    return name[:100]

def validate_config(config: dict) -> None:
    asset_ids: set[str] = set()
    prompts: set[str] = set()
    output_root = workspace_path(config["outputRoot"])
    for asset in config["assets"]:
        asset_id = asset.get("id", "")
        if not ASSET_ID_PATTERN.fullmatch(asset_id) or asset_id in asset_ids:
            raise ValueError(f"Invalid or duplicate asset id: {asset_id}")
        asset_ids.add(asset_id)
        if asset.get("type") not in {"One Shot", "Loop"}:
            raise ValueError(f"Unsupported asset type: {asset_id}")
        if asset.get("baselineFile"):
            baseline = (output_root / asset["baselineFile"]).resolve()
            try:
                baseline.relative_to(output_root.resolve())
            except ValueError:
                raise ValueError(f"Baseline path escapes the review inbox: {asset_id}") from None
        variant_ids: set[str] = set()
        for variant in asset.get("variants", []):
            variant_id = variant.get("id", "")
            if not VARIANT_PATTERN.fullmatch(variant_id) or variant_id in variant_ids:
                raise ValueError(f"Invalid or duplicate variant id: {asset_id}:{variant_id}")
            variant_ids.add(variant_id)
            prompt = variant.get("prompt", "").strip()
            if not prompt or len(prompt) > 450 or prompt in prompts:
                raise ValueError(f"Prompt is empty, duplicated, or over 450 characters: {asset_id}:{variant_id}")
            prompts.add(prompt)
            duration = variant.get("durationSeconds")
            influence = variant.get("promptInfluence")
            if not isinstance(duration, (int, float)) or not 0.5 <= duration <= 30:
                raise ValueError(f"Invalid duration: {asset_id}:{variant_id}")
            if not isinstance(influence, (int, float)) or not 0 <= influence <= 1:
                raise ValueError(f"Invalid prompt influence: {asset_id}:{variant_id}")
            if bool(variant.get("loop")) != (asset["type"] == "Loop"):
                raise ValueError(f"Loop flag disagrees with asset type: {asset_id}:{variant_id}")
        if not variant_ids:
            raise ValueError(f"Asset has no prompt variants: {asset_id}")

def build_jobs(config: dict, selected_ids: set[str] | None, selected_variants: set[str] | None) -> list[dict]:
    configured_ids = {asset["id"] for asset in config["assets"]}
    if selected_ids and not selected_ids.issubset(configured_ids):
        raise ValueError("--ids contains an asset not present in the contrast library")
    jobs: list[dict] = []
    for asset in config["assets"]:
        if selected_ids and asset["id"] not in selected_ids:
            continue
        for variant in asset["variants"]:
            if selected_variants and variant["id"] not in selected_variants:
                continue
            filename = (
                f'{asset["id"]}_{safe_name(asset["name"])}__{variant["id"]}__UNTESTED.'
                f'{config["outputExtension"]}'
            )
            jobs.append({
                "jobKey": f'{asset["id"]}:{variant["id"]}',
                "assetId": asset["id"],
                "assetName": asset["name"],
                "assetType": asset["type"],
                "variant": variant["id"],
                "title": variant["title"],
                "durationSeconds": variant["durationSeconds"],
                "loop": variant["loop"],
                "promptInfluence": variant["promptInfluence"],
                "prompt": variant["prompt"],
                "file": filename,
            })
    if not jobs:
        raise ValueError("No jobs matched the selected ids and variants")
    return jobs

def prepare(output_dir: Path, config: dict, jobs: list[dict]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    ready = sum((output_dir / job["file"]).exists() for job in jobs)
    write_json(output_dir / PLAN_FILE, {
        "schemaVersion": 1,
        "provider": config["provider"],
        "modelId": config["modelId"],
        "reviewOnly": True,
        "runtimeWired": False,
        "plannedJobs": len(jobs),
        "plannedSeconds": round(sum(job["durationSeconds"] for job in jobs), 6),
        "estimatedApiCreditsPerSecond": config["estimatedApiCreditsPerSecond"],
        "costBasisUrl": config["costBasisUrl"],
        "jobs": jobs,
        "preparedAt": utc_now(),
    })
    write_json(output_dir / STATUS_FILE, {
        "state": "completed" if ready == len(jobs) else "prepared",
        "ready": ready,
        "total": len(jobs),
        "updatedAt": utc_now(),
    })
    write_prompt_contrast_review_page(output_dir, config, jobs)

def load_manifest(path: Path, config: dict) -> dict:
    if path.exists():
        manifest = json.loads(path.read_text(encoding="utf-8"))
        if manifest.get("modelId") != config["modelId"]:
            raise ValueError("Existing batch manifest uses a different model")
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

def generate(output_dir: Path, config: dict, jobs: list[dict], api_key: str) -> tuple[int, int]:
    manifest_path = output_dir / RESULTS_FILE
    status_path = output_dir / STATUS_FILE
    manifest = load_manifest(manifest_path, config)
    client = ElevenLabsSoundClient(api_key)
    ready = failed = consecutive_failures = 0
    completed = 0
    for index, job in enumerate(jobs, start=1):
        target = output_dir / job["file"]
        result_row = {**job}
        if target.exists():
            result_row.update({
                "status": "ready",
                "bytes": target.stat().st_size,
                "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
            })
            ready += 1
            consecutive_failures = 0
        else:
            try:
                result = client.generate(config["endpoint"], config["outputFormat"], {
                    "text": job["prompt"],
                    "duration_seconds": job["durationSeconds"],
                    "prompt_influence": job["promptInfluence"],
                    "loop": job["loop"],
                    "model_id": config["modelId"],
                })
                save_audio(target, result.audio)
                result_row.update({
                    "status": "ready",
                    "bytes": len(result.audio),
                    "sha256": hashlib.sha256(result.audio).hexdigest(),
                    "contentType": result.content_type,
                    "reportedCost": result.reported_cost,
                    "completedAt": utc_now(),
                })
                ready += 1
                consecutive_failures = 0
            except (ElevenLabsSoundError, OSError, ValueError) as error:
                result_row.update({"status": "error", "lastError": str(error), "failedAt": utc_now()})
                failed += 1
                consecutive_failures += 1
        manifest["results"][job["jobKey"]] = result_row
        manifest["updatedAt"] = utc_now()
        completed = index
        write_json(manifest_path, manifest)
        write_json(status_path, {
            "state": "running",
            "completed": completed,
            "total": len(jobs),
            "ready": ready,
            "failed": failed,
            "updatedAt": utc_now(),
        })
        print(f'[{index}/{len(jobs)}] {job["jobKey"]}: {result_row["status"]}', flush=True)
        if consecutive_failures >= 3:
            print("Stopped after three consecutive API failures; rerun resumes existing files.", flush=True)
            break
    state = "completed" if completed == len(jobs) else "stopped"
    write_json(status_path, {
        "state": state,
        "completed": completed,
        "total": len(jobs),
        "ready": ready,
        "failed": failed,
        "updatedAt": utc_now(),
    })
    write_prompt_contrast_review_page(output_dir, config, jobs)
    return ready, failed

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ids", help="Comma-separated asset subset")
    parser.add_argument("--variants", help="Comma-separated prompt-variant subset")
    parser.add_argument("--batch", help="Safe output batch directory name")
    parser.add_argument("--show-prompts", action="store_true", help="Print every full prompt")
    parser.add_argument("--prepare", action="store_true", help="Write the plan and comparison page without API calls")
    parser.add_argument("--execute", action="store_true", help="Perform paid API requests")
    parser.add_argument("--max-generations", type=int, help="Hard pending-request ceiling required with --execute")
    parser.add_argument("--max-credit-units", type=int, help="Conservative pending-credit ceiling required with --execute")
    args = parser.parse_args()
    try:
        config = load_config()
        validate_config(config)
        jobs = build_jobs(config, csv_set(args.ids), csv_set(args.variants))
        batch = args.batch or config["defaultBatch"]
        if not BATCH_PATTERN.fullmatch(batch):
            raise ValueError("Batch must use lowercase letters, numbers, dot, underscore, or hyphen")
        output_dir = workspace_path(config["outputRoot"]) / batch
        pending = [job for job in jobs if not (output_dir / job["file"]).exists()]
        seconds = sum(job["durationSeconds"] for job in jobs)
        pending_seconds = sum(job["durationSeconds"] for job in pending)
        estimated_credits = math.ceil(
            round(pending_seconds, 6) * config["estimatedApiCreditsPerSecond"]
        )
        print(
            f"Plan: {len(jobs)} candidates, {seconds:g}s total; "
            f"{len(pending)} pending, {pending_seconds:g}s, <= {estimated_credits} estimated credit units"
        )
        for job in jobs:
            print(f'  {job["jobKey"]} -> {job["file"]} ({job["durationSeconds"]:g}s)')
            if args.show_prompts:
                print(f'    {job["prompt"]}')
        if not args.execute:
            if args.prepare:
                prepare(output_dir, config, jobs)
                print(f"Prepared review lab: {output_dir.relative_to(ROOT)}")
            print("No API calls made. Add --execute with both hard ceilings to generate audio.")
            return 0
        if not pending:
            prepare(output_dir, config, jobs)
            print("All selected candidates already exist; no API calls were needed.")
            return 0
        if args.max_generations is None or args.max_generations < len(pending):
            raise ValueError(f"--max-generations must be at least {len(pending)}")
        if args.max_credit_units is None or args.max_credit_units < estimated_credits:
            raise ValueError(f"--max-credit-units must be at least {estimated_credits}")
        api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
        if not api_key:
            raise ValueError("ELEVENLABS_API_KEY is not set")
        prepare(output_dir, config, jobs)
        print(f"Prepared review lab: {output_dir.relative_to(ROOT)}")
        ready, failed = generate(output_dir, config, jobs, api_key)
        print(f"ElevenLabs prompt contrast generation complete: {ready} ready, {failed} failed")
        return 1 if failed else 0
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Pipeline error: {error}", file=sys.stderr)
        return 2
if __name__ == "__main__":
    raise SystemExit(main())
