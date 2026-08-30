"""Generate three long, closed-cycle Seedance Mini surface backgrounds."""

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
REVIEW = ROOT / "testing/animation-sandbox/2026-08-26-surface-background-loops-v2"
OUTPUT_DIR = REVIEW / "raw-v3"
START_FRAME = REVIEW / "seedance-loop-anchor-v2.png"
END_FRAME = REVIEW / "seedance-loop-end-anchor-v2.png"
JOBS_PATH = OUTPUT_DIR / "openrouter-jobs.json"
MANIFEST_PATH = OUTPUT_DIR / "generation-manifest.json"
CATALOG_PATH = OUTPUT_DIR / "model-catalog-snapshot.json"
OPENROUTER = "https://openrouter.ai/api/v1"
MODEL = "bytedance/seedance-2.0-mini"
DURATION_SECONDS = 15
RESOLUTION = "720p"
ASPECT_RATIO = "21:9"
ANIMATED_HEIGHT = 498
DEFAULT_ESTIMATE_BUDGET_USD = 2.10
ESTIMATED_COST_PER_CLIP_USD = 0.61

SHARED_DIRECTION = (
    "Use the separately supplied first-frame and final-frame anchors exactly. Their animated "
    "upper regions are pixel-identical: begin at that neutral pose and arrive at precisely the "
    "same upper-region pixels on the final frame. The tiny difference is only in discarded ground. "
    "This is a fixed side-on 2D game background plate, never a cinematic camera shot. "
    "The camera, crop, image plane, horizon, mountains, buildings, rooflines, doors, road "
    "stones, and every rigid landmark must stay registered to the same pixels for all 15 "
    "seconds: zero pan, lateral slide, zoom, dolly, shake, reframing, global parallax, lens "
    "effect, morphing, or exposure sweep. The horizontal ground boundary begins at pixel Y "
    "498 in this 1680 by 720 guide. Everything at Y 498 and below is context-only ground and "
    "must remain perfectly frozen; it will be discarded from the final animated asset. Only "
    "the town, forest, sky, and air above that boundary may animate. Do not add or remove any "
    "object, person, creature, bird, particle, weather, text, UI, logo, watermark, or audio. "
    "Create one true periodic ambient cycle across the full duration. The final upper region must "
    "return every tree, smoke curl, light, cloud edge, and haze value exactly to its opening phase. "
    "Motion must pass through the loop boundary smoothly without stopping, reversing, rewinding, "
    "crossfading the whole image, or resetting. "
    "Every visible forest depth participates subtly while every trunk and building stays rooted. "
)

PROFILES = (
    {
        "id": "01-mini-soft-canopy-cycle",
        "label": "Soft canopy cycle",
        "seed": 26082601,
        "direction": (
            "Let the tree canopy carry the motion. Near pine crowns complete one gentle sway "
            "cycle with displacement no greater than 0.7 percent of tree height; middle forest "
            "moves about 0.5 percent and distant treetops about 0.3 percent with small phase "
            "offsets. Existing chimney smoke curls inside a 10 pixel envelope, existing hanging "
            "lanterns and ropes swing less than one degree, and cloud edges softly reshape in "
            "place without traveling across the frame."
        ),
    },
    {
        "id": "02-mini-town-air-cycle",
        "label": "Town air cycle",
        "seed": 26082602,
        "direction": (
            "Keep tree sway especially calm, between 0.35 and 0.55 percent of tree height, but "
            "ensure near, middle, and distant forest layers all breathe. Existing chimney smoke "
            "performs a slow curl-and-return cycle within 16 pixels. Existing warm windows and "
            "lanterns fluctuate locally by no more than two percent brightness; existing hanging "
            "hardware moves less than one degree. Keep the moon, stars, buildings, road, and "
            "overall illumination fixed."
        ),
    },
    {
        "id": "03-mini-layered-night-cycle",
        "label": "Layered night cycle",
        "seed": 26082603,
        "direction": (
            "Balance several almost-imperceptible cycles: tree crowns sway 0.45 to 0.65 percent "
            "around fixed roots, existing cloud contours billow internally by only a few pixels "
            "without net travel, the existing haze behind the treeline changes opacity by about "
            "two percent, and existing smoke and lantern light gently pulse. These motions use "
            "slightly different phases but all complete a closed 15 second cycle. No layer may "
            "slide sideways as a whole."
        ),
    },
)


def variants() -> list[dict]:
    return [
        {
            **profile,
            "model": MODEL,
            "estimatedCostUsd": ESTIMATED_COST_PER_CLIP_USD,
            "prompt": SHARED_DIRECTION + profile["direction"],
        }
        for profile in PROFILES
    ]


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def safe_error(error: Exception) -> str:
    if isinstance(error, urllib.error.HTTPError):
        body = error.read().decode("utf-8", errors="replace")
        message = f"HTTP {error.code}: {body[:800]}"
    else:
        message = str(error)
    return re.sub(r"sk-or-v1-[A-Za-z0-9_-]+", "[REDACTED]", message)[:1000]


def request_json(
    url: str,
    key: str = "",
    method: str = "GET",
    payload: dict | None = None,
) -> dict:
    headers = {"Accept": "application/json"}
    if key:
        headers.update({
            "Authorization": f"Bearer {key}",
            "HTTP-Referer": "http://127.0.0.1:8136",
            "X-Title": "UNDERSTAR Surface Background Loops V2",
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


def frame_data_url(path: Path) -> str:
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def build_payload(variant: dict, start_url: str, end_url: str) -> dict:
    def frame(url: str, frame_type: str) -> dict:
        return {"type": "image_url", "image_url": {"url": url}, "frame_type": frame_type}
    return {
        "model": MODEL,
        "prompt": variant["prompt"],
        "duration": DURATION_SECONDS,
        "resolution": RESOLUTION,
        "aspect_ratio": ASPECT_RATIO,
        "generate_audio": False,
        "seed": variant["seed"],
        "frame_images": [frame(start_url, "first_frame"), frame(end_url, "last_frame")],
    }


def validate_catalog(catalog: dict) -> dict:
    model = next((item for item in catalog.get("data", []) if item.get("id") == MODEL), None)
    if not model:
        raise RuntimeError(f"Current catalog is missing {MODEL}")
    checks = (
        (DURATION_SECONDS, model.get("supported_durations") or [], "duration"),
        (RESOLUTION, model.get("supported_resolutions") or [], "resolution"),
        (ASPECT_RATIO, model.get("supported_aspect_ratios") or [], "aspect ratio"),
        ("first_frame", model.get("supported_frame_images") or [], "first frame"),
        ("last_frame", model.get("supported_frame_images") or [], "last frame"),
    )
    for expected, supported, label in checks:
        if expected not in supported:
            raise RuntimeError(f"{MODEL} no longer supports {label}: {expected}")
    keys = (
        "id", "name", "supported_resolutions", "supported_durations",
        "supported_aspect_ratios", "supported_sizes", "supported_frame_images",
        "generate_audio", "pricing_skus", "allowed_passthrough_parameters",
    )
    return {
        "capturedAt": datetime.now(timezone.utc).isoformat(),
        "model": {key: model.get(key) for key in keys},
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--estimate-budget-usd", type=float, default=DEFAULT_ESTIMATE_BUDGET_USD)
    parser.add_argument("--max-wait-sec", type=int, default=2400)
    parser.add_argument("--key-stdin", action="store_true")
    parser.add_argument("--only", action="append", choices=[item["id"] for item in PROFILES])
    args = parser.parse_args()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    matrix = variants()
    if args.only:
        selected = set(args.only)
        matrix = [item for item in matrix if item["id"] in selected]
    estimate = sum(item["estimatedCostUsd"] for item in matrix)
    if estimate > args.estimate_budget_usd:
        raise RuntimeError(f"Estimate ${estimate:.2f} exceeds budget ${args.estimate_budget_usd:.2f}")
    for frame_path in (START_FRAME, END_FRAME):
        if not frame_path.exists():
            raise FileNotFoundError(frame_path)

    catalog = validate_catalog(request_json(f"{OPENROUTER}/videos/models"))
    write_json(CATALOG_PATH, catalog)
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key and args.key_stdin:
        key = getpass.getpass("OpenRouter key (not stored): ").strip()
    if not key:
        print("Missing OpenRouter key; no requests submitted.")
        return 2

    state = json.loads(JOBS_PATH.read_text(encoding="utf-8")) if JOBS_PATH.exists() else {"jobs": {}}
    jobs = state.setdefault("jobs", {})
    started_at = datetime.now(timezone.utc).isoformat()
    start_url = frame_data_url(START_FRAME)
    end_url = frame_data_url(END_FRAME)
    for variant in matrix:
        if variant["id"] in jobs:
            continue
        print(f"Submitting {variant['id']} via {MODEL}", flush=True)
        try:
            response = request_json(
                f"{OPENROUTER}/videos", key, "POST", build_payload(variant, start_url, end_url)
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
            "schemaVersion": "surface-background-seedance-generation-v2",
            "state": "polling" if pending else "complete",
            "startedAt": started_at,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "estimatedCostUsd": estimate,
            "knownCostUsd": known_cost,
            "startFrame": START_FRAME.relative_to(ROOT).as_posix(),
            "startFrameSha256": hashlib.sha256(START_FRAME.read_bytes()).hexdigest(),
            "endFrame": END_FRAME.relative_to(ROOT).as_posix(),
            "endFrameSha256": hashlib.sha256(END_FRAME.read_bytes()).hexdigest(),
            "model": MODEL,
            "durationSeconds": DURATION_SECONDS,
            "aspectRatio": ASPECT_RATIO,
            "animatedCrop": [0, 0, 1680, ANIMATED_HEIGHT],
            "loopStrategy": (
                "separate anchors with pixel-identical animated regions; true cycle; no ping-pong"
            ),
            "apiKeyStored": False,
            "results": [results[item["id"]] for item in matrix],
        })
        if pending == 0:
            break
        print(f"Waiting on {pending} Seedance job(s)...", flush=True)
        time.sleep(15)
    else:
        raise TimeoutError("Timed out while waiting for Seedance jobs")

    completed = [item for item in results.values() if item.get("status") == "completed"]
    print(json.dumps({
        "completed": len(completed),
        "failed": len(results) - len(completed),
        "estimatedCostUsd": estimate,
        "knownCostUsd": sum(
            float((item.get("poll", {}).get("usage") or {}).get("cost") or 0)
            for item in completed
        ),
        "outputs": [item["output"] for item in completed],
    }, indent=2))
    return 0 if len(completed) == len(matrix) else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(safe_error(error), file=os.sys.stderr)
        raise SystemExit(1)
