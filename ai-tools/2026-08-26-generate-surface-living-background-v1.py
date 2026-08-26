"""Generate one review-only, loop-constrained surface background through OpenRouter."""

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
FRAME = MOCKUP / "2026-08-26-surface-two-row-reference-v2.png"
OUTPUT = MOCKUP / "2026-08-26-surface-living-loop-v2.mp4"
JOB_PATH = MOCKUP / "openrouter-job-v2.json"
MANIFEST_PATH = MOCKUP / "generation-manifest-v2.json"
OPENROUTER = "https://openrouter.ai/api/v1"
MODEL = "google/veo-3.1-lite"
DURATION_SECONDS = 4
PRICE_PER_SECOND_USD = 0.03
DEFAULT_BUDGET_USD = 0.15
SEED = 26082611

PROMPT = (
    "A restrained living-world loop for a side-on 2D mining game background. "
    "Preserve the supplied frame's exact settlement identity, composition, building geometry, "
    "mountains, single ground line, and uninterrupted two-tile-deep soil cross-section. Never add "
    "an underground floor, ledge, shelf, platform, straight seam, tunnel, or second boundary. "
    "Keep the camera completely locked: "
    "no pan, tilt, zoom, dolly, crop, reframing, lens change, cuts, or parallax warping. Animate only "
    "small ambient details: three or four thin chimney wisps drifting slowly, extremely gentle warm "
    "lantern breathing, barely perceptible grass tips, very slow distant cloud drift, and a handful "
    "of faint mineral or root specks below ground. The soil itself stays stable and readable. No "
    "characters, creatures, vehicles, weather event, dramatic fog, large particles, explosions, "
    "new objects, text, logo, UI, music, or audio. The first and last frames are identical; motion "
    "must ease back into the identical final frame with no snap, brightness jump, object jump, "
    "smoke reset, or harsh restart. This is gameplay scenery, not a cinematic."
)


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def safe_error(error: Exception) -> str:
    if isinstance(error, urllib.error.HTTPError):
        body = error.read().decode("utf-8", errors="replace")
        message = f"HTTP {error.code}: {body[:800]}"
    else:
        message = str(error)
    return re.sub(r"sk-or-v1-[A-Za-z0-9_-]+", "[REDACTED]", message)[:1000]


def request_json(url: str, key: str, method: str = "GET", payload: dict | None = None) -> dict:
    headers = {
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "HTTP-Referer": "http://127.0.0.1:8080",
        "X-Title": "UNDERSTAR Living Background Mockup V1",
    }
    body = None
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=180) as response:
        return json.loads(response.read().decode("utf-8"))


def download_video(url: str, key: str) -> None:
    request = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {key}", "Accept": "video/mp4,*/*"},
    )
    with urllib.request.urlopen(request, timeout=300) as response:
        OUTPUT.write_bytes(response.read())


def frame_data_url() -> str:
    encoded = base64.b64encode(FRAME.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def build_payload() -> dict:
    frame_url = frame_data_url()
    return {
        "model": MODEL,
        "prompt": PROMPT,
        "duration": DURATION_SECONDS,
        "resolution": "720p",
        "aspect_ratio": "16:9",
        "generate_audio": False,
        "seed": SEED,
        "frame_images": [
            {
                "type": "image_url",
                "image_url": {"url": frame_url},
                "frame_type": "first_frame",
            },
            {
                "type": "image_url",
                "image_url": {"url": frame_url},
                "frame_type": "last_frame",
            },
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--budget-usd", type=float, default=DEFAULT_BUDGET_USD)
    parser.add_argument("--max-wait-sec", type=int, default=1200)
    parser.add_argument("--key-stdin", action="store_true")
    args = parser.parse_args()

    estimated_cost = DURATION_SECONDS * PRICE_PER_SECOND_USD
    if estimated_cost > args.budget_usd:
        raise RuntimeError(
            f"Estimated cost ${estimated_cost:.2f} exceeds hard cap ${args.budget_usd:.2f}"
        )
    if not FRAME.exists():
        raise FileNotFoundError(FRAME)

    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key and args.key_stdin:
        key = getpass.getpass("OpenRouter key (not stored): ").strip()
    if not key:
        print("Missing OpenRouter key; no request submitted.")
        return 2

    started_at = datetime.now(timezone.utc).isoformat()
    if JOB_PATH.exists():
        job = json.loads(JOB_PATH.read_text(encoding="utf-8"))
        print(f"Resuming OpenRouter job {job.get('id', 'unknown')}", flush=True)
    else:
        print(
            f"Submitting one {DURATION_SECONDS}s 720p silent loop; "
            f"estimated cost ${estimated_cost:.2f}",
            flush=True,
        )
        job = request_json(f"{OPENROUTER}/videos", key, "POST", build_payload())
        write_json(JOB_PATH, job)

    polling_url = job.get("polling_url")
    if not polling_url:
        raise RuntimeError(f"OpenRouter response omitted polling_url: {job}")
    polling_url = urllib.parse.urljoin(f"{OPENROUTER}/", polling_url)
    deadline = time.time() + args.max_wait_sec
    poll: dict = {}

    while time.time() < deadline:
        poll = request_json(polling_url, key)
        status = poll.get("status", "unknown")
        print(f"OpenRouter video status: {status}", flush=True)
        if status == "completed":
            break
        if status in {"failed", "cancelled", "canceled", "error", "expired"}:
            raise RuntimeError(poll.get("error") or f"OpenRouter job ended as {status}")
        time.sleep(8)
    else:
        raise TimeoutError("Timed out while waiting for the OpenRouter video job")

    urls = poll.get("unsigned_urls") or []
    if not urls:
        raise RuntimeError("Completed OpenRouter job did not provide a content URL")
    download_video(urls[0], key)
    if OUTPUT.stat().st_size < 10_000:
        raise RuntimeError("Downloaded video is unexpectedly small")

    known_cost = float((poll.get("usage") or {}).get("cost") or 0)
    manifest = {
        "schemaVersion": 1,
        "startedAt": started_at,
        "completedAt": datetime.now(timezone.utc).isoformat(),
        "model": MODEL,
        "durationSeconds": DURATION_SECONDS,
        "resolution": "720p",
        "aspectRatio": "16:9",
        "generateAudio": False,
        "seed": SEED,
        "hardBudgetUsd": args.budget_usd,
        "estimatedCostUsd": estimated_cost,
        "knownCostUsd": known_cost,
        "prompt": PROMPT,
        "referenceFrame": FRAME.relative_to(ROOT).as_posix(),
        "referenceSha256": hashlib.sha256(FRAME.read_bytes()).hexdigest(),
        "output": OUTPUT.relative_to(ROOT).as_posix(),
        "outputSha256": hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
        "outputBytes": OUTPUT.stat().st_size,
        "apiKeyStored": False,
        "jobId": poll.get("id") or job.get("id"),
    }
    write_json(MANIFEST_PATH, manifest)
    print(json.dumps({
        "output": manifest["output"],
        "knownCostUsd": known_cost,
        "bytes": manifest["outputBytes"],
        "sha256": manifest["outputSha256"],
    }, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(safe_error(error), file=os.sys.stderr)
        raise SystemExit(1)
