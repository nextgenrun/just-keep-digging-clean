#!/usr/bin/env python3
"""Read-only pixel geometry audit for the 10K high-impact v2 review library."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
LIBRARY_ROOT = ROOT / "visual-approval-previews" / "2026-07-29-high-impact-review-library-v2"
OUTPUT_ROOT = ROOT / "visual-approval-previews" / "high-impact-v2-geometry-audit-2026-07-30"
CANVAS_SIZE = (320, 256)
EXPECTED_SOURCES = 1_000
EXPECTED_DERIVATIVES = 9_000
VISIBLE_ALPHA = 12
CORE_ALPHA = 64
P01_REVIEW = {
    "visibleAreaRetentionMin": 0.75,
    "bboxEdgeDeltaMaxPx": 8,
    "weightedCentroidShiftMaxPx": 0.25,
    "robustEdgeDeltaMaxPx": 1,
}
HARD_WEIGHTED_CENTROID_SHIFT_MAX_PX = 0.5
SEQUENCE_OUTLIER_FROM_MEDIAN_PX = 48
WATCH_GROUPS = ("m31-spike-warning-effect", "m23-wind-dust-gust")
EXPECTED_DERIVATIVE_PROFILES = {f"p{index:02d}" for index in range(1, 10)}


def rounded(value: float | None, digits: int = 4) -> float | None:
    return None if value is None else round(float(value), digits)


def repo_path(path: Path) -> str:
    try:
        return path.resolve().relative_to(ROOT.resolve()).as_posix()
    except ValueError:
        return str(path.resolve())


def mask_metrics(alpha: np.ndarray, threshold: int) -> dict[str, Any]:
    ys, xs = np.nonzero(alpha > threshold)
    if not len(xs):
        return {"pixels": 0, "bounds": None, "centroid": None, "y01": None, "y99": None}
    return {
        "pixels": int(len(xs)),
        "bounds": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
        "centroid": [rounded(xs.mean()), rounded(ys.mean())],
        "y01": rounded(np.percentile(ys, 1)),
        "y99": rounded(np.percentile(ys, 99)),
    }


def alpha_metrics(alpha: np.ndarray) -> dict[str, Any]:
    weights = alpha.astype(np.float64)
    total = float(weights.sum())
    columns, rows = weights.sum(axis=0), weights.sum(axis=1)
    weighted = None if total == 0 else [
        rounded(np.dot(columns, np.arange(alpha.shape[1])) / total),
        rounded(np.dot(rows, np.arange(alpha.shape[0])) / total),
    ]
    return {
        "supportPixels": int(np.count_nonzero(alpha)),
        "visible": mask_metrics(alpha, VISIBLE_ALPHA),
        "core": mask_metrics(alpha, CORE_ALPHA),
        "weightedCentroid": weighted,
    }


def distance(first: list[float] | None, second: list[float] | None) -> dict[str, float] | None:
    if first is None or second is None:
        return None
    dx, dy = second[0] - first[0], second[1] - first[1]
    return {"dx": rounded(dx), "dy": rounded(dy), "distance": rounded(np.hypot(dx, dy))}


def delta(first: float | None, second: float | None) -> float | None:
    return None if first is None or second is None else rounded(second - first)


def bbox_delta(first: list[int] | None, second: list[int] | None) -> list[int] | None:
    return None if first is None or second is None else [b - a for a, b in zip(first, second)]


def read_alpha(path: Path) -> tuple[dict[str, Any], np.ndarray | None]:
    if not path.exists():
        return {"exists": False}, None
    try:
        with Image.open(path) as image:
            info = {"exists": True, "format": image.format, "mode": image.mode, "size": list(image.size)}
            alpha = np.asarray(image.getchannel("A"), dtype=np.uint8).copy() if image.mode == "RGBA" else None
        return info, alpha
    except Exception as error:  # Audit evidence must retain decode failures.
        return {"exists": True, "decodeError": f"{type(error).__name__}: {error}"}, None


def distribution(values: list[float]) -> dict[str, float | int | None]:
    if not values:
        return {"count": 0, "min": None, "p50": None, "p95": None, "p99": None, "max": None}
    data = np.asarray(values, dtype=np.float64)
    return {
        "count": len(values),
        "min": rounded(data.min()),
        "p50": rounded(np.percentile(data, 50)),
        "p95": rounded(np.percentile(data, 95)),
        "p99": rounded(np.percentile(data, 99)),
        "max": rounded(data.max()),
    }


def sequence_record(group: dict[str, Any], sources: dict[str, dict[str, Any]], metrics: dict[str, Any]) -> dict[str, Any]:
    frames = [sources[source_id] for source_id in group["sourceIds"] if source_id in sources and source_id in metrics]
    ids = [frame["id"] for frame in frames]
    frame_metrics = [metrics[source_id] for source_id in ids]
    y01 = [item["visible"]["y01"] for item in frame_metrics]
    y99 = [item["visible"]["y99"] for item in frame_metrics]
    bottoms = [item["visible"]["bounds"][3] for item in frame_metrics]
    weighted_x = [item["weightedCentroid"][0] for item in frame_metrics]
    weighted_y = [item["weightedCentroid"][1] for item in frame_metrics]

    def series_summary(values: list[float]) -> dict[str, Any]:
        median = float(np.median(values))
        deviations = [abs(value - median) for value in values]
        index = int(np.argmax(deviations))
        return {
            "values": [rounded(value) for value in values],
            "rangePx": rounded(max(values) - min(values)),
            "median": rounded(median),
            "largestOutlier": {
                "sourceId": ids[index],
                "deltaFromMedianPx": rounded(values[index] - median),
            },
        }

    generic_anchor = all(
        frame.get("pivot") == {"x": 0.5, "y": 0.5}
        and frame.get("contactAnchor") == {"x": 0.5, "y": 0.5}
        for frame in frames
    )
    result = {
        "id": group["id"],
        "masterId": group["masterId"],
        "label": group["label"],
        "kind": group["kind"],
        "frameIds": ids,
        "family": frames[0]["family"] if frames else None,
        "genericCenterAnchorOnly": generic_anchor,
        "visibleBottom": series_summary(bottoms),
        "robustY01": series_summary(y01),
        "robustY99": series_summary(y99),
        "weightedCentroidRangePx": {
            "x": rounded(max(weighted_x) - min(weighted_x)),
            "y": rounded(max(weighted_y) - min(weighted_y)),
        },
    }
    reasons: list[str] = []
    if abs(result["robustY99"]["largestOutlier"]["deltaFromMedianPx"]) >= SEQUENCE_OUTLIER_FROM_MEDIAN_PX:
        reasons.append("large-ground-edge-frame-outlier")
    if abs(result["robustY01"]["largestOutlier"]["deltaFromMedianPx"]) >= SEQUENCE_OUTLIER_FROM_MEDIAN_PX:
        reasons.append("large-ceiling-edge-frame-outlier")
    result["priorityReviewReasons"] = reasons
    return result


def audit(library_root: Path) -> dict[str, Any]:
    manifest_path = library_root / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    sources = {item["id"]: item for item in manifest["sources"]}
    derivatives_by_source: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)
    hard_failures: list[dict[str, Any]] = []
    profile_results = {
        f"p{index:02d}": {"checked": 0, "supportMismatches": 0, "alphaMismatches": 0}
        for index in range(1, 10)
    }

    def fail(kind: str, asset_id: str, path: str, detail: Any) -> None:
        hard_failures.append({"kind": kind, "assetId": asset_id, "path": path, "detail": detail})

    if len(sources) != len(manifest["sources"]):
        fail("duplicate-source-id", "manifest", "manifest.json", len(manifest["sources"]) - len(sources))
    if len(manifest["sources"]) != EXPECTED_SOURCES:
        fail("source-count", "manifest", "manifest.json", len(manifest["sources"]))
    if len(manifest["derivatives"]) != EXPECTED_DERIVATIVES:
        fail("derivative-count", "manifest", "manifest.json", len(manifest["derivatives"]))
    for item in manifest["derivatives"]:
        profile = item["profileSlug"].split("-", 1)[0]
        if item["sourceId"] not in sources:
            fail("unknown-derivative-source", item["id"], item["path"], item["sourceId"])
            continue
        if profile not in EXPECTED_DERIVATIVE_PROFILES:
            fail("unexpected-derivative-profile", item["id"], item["path"], profile)
            continue
        if profile in derivatives_by_source[item["sourceId"]]:
            fail("duplicate-derivative-profile", item["id"], item["path"], profile)
        derivatives_by_source[item["sourceId"]][profile] = item

    source_metrics: dict[str, Any] = {}
    p01_records: list[dict[str, Any]] = []
    for source in sorted(manifest["sources"], key=lambda item: item["globalIndex"]):
        source_path = library_root / source["path"]
        info, source_alpha = read_alpha(source_path)
        if info.get("format") != "PNG" or info.get("mode") != "RGBA" or info.get("size") != list(CANVAS_SIZE) or source_alpha is None:
            fail("invalid-source-png", source["id"], source["path"], info)
            continue
        if not np.any(source_alpha):
            fail("empty-source-alpha", source["id"], source["path"], info)
            continue
        stats = alpha_metrics(source_alpha)
        if stats["visible"]["bounds"] is None:
            fail("no-source-alpha-over-visible-threshold", source["id"], source["path"], VISIBLE_ALPHA)
            continue
        source_metrics[source["id"]] = stats
        derivative_profiles = derivatives_by_source.get(source["id"], {})
        missing_profiles = sorted(EXPECTED_DERIVATIVE_PROFILES - set(derivative_profiles))
        if missing_profiles:
            fail("missing-derivative-profiles", source["id"], source["path"], missing_profiles)
        for profile, derivative in sorted(derivative_profiles.items()):
            profile_results.setdefault(profile, {"checked": 0, "supportMismatches": 0, "alphaMismatches": 0})
            profile_results[profile]["checked"] += 1
            info, derivative_alpha = read_alpha(library_root / derivative["path"])
            if info.get("format") != "PNG" or info.get("mode") != "RGBA" or info.get("size") != list(CANVAS_SIZE) or derivative_alpha is None:
                fail("invalid-derivative-png", derivative["id"], derivative["path"], info)
                continue
            if not np.any(derivative_alpha):
                fail("empty-derivative-alpha", derivative["id"], derivative["path"], info)
            support_equal = np.array_equal(source_alpha > 0, derivative_alpha > 0)
            if not support_equal:
                profile_results[profile]["supportMismatches"] += 1
                fail("support-mask-mismatch", derivative["id"], derivative["path"], profile)
            if profile != "p01":
                if not np.array_equal(source_alpha, derivative_alpha):
                    profile_results[profile]["alphaMismatches"] += 1
                    fail("unexpected-alpha-mismatch", derivative["id"], derivative["path"], profile)
                continue
            source_stats, derived_stats = source_metrics[source["id"]], alpha_metrics(derivative_alpha)
            weighted_shift = distance(source_stats["weightedCentroid"], derived_stats["weightedCentroid"])
            if weighted_shift and weighted_shift["distance"] > HARD_WEIGHTED_CENTROID_SHIFT_MAX_PX:
                fail("p01-weighted-centroid-shift", derivative["id"], derivative["path"], weighted_shift)
            visible, changed = source_stats["visible"], derived_stats["visible"]
            edge_delta = bbox_delta(visible["bounds"], changed["bounds"])
            area_ratio = changed["pixels"] / visible["pixels"] if visible["pixels"] else 0.0
            visible_mask_equal = np.array_equal(source_alpha > VISIBLE_ALPHA, derivative_alpha > VISIBLE_ALPHA)
            record = {
                "sourceId": source["id"], "masterId": source["masterId"], "family": source["family"],
                "sequenceGroup": source["sequenceGroup"],
                "classification": (
                    "support-change" if not support_equal
                    else "threshold-identical" if visible_mask_equal
                    else "threshold-only-change"
                ),
                "sourceVisibleBounds": visible["bounds"], "p01VisibleBounds": changed["bounds"],
                "bboxEdgeDeltaPx": edge_delta, "visibleBottomDeltaPx": None if edge_delta is None else edge_delta[3],
                "robustY01DeltaPx": delta(visible["y01"], changed["y01"]),
                "robustY99DeltaPx": delta(visible["y99"], changed["y99"]),
                "visibleAreaRetention": rounded(area_ratio),
                "visibleCentroidDelta": distance(visible["centroid"], changed["centroid"]),
                "alphaWeightedCentroidDelta": weighted_shift,
                "visibleBoundsChanged": visible["bounds"] != changed["bounds"],
                "coreBoundsChanged": source_stats["core"]["bounds"] != derived_stats["core"]["bounds"],
            }
            max_edge = max(abs(value) for value in edge_delta) if edge_delta else 0
            record["reviewReasons"] = [
                reason for condition, reason in (
                    (area_ratio < P01_REVIEW["visibleAreaRetentionMin"], "visible-area-retention"),
                    (max_edge > P01_REVIEW["bboxEdgeDeltaMaxPx"], "threshold-bbox-edge"),
                    (weighted_shift is not None and weighted_shift["distance"] > P01_REVIEW["weightedCentroidShiftMaxPx"], "weighted-centroid"),
                    (abs(record["robustY01DeltaPx"] or 0) > P01_REVIEW["robustEdgeDeltaMaxPx"], "robust-ceiling-edge"),
                    (abs(record["robustY99DeltaPx"] or 0) > P01_REVIEW["robustEdgeDeltaMaxPx"], "robust-ground-edge"),
                ) if condition
            ]
            p01_records.append(record)

    sequences = [
        sequence_record(group, sources, source_metrics)
        for group in manifest["sequenceGroups"]
        if all(source_id in source_metrics for source_id in group["sourceIds"])
    ]
    priority_sequences = [item for item in sequences if item["priorityReviewReasons"]]
    p01_changes = [item for item in p01_records if item["classification"] == "threshold-only-change"]
    mining_records = [item for item in p01_records if item["family"] == "mining-fx"]
    weighted_shifts = [item["alphaWeightedCentroidDelta"]["distance"] for item in p01_records]
    area_ratios = [item["visibleAreaRetention"] for item in p01_records]
    p01_outliers = [item for item in p01_records if item["reviewReasons"]]
    return {
        "schemaVersion": 1,
        "auditDate": "2026-07-30",
        "classification": "geometry-invariants-pass-anchor-review-required" if not hard_failures else "geometry-invariants-fail",
        "passedHardGeometryGate": not hard_failures,
        "scope": {
            "libraryRoot": repo_path(library_root),
            "manifest": repo_path(manifest_path),
            "manifestSha256": hashlib.sha256(manifest_path.read_bytes()).hexdigest(),
            "sourceCount": len(manifest["sources"]),
            "derivativeCount": len(manifest["derivatives"]),
            "totalPngCount": len(manifest["sources"]) + len(manifest["derivatives"]),
        },
        "gate": {
            "hard": {
                "canvas": {"mode": "RGBA", "width": CANVAS_SIZE[0], "height": CANVAS_SIZE[1]},
                "nonzeroSupportMask": "each derivative must be pixel-identical to its p00 source",
                "p02ThroughP09Alpha": "alpha bytes must be pixel-identical to p00",
                "p01AlphaWeightedCentroidShiftMaxPx": HARD_WEIGHTED_CENTROID_SHIFT_MAX_PX,
            },
            "p01Review": P01_REVIEW,
            "sequenceReview": {
                "requiresAnchorMode": ["ground", "ceiling", "center", "free-motion"],
                "outlierFromMedianPx": SEQUENCE_OUTLIER_FROM_MEDIAN_PX,
            },
        },
        "hardFailures": sorted(hard_failures, key=lambda item: (item["kind"], item["assetId"])),
        "profileResults": profile_results,
        "p01ThresholdClassification": {
            "checked": profile_results["p01"]["checked"],
            "thresholdIdenticalCount": sum(item["classification"] == "threshold-identical" for item in p01_records),
            "thresholdOnlyChangeCount": len(p01_changes),
            "supportChangeCount": sum(item["classification"] == "support-change" for item in p01_records),
            "visibleBBoxChangedCount": sum(item["visibleBoundsChanged"] for item in p01_records),
            "visibleBottomChangedCount": sum((item["visibleBottomDeltaPx"] or 0) != 0 for item in p01_records),
            "coreBBoxChangedCount": sum(item["coreBoundsChanged"] for item in p01_records),
            "visibleAreaRetention": distribution(area_ratios),
            "alphaWeightedCentroidShiftPx": distribution(weighted_shifts),
            "reviewOutlierCount": len(p01_outliers),
            "thresholdOnlyChanges": p01_changes,
            "reviewOutliers": p01_outliers,
        },
        "miningGroundPriority": {
            "sourceCount": sum(item["family"] == "mining-fx" for item in manifest["sources"]),
            "p01ThresholdChangeCount": sum(item["classification"] == "threshold-only-change" for item in mining_records),
            "visibleBBoxChangedCount": sum(item["visibleBoundsChanged"] for item in mining_records),
            "visibleBottomChangedCount": sum((item["visibleBottomDeltaPx"] or 0) != 0 for item in mining_records),
            "robustY99DeltaOverOneCount": sum(abs(item["robustY99DeltaPx"] or 0) > 1 for item in mining_records),
            "reviewOutliers": [item for item in mining_records if item["reviewReasons"]],
            "sequenceMetrics": [item for item in sequences if item["family"] == "mining-fx"],
        },
        "sourceSequenceAnchorRisk": {
            "groupCount": len(sequences),
            "genericCenterAnchorOnlyCount": sum(item["genericCenterAnchorOnly"] for item in sequences),
            "priorityRiskCount": len(priority_sequences),
            "watchGroups": [item for item in sequences if item["id"] in WATCH_GROUPS],
            "priorityRisks": priority_sequences,
            "allSequenceMetrics": sequences,
        },
        "interpretation": [
            "p01 threshold-only changes preserve nonzero support and therefore do not indicate slice movement.",
            "Raw sequence bottom or centroid range is not a universal failure because many effects intentionally travel.",
            "Generic center anchors cannot distinguish planted, ceiling, centered, and free-motion sequences.",
            "This geometry gate does not clear quarantined or rejected source artwork.",
        ],
    }


def markdown(report: dict[str, Any]) -> str:
    p01 = report["p01ThresholdClassification"]
    mining = report["miningGroundPriority"]
    sequence = report["sourceSequenceAnchorRisk"]
    lines = [
        "# High-impact v2 10K geometry audit — 2026-07-30", "",
        "## Verdict", "",
        f"**{report['classification']}.** The hard geometry gate is "
        f"{'PASS' if report['passedHardGeometryGate'] else 'FAIL'} with "
        f"{len(report['hardFailures'])} hard failure(s). This is audit evidence only; no image, manifest, runtime, or gameplay value was rewritten.",
        "", "## Hard invariants", "",
        "| Check | Result |", "|---|---|",
        f"| Actual PNG inventory | {report['scope']['totalPngCount']:,} ({report['scope']['sourceCount']:,} p00 + {report['scope']['derivativeCount']:,} derivatives) |",
        f"| RGBA 320×256 decode | {'PASS' if not any('png' in item['kind'] for item in report['hardFailures']) else 'FAIL'} |",
        f"| Nonzero support equality | {sum(item['supportMismatches'] for item in report['profileResults'].values())} mismatches |",
        f"| p02–p09 alpha-byte equality | {sum(report['profileResults'][f'p{i:02d}']['alphaMismatches'] for i in range(2, 10))} mismatches |",
        f"| p01 weighted-centroid hard gate | max {p01['alphaWeightedCentroidShiftPx']['max']} px; limit {HARD_WEIGHTED_CENTROID_SHIFT_MAX_PX} px |",
        "", "## p01 restrained-alpha classification", "",
        f"p01 has {p01['thresholdOnlyChangeCount']} threshold-only changes and {p01['thresholdIdenticalCount']} threshold-identical frames. "
        "A threshold-only change means alpha > 12 changed while the alpha > 0 support mask stayed pixel-identical; it is not a slice move.",
        "",
        f"- Visible-bounds threshold changes: {p01['visibleBBoxChangedCount']}",
        f"- Visible-bottom threshold changes: {p01['visibleBottomChangedCount']}",
        f"- Core-box threshold changes: {p01['coreBBoxChangedCount']}",
        f"- Review outliers: {p01['reviewOutlierCount']}",
        f"- Visible-area retention: minimum {p01['visibleAreaRetention']['min']}, median {p01['visibleAreaRetention']['p50']}",
        f"- Alpha-weighted centroid shift: p95 {p01['alphaWeightedCentroidShiftPx']['p95']} px, p99 {p01['alphaWeightedCentroidShiftPx']['p99']} px",
        "", "### Largest p01 threshold-box changes", "",
        "| Source | Master | Edge delta L/T/R/B px | Area retained | Weighted shift px | Robust y99 delta px |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    top_changes = sorted(
        p01["thresholdOnlyChanges"],
        key=lambda item: max(abs(value) for value in item["bboxEdgeDeltaPx"] or [0]),
        reverse=True,
    )[:12]
    for item in top_changes:
        lines.append(
            f"| `{item['sourceId']}` | {item['masterId']} | {item['bboxEdgeDeltaPx']} | "
            f"{item['visibleAreaRetention']} | {item['alphaWeightedCentroidDelta']['distance']} | {item['robustY99DeltaPx']} |"
        )
    lines += [
        "", "## Mining and ground-damage priority", "",
        f"{mining['sourceCount']} mining sources were scanned. p01 changed the >12 threshold mask on "
        f"{mining['p01ThresholdChangeCount']}; {mining['visibleBBoxChangedCount']} changed visible bounds and "
        f"{mining['visibleBottomChangedCount']} changed the exact bottom, but **{mining['robustY99DeltaOverOneCount']} changed the robust y99 ground edge by more than 1 px**.",
        "", "## Source-sequence anchor risks", "",
        f"{sequence['genericCenterAnchorOnlyCount']}/{sequence['groupCount']} sequence groups expose only the generic "
        "`pivot/contactAnchor = {0.5, 0.5}` metadata. Source-frame motion therefore remains review-only until an explicit "
        "`ground`, `ceiling`, `center`, or `free-motion` anchor mode is authored.",
        "", "| Watch group | Frame IDs | Robust y99 values | Largest ground-edge outlier |",
        "|---|---|---:|---|",
    ]
    for item in sequence["watchGroups"]:
        outlier = item["robustY99"]["largestOutlier"]
        lines.append(
            f"| `{item['id']}` | {', '.join(f'`{source_id}`' for source_id in item['frameIds'])} | "
            f"{item['robustY99']['values']} | `{outlier['sourceId']}` ({outlier['deltaFromMedianPx']:+} px from median) |"
        )
    lines += [
        "", "## Deterministic pre-wiring rule", "",
        "1. Hard-fail any non-RGBA/320×256 file, empty alpha, nonzero-support mismatch, p02–p09 alpha mismatch, or p01 weighted-centroid shift over 0.5 px.",
        "2. Review p01 when visible area falls below 0.75, a threshold-box edge moves over 8 px, weighted centroid moves over 0.25 px, or robust y01/y99 moves over 1 px.",
        "3. Add explicit sequence `anchorMode` and anchor-line metadata before interpreting source-frame travel as planted or intentional.",
        "4. Keep quarantined/rejected source-master decisions separate; a green geometry audit does not approve their artwork.",
        "", "## Reproduce", "",
        "```powershell",
        "python ai-tools/2026-07-30-audit-high-impact-v2-geometry.py",
        "```", "",
        f"Scanned manifest SHA-256: `{report['scope']['manifestSha256']}`", "",
    ]
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--library-root", type=Path, default=LIBRARY_ROOT)
    parser.add_argument("--output-root", type=Path, default=OUTPUT_ROOT)
    parser.add_argument("--check-only", action="store_true", help="Scan and print JSON without writing evidence.")
    arguments = parser.parse_args()
    report = audit(arguments.library_root.resolve())
    if arguments.check_only:
        print(json.dumps(report, indent=2))
    else:
        arguments.output_root.mkdir(parents=True, exist_ok=True)
        json_path = arguments.output_root / "2026-07-30-high-impact-v2-geometry-audit.json"
        md_path = arguments.output_root / "2026-07-30-high-impact-v2-geometry-audit.md"
        json_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        md_path.write_text(markdown(report), encoding="utf-8")
        print(f"Wrote {repo_path(json_path)}")
        print(f"Wrote {repo_path(md_path)}")
        print(f"Hard geometry gate: {'PASS' if report['passedHardGeometryGate'] else 'FAIL'}")
    if not report["passedHardGeometryGate"]:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
