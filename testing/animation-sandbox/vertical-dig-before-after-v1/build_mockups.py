"""Build isolated vertical-dig Before/After review assets."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "values" / "verticalDigBeforeAfterReview.json"
sys.path.insert(0, str(ROOT / "pipelines" / "piskel"))
sys.path.insert(0, str(HERE))

from vertical_dig_sequences import (  # noqa: E402
    moving_records,
    opaque_tile_intrusion,
    stationary_records,
)
from vertical_dig_candidates import (  # noqa: E402
    build_moving_candidates,
    build_stationary_down,
    build_stationary_up,
    frame_metrics,
    packed,
    source_frames,
)
from vertical_dig_renderer import render_pair, save_gif  # noqa: E402


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_sheet(source: dict[str, Any]) -> Image.Image:
    return Image.open(ROOT / source["file"]).convert("RGBA")




def main() -> None:
    config = load_json(CONFIG_PATH)
    if not config["reviewOnly"] or config["productionChanged"]:
        raise ValueError("vertical-dig review isolation guard failed")
    sources = config["sources"]
    (HERE / "generated").mkdir(parents=True, exist_ok=True)
    geometry = config["geometry"]
    manifest = load_json(ROOT / sources["runtimeManifest"])
    production = load_json(ROOT / sources["productionPolishConfig"])
    sheets = {
        source_id: load_sheet(source)
        for source_id, source in sources.items()
        if isinstance(source, dict) and "file" in source
    }
    frames = {
        source_id: source_frames(sheets[source_id], source, geometry)
        for source_id, source in sources.items()
        if isinstance(source, dict) and "file" in source
    }
    stationary_up = build_stationary_up(frames["digUp"], config["candidate"])
    stationary_down = build_stationary_down(frames["blenderDigDown"], geometry)
    moving_after, _ = build_moving_candidates(
        production,
        config,
        manifest,
        {"run": sheets["run"], "digUp": sheets["digUp"]},
        stationary_up,
        stationary_down,
    )
    output_paths = config["outputs"]
    packed(stationary_up, geometry).save(HERE / output_paths["stationaryUpSheet"])
    packed(stationary_down, geometry).save(HERE / output_paths["stationaryDownSheet"])
    packed(moving_after, geometry).save(
        HERE / output_paths["movingSheet"],
        format="WEBP",
        lossless=True,
        quality=100,
        method=6,
    )
    results: dict[str, Any] = {}
    contact_renders: list[Image.Image] = []
    for scenario in config["scenarios"]:
        if scenario["id"] == "stationary-up":
            before_frames, after_frames = frames["digUp"], stationary_up
            before_source = after_source = sources["digUp"]
        elif scenario["id"] == "stationary-down":
            before_frames, after_frames = frames["groundStrike"][4:], stationary_down
            before_source, after_source = sources["groundStrike"], sources["blenderDigDown"]
            scenario = dict(scenario)
            scenario["beforeContactSourceFrame"] -= 4
        else:
            base = 0 if scenario["family"] == "up" else 60
            before_frames = frames["movingDiagonal"][base:base + 15]
            after_frames = moving_after[base:base + 15]
            before_source = after_source = sources["movingDiagonal"]
        if scenario["movement"]:
            before_records, after_records = moving_records(
                config,
                scenario,
                frames["run"],
                before_frames,
                after_frames,
                sources["movingDiagonal"],
            )
            contact_index = int(config["render"]["movingPreFrames"]) + int(
                scenario["contactSequenceIndex"],
            )
        else:
            before_records, after_records = stationary_records(
                config,
                scenario,
                before_frames,
                after_frames,
                before_source,
                after_source,
            )
            contact_index = int(scenario["previewContactFrame"])
        rendered = []
        for index, (current, proposed) in enumerate(zip(before_records, after_records)):
            comparison = render_pair(config, scenario, current, proposed)
            rendered.append(comparison)
            if index == contact_index:
                contact_renders.append(comparison)
                rendered.extend(
                    comparison.copy()
                    for _ in range(int(config["render"]["contactHoldFrames"]))
                )
        save_gif(
            rendered,
            HERE / scenario["output"],
            int(config["render"]["previewFrameDurationMs"]),
        )
        current_offset_x = float(geometry["currentMaxOffsetXPx"]) if scenario["movement"] else 0
        current_offset_y = (
            (-1 if scenario["family"] == "up" else 1)
            * float(geometry["currentMaxOffsetYPx"])
            if scenario["movement"] or scenario["family"] == "down"
            else 0
        )
        before_contact = before_frames[int(scenario["beforeContactSourceFrame"])]
        after_contact = after_frames[int(scenario["afterContactSourceFrame"])]
        results[scenario["id"]] = {
            "label": scenario["label"],
            "before": frame_metrics(before_frames, before_source["displaySizePx"], geometry),
            "after": frame_metrics(after_frames, after_source["displaySizePx"], geometry),
            "currentSpriteOffsetPx": {
                "x": round(current_offset_x, 2),
                "y": round(current_offset_y, 2),
                "magnitude": round(math.hypot(current_offset_x, current_offset_y), 2),
            },
            "proposedSpriteOffsetPx": {"x": 0, "y": 0, "magnitude": 0},
            "currentOpaqueTileIntrusionPixels": opaque_tile_intrusion(
                before_contact,
                before_source["displaySizePx"],
                before_source["originY"],
                geometry,
                family=scenario["family"],
                moving=scenario["movement"],
                offset_x=current_offset_x,
                offset_y=current_offset_y,
            ),
            "proposedOpaqueTileIntrusionPixels": opaque_tile_intrusion(
                after_contact,
                after_source["displaySizePx"],
                after_source["originY"],
                geometry,
                family=scenario["family"],
                moving=scenario["movement"],
                offset_x=0,
                offset_y=0,
            ),
            "contactSequenceIndex": scenario["contactSequenceIndex"],
            "inputDelayFrames": 0,
            "output": scenario["output"],
        }
    thumb_width = int(config["render"]["canvasWidth"]) // 2
    thumb_height = int(config["render"]["laneHeight"]) // 2
    sheet = Image.new(
        "RGBA",
        (thumb_width * 2, thumb_height * 2),
        config["palette"]["background"],
    )
    for index, comparison in enumerate(contact_renders):
        thumb = comparison.resize((thumb_width, thumb_height), Image.Resampling.LANCZOS)
        sheet.alpha_composite(
            thumb,
            ((index % 2) * thumb_width, (index // 2) * thumb_height),
        )
    sheet.save(HERE / output_paths["contactSheet"])
    report = {
        "schemaVersion": 1,
        "version": config["version"],
        "reviewOnly": True,
        "productionChanged": False,
        "scenarioCount": len(config["scenarios"]),
        "scenarios": results,
    }
    (HERE / output_paths["metrics"]).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({
        "ok": True,
        "reviewOnly": True,
        "productionChanged": False,
        "scenarioCount": len(results),
        "outputs": [scenario["output"] for scenario in config["scenarios"]],
        "contactSheet": output_paths["contactSheet"],
    }, indent=2))


if __name__ == "__main__":
    main()
