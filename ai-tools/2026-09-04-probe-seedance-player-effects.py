"""Validate the temporary OpenRouter key and snapshot Seedance Mini capabilities."""

from __future__ import annotations

import argparse
import ctypes
import ctypes.wintypes as wt
import json
import os
import re
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
LAB = ROOT / "testing/animation-sandbox/2026-09-04-seedance-player-effects-eur10-v1"
MODEL = "bytedance/seedance-2.0-mini"
OPENROUTER = "https://openrouter.ai/api/v1"
DEFAULT_KEY_FILE = Path(os.environ.get("TEMP", ".")) / "codex-openrouter-01a06505.dpapi"


class DataBlob(ctypes.Structure):
    _fields_ = [
        ("cbData", wt.DWORD),
        ("pbData", ctypes.POINTER(ctypes.c_ubyte)),
    ]


def unprotect_key(path: Path) -> bytearray:
    encrypted = path.read_bytes()
    encrypted_buffer = (ctypes.c_ubyte * len(encrypted)).from_buffer_copy(encrypted)
    input_blob = DataBlob(
        len(encrypted),
        ctypes.cast(encrypted_buffer, ctypes.POINTER(ctypes.c_ubyte)),
    )
    output_blob = DataBlob()
    crypt32 = ctypes.WinDLL("crypt32", use_last_error=True)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    crypt32.CryptUnprotectData.argtypes = [
        ctypes.POINTER(DataBlob),
        ctypes.POINTER(wt.LPWSTR),
        ctypes.POINTER(DataBlob),
        wt.LPVOID,
        wt.LPVOID,
        wt.DWORD,
        ctypes.POINTER(DataBlob),
    ]
    crypt32.CryptUnprotectData.restype = wt.BOOL
    kernel32.LocalFree.argtypes = [wt.HLOCAL]
    kernel32.LocalFree.restype = wt.HLOCAL
    if not crypt32.CryptUnprotectData(
        ctypes.byref(input_blob), None, None, None, None, 0x1, ctypes.byref(output_blob)
    ):
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        return bytearray(ctypes.string_at(output_blob.pbData, output_blob.cbData))
    finally:
        kernel32.LocalFree(ctypes.cast(output_blob.pbData, wt.HLOCAL))


def safe_error(error: Exception) -> str:
    if isinstance(error, urllib.error.HTTPError):
        body = error.read().decode("utf-8", errors="replace")
        message = f"HTTP {error.code}: {body[:800]}"
    else:
        message = str(error)
    return re.sub(r"sk-or-[A-Za-z0-9_-]+", "[REDACTED]", message)[:1000]


def request_json(url: str, key: str = "") -> dict:
    headers = {"Accept": "application/json"}
    if key:
        headers.update({
            "Authorization": f"Bearer {key}",
            "HTTP-Referer": "http://127.0.0.1:8081",
            "X-Title": "UNDERSTAR Seedance Player Effects Lab",
        })
    request = urllib.request.Request(url, headers=headers, method="GET")
    with urllib.request.urlopen(request, timeout=180) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--key-file", type=Path, default=DEFAULT_KEY_FILE)
    args = parser.parse_args()
    if not args.key_file.is_file():
        raise FileNotFoundError("Encrypted OpenRouter key file is missing")

    key_bytes = unprotect_key(args.key_file)
    try:
        key = key_bytes.decode("utf-8")
        key_info = request_json(f"{OPENROUTER}/key", key).get("data") or {}
        catalog = request_json(f"{OPENROUTER}/videos/models", key)
        model = next((item for item in catalog.get("data", []) if item.get("id") == MODEL), None)
        if not model:
            raise RuntimeError(f"Current catalog is missing {MODEL}")
        safe_key_info = {
            "isFreeTier": key_info.get("is_free_tier"),
            "limitUsd": key_info.get("limit"),
            "limitRemainingUsd": key_info.get("limit_remaining"),
            "usageUsd": key_info.get("usage"),
            "expiresAt": key_info.get("expires_at"),
        }
        keep_model_fields = (
            "id", "name", "description", "supported_resolutions",
            "supported_durations", "supported_aspect_ratios", "supported_sizes",
            "supported_frame_images", "generate_audio", "pricing_skus",
            "allowed_passthrough_parameters",
        )
        payload = {
            "schemaVersion": "seedance-player-effects-probe-v1",
            "capturedAt": datetime.now(timezone.utc).isoformat(),
            "keyValid": True,
            "key": safe_key_info,
            "model": {field: model.get(field) for field in keep_model_fields},
        }
        LAB.mkdir(parents=True, exist_ok=True)
        output = LAB / "openrouter-probe.json"
        output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({
            "keyValid": True,
            "limitRemainingUsd": safe_key_info["limitRemainingUsd"],
            "model": MODEL,
            "supportedResolutions": model.get("supported_resolutions"),
            "supportedDurations": model.get("supported_durations"),
            "supportedAspectRatios": model.get("supported_aspect_ratios"),
            "supportedFrameImages": model.get("supported_frame_images"),
            "pricingSkus": model.get("pricing_skus"),
            "snapshot": output.relative_to(ROOT).as_posix(),
        }, indent=2))
        return 0
    finally:
        for index in range(len(key_bytes)):
            key_bytes[index] = 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(safe_error(error), file=os.sys.stderr)
        raise SystemExit(1)
