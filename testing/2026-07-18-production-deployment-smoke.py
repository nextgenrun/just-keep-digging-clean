"""Fast contract checks for the isolated production snapshot pipeline."""

from __future__ import annotations

import json
from pathlib import Path
import runpy


ROOT = Path(__file__).resolve().parents[1]
BUILD_PATH = ROOT / "tools" / "2026-07-17-build-production.py"
SERVER_PATH = ROOT / "tools" / "2026-07-17-serve-production.py"

builder = runpy.run_path(str(BUILD_PATH))
modules = builder["module_graph"](builder["ENTRY_MODULE"])
assets, unresolved = builder["discover_assets"](modules)

assert len(modules) >= 200, "the production graph must include the complete game runtime"
assert len(assets) >= 1000, "the production graph must include runtime media, not source only"
assert all(path.is_file() and ROOT in path.parents for path in modules)
assert all(path.is_file() and ROOT in path.parents for path in assets)

for relative_directory in (
    "sprites/npc/campfire/generated",
    "sprites/tiles/dynamic-soil",
):
    expected = {
        path.resolve()
        for path in (ROOT / relative_directory).rglob("*")
        if path.is_file() and path.suffix.lower() in builder["ASSET_SUFFIXES"]
    }
    assert expected <= assets, f"collector missed dynamic runtime directory: {relative_directory}"

build_id = builder["production_build_id"](modules, assets)
assert len(build_id) == 12
assert build_id == builder["production_build_id"](modules, assets)

# Warnings are allowed only for literals that are already absent from the dev
# checkout. A source file that exists but was not collected is a build failure.
for literal in unresolved:
    assert not (ROOT / literal).is_file(), f"collector missed existing runtime asset: {literal}"

index = builder["production_index"]("contract123")
marker_index = index.index("globalThis.__DIG_GAME_PRODUCTION__ = true")
build_id_index = index.index('globalThis.__DIG_GAME_BUILD_ID__ = "contract123"')
phaser_index = index.index("./libs/phaser.js?v=contract123")
main_index = index.index("./main.js?v=contract123")
assert marker_index < build_id_index < phaser_index < main_index
assert '["jkd_e2e", "ui-review", "cave-review"]' in index

try:
    builder["safe_output_path"](str(ROOT))
except ValueError:
    pass
else:
    raise AssertionError("the builder must refuse to replace the project root")

server_source = SERVER_PATH.read_text(encoding="utf-8")
for contract in (
    'protocol_version = "HTTP/1.1"',
    'self.send_header("Content-Encoding", encoding)',
    'self.send_header("Content-Range"',
    'self.send_header("Cache-Control"',
    'self.send_error(405, "Production server is read-only")',
    '".wasm": "application/wasm"',
    '".webp": "image/webp"',
    '".ktx2": "image/ktx2"',
):
    assert contract in server_source, f"missing production HTTP contract: {contract}"

dist_manifest = ROOT / "dist" / "build-manifest.json"
if dist_manifest.is_file():
    manifest = json.loads(dist_manifest.read_text(encoding="utf-8"))
    assert manifest["debugMode"] is False
    assert manifest["moduleCount"] >= 200
    assert manifest["assetCount"] >= 1000
    production_html = (ROOT / "dist" / "index.html").read_text(encoding="utf-8")
    assert "globalThis.__DIG_GAME_PRODUCTION__ = true" in production_html
    if "globalThis.__DIG_GAME_BUILD_ID__" in production_html:
        assert f'globalThis.__DIG_GAME_BUILD_ID__ = "{manifest["buildId"]}"' in production_html

print("production deployment smoke: ok")
