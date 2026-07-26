"""Round-trip every planted NPC pose through Piskel and lock its root anchor."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
PISKEL_TOOLS = ROOT / "tools" / "piskel-mcp"
sys.path.insert(0, str(PISKEL_TOOLS))

from piskel_artifacts import write_artifacts  # noqa: E402
from piskel_document import (  # noqa: E402
    make_piskel,
    read_piskel,
    rel_path,
    save_image,
    write_json,
)
from piskel_frame_polish import (  # noqa: E402
    analyze_frames,
    drift_summary,
    polish_frames,
)


SOURCE_ROOT = ROOT / "sprites" / "npc" / "npc-v9-planted-idles"
TARGET_ROOT = ROOT / "sprites" / "npc" / "npc-v10-piskel-idles"
SINGLES_ROOT = TARGET_ROOT / "singles"
PISKEL_ROOT = TARGET_ROOT / "piskel"
REPORTS_ROOT = TARGET_ROOT / "reports"
REVIEW_ROOT = ROOT / "visual-approval-previews" / "npc-planted-idles-v5"
REVIEW_POSES = REVIEW_ROOT / "poses"
ACTIVITY_IDS = (
    "quiet",
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
FRAME_SIZE = (512, 512)
TARGET_ANCHOR = (256, 496)
ANCHOR_TOLERANCE_PX = 1.0


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def piskel_entry(slug: str, label: str) -> dict[str, Any]:
    outputs = [
        SINGLES_ROOT / f"{slug}-{activity_id}.webp"
        for activity_id in ACTIVITY_IDS
    ]
    return {
        "id": f"npc-{slug}-planted-idles",
        "displayName": f"{label} planted idles",
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
            "targetAnchorX": TARGET_ANCHOR[0],
            "bottomY": TARGET_ANCHOR[1],
            "minUniformScale": 1.0,
            "maxUniformScale": 1.0,
            "runtimeBaselineY": TARGET_ANCHOR[1],
            "sizePolicy": "one uniform scale for all eight frames",
        },
    }


def load_source_frames(slug: str) -> list[Image.Image]:
    frames = []
    for activity_id in ACTIVITY_IDS:
        path = SOURCE_ROOT / "singles" / f"{slug}-{activity_id}.webp"
        if not path.is_file():
            raise FileNotFoundError(rel_path(path))
        frame = Image.open(path).convert("RGBA")
        if frame.size != FRAME_SIZE:
            raise ValueError(f"{rel_path(path)} is {frame.size}, expected {FRAME_SIZE}")
        frames.append(frame)
    return frames


def write_piskel_source(path: Path, entry: dict[str, Any], frames: list[Image.Image]) -> None:
    write_json(path, make_piskel(entry, frames))


def save_outputs(
    slug: str,
    entry: dict[str, Any],
    frames: list[Image.Image],
) -> dict[str, Any]:
    output_paths = [ROOT / path for path in entry["runtimeOutputs"]]
    for activity_id, frame, output in zip(ACTIVITY_IDS, frames, output_paths):
        save_image(output, frame)
        save_image(REVIEW_POSES / f"{slug}-{activity_id}.webp", frame)
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
        alpha = frame.getchannel("A")
        edge_pixels = sum(
            1
            for x, y in (
                *((x, 0) for x in range(frame.width)),
                *((x, frame.height - 1) for x in range(frame.width)),
                *((0, y) for y in range(frame.height)),
                *((frame.width - 1, y) for y in range(frame.height)),
            )
            if alpha.getpixel((x, y)) > 0
        )
        records[activity_id] = {
            "path": rel_path(path),
            "sha256": digest(path),
            "dimensions": list(frame.size),
            "alphaBounds": list(frame.getbbox() or (0, 0, 0, 0)),
            "rootAnchor": [stat["rootAnchorX"], stat["rootAnchorY"]],
            "bottom": stat["bottom"],
            "edgeOpaquePixels": edge_pixels,
        }
    return records


def build_merchant(slug: str, label: str) -> dict[str, Any]:
    entry = piskel_entry(slug, label)
    source_frames = load_source_frames(slug)
    piskel_path = ROOT / entry["sourcePiskel"]
    write_piskel_source(piskel_path, entry, source_frames)
    imported_frames, width, height, _ = read_piskel(piskel_path)
    if (width, height) != FRAME_SIZE:
        raise ValueError(f"{slug} Piskel round-trip changed the canvas")
    polished, polish_info = polish_frames(entry, imported_frames)
    write_piskel_source(piskel_path, entry, polished)
    runtime_frames, width, height, fps = read_piskel(piskel_path)
    if (width, height) != FRAME_SIZE or fps != entry["fps"]:
        raise ValueError(f"{slug} Piskel verification failed")
    runtime_info = save_outputs(slug, entry, runtime_frames)
    artifacts = write_artifacts(entry, runtime_frames, runtime_info, polish_info)
    stats = analyze_frames(runtime_frames, entry["centeringPolicy"])
    drift = drift_summary(stats)
    if drift["maxRootAnchorDriftPx"] > ANCHOR_TOLERANCE_PX:
        raise ValueError(f"{slug} root drift is {drift['maxRootAnchorDriftPx']} px")
    if drift["maxBottomDriftPx"] != 0:
        raise ValueError(f"{slug} bottom drift is {drift['maxBottomDriftPx']} px")
    return {
        "label": label,
        "sourcePiskel": entry["sourcePiskel"],
        "sourcePiskelSha256": digest(piskel_path),
        "uniformScale": polish_info["uniformScale"],
        "targetAnchor": polish_info["targetAnchor"],
        "drift": drift,
        "artifacts": artifacts,
        "assets": asset_records(slug, runtime_frames, stats),
    }


def update_review_manifest() -> None:
    path = REVIEW_ROOT / "manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    source_generator = manifest.get(
        "sourceCropGenerator",
        manifest.get("generator"),
    )
    manifest.update({
        "generator": rel_path(Path(__file__)),
        "sourceCropGenerator": source_generator,
        "runtimeManifest": rel_path(TARGET_ROOT / "manifest.json"),
        "runtimePack": TARGET_ROOT.name,
        "piskelNormalized": True,
        "piskelSourceDirectory": rel_path(PISKEL_ROOT),
        "motionPolicy": "no whole-body rotation, scaling, or translation",
        "cropSafety": (
            "Piskel round-trip; fixed 512px canvas; one scale; locked lower-body "
            "root; baseline 496; zero opaque edge pixels."
        ),
    })
    write_json(path, manifest)


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
        "sourcePack": rel_path(SOURCE_ROOT),
        "generator": rel_path(Path(__file__)),
        "canvas": list(FRAME_SIZE),
        "baselineY": TARGET_ANCHOR[1],
        "activityOrder": list(ACTIVITY_IDS),
        "frameCount": len(ACTIVITY_IDS) * len(MERCHANTS),
        "scalePolicy": "one uniform 1.0 scale per merchant; no per-frame scaling",
        "transformPolicy": "position only; rotation 0; fixed display size",
        "merchants": merchants,
    }
    write_json(TARGET_ROOT / "manifest.json", manifest)
    update_review_manifest()
    print(f"Built {manifest['frameCount']} Piskel-normalized planted-idle frames")
    print(rel_path(TARGET_ROOT / "manifest.json"))


if __name__ == "__main__":
    main()
