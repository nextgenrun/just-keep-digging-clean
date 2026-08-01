from __future__ import annotations

import hashlib
import importlib.util
import json
import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
EXPORT = ROOT / "exports/piskel/ground-damage-anchor-v2-review"
PISKEL_TOOLS = ROOT / "tools/piskel-mcp"
sys.path.insert(0, str(PISKEL_TOOLS))
from piskel_document import read_piskel  # noqa: E402


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise AssertionError(f"Unable to load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pixel_sha256(image: Image.Image) -> str:
    return hashlib.sha256(image.convert("RGBA").tobytes()).hexdigest()


manifest = json.loads((EXPORT / "manifest.json").read_text(encoding="utf-8"))
report = json.loads((EXPORT / "geometry-report.json").read_text(encoding="utf-8"))
assert manifest["reviewOnly"] is True
assert manifest["productionChanged"] is False
assert report["reviewOnly"] is True
assert report["productionChanged"] is False
assert manifest["variants"] == 10
assert manifest["statesPerVariant"] == 12
assert manifest["frameSizePx"] == 188
assert len(manifest["piskelProjects"]) == 10
assert len(manifest["strips"]) == 10

atlas = Image.open(ROOT / manifest["candidateAtlas"]).convert("RGBA")
assert atlas.size == (1880, 2256)

for family, project_path in zip(report["families"], manifest["piskelProjects"]):
    assert family["policy"] == "fixed-canvas-ground-fracture-seed"
    assert family["frameSizePx"] == [188, 188]
    assert family["targetPivotPx"] == [94, 94]
    assert family["targetFractureSeedPx"] == [94, 94]
    assert 0 < family["sharedScale"] <= 1
    assert len(family["frames"]) == 12
    coverage = []
    expected_hashes = []
    for frame in family["frames"]:
        assert frame["mappedAnchorPx"] == [94.0, 94.0]
        assert frame["candidate"]["edgeVisiblePixels"] == 0
        assert frame["previousVisibleRetention"] >= 0.998
        coverage.append(frame["candidate"]["coverage"])
        expected_hashes.append(frame["pixelSha256"])
    assert all(after >= before for before, after in zip(coverage, coverage[1:]))

    frames, width, height, fps = read_piskel(ROOT / project_path)
    assert (len(frames), width, height, fps) == (12, 188, 188, 6)
    assert [pixel_sha256(frame) for frame in frames] == expected_hashes

for relative, expected in manifest["sha256"].items():
    assert file_sha256(ROOT / relative) == expected

v1_builder = load_module(
    ROOT / "ai-tools/2026-07-29-build-ground-damage-imagegen-v1.py",
    "ground_damage_v1_builder",
)
v2_builder = load_module(
    ROOT / "ai-tools/2026-07-30-build-ground-damage-piskel-anchor-v2.py",
    "ground_damage_v2_builder",
)
expected_boxes = (
    (21, 0, 362, 341),
    (21, 341, 362, 683),
    (21, 683, 362, 1024),
)
for builder in (v1_builder, v2_builder):
    assert builder.source_frame_box(0) == expected_boxes[0]
    assert builder.source_frame_box(4) == expected_boxes[1]
    assert builder.source_frame_box(8) == expected_boxes[2]

production_values = (ROOT / "values/worldVisualDamage.js").read_text(encoding="utf-8")
boot_source = (ROOT / "ui/scenes/BootScene.js").read_text(encoding="utf-8")
candidate_path = manifest["candidateAtlas"]
assert candidate_path not in production_values
assert candidate_path not in boot_source
assert "ground-damage-anchor-v2-review" not in production_values
assert "ground-damage-anchor-v2-review" not in boot_source

harness = (
    ROOT / "testing/2026-07-30-ground-damage-piskel-anchor-v2-harness.js"
).read_text(encoding="utf-8")
assert "WorldVisualDamageImagePainter" in harness
assert "CANDIDATE_DAMAGE" in harness
assert "productionChanged: false" in harness
assert "placementContract: \"WorldVisualDamageImagePainter.draw\"" in harness

print(
    "Ground-damage Piskel anchor V2 contract passed: "
    "10x12 editable frames, corrected 341/342/341 row slices, fixed 94,94 seed, "
    "cumulative coverage, exact round-trip, review-only"
)
