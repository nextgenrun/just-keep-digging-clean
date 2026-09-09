"""Derive a tiny Observatory interior-life atlas from existing player animation sheets."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


FRAME_SIZE = 40
ATLAS_WIDTH = 2048
ACTION_SAMPLES = {"talk": ("idle-talk", 16), "mine": ("pickaxe-mining", 15), "walk": ("walk", 14)}


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _sample_indices(frame_count: int, sample_count: int) -> list[int]:
    return [round(index * frame_count / sample_count) % frame_count for index in range(sample_count)]


def _tiny_frame(sheet: Image.Image, source_index: int, action: dict) -> Image.Image:
    frame_width = int(action["frame_width"])
    frame_height = int(action["frame_height"])
    columns = int(action["columns"])
    source_x = source_index % columns * frame_width
    source_y = source_index // columns * frame_height
    frame = sheet.crop((source_x, source_y, source_x + frame_width, source_y + frame_height))
    left, top, right, bottom = (int(value) for value in action["alpha_union"])
    subject = frame.crop((left, top, right, bottom))
    scale = min((FRAME_SIZE - 4) / max(1, subject.width), (FRAME_SIZE - 3) / max(1, subject.height))
    resized = subject.resize((max(1, round(subject.width * scale)), max(1, round(subject.height * scale))), Image.Resampling.LANCZOS)
    result = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE))
    result.alpha_composite(resized, ((FRAME_SIZE - resized.width) // 2, FRAME_SIZE - resized.height - 1))
    return result


def build_interior_life_atlas(root: Path, output_dir: Path) -> dict:
    runtime_dir = root / "sprites/character/ual-native-player-v1/runtime"
    manifest_path = runtime_dir / "manifest.json"
    source_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    frames: dict[str, dict] = {}
    animations: dict[str, list[str]] = {}
    donors: dict[str, dict[str, str]] = {
        "manifest": {"path": str(manifest_path.relative_to(root)).replace("\\", "/"), "sha256": _sha256(manifest_path)}
    }
    atlas = Image.new("RGBA", (ATLAS_WIDTH, FRAME_SIZE * 2))
    cursor_x = cursor_y = 0
    for output_action, (source_action, sample_count) in ACTION_SAMPLES.items():
        action = source_manifest["actions"][source_action]
        sheet_path = runtime_dir / action["file"]
        donors[output_action] = {"path": str(sheet_path.relative_to(root)).replace("\\", "/"), "sha256": _sha256(sheet_path)}
        sheet = Image.open(sheet_path).convert("RGBA")
        animation_frames: list[str] = []
        for frame_number, source_index in enumerate(_sample_indices(int(action["frame_count"]), sample_count)):
            if cursor_x + FRAME_SIZE > ATLAS_WIDTH:
                cursor_x = 0
                cursor_y += FRAME_SIZE
            frame_name = f"interior-{output_action}-{frame_number:02d}"
            atlas.alpha_composite(_tiny_frame(sheet, source_index, action), (cursor_x, cursor_y))
            frame = {"x": cursor_x, "y": cursor_y, "w": FRAME_SIZE, "h": FRAME_SIZE}
            frames[frame_name] = {"frame": frame, "rotated": False, "trimmed": False, "spriteSourceSize": {"x": 0, "y": 0, "w": FRAME_SIZE, "h": FRAME_SIZE}, "sourceSize": {"w": FRAME_SIZE, "h": FRAME_SIZE}}
            animation_frames.append(frame_name)
            cursor_x += FRAME_SIZE
        animations[output_action] = animation_frames
    used_height = FRAME_SIZE if cursor_y == 0 else FRAME_SIZE * 2
    atlas = atlas.crop((0, 0, ATLAS_WIDTH, used_height))
    texture_name = "interior-life-existing-character-v1.png"
    atlas_name = "interior-life-existing-character-v1.json"
    atlas.save(output_dir / texture_name, optimize=True)
    payload = {"frames": frames, "meta": {"image": texture_name, "format": "RGBA8888", "size": {"w": ATLAS_WIDTH, "h": used_height}, "scale": "1"}}
    (output_dir / atlas_name).write_text(json.dumps(payload, separators=(",", ":")) + "\n", encoding="utf-8")
    return {"texturePath": texture_name, "atlasPath": atlas_name, "animations": animations, "donors": donors, "textureSha256": _sha256(output_dir / texture_name), "atlasSha256": _sha256(output_dir / atlas_name)}

