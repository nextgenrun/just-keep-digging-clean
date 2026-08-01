#!/usr/bin/env python3
"""Build the non-destructive v2 high-impact review library.
V1 assumed equal grid spacing. ImageGen did not: several sheets contain
non-uniform chroma corridors or explicit divider bands. This wrapper reuses the
v1 taxonomy/derivative pipeline while replacing source extraction with
pixel-audited boundaries and row-union sequence framing.
"""
from __future__ import annotations
import argparse
import importlib.util
import json
from pathlib import Path
import sys
import time
from typing import Any
import cv2
from PIL import Image
from high_impact_v2_build_support import (
    finalize_outputs,
    preflight_master_chroma_keys,
    prepare_transaction,
    validate_audit,
)
from high_impact_v2_extraction import (
    extract_component_cells,
    raw_crop_stats,
    remove_chroma_with_key,
    select_master_chroma_key,
)
from high_impact_v2_sequence import normalize_sequence_row
ROOT = Path(__file__).resolve().parents[1]
BASE_PATH = ROOT / "ai-tools" / "2026-07-29-build-high-impact-review-library-v1.py"
AUDIT_PATH = ROOT / "ai-tools" / "2026-07-29-high-impact-v2-slicing-audit.json"
LIBRARY_ID = "2026-07-29-high-impact-review-library-v2"
FINAL_OUTPUT_ROOT = ROOT / "visual-approval-previews" / LIBRARY_ID
OUTPUT_ROOT = FINAL_OUTPUT_ROOT.parent / f".{LIBRARY_ID}.staging"
AUDIT = json.loads(AUDIT_PATH.read_text(encoding="utf-8"))
EDGE_SAFETY_PX = int(AUDIT["edgeSafetyPx"])
UNION_PADDING_PX = int(AUDIT["unionPaddingPx"])
COMPONENT_PADDING_PX = int(AUDIT["componentPaddingPx"])
COMPONENT_CLOSE_PX = int(AUDIT["componentClosePx"])
spec = importlib.util.spec_from_file_location("high_impact_v1", BASE_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Could not import {BASE_PATH}")
V1 = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = V1
spec.loader.exec_module(V1)
V1.LIBRARY_ID = LIBRARY_ID
V1.OUTPUT_ROOT = OUTPUT_ROOT
_BASE_SUMMARIZE_BYTES = V1.summarize_bytes
V1.summarize_bytes = lambda records: _BASE_SUMMARIZE_BYTES(records) if records else {
    "count": 0, "encodedBytes": 0, "decodedRgbaBytes": 0,
    "encodedBytesP50": 0, "encodedBytesP95": 0, "encodedBytesMax": 0,
}
AUDITED_BOUNDARIES = {
    master_id: {
        axis: {
            int(ordinal): {"start": value[0], "end": value[1], "kind": value[2]}
            for ordinal, value in boundaries.items()
        }
        for axis, boundaries in axes.items()
    }
    for master_id, axes in AUDIT["boundaries"].items()
}
COMPONENT_ROWS = AUDIT["componentRows"]
QUARANTINE_MASTERS = AUDIT["quarantinedMasters"]
QUARANTINE_RANGES = AUDIT["quarantinedRanges"]
MASTER_ART_REJECTS = AUDIT["masterArtRejects"]
def boundary_plan(length: int, count: int, overrides: dict[int, dict[str, Any]], legacy_inset: int) -> list[dict[str, Any]]:
    average = length / count
    result: list[dict[str, Any]] = []
    for ordinal in range(1, count):
        override = overrides.get(ordinal)
        if override:
            item = {**override, "ordinal": ordinal, "source": "pixel-audited"}
            if item["kind"] == "chroma-corridor":
                cut = round((item["start"] + item["end"]) / 2)
                item["leftCropEnd"] = cut - EDGE_SAFETY_PX
                item["rightCropStart"] = cut + EDGE_SAFETY_PX
            elif item["kind"] == "explicit-divider":
                item["leftCropEnd"] = item["start"] - EDGE_SAFETY_PX
                item["rightCropStart"] = item["end"] + 1 + EDGE_SAFETY_PX
            else:
                raise RuntimeError(f"Unknown boundary kind: {item['kind']}")
        else:
            cut = round(ordinal * average)
            item = {
                "ordinal": ordinal,
                "start": cut,
                "end": cut,
                "kind": "legacy-equal-fallback",
                "source": "manual-audit-retained-v1-boundary",
                "leftCropEnd": cut - legacy_inset,
                "rightCropStart": cut + legacy_inset,
            }
        result.append(item)
    return result
def crop_bounds(master: Image.Image, pack: dict[str, Any], index: int) -> tuple[int, int, int, int]:
    row, column = divmod(index, pack["columns"])
    audit = AUDITED_BOUNDARIES.get(pack["id"], {})
    legacy_inset = max(4, int(round(min(
        master.width / pack["columns"], master.height / pack["rows"]
    ) * 0.028)))
    x_plan = boundary_plan(master.width, pack["columns"], audit.get("x", {}), legacy_inset)
    y_plan = boundary_plan(master.height, pack["rows"], audit.get("y", {}), legacy_inset)
    left = legacy_inset if column == 0 else x_plan[column - 1]["rightCropStart"]
    right = master.width - legacy_inset if column == pack["columns"] - 1 else x_plan[column]["leftCropEnd"]
    top = legacy_inset if row == 0 else y_plan[row - 1]["rightCropStart"]
    bottom = master.height - legacy_inset if row == pack["rows"] - 1 else y_plan[row]["leftCropEnd"]
    if right - left < 16 or bottom - top < 16:
        raise RuntimeError(f"Invalid adaptive cell bounds for {pack['id']} cell {index}: {(left, top, right, bottom)}")
    return left, top, right, bottom
def source_status(pack_id: str, source_id: str, global_index: int) -> tuple[str, str | None]:
    if source_id in MASTER_ART_REJECTS:
        return "rejected", MASTER_ART_REJECTS[source_id]
    if pack_id in QUARANTINE_MASTERS:
        return "quarantined", QUARANTINE_MASTERS[pack_id]
    for start, end, reason in QUARANTINE_RANGES:
        if start <= global_index <= end:
            return "quarantined", reason
    return "pending", None
def build_sources() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    sources: list[dict[str, Any]] = []
    masters: list[dict[str, Any]] = []
    global_index = 0
    for pack in V1.PACKS:
        master_source = V1.GENERATED_ROOT / pack["generatedFile"]
        with Image.open(master_source) as loaded:
            master = loaded.convert("RGBA")
        master_copy = OUTPUT_ROOT / "masters" / f"{pack['id']}-{pack['slug']}.png"
        master_copy.parent.mkdir(parents=True, exist_ok=True)
        V1.shutil.copy2(master_source, master_copy)
        sampled_key = tuple(V1.CHROMA._sample_border_key(master, "border"))
        key, key_selection = select_master_chroma_key(master, sampled_key)
        keyed_master, master_warnings = remove_chroma_with_key(
            master, key, V1.CHROMA, V1.VISIBLE_ALPHA
        )
        if pack["id"] in COMPONENT_ROWS:
            prepared = extract_component_cells(
                keyed_master,
                COMPONENT_ROWS[pack["id"]],
                pack["columns"],
                padding_px=COMPONENT_PADDING_PX,
                close_px=COMPONENT_CLOSE_PX,
            )
            for item in prepared:
                item.update({"key": key, "warnings": list(master_warnings)})
        else:
            prepared = []
            for index in range(len(pack["names"])):
                bounds = crop_bounds(master, pack, index)
                keyed_cell, cell_warnings = remove_chroma_with_key(
                    master.crop(bounds), key, V1.CHROMA, V1.VISIBLE_ALPHA
                )
                prepared.append({
                    "image": keyed_cell,
                    "key": key,
                    "warnings": sorted(set(master_warnings + cell_warnings)),
                    "bounds": bounds,
                    "componentIds": [],
                    "componentRecords": [],
                    "assignment": {"row": index // pack["columns"], "column": index % pack["columns"]},
                })
        for item in prepared:
            item["masterSpaceQa"] = raw_crop_stats(item["image"])
            item["warnings"] = sorted(set(
                item["warnings"] + item["masterSpaceQa"].get("warnings", [])
            ))
        for group in pack["rowGroups"]:
            start = group["row"] * pack["columns"]
            row_images = [prepared[start + offset]["image"] for offset in range(pack["columns"])]
            normalized = normalize_sequence_row(
                row_images,
                canvas_size=V1.CANVAS_SIZE,
                content_size=V1.CONTENT_SIZE,
                padding_px=UNION_PADDING_PX,
            )
            for offset, image in enumerate(normalized):
                prepared[start + offset]["normalized"] = image
        start_index = global_index + 1
        source_ids: list[str] = []
        group_by_row = {group["row"]: group for group in pack["rowGroups"]}
        for cell_index, semantic_name in enumerate(pack["names"]):
            global_index += 1
            row, column = divmod(cell_index, pack["columns"])
            source_id = f"a{global_index:04d}-{semantic_name}"
            source_ids.append(source_id)
            item = prepared[cell_index]
            normalized = item.get("normalized") or V1.normalize_frame(item["image"])
            output = OUTPUT_ROOT / "sources" / f"{source_id}.png"
            V1.png_save(normalized, output)
            stats = V1.visible_stats(normalized)
            warnings = list(item["warnings"])
            if stats["cornerAlphaMax"] != 0:
                warnings.append("opaque-corner")
            if not (0.0001 <= stats["alphaCoverage"] <= 0.86):
                warnings.append("alpha-coverage-outlier")
            if stats["residualStrongKeyPixels"] > 0:
                warnings.append("residual-strong-key-pixels")
            status, reason = source_status(pack["id"], source_id, global_index)
            structural = item["masterSpaceQa"].get("warnings", [])
            if structural and status == "pending":
                status = "quarantined"
                reason = "; ".join(structural)
            if reason:
                warnings.append(f"{status}:{reason}")
            group = group_by_row.get(row)
            sequence_group = f"{pack['id']}-{group['id']}" if group else None
            record = {
                "id": source_id, "globalIndex": global_index, "profileSlug": "p00-source",
                "family": pack["family"], "masterId": pack["id"], "semanticName": semantic_name,
                "role": group["label"] if group else semantic_name.replace("-", " "),
                "sourceCell": {"row": row, "column": column, "index": cell_index},
                "componentIds": item.get("componentIds", []),
                "componentRecords": item.get("componentRecords", []),
                "componentAssignment": item.get("assignment"),
                "masterSpaceQa": item["masterSpaceQa"],
                "masterPixelBounds": {"left": item["bounds"][0], "top": item["bounds"][1], "right": item["bounds"][2], "bottom": item["bounds"][3]},
                "sequenceGroup": sequence_group, "frameIndex": column if group else None,
                "frameCount": group["frameCount"] if group else None,
                "sequenceKind": group["kind"] if group else "unordered-variant",
                "loop": group["loop"] if group else False,
                "pivot": {"x": 0.5, "y": 0.5}, "contactAnchor": {"x": 0.5, "y": 0.5},
                "path": output.relative_to(OUTPUT_ROOT).as_posix(), "width": normalized.width,
                "height": normalized.height, "bytes": output.stat().st_size,
                "decodedRgbaBytes": normalized.width * normalized.height * 4,
                "sha256": V1.sha256_file(output), "rgbaSha256": V1.rgba_sha(normalized),
                "sampledKey": f"#{item['key'][0]:02x}{item['key'][1]:02x}{item['key'][2]:02x}",
                "qa": {**stats, "warnings": sorted(set(warnings))},
                "approvalStatus": status, "runtimeWired": False, "productionEligible": False,
            }
            sources.append(record)
        audit = AUDITED_BOUNDARIES.get(pack["id"], {})
        shared_legacy_inset = max(4, int(round(min(
            master.width / pack["columns"], master.height / pack["rows"]
        ) * 0.028)))
        masters.append({
            "id": pack["id"], "title": pack["title"], "family": pack["family"], "kind": pack["kind"],
            "path": master_copy.relative_to(OUTPUT_ROOT).as_posix(), "generatedSource": str(master_source),
            "grid": {"columns": pack["columns"], "rows": pack["rows"]},
            "expectedCount": len(pack["names"]), "globalRange": [start_index, global_index],
            "sourceIds": source_ids, "dimensions": {"width": master.width, "height": master.height},
            "consumer": pack["consumer"], "layerBlend": pack["layerBlend"], "primaryRisk": pack["risk"],
            "chromaKeySelection": key_selection,
            "slicing": {
                "version": 2, "xBoundaries": boundary_plan(master.width, pack["columns"], audit.get("x", {}), shared_legacy_inset),
                "yBoundaries": boundary_plan(master.height, pack["rows"], audit.get("y", {}), shared_legacy_inset),
                "extraction": "component-centroid" if pack["id"] in COMPONENT_ROWS else "audited-grid",
                "sequenceNormalization": "row-union-alpha-bbox" if pack["rowGroups"] else "per-cell-alpha-bbox",
                "quarantineReason": QUARANTINE_MASTERS.get(pack["id"]),
            },
            "warnings": [], "sha256": V1.sha256_file(master_copy),
        })
        print(f"V2 sources {pack['id']}: {start_index:04d}-{global_index:04d}")
    if global_index != 1000:
        raise RuntimeError(f"Expected 1000 sources, got {global_index}")
    return masters, sources
def write_readmes() -> None:
    documents = {
        OUTPUT_ROOT / "readme.md": (
            "# High-impact review library v2\n\n"
            "Non-destructive replacement for v1 equal-grid slicing. It uses pixel-audited "
            "divider/corridor boundaries and row-union framing for sequences. Review-only; "
            "production may copy only explicitly approved IDs into a separate runtime pack.\n"
        ),
        OUTPUT_ROOT / "masters" / "readme.md": "Original ImageGen masters retained as immutable provenance.\n",
        OUTPUT_ROOT / "sources" / "readme.md": "Corrected canonical p00 candidates with exact masterPixelBounds metadata.\n",
        OUTPUT_ROOT / "derivatives" / "readme.md": "First-generation derivatives rebuilt only from corrected v2 sources.\n",
        OUTPUT_ROOT / "catalog" / "readme.md": "V2 visual QA catalogs. Quarantined sources are not production eligible.\n",
        OUTPUT_ROOT / "mockups" / "readme.md": "Offline placement composites only; never runtime-loaded.\n",
    }
    for path, text in documents.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-derivatives", action="store_true")
    parser.add_argument("--skip-catalog", action="store_true")
    parser.add_argument("--restart", action="store_true")
    arguments = parser.parse_args()
    validate_audit(AUDIT, V1.PACKS)
    preflight_master_chroma_keys(
        V1.PACKS, V1.GENERATED_ROOT, chroma=V1.CHROMA, visible_alpha=V1.VISIBLE_ALPHA
    )
    prepare_transaction(
        FINAL_OUTPUT_ROOT,
        OUTPUT_ROOT,
        restart=arguments.restart,
    )
    V1.build_sources = build_sources
    V1.write_readmes = write_readmes
    V1.build_all(
        skip_derivatives=arguments.skip_derivatives,
        skip_catalog=arguments.skip_catalog,
    )
    finalize_outputs(
        OUTPUT_ROOT,
        FINAL_OUTPUT_ROOT,
        ROOT,
        build_script=Path(__file__),
        audit_path=AUDIT_PATH,
        extraction_path=ROOT / "ai-tools" / "high_impact_v2_extraction.py",
        audit=AUDIT,
        cv2_version=cv2.__version__,
    )
if __name__ == "__main__":
    main()