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
LAB_DIR = ROOT / "sprites" / "character" / "living-drill-v1" / "openrouter-lab" / "eur1-grok-imagen"
PAYLOAD_DIR = LAB_DIR / "payloads"
VIDEOS_DIR = LAB_DIR / "videos"
FRAMES_DIR = LAB_DIR / "extracted-frames"
SUBMITTED_PATH = LAB_DIR / "submitted-jobs.json"
POLL_PATH = LAB_DIR / "poll-results.json"

OPENROUTER_VIDEO_ENDPOINT = "https://openrouter.ai/api/v1/videos"
DEFAULT_BUDGET_USD = 1.08
ESTIMATED_PREVIOUS_COST = 0.052


def request_json(url: str, api_key: str, method: str = "GET", payload: dict | None = None) -> dict:
    data = None
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "HTTP-Referer": "http://127.0.0.1:8081/testing/animation-sandbox/tanktest-v1/index.html",
        "X-Title": "Living Drill V1 EUR1 Animation Sandbox",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {error.code} from {url}: {body}") from error


def download(url: str, api_key: str, out_path: Path) -> None:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "video/mp4,application/octet-stream,*/*",
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=120) as response:
        out_path.write_bytes(response.read())


def payloads_in_priority() -> list[tuple[str, Path]]:
    priority = ["dig", "idle", "fly"]
    out = []
    for name in priority:
        path = PAYLOAD_DIR / f"living-drill-{name}.json"
        if path.exists():
            out.append((name, path))
    return out


def submitted_record(budget_usd: float, jobs: list[dict], results: list[dict] | None = None) -> dict:
    return {
        "runId": "living-drill-v1-eur1",
        "budgetUsd": budget_usd,
        "estimatedPreviousCostUsd": ESTIMATED_PREVIOUS_COST,
        "jobs": jobs,
        "results": results or [],
    }


def submit_job(api_key: str, budget_usd: float, jobs: list[dict], animation: str, payload_path: Path) -> dict:
    if ESTIMATED_PREVIOUS_COST * (len(jobs) + 1) > budget_usd:
        raise RuntimeError("Next planned run would exceed configured budget before submission.")
    payload = json.loads(payload_path.read_text(encoding="utf-8"))
    print(f"Submitting {animation}...")
    response = request_json(OPENROUTER_VIDEO_ENDPOINT, api_key, method="POST", payload=payload)
    job = {
        "animation": animation,
        "payloadPath": str(payload_path.relative_to(ROOT)).replace("\\", "/"),
        "response": response,
    }
    jobs.append(job)
    SUBMITTED_PATH.write_text(json.dumps(submitted_record(budget_usd, jobs), indent=2), encoding="utf-8")
    return job


def submit_jobs(api_key: str, budget_usd: float) -> list[dict]:
    LAB_DIR.mkdir(parents=True, exist_ok=True)
    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
    FRAMES_DIR.mkdir(parents=True, exist_ok=True)
    jobs = []
    planned = payloads_in_priority()
    if ESTIMATED_PREVIOUS_COST * len(planned) > budget_usd:
        raise RuntimeError("Planned run exceeds configured budget before submission.")
    for animation, payload_path in planned:
        submit_job(api_key, budget_usd, jobs, animation, payload_path)
    return jobs


def load_or_submit(api_key: str, budget_usd: float, force_submit: bool) -> list[dict]:
    if SUBMITTED_PATH.exists() and not force_submit:
        existing = json.loads(SUBMITTED_PATH.read_text(encoding="utf-8"))
        return existing.get("jobs", [])
    return submit_jobs(api_key, budget_usd)


def poll_jobs(api_key: str, jobs: list[dict], budget_usd: float, max_wait_sec: int) -> list[dict]:
    deadline = time.time() + max_wait_sec
    results_by_animation: dict[str, dict] = {}
    total_cost = 0.0
    while time.time() < deadline:
        all_done = True
        for job in jobs:
            animation = job["animation"]
            if animation in results_by_animation and results_by_animation[animation].get("status") == "completed":
                continue
            polling_url = job.get("response", {}).get("polling_url")
            if not polling_url:
                results_by_animation[animation] = {
                    "animation": animation,
                    "status": "failed",
                    "error": "Missing polling_url",
                }
                continue
            poll = request_json(polling_url, api_key)
            status = poll.get("status", "unknown")
            print(f"{animation}: {status}")
            result = {
                "animation": animation,
                "status": status,
                "poll": poll,
            }
            if status == "completed":
                cost = float(poll.get("usage", {}).get("cost") or 0)
                total_cost += cost
                if total_cost > budget_usd:
                    raise RuntimeError(f"Budget exceeded after polling: ${total_cost:.3f} > ${budget_usd:.3f}")
                urls = poll.get("unsigned_urls") or []
                if urls:
                    video_path = VIDEOS_DIR / f"living-drill-{animation}.mp4"
                    download(urls[0], api_key, video_path)
                    result["video"] = str(video_path.relative_to(ROOT)).replace("\\", "/")
                    frames_dir = extract_frames(animation, video_path)
                    result["framesDir"] = str(frames_dir.relative_to(ROOT)).replace("\\", "/")
                    result["frameCount"] = len(list(frames_dir.glob("frame-*.png")))
            elif status in {"failed", "cancelled", "canceled", "error"}:
                pass
            else:
                all_done = False
            results_by_animation[animation] = result
        POLL_PATH.write_text(json.dumps({
            "runId": "living-drill-v1-eur1",
            "budgetUsd": budget_usd,
            "totalKnownCostUsd": total_cost,
            "results": list(results_by_animation.values()),
        }, indent=2), encoding="utf-8")
        if all_done:
            return list(results_by_animation.values())
        time.sleep(8)
    raise TimeoutError("Timed out while waiting for OpenRouter video jobs.")


def run_sequential(api_key: str, budget_usd: float, max_wait_sec: int, force_submit: bool) -> list[dict]:
    if SUBMITTED_PATH.exists() and not force_submit:
        existing = json.loads(SUBMITTED_PATH.read_text(encoding="utf-8"))
        jobs = existing.get("jobs", [])
        return poll_jobs(api_key, jobs, budget_usd, max_wait_sec)

    if SUBMITTED_PATH.exists() and force_submit:
        SUBMITTED_PATH.unlink()
    if POLL_PATH.exists() and force_submit:
        POLL_PATH.unlink()

    jobs: list[dict] = []
    results: list[dict] = []
    total_known_cost = 0.0
    for animation, payload_path in payloads_in_priority():
        if total_known_cost + ESTIMATED_PREVIOUS_COST > budget_usd:
            print(f"Skipping {animation}: estimated next job would exceed budget.")
            break
        job = submit_job(api_key, budget_usd, jobs, animation, payload_path)
        result = poll_jobs(api_key, [job], budget_usd - total_known_cost, max_wait_sec)[0]
        results.append(result)
        if result.get("status") == "completed":
            total_known_cost += float(result.get("poll", {}).get("usage", {}).get("cost") or 0)
        SUBMITTED_PATH.write_text(json.dumps(submitted_record(budget_usd, jobs, results), indent=2), encoding="utf-8")
        if total_known_cost > budget_usd:
            raise RuntimeError(f"Budget exceeded after {animation}: ${total_known_cost:.3f} > ${budget_usd:.3f}")
    POLL_PATH.write_text(json.dumps({
        "runId": "living-drill-v1-eur1",
        "budgetUsd": budget_usd,
        "totalKnownCostUsd": total_known_cost,
        "results": results,
    }, indent=2), encoding="utf-8")
    return results


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
        stride = max(1, round(source_fps / 8))
        source_index = 0
        out_index = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if source_index % stride == 0:
                out_path = frames_dir / f"frame-{out_index:03d}.png"
                cv2.imwrite(str(out_path), frame)
                out_index += 1
            source_index += 1
        cap.release()
        if out_index == 0:
            raise RuntimeError(f"No frames extracted from {video_path}")
    except Exception:
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(video_path),
            "-vf",
            "fps=8",
            str(frames_dir / "frame-%03d.png"),
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return frames_dir


def main() -> None:
    parser = argparse.ArgumentParser(description="Submit/poll living-drill-v1 Grok/OpenRouter jobs with a budget cap.")
    parser.add_argument("--api-key-env", default="OPENROUTER_API_KEY")
    parser.add_argument("--budget-usd", type=float, default=DEFAULT_BUDGET_USD)
    parser.add_argument("--max-wait-sec", type=int, default=900)
    parser.add_argument("--force-submit", action="store_true")
    args = parser.parse_args()

    api_key = os.environ.get(args.api_key_env)
    if not api_key:
        print(f"Missing {args.api_key_env}", file=sys.stderr)
        sys.exit(2)

    results = run_sequential(api_key, args.budget_usd, args.max_wait_sec, args.force_submit)
    if not results:
        raise RuntimeError("No jobs submitted, loaded, or completed.")
    print(json.dumps({"results": results}, indent=2))


if __name__ == "__main__":
    main()
