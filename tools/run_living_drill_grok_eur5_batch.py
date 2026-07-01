from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "sprites" / "character" / "living-drill-v1"
LAB_DIR = ASSET_DIR / "openrouter-lab" / "eur5-grok-imagen"
PAYLOAD_DIR = LAB_DIR / "payloads"
VIDEOS_DIR = LAB_DIR / "videos"
FRAMES_DIR = LAB_DIR / "extracted-frames"
REFERENCE_IMAGE = ASSET_DIR / "reference" / "living-drill-api-anchor-480.png"
SUBMITTED_PATH = LAB_DIR / "submitted-jobs.json"
POLL_PATH = LAB_DIR / "poll-results.json"

OPENROUTER_VIDEO_ENDPOINT = "https://openrouter.ai/api/v1/videos"
MODEL = "x-ai/grok-imagine-video"
DEFAULT_BUDGET_USD = 5.35
ESTIMATED_COST_USD = 0.052

JOBS = {
    "idle-hover": {
        "duration": 2,
        "fps": 8,
        "prompt": (
            "Create a clean 2D pixel-art sprite animation for the exact supplied living drill character. "
            "State: idle-hover loop. The body is a one-tile living drill head, side view facing right, "
            "rounded white rear shell, segmented gray cone drill nose, black pixel outline, small blue rear/bottom thrust. "
            "LOCKED RULES: body anchor stays exactly centered, body size never changes, silhouette never redesigns, "
            "no camera movement, no zoom, no rotation, no extra limbs, no tank tread, no background scene. "
            "Only animate tiny hover bob, drill highlight shimmer, and soft blue flame flicker. "
            "The animation must loop smoothly and remain the same grayscale palette as the reference."
        ),
    },
    "fly-hover": {
        "duration": 2,
        "fps": 8,
        "prompt": (
            "Create a clean 2D pixel-art sprite animation for the exact supplied living drill character. "
            "State: fly-hover loop. Same one-tile drill creature, side view facing right, white shell, gray drill cone, black outline. "
            "LOCKED RULES: body anchor stays exactly centered, body size never changes, no squash/stretch, no redesign, no camera movement. "
            "Animate only rear blue flame and bottom hover thrust pulsing with a tiny readable hover motion. "
            "Keep the drill body stable and do not let thrust pixels affect body placement."
        ),
    },
    "dig-bite-loop": {
        "duration": 2,
        "fps": 10,
        "prompt": (
            "Create the most important 2D pixel-art sprite animation for the supplied living drill character. "
            "State: dig-bite loop. The whole character is the drill head and grinds into a block in front of it. "
            "LOCKED RULES: same centered body anchor, same body size, same silhouette, no new parts, no separate drill arm, "
            "no color drift, no background scene, no camera movement. "
            "Do not draw the block itself inside the sprite frame; only draw the living drill character and small effect pixels attached to its drill tip. "
            "Animate drill cone bands spinning, strong but tiny 1 pixel vibration, sparks and dust appearing on the front/right edge, "
            "and a convincing grinding bite. The body can visually lean forward very slightly but must remain centered for sprite export."
        ),
    },
    "dig-contact-break-recoil": {
        "duration": 2,
        "fps": 10,
        "prompt": (
            "Create a 2D pixel-art transition animation for the exact supplied living drill character. "
            "State: contact, fracture, break, recoil. The living drill touches a block, sparks/cracks intensify, then recoils smoothly. "
            "LOCKED RULES: body anchor remains centered, body size and silhouette remain constant, no redesign, no tank tread, "
            "no separate drill arm, no camera motion, no background scene. "
            "Do not draw the block/tile inside the sprite frame; the game engine draws tiles separately. "
            "Focus on readable drilling energy: cone band spin, dust, small spark bursts, and a smooth recoil that returns to idle without snapping."
        ),
    },
}

ANCHOR_CONTRACT = (
    "HARD ANCHOR CONTRACT FOR EVERY FRAME: use the supplied anchor image as a locked sprite sheet reference, not as loose concept art. "
    "The red crosshair/tile center is the fixed gameplay anchor at the cabin/body pivot. "
    "The body anchor, body bounding box, drill tip position, black outline thickness, grayscale palette, shell shape, and drill cone segmentation must remain identical in every frame. "
    "Do not zoom, resize, crop, rotate, squash, stretch, redraw, recolor, restyle, or shift the character. "
    "Blue flame, dust, sparks, and highlights are effect pixels only and must not move or resize the body. "
    "Keep a stable 1:1 camera and a plain light background. "
    "Do not draw terrain, blocks, target tiles, walls, UI, shadows, or any environmental object inside the sprite frame. "
    "Animation may only change drill band highlights, flame intensity, dust/sparks, and at most a tiny one-pixel vibration."
)


def data_url(path: Path) -> str:
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def ensure_dirs() -> None:
    for directory in (PAYLOAD_DIR, VIDEOS_DIR, FRAMES_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def job_names(only: list[str] | None = None) -> list[str]:
    if not only:
        return list(JOBS)
    unknown = [name for name in only if name not in JOBS]
    if unknown:
        raise ValueError(f"Unknown job(s): {', '.join(unknown)}")
    return only


def write_payloads(only: list[str] | None = None) -> None:
    ensure_dirs()
    reference_url = data_url(REFERENCE_IMAGE)
    payload_index: dict[str, str] = {}
    for name in job_names(only):
        spec = JOBS[name]
        payload = {
            "model": MODEL,
            "prompt": f"{ANCHOR_CONTRACT} {spec['prompt']}",
            "duration": spec["duration"],
            "resolution": "480p",
            "aspect_ratio": "1:1",
            "generate_audio": False,
            "frame_images": [{
                "type": "image_url",
                "image_url": {"url": reference_url},
                "frame_type": "first_frame",
            }],
        }
        payload_path = PAYLOAD_DIR / f"living-drill-{name}.json"
        payload_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        payload_index[name] = str(payload_path.relative_to(ROOT)).replace("\\", "/")

    (LAB_DIR / "eur5-plan.json").write_text(json.dumps({
        "schemaVersion": 1,
        "budgetUsd": DEFAULT_BUDGET_USD,
        "model": MODEL,
        "jobs": job_names(only),
        "payloads": payload_index,
        "acceptance": [
            "Reject frames where body size changes.",
            "Reject frames where body anchor drifts from 47,47.",
            "Reject frames where the shell, drill cone, palette, or silhouette is redesigned.",
            "Prefer stable body over flashy effects.",
        ],
    }, indent=2), encoding="utf-8")


def request_json(url: str, api_key: str, method: str = "GET", payload: dict | None = None) -> dict:
    data = None
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "HTTP-Referer": "http://127.0.0.1:8081/testing/animation-sandbox/tanktest-v1/index.html",
        "X-Title": "Living Drill V1 EUR5 Animation Batch",
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
            "fps=10",
            str(frames_dir / "frame-%03d.png"),
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return frames_dir


def submit_and_poll(api_key: str, budget_usd: float, max_wait_sec: int, force_submit: bool, only: list[str] | None = None) -> list[dict]:
    ensure_dirs()
    write_payloads(only)
    if force_submit:
        for path in (SUBMITTED_PATH, POLL_PATH):
            if path.exists():
                path.unlink()

    jobs: list[dict] = []
    if SUBMITTED_PATH.exists():
        jobs = json.loads(SUBMITTED_PATH.read_text(encoding="utf-8")).get("jobs", [])
    else:
        for index, name in enumerate(job_names(only)):
            if ESTIMATED_COST_USD * (index + 1) > budget_usd:
                break
            payload_path = PAYLOAD_DIR / f"living-drill-{name}.json"
            payload = json.loads(payload_path.read_text(encoding="utf-8"))
            print(f"Submitting {name}...")
            response = request_json(OPENROUTER_VIDEO_ENDPOINT, api_key, method="POST", payload=payload)
            jobs.append({
                "animation": name,
                "payloadPath": str(payload_path.relative_to(ROOT)).replace("\\", "/"),
                "response": response,
            })
            SUBMITTED_PATH.write_text(json.dumps({
                "runId": "living-drill-v1-eur5",
                "budgetUsd": budget_usd,
                "estimatedCostUsdPerJob": ESTIMATED_COST_USD,
                "jobs": jobs,
            }, indent=2), encoding="utf-8")

    results_by_animation: dict[str, dict] = {}
    total_known_cost = 0.0
    deadline = time.time() + max_wait_sec
    while time.time() < deadline:
        all_done = True
        for job in jobs:
            name = job["animation"]
            existing = results_by_animation.get(name)
            if existing and existing.get("status") == "completed":
                continue
            polling_url = job.get("response", {}).get("polling_url")
            if not polling_url:
                results_by_animation[name] = {"animation": name, "status": "failed", "error": "Missing polling_url"}
                continue
            poll = request_json(polling_url, api_key)
            status = poll.get("status", "unknown")
            print(f"{name}: {status}")
            result = {"animation": name, "status": status, "poll": poll}
            if status == "completed":
                cost = float(poll.get("usage", {}).get("cost") or 0)
                total_known_cost += cost
                if total_known_cost > budget_usd:
                    raise RuntimeError(f"Budget exceeded: ${total_known_cost:.3f} > ${budget_usd:.3f}")
                urls = poll.get("unsigned_urls") or []
                if urls:
                    video_path = VIDEOS_DIR / f"living-drill-{name}.mp4"
                    download(urls[0], api_key, video_path)
                    frames_dir = extract_frames(name, video_path)
                    result["video"] = str(video_path.relative_to(ROOT)).replace("\\", "/")
                    result["framesDir"] = str(frames_dir.relative_to(ROOT)).replace("\\", "/")
                    result["frameCount"] = len(list(frames_dir.glob("frame-*.png")))
            elif status not in {"failed", "cancelled", "canceled", "error"}:
                all_done = False
            results_by_animation[name] = result

        POLL_PATH.write_text(json.dumps({
            "runId": "living-drill-v1-eur5",
            "budgetUsd": budget_usd,
            "totalKnownCostUsd": total_known_cost,
            "results": list(results_by_animation.values()),
        }, indent=2), encoding="utf-8")
        if all_done:
            return list(results_by_animation.values())
        time.sleep(8)
    raise TimeoutError("Timed out while waiting for OpenRouter video jobs.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run living-drill-v1 extra Grok animation batch under a budget cap.")
    parser.add_argument("--api-key-env", default="OPENROUTER_API_KEY")
    parser.add_argument("--budget-usd", type=float, default=DEFAULT_BUDGET_USD)
    parser.add_argument("--max-wait-sec", type=int, default=1200)
    parser.add_argument("--force-submit", action="store_true")
    parser.add_argument("--write-payloads-only", action="store_true")
    parser.add_argument("--only", nargs="*", choices=list(JOBS), help="Submit/write only these animation jobs.")
    args = parser.parse_args()

    write_payloads(args.only)
    if args.write_payloads_only:
        print(f"Wrote payloads to {PAYLOAD_DIR}")
        return

    api_key = os.environ.get(args.api_key_env)
    if not api_key:
        print(f"Missing {args.api_key_env}", file=sys.stderr)
        sys.exit(2)

    results = submit_and_poll(api_key, args.budget_usd, args.max_wait_sec, args.force_submit, args.only)
    print(json.dumps({"results": results}, indent=2))


if __name__ == "__main__":
    main()
