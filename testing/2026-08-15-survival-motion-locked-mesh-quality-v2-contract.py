"""Verify review-only Survival mesh quality without relaxing motion authority."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "values/survivalMeshQualityV2Review.json"
CONFIG = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
OUTPUT = ROOT / CONFIG["outputRoot"]
REPORT = json.loads((OUTPUT / "contract-report.json").read_text(encoding="utf-8"))
CELL = CONFIG["packedFrameSizePx"]
AUTHORITY = ROOT / "archive/2026-08-14-survival-quality-runtime-promotion-v1/rollback"
RUNTIME_PATHS = (
    "sprites/character/survival-character-blender-v2/runtime/survival-character-blender-v2-walk-sheet.png",
    "sprites/character/survival-ual-player-v1/runtime/survival-ual-player-v1-animation-polish-run-sheet.webp",
    "sprites/character/survival-ual-player-v1/runtime/survival-ual-player-v1-punch-jab-sheet.webp",
    "sprites/character/survival-character-blender-v2/runtime/survival-character-blender-v2-dig-up-piskel-polished-sheet.png",
    "sprites/character/survival-ual-player-v1/runtime/survival-ual-player-v1-ground-strike-sheet.webp",
    "sprites/character/survival-character-blender-v2/runtime/survival-character-blender-v2-superman-flight-prone-v3-sheet.png",
)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sheet_frame(sheet, index):
    columns = sheet.width // CELL
    left = (index % columns) * CELL
    top = (index // columns) * CELL
    return sheet.crop((left, top, left + CELL, top + CELL))


assert CONFIG["reviewOnly"] is True and CONFIG["productionChanged"] is False
assert CONFIG["renderSizePx"] == 2048 and CELL == 256
assert REPORT["reviewOnly"] is True and REPORT["productionChanged"] is False
assert set(CONFIG["families"]) == {"walk", "run", "mining-side", "mining-up", "mining-down", "flight"}

for family_id, family in CONFIG["families"].items():
    family_report = REPORT["families"][family_id]
    assert family_report["passed"] is True, family_id
    render_report = json.loads(
        (OUTPUT / "raw-2048" / family_id / "render-report.json").read_text(encoding="utf-8")
    )
    assert not any(render_report["motionEdits"].values()), family_id
    assert render_report["materialEdits"]["fullGlovePolygons"] > 0, family_id
    expected_render_count = family.get("renderFrameCount", family["frameCount"])
    assert len(render_report["sourceFrames"]) == expected_render_count, family_id
    with Image.open(ROOT / family["legacySheet"]) as source:
        legacy = source.convert("RGBA")
    with Image.open(OUTPUT / f"{family_id}-motion-locked-quality-v2-sheet.png") as source:
        packed = source.convert("RGBA")
    legacy_start = family.get("legacyFrameStart", 0)
    for index in range(family["frameCount"]):
        old_alpha = sheet_frame(legacy, legacy_start + index).getchannel("A").tobytes()
        new_alpha = sheet_frame(packed, index).getchannel("A").tobytes()
        assert new_alpha == old_alpha, f"{family_id} alpha drift at frame {index}"

with Image.open(OUTPUT / CONFIG["previewOutput"]) as comparison:
    assert getattr(comparison, "n_frames", 1) == sum(
        family["frameCount"] for family in CONFIG["families"].values()
    )

for relative_path in RUNTIME_PATHS:
    assert digest(ROOT / relative_path) == digest(AUTHORITY / relative_path), relative_path

print("survival motion-locked mesh quality v2: pass")
