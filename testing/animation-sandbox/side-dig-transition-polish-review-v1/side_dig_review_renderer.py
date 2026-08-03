"""Render synchronized current/proposed SIDE-dig review loops."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

from side_dig_review_compositor import lower_anchor


BG = "#071117"
PANEL = "#0b1a21"
GRID = "#15313a"
GRID_MAJOR = "#224750"
TEXT = "#e6f3ef"
MUTED = "#7f9e9d"
CURRENT = "#ff6b6b"
PROPOSED = "#6ee7c3"
ANCHOR = "#67b7ff"
BODY = "#8bb3ba"
IMPACT = "#ffcc66"
TILE = "#526e69"
TILE_EDGE = "#8ab8ad"


def _fonts(config: dict[str, Any]) -> dict[str, ImageFont.FreeTypeFont]:
    render = config["render"]
    return {
        "title": ImageFont.truetype(render["fontBoldFile"], 23),
        "lane": ImageFont.truetype(render["fontBoldFile"], 18),
        "body": ImageFont.truetype(render["fontFile"], 15),
        "small": ImageFont.truetype(render["fontFile"], 13),
    }


def _root_x(record: dict[str, Any], lane_left: int, config: dict[str, Any]) -> float:
    return lane_left + float(config["render"]["actorRootX"]) + float(record["rootXPx"])


def _anchor_screen(
    record: dict[str, Any],
    lane_left: int,
    ground_y: int,
    config: dict[str, Any],
) -> tuple[float, float]:
    source_x, source_y = lower_anchor(record["frame"], config)
    scale = float(record["displaySizePx"]) / float(config["geometry"]["frameWidth"])
    return (
        _root_x(record, lane_left, config)
        + (source_x - float(record["originX"]) * 256.0) * scale,
        ground_y + (source_y - float(record["originY"]) * 256.0) * scale,
    )


def _scene(
    draw: ImageDraw.ImageDraw,
    record: dict[str, Any],
    lane_left: int,
    lane_width: int,
    ground_y: int,
    config: dict[str, Any],
    kind: str,
) -> float:
    tile = float(config["geometry"]["tileSizePx"])
    half = round(tile / 2)
    for x in range(lane_left + half, lane_left + lane_width, half):
        draw.line((x, 70, x, ground_y), fill=GRID, width=1)
    for y in range(ground_y, 70, -half):
        draw.line((lane_left, y, lane_left + lane_width, y), fill=GRID_MAJOR, width=1)
    draw.line((lane_left, ground_y, lane_left + lane_width, ground_y), fill=IMPACT, width=2)
    face_x = (
        lane_left
        + float(config["render"]["actorRootX"])
        + float(config["geometry"]["bodyWidthPx"]) / 2
    )
    if kind == "side" and record["targetSolid"]:
        draw.rectangle((face_x, ground_y - tile, face_x + tile, ground_y), fill=TILE)
        draw.line((face_x, ground_y - tile, face_x, ground_y), fill=TILE_EDGE, width=2)
        draw.line((face_x, ground_y - tile, face_x + tile, ground_y - tile), fill=TILE_EDGE)
    return face_x


def _draw_actor(
    canvas: Image.Image,
    draw: ImageDraw.ImageDraw,
    record: dict[str, Any],
    lane_left: int,
    ground_y: int,
    tile_face_x: float,
    config: dict[str, Any],
    accent: str,
) -> None:
    geometry = config["geometry"]
    root_x = _root_x(record, lane_left, config)
    size = round(float(record["displaySizePx"]))
    frame = record["frame"].resize((size, size), Image.Resampling.LANCZOS)
    paste_x = round(root_x - size * float(record["originX"]))
    paste_y = round(ground_y - size * float(record["originY"]))
    canvas.alpha_composite(frame, (paste_x, paste_y))
    body_width = float(geometry["bodyWidthPx"])
    body_height = float(geometry["bodyHeightPx"])
    draw.rectangle(
        (root_x - body_width / 2, ground_y - body_height, root_x + body_width / 2, ground_y),
        outline=BODY,
        width=1,
    )
    draw.line((root_x - 7, ground_y, root_x + 7, ground_y), fill=ANCHOR, width=2)
    draw.line((root_x, ground_y - 7, root_x, ground_y + 5), fill=ANCHOR, width=2)
    alpha = frame.getchannel("A").point(
        lambda value: 255 if value >= int(geometry["alphaThreshold"]) else 0
    )
    bounds = alpha.getbbox()
    if bounds:
        draw.rectangle(
            (paste_x + bounds[0], paste_y + bounds[1], paste_x + bounds[2], paste_y + bounds[3]),
            outline=accent,
            width=1,
        )
    if record["contact"]:
        contact_x = tile_face_x if record["targetSolid"] else root_x + float(geometry["tileSizePx"]) / 2
        impact_y = ground_y - 45
        draw.ellipse((contact_x - 7, impact_y - 7, contact_x + 7, impact_y + 7), outline=IMPACT, width=3)
        draw.line((contact_x - 11, impact_y, contact_x + 11, impact_y), fill=IMPACT, width=2)
        draw.line((contact_x, impact_y - 11, contact_x, impact_y + 11), fill=IMPACT, width=2)


def render_pair(
    scenario: dict[str, Any],
    frame_index: int,
    config: dict[str, Any],
) -> Image.Image:
    width = int(config["render"]["canvasWidth"])
    height = int(config["render"]["canvasHeight"])
    lane_width = width // 2
    ground_y = height - int(config["render"]["groundInsetPx"])
    canvas = Image.new("RGBA", (width, height), BG)
    draw = ImageDraw.Draw(canvas)
    fonts = _fonts(config)
    draw.rectangle((0, 0, width, 69), fill=PANEL)
    draw.line((lane_width, 0, lane_width, height), fill=GRID_MAJOR, width=2)
    draw.text((width / 2, 8), scenario["label"], font=fonts["title"], fill=TEXT, anchor="ma")
    draw.text((width / 2, 37), scenario["subtitle"], font=fonts["small"], fill=MUTED, anchor="ma")
    draw.text(
        (width / 2, 55),
        f"frame {frame_index + 1:02d}/{len(scenario['before']):02d} · synchronized",
        font=fonts["small"],
        fill=MUTED,
        anchor="ma",
    )
    for lane, (key, heading, accent) in enumerate((
        ("before", "BEFORE · CURRENT", CURRENT),
        ("after", "AFTER · REVIEW CANDIDATE", PROPOSED),
    )):
        left = lane * lane_width
        record = scenario[key][frame_index]
        tile_face = _scene(draw, record, left, lane_width, ground_y, config, scenario["kind"])
        history_start = max(0, frame_index - 9)
        for history_index in range(history_start, frame_index + 1):
            point = _anchor_screen(scenario[key][history_index], left, ground_y, config)
            fade = 70 + round(160 * (history_index - history_start + 1) / (frame_index - history_start + 1))
            color = (*ImageColor_getrgb(accent), fade)
            draw.ellipse((point[0] - 2, point[1] - 2, point[0] + 2, point[1] + 2), fill=color)
        _draw_actor(canvas, draw, record, left, ground_y, tile_face, config, accent)
        anchor_x, _ = _anchor_screen(record, left, ground_y, config)
        local_anchor = anchor_x - (left + float(config["render"]["actorRootX"]))
        draw.rounded_rectangle((left + 18, 80, left + 330, 111), radius=8, fill="#10242b", outline=accent)
        draw.text((left + 30, 86), heading, font=fonts["lane"], fill=accent)
        draw.text((left + 18, 121), record["label"], font=fonts["body"], fill=TEXT)
        draw.text(
            (left + 18, 145),
            f"Body root {record['rootXPx']:+05.1f}px   Lower anchor {local_anchor:+05.1f}px",
            font=fonts["small"],
            fill=MUTED,
        )
        progress_left = left + 18
        progress_right = left + lane_width - 18
        progress_y = height - 14
        draw.line((progress_left, progress_y, progress_right, progress_y), fill=GRID_MAJOR, width=3)
        progress = frame_index / max(1, len(scenario[key]) - 1)
        draw.line(
            (progress_left, progress_y, progress_left + (progress_right - progress_left) * progress, progress_y),
            fill=accent,
            width=3,
        )
    return canvas.convert("RGB")


def ImageColor_getrgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))


def save_comparison_gif(
    scenario: dict[str, Any],
    config: dict[str, Any],
    path: Path,
) -> list[Image.Image]:
    frames = [render_pair(scenario, index, config) for index in range(len(scenario["before"]))]
    duration = int(config["render"]["previewFrameDurationMs"])
    durations = [duration] * len(frames)
    durations[int(scenario["criticalIndex"])] = duration * int(config["render"]["contactHoldFrames"])
    durations[-1] = duration * 4
    path.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=False,
        disposal=2,
    )
    return frames


def build_contact_sheet(
    rendered: dict[str, list[Image.Image]],
    scenarios: list[dict[str, Any]],
    config: dict[str, Any],
) -> Image.Image:
    width = int(config["render"]["canvasWidth"])
    height = int(config["render"]["canvasHeight"])
    sheet = Image.new("RGB", (width, height * len(scenarios)), BG)
    for row, scenario in enumerate(scenarios):
        frame = rendered[scenario["id"]][int(scenario["criticalIndex"])]
        sheet.paste(frame, (0, row * height))
    return sheet


def build_keyframe_sheet(
    rendered: dict[str, list[Image.Image]],
    scenarios: list[dict[str, Any]],
    config: dict[str, Any],
) -> Image.Image:
    source_width = int(config["render"]["canvasWidth"])
    source_height = int(config["render"]["canvasHeight"])
    cell_width = source_width // 2
    cell_height = source_height // 2
    columns = 3
    rows_per_scenario = 2
    sheet = Image.new(
        "RGB",
        (cell_width * columns, cell_height * rows_per_scenario * len(scenarios)),
        BG,
    )
    for scenario_index, scenario in enumerate(scenarios):
        for item_index, frame_index in enumerate(scenario["reviewFrames"]):
            frame = rendered[scenario["id"]][int(frame_index)]
            frame = frame.resize((cell_width, cell_height), Image.Resampling.LANCZOS)
            column = item_index % columns
            row = scenario_index * rows_per_scenario + item_index // columns
            sheet.paste(frame, (column * cell_width, row * cell_height))
    return sheet
