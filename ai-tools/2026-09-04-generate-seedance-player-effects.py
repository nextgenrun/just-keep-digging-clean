"""Run budget-gated OpenRouter Seedance batches for the player/effects review lab."""

from __future__ import annotations

import argparse
import base64
import ctypes
import ctypes.wintypes as wt
import hashlib
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LAB = ROOT / "testing/animation-sandbox/2026-09-04-seedance-player-effects-eur10-v1"
PLAN_PATH = LAB / "generation-plan.json"
STATE_PATH = LAB / "openrouter-jobs.json"
MANIFEST_PATH = LAB / "generation-manifest.json"
CATALOG_PATH = LAB / "model-catalog-snapshot.json"
RAW_DIR = LAB / "raw"
OPENROUTER = "https://openrouter.ai/api/v1"
KEY_FILE = Path(os.environ.get("TEMP", ".")) / "codex-openrouter-01a06505.dpapi"


class DataBlob(ctypes.Structure):
    _fields_ = [("cbData", wt.DWORD), ("pbData", ctypes.POINTER(ctypes.c_ubyte))]


def unprotect_key(path: Path) -> bytearray:
    encrypted = path.read_bytes()
    source_buffer = (ctypes.c_ubyte * len(encrypted)).from_buffer_copy(encrypted)
    source_blob = DataBlob(len(encrypted), ctypes.cast(source_buffer, ctypes.POINTER(ctypes.c_ubyte)))
    output_blob = DataBlob()
    crypt32 = ctypes.WinDLL("crypt32", use_last_error=True)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    crypt32.CryptUnprotectData.argtypes = [
        ctypes.POINTER(DataBlob), ctypes.POINTER(wt.LPWSTR), ctypes.POINTER(DataBlob),
        wt.LPVOID, wt.LPVOID, wt.DWORD, ctypes.POINTER(DataBlob),
    ]
    crypt32.CryptUnprotectData.restype = wt.BOOL
    kernel32.LocalFree.argtypes = [wt.HLOCAL]
    kernel32.LocalFree.restype = wt.HLOCAL
    if not crypt32.CryptUnprotectData(
        ctypes.byref(source_blob), None, None, None, None, 0x1, ctypes.byref(output_blob)
    ):
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        return bytearray(ctypes.string_at(output_blob.pbData, output_blob.cbData))
    finally:
        kernel32.LocalFree(ctypes.cast(output_blob.pbData, wt.HLOCAL))


def safe_error(error: Exception) -> str:
    if isinstance(error, urllib.error.HTTPError):
        body = error.read().decode("utf-8", errors="replace")
        message = f"HTTP {error.code}: {body[:800]}"
    else:
        message = str(error)
    return re.sub(r"sk-or-[A-Za-z0-9_-]+", "[REDACTED]", message)[:1000]


def request_json(url: str, key: str = "", method: str = "GET", payload: dict | None = None) -> dict:
    headers = {"Accept": "application/json"}
    if key:
        headers.update({
            "Authorization": f"Bearer {key}",
            "HTTP-Referer": "http://127.0.0.1:8081",
            "X-Title": "UNDERSTAR Seedance Player Effects Lab",
        })
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    if body is not None:
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=180) as response:
        return json.loads(response.read().decode("utf-8"))


def download_video(url: str, key: str, output: Path) -> None:
    headers = {"Accept": "video/mp4,*/*"}
    if url.startswith("https://openrouter.ai/api/"):
        headers["Authorization"] = f"Bearer {key}"
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=300) as response:
        output.write_bytes(response.read())


def data_url(relative_path: str) -> str:
    path = LAB / relative_path
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return "data:image/png;base64," + encoded


def frame(url: str, frame_type: str | None = None) -> dict:
    item = {"type": "image_url", "image_url": {"url": url}}
    if frame_type:
        item["frame_type"] = frame_type
    return item


def variants(plan: dict, stage: str) -> list[dict]:
    result = []
    for profile in plan["stages"][stage]:
        for number, seed in enumerate(profile["seeds"], start=1):
            result.append({
                **profile,
                "variantId": f"{profile['id']}-v{number:02d}",
                "seed": seed,
            })
    return result


def build_payload(plan: dict, item: dict) -> dict:
    payload = {
        "model": plan["model"],
        "prompt": item["prompt"],
        "duration": item["duration"],
        "resolution": item["resolution"],
        "aspect_ratio": item["aspectRatio"],
        "generate_audio": False,
        "seed": item["seed"],
        "watermark": False,
        "frame_images": [
            frame(data_url(item["firstFrame"]), "first_frame"),
            frame(data_url(item["lastFrame"]), "last_frame"),
        ],
    }
    references = item.get("references") or []
    if references:
        payload["input_references"] = [frame(data_url(path)) for path in references]
    return payload


def compact(value: dict) -> dict:
    return {key: nested for key, nested in value.items() if key != "unsigned_urls"}


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def current_reserved_usd(state: dict) -> float:
    total = 0.0
    for job in state.get("jobs", {}).values():
        total += float(job.get("knownCostUsd") or job.get("estimatedCostUsd") or 0.0)
    return total


def validate_catalog(plan: dict, catalog: dict, selected: list[dict]) -> dict:
    model = next((item for item in catalog.get("data", []) if item.get("id") == plan["model"]), None)
    if not model:
        raise RuntimeError(f"Current catalog is missing {plan['model']}")
    if float((model.get("pricing_skus") or {}).get("video_tokens_without_audio") or 99) > float(plan["estimate"]["maxVideoTokenSkuUsd"]):
        raise RuntimeError("Seedance video-token price increased above the approved plan")
    for item in selected:
        checks = (
            (item["duration"], model.get("supported_durations") or [], "duration"),
            (item["resolution"], model.get("supported_resolutions") or [], "resolution"),
            (item["aspectRatio"], model.get("supported_aspect_ratios") or [], "aspect ratio"),
            ("first_frame", model.get("supported_frame_images") or [], "first frame"),
            ("last_frame", model.get("supported_frame_images") or [], "last frame"),
        )
        for expected, supported, label in checks:
            if expected not in supported:
                raise RuntimeError(f"{plan['model']} no longer supports {label}: {expected}")
    return model


def write_manifest(plan: dict, stage: str, state: dict, model: dict) -> None:
    jobs = list(state.get("jobs", {}).values())
    write_json(MANIFEST_PATH, {
        "schemaVersion": "seedance-player-effects-generation-v1",
        "reviewOnly": True,
        "productionChanged": False,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "model": plan["model"],
        "stage": stage,
        "hardCapUsd": plan["currency"]["hardCapUsd"],
        "budgetEur": plan["currency"]["budgetEur"],
        "reservedOrKnownCostUsd": current_reserved_usd(state),
        "knownCostUsd": sum(float(job.get("knownCostUsd") or 0) for job in jobs),
        "completed": sum(job.get("status") == "completed" for job in jobs),
        "failed": sum(job.get("status") == "failed" for job in jobs),
        "modelPricingSkus": model.get("pricing_skus"),
        "jobs": jobs,
        "constraints": plan["globalConstraints"],
    })


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", default="calibration")
    parser.add_argument("--max-wait-sec", type=int, default=2400)
    parser.add_argument("--key-file", type=Path, default=KEY_FILE)
    args = parser.parse_args()

    plan = json.loads(PLAN_PATH.read_text(encoding="utf-8"))
    if args.stage not in plan["stages"]:
        raise KeyError(f"Unknown stage: {args.stage}")
    selected = variants(plan, args.stage)
    for item in selected:
        for relative_path in [item["firstFrame"], item["lastFrame"], *(item.get("references") or [])]:
            if not (LAB / relative_path).is_file():
                raise FileNotFoundError(LAB / relative_path)

    catalog = request_json(f"{OPENROUTER}/videos/models")
    model = validate_catalog(plan, catalog, selected)
    write_json(CATALOG_PATH, {
        "capturedAt": datetime.now(timezone.utc).isoformat(),
        "model": model,
    })

    key_bytes = unprotect_key(args.key_file)
    try:
        key = key_bytes.decode("utf-8")
        key_info = request_json(f"{OPENROUTER}/key", key).get("data") or {}
        state = json.loads(STATE_PATH.read_text(encoding="utf-8")) if STATE_PATH.exists() else {"jobs": {}}
        jobs = state.setdefault("jobs", {})
        RAW_DIR.mkdir(parents=True, exist_ok=True)
        hard_cap = float(plan["currency"]["hardCapUsd"])
        per_second = float(plan["estimate"]["usdPerSecond"])

        for item in selected:
            variant_id = item["variantId"]
            existing = jobs.get(variant_id)
            if existing and existing.get("status") == "completed":
                print(f"Skipping completed {variant_id}", flush=True)
                continue
            estimate = item["duration"] * per_second
            if not existing and current_reserved_usd(state) + estimate > hard_cap:
                raise RuntimeError(f"Hard budget gate stopped before {variant_id}")
            remaining = key_info.get("limit_remaining")
            if remaining is not None and float(remaining) + 1e-9 < estimate:
                raise RuntimeError("OpenRouter key limit remaining is below the next clip estimate")

            job = existing or {
                "variantId": variant_id,
                "profileId": item["id"],
                "label": item["label"],
                "role": item["role"],
                "seed": item["seed"],
                "durationSeconds": item["duration"],
                "resolution": item["resolution"],
                "aspectRatio": item["aspectRatio"],
                "estimatedCostUsd": estimate,
                "status": "not-submitted",
            }
            jobs[variant_id] = job
            if not job.get("pollingUrl"):
                print(f"Submitting {variant_id} ({item['duration']}s {item['resolution']})", flush=True)
                response = request_json(
                    f"{OPENROUTER}/videos", key, "POST", build_payload(plan, item)
                )
                job["response"] = compact(response)
                job["pollingUrl"] = response.get("polling_url")
                job["status"] = response.get("status") or "pending"
                write_json(STATE_PATH, state)
                write_manifest(plan, args.stage, state, model)
                if not job["pollingUrl"] and job["status"] != "completed":
                    raise RuntimeError(f"{variant_id} did not return polling_url")

            deadline = time.time() + args.max_wait_sec
            while time.time() < deadline:
                poll = request_json(
                    urllib.parse.urljoin(f"{OPENROUTER}/", job["pollingUrl"]), key
                )
                status = poll.get("status") or "unknown"
                job["status"] = status
                job["lastPoll"] = compact(poll)
                print(f"{variant_id}: {status}", flush=True)
                if status == "completed":
                    output = RAW_DIR / f"{variant_id}.mp4"
                    urls = poll.get("unsigned_urls") or []
                    content_url = urls[0] if urls else f"{OPENROUTER}/videos/{poll.get('id') or job['response'].get('id')}/content?index=0"
                    if not output.exists() or output.stat().st_size < 10_000:
                        download_video(content_url, key, output)
                    usage = poll.get("usage") or {}
                    job["knownCostUsd"] = float(usage.get("cost") or estimate)
                    job["costSource"] = "api-usage" if usage.get("cost") is not None else "estimate-fallback"
                    job["output"] = output.relative_to(ROOT).as_posix()
                    job["bytes"] = output.stat().st_size
                    job["sha256"] = hashlib.sha256(output.read_bytes()).hexdigest()
                    break
                if status in {"failed", "cancelled", "canceled", "expired", "error"}:
                    job["status"] = "failed"
                    job["error"] = str(poll.get("error") or status)[:800]
                    break
                write_json(STATE_PATH, state)
                write_manifest(plan, args.stage, state, model)
                time.sleep(15)
            else:
                raise TimeoutError(f"Timed out waiting for {variant_id}")

            write_json(STATE_PATH, state)
            write_manifest(plan, args.stage, state, model)

        print(json.dumps({
            "stage": args.stage,
            "completed": sum(j.get("status") == "completed" for j in jobs.values()),
            "failed": sum(j.get("status") == "failed" for j in jobs.values()),
            "knownCostUsd": sum(float(j.get("knownCostUsd") or 0) for j in jobs.values()),
            "reservedOrKnownCostUsd": current_reserved_usd(state),
            "hardCapUsd": hard_cap,
            "outputs": [j.get("output") for j in jobs.values() if j.get("output")],
        }, indent=2))
        return 0
    finally:
        for index in range(len(key_bytes)):
            key_bytes[index] = 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(safe_error(error), file=os.sys.stderr)
        raise SystemExit(1)
