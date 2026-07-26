"""Promote the approved NPC activity boards into transparent runtime cutouts."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "visual-approval-previews" / "npc-idle-activities-v3"
SPEC_PATH = REVIEW / "activity-spec.json"
REVIEW_POSES = REVIEW / "poses"
OUT = ROOT / "sprites" / "npc" / "npc-v8-activities"
SINGLES = OUT / "singles"
CANVAS_SIZE = 512
QA_THUMB = 190
QA_GAP = 12
QA_HEADER = 70
QA_LABEL = 36
ACTIVITY_IDS = ("quiet", "work", "rare", "player")


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def digest(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    filename = "segoeuib.ttf" if bold else "segoeui.ttf"
    candidate = Path("C:/Windows/Fonts") / filename
    if candidate.exists():
        return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def build_alpha(rgb: np.ndarray) -> np.ndarray:
    """Separate the near-neutral charcoal board from the illustrated subject."""
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]
    height, width = value.shape

    mask = np.full((height, width), cv2.GC_PR_FGD, dtype=np.uint8)
    near_charcoal = (value < 62) & (saturation < 72)
    deepest_charcoal = (value < 40) & (saturation < 58)
    confident_subject = (value > 92) | ((saturation > 82) & (value > 42))

    mask[near_charcoal] = cv2.GC_PR_BGD
    mask[deepest_charcoal] = cv2.GC_BGD
    mask[confident_subject] = cv2.GC_FGD

    edge = 7
    mask[:edge, :] = cv2.GC_BGD
    mask[-edge:, :] = cv2.GC_BGD
    mask[:, :edge] = cv2.GC_BGD
    mask[:, -edge:] = cv2.GC_BGD

    background_model = np.zeros((1, 65), np.float64)
    foreground_model = np.zeros((1, 65), np.float64)
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    cv2.grabCut(
        bgr,
        mask,
        None,
        background_model,
        foreground_model,
        2,
        cv2.GC_INIT_WITH_MASK,
    )

    grabbed = (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)
    detached_detail = (value > 82) | ((saturation > 88) & (value > 38))
    binary = (grabbed | detached_detail).astype(np.uint8) * 255

    kernel = np.ones((3, 3), np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    alpha = cv2.GaussianBlur(binary, (0, 0), 0.72)
    alpha[alpha < 7] = 0
    alpha[alpha > 247] = 255
    return alpha


def clean_cutout(source: Path) -> tuple[Image.Image, tuple[int, int, int, int], float]:
    image = Image.open(source).convert("RGB").resize(
        (CANVAS_SIZE, CANVAS_SIZE),
        Image.Resampling.LANCZOS,
    )
    rgb = np.asarray(image)
    alpha = build_alpha(rgb)
    rgba = np.dstack((rgb, alpha))
    rgba[alpha == 0, :3] = 0
    result = Image.fromarray(rgba, "RGBA")
    bounds = result.getbbox()
    if bounds is None:
        raise ValueError(f"No subject extracted from {relative(source)}")
    coverage = float(np.count_nonzero(alpha > 24)) / float(alpha.size)
    if coverage < 0.06 or coverage > 0.72:
        raise ValueError(
            f"Suspicious alpha coverage {coverage:.3f} for {relative(source)}"
        )
    return result, bounds, coverage


def checkerboard(size: tuple[int, int], cell: int = 16) -> Image.Image:
    width, height = size
    board = Image.new("RGB", size, (44, 48, 57))
    draw = ImageDraw.Draw(board)
    light = (72, 78, 91)
    for y in range(0, height, cell):
        for x in range(0, width, cell):
            if ((x // cell) + (y // cell)) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=light)
    return board


def build_qa_sheet(spec: dict, outputs: dict[str, dict[str, dict]]) -> Path:
    rows = len(spec["npcs"])
    width = QA_GAP * 5 + QA_THUMB * 4
    row_height = QA_THUMB + QA_LABEL + QA_GAP
    height = QA_HEADER + rows * row_height + QA_GAP
    sheet = checkerboard((width, height))
    draw = ImageDraw.Draw(sheet)
    draw.rectangle((0, 0, width, QA_HEADER), fill=(12, 15, 21))
    draw.text((QA_GAP, 10), "NPC V8 ACTIVITY RUNTIME ALPHA QA", font=font(23, True), fill=(249, 215, 125))
    draw.text((QA_GAP, 40), "quiet / work / rare / player", font=font(14), fill=(224, 229, 238))

    for row, npc in enumerate(spec["npcs"]):
        top = QA_HEADER + row * row_height
        for column, activity_id in enumerate(ACTIVITY_IDS):
            left = QA_GAP + column * (QA_THUMB + QA_GAP)
            path = ROOT / outputs[npc["slug"]][activity_id]["path"]
            pose = Image.open(path).convert("RGBA")
            pose.thumbnail((QA_THUMB, QA_THUMB), Image.Resampling.LANCZOS)
            x = left + (QA_THUMB - pose.width) // 2
            y = top + (QA_THUMB - pose.height)
            sheet.paste(pose, (x, y), pose)
            label = f"{npc['label']} · {activity_id}"
            draw.text((left + 4, top + QA_THUMB + 4), label, font=font(10, True), fill=(245, 245, 248))

    target = OUT / "npc-v8-activity-alpha-qa.png"
    sheet.save(target, optimize=True)
    return target


def main() -> None:
    spec = json.loads(SPEC_PATH.read_text(encoding="utf-8"))
    SINGLES.mkdir(parents=True, exist_ok=True)
    outputs: dict[str, dict[str, dict]] = {}

    for npc in spec["npcs"]:
        slug = npc["slug"]
        outputs[slug] = {}
        for activity in npc["activities"]:
            activity_id = activity["id"]
            source = REVIEW_POSES / f"{slug}-{activity_id}.webp"
            target = SINGLES / f"{slug}-{activity_id}.webp"
            cutout, bounds, coverage = clean_cutout(source)
            cutout.save(target, "WEBP", lossless=True, quality=100, method=4)
            outputs[slug][activity_id] = {
                "path": relative(target),
                "sha256": digest(target),
                "dimensions": list(cutout.size),
                "alphaBounds": list(bounds),
                "alphaCoverage": round(coverage, 5),
                "sourceReviewPose": relative(source),
                "sourceReviewSha256": digest(source),
            }

    qa_sheet = build_qa_sheet(spec, outputs)
    manifest = {
        "created": "2026-07-26",
        "runtimeApproved": True,
        "reviewOnly": False,
        "productionChanged": True,
        "generator": relative(Path(__file__)),
        "approvedReviewManifest": relative(REVIEW / "manifest.json"),
        "canvas": [CANVAS_SIZE, CANVAS_SIZE],
        "activities": list(ACTIVITY_IDS),
        "assets": outputs,
        "qaSheet": relative(qa_sheet),
        "qaSheetSha256": digest(qa_sheet),
    }
    manifest_path = OUT / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Promoted {sum(len(group) for group in outputs.values())} activity cutouts")
    print(relative(manifest_path))
    print(relative(qa_sheet))


if __name__ == "__main__":
    main()
