"""Generate budget-capped OpenRouter source clips for Star Block idle motion."""

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

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "sprites/environment/star-block-idle-v1"
SOURCE = PACKAGE / "source"
CLIPS = SOURCE / "clips"
REFERENCES = SOURCE / "references"
PLAN_PATH = SOURCE / "request-plan.json"
JOBS_PATH = SOURCE / "openrouter-jobs.json"
MANIFEST_PATH = SOURCE / "generation-manifest.json"
OPENROUTER = "https://openrouter.ai/api/v1"
VIDEO_MODEL = "google/veo-3.1-lite"
DURATION_SECONDS = 4
VIDEO_PRICE_PER_SECOND_USD = 0.03
DEFAULT_BUDGET_USD = 0.75
REFERENCE_ATLAS = ROOT / (
    "sprites/environment/star-identities-v2/"
    "star-identities-common-atlas-v2.png"
)
REFERENCE_FRAME_INDEX = 2
REFERENCE_FRAME_SIZE = 256


SHARED_DIRECTION = (
    "Locked orthographic 2D game-sprite study on a perfectly pure black background. "
    "The exact centered crystal Star remains fixed in position, silhouette, size, palette, "
    "orientation, and five-point geometry. Animate only light travelling inside the existing "
    "facets and sparse energy already inside its halo. Static camera. Seamless four-second "
    "idle loop whose first and last frame match exactly. No zoom, crop, translation, rotation, "
    "shape morph, new object, extra star, scenery, floor, UI, text, logo, visible watermark, "
    "color shift, explosion, fracture, or camera motion."
)

VARIANTS = (
    {
        "id": "facet-sweep",
        "seed": 26082631,
        "prompt": (
            "A narrow silver-white refracted highlight travels slowly across the inner facets "
            "from upper left to lower right, then settles. Two tiny points glint inside the halo."
        ),
    },
    {
        "id": "core-breath",
        "seed": 26082632,
        "prompt": (
            "The white inner core takes one restrained luminous breath while thin internal "
            "caustic threads circulate a few degrees and return to their starting positions."
        ),
    },
    {
        "id": "stardust-orbit",
        "seed": 26082633,
        "prompt": (
            "Five sparse white micro-motes drift once around the existing halo while one tiny "
            "facet glint crosses the center. The crystal body itself remains completely still."
        ),
    },
)


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def safe_error(error: Exception) -> str:
    if isinstance(error, urllib.error.HTTPError):
        body = error.read().decode("utf-8", errors="replace")
        message = f"HTTP {error.code}: {body[:600]}"
    else:
        message = str(error)
    return re.sub(r"sk-or-v1-[A-Za-z0-9_-]+", "[REDACTED]", message)[:700]


def request_json(url: str, key: str, method: str = "GET", payload: dict | None = None) -> dict:
    resolved_url = urllib.parse.urljoin(f"{OPENROUTER}/", url)
    headers = {
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "HTTP-Referer": "http://127.0.0.1:8080",
        "X-Title": "UNDERSTAR Star Block Idle V1",
    }
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(resolved_url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=180) as response:
        return json.loads(response.read().decode("utf-8"))


def download(url: str, key: str, path: Path) -> None:
    request = urllib.request.Request(
        urllib.parse.urljoin(f"{OPENROUTER}/", url),
        headers={"Authorization": f"Bearer {key}", "Accept": "video/mp4,*/*"},
    )
    with urllib.request.urlopen(request, timeout=300) as response:
        path.write_bytes(response.read())


def prepare_reference() -> Path:
    output = REFERENCES / "neutral-star-idle-first-last.png"
    with Image.open(REFERENCE_ATLAS) as atlas:
        x = (REFERENCE_FRAME_INDEX % 10) * REFERENCE_FRAME_SIZE
        y = (REFERENCE_FRAME_INDEX // 10) * REFERENCE_FRAME_SIZE
        star = atlas.crop((x, y, x + REFERENCE_FRAME_SIZE, y + REFERENCE_FRAME_SIZE))
        star.thumbnail((480, 480), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (1280, 720), "black")
        alpha = star.getchannel("A") if star.mode == "RGBA" else None
        canvas.paste(star.convert("RGB"), ((1280 - star.width) // 2, (720 - star.height) // 2), alpha)
        canvas.save(output, optimize=True)
    return output


def data_url(path: Path) -> str:
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def payload_for(variant: dict, reference: Path) -> dict:
    encoded = data_url(reference)
    return {
        "model": VIDEO_MODEL,
        "prompt": f"{SHARED_DIRECTION} {variant['prompt']}",
        "duration": DURATION_SECONDS,
        "resolution": "720p",
        "aspect_ratio": "16:9",
        "generate_audio": False,
        "seed": variant["seed"],
        "frame_images": [
            {"type": "image_url", "image_url": {"url": encoded}, "frame_type": "first_frame"},
            {"type": "image_url", "image_url": {"url": encoded}, "frame_type": "last_frame"},
        ],
    }


def validate_model(key: str) -> dict:
    response = request_json(f"{OPENROUTER}/videos/models", key)
    model = next((item for item in response.get("data", []) if item.get("id") == VIDEO_MODEL), None)
    if not model:
        raise RuntimeError(f"OpenRouter video model is unavailable: {VIDEO_MODEL}")
    required = {
        "supported_durations": DURATION_SECONDS,
        "supported_resolutions": "720p",
        "supported_aspect_ratios": "16:9",
        "supported_frame_images": "first_frame",
    }
    for field, value in required.items():
        if value not in (model.get(field) or []):
            raise RuntimeError(f"{VIDEO_MODEL} no longer supports required {field}={value}")
    return model


def poll_job(job: dict, key: str, deadline: float) -> dict:
    while time.time() < deadline:
        poll = request_json(job["response"]["polling_url"], key)
        status = poll.get("status", "unknown")
        if status in {"completed", "failed", "cancelled", "canceled", "error"}:
            return poll
        print(f"Waiting for {job['variantId']} ({status})...", flush=True)
        time.sleep(8)
    raise TimeoutError(f"Timed out waiting for OpenRouter job {job['variantId']}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--budget-usd", type=float, default=DEFAULT_BUDGET_USD)
    parser.add_argument("--max-wait-sec", type=int, default=1200)
    parser.add_argument("--key-stdin", action="store_true")
    args = parser.parse_args()
    for directory in (SOURCE, CLIPS, REFERENCES):
        directory.mkdir(parents=True, exist_ok=True)

    estimated = len(VARIANTS) * DURATION_SECONDS * VIDEO_PRICE_PER_SECOND_USD
    if estimated > args.budget_usd:
        raise RuntimeError(f"Planned cost ${estimated:.2f} exceeds hard cap ${args.budget_usd:.2f}")
    reference = prepare_reference()
    write_json(PLAN_PATH, {
        "schemaVersion": 1,
        "model": VIDEO_MODEL,
        "hardBudgetUsd": args.budget_usd,
        "estimatedVideoCostUsd": round(estimated, 2),
        "priceAssumptionUsdPerSecond720pNoAudio": VIDEO_PRICE_PER_SECOND_USD,
        "durationSeconds": DURATION_SECONDS,
        "resolution": "720p",
        "aspectRatio": "16:9",
        "generateAudio": False,
        "reference": reference.relative_to(ROOT).as_posix(),
        "variants": [{**item, "fullPrompt": f"{SHARED_DIRECTION} {item['prompt']}"} for item in VARIANTS],
    })

    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key and args.key_stdin:
        key = getpass.getpass("OpenRouter key (not stored): ").strip()
    if not key:
        print("Missing OpenRouter key; prepared the request plan and reference only.", flush=True)
        return 2

    started = datetime.now(timezone.utc).isoformat()
    model_metadata = validate_model(key)
    state = json.loads(JOBS_PATH.read_text(encoding="utf-8")) if JOBS_PATH.exists() else {"jobs": []}
    jobs = {item["variantId"]: item for item in state.get("jobs", [])}
    results = []
    known_cost = 0.0

    for variant in VARIANTS:
        estimated_next = DURATION_SECONDS * VIDEO_PRICE_PER_SECOND_USD
        if variant["id"] not in jobs:
            if known_cost + estimated_next > args.budget_usd:
                raise RuntimeError("Remaining hard budget is insufficient for the next source clip")
            print(f"Submitting {variant['id']} (estimated ${estimated_next:.2f})", flush=True)
            response = request_json(
                f"{OPENROUTER}/videos",
                key,
                "POST",
                payload_for(variant, reference),
            )
            jobs[variant["id"]] = {"variantId": variant["id"], "response": response}
            write_json(JOBS_PATH, {"model": VIDEO_MODEL, "jobs": list(jobs.values())})

        job = jobs[variant["id"]]
        poll = poll_job(job, key, time.time() + args.max_wait_sec)
        status = poll.get("status", "unknown")
        result = {"variantId": variant["id"], "status": status, "poll": poll}
        if status == "completed":
            output = CLIPS / f"{variant['id']}.mp4"
            if not output.exists() or output.stat().st_size < 10_000:
                urls = poll.get("unsigned_urls") or []
                content_url = urls[0] if urls else f"{OPENROUTER}/videos/{poll.get('id')}/content"
                download(content_url, key, output)
            result["output"] = output.relative_to(ROOT).as_posix()
            result["sha256"] = hashlib.sha256(output.read_bytes()).hexdigest()
            print(f"Completed {variant['id']}", flush=True)
        else:
            print(f"Failed {variant['id']}: {poll.get('error', 'unknown error')}", flush=True)
        known_cost += float(poll.get("usage", {}).get("cost") or 0)
        results.append(result)
        write_json(MANIFEST_PATH, {"state": "polling", "results": results, "apiKeyStored": False})
        if known_cost > args.budget_usd:
            raise RuntimeError(f"Known OpenRouter cost ${known_cost:.2f} exceeded cap ${args.budget_usd:.2f}")

    manifest = {
        "schemaVersion": 1,
        "startedAt": started,
        "completedAt": datetime.now(timezone.utc).isoformat(),
        "model": VIDEO_MODEL,
        "hardBudgetUsd": args.budget_usd,
        "estimatedVideoCostUsd": round(estimated, 2),
        "knownVideoCostUsd": round(known_cost, 6),
        "modelCapabilities": {
            key: model_metadata.get(key)
            for key in (
                "supported_durations", "supported_resolutions", "supported_aspect_ratios",
                "supported_frame_images", "generate_audio", "pricing_skus",
            )
        },
        "results": results,
        "apiKeyStored": False,
    }
    write_json(MANIFEST_PATH, manifest)
    failures = [item for item in results if item.get("status") != "completed"]
    print(json.dumps({
        "knownVideoCostUsd": known_cost,
        "completedVideos": len(results) - len(failures),
        "failures": len(failures),
        "apiKeyStored": False,
    }, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
