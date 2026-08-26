from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = PROJECT_ROOT / "sprites" / "UI" / "inventory-fullness-v3"
MANIFEST_PATH = ASSET_ROOT / "manifest-v3.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
assert manifest["schema"] == "understar-inventory-fullness/v3"
assert manifest["stateCount"] == 10
assert manifest["invariantRegion"] == [0, 0, 256, 78]
assert manifest["cargoChangeRegion"] == [44, 78, 212, 148]
assert manifest["cavityBounds"] == [47, 79, 209, 151]
assert len(manifest["frontOcclusionCurve"]) == 7
assert len(manifest["assets"]) == 10

invariant_region = tuple(manifest["invariantRegion"])
change_region = tuple(manifest["cargoChangeRegion"])
base_pixels = None
base_image = None
runtime_hashes = set()

for asset in manifest["assets"]:
    path = ASSET_ROOT / asset["path"]
    assert path.is_file(), path
    assert sha256(path) == asset["sha256"]
    runtime_hashes.add(asset["sha256"])

    with Image.open(path) as opened:
        image = opened.convert("RGBA")
    assert image.size == (256, 256)
    assert all(
        image.getpixel(point)[3] == 0
        for point in ((0, 0), (255, 0), (0, 255), (255, 255))
    )

    locked_pixels = image.crop(invariant_region).tobytes()
    if base_pixels is None:
        base_pixels = locked_pixels
        base_image = image
        assert asset["sha256"] == manifest["baseReferenceSha256"]
        assert asset["changeBounds"] is None
    else:
        assert locked_pixels == base_pixels, f"state {asset['state']} colour drift"
        change_bounds = ImageChops.difference(
            image.convert("RGB"),
            base_image.convert("RGB"),
        ).getbbox()
        assert change_bounds is not None
        assert list(change_bounds) == asset["changeBounds"]
        assert change_bounds[0] >= change_region[0]
        assert change_bounds[1] >= change_region[1]
        assert change_bounds[2] <= change_region[2]
        assert change_bounds[3] <= change_region[3]
    assert asset["lockedBagPixels"] is True
    assert asset["embeddedInsideCavity"] is True
    assert bool(asset["overlaySourceSha256"]) is (asset["state"] > 1)

assert len(runtime_hashes) == 10
assert hashlib.sha256(base_pixels).hexdigest() == manifest["invariantRegionPixelSha256"]
print("INVENTORY_FULLNESS_COLOR_DRIFT_CONTRACT_OK")
