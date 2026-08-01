"""Materialize the 20-by-25 player-animation optimization catalog."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any


def _priority(score: int, thresholds: dict[str, int]) -> str:
    if score >= int(thresholds["critical"]):
        return "critical"
    if score >= int(thresholds["high"]):
        return "high"
    if score >= int(thresholds["medium"]):
        return "medium"
    return "watch"


def materialize_catalog(config: dict[str, Any]) -> dict[str, Any]:
    catalog_config = config["catalog"]
    families = config["families"]
    lenses = config["lenses"]
    hotspots = set(config["hotspots"])
    expected = int(catalog_config["expectedPointCount"])
    points = []
    for family_index, family in enumerate(families):
        for lens_index, lens in enumerate(lenses):
            point_index = family_index * len(lenses) + lens_index + 1
            pair_id = f"{family['id']}:{lens['id']}"
            hotspot = pair_id in hotspots
            score = (
                int(family["weight"])
                + int(lens["weight"])
                + (int(catalog_config["hotspotBonus"]) if hotspot else 0)
            )
            points.append({
                "id": f"OPT-{point_index:03d}",
                "index": point_index,
                "familyId": family["id"],
                "family": family["label"],
                "lensId": lens["id"],
                "lens": lens["label"],
                "category": lens["category"],
                "title": f"{family['label']} · {lens['label']}",
                "recommendation": lens["instruction"].format(label=family["label"]),
                "currentEvidence": family["current"],
                "familyTarget": family["target"],
                "metric": lens["metric"],
                "passRule": lens["pass"],
                "score": score,
                "priority": _priority(score, catalog_config["priorityThresholds"]),
                "verifiedHotspot": hotspot,
            })
    if len(points) != expected:
        raise ValueError(f"expected {expected} optimization points, built {len(points)}")
    if len({point["id"] for point in points}) != expected:
        raise ValueError("optimization IDs must be unique")
    priority_counts = Counter(point["priority"] for point in points)
    category_counts = Counter(point["category"] for point in points)
    return {
        "schemaVersion": 1,
        "version": config["version"],
        "reviewOnly": True,
        "productionChanged": False,
        "familyCount": len(families),
        "lensCount": len(lenses),
        "pointCount": len(points),
        "verifiedHotspotCount": sum(point["verifiedHotspot"] for point in points),
        "priorityCounts": dict(priority_counts),
        "categoryCounts": dict(category_counts),
        "points": points,
    }


def write_catalog(catalog: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(catalog, separators=(",", ":"), ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
