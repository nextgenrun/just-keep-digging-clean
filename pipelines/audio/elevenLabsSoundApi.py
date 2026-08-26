"""Minimal ElevenLabs sound-effects HTTP client with sanitized failures."""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass


CLIENT_ID = "dig-game-elevenlabs-sfx-pipeline"
CLIENT_VERSION = "2026-08-26"


class ElevenLabsSoundError(RuntimeError):
    """An ElevenLabs API failure that is safe to record in a manifest."""


@dataclass(frozen=True)
class SoundResult:
    audio: bytes
    content_type: str
    reported_cost: str | None


def sanitize_error(error: Exception) -> str:
    message: object = str(error)
    if isinstance(error, urllib.error.HTTPError):
        try:
            body = error.read().decode("utf-8", errors="replace")
            parsed = json.loads(body)
            message = parsed.get("detail") or parsed.get("message") or body
        except Exception:
            message = error.reason
        message = f"HTTP {error.code}: {message}"
    return re.sub(r"sk_[A-Za-z0-9]+", "[REDACTED]", str(message))[:700]


class ElevenLabsSoundClient:
    def __init__(self, api_key: str, timeout_seconds: int = 180) -> None:
        if not re.fullmatch(r"sk_[A-Za-z0-9]+", api_key):
            raise ElevenLabsSoundError("ELEVENLABS_API_KEY is missing or malformed")
        self._api_key = api_key
        self._timeout_seconds = timeout_seconds

    def generate(
        self,
        endpoint: str,
        output_format: str,
        payload: dict[str, object],
        retry_count: int = 3,
    ) -> SoundResult:
        url = f"{endpoint}?{urllib.parse.urlencode({'output_format': output_format})}"
        body = json.dumps(payload).encode("utf-8")
        headers = {
            "xi-api-key": self._api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
            "User-Agent": f"{CLIENT_ID}/{CLIENT_VERSION}",
        }
        for attempt in range(1, retry_count + 1):
            request = urllib.request.Request(url, data=body, headers=headers, method="POST")
            try:
                with urllib.request.urlopen(request, timeout=self._timeout_seconds) as response:
                    audio = response.read()
                    content_type = response.headers.get("Content-Type", "")
                    if response.status != 200 or not content_type.startswith("audio/"):
                        raise ElevenLabsSoundError(
                            f"Unexpected generation response: HTTP {response.status} {content_type}"
                        )
                    if len(audio) < 512:
                        raise ElevenLabsSoundError("Generation returned an implausibly small audio file")
                    return SoundResult(
                        audio=audio,
                        content_type=content_type,
                        reported_cost=response.headers.get("character-cost"),
                    )
            except urllib.error.HTTPError as error:
                if error.code not in {429, 500, 502, 503, 504} or attempt == retry_count:
                    raise ElevenLabsSoundError(sanitize_error(error)) from None
                time.sleep(min(2 ** attempt, 8))
            except ElevenLabsSoundError:
                raise
            except Exception as error:
                raise ElevenLabsSoundError(sanitize_error(error)) from None
        raise ElevenLabsSoundError("Generation retries were exhausted")
