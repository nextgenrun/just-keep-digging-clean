from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image

import build_living_drill_v1_assets as builder


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "sprites" / "character" / "living-drill-v1"
LAB_DIR = ASSET_DIR / "openrouter-lab" / "eur1-grok-imagen"
FRAMES_DIR = LAB_DIR / "extracted-frames"
FRAME_SOURCE_OVERRIDES = {
    "dig": "idle",
}
REJECTED_SOURCE_FRAMES = {
    "idle": {"frame-002.png", "frame-003.png", "frame-007.png"},
    "fly": {"frame-002.png", "frame-005.png", "frame-008.png"},
}

FRAME_COUNTS = {
    "idle": 6,
    "dig": 10,
    "fly": 6,
}

FPS = {
    "idle": 6,
    "dig": 14,
    "fly": 8,
}


def alpha_bbox(frame: Image.Image) -> tuple[int, int, int, int] | None:
    return frame.getchannel("A").getbbox()


def is_video_background_pixel(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a < 10:
        return True
    spread = max(r, g, b) - min(r, g, b)
    luminance = (r + g + b) / 3
    return spread <= 24 and luminance >= 226


def remove_video_edge_background(image: Image.Image) -> Image.Image:
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
        if not is_video_background_pixel(pixels[x, y]):
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


def visible_body_bbox(frame: Image.Image) -> tuple[int, int, int, int] | None:
    src = frame.convert("RGBA")
    pixels = src.load()
    xs: list[int] = []
    ys: list[int] = []
    for y in range(src.height):
        for x in range(src.width):
            pixel = pixels[x, y]
            if pixel[3] > 18 and not builder.is_blue_effect_pixel(pixel):
                xs.append(x)
                ys.append(y)
    if not xs:
        return alpha_bbox(src)
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def key_sprite_bbox(frame: Image.Image) -> tuple[int, int, int, int] | None:
    src = frame.convert("RGBA")
    pixels = src.load()
    xs: list[int] = []
    ys: list[int] = []
    for y in range(src.height):
        for x in range(src.width):
            r, g, b, a = pixels[x, y]
            if a < 20:
                continue
            luminance = (r + g + b) / 3
            spread = max(r, g, b) - min(r, g, b)
            if luminance < 112 or spread > 48 or builder.is_blue_effect_pixel((r, g, b, a)):
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    pad = 4
    return (
        max(0, min(xs) - pad),
        max(0, min(ys) - pad),
        min(src.width, max(xs) + pad + 1),
        min(src.height, max(ys) + pad + 1),
    )


def visible_sprite_bbox(frame: Image.Image) -> tuple[int, int, int, int] | None:
    return frame.getchannel("A").getbbox()


def normalize_frame(frame: Image.Image, target_body_size: tuple[int, int]) -> Image.Image:
    body = visible_body_bbox(frame)
    sprite = visible_sprite_bbox(frame)
    if not body or not sprite:
        return frame

    body_left, body_top, body_right, body_bottom = body
    sprite_left, sprite_top, sprite_right, sprite_bottom = sprite
    body_w = max(1, body_right - body_left)
    body_h = max(1, body_bottom - body_top)
    crop = frame.crop(sprite)
    scale_x = target_body_size[0] / body_w
    scale_y = target_body_size[1] / body_h

    def compose(current_scale_x: float, current_scale_y: float) -> Image.Image:
        scaled_size = (
            max(1, round(crop.width * current_scale_x)),
            max(1, round(crop.height * current_scale_y)),
        )
        scaled = crop.resize(scaled_size, Image.Resampling.LANCZOS)
        scaled_body_cx = ((body_left + body_right - 1) / 2 - sprite_left) * current_scale_x
        scaled_body_cy = ((body_top + body_bottom - 1) / 2 - sprite_top) * current_scale_y

        composed = Image.new("RGBA", (builder.FRAME_SIZE, builder.FRAME_SIZE), (0, 0, 0, 0))
        composed.alpha_composite(
            scaled,
            (round(builder.ANCHOR[0] - scaled_body_cx), round(builder.ANCHOR[1] - scaled_body_cy)),
        )
        alpha = composed.getchannel("A")
        composed.putalpha(alpha.point(lambda value: 0 if value < 18 else value))
        return composed

    out = compose(scale_x, scale_y)
    for _ in range(3):
        measured = visible_body_bbox(out)
        if not measured:
            break
        measured_left, measured_top, measured_right, measured_bottom = measured
        measured_w = max(1, measured_right - measured_left)
        measured_h = max(1, measured_bottom - measured_top)
        scale_x *= target_body_size[0] / measured_w
        scale_y *= target_body_size[1] / measured_h
        out = compose(scale_x, scale_y)

    measured = visible_body_bbox(out)
    if not measured:
        return out
    measured_left, measured_top, measured_right, measured_bottom = measured
    measured_cx = (measured_left + measured_right - 1) / 2
    measured_cy = (measured_top + measured_bottom - 1) / 2
    shift_x = round(builder.ANCHOR[0] - measured_cx)
    shift_y = round(builder.ANCHOR[1] - measured_cy)
    if shift_x == 0 and shift_y == 0:
        return out
    shifted = Image.new("RGBA", out.size, (0, 0, 0, 0))
    shifted.alpha_composite(out, (shift_x, shift_y))
    return shifted


def import_frame(path: Path) -> Image.Image:
    src = Image.open(path).convert("RGBA")
    transparent = remove_video_edge_background(src)
    resized = transparent.resize((builder.FRAME_SIZE, builder.FRAME_SIZE), Image.Resampling.LANCZOS)

    protected_bbox = key_sprite_bbox(resized)
    if protected_bbox:
        protected = Image.new("RGBA", resized.size, (0, 0, 0, 0))
        protected.alpha_composite(resized.crop(protected_bbox), protected_bbox[:2])
        resized = protected

    # Remove tiny alpha haze left by video compression/background cleanup,
    # after the white shell has been protected inside the sprite crop.
    alpha = resized.getchannel("A")
    resized.putalpha(alpha.point(lambda value: 0 if value < 20 else value))
    return resized


def median(values: list[int]) -> int:
    if not values:
        return 1
    ordered = sorted(values)
    return ordered[len(ordered) // 2]


def stable_body_size(widths: list[int], heights: list[int]) -> tuple[int, int]:
    if not widths or not heights:
        return 1, 1
    # Use an upper-middle width so small/failed frames are grown to match the
    # stronger frames, while extreme outliers do not set the whole animation.
    ordered_widths = sorted(widths)
    ordered_heights = sorted(heights)
    width_index = min(len(ordered_widths) - 1, round((len(ordered_widths) - 1) * 0.68))
    height_index = min(len(ordered_heights) - 1, round((len(ordered_heights) - 1) * 0.58))
    return ordered_widths[width_index], ordered_heights[height_index]


def normalize_group(frames: list[Image.Image]) -> list[Image.Image]:
    widths: list[int] = []
    heights: list[int] = []
    for frame in frames:
        bbox = visible_body_bbox(frame)
        sprite = visible_sprite_bbox(frame)
        if not bbox or not sprite:
            continue
        left, top, right, bottom = bbox
        width = right - left
        height = bottom - top
        if 12 <= width <= builder.FRAME_SIZE and 12 <= height <= builder.FRAME_SIZE:
            widths.append(width)
            heights.append(height)
    target_body_size = stable_body_size(widths, heights)
    return [normalize_frame(frame, target_body_size) for frame in frames]


def select_frames(paths: list[Path], target_count: int) -> list[Path]:
    if len(paths) <= target_count:
        return paths
    if target_count <= 1:
        return [paths[0]]
    selected = []
    last = len(paths) - 1
    for index in range(target_count):
        selected.append(paths[round(index * last / (target_count - 1))])
    return selected


def write_import_report(groups: dict[str, list[Image.Image]]) -> None:
    report = {
        "schemaVersion": 1,
        "asset": "living-drill-v1",
        "source": "OpenRouter x-ai/grok-imagine-video extracted frames",
        "anchor": builder.ANCHOR,
        "frameSize": [builder.FRAME_SIZE, builder.FRAME_SIZE],
        "method": "Each Grok frame is edge-background-cleaned, cropped to visible pixels, normalized to the median body size, body-centered at 47,47, then exported through .piskel/runtime sheets.",
        "frameSourceOverrides": FRAME_SOURCE_OVERRIDES,
        "rejectedSourceFrames": {key: sorted(value) for key, value in REJECTED_SOURCE_FRAMES.items()},
        "frames": {},
    }
    for animation, frames in groups.items():
        entries = []
        for index, frame in enumerate(frames):
            bbox = alpha_bbox(frame)
            body = visible_body_bbox(frame)
            entries.append({
                "frame": index,
                "alphaBBox": list(bbox) if bbox else None,
                "bodyBBox": list(body) if body else None,
                "anchorPx": {"x": builder.ANCHOR[0], "y": builder.ANCHOR[1]},
            })
        report["frames"][animation] = entries
    (builder.REPORT_DIR / "living-drill-v1-grok-import-drift-report.json").write_text(
        json.dumps(report, indent=2),
        encoding="utf-8",
    )


def update_manifest(groups: dict[str, list[Image.Image]]) -> None:
    manifest_path = ASSET_DIR / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["runtimeSource"] = "grok-imagine-video-imported"
    manifest["frameSourceOverrides"] = FRAME_SOURCE_OVERRIDES
    manifest["rejectedSourceFrames"] = {key: sorted(value) for key, value in REJECTED_SOURCE_FRAMES.items()}
    manifest["budget"]["status"] = "Grok frames imported through anchored .piskel/runtime export"
    manifest["animations"] = {
        animation: {"frames": len(frames), "fps": FPS[animation]}
        for animation, frames in groups.items()
    }
    manifest["reports"] = {
        **manifest.get("reports", {}),
        "grokImportDrift": "sprites/character/living-drill-v1/reports/living-drill-v1-grok-import-drift-report.json",
    }
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def main() -> None:
    groups: dict[str, list[Image.Image]] = {}
    missing = []
    for animation, target_count in FRAME_COUNTS.items():
        source_animation = FRAME_SOURCE_OVERRIDES.get(animation, animation)
        frame_dir = FRAMES_DIR / source_animation
        rejected = REJECTED_SOURCE_FRAMES.get(source_animation, set())
        paths = [path for path in sorted(frame_dir.glob("frame-*.png")) if path.name not in rejected]
        if not paths:
            missing.append(f"{animation} from {source_animation}")
            continue
        imported_frames = [import_frame(path) for path in select_frames(paths, target_count)]
        groups[animation] = normalize_group(imported_frames)

    if missing:
        raise RuntimeError(f"Missing extracted Grok frames for: {', '.join(missing)}")

    builder.make_sheet("living-drill-idle-sheet.png", groups["idle"])
    builder.make_sheet("living-drill-dig-sheet.png", groups["dig"])
    builder.make_sheet("living-drill-fly-sheet.png", groups["fly"])
    builder.make_piskel("Living Drill V1 Idle Grok Import", "living-drill-idle", groups["idle"], FPS["idle"])
    builder.make_piskel("Living Drill V1 Dig Grok Import", "living-drill-dig", groups["dig"], FPS["dig"])
    builder.make_piskel("Living Drill V1 Fly Grok Import", "living-drill-fly", groups["fly"], FPS["fly"])
    builder.write_contact_sheet(groups)
    write_import_report(groups)
    update_manifest(groups)
    print("Imported Grok frames into living-drill-v1 runtime and .piskel assets.")


if __name__ == "__main__":
    main()
