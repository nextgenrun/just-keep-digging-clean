"""Pack the rendered held-torch review frames into a local animated GIF."""

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
config = json.loads((ROOT / "values/survivalHeldTorchBlenderV1.json").read_text())
output = ROOT / config["outputRoot"]
paths = sorted((output / "soft-burn-frames").glob("frame-*.png"))
if len(paths) != 24:
    raise RuntimeError(f"Expected 24 rendered preview frames, found {len(paths)}")
frames = [Image.open(path).convert("RGB") for path in paths]
gif = output / "held-torch-soft-burn.gif"
frames[0].save(gif, save_all=True, append_images=frames[1:], duration=83,
               loop=0, optimize=True, disposal=2)
report_path = output / "build-report.json"
report = json.loads(report_path.read_text())
if gif.name not in report["outputs"]:
    report["outputs"].append(gif.name)
report["softBurnPreview"] = {
    "file": gif.name,
    "frames": len(frames),
    "durationMsPerFrame": 83,
    "lateralFlameShakeWorld": 0.0
}
report_path.write_text(json.dumps(report, indent=2) + "\n")
print(f"HELD_TORCH_SOFT_BURN_GIF_OK frames={len(frames)} bytes={gif.stat().st_size}")
