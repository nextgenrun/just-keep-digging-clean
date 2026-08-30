"""Generate two gameplay-anchored marketing cards through OpenRouter Images."""

from __future__ import annotations

import argparse
import base64
import getpass
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "steam-marketing/2026-08-26-gameplay-demo-trailer-v1"
OPENROUTER = "https://openrouter.ai/api/v1"
MANIFEST = PACK / "openrouter-keyart-generation-manifest.json"
DEFAULT_BUDGET_USD = 0.50

JOBS = (
    {
        "id": "landscape",
        "aspectRatio": "16:9",
        "outputStem": "openrouter-gameplay-keyart-landscape-v2",
        "references": (
            "reference-gameplay-landscape-star-action.png",
            "reference-style-star-core-breath.png",
        ),
        "prompt": """Use case: stylized-concept
Asset type: landscape trailer title and CTA background; clearly marketing key art derived from gameplay, never a replacement gameplay shot
Primary request: turn Image 1 into restrained, premium UNDERSTAR key art while preserving its side-view mine, exact miner identity, carved geometry, ore silhouettes, cyan Star placement and exact on-screen size, material language, and camera. Remove only the HUD chrome and extend existing cave texture naturally into those areas. Add only subtle internal facet illumination inside the existing Star footprint, informed by Image 2; do not add an outer ring or any new object.
Input images: Image 1 is the authoritative actual-gameplay edit target; Image 2 is a supporting approved Star-motion style reference only.
Style/medium: cohesive painterly 2.5D game art matching Image 1; tactile dark geology; not photography and not generic fantasy concept art.
Composition/framing: retain the exact 16:9 composition and miner-to-Star relationship; leave calm readable space for later editor-added title copy.
Lighting/mood: restrained cyan-white Star light, subtle dust and depth, readable miner silhouette, mysterious rather than explosive.
Constraints: preserve the game art identity, exact ore shapes, and core geometry; the one existing Star must remain tile-anchored at the exact original position and scale; no new characters, creatures, props, stars, charms, hanging ornaments, wires, UI, text, logo, watermark, camera change, photorealism, or stock-photo look.
Avoid: orbiting satellites, outer aura rings, floating, bobbing, pulsing, redesign, giant star, whole-frame glow, lens flare, neon saturation, cinematic black bars, fake interface.""",
    },
    {
        "id": "vertical",
        "aspectRatio": "9:16",
        "outputStem": "openrouter-gameplay-keyart-vertical-v2",
        "references": (
            "reference-gameplay-vertical-flight.png",
            "reference-style-star-stardust-orbit.png",
        ),
        "prompt": """Use case: stylized-concept
Asset type: vertical Short CTA background; clearly marketing key art derived from gameplay, never a replacement gameplay shot
Primary request: polish Image 1 without changing its portrait mine shaft, miner action, green Star location and exact on-screen size, original ore silhouettes, carved route, or camera. Add only subtle internal facet/stardust animation cues inside the existing green Star footprint, informed by Image 2; do not add an outer ring or redraw nearby ore.
Input images: Image 1 is the authoritative actual-gameplay edit target; Image 2 is a supporting approved Star-motion style reference only.
Style/medium: cohesive painterly 2.5D game art matching Image 1; tactile cave detail; not photography and not generic fantasy concept art.
Composition/framing: retain the exact 9:16 composition; keep the miner and Star inside the central mobile safe area; preserve darker breathing room for later captions.
Lighting/mood: subtle green-white localized Star light, fine dust, readable action silhouette, discovery and momentum.
Constraints: preserve the game art identity, exact ore shapes, and geometry; the one existing Star must remain tile-anchored at the exact original position and scale; no new characters, creatures, props, stars, UI, text, logo, watermark, camera change, photorealism, or stock-photo look.
Avoid: orbiting satellites, outer aura rings, floating, bobbing, pulsing, ore redesign, giant star, whole-frame glow, lens flare, neon saturation, cinematic black bars, fake interface.""",
    },
)


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


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
        "X-Title": "UNDERSTAR Gameplay Demo Trailer V1",
    }
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=300) as response:
        return json.loads(response.read().decode("utf-8"))


def image_data_url(path: Path) -> str:
    media_type = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
    return f"data:{media_type};base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def list_image_edit_models(key: str) -> list[dict]:
    response = request_json(f"{OPENROUTER}/images/models", key)
    return [
        model for model in response.get("data", [])
        if "image" in model.get("architecture", {}).get("input_modalities", [])
    ]


def output_suffix(item: dict) -> str:
    media_type = item.get("media_type", "image/png")
    if media_type == "image/webp":
        return ".webp"
    if media_type in {"image/jpeg", "image/jpg"}:
        return ".jpg"
    if media_type == "image/svg+xml":
        return ".svg"
    return ".png"


def build_payload(model: dict, job: dict, resolution: str) -> dict:
    supported = model.get("supported_parameters", {})
    payload = {
        "model": model["id"],
        "prompt": job["prompt"],
        "n": 1,
        "input_references": [
            {"type": "image_url", "image_url": {"url": image_data_url(PACK / name)}}
            for name in job["references"]
        ],
    }
    if "aspect_ratio" in supported:
        payload["aspect_ratio"] = job["aspectRatio"]
    if "resolution" in supported:
        values = supported["resolution"].get("values", [])
        payload["resolution"] = resolution if resolution in values else (values[-1] if values else resolution)
    if "quality" in supported:
        values = supported["quality"].get("values", [])
        payload["quality"] = "high" if not values or "high" in values else values[-1]
    if "output_format" in supported:
        values = supported["output_format"].get("values", [])
        payload["output_format"] = "png" if not values or "png" in values else values[0]
    return payload


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="")
    parser.add_argument("--job", choices=("all", "landscape", "vertical"), default="all")
    parser.add_argument("--resolution", default="2K")
    parser.add_argument("--budget-usd", type=float, default=DEFAULT_BUDGET_USD)
    parser.add_argument("--list-models", action="store_true")
    parser.add_argument("--key-stdin", action="store_true")
    args = parser.parse_args()

    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key and args.key_stdin:
        key = getpass.getpass("OpenRouter key (not stored): ").strip()
    if not key:
        print("Missing OpenRouter key.", file=sys.stderr)
        return 2

    try:
        models = list_image_edit_models(key)
        if args.list_models:
            print(json.dumps([
                {
                    "id": model["id"],
                    "name": model.get("name", model["id"]),
                    "supportedParameters": list(model.get("supported_parameters", {}).keys()),
                }
                for model in models
            ], indent=2))
            return 0

        model = next((item for item in models if item["id"] == args.model), None)
        if model is None:
            raise RuntimeError(f"Model is not an image-edit model on this account: {args.model}")

        selected = [job for job in JOBS if args.job in {"all", job["id"]}]
        previous = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}
        results = list(previous.get("results", []))
        known_cost = float(previous.get("knownCostUsd") or 0)
        created_at = previous.get("createdAt") or datetime.now(timezone.utc).isoformat()
        for job in selected:
            if known_cost >= args.budget_usd:
                raise RuntimeError(f"Known generation cost ${known_cost:.4f} reached ${args.budget_usd:.2f} cap")
            payload = build_payload(model, job, args.resolution)
            response = request_json(f"{OPENROUTER}/images", key, "POST", payload)
            item = (response.get("data") or [None])[0]
            if not item or not item.get("b64_json"):
                raise RuntimeError(f"OpenRouter returned no image for {job['id']}")
            suffix = output_suffix(item)
            output = PACK / f"{job['outputStem']}{suffix}"
            output.write_bytes(base64.b64decode(item["b64_json"]))
            cost = float(response.get("usage", {}).get("cost") or 0)
            known_cost += cost
            results.append({
                "id": job["outputStem"],
                "output": output.relative_to(ROOT).as_posix(),
                "sha256": sha256(output),
                "bytes": output.stat().st_size,
                "references": [
                    {"path": f"steam-marketing/2026-08-26-gameplay-demo-trailer-v1/{name}", "sha256": sha256(PACK / name)}
                    for name in job["references"]
                ],
                "prompt": job["prompt"],
                "usage": response.get("usage", {}),
            })
            write_json(MANIFEST, {
                "schemaVersion": 1,
                "provider": "OpenRouter",
                "endpoint": "/api/v1/images",
                "model": model["id"],
                "createdAt": created_at,
                "updatedAt": datetime.now(timezone.utc).isoformat(),
                "reviewOnly": True,
                "generatedMarketingArtNotGameplay": True,
                "hardBudgetUsd": args.budget_usd,
                "knownCostUsd": round(known_cost, 6),
                "apiKeyStored": False,
                "results": results,
            })
            if known_cost > args.budget_usd:
                raise RuntimeError(f"Known generation cost ${known_cost:.4f} exceeded ${args.budget_usd:.2f} cap")
            print(f"Generated {job['id']}: {output.relative_to(ROOT).as_posix()} (${cost:.4f})", flush=True)
        return 0
    except Exception as error:
        print(safe_error(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
