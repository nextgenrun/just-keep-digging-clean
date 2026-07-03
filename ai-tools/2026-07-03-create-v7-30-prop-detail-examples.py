from __future__ import annotations

import importlib.util
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

import cv2
import numpy as np
from PIL import Image


sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
TMX_PATH = ROOT / "exports" / "dig-game-world-edit-v-7-30-06-2026-;layered.tmx"
HELPER_PATH = ROOT / "ai-tools" / "2026-07-03-v7-30-detail-processing.py"
OUT_DIR = ROOT / "exports" / "ai-enhanced" / "v7-30-runtime-preview" / "prop-detail-examples"
ENHANCED_DIR = OUT_DIR / "enhanced"
CONTACT_DIR = OUT_DIR / "contact-sheets"
MANIFEST_PATH = OUT_DIR / "2026-07-03-v7-30-prop-detail-examples-manifest.json"
REPORT_PATH = ROOT / "markdown" / "audit" / "2026-07-03-v7-30-prop-detail-examples.md"
GID_MASK = 0x1FFFFFFF

PREFERRED = [
    "prop_048_eclipse_gate.webp",
    "prop_050_endcore_orb.webp",
    "prop_026_glowing_geode_arch.webp",
    "prop_030_prism_shard_totem.webp",
    "prop_015_spore_lantern_stalk.webp",
    "prop_016_vine_arch.webp",
    "prop_019_root_chandelier.webp",
    "prop_033_hanging_cables.webp",
    "prop_028_luminous_reed_cluster.webp",
    "prop_036_reactor_vent.webp",
    "prop_041_watcher_eye_relic.webp",
    "prop_003_meteor_streak_cluster.webp",
]

SPEC = importlib.util.spec_from_file_location("v7_30_detail_processing", HELPER_PATH)
processing = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(processing)
processing.TILE_W = 430
processing.TILE_H = 310
processing.HEADER_H = 56
processing.PAD = 16


def prepare_dirs() -> None:
    processing.write_readme(OUT_DIR, "v7-30 Prop Detail Examples", "Prop-only visual examples parsed from the v7-30 TMX. No runtime wiring.")
    processing.write_readme(ENHANCED_DIR, "Enhanced", "Halo-clean prop detail PNG examples.")
    processing.write_readme(CONTACT_DIR, "Contact Sheets", "Black-background contact sheets for prop examples.")


def load_gid_index() -> dict[int, Path]:
    tmx_root = ET.parse(TMX_PATH).getroot()
    index: dict[int, Path] = {}
    for tileset in tmx_root.findall("tileset"):
        source = tileset.attrib.get("source")
        if not source:
            continue
        tsx_path = (TMX_PATH.parent / source).resolve()
        if not tsx_path.exists():
            continue
        first_gid = int(tileset.attrib["firstgid"])
        tsx_root = ET.parse(tsx_path).getroot()
        for tile in tsx_root.findall("tile"):
            image = tile.find("image")
            if image is None:
                continue
            gid = first_gid + int(tile.attrib.get("id", "0"))
            index[gid] = (tsx_path.parent / image.attrib["source"]).resolve()
    return index


def collect_props() -> list[dict]:
    gid_index = load_gid_index()
    tmx_root = ET.parse(TMX_PATH).getroot()
    counts: Counter[Path] = Counter()
    layers: dict[Path, set[str]] = defaultdict(set)
    max_display: dict[Path, tuple[float, float]] = {}
    for group in tmx_root.findall("objectgroup"):
        layer_name = group.attrib.get("name", "")
        for obj in group.findall("object"):
            raw_gid = obj.attrib.get("gid")
            if not raw_gid:
                continue
            source = gid_index.get(int(raw_gid) & GID_MASK)
            if source is None or not source.name.startswith("prop_") or not source.exists():
                continue
            width = float(obj.attrib.get("width", "0") or 0)
            height = float(obj.attrib.get("height", "0") or 0)
            counts[source] += 1
            layers[source].add(layer_name)
            old = max_display.get(source, (0.0, 0.0))
            if width * height > old[0] * old[1]:
                max_display[source] = (width, height)
    props = []
    for source, count in counts.items():
        props.append({"source": source, "count": count, "layers": sorted(layers[source]), "maxDisplay": max_display[source]})
    preferred_rank = {name: index for index, name in enumerate(PREFERRED)}
    props.sort(key=lambda item: (preferred_rank.get(item["source"].name, 999), -item["count"], item["source"].name))
    return props[:10]


def target_size(size: tuple[int, int]) -> tuple[int, int]:
    width, height = size
    max_dim = max(width, height)
    factor = 6 if max_dim <= 520 else 4 if max_dim <= 1100 else 2
    if max_dim * factor > 4096:
        factor = max(1, int(4096 / max_dim))
    return (max(1, width * factor), max(1, height * factor))


def detail_crop_box(rgba: Image.Image) -> tuple[int, int, int, int]:
    arr = np.asarray(rgba.convert("RGBA"))
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 12)
    if len(xs) == 0:
        return processing.smart_crop_box(rgba)
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    crop_w = min(x1 - x0, max(72, (x1 - x0) // 2))
    crop_h = min(y1 - y0, max(72, (y1 - y0) // 2))
    gray = cv2.cvtColor(arr[:, :, :3], cv2.COLOR_RGB2GRAY)
    edge = np.abs(cv2.Laplacian(gray, cv2.CV_32F, ksize=3)) + alpha.astype(np.float32) * 0.08
    best = (x0, y0, x0 + crop_w, y0 + crop_h)
    best_score = -1.0
    for yy in np.linspace(y0, max(y0, y1 - crop_h), num=6, dtype=int):
        for xx in np.linspace(x0, max(x0, x1 - crop_w), num=6, dtype=int):
            score = float(edge[yy : yy + crop_h, xx : xx + crop_w].mean())
            if score > best_score:
                best = (xx, yy, xx + crop_w, yy + crop_h)
                best_score = score
    return best


def make_prop_example(prop: dict) -> tuple[dict, dict, dict]:
    source_path = prop["source"]
    sample_id = source_path.stem
    out_path = ENHANCED_DIR / f"{sample_id}-prop-detail-example.png"
    with Image.open(source_path) as source_img:
        source_rgba = source_img.convert("RGBA")
    enhanced_size = target_size(source_rgba.size)
    base = processing.alpha_safe_resize(source_rgba, enhanced_size)
    detailed = processing.enhance_rgba(base, sample_id, "prop_upscale")
    enhanced = processing.clean_halo_and_depixelate(detailed, "prop_upscale")
    processing.image_from_array(enhanced).save(out_path)
    metrics = processing.halo_metrics(enhanced)
    result = {
        "id": sample_id,
        "source": source_path.relative_to(ROOT).as_posix(),
        "enhanced": out_path.relative_to(ROOT).as_posix(),
        "sourceSize": list(source_rgba.size),
        "enhancedSize": list(enhanced_size),
        "tmxPlacements": prop["count"],
        "layers": prop["layers"],
        "maxDisplay": [round(prop["maxDisplay"][0], 2), round(prop["maxDisplay"][1], 2)],
        "greenEdge": round(metrics["greenEdge"], 3),
        "darkEdge": round(metrics["darkEdge"], 3),
    }
    return result, build_full_row(result, source_rgba, enhanced), build_zoom_row(result, source_rgba, out_path)


def build_full_row(result: dict, source_rgba: Image.Image, enhanced: np.ndarray) -> dict:
    enhanced_img = processing.image_from_array(enhanced)
    subtitle = f"{result['tmxPlacements']} TMX placements | {result['sourceSize'][0]}x{result['sourceSize'][1]} -> {result['enhancedSize'][0]}x{result['enhancedSize'][1]}"
    return {
        "title": result["id"],
        "subtitle": subtitle,
        "tiles": [
            processing.fit_tile_on_background(source_rgba, "source on black", (0, 0, 0)),
            processing.fit_tile(source_rgba, "source neutral", Image.Resampling.BOX),
            processing.fit_tile_on_background(enhanced_img, "detail on black", (0, 0, 0)),
            processing.fit_tile(enhanced_img, "detail neutral", Image.Resampling.LANCZOS),
        ],
    }


def build_zoom_row(result: dict, source_rgba: Image.Image, enhanced_path: Path) -> dict:
    crop_box = detail_crop_box(source_rgba)
    source_crop = source_rgba.crop(crop_box)
    enhanced_crop = processing.scaled_crop(enhanced_path, crop_box, source_rgba.size)
    zoom = source_crop.resize((source_crop.width * 7, source_crop.height * 7), Image.Resampling.NEAREST)
    subtitle = f"layers: {', '.join(result['layers'][:3])} | max display {result['maxDisplay'][0]}x{result['maxDisplay'][1]}"
    return {
        "title": result["id"],
        "subtitle": subtitle,
        "tiles": [
            processing.fit_tile_on_background(zoom, "source pixel zoom", (0, 0, 0)),
            processing.fit_tile(source_crop.resize((source_crop.width * 7, source_crop.height * 7), Image.Resampling.LANCZOS), "source smooth zoom", Image.Resampling.LANCZOS),
            processing.fit_tile_on_background(enhanced_crop, "detail black zoom", (0, 0, 0)),
            processing.fit_tile(enhanced_crop, "detail neutral zoom", Image.Resampling.LANCZOS),
        ],
    }


def write_outputs(results: list[dict], full_rows: list[dict], zoom_rows: list[dict]) -> None:
    full_sheet = CONTACT_DIR / "2026-07-03-v7-30-prop-detail-examples-full.jpg"
    zoom_sheet = CONTACT_DIR / "2026-07-03-v7-30-prop-detail-examples-zoom.jpg"
    processing.build_contact_sheet(full_rows, full_sheet, zoom=True)
    processing.build_contact_sheet(zoom_rows, zoom_sheet, zoom=True)
    manifest = {
        "sourceTmx": TMX_PATH.relative_to(ROOT).as_posix(),
        "policy": "Source-preserving prop examples only. No source TMX/assets overwritten and no runtime wiring changed.",
        "samples": results,
        "fullContactSheet": full_sheet.relative_to(ROOT).as_posix(),
        "zoomContactSheet": zoom_sheet.relative_to(ROOT).as_posix(),
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    lines = [
        "# v7-30 Prop Detail Examples",
        "",
        "Prop-only examples parsed from actual `prop_*` object placements in `exports/dig-game-world-edit-v-7-30-06-2026-;layered.tmx`.",
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
        lines.append(f"- `{row['id']}`: {row['tmxPlacements']} placements, `{row['enhanced']}`")
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    prepare_dirs()
    results, full_rows, zoom_rows = [], [], []
    for prop in collect_props():
        result, full_row, zoom_row = make_prop_example(prop)
        results.append(result)
        full_rows.append(full_row)
        zoom_rows.append(zoom_row)
    write_outputs(results, full_rows, zoom_rows)
    print(json.dumps({"count": len(results), "manifest": str(MANIFEST_PATH), "report": str(REPORT_PATH)}, indent=2))


if __name__ == "__main__":
    main()
