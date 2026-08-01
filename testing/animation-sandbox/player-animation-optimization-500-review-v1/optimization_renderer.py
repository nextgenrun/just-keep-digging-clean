"""Render synchronized current/proposed animation comparison loops."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

from optimization_sequences import visible_height


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
        "title": ImageFont.truetype(render["fontBoldFile"], 24),
        "lane": ImageFont.truetype(render["fontBoldFile"], 18),
        "body": ImageFont.truetype(render["fontFile"], 15),
        "small": ImageFont.truetype(render["fontFile"], 13),
    }


def _scene_grid(
    draw: ImageDraw.ImageDraw,
    left: int,
    lane_width: int,
    ground_y: int,
    geometry: dict[str, Any],
    kind: str,
) -> None:
    tile = float(geometry["tileSizePx"])
    half = round(tile / 2)
    for x in range(left + half, left + lane_width, half):
        color = GRID_MAJOR if ((x - left - half) // half) % 2 == 0 else GRID
        draw.line((x, 68, x, ground_y + 1), fill=color, width=1)
    for y in range(ground_y, 67, -half):
        draw.line((left, y, left + lane_width, y), fill=GRID_MAJOR, width=1)
    draw.line((left, ground_y, left + lane_width, ground_y), fill=IMPACT, width=2)
    if kind in {"side", "wall"}:
        root = left + 350
        face = round(root + tile / 2)
        draw.rectangle((face, ground_y - tile, face + tile, ground_y), fill=TILE)
        draw.line((face, ground_y - tile, face, ground_y), fill=TILE_EDGE, width=2)
        draw.line((face, ground_y - tile, face + tile, ground_y - tile), fill=TILE_EDGE)
    else:
        for x in range(left, left + lane_width, round(tile)):
            draw.rectangle((x, ground_y, x + tile, ground_y + 38), fill=TILE)
            draw.line((x, ground_y, x, ground_y + 38), fill=TILE_EDGE)


def _render_actor(
    canvas: Image.Image,
    draw: ImageDraw.ImageDraw,
    record: dict[str, Any],
    lane_left: int,
    ground_y: int,
    config: dict[str, Any],
    accent: str,
) -> tuple[float, tuple[int, int, int, int] | None]:
    geometry = config["geometry"]
    root_x = lane_left + int(config["render"]["actorRootX"])
    size = round(float(record["displaySizePx"]))
    origin_x = float(record["originX"])
    origin_y = float(record["originY"])
    offset_x = float(record["offsetXPx"])
    frame = record["frame"].resize((size, size), Image.Resampling.LANCZOS)
    paste_x = round(root_x + offset_x - size * origin_x)
    paste_y = round(ground_y - size * origin_y)
    canvas.alpha_composite(frame, (paste_x, paste_y))

    body_width = float(geometry["playerBodyWidthPx"])
    body_height = float(geometry["playerBodyHeightPx"])
    draw.rectangle(
        (
            root_x - body_width / 2,
            ground_y - body_height,
            root_x + body_width / 2,
            ground_y,
        ),
        outline=BODY,
        width=1,
    )
    draw.line((root_x - 7, ground_y, root_x + 7, ground_y), fill=ANCHOR, width=2)
    draw.line((root_x, ground_y - 7, root_x, ground_y + 5), fill=ANCHOR, width=2)

    alpha = frame.getchannel("A").point(
        lambda value: 255 if value >= int(geometry["alphaThreshold"]) else 0
    )
    bounds = alpha.getbbox()
    world_bounds = None
    if bounds:
        world_bounds = (
            paste_x + bounds[0],
            paste_y + bounds[1],
            paste_x + bounds[2],
            paste_y + bounds[3],
        )
        draw.rectangle(world_bounds, outline=accent, width=1)
    if record["contact"]:
        tile_face = root_x + float(geometry["tileSizePx"]) / 2
        impact_y = ground_y - 46
        draw.ellipse(
            (tile_face - 7, impact_y - 7, tile_face + 7, impact_y + 7),
            outline=IMPACT,
            width=3,
        )
        draw.line((tile_face - 11, impact_y, tile_face + 11, impact_y), fill=IMPACT)
        draw.line((tile_face, impact_y - 11, tile_face, impact_y + 11), fill=IMPACT)
    return visible_height(record, int(geometry["alphaThreshold"])), world_bounds


def _metric_text(record: dict[str, Any], height: float) -> str:
    offset = float(record["offsetXPx"])
    return f"Visible H {height:05.1f}px   Sprite X {offset:+05.1f}px"


def render_pair(
    scenario: dict[str, Any],
    scenario_meta: dict[str, Any],
    frame_index: int,
    config: dict[str, Any],
) -> Image.Image:
    width = int(config["render"]["canvasWidth"])
    height = int(config["render"]["laneHeight"])
    lane_width = width // 2
    ground_y = height - int(config["render"]["groundInsetPx"])
    image = Image.new("RGBA", (width, height), BG)
    draw = ImageDraw.Draw(image)
    fonts = _fonts(config)
    draw.rectangle((0, 0, width, 67), fill=PANEL)
    draw.line((lane_width, 0, lane_width, height), fill=GRID_MAJOR, width=2)
    draw.text((width / 2, 10), scenario_meta["label"], font=fonts["title"], fill=TEXT, anchor="ma")
    draw.text(
        (width / 2, 39),
        f"frame {frame_index + 1:02d}/{len(scenario['before']):02d} · synchronized playback",
        font=fonts["small"],
        fill=MUTED,
        anchor="ma",
    )

    for lane, (key, label, accent) in enumerate((
        ("before", "BEFORE · CURRENT", CURRENT),
        ("after", "AFTER · PROPOSED", PROPOSED),
    )):
        left = lane * lane_width
        _scene_grid(
            draw,
            left,
            lane_width,
            ground_y,
            config["geometry"],
            scenario_meta["kind"],
        )
        record = scenario[key][frame_index]
        actor_height, _ = _render_actor(
            image,
            draw,
            record,
            left,
            ground_y,
            config,
            accent,
        )
        draw.rounded_rectangle(
            (left + 18, 78, left + 216, 108),
            radius=8,
            fill="#10242b",
            outline=accent,
        )
        draw.text((left + 30, 84), label, font=fonts["lane"], fill=accent)
        draw.text(
            (left + 18, 116),
            record["label"],
            font=fonts["body"],
            fill=TEXT,
        )
        draw.text(
            (left + 18, 139),
            _metric_text(record, actor_height),
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
    return image.convert("RGB")


def save_comparison_gif(
    scenario: dict[str, Any],
    scenario_meta: dict[str, Any],
    config: dict[str, Any],
    path: Path,
) -> list[Image.Image]:
    frames = [
        render_pair(scenario, scenario_meta, index, config)
        for index in range(len(scenario["before"]))
    ]
    base_duration = int(config["render"]["previewFrameDurationMs"])
    durations = [base_duration] * len(frames)
    critical = int(scenario["criticalIndex"])
    durations[critical] = base_duration * int(config["render"]["contactHoldFrames"])
    durations[-1] = base_duration * 5
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
    row_height = 190
    sheet = Image.new("RGB", (width, row_height * len(scenarios)), BG)
    for row, scenario in enumerate(scenarios):
        frame = rendered[scenario["id"]][int(scenario["criticalIndex"])]
        frame = frame.resize((width, row_height), Image.Resampling.LANCZOS)
        sheet.paste(frame, (0, row * row_height))
    return sheet
