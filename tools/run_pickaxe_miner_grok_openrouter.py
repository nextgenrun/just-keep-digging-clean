from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "sprites" / "character" / "pickaxe-miner-v1"
LAB_DIR = ASSET_DIR / "openrouter-lab" / "eur050-grok-imagen"
PAYLOAD_DIR = LAB_DIR / "payloads"
VIDEOS_DIR = LAB_DIR / "videos"
FRAMES_DIR = LAB_DIR / "extracted-frames"
SUBMITTED_PATH = LAB_DIR / "submitted-jobs.json"
POLL_PATH = LAB_DIR / "poll-results.json"

OPENROUTER_VIDEO_ENDPOINT = "https://openrouter.ai/api/v1/videos"
DEFAULT_BUDGET_USD = 0.54
ESTIMATED_COST_USD = 0.102
PRIORITY = ["dig", "idle", "walk"]


def request_json(url: str, api_key: str, method: str = "GET", payload: dict | None = None) -> dict:
    data = None
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "HTTP-Referer": "http://127.0.0.1:8081/testing/animation-sandbox/tanktest-v1/index.html",
        "X-Title": "Pickaxe Miner V1 EUR050 Animation Sandbox",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {error.code} from {url}: {body}") from error


def download(url: str, api_key: str, out_path: Path) -> None:
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {api_key}",
        "Accept": "video/mp4,application/octet-stream,*/*",
    })
    with urllib.request.urlopen(req, timeout=180) as response:
        out_path.write_bytes(response.read())


def extract_frames(animation: str, video_path: Path) -> Path:
    frames_dir = FRAMES_DIR / animation
    frames_dir.mkdir(parents=True, exist_ok=True)
    for old in frames_dir.glob("frame-*.png"):
        old.unlink()
    try:
        import cv2  # type: ignore

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise RuntimeError(f"Could not open video: {video_path}")
        source_fps = cap.get(cv2.CAP_PROP_FPS) or 24
        stride = max(1, round(source_fps / 10))
        source_index = 0
        out_index = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if source_index % stride == 0:
                cv2.imwrite(str(frames_dir / f"frame-{out_index:03d}.png"), frame)
                out_index += 1
            source_index += 1
        cap.release()
        if out_index == 0:
            raise RuntimeError(f"No frames extracted from {video_path}")
    except Exception:
        subprocess.run([
            "ffmpeg",
            "-y",
            "-i",
            str(video_path),
            "-vf",
            "fps=10",
            str(frames_dir / "frame-%03d.png"),
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return frames_dir


def payloads_in_priority() -> list[tuple[str, Path]]:
    out = []
    for animation in PRIORITY:
        path = PAYLOAD_DIR / f"pickaxe-miner-{animation}.json"
        if path.exists():
            out.append((animation, path))
    return out


def submit_and_poll(api_key: str, budget_usd: float, max_wait_sec: int, force_submit: bool) -> list[dict]:
    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
    FRAMES_DIR.mkdir(parents=True, exist_ok=True)
    if force_submit:
        for path in (SUBMITTED_PATH, POLL_PATH):
            if path.exists():
                path.unlink()

    jobs: list[dict] = []
    if SUBMITTED_PATH.exists():
        jobs = json.loads(SUBMITTED_PATH.read_text(encoding="utf-8")).get("jobs", [])
    else:
        planned = payloads_in_priority()
        if ESTIMATED_COST_USD * len(planned) > budget_usd:
            raise RuntimeError("Planned pickaxe miner run exceeds budget before submission.")
        for animation, payload_path in planned:
            print(f"Submitting {animation}...")
            payload = json.loads(payload_path.read_text(encoding="utf-8"))
            response = request_json(OPENROUTER_VIDEO_ENDPOINT, api_key, method="POST", payload=payload)
            jobs.append({
                "animation": animation,
                "payloadPath": str(payload_path.relative_to(ROOT)).replace("\\", "/"),
                "response": response,
            })
            SUBMITTED_PATH.write_text(json.dumps({
                "runId": "pickaxe-miner-v1-eur050",
                "budgetUsd": budget_usd,
                "estimatedCostUsdPerJob": ESTIMATED_COST_USD,
                "jobs": jobs,
            }, indent=2), encoding="utf-8")

    deadline = time.time() + max_wait_sec
    total_known_cost = 0.0
    results_by_animation: dict[str, dict] = {}
    while time.time() < deadline:
        all_done = True
        for job in jobs:
            animation = job["animation"]
            if results_by_animation.get(animation, {}).get("status") == "completed":
                continue
            polling_url = job.get("response", {}).get("polling_url")
            if not polling_url:
                results_by_animation[animation] = {"animation": animation, "status": "failed", "error": "Missing polling_url"}
                continue
            poll = request_json(polling_url, api_key)
            status = poll.get("status", "unknown")
            print(f"{animation}: {status}")
            result = {"animation": animation, "status": status, "poll": poll}
            if status == "completed":
                cost = float(poll.get("usage", {}).get("cost") or 0)
                total_known_cost += cost
                if total_known_cost > budget_usd:
                    raise RuntimeError(f"Budget exceeded: ${total_known_cost:.3f} > ${budget_usd:.3f}")
                urls = poll.get("unsigned_urls") or []
                if urls:
                    video_path = VIDEOS_DIR / f"pickaxe-miner-{animation}.mp4"
                    download(urls[0], api_key, video_path)
                    frames_dir = extract_frames(animation, video_path)
                    result["video"] = str(video_path.relative_to(ROOT)).replace("\\", "/")
                    result["framesDir"] = str(frames_dir.relative_to(ROOT)).replace("\\", "/")
                    result["frameCount"] = len(list(frames_dir.glob("frame-*.png")))
            elif status not in {"failed", "cancelled", "canceled", "error"}:
                all_done = False
            results_by_animation[animation] = result

        POLL_PATH.write_text(json.dumps({
            "runId": "pickaxe-miner-v1-eur050",
            "budgetUsd": budget_usd,
            "totalKnownCostUsd": total_known_cost,
            "results": list(results_by_animation.values()),
        }, indent=2), encoding="utf-8")
        if all_done:
            return list(results_by_animation.values())
        time.sleep(8)
    raise TimeoutError("Timed out while waiting for OpenRouter pickaxe miner jobs.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Submit/poll pickaxe-miner-v1 Grok/OpenRouter jobs with a EUR0.50 cap.")
    parser.add_argument("--api-key-env", default="OPENROUTER_API_KEY")
    parser.add_argument("--budget-usd", type=float, default=DEFAULT_BUDGET_USD)
    parser.add_argument("--max-wait-sec", type=int, default=900)
    parser.add_argument("--force-submit", action="store_true")
    args = parser.parse_args()

    api_key = os.environ.get(args.api_key_env)
    if not api_key:
        print(f"Missing {args.api_key_env}", file=sys.stderr)
        sys.exit(2)
    results = submit_and_poll(api_key, args.budget_usd, args.max_wait_sec, args.force_submit)
    print(json.dumps({"results": results}, indent=2))


if __name__ == "__main__":
    main()
