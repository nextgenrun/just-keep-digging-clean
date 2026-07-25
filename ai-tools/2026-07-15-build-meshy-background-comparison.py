"""Build a background-only V11 versus actual Meshy cave comparison."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
POC = ROOT / "visual-approval-previews/meshy-background-render-poc-v2"
CURRENT = ROOT / "sprites/backgrounds/world-v11-runtime-polished-v4/depth-chunks/level1-r001-c01.webp"
MESHY_RENDER = POC / "meshy-cave-background-1280x720.png"
MESHY_GLB = POC / "meshy-cave-refined.glb"


def font(size: int, bold: bool = False):
    path = Path("C:/Windows/Fonts") / ("arialbd.ttf" if bold else "arial.ttf")
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def panel(path: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(path).convert("RGB")
    return ImageOps.fit(image, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_comparison() -> None:
    canvas = Image.new("RGB", (1920, 700), "#05080d")
    draw = ImageDraw.Draw(canvas)
    draw.text((42, 28), "DIG GAME BACKGROUND · CURRENT V11 VS ACTUAL MESHY 6", font=font(32, True), fill="#f1d69b")
    draw.text((42, 74), "Background-only mockup · no tiles · no procedural overlays · no runtime wiring", font=font(18), fill="#91a4b7")
    draw.text((40, 118), "A · CURRENT V11 DEPTH BACKGROUND", font=font(21, True), fill="#e1c177")
    draw.text((980, 118), "B · MESHY CAVE ENVIRONMENT RENDER", font=font(21, True), fill="#70e5ef")
    current = panel(CURRENT, (920, 518))
    meshy = panel(MESHY_RENDER, (920, 518))
    canvas.paste(current, (40, 160))
    canvas.paste(meshy, (980, 160))
    draw.rectangle((40, 160, 959, 677), outline="#5d4b2c", width=2)
    draw.rectangle((980, 160, 1899, 677), outline="#286779", width=2)
    canvas.save(POC / "background-comparison.png")


def write_manifest() -> None:
    manifest = {
        "status": "review-only-no-runtime-wiring",
        "scope": "background-only-mockup-comparison",
        "meshy": {
            "model": "Meshy 6",
            "successfulPreviewTaskId": "019f6556-8220-727d-969e-c2c52f220f91",
            "successfulRefineTaskId": "019f6559-8aca-7a4a-8dae-64be8338da3a",
            "creditsConsumed": 30,
            "glb": MESHY_GLB.name,
            "glbSha256": sha256(MESHY_GLB),
        },
        "render": {
            "camera": "orthographic cave-mouth",
            "resolution": [1280, 720],
            "file": MESHY_RENDER.name,
        },
        "comparison": {
            "current": CURRENT.relative_to(ROOT).as_posix(),
            "file": "background-comparison.png",
        },
        "credentialStored": False,
    }
    (POC / "mockup-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    build_comparison()
    write_manifest()
    print(f"Built background-only Meshy comparison at {POC}")


if __name__ == "__main__":
    main()
