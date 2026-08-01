"""Structural QA for corrected high-impact source manifests."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image


VISIBLE_ALPHA = 12
STRUCTURAL_WARNING_PREFIXES = (
    "opaque-corner",
    "residual-strong-key-pixels",
    "alpha-coverage-outlier",
    "master-space-",
)


def rgba_sha(image: Image.Image) -> str:
    return hashlib.sha256(image.convert("RGBA").tobytes()).hexdigest()


def file_sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def v1_bounds(
    width: int,
    height: int,
    columns: int,
    rows: int,
    index: int,
) -> dict[str, int]:
    row, column = divmod(index, columns)
    left = round(column * width / columns)
    right = round((column + 1) * width / columns)
    top = round(row * height / rows)
    bottom = round((row + 1) * height / rows)
    inset = max(
        4,
        round(min(right - left, bottom - top) * 0.028),
    )
    return {
        "left": left + inset,
        "top": top + inset,
        "right": right - inset,
        "bottom": bottom - inset,
    }


def validate_manifest_sources(
    v2_root: Path,
    manifest: dict[str, Any],
) -> dict[str, Any]:
    errors: list[str] = []
    structural: list[str] = []
    sources = manifest["sources"]
    ids = [source["id"] for source in sources]
    paths = [source["path"] for source in sources]
    if len(sources) != 1000:
        errors.append(f"source-count:{len(sources)}")
    if len(ids) != len(set(ids)):
        errors.append("duplicate-source-ids")
    if len(paths) != len(set(paths)):
        errors.append("duplicate-source-paths")
    master_by_id = {master["id"]: master for master in manifest["sourceMasters"]}

    for source in sources:
        path = v2_root / source["path"]
        if not path.exists():
            errors.append(f"missing:{source['id']}")
            continue
        if path.stat().st_size != source["bytes"]:
            errors.append(f"bytes:{source['id']}")
        if file_sha(path) != source["sha256"]:
            errors.append(f"sha256:{source['id']}")
        with Image.open(path) as loaded:
            image = loaded.convert("RGBA")
        if image.size != (source["width"], source["height"]):
            errors.append(f"dimensions:{source['id']}")
        if rgba_sha(image) != source["rgbaSha256"]:
            errors.append(f"rgba-sha256:{source['id']}")
        alpha = np.asarray(image.getchannel("A"), dtype=np.uint8)
        visible = int(np.count_nonzero(alpha > VISIBLE_ALPHA))
        if visible != source["qa"]["visibleAlphaPixels"]:
            errors.append(f"visible-stats:{source['id']}")
        corners = (alpha[0, 0], alpha[0, -1], alpha[-1, 0], alpha[-1, -1])
        if int(max(corners)) != source["qa"]["cornerAlphaMax"]:
            errors.append(f"corner-stats:{source['id']}")
        master = master_by_id.get(source["masterId"])
        if not master:
            errors.append(f"unknown-master:{source['id']}")
            continue
        bounds = source["masterPixelBounds"]
        dimensions = master["dimensions"]
        if not (
            0 <= bounds["left"] < bounds["right"] <= dimensions["width"]
            and 0 <= bounds["top"] < bounds["bottom"] <= dimensions["height"]
        ):
            errors.append(f"master-bounds:{source['id']}")
        warnings = source["qa"]["warnings"]
        found = [
            warning
            for warning in warnings
            if warning.startswith(STRUCTURAL_WARNING_PREFIXES)
        ]
        if found:
            structural.extend(f"{source['id']}:{warning}" for warning in found)
        raw_warnings = source["masterSpaceQa"]["warnings"]
        if any(warning not in warnings for warning in raw_warnings):
            errors.append(f"raw-warning-not-propagated:{source['id']}")
        if source["productionEligible"] is not False:
            errors.append(f"review-boundary:{source['id']}")

    groups: dict[str, list[dict[str, Any]]] = {}
    for source in sources:
        if source["sequenceGroup"]:
            groups.setdefault(source["sequenceGroup"], []).append(source)
    for group_id, frames in groups.items():
        if len(frames) != 5 or sorted(frame["frameIndex"] for frame in frames) != list(range(5)):
            errors.append(f"sequence-order:{group_id}")
        if len({(frame["masterId"], frame["sourceCell"]["row"]) for frame in frames}) != 1:
            errors.append(f"sequence-row:{group_id}")

    audited = set(manifest["slicingAudit"]["config"]["boundaries"])
    component = set(manifest["slicingAudit"]["config"]["componentRows"])
    sources_by_master: dict[str, list[dict[str, Any]]] = {}
    for source in sources:
        sources_by_master.setdefault(source["masterId"], []).append(source)
    for master_id, master in master_by_id.items():
        if master_id in audited or master_id in component:
            continue
        grid = master["grid"]
        dimensions = master["dimensions"]
        for source in sources_by_master[master_id]:
            expected = v1_bounds(
                dimensions["width"],
                dimensions["height"],
                grid["columns"],
                grid["rows"],
                source["sourceCell"]["index"],
            )
            if source["masterPixelBounds"] != expected:
                errors.append(f"v1-fallback-drift:{source['id']}")
    return {
        "errors": errors,
        "structuralWarnings": structural,
        "sequenceGroupCount": len(groups),
        "sourceIdCount": len(set(ids)),
        "sourcePathCount": len(set(paths)),
    }
