"""Verify active authored PNGs against their untouched ImageGen source metadata.

--restore-originals copies source bytes again when explicitly requested.
Frame selection belongs to /values; this tool never alters image pixels.
"""
from pathlib import Path
import hashlib
import json
import shutil
import sys

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / "sprites/UI/baked-copy-v1"
metadata = json.loads((PACK / "source-frames.json").read_text(encoding="utf8"))
manifest = json.loads((PACK / "manifest.json").read_text(encoding="utf8"))
by_file = {entry["file"]: entry for entry in metadata.values()}
for asset in manifest["assets"]:
    info = by_file[asset["file"]]
    destination = PACK / asset["file"]
    if "--restore-originals" in sys.argv:
        shutil.copyfile(info["source"], destination)
    actual = hashlib.sha256(destination.read_bytes()).hexdigest()
    assert actual == info["sha256"] == asset["sha256"], asset["file"]
print(f"Verified {len(manifest['assets'])} untouched authored PNGs")
