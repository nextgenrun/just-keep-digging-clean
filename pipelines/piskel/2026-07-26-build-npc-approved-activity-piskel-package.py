"""Build the accepted merchant activities as an isolated Piskel runtime pack."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
PISKEL_TOOLS = ROOT / "tools" / "piskel-mcp"
sys.path.insert(0, str(PISKEL_TOOLS))

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


SOURCE_ROOT = ROOT / "sprites" / "npc" / "npc-v11-piskel-motion-idles"
TARGET_ROOT = ROOT / "sprites" / "npc" / "npc-v12-piskel-approved-activities"
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
TARGET_ANCHOR = (256, 496)
SOURCE_ACTIVITY_OFFSET = 4
ANCHOR_TOLERANCE_PX = 1.0


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def edge_opaque_pixels(frame: Image.Image) -> int:
    alpha = np.asarray(frame.getchannel("A"))
    return int(
        np.count_nonzero(alpha[0])
        + np.count_nonzero(alpha[-1])
        + np.count_nonzero(alpha[:, 0])
        + np.count_nonzero(alpha[:, -1])
    )


def piskel_entry(slug: str, label: str) -> dict[str, Any]:
    outputs = [
        SINGLES_ROOT / f"{slug}-{activity_id}.webp"
        for activity_id in ACTIVITY_IDS
    ]
    return {
        "id": f"npc-{slug}-approved-activities",
        "displayName": f"{label} approved planted activities",
        "frameSize": list(FRAME_SIZE),
        "frameCount": len(ACTIVITY_IDS),
        "sheetColumns": len(ACTIVITY_IDS),
        "fps": 1,
        "runtimeMode": "frames",
        "runtimeOutputs": [rel_path(path) for path in outputs],
        "sourcePiskel": rel_path(PISKEL_ROOT / f"{slug}.piskel"),
        "metadataPath": rel_path(REPORTS_ROOT / f"{slug}-metadata.json"),
        "previewPath": rel_path(
            REPORTS_ROOT / f"{slug}-preview-1fps.gif"
        ),
        "contactSheetPath": rel_path(
            REPORTS_ROOT / f"{slug}-review-contact-sheet.png"
        ),
        "orientation": "front",
        "centeringPolicy": {
            "anchorMode": "alpha-lower-body",
            "lowerBodyStartFraction": 0.42,
            "anchorAlphaThreshold": 32,
            "anchorSmoothingWindow": 1,
            "targetAnchorX": TARGET_ANCHOR[0],
            "bottomY": TARGET_ANCHOR[1],
            "minUniformScale": 1.0,
            "maxUniformScale": 1.0,
            "runtimeBaselineY": TARGET_ANCHOR[1],
            "sizePolicy": (
                "one fixed 1.0 Piskel scale for all accepted activity frames"
            ),
        },
    }


def source_frames(slug: str) -> list[Image.Image]:
    source_path = SOURCE_ROOT / "piskel" / f"{slug}.piskel"
    frames, width, height, _ = read_piskel(source_path)
    if (width, height) != FRAME_SIZE:
        raise ValueError(f"{slug} source canvas changed to {(width, height)}")
    expected_count = SOURCE_ACTIVITY_OFFSET + len(ACTIVITY_IDS)
    if len(frames) != expected_count:
        raise ValueError(
            f"{slug} source has {len(frames)} frames; expected {expected_count}"
        )
    return [
        frame.copy()
        for frame in frames[SOURCE_ACTIVITY_OFFSET:]
    ]


def save_outputs(
    slug: str,
    entry: dict[str, Any],
    frames: list[Image.Image],
) -> dict[str, Any]:
    for activity_id, frame, relative_path in zip(
        ACTIVITY_IDS,
        frames,
        entry["runtimeOutputs"],
    ):
        output = ROOT / relative_path
        output.parent.mkdir(parents=True, exist_ok=True)
        frame.save(output, "WEBP", lossless=True, quality=100, method=4)
        review_output = REVIEW_POSES / f"{slug}-{activity_id}.webp"
        review_output.parent.mkdir(parents=True, exist_ok=True)
        frame.save(review_output, "WEBP", lossless=True, quality=100, method=4)
    return {
        "runtimeMode": "frames",
        "outputs": entry["runtimeOutputs"],
        "sheetGrid": [len(frames), 1],
        "sheetSize": [FRAME_SIZE[0] * len(frames), FRAME_SIZE[1]],
        "unusedGridFrames": [],
    }


def asset_records(
    slug: str,
    frames: list[Image.Image],
    stats: list[dict[str, Any]],
) -> dict[str, Any]:
    records = {}
    for activity_id, frame, stat in zip(ACTIVITY_IDS, frames, stats):
        path = SINGLES_ROOT / f"{slug}-{activity_id}.webp"
        records[activity_id] = {
            "path": rel_path(path),
            "sha256": digest(path),
            "dimensions": list(frame.size),
            "alphaBounds": list(frame.getbbox() or (0, 0, 0, 0)),
            "rootAnchor": [stat["rootAnchorX"], stat["rootAnchorY"]],
            "bottom": stat["bottom"],
            "edgeOpaquePixels": edge_opaque_pixels(frame),
        }
    return records


def build_merchant(slug: str, label: str) -> dict[str, Any]:
    entry = piskel_entry(slug, label)
    piskel_path = ROOT / entry["sourcePiskel"]
    source = source_frames(slug)
    write_json(piskel_path, make_piskel(entry, source))
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
    if drift["maxRootAnchorDriftPx"] > ANCHOR_TOLERANCE_PX:
        raise ValueError(f"{slug} root drift is {drift['maxRootAnchorDriftPx']}")
    if drift["maxBottomDriftPx"] != 0:
        raise ValueError(f"{slug} bottom drift is {drift['maxBottomDriftPx']}")
    records = asset_records(slug, runtime_frames, stats)
    if any(record["edgeOpaquePixels"] for record in records.values()):
        raise ValueError(f"{slug} has opaque pixels touching the canvas edge")
    return {
        "label": label,
        "sourcePiskel": entry["sourcePiskel"],
        "sourcePiskelSha256": digest(piskel_path),
        "uniformScale": polish_info["uniformScale"],
        "targetAnchor": polish_info["targetAnchor"],
        "drift": drift,
        "artifacts": artifacts,
        "assets": records,
    }


def main() -> None:
    for directory in (SINGLES_ROOT, PISKEL_ROOT, REPORTS_ROOT, REVIEW_POSES):
        directory.mkdir(parents=True, exist_ok=True)
    merchants = {
        slug: build_merchant(slug, label)
        for slug, label in MERCHANTS
    }
    manifest = {
        "created": "2026-07-26",
        "runtimeApproved": True,
        "reviewOnly": False,
        "productionChanged": True,
        "walkingRemoved": True,
        "piskelRoundTripped": True,
        "rejectedQuietConceptsExcluded": True,
        "rejectedStates": REJECTED_STATES,
        "sourceActivityPack": rel_path(SOURCE_ROOT),
        "generator": rel_path(Path(__file__)),
        "canvas": list(FRAME_SIZE),
        "baselineY": TARGET_ANCHOR[1],
        "activityOrder": list(ACTIVITY_IDS),
        "frameCount": len(ACTIVITY_IDS) * len(MERCHANTS),
        "baselinePolicy": (
            "original v6 alpha idle video where available; original static "
            "merchant sprite otherwise"
        ),
        "transformPolicy": (
            "fixed screen position, rotation 0, fixed display size; slow "
            "opacity crossfades provide activity transitions"
        ),
        "merchants": merchants,
    }
    write_json(TARGET_ROOT / "manifest.json", manifest)
    print(f"Built {manifest['frameCount']} accepted Piskel activity frames")
    print(rel_path(TARGET_ROOT / "manifest.json"))


if __name__ == "__main__":
    main()
