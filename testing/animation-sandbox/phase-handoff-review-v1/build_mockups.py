"""Build review-only phase-handoff comparisons from production animation frames."""

from __future__ import annotations

import json
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "values" / "phaseHandoffReview.json"
sys.path.insert(0, str(ROOT / "pipelines" / "piskel"))

from moving_side_dig_compositor import build_candidate_frames, extract_frame  # noqa: E402
from phase_handoff_geometry import (  # noqa: E402
    add_live_metrics,
    marker_distance,
    planted_foot,
    resolve_pivot_phase,
)
from phase_handoff_renderer import render_pair, save_gif  # noqa: E402


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def phase_sequence(start: int, count: int, total: int = 28) -> list[int]:
    return [(start + index) % total for index in range(count)]


def source_frame(sheet: Image.Image, index: int, config: dict[str, Any], columns: int) -> Image.Image:
    build = config["build"]
    return extract_frame(sheet, index, build["frameWidth"], build["frameHeight"], columns)


def item(
    frame: Image.Image,
    run_phase: int,
    *,
    label: str,
    flip_x: bool = False,
    event: str | None = None,
    contact: bool = False,
) -> dict[str, Any]:
    return {
        "frame": frame,
        "runPhase": run_phase,
        "label": label,
        "flipX": flip_x,
        "event": event,
        "contact": contact,
    }


def build_moving_dig_sequences(
    config: dict[str, Any],
    manifest: dict[str, Any],
    run_sheet: Image.Image,
    current_sheet: Image.Image,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    scenario = next(value for value in config["scenarios"] if value["id"] == "moving-dig")
    build = config["build"]
    moving_config = load_json(ROOT / config["sources"]["movingDigRecipe"])
    source_sheets = {
        name: Image.open(ROOT / record["file"]).convert("RGBA")
        for name, record in moving_config["sources"].items()
    }
    candidate = next(
        value for value in moving_config["candidates"]
        if value["id"] == moving_config["defaultCandidateId"]
    )
    proposed_config = deepcopy(moving_config)
    proposed_start = (scenario["entryJogPhase"] + 1) % moving_config["sources"]["run"]["frameCount"]
    proposed_config["build"]["runStartFrame"] = proposed_start
    proposed_frames, proposed_metrics = build_candidate_frames(
        proposed_config,
        manifest,
        source_sheets,
        candidate,
    )
    proposed_frames = proposed_frames[:14]
    proposed_records = proposed_metrics["sourceFrames"][:14]
    blend_weights = build["actionBlendWeights"]
    for index in range(build["actionBlendFrames"]):
        run_phase = proposed_records[index]["run"]
        run = source_frame(run_sheet, run_phase, config, build["sourceColumns"])
        proposed_frames[index] = Image.blend(run, proposed_frames[index], blend_weights[index])

    pre_phases = phase_sequence(
        scenario["entryJogPhase"] - scenario["preFrames"] + 1,
        scenario["preFrames"],
    )
    current_phases = manifest["actions"]["moving-side-dig-jab"]["composition"]["run_frames"]
    proposed_phases = [record["run"] for record in proposed_records]
    current_post = phase_sequence(0, scenario["postFrames"])
    proposed_post = phase_sequence((proposed_phases[-1] + 1) % 28, scenario["postFrames"])

    current = [
        item(source_frame(run_sheet, phase, config, build["sourceColumns"]), phase, label="JOG")
        for phase in pre_phases
    ]
    proposed = [
        item(source_frame(run_sheet, phase, config, build["sourceColumns"]), phase, label="JOG")
        for phase in pre_phases
    ]
    for index, phase in enumerate(current_phases):
        current.append(item(
            source_frame(current_sheet, index, config, build["currentActionColumns"]),
            phase,
            label="MOVING JAB",
            event="DIG START" if index == 0 else None,
            contact=index == scenario["contactFrame"],
        ))
    for index, (frame, phase) in enumerate(zip(proposed_frames, proposed_phases)):
        proposed.append(item(
            frame,
            phase,
            label="2F BLEND" if index < build["actionBlendFrames"] else "MOVING JAB",
            event="DIG START" if index == 0 else None,
            contact=index == scenario["contactFrame"],
        ))
    for index, phase in enumerate(current_post):
        current.append(item(
            source_frame(run_sheet, phase, config, build["sourceColumns"]),
            phase,
            label="JOG",
            event="DIG RELEASE" if index == 0 else None,
        ))
    for index, phase in enumerate(proposed_post):
        proposed.append(item(
            source_frame(run_sheet, phase, config, build["sourceColumns"]),
            phase,
            label="PHASE RESUME",
            event="DIG RELEASE" if index == 0 else None,
        ))

    pre_last = pre_phases[-1]
    metrics = {
        "entry": {
            "outgoingPhase": pre_last,
            "currentPhase": current_phases[0],
            "proposedPhase": proposed_phases[0],
            "currentFootDeltaSourcePx": marker_distance(
                planted_foot(manifest, pre_last),
                planted_foot(manifest, current_phases[0]),
            ),
            "proposedFootDeltaSourcePx": marker_distance(
                planted_foot(manifest, pre_last),
                planted_foot(manifest, proposed_phases[0]),
            ),
        },
        "release": {
            "outgoingPhase": current_phases[-1],
            "currentPhase": current_post[0],
            "proposedOutgoingPhase": proposed_phases[-1],
            "proposedPhase": proposed_post[0],
            "currentFootDeltaSourcePx": marker_distance(
                planted_foot(manifest, current_phases[-1]),
                planted_foot(manifest, current_post[0]),
            ),
            "proposedFootDeltaSourcePx": marker_distance(
                planted_foot(manifest, proposed_phases[-1]),
                planted_foot(manifest, proposed_post[0]),
            ),
        },
        "actionFrames": 14,
        "contactFrame": scenario["contactFrame"],
        "blendFrames": build["actionBlendFrames"],
        "inputDelayFrames": 0,
    }
    return current, proposed, metrics


def build_turn_sequences(
    config: dict[str, Any],
    manifest: dict[str, Any],
    run_sheet: Image.Image,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    scenario = next(value for value in config["scenarios"] if value["id"] == "instant-turn")
    build = config["build"]
    outgoing = scenario["outgoingJogPhase"]
    pre_phases = phase_sequence(outgoing - scenario["preFrames"] + 1, scenario["preFrames"])
    pivot_start = resolve_pivot_phase(manifest, outgoing, build["pivotVerticalWeight"])
    current_after = phase_sequence((outgoing + 1) % 28, build["pivotBridgeFrames"] + scenario["postFrames"])
    proposed_after = phase_sequence(pivot_start, build["pivotBridgeFrames"] + scenario["postFrames"])
    current = [
        item(source_frame(run_sheet, phase, config, build["sourceColumns"]), phase, label="JOG →")
        for phase in pre_phases
    ]
    proposed = [
        item(source_frame(run_sheet, phase, config, build["sourceColumns"]), phase, label="JOG →")
        for phase in pre_phases
    ]
    for index, phase in enumerate(current_after):
        current.append(item(
            source_frame(run_sheet, phase, config, build["sourceColumns"]),
            phase,
            label="MIRROR CUT ←",
            flip_x=True,
            event="TURN INPUT" if index == 0 else None,
        ))
    for index, phase in enumerate(proposed_after):
        proposed.append(item(
            source_frame(run_sheet, phase, config, build["sourceColumns"]),
            phase,
            label=("PIVOT STOP ←" if index == 0 else "PIVOT START ←")
            if index < build["pivotBridgeFrames"] else "JOG ←",
            flip_x=True,
            event="TURN INPUT" if index == 0 else None,
        ))
    metrics = {
        "outgoingPhase": outgoing,
        "currentPhase": current_after[0],
        "pivotPhases": proposed_after[:build["pivotBridgeFrames"]],
        "currentFootDeltaSourcePx": marker_distance(
            planted_foot(manifest, outgoing),
            planted_foot(manifest, current_after[0], True),
        ),
        "proposedFootDeltaSourcePx": marker_distance(
            planted_foot(manifest, outgoing),
            planted_foot(manifest, proposed_after[0], True),
        ),
        "pivotFrames": build["pivotBridgeFrames"],
        "inputDelayFrames": 0,
    }
    return current, proposed, metrics


def main() -> None:
    config = load_json(CONFIG_PATH)
    manifest = load_json(ROOT / config["sources"]["runtimeManifest"])
    run_sheet = Image.open(ROOT / config["sources"]["runSheet"]).convert("RGBA")
    current_jab = Image.open(ROOT / config["sources"]["currentJabSheet"]).convert("RGBA")
    sequence_builders = {
        "moving-dig": lambda: build_moving_dig_sequences(config, manifest, run_sheet, current_jab),
        "instant-turn": lambda: build_turn_sequences(config, manifest, run_sheet),
    }
    results: dict[str, Any] = {}
    rendered: dict[str, list[Image.Image]] = {}
    for scenario in config["scenarios"]:
        current, proposed, metrics = sequence_builders[scenario["id"]]()
        frames = [
            render_pair(config, manifest, scenario, current, proposed, index)
            for index in range(len(current))
        ]
        output = HERE / scenario["output"]
        save_gif(frames, output, config["build"]["previewFrameDurationMs"])
        rendered[scenario["id"]] = frames
        live_scale = config["build"]["displaySizePx"] / config["build"]["frameWidth"]
        add_live_metrics(metrics, live_scale)
        results[scenario["id"]] = {
            "label": scenario["label"],
            "output": scenario["output"],
            **metrics,
        }

    selected = [
        rendered["moving-dig"][3],
        rendered["moving-dig"][4],
        rendered["moving-dig"][5],
        rendered["moving-dig"][18],
        rendered["instant-turn"][3],
        rendered["instant-turn"][4],
    ]
    thumb_size = (config["build"]["canvasWidth"] // 2, config["build"]["panelHeight"])
    sheet = Image.new("RGBA", (thumb_size[0] * 3, thumb_size[1] * 2), config["palette"]["background"])
    for index, frame in enumerate(selected):
        thumb = frame.resize(thumb_size, Image.Resampling.LANCZOS)
        sheet.alpha_composite(thumb, ((index % 3) * thumb_size[0], (index // 3) * thumb_size[1]))
    keyframe_path = HERE / config["outputs"]["keyframes"]
    keyframe_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(keyframe_path)
    report = {
        "schemaVersion": 1,
        "reviewOnly": config["reviewOnly"],
        "productionChanged": config["productionChanged"],
        "defaultScenarioId": config["defaultScenarioId"],
        "scenarios": results,
    }
    metrics_path = HERE / config["outputs"]["metrics"]
    metrics_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "ok": True,
        "reviewOnly": True,
        "productionChanged": False,
        "outputs": [value["output"] for value in results.values()],
        "metrics": config["outputs"]["metrics"],
    }, indent=2))


if __name__ == "__main__":
    main()
