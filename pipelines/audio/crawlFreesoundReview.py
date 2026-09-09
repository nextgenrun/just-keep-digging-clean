"""Resumable, API-only discovery for a private human SFX review queue."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "pipelines/audio/2026-09-03-freesound-review-searches.json"
DEST = ROOT / "sound/library-v2/SoundLibrary_Review/00_INBOX_RAW_EXPORTS/freesound-review-2026-09-03"
ENDPOINT = "https://freesound.org/apiv2/search/"
FIELDS = "id,url,name,username,license,duration,type,samplerate,channels,filesize,previews,tags,avg_rating,num_ratings,num_downloads,pack,md5"


def stamp():
    return datetime.now(timezone.utc).isoformat()


def read_api_key(from_stdin=False):
    if not from_stdin:
        return os.environ.get("FREESOUND_API_KEY", "").strip()
    if sys.stdin.isatty():
        raise ValueError("--key-stdin requires a pipe, not an echoing terminal.")
    return sys.stdin.readline(4096).strip()


def atomic_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    # Windows readers can briefly hold a destination without delete-sharing.
    for attempt in range(8):
        try:
            os.replace(temporary, path)
            return
        except PermissionError:
            if attempt == 7:
                raise
            time.sleep(0.075 * (attempt + 1))


def read_json(path, fallback):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else fallback


def license_id(value):
    value = str(value).lower().replace("http://", "https://").rstrip("/")
    if value in ("creative commons 0", "https://creativecommons.org/publicdomain/zero/1.0"):
        return "CC0-1.0"
    match = re.fullmatch(r"https://creativecommons.org/licenses/by/(\d\.\d)", value)
    if match:
        return "CC-BY-" + match[1]
    # Ambiguous labels or NC/ND/SA are never silently treated as commercial-ready.
    return None


def safe_url(value, preview=False):
    url = urllib.parse.urlparse(str(value or ""))
    hosts = {"freesound.org", "cdn.freesound.org"} if preview else {"freesound.org"}
    if url.scheme != "https" or url.hostname not in hosts or url.username or url.password:
        return None
    return str(value)


def normalize(row, family, query, config):
    license_code = license_id(row.get("license"))
    ident = row.get("id")
    if not isinstance(ident, int) or ident in config["excludeSoundIds"] or not license_code:
        return None
    duration = float(row.get("duration") or 0)
    rate = int(float(row.get("samplerate") or 0))
    channels = int(row.get("channels") or 0)
    if not family["minDuration"] <= duration <= family["maxDuration"] or rate < config["minSampleRate"] or channels not in (1, 2):
        return None
    previews = row.get("previews") or {}
    preview = safe_url(previews.get("preview-hq-mp3") or previews.get("preview-hq-ogg"), preview=True)
    source = safe_url(row.get("url"))
    if not preview or not source:
        return None
    return {"id": "freesound-" + str(ident), "soundId": ident, "family": family["id"],
            "title": str(row.get("name", ""))[:250], "creator": str(row.get("username", ""))[:100],
            "sourceUrl": source, "licenseDeclared": license_code, "licenseUrl": row["license"],
            "durationSeconds": duration, "format": row.get("type"), "sampleRateHz": rate,
            "channels": channels, "bytes": row.get("filesize"), "previewUrl": preview,
            "tags": [str(tag)[:80] for tag in row.get("tags", [])[:40]],
            "averageRating": row.get("avg_rating"), "ratingCount": row.get("num_ratings"),
            "downloads": row.get("num_downloads"), "pack": row.get("pack"), "md5": row.get("md5"),
            "discoveredBy": [query], "discoveredAt": stamp(), "reviewStatus": "open",
            "runtimeEligible": False, "runtimeWired": False, "masterDownloaded": False,
            "qualityStatus": "metadata-screened; human audition and original-file QC required",
            "needsSlice": duration > 6 and family["maxDuration"] <= 60}


class ApiClient:
    def __init__(self, token, config, cache):
        self.token, self.config, self.cache = token, config, cache
        self.requests = 0
        self.last_request = 0
        self.exhausted = set()

    def search(self, family, query, page):
        identity = (family["id"], query)
        if identity in self.exhausted:
            return {"results": []}
        filters = ('license:("Creative Commons 0" OR "Attribution") '
                   f'samplerate:[{self.config["minSampleRate"]} TO *] channels:[1 TO 2] '
                   f'duration:[{family["minDuration"]} TO {family["maxDuration"]}]')
        params = {"query": query, "filter": filters, "fields": FIELDS, "page": page,
                  "page_size": self.config["pageSize"], "sort": "score", "group_by_pack": 0}
        url = ENDPOINT + "?" + urllib.parse.urlencode(params)
        cache_path = self.cache / (hashlib.sha256(url.encode()).hexdigest() + ".json")
        if cache_path.exists():
            payload = read_json(cache_path, {})
        else:
            delay = self.config["requestIntervalSeconds"] - (time.monotonic() - self.last_request)
            if delay > 0:
                time.sleep(delay)
            request = urllib.request.Request(url, headers={"Authorization": "Token " + self.token,
                "User-Agent": "UnderstarPrivateSfxReview/1.0", "Accept": "application/json"})
            self.last_request = time.monotonic()
            self.requests += 1
            # No retry loop on 401/403/429, no alternate accounts or search scraping.
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = json.loads(response.read(8_000_000))
            atomic_json(cache_path, payload)
        if not payload.get("next"):
            self.exhausted.add(identity)
        return payload


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--api-use-authorized", action="store_true",
                        help="Confirm this API credential permits the intended use; commercial terms differ.")
    parser.add_argument("--max-requests", type=int, default=200)
    parser.add_argument("--key-stdin", action="store_true",
                        help="Read the API key from an inherited pipe without logging or saving it.")
    args = parser.parse_args()
    config = read_json(CONFIG, {})
    catalog_path = DEST / "catalog.json"
    catalog = read_json(catalog_path, {"schemaVersion": 1, "reviewOnly": True,
        "runtimeWired": False, "target": config["target"], "baselinePlayableSources": config["baseline"],
        "provider": "Freesound.org", "source": ENDPOINT, "candidates": []})
    rows = {row["soundId"]: row for row in catalog["candidates"]}
    if len(rows) >= config["target"]:
        print(json.dumps({"status": "complete", "candidateCount": len(rows), "networkRequests": 0}))
        return
    try:
        token = read_api_key(args.key_stdin)
    except ValueError as error:
        parser.error(str(error))
    status = "ready" if token else "needs-api-key"
    if not args.execute or not token or not args.api_use_authorized:
        catalog.update(status=status if not args.execute or not token else "needs-api-use-authorization",
                       candidateCount=len(rows), lastAttemptAt=stamp())
        atomic_json(catalog_path, catalog)
        print(json.dumps({"status": catalog["status"], "candidateCount": len(rows),
                          "target": config["target"], "queries": sum(len(f["queries"]) for f in config["families"]),
                          "networkRequests": 0, "catalog": str(catalog_path)}))
        return
    client = ApiClient(token, config, DEST / "cache")
    catalog.pop("lastErrorType", None)
    creators = Counter(row["creator"] for row in rows.values())
    packs = Counter(row.get("pack") for row in rows.values() if row.get("pack"))
    hashes = {row["md5"] for row in rows.values() if row.get("md5")}
    counts = Counter(row["family"] for row in rows.values())
    try:
        for page in range(1, config["maxPagesPerQuery"] + 1):
            for query_index in range(max(len(f["queries"]) for f in config["families"])):
                for family in config["families"]:
                    if len(rows) >= config["target"] or client.requests >= max(0, min(500, args.max_requests)):
                        raise StopIteration
                    if query_index >= len(family["queries"]) or counts[family["id"]] >= family["quota"]:
                        continue
                    query = family["queries"][query_index]
                    if (family["id"], query) in client.exhausted:
                        continue
                    payload = client.search(family, query, page)
                    for raw in payload.get("results", []):
                        row = normalize(raw, family, query, config)
                        if not row or row["soundId"] in rows or row.get("md5") in hashes:
                            continue
                        if creators[row["creator"]] >= config["maxPerCreator"] or (row.get("pack") and packs[row["pack"]] >= config["maxPerPack"]):
                            continue
                        if len(rows) >= config["target"] or counts[family["id"]] >= family["quota"]:
                            break
                        rows[row["soundId"]] = row
                        creators[row["creator"]] += 1
                        counts[family["id"]] += 1
                        if row.get("pack"):
                            packs[row["pack"]] += 1
                        if row.get("md5"):
                            hashes.add(row["md5"])
                    catalog.update(candidates=list(rows.values()), candidateCount=len(rows), status="collecting", lastAttemptAt=stamp())
                    atomic_json(catalog_path, catalog)
                    print(json.dumps({"family": family["id"], "count": len(rows), "requests": client.requests}), flush=True)
        status = "complete" if len(rows) >= config["target"] else "search-plan-exhausted"
    except StopIteration:
        status = "complete" if len(rows) >= config["target"] else "request-budget-reached"
    except urllib.error.HTTPError as error:
        status = f"http-{error.code}-stopped"  # Never log response bodies or credentials.
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        status = "network-or-response-error-stopped"
        catalog["lastErrorType"] = type(getattr(error, "reason", error)).__name__
    catalog.update(candidates=list(rows.values()), candidateCount=len(rows), status=status,
                   lastAttemptAt=stamp(), familyCounts=dict(counts), lastRunRequests=client.requests)
    atomic_json(catalog_path, catalog)
    print(json.dumps({"status": status, "candidateCount": len(rows), "target": config["target"], "requests": client.requests}))


if __name__ == "__main__":
    main()
