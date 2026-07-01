#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from PIL import Image

from character_piskel_pipeline import (
    MANIFEST_PATH,
    ROOT,
    make_piskel,
    repo_path,
    save_runtime_frames,
    write_artifacts,
    write_json,
)


FRAMES_DIR = ROOT / "sprites" / "character" / "character-v5-walk" / "frames-clean"
ORDER_PATH = FRAMES_DIR / "walk-frame-order.json"
WALK_ID = "walk"
EXPECTED_FRAME_SIZE = (341, 341)
EXPECTED_FRAME_COUNT = 51
SHEET_COLUMNS = 12


def load_manifest() -> dict[str, Any]:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def walk_entry(manifest: dict[str, Any]) -> dict[str, Any]:
    for entry in manifest["animations"]:
        if entry["id"] == WALK_ID:
            return entry
    raise ValueError("walk entry missing from character animation manifest")


def ordered_frame_paths() -> list[Path]:
    if not FRAMES_DIR.is_dir():
        raise FileNotFoundError(FRAMES_DIR)
    paths = sorted(FRAMES_DIR.glob("*.png"), key=lambda path: path.name.casefold())
    if len(paths) != EXPECTED_FRAME_COUNT:
        raise ValueError(f"expected {EXPECTED_FRAME_COUNT} walk frames, found {len(paths)} in {FRAMES_DIR}")
    return paths


def load_frames(paths: list[Path]) -> list[Image.Image]:
    frames: list[Image.Image] = []
    bad: list[str] = []
    for path in paths:
        image = Image.open(path).convert("RGBA")
        if image.size != EXPECTED_FRAME_SIZE:
            bad.append(f"{path.name}: {image.size[0]}x{image.size[1]}")
        frames.append(image)
    if bad:
        raise ValueError("walk frames must all be 341x341: " + ", ".join(bad))
    return frames


def main() -> int:
    manifest = load_manifest()
    entry = walk_entry(manifest)
    paths = ordered_frame_paths()
    frames = load_frames(paths)

    entry["frameCount"] = len(frames)
    entry["sheetColumns"] = SHEET_COLUMNS
    entry["sourceFrameOrderPath"] = str(ORDER_PATH.relative_to(ROOT)).replace("\\", "/")

    write_json(MANIFEST_PATH, manifest)
    write_json(
        ORDER_PATH,
        {
            "id": WALK_ID,
            "sourceDirectory": str(FRAMES_DIR.relative_to(ROOT)).replace("\\", "/"),
            "frameCount": len(frames),
            "frameSize": list(EXPECTED_FRAME_SIZE),
            "orderedFiles": [path.name for path in paths],
            "importedAt": datetime.now().isoformat(timespec="seconds"),
        },
    )

    piskel_path = repo_path(entry["sourcePiskel"])
    write_json(piskel_path, make_piskel(entry, frames))
    runtime_info = save_runtime_frames(entry, frames)
    artifacts = write_artifacts(entry, frames, runtime_info)

    result = {
        "ok": True,
        "id": WALK_ID,
        "frameCount": len(frames),
        "sourcePiskel": entry["sourcePiskel"],
        "runtimeOutputs": runtime_info["outputs"],
        "orderPath": str(ORDER_PATH.relative_to(ROOT)).replace("\\", "/"),
        "artifacts": artifacts,
    }
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
