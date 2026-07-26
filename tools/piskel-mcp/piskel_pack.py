from __future__ import annotations

from typing import Any

from PIL import Image

from piskel_artifacts import write_contact_sheet
from piskel_document import (
    ALL_PACK_CONTACT_SHEET_PATH,
    ALL_PACK_METADATA_PATH,
    ALL_PACK_PATH,
    MANIFEST_PATH,
    load_runtime_frames,
    make_piskel,
    rel_path,
    write_json,
)


def fit_frame_to_canvas(frame: Image.Image, size: int = 341) -> Image.Image:
    image = frame.convert("RGBA")
    scale = min(size / image.width, size / image.height, 1.0)
    if scale < 1.0:
        image = image.resize(
            (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
            Image.Resampling.LANCZOS,
        )
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(image, ((size - image.width) // 2, (size - image.height) // 2))
    return canvas


def build_all_pack(entries: list[dict[str, Any]]) -> dict[str, Any]:
    frames: list[Image.Image] = []
    ranges: list[dict[str, Any]] = []
    for entry in entries:
        source_frames = load_runtime_frames(entry)
        start = len(frames)
        frames.extend(fit_frame_to_canvas(frame) for frame in source_frames)
        ranges.append({
            "id": entry["id"],
            "displayName": entry.get("displayName", entry["id"]),
            "startFrame": start,
            "endFrame": len(frames) - 1,
            "frameCount": len(source_frames),
            "fps": entry["fps"],
            "originalFrameSize": entry["frameSize"],
            "reviewFrameSize": [341, 341],
            "scaledForReview": entry["frameSize"] != [341, 341],
            "sourcePiskel": entry["sourcePiskel"],
            "runtimeOutputs": entry["runtimeOutputs"],
        })
    pack_entry = {
        "id": "all-player-animations-review",
        "displayName": "All Player Animations Review Pack",
        "fps": 12,
        "frameSize": [341, 341],
        "sheetColumns": 10,
    }
    write_json(ALL_PACK_PATH, make_piskel(pack_entry, frames))
    write_json(ALL_PACK_METADATA_PATH, {
        "sourceMode": "combined-piskel-review-pack",
        "sourceManifest": rel_path(MANIFEST_PATH),
        "packPath": rel_path(ALL_PACK_PATH),
        "frameCount": len(frames),
        "frameSize": [341, 341],
        "ranges": ranges,
        "notes": [
            "This file is for online Piskel review/import convenience.",
            "Animations larger than 341x341 are scaled only in this review canvas.",
            "Use each animation's Piskel source for exact Phaser export.",
        ],
    })
    write_contact_sheet(ALL_PACK_CONTACT_SHEET_PATH, frames)
    return {
        "ok": True,
        "pack": {
            "path": rel_path(ALL_PACK_PATH),
            "metadataPath": rel_path(ALL_PACK_METADATA_PATH),
            "contactSheetPath": rel_path(ALL_PACK_CONTACT_SHEET_PATH),
            "frameCount": len(frames),
            "ranges": ranges,
        },
    }
