"""Build and annotate review-only attack scale-lock frames."""

from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from typing import Any

from PIL import Image

from moving_side_dig_compositor import build_candidate_frames
from held_dig_sequence_core import RuntimeAssets, action_records, record


def leading_contact_x(metadata: dict[str, Any], contact_index: int) -> float:
    markers = metadata["rig_markers"]["frames"][str(contact_index)]
    return max(float(markers[name][0]) for name in ("hand_l", "hand_r"))


def visual_offset_px(
    config: dict[str, Any],
    display_size_px: float,
    contact_marker_x: float,
) -> float:
    build = config["build"]
    local_reach = (
        contact_marker_x - build["frameWidth"] * build["visualOriginX"]
    ) * display_size_px / build["frameWidth"]
    return round(build["sideTargetFaceOffsetPx"] - local_reach, 4)


def decorate_attack_records(
    records: list[dict[str, Any]],
    config: dict[str, Any],
    *,
    display_size_px: float,
    apparent_scale: float,
    contact_marker_x: float,
    label: str | None = None,
) -> list[dict[str, Any]]:
    offset = visual_offset_px(config, display_size_px, contact_marker_x)
    for value in records:
        if label:
            value["label"] = label
        value["displaySizePx"] = display_size_px
        value["apparentScale"] = apparent_scale
        value["contactMarkerSourceX"] = contact_marker_x
        value["visualOffsetPx"] = -offset if value["flipX"] else offset
    return records


def current_attack_records(
    assets: RuntimeAssets,
    config: dict[str, Any],
    action_id: str,
    label: str,
    *,
    display_size_px: float,
    apparent_scale: float,
    contact_index: int,
    speed: float = 0,
) -> list[dict[str, Any]]:
    records = action_records(
        assets,
        action_id,
        label,
        speed=speed,
        contact_index=contact_index,
    )
    _, metadata = assets.action(action_id)
    return decorate_attack_records(
        records,
        config,
        display_size_px=display_size_px,
        apparent_scale=apparent_scale,
        contact_marker_x=leading_contact_x(metadata, contact_index),
    )


class ScaleLockedMovingActions:
    """Creates 100%-scale moving Jab/Cross frames from the shared compositor."""

    def __init__(
        self,
        root: Path,
        config: dict[str, Any],
        manifest: dict[str, Any],
        recipe: dict[str, Any],
    ):
        self.config = config
        self.recipe = recipe
        self.frames, self.source_records, self.metrics = self._build(
            root,
            manifest,
        )

    def _build(
        self,
        root: Path,
        manifest: dict[str, Any],
    ) -> tuple[list[Image.Image], list[dict[str, Any]], dict[str, Any]]:
        tuned = deepcopy(self.recipe)
        target_size = self.config["build"]["proposedAttackDisplaySizePx"]
        tuned["sources"]["jab"]["displaySizePx"] = target_size
        tuned["sources"]["cross"]["displaySizePx"] = target_size
        candidate = deepcopy(
            next(
                value
                for value in tuned["candidates"]
                if value["id"] == tuned["defaultCandidateId"]
            )
        )
        sheets = {
            source_id: Image.open(root / source["file"]).convert("RGBA")
            for source_id, source in tuned["sources"].items()
        }
        frames, metrics = build_candidate_frames(
            tuned,
            manifest,
            sheets,
            candidate,
        )
        return frames, metrics["sourceFrames"], metrics

    def records(
        self,
        action: str,
        label: str,
        *,
        speed: float,
    ) -> list[dict[str, Any]]:
        build = self.config["build"]
        count = self.recipe["build"]["framesPerAction"]
        start = 0 if action == "jab" else count
        contact = build["contactSequenceIndexes"]["moving-side"]
        output = [
            record(
                self.frames[start + index],
                label,
                run_phase=int(self.source_records[start + index]["run"]),
                speed=speed,
                contact=index == contact,
            )
            for index in range(count)
        ]
        marker_x = (
            build["proposedMovingContactEnvelopeRightSourcePx"]
            + build["contactFaceClearanceSourcePx"]
        )
        return decorate_attack_records(
            output,
            self.config,
            display_size_px=build["proposedAttackDisplaySizePx"],
            apparent_scale=build["proposedMovingUpperScale"],
            contact_marker_x=marker_x,
        )
