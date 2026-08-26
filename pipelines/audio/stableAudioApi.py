"""Minimal Stable Audio HTTP client with no third-party dependencies."""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
import uuid
from dataclasses import dataclass


CLIENT_ID = "dig-game-stable-audio-pipeline"
CLIENT_VERSION = "2026-08-26"


class StabilityAudioError(RuntimeError):
    """A sanitized Stability API failure."""


@dataclass(frozen=True)
class Submission:
    audio: bytes | None
    generation_id: str | None


def encode_multipart(fields: dict[str, object]) -> tuple[bytes, str]:
    boundary = f"----DigGameStableAudio{uuid.uuid4().hex}"
    parts: list[bytes] = []
    for name, value in fields.items():
        parts.extend([
            f"--{boundary}\r\n".encode("ascii"),
            f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("ascii"),
            str(value).encode("utf-8"),
            b"\r\n",
        ])
    parts.extend([
        f"--{boundary}\r\n".encode("ascii"),
        b'Content-Disposition: form-data; name="none"; filename=""\r\n',
        b"Content-Type: application/octet-stream\r\n\r\n\r\n",
        f"--{boundary}--\r\n".encode("ascii"),
    ])
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


def sanitize_error(error: Exception) -> str:
    message = str(error)
    if isinstance(error, urllib.error.HTTPError):
        try:
            body = error.read().decode("utf-8", errors="replace")
            parsed = json.loads(body)
            message = parsed.get("message") or parsed.get("errors") or body
        except Exception:
            message = error.reason
        message = f"HTTP {error.code}: {message}"
    return re.sub(r"sk-[A-Za-z0-9_-]+", "[REDACTED]", str(message))[:500]


class StabilityAudioClient:
    def __init__(self, api_key: str, timeout_seconds: int = 120) -> None:
        if not api_key.startswith("sk-"):
            raise StabilityAudioError("STABILITY_API_KEY is missing or malformed")
        self._api_key = api_key
        self._timeout_seconds = timeout_seconds

    def _request(
        self,
        url: str,
        method: str,
        data: bytes | None = None,
        content_type: str | None = None,
    ) -> tuple[int, str, bytes]:
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Accept": "audio/*",
            "User-Agent": f"{CLIENT_ID}/{CLIENT_VERSION}",
            "stability-client-id": CLIENT_ID,
            "stability-client-version": CLIENT_VERSION,
        }
        if content_type:
            headers["Content-Type"] = content_type
        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=self._timeout_seconds) as response:
                return response.status, response.headers.get("Content-Type", ""), response.read()
        except Exception as error:
            raise StabilityAudioError(sanitize_error(error)) from None

    def submit(self, endpoint: str, fields: dict[str, object]) -> Submission:
        body, content_type = encode_multipart(fields)
        status, response_type, payload = self._request(
            endpoint,
            "POST",
            data=body,
            content_type=content_type,
        )
        if status == 200 and response_type.startswith("audio/"):
            return Submission(audio=payload, generation_id=None)
        if status != 202:
            raise StabilityAudioError(f"Unexpected generation response: HTTP {status}")
        try:
            generation_id = json.loads(payload.decode("utf-8"))["id"]
        except Exception:
            raise StabilityAudioError("Generation response did not include an id") from None
        return Submission(audio=None, generation_id=generation_id)

    def fetch(self, result_endpoint: str) -> bytes | None:
        status, response_type, payload = self._request(result_endpoint, "GET")
        if status == 202:
            return None
        if status == 200 and response_type.startswith("audio/"):
            return payload
        raise StabilityAudioError(f"Unexpected result response: HTTP {status}")

    def wait_for_result(
        self,
        result_endpoint: str,
        poll_seconds: int,
        timeout_seconds: int,
    ) -> bytes:
        deadline = time.monotonic() + timeout_seconds
        while time.monotonic() < deadline:
            audio = self.fetch(result_endpoint)
            if audio is not None:
                return audio
            time.sleep(poll_seconds)
        raise StabilityAudioError("Timed out waiting for Stable Audio generation")
