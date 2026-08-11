"""Build the review-only NPC idle v2 pose package from approved source art."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "visual-approval-previews" / "npc-idle-polish-v2"
POSES = OUT / "poses"
BOARD_FILES = {
    "character": OUT / "npc-idle-director-board-character-v2.png",
    "creature": OUT / "npc-idle-director-board-creature-v2.png",
}
BOARD_ROW_BOUNDS = {
    "character": ((0.0, 0.402), (0.402, 0.708), (0.708, 1.0)),
    "creature": ((0.0, 0.360), (0.360, 0.655), (0.655, 1.0)),
}
CURRENT_VIDEO_BASE = ROOT / "sprites" / "npc" / "npc-v6-animated" / "merchant-idle"
CURRENT_PREVIEW_BASE = ROOT / "visual-approval-previews" / "npc-idle-polish-v1"
CURRENT_POSES = OUT / "current-poses"
CURRENT_SAMPLE_COUNT = 12
BOARD_BG = (18, 20, 24)
SPEC_PATH = OUT / "review-spec.json"
NPCS = json.loads(SPEC_PATH.read_text(encoding="utf-8"))["npcs"]
for npc in NPCS:
    npc["source"] = ROOT / npc["source"]


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype(f"C:/Windows/Fonts/{name}", size)


def clean_green_spill(image: Image.Image) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA")).copy()
    red = rgba[:, :, 0].astype(np.int16)
    green = rgba[:, :, 1].astype(np.int16)
    blue = rgba[:, :, 2].astype(np.int16)
    spill = (green > 145) & (green > red * 1.35) & (green > blue * 1.18)
    rgba[spill, :3] = BOARD_BG
    rgba[spill, 3] = 255
    return Image.fromarray(rgba, "RGBA")


def fit_square(image: Image.Image, size: int, checker: bool = False) -> Image.Image:
    if checker:
        canvas = Image.new("RGB", (size, size), (26, 23, 32))
        draw = ImageDraw.Draw(canvas)
        step = max(16, size // 12)
        for y in range(0, size, step):
            for x in range(0, size, step):
                if (x // step + y // step) % 2 == 0:
                    draw.rectangle((x, y, x + step, y + step), fill=(40, 36, 47))
    else:
        canvas = Image.new("RGB", (size, size), BOARD_BG)
    subject = image.convert("RGBA")
    subject.thumbnail((size - 16, size - 16), Image.Resampling.LANCZOS)
    canvas.paste(subject, ((size - subject.width) // 2, (size - subject.height) // 2), subject)
    return canvas


def isolate_subject(image: Image.Image) -> Image.Image:
    rgb = np.asarray(image.convert("RGB"))
    high = rgb.max(axis=2)
    low = rgb.min(axis=2)
    mask = ((high > 48) & ((high - low > 8) | (high > 88))).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8), iterations=2)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if count <= 1:
        return image
    component = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    x, y, width, height = stats[component, :4]
    keep = labels == component
    filled = np.zeros_like(mask)
    contours, _ = cv2.findContours(keep.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(filled, contours, -1, 1, thickness=cv2.FILLED)
    filled = cv2.dilate(filled, np.ones((3, 3), np.uint8), iterations=1)
    cleaned = rgb.copy()
    cleaned[filled == 0] = BOARD_BG
    _, xs = np.where(filled > 0)
    padding = 12
    return Image.fromarray(cleaned, "RGB").crop((
        max(0, int(xs.min()) - padding),
        max(0, int(y) - padding),
        min(image.width, int(xs.max()) + padding + 1),
        min(image.height, int(y + height) + padding),
    ))


def build_pose_crops() -> dict[str, list[str]]:
    POSES.mkdir(parents=True, exist_ok=True)
    pose_paths: dict[str, list[str]] = {}
    for board_name, board_path in BOARD_FILES.items():
        if not board_path.exists():
            raise FileNotFoundError(f"Missing ImageGen board: {board_path}")
        board = clean_green_spill(Image.open(board_path))
        board.convert("RGB").save(board_path, optimize=True)
        width, height = board.size
        for npc in (item for item in NPCS if item["board"] == board_name):
            paths = []
            for column in range(4):
                left = round(column * width / 4)
                right = round((column + 1) * width / 4)
                top_ratio, bottom_ratio = BOARD_ROW_BOUNDS[board_name][npc["row"]]
                top = round(top_ratio * height)
                bottom = round(bottom_ratio * height)
                crop = isolate_subject(board.crop((left, top, right, bottom)))
                target = POSES / f"{npc['slug']}-pose-{column}.webp"
                fit_square(crop, 448).save(target, "WEBP", quality=92, method=6)
                paths.append(rel(target))
            pose_paths[npc["slug"]] = paths
    return pose_paths


def build_current_samples() -> dict[str, list[str]]:
    CURRENT_POSES.mkdir(parents=True, exist_ok=True)
    samples = {}
    for npc in NPCS:
        preview = CURRENT_PREVIEW_BASE / f"{npc['slug']}-idle-preview.webp"
        paths = []
        if preview.exists():
            animation = Image.open(preview)
            frame_total = getattr(animation, "n_frames", 1)
            for index in range(CURRENT_SAMPLE_COUNT):
                animation.seek(round(index * frame_total / CURRENT_SAMPLE_COUNT) % frame_total)
                target = CURRENT_POSES / f"{npc['slug']}-sample-{index:02d}.webp"
                animation.convert("RGB").save(target, "WEBP", quality=90, method=6)
                paths.append(rel(target))
        else:
            target = CURRENT_POSES / f"{npc['slug']}-static.webp"
            fit_square(Image.open(npc["source"]), 448, checker=True).save(target, "WEBP", quality=90, method=6)
            paths = [rel(target)] * CURRENT_SAMPLE_COUNT
        samples[npc["slug"]] = paths
    return samples


def current_frame(npc: dict) -> Image.Image:
    preview = CURRENT_PREVIEW_BASE / f"{npc['slug']}-idle-preview.webp"
    if preview.exists():
        image = Image.open(preview)
        image.seek(0)
        return image.convert("RGB")
    return fit_square(Image.open(npc["source"]), 448, checker=True)


def build_contact_sheet(pose_paths: dict[str, list[str]]) -> Path:
    cell, gap, title_h = 238, 12, 50
    row_h = cell + title_h + 26
    sheet = Image.new("RGB", (34 + cell * 5 + gap * 5, 56 + row_h * len(NPCS)), (12, 13, 17))
    draw = ImageDraw.Draw(sheet)
    draw.text((18, 12), "NPC IDLE POLISH V2 - CURRENT TO PROPOSED KEY POSES", font=font(26, True), fill=(247, 215, 137))
    pose_labels = ["CURRENT", "NEUTRAL", "ANTICIPATE", "CHARACTER BEAT", "SETTLE"]
    for row, npc in enumerate(NPCS):
        y = 56 + row * row_h
        draw.text((18, y + 4), f"{npc['label']}  -  {npc['durationSeconds']:.1f}s proposed loop", font=font(20, True), fill=(237, 231, 243))
        images = [current_frame(npc)] + [Image.open(ROOT / path).convert("RGB") for path in pose_paths[npc["slug"]]]
        for column, (label, image) in enumerate(zip(pose_labels, images)):
            x = 18 + column * (cell + gap)
            sheet.paste(image.resize((cell, cell), Image.Resampling.LANCZOS), (x, y + title_h))
            draw.text((x + 8, y + title_h + 8), label, font=font(13, True), fill=(255, 229, 150))
    target = OUT / "npc-idle-polish-v2-contact-sheet.png"
    sheet.save(target, optimize=True)
    return target


def build_manifest(pose_paths: dict[str, list[str]], current_samples: dict[str, list[str]], contact_sheet: Path) -> Path:
    entries = []
    for npc in NPCS:
        video = CURRENT_VIDEO_BASE / f"{npc['slug']}-idle-alpha.webm"
        active = video if video.exists() else npc["source"]
        entries.append({
            **{key: npc[key] for key in (
                "slug", "label", "runtimeId", "durationSeconds", "currentKind",
                "issue", "proposal", "secondary",
            )},
            "currentAsset": rel(active),
            "currentSha256": file_hash(active),
            "identityReference": rel(npc["source"]),
            "currentPosePaths": current_samples[npc["slug"]],
            "currentPoseLabels": [f"runtime {round(index * 100 / CURRENT_SAMPLE_COUNT)}%" for index in range(CURRENT_SAMPLE_COUNT)],
            "posePaths": pose_paths[npc["slug"]],
            "poseLabels": ["neutral", "anticipation", "character beat", "settle"],
        })
    manifest = {
        "reviewOnly": True,
        "productionChanged": False,
        "runtimeAssetsChanged": False,
        "generatedOn": "2026-07-26",
        "currentRuntimeContract": {
            "animatedMerchants": 5,
            "staticMerchants": 1,
            "format": "transparent VP9 WebM",
            "frameSizePx": 1024,
            "frames": 120,
            "fps": 30,
            "durationSeconds": 4,
            "gameDisplaySizePx": 137.95,
            "fallback": "static v5 merchant singles when VP9 WebM is unavailable",
        },
        "technicalFindings": [
            "The five loaded WebMs are byte-identical to the approved v1 review masters.",
            "Three animated merchants are still-image deformation loops rather than articulated performances.",
            "All five videos share the same four-second rhythm and are started together during NPC creation.",
            "Magma Money Monster is active but has no videoKey and therefore remains static.",
            "No proximity, greeting, shop-open, or voice-line animation state is selected; every video loops continuously.",
            "Five 1024x1024 alpha videos are decoded for an approximately 138px display, so a future production pass should benchmark smaller masters.",
        ],
        "boards": {key: rel(path) for key, path in BOARD_FILES.items()},
        "contactSheet": rel(contact_sheet),
        "reviewSpec": rel(SPEC_PATH),
        "npcs": entries,
    }
    target = OUT / "manifest.json"
    target.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return target


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    pose_paths = build_pose_crops()
    current_samples = build_current_samples()
    contact_sheet = build_contact_sheet(pose_paths)
    manifest = build_manifest(pose_paths, current_samples, contact_sheet)
    print(json.dumps({
        "reviewOnly": True,
        "productionChanged": False,
        "poses": sum(len(paths) for paths in pose_paths.values()),
        "currentSamples": sum(len(paths) for paths in current_samples.values()),
        "contactSheet": rel(contact_sheet),
        "manifest": rel(manifest),
    }, indent=2))


if __name__ == "__main__":
    main()
