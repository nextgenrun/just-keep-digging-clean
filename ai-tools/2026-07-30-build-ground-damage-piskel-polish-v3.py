"""Build the rollback-safe, review-only ground-damage Piskel polish package."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import math
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]


def _load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


BASE = _load(
    ROOT / "ai-tools/2026-07-30-build-ground-damage-piskel-anchor-v2.py",
    "ground_damage_anchor_v2",
)
POLISH = _load(
    ROOT / "ai-tools/2026-07-30-ground-damage-piskel-polish.py",
    "ground_damage_piskel_polish",
)
PACKAGE = _load(
    ROOT / "ai-tools/2026-07-30-ground-damage-piskel-package.py",
    "ground_damage_piskel_package",
)
VISUALS = _load(
    ROOT / "ai-tools/2026-07-30-ground-damage-piskel-polish-visuals.py",
    "ground_damage_piskel_polish_visuals",
)

EXPORT_ROOT = ROOT / "exports/piskel/ground-damage-anchor-v2-review"
PROJECT_ROOT = EXPORT_ROOT / "projects"
REGISTERED_ROOT = PROJECT_ROOT / "registered-source"
POLISHED_ROOT = PROJECT_ROOT / "polished-work"
ROLLBACK_ROOT = PROJECT_ROOT / "polished-work-rollback-v1"
STRIP_ROOT = EXPORT_ROOT / "strips"
PREVIEW_ROOT = ROOT / "visual-approval-previews/ground-damage-anchor-v2-review"
REPORT_PATH = EXPORT_ROOT / "geometry-report.json"
MANIFEST_PATH = EXPORT_ROOT / "manifest.json"
CANDIDATE_ATLAS = EXPORT_ROOT / "ground-damage-anchor-v2-candidate-atlas.png"
PRODUCTION_ATLAS = (
    ROOT / "sprites/backgrounds/world-visual-v2/semantic-decals-v1/"
    "ground-damage-imagegen-v1.png"
)

FRAME_PX = 188
WORK_PX = 272
STATES = 12
VARIANTS = 10
FPS = 6
TARGET_SEED = (94, 94)
WORK_SEED = (136, 136)
SAFE_RADIUS = 90
SUPPORT_ALPHA = 12
SOURCE_CROP_LEFT = (21, 21, 15, 21, 21, 2, 21, 19, 4, 19)


def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _source_frames(variant: int) -> list[Image.Image]:
    sheet = Image.open(BASE.ALPHA_ROOT / f"variant-{variant + 1:02d}.png").convert("RGBA")
    crop_left = SOURCE_CROP_LEFT[variant]
    frames: list[Image.Image] = []
    for state in range(STATES):
        column = state % BASE.SOURCE_COLUMNS
        row = state // BASE.SOURCE_COLUMNS
        left = column * BASE.SOURCE_COLUMN_STRIDE + crop_left
        top = BASE.SOURCE_ROW_BOUNDARIES[row]
        bottom = BASE.SOURCE_ROW_BOUNDARIES[row + 1]
        content = sheet.crop((left, top, left + BASE.SOURCE_CELL_PX, bottom)).resize(
            (BASE.CONTENT_PX, BASE.CONTENT_PX),
            Image.Resampling.LANCZOS,
        )
        frame = Image.new("RGBA", (FRAME_PX, FRAME_PX), (0, 0, 0, 0))
        frame.alpha_composite(content, ((FRAME_PX - BASE.CONTENT_PX) // 2,) * 2)
        frames.append(frame)
    return frames


def _register(frames: list[Image.Image]) -> tuple[list[Image.Image], list[tuple[int, int]], list[float]]:
    registered: list[Image.Image] = []
    shifts: list[tuple[int, int]] = []
    scores: list[float] = []
    previous_mask: np.ndarray | None = None
    for frame in frames:
        dx, dy, score = BASE.register_shift(frame, previous_mask)
        shifts.append((dx, dy))
        scores.append(score)
        registered.append(BASE.embed_rgba(frame, (dx, dy)))
        previous_mask = BASE.embed_mask(BASE.robust_core_mask(frame), (dx, dy))
    return registered, shifts, scores


def _accumulate(frames: list[Image.Image], merge) -> list[Image.Image]:
    current = Image.new("RGBA", (WORK_PX, WORK_PX), (0, 0, 0, 0))
    result: list[Image.Image] = []
    for frame in frames:
        current = merge(current, frame)
        result.append(current.copy())
    return result


def _fit(frame: Image.Image, safe_radius: float) -> tuple[float, list[int], list[int]]:
    alpha = np.asarray(frame.getchannel("A"), dtype=np.uint8)
    ys, xs = np.where(alpha > SUPPORT_ALPHA)
    if not len(xs):
        raise AssertionError("Ground-damage family has no visible support")
    bounds = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
    extents = [
        WORK_SEED[0] - bounds[0],
        bounds[2] - WORK_SEED[0],
        WORK_SEED[1] - bounds[1],
        bounds[3] - WORK_SEED[1],
    ]
    scale = min(1.0, *(safe_radius / max(1, extent) for extent in extents))
    return scale, bounds, extents


def _render(cumulative: list[Image.Image], scale: float) -> list[Image.Image]:
    return [
        BASE.premultiplied_affine(
            frame,
            scale,
            WORK_SEED,
            TARGET_SEED,
            (FRAME_PX, FRAME_PX),
        )
        for frame in cumulative
    ]


def _source_project(
    variant: int,
    frames: list[Image.Image],
    shifts: list[tuple[int, int]],
) -> Path:
    family = BASE.FAMILY_NAMES[variant]
    path = REGISTERED_ROOT / f"variant-{variant + 1:02d}-{family}.piskel"
    metadata = {
        "version": 1,
        "stage": "registered-source",
        "immutable": True,
        "reviewOnly": True,
        "productionChanged": False,
        "workSeedPx": list(WORK_SEED),
        "sourceSheet": PACKAGE.relative(BASE.ALPHA_ROOT / f"variant-{variant + 1:02d}.png"),
        "sourceCropLeftPx": SOURCE_CROP_LEFT[variant],
        "sourceRowBoundariesPx": list(BASE.SOURCE_ROW_BOUNDARIES),
        "registrationShiftPx": [list(shift) for shift in shifts],
        "pixelSha256": [PACKAGE.pixel_sha256(frame) for frame in frames],
    }
    document = PACKAGE.make_document(
        frames,
        document_id=f"ground-damage-{variant + 1:02d}-{family}-registered-source",
        display_name=f"Ground damage {variant + 1:02d} {family} registered source",
        fps=FPS,
        description="Immutable, non-cumulative seam-aware registration source. Duplicate before editing.",
        layer_name="Registered Current Pixels",
        polish_metadata=metadata,
        seed=WORK_SEED,
        safe_box=(46, 46, 226, 226),
    )
    return PACKAGE.write_document(path, document, frames, overwrite=False)


def _polished_project(
    variant: int,
    registered: list[Image.Image],
    source_path: Path,
) -> tuple[Path, list[Image.Image], dict[str, Any]]:
    family = BASE.FAMILY_NAMES[variant]
    path = POLISHED_ROOT / f"variant-{variant + 1:02d}-{family}.piskel"
    source_sha = _sha(source_path)
    if path.is_file():
        frames, document = PACKAGE.read_editable_project(
            path,
            expected_size=(WORK_PX, WORK_PX),
            expected_frames=STATES,
            expected_fps=FPS,
        )
        metadata = document["jkdPolish"]
        if metadata["sourceSha256"] != source_sha:
            raise AssertionError(f"Polished source hash mismatch: {PACKAGE.relative(path)}")
        return path, frames, metadata["audit"]

    frames, audit = POLISH.polish_registered_frames(registered, variant, seed=WORK_SEED)
    metadata = {
        "version": 1,
        "stage": "polished-work",
        "editable": True,
        "reviewOnly": True,
        "productionChanged": False,
        "workSeedPx": list(WORK_SEED),
        "sourceProject": PACKAGE.relative(source_path),
        "sourceSha256": source_sha,
        "audit": audit,
        "pixelSha256": [PACKAGE.pixel_sha256(frame) for frame in frames],
    }
    document = PACKAGE.make_document(
        frames,
        document_id=f"ground-damage-{variant + 1:02d}-{family}-polished-work",
        display_name=f"Ground damage {variant + 1:02d} {family} polished work",
        fps=FPS,
        description="Editable non-cumulative Piskel polish authority; production is unchanged.",
        layer_name="Polished Current Pixels",
        polish_metadata=metadata,
        seed=WORK_SEED,
        safe_box=(46, 46, 226, 226),
    )
    PACKAGE.write_document(path, document, frames, overwrite=True)
    return path, frames, audit


def _derive_family(
    variant: int,
    originals: list[Image.Image],
    registered: list[Image.Image],
    polished: list[Image.Image],
    shifts: list[tuple[int, int]],
    scores: list[float],
    polish_audit: dict[str, Any],
) -> tuple[list[Image.Image], list[Image.Image], dict[str, Any], dict[str, Any]]:
    registered_cumulative = _accumulate(registered, Image.alpha_composite)
    registered_scale, registered_bounds, _registered_extents = _fit(registered_cumulative[-1], 88)
    polished_cumulative = _accumulate(
        polished,
        lambda previous, current: POLISH.strongest_support_merge(
            previous,
            current,
            support_alpha=SUPPORT_ALPHA,
        ),
    )
    shared_scale, polished_bounds, _polished_extents = _fit(polished_cumulative[-1], SAFE_RADIUS)
    if variant in (4, 5):
        shared_scale = min(shared_scale, registered_scale * 1.025)
    if variant in (0, 3, 9) and not math.isclose(shared_scale, 1.0, abs_tol=1e-8):
        raise AssertionError(f"Variant {variant + 1} did not recover safe scale 1")
    baseline = _render(registered_cumulative, registered_scale)
    derived = _render(polished_cumulative, shared_scale)
    matrix = [
        [round(shared_scale, 8), 0.0, round(TARGET_SEED[0] - shared_scale * WORK_SEED[0], 8)],
        [0.0, round(shared_scale, 8), round(TARGET_SEED[1] - shared_scale * WORK_SEED[1], 8)],
    ]
    frame_reports: list[dict[str, Any]] = []
    previous_visible: np.ndarray | None = None
    for state, (original, candidate, shift, score) in enumerate(zip(originals, derived, shifts, scores)):
        visible = np.asarray(candidate.getchannel("A"), dtype=np.uint8) > SUPPORT_ALPHA
        retained = 1.0
        if previous_visible is not None and previous_visible.any():
            retained = float((visible & previous_visible).sum() / previous_visible.sum())
        previous_visible = visible
        frame_reports.append({
            "state": state + 1,
            "sourceAnchorPx": [TARGET_SEED[0] - shift[0], TARGET_SEED[1] - shift[1]],
            "registrationShiftPx": list(shift),
            "registrationMatchScore": round(score, 6),
            "mappedAnchorPx": [94.0, 94.0],
            "previousVisibleRetention": round(retained, 6),
            "original": BASE.metrics(original),
            "candidate": BASE.metrics(candidate),
            "seedAlpha": int(candidate.getpixel(TARGET_SEED)[3]),
            "pixelSha256": PACKAGE.pixel_sha256(candidate),
        })
    if any(entry["candidate"]["edgeVisiblePixels"] for entry in frame_reports):
        raise AssertionError(f"Variant {variant + 1} touches the output edge")
    if any(entry["previousVisibleRetention"] < 0.998 for entry in frame_reports[1:]):
        raise AssertionError(f"Variant {variant + 1} loses cumulative support")
    report = {
        "variant": variant + 1,
        "family": BASE.FAMILY_NAMES[variant],
        "policy": "fixed-canvas-ground-fracture-seed",
        "frameSizePx": [FRAME_PX, FRAME_PX],
        "targetPivotPx": list(TARGET_SEED),
        "targetFractureSeedPx": list(TARGET_SEED),
        "surfacePlane": "orthographic tile center",
        "sourceCropLeftPx": SOURCE_CROP_LEFT[variant],
        "registeredSharedScale": round(registered_scale, 8),
        "sharedScale": round(shared_scale, 8),
        "registeredWorkUnionBoundsPx": registered_bounds,
        "workUnionBoundsPx": polished_bounds,
        "polish": polish_audit,
        "frames": frame_reports,
    }
    alignment = {
        "policy": report["policy"],
        "authority": "Piskel polished review candidate; visual approval required before production",
        "targetPivotPx": list(TARGET_SEED),
        "targetFractureSeedPx": list(TARGET_SEED),
        "sharedScale": report["sharedScale"],
        "sharedMatrix": matrix,
        "normalizationTransforms": [
            {"state": state + 1, "matrix": matrix}
            for state in range(STATES)
        ],
        "pixelSha256": [entry["pixelSha256"] for entry in frame_reports],
    }
    return baseline, derived, report, alignment


def _summary(reports: list[dict[str, Any]]) -> Path:
    lines = [
        "# Ground damage Piskel polish review",
        "",
        "Review-only. Production remains on `ground-damage-imagegen-v1.png`.",
        "",
        "- Registered-source Piskels are immutable rollback inputs at 272 x 272.",
        "- Polished-work Piskels are the editable non-cumulative authority.",
        "- Derived 188 x 188 Piskels use one matrix and fixed 94,94 seed per family.",
        "- Cross-panel sheet bleed is removed; seam-safe gutter topology is retained.",
        "",
        "| Family | Crop left | Registered scale | Polished scale | Removed components |",
        "|---|---:|---:|---:|---:|",
    ]
    for report in reports:
        removed = len(report["polish"]["componentAudit"]["removedComponents"])
        lines.append(
            f"| {report['variant']:02d} {report['family']} | {report['sourceCropLeftPx']} | "
            f"{report['registeredSharedScale']:.4f} | {report['sharedScale']:.4f} | {removed} |"
        )
    path = PREVIEW_ROOT / "readme.md"
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def main() -> None:
    for path in (REGISTERED_ROOT, POLISHED_ROOT, STRIP_ROOT, PREVIEW_ROOT):
        path.mkdir(parents=True, exist_ok=True)
    current_originals = [BASE.load_v1_frames(variant) for variant in range(VARIANTS)]
    baseline = [BASE.build_family(variant, frames)[0] for variant, frames in enumerate(current_originals)]
    corrected_originals = [_source_frames(variant) for variant in range(VARIANTS)]
    derived_by_family: list[list[Image.Image]] = []
    reports: list[dict[str, Any]] = []
    registered_paths: list[Path] = []
    polished_paths: list[Path] = []
    derived_paths: list[Path] = []
    strips: list[Path] = []
    links: list[dict[str, Any]] = []

    for variant, frames in enumerate(corrected_originals):
        registered, shifts, scores = _register(frames)
        source_path = _source_project(variant, registered, shifts)
        polished_path, polished_work, audit = _polished_project(variant, registered, source_path)
        _baseline_corrected, derived, report, alignment = _derive_family(
            variant,
            current_originals[variant],
            registered,
            polished_work,
            shifts,
            scores,
            audit,
        )
        family = BASE.FAMILY_NAMES[variant]
        derived_path = PROJECT_ROOT / f"variant-{variant + 1:02d}-{family}.piskel"
        derived_document = PACKAGE.make_document(
            derived,
            document_id=f"ground-damage-{variant + 1:02d}-{family}-derived",
            display_name=f"Ground damage {variant + 1:02d} {family} derived polish",
            fps=FPS,
            description="Review-only cumulative 188px derivation from editable polished-work Piskel.",
            layer_name="Derived Cumulative Pixels",
            polish_metadata={
                "version": 1,
                "stage": "derived-review",
                "reviewOnly": True,
                "productionChanged": False,
                "polishedWorkProject": PACKAGE.relative(polished_path),
                "polishedWorkSha256": _sha(polished_path),
            },
            seed=TARGET_SEED,
            safe_box=(4, 4, 184, 184),
            alignment_metadata=alignment,
        )
        PACKAGE.write_document(derived_path, derived_document, derived, overwrite=True)
        strip = STRIP_ROOT / f"variant-{variant + 1:02d}-{family}.png"
        BASE.build_strip(derived, strip)
        derived_by_family.append(derived)
        reports.append(report)
        registered_paths.append(source_path)
        polished_paths.append(polished_path)
        derived_paths.append(derived_path)
        strips.append(strip)
        links.append({
            "variant": variant + 1,
            "registeredSourceProject": PACKAGE.relative(source_path),
            "registeredSourceSha256": _sha(source_path),
            "polishedWorkProject": PACKAGE.relative(polished_path),
            "polishedWorkSha256": _sha(polished_path),
            "derivedProject": PACKAGE.relative(derived_path),
            "derivedSha256": _sha(derived_path),
        })

    BASE.build_candidate_atlas(derived_by_family)
    previews = VISUALS.build_all(current_originals, baseline, derived_by_family, reports, PREVIEW_ROOT)
    summary = _summary(reports)
    REPORT_PATH.write_text(json.dumps({
        "version": 3,
        "date": "2026-07-30",
        "reviewOnly": True,
        "productionChanged": False,
        "source": PACKAGE.relative(BASE.V1_ROOT),
        "policy": "fixed-canvas-ground-fracture-seed",
        "canvasPx": [FRAME_PX, FRAME_PX],
        "targetPivotPx": list(TARGET_SEED),
        "targetFractureSeedPx": list(TARGET_SEED),
        "families": reports,
    }, indent=2) + "\n", encoding="utf-8")
    rollback_paths = [
        ROLLBACK_ROOT / path.name
        for path in polished_paths
    ]
    if not all(path.is_file() for path in rollback_paths):
        raise FileNotFoundError("Rollback Piskel inventory is incomplete")
    tracked = [
        *registered_paths,
        *polished_paths,
        *rollback_paths,
        *derived_paths,
        *strips,
        CANDIDATE_ATLAS,
        *previews,
        REPORT_PATH,
        summary,
    ]
    MANIFEST_PATH.write_text(json.dumps({
        "version": 3,
        "date": "2026-07-30",
        "reviewOnly": True,
        "productionChanged": False,
        "sourcePackage": PACKAGE.relative(BASE.V1_ROOT),
        "candidateAtlas": PACKAGE.relative(CANDIDATE_ATLAS),
        "frameOrder": "state-major: frame = stateIndex * 10 + variantIndex",
        "frameSizePx": FRAME_PX,
        "variants": VARIANTS,
        "statesPerVariant": STATES,
        "registeredSourceProjects": [PACKAGE.relative(path) for path in registered_paths],
        "polishedWorkProjects": [PACKAGE.relative(path) for path in polished_paths],
        "rollbackProjects": [PACKAGE.relative(path) for path in rollback_paths],
        "rollbackCommand": "python ai-tools/2026-07-30-refresh-ground-damage-piskel-polish.py --rollback",
        "piskelProjects": [PACKAGE.relative(path) for path in derived_paths],
        "projectLinks": links,
        "strips": [PACKAGE.relative(path) for path in strips],
        "previews": [PACKAGE.relative(path) for path in previews],
        "geometryReport": PACKAGE.relative(REPORT_PATH),
        "productionGuard": {
            "path": PACKAGE.relative(PRODUCTION_ATLAS),
            "sha256": _sha(PRODUCTION_ATLAS),
        },
        "sha256": {PACKAGE.relative(path): _sha(path) for path in tracked},
    }, indent=2) + "\n", encoding="utf-8")
    print("Built 10 immutable registered-source Piskels")
    print("Built/consumed 10 editable polished-work Piskels")
    print("Built 10 derived review Piskels and one candidate atlas")
    print("Production files changed: 0")


if __name__ == "__main__":
    main()
