"""Generate four first-frame-only Seedance motion studies from real surface art."""

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
REVIEW = ROOT / "testing/animation-sandbox/2026-08-26-real-surface-living-background-v1"
OUTPUT_DIR = REVIEW / "raw-v1"
FRAME = REVIEW / "real-surface-world-reference-v1.png"
JOBS_PATH = OUTPUT_DIR / "openrouter-jobs.json"
MANIFEST_PATH = OUTPUT_DIR / "generation-manifest.json"
CATALOG_PATH = OUTPUT_DIR / "model-catalog-snapshot.json"
OPENROUTER = "https://openrouter.ai/api/v1"
DURATION_SECONDS = 4
RESOLUTION = "720p"
ASPECT_RATIO = "16:9"
DEFAULT_ESTIMATE_BUDGET_USD = 1.25

SHARED_DIRECTION = (
    "Use the supplied first frame as the exact immutable game-art reference. This is a wide "
    "side-on 2D game background, not a cinematic shot. The camera and crop are locked: no pan, "
    "zoom, dolly, tilt, shake, reframing, parallax warp, or lens effect. Preserve every building, "
    "mountain, road stone, surface boundary, soil rock, and root in place. Buildings, mountains, "
    "road, and the entire underground remain rigid and pixel-stable; no morphing, breathing, "
    "sliding, new openings, new shelves, second underground floor, or geometry changes. Do not "
    "add people, creatures, vehicles, objects, text, UI, logos, watermarks, audio, weather, or a "
    "global exposure change. This is deliberately a visibly moving HALF-CYCLE that will be "
    "played forward and backward for a deterministic loop. Begin exactly at the supplied calm "
    "frame. Build one natural wind event continuously through the shot, then ease smoothly into "
    "a gently held peak pose during the final half-second. Do not return to the start pose and do "
    "not make the result near-static. Motion must be readable at normal gameplay scale. "
)

MOTION_PROFILES = {
    "traveling-gust": (
        "A coherent breeze travels from left to right across the complete world. Every visible "
        "forest layer participates: foreground pine crowns sway about two percent of their height, "
        "midground treetops ripple in sequence, and smaller branches flex while every trunk stays "
        "rooted. A soft wave crosses the grass and small surface plants. Existing chimney smoke "
        "curls and travels 30 to 60 pixels. Existing hanging lanterns, ropes, and signs swing only "
        "two to four degrees. Large cloud masses drift slowly and visibly while retaining shape."
    ),
    "forest-breath": (
        "Create one broad living-forest pulse rather than isolated effects. Near pines lean gently "
        "first, the dense middle forest follows with varied delayed branch movement, and distant "
        "treetops answer last; all tree motion is visible but remains natural and low amplitude. "
        "Surface grass bends in matching patches, several existing smoke plumes lengthen and curl, "
        "cloud banks advance slowly, and existing warm lamps fluctuate subtly. Keep rigid architecture "
        "and terrain perfectly still while the vegetation and air clearly live around them."
    ),
}

MODEL_MATRIX = (
    ("seedance-fast", "bytedance/seedance-2.0-fast", 0.21384),
    ("seedance-mini", "bytedance/seedance-2.0-mini", 0.18144),
)


def variants() -> list[dict]:
    result = []
    index = 1
    for model_id, model, estimate in MODEL_MATRIX:
        for profile_id, direction in MOTION_PROFILES.items():
            result.append({
                "id": f"{index:02d}-{model_id}-{profile_id}",
                "modelId": model_id,
                "model": model,
                "profileId": profile_id,
                "estimatedCostUsd": estimate,
                "prompt": SHARED_DIRECTION + direction,
            })
            index += 1
    return result


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


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
            "X-Title": "UNDERSTAR Real Surface Seedance V1",
        })
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    if body is not None:
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
        "frame_images": [{
            "type": "image_url",
            "image_url": {"url": frame_url},
            "frame_type": "first_frame",
        }],
    }


def validate_catalog(catalog: dict, matrix: list[dict]) -> dict:
    by_id = {model["id"]: model for model in catalog.get("data", [])}
    selected = {}
    for variant in matrix:
        model = by_id.get(variant["model"])
        if not model:
            raise RuntimeError(f"Current catalog is missing {variant['model']}")
        if "first_frame" not in (model.get("supported_frame_images") or []):
            raise RuntimeError(f"{variant['model']} no longer supports first-frame video")
        if RESOLUTION not in (model.get("supported_resolutions") or []):
            raise RuntimeError(f"{variant['model']} no longer supports {RESOLUTION}")
        if DURATION_SECONDS not in (model.get("supported_durations") or []):
            raise RuntimeError(f"{variant['model']} no longer supports {DURATION_SECONDS}s")
        selected[model["id"]] = {
            key: model.get(key)
            for key in (
                "id", "name", "supported_resolutions", "supported_durations",
                "supported_frame_images", "generate_audio", "pricing_skus",
            )
        }
    return {"capturedAt": datetime.now(timezone.utc).isoformat(), "models": list(selected.values())}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--estimate-budget-usd", type=float, default=DEFAULT_ESTIMATE_BUDGET_USD)
    parser.add_argument("--max-wait-sec", type=int, default=1800)
    parser.add_argument("--key-stdin", action="store_true")
    args = parser.parse_args()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    matrix = variants()
    estimated_cost = sum(item["estimatedCostUsd"] for item in matrix)
    if estimated_cost > args.estimate_budget_usd:
        raise RuntimeError(
            f"Catalog estimate ${estimated_cost:.2f} exceeds budget ${args.estimate_budget_usd:.2f}"
        )
    if not FRAME.exists():
        raise FileNotFoundError(FRAME)

    catalog_snapshot = validate_catalog(
        request_json(f"{OPENROUTER}/videos/models"), matrix
    )
    write_json(CATALOG_PATH, catalog_snapshot)

    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key and args.key_stdin:
        key = getpass.getpass("OpenRouter key (not stored): ").strip()
    if not key:
        print("Missing OpenRouter key; no requests submitted.")
        return 2

    state = json.loads(JOBS_PATH.read_text(encoding="utf-8")) if JOBS_PATH.exists() else {"jobs": {}}
    jobs = state.setdefault("jobs", {})
    started_at = datetime.now(timezone.utc).isoformat()
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
                results[variant["id"]] = {"variant": variant, "status": "failed", "error": job["submitError"]}
                continue
            polling_url = urllib.parse.urljoin(
                f"{OPENROUTER}/", job.get("response", {}).get("polling_url") or ""
            )
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
            elif status not in {"failed", "cancelled", "canceled", "error", "expired"}:
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
            "estimateBudgetUsd": args.estimate_budget_usd,
            "estimatedCostUsd": estimated_cost,
            "knownCostUsd": known_cost,
            "referenceFrame": FRAME.relative_to(ROOT).as_posix(),
            "referenceSha256": hashlib.sha256(FRAME.read_bytes()).hexdigest(),
            "loopStrategy": "first-frame half-cycle; deterministic forward/reverse post-process",
            "apiKeyStored": False,
            "results": [results[item["id"]] for item in matrix],
        })
        if pending == 0:
            break
        print(f"Waiting on {pending} Seedance job(s)...", flush=True)
        time.sleep(10)
    else:
        raise TimeoutError("Timed out while waiting for Seedance jobs")

    completed = [item for item in results.values() if item.get("status") == "completed"]
    failed = [item for item in results.values() if item.get("status") != "completed"]
    print(json.dumps({
        "completed": len(completed),
        "failed": len(failed),
        "estimatedCostUsd": estimated_cost,
        "knownCostUsd": sum(float((item.get("poll", {}).get("usage") or {}).get("cost") or 0) for item in completed),
        "outputs": [item["output"] for item in completed],
    }, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(safe_error(error), file=os.sys.stderr)
        raise SystemExit(1)
