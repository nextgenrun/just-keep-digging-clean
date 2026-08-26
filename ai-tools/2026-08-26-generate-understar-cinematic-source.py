"""Generate budget-capped OpenRouter video and narration sources for UNDERSTAR."""

from __future__ import annotations

import argparse
import base64
import getpass
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "steam-marketing/2026-08-26-cinematic-video-pack-v1"
CLIPS = PACK / "source-clips"
FRAMES = PACK / "reference-frames"
AUDIO = PACK / "audio"
PLAN_PATH = PACK / "request-plan.json"
JOBS_PATH = PACK / "openrouter-jobs.json"
MANIFEST_PATH = PACK / "generation-manifest.json"
OPENROUTER = "https://openrouter.ai/api/v1"
VIDEO_MODEL = "google/veo-3.1-lite"
TTS_MODEL = "mistralai/voxtral-mini-tts-2603"
VIDEO_PRICE_PER_SECOND_USD = 0.08
DEFAULT_BUDGET_USD = 10.0


SHARED_VIDEO_DIRECTION = (
    "Premium cinematic painterly realism matching the supplied production UNDERSTAR art; "
    "dark tactile geology, restrained cyan-violet-gold emissive light, readable silhouettes, "
    "natural atmospheric depth. Preserve the source identity and composition. One continuous "
    "shot, physically restrained motion, no cuts, no text, no logo, no UI, no watermark, no "
    "new characters, no redesign, no combat, no attack, no visual style change. Audio contains "
    "only scene ambience and physical sound effects; no speech and no music."
)

SHOTS = (
    {
        "id": "roots-descent", "duration": 6, "aspect": "16:9", "focus": (0.50, 0.50), "seed": 26082601,
        "source": "visual-approval-previews/underground-biome-motion-mockups-v1/2026-07-26-weathered-roots-root-tide-lantern-hollow.png",
        "prompt": "Slow descending crane move through immense woven roots. Lanterns sway gently, tiny grit falls, damp recesses breathe with mist, and warm root sap glints in the darkness.",
    },
    {
        "id": "rift-flight", "duration": 6, "aspect": "16:9", "focus": (0.56, 0.50), "seed": 26082602,
        "source": "steam-marketing/2026-08-16-static-upload-pack-v1/source-textless-wide-imagegen-v1.png",
        "prompt": "Slow dolly toward the cavern mouth as the lone miner rises on violet-blue Flight energy. The ancient circular machine glows at left, distant sky islands shift only through parallax, with wind, grit, embers, and a coherent luminous trail.",
    },
    {
        "id": "star-core-release", "duration": 6, "aspect": "16:9", "focus": (0.50, 0.50), "seed": 26082603,
        "source": "steam-marketing/2026-08-16-motion-pack-v1/star-block-break-release-gold-loop-v1-poster.png",
        "prompt": "A rare gold crystal Star Block fractures once and releases its exact luminous floating star core. Mineral shards decelerate, a restrained halo blooms, and the camera makes a subtle push-in. Keep the complete object centered and readable.",
    },
    {
        "id": "understar-awakening", "duration": 8, "aspect": "16:9", "focus": (0.50, 0.50), "seed": 26082604,
        "source": "sprites/backgrounds/understar-ending-v1/understar-ending-backdrop-v1.webp",
        "prompt": "The colossal buried white-gold Understar wakes with one slow pulse. Fine arcs travel across its surface, ruined rings catch the light, violet cave dust lifts, and the camera pulls back to reveal scale. Awe, not explosion or destruction.",
    },
    {
        "id": "mossback-stirs", "duration": 8, "aspect": "16:9", "focus": (0.56, 0.50), "seed": 26082605,
        "source": "sprites/backgrounds/titan-chambers-v3/01-mossback-wanderer-chamber-v3.webp",
        "prompt": "The exact colossal Mossback Wanderer remains low and harmless. Its bark-and-stone shell rises with one deep breath, one teal eye opens slowly, root-canopy branches flex, lanterns tremble, and fine grit falls during a very slow camera push.",
    },
    {
        "id": "mossback-close", "duration": 6, "aspect": "16:9", "focus": (0.67, 0.56), "seed": 26082606,
        "source": "sprites/backgrounds/titan-chambers-v3/01-mossback-wanderer-chamber-v3.webp",
        "prompt": "A low slow camera move crosses one massive forefoot toward Mossback's face. The exact turtle-like head turns only a few degrees, teal fissures brighten with its breath, and the eye focuses calmly on the unseen miner. Monumental wonder, no charge or roar.",
    },
    {
        "id": "mossback-vertical", "duration": 6, "aspect": "9:16", "focus": (0.66, 0.52), "seed": 26082607,
        "source": "sprites/backgrounds/titan-chambers-v3/01-mossback-wanderer-chamber-v3.webp",
        "prompt": "Portrait close reveal of the exact Mossback head, foreleg, shell edge, and root canopy. One teal eye opens, a deep breath moves dust and hanging roots, then the eye settles toward camera. Keep the subject centered in the portrait safe area.",
    },
    {
        "id": "rift-flight-vertical", "duration": 6, "aspect": "9:16", "focus": (0.73, 0.50), "seed": 26082608,
        "source": "steam-marketing/2026-08-16-static-upload-pack-v1/source-textless-wide-imagegen-v1.png",
        "prompt": "Portrait tracking shot following the lone miner rising through the cavern opening on violet-blue Flight energy. Mountains and floating islands layer behind the silhouette while dust and the coherent energy trail stream downward. Keep the miner centered in the portrait safe area.",
    },
)

VOICE_JOBS = (
    ("opening", "gb_oliver_curious", "Below the last light, the mine remembers every path. Dig. Return. Grow stronger. Then descend, where earth, sky, and starlight meet. The Understar is waiting."),
    ("mossback", "gb_oliver_curious", "That is not a statue. It is breathing."),
    ("trailer", "gb_oliver_confident", "Every descent is a decision. Every return makes you stronger. Master Flight. Find the Titans. Wake the Understar. Wishlist Understar on Steam."),
    ("short-mossback", "gb_oliver_curious", "At ninety meters, the roots started breathing. Find all twenty-five Titans. Wishlist Understar on Steam."),
    ("short-depth", "gb_oliver_confident", "How deep would you go? Dig. Return. Grow stronger. The Understar is waiting. Wishlist now on Steam."),
)


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def safe_error(error: Exception) -> str:
    if isinstance(error, urllib.error.HTTPError):
        body = error.read().decode("utf-8", errors="replace")
        return f"HTTP {error.code}: {body[:500]}"
    return re.sub(r"sk-or-v1-[A-Za-z0-9_-]+", "[REDACTED]", str(error))[:500]


def request_json(url: str, key: str, method: str = "GET", payload: dict | None = None) -> dict:
    headers = {
        "Authorization": f"Bearer {key}", "Accept": "application/json",
        "HTTP-Referer": "http://127.0.0.1:8080", "X-Title": "UNDERSTAR Cinematic Pack V1",
    }
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=180) as response:
        return json.loads(response.read().decode("utf-8"))


def download(url: str, key: str, path: Path) -> None:
    request = urllib.request.Request(url, headers={"Authorization": f"Bearer {key}", "Accept": "video/mp4,*/*"})
    with urllib.request.urlopen(request, timeout=300) as response:
        path.write_bytes(response.read())


def post_tts(key: str, voice: str, text: str) -> bytes:
    payload = {"model": TTS_MODEL, "input": text, "voice": voice, "response_format": "mp3", "speed": 0.96}
    request = urllib.request.Request(
        f"{OPENROUTER}/audio/speech", data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json", "Accept": "audio/mpeg"},
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        return response.read()


def prepare_frame(shot: dict) -> Path:
    source = ROOT / shot["source"]
    target_size = (1080, 1920) if shot["aspect"] == "9:16" else (1920, 1080)
    target = FRAMES / f"{shot['id']}-first-frame.png"
    with Image.open(source) as image:
        normalized = ImageOps.fit(image.convert("RGB"), target_size, Image.Resampling.LANCZOS, centering=shot["focus"])
        normalized.save(target, optimize=True)
    return target


def frame_data_url(path: Path) -> str:
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def video_payload(shot: dict, frame: Path) -> dict:
    return {
        "model": VIDEO_MODEL, "prompt": f"{SHARED_VIDEO_DIRECTION} {shot['prompt']}",
        "duration": shot["duration"], "resolution": "1080p", "aspect_ratio": shot["aspect"],
        "generate_audio": True, "seed": shot["seed"],
        "frame_images": [{"type": "image_url", "image_url": {"url": frame_data_url(frame)}, "frame_type": "first_frame"}],
    }


def credit_snapshot(key: str) -> dict:
    try:
        return request_json(f"{OPENROUTER}/credits", key)
    except Exception as error:
        return {"unavailable": safe_error(error)}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--budget-usd", type=float, default=DEFAULT_BUDGET_USD)
    parser.add_argument("--max-wait-sec", type=int, default=1800)
    parser.add_argument("--key-stdin", action="store_true")
    args = parser.parse_args()
    for directory in (CLIPS, FRAMES, AUDIO):
        directory.mkdir(parents=True, exist_ok=True)
    estimated = sum(shot["duration"] for shot in SHOTS) * VIDEO_PRICE_PER_SECOND_USD
    if estimated > args.budget_usd:
        raise RuntimeError(f"Planned video cost ${estimated:.2f} exceeds hard cap ${args.budget_usd:.2f}")
    frames = {shot["id"]: prepare_frame(shot) for shot in SHOTS}
    write_json(PLAN_PATH, {
        "model": VIDEO_MODEL, "ttsModel": TTS_MODEL, "hardBudgetUsd": args.budget_usd,
        "estimatedVideoCostUsd": round(estimated, 2), "priceAssumptionUsdPerSecond1080pWithAudio": VIDEO_PRICE_PER_SECOND_USD,
        "shots": [{**shot, "referenceFrame": frames[shot["id"]].relative_to(ROOT).as_posix()} for shot in SHOTS],
        "voices": [{"id": item[0], "voice": item[1], "text": item[2]} for item in VOICE_JOBS],
    })
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key and args.key_stdin:
        key = getpass.getpass("OpenRouter key (not stored): ").strip()
    if not key:
        print("Missing OpenRouter key; request plan and reference frames were prepared only.", file=sys.stderr)
        return 2
    started = datetime.now(timezone.utc).isoformat()
    credits_before = credit_snapshot(key)
    state = json.loads(JOBS_PATH.read_text(encoding="utf-8")) if JOBS_PATH.exists() else {"jobs": []}
    jobs_by_id = {job["shotId"]: job for job in state.get("jobs", [])}
    for shot in SHOTS:
        if shot["id"] in jobs_by_id:
            continue
        print(f"Submitting {shot['id']} ({shot['duration']}s {shot['aspect']})", flush=True)
        response = request_json(f"{OPENROUTER}/videos", key, "POST", video_payload(shot, frames[shot["id"]]))
        jobs_by_id[shot["id"]] = {"shotId": shot["id"], "response": response}
        write_json(JOBS_PATH, {"model": VIDEO_MODEL, "jobs": list(jobs_by_id.values())})
    deadline = time.time() + args.max_wait_sec
    results: dict[str, dict] = {}
    while time.time() < deadline:
        pending = 0
        for shot in SHOTS:
            job = jobs_by_id[shot["id"]]
            if results.get(shot["id"], {}).get("status") == "completed":
                continue
            polling_url = job.get("response", {}).get("polling_url")
            poll = request_json(polling_url, key) if polling_url else {"status": "failed", "error": "missing polling_url"}
            status = poll.get("status", "unknown")
            result = {"shotId": shot["id"], "status": status, "poll": poll}
            if status == "completed":
                output = CLIPS / f"{shot['id']}.mp4"
                urls = poll.get("unsigned_urls") or []
                if urls and (not output.exists() or output.stat().st_size < 10000):
                    download(urls[0], key, output)
                result["output"] = output.relative_to(ROOT).as_posix()
                result["sha256"] = hashlib.sha256(output.read_bytes()).hexdigest()
                print(f"Completed {shot['id']}", flush=True)
            elif status in {"failed", "cancelled", "canceled", "error"}:
                print(f"Failed {shot['id']}: {poll.get('error', 'unknown error')}", flush=True)
            else:
                pending += 1
            results[shot["id"]] = result
        write_json(MANIFEST_PATH, {"state": "polling", "results": list(results.values())})
        if pending == 0:
            break
        print(f"Waiting on {pending} OpenRouter video job(s)...", flush=True)
        time.sleep(8)
    if any(item.get("status") not in {"completed", "failed", "cancelled", "canceled", "error"} for item in results.values()):
        raise TimeoutError("Timed out waiting for OpenRouter video jobs; rerun to resume polling.")
    voices = []
    for voice_id, voice, text in VOICE_JOBS:
        output = AUDIO / f"narration-{voice_id}.mp3"
        try:
            if not output.exists() or output.stat().st_size < 1000:
                print(f"Generating narration {voice_id}", flush=True)
                output.write_bytes(post_tts(key, voice, text))
            voices.append({"id": voice_id, "status": "completed", "voice": voice, "text": text, "output": output.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(output.read_bytes()).hexdigest()})
        except Exception as error:
            voices.append({"id": voice_id, "status": "failed", "voice": voice, "text": text, "error": safe_error(error)})
    known_cost = sum(float(item.get("poll", {}).get("usage", {}).get("cost") or 0) for item in results.values())
    if known_cost > args.budget_usd:
        raise RuntimeError(f"Known cost ${known_cost:.2f} exceeded hard cap ${args.budget_usd:.2f}")
    manifest = {
        "schemaVersion": 1, "startedAt": started, "completedAt": datetime.now(timezone.utc).isoformat(),
        "model": VIDEO_MODEL, "ttsModel": TTS_MODEL, "hardBudgetUsd": args.budget_usd,
        "estimatedVideoCostUsd": round(estimated, 2), "knownVideoCostUsd": round(known_cost, 6),
        "creditsBefore": credits_before, "creditsAfter": credit_snapshot(key),
        "results": list(results.values()), "voices": voices, "apiKeyStored": False,
    }
    write_json(MANIFEST_PATH, manifest)
    failures = [item for item in [*results.values(), *voices] if item.get("status") != "completed"]
    print(json.dumps({"knownVideoCostUsd": known_cost, "completedVideos": len(results) - len([r for r in results.values() if r.get('status') != 'completed']), "voiceFailures": len([v for v in voices if v.get('status') != 'completed']), "failures": len(failures)}, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
