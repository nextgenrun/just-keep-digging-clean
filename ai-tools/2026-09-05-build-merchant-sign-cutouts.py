"""Remove only connected outside mattes from the approved merchant sign images."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "sprites/UI/merchant-signs-v1"
CFG = json.loads((ROOT / "values/merchantSignArtBuild.json").read_text())
manifest_path = PACK / "manifest.json"
manifest = json.loads(manifest_path.read_text())
reports = []

for asset in manifest["assets"]:
    source_path = PACK / asset["sourceFile"]
    source_bytes = source_path.read_bytes()
    assert hashlib.sha256(source_bytes).hexdigest() == asset["sha256"], source_path
    original = Image.open(source_path).convert("RGB")
    rgb = np.asarray(original)
    candidate = np.min(rgb, axis=2) >= CFG["outsideMinimumChannel"]
    # Only remove pixels reachable from the image boundary. Enclosed bright
    # lettering and highlights stay fully opaque regardless of their color.
    flood = Image.fromarray(np.where(candidate, 255, 0).astype("uint8")).copy()
    for seed in [(0, 0), (original.width - 1, 0),
                 (0, original.height - 1), (original.width - 1, original.height - 1)]:
        if flood.getpixel(seed) == 255:
            ImageDraw.floodfill(flood, seed, CFG["floodMarker"], thresh=0)
    alpha = np.where(np.asarray(flood) == CFG["floodMarker"], 0, 255).astype("uint8")
    alpha_image = Image.fromarray(alpha)
    bounds = alpha_image.getbbox()
    assert bounds is not None
    left, top, right, bottom = bounds
    insets = CFG["opaqueCore"]
    x0, x1 = [round(left + (right - left) * v) for v in insets["x"]]
    y0, y1 = [round(top + (bottom - top) * v) for v in insets["y"]]
    assert np.all(alpha[y0:y1, x0:x1] == 255), "The letter-bearing center must stay opaque"
    cutout = original.convert("RGBA")
    cutout.putalpha(alpha_image)
    assert np.array_equal(np.asarray(cutout)[:, :, :3], rgb), "Source RGB was changed"
    padding = CFG["sourcePadding"]
    crop = bounds
    cropped = ImageOps.expand(cutout.crop(crop), border=padding, fill=(0, 0, 0, 0))
    master_file = asset["runtimeFile"].replace(".png", "-alpha.png")
    cropped.save(PACK / master_file, optimize=True)
    runtime_width = min(CFG["runtimeWidth"], cropped.width)
    size = (runtime_width, round(cropped.height * runtime_width / cropped.width))
    # Resize premultiplied pixels so the removed pale backdrop cannot bleed
    # into the transparent edge. This never draws or replaces lettering.
    runtime = cropped.convert("RGBa").resize(size, Image.Resampling.LANCZOS).convert("RGBA")
    runtime_path = PACK / asset["runtimeFile"]
    runtime.save(runtime_path, optimize=True)
    a = np.asarray(runtime.getchannel("A"))
    assert a.min() == 0 and a.max() == 255
    assert np.all(a[0] == 0) and np.all(a[-1] == 0)
    assert np.all(a[:, 0] == 0) and np.all(a[:, -1] == 0)
    info = {
        "masterFile": master_file, "crop": list(crop), "transparentPadding": padding,
        "width": size[0], "height": size[1], "mode": runtime.mode,
        "bytes": runtime_path.stat().st_size,
        "sha256": hashlib.sha256(runtime_path.read_bytes()).hexdigest(),
        "transparentPixels": int(np.count_nonzero(a == 0)),
        "partialAlphaPixels": int(np.count_nonzero((a > 0) & (a < 255))),
        "opaqueLetterCore": True, "sourceRGBChanged": 0,
    }
    asset["runtime"] = info
    reports.append({"id": asset["id"], **info})
manifest["cleanup"] = {
    "authorized": "User approved code-based outside-background removal on 2026-09-05",
    "method": "Boundary-connected pale matte removal; untouched RGB alpha masters; premultiplied runtime resize",
    "builder": "ai-tools/2026-09-05-build-merchant-sign-cutouts.py",
    "config": "values/merchantSignArtBuild.json",
}
manifest["status"] = "Six transparent cutouts built; runtime visual verification pending"
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps(reports, indent=2))
