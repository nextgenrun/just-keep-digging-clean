"""Build the unwired SIDE-dig Piskel candidate and before/after evidence."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops


REVIEW_DIR = Path(__file__).resolve().parent
ROOT = REVIEW_DIR.parents[2]
PIPELINE_DIR = ROOT / "pipelines" / "piskel"
PISKEL_TOOL_DIR = ROOT / "tools" / "piskel-mcp"
CONFIG_PATH = ROOT / "values" / "sideDigTransitionPolishReview.json"
sys.path.insert(0, str(PIPELINE_DIR))
sys.path.insert(0, str(PISKEL_TOOL_DIR))
sys.path.insert(0, str(REVIEW_DIR))

from piskel_document import make_piskel, read_piskel, write_json  # noqa: E402
from side_dig_review_compositor import (  # noqa: E402
    build_blocked_plant,
    build_moving_action,
    build_standing_action,
    candidate_sheet,
    normalized_idle,
)
from side_dig_review_renderer import (  # noqa: E402
    build_contact_sheet,
    build_keyframe_sheet,
    save_comparison_gif,
)
from side_dig_review_metrics import build_metrics  # noqa: E402
from side_dig_review_sequences import build_scenarios  # noqa: E402


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _resolve(config: dict[str, Any], key: str) -> Path:
    return REVIEW_DIR / config["outputs"][key]


def _load_sheets(config: dict[str, Any]) -> dict[str, Image.Image]:
    sheets = {}
    for key, source in config["sources"].items():
        path = ROOT / source["file"]
        if not path.is_file():
            raise FileNotFoundError(f"missing {key} source: {path}")
        sheets[key] = Image.open(path).convert("RGBA")
    return sheets


def _assert_review_isolation(config: dict[str, Any]) -> None:
    if config.get("reviewOnly") is not True:
        raise ValueError("SIDE-dig candidate must remain reviewOnly")
    if config.get("productionChanged") is not False:
        raise ValueError("review builder cannot mark production changed")
    if config.get("runtimeWiring") is not False:
        raise ValueError("review builder cannot enable runtime wiring")
    generated = (REVIEW_DIR / "generated").resolve()
    for relative in config["outputs"].values():
        target = (REVIEW_DIR / relative).resolve()
        if generated not in target.parents:
            raise ValueError(f"review output escaped generated/: {target}")


def _append_group(
    atlas_frames: list[Image.Image],
    layout: dict[str, list[int]],
    key: str,
    frames: list[Image.Image],
) -> None:
    start = len(atlas_frames)
    atlas_frames.extend(frames)
    layout[key] = list(range(start, len(atlas_frames)))


def _assert_identity(expected: list[Image.Image], actual: list[Image.Image]) -> None:
    if len(expected) != len(actual):
        raise ValueError("Piskel round-trip frame count changed")
    for index, (left, right) in enumerate(zip(expected, actual)):
        if ImageChops.difference(left.convert("RGBA"), right.convert("RGBA")).getbbox():
            raise ValueError(f"Piskel round-trip changed review frame {index}")


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    config = _load_json(CONFIG_PATH)
    _assert_review_isolation(config)
    generated = REVIEW_DIR / "generated"
    generated.mkdir(parents=True, exist_ok=True)
    manifest = _load_json(ROOT / config["sourceManifest"])
    sheets = _load_sheets(config)
    moving = config["moving"]
    sources = config["sources"]

    standing_full = {}
    standing_full_records = {}
    for action_id in ("jab", "cross"):
        frames, records = build_standing_action(
            action_id,
            list(range(int(sources[action_id]["frameCount"]))),
            int(sources[action_id]["contactFrame"]),
            sheets,
            manifest,
            config,
        )
        standing_full[action_id] = frames
        standing_full_records[action_id] = records

    standing_sample = {}
    for action_id in ("jab", "cross"):
        frames, _ = build_standing_action(
            action_id,
            list(moving[f"{action_id}Sequence"]),
            int(moving["contactFrame"]),
            sheets,
            manifest,
            config,
        )
        standing_sample[action_id] = frames

    moving_jab, moving_jab_metrics = build_moving_action(
        "jab", int(moving["jabRunStartFrame"]), sheets, manifest, config
    )
    moving_cross, moving_cross_metrics = build_moving_action(
        "cross", int(moving["crossRunStartFrame"]), sheets, manifest, config
    )
    idle_base = normalized_idle(sheets, config, int(config["standing"]["idleFrame"]))
    candidates = {
        "idleBase": idle_base,
        "standingFull": standing_full,
        "standingSampleJab": standing_sample["jab"],
        "standingSampleCross": standing_sample["cross"],
        "blockedJab": build_blocked_plant(
            standing_sample["jab"],
            int(config["blocked"]["plantRunStartFrame"]),
            sheets,
            config,
        ),
        "movingJab": moving_jab,
        "movingCross": moving_cross,
        "movingMetrics": {"jab": moving_jab_metrics, "cross": moving_cross_metrics},
    }

    atlas_frames: list[Image.Image] = []
    layout: dict[str, list[int]] = {}
    for key, frames in (
        ("standingJab", standing_full["jab"]),
        ("standingCross", standing_full["cross"]),
        ("movingJab", moving_jab),
        ("movingCross", moving_cross),
    ):
        _append_group(atlas_frames, layout, key, frames)

    piskel_entry = {**config["piskel"], "frameCount": len(atlas_frames)}
    piskel_path = _resolve(config, "piskel")
    write_json(piskel_path, make_piskel(piskel_entry, atlas_frames))
    round_trip, width, height, fps = read_piskel(piskel_path)
    if (width, height, fps) != (256, 256, 30):
        raise ValueError("review Piskel dimensions or cadence changed")
    _assert_identity(atlas_frames, round_trip)

    sheet_path = _resolve(config, "candidateSheet")
    candidate_sheet(round_trip, config).save(
        sheet_path,
        "WEBP",
        lossless=True,
        quality=100,
        method=6,
        exact=True,
    )
    layout_payload = {
        "schemaVersion": 1,
        "version": config["version"],
        "reviewOnly": True,
        "runtimeWiring": False,
        "frameCount": len(round_trip),
        "layout": layout,
        "standingRecords": standing_full_records,
    }
    write_json(_resolve(config, "layout"), layout_payload)

    scenarios = build_scenarios(sheets, candidates, config)
    gif_keys = {
        "standing-chain": "standingGif",
        "blocked-chain": "blockedGif",
        "running-handoff": "runningGif",
    }
    rendered = {
        scenario["id"]: save_comparison_gif(
            scenario, config, _resolve(config, gif_keys[scenario["id"]])
        )
        for scenario in scenarios
    }
    contact_path = _resolve(config, "contactSheet")
    build_contact_sheet(rendered, scenarios, config).save(contact_path, "PNG", optimize=True)
    keyframe_path = _resolve(config, "keyframeSheet")
    build_keyframe_sheet(rendered, scenarios, config).save(keyframe_path, "PNG", optimize=True)

    metrics = build_metrics(scenarios, candidates, sheets, manifest, config)
    metrics["piskel"] = {
        "frameCount": len(round_trip),
        "width": width,
        "height": height,
        "fps": fps,
        "roundTripIdentity": True,
        "sha256": _sha256(piskel_path),
    }
    metrics["artifacts"] = {
        "candidateSheetBytes": sheet_path.stat().st_size,
        "contactSheetBytes": contact_path.stat().st_size,
        "keyframeSheetBytes": keyframe_path.stat().st_size,
        "comparisonGifBytes": {
            scenario_id: _resolve(config, output_key).stat().st_size
            for scenario_id, output_key in gif_keys.items()
        },
    }
    write_json(_resolve(config, "metrics"), metrics)
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
