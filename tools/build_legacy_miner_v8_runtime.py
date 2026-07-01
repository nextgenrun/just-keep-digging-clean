from __future__ import annotations

import json
import math
import base64
import io
from collections import Counter, deque
from pathlib import Path

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
CHAR = ROOT / "sprites" / "character" / "character-v8"
RUNTIME = CHAR / "runtime"
PREVIEWS = CHAR / "previews"
REPORTS = CHAR / "reports"
PISKEL = CHAR / "piskel"
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
        "source": frame_source("frames", "dig-down"),
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
    "combat-idle-recover": {
        "source": frame_source("frames", "combat-idle-recover"),
        "output": "combat-idle-recover-sheet.webp",
        "fps": 8,
        "anchor": True,
    },
    "combat-idle-to-normal-idle": {
        "source": frame_source("manual-blend", "combat-idle-to-normal-idle", "frames"),
        "output": "combat-idle-to-normal-idle-sheet.webp",
        "fps": 14,
        "anchor": True,
    },
    "leans-against-wall": {
        "source": frame_source("frames", "leans-against-wall"),
        "output": "leans-against-wall-sheet.webp",
        "fps": 8,
        "anchor": True,
    },
    "falling-downward-through-sky": {
        "source": frame_source("frames", "falling-downward-through-sky"),
        "output": "falling-downward-through-sky-sheet.webp",
        "fps": 12,
        "anchor": True,
    },
    "walk-run": {
        "source": frame_source("frames", "walk-run"),
        "output": "walk-run-sheet.webp",
        "fps": 16,
        "anchor": True,
    },
    "wall-push": {
        "source": frame_source("frames", "wall-push"),
        "output": "wall-push-sheet.webp",
        "fps": 8,
        "anchor": True,
    },
    "quickslash": {
        "source": frame_source("frames", "quickslash"),
        "output": "legacy-quickslash-clean-sheet.webp",
        "fps": 12,
        "anchor": True,
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


def frame_paths(source: Path) -> list[Path]:
    return sorted(
        [p for p in source.iterdir() if p.suffix.lower() in {".png", ".webp"}],
        key=lambda p: p.name.lower(),
    )


def load_frame(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    if image.size == FRAME_SIZE:
        return image
    canvas = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    x = (FRAME_SIZE[0] - image.width) // 2
    y = FRAME_SIZE[1] - image.height
    canvas.alpha_composite(image, (x, y))
    return canvas


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
        small = frame.resize(thumb, Image.Resampling.NEAREST)
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


def build_anim(name: str, cfg: dict) -> dict:
    paths = frame_paths(cfg["source"])
    if not paths:
        raise FileNotFoundError(f"No frames found for {name}: {cfg['source']}")

    loaded = [load_frame(path) for path in paths]
    before_metrics = [frame_metrics(frame) for frame in loaded]
    cleaned = []
    removed_total = 0
    for frame in loaded:
        cleaned_frame, removed = cleanup_border_halo(frame)
        cleaned.append(cleaned_frame)
        removed_total += removed

    if cfg.get("anchor", True):
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
    cleaned_dir = RUNTIME / f"{name}-cleaned-frames"
    cleaned_dir.mkdir(parents=True, exist_ok=True)
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
        "frameWidth": FRAME_SIZE[0],
        "frameHeight": FRAME_SIZE[1],
        "frameCount": len(processed),
        "columns": columns,
        "rows": rows,
        "fps": cfg["fps"],
        "borderHaloPixelsRemoved": removed_total,
        "alphaPixelsChanged": alpha_changed,
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


def main() -> None:
    manifest = {
        "frameWidth": FRAME_SIZE[0],
        "frameHeight": FRAME_SIZE[1],
        "cleanupPolicy": "Border-connected dominant-background flood fill plus median center/bottom anchoring. Interior character pixels are not keyed out by color.",
        "animations": [],
    }
    for name, cfg in ANIMS.items():
        manifest["animations"].append(build_anim(name, cfg))
    RUNTIME.mkdir(parents=True, exist_ok=True)
    (RUNTIME / "legacy-miner-v8-runtime-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    write_audit(manifest)
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
