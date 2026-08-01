"""Validation, provenance, and transactional publication for v2 builds."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import shutil
from typing import Any

import numpy as np
from PIL import Image


ALLOWED_BOUNDARY_KINDS = {"chroma-corridor", "explicit-divider"}
EXPECTED_MASTER_CHROMA_OVERRIDES = frozenset({"m20", "m32"})
MAX_OVERRIDE_CHROMA_RESIDUAL_FRACTION = 0.15


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

def preflight_master_chroma_keys(
    packs: list[dict[str, Any]],
    generated_root: Path,
    *,
    chroma: Any,
    visible_alpha: int,
) -> dict[str, Any]:
    """Prove only audited neutral-border masters override their sampled key."""
    from high_impact_v2_extraction import (
        remove_chroma_with_key,
        select_master_chroma_key,
        strong_chroma_mask,
    )

    changed: set[str] = set()
    results: dict[str, Any] = {}
    for pack in packs:
        master_id = pack["id"]
        source = generated_root / pack["generatedFile"]
        with Image.open(source) as loaded:
            master = loaded.convert("RGBA")
        sampled = tuple(chroma._sample_border_key(master, "border"))
        selected, selection = select_master_chroma_key(master, sampled)
        if selected != sampled:
            changed.add(master_id)
        if master_id not in EXPECTED_MASTER_CHROMA_OVERRIDES:
            if selected != sampled:
                raise RuntimeError(f"Unexpected master chroma override: {master_id}")
            results[master_id] = selection
            continue
        if selected == sampled or not selection["override"]:
            raise RuntimeError(f"Expected master chroma override missing: {master_id}")
        family = selection["selectedFamily"]
        candidate_mask = strong_chroma_mask(master, family)
        keyed, warnings = remove_chroma_with_key(
            master,
            selected,
            chroma,
            visible_alpha,
        )
        alpha = np.asarray(keyed.getchannel("A"), dtype=np.uint8)
        candidate_count = int(np.count_nonzero(candidate_mask))
        residual_count = int(np.count_nonzero(candidate_mask & (alpha > visible_alpha)))
        residual_fraction = residual_count / max(1, candidate_count)
        selection["preflight"] = {
            "candidatePixels": candidate_count,
            "residualVisiblePixels": residual_count,
            "residualFraction": round(residual_fraction, 6),
            "warnings": warnings,
        }
        if residual_fraction > MAX_OVERRIDE_CHROMA_RESIDUAL_FRACTION:
            raise RuntimeError(
                f"Master chroma override left too much key color: "
                f"{master_id}:{residual_fraction:.4f}"
            )
        results[master_id] = selection
    if changed != EXPECTED_MASTER_CHROMA_OVERRIDES:
        raise RuntimeError(
            f"Master chroma override set drifted: {sorted(changed)}"
        )
    return {
        "overrideIds": sorted(changed),
        "retainedBorderKeyCount": len(results) - len(changed),
        "masters": results,
    }


def validate_audit(audit: dict[str, Any], packs: list[dict[str, Any]]) -> None:
    """Reject malformed or out-of-taxonomy audit instructions before writes."""
    pack_by_id = {pack["id"]: pack for pack in packs}
    if int(audit["edgeSafetyPx"]) < 0 or int(audit["unionPaddingPx"]) < 0:
        raise RuntimeError("Audit padding values must be non-negative")
    close_px = int(audit["componentClosePx"])
    if close_px <= 0 or close_px % 2 == 0:
        raise RuntimeError("componentClosePx must be positive and odd")
    for master_id, axes in audit["boundaries"].items():
        pack = pack_by_id.get(master_id)
        if not pack:
            raise RuntimeError(f"Unknown audited master: {master_id}")
        for axis, boundaries in axes.items():
            if axis not in {"x", "y"}:
                raise RuntimeError(f"Unknown audit axis: {master_id}:{axis}")
            count = pack["columns"] if axis == "x" else pack["rows"]
            previous_end = -1
            for ordinal_text, value in sorted(
                boundaries.items(),
                key=lambda item: int(item[0]),
            ):
                ordinal = int(ordinal_text)
                if not (1 <= ordinal < count):
                    raise RuntimeError(
                        f"Boundary ordinal out of range: {master_id}:{axis}:{ordinal}"
                    )
                if len(value) != 3 or value[2] not in ALLOWED_BOUNDARY_KINDS:
                    raise RuntimeError(
                        f"Invalid boundary value: {master_id}:{axis}:{ordinal}"
                    )
                start, end = int(value[0]), int(value[1])
                if start < 0 or end < start or start <= previous_end:
                    raise RuntimeError(
                        f"Non-monotonic boundary: {master_id}:{axis}:{ordinal}"
                    )
                previous_end = end
    for master_id, rows in audit["componentRows"].items():
        pack = pack_by_id.get(master_id)
        if not pack or len(rows) != pack["rows"]:
            raise RuntimeError(f"Invalid component row count: {master_id}")
        previous_end = -1
        for start, end in rows:
            if start < 0 or end <= start or start < previous_end:
                raise RuntimeError(f"Invalid component row band: {master_id}")
            previous_end = end
    for pack in packs:
        if len(pack["names"]) != pack["columns"] * pack["rows"]:
            raise RuntimeError(f"Grid/name mismatch: {pack['id']}")
        group_rows = [group["row"] for group in pack["rowGroups"]]
        if len(group_rows) != len(set(group_rows)):
            raise RuntimeError(f"Duplicate sequence row: {pack['id']}")
        for group in pack["rowGroups"]:
            if group["frameCount"] != pack["columns"]:
                raise RuntimeError(f"Sequence width mismatch: {pack['id']}:{group['id']}")


def prepare_transaction(
    final_root: Path,
    staging_root: Path,
    *,
    restart: bool,
) -> None:
    if final_root.exists():
        raise RuntimeError(f"Refusing to overwrite completed v2 output: {final_root}")
    if not staging_root.exists():
        return
    if not restart:
        raise RuntimeError(
            f"Staging output exists; inspect it or rerun with --restart: {staging_root}"
        )
    expected_name = f".{final_root.name}.staging"
    if staging_root.parent != final_root.parent or staging_root.name != expected_name:
        raise RuntimeError(f"Unsafe staging target: {staging_root}")
    shutil.rmtree(staging_root)


def propagate_derivative_approval_statuses(
    manifest: dict[str, Any],
) -> dict[str, dict[str, int]]:
    """Make every derivative inherit its source's exact approval status."""
    source_status: dict[str, str] = {}
    children: dict[str, list[dict[str, Any]]] = {}
    for source in manifest["sources"]:
        source_id = source["id"]
        if source_id in source_status:
            raise RuntimeError(f"Duplicate source id: {source_id}")
        source_status[source_id] = source["approvalStatus"]
        children[source_id] = []
    for derivative in manifest["derivatives"]:
        source_id = derivative["sourceId"]
        if source_id not in source_status:
            raise RuntimeError(f"Derivative references unknown source: {source_id}")
        derivative["approvalStatus"] = source_status[source_id]
        children[source_id].append(derivative)
    if manifest["derivatives"]:
        for source_id, descendants in children.items():
            if len(descendants) != 9:
                raise RuntimeError(
                    f"Derivative child count mismatch: {source_id}:{len(descendants)}"
                )
    for derivative in manifest["derivatives"]:
        expected = source_status[derivative["sourceId"]]
        if derivative["approvalStatus"] != expected:
            raise RuntimeError(f"Derivative status drift: {derivative['id']}")
        if expected != "pending" and derivative["approvalStatus"] == "pending":
            raise RuntimeError(f"Unsafe pending derivative: {derivative['id']}")
    status_counts: dict[str, dict[str, int]] = {
        "sources": {},
        "derivatives": {},
    }
    for source in manifest["sources"]:
        status = source["approvalStatus"]
        status_counts["sources"][status] = (
            status_counts["sources"].get(status, 0) + 1
        )
    for derivative in manifest["derivatives"]:
        status = derivative["approvalStatus"]
        status_counts["derivatives"][status] = (
            status_counts["derivatives"].get(status, 0) + 1
        )
    return status_counts

def finalize_outputs(
    staging_root: Path,
    final_root: Path,
    project_root: Path,
    *,
    build_script: Path,
    audit_path: Path,
    extraction_path: Path,
    audit: dict[str, Any],
    cv2_version: str,
) -> None:
    manifest_path = staging_root / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    status_counts = propagate_derivative_approval_statuses(manifest)
    manifest["schemaVersion"] = 2
    manifest["supersedes"] = "2026-07-29-high-impact-review-library-v1"
    manifest["reviewBoundary"]["root"] = final_root.relative_to(project_root).as_posix()
    manifest["slicingAudit"] = {
        "equalGridAssumptionRejected": True,
        "retainedFallbackRule": (
            "Equal v1 boundaries remain only where the 41-master projection audit "
            "found no drift; their exact v1 shared inset is preserved."
        ),
        "algorithm": (
            "audited dividers/corridors, master-key chroma, component-centroid UI "
            "assignment, master-space clipping gates, and row-union sequence framing"
        ),
        "statusCounts": status_counts,
        "config": audit,
        "files": {
            "audit": {
                "path": audit_path.relative_to(project_root).as_posix(),
                "sha256": sha256_file(audit_path),
            },
            "extraction": {
                "path": extraction_path.relative_to(project_root).as_posix(),
                "sha256": sha256_file(extraction_path),
                "opencv": cv2_version,
            },
        },
    }
    manifest["build"]["script"] = build_script.relative_to(project_root).as_posix()
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    report_path = staging_root / "build-report.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    report["manifest"] = (
        final_root / "manifest.json"
    ).relative_to(project_root).as_posix()
    report["slicingAudit"] = manifest["slicingAudit"]
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if not manifest["qaSummary"]["passed"]:
        raise RuntimeError("Refusing to publish a v2 manifest with failed QA")
    staging_root.replace(final_root)
