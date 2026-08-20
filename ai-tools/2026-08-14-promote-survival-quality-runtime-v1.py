"""Promote approved 1024px survival-character frames into active 256px sheets."""

from __future__ import annotations

import hashlib
import json
import shutil
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "visual-approval-previews/2026-08-14-survival-current-runtime-vs-full-improvements-v1/candidate-1024"
UAL = ROOT / "sprites/character/survival-ual-player-v1/runtime"
BLENDER = ROOT / "sprites/character/survival-character-blender-v2/runtime"
ARCHIVE = ROOT / "archive/2026-08-14-survival-quality-runtime-promotion-v1"
ROLLBACK = ARCHIVE / "rollback"
FRAME = 256


@dataclass(frozen=True)
class Family:
    name: str
    target: Path
    cells: tuple[int, ...]
    anchor: str
    manifest_action: str | None = None


FAMILIES = (
    Family("walk", BLENDER / "survival-character-blender-v2-walk-sheet.png", tuple(range(24)), "ground"),
    Family("run", UAL / "survival-ual-player-v1-animation-polish-run-sheet.webp", tuple(range(28)), "ground", "run-piskel-polished"),
    Family("mining-side", UAL / "survival-ual-player-v1-punch-jab-sheet.webp", tuple(range(3, 18)), "ground", "punch-jab"),
    Family("mining-up", BLENDER / "survival-character-blender-v2-dig-up-piskel-polished-sheet.png", tuple(range(24)), "ground"),
    Family("mining-down", UAL / "survival-ual-player-v1-ground-strike-sheet.webp", tuple(range(4, 41)), "ground", "ground-strike"),
    Family("flight", BLENDER / "survival-character-blender-v2-superman-flight-prone-v3-sheet.png", tuple(range(36)), "center"),
)

BACKUP_FILES = tuple(family.target for family in FAMILIES) + (
    UAL / "manifest.json",
    BLENDER / "manifest.json",
    ROOT / "values/survivalUalPlayerAssetProfile.js",
    ROOT / "values/playerAssetProfiles.js",
)
GUARD_FILES = (
    UAL / "survival-ual-player-v1-animation-polish-transitions-sheet.webp",
    UAL / "survival-ual-player-v1-moving-side-dig-jab-sheet.webp",
    UAL / "survival-ual-player-v1-moving-side-dig-cross-sheet.webp",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def alpha_box(image: Image.Image) -> tuple[int, int, int, int]:
    box = image.getchannel("A").getbbox()
    if box is None:
        raise ValueError("Unexpected empty animation frame")
    return box


def crop_cell(sheet: Image.Image, index: int) -> Image.Image:
    columns = sheet.width // FRAME
    x = (index % columns) * FRAME
    y = (index // columns) * FRAME
    return sheet.crop((x, y, x + FRAME, y + FRAME))


def paste_cell(sheet: Image.Image, cell: Image.Image, index: int) -> None:
    columns = sheet.width // FRAME
    sheet.paste(cell, ((index % columns) * FRAME, (index // columns) * FRAME))


def aligned_candidate(source_path: Path, reference: Image.Image, anchor: str):
    source = Image.open(source_path).convert("RGBA")
    if source.size != (1024, 1024):
        raise ValueError(f"Expected 1024px source: {source_path}")
    candidate = source.resize((FRAME, FRAME), Image.Resampling.LANCZOS)
    old_box = alpha_box(reference)
    new_box = alpha_box(candidate)
    old_cx = (old_box[0] + old_box[2]) / 2
    new_cx = (new_box[0] + new_box[2]) / 2
    dx = round(old_cx - new_cx)
    if anchor == "ground":
        dy = old_box[3] - new_box[3]
    else:
        old_cy = (old_box[1] + old_box[3]) / 2
        new_cy = (new_box[1] + new_box[3]) / 2
        dy = round(old_cy - new_cy)
    canvas = Image.new("RGBA", (FRAME, FRAME))
    canvas.alpha_composite(candidate, (dx, dy))
    packed_box = alpha_box(canvas)
    if packed_box[0] == 0 or packed_box[1] == 0 or packed_box[2] == FRAME or packed_box[3] == FRAME:
        raise ValueError(f"Candidate clips frame edge: {source_path} -> {packed_box}")
    return canvas, old_box, packed_box, (dx, dy)


def save_sheet(sheet: Image.Image, path: Path) -> None:
    if path.suffix.lower() == ".webp":
        sheet.save(path, "WEBP", lossless=True, quality=100, method=6, exact=True)
    else:
        sheet.save(path, "PNG", optimize=True)


def backup_once() -> dict[str, str]:
    hashes = {}
    for source in BACKUP_FILES:
        relative = source.relative_to(ROOT)
        destination = ROLLBACK / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        if not destination.exists():
            shutil.copy2(source, destination)
        if sha256(destination) != sha256(source):
            raise ValueError(f"Rollback copy mismatch: {relative}")
        hashes[str(relative).replace("\\", "/")] = sha256(source)
    return hashes


def promote_family(family: Family):
    source_frames = sorted((SOURCE / family.name).glob("frame-*.png"))
    if len(source_frames) != len(family.cells):
        raise ValueError(f"{family.name}: source/cell count mismatch")
    original = Image.open(family.target).convert("RGBA")
    promoted = original.copy()
    replaced = set(family.cells)
    results = []
    for source_path, cell_index in zip(source_frames, family.cells):
        reference = crop_cell(original, cell_index)
        candidate, old_box, new_box, offset = aligned_candidate(source_path, reference, family.anchor)
        paste_cell(promoted, candidate, cell_index)
        results.append({
            "source": source_path.name,
            "cell": cell_index,
            "old_alpha_bounds": list(old_box),
            "new_alpha_bounds": list(new_box),
            "translation_px": list(offset),
        })
    for index in range((original.width // FRAME) * (original.height // FRAME)):
        if index not in replaced and crop_cell(original, index).tobytes() != crop_cell(promoted, index).tobytes():
            raise ValueError(f"{family.name}: unrelated cell {index} changed")
    save_sheet(promoted, family.target)
    reloaded = Image.open(family.target).convert("RGBA")
    if reloaded.size != original.size:
        raise ValueError(f"{family.name}: sheet dimensions changed")
    for index in range((original.width // FRAME) * (original.height // FRAME)):
        if index not in replaced and crop_cell(original, index).tobytes() != crop_cell(reloaded, index).tobytes():
            raise ValueError(f"{family.name}: saved unrelated cell {index} changed")
    return results


def update_manifests(family_results: dict[str, list[dict]]) -> None:
    ual_path = UAL / "manifest.json"
    ual = json.loads(ual_path.read_text(encoding="utf-8"))
    for family in FAMILIES:
        if not family.manifest_action:
            continue
        bounds = ual["actions"][family.manifest_action]["alpha_bounds"]
        for result in family_results[family.name]:
            bounds[result["cell"]] = result["new_alpha_bounds"]
    promotion = {
        "version": 1,
        "promoted": "2026-08-14",
        "review_source": "visual-approval-previews/2026-08-14-survival-current-runtime-vs-full-improvements-v1",
        "source_render_px": 1024,
        "runtime_frame_px": 256,
        "downsample_passes": 1,
        "motion_timing_changed": False,
        "families": [family.name for family in FAMILIES if family.manifest_action],
    }
    ual["quality_promotion"] = promotion
    ual_path.write_text(json.dumps(ual, indent=2) + "\n", encoding="utf-8")

    blender_path = BLENDER / "manifest.json"
    blender = json.loads(blender_path.read_text(encoding="utf-8"))
    blender["qualityPromotion"] = {
        **promotion,
        "families": ["walk", "mining-up", "flight"],
        "flightMotionAuthority": "DG_SUPERMAN_FLIGHT_IDLE_PRONE_V3",
        "rejectedRunPolicy": "MINER_run not used",
    }
    blender_path.write_text(json.dumps(blender, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    before = backup_once()
    guard_before = {str(path.relative_to(ROOT)): sha256(path) for path in GUARD_FILES}
    results = {family.name: promote_family(family) for family in FAMILIES}
    update_manifests(results)
    guard_after = {str(path.relative_to(ROOT)): sha256(path) for path in GUARD_FILES}
    if guard_before != guard_after:
        raise ValueError("A protected transition or moving-dig sheet changed")
    report = {
        "version": 1,
        "status": "promoted",
        "source": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "principle": "same runtime motion and timing; approved render/deformation/material quality only",
        "rollback_sha256": before,
        "promoted_sha256": {
            str(path.relative_to(ROOT)).replace("\\", "/"): sha256(path)
            for path in (*[family.target for family in FAMILIES], UAL / "manifest.json", BLENDER / "manifest.json")
        },
        "protected_sha256": {key.replace("\\", "/"): value for key, value in guard_after.items()},
        "families": results,
    }
    (ARCHIVE / "promotion-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "promoted", "frames": sum(len(v) for v in results.values())}, indent=2))


if __name__ == "__main__":
    main()
