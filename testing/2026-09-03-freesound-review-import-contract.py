"""Offline safety checks for the Freesound review importer. No API calls."""
import importlib.util
import io
import json
from collections import Counter
from contextlib import redirect_stdout
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("review_import", ROOT / "pipelines/audio/crawlFreesoundReview.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
config = json.loads(module.CONFIG.read_text(encoding="utf-8"))
captured = io.StringIO()
with patch.object(module.sys, "stdin", io.StringIO(" test-fixture-not-a-key \n")), redirect_stdout(captured):
    assert module.read_api_key(True) == "test-fixture-not-a-key"
assert captured.getvalue() == ""
with patch.object(module.sys.stdin, "isatty", return_value=True):
    try:
        module.read_api_key(True)
        raise AssertionError("An echoing terminal must not accept API keys")
    except ValueError:
        pass
assert config["target"] == config["baseline"] * 50 == 4250
assert config["requestIntervalSeconds"] >= 2
assert config["pageSize"] <= 150
assert sum(row["quota"] for row in config["families"]) >= config["target"]
assert module.license_id("https://creativecommons.org/publicdomain/zero/1.0/") == "CC0-1.0"
assert module.license_id("http://creativecommons.org/licenses/by/4.0/") == "CC-BY-4.0"
for invalid in ["Attribution", "unknown", "https://creativecommons.org/licenses/by-nc/4.0/", "https://creativecommons.org/licenses/by-sa/4.0/"]:
    assert module.license_id(invalid) is None
for invalid in ["http://freesound.org/a.mp3", "https://evil.example/a.mp3", "javascript:alert(1)", "https://user:password@freesound.org/a.mp3"]:
    assert module.safe_url(invalid, preview=True) is None
family = {"id": "test", "minDuration": .1, "maxDuration": 20}
source = {"id": 900001, "name": "<not executable>", "username": "fixture", "license": "https://creativecommons.org/publicdomain/zero/1.0/",
    "duration": 1.2, "samplerate": 48000, "channels": 2, "url": "https://freesound.org/people/fixture/sounds/900001/",
    "previews": {"preview-hq-mp3": "https://cdn.freesound.org/previews/900/900001_1-hq.mp3"}, "type": "wav", "tags": ["stone"]}
row = module.normalize(source, family, "rock", config)
assert row["runtimeEligible"] is False and row["runtimeWired"] is False
assert row["reviewStatus"] == "open" and row["masterDownloaded"] is False
assert row["title"] == "<not executable>"
for override in [{"samplerate": 16000}, {"channels": 6}, {"duration": 100}, {"id": config["excludeSoundIds"][0]}, {"previews": {}}]:
    assert module.normalize({**source, **override}, family, "rock", config) is None
with TemporaryDirectory(prefix="understar-review-contract-") as temporary:
    target = Path(temporary) / "catalog.json"
    replace = module.os.replace
    attempts = []
    def transient_reader_lock(source_path, target_path):
        attempts.append(1)
        if len(attempts) == 1:
            raise PermissionError("Fixture reader lock")
        return replace(source_path, target_path)
    with patch.object(module.os, "replace", side_effect=transient_reader_lock), patch.object(module.time, "sleep"):
        module.atomic_json(target, {"reviewOnly": True})
    assert len(attempts) == 2 and json.loads(target.read_text())["reviewOnly"] is True
    cache = Path(temporary) / "cache"
    client = module.ApiClient("test-fixture-not-a-key", config, cache)
    with patch.object(module.urllib.request, "urlopen", return_value=io.BytesIO(b'{"results":[],"next":null}')) as request:
        client.search(family, "fixture", 1)
        client.search(family, "fixture", 2)
        assert request.call_count == 1 and client.requests == 1
    resumed = module.ApiClient("test-fixture-not-a-key", config, cache)
    with patch.object(module.urllib.request, "urlopen", side_effect=AssertionError("Cache must avoid the network")):
        resumed.search(family, "fixture", 1)
        resumed.search(family, "fixture", 2)
        assert resumed.requests == 0
page = (ROOT / "testing/audio-review-2026-09-03/freesound.html").read_text(encoding="utf-8")
assert 'preload="none"' in page and 'textContent = row.title' in page
assert "audio.src = url" in page and "row.previewUrl" in page
assert "runtimeWired: false" in page and "visibilitychange" in page
assert 'request !== playbackRequest' in page and 'Loading: ${row.title}' in page
catalog = module.read_json(module.DEST / "catalog.json", {"candidates": []})
candidates = catalog["candidates"]
ids = [row["soundId"] for row in candidates]
hashes = [row["md5"] for row in candidates if row.get("md5")]
assert len(ids) == len(set(ids)) and len(hashes) == len(set(hashes))
assert not set(ids).intersection(config["excludeSoundIds"])
families = {row["id"]: row for row in config["families"]}
for candidate in candidates:
    family = families[candidate["family"]]
    assert candidate["reviewStatus"] == "open" and candidate["runtimeWired"] is False
    assert candidate["runtimeEligible"] is False and candidate["masterDownloaded"] is False
    assert module.license_id(candidate["licenseUrl"]) == candidate["licenseDeclared"]
    assert module.safe_url(candidate["sourceUrl"]) and module.safe_url(candidate["previewUrl"], preview=True)
    assert candidate["sampleRateHz"] >= config["minSampleRate"] and candidate["channels"] in (1, 2)
    assert family["minDuration"] <= candidate["durationSeconds"] <= family["maxDuration"]
creator_counts = Counter(row["creator"] for row in candidates)
pack_counts = Counter(row["pack"] for row in candidates if row.get("pack"))
family_counts = Counter(row["family"] for row in candidates)
assert max(creator_counts.values(), default=0) <= config["maxPerCreator"]
assert max(pack_counts.values(), default=0) <= config["maxPerPack"]
assert all(count <= families[family]["quota"] for family, count in family_counts.items())
if catalog.get("status") == "complete":
    assert len(candidates) == config["target"] and len(family_counts) == len(families)
report = {"passed": True, "checkedAt": module.stamp(), "networkRequests": 0,
    "target": config["target"], "candidateCount": len(candidates), "status": catalog.get("status"),
    "families": len(families), "queries": sum(len(f["queries"]) for f in config["families"]),
    "uniqueCreators": len(creator_counts), "uniqueSoundIds": len(set(ids)), "uniqueSourceHashes": len(set(hashes)),
    "largestCreatorCount": max(creator_counts.values(), default=0), "largestPackCount": max(pack_counts.values(), default=0),
    "familyCounts": dict(sorted(family_counts.items())),
    "licenseCounts": dict(sorted(Counter(row["licenseDeclared"] for row in candidates).items())),
    "cachedSearchPages": len(list((module.DEST / "cache").glob("*.json"))),
    "runtimeWired": False, "originalMastersDownloaded": 0,
    "qualityScope": "Metadata and review-boundary checks only; human audition and original-file QC remain required."}
module.atomic_json(ROOT / "testing/audio-review-2026-09-03/freesound-catalog-audit.json", report)
print(json.dumps(report))
