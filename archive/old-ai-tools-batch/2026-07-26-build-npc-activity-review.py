"""Build review-only NPC activity pose crops, contact sheet, and manifest."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "visual-approval-previews" / "npc-idle-activities-v3"
POSES = OUT / "poses"
SPEC_PATH = OUT / "activity-spec.json"
BOARD_FILES = {
    "character": OUT / "npc-activity-director-board-character-v3.png",
    "creature": OUT / "npc-activity-director-board-creature-v3.png",
}
BOARD_ROW_PIXELS = {
    "character": ((0, 361), (377, 717), (733, 1086)),
    "creature": ((0, 358), (365, 660), (667, 1024)),
}
BG = (10, 12, 16)
PANEL_BG = (17, 20, 25)
GOLD = (250, 214, 126)
TEXT = (235, 232, 239)
MUTED = (164, 164, 177)
POSE_SIZE = 512


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def digest(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    family = "arialbd.ttf" if bold else "arial.ttf"
    candidates = (
        Path("C:/Windows/Fonts") / family,
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
    )
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def fit_panel(image: Image.Image, size: int = POSE_SIZE) -> Image.Image:
    canvas = Image.new("RGB", (size, size), PANEL_BG)
    contained = ImageOps.contain(image.convert("RGB"), (size, size), Image.Resampling.LANCZOS)
    offset = ((size - contained.width) // 2, (size - contained.height) // 2)
    canvas.paste(contained, offset)
    return canvas


def build_pose_crops(spec: dict) -> dict[str, dict[str, str]]:
    POSES.mkdir(parents=True, exist_ok=True)
    boards = {name: Image.open(path).convert("RGB") for name, path in BOARD_FILES.items()}
    output: dict[str, dict[str, str]] = {}
    for npc in spec["npcs"]:
        board = boards[npc["board"]]
        width, height = board.size
        row = npc["row"]
        top, bottom = BOARD_ROW_PIXELS[npc["board"]][row]
        if bottom > height:
            raise ValueError(f"Board row bounds exceed {npc['board']} height {height}")
        output[npc["slug"]] = {}
        for column, activity in enumerate(npc["activities"]):
            bounds = (
                round(column * width / 4),
                top,
                round((column + 1) * width / 4),
                bottom,
            )
            target = POSES / f"{npc['slug']}-{activity['id']}.webp"
            fit_panel(board.crop(bounds)).save(target, "WEBP", quality=94, method=6)
            output[npc["slug"]][activity["id"]] = relative(target)
    return output


def build_contact_sheet(spec: dict, pose_paths: dict[str, dict[str, str]]) -> Path:
    cell = 226
    gap = 12
    left = 20
    header = 88
    row_height = cell + 84
    width = left * 2 + cell * 4 + gap * 3
    height = header + row_height * len(spec["npcs"]) + 18
    sheet = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(sheet)
    draw.text((left, 14), "NPC ACTIVITY PASS V3", font=font(28, True), fill=GOLD)
    draw.text(
        (left, 50),
        "QUIET BASE  /  WORK ACTIVITY  /  RARE SIGNATURE  /  PLAYER REACTION",
        font=font(15, True),
        fill=TEXT,
    )
    for index, npc in enumerate(spec["npcs"]):
        top = header + index * row_height
        draw.text((left, top), npc["label"], font=font(19, True), fill=TEXT)
        for column, activity in enumerate(npc["activities"]):
            x = left + column * (cell + gap)
            y = top + 30
            image = Image.open(ROOT / pose_paths[npc["slug"]][activity["id"]]).convert("RGB")
            sheet.paste(image.resize((cell, cell), Image.Resampling.LANCZOS), (x, y))
            draw.text((x + 8, y + cell + 4), activity["label"], font=font(13, True), fill=GOLD)
        draw.text((left, top + cell + 56), npc["rhythm"], font=font(12), fill=MUTED)
    target = OUT / "npc-idle-activities-v3-contact-sheet.png"
    sheet.save(target, optimize=True)
    return target


def build_manifest(
    spec: dict,
    pose_paths: dict[str, dict[str, str]],
    contact_sheet: Path,
) -> Path:
    boards = {}
    for name, path in BOARD_FILES.items():
        with Image.open(path) as image:
            boards[name] = {
                "path": relative(path),
                "sha256": digest(path),
                "dimensions": list(image.size),
            }
    manifest = {
        "created": "2026-07-26",
        "reviewOnly": True,
        "productionChanged": False,
        "generator": "ai-tools/2026-07-26-build-npc-activity-review.py",
        "activitySpec": relative(SPEC_PATH),
        "boards": boards,
        "poses": pose_paths,
        "contactSheet": relative(contact_sheet),
        "runtimeFilesChanged": [],
        "note": "Direction-board crops and a timing simulator only; not production animation frames.",
    }
    target = OUT / "manifest.json"
    target.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return target


def main() -> None:
    spec = json.loads(SPEC_PATH.read_text(encoding="utf-8"))
    missing = [str(path) for path in BOARD_FILES.values() if not path.exists()]
    if missing:
        raise FileNotFoundError(f"Missing activity director board(s): {', '.join(missing)}")
    pose_paths = build_pose_crops(spec)
    contact_sheet = build_contact_sheet(spec, pose_paths)
    manifest = build_manifest(spec, pose_paths, contact_sheet)
    print(f"Built {sum(len(item) for item in pose_paths.values())} review poses")
    print(relative(contact_sheet))
    print(relative(manifest))


if __name__ == "__main__":
    main()
