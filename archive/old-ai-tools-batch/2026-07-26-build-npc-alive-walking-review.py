"""Build review-only animated frame crops from the ImageGen walk boards."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "visual-approval-previews" / "npc-alive-walking-v4"
SPEC_PATH = OUT / "walking-spec.json"
PROMPT_PATH = OUT / "prompt-manifest.json"
BOARDS = {
    "character": OUT / "npc-alive-walking-character-v4.png",
    "creature": OUT / "npc-alive-walking-creature-v4.png",
}
FRAME_SIZE = 512
GRID_COLUMNS = 5
GRID_ROWS = 3


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def digest(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def crop_cell(board: Image.Image, column: int, row: int) -> Image.Image:
    width, height = board.size
    bounds = (
        round(column * width / GRID_COLUMNS),
        round(row * height / GRID_ROWS),
        round((column + 1) * width / GRID_COLUMNS),
        round((row + 1) * height / GRID_ROWS),
    )
    cell = board.crop(bounds).convert("RGB")
    canvas = Image.new("RGB", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0))
    fitted = ImageOps.contain(
        cell,
        (FRAME_SIZE, FRAME_SIZE),
        Image.Resampling.LANCZOS,
    )
    offset = (
        (FRAME_SIZE - fitted.width) // 2,
        (FRAME_SIZE - fitted.height) // 2,
    )
    canvas.paste(fitted, offset)
    return canvas


def main() -> None:
    spec = json.loads(SPEC_PATH.read_text(encoding="utf-8"))
    missing = [relative(path) for path in BOARDS.values() if not path.exists()]
    if missing:
        raise FileNotFoundError(f"Missing ImageGen boards: {', '.join(missing)}")
    boards = {
        board_id: Image.open(path).convert("RGB")
        for board_id, path in BOARDS.items()
    }

    frames = {}
    for npc in spec["npcs"]:
        target_dir = OUT / "frames" / npc["slug"]
        target_dir.mkdir(parents=True, exist_ok=True)
        frames[npc["slug"]] = []
        for column in range(GRID_COLUMNS):
            target = target_dir / f"frame-{column + 1:02d}.webp"
            crop_cell(boards[npc["board"]], column, npc["row"]).save(
                target,
                "WEBP",
                quality=95,
                method=5,
            )
            frames[npc["slug"]].append({
                "path": relative(target),
                "sha256": digest(target),
                "dimensions": [FRAME_SIZE, FRAME_SIZE],
                "durationMs": npc["frameDurationsMs"][column],
                "offsetTiles": npc["offsetTiles"][column],
            })

    board_manifest = {}
    for board_id, path in BOARDS.items():
        with Image.open(path) as board:
            board_manifest[board_id] = {
                "path": relative(path),
                "sha256": digest(path),
                "dimensions": list(board.size),
            }
    manifest = {
        "created": "2026-07-26",
        "reviewOnly": True,
        "productionChanged": False,
        "runtimeAlreadyWired": True,
        "generator": relative(Path(__file__)),
        "spec": relative(SPEC_PATH),
        "promptManifest": relative(PROMPT_PATH),
        "boards": board_manifest,
        "frames": frames,
        "runtimeFilesChangedByMockup": [],
    }
    target = OUT / "manifest.json"
    target.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Built {sum(len(items) for items in frames.values())} review walk frames")
    print(relative(target))


if __name__ == "__main__":
    main()
