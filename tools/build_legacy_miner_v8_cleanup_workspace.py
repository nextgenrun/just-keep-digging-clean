from __future__ import annotations

import base64
import csv
import hashlib
import io
import json
import math
import shutil
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageStat


ROOT = Path(__file__).resolve().parents[1]
CHAR = ROOT / "sprites" / "character" / "character-v8"
MANIFEST_PATH = CHAR / "runtime" / "legacy-miner-v8-runtime-manifest.json"
AUDIT_DIR = ROOT / "markdown" / "audit" / "animation-audit"
OUT_DIR = AUDIT_DIR / "2026-07-02-legacy-miner-v8-frame-review"
BY_ANIMATION_DIR = OUT_DIR / "by-animation"
FRAME_SIZE = (341, 341)
PACK_COLUMNS = 12
CONTACT_COLUMNS = 8
THUMB_SIZE = (128, 128)


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def image_to_data_uri(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    payload = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{payload}"


def frame_paths(cleaned_dir: Path) -> list[Path]:
    return sorted(
        [path for path in cleaned_dir.iterdir() if path.suffix.lower() in {".png", ".webp"}],
        key=lambda path: path.name.lower(),
    )


def load_frames(cleaned_dir: Path) -> list[tuple[Path, Image.Image]]:
    frames = []
    for path in frame_paths(cleaned_dir):
        frame = Image.open(path).convert("RGBA")
        if frame.size != FRAME_SIZE:
            canvas = Image.new("RGBA", FRAME_SIZE, (0, 0, 0, 0))
            canvas.alpha_composite(frame, ((FRAME_SIZE[0] - frame.width) // 2, FRAME_SIZE[1] - frame.height))
            frame = canvas
        frames.append((path, frame))
    return frames


def raw_hash(frame: Image.Image) -> str:
    return hashlib.sha256(frame.tobytes()).hexdigest()


def adjacent_mean_diff(previous: Image.Image | None, frame: Image.Image) -> float | None:
    if previous is None:
        return None
    diff = ImageChops.difference(previous, frame)
    stat = ImageStat.Stat(diff)
    return round(sum(stat.mean) / len(stat.mean), 4)


def make_piskel(
    name: str,
    frames: list[Image.Image],
    *,
    columns: int = PACK_COLUMNS,
    layer_name: str = "Cleaned runtime frames",
) -> dict:
    columns = max(1, columns)
    rows = max(1, math.ceil(len(frames) / columns))
    sheet = Image.new("RGBA", (FRAME_SIZE[0] * columns, FRAME_SIZE[1] * rows), (0, 0, 0, 0))
    layout: list[list[int]] = []
    for row in range(rows):
        layout_row = []
        for column in range(columns):
            index = row * columns + column
            layout_row.append(index if index < len(frames) else -1)
            if index < len(frames):
                sheet.alpha_composite(frames[index], (column * FRAME_SIZE[0], row * FRAME_SIZE[1]))
        layout.append(layout_row)

    layer = {
        "name": layer_name,
        "opacity": 1,
        "frameCount": len(frames),
        "chunks": [{"layout": layout, "base64PNG": image_to_data_uri(sheet)}],
    }
    return {
        "modelVersion": 2,
        "piskel": {
            "name": name,
            "description": "Review-only pack. Use the JSON/CSV maps to apply cleanup decisions back to source animation assets.",
            "fps": 12,
            "height": FRAME_SIZE[1],
            "width": FRAME_SIZE[0],
            "layers": [json.dumps(layer, separators=(",", ":"))],
            "hiddenFrames": [],
        },
    }


def write_contact_sheet(
    records: list[dict],
    frames: list[Image.Image],
    duplicate_indices: set[int],
    out: Path,
    *,
    label_mode: str,
) -> Path:
    label_h = 34
    cell_w = THUMB_SIZE[0] + 20
    cell_h = THUMB_SIZE[1] + label_h + 14
    rows = max(1, math.ceil(len(frames) / CONTACT_COLUMNS))
    sheet = Image.new("RGB", (cell_w * CONTACT_COLUMNS, cell_h * rows), (18, 18, 18))
    draw = ImageDraw.Draw(sheet)

    for index, (record, frame) in enumerate(zip(records, frames)):
        column = index % CONTACT_COLUMNS
        row = index // CONTACT_COLUMNS
        x = column * cell_w
        y = row * cell_h
        fill = (30, 30, 30)
        outline = (170, 62, 62) if index in duplicate_indices else (64, 64, 64)
        draw.rectangle((x + 2, y + 2, x + cell_w - 3, y + cell_h - 3), fill=fill, outline=outline, width=2)
        thumb_bg = Image.new("RGBA", THUMB_SIZE, (24, 24, 24, 255))
        thumb = frame.resize(THUMB_SIZE, Image.Resampling.NEAREST)
        thumb_bg.alpha_composite(thumb)
        sheet.paste(thumb_bg.convert("RGB"), (x + 10, y + 8))
        if label_mode == "global":
            label = f"{record['globalFrame']:03d} {record['animation']}:{record['localFrame']:02d}"
        else:
            label = f"{record['localFrame']:03d} {record['animation']}"
        draw.text((x + 8, y + THUMB_SIZE[1] + 13), label[:22], fill=(232, 232, 232))
        if index in duplicate_indices:
            draw.text((x + 8, y + THUMB_SIZE[1] + 25), "EXACT REPEAT", fill=(255, 130, 130))

    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    return out


def write_csv(path: Path, records: list[dict]) -> None:
    fields = [
        "globalFrame",
        "animation",
        "localFrame",
        "sourceFrame",
        "sourcePiskel",
        "reviewFramePng",
        "exactDuplicateOfGlobal",
        "exactDuplicateOfLocal",
        "adjacentMeanDiffFromPrevious",
    ]
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for record in records:
            writer.writerow({field: record.get(field, "") for field in fields})


def duplicate_indices_from_groups(duplicate_groups: list[dict]) -> set[int]:
    return {
        frame
        for group in duplicate_groups
        for frame in group["frames"]
    }


def write_audit_root_readme() -> None:
    lines = [
        "# Animation Audit",
        "",
        "Review-only animation assets live here. These files are for visual inspection and frame cleanup notes.",
        "",
        "Current workspaces:",
        "- `2026-07-02-legacy-miner-v8-frame-review/` - legacy miner v8 frame review packs, contact sheets, and frame maps.",
        "",
        "Do not wire files from this audit directory directly into the game runtime.",
        "",
    ]
    AUDIT_DIR.mkdir(parents=True, exist_ok=True)
    (AUDIT_DIR / "readme.md").write_text("\n".join(lines), encoding="utf-8")


def write_readme(paths: dict[str, str]) -> None:
    lines = [
        "# Legacy Miner V8 Frame Review",
        "",
        "Open the `.piskel` files for visual review and frame deletion decisions.",
        "This workspace is review-only and is not loaded by the game runtime.",
        "",
        "Files:",
        f"- Combined review pack: `{paths['pack']}`",
        f"- Combined contact sheet: `{paths['contactSheet']}`",
        f"- Frame ranges/map: `{paths['rangesJson']}`",
        f"- CSV map: `{paths['rangesCsv']}`",
        f"- Per-animation review workspaces: `{paths['byAnimation']}`",
        "",
        "Frames outlined in red on the contact sheet are exact duplicate pixels within the same animation.",
        "Near repeats are listed in the JSON when adjacent frame mean difference is very low.",
        "",
    ]
    (OUT_DIR / "readme.md").write_text("\n".join(lines), encoding="utf-8")


def write_animation_review(
    animation: dict,
    frames: list[Image.Image],
    records: list[dict],
    duplicate_groups: list[dict],
    near_adjacent: list[dict],
) -> dict[str, str]:
    name = animation["name"]
    display_name = name.replace("-", " ").title()
    animation_dir = BY_ANIMATION_DIR / name
    if animation_dir.exists():
        shutil.rmtree(animation_dir)
    frames_dir = animation_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    for local_index, frame in enumerate(frames):
        frame_path = frames_dir / f"frame-{local_index:03d}.png"
        frame.save(frame_path)
        records[local_index]["reviewFramePng"] = rel(frame_path)

    review_path = animation_dir / f"{name}-review.piskel"
    review_path.write_text(json.dumps(make_piskel(
        f"Legacy Miner V8 {display_name} Review",
        frames,
        columns=min(PACK_COLUMNS, max(1, len(frames))),
        layer_name=f"{name} cleaned frames",
    ), indent=2) + "\n", encoding="utf-8")

    duplicate_indices = duplicate_indices_from_groups(duplicate_groups)
    contact_path = write_contact_sheet(
        records,
        frames,
        duplicate_indices,
        animation_dir / f"{name}-contact-sheet.png",
        label_mode="local",
    )
    frame_map_path = animation_dir / f"{name}-frame-map.csv"
    write_csv(frame_map_path, records)

    notes_path = animation_dir / f"{name}-review-notes.json"
    notes_path.write_text(json.dumps({
        "animation": name,
        "displayName": display_name,
        "frameCount": len(frames),
        "frameSize": list(FRAME_SIZE),
        "sourcePiskel": animation.get("piskel", ""),
        "cleanedFrames": animation["cleanedFrames"],
        "runtimeOutput": animation["output"],
        "reviewPiskel": rel(review_path),
        "framesDirectory": rel(frames_dir),
        "contactSheet": rel(contact_path),
        "frameMap": rel(frame_map_path),
        "exactDuplicateGroups": duplicate_groups,
        "nearAdjacentRepeats": near_adjacent,
        "notes": [
            "Review-only files for manual frame verification.",
            "Exact repeats are pixel-identical inside this animation.",
            "Near adjacent repeats are candidates only; inspect visually before deleting.",
        ],
    }, indent=2) + "\n", encoding="utf-8")

    return {
        "reviewPiskel": rel(review_path),
        "framesDirectory": rel(frames_dir),
        "contactSheet": rel(contact_path),
        "frameMap": rel(frame_map_path),
        "reviewNotes": rel(notes_path),
    }


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    write_audit_root_readme()
    if BY_ANIMATION_DIR.exists():
        shutil.rmtree(BY_ANIMATION_DIR)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    all_frames: list[Image.Image] = []
    records: list[dict] = []
    ranges: list[dict] = []
    duplicate_globals: set[int] = set()

    for animation in manifest["animations"]:
        name = animation["name"]
        cleaned_dir = ROOT / animation["cleanedFrames"]
        loaded = load_frames(cleaned_dir)
        start = len(all_frames)
        local_frames: list[Image.Image] = []
        local_records: list[dict] = []
        seen_hashes: dict[str, dict] = {}
        exact_groups: dict[str, list[int]] = {}
        near_adjacent: list[dict] = []
        previous_frame: Image.Image | None = None

        for local_index, (source_path, frame) in enumerate(loaded):
            global_index = len(all_frames)
            digest = raw_hash(frame)
            first = seen_hashes.get(digest)
            exact_duplicate_of_global = first["globalFrame"] if first else None
            exact_duplicate_of_local = first["localFrame"] if first else None
            if first:
                duplicate_globals.add(global_index)
                duplicate_globals.add(first["globalFrame"])
            else:
                seen_hashes[digest] = {"globalFrame": global_index, "localFrame": local_index}
            exact_groups.setdefault(digest, []).append(local_index)

            mean_diff = adjacent_mean_diff(previous_frame, frame)
            if mean_diff is not None and mean_diff <= 0.35:
                near_adjacent.append({
                    "localFrame": local_index,
                    "previousLocalFrame": local_index - 1,
                    "meanDiff": mean_diff,
                })

            record = {
                "globalFrame": global_index,
                "animation": name,
                "localFrame": local_index,
                "sourceFrame": rel(source_path),
                "sourcePiskel": animation.get("piskel", ""),
                "exactDuplicateOfGlobal": exact_duplicate_of_global,
                "exactDuplicateOfLocal": exact_duplicate_of_local,
                "adjacentMeanDiffFromPrevious": mean_diff,
            }
            records.append(record)
            local_records.append(record)
            all_frames.append(frame)
            local_frames.append(frame)
            previous_frame = frame

        duplicate_groups = [
            {"frames": frames}
            for frames in exact_groups.values()
            if len(frames) > 1
        ]
        review_paths = write_animation_review(
            animation,
            local_frames,
            local_records,
            duplicate_groups,
            near_adjacent,
        )
        ranges.append({
            "animation": name,
            "displayName": name.replace("-", " ").title(),
            "startGlobalFrame": start,
            "endGlobalFrame": len(all_frames) - 1,
            "frameCount": len(loaded),
            "sourcePiskel": animation.get("piskel", ""),
            "cleanedFrames": animation["cleanedFrames"],
            "runtimeOutput": animation["output"],
            **review_paths,
            "exactDuplicateGroups": duplicate_groups,
            "nearAdjacentRepeats": near_adjacent,
        })

    pack_path = OUT_DIR / "legacy-miner-v8-all-frames-cleanup.piskel"
    pack_path.write_text(json.dumps(make_piskel(
        "Legacy Miner V8 All Frames Cleanup",
        all_frames,
        layer_name="All cleaned runtime frames",
    ), indent=2) + "\n", encoding="utf-8")

    contact_path = write_contact_sheet(
        records,
        all_frames,
        duplicate_globals,
        OUT_DIR / "legacy-miner-v8-all-frames-contact-sheet.png",
        label_mode="global",
    )
    ranges_json_path = OUT_DIR / "legacy-miner-v8-all-frames-ranges.json"
    ranges_csv_path = OUT_DIR / "legacy-miner-v8-all-frames-map.csv"
    ranges_json_path.write_text(json.dumps({
        "sourceManifest": rel(MANIFEST_PATH),
        "pack": rel(pack_path),
        "contactSheet": rel(contact_path),
        "frameCount": len(all_frames),
        "frameSize": list(FRAME_SIZE),
        "ranges": ranges,
        "frames": records,
        "notes": [
            "Combined Piskel pack is for review. Apply final deletes to per-animation sourcePiskel files.",
            "exactDuplicateGroups are exact pixel matches inside one animation.",
            "nearAdjacentRepeats are candidates only; review visually before deleting.",
        ],
    }, indent=2) + "\n", encoding="utf-8")
    write_csv(ranges_csv_path, records)
    paths = {
        "pack": rel(pack_path),
        "contactSheet": rel(contact_path),
        "rangesJson": rel(ranges_json_path),
        "rangesCsv": rel(ranges_csv_path),
        "byAnimation": rel(BY_ANIMATION_DIR),
    }
    write_readme(paths)
    print(json.dumps({
        "ok": True,
        "frameCount": len(all_frames),
        "animationCount": len(ranges),
        **paths,
    }, indent=2))


if __name__ == "__main__":
    main()
