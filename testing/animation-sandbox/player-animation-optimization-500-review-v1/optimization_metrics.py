"""Measure the three player-animation comparison scenarios."""

from __future__ import annotations

from statistics import median
from typing import Any

from optimization_sequences import opaque_tile_intrusion, visible_height


def build_metrics(
    scenarios: list[dict[str, Any]],
    config: dict[str, Any],
) -> dict[str, Any]:
    threshold = int(config["geometry"]["alphaThreshold"])
    by_id = {scenario["id"]: scenario for scenario in scenarios}
    action = by_id["stationary-release"]
    contact = int(action["criticalIndex"])
    transition = int(action["transitionIndex"])
    landing = by_id["landing-finish"]
    finish = int(landing["finishIndex"])
    wall = by_id["wall-push"]
    loop_slice = slice(int(wall["loopStart"]), int(wall["loopEnd"]) + 1)

    def height(record: dict[str, Any]) -> float:
        return round(visible_height(record, threshold), 3)

    before_wall = [visible_height(item, threshold) for item in wall["before"][loop_slice]]
    after_wall = [visible_height(item, threshold) for item in wall["after"][loop_slice]]
    return {
        "schemaVersion": 1,
        "version": config["version"],
        "reviewOnly": True,
        "productionChanged": False,
        "scenarioCount": len(scenarios),
        "stationaryRelease": {
            "currentContactOffsetPx": round(action["before"][contact]["offsetXPx"], 3),
            "proposedContactOffsetPx": 0,
            "currentOpaqueTileIntrusionPixels": opaque_tile_intrusion(
                action["before"][contact], config["geometry"]
            ),
            "proposedOpaqueTileIntrusionPixels": opaque_tile_intrusion(
                action["after"][contact], config["geometry"]
            ),
            "currentReleaseHeightJumpPx": round(abs(
                visible_height(action["before"][transition - 1], threshold)
                - visible_height(action["before"][transition], threshold)
            ), 3),
            "proposedReleaseHeightJumpPx": round(abs(
                visible_height(action["after"][transition - 1], threshold)
                - visible_height(action["after"][transition], threshold)
            ), 3),
            "currentMaxSpriteOffsetPx": round(max(
                abs(item["offsetXPx"]) for item in action["before"]
            ), 3),
            "proposedMaxSpriteOffsetPx": 0,
        },
        "landingFinish": {
            "currentFinalHeightPx": height(landing["before"][finish]),
            "proposedFinalHeightPx": height(landing["after"][finish]),
            "idleHeightPx": height(landing["after"][finish + 1]),
            "currentFinalToIdleDeltaPx": round(abs(
                visible_height(landing["before"][finish], threshold)
                - visible_height(landing["before"][finish + 1], threshold)
            ), 3),
            "proposedFinalToIdleDeltaPx": round(abs(
                visible_height(landing["after"][finish], threshold)
                - visible_height(landing["after"][finish + 1], threshold)
            ), 3),
        },
        "wallPush": {
            "currentLoopMedianHeightPx": round(median(before_wall), 3),
            "proposedLoopMedianHeightPx": round(median(after_wall), 3),
            "currentLoopMinHeightPx": round(min(before_wall), 3),
            "proposedLoopMinHeightPx": round(min(after_wall), 3),
            "currentEntryToLoopDeltaPx": round(abs(
                visible_height(wall["before"][int(wall["loopStart"]) - 1], threshold)
                - visible_height(wall["before"][int(wall["loopStart"])], threshold)
            ), 3),
            "proposedEntryToLoopDeltaPx": round(abs(
                visible_height(wall["after"][int(wall["loopStart"]) - 1], threshold)
                - visible_height(wall["after"][int(wall["loopStart"])], threshold)
            ), 3),
            "currentLoopToExitDeltaPx": round(abs(
                visible_height(wall["before"][int(wall["loopEnd"])], threshold)
                - visible_height(wall["before"][int(wall["exitStart"])], threshold)
            ), 3),
            "proposedLoopToExitDeltaPx": round(abs(
                visible_height(wall["after"][int(wall["loopEnd"])], threshold)
                - visible_height(wall["after"][int(wall["exitStart"])], threshold)
            ), 3),
        },
    }
