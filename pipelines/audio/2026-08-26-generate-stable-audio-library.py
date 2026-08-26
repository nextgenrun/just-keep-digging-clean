"""Plan or generate a layered Stable Audio library into the review inbox."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path

from stableAudioApi import StabilityAudioClient, StabilityAudioError


ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = Path(__file__).with_name("2026-08-26-stable-audio-pipeline.json")
ASSET_ID_PATTERN = re.compile(r"^[A-Z]{2}\d{3}$")
BATCH_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]{1,79}$")

def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()

def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".partial")
    temporary.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    temporary.replace(path)

def resolve_workspace_path(relative_path: str) -> Path:
    candidate = (ROOT / relative_path).resolve()
    try:
        candidate.relative_to(ROOT.resolve())
    except ValueError:
        raise ValueError(f"Configured path escapes the workspace: {relative_path}") from None
    return candidate

def load_config() -> dict:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    if config.get("schemaVersion") != 1:
        raise ValueError("Unsupported Stable Audio pipeline config schema")
    return config

def load_assets(source_path: Path) -> list[dict[str, str]]:
    with source_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        required = {"id", "name", "type", "prompt"}
        if not required.issubset(reader.fieldnames or []):
            raise ValueError(f"Prompt CSV must contain: {', '.join(sorted(required))}")
        assets = [{key: (row.get(key) or "").strip() for key in required} for row in reader]
    seen: set[str] = set()
    for asset in assets:
        if not ASSET_ID_PATTERN.fullmatch(asset["id"]):
            raise ValueError(f"Invalid asset id: {asset['id']}")
        if asset["id"] in seen:
            raise ValueError(f"Duplicate asset id: {asset['id']}")
        if not asset["name"] or not asset["prompt"]:
            raise ValueError(f"Incomplete prompt row: {asset['id']}")
        seen.add(asset["id"])
    return assets

def parse_csv_option(value: str | None) -> set[str] | None:
    if not value:
        return None
    return {part.strip() for part in value.split(",") if part.strip()}

def safe_name(value: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9_-]+", "-", value.strip()).strip("-_")
    if not normalized:
        raise ValueError("Asset name cannot be normalized to a safe filename")
    return normalized[:100]

def deterministic_seed(namespace: str, job_key: str) -> int:
    digest = hashlib.sha256(f"{namespace}:{job_key}".encode("utf-8")).digest()
    return 1 + (int.from_bytes(digest[:4], "big") % 4_294_967_293)

def build_jobs(
    assets: list[dict[str, str]],
    config: dict,
    takes: int,
    selected_layers: set[str] | None,
) -> list[dict]:
    jobs: list[dict] = []
    for asset in assets:
        profile = config["profiles"].get(asset["type"])
        if not profile:
            raise ValueError(f"No layer profile for type {asset['type']}: {asset['id']}")
        for layer in profile["layers"]:
            if selected_layers and layer["id"] not in selected_layers:
                continue
            for take in range(1, takes + 1):
                job_key = f"{asset['id']}:{layer['id']}:{take:02d}"
                filename = (
                    f"{asset['id']}_{safe_name(asset['name'])}__{layer['id']}__"
                    f"take{take:02d}__UNTESTED.wav"
                )
                jobs.append({
                    "jobKey": job_key,
                    "assetId": asset["id"],
                    "assetName": asset["name"],
                    "assetType": asset["type"],
                    "layer": layer["id"],
                    "take": take,
                    "durationSeconds": layer["durationSeconds"],
                    "seed": deterministic_seed(config["seedNamespace"], job_key),
                    "prompt": " ".join([
                        asset["prompt"],
                        layer["instruction"],
                        config["globalPromptSuffix"],
                    ]),
                    "file": filename,
                })
    if selected_layers and not jobs:
        raise ValueError(f"No jobs matched layers: {', '.join(sorted(selected_layers))}")
    return jobs

def select_assets(
    assets: list[dict[str, str]],
    selected_ids: set[str] | None,
    limit: int | None,
) -> list[dict[str, str]]:
    if selected_ids:
        known = {asset["id"] for asset in assets}
        missing = selected_ids - known
        if missing:
            raise ValueError(f"Unknown asset ids: {', '.join(sorted(missing))}")
        assets = [asset for asset in assets if asset["id"] in selected_ids]
    return assets[:limit] if limit else assets

def load_manifest(path: Path, model: str, jobs: list[dict]) -> dict:
    if path.exists():
        manifest = json.loads(path.read_text(encoding="utf-8"))
        if manifest.get("model") != model:
            raise ValueError("Existing batch manifest uses a different model")
        return manifest
    return {
        "schemaVersion": 1,
        "reviewOnly": True,
        "runtimeWired": False,
        "model": model,
        "createdAt": utc_now(),
        "updatedAt": utc_now(),
        "plannedJobs": len(jobs),
        "results": {},
    }

def save_audio(path: Path, audio: bytes) -> None:
    temporary = path.with_suffix(path.suffix + ".partial")
    temporary.write_bytes(audio)
    temporary.replace(path)

def run_generation(
    jobs: list[dict],
    output_dir: Path,
    model_name: str,
    model: dict,
    api_key: str,
) -> tuple[int, int]:
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = output_dir / "2026-08-26-stable-audio-results.json"
    status_path = output_dir / "2026-08-26-stable-audio-status.json"
    manifest = load_manifest(manifest_path, model_name, jobs)
    client = StabilityAudioClient(api_key)
    ready = 0
    failed = 0
    for index, job in enumerate(jobs, start=1):
        target = output_dir / job["file"]
        result = manifest["results"].get(job["jobKey"], {})
        if target.exists():
            manifest["results"][job["jobKey"]] = {
                **job,
                **result,
                "status": "ready",
                "bytes": target.stat().st_size,
                "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
            }
            ready += 1
            continue
        try:
            generation_id = result.get("generationId") if result.get("status") == "pending" else None
            if generation_id:
                submission_audio = None
            else:
                submission = client.submit(model["endpoint"], {
                    "prompt": job["prompt"],
                    "model": model_name,
                    "output_format": model["outputFormat"],
                    "duration": job["durationSeconds"],
                    "seed": job["seed"],
                    "steps": model["steps"],
                    "cfg_scale": model["cfgScale"],
                })
                submission_audio = submission.audio
                generation_id = submission.generation_id
                manifest["results"][job["jobKey"]] = {
                    **job,
                    "status": "pending" if generation_id else "received",
                    "generationId": generation_id,
                    "submittedAt": utc_now(),
                }
                manifest["updatedAt"] = utc_now()
                write_json(manifest_path, manifest)
            if submission_audio is None:
                result_url = model["resultEndpoint"].format(generationId=generation_id)
                submission_audio = client.wait_for_result(
                    result_url,
                    model["pollSeconds"],
                    model["timeoutSeconds"],
                )
            save_audio(target, submission_audio)
            manifest["results"][job["jobKey"]].update({
                "status": "ready",
                "bytes": len(submission_audio),
                "sha256": hashlib.sha256(submission_audio).hexdigest(),
                "completedAt": utc_now(),
            })
            ready += 1
        except (StabilityAudioError, OSError, ValueError) as error:
            existing = manifest["results"].get(job["jobKey"], {})
            generation_id = existing.get("generationId")
            manifest["results"][job["jobKey"]] = {
                **job,
                **existing,
                "status": "pending" if generation_id else "error",
                "lastError": str(error),
                "failedAt": utc_now(),
            }
            failed += 1
        manifest["updatedAt"] = utc_now()
        write_json(manifest_path, manifest)
        write_json(status_path, {
            "state": "running" if index < len(jobs) else "completed",
            "completed": index,
            "total": len(jobs),
            "ready": ready,
            "failed": failed,
            "updatedAt": utc_now(),
        })
        print(f"[{index}/{len(jobs)}] {job['jobKey']}: {manifest['results'][job['jobKey']]['status']}")
    return ready, failed

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ids", help="Comma-separated asset ids, for example GX201,GX202")
    parser.add_argument("--layers", help="Comma-separated layer ids, for example onset,body")
    parser.add_argument("--limit", type=int, help="Limit assets after id filtering")
    parser.add_argument("--takes", type=int, help="Override configured take count")
    parser.add_argument("--model", help="Stable Audio model configured in the pipeline JSON")
    parser.add_argument("--batch", help="Safe output batch directory name")
    parser.add_argument("--execute", action="store_true", help="Perform paid API requests")
    parser.add_argument("--max-credits", type=int, help="Hard credit ceiling required with --execute")
    args = parser.parse_args()

    try:
        config = load_config()
        model_name = args.model or config["defaultModel"]
        if model_name not in config["models"]:
            raise ValueError(f"Unknown model: {model_name}")
        model = config["models"][model_name]
        takes = args.takes or config["defaultTakes"]
        if takes < 1 or takes > 10:
            raise ValueError("Takes must be between 1 and 10")
        if args.limit is not None and args.limit < 1:
            raise ValueError("Limit must be at least 1")
        assets = load_assets(resolve_workspace_path(config["sourceCsv"]))
        assets = select_assets(assets, parse_csv_option(args.ids), args.limit)
        jobs = build_jobs(assets, config, takes, parse_csv_option(args.layers))
        credits = len(jobs) * model["creditsPerGeneration"]
        cost = credits * model["usdPerCredit"]
        print(f"Plan: {len(assets)} assets, {len(jobs)} generations, {credits} credits (${cost:.2f})")
        for job in jobs[:8]:
            print(f"  {job['jobKey']} -> {job['file']} ({job['durationSeconds']}s)")
        if len(jobs) > 8:
            print(f"  ... {len(jobs) - 8} more")
        if not args.execute:
            print("Dry run only. Add --execute and --max-credits to generate audio.")
            return 0
        if args.max_credits is None or args.max_credits < credits:
            raise ValueError(f"--max-credits must be at least the planned {credits} credits")
        api_key = os.environ.get("STABILITY_API_KEY", "").strip()
        if not api_key:
            raise ValueError("STABILITY_API_KEY is not set")
        batch = args.batch or f"stable-audio-{model_name}-{date.today().isoformat()}"
        if not BATCH_PATTERN.fullmatch(batch):
            raise ValueError("Batch must use lowercase letters, numbers, dot, underscore, or hyphen")
        output_root = resolve_workspace_path(config["outputRoot"])
        ready, failed = run_generation(jobs, output_root / batch, model_name, model, api_key)
        print(f"Stable Audio batch complete: {ready} ready, {failed} failed")
        return 1 if failed else 0
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Pipeline error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
