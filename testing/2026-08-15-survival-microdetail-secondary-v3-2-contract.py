import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "values/survivalMicrodetailSecondaryV32Review.json").read_text(encoding="utf-8"))
OUTPUT = ROOT / CONFIG["outputRoot"]
RAW_REPORT = json.loads((OUTPUT / "raw-2048/walk/render-report.json").read_text(encoding="utf-8"))
COMPARE = json.loads((OUTPUT / "comparison-report.json").read_text(encoding="utf-8"))

assert CONFIG["reviewOnly"] is True
assert CONFIG["productionChanged"] is False
assert CONFIG["limits"]["sourceBlendChanged"] is False
assert CONFIG["limits"]["addedSubdivision"] is False
assert RAW_REPORT["reviewOnly"] is True
assert RAW_REPORT["productionChanged"] is False
assert RAW_REPORT["subdivisionAdded"] is False
assert RAW_REPORT["motionEdits"]["bodyBones"] is False
assert RAW_REPORT["motionEdits"]["weights"] is False
assert RAW_REPORT["motionEdits"]["camera"] is False
assert RAW_REPORT["motionEdits"]["root"] is False
assert RAW_REPORT["motionEdits"]["secondaryShapeKeysReviewOnly"] is True
assert RAW_REPORT["meshVertices"] == 83188
assert RAW_REPORT["meshPolygons"] == 119304
assert RAW_REPORT["renderFrameCount"] == 24
assert len(RAW_REPORT["textures"]["fullResolutionRestored"]) >= 30
assert set(RAW_REPORT["secondaryMotion"]) == {"hair", "jacketHem", "backpackSettle"}
assert COMPARE["frames"] == 24
assert COMPARE["bodyActionChanged"] is False
assert COMPARE["subdivisionAdded"] is False
assert COMPARE["alpha"]["minimumIou"] >= 0.95
assert COMPARE["alpha"]["maximumCentroidDeltaPx"] <= 1.0
assert len(list((OUTPUT / "raw-2048/walk").glob("frame-*.png"))) == 24
assert len(list((OUTPUT / "packed-256/walk").glob("frame-*.png"))) == 24
assert (OUTPUT / "v2-1-vs-v3-2-microdetail-secondary.gif").is_file()

print("SURVIVAL_MICRODETAIL_SECONDARY_V32_CONTRACT_OK")
