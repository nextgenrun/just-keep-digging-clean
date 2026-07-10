from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
HELPER_PATH = ROOT / "ai-tools" / "2026-07-03-v7-30-detail-processing.py"
SOURCE_MANIFEST = ROOT / "exports" / "ai-enhanced" / "v7-30-runtime-preview" / "prop-current-comparison" / "2026-07-03-v7-30-current-vs-enhanced-props-manifest.json"
OUT_DIR = ROOT / "exports" / "ai-enhanced" / "v7-30-runtime-preview" / "current-prop-faithful-cleanup"
ENHANCED_DIR = OUT_DIR / "enhanced"
CONTACT_DIR = OUT_DIR / "contact-sheets"
MANIFEST_PATH = OUT_DIR / "2026-07-03-current-prop-faithful-cleanup-manifest.json"
REPORT_PATH = ROOT / "markdown" / "audit" / "2026-07-03-current-prop-faithful-cleanup.md"

SPEC = importlib.util.spec_from_file_location("v7_30_detail_processing", HELPER_PATH)
processing = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(processing)

TILE_W = 420
TILE_H = 300
HEADER_H = 54
PAD = 16

def prepare_dirs() -> None:
    processing.write_readme(
        OUT_DIR,
        "Current Prop Faithful Cleanup",
        "Preview-only upscale and matte cleanup generated from the exact current gametime prop files.",
    )
    processing.write_readme(ENHANCED_DIR, "Enhanced", "Faithful high-resolution prop candidates.")
    processing.write_readme(CONTACT_DIR, "Contact Sheets", "Side-by-side current versus faithful cleanup previews.")

def target_size(size: tuple[int, int]) -> tuple[int, int]:
    width, height = size
    max_dim = max(width, height)
    factor = 8 if max_dim <= 420 else 6 if max_dim <= 700 else 4
    scale = min(float(factor), 3072.0 / float(max_dim))
    return max(1, round(width * scale)), max(1, round(height * scale))

def clean_matte(rgba: np.ndarray) -> np.ndarray:
    rgb = rgba[:, :, :3].astype(np.float32)
    alpha = rgba[:, :, 3].copy()
    if not np.any(alpha > 0) or not np.any(alpha < 250):
        return rgba.copy()

    x0, y0, x1, y1 = alpha_bbox(alpha, 20)
    crop_rgb = rgb[y0:y1, x0:x1].copy()
    crop_alpha = alpha[y0:y1, x0:x1].copy()
    if np.count_nonzero(crop_alpha > 185) >= 24:
        mask = (crop_alpha < 252).astype(np.uint8) * 255
        fill = cv2.inpaint(np.clip(crop_rgb, 0, 255).astype(np.uint8), mask, 3, cv2.INPAINT_TELEA).astype(np.float32)
        edge = (crop_alpha > 0) & (crop_alpha < 245)
        weight = np.power(np.clip(1.0 - crop_alpha.astype(np.float32) / 255.0, 0.0, 1.0), 0.62)
        crop_rgb = crop_rgb * (1.0 - weight[:, :, None]) + fill * weight[:, :, None]

        green = crop_rgb[:, :, 1] - np.maximum(crop_rgb[:, :, 0], crop_rgb[:, :, 2])
        green_leak = edge & (crop_alpha < 178) & (green > 7.0)
        green_cap = np.maximum(crop_rgb[:, :, 0], crop_rgb[:, :, 2]) + 4.0
        crop_rgb[:, :, 1] = np.where(green_leak, np.minimum(crop_rgb[:, :, 1], green_cap), crop_rgb[:, :, 1])

        dark_edge = edge & (crop_alpha < 165) & ((luma(crop_rgb) < 20.0) | (luma(crop_rgb) < luma(fill) - 16.0))
        crop_rgb[dark_edge] = crop_rgb[dark_edge] * 0.25 + fill[dark_edge] * 0.75
        crop_alpha[dark_edge] = np.clip(crop_alpha[dark_edge].astype(np.float32) * 0.68, 0, 255).astype(np.uint8)

    crop_alpha = crisp_alpha(crop_alpha)
    out = rgba.copy()
    out[y0:y1, x0:x1, :3] = np.clip(crop_rgb, 0, 255).astype(np.uint8)
    out[y0:y1, x0:x1, 3] = crop_alpha
    out[:, :, :3] = np.where(out[:, :, 3:4] > 0, out[:, :, :3], 0)
    return out

def faithful_detail(rgba: np.ndarray) -> np.ndarray:
    rgba = clean_matte(rgba)
    rgb = rgba[:, :, :3].astype(np.float32)
    alpha = rgba[:, :, 3].astype(np.float32) / 255.0
    base = np.clip(rgb, 0, 255).astype(np.uint8)
    smooth = cv2.bilateralFilter(base, d=5, sigmaColor=24, sigmaSpace=4).astype(np.float32)
    rgb = rgb * 0.58 + smooth * 0.42
    lab = cv2.cvtColor(np.clip(rgb, 0, 255).astype(np.uint8), cv2.COLOR_RGB2LAB)
    lab[:, :, 0] = cv2.createCLAHE(clipLimit=1.18, tileGridSize=(8, 8)).apply(lab[:, :, 0])
    rgb = rgb * 0.72 + cv2.cvtColor(lab, cv2.COLOR_LAB2RGB).astype(np.float32) * 0.28
    rgb = rgb + (rgb - cv2.GaussianBlur(rgb, (0, 0), sigmaX=0.82)) * 0.46
    rgb = rgb + (rgb - cv2.GaussianBlur(rgb, (0, 0), sigmaX=0.38)) * 0.14
    rgb = np.where((alpha > 0.001)[:, :, None], rgb, 0)
    return clean_matte(np.clip(np.dstack([rgb, rgba[:, :, 3]]), 0, 255).astype(np.uint8))

def alpha_bbox(alpha: np.ndarray, margin: int) -> tuple[int, int, int, int]:
    ys, xs = np.where(alpha > 0)
    if len(xs) == 0:
        return 0, 0, alpha.shape[1], alpha.shape[0]
    return (
        max(0, int(xs.min()) - margin),
        max(0, int(ys.min()) - margin),
        min(alpha.shape[1], int(xs.max()) + margin + 1),
        min(alpha.shape[0], int(ys.max()) + margin + 1),
    )

def crisp_alpha(alpha: np.ndarray) -> np.ndarray:
    a = alpha.astype(np.float32) / 255.0
    a = np.where(a < 0.025, 0.0, a)
    a = np.clip((a - 0.022) / 0.955, 0.0, 1.0)
    return np.clip((a * a * (3.0 - 2.0 * a)) * 255.0, 0, 255).astype(np.uint8)

def luma(rgb: np.ndarray) -> np.ndarray:
    return rgb[:, :, 0] * 0.2126 + rgb[:, :, 1] * 0.7152 + rgb[:, :, 2] * 0.0722

def detail_crop_box(img: Image.Image) -> tuple[int, int, int, int]:
    rgba = np.asarray(img.convert("RGBA"))
    alpha = rgba[:, :, 3]
    x0, y0, x1, y1 = alpha_bbox(alpha, 0)
    bbox_w = max(1, x1 - x0)
    bbox_h = max(1, y1 - y0)
    crop_w = min(img.width, max(82, int(bbox_w * 0.46)))
    crop_h = min(img.height, max(82, int(bbox_h * 0.46)))
    gray = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2GRAY).astype(np.float32)
    edge = np.abs(cv2.Laplacian(gray, cv2.CV_32F, ksize=3))
    score = edge * (alpha > 24) + (alpha.astype(np.float32) / 255.0) * 8.0
    score = cv2.GaussianBlur(score, (0, 0), sigmaX=max(3.0, min(img.size) * 0.025))
    region = score[y0:y1, x0:x1]
    if region.size == 0:
        cx, cy = img.width // 2, img.height // 2
    else:
        iy, ix = np.unravel_index(int(np.argmax(region)), region.shape)
        cx, cy = x0 + int(ix), y0 + int(iy)
    left = max(0, min(img.width - crop_w, cx - crop_w // 2))
    top = max(0, min(img.height - crop_h, cy - crop_h // 2))
    return left, top, left + crop_w, top + crop_h

def scaled_crop(img: Image.Image, source_box: tuple[int, int, int, int], source_size: tuple[int, int]) -> Image.Image:
    sx = img.width / source_size[0]
    sy = img.height / source_size[1]
    box = (
        round(source_box[0] * sx),
        round(source_box[1] * sy),
        round(source_box[2] * sx),
        round(source_box[3] * sy),
    )
    return img.crop(box)

def checker(size: tuple[int, int], cell: int = 18) -> Image.Image:
    w, h = size
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    a = np.array((24, 24, 27), dtype=np.uint8)
    b = np.array((74, 74, 78), dtype=np.uint8)
    yy, xx = np.indices((h, w))
    arr[((xx // cell + yy // cell) % 2) == 0] = a
    arr[((xx // cell + yy // cell) % 2) == 1] = b
    return Image.fromarray(arr, "RGB")

def tile(img: Image.Image, label: str, background: str, resample: Image.Resampling) -> Image.Image:
    canvas = Image.new("RGB", (TILE_W, TILE_H), (0, 0, 0)) if background == "black" else checker((TILE_W, TILE_H))
    canvas = canvas.convert("RGBA")
    work = img.convert("RGBA")
    max_w, max_h = TILE_W - 24, TILE_H - 48
    scale = min(max_w / work.width, max_h / work.height)
    new_size = max(1, round(work.width * scale)), max(1, round(work.height * scale))
    work = work.resize(new_size, resample)
    canvas.alpha_composite(work, ((TILE_W - work.width) // 2, 36 + (max_h - work.height) // 2))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, TILE_W, 30), fill=(7, 8, 10, 230))
    draw.text((10, 9), label, fill=(238, 240, 244), font=processing.font(13))
    return canvas.convert("RGB")

def build_sheet(rows: list[dict], output_path: Path) -> None:
    width = PAD + 4 * TILE_W + 3 * PAD + PAD
    row_h = TILE_H + HEADER_H + PAD
    sheet = Image.new("RGB", (width, PAD + len(rows) * row_h + PAD), (12, 13, 16))
    draw = ImageDraw.Draw(sheet)
    y = PAD
    for row in rows:
        draw.text((PAD, y), row["title"], fill=(250, 250, 250), font=processing.font(17))
        draw.text((PAD, y + 24), row["subtitle"], fill=(172, 178, 188), font=processing.font(12))
        x = PAD
        for item in row["tiles"]:
            sheet.paste(item, (x, y + HEADER_H))
            x += TILE_W + PAD
        y += row_h
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path, quality=93)

def make_sample(row: dict) -> tuple[dict, dict, dict]:
    sample_id = row["id"]
    current_path = ROOT / row["currentGametimePath"]
    current = Image.open(current_path).convert("RGBA")
    cleaned_source = clean_matte(np.asarray(current))
    upscaled = processing.alpha_safe_resize(processing.image_from_array(cleaned_source), target_size(current.size))
    enhanced = faithful_detail(upscaled)
    enhanced_img = processing.image_from_array(enhanced)
    enhanced_path = ENHANCED_DIR / f"{sample_id}-faithful-cleanup.png"
    enhanced_img.save(enhanced_path)

    current_metrics = processing.halo_metrics(np.asarray(current))
    enhanced_metrics = processing.halo_metrics(enhanced)
    result = {
        "id": sample_id,
        "currentGametimePath": row["currentGametimePath"],
        "faithfulCleanupPath": enhanced_path.relative_to(ROOT).as_posix(),
        "currentSize": list(current.size),
        "faithfulCleanupSize": list(enhanced_img.size),
        "currentGreenEdge": round(current_metrics["greenEdge"], 3),
        "faithfulGreenEdge": round(enhanced_metrics["greenEdge"], 3),
        "currentDarkEdge": round(current_metrics["darkEdge"], 3),
        "faithfulDarkEdge": round(enhanced_metrics["darkEdge"], 3),
    }
    return result, full_row(result, current, enhanced_img), zoom_row(result, current, enhanced_img)

def full_row(result: dict, current: Image.Image, enhanced: Image.Image) -> dict:
    subtitle = f"same current source | {current.width}x{current.height} -> {enhanced.width}x{enhanced.height}"
    return {
        "title": result["id"],
        "subtitle": subtitle,
        "tiles": [
            tile(current, "current game / black", "black", Image.Resampling.LANCZOS),
            tile(enhanced, "cleanup upscale / black", "black", Image.Resampling.LANCZOS),
            tile(current, "current game / checker", "checker", Image.Resampling.LANCZOS),
            tile(enhanced, "cleanup upscale / checker", "checker", Image.Resampling.LANCZOS),
        ],
    }

def zoom_row(result: dict, current: Image.Image, enhanced: Image.Image) -> dict:
    crop = detail_crop_box(current)
    current_crop = current.crop(crop)
    enhanced_crop = scaled_crop(enhanced, crop, current.size)
    subtitle = f"same crop | green edge {result['currentGreenEdge']}->{result['faithfulGreenEdge']} | dark edge {result['currentDarkEdge']}->{result['faithfulDarkEdge']}"
    return {
        "title": result["id"],
        "subtitle": subtitle,
        "tiles": [
            tile(current_crop, "current zoom / black", "black", Image.Resampling.NEAREST),
            tile(enhanced_crop, "cleanup zoom / black", "black", Image.Resampling.LANCZOS),
            tile(current_crop, "current zoom / checker", "checker", Image.Resampling.NEAREST),
            tile(enhanced_crop, "cleanup zoom / checker", "checker", Image.Resampling.LANCZOS),
        ],
    }

def write_outputs(results: list[dict], full_rows: list[dict], zoom_rows: list[dict]) -> None:
    full_sheet = CONTACT_DIR / "2026-07-03-current-prop-faithful-cleanup-full.jpg"
    zoom_sheet = CONTACT_DIR / "2026-07-03-current-prop-faithful-cleanup-zoom.jpg"
    build_sheet(full_rows, full_sheet)
    build_sheet(zoom_rows, zoom_sheet)
    manifest = {
        "policy": "Preview only. Exact current gametime props as input. No source assets, TMX, TSX, or runtime wiring changed.",
        "samples": results,
        "fullContactSheet": full_sheet.relative_to(ROOT).as_posix(),
        "zoomContactSheet": zoom_sheet.relative_to(ROOT).as_posix(),
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    lines = [
        "# Current Prop Faithful Cleanup",
        "",
        "Preview-only matte cleanup and upscale from exact current gametime-loaded props.",
        "",
        "No source images, TMX/TSX files, or runtime loaders were changed.",
        "",
        f"- Manifest: `{MANIFEST_PATH.relative_to(ROOT).as_posix()}`",
        f"- Full sheet: `{full_sheet.relative_to(ROOT).as_posix()}`",
        f"- Zoom sheet: `{zoom_sheet.relative_to(ROOT).as_posix()}`",
        "",
        "## Samples",
    ]
    for row in results:
        lines.append(
            f"- `{row['id']}`: current {row['currentSize'][0]}x{row['currentSize'][1]} -> cleanup {row['faithfulCleanupSize'][0]}x{row['faithfulCleanupSize'][1]}, `{row['faithfulCleanupPath']}`"
        )
    lines += [
        "",
        "## Review Notes",
        "- This pass compares the same current gametime prop against the cleanup at the same visible sheet scale.",
        "- Zoom tiles intentionally enlarge the current crop with nearest-neighbor sampling so source pixelation is visible.",
        "- The cleanup removes low-alpha green/black matte contamination before upscaling, then applies only mild local contrast so the prop does not drift into a different design.",
    ]
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")

def main() -> None:
    prepare_dirs()
    source_manifest = json.loads(SOURCE_MANIFEST.read_text(encoding="utf-8"))
    results, full_rows, zoom_rows = [], [], []
    for row in source_manifest["samples"]:
        result, full, zoom = make_sample(row)
        results.append(result)
        full_rows.append(full)
        zoom_rows.append(zoom)
    write_outputs(results, full_rows, zoom_rows)
    print(json.dumps({"count": len(results), "manifest": str(MANIFEST_PATH), "report": str(REPORT_PATH)}, indent=2))

if __name__ == "__main__":
    main()
