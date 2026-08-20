"""Verify V3 changes only final RGB presentation over approved V2.1 frames."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "values/survivalMeshQualityV3Review.json").read_text(encoding="utf-8"))
V2 = json.loads((ROOT / CONFIG["sourceConfig"]).read_text(encoding="utf-8"))
OUTPUT = ROOT / CONFIG["outputRoot"]
REPORT = json.loads((OUTPUT / "report.json").read_text(encoding="utf-8"))
SOURCE = ROOT / CONFIG["sourceRoot"] / "packed-256"


assert CONFIG["reviewOnly"] is True and CONFIG["productionChanged"] is False
assert REPORT["reviewOnly"] is True and REPORT["productionChanged"] is False
assert set(REPORT["families"]) == set(V2["families"])

changed_rgb = 0
for family_id, family in V2["families"].items():
    family_report = REPORT["families"][family_id]
    assert family_report["alphaIdentical"] is True
    assert family_report["motionChanged"] is False
    assert family_report["frames"] == family["frameCount"]
    for index in range(family["frameCount"]):
        with Image.open(SOURCE / family_id / f"frame-{index:03d}.png") as image:
            old = image.convert("RGBA")
        with Image.open(OUTPUT / "v3-frames" / family_id / f"frame-{index:03d}.png") as image:
            new = image.convert("RGBA")
        assert old.getchannel("A").tobytes() == new.getchannel("A").tobytes()
        if ImageChops.difference(old.convert("RGB"), new.convert("RGB")).getbbox():
            changed_rgb += 1

assert changed_rgb == sum(family["frameCount"] for family in V2["families"].values())
with Image.open(OUTPUT / CONFIG["combinedOutput"]) as comparison:
    assert comparison.n_frames == changed_rgb

print("survival mesh quality v2-v3: pass")
