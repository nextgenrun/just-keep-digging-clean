"""Build calm, chroma-cleaned, silhouette-matched merchant activities."""

from __future__ import annotations

import json
import statistics
import sys
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
PISKEL_TOOLS = ROOT / "tools" / "piskel-mcp"
sys.path.insert(0, str(PISKEL_TOOLS))

from npc_sprite_cleanup import (  # noqa: E402
    activity_asset_records,
    file_digest,
    main_alpha_height,
    normalized_lower_body_anchor,
    remove_chroma_leaks,
    save_lossless_frames,
)
from piskel_artifacts import write_artifacts  # noqa: E402
from piskel_document import (  # noqa: E402
    make_piskel,
    read_piskel,
    rel_path,
    write_json,
)
from piskel_frame_polish import (  # noqa: E402
    analyze_frames,
    drift_summary,
    polish_frames,
)


SOURCE_ROOT = ROOT / "sprites" / "npc" / "npc-v12-piskel-approved-activities"
BASELINE_ROOT = ROOT / "sprites" / "npc" / "npc-v13-polished-baselines"
POLISH_VALUES = ROOT / "values" / "npcActivityAssetPolish.json"
TARGET_ROOT = (
    ROOT / "sprites" / "npc" / "npc-v13-piskel-polished-activities"
)
SINGLES_ROOT = TARGET_ROOT / "singles"
PISKEL_ROOT = TARGET_ROOT / "piskel"
REPORTS_ROOT = TARGET_ROOT / "reports"
REVIEW_POSES = (
    ROOT / "visual-approval-previews" / "npc-planted-idles-v5" / "poses"
)
ACTIVITY_IDS = (
    "work",
    "rare",
    "player",
    "inspect",
    "habit",
    "signature",
    "showcase",
)
MERCHANTS = (
    ("player-upgrades", "Player Upgrades"),
    ("gear-merchant", "Gear Merchant"),
    ("bobo-merchant", "Bobo Merchant"),
    ("money-monster", "Money Monster"),
    ("gem-power-merchant", "Gem Power Merchant"),
    ("magma-money-monster", "Magma Money Monster"),
)
REJECTED_STATES = {
    "player-upgrades": "Quiet ready",
    "gear-merchant": "Heavy rest",
    "bobo-merchant": "Friendly wait",
    "money-monster": "Guard the coin",
    "gem-power-merchant": "Grounded charge",
    "magma-money-monster": "Balanced guard",
}
FRAME_SIZE = (512, 512)
ANCHOR_TOLERANCE_PX = 1.0
MIN_SCALE = 0.85
MAX_SCALE = 1.25


def baseline_manifest() -> dict[str, Any]:
    path = BASELINE_ROOT / "manifest.json"
    if not path.exists():
        raise FileNotFoundError(
            "Build npc-v13-polished-baselines before the activity pack"
        )
    return json.loads(path.read_text(encoding="utf-8"))


def resolve_activity_scale(slug: str, requested_scale: float) -> float:
    values = json.loads(POLISH_VALUES.read_text(encoding="utf-8"))
    cap = float(values["merchantMaxUniformActivityScale"].get(
        slug,
        values["defaultMaxUniformActivityScale"],
    ))
    if requested_scale < cap:
        return requested_scale
    return cap - float(values["capLimitedRasterSafetyInset"])


def source_frames(slug: str) -> list[Image.Image]:
    source_path = SOURCE_ROOT / "piskel" / f"{slug}.piskel"
    frames, width, height, _ = read_piskel(source_path)
    if (width, height) != FRAME_SIZE or len(frames) != len(ACTIVITY_IDS):
        raise ValueError(f"{slug} approved source shape changed")
    return [frame.copy() for frame in frames]


def baseline_anchor(slug: str) -> tuple[float, float]:
    path = BASELINE_ROOT / "static" / f"{slug}.webp"
    frame = Image.open(path).convert("RGBA")
    return normalized_lower_body_anchor(frame, FRAME_SIZE)


def piskel_entry(
    slug: str,
    label: str,
    target_height: float,
    scale: float,
    target_anchor: tuple[float, float],
) -> dict[str, Any]:
    outputs = [
        SINGLES_ROOT / f"{slug}-{activity_id}.webp"
        for activity_id in ACTIVITY_IDS
    ]
    return {
        "id": f"npc-{slug}-polished-activities",
        "displayName": f"{label} polished planted activities",
        "frameSize": list(FRAME_SIZE),
        "frameCount": len(ACTIVITY_IDS),
        "sheetColumns": len(ACTIVITY_IDS),
        "fps": 1,
        "runtimeMode": "frames",
        "runtimeOutputs": [rel_path(path) for path in outputs],
        "sourcePiskel": rel_path(PISKEL_ROOT / f"{slug}.piskel"),
        "metadataPath": rel_path(REPORTS_ROOT / f"{slug}-metadata.json"),
        "previewPath": rel_path(REPORTS_ROOT / f"{slug}-preview-1fps.gif"),
        "contactSheetPath": rel_path(
            REPORTS_ROOT / f"{slug}-review-contact-sheet.png"
        ),
        "orientation": "front",
        "centeringPolicy": {
            "anchorMode": "alpha-lower-body",
            "lowerBodyStartFraction": 0.42,
            "anchorAlphaThreshold": 32,
            "anchorSmoothingWindow": 1,
            "targetAnchorX": target_anchor[0],
            "bottomY": target_anchor[1],
            "targetReferenceHeightPx": target_height,
            "minUniformScale": scale,
            "maxUniformScale": scale,
            "runtimeBaselineY": target_anchor[1],
            "sizePolicy": (
                "one fixed merchant scale matched to the calm baseline"
            ),
        },
    }


def save_outputs(
    slug: str,
    entry: dict[str, Any],
    frames: list[Image.Image],
) -> dict[str, Any]:
    runtime_paths = [ROOT / path for path in entry["runtimeOutputs"]]
    review_paths = [
        REVIEW_POSES / f"{slug}-{activity_id}.webp"
        for activity_id in ACTIVITY_IDS
    ]
    save_lossless_frames(frames, runtime_paths, review_paths)
    return {
        "runtimeMode": "frames",
        "outputs": entry["runtimeOutputs"],
        "sheetGrid": [len(frames), 1],
        "sheetSize": [FRAME_SIZE[0] * len(frames), FRAME_SIZE[1]],
        "unusedGridFrames": [],
    }


def build_merchant(
    slug: str,
    label: str,
    baseline: dict[str, Any],
) -> dict[str, Any]:
    source = source_frames(slug)
    cleaned = []
    cleanup = []
    for frame in source:
        clean_frame, report = remove_chroma_leaks(frame)
        cleaned.append(clean_frame)
        cleanup.append(report)
    source_main_height = statistics.median(
        main_alpha_height(frame) for frame in cleaned
    )
    target_main_height = float(
        baseline["static"][slug]["mainSilhouetteHeightAt512"]
    )
    requested_scale = resolve_activity_scale(
        slug,
        target_main_height / source_main_height,
    )
    if not MIN_SCALE <= requested_scale <= MAX_SCALE:
        raise ValueError(f"{slug} requested unsafe scale {requested_scale}")
    source_stats = analyze_frames(cleaned)
    source_bbox_height = statistics.median(
        stat["bboxHeight"] for stat in source_stats
    )
    target_bbox_height = source_bbox_height * requested_scale
    target_anchor = baseline_anchor(slug)
    entry = piskel_entry(
        slug,
        label,
        target_bbox_height,
        requested_scale,
        target_anchor,
    )
    piskel_path = ROOT / entry["sourcePiskel"]
    write_json(piskel_path, make_piskel(entry, cleaned))
    imported, width, height, _ = read_piskel(piskel_path)
    if (width, height) != FRAME_SIZE:
        raise ValueError(f"{slug} Piskel import changed the canvas")
    polished, polish_info = polish_frames(entry, imported)
    write_json(piskel_path, make_piskel(entry, polished))
    runtime_frames, width, height, fps = read_piskel(piskel_path)
    if (width, height) != FRAME_SIZE or fps != entry["fps"]:
        raise ValueError(f"{slug} Piskel round-trip verification failed")
    runtime_info = save_outputs(slug, entry, runtime_frames)
    artifacts = write_artifacts(
        entry,
        runtime_frames,
        runtime_info,
        polish_info,
    )
    stats = analyze_frames(runtime_frames, entry["centeringPolicy"])
    drift = drift_summary(stats)
    final_main_height = statistics.median(
        main_alpha_height(frame) for frame in runtime_frames
    )
    silhouette_error = abs(final_main_height - target_main_height)
    records = activity_asset_records(
        ROOT,
        SINGLES_ROOT,
        slug,
        ACTIVITY_IDS,
        runtime_frames,
        stats,
    )
    max_root_error = max(
        abs(float(stat["rootAnchorX"]) - target_anchor[0])
        for stat in stats
    )
    max_bottom_error = max(
        abs(float(stat["bottom"]) - target_anchor[1])
        for stat in stats
    )
    if drift["maxRootAnchorDriftPx"] > ANCHOR_TOLERANCE_PX:
        raise ValueError(f"{slug} root drift is {drift['maxRootAnchorDriftPx']}")
    if (
        drift["maxBottomDriftPx"]
        or silhouette_error > 1.5
        or max_root_error > 1.25
        or max_bottom_error > 0.51
    ):
        raise ValueError(f"{slug} silhouette normalization failed")
    if any(
        record["edgeOpaquePixels"]
        or record["hiddenRgbPixels"]
        or record["largeGreenLeakPixels"]
        for record in records.values()
    ):
        raise ValueError(f"{slug} has edge or chroma contamination")
    return {
        "label": label,
        "sourcePiskel": entry["sourcePiskel"],
        "sourcePiskelSha256": file_digest(piskel_path),
        "baselineSilhouetteHeightPx": target_main_height,
        "sourceMedianSilhouetteHeightPx": source_main_height,
        "finalMedianSilhouetteHeightPx": final_main_height,
        "silhouetteErrorPx": round(silhouette_error, 3),
        "uniformScale": polish_info["uniformScale"],
        "targetAnchor": polish_info["targetAnchor"],
        "maxBaselineRootErrorPx": round(max_root_error, 3),
        "maxBaselineBottomErrorPx": round(max_bottom_error, 3),
        "largeGreenLeakPixelsBefore": sum(
            report["largeGreenLeakPixelsBefore"] for report in cleanup
        ),
        "largeGreenLeakPixelsAfter": 0,
        "drift": drift,
        "artifacts": artifacts,
        "assets": records,
    }


def main() -> None:
    for directory in (SINGLES_ROOT, PISKEL_ROOT, REPORTS_ROOT, REVIEW_POSES):
        directory.mkdir(parents=True, exist_ok=True)
    baseline = baseline_manifest()
    merchants = {
        slug: build_merchant(slug, label, baseline)
        for slug, label in MERCHANTS
    }
    manifest = {
        "created": "2026-07-28",
        "runtimeApproved": True,
        "reviewOnly": False,
        "productionChanged": True,
        "walkingRemoved": True,
        "piskelRoundTripped": True,
        "silhouetteMatched": True,
        "chromaLeakRemoved": True,
        "rejectedQuietConceptsExcluded": True,
        "rejectedStates": REJECTED_STATES,
        "sourceActivityPack": rel_path(SOURCE_ROOT),
        "baselinePack": rel_path(BASELINE_ROOT),
        "generator": rel_path(Path(__file__)),
        "canvas": list(FRAME_SIZE),
        "activityOrder": list(ACTIVITY_IDS),
        "frameCount": len(ACTIVITY_IDS) * len(MERCHANTS),
        "scalePolicy": (
            "one fixed per-merchant scale matches the median activity "
            "silhouette to the calm baseline; never per-frame scaling"
        ),
        "anchorPolicy": (
            "each merchant matches the normalized lower-body root and alpha "
            "bottom of its real calm baseline"
        ),
        "transformPolicy": (
            "fixed screen position, rotation 0, fixed display size; slow "
            "opacity crossfades provide activity transitions"
        ),
        "merchants": merchants,
    }
    write_json(TARGET_ROOT / "manifest.json", manifest)
    print(f"Built {manifest['frameCount']} polished Piskel activity frames")
    print(rel_path(TARGET_ROOT / "manifest.json"))


if __name__ == "__main__":
    main()
