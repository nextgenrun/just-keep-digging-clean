from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
HELPER_PATH = ROOT / "ai-tools" / "2026-07-03-v7-30-detail-processing.py"
CURRENT_MANIFEST = ROOT / "exports" / "ai-enhanced" / "v7-30-runtime-preview" / "prop-current-comparison" / "2026-07-03-v7-30-current-vs-enhanced-props-manifest.json"
OUT_DIR = ROOT / "exports" / "ai-enhanced" / "v7-30-runtime-preview" / "current-prop-ultra-upscale"
ENHANCED_DIR = OUT_DIR / "enhanced"
CONTACT_DIR = OUT_DIR / "contact-sheets"
MANIFEST_PATH = OUT_DIR / "2026-07-03-current-prop-ultra-upscale-manifest.json"
REPORT_PATH = ROOT / "markdown" / "audit" / "2026-07-03-current-prop-ultra-upscale.md"

SPEC = importlib.util.spec_from_file_location("v7_30_detail_processing", HELPER_PATH)
processing = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(processing)
processing.TILE_W = 430
processing.TILE_H = 310
processing.HEADER_H = 56
processing.PAD = 16


def prepare_dirs() -> None:
    processing.write_readme(OUT_DIR, "Current Prop Ultra Upscale", "Upscaled from current gametime props, not TMX source variants.")
    processing.write_readme(ENHANCED_DIR, "Enhanced", "Current-source ultra-upscaled prop PNG candidates.")
    processing.write_readme(CONTACT_DIR, "Contact Sheets", "Current gametime prop versus current-source ultra-upscale sheets.")


def target_size(size: tuple[int, int]) -> tuple[int, int]:
    width, height = size
    max_dim = max(width, height)
    factor = 10 if max_dim <= 420 else 8 if max_dim <= 650 else 6
    scale = min(factor, max(1.0, 4096 / max_dim))
    return max(1, int(round(width * scale))), max(1, int(round(height * scale)))


def cleanup_alpha_edge(rgba: np.ndarray) -> np.ndarray:
    rgb = rgba[:, :, :3].astype(np.float32)
    alpha = rgba[:, :, 3].copy()
    visible = alpha > 0
    if not np.any(visible) or not np.any(alpha < 250):
        return rgba
    x0, y0, x1, y1 = alpha_bbox(alpha, 18)
    crop_rgb = rgb[y0:y1, x0:x1].copy()
    crop_alpha = alpha[y0:y1, x0:x1].copy()
    mask = (crop_alpha < 252).astype(np.uint8) * 255
    if np.count_nonzero(crop_alpha > 190) >= 24:
        fill = cv2.inpaint(np.clip(crop_rgb, 0, 255).astype(np.uint8), mask, 3, cv2.INPAINT_TELEA).astype(np.float32)
        edge = (crop_alpha > 0) & (crop_alpha < 245)
        weight = np.power(1.0 - crop_alpha.astype(np.float32) / 255.0, 0.42)
        crop_rgb = crop_rgb * (1.0 - weight[:, :, None]) + fill * weight[:, :, None]
        green = crop_rgb[:, :, 1] - np.maximum(crop_rgb[:, :, 0], crop_rgb[:, :, 2])
        green_edge = edge & (green > 5.0)
        cap = np.maximum(crop_rgb[:, :, 0], crop_rgb[:, :, 2]) + 3.0
        crop_rgb[:, :, 1] = np.where(green_edge, np.minimum(crop_rgb[:, :, 1], cap), crop_rgb[:, :, 1])
        dark_edge = edge & (luma(crop_rgb) < 24.0) & (crop_alpha < 145)
        crop_alpha = np.where(dark_edge, (crop_alpha.astype(np.float32) * 0.55).astype(np.uint8), crop_alpha)
    crop_alpha = crisp_alpha(crop_alpha)
    out = rgba.copy()
    out[y0:y1, x0:x1, :3] = np.clip(crop_rgb, 0, 255).astype(np.uint8)
    out[y0:y1, x0:x1, 3] = crop_alpha
    out[:, :, :3] = np.where((out[:, :, 3:4] > 0), out[:, :, :3], 0)
    return out


def ultra_detail(rgba: np.ndarray, sample_id: str) -> np.ndarray:
    rgba = cleanup_alpha_edge(rgba)
    rgb = rgba[:, :, :3].astype(np.float32)
    alpha = rgba[:, :, 3].astype(np.float32) / 255.0
    base = np.clip(rgb, 0, 255).astype(np.uint8)
    smooth = cv2.bilateralFilter(base, d=7, sigmaColor=28, sigmaSpace=5).astype(np.float32)
    rgb = rgb * 0.45 + smooth * 0.55
    lab = cv2.cvtColor(np.clip(rgb, 0, 255).astype(np.uint8), cv2.COLOR_RGB2LAB)
    lab[:, :, 0] = cv2.createCLAHE(clipLimit=1.55, tileGridSize=(8, 8)).apply(lab[:, :, 0])
    rgb = rgb * 0.62 + cv2.cvtColor(lab, cv2.COLOR_LAB2RGB).astype(np.float32) * 0.38
    detail = cv2.detailEnhance(np.clip(rgb, 0, 255).astype(np.uint8), sigma_s=12, sigma_r=0.12).astype(np.float32)
    rgb = rgb * 0.72 + detail * 0.28
    blur = cv2.GaussianBlur(rgb, (0, 0), sigmaX=0.62)
    rgb = rgb + (rgb - blur) * 0.92
    rgb = np.where((alpha > 0.001)[:, :, None], rgb, 0)
    out = np.dstack([np.clip(rgb, 0, 255), rgba[:, :, 3]])
    return cleanup_alpha_edge(np.clip(out, 0, 255).astype(np.uint8))


def alpha_bbox(alpha: np.ndarray, margin: int) -> tuple[int, int, int, int]:
    ys, xs = np.where(alpha > 0)
    if len(xs) == 0:
        return (0, 0, alpha.shape[1], alpha.shape[0])
    return (
        max(0, int(xs.min()) - margin),
        max(0, int(ys.min()) - margin),
        min(alpha.shape[1], int(xs.max()) + margin + 1),
        min(alpha.shape[0], int(ys.max()) + margin + 1),
    )


def crisp_alpha(alpha: np.ndarray) -> np.ndarray:
    a = alpha.astype(np.float32) / 255.0
    a = np.clip((a - 0.045) / 0.91, 0.0, 1.0)
    return np.clip(a * a * (3.0 - 2.0 * a) * 255.0, 0, 255).astype(np.uint8)


def luma(rgb: np.ndarray) -> np.ndarray:
    return rgb[:, :, 0] * 0.2126 + rgb[:, :, 1] * 0.7152 + rgb[:, :, 2] * 0.0722


def scaled_crop_image(img: Image.Image, source_box: tuple[int, int, int, int], source_size: tuple[int, int]) -> Image.Image:
    sx = img.width / source_size[0]
    sy = img.height / source_size[1]
    box = (int(source_box[0] * sx), int(source_box[1] * sy), int(source_box[2] * sx), int(source_box[3] * sy))
    return img.crop(box)


def make_sample(row: dict) -> tuple[dict, dict, dict]:
    sample_id = row["id"]
    source_path = ROOT / row["currentGametimePath"]
    out_path = ENHANCED_DIR / f"{sample_id}-current-ultra.png"
    current = Image.open(source_path).convert("RGBA")
    cleaned = cleanup_alpha_edge(np.asarray(current))
    resized = processing.alpha_safe_resize(processing.image_from_array(cleaned), target_size(current.size))
    enhanced = ultra_detail(resized, sample_id)
    enhanced_img = processing.image_from_array(enhanced)
    enhanced_img.save(out_path)
    current_metrics = processing.halo_metrics(cleaned)
    enhanced_metrics = processing.halo_metrics(enhanced)
    result = {
        "id": sample_id,
        "currentGametimePath": row["currentGametimePath"],
        "ultraEnhancedPath": out_path.relative_to(ROOT).as_posix(),
        "currentSize": list(current.size),
        "ultraSize": list(enhanced_img.size),
        "currentGreenEdge": round(current_metrics["greenEdge"], 3),
        "ultraGreenEdge": round(enhanced_metrics["greenEdge"], 3),
        "currentDarkEdge": round(current_metrics["darkEdge"], 3),
        "ultraDarkEdge": round(enhanced_metrics["darkEdge"], 3),
    }
    return result, full_row(result, current, enhanced_img), zoom_row(result, current, enhanced_img)


def full_row(result: dict, current: Image.Image, enhanced: Image.Image) -> dict:
    subtitle = f"current {current.width}x{current.height} -> ultra {enhanced.width}x{enhanced.height}"
    return {
        "title": result["id"],
        "subtitle": subtitle,
        "tiles": [
            processing.fit_tile_on_background(current, "current black", (0, 0, 0)),
            processing.fit_tile(current, "current neutral", Image.Resampling.LANCZOS),
            processing.fit_tile_on_background(enhanced, "ultra black", (0, 0, 0)),
            processing.fit_tile(enhanced, "ultra neutral", Image.Resampling.LANCZOS),
        ],
    }


def zoom_row(result: dict, current: Image.Image, enhanced: Image.Image) -> dict:
    crop = processing.smart_crop_box(current)
    current_crop = current.crop(crop)
    ultra_crop = scaled_crop_image(enhanced, crop, current.size)
    subtitle = f"green edge {result['currentGreenEdge']}->{result['ultraGreenEdge']} | dark edge {result['currentDarkEdge']}->{result['ultraDarkEdge']}"
    return {
        "title": result["id"],
        "subtitle": subtitle,
        "tiles": [
            processing.fit_tile_on_background(current_crop, "current black zoom", (0, 0, 0)),
            processing.fit_tile(current_crop, "current neutral zoom", Image.Resampling.LANCZOS),
            processing.fit_tile_on_background(ultra_crop, "ultra black zoom", (0, 0, 0)),
            processing.fit_tile(ultra_crop, "ultra neutral zoom", Image.Resampling.LANCZOS),
        ],
    }


def write_outputs(results: list[dict], full_rows: list[dict], zoom_rows: list[dict]) -> None:
    full_sheet = CONTACT_DIR / "2026-07-03-current-prop-ultra-upscale-full.jpg"
    zoom_sheet = CONTACT_DIR / "2026-07-03-current-prop-ultra-upscale-zoom.jpg"
    processing.build_contact_sheet(full_rows, full_sheet, zoom=True)
    processing.build_contact_sheet(zoom_rows, zoom_sheet, zoom=True)
    manifest = {"policy": "Current-source preview only. No source/runtime wiring changed.", "samples": results, "fullContactSheet": full_sheet.relative_to(ROOT).as_posix(), "zoomContactSheet": zoom_sheet.relative_to(ROOT).as_posix()}
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    lines = ["# Current Prop Ultra Upscale", "", "Upscaled from current gametime props, not TMX/source variants.", "", "No source images, TSX files, TMX files, or runtime loaders were changed.", "", f"- Manifest: `{MANIFEST_PATH.relative_to(ROOT).as_posix()}`", f"- Full sheet: `{full_sheet.relative_to(ROOT).as_posix()}`", f"- Zoom sheet: `{zoom_sheet.relative_to(ROOT).as_posix()}`", "", "## Samples"]
    for row in results:
        lines.append(f"- `{row['id']}`: current {row['currentSize'][0]}x{row['currentSize'][1]} -> ultra {row['ultraSize'][0]}x{row['ultraSize'][1]}, `{row['ultraEnhancedPath']}`")
    lines += ["", "## Review Notes", "- This pass preserves current gametime identity better because it uses the current loaded prop as input.", "- It is still deterministic/local enhancement, not a model-native generative repaint.", "- Remaining black haze in smoky props may be intentional painted atmosphere rather than transparency leakage."]
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    prepare_dirs()
    source_manifest = json.loads(CURRENT_MANIFEST.read_text(encoding="utf-8"))
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
