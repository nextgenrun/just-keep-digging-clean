"""Pack weapon-free native UAL PNG renders into high-quality Phaser sheets."""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw


DEFAULT_TILE = 256
DEFAULT_COLUMNS = 16
SOURCE_WINDOW = 448
SOURCE_LEFT = 32
SOURCE_BASELINE = 430
TARGET_VISIBLE_HEIGHT_TILES = 0.8
DISPLAY_SIZE = 109
PLAYER_BODY_WIDTH = 31
PLAYER_BODY_HEIGHT = 75
PIPELINE_ID = "native-ual-game-rig-v2-zero-weapon"
COMPATIBLE_PIPELINES = {
    PIPELINE_ID,
    "native-ual-game-rig-v1-zero-weapon",
    "native-ual-zero-retarget-no-weapon",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--tile", type=int, default=DEFAULT_TILE)
    parser.add_argument("--columns", type=int, default=DEFAULT_COLUMNS)
    parser.add_argument("--asset-prefix", default="ual-native-player-v1")
    parser.add_argument(
        "--pipeline-id",
        default=PIPELINE_ID,
        help="Pipeline id written to the runtime manifest (defaults to the native UAL id).",
    )
    parser.add_argument(
        "--merge-existing",
        action="store_true",
        help="Merge packed actions into an existing runtime manifest without replacing its actions or preview.",
    )
    parser.add_argument(
        "--remove-actions",
        default="",
        help="Comma-separated rejected action ids to remove while merging regenerated actions.",
    )
    return parser.parse_args()


def load_manifest(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def resized_frame(path: Path, tile: int, recenter_horizontal: bool) -> tuple[Image.Image, tuple[int, int, int, int]]:
    with Image.open(path) as source:
        rgba = source.convert("RGBA")
        if rgba.size != (512, 512):
            raise ValueError(f"Expected 512x512 native render, found {rgba.size}: {path}")
        bbox = rgba.getchannel("A").getbbox()
        if not bbox:
            raise ValueError(f"Native render has no visible pixels: {path}")
        crop_left = round((bbox[0] + bbox[2] - SOURCE_WINDOW) * 0.5) if recenter_horizontal else SOURCE_LEFT
        crop_top = bbox[3] - SOURCE_BASELINE
        crop = (crop_left, crop_top, crop_left + SOURCE_WINDOW, crop_top + SOURCE_WINDOW)
        frame = rgba.crop(crop).resize((tile, tile), Image.Resampling.LANCZOS)
        return frame, crop


def transform_rig_markers(
    render_manifest: dict[str, object],
    source_crops: list[list[int]],
    tile: int,
) -> dict[str, object] | None:
    marker_metadata = render_manifest.get("rig_markers")
    if not isinstance(marker_metadata, dict):
        return None
    source_frames = marker_metadata.get("frames")
    if not isinstance(source_frames, dict):
        return None

    packed_frames: dict[str, dict[str, list[float]]] = {}
    marker_names: set[str] = set()
    for index, crop in enumerate(source_crops):
        source_markers = source_frames.get(str(index))
        if not isinstance(source_markers, dict):
            continue
        left, top, right, bottom = crop
        width = max(1, right - left)
        height = max(1, bottom - top)
        packed_markers: dict[str, list[float]] = {}
        for marker_name, point in source_markers.items():
            if not isinstance(point, list) or len(point) < 2:
                continue
            x, y = float(point[0]), float(point[1])
            packed_markers[str(marker_name)] = [
                round((x - left) * tile / width, 4),
                round((y - top) * tile / height, 4),
            ]
            marker_names.add(str(marker_name))
        if packed_markers:
            packed_frames[str(index)] = packed_markers

    if not packed_frames:
        return None
    return {
        "version": int(marker_metadata.get("version", 1)),
        "space": "packed-frame-px",
        "source": marker_metadata.get("source", "projected-native-bones"),
        "bone_points": marker_metadata.get("bone_points", {}),
        "marker_names": sorted(marker_names),
        "frames": packed_frames,
    }


def pack_action(
    action_root: Path,
    output_root: Path,
    tile: int,
    max_columns: int,
    asset_prefix: str,
) -> tuple[dict[str, object], Image.Image]:
    render_manifest = load_manifest(action_root / "render-manifest.json")
    frame_names = list(render_manifest["frames"])
    action = str(render_manifest["action"])
    packed_frames = [
        resized_frame(
            action_root / name,
            tile,
            recenter_horizontal=bool(render_manifest.get("recenter_horizontal", action == "death")),
        )
        for name in frame_names
    ]
    frames = [frame for frame, _ in packed_frames]
    source_crops = [list(crop) for _, crop in packed_frames]
    alpha_bounds = [
        list(bounds) if (bounds := frame.getchannel("A").getbbox()) else None
        for frame in frames
    ]
    columns = min(max_columns, len(frames))
    rows = math.ceil(len(frames) / columns)
    sheet = Image.new("RGBA", (columns * tile, rows * tile), (0, 0, 0, 0))
    alpha_union: tuple[int, int, int, int] | None = None
    for index, frame in enumerate(frames):
        x = (index % columns) * tile
        y = (index // columns) * tile
        sheet.alpha_composite(frame, (x, y))
        bbox = frame.getchannel("A").getbbox()
        if bbox:
            alpha_union = bbox if alpha_union is None else (
                min(alpha_union[0], bbox[0]),
                min(alpha_union[1], bbox[1]),
                max(alpha_union[2], bbox[2]),
                max(alpha_union[3], bbox[3]),
            )
    file_name = f"{asset_prefix}-{action}-sheet.webp"
    sheet.save(output_root / file_name, "WEBP", lossless=True, quality=100, method=6, exact=True)
    representative = frames[min(len(frames) - 1, len(frames) // 2)]
    metadata = {
        "file": file_name,
        "frame_count": len(frames),
        "frame_width": tile,
        "frame_height": tile,
        "columns": columns,
        "rows": rows,
        "fps": render_manifest["fps"],
        "loop": render_manifest["loop"],
        "source": render_manifest["source"],
        "source_clip": render_manifest["source_clip"],
        "source_clips": render_manifest.get("source_clips", [render_manifest["source_clip"]]),
        "source_frame_ranges": render_manifest.get("source_frame_ranges", []),
        "source_crop_mode": "fixed-scale-per-frame-baseline",
        "source_window": SOURCE_WINDOW,
        "source_crops": source_crops,
        "alpha_bounds": alpha_bounds,
        "alpha_union": list(alpha_union) if alpha_union else None,
        "game_retarget": render_manifest.get("game_retarget"),
        "motion_origin": render_manifest.get("motion_origin", "native-source-clip"),
        "authored_pose": render_manifest.get("authored_pose"),
        "visual_skin": render_manifest.get("visual_skin"),
        "weapon": None,
    }
    rig_markers = transform_rig_markers(render_manifest, source_crops, tile)
    if rig_markers is not None:
        metadata["rig_markers"] = rig_markers
    return metadata, representative


def validate_existing_manifest(manifest: dict[str, object], tile: int, pipeline_id: str) -> None:
    if manifest.get("pipeline") not in COMPATIBLE_PIPELINES | {pipeline_id}:
        raise ValueError("Existing runtime manifest uses an incompatible render pipeline")
    if manifest.get("frame_width") != tile or manifest.get("frame_height") != tile:
        raise ValueError("Existing runtime manifest frame size does not match --tile")
    if not isinstance(manifest.get("actions"), dict):
        raise ValueError("Existing runtime manifest has no actions object")


def read_packed_alpha_bounds(output_root: Path, metadata: dict[str, object]) -> list[list[int] | None]:
    sheet_path = output_root / str(metadata["file"])
    if not sheet_path.is_file():
        raise FileNotFoundError(f"Existing action sheet is missing: {sheet_path}")
    frame_width = int(metadata["frame_width"])
    frame_height = int(metadata["frame_height"])
    columns = int(metadata["columns"])
    frame_count = int(metadata["frame_count"])
    with Image.open(sheet_path) as source:
        sheet = source.convert("RGBA")
        bounds: list[list[int] | None] = []
        for index in range(frame_count):
            left = (index % columns) * frame_width
            top = (index // columns) * frame_height
            frame = sheet.crop((left, top, left + frame_width, top + frame_height))
            alpha_bounds = frame.getchannel("A").getbbox()
            bounds.append(list(alpha_bounds) if alpha_bounds else None)
    return bounds


def build_preview(
    output_root: Path,
    actions: dict[str, dict[str, object]],
    representatives: dict[str, Image.Image],
    tile: int,
    asset_prefix: str,
) -> str:
    labels = list(actions)
    columns = 4
    card_width = DISPLAY_SIZE + 24
    card_height = DISPLAY_SIZE + 58
    rows = math.ceil(len(labels) / columns)
    preview = Image.new("RGB", (columns * card_width, rows * card_height), (17, 25, 30))
    draw = ImageDraw.Draw(preview)
    for index, action in enumerate(labels):
        x = (index % columns) * card_width
        y = (index // columns) * card_height
        draw.rounded_rectangle((x + 4, y + 4, x + card_width - 4, y + card_height - 4), 10, fill=(25, 35, 40), outline=(74, 107, 112), width=1)
        game_frame = representatives[action].resize((DISPLAY_SIZE, DISPLAY_SIZE), Image.Resampling.LANCZOS)
        preview.paste(game_frame, (x + 12, y + 10), game_frame)
        draw.text((x + 12, y + DISPLAY_SIZE + 14), action, fill=(220, 226, 224))
        draw.text((x + 12, y + DISPLAY_SIZE + 30), "1x game", fill=(126, 160, 164))
    file_name = f"{asset_prefix}-preview.webp"
    preview.save(output_root / file_name, "WEBP", quality=94, method=6)
    return file_name


def main() -> None:
    args = parse_args()
    removed_actions = {
        value.strip()
        for value in args.remove_actions.split(",")
        if value.strip()
    }
    input_root = Path(args.input).resolve()
    output_root = Path(args.output).resolve()
    output_root.mkdir(parents=True, exist_ok=True)
    existing_manifest: dict[str, object] | None = None
    runtime_manifest_path = output_root / "manifest.json"
    if args.merge_existing:
        if not runtime_manifest_path.is_file():
            raise FileNotFoundError("--merge-existing requires an existing output manifest.json")
        existing_manifest = load_manifest(runtime_manifest_path)
        validate_existing_manifest(existing_manifest, args.tile, args.pipeline_id)
    actions: dict[str, dict[str, object]] = {}
    representatives: dict[str, Image.Image] = {}
    for manifest_path in sorted(input_root.glob("*/render-manifest.json")):
        metadata, representative = pack_action(
            manifest_path.parent,
            output_root,
            args.tile,
            args.columns,
            args.asset_prefix,
        )
        action = str(manifest_path.parent.name)
        actions[action] = metadata
        representatives[action] = representative
    if not actions:
        raise RuntimeError(f"No action render manifests found below {input_root}")
    if existing_manifest is not None:
        merged_actions: dict[str, dict[str, object]] = {}
        for action, metadata in existing_manifest["actions"].items():
            merged_metadata = dict(metadata)
            alpha_bounds = merged_metadata.get("alpha_bounds")
            if not isinstance(alpha_bounds, list) or len(alpha_bounds) != int(merged_metadata["frame_count"]):
                merged_metadata["alpha_bounds"] = read_packed_alpha_bounds(output_root, merged_metadata)
            merged_actions[str(action)] = merged_metadata
        merged_actions.update(actions)
        for action in removed_actions:
            merged_actions.pop(action, None)
        manifest = dict(existing_manifest)
        manifest["actions"] = merged_actions
        mode = f"merged={len(actions)} removed={len(removed_actions)} total={len(merged_actions)}"
    else:
        preview = build_preview(
            output_root,
            actions,
            representatives,
            args.tile,
            args.asset_prefix,
        )
        manifest = {
            "version": 1,
            "pipeline": args.pipeline_id,
            "frame_width": args.tile,
            "frame_height": args.tile,
            "source_crop_mode": "fixed-scale-per-frame-baseline",
            "source_window": SOURCE_WINDOW,
            "source_x_bounds": [SOURCE_LEFT, SOURCE_LEFT + SOURCE_WINDOW],
            "source_baseline": SOURCE_BASELINE,
            "display_size_px": DISPLAY_SIZE,
            "target_visible_height_tiles": TARGET_VISIBLE_HEIGHT_TILES,
            "visual_origin": [0.5, 247 / 256],
            "player_body": {"width_px": PLAYER_BODY_WIDTH, "height_px": PLAYER_BODY_HEIGHT},
            "source_facing": "right",
            "left_facing": "flipX",
            "weapon_policy": "none",
            "preview": preview,
            "actions": {
                action: metadata
                for action, metadata in actions.items()
                if action not in removed_actions
            },
        }
        mode = f"actions={len(actions)}"
    manifest["display_size_px"] = DISPLAY_SIZE
    manifest["pipeline"] = args.pipeline_id
    manifest["game_rig_version"] = 2
    manifest["rig_marker_schema"] = {
        "version": 1,
        "space": "packed-frame-px",
        "required_markers": ["hand_l", "hand_r", "foot_l", "foot_r", "pelvis", "head"],
    }
    manifest["target_visible_height_tiles"] = TARGET_VISIBLE_HEIGHT_TILES
    manifest["player_body"] = {"width_px": PLAYER_BODY_WIDTH, "height_px": PLAYER_BODY_HEIGHT}
    visual_skins = [
        metadata.get("visual_skin")
        for metadata in manifest.get("actions", {}).values()
    ]
    if visual_skins and all(skin is not None and skin == visual_skins[0] for skin in visual_skins):
        manifest["visual_skin"] = visual_skins[0]
    for action_metadata in manifest.get("actions", {}).values():
        action_metadata.setdefault("game_retarget", None)
    runtime_manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"UAL_NATIVE_PACK_OK {mode} output={output_root}")


if __name__ == "__main__":
    main()
