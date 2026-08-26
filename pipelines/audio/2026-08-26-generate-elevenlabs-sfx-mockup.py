"""Plan or generate the bounded ElevenLabs layered SFX audition library."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from elevenLabsReviewPage import write_review_page
from elevenLabsSoundApi import ElevenLabsSoundClient, ElevenLabsSoundError


ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = Path(__file__).with_name("2026-08-26-elevenlabs-sfx-mockup.json")
ASSET_ID_PATTERN = re.compile(r"^[A-Z]{2}\d{3}$")
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


def load_config() -> dict:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    if config.get("schemaVersion") != 1:
        raise ValueError("Unsupported ElevenLabs mockup config schema")
    return config


def load_assets(source: Path, selected_ids: set[str]) -> list[dict[str, str]]:
    with source.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    required = {"id", "name", "type", "prompt"}
    if not rows or not required.issubset(rows[0]):
        raise ValueError(f"Prompt CSV must contain: {', '.join(sorted(required))}")
    assets = [{key: (row.get(key) or "").strip() for key in required} for row in rows]
    indexed = {asset["id"]: asset for asset in assets}
    missing = selected_ids - indexed.keys()
    if missing:
        raise ValueError(f"Unknown selected asset ids: {', '.join(sorted(missing))}")
    ordered = [indexed[asset_id] for asset_id in selected_ids]
    for asset in ordered:
        if not ASSET_ID_PATTERN.fullmatch(asset["id"]) or not asset["name"] or not asset["prompt"]:
            raise ValueError(f"Invalid prompt row: {asset['id']}")
    return ordered


def safe_name(value: str) -> str:
    name = re.sub(r"[^A-Za-z0-9_-]+", "-", value).strip("-_")
    if not name:
        raise ValueError("Asset name cannot be normalized")
    return name[:100]


def csv_set(value: str | None) -> set[str] | None:
    return {part.strip() for part in value.split(",") if part.strip()} if value else None


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
            raise ValueError(f"No layer profile for {asset['type']}: {asset['id']}")
        for layer in profile["layers"]:
            if selected_layers and layer["id"] not in selected_layers:
                continue
            for take in range(1, takes + 1):
                filename = (
                    f"{asset['id']}_{safe_name(asset['name'])}__{layer['id']}__"
                    f"take{take:02d}__UNTESTED.{config['outputExtension']}"
                )
                jobs.append({
                    "jobKey": f"{asset['id']}:{layer['id']}:{take:02d}",
                    "assetId": asset["id"],
                    "assetName": asset["name"],
                    "assetType": asset["type"],
                    "layer": layer["id"],
                    "role": layer["role"],
                    "take": take,
                    "durationSeconds": layer["durationSeconds"],
                    "loop": layer["loop"],
                    "promptInfluence": profile["promptInfluence"],
                    "prompt": " ".join([asset["prompt"], layer["instruction"], config["globalPromptSuffix"]]),
                    "file": filename,
                })
                if len(jobs[-1]["prompt"]) > 450:
                    raise ValueError(
                        f"Prompt exceeds ElevenLabs 450-character limit: {jobs[-1]['jobKey']}"
                    )
    if selected_layers and not jobs:
        raise ValueError(f"No jobs matched layers: {', '.join(sorted(selected_layers))}")
    return jobs


def load_manifest(path: Path, config: dict, jobs: list[dict]) -> dict:
    if path.exists():
        manifest = json.loads(path.read_text(encoding="utf-8"))
        if manifest.get("modelId") != config["modelId"]:
            raise ValueError("Existing batch manifest uses a different model")
    else:
        manifest = {
            "schemaVersion": 1,
            "provider": config["provider"],
            "modelId": config["modelId"],
            "reviewOnly": True,
            "runtimeWired": False,
            "createdAt": utc_now(),
            "results": {},
        }
    manifest["plannedJobs"] = len(jobs)
    manifest["plannedSeconds"] = sum(job["durationSeconds"] for job in jobs)
    manifest["updatedAt"] = utc_now()
    return manifest


def save_audio(path: Path, audio: bytes) -> None:
    temporary = path.with_suffix(path.suffix + ".partial")
    temporary.write_bytes(audio)
    temporary.replace(path)


def generate(jobs: list[dict], output_dir: Path, config: dict, api_key: str) -> tuple[int, int]:
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = output_dir / "2026-08-26-elevenlabs-results.json"
    status_path = output_dir / "2026-08-26-elevenlabs-status.json"
    manifest = load_manifest(manifest_path, config, jobs)
    client = ElevenLabsSoundClient(api_key)
    ready = failed = 0
    consecutive_failures = 0
    for index, job in enumerate(jobs, start=1):
        target = output_dir / job["file"]
        if target.exists():
            manifest["results"][job["jobKey"]] = {
                **job,
                "status": "ready",
                "bytes": target.stat().st_size,
                "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
            }
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
                manifest["results"][job["jobKey"]] = {
                    **job,
                    "status": "ready",
                    "bytes": len(result.audio),
                    "sha256": hashlib.sha256(result.audio).hexdigest(),
                    "contentType": result.content_type,
                    "reportedCost": result.reported_cost,
                    "completedAt": utc_now(),
                }
                ready += 1
                consecutive_failures = 0
            except (ElevenLabsSoundError, OSError, ValueError) as error:
                manifest["results"][job["jobKey"]] = {
                    **job,
                    "status": "error",
                    "lastError": str(error),
                    "failedAt": utc_now(),
                }
                failed += 1
                consecutive_failures += 1
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
        print(f"[{index}/{len(jobs)}] {job['jobKey']}: {manifest['results'][job['jobKey']]['status']}", flush=True)
        if consecutive_failures >= 3:
            print("Stopped after three consecutive API failures; rerun will resume existing files.", flush=True)
            break
    return ready, failed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ids", help="Comma-separated subset of configured asset ids")
    parser.add_argument("--layers", help="Comma-separated layer ids")
    parser.add_argument("--takes", type=int, help="Override configured take count")
    parser.add_argument("--batch", help="Safe output batch directory name")
    parser.add_argument("--execute", action="store_true", help="Perform paid API requests")
    parser.add_argument("--max-generations", type=int, help="Hard request ceiling required with --execute")
    parser.add_argument("--max-credit-units", type=int, help="Estimated ElevenLabs credit ceiling required with --execute")
    args = parser.parse_args()
    try:
        config = load_config()
        configured_ids = config["selectedAssetIds"]
        selected_ids = csv_set(args.ids)
        if selected_ids and not selected_ids.issubset(configured_ids):
            raise ValueError("--ids must be a subset of the configured mockup ids")
        ids = [asset_id for asset_id in configured_ids if not selected_ids or asset_id in selected_ids]
        assets = load_assets(workspace_path(config["sourceCsv"]), ids)
        takes = args.takes or config["defaultTakes"]
        if takes < 1 or takes > 4:
            raise ValueError("Takes must be between 1 and 4")
        jobs = build_jobs(assets, config, takes, csv_set(args.layers))
        seconds = sum(job["durationSeconds"] for job in jobs)
        estimated_credits = int(seconds * config["estimatedApiCreditsPerSecond"])
        print(f"Plan: {len(assets)} assets, {len(jobs)} generations, {seconds:g}s, ~{estimated_credits} API credit units")
        for job in jobs[:10]:
            print(f"  {job['jobKey']} -> {job['file']} ({job['durationSeconds']:g}s)")
        if len(jobs) > 10:
            print(f"  ... {len(jobs) - 10} more")
        if not args.execute:
            print("Dry run only. Add --execute with both hard ceilings to generate audio.")
            return 0
        if args.max_generations is None or args.max_generations < len(jobs):
            raise ValueError(f"--max-generations must be at least {len(jobs)}")
        if args.max_credit_units is None or args.max_credit_units < estimated_credits:
            raise ValueError(f"--max-credit-units must be at least {estimated_credits}")
        api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
        if not api_key:
            raise ValueError("ELEVENLABS_API_KEY is not set")
        batch = args.batch or config["defaultBatch"]
        if not BATCH_PATTERN.fullmatch(batch):
            raise ValueError("Batch must use lowercase letters, numbers, dot, underscore, or hyphen")
        output_dir = workspace_path(config["outputRoot"]) / batch
        ready, failed = generate(jobs, output_dir, config, api_key)
        write_review_page(output_dir, assets, jobs)
        print(f"ElevenLabs mockup complete: {ready} ready, {failed} failed")
        return 1 if failed else 0
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Pipeline error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
