"""Inspect existing runtime pixels; only writes diagnostic contact sheets in testing/."""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "sprites/character/survival-character-unified-v1/runtime"
MANIFEST = json.loads((RUNTIME / "2026-08-25-survival-unified-animation-runtime-v1-manifest.json").read_text())
SHEETS = [
    "survival-mixamo-v1-walk-loop-sheet",
    "survival-blender-v2-walk-sheet",
    "survival-ual-player-v1-animation-polish-run-sheet",
    "survival-held-torch-v1-walkLoop-sheet",
]
for key in SHEETS:
    spec = MANIFEST["sheets"][key]
    path = RUNTIME / spec["file"]
    source = Image.open(path).convert("RGBA")
    size = spec["frameSizePx"]
    count = int(spec.get("frameCount", source.width // size * (source.height // size)))
    columns = source.width // size
    panel = Image.new("RGB", (256 * 6, 278 * ((count + 5) // 6)), "#101923")
    draw = ImageDraw.Draw(panel)
    contacts = {}
    for frame in range(count):
        x, y = frame % columns * size, frame // columns * size
        tile = source.crop((x, y, x + size, y + size))
        px, py = frame % 6 * 256, frame // 6 * 278
        panel.paste(tile.resize((256, 256)), (px, py + 20), tile.resize((256, 256)))
        draw.text((px + 4, py + 3), f"frame {frame}", fill="white")
        alpha = tile.getchannel("A")
        points = [(x, y) for y in range(int(size * .72), size) for x in range(size)
                  if alpha.getpixel((x, y)) >= 160]
        if points:
            floor = max(y for _, y in points)
            sole = [(x, y) for x, y in points if y >= floor - 2]
            contacts[frame] = [round(sum(x for x, _ in sole) / len(sole), 2), floor]
        draw.line((px, py + 20 + 228, px + 255, py + 20 + 228), fill="#997644")
    output = ROOT / "testing" / f"2026-09-03-particle-polish-{key}.png"
    panel.save(output)
    print(json.dumps({"sheet": key, "size": size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "feet": contacts}))

core = Image.open(ROOT / "sprites/fx/tile-destruction-fx-v3/tile-break-core-v3.png").convert("RGBA")
shards = Image.open(ROOT / "sprites/fx/tile-destruction-fx-v3/tile-break-shards-v3.png").convert("RGBA")
panel = Image.new("RGB", (1024, 5 * 310), "#101923")
draw = ImageDraw.Draw(panel)
for index, (family, row) in enumerate([("dirt", 0), ("damp", 1), ("stone", 2), ("copper", 3), ("crystal", 13)]):
    y = index * 310
    draw.text((5, y + 3), family, fill="white")
    tile = core.crop((0, row * 208, 1024, (row + 1) * 208))
    panel.paste(tile, (0, y + 20), tile)
    tile = shards.crop((0, row * 80, 400, (row + 1) * 80))
    panel.paste(tile, (0, y + 228), tile)
panel.save(ROOT / "testing/2026-09-03-particle-polish-materials.png")
