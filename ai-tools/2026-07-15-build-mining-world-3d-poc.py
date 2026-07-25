"""Package Blender mining-world proof renders into gameplay-scale review art."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
POC = ROOT / "visual-approval-previews/mining-world-3d-bake-poc-v1"
RENDERS = POC / "renders"
FINAL = POC / "final"
CURRENT_TILES = ROOT / "sprites/tiles/dynamic-soil/previews/soil-contact-sheet.png"
CURRENT_RUNTIME = ROOT / "visual-approval-previews/v11-runtime-streamed-baseline-2026-07-11.png"
CURRENT_DEPTH = ROOT / "sprites/backgrounds/world-v11-runtime-polished-v4/depth-chunks/level1-r001-c01.webp"
PLAYER = ROOT / "sprites/character/character-v8/runtime/idle-cleaned-frames/frame-000.png"
TILE_SIZE = 94


def font(size: int, bold: bool = False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def fit(image: Image.Image, width: int, height: int) -> Image.Image:
    scale = min(width / image.width, height / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (width, height), "#080d14")
    canvas.paste(resized.convert("RGB"), ((width - resized.width) // 2, (height - resized.height) // 2))
    return canvas


def player_at_tile_scale() -> Image.Image:
    image = Image.open(PLAYER).convert("RGBA")
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        raise RuntimeError("Production player frame has no alpha content")
    cropped = image.crop(bbox)
    target_height = round(TILE_SIZE * 0.8)
    target_width = round(cropped.width * target_height / cropped.height)
    return cropped.resize((target_width, target_height), Image.Resampling.LANCZOS)


def package_tiles() -> list[dict[str, str]]:
    FINAL.mkdir(parents=True, exist_ok=True)
    entries = []
    for source in sorted(RENDERS.glob("tile-*-512.png")):
        output = FINAL / source.name.replace("-512.png", "-94.webp")
        image = Image.open(source).convert("RGB").resize((TILE_SIZE, TILE_SIZE), Image.Resampling.LANCZOS)
        image.save(output, "WEBP", quality=94, method=6)
        entries.append({"source": source.relative_to(POC).as_posix(), "runtimeCandidate": output.relative_to(POC).as_posix()})
    return entries


def tile_comparison(tile_entries) -> None:
    current = Image.open(CURRENT_TILES).convert("RGB")
    candidates = [Image.open(POC / item["runtimeCandidate"]).convert("RGB") for item in tile_entries]
    canvas = Image.new("RGB", (1180, 590), "#080d14")
    draw = ImageDraw.Draw(canvas)
    draw.text((30, 24), "MINING TILE BAKE · 94PX GAME SCALE", font=font(28, True), fill="#f0d79b")
    draw.text((30, 65), "Current dynamic-soil atlas", font=font(18, True), fill="#91a5b8")
    current_fit = fit(current, 540, 405)
    canvas.paste(current_fit, (30, 100))
    draw.text((610, 65), "3D-baked candidates", font=font(18, True), fill="#6fe2ef")
    for index, candidate in enumerate(candidates):
        x = 610 + (index % 3) * 178
        y = 100 + (index // 3) * 178
        enlarged = candidate.resize((160, 160), Image.Resampling.NEAREST)
        canvas.paste(enlarged, (x, y))
        draw.rectangle((x, y, x + 159, y + 159), outline="#33485c", width=2)
    draw.text((30, 530), "Same 94px tile contract · nearest-neighbour enlargement only for inspection", font=font(16), fill="#77899a")
    canvas.save(FINAL / "tile-comparison.png")


def gameplay_candidate() -> None:
    game = Image.open(RENDERS / "gameplay-bake-1280x720.png").convert("RGBA")
    hero = player_at_tile_scale()
    x = game.width // 2 - hero.width // 2
    floor_y = round(game.height / 2 + TILE_SIZE * 1.48)
    game.alpha_composite(hero, (x, floor_y - hero.height))
    draw = ImageDraw.Draw(game)
    for grid_x in range(0, game.width, TILE_SIZE):
        draw.line((grid_x, 0, grid_x, game.height), fill=(78, 122, 145, 54), width=1)
    for grid_y in range(game.height % TILE_SIZE, game.height, TILE_SIZE):
        draw.line((0, grid_y, game.width, grid_y), fill=(78, 122, 145, 54), width=1)
    draw.rounded_rectangle((24, 20, 475, 76), radius=8, fill=(4, 9, 15, 215), outline=(75, 190, 210, 210), width=2)
    draw.text((42, 34), "3D BAKE · 94PX TILE GRID · 0.8-TILE MINER", font=font(18, True), fill="#d8f7ff")
    game.convert("RGB").save(FINAL / "gameplay-candidate.png", quality=95)


def background_comparison() -> None:
    current = fit(Image.open(CURRENT_DEPTH), 880, 495)
    hybrid = fit(Image.open(RENDERS / "cave-background-1280x720.png"), 880, 495)
    canvas = Image.new("RGB", (1840, 650), "#060a10")
    draw = ImageDraw.Draw(canvas)
    draw.text((40, 28), "UNDERGROUND BACKGROUND · SAME ACTIVE V11 SOURCE", font=font(32, True), fill="#f2d498")
    draw.text((40, 78), "A isolates the current depth chunk · B preserves it and adds sparse 3D relief/lighting", font=font(18), fill="#91a4b7")
    draw.text((40, 118), "A · CURRENT V11 DEPTH", font=font(21, True), fill="#e1c177")
    draw.text((940, 118), "B · HYBRID 2.5D LAYER", font=font(21, True), fill="#6fe2ef")
    canvas.paste(current, (40, 150))
    canvas.paste(hybrid, (940, 150))
    draw.rectangle((40, 150, 919, 644), outline="#5d4b2c", width=2)
    draw.rectangle((940, 150, 1819, 644), outline="#245e6c", width=2)
    canvas.save(FINAL / "background-comparison.png")


def overview() -> None:
    current = fit(Image.open(CURRENT_RUNTIME), 920, 518)
    candidate = fit(Image.open(FINAL / "gameplay-candidate.png"), 920, 518)
    canvas = Image.new("RGB", (1920, 700), "#060a10")
    draw = ImageDraw.Draw(canvas)
    draw.text((42, 30), "DIG GAME · CURRENT V11 VS 3D-BAKED MINING POC", font=font(34, True), fill="#f2d498")
    draw.text((42, 78), "Correct side-view camera · exact 94px tile scale · current production miner", font=font(19), fill="#91a4b7")
    draw.text((40, 122), "A · CURRENT V11 RUNTIME", font=font(22, True), fill="#e1c177")
    draw.text((980, 122), "B · LOCAL 3D BAKE (MESHY-READY)", font=font(22, True), fill="#6fe2ef")
    canvas.paste(current, (40, 160))
    canvas.paste(candidate, (980, 160))
    draw.rectangle((40, 160, 959, 677), outline="#5d4b2c", width=2)
    draw.rectangle((980, 160, 1899, 677), outline="#245e6c", width=2)
    canvas.save(FINAL / "current-vs-3d-overview.png")


def main() -> None:
    entries = package_tiles()
    tile_comparison(entries)
    gameplay_candidate()
    background_comparison()
    overview()
    manifest = {
        "version": 1,
        "status": "review-only-no-runtime-wiring",
        "generatedBy": "ai-tools/2026-07-15-build-mining-world-3d-poc.py",
        "tileSizePx": TILE_SIZE,
        "currentTileReference": CURRENT_TILES.relative_to(ROOT).as_posix(),
        "currentRuntimeReference": CURRENT_RUNTIME.relative_to(ROOT).as_posix(),
        "currentDepthReference": CURRENT_DEPTH.relative_to(ROOT).as_posix(),
        "productionPlayerReference": PLAYER.relative_to(ROOT).as_posix(),
        "tileCandidates": entries,
        "review": [
            "final/tile-comparison.png",
            "final/gameplay-candidate.png",
            "final/background-comparison.png",
            "final/current-vs-3d-overview.png",
        ],
    }
    (POC / "metadata/package-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Packaged mining-world POC at {POC}")


if __name__ == "__main__":
    main()
