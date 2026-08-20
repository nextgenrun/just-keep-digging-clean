"""Verify all isolated V4 hero-quality action comparisons and runtime safety."""

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "values/survivalHeroQualityV4Review.json").read_text(encoding="utf-8"))
V2 = json.loads((ROOT / CONFIG["baseConfig"]).read_text(encoding="utf-8"))
OUTPUT = ROOT / CONFIG["outputRoot"]
COMPARE = json.loads((OUTPUT / "comparison-report.json").read_text(encoding="utf-8"))
EXPECTED = set(CONFIG["actionReview"]["order"])

assert CONFIG["reviewOnly"] is True
assert CONFIG["productionChanged"] is False
assert CONFIG["sourceBlendChanged"] is False
assert CONFIG["gates"]["bodyMotionChanged"] is False
assert CONFIG["gates"]["subdivisionAdded"] is False
assert COMPARE["reviewOnly"] is True
assert COMPARE["productionChanged"] is False
assert COMPARE["bodyMotionChanged"] is False
assert COMPARE["facingChanged"] is False
assert COMPARE["subdivisionAdded"] is False
assert set(COMPARE["families"]) == EXPECTED

total_frames = 0
for family_id in CONFIG["actionReview"]["order"]:
    family = V2["families"][family_id]
    render = json.loads((OUTPUT / f"raw-2048/{family_id}/render-report.json").read_text(encoding="utf-8"))
    comparison = COMPARE["families"][family_id]
    assert render["reviewOnly"] is True
    assert render["productionChanged"] is False
    assert render["sourceBlendChanged"] is False
    assert render["subdivisionAdded"] is False
    assert render["meshVertices"] == 83188
    assert render["meshPolygons"] == 119304
    assert render["motionEdits"]["bodyBones"] is False
    assert render["motionEdits"]["weights"] is False
    assert render["motionEdits"]["camera"] is False
    assert render["motionEdits"]["root"] is False
    assert render["motionEdits"]["secondaryShapeKeysReviewOnly"] is True
    assert set(render["pbrReconstruction"]) == set(CONFIG["pbrMaterials"])
    assert all(material["ormSplit"] is True for material in render["pbrReconstruction"].values())
    assert len(render["textures"]["fullResolutionRestored"]) >= 30
    assert render["fullGlovePolygons"] > 0
    assert render["renderFrameCount"] == family.get("renderFrameCount", family["frameCount"])
    assert comparison["frames"] == family["frameCount"]
    assert comparison["minimumAlphaIou"] >= CONFIG["gates"]["minimumAlphaIou"]
    assert comparison["maximumCentroidDeltaPx"] <= CONFIG["gates"]["maximumCentroidDeltaPx"]
    assert comparison["maximumBoundsDeltaPx"] <= CONFIG["gates"]["maximumBoundsDeltaPx"]
    assert comparison["saturatedGreenPixels"] == 0
    assert len(list((OUTPUT / f"packed-256/{family_id}").glob("frame-*.png"))) == family["frameCount"]
    preview = OUTPUT / CONFIG["actionReview"]["families"][family_id]["output"]
    with Image.open(preview) as image:
        assert image.n_frames == family["frameCount"]
    total_frames += family["frameCount"]

with Image.open(OUTPUT / CONFIG["actionReview"]["combinedOutput"]) as image:
    assert image.n_frames == total_frames == 164

print("SURVIVAL_HERO_QUALITY_V4_CONTRACT_OK")
