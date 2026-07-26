"""Build clean v5 review crops and the production v9 planted-idle pack."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from statistics import median

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "visual-approval-previews" / "npc-planted-idles-v5"
RUNTIME = ROOT / "sprites" / "npc" / "npc-v9-planted-idles"
SINGLES = RUNTIME / "singles"
POSES = REVIEW / "poses"
SPEC_PATH = REVIEW / "activity-spec.json"
CANVAS = 512
SAFE_PAD = 10
BASELINE_Y = 496
BOARD_GROUPS = {
    "base": ("quiet", "work", "rare", "player"),
    "extension": ("inspect", "habit", "signature", "showcase"),
}
BOARDS = {
    ("character", "base"): ROOT / "visual-approval-previews" / "npc-idle-activities-v3"
        / "npc-activity-director-board-character-v3.png",
    ("creature", "base"): ROOT / "visual-approval-previews" / "npc-idle-activities-v3"
        / "npc-activity-director-board-creature-v3.png",
    ("character", "extension"): REVIEW / "npc-planted-idles-character-extension-v5.png",
    ("creature", "extension"): REVIEW / "npc-planted-idles-creature-extension-v5.png",
}


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    filename = "segoeuib.ttf" if bold else "segoeui.ttf"
    path = Path("C:/Windows/Fonts") / filename
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def runs(values: np.ndarray, threshold: float, minimum: int) -> list[tuple[int, int]]:
    found: list[tuple[int, int]] = []
    start = None
    for index, active in enumerate(values > threshold):
        if active and start is None:
            start = index
        if start is not None and (not active or index == len(values) - 1):
            end = index if not active else index + 1
            if end - start >= minimum:
                found.append((start, end))
            start = None
    return found


def detect_panels(image: Image.Image) -> tuple[list[tuple[int, int]], list[tuple[int, int]]]:
    rgb = np.asarray(image.convert("RGB"))
    light = rgb.max(axis=2)
    columns = runs((light > 3).mean(axis=0), 0.25, image.width // 12)
    rows = runs((light > 3).mean(axis=1), 0.25, image.height // 8)
    if len(columns) != 4 or len(rows) != 3:
        raise ValueError(f"Expected 4x3 isolated panels, found {len(columns)}x{len(rows)}")
    column_gaps = [columns[i + 1][0] - columns[i][1] for i in range(3)]
    row_gaps = [rows[i + 1][0] - rows[i][1] for i in range(2)]
    if min(column_gaps + row_gaps) < 6:
        raise ValueError("Panel gutters are too small for contamination-safe crops")
    return columns, rows


def fit_panel(panel: Image.Image) -> Image.Image:
    canvas = Image.new("RGB", (CANVAS, CANVAS), (13, 16, 22))
    fitted = ImageOps.contain(
        panel.convert("RGB"),
        (CANVAS - SAFE_PAD * 2, CANVAS - SAFE_PAD * 2),
        Image.Resampling.LANCZOS,
    )
    canvas.paste(fitted, ((CANVAS - fitted.width) // 2, (CANVAS - fitted.height) // 2))
    return canvas


def build_alpha(rgb: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    saturation, value = hsv[:, :, 1], hsv[:, :, 2]
    mask = np.full(value.shape, cv2.GC_PR_FGD, dtype=np.uint8)
    mask[(value < 64) & (saturation < 74)] = cv2.GC_PR_BGD
    mask[(value < 42) & (saturation < 60)] = cv2.GC_BGD
    mask[(value > 94) | ((saturation > 84) & (value > 44))] = cv2.GC_FGD
    mask[:SAFE_PAD, :] = mask[-SAFE_PAD:, :] = cv2.GC_BGD
    mask[:, :SAFE_PAD] = mask[:, -SAFE_PAD:] = cv2.GC_BGD
    bg_model, fg_model = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(
        cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR),
        mask,
        None,
        bg_model,
        fg_model,
        2,
        cv2.GC_INIT_WITH_MASK,
    )
    grabbed = (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)
    details = (value > 84) | ((saturation > 90) & (value > 40))
    binary = (grabbed | details).astype(np.uint8) * 255
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    alpha = cv2.GaussianBlur(binary, (0, 0), 0.72)
    alpha[alpha < 8] = 0
    alpha[alpha > 246] = 255
    return alpha


def extract(panel: Image.Image) -> dict:
    rgb = np.asarray(panel.convert("RGB"))
    alpha = build_alpha(rgb)
    rgba = np.dstack((rgb, alpha))
    rgba[alpha == 0, :3] = 0
    labels_count, labels, stats, _ = cv2.connectedComponentsWithStats(
        (alpha > 24).astype(np.uint8),
        8,
    )
    if labels_count < 2:
        raise ValueError("No foreground component found")
    main_id = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    x, y, width, height, area = [int(v) for v in stats[main_id]]
    coverage = float(np.count_nonzero(alpha > 24)) / float(alpha.size)
    if coverage < 0.05 or coverage > 0.72:
        raise ValueError(f"Suspicious alpha coverage: {coverage:.3f}")
    return {
        "image": Image.fromarray(rgba, "RGBA"),
        "mainBounds": (x, y, x + width, y + height),
        "mainArea": area,
        "coverage": coverage,
    }


def normalize(item: dict, target_height: float) -> tuple[Image.Image, dict]:
    image: Image.Image = item["image"]
    full = image.getbbox()
    if full is None:
        raise ValueError("Empty extracted pose")
    main = item["mainBounds"]
    cropped = image.crop(full)
    main_local = (
        main[0] - full[0], main[1] - full[1],
        main[2] - full[0], main[3] - full[1],
    )
    scale = max(0.84, min(1.16, target_height / max(1, main_local[3] - main_local[1])))
    for _ in range(3):
        size = (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale)))
        resized = cropped.resize(size, Image.Resampling.LANCZOS)
        main_center = (main_local[0] + main_local[2]) * 0.5 * scale
        main_bottom = main_local[3] * scale
        left = round(CANVAS * 0.5 - main_center)
        top = round(BASELINE_Y - main_bottom)
        if left >= SAFE_PAD and top >= SAFE_PAD and left + size[0] <= CANVAS - SAFE_PAD:
            break
        available = min(
            (CANVAS - SAFE_PAD * 2) / size[0],
            (CANVAS - SAFE_PAD * 2) / size[1],
        )
        scale *= min(0.96, available)
    left = max(SAFE_PAD, min(left, CANVAS - SAFE_PAD - resized.width))
    top = max(SAFE_PAD, min(top, CANVAS - SAFE_PAD - resized.height))
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.alpha_composite(resized, (left, top))
    alpha = np.asarray(canvas.getchannel("A"))
    edge_pixels = int(
        np.count_nonzero(alpha[:SAFE_PAD])
        + np.count_nonzero(alpha[-SAFE_PAD:])
        + np.count_nonzero(alpha[:, :SAFE_PAD])
        + np.count_nonzero(alpha[:, -SAFE_PAD:])
    )
    if edge_pixels:
        raise ValueError(f"Foreground touches safe canvas edge: {edge_pixels} pixels")
    return canvas, {
        "alphaBounds": list(canvas.getbbox() or (0, 0, 0, 0)),
        "mainHeightTarget": round(target_height, 2),
        "scale": round(scale, 5),
        "alphaCoverage": round(float(np.count_nonzero(alpha > 24)) / alpha.size, 5),
        "edgeOpaquePixels": edge_pixels,
    }


def checkerboard(size: tuple[int, int], cell: int = 16) -> Image.Image:
    image = Image.new("RGB", size, (45, 49, 58))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(73, 79, 92))
    return image


def build_qa(spec: dict, assets: dict) -> Path:
    thumb, gap, header, label = 126, 10, 66, 32
    width = gap * 9 + thumb * 8
    height = header + len(spec["npcs"]) * (thumb + label + gap) + gap
    sheet = checkerboard((width, height))
    draw = ImageDraw.Draw(sheet)
    draw.rectangle((0, 0, width, header), fill=(11, 14, 20))
    draw.text((gap, 9), "NPC V9 PLANTED IDLES · 48 CLEAN CUTOUTS", font=font(21, True), fill=(249, 215, 125))
    draw.text((gap, 38), "quiet / work / rare / player / inspect / habit / signature / showcase", font=font(12), fill=(226, 231, 240))
    for row, npc in enumerate(spec["npcs"]):
        top = header + row * (thumb + label + gap)
        for column, activity_id in enumerate(spec["activityIds"]):
            left = gap + column * (thumb + gap)
            pose = Image.open(ROOT / assets[npc["slug"]][activity_id]["path"]).convert("RGBA")
            pose.thumbnail((thumb, thumb), Image.Resampling.LANCZOS)
            sheet.paste(pose, (left + (thumb - pose.width) // 2, top + thumb - pose.height), pose)
            draw.text((left + 2, top + thumb + 3), f"{npc['label']} · {activity_id}", font=font(8, True), fill=(246, 246, 249))
    target = RUNTIME / "npc-v9-planted-idles-alpha-qa.png"
    sheet.save(target, optimize=True)
    return target


def main() -> None:
    spec = json.loads(SPEC_PATH.read_text(encoding="utf-8"))
    POSES.mkdir(parents=True, exist_ok=True)
    SINGLES.mkdir(parents=True, exist_ok=True)
    boards, panel_data, extracted = {}, {}, {}
    for key, path in BOARDS.items():
        image = Image.open(path).convert("RGB")
        columns, rows = detect_panels(image)
        boards[key] = image
        panel_data[f"{key[0]}-{key[1]}"] = {
            "path": relative(path),
            "sha256": digest(path),
            "dimensions": list(image.size),
            "columns": [list(span) for span in columns],
            "rows": [list(span) for span in rows],
        }
    for npc in spec["npcs"]:
        extracted[npc["slug"]] = {}
        for group, activity_ids in BOARD_GROUPS.items():
            image = boards[(npc["board"], group)]
            columns, rows = detect_panels(image)
            for column, activity_id in enumerate(activity_ids):
                bounds = (
                    columns[column][0],
                    rows[npc["row"]][0],
                    columns[column][1],
                    rows[npc["row"]][1],
                )
                panel = fit_panel(image.crop(bounds))
                review_path = POSES / f"{npc['slug']}-{activity_id}.webp"
                panel.save(review_path, "WEBP", quality=96, method=6)
                extracted[npc["slug"]][activity_id] = {
                    **extract(panel),
                    "reviewPath": review_path,
                    "sourcePanel": list(bounds),
                    "sourceBoard": f"{npc['board']}-{group}",
                }
    assets = {}
    for npc in spec["npcs"]:
        slug = npc["slug"]
        target_height = median(item["mainBounds"][3] - item["mainBounds"][1] for item in extracted[slug].values())
        assets[slug] = {}
        for activity_id in spec["activityIds"]:
            item = extracted[slug][activity_id]
            output, metrics = normalize(item, target_height)
            target = SINGLES / f"{slug}-{activity_id}.webp"
            output.save(target, "WEBP", lossless=True, quality=100, method=4)
            assets[slug][activity_id] = {
                "path": relative(target),
                "sha256": digest(target),
                "dimensions": [CANVAS, CANVAS],
                **metrics,
                "sourceBoard": item["sourceBoard"],
                "sourcePanel": item["sourcePanel"],
                "reviewPose": relative(item["reviewPath"]),
                "reviewPoseSha256": digest(item["reviewPath"]),
            }
    qa = build_qa(spec, assets)
    review_manifest = {
        "created": "2026-07-26",
        "reviewOnly": False,
        "productionChanged": True,
        "runtimeLoadedFromPreview": False,
        "generator": relative(Path(__file__)),
        "activitySpec": relative(SPEC_PATH),
        "promptManifest": relative(REVIEW / "prompt-manifest.json"),
        "boards": panel_data,
        "poseCount": sum(len(group) for group in assets.values()),
        "runtimeManifest": relative(RUNTIME / "manifest.json"),
        "cropSafety": "Detected 4x3 isolated panels; 10px canvas guard; zero opaque edge pixels.",
    }
    (REVIEW / "manifest.json").write_text(json.dumps(review_manifest, indent=2) + "\n", encoding="utf-8")
    runtime_manifest = {
        "created": "2026-07-26",
        "runtimeApproved": True,
        "reviewOnly": False,
        "productionChanged": True,
        "walkingRemoved": True,
        "generator": relative(Path(__file__)),
        "sourceReviewManifest": relative(REVIEW / "manifest.json"),
        "canvas": [CANVAS, CANVAS],
        "baselineY": BASELINE_Y,
        "activities": spec["activityIds"],
        "assets": assets,
        "qaSheet": relative(qa),
        "qaSheetSha256": digest(qa),
    }
    manifest = RUNTIME / "manifest.json"
    manifest.write_text(json.dumps(runtime_manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Built {sum(len(group) for group in assets.values())} clean planted-idle assets")
    print(relative(manifest))
    print(relative(qa))


if __name__ == "__main__":
    main()
