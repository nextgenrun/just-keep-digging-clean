"""Build rooted, frame-animated NPC idles and round-trip them through Piskel."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import shutil
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


def load_crop_tools():
    path = ROOT / "ai-tools" / "2026-07-26-build-npc-planted-idles-v9.py"
    spec = importlib.util.spec_from_file_location("npc_planted_crop_tools", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CROP_TOOLS = load_crop_tools()
SOURCE_ROOT = ROOT / "sprites" / "npc" / "npc-v10-piskel-idles"
TARGET_ROOT = ROOT / "sprites" / "npc" / "npc-v11-piskel-motion-idles"
SINGLES_ROOT = TARGET_ROOT / "singles"
PISKEL_ROOT = TARGET_ROOT / "piskel"
REPORTS_ROOT = TARGET_ROOT / "reports"
REVIEW_ROOT = ROOT / "visual-approval-previews" / "npc-planted-idles-v5"
REVIEW_POSES = REVIEW_ROOT / "poses"
QUIET_FRAME_IDS = ("quiet0", "quiet1", "quiet2", "quiet3")
ACTIVITY_POSE_IDS = (
    "work",
    "rare",
    "player",
    "inspect",
    "habit",
    "signature",
    "showcase",
)
FRAME_IDS = QUIET_FRAME_IDS + ACTIVITY_POSE_IDS
MERCHANTS = (
    ("player-upgrades", "Player Upgrades", "character", 0),
    ("gear-merchant", "Gear Merchant", "character", 1),
    ("bobo-merchant", "Bobo Merchant", "character", 2),
    ("money-monster", "Money Monster", "creature", 0),
    ("gem-power-merchant", "Gem Power Merchant", "creature", 1),
    ("magma-money-monster", "Magma Money Monster", "creature", 2),
)
BOARD_PATHS = {
    "character": REVIEW_ROOT / "npc-idle-loop-character-v11.png",
    "creature": REVIEW_ROOT / "npc-idle-loop-creature-v11.png",
}
FRAME_SIZE = (512, 512)
TARGET_ANCHOR = (256, 496)
SAFE_PAD = 10
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


def guard_opaque_pixels(frame: Image.Image) -> int:
    alpha = np.asarray(frame.getchannel("A"))
    return int(
        np.count_nonzero(alpha[:SAFE_PAD])
        + np.count_nonzero(alpha[-SAFE_PAD:])
        + np.count_nonzero(alpha[:, :SAFE_PAD])
        + np.count_nonzero(alpha[:, -SAFE_PAD:])
    )


def reference_height(slug: str) -> int:
    path = SOURCE_ROOT / "singles" / f"{slug}-quiet.webp"
    frame = Image.open(path).convert("RGBA")
    bounds = frame.getbbox()
    if not bounds:
        raise ValueError(f"Empty reference frame: {rel_path(path)}")
    return bounds[3] - bounds[1]


def normalize_quiet_frame(
    item: dict[str, Any],
    target_height: int,
) -> tuple[Image.Image, dict[str, Any]]:
    image: Image.Image = item["image"]
    full = image.getbbox()
    if full is None:
        raise ValueError("Empty generated quiet frame")
    main = item["mainBounds"]
    cropped = image.crop(full)
    main_local = (
        main[0] - full[0],
        main[1] - full[1],
        main[2] - full[0],
        main[3] - full[1],
    )
    main_height = max(1, main_local[3] - main_local[1])
    scale = target_height / main_height
    resized = cropped.resize(
        (
            max(1, round(cropped.width * scale)),
            max(1, round(cropped.height * scale)),
        ),
        Image.Resampling.LANCZOS,
    )
    main_center_x = (main_local[0] + main_local[2]) * 0.5 * scale
    main_bottom_y = main_local[3] * scale
    left = round(TARGET_ANCHOR[0] - main_center_x)
    top = round(TARGET_ANCHOR[1] - main_bottom_y)
    if (
        left < SAFE_PAD
        or top < SAFE_PAD
        or left + resized.width > FRAME_SIZE[0] - SAFE_PAD
        or top + resized.height > FRAME_SIZE[1] - SAFE_PAD
    ):
        raise ValueError(
            "Generated quiet content does not fit the locked runtime canvas: "
            f"left={left}, top={top}, size={resized.size}"
        )
    canvas = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
    canvas.alpha_composite(resized, (left, top))
    guard_pixels = guard_opaque_pixels(canvas)
    if guard_pixels:
        raise ValueError(f"Generated quiet frame touches safe guard: {guard_pixels}")
    return canvas, {
        "sourceMainHeight": main_height,
        "targetMainHeight": target_height,
        "compileTimeScale": round(scale, 6),
        "alphaBoundsBeforePiskel": list(canvas.getbbox() or (0, 0, 0, 0)),
        "edgeOpaquePixelsBeforePiskel": edge_opaque_pixels(canvas),
        "guardOpaquePixelsBeforePiskel": guard_pixels,
    }


def read_boards() -> tuple[dict[str, Image.Image], dict[str, Any]]:
    images: dict[str, Image.Image] = {}
    records: dict[str, Any] = {}
    for board_id, path in BOARD_PATHS.items():
        image = Image.open(path).convert("RGB")
        columns, rows = CROP_TOOLS.detect_panels(image)
        images[board_id] = image
        records[board_id] = {
            "path": rel_path(path),
            "sha256": digest(path),
            "dimensions": list(image.size),
            "columns": [list(span) for span in columns],
            "rows": [list(span) for span in rows],
        }
    return images, records


def quiet_frames_for_merchant(
    slug: str,
    board_id: str,
    row: int,
    boards: dict[str, Image.Image],
) -> tuple[list[Image.Image], list[dict[str, Any]]]:
    image = boards[board_id]
    columns, rows = CROP_TOOLS.detect_panels(image)
    target_height = reference_height(slug)
    frames = []
    records = []
    for column, frame_id in enumerate(QUIET_FRAME_IDS):
        bounds = (
            columns[column][0],
            rows[row][0],
            columns[column][1],
            rows[row][1],
        )
        panel = CROP_TOOLS.fit_panel(image.crop(bounds))
        extracted = CROP_TOOLS.extract(panel)
        frame, calibration = normalize_quiet_frame(extracted, target_height)
        frames.append(frame)
        records.append({
            "frameId": frame_id,
            "sourceBoard": board_id,
            "sourcePanel": list(bounds),
            **calibration,
        })
    return frames, records


def activity_frames_for_merchant(slug: str) -> list[Image.Image]:
    frames = []
    for frame_id in ACTIVITY_POSE_IDS:
        path = SOURCE_ROOT / "singles" / f"{slug}-{frame_id}.webp"
        if not path.is_file():
            raise FileNotFoundError(rel_path(path))
        frame = Image.open(path).convert("RGBA")
        if frame.size != FRAME_SIZE:
            raise ValueError(f"{rel_path(path)} is {frame.size}, expected {FRAME_SIZE}")
        frames.append(frame)
    return frames


def piskel_entry(slug: str, label: str) -> dict[str, Any]:
    outputs = [SINGLES_ROOT / f"{slug}-{frame_id}.webp" for frame_id in FRAME_IDS]
    return {
        "id": f"npc-{slug}-motion-idles",
        "displayName": f"{label} rooted motion idles",
        "frameSize": list(FRAME_SIZE),
        "frameCount": len(FRAME_IDS),
        "sheetColumns": len(FRAME_IDS),
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
            "sizePolicy": (
                "quiet frames compile-time calibrated to the approved quiet "
                "height; one uniform 1.0 Piskel scale for all eleven frames"
            ),
        },
    }


def write_piskel_source(
    path: Path,
    entry: dict[str, Any],
    frames: list[Image.Image],
) -> None:
    write_json(path, make_piskel(entry, frames))


def save_outputs(
    slug: str,
    entry: dict[str, Any],
    frames: list[Image.Image],
) -> dict[str, Any]:
    output_paths = [ROOT / path for path in entry["runtimeOutputs"]]
    for frame_id, frame, output in zip(FRAME_IDS, frames, output_paths):
        output.parent.mkdir(parents=True, exist_ok=True)
        frame.save(output, "WEBP", lossless=True, quality=100, method=4)
        shutil.copyfile(output, REVIEW_POSES / f"{slug}-{frame_id}.webp")
    # Keep the review's semantic quiet URL as an alias of frame zero.
    shutil.copyfile(output_paths[0], REVIEW_POSES / f"{slug}-quiet.webp")
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
    for frame_id, frame, stat in zip(FRAME_IDS, frames, stats):
        path = SINGLES_ROOT / f"{slug}-{frame_id}.webp"
        records[frame_id] = {
            "path": rel_path(path),
            "sha256": digest(path),
            "dimensions": list(frame.size),
            "alphaBounds": list(frame.getbbox() or (0, 0, 0, 0)),
            "rootAnchor": [stat["rootAnchorX"], stat["rootAnchorY"]],
            "bottom": stat["bottom"],
            "edgeOpaquePixels": edge_opaque_pixels(frame),
        }
    return records


def build_merchant(
    slug: str,
    label: str,
    board_id: str,
    row: int,
    boards: dict[str, Image.Image],
) -> dict[str, Any]:
    entry = piskel_entry(slug, label)
    quiet_frames, quiet_sources = quiet_frames_for_merchant(
        slug,
        board_id,
        row,
        boards,
    )
    source_frames = quiet_frames + activity_frames_for_merchant(slug)
    piskel_path = ROOT / entry["sourcePiskel"]
    write_piskel_source(piskel_path, entry, source_frames)
    imported_frames, width, height, _ = read_piskel(piskel_path)
    if (width, height) != FRAME_SIZE:
        raise ValueError(f"{slug} Piskel import changed the canvas")
    polished, polish_info = polish_frames(entry, imported_frames)
    write_piskel_source(piskel_path, entry, polished)
    runtime_frames, width, height, fps = read_piskel(piskel_path)
    if (width, height) != FRAME_SIZE or fps != entry["fps"]:
        raise ValueError(f"{slug} Piskel round-trip verification failed")
    runtime_info = save_outputs(slug, entry, runtime_frames)
    artifacts = write_artifacts(entry, runtime_frames, runtime_info, polish_info)
    stats = analyze_frames(runtime_frames, entry["centeringPolicy"])
    drift = drift_summary(stats)
    if drift["maxRootAnchorDriftPx"] > ANCHOR_TOLERANCE_PX:
        raise ValueError(f"{slug} root drift is {drift['maxRootAnchorDriftPx']} px")
    if drift["maxBottomDriftPx"] != 0:
        raise ValueError(f"{slug} bottom drift is {drift['maxBottomDriftPx']} px")
    records = asset_records(slug, runtime_frames, stats)
    quiet_hashes = [records[frame_id]["sha256"] for frame_id in QUIET_FRAME_IDS]
    if len(set(quiet_hashes)) != len(QUIET_FRAME_IDS):
        raise ValueError(f"{slug} quiet loop contains duplicate still frames")
    return {
        "label": label,
        "sourcePiskel": entry["sourcePiskel"],
        "sourcePiskelSha256": digest(piskel_path),
        "uniformScale": polish_info["uniformScale"],
        "targetAnchor": polish_info["targetAnchor"],
        "quietSourceFrames": quiet_sources,
        "drift": drift,
        "artifacts": artifacts,
        "assets": records,
    }


def update_review_manifest(board_records: dict[str, Any]) -> None:
    path = REVIEW_ROOT / "manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    manifest.update({
        "generator": rel_path(Path(__file__)),
        "runtimeManifest": rel_path(TARGET_ROOT / "manifest.json"),
        "runtimePack": TARGET_ROOT.name,
        "poseCount": len(FRAME_IDS) * len(MERCHANTS),
        "quietLoopBoards": board_records,
        "quietLoopFrameCount": len(QUIET_FRAME_IDS) * len(MERCHANTS),
        "piskelNormalized": True,
        "piskelSourceDirectory": rel_path(PISKEL_ROOT),
        "motionPolicy": (
            "slow localized frame animation only; no runtime translation, "
            "rotation, body scaling, walking, or roaming"
        ),
        "cropSafety": (
            "Detected 4x3 black-gutter boards; fixed 512px canvas; generated "
            "quiet frames height-calibrated once; Piskel lower-body root 256; "
            "baseline 496; zero opaque edge pixels."
        ),
    })
    write_json(path, manifest)


def main() -> None:
    for directory in (SINGLES_ROOT, PISKEL_ROOT, REPORTS_ROOT, REVIEW_POSES):
        directory.mkdir(parents=True, exist_ok=True)
    boards, board_records = read_boards()
    merchants = {
        slug: build_merchant(slug, label, board_id, row, boards)
        for slug, label, board_id, row in MERCHANTS
    }
    manifest = {
        "created": "2026-07-26",
        "runtimeApproved": True,
        "reviewOnly": False,
        "productionChanged": True,
        "walkingRemoved": True,
        "frameMotionRestored": True,
        "piskelRoundTripped": True,
        "sourceActivityPack": rel_path(SOURCE_ROOT),
        "sourceBoards": board_records,
        "generator": rel_path(Path(__file__)),
        "canvas": list(FRAME_SIZE),
        "baselineY": TARGET_ANCHOR[1],
        "quietFrameOrder": list(QUIET_FRAME_IDS),
        "activityPoseOrder": list(ACTIVITY_POSE_IDS),
        "frameOrder": list(FRAME_IDS),
        "quietPlaybackSequence": [
            "quiet0",
            "quiet1",
            "quiet2",
            "quiet3",
            "quiet2",
            "quiet1",
        ],
        "frameCount": len(FRAME_IDS) * len(MERCHANTS),
        "scalePolicy": (
            "generated quiet frames are calibrated once to the approved quiet "
            "height; Piskel/runtime use one fixed scale"
        ),
        "transformPolicy": (
            "fixed screen position, rotation 0, fixed display size; texture "
            "crossfades provide all idle motion"
        ),
        "merchants": merchants,
    }
    write_json(TARGET_ROOT / "manifest.json", manifest)
    update_review_manifest(board_records)
    print(
        f"Built {manifest['frameCount']} Piskel-normalized rooted motion frames"
    )
    print(rel_path(TARGET_ROOT / "manifest.json"))


if __name__ == "__main__":
    main()
