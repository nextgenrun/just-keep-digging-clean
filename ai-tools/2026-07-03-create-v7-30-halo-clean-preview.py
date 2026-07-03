from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image


sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
HELPER_PATH = ROOT / "ai-tools" / "2026-07-03-v7-30-detail-processing.py"
SPEC = importlib.util.spec_from_file_location("v7_30_detail_processing", HELPER_PATH)
processing = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(processing)

SOURCE_MANIFEST = ROOT / "exports" / "ai-enhanced" / "v7-30-runtime-preview" / "samples" / "2026-07-02-v7-30-enhancement-samples-manifest.json"
V2_DIR = ROOT / "exports" / "ai-enhanced" / "v7-30-runtime-preview" / "detail-pass-v2" / "enhanced"
OUT_DIR = ROOT / "exports" / "ai-enhanced" / "v7-30-runtime-preview" / "detail-pass-v3-halo-clean"
ENHANCED_DIR = OUT_DIR / "enhanced"
CONTACT_DIR = OUT_DIR / "contact-sheets"
REPORT_PATH = ROOT / "markdown" / "audit" / "2026-07-03-v7-30-halo-clean-detail-pass-v3.md"
MANIFEST_PATH = OUT_DIR / "2026-07-03-v7-30-halo-clean-detail-pass-v3-manifest.json"


def prepare_dirs() -> None:
    processing.write_readme(OUT_DIR, "v7-30 Halo Clean Detail Pass v3", "Review-only dehalo and depixelation samples. No runtime wiring.")
    processing.write_readme(ENHANCED_DIR, "Enhanced", "V3 halo-clean PNG outputs.")
    processing.write_readme(CONTACT_DIR, "Contact Sheets", "Review sheets for v2 versus v3 halo-clean outputs.")


def v3_size(sample: dict) -> tuple[int, int]:
    width, height = sample["enhancedSize"]
    if sample["mode"] == "prop_upscale" or sample["id"].startswith("industrial-magma"):
        return (width * 2, height * 2)
    return (width, height)


def make_sample(sample: dict) -> tuple[dict, dict, dict]:
    sample_id = sample["id"]
    source_path = ROOT / sample["source"]
    v2_path = V2_DIR / f"{sample_id}-detail-v2.png"
    out_path = ENHANCED_DIR / f"{sample_id}-halo-clean-v3.png"
    with Image.open(source_path) as src_img:
        src_rgba = src_img.convert("RGBA")
    target_size = v3_size(sample)
    resized = processing.alpha_safe_resize(src_rgba, target_size)
    detailed = processing.enhance_rgba(resized, sample_id, sample["mode"])
    enhanced = processing.clean_halo_and_depixelate(detailed, sample["mode"])
    processing.image_from_array(enhanced).save(out_path)

    v2_img = Image.open(v2_path).convert("RGBA")
    v2_arr = np.asarray(v2_img)
    v3_metrics = processing.halo_metrics(enhanced)
    v2_metrics = processing.halo_metrics(v2_arr)
    result = {
        "id": sample_id,
        "source": sample["source"],
        "v2EnhancedCopy": v2_path.relative_to(ROOT).as_posix(),
        "v3EnhancedCopy": out_path.relative_to(ROOT).as_posix(),
        "sourceSize": sample["sourceSize"],
        "v2Size": list(sample["enhancedSize"]),
        "v3Size": list(target_size),
        "mode": sample["mode"],
        "greenEdgeV2": round(v2_metrics["greenEdge"], 3),
        "greenEdgeV3": round(v3_metrics["greenEdge"], 3),
        "darkEdgeV2": round(v2_metrics["darkEdge"], 3),
        "darkEdgeV3": round(v3_metrics["darkEdge"], 3),
    }
    contact_row = build_contact_row(sample_id, src_rgba, v2_img, enhanced, result)
    zoom_row = build_zoom_row(sample_id, src_rgba, v2_path, out_path, result)
    return result, contact_row, zoom_row


def build_contact_row(sample_id: str, src_rgba: Image.Image, v2_img: Image.Image, enhanced: np.ndarray, result: dict) -> dict:
    title = sample_id
    subtitle = f"v2 {result['v2Size'][0]}x{result['v2Size'][1]} -> v3 {result['v3Size'][0]}x{result['v3Size'][1]}"
    v3_img = processing.image_from_array(enhanced)
    return {
        "title": title,
        "subtitle": subtitle,
        "tiles": [
            processing.fit_tile(src_rgba.copy(), "source", Image.Resampling.BOX),
            processing.fit_tile(v2_img, "v2 detail", Image.Resampling.LANCZOS),
            processing.fit_tile(v3_img, "v3 halo-clean", Image.Resampling.LANCZOS),
            processing.fit_tile_on_background(v3_img, "v3 black edge test", (0, 0, 0)),
        ],
    }


def build_zoom_row(sample_id: str, src_rgba: Image.Image, v2_path: Path, v3_path: Path, result: dict) -> dict:
    crop_box = processing.smart_crop_box(src_rgba)
    src_crop = src_rgba.crop(crop_box)
    v2_crop = processing.scaled_crop(v2_path, crop_box, src_rgba.size)
    v3_crop = processing.scaled_crop(v3_path, crop_box, src_rgba.size)
    subtitle = f"green edge {result['greenEdgeV2']}->{result['greenEdgeV3']} | dark edge {result['darkEdgeV2']}->{result['darkEdgeV3']}"
    return {
        "title": sample_id,
        "subtitle": subtitle,
        "tiles": [
            processing.fit_tile(src_crop.resize((src_crop.width * 6, src_crop.height * 6), Image.Resampling.NEAREST), "source pixel zoom", Image.Resampling.NEAREST),
            processing.fit_tile(v2_crop, "v2 detail zoom", Image.Resampling.LANCZOS),
            processing.fit_tile(v3_crop, "v3 crisp zoom", Image.Resampling.LANCZOS),
            processing.fit_tile_on_background(v3_crop, "v3 black edge test", (0, 0, 0)),
        ],
    }


def write_outputs(source_tmx: str, results: list[dict], contact_rows: list[dict], zoom_rows: list[dict]) -> None:
    contact_path = CONTACT_DIR / "2026-07-03-v7-30-halo-clean-v3-contact-sheet.jpg"
    zoom_path = CONTACT_DIR / "2026-07-03-v7-30-halo-clean-v3-zoom-crops.jpg"
    processing.build_contact_sheet(contact_rows, contact_path, zoom=True)
    processing.build_contact_sheet(zoom_rows, zoom_path, zoom=True)
    manifest = {
        "sourceTmx": source_tmx,
        "policy": "Source-preserving review only. No source TMX/assets overwritten and no runtime wiring changed.",
        "method": "Alpha-edge decontamination, green/dark fringe suppression, deblocking, and crisp detail pass.",
        "samples": results,
        "contactSheet": contact_path.relative_to(ROOT).as_posix(),
        "zoomCropSheet": zoom_path.relative_to(ROOT).as_posix(),
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    write_report(results, contact_path, zoom_path)


def write_report(results: list[dict], contact_path: Path, zoom_path: Path) -> None:
    lines = [
        "# v7-30 Halo Clean Detail Pass v3",
        "",
        "Review-only pass for reducing green/black haloing and visible pixelation in v7-30 rendered assets.",
        "",
        "No source images, TSX files, TMX files, or runtime loaders were changed.",
        "",
        f"- Manifest: `{MANIFEST_PATH.relative_to(ROOT).as_posix()}`",
        f"- Contact sheet: `{contact_path.relative_to(ROOT).as_posix()}`",
        f"- Zoom crop sheet: `{zoom_path.relative_to(ROOT).as_posix()}`",
        "",
        "## Samples",
    ]
    for row in results:
        lines.append(
            f"- `{row['id']}`: `{row['v3EnhancedCopy']}` "
            f"(v2 {row['v2Size'][0]}x{row['v2Size'][1]} -> v3 {row['v3Size'][0]}x{row['v3Size'][1]}, "
            f"green edge {row['greenEdgeV2']}->{row['greenEdgeV3']}, dark edge {row['darkEdgeV2']}->{row['darkEdgeV3']})"
        )
    lines += [
        "",
        "## Review Notes",
        "- Use the zoom crop sheet first; the last column composites v3 on a black background so the preview is easier to judge in the game's dark context.",
        "- Prop cutouts and industrial magma strips are output at 2x the v2 dimensions for this preview; large sky/background plates stay at v2 size to avoid impractical texture sizes.",
        "- This is still not wired into gametime. Approve specific assets before any loader/TMX substitution work.",
    ]
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    manifest = json.loads(SOURCE_MANIFEST.read_text(encoding="utf-8"))
    prepare_dirs()
    results, contact_rows, zoom_rows = [], [], []
    for sample in manifest["samples"]:
        result, contact_row, zoom_row = make_sample(sample)
        results.append(result)
        contact_rows.append(contact_row)
        zoom_rows.append(zoom_row)
    write_outputs(manifest["sourceTmx"], results, contact_rows, zoom_rows)
    print(json.dumps({"manifest": str(MANIFEST_PATH), "report": str(REPORT_PATH)}, indent=2))


if __name__ == "__main__":
    main()
