from __future__ import annotations

import argparse
import json
import math
import base64
import io
import re
from collections import Counter, deque
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageStat


ROOT = Path(__file__).resolve().parents[1]
CHAR = ROOT / "sprites" / "character" / "character-v8"
RUNTIME = CHAR / "runtime"
PREVIEWS = CHAR / "previews"
REPORTS = CHAR / "reports"
PISKEL = CHAR / "piskel"
MOTION_PROFILES = REPORTS / "blender-motion-profiles"
BACKUP_DIG_DOWN = Path("C:/xampp/_Backups/dig-game-simple/back-ups-dig-game/23-06-2026-big-progress-tiled-piksel/sprites/character/character-v5-walk/dig/dig-down")
DIG_DOWN_RESTORED_SOURCE = CHAR / "manual-blend" / "dig-down-v5-restored"
FRAME_SIZE = (341, 341)
MAX_WEBP_DIM = 16383


def frame_source(*parts: str) -> Path:
    return CHAR.joinpath(*parts)


ANIMS: dict[str, dict] = {
    "idle": {
        "source": frame_source("frames", "idle"),
        "output": "legacy-idle-clean-sheet.webp",
        "fps": 8,
        "anchor": True,
        "cullSourceIndices": [3],
    },
    "walk": {
        "source": frame_source("frames", "walk"),
        "output": "legacy-walk-clean-sheet.webp",
        "fps": 14,
        "anchor": True,
    },
    "dig-sideways": {
        "source": frame_source("frames", "dig-sideways"),
        "output": "legacy-dig-sideways-clean-sheet.webp",
        "fps": 30,
        "anchor": True,
        "anchorMode": "feet",
    },
    "dig-up": {
        "source": frame_source("frames", "dig-up"),
        "output": "legacy-dig-up-clean-sheet.webp",
        "fps": 30,
        "anchor": True,
    },
    "dig-up-sideways": {
        "source": frame_source("frames", "dig-up-sideways"),
        "output": "legacy-dig-up-sideways-clean-sheet.webp",
        "fps": 30,
        "anchor": True,
    },
    "fly-climb": {
        "source": frame_source("frames", "fly-climb"),
        "output": "legacy-fly-climb-clean-sheet.webp",
        "fps": 14,
        "anchor": True,
    },
    "dig-up-look": {
        "source": frame_source("frames", "dig-up-look"),
        "singleFrameOutput": "legacy-dig-up-look-clean.png",
        "fps": 1,
        "anchor": True,
    },
    "dig-down": {
        "source": DIG_DOWN_RESTORED_SOURCE,
        "output": "dig-down-sheet.webp",
        "fps": 18,
        "anchor": True,
    },
    "duck-downwards": {
        "source": frame_source("manual-blend", "duck-downwards"),
        "output": "duck-downwards-sheet.webp",
        "fps": 10,
        "anchor": True,
    },
    "combat-idle-to-normal-idle": {
        "source": frame_source("manual-blend", "combat-idle-to-normal-idle", "frames"),
        "output": "combat-idle-to-normal-idle-sheet.webp",
        "fps": 14,
        "anchor": True,
        "cullSourceIndices": [0, 1, 10, 16, 17],
    },
    "leans-against-wall": {
        "source": frame_source("frames", "leans-against-wall"),
        "output": "leans-against-wall-sheet.webp",
        "fps": 8,
        "anchor": False,
    },
    "falling-downward-through-sky": {
        "source": frame_source("frames", "falling-downward-through-sky"),
        "output": "falling-downward-through-sky-sheet.webp",
        "fps": 12,
        "anchor": True,
    },
    "quickslash": {
        "source": frame_source("frames", "quickslash"),
        "output": "legacy-quickslash-clean-sheet.webp",
        "fps": 12,
        "anchor": True,
    },
    "quickslash-v2": {
        "source": frame_source("frames", "quickslash", "v2"),
        "output": "quickslash-v2-clean-sheet.webp",
        "fps": 30,
        "anchor": False,
        "cullSourceIndices": [23],
        "sourcePreparation": "checkerboard-center-square",
        "orientation": "right",
        "recommendedDisplaySizePx": 98,
    },
    "teleport-in": {
        "source": frame_source("frames", "teleport-in"),
        "output": "teleport-in-clean-sheet.webp",
        "fps": 30,
        "anchor": False,
        "sourcePreparation": "checkerboard-center-square",
        "orientation": "front-action",
    },
    "thunder-charge": {
        "source": frame_source("frames", "thunder-charge"),
        "output": "thunder-charge-sheet.webp",
        "fps": 6,
        "anchor": True,
    },
    "thunder-strike": {
        "source": frame_source("frames", "thunder-strike"),
        "output": "thunder-strike-sheet.webp",
        "fps": 10,
        "anchor": True,
    },
}


def natural_path_key(path: Path) -> tuple[object, ...]:
    return tuple(int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", path.name))


def frame_paths(source: Path) -> list[Path]:
    return sorted(
        [p for p in source.iterdir() if p.suffix.lower() in {".png", ".webp"}],
        key=natural_path_key,
    )


def crop_center_square(image: Image.Image) -> Image.Image:
    side = min(image.size)
    left = (image.width - side) // 2
    top = (image.height - side) // 2
    return image.crop((left, top, left + side, top + side))


def checker_matte_candidate(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a <= 8:
        return True
    chroma = max(r, g, b) - min(r, g, b)
    luminance = (r + g + b) / 3
    return a >= 245 and chroma <= 14 and 168 <= luminance <= 238


def remove_baked_checkerboard(image: Image.Image) -> tuple[Image.Image, int]:
    """Remove light checker components, including enclosed holes inside FX silhouettes."""
    cleaned = image.copy()
    px = cleaned.load()
    width, height = cleaned.size
    seen: set[tuple[int, int]] = set()
    removed = 0

    for start_y in range(height):
        for start_x in range(width):
            if (start_x, start_y) in seen or not checker_matte_candidate(px[start_x, start_y]):
                continue
            queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
            seen.add((start_x, start_y))
            component: list[tuple[int, int]] = []
            touches_edge = False
            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                touches_edge = touches_edge or x == 0 or y == 0 or x == width - 1 or y == height - 1
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height or (nx, ny) in seen:
                        continue
                    if checker_matte_candidate(px[nx, ny]):
                        seen.add((nx, ny))
                        queue.append((nx, ny))
            if not touches_edge and len(component) < 24:
                continue
            for x, y in component:
                if px[x, y][3] != 0:
                    px[x, y] = (0, 0, 0, 0)
                    removed += 1

    return cleaned, removed


def defringe_checker_cutout(image: Image.Image) -> tuple[Image.Image, int]:
    cleaned = image.copy()
    alpha = cleaned.getchannel("A")
    nearby_min_alpha = alpha.filter(ImageFilter.MinFilter(31))
    cleaned_px = cleaned.load()
    nearby_px = nearby_min_alpha.load()
    changed = 0
    width, height = cleaned.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = cleaned_px[x, y]
            if a <= 8 or nearby_px[x, y] >= a:
                continue
            chroma = max(r, g, b) - min(r, g, b)
            luminance = (r + g + b) / 3
            if chroma <= 24 and 150 <= luminance <= 253:
                cleaned_px[x, y] = (0, 0, 0, 0)
                changed += 1
            elif chroma <= 60 and 150 <= luminance <= 253:
                softened_alpha = min(a, max(20, (chroma - 12) * 6))
                if softened_alpha != a:
                    cleaned_px[x, y] = (r, g, b, softened_alpha)
                    changed += 1
    return cleaned, changed


def prepare_checkerboard_capture(image: Image.Image) -> tuple[Image.Image, int]:
    square = crop_center_square(image)
    cutout, removed = remove_baked_checkerboard(square)
    resized = cutout.resize(FRAME_SIZE, Image.Resampling.LANCZOS)
    defringed, fringe_changed = defringe_checker_cutout(resized)
    return defringed, removed + fringe_changed


def load_frame(path: Path, cfg: dict | None = None) -> tuple[Image.Image, int]:
    image = Image.open(path).convert("RGBA")
    if cfg and cfg.get("sourcePreparation") == "checkerboard-center-square":
        return prepare_checkerboard_capture(image)
    if image.size == FRAME_SIZE:
        return image, 0
    canvas = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    x = (FRAME_SIZE[0] - image.width) // 2
    y = FRAME_SIZE[1] - image.height
    canvas.alpha_composite(image, (x, y))
    return canvas, 0


def write_restored_dig_down_sources() -> dict:
    if not BACKUP_DIG_DOWN.exists():
        raise FileNotFoundError(f"Missing requested dig-down backup source: {BACKUP_DIG_DOWN}")
    DIG_DOWN_RESTORED_SOURCE.mkdir(parents=True, exist_ok=True)
    for old_frame in DIG_DOWN_RESTORED_SOURCE.glob("frame-*.png"):
        old_frame.unlink()
    restored = []
    for index, path in enumerate(frame_paths(BACKUP_DIG_DOWN)):
        if path.name.lower().endswith(".zip"):
            continue
        image = Image.open(path).convert("RGBA")
        cutout = cutout_checker_background(image)
        normalized = remove_isolated_neutral_components(fit_to_runtime_frame(cutout, max_width=260, max_height=330))
        out = DIG_DOWN_RESTORED_SOURCE / f"frame-{index:03d}.png"
        normalized.save(out)
        restored.append(str(out.relative_to(ROOT)).replace("\\", "/"))
    return {
        "backupSource": str(BACKUP_DIG_DOWN).replace("\\", "/"),
        "restoredSource": str(DIG_DOWN_RESTORED_SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "frames": restored,
    }


def quantized_rgb(rgb: tuple[int, int, int], bucket: int = 8) -> tuple[int, int, int]:
    return tuple((c // bucket) * bucket for c in rgb)


def border_pixels(image: Image.Image) -> list[tuple[int, int, int, int]]:
    px = image.load()
    w, h = image.size
    values = []
    for x in range(w):
        values.append(px[x, 0])
        values.append(px[x, h - 1])
    for y in range(1, h - 1):
        values.append(px[0, y])
        values.append(px[w - 1, y])
    return values


def dominant_border_color(image: Image.Image) -> tuple[int, int, int]:
    samples = [p for p in border_pixels(image) if p[3] > 24]
    if not samples:
        return (0, 0, 0)
    counts = Counter(quantized_rgb(p[:3]) for p in samples)
    return counts.most_common(1)[0][0]


def color_distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    return math.sqrt(sum((int(x) - int(y)) ** 2 for x, y in zip(a, b)))


def low_saturation(rgb: tuple[int, int, int], spread_limit: int = 34) -> bool:
    return max(rgb) - min(rgb) <= spread_limit


def checker_background_like(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a <= 8:
        return True
    rgb = (r, g, b)
    average = sum(rgb) / 3
    return a >= 245 and low_saturation(rgb, 24) and 42 <= average <= 122


def walk_matte_like(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a <= 8:
        return True
    rgb = (r, g, b)
    if a >= 246 and low_saturation(rgb, 10) and 18 <= max(rgb) <= 74:
        return True
    if a <= 245 and low_saturation(rgb, 36) and max(rgb) <= 90:
        return True
    return False


def background_like(pixel: tuple[int, int, int, int], bg: tuple[int, int, int]) -> bool:
    r, g, b, a = pixel
    if a <= 8:
        return True
    rgb = (r, g, b)
    # Only flood into colors close to the border background. This avoids cutting
    # into opaque grey clothing/tool pixels that are not part of the backdrop.
    if a <= 245 and low_saturation(rgb) and color_distance(rgb, bg) <= 42:
        return True
    if a <= 110 and low_saturation(rgb, 48) and color_distance(rgb, bg) <= 70:
        return True
    return False


def border_connected_background_mask(image: Image.Image) -> set[tuple[int, int]]:
    px = image.load()
    w, h = image.size
    bg = dominant_border_color(image)
    seen: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    def add_if_bg(x: int, y: int) -> None:
        if (x, y) in seen:
            return
        if background_like(px[x, y], bg):
            seen.add((x, y))
            queue.append((x, y))

    for x in range(w):
        add_if_bg(x, 0)
        add_if_bg(x, h - 1)
    for y in range(h):
        add_if_bg(0, y)
        add_if_bg(w - 1, y)

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= w or ny >= h or (nx, ny) in seen:
                continue
            if background_like(px[nx, ny], bg):
                seen.add((nx, ny))
                queue.append((nx, ny))
    return seen


def cleanup_border_halo(image: Image.Image) -> tuple[Image.Image, int]:
    cleaned = image.copy()
    px = cleaned.load()
    changed = 0
    for x, y in border_connected_background_mask(cleaned):
        if px[x, y][3] != 0:
            px[x, y] = (0, 0, 0, 0)
            changed += 1
    return cleaned, changed


def flood_cleanup(image: Image.Image, predicate) -> tuple[Image.Image, int]:
    cleaned = image.copy()
    px = cleaned.load()
    w, h = cleaned.size
    seen: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    def add_if_match(x: int, y: int) -> None:
        if (x, y) in seen:
            return
        if predicate(px[x, y]):
            seen.add((x, y))
            queue.append((x, y))

    for x in range(w):
        add_if_match(x, 0)
        add_if_match(x, h - 1)
    for y in range(h):
        add_if_match(0, y)
        add_if_match(w - 1, y)

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= w or ny >= h or (nx, ny) in seen:
                continue
            if predicate(px[nx, ny]):
                seen.add((nx, ny))
                queue.append((nx, ny))

    changed = 0
    for x, y in seen:
        if px[x, y][3] != 0:
            px[x, y] = (0, 0, 0, 0)
            changed += 1
    return cleaned, changed


def cutout_checker_background(image: Image.Image) -> Image.Image:
    cleaned, _ = flood_cleanup(image, checker_background_like)
    return remove_isolated_neutral_components(cleaned)


def remove_isolated_neutral_components(image: Image.Image) -> Image.Image:
    cleaned = image.copy()
    px = cleaned.load()
    w, h = cleaned.size
    seen: set[tuple[int, int]] = set()

    for start_y in range(h):
        for start_x in range(w):
            if (start_x, start_y) in seen or px[start_x, start_y][3] <= 8:
                continue
            queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
            seen.add((start_x, start_y))
            component: list[tuple[int, int]] = []
            saturated = False
            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                r, g, b, _ = px[x, y]
                if not low_saturation((r, g, b), 34):
                    saturated = True
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h or (nx, ny) in seen:
                        continue
                    if px[nx, ny][3] > 8:
                        seen.add((nx, ny))
                        queue.append((nx, ny))
            if saturated or len(component) >= 6000:
                continue
            for x, y in component:
                px[x, y] = (0, 0, 0, 0)
    return cleaned


def fit_to_runtime_frame(image: Image.Image, *, max_width: int, max_height: int) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    content = image.crop(bbox)
    scale = min(max_width / content.width, max_height / content.height)
    new_size = (
        max(1, round(content.width * scale)),
        max(1, round(content.height * scale)),
    )
    resized = content.resize(new_size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    x = (FRAME_SIZE[0] - resized.width) // 2
    y = FRAME_SIZE[1] - resized.height - 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def scale_frame_content(frame: Image.Image, scale: float) -> Image.Image:
    bbox = frame.getchannel("A").getbbox()
    if not bbox:
        return frame
    content = frame.crop(bbox)
    resized = content.resize(
        (max(1, round(content.width * scale)), max(1, round(content.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    center_x = (bbox[0] + bbox[2]) / 2
    bottom = bbox[3]
    x = round(center_x - resized.width / 2)
    y = round(bottom - resized.height)
    canvas.alpha_composite(resized, (x, y))
    return canvas


def scale_frame_content_to_width(frame: Image.Image, max_width: int) -> Image.Image:
    bbox = frame.getchannel("A").getbbox()
    if not bbox:
        return frame
    width = bbox[2] - bbox[0]
    if width <= max_width:
        return frame
    return scale_frame_content(frame, max_width / width)


def shift_frame_content(frame: Image.Image, dx: int = 0, dy: int = 0) -> Image.Image:
    shifted = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    shifted.alpha_composite(frame, (dx, dy))
    return shifted


def solidify_visible_pixels(frame: Image.Image, threshold: int = 24) -> Image.Image:
    solid = frame.copy()
    px = solid.load()
    w, h = solid.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > threshold:
                px[x, y] = (r, g, b, 255)
    return solid


def fill_small_alpha_holes(frame: Image.Image, max_area: int = 180) -> tuple[Image.Image, int]:
    """Reconstruct small enclosed cutout holes without closing real open silhouettes."""
    restored = frame.copy()
    alpha = restored.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return restored, 0

    px = restored.load()
    left, top, right, bottom = bbox
    seen: set[tuple[int, int]] = set()
    holes: list[list[tuple[int, int]]] = []
    for start_y in range(top, bottom):
        for start_x in range(left, right):
            if (start_x, start_y) in seen or px[start_x, start_y][3] > 8:
                continue
            queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
            seen.add((start_x, start_y))
            component: list[tuple[int, int]] = []
            touches_bounds = False
            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                touches_bounds = touches_bounds or x == left or x == right - 1 or y == top or y == bottom - 1
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if nx < left or nx >= right or ny < top or ny >= bottom or (nx, ny) in seen:
                        continue
                    if px[nx, ny][3] <= 8:
                        seen.add((nx, ny))
                        queue.append((nx, ny))
            if not touches_bounds and len(component) <= max_area:
                holes.append(component)

    restored_pixels = 0
    for component in holes:
        pending = set(component)
        while pending:
            updates: list[tuple[int, int, tuple[int, int, int, int]]] = []
            for x, y in pending:
                neighbours = []
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if nx < 0 or ny < 0 or nx >= restored.width or ny >= restored.height or (nx, ny) in pending:
                        continue
                    neighbour = px[nx, ny]
                    if neighbour[3] > 8:
                        neighbours.append(neighbour)
                if neighbours:
                    count = len(neighbours)
                    updates.append((x, y, (
                        round(sum(p[0] for p in neighbours) / count),
                        round(sum(p[1] for p in neighbours) / count),
                        round(sum(p[2] for p in neighbours) / count),
                        255,
                    )))
            if not updates:
                break
            for x, y, color in updates:
                px[x, y] = color
                pending.remove((x, y))
                restored_pixels += 1
    return restored, restored_pixels


def defringe_light_semi_alpha(frame: Image.Image) -> tuple[Image.Image, int]:
    """Replace pale semi-transparent edge RGB while preserving the authored silhouette."""
    cleaned = frame.copy()
    source = frame.load()
    target = cleaned.load()
    changed = 0
    for y in range(frame.height):
        for x in range(frame.width):
            r, g, b, a = source[x, y]
            if a <= 8 or a >= 247 or min(r, g, b) < 190 or max(r, g, b) - min(r, g, b) > 34:
                continue
            neighbours = []
            for radius in (1, 2, 3):
                for ny in range(max(0, y - radius), min(frame.height, y + radius + 1)):
                    for nx in range(max(0, x - radius), min(frame.width, x + radius + 1)):
                        nr, ng, nb, na = source[nx, ny]
                        if na >= 247 and (nr + ng + nb) / 3 < (r + g + b) / 3 - 8:
                            neighbours.append((nr, ng, nb))
                if neighbours:
                    break
            if not neighbours:
                continue
            count = len(neighbours)
            target[x, y] = (
                round(sum(p[0] for p in neighbours) / count),
                round(sum(p[1] for p in neighbours) / count),
                round(sum(p[2] for p in neighbours) / count),
                a,
            )
            changed += 1
    return cleaned, changed


def polish_cutout(frame: Image.Image, *, fill_holes: bool = True) -> tuple[Image.Image, dict]:
    polished = solidify_visible_pixels(frame)
    restored = 0
    if fill_holes:
        polished, restored = fill_small_alpha_holes(polished)
    return polished, {"restoredHolePixels": restored}


def apply_animation_transforms(name: str, frames: list[Image.Image]) -> tuple[list[Image.Image], dict]:
    report: dict[str, object] = {}
    if name == "idle":
        polished = frames.copy()
        changed: dict[int, dict[str, int]] = {}
        # Source frame 3 is culled before this stage, so original frames 21-34
        # become local indices 20-33.
        for index in range(20, len(polished)):
            defringed, fringe_pixels = defringe_light_semi_alpha(polished[index])
            rebuilt, hole_report = polish_cutout(defringed)
            polished[index] = rebuilt.filter(ImageFilter.UnsharpMask(radius=0.8, percent=75, threshold=3))
            changed[index] = {
                "lightFringePixelsRecolored": fringe_pixels,
                "restoredHolePixels": hole_report["restoredHolePixels"],
            }
        report["removedSourceFrames"] = [3]
        report["polishedFeedbackFrames"] = changed
        return polished, report
    if name == "walk":
        leak_frames = {1, 2, 3, 4, 24, 35} | set(range(12, 20)) | set(range(28, 34)) | set(range(43, 50))
        cleaned_frames = frames.copy()
        changed: dict[int, dict[str, int]] = {}
        for index, frame in enumerate(frames):
            if index in leak_frames:
                cleaned, details = polish_cutout(frame)
                cleaned_frames[index] = cleaned
                changed[index] = details
        report["reconstructedWalkFrames"] = changed
        return cleaned_frames, report
    if name == "dig-up":
        polished = [
            scale_frame_content(frame, 1.035).filter(ImageFilter.UnsharpMask(radius=0.9, percent=90, threshold=3))
            for frame in frames
        ]
        report["scaleNormalizedFrames"] = list(range(len(polished)))
        report["scaleFactor"] = 1.035
        return polished, report
    if name == "dig-up-look":
        polished = [scale_frame_content(frame, 1.04).filter(ImageFilter.UnsharpMask(radius=0.9, percent=90, threshold=3)) for frame in frames]
        report["scaleFactor"] = 1.04
        return polished, report
    if name == "dig-down":
        frames = frames.copy()
        scaled = []
        for index in (3, 4):
            if index < len(frames):
                frames[index] = scale_frame_content_to_width(frames[index], 204).filter(ImageFilter.UnsharpMask(radius=1.0, percent=90, threshold=3))
                scaled.append(index)
        report["approvedScaleMatchedFrames"] = scaled
        report["targetMaxWidth"] = 204
        return frames, report
    if name == "duck-downwards":
        order = [6, 5, 4, 3]
        report["sourceFrameOrder"] = order
        report["recoveryFrameOrder"] = [2, 1, 0]
        return [frames[index] for index in order if index < len(frames)], report
    if name == "combat-idle-to-normal-idle":
        transformed = frames.copy()
        for index, frame in enumerate(frames):
            if index in {10, 11}:
                polished = scale_frame_content(frame, 1.025).filter(ImageFilter.UnsharpMask(radius=0.8, percent=80, threshold=3))
                if index == 11:
                    polished = ImageEnhance.Brightness(polished).enhance(0.97)
                    polished = ImageEnhance.Color(polished).enhance(1.06)
                transformed[index] = polished
        report["removedSourceFrames"] = [0, 1, 10, 16, 17]
        report["polishedOutputFrames"] = [10, 11]
        return transformed, report
    if name == "leans-against-wall":
        keep = [0, 1, 2, 3]
        isolated_removed = [remove_isolated_neutral_components(frames[index]) for index in keep if index < len(frames)]
        foot_anchored, foot_report = anchor_frames_by_feet(isolated_removed)
        offsets = [22, 22, 34, 34]
        report["sourceFrameOrder"] = keep
        report["runtimeOffsetXByFrame"] = offsets
        report["footAnchor"] = foot_report
        return [shift_frame_content(frame, offsets[index]) for index, frame in enumerate(foot_anchored)], report
    if name == "falling-downward-through-sky":
        polished = []
        restored: dict[int, int] = {}
        for index, frame in enumerate(frames):
            rebuilt, details = polish_cutout(scale_frame_content(frame, 1.04))
            polished.append(rebuilt)
            restored[index] = details["restoredHolePixels"]
        report["solidifiedAlphaFrames"] = list(range(len(frames)))
        report["scaleFactor"] = 1.04
        report["restoredHolePixels"] = restored
        return polished, report
    if name == "teleport-in":
        polished = frames.copy()
        factors: dict[int, float] = {}
        # The opening portal previously filled almost the entire 341 px cell,
        # making the teleport read much larger than the 89 px player even
        # though the resolved character frames already match idle.  Cap the
        # reveal width while it is still portal-dominant, then let the existing
        # body normalization ease naturally back to the standard player scale.
        portal_reveal_max_width = 280
        portal_width_capped_frames: dict[int, int] = {}
        for index in range(8, min(27, len(polished))):
            if index == 8 or index == 26:
                factor = 0.96
            elif index == 9 or index == 25:
                factor = 0.93
            else:
                factor = 0.90
            polished[index] = scale_frame_content(polished[index], factor).filter(ImageFilter.UnsharpMask(radius=0.8, percent=80, threshold=3))
            factors[index] = factor
        for index in range(min(12, len(polished))):
            before_bbox = polished[index].getchannel("A").getbbox()
            polished[index] = scale_frame_content_to_width(
                polished[index],
                portal_reveal_max_width,
            )
            after_bbox = polished[index].getchannel("A").getbbox()
            if before_bbox and after_bbox and after_bbox[2] - after_bbox[0] < before_bbox[2] - before_bbox[0]:
                portal_width_capped_frames[index] = after_bbox[2] - after_bbox[0]
        report["portalRevealMaxWidthPx"] = portal_reveal_max_width
        report["portalWidthCappedFrames"] = portal_width_capped_frames
        report["scaleNormalizedFrames"] = factors
        return polished, report
    return frames, report


def bbox_for(image: Image.Image) -> tuple[int, int, int, int] | None:
    return image.getchannel("A").getbbox()


def frame_metrics(image: Image.Image) -> dict:
    bbox = bbox_for(image)
    if not bbox:
        return {"empty": True}
    left, top, right, bottom = bbox
    return {
        "empty": False,
        "left": left,
        "top": top,
        "right": right,
        "bottom": bottom,
        "centerX": (left + right) / 2,
        "centerY": (top + bottom) / 2,
        "width": right - left,
        "height": bottom - top,
        "opaquePixels": sum(1 for value in image.getchannel("A").getdata() if value > 12),
    }


def median(values: list[float]) -> float:
    if not values:
        return 0
    values = sorted(values)
    middle = len(values) // 2
    if len(values) % 2:
        return values[middle]
    return (values[middle - 1] + values[middle]) / 2


def anchor_frames(frames: list[Image.Image]) -> tuple[list[Image.Image], dict]:
    metrics = [frame_metrics(frame) for frame in frames]
    usable = [m for m in metrics if not m.get("empty")]
    if not usable:
        return frames, {"maxShiftX": 0, "maxShiftY": 0, "avgShiftX": 0, "avgShiftY": 0}

    target_center_x = round(median([m["centerX"] for m in usable]))
    target_bottom = round(median([m["bottom"] for m in usable]))
    anchored: list[Image.Image] = []
    shifts = []
    for frame, metric in zip(frames, metrics):
        if metric.get("empty"):
            anchored.append(frame)
            shifts.append((0, 0))
            continue
        dx = int(round(target_center_x - metric["centerX"]))
        dy = int(round(target_bottom - metric["bottom"]))
        shifted = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
        shifted.alpha_composite(frame, (dx, dy))
        anchored.append(shifted)
        shifts.append((dx, dy))

    abs_x = [abs(x) for x, _ in shifts]
    abs_y = [abs(y) for _, y in shifts]
    return anchored, {
        "targetCenterX": target_center_x,
        "targetBottom": target_bottom,
        "maxShiftX": max(abs_x) if abs_x else 0,
        "maxShiftY": max(abs_y) if abs_y else 0,
        "avgShiftX": round(sum(abs_x) / len(abs_x), 2) if abs_x else 0,
        "avgShiftY": round(sum(abs_y) / len(abs_y), 2) if abs_y else 0,
    }


def anchor_frames_by_feet(frames: list[Image.Image], foot_band_height: int = 28) -> tuple[list[Image.Image], dict]:
    """Stabilize ground contact without letting an extended arm/tool drag the body sideways."""
    samples: list[dict[str, float] | None] = []
    for frame in frames:
        alpha = frame.getchannel("A")
        bbox = alpha.getbbox()
        if not bbox:
            samples.append(None)
            continue
        left, _, right, bottom = bbox
        start_y = max(0, bottom - foot_band_height)
        alpha_px = alpha.load()
        xs = [
            x
            for y in range(start_y, bottom)
            for x in range(left, right)
            if alpha_px[x, y] > 24
        ]
        samples.append({
            "footX": median([float(x) for x in xs]) if xs else (left + right) / 2,
            "bottom": float(bottom),
        })

    usable = [sample for sample in samples if sample]
    if not usable:
        return frames, {"maxShiftX": 0, "maxShiftY": 0, "avgShiftX": 0, "avgShiftY": 0}
    target_foot_x = round(median([sample["footX"] for sample in usable]))
    target_bottom = round(median([sample["bottom"] for sample in usable]))
    anchored: list[Image.Image] = []
    shifts: list[tuple[int, int]] = []
    for frame, sample in zip(frames, samples):
        if not sample:
            anchored.append(frame)
            shifts.append((0, 0))
            continue
        dx = round(target_foot_x - sample["footX"])
        dy = round(target_bottom - sample["bottom"])
        anchored.append(shift_frame_content(frame, dx, dy))
        shifts.append((dx, dy))
    abs_x = [abs(x) for x, _ in shifts]
    abs_y = [abs(y) for _, y in shifts]
    return anchored, {
        "mode": "feet",
        "targetFootX": target_foot_x,
        "targetBottom": target_bottom,
        "footBandHeight": foot_band_height,
        "maxShiftX": max(abs_x) if abs_x else 0,
        "maxShiftY": max(abs_y) if abs_y else 0,
        "avgShiftX": round(sum(abs_x) / len(abs_x), 2) if abs_x else 0,
        "avgShiftY": round(sum(abs_y) / len(abs_y), 2) if abs_y else 0,
    }


def grid_size(frame_count: int) -> tuple[int, int]:
    if frame_count <= 0:
        return (1, 1)
    max_cols = min(16, MAX_WEBP_DIM // FRAME_SIZE[0])
    cols = min(max_cols, frame_count)
    rows = math.ceil(frame_count / cols)
    return cols, rows


def save_sheet(frames: list[Image.Image], out: Path) -> tuple[int, int]:
    columns, rows = grid_size(len(frames))
    sheet = Image.new("RGBA", (FRAME_SIZE[0] * columns, FRAME_SIZE[1] * rows), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, ((index % columns) * FRAME_SIZE[0], (index // columns) * FRAME_SIZE[1]))
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, "WEBP", lossless=True, quality=100, method=6)
    return columns, rows


def save_contact(name: str, frames: list[Image.Image]) -> Path:
    thumb = (128, 128)
    columns = min(8, len(frames))
    rows = math.ceil(len(frames) / columns) if frames else 1
    contact = Image.new("RGBA", (thumb[0] * columns, thumb[1] * rows), (24, 24, 24, 255))
    for index, frame in enumerate(frames):
        # The audit is for judging painted sprite quality, so preview it with
        # the same smooth sampling used by the Phaser runtime. NEAREST made
        # detailed 341 px art look falsely pixelated when reduced to 128 px.
        small = frame.resize(thumb, Image.Resampling.LANCZOS)
        contact.alpha_composite(small, ((index % columns) * thumb[0], (index // columns) * thumb[1]))
    preview = PREVIEWS / f"{name}-runtime-contact.png"
    preview.parent.mkdir(parents=True, exist_ok=True)
    contact.save(preview)
    return preview


def save_slowmo_gif(name: str, frames: list[Image.Image], fps: int, slowdown: int = 8) -> Path:
    preview = PREVIEWS / f"{name}-slowmo.gif"
    preview.parent.mkdir(parents=True, exist_ok=True)
    if not frames:
        return preview
    background = (24, 24, 24, 255)
    gif_frames = []
    for frame in frames:
        gif_frame = Image.new("RGBA", FRAME_SIZE, background)
        gif_frame.alpha_composite(frame)
        gif_frames.append(gif_frame.convert("P", palette=Image.Palette.ADAPTIVE))
    duration_ms = max(1, round(1000 / max(1, fps) * slowdown))
    gif_frames[0].save(
        preview,
        save_all=True,
        append_images=gif_frames[1:],
        duration=duration_ms,
        loop=0,
        disposal=2,
    )
    return preview


def image_to_data_uri(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    payload = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{payload}"


def save_piskel(name: str, frames: list[Image.Image], fps: int) -> Path:
    columns, rows = grid_size(len(frames))
    sheet = Image.new("RGBA", (FRAME_SIZE[0] * columns, FRAME_SIZE[1] * rows), (0, 0, 0, 0))
    layout: list[list[int]] = []
    for row in range(rows):
        layout_row: list[int] = []
        for column in range(columns):
            index = row * columns + column
            layout_row.append(index if index < len(frames) else -1)
            if index < len(frames):
                sheet.alpha_composite(frames[index], (column * FRAME_SIZE[0], row * FRAME_SIZE[1]))
        layout.append(layout_row)
    layer = {
        "name": "Layer 1",
        "opacity": 1,
        "frameCount": len(frames),
        "chunks": [{"layout": layout, "base64PNG": image_to_data_uri(sheet)}],
    }
    data = {
        "modelVersion": 2,
        "piskel": {
            "name": f"Legacy Miner V8 {name}",
            "description": "Generated from cleaned legacy miner v8 runtime frames.",
            "fps": fps,
            "height": FRAME_SIZE[1],
            "width": FRAME_SIZE[0],
            "layers": [json.dumps(layer, separators=(",", ":"))],
            "hiddenFrames": [],
        },
    }
    out = PISKEL / f"{name}.piskel"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return out


def diff_alpha(before: Image.Image, after: Image.Image) -> int:
    return sum(1 for b, a in zip(before.getchannel("A").getdata(), after.getchannel("A").getdata()) if b != a)


def source_frame_number(path: Path) -> int | None:
    matches = re.findall(r"\d+", path.stem)
    return int(matches[-1]) if matches else None


def adjacent_motion_report(frames: list[Image.Image], paths: list[Path]) -> dict:
    metrics = [frame_metrics(frame) for frame in frames]
    transitions = []
    source_gaps = []
    for index in range(1, len(frames)):
        previous = metrics[index - 1]
        current = metrics[index]
        difference = ImageChops.difference(frames[index - 1], frames[index])
        mean_difference = round(sum(ImageStat.Stat(difference).mean) / 4, 3)
        previous_number = source_frame_number(paths[index - 1])
        current_number = source_frame_number(paths[index])
        source_gap = current_number - previous_number if previous_number is not None and current_number is not None else None
        transition = {
            "fromFrame": index - 1,
            "toFrame": index,
            "fromSource": paths[index - 1].name,
            "toSource": paths[index].name,
            "sourceFrameGap": source_gap,
            "centerShiftX": round(float(current.get("centerX", 0)) - float(previous.get("centerX", 0)), 2),
            "centerShiftY": round(float(current.get("centerY", 0)) - float(previous.get("centerY", 0)), 2),
            "widthDelta": int(current.get("width", 0)) - int(previous.get("width", 0)),
            "heightDelta": int(current.get("height", 0)) - int(previous.get("height", 0)),
            "meanPixelDifference": mean_difference,
        }
        transitions.append(transition)
        if source_gap is not None and source_gap > 1:
            source_gaps.append(transition)
    return {"transitions": transitions, "sourceGapTransitions": source_gaps}


def write_motion_profile(name: str, frames: list[Image.Image], paths: list[Path], fps: int) -> Path:
    samples = []
    for index, (frame, path) in enumerate(zip(frames, paths)):
        metric = frame_metrics(frame)
        if metric.get("empty"):
            sample = {"frame": index, "cx": 170, "cy": 170, "w": 1, "h": 1, "reachX": 0, "reachY": 0, "angle": 0}
        else:
            sample = {
                "frame": index,
                "sourceFrame": path.name,
                "cx": metric["centerX"],
                "cy": metric["centerY"],
                "w": metric["width"],
                "h": metric["height"],
                "reachX": metric["right"] - metric["centerX"],
                "reachY": metric["centerY"] - metric["top"],
                "angle": 0,
                "bottom": metric["bottom"],
            }
        samples.append(sample)
    profile = {
        "schemaVersion": 1,
        "tool": "Blender motion-envelope reference generated from cleaned V8 sprite alpha bounds.",
        "frameSize": list(FRAME_SIZE),
        "anchorPx": {"x": FRAME_SIZE[0] // 2, "y": FRAME_SIZE[1] - 2},
        "animations": {name: {"fps": fps, "frames": samples}},
    }
    MOTION_PROFILES.mkdir(parents=True, exist_ok=True)
    out = MOTION_PROFILES / f"{name}-motion-profile.json"
    out.write_text(json.dumps(profile, indent=2) + "\n", encoding="utf-8")
    return out


def build_anim(name: str, cfg: dict) -> dict:
    source_paths = frame_paths(cfg["source"])
    if not source_paths:
        raise FileNotFoundError(f"No frames found for {name}: {cfg['source']}")
    culled_source_indices = set(cfg.get("cullSourceIndices", []))
    paths = [path for index, path in enumerate(source_paths) if index not in culled_source_indices]

    loaded_with_reports = [load_frame(path, cfg) for path in paths]
    loaded = [item[0] for item in loaded_with_reports]
    source_matte_removed = sum(item[1] for item in loaded_with_reports)
    before_metrics = [frame_metrics(frame) for frame in loaded]
    cleaned = []
    removed_total = 0
    for frame in loaded:
        cleaned_frame, removed = cleanup_border_halo(frame)
        cleaned.append(cleaned_frame)
        removed_total += removed
    cleaned, transform_report = apply_animation_transforms(name, cleaned)

    if cfg.get("anchorMode") == "feet":
        processed, anchor_report = anchor_frames_by_feet(cleaned)
    elif cfg.get("anchor", True):
        processed, anchor_report = anchor_frames(cleaned)
    else:
        processed = cleaned
        anchor_report = {"maxShiftX": 0, "maxShiftY": 0, "avgShiftX": 0, "avgShiftY": 0}

    alpha_changed = sum(diff_alpha(before, after) for before, after in zip(loaded, processed))
    after_metrics = [frame_metrics(frame) for frame in processed]

    if cfg.get("singleFrameOutput"):
        out = RUNTIME / cfg["singleFrameOutput"]
        out.parent.mkdir(parents=True, exist_ok=True)
        processed[0].save(out)
        columns = rows = 1
    else:
        out = RUNTIME / cfg["output"]
        columns, rows = save_sheet(processed, out)

    preview = save_contact(name, processed)
    slowmo_preview = save_slowmo_gif(name, processed, int(cfg["fps"]))
    piskel = save_piskel(name, processed, int(cfg["fps"]))
    motion_profile = write_motion_profile(name, processed, paths, int(cfg["fps"]))
    motion_report = adjacent_motion_report(processed, paths)
    cleaned_dir = RUNTIME / f"{name}-cleaned-frames"
    cleaned_dir.mkdir(parents=True, exist_ok=True)
    for old_frame in cleaned_dir.glob("frame-*.png"):
        old_frame.unlink()
    for index, frame in enumerate(processed):
        frame.save(cleaned_dir / f"frame-{index:03d}.png")

    before_centers = [m["centerX"] for m in before_metrics if not m.get("empty")]
    after_centers = [m["centerX"] for m in after_metrics if not m.get("empty")]
    before_bottoms = [m["bottom"] for m in before_metrics if not m.get("empty")]
    after_bottoms = [m["bottom"] for m in after_metrics if not m.get("empty")]
    metadata = {
        "name": name,
        "source": str(cfg["source"].relative_to(ROOT)).replace("\\", "/"),
        "output": str(out.relative_to(ROOT)).replace("\\", "/"),
        "cleanedFrames": str(cleaned_dir.relative_to(ROOT)).replace("\\", "/"),
        "preview": str(preview.relative_to(ROOT)).replace("\\", "/"),
        "slowmoPreview": str(slowmo_preview.relative_to(ROOT)).replace("\\", "/"),
        "piskel": str(piskel.relative_to(ROOT)).replace("\\", "/"),
        "motionProfile": str(motion_profile.relative_to(ROOT)).replace("\\", "/"),
        "frameWidth": FRAME_SIZE[0],
        "frameHeight": FRAME_SIZE[1],
        "frameCount": len(processed),
        "columns": columns,
        "rows": rows,
        "fps": cfg["fps"],
        "orientation": cfg.get("orientation"),
        "sourcePreparation": cfg.get("sourcePreparation"),
        "culledSourceIndices": sorted(culled_source_indices),
        "recommendedDisplaySizePx": cfg.get("recommendedDisplaySizePx", 89),
        "sourceFrames": [str(path.relative_to(ROOT)).replace("\\", "/") for path in paths],
        "sourceMattePixelsRemoved": source_matte_removed,
        "borderHaloPixelsRemoved": removed_total,
        "alphaPixelsChanged": alpha_changed,
        "targetedTransforms": transform_report,
        "motionAudit": motion_report,
        "anchor": anchor_report,
        "driftBefore": {
            "centerXRange": round((max(before_centers) - min(before_centers)) if before_centers else 0, 2),
            "bottomRange": round((max(before_bottoms) - min(before_bottoms)) if before_bottoms else 0, 2),
        },
        "driftAfter": {
            "centerXRange": round((max(after_centers) - min(after_centers)) if after_centers else 0, 2),
            "bottomRange": round((max(after_bottoms) - min(after_bottoms)) if after_bottoms else 0, 2),
        },
    }
    (RUNTIME / f"{name}-metadata.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    return metadata


def write_audit(manifest: dict) -> None:
    REPORTS.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Legacy Miner V8 Runtime Audit",
        "",
        "| Animation | Frames | Halo px removed | Center drift before -> after | Bottom drift before -> after | Anchor max shift |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for item in manifest["animations"]:
        before = item["driftBefore"]
        after = item["driftAfter"]
        anchor = item["anchor"]
        lines.append(
            f"| {item['name']} | {item['frameCount']} | {item['borderHaloPixelsRemoved']} | "
            f"{before['centerXRange']} -> {after['centerXRange']} | "
            f"{before['bottomRange']} -> {after['bottomRange']} | "
            f"x{anchor['maxShiftX']} y{anchor['maxShiftY']} |"
        )
    (REPORTS / "legacy-miner-v8-runtime-audit.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def parse_ids(value: str | None) -> list[str] | None:
    if not value:
        return None
    ids = [part.strip() for part in value.split(",") if part.strip()]
    unknown = [name for name in ids if name not in ANIMS]
    if unknown:
        raise ValueError(f"Unknown animation ids: {', '.join(unknown)}")
    return ids


def load_or_create_manifest(targeted: bool) -> dict:
    manifest_path = RUNTIME / "legacy-miner-v8-runtime-manifest.json"
    if targeted and manifest_path.is_file():
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    restored_sources = write_restored_dig_down_sources()
    return {
        "frameWidth": FRAME_SIZE[0],
        "frameHeight": FRAME_SIZE[1],
        "cleanupPolicy": "Border-connected dominant-background flood fill, enclosed checker-matte removal for imported captures, targeted walk matte cleanup, restored v5 dig-down cutouts, one-shot frame culls/reorders, falling alpha solidification, and optional median center/bottom anchoring. Interior character pixels are not globally keyed by color.",
        "restoredSources": {"digDown": restored_sources},
        "animations": [],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build cleaned Legacy Miner V8 animation assets.")
    parser.add_argument("--ids", help="Comma-separated animation ids. Omit to rebuild all V8 animations.")
    args = parser.parse_args()
    selected_ids = parse_ids(args.ids)
    targeted = selected_ids is not None
    names = selected_ids or list(ANIMS)
    manifest = load_or_create_manifest(targeted)
    manifest["cleanupPolicy"] = "Border-connected dominant-background flood fill, enclosed checker-matte removal for imported captures, targeted walk matte cleanup, restored v5 dig-down cutouts, one-shot frame culls/reorders, falling alpha solidification, and optional median center/bottom anchoring. Interior character pixels are not globally keyed by color."
    existing = {item["name"]: item for item in manifest.get("animations", [])}
    for name in names:
        existing[name] = build_anim(name, ANIMS[name])
    manifest["animations"] = [existing[name] for name in ANIMS if name in existing]
    RUNTIME.mkdir(parents=True, exist_ok=True)
    (RUNTIME / "legacy-miner-v8-runtime-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    write_audit(manifest)
    print(json.dumps({
        "ok": True,
        "targeted": targeted,
        "built": names,
        "manifest": str((RUNTIME / "legacy-miner-v8-runtime-manifest.json").relative_to(ROOT)).replace("\\", "/"),
        "animations": [existing[name] for name in names],
    }, indent=2))


if __name__ == "__main__":
    main()
