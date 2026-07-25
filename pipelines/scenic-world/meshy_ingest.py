#!/usr/bin/env python3
"""Secure Meshy task intake for the offline scenic-world bake pipeline."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


API_ROOT = "https://api.meshy.ai/openapi"
TERMS_URL = "https://www.meshy.ai/terms-of-use"
PRICING_URL = "https://docs.meshy.ai/en/api/pricing"
PRICING_SNAPSHOT_DATE = "2026-07-16"
ENDPOINTS = {
    "text-to-3d": "/v2/text-to-3d",
    "multi-image-to-3d": "/v1/multi-image-to-3d",
}


class PipelineError(RuntimeError):
    """An expected, user-actionable pipeline error."""


class MeshyApiError(PipelineError):
    def __init__(self, status: int, detail: str):
        super().__init__(f"Meshy API returned HTTP {status}: {detail}")
        self.status = status


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _sanitize(value: object, secret: str = "") -> str:
    text = str(value)
    if secret:
        text = text.replace(secret, "<redacted-api-key>")
    text = re.sub(r"https?://[^\s\"'<>?]+\?[^\s\"'<>]+", "<signed-url-redacted>", text)
    text = re.sub(r"(?i)authorization\s*[:=]\s*[^,}\s]+", "authorization=<redacted>", text)
    return text[:500]


def _api_key() -> str:
    key = os.environ.get("MESHY_API_KEY", "").strip()
    if not key:
        raise PipelineError("MESHY_API_KEY is not set in the process environment")
    return key


def _error_detail(raw: bytes, secret: str) -> str:
    try:
        payload = json.loads(raw.decode("utf-8", errors="replace"))
        for name in ("message", "error", "task_error", "detail"):
            if payload.get(name):
                return _sanitize(payload[name], secret)
    except (json.JSONDecodeError, AttributeError):
        pass
    return "request rejected"


def _request_json(method: str, path: str, secret: str, payload: dict | None = None) -> dict:
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request = Request(
        API_ROOT + path,
        data=body,
        method=method,
        headers={"Authorization": f"Bearer {secret}", "Content-Type": "application/json"},
    )
    try:
        with urlopen(request, timeout=45) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        raise MeshyApiError(error.code, _error_detail(error.read(), secret)) from None
    except URLError as error:
        raise PipelineError(f"Meshy API connection failed: {_sanitize(error.reason, secret)}") from None
    except json.JSONDecodeError:
        raise PipelineError("Meshy API returned malformed JSON") from None


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_community_review_request(output_dir: Path, category: str, reason: str) -> Path:
    secret = os.environ.get("MESHY_API_KEY", "")
    category = _sanitize(category, secret)
    reason = _sanitize(reason, secret)
    safe_slug = quote(category.strip().lower().replace(" ", "-") or "game-assets", safe="-")
    path = output_dir / "community-review-request.json"
    _write_json(
        path,
        {
            "schemaVersion": 1,
            "status": "manual-review-required",
            "createdAtUtc": utc_now(),
            "reason": reason,
            "category": category,
            "suggestedSearchUrl": f"https://www.meshy.ai/tags/{safe_slug}",
            "automaticDownload": False,
            "reviewRequirements": [
                "Confirm the asset license and record its exact identifier.",
                "Confirm the uploader and original asset page provenance.",
                "Inspect topology, textures, silhouette, and side-view suitability.",
                "Download manually only after approval, then record SHA-256 hashes.",
            ],
        },
    )
    return path


def _balance(secret: str) -> float:
    payload = _request_json("GET", "/v1/balance", secret)
    value = payload.get("balance")
    if not isinstance(value, (int, float)):
        raise PipelineError("Meshy balance response did not contain a numeric balance")
    return float(value)


def _bool_field(payload: dict, name: str, default: bool) -> bool:
    value = payload.get(name, default)
    if not isinstance(value, bool):
        raise PipelineError(f"Request field {name} must be boolean")
    return value


def estimate_credits(kind: str, payload: dict) -> int:
    """Validate supported request combinations and return current listed cost."""
    model = payload.get("ai_model", "latest")
    if model not in {"meshy-5", "meshy-6", "latest"}:
        raise PipelineError(f"Unknown ai_model for guarded pricing: {_sanitize(model)}")
    if kind == "text-to-3d":
        mode = payload.get("mode")
        if mode not in {"preview", "refine"}:
            raise PipelineError("Text-to-3D mode must be preview or refine for guarded pricing")
        if mode == "refine":
            if not isinstance(payload.get("preview_task_id"), str) or not payload["preview_task_id"].strip():
                raise PipelineError("Text-to-3D refine requires preview_task_id")
            if "model_type" in payload:
                raise PipelineError("model_type is not accepted for a guarded refine request")
            return 10
        if not isinstance(payload.get("prompt"), str) or not payload["prompt"].strip():
            raise PipelineError("Text-to-3D preview requires a non-empty prompt")
        if "preview_task_id" in payload:
            raise PipelineError("preview_task_id is incompatible with preview mode")
        model_type = payload.get("model_type", "standard")
        if model_type not in {"standard", "lowpoly"}:
            raise PipelineError(f"Unknown model_type for guarded pricing: {_sanitize(model_type)}")
        return 20 if model_type == "lowpoly" or model in {"meshy-6", "latest"} else 5
    if kind == "multi-image-to-3d":
        has_images = "image_urls" in payload
        has_task = "input_task_id" in payload
        if has_images == has_task:
            raise PipelineError("Multi-image request must define exactly one of image_urls or input_task_id")
        if has_images:
            images = payload["image_urls"]
            if not isinstance(images, list) or not 1 <= len(images) <= 4 or not all(isinstance(url, str) for url in images):
                raise PipelineError("image_urls must contain 1 to 4 URL or data-URI strings")
        elif not isinstance(payload["input_task_id"], str) or not payload["input_task_id"].strip():
            raise PipelineError("input_task_id must be a non-empty string")
        should_texture = _bool_field(payload, "should_texture", True)
        enable_pbr = _bool_field(payload, "enable_pbr", False)
        hd_texture = _bool_field(payload, "hd_texture", False)
        if not should_texture and (
            enable_pbr or hd_texture or payload.get("texture_prompt") or payload.get("texture_image_url")
        ):
            raise PipelineError("Texture/PBR options are incompatible with should_texture=false")
        premium_model = model in {"meshy-6", "latest"}
        if should_texture:
            return 30 if premium_model else 15
        return 20 if premium_model else 5
    raise PipelineError(f"No guarded pricing rule for task kind {_sanitize(kind)}")


def _fallback(args: argparse.Namespace, reason: str) -> int:
    destination = getattr(args, "fallback_dir", None) or getattr(args, "output_dir", None)
    if not destination:
        raise PipelineError(reason)
    path = write_community_review_request(Path(destination), args.category, reason)
    print(f"Manual community review requested: {path}")
    return 3


def command_balance(args: argparse.Namespace) -> int:
    balance = _balance(_api_key())
    print(f"Meshy balance: {balance:g} credits")
    if balance < args.minimum_required:
        return _fallback(args, f"Balance {balance:g} is below required {args.minimum_required:g} credits")
    return 0


def command_submit(args: argparse.Namespace) -> int:
    if not args.confirm_spend:
        raise PipelineError("Refusing to create a task without explicit --confirm-spend")
    if args.max_credits <= 0:
        raise PipelineError("--max-credits must be greater than zero")
    request_path = Path(args.request_file)
    try:
        payload = json.loads(request_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise PipelineError(f"Cannot read request JSON: {_sanitize(error)}") from None
    if not isinstance(payload, dict):
        raise PipelineError("Request JSON root must be an object")
    calculated_credits = estimate_credits(args.kind, payload)
    if calculated_credits > args.max_credits:
        raise PipelineError(
            f"Calculated price {calculated_credits} exceeds --max-credits {args.max_credits:g}; no task created"
        )
    secret = _api_key()
    balance = _balance(secret)
    if balance < calculated_credits:
        return _fallback(args, f"Balance {balance:g} is below calculated price {calculated_credits:g}")
    try:
        response = _request_json("POST", ENDPOINTS[args.kind], secret, payload)
    except MeshyApiError as error:
        if error.status == 402:
            return _fallback(args, "Meshy rejected task creation due to insufficient credits")
        raise
    task_id = response.get("result") or response.get("id")
    if not isinstance(task_id, str) or not task_id:
        raise PipelineError("Meshy task response did not contain a task id")
    output_dir = Path(args.output_dir)
    _write_json(
        output_dir / "submit-provenance.json",
        {
            "schemaVersion": 1,
            "provider": "Meshy",
            "taskKind": args.kind,
            "taskId": task_id,
            "submittedAtUtc": utc_now(),
            "calculatedCredits": calculated_credits,
            "operatorMaxCredits": args.max_credits,
            "pricingSnapshotDate": PRICING_SNAPSHOT_DATE,
            "pricingSourceUrl": PRICING_URL,
            "balanceBeforeSubmit": balance,
            "requestSha256": sha256_file(request_path),
        },
    )
    print(f"Created Meshy {args.kind} task: {task_id}")
    return 0


def _task(args: argparse.Namespace, secret: str) -> dict:
    endpoint = f"{ENDPOINTS[args.kind]}/{quote(args.task_id, safe='')}"
    deadline = time.monotonic() + args.timeout
    while True:
        payload = _request_json("GET", endpoint, secret)
        status = str(payload.get("status", "")).upper()
        if status in {"SUCCEEDED", "SUCCESS"}:
            return payload
        if status in {"FAILED", "CANCELED", "CANCELLED", "EXPIRED"}:
            raise PipelineError(f"Meshy task ended with status {status}")
        if not args.wait:
            raise PipelineError(f"Meshy task is not complete (status {status or 'UNKNOWN'}); retry with --wait")
        if time.monotonic() >= deadline:
            raise PipelineError(f"Timed out waiting for Meshy task after {args.timeout:g} seconds")
        time.sleep(args.poll)


def _download(url: str, destination: Path) -> None:
    request = Request(url, method="GET", headers={"User-Agent": "dig-game-scenic-bake/1"})
    try:
        with urlopen(request, timeout=120) as response, destination.open("wb") as output:
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
    except HTTPError as error:
        raise PipelineError(f"Asset download failed with HTTP {error.code}; signed URL was not logged") from None
    except URLError:
        raise PipelineError("Asset download failed; signed URL was not logged") from None


def _texture_entries(value: object) -> list[tuple[str, str]]:
    groups = value if isinstance(value, list) else [value]
    entries: list[tuple[str, str]] = []
    for index, group in enumerate(groups):
        if not isinstance(group, dict):
            continue
        suffix = "" if len(groups) == 1 else f"-{index}"
        for name in ("base_color", "metallic", "roughness", "normal", "emission"):
            url = group.get(name)
            if isinstance(url, str) and url.startswith(("https://", "http://")):
                entries.append((f"source-{name.replace('_', '-')}{suffix}.png", url))
    return entries


def command_retrieve(args: argparse.Namespace) -> int:
    license_id = args.license_id.strip() or "UNVERIFIED"
    if args.license_reviewed and license_id.upper() == "UNVERIFIED":
        raise PipelineError("--license-reviewed requires a specific --license-id")
    license_status = (
        "reviewed" if args.license_reviewed else "unverified" if license_id.upper() == "UNVERIFIED" else "declared-by-operator"
    )
    secret = _api_key()
    try:
        task = _task(args, secret)
    except MeshyApiError as error:
        if error.status == 402:
            return _fallback(args, "Meshy retrieval reported insufficient credits")
        raise
    model_url = (task.get("model_urls") or {}).get("glb")
    if not isinstance(model_url, str):
        raise PipelineError("Completed Meshy task does not contain a GLB download URL")
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    downloads = [("source.glb", model_url), *_texture_entries(task.get("texture_urls"))]
    files = []
    for filename, url in downloads:
        destination = output_dir / filename
        _download(url, destination)
        files.append({"path": filename, "bytes": destination.stat().st_size, "sha256": sha256_file(destination)})
    _write_json(
        output_dir / "provenance.json",
        {
            "schemaVersion": 1,
            "provider": "Meshy",
            "taskKind": args.kind,
            "taskId": args.task_id,
            "retrievedAtUtc": utc_now(),
            "consumedCredits": task.get("consumed_credits"),
            "licenseId": license_id,
            "licenseStatus": license_status,
            "providerTermsUrl": TERMS_URL,
            "files": files,
        },
    )
    print(f"Retrieved and hashed {len(files)} file(s) in {output_dir}")
    return 0


def command_community_review(args: argparse.Namespace) -> int:
    path = write_community_review_request(Path(args.output_dir), args.category, args.reason)
    print(f"Manual community review requested: {path}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    balance = commands.add_parser("balance", help="Check credits without creating a task")
    balance.add_argument("--minimum-required", type=float, default=0)
    balance.add_argument("--fallback-dir")
    balance.add_argument("--category", default="scenic-world-assets")
    balance.set_defaults(handler=command_balance)
    submit = commands.add_parser("submit", help="Create a reviewed Meshy task")
    submit.add_argument("--kind", choices=ENDPOINTS, required=True)
    submit.add_argument("--request-file", required=True)
    submit.add_argument("--output-dir", required=True)
    submit.add_argument("--max-credits", type=float, required=True)
    submit.add_argument("--confirm-spend", action="store_true")
    submit.add_argument("--fallback-dir")
    submit.add_argument("--category", default="scenic-world-assets")
    submit.set_defaults(handler=command_submit)
    retrieve = commands.add_parser("retrieve", help="Retrieve a completed task and record hashes")
    retrieve.add_argument("--kind", choices=ENDPOINTS, required=True)
    retrieve.add_argument("--task-id", required=True)
    retrieve.add_argument("--output-dir", required=True)
    retrieve.add_argument("--wait", action="store_true")
    retrieve.add_argument("--timeout", type=float, default=900)
    retrieve.add_argument("--poll", type=float, default=10)
    retrieve.add_argument("--license-id", default="UNVERIFIED")
    retrieve.add_argument("--license-reviewed", action="store_true")
    retrieve.add_argument("--fallback-dir")
    retrieve.add_argument("--category", default="scenic-world-assets")
    retrieve.set_defaults(handler=command_retrieve)
    review = commands.add_parser("community-review", help="Write a human-review fallback request")
    review.add_argument("--output-dir", required=True)
    review.add_argument("--category", required=True)
    review.add_argument("--reason", required=True)
    review.set_defaults(handler=command_community_review)
    return parser


def main(argv: list[str] | None = None) -> int:
    secret = os.environ.get("MESHY_API_KEY", "")
    try:
        args = build_parser().parse_args(argv)
        if hasattr(args, "poll") and args.poll <= 0:
            raise PipelineError("--poll must be greater than zero")
        return args.handler(args)
    except PipelineError as error:
        print(f"ERROR: {_sanitize(error, secret)}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
