"""Build a review-only, anchor-stable Piskel repair of ground-damage V1.

This does not edit or replace the production atlas.  It registers each
twelve-state fracture family around one fixed tile-center seed, preserves
earlier damage cumulatively, applies one shared scale per family, round-trips
the result through editable Piskel documents, and emits visual QA evidence.
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SEMANTIC_ROOT = ROOT / "sprites/backgrounds/world-visual-v2/semantic-decals-v1"
V1_ROOT = SEMANTIC_ROOT / "imagegen-ground-damage-v1"
ALPHA_ROOT = V1_ROOT / "alpha-sheets"
EXPORT_ROOT = ROOT / "exports/piskel/ground-damage-anchor-v2-review"
PROJECT_ROOT = EXPORT_ROOT / "projects"
STRIP_ROOT = EXPORT_ROOT / "strips"
PREVIEW_ROOT = ROOT / "visual-approval-previews/ground-damage-anchor-v2-review"
REPORT_PATH = EXPORT_ROOT / "geometry-report.json"
MANIFEST_PATH = EXPORT_ROOT / "manifest.json"
CANDIDATE_ATLAS = EXPORT_ROOT / "ground-damage-anchor-v2-candidate-atlas.png"

PISKEL_TOOLS = ROOT / "tools/piskel-mcp"
sys.path.insert(0, str(PISKEL_TOOLS))
from piskel_document import make_piskel, read_piskel  # noqa: E402


FRAME_PX = 188
CONTENT_PX = 176
TARGET_ANCHOR = (FRAME_PX // 2, FRAME_PX // 2)
WORK_PX = 272
WORK_ANCHOR = (WORK_PX // 2, WORK_PX // 2)
WORK_INSET = ((WORK_PX - FRAME_PX) // 2, (WORK_PX - FRAME_PX) // 2)
SOURCE_WIDTH = 1536
SOURCE_HEIGHT = 1024
SOURCE_COLUMNS = 4
SOURCE_ROWS = 3
SOURCE_CELL_PX = 341
SOURCE_COLUMN_STRIDE = 384
SOURCE_X_INSET = 21
SOURCE_ROW_BOUNDARIES = (0, 341, 683, SOURCE_HEIGHT)
VARIANTS = 10
STATES = 12
ALPHA_THRESHOLD = 12
CORE_ALPHA_THRESHOLD = 36
SEARCH_RADIUS = 30
FPS = 6

FAMILY_NAMES = (
    "diagonal-fracture",
    "reverse-shear",
    "horizontal-shear",
    "vertical-pressure",
    "stress-arc",
    "hooked-fault",
    "double-kink",
    "staggered-shear",
    "abrasion-first",
    "compression-crescents",
)

MATERIALS = (
    ("town earth", "sprites/backgrounds/world-visual-v2/materials/town-dark-earth-v1.png"),
    ("shallow blue", "sprites/backgrounds/world-scenic-facade-v1/level1-shallow-blue-seamless.webp"),
    ("amber crystal", "sprites/backgrounds/world-scenic-facade-v1/level1-amber-crystal-seamless.webp"),
    ("obsidian", "sprites/backgrounds/world-scenic-facade-v1/level2-obsidian-ember-seamless.webp"),
)


def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pixel_sha256(image: Image.Image) -> str:
    return hashlib.sha256(image.convert("RGBA").tobytes()).hexdigest()


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size) if path.is_file() else ImageFont.load_default()


def source_frame_box(state_index: int) -> tuple[int, int, int, int]:
    column = state_index % SOURCE_COLUMNS
    row = state_index // SOURCE_COLUMNS
    left = column * SOURCE_COLUMN_STRIDE + SOURCE_X_INSET
    top = SOURCE_ROW_BOUNDARIES[row]
    bottom = SOURCE_ROW_BOUNDARIES[row + 1]
    return (left, top, left + SOURCE_CELL_PX, bottom)


def load_v1_frames(variant_index: int) -> list[Image.Image]:
    path = ALPHA_ROOT / f"variant-{variant_index + 1:02d}.png"
    sheet = Image.open(path).convert("RGBA")
    if sheet.size != (SOURCE_WIDTH, SOURCE_HEIGHT):
        raise ValueError(f"{relative(path)} is {sheet.size}, expected {(SOURCE_WIDTH, SOURCE_HEIGHT)}")
    inset = (FRAME_PX - CONTENT_PX) // 2
    frames: list[Image.Image] = []
    for state in range(STATES):
        content = sheet.crop(source_frame_box(state)).resize(
            (CONTENT_PX, CONTENT_PX),
            Image.Resampling.LANCZOS,
        )
        frame = Image.new("RGBA", (FRAME_PX, FRAME_PX), (0, 0, 0, 0))
        frame.alpha_composite(content, (inset, inset))
        frames.append(frame)
    return frames


def alpha_array(image: Image.Image) -> np.ndarray:
    return np.asarray(image.getchannel("A"), dtype=np.uint8)


def robust_core_mask(image: Image.Image) -> np.ndarray:
    mask = (alpha_array(image) > CORE_ALPHA_THRESHOLD).astype(np.uint8)
    count, labels, stats, _centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if count <= 1:
        return mask
    largest = int(stats[1:, cv2.CC_STAT_AREA].max())
    minimum = max(5, int(math.ceil(largest * 0.018)))
    keep = np.zeros_like(mask)
    for label in range(1, count):
        if int(stats[label, cv2.CC_STAT_AREA]) >= minimum:
            keep[labels == label] = 1
    return cv2.morphologyEx(keep, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))


def weighted_centroid(image: Image.Image) -> tuple[float, float]:
    alpha = alpha_array(image).astype(np.float64) / 255.0
    weights = alpha * alpha
    total = float(weights.sum())
    if total <= 0:
        return (float(TARGET_ANCHOR[0]), float(TARGET_ANCHOR[1]))
    ys, xs = np.indices(weights.shape)
    return (float((xs * weights).sum() / total), float((ys * weights).sum() / total))


def embed_mask(mask: np.ndarray, shift: tuple[int, int] = (0, 0)) -> np.ndarray:
    result = np.zeros((WORK_PX, WORK_PX), dtype=np.uint8)
    x = WORK_INSET[0] + shift[0]
    y = WORK_INSET[1] + shift[1]
    result[y:y + FRAME_PX, x:x + FRAME_PX] = mask
    return result


def embed_rgba(image: Image.Image, shift: tuple[int, int]) -> Image.Image:
    result = Image.new("RGBA", (WORK_PX, WORK_PX), (0, 0, 0, 0))
    result.alpha_composite(image, (WORK_INSET[0] + shift[0], WORK_INSET[1] + shift[1]))
    return result


def register_shift(
    frame: Image.Image,
    previous_mask: np.ndarray | None,
) -> tuple[int, int, float]:
    cx, cy = weighted_centroid(frame)
    expected = (
        int(round(TARGET_ANCHOR[0] - cx)),
        int(round(TARGET_ANCHOR[1] - cy)),
    )
    if previous_mask is None:
        return (*expected, 1.0)

    current = embed_mask(robust_core_mask(frame))
    current = cv2.dilate(current, np.ones((3, 3), np.uint8))
    previous = cv2.dilate(previous_mask, np.ones((3, 3), np.uint8))
    padded = np.pad(current.astype(np.float32), SEARCH_RADIUS)
    scores = cv2.matchTemplate(padded, previous.astype(np.float32), cv2.TM_CCORR_NORMED)
    scores = np.nan_to_num(scores, nan=-1.0)

    height, width = scores.shape
    ys, xs = np.indices((height, width))
    candidate_dx = SEARCH_RADIUS - xs
    candidate_dy = SEARCH_RADIUS - ys
    distance_sq = (candidate_dx - expected[0]) ** 2 + (candidate_dy - expected[1]) ** 2
    adjusted = scores - distance_sq.astype(np.float32) * 0.00035
    best_y, best_x = np.unravel_index(int(np.argmax(adjusted)), adjusted.shape)
    dx = int(SEARCH_RADIUS - best_x)
    dy = int(SEARCH_RADIUS - best_y)
    return (dx, dy, float(scores[best_y, best_x]))


def premultiplied_affine(
    image: Image.Image,
    scale: float,
    source_anchor: tuple[float, float],
    target_anchor: tuple[float, float],
    output_size: tuple[int, int],
) -> Image.Image:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.float32) / 255.0
    alpha = rgba[:, :, 3:4]
    premultiplied = np.concatenate((rgba[:, :, :3] * alpha, alpha), axis=2)
    matrix = np.asarray(
        (
            (scale, 0.0, target_anchor[0] - scale * source_anchor[0]),
            (0.0, scale, target_anchor[1] - scale * source_anchor[1]),
        ),
        dtype=np.float32,
    )
    warped = cv2.warpAffine(
        premultiplied,
        matrix,
        output_size,
        # Positive bilinear weights preserve the cumulative alpha invariant.
        # They also match the linear filtering used when Phaser downsamples
        # these 188 px frames to the 94 px logical tile.
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0, 0),
    )
    warped_alpha = np.clip(warped[:, :, 3:4], 0.0, 1.0)
    rgb = np.zeros_like(warped[:, :, :3])
    np.divide(
        np.clip(warped[:, :, :3], 0.0, 1.0),
        np.maximum(warped_alpha, 1 / 255),
        out=rgb,
        where=warped_alpha > 1 / 255,
    )
    straight = np.concatenate((np.clip(rgb, 0.0, 1.0), warped_alpha), axis=2)
    return Image.fromarray(np.rint(straight * 255).astype(np.uint8), "RGBA")


def metrics(image: Image.Image) -> dict[str, Any]:
    alpha = alpha_array(image)
    visible = alpha > ALPHA_THRESHOLD
    points = np.argwhere(visible)
    if points.size == 0:
        return {
            "boundsPx": None,
            "coverage": 0.0,
            "weightedCentroidPx": None,
            "edgeVisiblePixels": 0,
        }
    top, left = points.min(axis=0)
    bottom, right = points.max(axis=0)
    cx, cy = weighted_centroid(image)
    edge = int(
        visible[0, :].sum()
        + visible[-1, :].sum()
        + visible[:, 0].sum()
        + visible[:, -1].sum()
    )
    return {
        "boundsPx": [int(left), int(top), int(right + 1), int(bottom + 1)],
        "coverage": round(float(visible.mean()), 6),
        "weightedCentroidPx": [round(cx, 4), round(cy, 4)],
        "edgeVisiblePixels": edge,
    }


def build_family(
    variant_index: int,
    originals: list[Image.Image],
) -> tuple[list[Image.Image], dict[str, Any]]:
    shifts: list[tuple[int, int]] = []
    match_scores: list[float] = []
    aligned_current: list[Image.Image] = []
    previous_registration_mask: np.ndarray | None = None

    for frame in originals:
        dx, dy, score = register_shift(frame, previous_registration_mask)
        shifts.append((dx, dy))
        match_scores.append(score)
        aligned = embed_rgba(frame, (dx, dy))
        aligned_current.append(aligned)
        previous_registration_mask = embed_mask(robust_core_mask(frame), (dx, dy))

    cumulative: list[Image.Image] = []
    current = Image.new("RGBA", (WORK_PX, WORK_PX), (0, 0, 0, 0))
    for aligned in aligned_current:
        current = Image.alpha_composite(current, aligned)
        cumulative.append(current.copy())

    union_alpha = alpha_array(cumulative[-1])
    points = np.argwhere(union_alpha > ALPHA_THRESHOLD)
    if points.size == 0:
        raise AssertionError(f"Variant {variant_index + 1} has no visible final frame")
    top, left = points.min(axis=0)
    bottom, right = points.max(axis=0)
    union_width = int(right - left + 1)
    union_height = int(bottom - top + 1)
    safe_radius = CONTENT_PX / 2
    anchor_extents = (
        WORK_ANCHOR[0] - int(left),
        int(right) + 1 - WORK_ANCHOR[0],
        WORK_ANCHOR[1] - int(top),
        int(bottom) + 1 - WORK_ANCHOR[1],
    )
    shared_scale = min(
        1.0,
        *(safe_radius / max(1, extent) for extent in anchor_extents),
    )

    repaired = [
        premultiplied_affine(
            frame,
            shared_scale,
            WORK_ANCHOR,
            TARGET_ANCHOR,
            (FRAME_PX, FRAME_PX),
        )
        for frame in cumulative
    ]

    previous_visible: np.ndarray | None = None
    frame_reports = []
    for state_index, (original, candidate, shift, score) in enumerate(
        zip(originals, repaired, shifts, match_scores)
    ):
        visible = alpha_array(candidate) > ALPHA_THRESHOLD
        retained = 1.0
        if previous_visible is not None and previous_visible.any():
            retained = float((visible & previous_visible).sum() / previous_visible.sum())
        previous_visible = visible
        source_anchor = [TARGET_ANCHOR[0] - shift[0], TARGET_ANCHOR[1] - shift[1]]
        mapped_anchor = [
            round(TARGET_ANCHOR[0] + shared_scale * (
                source_anchor[0] + shift[0] - TARGET_ANCHOR[0]
            ), 6),
            round(TARGET_ANCHOR[1] + shared_scale * (
                source_anchor[1] + shift[1] - TARGET_ANCHOR[1]
            ), 6),
        ]
        frame_reports.append({
            "state": state_index + 1,
            "sourceAnchorPx": source_anchor,
            "registrationShiftPx": list(shift),
            "registrationMatchScore": round(score, 6),
            "mappedAnchorPx": mapped_anchor,
            "previousVisibleRetention": round(retained, 6),
            "original": metrics(original),
            "candidate": metrics(candidate),
            "pixelSha256": pixel_sha256(candidate),
        })

    coverages = [entry["candidate"]["coverage"] for entry in frame_reports]
    if any(after + 0.000001 < before for before, after in zip(coverages, coverages[1:])):
        raise AssertionError(f"Variant {variant_index + 1}: repaired coverage is not cumulative")
    if any(entry["candidate"]["edgeVisiblePixels"] for entry in frame_reports):
        raise AssertionError(f"Variant {variant_index + 1}: repaired content touches a canvas edge")
    if any(entry["previousVisibleRetention"] < 0.998 for entry in frame_reports[1:]):
        raise AssertionError(f"Variant {variant_index + 1}: repaired stage loses prior visible damage")

    report = {
        "variant": variant_index + 1,
        "family": FAMILY_NAMES[variant_index],
        "policy": "fixed-canvas-ground-fracture-seed",
        "frameSizePx": [FRAME_PX, FRAME_PX],
        "targetPivotPx": list(TARGET_ANCHOR),
        "targetFractureSeedPx": list(TARGET_ANCHOR),
        "surfacePlane": "orthographic tile center",
        "sharedScale": round(shared_scale, 8),
        "workUnionBoundsPx": [int(left), int(top), int(right + 1), int(bottom + 1)],
        "workUnionSizePx": [union_width, union_height],
        "frames": frame_reports,
    }
    return repaired, report


def write_piskel(
    variant_index: int,
    frames: list[Image.Image],
    report: dict[str, Any],
) -> Path:
    family = FAMILY_NAMES[variant_index]
    entry = {
        "id": f"ground-damage-{variant_index + 1:02d}-{family}",
        "displayName": f"Ground damage {variant_index + 1:02d} {family}",
        "frameSize": [FRAME_PX, FRAME_PX],
        "frameCount": STATES,
        "sheetColumns": STATES,
        "fps": FPS,
    }
    document = make_piskel(entry, frames)
    document["piskel"]["description"] = (
        "Review-only anchor-stable ground-damage sequence. "
        "Canvas/pivot/seed must remain fixed for all twelve states."
    )
    document["jkdAlignment"] = {
        "policy": report["policy"],
        "authority": "auto-registration candidate; requires visual approval before production",
        "driftTolerancePx": 0,
        "canvasPx": report["frameSizePx"],
        "targetPivotPx": report["targetPivotPx"],
        "targetFractureSeedPx": report["targetFractureSeedPx"],
        "surfacePlane": report["surfacePlane"],
        "sharedScale": report["sharedScale"],
        "frameOrder": [entry["state"] for entry in report["frames"]],
        "sourceIds": [
            f"imagegen-ground-damage-v1/variant-{variant_index + 1:02d}/state-{state:02d}"
            for state in range(1, STATES + 1)
        ],
        "normalizationTransforms": [
            {
                "state": entry["state"],
                "sourceAnchorPx": entry["sourceAnchorPx"],
                "registrationShiftPx": entry["registrationShiftPx"],
                "sharedScale": report["sharedScale"],
                "mappedAnchorPx": entry["mappedAnchorPx"],
            }
            for entry in report["frames"]
        ],
        "pixelSha256": [entry["pixelSha256"] for entry in report["frames"]],
    }
    PROJECT_ROOT.mkdir(parents=True, exist_ok=True)
    path = PROJECT_ROOT / f"variant-{variant_index + 1:02d}-{family}.piskel"
    path.write_text(json.dumps(document, separators=(",", ":")) + "\n", encoding="utf-8")

    roundtrip, width, height, fps = read_piskel(path)
    if (width, height, fps, len(roundtrip)) != (FRAME_PX, FRAME_PX, FPS, STATES):
        raise AssertionError(f"Piskel shape/order mismatch: {relative(path)}")
    if [pixel_sha256(frame) for frame in roundtrip] != [pixel_sha256(frame) for frame in frames]:
        raise AssertionError(f"Piskel pixel round-trip mismatch: {relative(path)}")
    return path


def build_strip(frames: list[Image.Image], path: Path) -> None:
    strip = Image.new("RGBA", (STATES * FRAME_PX, FRAME_PX), (0, 0, 0, 0))
    for state, frame in enumerate(frames):
        strip.alpha_composite(frame, (state * FRAME_PX, 0))
    path.parent.mkdir(parents=True, exist_ok=True)
    strip.save(path, "PNG", optimize=True)


def build_candidate_atlas(by_variant: list[list[Image.Image]]) -> None:
    atlas = Image.new("RGBA", (VARIANTS * FRAME_PX, STATES * FRAME_PX), (0, 0, 0, 0))
    for state in range(STATES):
        for variant in range(VARIANTS):
            atlas.alpha_composite(by_variant[variant][state], (variant * FRAME_PX, state * FRAME_PX))
    atlas.save(CANDIDATE_ATLAS, "PNG", optimize=True)


def native_frame(frame: Image.Image) -> Image.Image:
    return frame.resize((94, 94), Image.Resampling.LANCZOS)


def build_before_after(
    originals: list[list[Image.Image]],
    repaired: list[list[Image.Image]],
) -> Path:
    label_width = 238
    header_height = 76
    row_height = 94
    width = label_width + STATES * 94
    height = header_height + VARIANTS * row_height * 2
    canvas = Image.new("RGB", (width, height), "#080b10")
    draw = ImageDraw.Draw(canvas)
    draw.text((18, 12), "GROUND DAMAGE - FIXED 94 PX GAME SCALE", fill="#f4dfb9", font=load_font(28, True))
    draw.text(
        (18, 45),
        "BEFORE vs PISKEL V2 CANDIDATE - crosshair is the invariant tile-center seed",
        fill="#aeb9c8",
        font=load_font(15),
    )
    for state in range(STATES):
        x = label_width + state * 94
        draw.text((x + 38, 53), str(state + 1), fill="#d2dae5", font=load_font(13, True))
    for variant, family in enumerate(FAMILY_NAMES):
        base_y = header_height + variant * row_height * 2
        draw.text((14, base_y + 35), f"{variant + 1:02d} {family}", fill="#e6ebf1", font=load_font(15, True))
        draw.text((164, base_y + 18), "BEFORE", fill="#d7907b", font=load_font(12, True))
        draw.text((164, base_y + row_height + 18), "FIXED", fill="#79cba8", font=load_font(12, True))
        for row, family_frames in enumerate((originals[variant], repaired[variant])):
            y = base_y + row * row_height
            for state, frame in enumerate(family_frames):
                x = label_width + state * 94
                checker = Image.new("RGB", (94, 94), "#10151d")
                checker_draw = ImageDraw.Draw(checker)
                checker_draw.line((47, 39, 47, 55), fill="#5a4050", width=1)
                checker_draw.line((39, 47, 55, 47), fill="#5a4050", width=1)
                decal = native_frame(frame)
                checker.paste(decal, (0, 0), decal)
                canvas.paste(checker, (x, y))
    PREVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    path = PREVIEW_ROOT / "01-before-after-native-scale.png"
    canvas.save(path, "PNG", optimize=True)
    return path


def material_tile(path: Path, sample: int) -> Image.Image:
    source = Image.open(path).convert("RGB")
    crop_size = min(source.width, source.height, 512)
    left = (sample * 173) % max(1, source.width - crop_size + 1)
    top = (sample * 97) % max(1, source.height - crop_size + 1)
    return ImageOps.fit(
        source.crop((left, top, left + crop_size, top + crop_size)),
        (94, 94),
        method=Image.Resampling.LANCZOS,
    ).convert("RGBA")


def context_cell(
    ground: Image.Image,
    frame: Image.Image,
    display_px: int,
) -> Image.Image:
    native = Image.new("RGBA", (94 * 3, 94 * 3), (0, 0, 0, 255))
    for y in range(3):
        for x in range(3):
            native.alpha_composite(ground, (x * 94, y * 94))
    native.alpha_composite(native_frame(frame), (94, 94))
    output_px = display_px * 3
    return native.resize((output_px, output_px), Image.Resampling.LANCZOS).convert("RGB")


def build_resolution_proof(
    originals: list[list[Image.Image]],
    repaired: list[list[Image.Image]],
) -> Path:
    scales = (
        (94, "1.0x backing\n1280x720"),
        (141, "1.5x backing\n1920x1080"),
        (188, "2.0x backing\n2560x1440"),
    )
    stages = (0, 5, 11)
    margin = 22
    label_width = 210
    max_display_px = max(display_px for display_px, _label in scales)
    column_width = max_display_px * 3 * 2 + 34
    header_height = 82
    row_height = max_display_px * 3 + 54
    width = label_width + len(stages) * column_width + margin
    height = header_height + len(scales) * row_height
    canvas = Image.new("RGB", (width, height), "#070a0f")
    draw = ImageDraw.Draw(canvas)
    draw.text((18, 12), "GROUND DAMAGE - RESOLUTION & PLACEMENT PROOF", fill="#f4dfb9", font=load_font(28, True))
    draw.text(
        (18, 47),
        "Same 94 px logical tile and center placement; backing density changes sharpness only.",
        fill="#aeb9c8",
        font=load_font(15),
    )
    for column, state in enumerate(stages):
        x = label_width + column * column_width
        draw.text((x + 8, 58), f"STATE {state + 1}", fill="#dce4ef", font=load_font(14, True))

    for row, (display_px, density_label) in enumerate(scales):
        y = header_height + row * row_height
        scale_label = f"{density_label}\n{display_px}px physical tile"
        draw.multiline_text((18, y + 22), scale_label, fill="#e6ebf1", font=load_font(17, True), spacing=5)
        material_name, material_path = MATERIALS[row]
        draw.text((18, y + 84), material_name, fill="#8fa2b8", font=load_font(13))
        ground = material_tile(ROOT / material_path, row)
        family = (row * 3 + 1) % VARIANTS
        for column, state in enumerate(stages):
            x = label_width + column * column_width
            before = context_cell(ground, originals[family][state], display_px)
            fixed = context_cell(ground, repaired[family][state], display_px)
            canvas.paste(before, (x, y + 24))
            canvas.paste(fixed, (x + display_px * 3 + 18, y + 24))
            draw.text((x, y + 4), "BEFORE", fill="#d7907b", font=load_font(11, True))
            draw.text((x + display_px * 3 + 18, y + 4), "FIXED", fill="#79cba8", font=load_font(11, True))
    path = PREVIEW_ROOT / "02-resolution-material-placement-proof.png"
    canvas.save(path, "PNG", optimize=True)
    return path


def build_anchor_overlay(
    originals: list[list[Image.Image]],
    repaired: list[list[Image.Image]],
) -> Path:
    panel_w = 430
    panel_h = 220
    columns = 2
    rows = math.ceil(VARIANTS / columns)
    canvas = Image.new("RGB", (columns * panel_w, rows * panel_h + 62), "#080b10")
    draw = ImageDraw.Draw(canvas)
    draw.text((18, 12), "SEQUENCE REGISTRATION - ALPHA BOUNDS & FIXED SEED", fill="#f4dfb9", font=load_font(26, True))
    palette = (
        (92, 180, 255, 30),
        (122, 232, 183, 32),
        (245, 204, 100, 34),
        (243, 126, 116, 38),
    )
    for variant, family in enumerate(FAMILY_NAMES):
        col = variant % columns
        row = variant // columns
        left = col * panel_w
        top = 62 + row * panel_h
        draw.text((left + 12, top + 8), f"{variant + 1:02d} {family}", fill="#e5ebf2", font=load_font(15, True))
        for side, frames in enumerate((originals[variant], repaired[variant])):
            origin_x = left + 16 + side * 204
            origin_y = top + 34
            panel = Image.new("RGBA", (188, 188), (12, 16, 23, 255))
            for state, frame in enumerate(frames):
                alpha = frame.getchannel("A").point(lambda value: 54 if value > ALPHA_THRESHOLD else 0)
                color = palette[state // 3]
                layer = Image.new("RGBA", (188, 188), color)
                layer.putalpha(alpha)
                panel = Image.alpha_composite(panel, layer)
            overlay = ImageDraw.Draw(panel)
            overlay.line((94, 82, 94, 106), fill=(255, 82, 146, 255), width=1)
            overlay.line((82, 94, 106, 94), fill=(255, 82, 146, 255), width=1)
            canvas.paste(panel.convert("RGB"), (origin_x, origin_y))
            draw.text(
                (origin_x + 62, top + 198),
                "BEFORE" if side == 0 else "FIXED",
                fill="#d7907b" if side == 0 else "#79cba8",
                font=load_font(11, True),
            )
    path = PREVIEW_ROOT / "03-sequence-registration-overlay.png"
    canvas.save(path, "PNG", optimize=True)
    return path


def write_markdown_summary(reports: list[dict[str, Any]]) -> Path:
    original_drops = 0
    max_original_centroid_range = 0.0
    minimum_scale = 1.0
    lines = [
        "# Ground damage anchor V2 review",
        "",
        "Review-only. Nothing in this folder or its Piskel export package is game-loaded.",
        "",
        "## Result",
        "",
        "- All ten families use a fixed 188 x 188 canvas and a 94,94 transform pivot/fracture seed.",
        "- Every family uses one shared scale across all twelve states.",
        "- Later states retain prior visible damage and never touch a canvas edge.",
        "- Each family round-trips pixel-identically through its own editable Piskel project.",
        "- Production remains on `ground-damage-imagegen-v1.png` until visual approval.",
        "",
        "## Family geometry",
        "",
        "| Family | Original coverage drops | Original centroid range | Shared scale |",
        "|---|---:|---:|---:|",
    ]
    for report in reports:
        frames = report["frames"]
        original_coverage = [entry["original"]["coverage"] for entry in frames]
        drops = sum(after < before for before, after in zip(original_coverage, original_coverage[1:]))
        centroids = [entry["original"]["weightedCentroidPx"] for entry in frames]
        centroid_range = max(
            math.hypot(a[0] - b[0], a[1] - b[1])
            for a in centroids
            for b in centroids
        )
        original_drops += drops
        max_original_centroid_range = max(max_original_centroid_range, centroid_range)
        minimum_scale = min(minimum_scale, report["sharedScale"])
        lines.append(
            f"| {report['variant']:02d} {report['family']} | {drops} | "
            f"{centroid_range:.2f} px | {report['sharedScale']:.4f} |"
        )
    lines.extend((
        "",
        "## Aggregate",
        "",
        f"- Original non-cumulative coverage transitions: **{original_drops}**.",
        f"- Largest original within-family weighted-centroid range: **{max_original_centroid_range:.2f} px**.",
        f"- Smallest fixed family-wide scale: **{minimum_scale:.4f}**.",
        "",
        "The weighted centroid remains diagnostic only: asymmetric crack growth can move it legitimately. "
        "Promotion gates use the fixed authored seed, shared scale, prior-stage retention, edge safety, "
        "frame order, and pixel-identical Piskel round-trip.",
    ))
    path = PREVIEW_ROOT / "readme.md"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def main() -> None:
    required = [ALPHA_ROOT / f"variant-{variant + 1:02d}.png" for variant in range(VARIANTS)]
    required.extend(ROOT / path for _name, path in MATERIALS)
    missing = [path for path in required if not path.is_file()]
    if missing:
        raise FileNotFoundError("Missing input(s):\n" + "\n".join(relative(path) for path in missing))

    EXPORT_ROOT.mkdir(parents=True, exist_ok=True)
    PROJECT_ROOT.mkdir(parents=True, exist_ok=True)
    STRIP_ROOT.mkdir(parents=True, exist_ok=True)
    PREVIEW_ROOT.mkdir(parents=True, exist_ok=True)

    originals = [load_v1_frames(variant) for variant in range(VARIANTS)]
    repaired: list[list[Image.Image]] = []
    reports: list[dict[str, Any]] = []
    projects: list[Path] = []
    strips: list[Path] = []

    for variant, frames in enumerate(originals):
        family_frames, report = build_family(variant, frames)
        repaired.append(family_frames)
        reports.append(report)
        project = write_piskel(variant, family_frames, report)
        projects.append(project)
        strip = STRIP_ROOT / f"variant-{variant + 1:02d}-{FAMILY_NAMES[variant]}.png"
        build_strip(family_frames, strip)
        strips.append(strip)

    build_candidate_atlas(repaired)
    previews = [
        build_before_after(originals, repaired),
        build_resolution_proof(originals, repaired),
        build_anchor_overlay(originals, repaired),
    ]
    summary_path = write_markdown_summary(reports)
    REPORT_PATH.write_text(json.dumps({
        "version": 2,
        "date": "2026-07-30",
        "reviewOnly": True,
        "productionChanged": False,
        "source": relative(V1_ROOT),
        "policy": "fixed-canvas-ground-fracture-seed",
        "canvasPx": [FRAME_PX, FRAME_PX],
        "targetPivotPx": list(TARGET_ANCHOR),
        "targetFractureSeedPx": list(TARGET_ANCHOR),
        "families": reports,
    }, indent=2) + "\n", encoding="utf-8")

    tracked = [*projects, *strips, CANDIDATE_ATLAS, *previews, REPORT_PATH, summary_path]
    MANIFEST_PATH.write_text(json.dumps({
        "version": 2,
        "date": "2026-07-30",
        "reviewOnly": True,
        "productionChanged": False,
        "sourcePackage": relative(V1_ROOT),
        "candidateAtlas": relative(CANDIDATE_ATLAS),
        "frameOrder": "state-major: frame = stateIndex * 10 + variantIndex",
        "frameSizePx": FRAME_PX,
        "variants": VARIANTS,
        "statesPerVariant": STATES,
        "piskelProjects": [relative(path) for path in projects],
        "strips": [relative(path) for path in strips],
        "previews": [relative(path) for path in previews],
        "geometryReport": relative(REPORT_PATH),
        "sha256": {relative(path): sha256(path) for path in tracked},
    }, indent=2) + "\n", encoding="utf-8")

    print(f"Built {len(projects)} editable Piskel projects")
    print(f"Built review candidate atlas: {relative(CANDIDATE_ATLAS)}")
    print(f"Built geometry report: {relative(REPORT_PATH)}")
    print("Production files changed: 0")


if __name__ == "__main__":
    main()
