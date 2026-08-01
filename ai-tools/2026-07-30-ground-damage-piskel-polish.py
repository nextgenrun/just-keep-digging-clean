"""Pixel-safe helpers for the review-only ground-damage Piskel polish."""

from __future__ import annotations

from typing import Any

import cv2
import numpy as np
from PIL import Image, ImageDraw


DEFAULT_SUPPORT_ALPHA = 12
DEFAULT_CORE_ALPHA = 36
WORK_SAFE_RADIUS = 90


def _rgba(image: Image.Image) -> np.ndarray:
    return np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()


def _components(mask: np.ndarray) -> tuple[np.ndarray, list[dict[str, Any]]]:
    count, labels, stats, _centroids = cv2.connectedComponentsWithStats(
        mask.astype(np.uint8),
        connectivity=8,
    )
    records: list[dict[str, Any]] = []
    for label in range(1, count):
        left = int(stats[label, cv2.CC_STAT_LEFT])
        top = int(stats[label, cv2.CC_STAT_TOP])
        width = int(stats[label, cv2.CC_STAT_WIDTH])
        height = int(stats[label, cv2.CC_STAT_HEIGHT])
        records.append({
            "label": label,
            "areaPx": int(stats[label, cv2.CC_STAT_AREA]),
            "boundsPx": [left, top, left + width, top + height],
            "elongation": round(max(width, height) / max(1, min(width, height)), 4),
        })
    return labels, records


def _maximum_consecutive(indices: list[int]) -> int:
    if not indices:
        return 0
    best = run = 1
    for before, after in zip(indices, indices[1:]):
        run = run + 1 if after == before + 1 else 1
        best = max(best, run)
    return best


def cleanup_temporal_components(
    frames: list[Image.Image],
    *,
    seed: tuple[int, int],
    support_alpha: int = DEFAULT_SUPPORT_ALPHA,
    core_alpha: int = DEFAULT_CORE_ALPHA,
    max_dust_area_px: int = 24,
    bridge_px: int = 2,
    future_attach_px: int = 4,
) -> tuple[list[Image.Image], dict[str, Any]]:
    """Remove only small, isolated, one-state components with no structural future."""
    arrays = [_rgba(frame) for frame in frames]
    support_masks = [array[:, :, 3] > support_alpha for array in arrays]
    labels_by_frame: list[np.ndarray] = []
    records_by_frame: list[list[dict[str, Any]]] = []
    main_masks: list[np.ndarray] = []

    for array, support in zip(arrays, support_masks):
        labels, records = _components(support)
        labels_by_frame.append(labels)
        records_by_frame.append(records)
        if not records:
            main_masks.append(np.zeros_like(support))
            continue
        seed_label = int(labels[seed[1], seed[0]])
        main_label = seed_label or max(records, key=lambda item: item["areaPx"])["label"]
        main_masks.append(labels == main_label)
        alpha = array[:, :, 3]
        for record in records:
            component = labels == record["label"]
            values = alpha[component]
            record["alphaEnergy"] = int(values.sum())
            record["p95Alpha"] = int(np.percentile(values, 95))
            record["corePixels"] = int((values > core_alpha).sum())
            record["isMain"] = record["label"] == main_label

    cleaned = [array.copy() for array in arrays]
    removed: list[dict[str, Any]] = []
    kept: list[dict[str, Any]] = []
    review: list[dict[str, Any]] = []
    bridge_kernel = np.ones((bridge_px * 2 + 1, bridge_px * 2 + 1), np.uint8)
    future_kernel = np.ones((future_attach_px * 2 + 1, future_attach_px * 2 + 1), np.uint8)

    for state, (labels, records, main_mask) in enumerate(
        zip(labels_by_frame, records_by_frame, main_masks)
    ):
        distance_map = cv2.distanceTransform((~main_mask).astype(np.uint8), cv2.DIST_L2, 3)
        for source_record in records:
            record = dict(source_record)
            record["state"] = state + 1
            component = labels == record["label"]
            if record["isMain"]:
                record["decision"] = "keep"
                record["reasons"] = ["primary-fracture"]
                kept.append(record)
                continue

            distance = float(distance_map[component].min()) if component.any() else 999.0
            record["distanceToMainPx"] = round(distance, 3)
            bridged = bool(
                np.logical_and(
                    cv2.dilate(component.astype(np.uint8), bridge_kernel) > 0,
                    main_mask,
                ).any()
            )
            probe = cv2.dilate(component.astype(np.uint8), future_kernel) > 0
            present_states = [
                index
                for index, support in enumerate(support_masks)
                if np.logical_and(probe, support).any()
            ]
            consecutive = _maximum_consecutive(present_states)
            future_attachment = any(
                np.logical_and(probe, main_masks[index]).any()
                for index in range(state + 1, len(frames))
            )
            record["maxConsecutiveStates"] = consecutive
            record["futureAttachment"] = future_attachment

            reasons: list[str] = []
            if bridged or distance <= bridge_px:
                reasons.append("seed-structure-bridge")
            if record["areaPx"] > max_dust_area_px:
                reasons.append("structural-area")
            if consecutive >= 2:
                reasons.append("temporal-repeat")
            if future_attachment:
                reasons.append("future-attachment")
            if record["elongation"] >= 3 and record["areaPx"] >= 10:
                reasons.append("elongated-branch")

            removable = (
                not reasons
                and record["areaPx"] <= max_dust_area_px
                and distance > bridge_px
            )
            if removable:
                halo = cv2.dilate(component.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
                cleaned[state][np.logical_and(halo, arrays[state][:, :, 3] > 0)] = 0
                record["decision"] = "remove"
                record["reasons"] = ["isolated-one-state-dust"]
                removed.append(record)
            else:
                record["decision"] = "keep" if reasons else "review"
                record["reasons"] = reasons or ["ambiguous-detached-support"]
                (kept if reasons else review).append(record)

    return (
        [Image.fromarray(array, "RGBA") for array in cleaned],
        {
            "policy": "temporal-topology-component-filter-v1",
            "removedComponents": removed,
            "keptComponents": kept,
            "reviewComponents": review,
        },
    )


def previous_wins_merge(
    previous: Image.Image,
    current: Image.Image,
    *,
    support_alpha: int = DEFAULT_SUPPORT_ALPHA,
) -> Image.Image:
    """Add genuinely new support without repainting an established contour."""
    before = _rgba(previous)
    incoming = _rgba(current)
    output = before.copy()
    established = before[:, :, 3] > support_alpha
    stronger_new = np.logical_and(~established, incoming[:, :, 3] > before[:, :, 3])
    output[stronger_new] = incoming[stronger_new]
    return Image.fromarray(output, "RGBA")


def strongest_support_merge(
    previous: Image.Image,
    current: Image.Image,
    *,
    support_alpha: int = DEFAULT_SUPPORT_ALPHA,
) -> Image.Image:
    """Keep one authored pixel per location while allowing stronger later cores."""
    before = _rgba(previous)
    incoming = _rgba(current)
    output = before.copy()
    previous_alpha = before[:, :, 3].astype(np.int16)
    incoming_alpha = incoming[:, :, 3].astype(np.int16)
    genuinely_new = np.logical_and(
        previous_alpha <= support_alpha,
        incoming_alpha > previous_alpha,
    )
    stronger_core = incoming_alpha > previous_alpha + support_alpha
    replace = np.logical_or(genuinely_new, stronger_core)
    output[replace] = incoming[replace]
    return Image.fromarray(output, "RGBA")


def ensure_seed_core(
    frame: Image.Image,
    *,
    seed: tuple[int, int],
    core_alpha: int = DEFAULT_CORE_ALPHA,
    radius_px: int = 1,
    core_rgba: tuple[int, int, int, int] = (64, 58, 52, 255),
) -> Image.Image:
    """Paint a tiny core only when the exact fixed fracture seed is missing."""
    result = frame.convert("RGBA").copy()
    if result.getpixel(seed)[3] > core_alpha:
        return result
    draw = ImageDraw.Draw(result)
    sx, sy = seed
    for dy in range(-radius_px, radius_px + 1):
        for dx in range(-radius_px, radius_px + 1):
            if abs(dx) + abs(dy) > radius_px:
                continue
            point = (sx + dx, sy + dy)
            if result.getpixel(point)[3] > core_alpha:
                continue
            alpha = core_rgba[3] if (dx, dy) == (0, 0) else max(core_alpha + 1, core_rgba[3] // 2)
            draw.point(point, fill=(*core_rgba[:3], alpha))
    return result


def _remove_seam_bleed(
    frames: list[Image.Image],
    variant_index: int,
    seed: tuple[int, int],
    support_alpha: int,
) -> tuple[list[Image.Image], list[dict[str, Any]]]:
    rules = {
        0: ({7}, "bottom", seed[1] + 82, 32),
        3: ({5, 6, 7}, "bottom", seed[1] + 70, 180),
        4: ({6, 7}, "bottom", seed[1] + 70, 80),
        5: ({6, 7}, "bottom", seed[1] + 70, 80),
        9: ({10}, "right", seed[0] + 82, 80),
    }
    if variant_index not in rules:
        return [frame.copy() for frame in frames], []
    states, side, limit, maximum_area = rules[variant_index]
    output = [frame.convert("RGBA").copy() for frame in frames]
    removed: list[dict[str, Any]] = []
    for state in states:
        array = _rgba(output[state])
        support = array[:, :, 3] > support_alpha
        labels, records = _components(support)
        if not records:
            continue
        main_label = max(records, key=lambda item: item["areaPx"])["label"]
        for record in records:
            if record["label"] == main_label or record["areaPx"] > maximum_area:
                continue
            left, top, right, bottom = record["boundsPx"]
            beyond = bottom > limit if side == "bottom" else right > limit
            if not beyond:
                continue
            component = labels == record["label"]
            halo = cv2.dilate(component.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
            array[np.logical_and(halo, array[:, :, 3] > 0)] = 0
            removed.append({
                **record,
                "state": state + 1,
                "decision": "remove",
                "reasons": ["cross-panel-seam-contamination", f"{side}-sheet-bleed"],
            })
        output[state] = Image.fromarray(array, "RGBA")
    return output, removed


def _sample_crack_colors(frame: Image.Image) -> tuple[tuple[int, ...], tuple[int, ...]]:
    array = _rgba(frame)
    alpha = array[:, :, 3]
    visible = alpha > DEFAULT_SUPPORT_ALPHA
    if not visible.any():
        return (58, 54, 51, 190), (112, 105, 98, 70)
    rgb = array[:, :, :3]
    luminance = rgb[:, :, 0] * 0.2126 + rgb[:, :, 1] * 0.7152 + rgb[:, :, 2] * 0.0722
    values = luminance[visible]
    core = np.logical_and(visible, luminance <= np.percentile(values, 30))
    rim = np.logical_and(visible, luminance >= np.percentile(values, 60))
    core_rgb = np.median(rgb[core], axis=0).astype(np.uint8) if core.any() else np.array((58, 54, 51))
    rim_rgb = np.median(rgb[rim], axis=0).astype(np.uint8) if rim.any() else np.array((112, 105, 98))
    return (*map(int, core_rgb), 210), (*map(int, rim_rgb), 72)


def _add_vertical_pressure_branches(
    frames: list[Image.Image],
    seed: tuple[int, int],
) -> tuple[list[Image.Image], list[dict[str, Any]]]:
    output = [frame.copy() for frame in frames]
    sx, sy = seed
    branches = (
        (4, ((sx, sy - 24), (sx - 7, sy - 27), (sx - 13, sy - 34), (sx - 23, sy - 32))),
        (6, ((sx, sy + 1), (sx + 8, sy - 2), (sx + 14, sy - 9), (sx + 26, sy - 12))),
        (8, ((sx, sy + 27), (sx - 7, sy + 32), (sx - 14, sy + 34), (sx - 24, sy + 42))),
        (10, ((sx, sy + 51), (sx + 7, sy + 54), (sx + 14, sy + 62), (sx + 24, sy + 67))),
    )
    report: list[dict[str, Any]] = []
    for state, points in branches:
        core, rim = _sample_crack_colors(output[state])
        draw = ImageDraw.Draw(output[state])
        draw.line(points, fill=rim, width=5, joint="curve")
        draw.line(points, fill=core, width=2, joint="curve")
        report.append({"state": state + 1, "pointsPx": [list(point) for point in points]})
    return output, report


def _material_neutralize(frame: Image.Image, variant_index: int) -> Image.Image:
    array = _rgba(frame).astype(np.float32)
    rgb = array[:, :, :3]
    alpha = array[:, :, 3]
    luminance = rgb[:, :, 0] * 0.2126 + rgb[:, :, 1] * 0.7152 + rgb[:, :, 2] * 0.0722
    neutralize = 0.78 if variant_index == 9 else 0.68
    tone = 0.78 if variant_index in (3, 9) else (0.85 if variant_index == 8 else 0.86)
    rgb = luminance[:, :, None] + (rgb - luminance[:, :, None]) * (1.0 - neutralize)
    rgb *= tone
    opacity_profiles = {3: (0.88, 0.58), 8: (0.86, 0.50), 9: (0.82, 0.42)}
    if variant_index in opacity_profiles:
        visible = alpha > DEFAULT_SUPPORT_ALPHA
        if visible.any():
            core_limit = float(np.percentile(luminance[visible], 25))
            core = np.logical_and(visible, luminance <= core_limit)
            core_factor, fill_factor = opacity_profiles[variant_index]
            alpha[np.logical_and(visible, ~core)] *= fill_factor
            alpha[core] *= core_factor
    array[:, :, :3] = np.clip(rgb, 0, 255)
    array[:, :, 3] = np.clip(alpha, 0, 255)
    return Image.fromarray(np.rint(array).astype(np.uint8), "RGBA")


def polish_registered_frames(
    frames: list[Image.Image],
    variant_index: int,
    *,
    seed: tuple[int, int] = (136, 136),
) -> tuple[list[Image.Image], dict[str, Any]]:
    """Apply the approved deterministic polish to non-cumulative work frames."""
    cleaned, component_report = cleanup_temporal_components(
        frames,
        seed=seed,
        support_alpha=DEFAULT_SUPPORT_ALPHA,
        core_alpha=DEFAULT_CORE_ALPHA,
        max_dust_area_px=24,
        bridge_px=2,
        future_attach_px=4,
    )
    cleaned, seam_removed = _remove_seam_bleed(
        cleaned,
        variant_index,
        seed,
        DEFAULT_SUPPORT_ALPHA,
    )
    branch_report: list[dict[str, Any]] = []
    if variant_index == 3:
        cleaned, branch_report = _add_vertical_pressure_branches(cleaned, seed)
    seed_frames: list[int] = []
    if variant_index in (5, 8):
        for index, frame in enumerate(cleaned):
            repaired = ensure_seed_core(
                frame,
                seed=seed,
                core_alpha=DEFAULT_CORE_ALPHA,
                radius_px=1,
                core_rgba=(58, 54, 50, 210),
            )
            if repaired.tobytes() != frame.tobytes():
                seed_frames.append(index + 1)
            cleaned[index] = repaired
    polished = [_material_neutralize(frame, variant_index) for frame in cleaned]
    component_report["removedComponents"].extend(seam_removed)
    return polished, {
        "version": 1,
        "policy": "piskel-material-neutral-anchor-polish-v1",
        "componentAudit": component_report,
        "seamBleedRemoved": seam_removed,
        "seedCoreRepairedStates": seed_frames,
        "branchAdditions": branch_report,
        "neutralizeStrength": 0.78 if variant_index == 9 else 0.68,
        "productionChanged": False,
    }
