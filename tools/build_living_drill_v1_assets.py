from __future__ import annotations

import base64
import json
import math
import shutil
from collections import deque
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
SOURCE_MOCKUP = Path(r"C:\Users\Mila\AppData\Local\Temp\codex-clipboard-e1ecd630-9c44-49a0-8aec-1664a8e44a59.png")
OUT_DIR = ROOT / "sprites" / "character" / "living-drill-v1"
RUNTIME_DIR = OUT_DIR / "runtime"
REFERENCE_DIR = OUT_DIR / "reference"
PISKEL_DIR = OUT_DIR / "piskel"
LAB_DIR = OUT_DIR / "openrouter-lab" / "eur1-grok-imagen"
PAYLOAD_DIR = LAB_DIR / "payloads"
PREVIEW_DIR = OUT_DIR / "previews"
REPORT_DIR = OUT_DIR / "reports"

FRAME_SIZE = 94
ANCHOR = (47, 47)
BODY_TARGET_SIZE = (90, 58)
SPRITE_LOCAL_GAMEPLAY_ANCHOR = (23, 13)
API_ANCHOR_SIZE = 480
API_TILE_SIZE = 376
PROMPT_MODEL = "x-ai/grok-imagine-video"


def ensure_dirs() -> None:
    for directory in (RUNTIME_DIR, REFERENCE_DIR, PISKEL_DIR, LAB_DIR, PAYLOAD_DIR, PREVIEW_DIR, REPORT_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def is_background_pixel(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a < 10:
        return True
    return r >= 238 and g >= 238 and b >= 238 and max(r, g, b) - min(r, g, b) <= 16


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
        raise RuntimeError("Could not extract living drill sprite from mockup.")
    crop = cutout.crop(bbox)
    scale = min(BODY_TARGET_SIZE[0] / crop.width, BODY_TARGET_SIZE[1] / crop.height)
    size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
    return crop.resize(size, Image.Resampling.LANCZOS)


def is_blue_effect_pixel(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a < 20:
        return False
    return b > 120 and b - r > 35 and (g - r > 18 or b - g > 18)


def body_bbox(sprite: Image.Image) -> tuple[int, int, int, int]:
    src = sprite.convert("RGBA")
    pixels = src.load()
    xs: list[int] = []
    ys: list[int] = []
    for y in range(src.height):
        for x in range(src.width):
            pixel = pixels[x, y]
            if pixel[3] > 20 and not is_blue_effect_pixel(pixel):
                xs.append(x)
                ys.append(y)
    if not xs or not ys:
        bbox = src.getbbox()
        if not bbox:
            raise RuntimeError("Could not find visible body pixels for anchor.")
        return bbox
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def body_center(sprite: Image.Image) -> tuple[float, float]:
    left, top, right, bottom = body_bbox(sprite)
    return (left + right - 1) / 2, (top + bottom - 1) / 2


def write_anchor_files(sprite: Image.Image) -> dict[str, str | dict[str, int] | list[int]]:
    anchored = centered_frame(sprite)
    transparent_path = REFERENCE_DIR / "living-drill-anchor-94.png"
    transparent_path.parent.mkdir(parents=True, exist_ok=True)
    anchored.save(transparent_path)

    api = Image.new("RGBA", (API_ANCHOR_SIZE, API_ANCHOR_SIZE), (246, 248, 250, 255))
    scale = API_TILE_SIZE / FRAME_SIZE
    scaled = anchored.resize((API_TILE_SIZE, API_TILE_SIZE), Image.Resampling.NEAREST)
    tile_x = (API_ANCHOR_SIZE - API_TILE_SIZE) // 2
    tile_y = (API_ANCHOR_SIZE - API_TILE_SIZE) // 2
    api.alpha_composite(scaled, (tile_x, tile_y))
    api_path = REFERENCE_DIR / "living-drill-api-anchor-480.png"
    api.convert("RGB").save(api_path)

    guide = api.copy()
    d = ImageDraw.Draw(guide)
    cx = API_ANCHOR_SIZE // 2
    cy = API_ANCHOR_SIZE // 2
    anchored_bbox = anchored.getbbox()
    anchored_body_bbox = body_bbox(anchored)
    def scale_box(box: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
        left, top, right, bottom = box
        return (
            round(tile_x + left * scale),
            round(tile_y + top * scale),
            round(tile_x + right * scale),
            round(tile_y + bottom * scale),
        )
    d.rectangle((tile_x, tile_y, tile_x + API_TILE_SIZE - 1, tile_y + API_TILE_SIZE - 1), outline=(0, 160, 255, 255), width=2)
    if anchored_bbox:
        d.rectangle(scale_box(anchored_bbox), outline=(90, 180, 255, 255), width=1)
    d.rectangle(scale_box(anchored_body_bbox), outline=(255, 210, 0, 255), width=2)
    d.line((cx, tile_y, cx, tile_y + API_TILE_SIZE), fill=(255, 50, 50, 255), width=2)
    d.line((tile_x, cy, tile_x + API_TILE_SIZE, cy), fill=(255, 50, 50, 255), width=2)
    d.ellipse((cx - 7, cy - 7, cx + 7, cy + 7), outline=(255, 50, 50, 255), width=2)
    guide_path = REFERENCE_DIR / "living-drill-anchor-guide-480.png"
    guide.convert("RGB").save(guide_path)

    spec = {
        "schemaVersion": 1,
        "assetId": "living-drill-v1",
        "sourceMockup": str(SOURCE_MOCKUP),
        "apiModel": PROMPT_MODEL,
        "frameSize": [FRAME_SIZE, FRAME_SIZE],
        "bodyAnchorPx": {"x": ANCHOR[0], "y": ANCHOR[1]},
        "sourceSpriteGameplayAnchorPx": {"x": SPRITE_LOCAL_GAMEPLAY_ANCHOR[0], "y": SPRITE_LOCAL_GAMEPLAY_ANCHOR[1]},
        "bodyCenterRule": "The gameplay anchor is the cabin/body pivot marked by the red-dot reference, not the geometric body center and not any blue flame/thrust pixels.",
        "guideLegend": {
            "redCrosshair": "fixed gameplay anchor/tile center",
            "blueBox": "full 94x94 tile bounds",
            "yellowBox": "stable body bounds; blue thrust is ignored for placement",
            "thinBlueBox": "visible sprite/effect bounds",
        },
        "canvasRules": [
            "Keep the cabin/body gameplay pivot centered on the red crosshair; ignore blue flame/thrust when deciding placement.",
            "Keep the drill nose pointing right in source frames.",
            "Do not scale, crop, rotate, recolor, or redesign the body between frames.",
            "Blue rear and bottom thrust are effect layers and may flicker, but must not move the body anchor.",
            "The exported runtime frames are recentred through the .piskel cleanup pass before acceptance.",
        ],
        "referenceFiles": {
            "mockup": "sprites/character/living-drill-v1/reference/mockup-reference.png",
            "runtimeAnchor94": "sprites/character/living-drill-v1/reference/living-drill-anchor-94.png",
            "apiAnchor480": "sprites/character/living-drill-v1/reference/living-drill-api-anchor-480.png",
            "humanGuide480": "sprites/character/living-drill-v1/reference/living-drill-anchor-guide-480.png",
        },
        "acceptedPalette": {
            "outline": "#050505",
            "shell": ["#f7f7f7", "#dedede", "#bdbdbd"],
            "drill": ["#f5f5f5", "#9d9d9d", "#4e4e4e", "#151515"],
            "thrust": ["#0d6cff", "#00b7ff", "#bff8ff"],
        },
    }
    spec_path = REFERENCE_DIR / "living-drill-anchor-spec.json"
    spec_path.write_text(json.dumps(spec, indent=2), encoding="utf-8")
    return spec


def centered_frame(sprite: Image.Image, offset_x: int = 0, offset_y: int = 0) -> Image.Image:
    frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    anchor_x, anchor_y = SPRITE_LOCAL_GAMEPLAY_ANCHOR
    x = round(ANCHOR[0] - anchor_x + offset_x)
    y = round(ANCHOR[1] - anchor_y + offset_y)
    frame.alpha_composite(sprite, (x, y))
    return frame


def add_flame(frame: Image.Image, length: int, wobble: int) -> Image.Image:
    out = frame.copy()
    d = ImageDraw.Draw(out)
    cy = ANCHOR[1] + wobble
    base_x = 10
    d.polygon([(base_x, cy - 7), (base_x - length, cy), (base_x, cy + 7)], fill=(13, 108, 255, 220))
    d.polygon([(base_x - 3, cy - 4), (base_x - max(5, length - 8), cy), (base_x - 3, cy + 4)], fill=(191, 248, 255, 230))
    return out


def shade_drill_phase(frame: Image.Image, phase: int, amount: float = 0.28) -> Image.Image:
    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    colors = [(255, 255, 255, 52), (0, 0, 0, 44), (180, 180, 180, 58)]
    for index, x in enumerate(range(47, 88, 10)):
        color = colors[(index + phase) % len(colors)]
        d.polygon([(x, 30), (x + 8, 33), (x + 4, 66), (x - 4, 63)], fill=color)
    if amount <= 0:
        return frame
    alpha = overlay.getchannel("A")
    sprite_mask = frame.getchannel("A").point(lambda value: 255 if value > 0 else 0)
    overlay.putalpha(ImageChops.multiply(alpha, sprite_mask))
    return Image.alpha_composite(frame, overlay)


def make_idle_frames(sprite: Image.Image) -> list[Image.Image]:
    frames = []
    for i in range(6):
        bob = round(math.sin(i / 6 * math.tau) * 1.2)
        frame = centered_frame(sprite, 0, bob)
        frame = shade_drill_phase(frame, i, 0.18)
        frames.append(frame)
    return frames


def make_fly_frames(sprite: Image.Image) -> list[Image.Image]:
    frames = []
    for i in range(6):
        bob = round(math.sin(i / 6 * math.tau) * 2.5)
        frame = centered_frame(sprite, 0, bob)
        frame = shade_drill_phase(frame, i + 1, 0.22)
        frame = add_flame(frame, 15 + (i % 3) * 5, bob)
        frames.append(frame)
    return frames


def make_dig_frames(sprite: Image.Image) -> list[Image.Image]:
    frames = []
    jitters = [0, 1, -1, 1, -1, 0, 1, -1, 1, 0]
    for i, jitter in enumerate(jitters):
        wobble = -1 if i % 2 == 0 else 1
        boosted = ImageEnhance.Contrast(sprite).enhance(1.0 + (0.08 if 2 <= i <= 6 else 0))
        frame = centered_frame(boosted, jitter, wobble)
        frame = shade_drill_phase(frame, i * 2, 0.36)
        frames.append(frame)
    return frames


def make_sheet(name: str, frames: list[Image.Image]) -> None:
    sheet = Image.new("RGBA", (FRAME_SIZE * len(frames), FRAME_SIZE), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * FRAME_SIZE, 0))
    sheet.save(RUNTIME_DIR / name)


def piskel_layer(frames: list[Image.Image], columns: int) -> str:
    rows = math.ceil(len(frames) / columns)
    sheet = Image.new("RGBA", (columns * FRAME_SIZE, rows * FRAME_SIZE), (0, 0, 0, 0))
    layout = []
    for row in range(rows):
        layout_row = []
        for col in range(columns):
            frame_index = row * columns + col
            if frame_index < len(frames):
                sheet.alpha_composite(frames[frame_index], (col * FRAME_SIZE, row * FRAME_SIZE))
                layout_row.append(frame_index)
            else:
                layout_row.append(-1)
        layout.append(layout_row)
    png_bytes = BytesIO()
    sheet.save(png_bytes, format="PNG")
    encoded = base64.b64encode(png_bytes.getvalue()).decode("ascii")
    return json.dumps({
        "name": "anchored-cleanup-layer",
        "opacity": 1,
        "frameCount": len(frames),
        "chunks": [{
            "layout": layout,
            "base64PNG": f"data:image/png;base64,{encoded}",
        }],
    }, separators=(",", ":"))


def make_piskel(name: str, slug: str, frames: list[Image.Image], fps: int) -> None:
    project = {
        "modelVersion": 2,
        "piskel": {
            "name": name,
            "description": "Living drill v1 anchored on a 94x94 canvas. Center anchor remains at 47,47 for cleanup/no-drift.",
            "fps": fps,
            "height": FRAME_SIZE,
            "width": FRAME_SIZE,
            "layers": [piskel_layer(frames, len(frames))],
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
    sheet.save(PREVIEW_DIR / "living-drill-v1-contact-sheet.png")


def data_url(path: Path) -> str:
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def prompt_for(animation: str) -> str:
    base = (
        "Side-view 2D pixel-art game sprite animation reference of the exact same living drill character from the supplied locked anchor image: "
        "a compact one-tile machine creature where the whole body is a drill head, rounded white rear shell, segmented gray cone drill nose, "
        "black pixel outline, blue rear thruster and optional blue bottom hover thrust, grayscale highlights. Locked camera, no zoom, "
        "no redesign, no added limbs, no tank tread, no separate drill arm, no background scene, no size popping. "
        "Critical anchor rule: body center stays fixed to the middle of the 94x94 tile; flame/thrust effects must not shift the body."
    )
    goals = {
        "dig": "Motion goal: strongest priority, smooth drilling bite cycle. The whole character vibrates, grinds forward, drill cone bands visibly spin, then recoils smoothly. Keep the same silhouette and palette.",
        "idle": "Motion goal: subtle breathing/hover idle, tiny drill shimmer and rear flame flicker only. Keep the body centered.",
        "fly": "Motion goal: smooth flying hover, rear flame pulses, slight bob, no body redesign or color drift.",
    }
    return f"{base} {goals[animation]}"


def write_grok_payloads() -> None:
    ref_url = data_url(REFERENCE_DIR / "living-drill-api-anchor-480.png")
    payloads = {}
    budget = {
        "provider": "OpenRouter",
        "model": PROMPT_MODEL,
        "limitEur": 1,
        "estimatedPerJobUsdFromPreviousRun": 0.052,
        "plannedJobs": ["dig", "idle", "fly"],
        "status": "blocked-until-OPENROUTER_API_KEY-is-set",
    }
    for animation in ("dig", "idle", "fly"):
        payload = {
            "model": PROMPT_MODEL,
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
        payload_path = PAYLOAD_DIR / f"living-drill-{animation}.json"
        payload_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        payloads[animation] = str(payload_path.relative_to(ROOT)).replace("\\", "/")
    (LAB_DIR / "eur1-plan.json").write_text(json.dumps({
        "budget": budget,
        "payloads": payloads,
        "acceptance": [
            "Use the mockup as locked visual identity.",
            "Extract only frames with stable one-tile centered body.",
            "Run frames through piskel/anchoring before sandbox runtime export.",
            "Prefer dig quality over extra idle/fly variants if budget gets tight.",
        ],
    }, indent=2), encoding="utf-8")


def write_manifest(groups: dict[str, list[Image.Image]]) -> None:
    anchor_spec = json.loads((REFERENCE_DIR / "living-drill-anchor-spec.json").read_text(encoding="utf-8"))
    manifest = {
        "schemaVersion": 1,
        "id": "living-drill-v1",
        "displayName": "Living Drill",
        "sourceMockup": str(SOURCE_MOCKUP),
        "referenceCopy": "sprites/character/living-drill-v1/reference/mockup-reference.png",
        "anchorSpec": "sprites/character/living-drill-v1/reference/living-drill-anchor-spec.json",
        "apiAnchor": "sprites/character/living-drill-v1/reference/living-drill-api-anchor-480.png",
        "anchorGuide": "sprites/character/living-drill-v1/reference/living-drill-anchor-guide-480.png",
        "frameSize": [FRAME_SIZE, FRAME_SIZE],
        "anchor": {"x": ANCHOR[0], "y": ANCHOR[1]},
        "anchorRules": anchor_spec["canvasRules"],
        "runtime": {
            "idleSheet": "sprites/character/living-drill-v1/runtime/living-drill-idle-sheet.png",
            "digSheet": "sprites/character/living-drill-v1/runtime/living-drill-dig-sheet.png",
            "flySheet": "sprites/character/living-drill-v1/runtime/living-drill-fly-sheet.png",
        },
        "piskel": {
            "idle": "sprites/character/living-drill-v1/piskel/living-drill-idle.piskel",
            "dig": "sprites/character/living-drill-v1/piskel/living-drill-dig.piskel",
            "fly": "sprites/character/living-drill-v1/piskel/living-drill-fly.piskel",
        },
        "animations": {
            "idle": {"frames": len(groups["idle"]), "fps": 6},
            "dig": {"frames": len(groups["dig"]), "fps": 14},
            "fly": {"frames": len(groups["fly"]), "fps": 8},
        },
        "budget": {
            "provider": "Grok Imagine Video via OpenRouter",
            "limit": "EUR 1",
            "status": "payloads prepared; live spend requires OPENROUTER_API_KEY",
            "priority": ["dig", "idle", "fly"],
        },
        "prompts": {animation: prompt_for(animation) for animation in ("dig", "idle", "fly")},
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    report = {
        "schemaVersion": 1,
        "asset": "living-drill-v1",
        "anchor": ANCHOR,
        "frameSize": [FRAME_SIZE, FRAME_SIZE],
        "acceptedFrames": [
            {"animation": animation, "frame": index}
            for animation, frames in groups.items()
            for index in range(len(frames))
        ],
        "notes": [
            "Frames are derived from one extracted mockup cutout and anchored on a fixed 94x94 canvas.",
            "Grok payloads are prepared but not submitted because no OPENROUTER_API_KEY is available.",
            "Replace these runtime sheets with accepted Grok frames after piskel cleanup.",
        ],
    }
    (REPORT_DIR / "living-drill-v1-drift-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")


def main() -> None:
    ensure_dirs()
    sprite = load_reference_sprite()
    write_anchor_files(sprite)
    groups = {
        "idle": make_idle_frames(sprite),
        "dig": make_dig_frames(sprite),
        "fly": make_fly_frames(sprite),
    }
    make_sheet("living-drill-idle-sheet.png", groups["idle"])
    make_sheet("living-drill-dig-sheet.png", groups["dig"])
    make_sheet("living-drill-fly-sheet.png", groups["fly"])
    make_piskel("Living Drill V1 Idle", "living-drill-idle", groups["idle"], 6)
    make_piskel("Living Drill V1 Dig", "living-drill-dig", groups["dig"], 14)
    make_piskel("Living Drill V1 Fly", "living-drill-fly", groups["fly"], 8)
    write_contact_sheet(groups)
    write_grok_payloads()
    write_manifest(groups)
    print(f"Generated living-drill-v1 assets in {OUT_DIR}")


if __name__ == "__main__":
    main()
