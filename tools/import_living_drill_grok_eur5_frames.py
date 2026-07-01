from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image

import build_living_drill_v1_assets as builder
import import_living_drill_grok_frames as eur1_import


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "sprites" / "character" / "living-drill-v1"
LAB_DIR = ASSET_DIR / "openrouter-lab" / "eur5-grok-imagen"
FRAMES_DIR = LAB_DIR / "extracted-frames"

SOURCES = {
    "idle": "idle-hover",
    "fly": "fly-hover",
    "dig": "dig-bite-loop",
    "dig_recoil": "dig-contact-break-recoil",
}

TARGET_COUNTS = {
    "idle": 8,
    "fly": 8,
    "dig": 10,
    "dig_recoil": 8,
}

FPS = {
    "idle": 7,
    "fly": 9,
    "dig": 14,
    "dig_recoil": 12,
}


def body_metrics(frame: Image.Image) -> dict[str, float] | None:
    bbox = eur1_import.visible_body_bbox(frame)
    if not bbox:
        return None
    left, top, right, bottom = bbox
    width = right - left
    height = bottom - top
    return {
        "left": left,
        "top": top,
        "right": right,
        "bottom": bottom,
        "width": width,
        "height": height,
        "centerX": (left + right - 1) / 2,
        "centerY": (top + bottom - 1) / 2,
    }


def median(values: list[float]) -> float:
    if not values:
        return 0
    ordered = sorted(values)
    return ordered[len(ordered) // 2]


def source_candidates(source: str) -> list[tuple[Path, Image.Image, dict[str, float]]]:
    out = []
    for path in sorted((FRAMES_DIR / source).glob("frame-*.png")):
        frame = eur1_import.import_frame(path)
        if source.startswith("dig-"):
            frame = strip_embedded_tile(frame)
        frame = lock_grayscale_palette(frame)
        metrics = body_metrics(frame)
        if not metrics:
            continue
        out.append((path, frame, metrics))
    return out


def strip_embedded_tile(frame: Image.Image) -> Image.Image:
    out = frame.convert("RGBA")
    pixels = out.load()
    for y in range(out.height):
        for x in range(out.width):
            if x <= 76:
                continue
            r, g, b, a = pixels[x, y]
            if a < 20:
                continue
            spread = max(r, g, b) - min(r, g, b)
            is_colored_effect = spread > 55 and (r > 135 or g > 120 or b > 135)
            if not is_colored_effect:
                pixels[x, y] = (255, 255, 255, 0)
    drop_detached_grayscale_components(out)
    return out


def lock_grayscale_palette(frame: Image.Image) -> Image.Image:
    out = frame.convert("RGBA")
    pixels = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = pixels[x, y]
            if a < 20:
                continue
            if builder.is_blue_effect_pixel((r, g, b, a)):
                continue
            spread = max(r, g, b) - min(r, g, b)
            if spread <= 18:
                continue
            value = round(r * 0.299 + g * 0.587 + b * 0.114)
            pixels[x, y] = (value, value, value, a)
    return out


def drop_detached_grayscale_components(frame: Image.Image) -> None:
    pixels = frame.load()
    seen: set[tuple[int, int]] = set()
    for start_y in range(frame.height):
        for start_x in range(frame.width):
            if (start_x, start_y) in seen or pixels[start_x, start_y][3] < 20:
                continue
            queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
            component: list[tuple[int, int]] = []
            seen.add((start_x, start_y))
            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if nx < 0 or ny < 0 or nx >= frame.width or ny >= frame.height:
                        continue
                    if (nx, ny) in seen or pixels[nx, ny][3] < 20:
                        continue
                    seen.add((nx, ny))
                    queue.append((nx, ny))

            xs = [x for x, _ in component]
            ys = [y for _, y in component]
            left = min(xs)
            right = max(xs) + 1
            top = min(ys)
            bottom = max(ys) + 1
            touches_body_zone = left <= 58 and right >= 34 and top <= 66 and bottom >= 28
            colored_pixels = 0
            for x, y in component:
                r, g, b, _ = pixels[x, y]
                if max(r, g, b) - min(r, g, b) > 55:
                    colored_pixels += 1
            colored_ratio = colored_pixels / max(1, len(component))
            if touches_body_zone or colored_ratio >= 0.16:
                continue
            for x, y in component:
                pixels[x, y] = (255, 255, 255, 0)


def score_candidates(candidates: list[tuple[Path, Image.Image, dict[str, float]]]) -> list[tuple[float, Path, Image.Image, dict[str, float]]]:
    widths = [metrics["width"] for _, _, metrics in candidates]
    heights = [metrics["height"] for _, _, metrics in candidates]
    centers_x = [metrics["centerX"] for _, _, metrics in candidates]
    centers_y = [metrics["centerY"] for _, _, metrics in candidates]
    target = {
        "width": median(widths),
        "height": median(heights),
        "centerX": median(centers_x),
        "centerY": median(centers_y),
    }
    scored = []
    for path, frame, metrics in candidates:
        score = (
            abs(metrics["width"] - target["width"]) * 2.4
            + abs(metrics["height"] - target["height"]) * 2.0
            + abs(metrics["centerX"] - target["centerX"]) * 3.0
            + abs(metrics["centerY"] - target["centerY"]) * 3.0
        )
        scored.append((score, path, frame, metrics))
    return sorted(scored, key=lambda item: (item[0], item[1].name))


def evenly_pick(scored: list[tuple[float, Path, Image.Image, dict[str, float]]], count: int) -> list[tuple[Path, Image.Image, dict[str, float], float]]:
    if len(scored) <= count:
        return [(path, frame, metrics, score) for score, path, frame, metrics in scored]

    # Keep only the more stable half-plus of the video, then sample across time
    # so loops still have motion instead of eight nearly identical frames.
    stable_pool = sorted(scored[: max(count, round(len(scored) * 0.62))], key=lambda item: item[1].name)
    last = len(stable_pool) - 1
    picked = []
    used: set[Path] = set()
    for index in range(count):
        _, path, frame, metrics = stable_pool[round(index * last / max(1, count - 1))]
        if path in used:
            continue
        score = next(item[0] for item in scored if item[1] == path)
        picked.append((path, frame, metrics, score))
        used.add(path)

    if len(picked) < count:
        for score, path, frame, metrics in scored:
            if path not in used:
                picked.append((path, frame, metrics, score))
                used.add(path)
            if len(picked) == count:
                break
    return sorted(picked, key=lambda item: item[0].name)


def normalize_selected(selected: list[tuple[Path, Image.Image, dict[str, float], float]]) -> list[Image.Image]:
    frames = [frame for _, frame, _, _ in selected]
    return eur1_import.normalize_group(frames)


def write_selection_report(groups: dict[str, list[Image.Image]], selections: dict[str, list[tuple[Path, Image.Image, dict[str, float], float]]]) -> None:
    report = {
        "schemaVersion": 1,
        "asset": "living-drill-v1",
        "sourceLab": "eur5-grok-imagen",
        "anchor": builder.ANCHOR,
        "frameSize": [builder.FRAME_SIZE, builder.FRAME_SIZE],
        "selectionMethod": "Score generated frames by source body box size and anchor stability, keep stable candidates, normalize through .piskel export.",
        "sources": SOURCES,
        "selected": {},
        "exportedFrames": {},
    }
    for animation, selected in selections.items():
        report["selected"][animation] = [
            {
                "sourceFrame": path.name,
                "sourcePath": str(path.relative_to(ROOT)).replace("\\", "/"),
                "score": round(score, 3),
                "sourceBody": metrics,
            }
            for path, _, metrics, score in selected
        ]
    for animation, frames in groups.items():
        report["exportedFrames"][animation] = []
        for index, frame in enumerate(frames):
            bbox = eur1_import.alpha_bbox(frame)
            body = eur1_import.visible_body_bbox(frame)
            report["exportedFrames"][animation].append({
                "frame": index,
                "alphaBBox": list(bbox) if bbox else None,
                "bodyBBox": list(body) if body else None,
                "anchorPx": {"x": builder.ANCHOR[0], "y": builder.ANCHOR[1]},
            })
    (builder.REPORT_DIR / "living-drill-v1-eur5-selection-report.json").write_text(
        json.dumps(report, indent=2),
        encoding="utf-8",
    )


def update_manifest(groups: dict[str, list[Image.Image]]) -> None:
    manifest_path = ASSET_DIR / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["runtimeSource"] = "grok-imagine-video-eur5-filtered"
    manifest["frameSourceOverrides"] = {}
    manifest["animations"] = {
        animation: {"frames": len(frames), "fps": FPS[animation]}
        for animation, frames in groups.items()
    }
    manifest["reports"] = {
        **manifest.get("reports", {}),
        "eur5Selection": "sprites/character/living-drill-v1/reports/living-drill-v1-eur5-selection-report.json",
    }
    manifest["budget"]["status"] = "EUR5 Grok frames filtered through anchored .piskel/runtime export"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def main() -> None:
    groups: dict[str, list[Image.Image]] = {}
    selections: dict[str, list[tuple[Path, Image.Image, dict[str, float], float]]] = {}
    for animation, source in SOURCES.items():
        candidates = source_candidates(source)
        if not candidates:
            raise RuntimeError(f"Missing eur5 generated frames for {animation} from {source}")
        selected = evenly_pick(score_candidates(candidates), TARGET_COUNTS[animation])
        selections[animation] = selected
        groups[animation] = normalize_selected(selected)

    builder.make_sheet("living-drill-idle-sheet.png", groups["idle"])
    builder.make_sheet("living-drill-fly-sheet.png", groups["fly"])
    builder.make_sheet("living-drill-dig-sheet.png", groups["dig"])
    builder.make_sheet("living-drill-dig-recoil-sheet.png", groups["dig_recoil"])
    builder.make_piskel("Living Drill V1 Idle EUR5 Filtered", "living-drill-idle", groups["idle"], FPS["idle"])
    builder.make_piskel("Living Drill V1 Fly EUR5 Filtered", "living-drill-fly", groups["fly"], FPS["fly"])
    builder.make_piskel("Living Drill V1 Dig EUR5 Filtered", "living-drill-dig", groups["dig"], FPS["dig"])
    builder.make_piskel("Living Drill V1 Dig Recoil EUR5 Filtered", "living-drill-dig-recoil", groups["dig_recoil"], FPS["dig_recoil"])
    builder.write_contact_sheet(groups)
    write_selection_report(groups, selections)
    update_manifest(groups)
    print("Imported EUR5 Grok frames into living-drill-v1 runtime and .piskel assets.")


if __name__ == "__main__":
    main()
