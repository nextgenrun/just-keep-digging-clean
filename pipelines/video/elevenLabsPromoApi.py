"""Small ElevenLabs client for promotional narration and sound design."""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass


CLIENT_VERSION = "understar-promo-shorts/2026-08-26"


class ElevenLabsPromoError(RuntimeError):
    """A sanitized API failure safe for a generation manifest."""


@dataclass(frozen=True)
class AudioResult:
    audio: bytes
    content_type: str
    reported_cost: str | None
    request_id: str | None


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


class ElevenLabsPromoClient:
    def __init__(self, api_key: str, timeout_seconds: int = 180) -> None:
        if not re.fullmatch(r"sk_[A-Za-z0-9]+", api_key):
            raise ElevenLabsPromoError("ELEVENLABS_API_KEY is missing or malformed")
        self._api_key = api_key
        self._timeout_seconds = timeout_seconds

    def _post(self, url: str, payload: dict[str, object], retries: int = 3) -> AudioResult:
        body = json.dumps(payload).encode("utf-8")
        headers = {
            "xi-api-key": self._api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
            "User-Agent": CLIENT_VERSION,
        }
        for attempt in range(1, retries + 1):
            request = urllib.request.Request(url, data=body, headers=headers, method="POST")
            try:
                with urllib.request.urlopen(request, timeout=self._timeout_seconds) as response:
                    audio = response.read()
                    content_type = response.headers.get("Content-Type", "")
                    if response.status != 200 or not content_type.startswith("audio/"):
                        raise ElevenLabsPromoError(
                            f"Unexpected audio response: HTTP {response.status} {content_type}"
                        )
                    if len(audio) < 512:
                        raise ElevenLabsPromoError("API returned an implausibly small audio file")
                    return AudioResult(
                        audio=audio,
                        content_type=content_type,
                        reported_cost=response.headers.get("character-cost"),
                        request_id=response.headers.get("request-id"),
                    )
            except urllib.error.HTTPError as error:
                if error.code not in {429, 500, 502, 503, 504} or attempt == retries:
                    raise ElevenLabsPromoError(sanitize_error(error)) from None
                time.sleep(min(2 ** attempt, 8))
            except ElevenLabsPromoError:
                raise
            except Exception as error:
                raise ElevenLabsPromoError(sanitize_error(error)) from None
        raise ElevenLabsPromoError("API retries were exhausted")

    def narration(
        self,
        endpoint_template: str,
        voice_id: str,
        output_format: str,
        payload: dict[str, object],
    ) -> AudioResult:
        endpoint = endpoint_template.format(voiceId=urllib.parse.quote(voice_id, safe=""))
        url = f"{endpoint}?{urllib.parse.urlencode({'output_format': output_format})}"
        return self._post(url, payload)

    def sound_effect(
        self,
        endpoint: str,
        output_format: str,
        payload: dict[str, object],
    ) -> AudioResult:
        url = f"{endpoint}?{urllib.parse.urlencode({'output_format': output_format})}"
        return self._post(url, payload)
