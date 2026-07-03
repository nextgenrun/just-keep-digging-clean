from __future__ import annotations

import json
import math
from pathlib import Path
from collections import deque

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
CHAR_RUNTIME = ROOT / "sprites" / "character" / "character-v8" / "runtime"
OUT_DIR = ROOT / "markdown" / "audit" / "animation-audit" / "2026-07-03-legacy-miner-demo-review"
SHEETS_DIR = OUT_DIR / "sheets"
FRAMES_DIR = OUT_DIR / "frames"
CONTACT_DIR = OUT_DIR / "contact-sheets"
FRAME_SIZE = (341, 341)
ANCHOR = (170, 339)


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def alpha_bbox(frame: Image.Image) -> tuple[int, int, int, int] | None:
    return frame.getchannel("A").getbbox()


def harden_alpha(frame: Image.Image, threshold: int = 12) -> Image.Image:
    result = frame.copy()
    alpha = result.getchannel("A").point(lambda value: 255 if value > threshold else 0)
    result.putalpha(alpha)
    return result


def load_numbered_frames(name: str) -> list[Image.Image]:
    folder = CHAR_RUNTIME / f"{name}-cleaned-frames"
    return [Image.open(path).convert("RGBA") for path in sorted(folder.glob("frame-*.png"))]


def save_numbered_frames(name: str, frames: list[Image.Image]) -> None:
    folder = FRAMES_DIR / name
    folder.mkdir(parents=True, exist_ok=True)
    for old in folder.glob("frame-*.png"):
        old.unlink()
    for index, frame in enumerate(frames):
        frame.save(folder / f"frame-{index:03d}.png")


def write_sheet(path: Path, frames: list[Image.Image]) -> None:
    sheet = Image.new("RGBA", (FRAME_SIZE[0] * len(frames), FRAME_SIZE[1]), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * FRAME_SIZE[0], 0))
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path)


def rescale_visible(frame: Image.Image, target_width: int) -> Image.Image:
    bbox = alpha_bbox(frame)
    if not bbox:
        return frame.copy()
    x0, y0, x1, y1 = bbox
    crop = frame.crop(bbox)
    scale = min(1.0, target_width / max(1, crop.width))
    new_size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
    resized = crop.resize(new_size, Image.Resampling.BICUBIC)
    resized = ImageEnhance.Sharpness(resized).enhance(1.35)
    canvas = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    px = round(ANCHOR[0] - new_size[0] / 2)
    py = round(ANCHOR[1] - new_size[1])
    canvas.alpha_composite(resized, (px, py))
    return harden_alpha(canvas, 10)


def build_dig_down_candidate() -> list[Image.Image]:
    frames = load_numbered_frames("dig-down")
    candidate = [frame.copy() for frame in frames]
    for index in (3, 4):
        if index < len(candidate):
            candidate[index] = rescale_visible(candidate[index], 204)
    return candidate


def largest_component_mask(alpha: Image.Image) -> Image.Image:
    width, height = alpha.size
    pixels = alpha.load()
    seen: set[tuple[int, int]] = set()
    best: list[tuple[int, int]] = []
    for y in range(height):
        for x in range(width):
            if pixels[x, y] == 0 or (x, y) in seen:
                continue
            current: list[tuple[int, int]] = []
            queue = deque([(x, y)])
            seen.add((x, y))
            while queue:
                cx, cy = queue.popleft()
                current.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < width and 0 <= ny < height and pixels[nx, ny] > 0 and (nx, ny) not in seen:
                        seen.add((nx, ny))
                        queue.append((nx, ny))
            if len(current) > len(best):
                best = current
    mask = Image.new("L", alpha.size, 0)
    out = mask.load()
    for x, y in best:
        out[x, y] = 255
    return mask


def composite_rgb_source(frame: Image.Image) -> Image.Image:
    bg = Image.new("RGBA", frame.size, (50, 34, 24, 255))
    bg.alpha_composite(frame)
    return bg.convert("RGB").filter(ImageFilter.GaussianBlur(1.2))


def repair_falling_body(frame: Image.Image) -> Image.Image:
    result = frame.copy()
    original = frame.copy()
    alpha = result.getchannel("A")
    body = largest_component_mask(alpha)
    bbox = body.getbbox()
    if not bbox:
        return result

    x0, y0, x1, y1 = bbox
    body_pixels = body.load()
    source_rgb = composite_rgb_source(result).load()
    result_pixels = result.load()

    for y in range(y0, y1):
        for x in range(x0, x1):
            if body_pixels[x, y] > 0:
                r, g, b, _ = result_pixels[x, y]
                result_pixels[x, y] = (r, g, b, 255)

    lower = Image.new("L", FRAME_SIZE, 0)
    lower_pixels = lower.load()
    lower_start = y0 + round((y1 - y0) * 0.55)
    for y in range(lower_start, y1):
        for x in range(max(0, x0 - 10), min(FRAME_SIZE[0], x1 + 10)):
            if body_pixels[x, y] > 0:
                lower_pixels[x, y] = 255

    filled = lower.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MaxFilter(3))
    fill_pixels = filled.load()
    alpha_pixels = result.getchannel("A").load()
    for y in range(lower_start, min(FRAME_SIZE[1], y1 + 8)):
        for x in range(max(0, x0 - 10), min(FRAME_SIZE[0], x1 + 10)):
            if fill_pixels[x, y] > 0 and alpha_pixels[x, y] == 0:
                r, g, b = source_rgb[x, y]
                if y > y0 + round((y1 - y0) * 0.72):
                    r, g, b = min(r, 70), min(g, 54), min(b, 42)
                result_pixels[x, y] = (r, g, b, 255)

    draw = ImageDraw.Draw(result)
    leg_mask = Image.new("L", FRAME_SIZE, 0)
    leg_pixels = leg_mask.load()
    for y in range(y0 + round((y1 - y0) * 0.76), y1):
        for x in range(x0, x1):
            if body_pixels[x, y] > 0:
                leg_pixels[x, y] = 255
    for component_bbox in lower_component_boxes(leg_mask):
        lx0, ly0, lx1, ly1 = component_bbox
        if (lx1 - lx0) < 4 or (ly1 - ly0) < 7 or (lx1 - lx0) > 58 or (ly1 - ly0) > 62:
            continue
        pad_x = max(2, round((lx1 - lx0) * 0.18))
        draw.rounded_rectangle(
            (lx0 - pad_x, ly0 - 1, lx1 + pad_x, ly1 + 3),
            radius=3,
            fill=(55, 37, 25, 255),
            outline=(20, 15, 12, 255),
            width=1,
        )
    result.alpha_composite(original)

    crop = result.crop((x0, lower_start, x1, y1))
    crop = ImageEnhance.Sharpness(crop).enhance(1.55)
    crop = ImageEnhance.Contrast(crop).enhance(1.08)
    result.alpha_composite(crop, (x0, lower_start))
    return result


def lower_component_boxes(mask: Image.Image) -> list[tuple[int, int, int, int]]:
    width, height = mask.size
    pixels = mask.load()
    seen: set[tuple[int, int]] = set()
    boxes: list[tuple[int, int, int, int]] = []
    for y in range(height):
        for x in range(width):
            if pixels[x, y] == 0 or (x, y) in seen:
                continue
            xs: list[int] = []
            ys: list[int] = []
            queue = deque([(x, y)])
            seen.add((x, y))
            while queue:
                cx, cy = queue.popleft()
                xs.append(cx)
                ys.append(cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < width and 0 <= ny < height and pixels[nx, ny] > 0 and (nx, ny) not in seen:
                        seen.add((nx, ny))
                        queue.append((nx, ny))
            if len(xs) >= 18:
                boxes.append((min(xs), min(ys), max(xs) + 1, max(ys) + 1))
    return boxes


def build_falling_candidate() -> list[Image.Image]:
    frames = load_numbered_frames("falling-downward-through-sky")
    candidate = []
    for index, frame in enumerate(frames):
        candidate.append(repair_falling_body(frame) if 1 <= index <= 4 else frame.copy())
    return candidate


def checker(size: tuple[int, int], cell: int = 16) -> Image.Image:
    image = Image.new("RGB", size, (34, 34, 34))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2 == 0:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(68, 68, 68))
    return image


def write_compare_sheet(name: str, current: list[Image.Image], candidate: list[Image.Image]) -> None:
    thumb = (128, 128)
    label_h = 36
    rows = len(current)
    sheet = Image.new("RGB", (thumb[0] * 2 + 84, rows * (thumb[1] + label_h)), (18, 18, 18))
    draw = ImageDraw.Draw(sheet)
    draw.text((8, 8), name, fill=(238, 232, 220))
    for index, (before, after) in enumerate(zip(current, candidate)):
        y = index * (thumb[1] + label_h) + label_h
        draw.text((8, y + 50), f"{index:03d}", fill=(238, 232, 220))
        for col, (label, frame) in enumerate((("current", before), ("candidate", after))):
            x = 52 + col * (thumb[0] + 24)
            bg = checker(thumb)
            bg.paste(frame.resize(thumb, Image.Resampling.NEAREST), (0, 0), frame.resize(thumb, Image.Resampling.NEAREST))
            sheet.paste(bg, (x, y))
            draw.rectangle((x, y, x + thumb[0] - 1, y + thumb[1] - 1), outline=(90, 90, 90))
            draw.text((x, y - 18), label, fill=(200, 204, 196))
    path = CONTACT_DIR / f"{name}-current-vs-candidate.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path)


def motion_frames(count: int, kind: str) -> list[dict[str, float]]:
    frames = []
    for index in range(count):
        t = index / max(1, count - 1)
        if kind == "dig-down":
            frames.append({"frame": index, "cx": 170, "cy": 210 + math.sin(t * math.pi) * 16, "w": 92 - t * 10, "h": 172 - t * 42, "reachX": 0, "reachY": 52 + t * 46, "angle": -8 + t * 18})
        elif kind == "falling":
            frames.append({"frame": index, "cx": 170, "cy": 184 + t * 36, "w": 118 - t * 22, "h": 160 - t * 18, "reachX": 58 - t * 8, "reachY": -10 + t * 22, "angle": -8 + t * 16})
        else:
            punch = math.sin(t * math.pi)
            frames.append({"frame": index, "cx": 170, "cy": 200, "w": 92 + punch * 8, "h": 172, "reachX": 42 + punch * 55, "reachY": -14 + punch * 6, "angle": punch * -7})
    return frames


def write_motion_profile() -> Path:
    profile = {
        "schemaVersion": 1,
        "tool": "Blender-compatible legacy miner motion reference; demo uses this JSON when Blender is unavailable.",
        "frameSize": list(FRAME_SIZE),
        "anchorPx": {"x": ANCHOR[0], "y": ANCHOR[1]},
        "animations": {
            "dig-sideways": {"fps": 30, "frames": motion_frames(18, "dig-sideways")},
            "dig-down": {"fps": 18, "frames": motion_frames(5, "dig-down")},
            "falling": {"fps": 12, "frames": motion_frames(7, "falling")},
        },
    }
    path = OUT_DIR / "legacy-miner-motion-profile.json"
    path.write_text(json.dumps(profile, indent=2) + "\n", encoding="utf-8")
    return path


def write_readme(paths: dict[str, str]) -> None:
    lines = [
        "# Legacy Miner Demo Review",
        "",
        "Review-only candidate sheets for the Phaser demo. These files are not wired into gameplay.",
        "",
        "Outputs:",
        f"- Dig-down candidate sheet: `{paths['digDownSheet']}`",
        f"- Falling candidate sheet: `{paths['fallingSheet']}`",
        f"- Motion profile: `{paths['motionProfile']}`",
        f"- Contact sheets: `{rel(CONTACT_DIR)}`",
        "- Optional Blender export: `tools/export_legacy_miner_blender_motion_reference.py`",
        "",
    ]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "readme.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    SHEETS_DIR.mkdir(parents=True, exist_ok=True)
    FRAMES_DIR.mkdir(parents=True, exist_ok=True)
    CONTACT_DIR.mkdir(parents=True, exist_ok=True)

    dig_current = load_numbered_frames("dig-down")
    dig_candidate = build_dig_down_candidate()
    fall_current = load_numbered_frames("falling-downward-through-sky")
    fall_candidate = build_falling_candidate()

    save_numbered_frames("dig-down-candidate", dig_candidate)
    save_numbered_frames("falling-candidate", fall_candidate)
    dig_sheet = SHEETS_DIR / "dig-down-candidate-sheet.webp"
    fall_sheet = SHEETS_DIR / "falling-candidate-sheet.webp"
    write_sheet(dig_sheet, dig_candidate)
    write_sheet(fall_sheet, fall_candidate)
    write_compare_sheet("dig-down", dig_current, dig_candidate)
    write_compare_sheet("falling", fall_current, fall_candidate)
    motion_profile = write_motion_profile()
    paths = {"digDownSheet": rel(dig_sheet), "fallingSheet": rel(fall_sheet), "motionProfile": rel(motion_profile)}
    write_readme(paths)
    (OUT_DIR / "manifest.json").write_text(json.dumps(paths, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, **paths}, indent=2))


if __name__ == "__main__":
    main()
