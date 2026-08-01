"""Validate the dedicated 250-frame ImageGen Star light package."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "sprites" / "environment" / "star-identity-lights-v1"
MANIFEST = json.loads(
    (PACKAGE / "star-identity-lights-v1.manifest.json").read_text(
        encoding="utf-8",
    )
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def png_size(path: Path, require_rgba: bool = False) -> tuple[int, int]:
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", f"not PNG: {path}"
    if require_rgba:
        assert data[25] == 6, f"atlas must be RGBA: {path}"
    return (
        int.from_bytes(data[16:20], "big"),
        int.from_bytes(data[20:24], "big"),
    )


assert MANIFEST["schemaVersion"] == 1
assert MANIFEST["packageId"] == "star-identity-lights-v1"
assert MANIFEST["artSource"] == "OpenAI ImageGen built-in"
assert MANIFEST["identityCount"] == 250
assert MANIFEST["frameSize"] == 192
assert MANIFEST["atlasColumns"] == 10
assert MANIFEST["withinOriginalDecodedBudget"] is True
assert MANIFEST["decodedBytes"] <= MANIFEST["originalSixLightDecodedBytes"]
assert len(MANIFEST["sources"]) == 10
assert len(MANIFEST["atlases"]) == 6

call_ids = set()
for page, source in enumerate(MANIFEST["sources"], start=1):
    source_path = ROOT / source["path"]
    assert source["page"] == page
    assert source["globalStartIndex"] == (page - 1) * 25
    assert source["columns"] == 5
    assert source["rows"] == 5
    assert source["frameCount"] == 25
    assert source_path.is_file()
    assert sha256(source_path) == source["sha256"]
    assert png_size(source_path) == tuple(source["sourceSize"])
    assert source["imageGenCallId"].startswith("call_")
    call_ids.add(source["imageGenCallId"])
assert len(call_ids) == 10

expected_counts = [60, 50, 50, 40, 30, 20]
frame_hashes = set()
decoded_bytes = 0
for atlas, expected_count in zip(MANIFEST["atlases"], expected_counts):
    output = ROOT / atlas["output"]
    assert output.is_file()
    assert sha256(output) == atlas["outputSha256"]
    assert atlas["frameSize"] == 192
    assert atlas["columns"] == 10
    assert atlas["frameCount"] == expected_count
    assert len(atlas["frames"]) == expected_count
    assert png_size(output, require_rgba=True) == (
        atlas["columns"] * atlas["frameSize"],
        atlas["rows"] * atlas["frameSize"],
    )
    decoded_bytes += atlas["decodedBytes"]
    for frame in atlas["frames"]:
        assert 0.4 < frame["alphaCoverage"] < 0.75
        assert frame["edgeAlphaMaximum"] <= 3
        frame_hashes.add(frame["rgbaSha256"])

assert decoded_bytes == MANIFEST["decodedBytes"]
assert len(frame_hashes) == 250
print(
    "star identity light art contract: PASS "
    "(250 unique RGBA lights, transparent edges, original-light memory cap)"
)
