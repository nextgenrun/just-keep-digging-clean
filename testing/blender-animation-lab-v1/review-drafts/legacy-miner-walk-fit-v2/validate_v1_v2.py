"""Quantify the failed-v1 versus corrected-v2 joint-direction result."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import bpy


SESSION_ROOT = Path(__file__).resolve().parent
V1_ROOT = SESSION_ROOT.parent / "legacy-miner-walk-fit-v1"
REPORT_PATH = SESSION_ROOT / "fit-report.json"
sys.path.insert(0, str(V1_ROOT))

import build_corrected_v2 as retarget


def measure(
    scene: bpy.types.Scene,
    source_rig: bpy.types.Object,
    target_rig: bpy.types.Object,
    action: bpy.types.Action,
    alignment,
    first: int,
    last: int,
) -> dict:
    target_rig.animation_data.action = action
    all_errors = []
    frames = []
    for frame in range(first, last + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        segments = retarget.pose_direction_errors(
            source_rig,
            target_rig,
            alignment,
        )
        values = [item["degrees"] for item in segments]
        all_errors.extend(values)
        frames.append(
            {
                "frame": frame,
                "meanDegrees": round(sum(values) / len(values), 3),
                "maxDegrees": max(values),
            }
        )
    return {
        "action": action.name,
        "meanSegmentDirectionErrorDegrees": round(
            sum(all_errors) / len(all_errors),
            3,
        ),
        "maxSegmentDirectionErrorDegrees": max(all_errors),
        "frames": frames,
    }


def main() -> None:
    report = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    scene = bpy.context.scene
    source_rig = bpy.data.objects.get("root")
    target_rig = next(
        (
            obj
            for obj in scene.objects
            if obj.type == "ARMATURE"
            and obj.get("dgal_retarget_version") == 2
        ),
        None,
    )
    if source_rig is None or target_rig is None:
        raise RuntimeError("The v1/v2 comparison rigs are missing")
    failed = bpy.data.actions.get(report["failedV1Action"])
    corrected = bpy.data.actions.get(report["correctedAction"])
    if failed is None or corrected is None:
        raise RuntimeError("The failed and corrected actions must both be saved")
    alignment, _, _ = retarget.rest_alignment(source_rig, target_rig)
    first, last = report["frameRange"]
    failed_metrics = measure(
        scene,
        source_rig,
        target_rig,
        failed,
        alignment,
        first,
        last,
    )
    corrected_metrics = measure(
        scene,
        source_rig,
        target_rig,
        corrected,
        alignment,
        first,
        last,
    )
    target_rig.animation_data.action = corrected
    scene.frame_set(first)
    bpy.context.view_layer.update()
    improvement = (
        1.0
        - corrected_metrics["meanSegmentDirectionErrorDegrees"]
        / failed_metrics["meanSegmentDirectionErrorDegrees"]
    ) * 100.0
    report["comparisonAgainstFailedV1"] = {
        "failedV1": failed_metrics,
        "correctedV2": corrected_metrics,
        "meanDirectionErrorReductionPercent": round(improvement, 3),
    }
    report["productionChanged"] = False
    REPORT_PATH.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        "LEGACY_MINER_V1_V2_VALIDATION_OK "
        f"failedMean={failed_metrics['meanSegmentDirectionErrorDegrees']} "
        f"correctedMean={corrected_metrics['meanSegmentDirectionErrorDegrees']} "
        f"reduction={improvement:.3f}% "
        f"report={REPORT_PATH}"
    )


if __name__ == "__main__":
    main()
