from __future__ import annotations

from datetime import datetime
from typing import Any

from piskel_artifacts import (
    write_alignment_overlay,
    write_artifacts,
    write_contact_sheet,
)
from piskel_document import (
    MANIFEST_PATH,
    derived_artifact_paths,
    ensure_parent,
    load_runtime_frames,
    make_piskel,
    read_piskel,
    rel_path,
    repo_path,
    save_runtime_frames,
    write_json,
)
from piskel_frame_polish import analyze_frames, drift_summary, polish_frames


def _append_policy_findings(
    errors: list[str],
    warnings: list[str],
    policy: dict[str, Any],
    stats: list[dict[str, Any]],
) -> dict[str, Any]:
    drift = drift_summary(stats)
    max_anchor_drift = policy.get("maxAnchorDriftPx")
    if max_anchor_drift is not None and drift["maxAnchorDriftPx"] > float(max_anchor_drift):
        message = (
            f"{drift['anchorMode']} drift {drift['maxAnchorDriftPx']:.2f}px "
            f"exceeds {max_anchor_drift}px"
        )
        (errors if policy.get("enforceAnchor") else warnings).append(message)
    bottom_target = policy.get("bottomY")
    bottom_tolerance = int(policy.get("bottomTolerancePx", 2))
    if bottom_target is not None:
        for stat in stats:
            bottom = stat.get("bottom")
            if bottom is None or abs(int(bottom) - int(bottom_target)) <= bottom_tolerance:
                continue
            message = f"frame {stat['frame']} bottom {bottom} differs from target {bottom_target}"
            (errors if policy.get("enforceBottom") else warnings).append(message)
    return drift


def validate_piskel_frames(
    entry: dict[str, Any],
    frames: list,
    width: int,
    height: int,
    fps: int,
    source_label: str | None = None,
    enforce_policy: bool = True,
) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    expected_size = tuple(entry["frameSize"])
    if (width, height) != expected_size:
        errors.append(f"frame size is {[width, height]}, expected {entry['frameSize']}")
    if len(frames) != int(entry["frameCount"]):
        errors.append(f"frame count is {len(frames)}, expected {entry['frameCount']}")
    if int(fps) != int(entry["fps"]):
        warnings.append(f"Piskel fps is {fps}, runtime fps is {entry['fps']}")
    for index, frame in enumerate(frames):
        if frame.size != expected_size:
            errors.append(f"frame {index} is {list(frame.size)}, expected {entry['frameSize']}")
    policy = entry.get("centeringPolicy") or {}
    stats = analyze_frames(frames, policy)
    if enforce_policy:
        drift = _append_policy_findings(errors, warnings, policy, stats)
    else:
        drift = drift_summary(stats)
    return {
        "id": entry["id"],
        "ok": not errors,
        "source": source_label,
        "errors": errors,
        "warnings": warnings,
        "frameCount": len(frames),
        "frameSize": [width, height],
        "fps": fps,
        "anchorMode": drift["anchorMode"],
        "maxCenterDriftPx": drift["maxAnchorDriftPx"],
        "maxBBoxCenterDriftPx": drift["maxBBoxCenterDriftPx"],
        "maxRootAnchorDriftPx": drift["maxRootAnchorDriftPx"],
        "maxBottomDriftPx": drift["maxBottomDriftPx"],
        "medianBBoxHeightPx": drift["medianBBoxHeightPx"],
    }


def validate_entries(entries: list[dict[str, Any]]) -> dict[str, Any]:
    results = []
    for entry in entries:
        try:
            path = repo_path(entry["sourcePiskel"])
            frames, width, height, fps = read_piskel(path)
            results.append(validate_piskel_frames(entry, frames, width, height, fps, entry["sourcePiskel"]))
        except Exception as error:
            results.append({"id": entry["id"], "ok": False, "errors": [str(error)], "warnings": []})
    return {"ok": all(result["ok"] for result in results), "results": results}


def import_entries(entries: list[dict[str, Any]]) -> dict[str, Any]:
    imported = []
    for entry in entries:
        frames = load_runtime_frames(entry, import_source=True)
        path = repo_path(entry["sourcePiskel"])
        ensure_parent(path)
        write_json(path, make_piskel(entry, frames))
        artifacts = write_artifacts(entry, frames)
        imported.append({
            "id": entry["id"],
            "sourcePiskel": entry["sourcePiskel"],
            "frameCount": len(frames),
            "artifacts": artifacts,
        })
    return {"ok": True, "imported": imported}


def export_entries(entries: list[dict[str, Any]]) -> dict[str, Any]:
    exported = []
    for entry in entries:
        path = repo_path(entry["sourcePiskel"])
        if not path.is_file():
            raise FileNotFoundError(rel_path(path))
        frames, width, height, fps = read_piskel(path)
        validation = validate_piskel_frames(entry, frames, width, height, fps, entry["sourcePiskel"])
        if not validation["ok"]:
            raise ValueError(f"{entry['id']} validation failed: {'; '.join(validation['errors'])}")
        runtime_info = save_runtime_frames(entry, frames)
        artifacts = write_artifacts(entry, frames, runtime_info)
        exported.append({
            "id": entry["id"],
            "fps": fps,
            "validation": validation,
            "runtimeOutputs": runtime_info["outputs"],
            "frameCount": len(frames),
            "artifacts": artifacts,
        })
    return {"ok": True, "exported": exported}


def build_previews(entries: list[dict[str, Any]]) -> dict[str, Any]:
    built = []
    for entry in entries:
        path = repo_path(entry["sourcePiskel"])
        frames, width, height, fps = read_piskel(path)
        validation = validate_piskel_frames(entry, frames, width, height, fps, entry["sourcePiskel"])
        if not validation["ok"]:
            raise ValueError(f"{entry['id']} validation failed: {'; '.join(validation['errors'])}")
        artifacts = write_artifacts(entry, frames)
        built.append({"id": entry["id"], "frameCount": len(frames), "validation": validation, "artifacts": artifacts})
    return {"ok": True, "previewed": built}


def auto_align_entry(entry: dict[str, Any]) -> dict[str, Any]:
    policy = entry.get("centeringPolicy") or {}
    if not entry.get("autoAlign") and not policy.get("normalize"):
        return {"id": entry["id"], "ok": True, "skipped": True, "reason": "normalization is not enabled"}
    path = repo_path(entry["sourcePiskel"])
    frames, width, height, fps = read_piskel(path)
    structural = validate_piskel_frames(
        entry, frames, width, height, fps, entry["sourcePiskel"], enforce_policy=False,
    )
    if not structural["ok"]:
        raise ValueError(f"{entry['id']} validation failed: {'; '.join(structural['errors'])}")
    polished, polish_info = polish_frames(entry, frames)
    if polish_info.get("skipped"):
        return {"id": entry["id"], "ok": True, "skipped": True, "reason": polish_info.get("reason")}
    derived = derived_artifact_paths(entry)
    before_stats = analyze_frames(frames, policy)
    write_contact_sheet(derived["autoAlignBeforePath"], frames)
    write_alignment_overlay(derived["autoAlignBeforeOverlayPath"], frames, before_stats, policy)
    backup_path = None
    if path.is_file():
        backup_dir = path.parent / "_piskel-backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        backup_path = backup_dir / f"{path.stem}-pre-auto-align-{datetime.now().strftime('%Y%m%d-%H%M%S')}.piskel"
        backup_path.write_bytes(path.read_bytes())
    write_json(path, make_piskel(entry, polished))
    runtime_info = save_runtime_frames(entry, polished)
    artifacts = write_artifacts(entry, polished, runtime_info, polish_info)
    after_stats = analyze_frames(polished, policy)
    write_contact_sheet(derived["autoAlignAfterPath"], polished)
    write_alignment_overlay(derived["autoAlignAfterOverlayPath"], polished, after_stats, policy)
    validation = validate_piskel_frames(entry, polished, width, height, fps, entry["sourcePiskel"])
    return {
        "id": entry["id"],
        "ok": validation["ok"],
        "skipped": False,
        "validation": validation,
        "backupPath": rel_path(backup_path) if backup_path else None,
        "polish": polish_info,
        "artifacts": {
            **artifacts,
            "autoAlignBeforePath": rel_path(derived["autoAlignBeforePath"]),
            "autoAlignAfterPath": rel_path(derived["autoAlignAfterPath"]),
            "autoAlignBeforeOverlayPath": rel_path(derived["autoAlignBeforeOverlayPath"]),
            "autoAlignAfterOverlayPath": rel_path(derived["autoAlignAfterOverlayPath"]),
        },
    }


def auto_align_entries(entries: list[dict[str, Any]]) -> dict[str, Any]:
    results = [auto_align_entry(entry) for entry in entries]
    return {"ok": all(result.get("ok") for result in results), "aligned": results}


def audit_entry(entry: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    frames = load_runtime_frames(entry)
    expected_size = tuple(entry["frameSize"])
    if len(frames) != int(entry["frameCount"]):
        errors.append(f"expected {entry['frameCount']} frames, found {len(frames)}")
    policy = entry.get("centeringPolicy") or {}
    stats = analyze_frames(frames, policy)
    strict_bounds = bool(policy) and bool(policy.get("strictBounds", True))
    for index, frame in enumerate(frames):
        if frame.size != expected_size:
            errors.append(f"frame {index} is {frame.size}, expected {expected_size}")
    for stat in stats:
        if any(stat["cornerAlpha"]):
            message = f"frame {stat['frame']} has non-transparent corner alpha {stat['cornerAlpha']}"
            (errors if strict_bounds else warnings).append(message)
        if stat["clipped"]:
            message = f"frame {stat['frame']} touches a runtime edge"
            (errors if strict_bounds else warnings).append(message)
    drift = _append_policy_findings(errors, warnings, policy, stats)
    return {
        "id": entry["id"],
        "ok": not errors,
        "errors": errors,
        "warnings": warnings,
        "frameCount": len(frames),
        "frameSize": list(expected_size),
        "anchorMode": drift["anchorMode"],
        "maxCenterDriftPx": drift["maxAnchorDriftPx"],
        "maxBBoxCenterDriftPx": drift["maxBBoxCenterDriftPx"],
        "maxRootAnchorDriftPx": drift["maxRootAnchorDriftPx"],
        "maxBottomDriftPx": drift["maxBottomDriftPx"],
        "medianBBoxHeightPx": drift["medianBBoxHeightPx"],
    }


def audit_entries(entries: list[dict[str, Any]]) -> dict[str, Any]:
    results = []
    for entry in entries:
        try:
            results.append(audit_entry(entry))
        except Exception as error:
            results.append({"id": entry["id"], "ok": False, "errors": [str(error)], "warnings": []})
    return {"ok": all(result["ok"] for result in results), "results": results}


def list_entries(entries: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "ok": True,
        "manifestPath": rel_path(MANIFEST_PATH),
        "animations": [{
            "id": entry["id"],
            "displayName": entry.get("displayName"),
            "fps": entry["fps"],
            "frameSize": entry["frameSize"],
            "frameCount": entry["frameCount"],
            "runtimeMode": entry["runtimeMode"],
            "sourcePiskel": entry["sourcePiskel"],
            "runtimeOutputs": entry["runtimeOutputs"],
            "autoAlign": bool(entry.get("autoAlign") or (entry.get("centeringPolicy") or {}).get("normalize")),
        } for entry in entries],
    }
