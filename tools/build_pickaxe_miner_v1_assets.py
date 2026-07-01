from __future__ import annotations

import base64
import json
import math
import shutil
from collections import deque
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
SOURCE_MOCKUP = Path(r"C:\Users\Mila\AppData\Local\Temp\codex-clipboard-eb7c7d7f-e401-4d6b-851c-22ad48b4f4d8.png")
OUT_DIR = ROOT / "sprites" / "character" / "pickaxe-miner-v1"
RUNTIME_DIR = OUT_DIR / "runtime"
REFERENCE_DIR = OUT_DIR / "reference"
PISKEL_DIR = OUT_DIR / "piskel"
LAB_DIR = OUT_DIR / "openrouter-lab" / "eur050-grok-imagen"
PAYLOAD_DIR = LAB_DIR / "payloads"
PREVIEW_DIR = OUT_DIR / "previews"
REPORT_DIR = OUT_DIR / "reports"

FRAME_SIZE = 94
ANCHOR = (47, 47)
BODY_TARGET_SIZE = (64, 88)
API_ANCHOR_SIZE = 480
API_TILE_SIZE = 376
MODEL = "x-ai/grok-imagine-video"


def ensure_dirs() -> None:
    for directory in (RUNTIME_DIR, REFERENCE_DIR, PISKEL_DIR, LAB_DIR, PAYLOAD_DIR, PREVIEW_DIR, REPORT_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def is_background_pixel(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a < 10:
        return True
    return r >= 235 and g >= 235 and b >= 235 and max(r, g, b) - min(r, g, b) <= 22


def remove_edge_background(image: Image.Image) -> Image.Image:
    src = image.convert("RGBA")
    width, height = src.size
    pixels = src.load()
    visited: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))
    while queue:
        x, y = queue.popleft()
        if (x, y) in visited or x < 0 or y < 0 or x >= width or y >= height:
            continue
        if not is_background_pixel(pixels[x, y]):
            continue
        visited.add((x, y))
        queue.append((x + 1, y))
        queue.append((x - 1, y))
        queue.append((x, y + 1))
        queue.append((x, y - 1))
    out = src.copy()
    out_pixels = out.load()
    for x, y in visited:
        out_pixels[x, y] = (255, 255, 255, 0)
    return out


def load_reference_sprite() -> Image.Image:
    if not SOURCE_MOCKUP.exists():
        raise FileNotFoundError(f"Missing mockup reference: {SOURCE_MOCKUP}")
    shutil.copy2(SOURCE_MOCKUP, REFERENCE_DIR / "mockup-reference.png")
    cutout = remove_edge_background(Image.open(SOURCE_MOCKUP))
    bbox = cutout.getbbox()
    if not bbox:
        raise RuntimeError("Could not extract pickaxe miner sprite from mockup.")
    crop = cutout.crop(bbox)
    scale = min(BODY_TARGET_SIZE[0] / crop.width, BODY_TARGET_SIZE[1] / crop.height)
    size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
    return crop.resize(size, Image.Resampling.LANCZOS)


def centered_frame(sprite: Image.Image, offset_x: int = 0, offset_y: int = 0) -> Image.Image:
    frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    x = round(ANCHOR[0] - sprite.width * 0.5 + offset_x)
    y = round(ANCHOR[1] - sprite.height * 0.5 + offset_y)
    frame.alpha_composite(sprite, (x, y))
    return frame


def make_idle_frames(sprite: Image.Image) -> list[Image.Image]:
    return [centered_frame(sprite, 0, round(math.sin(i / 6 * math.tau) * 1.0)) for i in range(6)]


def make_walk_frames(sprite: Image.Image) -> list[Image.Image]:
    frames = []
    for i in range(8):
        bob = 1 if i % 2 else -1
        frames.append(centered_frame(sprite, round(math.sin(i / 8 * math.tau) * 1.5), bob))
    return frames


def make_dig_frames(sprite: Image.Image) -> list[Image.Image]:
    frames = []
    for i in range(8):
        lean = min(i, 4)
        boosted = ImageEnhance.Contrast(sprite).enhance(1 + (0.08 if 2 <= i <= 5 else 0))
        frames.append(centered_frame(boosted, lean, 0))
    return frames


def make_sheet(name: str, frames: list[Image.Image]) -> None:
    sheet = Image.new("RGBA", (FRAME_SIZE * len(frames), FRAME_SIZE), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * FRAME_SIZE, 0))
    sheet.save(RUNTIME_DIR / name)


def piskel_layer(frames: list[Image.Image]) -> str:
    sheet = Image.new("RGBA", (FRAME_SIZE * len(frames), FRAME_SIZE), (0, 0, 0, 0))
    layout = [list(range(len(frames)))]
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * FRAME_SIZE, 0))
    png_bytes = BytesIO()
    sheet.save(png_bytes, format="PNG")
    encoded = base64.b64encode(png_bytes.getvalue()).decode("ascii")
    return json.dumps({
        "name": "anchored-cleanup-layer",
        "opacity": 1,
        "frameCount": len(frames),
        "chunks": [{"layout": layout, "base64PNG": f"data:image/png;base64,{encoded}"}],
    }, separators=(",", ":"))


def make_piskel(name: str, slug: str, frames: list[Image.Image], fps: int) -> None:
    project = {
        "modelVersion": 2,
        "piskel": {
            "name": name,
            "description": "Pickaxe miner v1 anchored on a 94x94 canvas. Body center remains at 47,47 for cleanup/no-drift.",
            "fps": fps,
            "height": FRAME_SIZE,
            "width": FRAME_SIZE,
            "layers": [piskel_layer(frames)],
        },
    }
    (PISKEL_DIR / f"{slug}.piskel").write_text(json.dumps(project, indent=2), encoding="utf-8")


def write_contact_sheet(groups: dict[str, list[Image.Image]]) -> None:
    cols = max(len(frames) for frames in groups.values())
    cell = FRAME_SIZE + 14
    label_w = 80
    sheet = Image.new("RGBA", (label_w + cols * cell, 22 + len(groups) * (FRAME_SIZE + 32)), (18, 22, 26, 255))
    d = ImageDraw.Draw(sheet)
    for row, (name, frames) in enumerate(groups.items()):
        y = 18 + row * (FRAME_SIZE + 32)
        d.text((12, y + 38), name, fill=(230, 230, 230, 255))
        for col, frame in enumerate(frames):
            x = label_w + col * cell
            d.rectangle((x, y, x + FRAME_SIZE - 1, y + FRAME_SIZE - 1), outline=(80, 90, 96, 255))
            d.line((x + ANCHOR[0], y, x + ANCHOR[0], y + FRAME_SIZE), fill=(38, 70, 88, 255))
            d.line((x, y + ANCHOR[1], x + FRAME_SIZE, y + ANCHOR[1]), fill=(88, 62, 48, 255))
            sheet.alpha_composite(frame, (x, y))
            d.text((x, y + FRAME_SIZE + 4), f"{col:02d}", fill=(185, 190, 190, 255))
    sheet.save(PREVIEW_DIR / "pickaxe-miner-v1-contact-sheet.png")


def data_url(path: Path) -> str:
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def write_anchor_files(sprite: Image.Image) -> None:
    anchored = centered_frame(sprite)
    anchored.save(REFERENCE_DIR / "pickaxe-miner-anchor-94.png")
    api = Image.new("RGBA", (API_ANCHOR_SIZE, API_ANCHOR_SIZE), (246, 248, 250, 255))
    scale = API_TILE_SIZE / FRAME_SIZE
    scaled = anchored.resize((API_TILE_SIZE, API_TILE_SIZE), Image.Resampling.NEAREST)
    tile_x = (API_ANCHOR_SIZE - API_TILE_SIZE) // 2
    tile_y = (API_ANCHOR_SIZE - API_TILE_SIZE) // 2
    api.alpha_composite(scaled, (tile_x, tile_y))
    api.convert("RGB").save(REFERENCE_DIR / "pickaxe-miner-api-anchor-480.png")

    guide = api.copy()
    d = ImageDraw.Draw(guide)
    cx = API_ANCHOR_SIZE // 2
    cy = API_ANCHOR_SIZE // 2
    d.rectangle((tile_x, tile_y, tile_x + API_TILE_SIZE - 1, tile_y + API_TILE_SIZE - 1), outline=(0, 160, 255, 255), width=2)
    d.line((cx, tile_y, cx, tile_y + API_TILE_SIZE), fill=(255, 50, 50, 255), width=2)
    d.line((tile_x, cy, tile_x + API_TILE_SIZE, cy), fill=(255, 50, 50, 255), width=2)
    d.ellipse((cx - 7, cy - 7, cx + 7, cy + 7), outline=(255, 50, 50, 255), width=2)
    guide.convert("RGB").save(REFERENCE_DIR / "pickaxe-miner-anchor-guide-480.png")

    spec = {
        "schemaVersion": 1,
        "assetId": "pickaxe-miner-v1",
        "sourceMockup": str(SOURCE_MOCKUP),
        "apiModel": MODEL,
        "frameSize": [FRAME_SIZE, FRAME_SIZE],
        "bodyAnchorPx": {"x": ANCHOR[0], "y": ANCHOR[1]},
        "canvasRules": [
            "Body center stays fixed on the red crosshair at 47,47.",
            "Keep miner size, helmet, face, outfit, outline, skin palette, and pickaxe palette stable between frames.",
            "Do not draw terrain, blocks, UI, or background into sprite frames.",
            "Only arms, legs, pickaxe arc, dust, and tiny strike sparks may animate.",
        ],
    }
    (REFERENCE_DIR / "pickaxe-miner-anchor-spec.json").write_text(json.dumps(spec, indent=2), encoding="utf-8")


def prompt_for(animation: str) -> str:
    contract = (
        "Use the supplied anchor image as a locked sprite sheet reference. One 94x94 game tile canvas, side view facing right. "
        "The miner body center is fixed at the red crosshair. Do not zoom, crop, rotate, resize, recolor, restyle, redesign, or shift the character. "
        "Keep the hardhat, head lamp, face, brown overalls, boots, gloves, pickaxe, black outline thickness, and palette identical in every frame. "
        "Do not draw terrain, blocks, walls, UI, shadows, or background objects inside the sprite frame."
    )
    goals = {
        "idle": "State idle loop: subtle breathing, tiny helmet lamp glint, pickaxe held still. Body anchor and feet stay stable.",
        "walk": "State walk loop: short readable side walk cycle, legs/arms move, pickaxe carried low. Body size and anchor stay stable.",
        "dig": "State dig loop: miner swings pickaxe into the block in front of him. Animate arms and pickaxe arc with small sparks/dust at right edge only; do not include the block itself.",
    }
    return f"{contract} {goals[animation]}"


def write_payloads() -> None:
    ref_url = data_url(REFERENCE_DIR / "pickaxe-miner-api-anchor-480.png")
    payloads = {}
    for animation in ("idle", "walk", "dig"):
        payload = {
            "model": MODEL,
            "prompt": prompt_for(animation),
            "duration": 1,
            "resolution": "480p",
            "aspect_ratio": "1:1",
            "generate_audio": False,
            "frame_images": [{
                "type": "image_url",
                "image_url": {"url": ref_url},
                "frame_type": "first_frame",
            }],
        }
        path = PAYLOAD_DIR / f"pickaxe-miner-{animation}.json"
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        payloads[animation] = str(path.relative_to(ROOT)).replace("\\", "/")
    (LAB_DIR / "eur050-plan.json").write_text(json.dumps({
        "schemaVersion": 1,
        "budgetUsd": 0.54,
        "jobs": ["idle", "walk", "dig"],
        "payloads": payloads,
        "acceptance": [
            "Reject color drift, size drift, anchor drift, and redesigned frames.",
            "Keep terrain/block art out of sprite sheets.",
        ],
    }, indent=2), encoding="utf-8")


def write_manifest(groups: dict[str, list[Image.Image]]) -> None:
    manifest = {
        "schemaVersion": 1,
        "id": "pickaxe-miner-v1",
        "displayName": "Pickaxe Miner",
        "sourceMockup": str(SOURCE_MOCKUP),
        "frameSize": [FRAME_SIZE, FRAME_SIZE],
        "anchor": {"x": ANCHOR[0], "y": ANCHOR[1]},
        "runtime": {
            "idleSheet": "sprites/character/pickaxe-miner-v1/runtime/pickaxe-miner-idle-sheet.png",
            "walkSheet": "sprites/character/pickaxe-miner-v1/runtime/pickaxe-miner-walk-sheet.png",
            "digSheet": "sprites/character/pickaxe-miner-v1/runtime/pickaxe-miner-dig-sheet.png",
        },
        "animations": {
            "idle": {"frames": len(groups["idle"]), "fps": 6},
            "walk": {"frames": len(groups["walk"]), "fps": 10},
            "dig": {"frames": len(groups["dig"]), "fps": 12},
        },
        "budget": {"provider": "OpenRouter Grok Imagine Video", "limit": "EUR 0.50", "status": "payloads prepared"},
        "prompts": {animation: prompt_for(animation) for animation in ("idle", "walk", "dig")},
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def main() -> None:
    ensure_dirs()
    sprite = load_reference_sprite()
    write_anchor_files(sprite)
    groups = {
        "idle": make_idle_frames(sprite),
        "walk": make_walk_frames(sprite),
        "dig": make_dig_frames(sprite),
    }
    make_sheet("pickaxe-miner-idle-sheet.png", groups["idle"])
    make_sheet("pickaxe-miner-walk-sheet.png", groups["walk"])
    make_sheet("pickaxe-miner-dig-sheet.png", groups["dig"])
    make_piskel("Pickaxe Miner V1 Idle", "pickaxe-miner-idle", groups["idle"], 6)
    make_piskel("Pickaxe Miner V1 Walk", "pickaxe-miner-walk", groups["walk"], 10)
    make_piskel("Pickaxe Miner V1 Dig", "pickaxe-miner-dig", groups["dig"], 12)
    write_contact_sheet(groups)
    write_payloads()
    write_manifest(groups)
    print(f"Generated pickaxe-miner-v1 assets in {OUT_DIR}")


if __name__ == "__main__":
    main()
