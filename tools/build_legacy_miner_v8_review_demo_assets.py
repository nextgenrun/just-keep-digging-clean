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
IDLE_REJECTED_FRAMES = frozenset({4, 5, 6, 11, 12, 13})
IDLE_REJECTED_TAIL_START = 28


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def alpha_bbox(frame: Image.Image) -> tuple[int, int, int, int] | None:
    return frame.getchannel("A").getbbox()


def harden_alpha(frame: Image.Image, threshold: int = 12) -> Image.Image:
    result = frame.copy()
    alpha = result.getchannel("A").point(lambda value: 255 if value > threshold else 0)
    result.putalpha(alpha)
    return result


def low_saturation(rgb: tuple[int, int, int], spread_limit: int = 34) -> bool:
    return max(rgb) - min(rgb) <= spread_limit


def walk_matte_like(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a <= 8:
        return True
    rgb = (r, g, b)
    if a >= 246 and low_saturation(rgb, 10) and 18 <= max(rgb) <= 74:
        return True
    if a >= 246 and low_saturation(rgb, 18) and 75 <= max(rgb) <= 124:
        return True
    return a <= 245 and low_saturation(rgb, 36) and max(rgb) <= 90


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
    columns = min(16, max(1, len(frames)))
    rows = max(1, math.ceil(len(frames) / columns))
    sheet = Image.new("RGBA", (FRAME_SIZE[0] * columns, FRAME_SIZE[1] * rows), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, ((index % columns) * FRAME_SIZE[0], (index // columns) * FRAME_SIZE[1]))
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


def remove_neutral_matte_leak(frame: Image.Image) -> Image.Image:
    result = frame.copy()
    pixels = result.load()
    body = Image.new("L", frame.size, 0)
    body_pixels = body.load()
    width, height = frame.size

    for y in range(height):
        for x in range(width):
            pixel = pixels[x, y]
            if pixel[3] > 8 and not walk_matte_like(pixel):
                body_pixels[x, y] = 255

    protected = body.filter(ImageFilter.MaxFilter(3))
    protected_pixels = protected.load()
    for y in range(height):
        for x in range(width):
            if protected_pixels[x, y] == 0 and walk_matte_like(pixels[x, y]):
                pixels[x, y] = (0, 0, 0, 0)
    remove_border_connected_matte(result, protected)
    return result


def remove_border_connected_matte(frame: Image.Image, protected: Image.Image) -> None:
    pixels = frame.load()
    protected_pixels = protected.load()
    width, height = frame.size
    seen: set[tuple[int, int]] = set()
    queue = deque()
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))
    while queue:
        x, y = queue.popleft()
        if (x, y) in seen:
            continue
        seen.add((x, y))
        if protected_pixels[x, y] > 0 or not walk_matte_like(pixels[x, y]):
            continue
        pixels[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in seen:
                queue.append((nx, ny))


def remove_light_halo(frame: Image.Image) -> Image.Image:
    result = frame.copy()
    pixels = result.load()
    width, height = result.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if 0 < a < 250 and low_saturation((r, g, b), 48) and (r + g + b) / 3 >= 168:
                pixels[x, y] = (0, 0, 0, 0)
    return result


def reduce_washed_highlights(frame: Image.Image) -> Image.Image:
    result = ImageEnhance.Contrast(frame).enhance(1.14)
    result = ImageEnhance.Color(result).enhance(1.06)
    result = result.filter(ImageFilter.UnsharpMask(radius=0.75, percent=150, threshold=2))
    pixels = result.load()
    width, height = result.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            average = (r + g + b) / 3
            spread = max(r, g, b) - min(r, g, b)
            if average >= 158 and spread <= 108:
                factor = 0.86 if average >= 205 else 0.91
                pixels[x, y] = (round(r * factor), round(g * factor), round(b * factor), a)
    return result


def build_walk_candidate() -> list[Image.Image]:
    return [harden_alpha(remove_neutral_matte_leak(frame), 14) for frame in load_numbered_frames("walk")]


def select_idle_review_frames(frames: list[Image.Image]) -> list[Image.Image]:
    kept = idle_kept_source_indices(len(frames))
    return [frames[index] for index in kept]


def idle_kept_source_indices(frame_count: int) -> list[int]:
    return [
        index
        for index in range(frame_count)
        if index not in IDLE_REJECTED_FRAMES and index < IDLE_REJECTED_TAIL_START
    ]


def build_idle_candidate() -> list[Image.Image]:
    frames = load_numbered_frames("idle")
    return [remove_light_halo(reduce_washed_highlights(frame.copy())) for frame in select_idle_review_frames(frames)]


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


def shift_visible(frame: Image.Image, dx: int = 0, dy: int = 0) -> Image.Image:
    shifted = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    shifted.alpha_composite(frame, (dx, dy))
    return shifted


def solid_candidate(name: str) -> list[Image.Image]:
    return [harden_alpha(frame, 14) for frame in load_numbered_frames(name)]


def shifted_candidate(name: str, dx: int, dy: int = 0) -> list[Image.Image]:
    return [shift_visible(frame, dx, dy) for frame in load_numbered_frames(name)]


def scaled_candidate(name: str, target_width: int) -> list[Image.Image]:
    return [rescale_visible(frame, target_width) for frame in load_numbered_frames(name)]


def alpha_blend_solid(a: Image.Image, b: Image.Image, amount: float) -> Image.Image:
    blended = Image.blend(a, b, amount).convert("RGBA")
    alpha = ImageChops.lighter(a.getchannel("A"), b.getchannel("A"))
    blended.putalpha(alpha)
    return blended


def build_combat_return_candidate() -> list[Image.Image]:
    frames = load_numbered_frames("combat-idle-to-normal-idle")
    idle = load_numbered_frames("idle")
    if len(frames) < 4 or not idle:
        return frames
    target = idle[0]
    frames = [frame.copy() for frame in frames]
    frames[-4] = alpha_blend_solid(frames[-4], target, 0.25)
    frames[-3] = alpha_blend_solid(frames[-3], target, 0.45)
    frames[-2] = alpha_blend_solid(frames[-2], target, 0.70)
    frames[-1] = target.copy()
    return [remove_light_halo(frame) for frame in frames]


def copy_candidate(name: str) -> list[Image.Image]:
    return [frame.copy() for frame in load_numbered_frames(name)]


CANDIDATE_BUILDERS = {
    "walk": build_walk_candidate,
    "idle": build_idle_candidate,
    "dig-down": build_dig_down_candidate,
    "falling-downward-through-sky": build_falling_candidate,
    "fly-climb": lambda: solid_candidate("fly-climb"),
    "leans-against-wall": lambda: copy_candidate("leans-against-wall"),
    "thunder-strike": lambda: copy_candidate("thunder-strike"),
    "thunder-charge": lambda: copy_candidate("thunder-charge"),
    "combat-idle-to-normal-idle": build_combat_return_candidate,
    "quickslash": lambda: solid_candidate("quickslash"),
    "dig-sideways": lambda: copy_candidate("dig-sideways"),
    "dig-up": lambda: copy_candidate("dig-up"),
    "dig-up-sideways": lambda: copy_candidate("dig-up-sideways"),
    "duck-downwards": lambda: copy_candidate("duck-downwards"),
}


def build_all_candidates() -> dict[str, str]:
    outputs: dict[str, str] = {}
    for name, builder in CANDIDATE_BUILDERS.items():
        current = load_numbered_frames(name)
        candidate = builder()
        compare_current = current
        frame_labels = None
        if name == "idle":
            compare_current = [frame.copy() for frame in select_idle_review_frames(current)]
            frame_labels = [f"{index:03d}" for index in idle_kept_source_indices(len(current))]
            current_sheet = SHEETS_DIR / "idle-current-kept-sheet.webp"
            write_sheet(current_sheet, compare_current)
        save_numbered_frames(f"{name}-candidate", candidate)
        sheet = SHEETS_DIR / f"{name}-candidate-sheet.webp"
        write_sheet(sheet, candidate)
        write_compare_sheet(name, compare_current, candidate, frame_labels)
        outputs[f"{name}Sheet"] = rel(sheet)
    return outputs


def checker(size: tuple[int, int], cell: int = 16) -> Image.Image:
    image = Image.new("RGB", size, (34, 34, 34))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2 == 0:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(68, 68, 68))
    return image


def write_compare_sheet(
    name: str,
    current: list[Image.Image],
    candidate: list[Image.Image],
    frame_labels: list[str] | None = None,
) -> None:
    thumb = (128, 128)
    label_h = 36
    rows = len(current)
    sheet = Image.new("RGB", (thumb[0] * 2 + 84, rows * (thumb[1] + label_h)), (18, 18, 18))
    draw = ImageDraw.Draw(sheet)
    draw.text((8, 8), name, fill=(238, 232, 220))
    for index, (before, after) in enumerate(zip(current, candidate)):
        y = index * (thumb[1] + label_h) + label_h
        label = frame_labels[index] if frame_labels and index < len(frame_labels) else f"{index:03d}"
        draw.text((8, y + 50), label, fill=(238, 232, 220))
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


def write_idle_frame_map() -> dict[str, str]:
    source_count = len(load_numbered_frames("idle"))
    kept = idle_kept_source_indices(source_count)
    removed = [index for index in range(source_count) if index not in kept]
    mapping = {
        "sourceFrameCount": source_count,
        "candidateFrameCount": len(kept),
        "keptSourceFrames": kept,
        "removedSourceFrames": removed,
        "candidateFrameToSourceFrame": [
            {"candidateFrame": candidate_index, "sourceFrame": source_index}
            for candidate_index, source_index in enumerate(kept)
        ],
    }
    json_path = OUT_DIR / "idle-frame-map.json"
    csv_path = OUT_DIR / "idle-frame-map.csv"
    json_path.write_text(json.dumps(mapping, indent=2) + "\n", encoding="utf-8")
    csv_lines = ["candidateFrame,sourceFrame,status"]
    for candidate_index, source_index in enumerate(kept):
        csv_lines.append(f"{candidate_index:03d},{source_index:03d},kept")
    for source_index in removed:
        csv_lines.append(f",{source_index:03d},removed")
    csv_path.write_text("\n".join(csv_lines) + "\n", encoding="utf-8")
    return {"idleFrameMapJson": rel(json_path), "idleFrameMapCsv": rel(csv_path)}


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
            "fly-climb": {"fps": 14, "frames": motion_frames(25, "falling")},
            "quickslash": {"fps": 12, "frames": motion_frames(2, "dig-sideways")},
            "thunder-strike": {"fps": 12, "frames": motion_frames(1, "dig-down")},
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
        "- Candidate sheets: `sheets/`",
        f"- Motion profile: `{paths['motionProfile']}`",
        f"- Contact sheets: `{rel(CONTACT_DIR)}`",
        f"- Idle source frame map: `{paths['idleFrameMapCsv']}`",
        "- Idle candidate removes source frames `004,005,006,011,012,013,028-034`.",
        "- Optional Blender export: `tools/export_legacy_miner_blender_motion_reference.py`",
        "",
    ]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "readme.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    SHEETS_DIR.mkdir(parents=True, exist_ok=True)
    FRAMES_DIR.mkdir(parents=True, exist_ok=True)
    CONTACT_DIR.mkdir(parents=True, exist_ok=True)

    paths = build_all_candidates()
    motion_profile = write_motion_profile()
    paths["motionProfile"] = rel(motion_profile)
    paths.update(write_idle_frame_map())
    write_readme(paths)
    (OUT_DIR / "manifest.json").write_text(json.dumps(paths, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, **paths}, indent=2))


if __name__ == "__main__":
    main()
