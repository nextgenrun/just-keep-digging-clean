"""Pure phase and planted-foot geometry for the handoff review."""

from __future__ import annotations

import math
from typing import Any


def planted_foot(
    manifest: dict[str, Any],
    phase: int,
    flip_x: bool = False,
) -> tuple[float, float]:
    markers = manifest["actions"]["run"]["rig_markers"]["frames"][str(phase)]
    foot = max((markers["foot_l"], markers["foot_r"]), key=lambda point: point[1])
    return ((256 - float(foot[0])) if flip_x else float(foot[0]), float(foot[1]))


def marker_distance(left: tuple[float, float], right: tuple[float, float]) -> float:
    return math.hypot(left[0] - right[0], left[1] - right[1])


def resolve_pivot_phase(
    manifest: dict[str, Any],
    outgoing_phase: int,
    vertical_weight: float,
) -> int:
    outgoing = planted_foot(manifest, outgoing_phase)
    candidates = []
    for phase in range(manifest["actions"]["run"]["frame_count"]):
        target = planted_foot(manifest, phase, True)
        score = abs(target[0] - outgoing[0]) + abs(target[1] - outgoing[1]) * vertical_weight
        candidates.append((score, phase))
    return min(candidates)[1]


def project_marker(
    config: dict[str, Any],
    point: tuple[float, float],
    ground_y: float,
) -> tuple[float, float]:
    build = config["build"]
    scale = build["displaySizePx"] * build["reviewScale"] / build["frameWidth"]
    return (
        build["actorRootX"] + (point[0] - build["frameWidth"] * build["visualOriginX"]) * scale,
        ground_y + (point[1] - build["frameHeight"] * build["visualOriginY"]) * scale,
    )


def add_live_metrics(record: dict[str, Any], live_scale: float) -> None:
    for key, value in list(record.items()):
        if isinstance(value, dict):
            add_live_metrics(value, live_scale)
        elif key.endswith("SourcePx"):
            record[key] = round(float(value), 3)
            record[key.replace("SourcePx", "LivePx")] = round(float(value) * live_scale, 3)
