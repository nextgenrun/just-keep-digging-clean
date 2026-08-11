from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

from PIL import Image


sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
HELPER_PATH = ROOT / "ai-tools" / "2026-07-03-v7-30-detail-processing.py"
PROP_MANIFEST = ROOT / "exports" / "ai-enhanced" / "v7-30-runtime-preview" / "prop-detail-examples" / "2026-07-03-v7-30-prop-detail-examples-manifest.json"
OUT_DIR = ROOT / "exports" / "ai-enhanced" / "v7-30-runtime-preview" / "prop-current-comparison"
CONTACT_DIR = OUT_DIR / "contact-sheets"
MANIFEST_PATH = OUT_DIR / "2026-07-03-v7-30-current-vs-enhanced-props-manifest.json"
REPORT_PATH = ROOT / "markdown" / "audit" / "2026-07-03-v7-30-current-vs-enhanced-props.md"
CURRENT_PROPS_DIR = ROOT / "exports" / "cleaned" / "dig_game_palette_clean_overwrite_runtime_v3" / "sprites" / "background-props" / "generated-runtime-v1"
PORTAL_CANONICAL_DIR = ROOT / "exports" / "dig_game_runtime_bg_props_v1" / "sprites" / "background-props" / "generated-runtime-v1"
PORTAL_FILENAME = "prop_048_eclipse_gate.webp"

SPEC = importlib.util.spec_from_file_location("v7_30_detail_processing", HELPER_PATH)
processing = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(processing)
processing.TILE_W = 430
processing.TILE_H = 310
processing.HEADER_H = 56
processing.PAD = 16


def prepare_dirs() -> None:
    processing.write_readme(OUT_DIR, "v7-30 Current vs Enhanced Props", "Side-by-side current gametime prop and enhanced candidate previews.")
    processing.write_readme(CONTACT_DIR, "Contact Sheets", "Current gametime prop versus enhanced candidate contact sheets.")


def resolve_current_path(sample: dict) -> Path:
    filename = Path(sample["source"]).name
    if filename == PORTAL_FILENAME:
        return PORTAL_CANONICAL_DIR / filename
    return CURRENT_PROPS_DIR / filename


def fit_zoom(img: Image.Image, label: str, black: bool) -> Image.Image:
    rgba = img.convert("RGBA")
    crop = processing.smart_crop_box(rgba)
    zoom = rgba.crop(crop)
    bg = (0, 0, 0) if black else (34, 36, 42)
    return processing.fit_tile_on_background(zoom, label, bg)


def make_rows(sample: dict) -> tuple[dict, dict, dict]:
    sample_id = sample["id"]
    current_path = resolve_current_path(sample)
    enhanced_path = ROOT / sample["enhanced"]
    current = Image.open(current_path).convert("RGBA")
    enhanced = Image.open(enhanced_path).convert("RGBA")
    current_metrics = processing.halo_metrics(__import__("numpy").asarray(current))
    enhanced_metrics = processing.halo_metrics(__import__("numpy").asarray(enhanced))
    result = {
        "id": sample_id,
        "currentGametimePath": current_path.relative_to(ROOT).as_posix(),
        "enhancedCandidatePath": sample["enhanced"],
        "currentSize": list(current.size),
        "enhancedSize": list(enhanced.size),
        "currentGreenEdge": round(current_metrics["greenEdge"], 3),
        "enhancedGreenEdge": round(enhanced_metrics["greenEdge"], 3),
        "currentDarkEdge": round(current_metrics["darkEdge"], 3),
        "enhancedDarkEdge": round(enhanced_metrics["darkEdge"], 3),
        "tmxPlacements": sample["tmxPlacements"],
    }
    subtitle = f"current {current.width}x{current.height} -> enhanced {enhanced.width}x{enhanced.height} | {sample['tmxPlacements']} TMX placements"
    full_row = {
        "title": sample_id,
        "subtitle": subtitle,
        "tiles": [
            processing.fit_tile_on_background(current, "current game black", (0, 0, 0)),
            processing.fit_tile(current, "current game neutral", Image.Resampling.LANCZOS),
            processing.fit_tile_on_background(enhanced, "enhanced black", (0, 0, 0)),
            processing.fit_tile(enhanced, "enhanced neutral", Image.Resampling.LANCZOS),
        ],
    }
    zoom_row = {
        "title": sample_id,
        "subtitle": f"green edge {result['currentGreenEdge']}->{result['enhancedGreenEdge']} | dark edge {result['currentDarkEdge']}->{result['enhancedDarkEdge']}",
        "tiles": [
            fit_zoom(current, "current game black zoom", True),
            fit_zoom(current, "current game neutral zoom", False),
            fit_zoom(enhanced, "enhanced black zoom", True),
            fit_zoom(enhanced, "enhanced neutral zoom", False),
        ],
    }
    return result, full_row, zoom_row


def write_outputs(results: list[dict], full_rows: list[dict], zoom_rows: list[dict]) -> None:
    full_sheet = CONTACT_DIR / "2026-07-03-v7-30-current-vs-enhanced-props-full.jpg"
    zoom_sheet = CONTACT_DIR / "2026-07-03-v7-30-current-vs-enhanced-props-zoom.jpg"
    processing.build_contact_sheet(full_rows, full_sheet, zoom=True)
    processing.build_contact_sheet(zoom_rows, zoom_sheet, zoom=True)
    manifest = {
        "policy": "Comparison only. No source TMX/assets overwritten and no runtime wiring changed.",
        "currentResolver": {
            "defaultProps": CURRENT_PROPS_DIR.relative_to(ROOT).as_posix(),
            "portalProp": PORTAL_CANONICAL_DIR.relative_to(ROOT).as_posix(),
        },
        "samples": results,
        "fullContactSheet": full_sheet.relative_to(ROOT).as_posix(),
        "zoomContactSheet": zoom_sheet.relative_to(ROOT).as_posix(),
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    lines = [
        "# v7-30 Current vs Enhanced Props",
        "",
        "Side-by-side comparison of current gametime-loaded props versus the enhanced candidates.",
        "",
        "No source images, TSX files, TMX files, or runtime loaders were changed.",
        "",
        f"- Manifest: `{MANIFEST_PATH.relative_to(ROOT).as_posix()}`",
        f"- Full sheet: `{full_sheet.relative_to(ROOT).as_posix()}`",
        f"- Zoom sheet: `{zoom_sheet.relative_to(ROOT).as_posix()}`",
        "",
        "## Samples",
    ]
    for row in results:
        lines.append(
            f"- `{row['id']}`: current `{row['currentGametimePath']}` vs enhanced `{row['enhancedCandidatePath']}`"
        )
    lines += [
        "",
        "## Review Notes",
        "- The current gametime prop is resolved through the same cleaned prop directory that `BootScene` uses, except `prop_048_eclipse_gate.webp`, which uses the canonical portal path.",
        "- Several enhanced candidates are not strict visual upgrades over the current gametime prop; compare the full sheet before approving any wiring.",
        "- The neutral-background columns are the best place to spot remaining green/black leakage.",
    ]
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    prepare_dirs()
    source_manifest = json.loads(PROP_MANIFEST.read_text(encoding="utf-8"))
    results, full_rows, zoom_rows = [], [], []
    for sample in source_manifest["samples"]:
        result, full_row, zoom_row = make_rows(sample)
        results.append(result)
        full_rows.append(full_row)
        zoom_rows.append(zoom_row)
    write_outputs(results, full_rows, zoom_rows)
    print(json.dumps({"count": len(results), "manifest": str(MANIFEST_PATH), "report": str(REPORT_PATH)}, indent=2))


if __name__ == "__main__":
    main()
