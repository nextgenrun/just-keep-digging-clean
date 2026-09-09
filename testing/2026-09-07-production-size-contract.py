"""Check the release disk cap, development-media exclusions, and retained runtime assets."""

import argparse
import hashlib
import json
from pathlib import Path
import runpy
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
builder = runpy.run_path(str(ROOT / "tools/2026-07-17-build-production.py"))
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--directory", default=str(ROOT / "dist-compact"))
directory = Path(parser.parse_args().directory).resolve()
manifest = json.loads((directory / "build-manifest.json").read_text(encoding="utf-8"))
assert builder["MAX_UNPACKED_BYTES"] == 10_000_000_000
assert 0 < manifest["maxUnpackedBytes"] <= builder["MAX_UNPACKED_BYTES"]
assert manifest["retainsPreviousRelease"] is False
size = builder["enforce_size_budget"](directory.rglob("*"), "Release under test")


class SizedFile:
    def __init__(self, size):
        self.size = size

    def is_file(self):
        return True

    def stat(self):
        return SimpleNamespace(st_size=self.size)


limit_file = SizedFile(builder["MAX_UNPACKED_BYTES"])
assert builder["enforce_size_budget"]([limit_file, limit_file], "Boundary")["fileCount"] == 1
try:
    builder["enforce_size_budget"]([limit_file, SizedFile(1)], "Sidecar overflow")
except ValueError:
    pass
else:
    raise AssertionError("Even a one-byte sidecar must fail the configured limit")

for path in directory.rglob("*"):
    if not path.is_file():
        continue
    source_path = ROOT / path.relative_to(directory)
    if path.suffix.lower() in builder["ASSET_SUFFIXES"]:
        assert not builder["is_excluded_asset"](source_path), f"Development media shipped: {path}"

for relative in (
    "sprites/character/survival-character-definition-v2/runtime/survival-blender-v2-dig-up-polished-sheet-0.webp",
    "sprites/character/survival-character-definition-v2/runtime/survival-blender-v2-fly-sheet-0.webp",
    "values/menuLoadingTheme.css",
    "api/player-data.php",
    "server/DualCopyPlayerDataStore.php",
):
    original = (ROOT / relative).read_bytes()
    packaged = (directory / relative).read_bytes()
    assert hashlib.sha256(original).digest() == hashlib.sha256(packaged).digest(), relative

assert not (directory / "archive").exists()
assert not (directory / ".git").exists()
assert not (directory / "visual-approval-previews").exists()
print(json.dumps({"result": "production size contract: ok", **size}, indent=2))
