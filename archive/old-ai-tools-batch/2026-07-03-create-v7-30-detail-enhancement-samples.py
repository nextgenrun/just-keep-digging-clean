from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
HELPER_PATH = ROOT / "ai-tools" / "2026-07-03-v7-30-detail-processing.py"
SPEC = importlib.util.spec_from_file_location("v7_30_detail_processing", HELPER_PATH)
processing = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(processing)

SOURCE_MANIFEST = (
    ROOT
    / "exports"
    / "ai-enhanced"
    / "v7-30-runtime-preview"
    / "samples"
    / "2026-07-02-v7-30-enhancement-samples-manifest.json"
)
OUT_DIR = ROOT / "exports" / "ai-enhanced" / "v7-30-runtime-preview" / "detail-pass-v2"
ENHANCED_DIR = OUT_DIR / "enhanced"
CONTACT_DIR = OUT_DIR / "contact-sheets"
REPORT_PATH = ROOT / "markdown" / "audit" / "2026-07-03-v7-30-detail-enhancement-pass-v2.md"
MANIFEST_PATH = OUT_DIR / "2026-07-03-v7-30-detail-enhancement-pass-v2-manifest.json"


def prepare_dirs() -> None:
    processing.write_readme(OUT_DIR, "v7-30 Detail Pass v2", "More visible review-only enhancement samples. No runtime wiring.")
    processing.write_readme(ENHANCED_DIR, "Enhanced", "Alpha-safe detail-enhanced PNG outputs.")
    processing.write_readme(CONTACT_DIR, "Contact Sheets", "Review sheets comparing source, first pass, and v2 detail outputs.")


def make_sample(sample: dict) -> tuple[dict, dict, dict]:
    sample_id = sample["id"]
    source_path = ROOT / sample["source"]
    v1_path = ROOT / sample["enhancedCopy"]
    out_path = ENHANCED_DIR / f"{sample_id}-detail-v2.png"
    with Image.open(source_path) as src_img:
        src_rgba = src_img.convert("RGBA")
    target_size = tuple(sample["enhancedSize"])
    resized = processing.alpha_safe_resize(src_rgba, target_size)
    enhanced = processing.enhance_rgba(resized, sample_id, sample["mode"])
    processing.image_from_array(enhanced).save(out_path)

    v1_arr = np.asarray(Image.open(v1_path).convert("RGBA"))
    diff = processing.mean_abs_delta(v1_arr, enhanced)
    v1_edge = processing.edge_energy(v1_arr)
    v2_edge = processing.edge_energy(enhanced)
    result = {
        "id": sample_id,
        "source": sample["source"],
        "v1EnhancedCopy": sample["enhancedCopy"],
        "v2EnhancedCopy": out_path.relative_to(ROOT).as_posix(),
        "sourceSize": sample["sourceSize"],
        "enhancedSize": list(target_size),
        "mode": sample["mode"],
        "meanRgbDeltaVsV1": round(diff, 2),
        "edgeEnergyV1": round(v1_edge, 2),
        "edgeEnergyV2": round(v2_edge, 2),
        "edgeEnergyGain": round(v2_edge / max(0.001, v1_edge), 3),
    }
    subtitle = f"{src_rgba.width}x{src_rgba.height} -> {target_size[0]}x{target_size[1]} | edge {v1_edge:.1f}->{v2_edge:.1f}"
    contact_row = {
        "title": sample_id,
        "subtitle": subtitle,
        "tiles": [
            processing.fit_tile(src_rgba.copy(), "source full", Image.Resampling.BOX),
            processing.fit_tile(Image.open(v1_path), "v1 conservative", Image.Resampling.LANCZOS),
            processing.fit_tile(processing.image_from_array(enhanced), "v2 detail", Image.Resampling.LANCZOS),
        ],
    }
    crop_box = processing.smart_crop_box(src_rgba)
    src_crop = src_rgba.crop(crop_box)
    v1_crop = processing.scaled_crop(v1_path, crop_box, src_rgba.size)
    v2_crop = processing.scaled_crop(out_path, crop_box, src_rgba.size)
    zoom_row = {
        "title": sample_id,
        "subtitle": f"mean RGB delta vs v1: {diff:.1f}",
        "tiles": [
            processing.fit_tile(src_crop.resize((src_crop.width * 5, src_crop.height * 5), Image.Resampling.NEAREST), "source pixel zoom", Image.Resampling.NEAREST),
            processing.fit_tile(src_crop.resize((src_crop.width * 5, src_crop.height * 5), Image.Resampling.LANCZOS), "source smooth zoom", Image.Resampling.LANCZOS),
            processing.fit_tile(v1_crop, "v1 conservative", Image.Resampling.LANCZOS),
            processing.fit_tile(v2_crop, "v2 detail", Image.Resampling.LANCZOS),
        ],
    }
    return result, contact_row, zoom_row


def write_outputs(source_tmx: str, results: list[dict], contact_rows: list[dict], zoom_rows: list[dict]) -> None:
    contact_path = CONTACT_DIR / "2026-07-03-v7-30-detail-pass-v2-contact-sheet.jpg"
    zoom_path = CONTACT_DIR / "2026-07-03-v7-30-detail-pass-v2-zoom-crops.jpg"
    processing.build_contact_sheet(contact_rows, contact_path, zoom=False)
    processing.build_contact_sheet(zoom_rows, zoom_path, zoom=True)
    output_manifest = {
        "sourceTmx": source_tmx,
        "policy": "Source-preserving review only. No source TMX/assets overwritten and no runtime wiring changed.",
        "method": "Aggressive local deblock, contrast, sharpening, and deterministic texture detail synthesis.",
        "samples": results,
        "contactSheet": contact_path.relative_to(ROOT).as_posix(),
        "zoomCropSheet": zoom_path.relative_to(ROOT).as_posix(),
    }
    MANIFEST_PATH.write_text(json.dumps(output_manifest, indent=2), encoding="utf-8")
    write_report(results, contact_path, zoom_path)


def write_report(results: list[dict], contact_path: Path, zoom_path: Path) -> None:
    lines = [
        "# v7-30 Detail Enhancement Pass v2",
        "",
        "More visible review-only pass for assets referenced by `exports/dig-game-world-edit-v-7-30-06-2026-;layered.tmx`.",
        "",
        "No source images, TSX files, TMX files, or runtime loaders were changed.",
        "",
        f"- Manifest: `{MANIFEST_PATH.relative_to(ROOT).as_posix()}`",
        f"- Contact sheet: `{contact_path.relative_to(ROOT).as_posix()}`",
        f"- Zoom crop sheet: `{zoom_path.relative_to(ROOT).as_posix()}`",
        "",
        "## What Changed",
        "- This pass is intentionally stronger than the first conservative upscale.",
        "- It smooths block edges, increases local contrast, sharpens structure, and adds deterministic source-colored texture detail.",
        "- The output is still source-preserving in path and composition, but it is not ready to wire automatically until visually approved.",
        "",
        "## Samples",
    ]
    for row in results:
        lines.append(f"- `{row['id']}`: `{row['v2EnhancedCopy']}` (delta vs v1 {row['meanRgbDeltaVsV1']}, edge gain {row['edgeEnergyGain']}x)")
    lines += [
        "",
        "## Review Notes",
        "- Use the zoom crop sheet first; it shows source pixel zoom, smoothed source zoom, v1, and v2 side by side.",
        "- The industrial magma strips remain aspect-ratio problems in the TMX; this pass improves texture detail but does not solve wrong display shape.",
        "- If this is still not enough, the next step should be a separate generative image-edit pass for selected assets, labeled as drift-risk experimental.",
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
