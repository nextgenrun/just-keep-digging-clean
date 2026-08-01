"""Shared runtime-frame and timeline helpers for the held-dig review."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image

from moving_side_dig_compositor import extract_frame


class RuntimeAssets:
    """Loads runtime action frames and their authored lower-body phase metadata."""

    def __init__(self, root: Path, config: dict[str, Any], manifest: dict[str, Any]):
        self.root = root
        self.config = config
        self.manifest = manifest
        self.sheet_cache: dict[str, Image.Image] = {}

    def action(self, action_id: str) -> tuple[list[Image.Image], dict[str, Any]]:
        metadata = self.manifest["actions"][action_id]
        file_name = metadata["file"]
        if file_name not in self.sheet_cache:
            runtime_dir = self.root / self.config["sources"]["runtimeDirectory"]
            self.sheet_cache[file_name] = Image.open(runtime_dir / file_name).convert("RGBA")
        sheet = self.sheet_cache[file_name]
        composition = metadata.get("composition") or {}
        indexes = composition.get("atlas_frames") or list(range(metadata["frame_count"]))
        columns = int(metadata.get("columns") or self.config["build"]["sourceColumns"])
        frames = [
            extract_frame(
                sheet,
                int(index),
                self.config["build"]["frameWidth"],
                self.config["build"]["frameHeight"],
                columns,
            )
            for index in indexes
        ]
        return frames, metadata


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def record(
    frame: Image.Image,
    label: str,
    *,
    run_phase: int | None = None,
    target: str = "side-right",
    flip_x: bool = False,
    speed: float = 0,
    contact: bool = False,
    event: str | None = None,
) -> dict[str, Any]:
    return {
        "frame": frame,
        "label": label,
        "runPhase": run_phase,
        "target": target,
        "flipX": flip_x,
        "speed": speed,
        "contact": contact,
        "event": event,
        "scrollPx": 0.0,
    }


def action_records(
    assets: RuntimeAssets,
    action_id: str,
    label: str,
    *,
    target: str = "side-right",
    flip_x: bool = False,
    speed: float = 0,
    contact_index: int | None = None,
) -> list[dict[str, Any]]:
    frames, metadata = assets.action(action_id)
    phases = (metadata.get("composition") or {}).get("run_frames") or [None] * len(frames)
    return [
        record(
            frame,
            label,
            run_phase=phases[index] if index < len(phases) else None,
            target=target,
            flip_x=flip_x,
            speed=speed,
            contact=index == contact_index,
        )
        for index, frame in enumerate(frames)
    ]


def stretch(records: list[dict[str, Any]], count: int) -> list[dict[str, Any]]:
    if count <= 0 or not records:
        return []
    if count == 1:
        return [dict(records[0])]
    return [
        dict(records[round(index * (len(records) - 1) / (count - 1))])
        for index in range(count)
    ]


def retime_contact(
    records: list[dict[str, Any]],
    source_contact_index: int,
    output_contact_index: int,
) -> list[dict[str, Any]]:
    before = stretch(records[: source_contact_index + 1], output_contact_index + 1)
    after_count = len(records) - output_contact_index - 1
    after = stretch(records[source_contact_index + 1 :], after_count)
    output = before + after
    for index, value in enumerate(output):
        value["contact"] = index == output_contact_index
    return output


def run_records(
    assets: RuntimeAssets,
    phases: list[int],
    label: str,
    *,
    target: str,
    flip_x: bool,
    speed: float,
) -> list[dict[str, Any]]:
    run_frames, _ = assets.action("run")
    return [
        record(
            run_frames[phase % len(run_frames)],
            label,
            run_phase=phase % len(run_frames),
            target=target,
            flip_x=flip_x,
            speed=speed,
        )
        for phase in phases
    ]


def apply_event(
    before: list[dict[str, Any]],
    after: list[dict[str, Any]],
    scenario: dict[str, Any],
) -> None:
    index = int(scenario["eventFrame"])
    before[index]["event"] = scenario["eventLabel"]
    after[index]["event"] = scenario["eventLabel"]


def apply_scroll(records: list[dict[str, Any]], frame_duration_ms: float) -> None:
    scroll = 0.0
    seconds = frame_duration_ms / 1000
    for value in records:
        value["scrollPx"] = scroll
        scroll += float(value["speed"]) * seconds


def contact_indexes(records: list[dict[str, Any]]) -> list[int]:
    return [index for index, value in enumerate(records) if value["contact"]]


def normalize_pair(
    config: dict[str, Any],
    scenario: dict[str, Any],
    before: list[dict[str, Any]],
    after: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if len(before) != len(after):
        raise ValueError(f"{scenario['id']} Before/After lengths differ")
    apply_event(before, after, scenario)
    duration = config["build"]["previewFrameDurationMs"]
    apply_scroll(before, duration)
    apply_scroll(after, duration)
    return before, after
