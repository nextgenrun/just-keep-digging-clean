"""Build review-only moving-side-dig sheets, GIFs, metrics and contact sheet."""

from __future__ import annotations

import json
import math
from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageFont


REVIEW_DIR = Path(__file__).resolve().parent
ROOT = REVIEW_DIR.parents[2]
CONFIG_PATH = ROOT / "values" / "movingSideDigReview.json"
OUTPUT_DIR = REVIEW_DIR / "generated"
sys.path.insert(0, str(ROOT / "pipelines" / "piskel"))

from moving_side_dig_compositor import build_candidate_frames, pack_sheet  # noqa: E402


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def font(size: int) -> ImageFont.ImageFont:
    return ImageFont.load_default(size=size)


def draw_stage_frame(
    config: dict,
    candidate: dict,
    metrics: dict,
    frame: Image.Image,
    frame_index: int,
) -> Image.Image:
    stage = config["stage"]
    build = config["build"]
    width, height = stage["widthPx"], stage["heightPx"]
    scale = stage["reviewScale"]
    tile = stage["tileSizePx"] * scale
    ground_y = round(height * stage["groundYRatio"])
    actor_x = round(width * stage["actorXRatio"])
    target_x = round(
        actor_x
        + stage["bodyWidthPx"] * scale / 2
        + tile / 2
        + stage["targetGapPx"] * scale
    )
    canvas = Image.new("RGBA", (width, height), (7, 14, 18, 255))
    draw = ImageDraw.Draw(canvas, "RGBA")
    for y in range(height):
        mix = y / max(1, height - 1)
        draw.line((0, y, width, y), fill=(
            round(15 - 8 * mix), round(34 - 20 * mix), round(41 - 23 * mix), 255,
        ))
    seconds = frame_index / (build["fps"] * build["previewTimeScale"])
    scroll = seconds * stage["referenceSpeedPxPerSec"] * scale
    x = -scroll % tile
    while x < width:
        draw.line((x, 0, x, height), fill=(129, 188, 184, 30))
        x += tile
    draw.rectangle((0, ground_y, width, height), fill=(23, 37, 42, 255))
    ground_x = -(scroll % (tile / 2))
    while ground_x < width:
        draw.line((ground_x, ground_y, ground_x, height), fill=(73, 104, 106, 95))
        ground_x += tile / 2
    pebble_x = -(scroll % tile)
    while pebble_x < width:
        draw.rectangle((pebble_x + tile * .22, ground_y + 14, pebble_x + tile * .22 + 8, ground_y + 17), fill=(119, 151, 148, 95))
        draw.rectangle((pebble_x + tile * .66, ground_y + 34, pebble_x + tile * .66 + 11, ground_y + 37), fill=(119, 151, 148, 95))
        pebble_x += tile
    draw.line((0, ground_y, width, ground_y), fill=(244, 189, 105, 180), width=2)
    impact = frame_index in build["contactFrames"]
    target_box = (
        round(target_x - tile / 2), round(ground_y - tile),
        round(target_x + tile / 2), ground_y,
    )
    draw.rectangle(target_box, fill=(244, 189, 105, 155) if impact else (83, 113, 111, 145))
    draw.rectangle(target_box, outline=(244, 189, 105, 255) if impact else (164, 208, 203, 135), width=3 if impact else 1)
    if impact:
        center_y = round(ground_y - tile / 2)
        for angle in range(0, 360, 45):
            radians = math.radians(angle)
            start = (target_x + math.cos(radians) * 16, center_y + math.sin(radians) * 16)
            end = (target_x + math.cos(radians) * 36, center_y + math.sin(radians) * 36)
            draw.line((*start, *end), fill=(255, 221, 137, 235), width=3)
    size = round(candidate["displaySizePx"] * scale)
    actor = frame.resize((size, size), Image.Resampling.LANCZOS)
    actor_left = round(actor_x - size * stage["visualOriginX"])
    actor_top = round(ground_y - size * stage["visualOriginY"])
    if candidate.get("contactEnvelopePolicy") == "shared-visible-silhouette":
        marker_source_x = (
            metrics["contactEnvelopeRightSourcePx"]
            + candidate["contactFaceClearancePx"]
        )
        marker_stage_x = actor_left + marker_source_x * size / build["frameWidth"]
        actor_left += round(min(0, target_box[0] - marker_stage_x))
    canvas.alpha_composite(actor, (actor_left, actor_top))
    body_width = stage["bodyWidthPx"] * scale
    body_height = stage["bodyHeightPx"] * scale
    draw.rectangle(
        (actor_x - body_width / 2, ground_y - body_height, actor_x + body_width / 2, ground_y),
        outline=(255, 121, 112, 210),
        width=2,
    )
    draw.rounded_rectangle((16, 14, 310, 66), radius=10, fill=(3, 9, 12, 205), outline=(124, 227, 220, 85))
    draw.text((29, 23), f"OPTION {candidate['option']}  {candidate['shortLabel']}", fill=(238, 247, 245), font=font(17))
    detail = "continuous Jog lower body" if candidate["lowerBodyPolicy"] == "continuous-run" else "standing feet + moving collider"
    draw.text((29, 45), detail, fill=(156, 233, 180) if candidate["recommended"] else (156, 178, 175), font=font(12))
    draw.text((width - 118, 20), "REVIEW ONLY", fill=(244, 189, 105), font=font(12))
    return canvas.convert("P", palette=Image.Palette.ADAPTIVE, colors=255)


def main() -> None:
    config = load_json(CONFIG_PATH)
    manifest = load_json(ROOT / config["sourceManifest"])
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    sheets = {
        source_id: Image.open(ROOT / source["file"]).convert("RGBA")
        for source_id, source in config["sources"].items()
    }
    all_stage_frames: dict[str, list[Image.Image]] = {}
    metrics = {
        "schemaVersion": 1,
        "reviewOnly": config["reviewOnly"],
        "productionChanged": config["productionChanged"],
        "recommendedCandidateId": config["defaultCandidateId"],
        "candidates": [],
    }
    duration = round(1000 / (config["build"]["fps"] * config["build"]["previewTimeScale"]))
    for candidate in config["candidates"]:
        frames, candidate_metrics = build_candidate_frames(config, manifest, sheets, candidate)
        pack_sheet(
            frames,
            config["build"]["columns"],
            config["build"]["frameWidth"],
            config["build"]["frameHeight"],
        ).save(REVIEW_DIR / candidate["sheet"])
        stage_frames = [
            draw_stage_frame(config, candidate, candidate_metrics, frame, index)
            for index, frame in enumerate(frames)
        ]
        stage_frames[0].save(
            REVIEW_DIR / candidate["preview"],
            save_all=True,
            append_images=stage_frames[1:],
            duration=duration,
            loop=0,
            disposal=2,
            optimize=False,
        )
        all_stage_frames[candidate["id"]] = stage_frames
        metrics["candidates"].append(candidate_metrics)
    key_frames = [0, 6, 14, 22, 28, 36]
    thumb_width, thumb_height = 360, 257
    sheet = Image.new("RGB", (thumb_width * len(key_frames), thumb_height * len(config["candidates"])), (5, 10, 13))
    for row, candidate in enumerate(config["candidates"]):
        for column, frame_index in enumerate(key_frames):
            crop = all_stage_frames[candidate["id"]][frame_index].convert("RGB").crop((45, 0, 570, 375))
            thumb = crop.resize(
                (thumb_width, thumb_height),
                Image.Resampling.LANCZOS,
            )
            sheet.paste(thumb, (column * thumb_width, row * thumb_height))
    sheet.save(OUTPUT_DIR / "moving-side-dig-comparison-contact-sheet.png")
    (OUTPUT_DIR / "moving-side-dig-metrics.json").write_text(
        json.dumps(metrics, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
