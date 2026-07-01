from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image

import build_pickaxe_miner_v1_assets as builder


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "sprites" / "character" / "pickaxe-miner-v1"
LAB_DIR = ASSET_DIR / "openrouter-lab" / "eur050-grok-imagen"
FRAMES_DIR = LAB_DIR / "extracted-frames"

TARGET_COUNTS = {"idle": 6, "walk": 8, "dig": 8}
FPS = {"idle": 6, "walk": 10, "dig": 12}


def alpha_bbox(frame: Image.Image) -> tuple[int, int, int, int] | None:
    return frame.getchannel("A").getbbox()


def is_video_background_pixel(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a < 10:
        return True
    spread = max(r, g, b) - min(r, g, b)
    luminance = (r + g + b) / 3
    return spread <= 26 and luminance >= 226


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


def body_bbox(frame: Image.Image) -> tuple[int, int, int, int] | None:
    src = frame.convert("RGBA")
    pixels = src.load()
    xs: list[int] = []
    ys: list[int] = []
    for y in range(src.height):
        for x in range(src.width):
            r, g, b, a = pixels[x, y]
            if a < 20:
                continue
            # Ignore tiny yellow/white strike sparks when measuring the miner.
            if r > 210 and g > 170 and b < 90:
                continue
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
            if luminance < 210 or spread > 24:
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    pad = 4
    return max(0, min(xs) - pad), max(0, min(ys) - pad), min(src.width, max(xs) + pad + 1), min(src.height, max(ys) + pad + 1)


def import_frame(path: Path) -> Image.Image:
    src = Image.open(path).convert("RGBA")
    transparent = remove_video_edge_background(src)
    resized = transparent.resize((builder.FRAME_SIZE, builder.FRAME_SIZE), Image.Resampling.LANCZOS)
    protected_bbox = key_sprite_bbox(resized)
    if protected_bbox:
        protected = Image.new("RGBA", resized.size, (0, 0, 0, 0))
        protected.alpha_composite(resized.crop(protected_bbox), protected_bbox[:2])
        resized = protected
    alpha = resized.getchannel("A")
    resized.putalpha(alpha.point(lambda value: 0 if value < 20 else value))
    return resized


def metrics(frame: Image.Image) -> dict[str, float] | None:
    bbox = body_bbox(frame)
    if not bbox:
        return None
    left, top, right, bottom = bbox
    return {
        "left": left,
        "top": top,
        "right": right,
        "bottom": bottom,
        "width": right - left,
        "height": bottom - top,
        "centerX": (left + right - 1) / 2,
        "centerY": (top + bottom - 1) / 2,
    }


def median(values: list[float]) -> float:
    ordered = sorted(values)
    return ordered[len(ordered) // 2] if ordered else 0


def score_frames(candidates: list[tuple[Path, Image.Image, dict[str, float]]]) -> list[tuple[float, Path, Image.Image, dict[str, float]]]:
    target = {
        "width": median([m["width"] for _, _, m in candidates]),
        "height": median([m["height"] for _, _, m in candidates]),
        "centerX": median([m["centerX"] for _, _, m in candidates]),
        "centerY": median([m["centerY"] for _, _, m in candidates]),
    }
    scored = []
    for path, frame, m in candidates:
        score = (
            abs(m["width"] - target["width"]) * 2.2
            + abs(m["height"] - target["height"]) * 2.2
            + abs(m["centerX"] - target["centerX"]) * 3.0
            + abs(m["centerY"] - target["centerY"]) * 3.0
        )
        scored.append((score, path, frame, m))
    return sorted(scored, key=lambda item: (item[0], item[1].name))


def stable_size(frames: list[Image.Image]) -> tuple[int, int]:
    widths: list[int] = []
    heights: list[int] = []
    for frame in frames:
        bbox = body_bbox(frame)
        if not bbox:
            continue
        left, top, right, bottom = bbox
        widths.append(right - left)
        heights.append(bottom - top)
    return round(median(widths)), round(median(heights))


def normalize_frame(frame: Image.Image, target_size: tuple[int, int]) -> Image.Image:
    bbox = body_bbox(frame)
    sprite = alpha_bbox(frame)
    if not bbox or not sprite:
        return frame
    body_left, body_top, body_right, body_bottom = bbox
    sprite_left, sprite_top, _, _ = sprite
    body_w = max(1, body_right - body_left)
    body_h = max(1, body_bottom - body_top)
    scale_x = target_size[0] / body_w
    scale_y = target_size[1] / body_h
    crop = frame.crop(sprite)
    scaled = crop.resize((max(1, round(crop.width * scale_x)), max(1, round(crop.height * scale_y))), Image.Resampling.LANCZOS)
    body_cx = ((body_left + body_right - 1) / 2 - sprite_left) * scale_x
    body_cy = ((body_top + body_bottom - 1) / 2 - sprite_top) * scale_y
    out = Image.new("RGBA", (builder.FRAME_SIZE, builder.FRAME_SIZE), (0, 0, 0, 0))
    out.alpha_composite(scaled, (round(builder.ANCHOR[0] - body_cx), round(builder.ANCHOR[1] - body_cy)))
    measured = body_bbox(out)
    if measured:
        left, top, right, bottom = measured
        shift_x = round(builder.ANCHOR[0] - ((left + right - 1) / 2))
        shift_y = round(builder.ANCHOR[1] - ((top + bottom - 1) / 2))
        shifted = Image.new("RGBA", out.size, (0, 0, 0, 0))
        shifted.alpha_composite(out, (shift_x, shift_y))
        out = shifted
    return out


def pick_frames(animation: str) -> tuple[list[Image.Image], list[dict]]:
    candidates = []
    for path in sorted((FRAMES_DIR / animation).glob("frame-*.png")):
        frame = import_frame(path)
        m = metrics(frame)
        if m:
            candidates.append((path, frame, m))
    if not candidates:
        raise RuntimeError(f"Missing extracted frames for {animation}")
    scored = score_frames(candidates)
    count = TARGET_COUNTS[animation]
    stable_pool = sorted(scored[: max(count, round(len(scored) * 0.62))], key=lambda item: item[1].name)
    last = len(stable_pool) - 1
    picked = []
    used: set[Path] = set()
    for index in range(count):
        score, path, frame, m = stable_pool[round(index * last / max(1, count - 1))]
        if path in used:
            continue
        picked.append((score, path, frame, m))
        used.add(path)
    for score, path, frame, m in scored:
        if len(picked) >= count:
            break
        if path not in used:
            picked.append((score, path, frame, m))
            used.add(path)
    picked = sorted(picked, key=lambda item: item[1].name)
    raw_frames = [frame for _, _, frame, _ in picked]
    target_size = stable_size(raw_frames)
    frames = [normalize_frame(frame, target_size) for frame in raw_frames]
    report = [
        {
            "sourceFrame": path.name,
            "sourcePath": str(path.relative_to(ROOT)).replace("\\", "/"),
            "score": round(score, 3),
            "sourceBody": m,
        }
        for score, path, _, m in picked
    ]
    return frames, report


def write_report(groups: dict[str, list[Image.Image]], selected: dict[str, list[dict]]) -> None:
    report = {
        "schemaVersion": 1,
        "asset": "pickaxe-miner-v1",
        "source": "OpenRouter x-ai/grok-imagine-video extracted frames",
        "budgetLimit": "EUR 0.50",
        "anchor": builder.ANCHOR,
        "frameSize": [builder.FRAME_SIZE, builder.FRAME_SIZE],
        "selected": selected,
        "exported": {},
    }
    for animation, frames in groups.items():
        report["exported"][animation] = []
        for index, frame in enumerate(frames):
            report["exported"][animation].append({
                "frame": index,
                "alphaBBox": list(alpha_bbox(frame)) if alpha_bbox(frame) else None,
                "bodyBBox": list(body_bbox(frame)) if body_bbox(frame) else None,
            })
    (builder.REPORT_DIR / "pickaxe-miner-v1-grok-selection-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")


def update_manifest(groups: dict[str, list[Image.Image]]) -> None:
    manifest_path = ASSET_DIR / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["runtimeSource"] = "grok-imagine-video-eur050-filtered"
    manifest["animations"] = {animation: {"frames": len(frames), "fps": FPS[animation]} for animation, frames in groups.items()}
    manifest["budget"]["status"] = "Grok frames imported through anchored .piskel/runtime export"
    manifest["reports"] = {"selection": "sprites/character/pickaxe-miner-v1/reports/pickaxe-miner-v1-grok-selection-report.json"}
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def main() -> None:
    groups: dict[str, list[Image.Image]] = {}
    selected: dict[str, list[dict]] = {}
    for animation in ("idle", "walk", "dig"):
        frames, report = pick_frames(animation)
        groups[animation] = frames
        selected[animation] = report
    builder.make_sheet("pickaxe-miner-idle-sheet.png", groups["idle"])
    builder.make_sheet("pickaxe-miner-walk-sheet.png", groups["walk"])
    builder.make_sheet("pickaxe-miner-dig-sheet.png", groups["dig"])
    builder.make_piskel("Pickaxe Miner V1 Idle Grok Import", "pickaxe-miner-idle", groups["idle"], FPS["idle"])
    builder.make_piskel("Pickaxe Miner V1 Walk Grok Import", "pickaxe-miner-walk", groups["walk"], FPS["walk"])
    builder.make_piskel("Pickaxe Miner V1 Dig Grok Import", "pickaxe-miner-dig", groups["dig"], FPS["dig"])
    builder.write_contact_sheet(groups)
    write_report(groups, selected)
    update_manifest(groups)
    print("Imported Grok frames into pickaxe-miner-v1 runtime and .piskel assets.")


if __name__ == "__main__":
    main()
