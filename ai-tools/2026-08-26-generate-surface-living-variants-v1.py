"""Generate ten bounded, review-only living-background variants through OpenRouter."""

from __future__ import annotations

import argparse
import base64
import getpass
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
MOCKUP = ROOT / "testing/animation-sandbox/2026-08-26-surface-living-background-mockup-v1"
OUTPUT_DIR = MOCKUP / "variants-v1"
FRAME = MOCKUP / "2026-08-26-surface-two-row-reference-v2.png"
JOBS_PATH = OUTPUT_DIR / "openrouter-jobs.json"
MANIFEST_PATH = OUTPUT_DIR / "variants-manifest.json"
CATALOG_PATH = OUTPUT_DIR / "model-catalog-snapshot.json"
OPENROUTER = "https://openrouter.ai/api/v1"
DURATION_SECONDS = 4
RESOLUTION = "720p"
ASPECT_RATIO = "16:9"
DEFAULT_BUDGET_USD = 3.25

SHARED_DIRECTION = (
    "Fixed side-on background plate for active 2D mining gameplay, not a cinematic shot. "
    "Preserve the supplied image exactly: same pixel-space composition, settlement identity, "
    "house and mountain geometry, single outdoor surface boundary, and uninterrupted dark earth. "
    "There is no underground floor, shelf, ledge, tunnel, seam, or second boundary. The camera is "
    "mathematically locked: no pan, tilt, zoom, dolly, crop, reframing, parallax warp, depth-of-field, "
    "or lens change. Buildings, mountains, forest, ground line, soil, rocks, and roots never morph, "
    "wobble, breathe, slide, or change scale. No scene-wide exposure shift, dramatic fog, weather, "
    "particle swarm, new object, character, creature, vehicle, text, UI, logo, watermark, audio, or "
    "cut. Motion begins at rest, remains extremely low amplitude, and returns fully to rest at the "
    "identical supplied last frame with no visible reset. "
)

MOTION_PROFILES = {
    "air": (
        "Atmosphere-only treatment. Move fewer than five tiny localized areas: two hair-thin chimney "
        "wisps drifting only a short distance, two warm windows breathing by only a few percent, and "
        "one nearly imperceptible distant cloud drift. The entire underground remains completely still."
    ),
    "hearth": (
        "Restrained inhabited-world treatment. Move at most seven tiny localized areas: two or three "
        "thin chimney wisps, three independent lantern breaths of only a few percent, one small grass "
        "patch with barely visible sway, and three faint underground mineral glints that slowly appear "
        "and disappear without moving. Everything else remains completely still."
    ),
}

MODEL_MATRIX = (
    ("seedance-mini", "bytedance/seedance-2.0-mini", 0.18144),
    ("seedance-fast", "bytedance/seedance-2.0-fast", 0.21384),
    ("kling-standard", "kwaivgi/kling-v3.0-std", 0.336),
    ("veo-fast", "google/veo-3.1-fast", 0.32),
    ("wan", "alibaba/wan-2.7", 0.4),
)


def variants() -> list[dict]:
    result = []
    index = 1
    for model_id, model, estimated_cost in MODEL_MATRIX:
        for profile_id, profile_prompt in MOTION_PROFILES.items():
            result.append({
                "id": f"{index:02d}-{model_id}-{profile_id}",
                "modelId": model_id,
                "model": model,
                "profileId": profile_id,
                "estimatedCostUsd": estimated_cost,
                "prompt": SHARED_DIRECTION + profile_prompt,
            })
            index += 1
    return result


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def safe_error(error: Exception) -> str:
    if isinstance(error, urllib.error.HTTPError):
        body = error.read().decode("utf-8", errors="replace")
        message = f"HTTP {error.code}: {body[:800]}"
    else:
        message = str(error)
    return re.sub(r"sk-or-v1-[A-Za-z0-9_-]+", "[REDACTED]", message)[:1000]


def request_json(url: str, key: str = "", method: str = "GET", payload: dict | None = None) -> dict:
    headers = {"Accept": "application/json"}
    if key:
        headers.update({
            "Authorization": f"Bearer {key}",
            "HTTP-Referer": "http://127.0.0.1:8136",
            "X-Title": "UNDERSTAR Surface Living Variants V1",
        })
    body = None
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=180) as response:
        return json.loads(response.read().decode("utf-8"))


def download_video(url: str, key: str, output: Path) -> None:
    request = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {key}", "Accept": "video/mp4,*/*"},
    )
    with urllib.request.urlopen(request, timeout=300) as response:
        output.write_bytes(response.read())


def frame_data_url() -> str:
    encoded = base64.b64encode(FRAME.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def build_payload(variant: dict, frame_url: str) -> dict:
    return {
        "model": variant["model"],
        "prompt": variant["prompt"],
        "duration": DURATION_SECONDS,
        "resolution": RESOLUTION,
        "aspect_ratio": ASPECT_RATIO,
        "generate_audio": False,
        "frame_images": [
            {"type": "image_url", "image_url": {"url": frame_url}, "frame_type": "first_frame"},
            {"type": "image_url", "image_url": {"url": frame_url}, "frame_type": "last_frame"},
        ],
    }


def validate_catalog(catalog: dict, matrix: list[dict]) -> dict:
    by_id = {model["id"]: model for model in catalog.get("data", [])}
    selected = []
    for variant in matrix:
        model = by_id.get(variant["model"])
        if not model:
            raise RuntimeError(f"Current catalog is missing {variant['model']}")
        frames = model.get("supported_frame_images") or []
        if "first_frame" not in frames or "last_frame" not in frames:
            raise RuntimeError(f"{variant['model']} no longer supports both loop endpoints")
        if RESOLUTION not in (model.get("supported_resolutions") or []):
            raise RuntimeError(f"{variant['model']} no longer supports {RESOLUTION}")
        if DURATION_SECONDS not in (model.get("supported_durations") or []):
            raise RuntimeError(f"{variant['model']} no longer supports {DURATION_SECONDS}s")
        selected.append({
            key: model.get(key)
            for key in (
                "id", "name", "supported_resolutions", "supported_durations",
                "supported_frame_images", "generate_audio", "pricing_skus",
            )
        })
    return {"capturedAt": datetime.now(timezone.utc).isoformat(), "models": selected[::2]}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--budget-usd", type=float, default=DEFAULT_BUDGET_USD)
    parser.add_argument("--max-wait-sec", type=int, default=1800)
    parser.add_argument("--key-stdin", action="store_true")
    args = parser.parse_args()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    matrix = variants()
    estimated_cost = sum(item["estimatedCostUsd"] for item in matrix)
    if estimated_cost > args.budget_usd:
        raise RuntimeError(
            f"Estimated cost ${estimated_cost:.2f} exceeds hard cap ${args.budget_usd:.2f}"
        )
    if not FRAME.exists():
        raise FileNotFoundError(FRAME)

    catalog = request_json(f"{OPENROUTER}/videos/models")
    catalog_snapshot = validate_catalog(catalog, matrix)
    write_json(CATALOG_PATH, catalog_snapshot)

    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key and args.key_stdin:
        key = getpass.getpass("OpenRouter key (not stored): ").strip()
    if not key:
        print("Missing OpenRouter key; no requests submitted.")
        return 2

    started_at = datetime.now(timezone.utc).isoformat()
    state = json.loads(JOBS_PATH.read_text(encoding="utf-8")) if JOBS_PATH.exists() else {"jobs": {}}
    jobs = state.setdefault("jobs", {})
    frame_url = frame_data_url()

    for variant in matrix:
        if variant["id"] in jobs:
            continue
        print(f"Submitting {variant['id']} via {variant['model']}", flush=True)
        try:
            response = request_json(
                f"{OPENROUTER}/videos", key, "POST", build_payload(variant, frame_url)
            )
            jobs[variant["id"]] = {"variant": variant, "response": response}
        except Exception as error:
            jobs[variant["id"]] = {"variant": variant, "submitError": safe_error(error)}
        write_json(JOBS_PATH, state)

    deadline = time.time() + args.max_wait_sec
    results: dict[str, dict] = {}
    while time.time() < deadline:
        pending = 0
        for variant in matrix:
            job = jobs[variant["id"]]
            if job.get("submitError"):
                results[variant["id"]] = {
                    "variant": variant, "status": "failed", "error": job["submitError"]
                }
                continue
            polling_url = job.get("response", {}).get("polling_url")
            polling_url = urllib.parse.urljoin(f"{OPENROUTER}/", polling_url or "")
            try:
                poll = request_json(polling_url, key) if polling_url else {
                    "status": "failed", "error": "missing polling_url"
                }
            except Exception as error:
                poll = {"status": "poll_error", "error": safe_error(error)}
            status = poll.get("status", "unknown")
            result = {"variant": variant, "status": status, "poll": poll}
            if status == "completed":
                output = OUTPUT_DIR / f"{variant['id']}.mp4"
                urls = poll.get("unsigned_urls") or []
                if urls and (not output.exists() or output.stat().st_size < 10_000):
                    download_video(urls[0], key, output)
                result.update({
                    "output": output.relative_to(ROOT).as_posix(),
                    "bytes": output.stat().st_size,
                    "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
                })
            elif status in {"failed", "cancelled", "canceled", "error", "expired"}:
                pass
            else:
                pending += 1
            results[variant["id"]] = result
        known_cost = sum(
            float((item.get("poll", {}).get("usage") or {}).get("cost") or 0)
            for item in results.values()
        )
        write_json(MANIFEST_PATH, {
            "schemaVersion": 1,
            "state": "polling" if pending else "complete",
            "startedAt": started_at,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "hardBudgetUsd": args.budget_usd,
            "estimatedCostUsd": estimated_cost,
            "knownCostUsd": known_cost,
            "referenceFrame": FRAME.relative_to(ROOT).as_posix(),
            "referenceSha256": hashlib.sha256(FRAME.read_bytes()).hexdigest(),
            "apiKeyStored": False,
            "results": [results[item["id"]] for item in matrix],
        })
        if pending == 0:
            break
        print(f"Waiting on {pending} OpenRouter variant job(s)...", flush=True)
        time.sleep(10)
    else:
        raise TimeoutError("Timed out while waiting for OpenRouter variant jobs")

    completed = [item for item in results.values() if item.get("status") == "completed"]
    failed = [item for item in results.values() if item.get("status") != "completed"]
    known_cost = sum(float((item.get("poll", {}).get("usage") or {}).get("cost") or 0) for item in completed)
    print(json.dumps({
        "completed": len(completed),
        "failed": len(failed),
        "estimatedCostUsd": estimated_cost,
        "knownCostUsd": known_cost,
        "outputs": [item["output"] for item in completed],
    }, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(safe_error(error), file=os.sys.stderr)
        raise SystemExit(1)
