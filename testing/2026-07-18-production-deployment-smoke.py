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
assert not any("biome-motion-v2" in path.parts for path in assets)
assert not any("underground-biome-smooth-motion-v3" in path.parts for path in assets)

for relative_directory in (
    "sprites/npc/campfire/generated",
    "sprites/tiles/dynamic-soil",
    "sprites/tiles/resource-tiles-imagegen-v3",
    "sprites/backgrounds/world-visual-v2/depth/biome-motion-v3",
):
    expected = {
        path.resolve()
        for path in (ROOT / relative_directory).rglob("*")
        if path.is_file() and path.suffix.lower() in builder["ASSET_SUFFIXES"]
    }
    assert expected <= assets, f"collector missed dynamic runtime directory: {relative_directory}"

arc_pack_path = ROOT / "values" / "arcCoreVisuals.sprite.json"
arc_pack = json.loads(arc_pack_path.read_text(encoding="utf-8"))
arc_section = arc_pack["arcCoreV3"]
assert not arc_section["path"].startswith(("/", "\\")), (
    "Arc runtime pack path must resolve inside a subdirectory deployment"
)
arc_runtime_root = ROOT / arc_section["path"]
arc_runtime_assets = {
    (arc_runtime_root / entry["url"]).resolve()
    for entry in arc_section["files"]
}
assert arc_pack_path.resolve() in assets, "collector missed the Arc .sprite manifest"
assert arc_runtime_assets <= assets, "collector missed approved Arc runtime layers"

rejected_arc_archive = ROOT / "archive" / "2026-07-26-rejected-arc-review-random-art"
rejected_arc_assets = {
    path.resolve()
    for path in rejected_arc_archive.rglob("*")
    if path.is_file() and path.suffix.lower() in builder["ASSET_SUFFIXES"]
}
assert assets.isdisjoint(rejected_arc_assets), "rejected Arc review art entered production"

build_id = builder["production_build_id"](modules, assets)
assert len(build_id) == 12
assert build_id == builder["production_build_id"](modules, assets)

assert (
    builder["version_local_module_specifier"]("./values/config.js", "contract123")
    == "./values/config.js?v=contract123"
)
assert (
    builder["version_local_module_specifier"](
        "./values/config.js?rev=stale#fragment",
        "contract123",
    )
    == "./values/config.js?v=contract123#fragment"
)
assert (
    builder["version_local_module_specifier"]("phaser", "contract123")
    == "phaser"
)
versioned_main = builder["production_module_source"](ROOT / "main.js", "contract123")
for match in builder["MODULE_RE"].finditer(versioned_main):
    specifier = match.group(1) or match.group(2)
    if specifier.startswith("."):
        assert "?v=contract123" in specifier
        assert "?rev=" not in specifier

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
assert '["jkd_e2e", "ui-review", "cave-review", "wurm", "wurm10x"]' in index

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
    '".webm": "video/webm"',
    '".mp4": "video/mp4"',
    '".ktx2": "image/ktx2"',
):
    assert contract in server_source, f"missing production HTTP contract: {contract}"

dist_manifest = ROOT / "dist" / "build-manifest.json"
if dist_manifest.is_file():
    manifest = json.loads(dist_manifest.read_text(encoding="utf-8"))
    assert manifest["debugMode"] is False
    assert manifest["moduleCount"] >= 200
    assert manifest["assetCount"] >= 1000
    assert manifest["moduleCacheKey"] == manifest["buildId"]
    production_html = (ROOT / "dist" / "index.html").read_text(encoding="utf-8")
    assert "globalThis.__DIG_GAME_PRODUCTION__ = true" in production_html
    if "globalThis.__DIG_GAME_BUILD_ID__" in production_html:
        assert f'globalThis.__DIG_GAME_BUILD_ID__ = "{manifest["buildId"]}"' in production_html
    dist_arc_pack = json.loads(
        (ROOT / "dist" / "values" / "arcCoreVisuals.sprite.json").read_text(
            encoding="utf-8"
        )
    )
    dist_arc_section = dist_arc_pack["arcCoreV3"]
    assert not dist_arc_section["path"].startswith(("/", "\\"))
    dist_arc_root = ROOT / "dist" / dist_arc_section["path"]
    assert all(
        (dist_arc_root / entry["url"]).is_file()
        for entry in dist_arc_section["files"]
    ), "production snapshot is missing Arc runtime layers"
    for module in modules:
        dist_module = ROOT / "dist" / module.relative_to(ROOT)
        dist_source = dist_module.read_text(encoding="utf-8")
        for match in builder["MODULE_RE"].finditer(dist_source):
            specifier = match.group(1) or match.group(2)
            if specifier.startswith("."):
                assert f"?v={manifest['buildId']}" in specifier, (
                    f"unversioned production import in {dist_module}: {specifier}"
                )

print("production deployment smoke: ok")
