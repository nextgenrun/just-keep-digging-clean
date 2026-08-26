"""Build synchronized animated old-mixed versus unified-runtime review reels."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REVIEW_ROOT = ROOT / "testing/blender-animation-lab-v1/review-drafts/unified-survival-animation-v1"
OLD_AUDIT = REVIEW_ROOT / "2026-08-25-current-runtime-audit.json"
NEW_AUDIT = REVIEW_ROOT / "2026-08-25-unified-runtime-audit.json"
OUTPUT = REVIEW_ROOT / "renders/review"
ZOOM = 2.35
PANEL_WIDTH = 420
WIDTH = PANEL_WIDTH * 2
HEIGHT = 430
GROUND_Y = 350
FRAMES_PER_CLIP = 14

REELS = {
    "locomotion": [
        "survival-ual-player-v1-idle-anim",
        "survival-mixamo-v1-walk-start-anim",
        "survival-ual-player-v1-run-anim",
        "survival-mixamo-v1-walk-stop-anim",
    ],
    "mining-combat": [
        "survival-ual-player-v1-dig-side-cross-anim",
        "survival-ual-player-v1-moving-complex-dig-cross-jab-phase-01-anim",
        "survival-ual-player-v1-moving-complex-dig-jabElbow-jab-phase-01-anim",
        "survival-ual-player-v1-moving-complex-dig-roundhouse-jab-phase-01-anim",
        "survival-ual-player-v1-dig-up-jab-anim",
        "survival-ual-player-v1-dig-down-ground-strike-anim",
    ],
    "flight-landing-crouch": [
        "survival-ual-player-v1-flight-enter-anim",
        "survival-mixamo-v1-flight-loop-anim",
        "survival-ual-player-v1-flight-exit-anim",
        "survival-ual-player-v1-falling-anim",
        "survival-mixamo-v1-hard-landing-anim",
        "survival-mixamo-v1-crouch-enter-anim",
        "survival-mixamo-v1-crouch-idle-anim",
        "survival-mixamo-v1-crouch-exit-anim",
    ],
}


def font(size: int):
    preferred = Path("C:/Windows/Fonts/segoeuib.ttf")
    return ImageFont.truetype(str(preferred), size) if preferred.is_file() else ImageFont.load_default()


def load_audit(path: Path):
    audit = json.loads(path.read_text(encoding="utf-8"))
    return (
        {item["key"]: item for item in audit["animations"]},
        {item["key"]: item for item in audit["sheets"]},
    )


def frame_cell(animation, sheet, source_frame, cache):
    path = ROOT / sheet["path"]
    atlas = cache.get(path)
    if atlas is None:
        atlas = Image.open(path).convert("RGBA")
        cache[path] = atlas
    width = int(sheet["frameWidth"])
    height = int(sheet["frameHeight"])
    columns = atlas.width // width
    left = (source_frame % columns) * width
    top = (source_frame // columns) * height
    return atlas.crop((left, top, left + width, top + height))


def normalized_source_frame(animation, phase):
    frames = animation["frames"]
    return int(frames[min(len(frames) - 1, round(phase * (len(frames) - 1)))])


def draw_character(canvas, animation, sheet, phase, panel_x, cache):
    source_frame = normalized_source_frame(animation, phase)
    cell = frame_cell(animation, sheet, source_frame, cache)
    display = max(1, round(float(animation["displaySizePx"]) * ZOOM))
    cell = cell.resize((display, display), Image.Resampling.LANCZOS)
    origin = animation["origin"]
    x = round(panel_x + PANEL_WIDTH / 2 - float(origin["x"]) * display)
    y = round(GROUND_Y - float(origin["y"]) * display)
    canvas.alpha_composite(cell, (x, y))


def short_label(key):
    return (
        key.replace("survival-ual-player-v1-", "")
        .replace("survival-mixamo-v1-", "")
        .replace("-anim", "")
        .replace("moving-complex-dig-", "moving ")
        .replace("-jab-phase-01", "")
    )


def build_reel(name, keys, old_animations, old_sheets, new_animations, new_sheets):
    cache = {}
    output_frames = []
    for key in keys:
        old_animation = old_animations[key]
        new_animation = new_animations[key]
        old_sheet = old_sheets[old_animation["sheetKey"]]
        new_sheet = new_sheets[new_animation["sheetKey"]]
        for index in range(FRAMES_PER_CLIP):
            phase = index / max(1, FRAMES_PER_CLIP - 1)
            canvas = Image.new("RGBA", (WIDTH, HEIGHT), (7, 12, 17, 255))
            draw = ImageDraw.Draw(canvas)
            draw.rectangle((0, 0, PANEL_WIDTH - 1, HEIGHT - 1), outline=(66, 82, 96, 255), width=2)
            draw.rectangle((PANEL_WIDTH, 0, WIDTH - 1, HEIGHT - 1), outline=(71, 157, 173, 255), width=2)
            draw.line((24, GROUND_Y, WIDTH - 24, GROUND_Y), fill=(84, 104, 117, 255), width=2)
            draw.line((PANEL_WIDTH, 0, PANEL_WIDTH, HEIGHT), fill=(114, 143, 157, 255), width=2)
            draw.text((20, 16), "BEFORE · mixed old/new", font=font(22), fill=(226, 190, 145, 255))
            draw.text((PANEL_WIDTH + 20, 16), "AFTER · unified V4 render", font=font(22), fill=(155, 226, 235, 255))
            label = short_label(key)
            label_box = draw.textbbox((0, 0), label, font=font(18))
            draw.text(((WIDTH - (label_box[2] - label_box[0])) / 2, 55), label, font=font(18), fill=(239, 244, 247, 255))
            draw.text((20, HEIGHT - 48), f'{old_animation["displaySizePx"]} px · {old_sheet["frameWidth"]} px cell', font=font(15), fill=(180, 190, 198, 255))
            draw.text((PANEL_WIDTH + 20, HEIGHT - 48), f'{new_animation["displaySizePx"]} px · {new_sheet["frameWidth"]} px cell', font=font(15), fill=(180, 218, 224, 255))
            draw_character(canvas, old_animation, old_sheet, phase, 0, cache)
            draw_character(canvas, new_animation, new_sheet, phase, PANEL_WIDTH, cache)
            output_frames.append(canvas.convert("RGB"))
    path = OUTPUT / f"2026-08-25-unified-animation-{name}-before-after.webp"
    output_frames[0].save(
        path,
        format="WEBP",
        save_all=True,
        append_images=output_frames[1:],
        duration=72,
        loop=0,
        lossless=True,
        method=4,
    )
    for image in cache.values():
        image.close()
    return path


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    old_animations, old_sheets = load_audit(OLD_AUDIT)
    new_animations, new_sheets = load_audit(NEW_AUDIT)
    outputs = []
    for name, keys in REELS.items():
        missing = [key for key in keys if key not in old_animations or key not in new_animations]
        if missing:
            raise RuntimeError(f"{name}: missing comparison animations {missing}")
        outputs.append(build_reel(
            name, keys, old_animations, old_sheets, new_animations, new_sheets,
        ))
    print("SURVIVAL_UNIFIED_COMPARISON_OK", *[str(path) for path in outputs], sep="\n")


if __name__ == "__main__":
    main()
