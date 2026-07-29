"""Build the review-only held-dig next-five Before/After package."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CONFIG_PATH = ROOT / "values" / "heldDigNextFiveReview.json"
sys.path.insert(0, str(ROOT / "pipelines" / "piskel"))
sys.path.insert(0, str(HERE))

from held_dig_renderer import render_pair, save_gif  # noqa: E402
from held_dig_sequences import build_all_sequences, load_json  # noqa: E402


def load_font(path: str, size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def build_contact_sheet(
    config: dict,
    rendered: dict[str, list[Image.Image]],
) -> Path:
    build, palette = config["build"], config["palette"]
    label_height = 52
    row_height = build["panelHeight"] + label_height
    sheet = Image.new(
        "RGBA",
        (build["canvasWidth"], row_height * len(config["scenarios"])),
        palette["background"],
    )
    draw = ImageDraw.Draw(sheet)
    title_font = load_font(build["fontBoldFile"], 21)
    detail_font = load_font(build["fontFile"], 13)
    for row, scenario in enumerate(config["scenarios"]):
        top = row * row_height
        draw.rectangle(
            (0, top, build["canvasWidth"], top + label_height),
            fill="#07171d",
        )
        draw.text(
            (18, top + 8),
            f"{scenario['rank']}. {scenario['title']}",
            font=title_font,
            fill=palette["text"],
        )
        draw.text(
            (620, top + 14),
            scenario["eventLabel"],
            font=detail_font,
            fill=palette["amber"],
        )
        frame = rendered[scenario["id"]][int(scenario["keyFrame"])]
        sheet.alpha_composite(frame, (0, top + label_height))
    output = HERE / config["outputs"]["contactSheet"]
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(output)
    return output


def main() -> None:
    config = load_json(CONFIG_PATH)
    if config["reviewOnly"] is not True or config["productionChanged"] is not False:
        raise ValueError("held-dig review isolation guard failed")
    manifest = load_json(ROOT / config["sources"]["runtimeManifest"])
    sequences = build_all_sequences(ROOT, config, manifest)
    rendered: dict[str, list[Image.Image]] = {}
    report = {
        "schemaVersion": 1,
        "version": config["version"],
        "reviewOnly": True,
        "productionChanged": False,
        "runtimeAssetCount": len(manifest["actions"]),
        "effectiveCooldownMs": config["build"]["effectiveCooldownMs"],
        "scenarios": [],
    }
    for scenario in config["scenarios"]:
        result = sequences[scenario["id"]]
        before, after = result["before"], result["after"]
        frames = [
            render_pair(config, manifest, scenario, before, after, index)
            for index in range(len(before))
        ]
        output = HERE / scenario["output"]
        save_gif(frames, output, config["build"]["previewFrameDurationMs"])
        rendered[scenario["id"]] = frames
        report["scenarios"].append({
            "id": scenario["id"],
            "rank": scenario["rank"],
            "title": scenario["title"],
            "output": scenario["output"],
            **result["metrics"],
        })
    contact_sheet = build_contact_sheet(config, rendered)
    metrics_path = HERE / config["outputs"]["metrics"]
    metrics_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "ok": True,
        "reviewOnly": True,
        "productionChanged": False,
        "scenarioCount": len(report["scenarios"]),
        "effectiveCooldownMs": report["effectiveCooldownMs"],
        "outputs": [scenario["output"] for scenario in config["scenarios"]],
        "contactSheet": str(contact_sheet.relative_to(ROOT)).replace("\\", "/"),
        "metrics": str(metrics_path.relative_to(ROOT)).replace("\\", "/"),
    }, indent=2))


if __name__ == "__main__":
    main()
